package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/gomodule/redigo/redis"
	"github.com/olivere/elastic/v7"
	kafka "github.com/segmentio/kafka-go"
)

var (
	cveIndexName            = convertRootESIndexToCustomerSpecificESIndex("cve")
	cveScanLogsIndexName    = convertRootESIndexToCustomerSpecificESIndex("cve-scan")
	secretScanIndexName     = convertRootESIndexToCustomerSpecificESIndex("secret-scan")
	secretScanLogsIndexName = convertRootESIndexToCustomerSpecificESIndex("secret-scan-logs")
	sbomArtifactsIndexName  = convertRootESIndexToCustomerSpecificESIndex("sbom-artifact")
	sbomCveScanIndexName    = convertRootESIndexToCustomerSpecificESIndex("sbom-cve-scan")
)

//convertRootESIndexToCustomerSpecificESIndex : convert root ES index to customer specific ES index
func convertRootESIndexToCustomerSpecificESIndex(rootIndex string) string {
	customerUniqueId := os.Getenv("CUSTOMER_UNIQUE_ID")
	if customerUniqueId != "" {
		rootIndex += fmt.Sprintf("-%s", customerUniqueId)
	}
	return rootIndex
}

func getCurrentTime() string {
	return time.Now().UTC().Format("2006-01-02T15:04:05.000") + "Z"
}

func startKafkaConsumers(ctx context.Context, brokers string,
	topics []string, group string, topicChannels map[string](chan []byte)) {

	log.Info("brokers: ", brokers)
	log.Info("topics: ", topics)
	log.Info("group ID: ", group)

	for _, topic := range topics {
		go func(ctx context.Context, topic string, out chan []byte) {
			// https://pkg.go.dev/github.com/segmentio/kafka-go#ReaderConfig
			reader := kafka.NewReader(
				kafka.ReaderConfig{
					Brokers:               strings.Split(kafkaBrokers, ","),
					GroupID:               group,
					Topic:                 topic,
					MinBytes:              1e3, // 1KB
					MaxBytes:              5e6, // 5MB
					MaxWait:               5 * time.Second,
					WatchPartitionChanges: true,
					CommitInterval:        5 * time.Second,
					ErrorLogger:           kafka.LoggerFunc(log.Errorf),
				},
			)

			defer reader.Close()

			log.Infof("start consuming from topic %s", topic)
			for {
				select {
				case <-ctx.Done():
					log.Infof("stop consuming from topic %s", topic)
					return
				default:
					m, err := reader.ReadMessage(ctx)
					if err != nil {
						log.Error(err)
						break
					}
					out <- m.Value
				}
			}
		}(ctx, topic, topicChannels[topic])
	}
}

func afterBulkPush(executionId int64, requests []elastic.BulkableRequest, response *elastic.BulkResponse, err error) {
	if err != nil {
		log.Error(err)
	}
	if response.Errors {
		for _, i := range response.Failed() {
			log.Errorf("index: %s error reason: %s error: %+v\n", i.Index, i.Error.Reason, i.Error)
		}
	}
	log.Infof("number of docs sent to es -> successful: %d failed: %d", len(response.Succeeded()), len(response.Failed()))
}

func startESBulkProcessor(
	client *elastic.Client,
	flushInterval time.Duration,
	numWorkers int,
	numDocs int,
) *elastic.BulkProcessor {
	// Create processor
	bulk, err := elastic.NewBulkProcessorService(client).
		Backoff(elastic.StopBackoff{}).
		FlushInterval(flushInterval).
		Workers(numWorkers).
		BulkActions(numDocs).
		After(afterBulkPush).
		Stats(false).
		Do(context.Background())
	if err != nil {
		gracefulExit(err)
	}
	return bulk
}

func addToES(data []byte, index string, bulkp *elastic.BulkProcessor) error {
	var dataMap map[string]interface{}
	err := json.Unmarshal(data, &dataMap)
	if err != nil {
		return err
	}
	dataMap["masked"] = "false"
	dataMap["@timestamp"] = getCurrentTime()
	bulkp.Add(elastic.NewBulkIndexRequest().Index(index).Doc(dataMap))
	return nil
}

func processReports(
	ctx context.Context,
	topicChannels map[string](chan []byte),
	bulkp *elastic.BulkProcessor,
) {
	for {
		select {
		case <-ctx.Done():
			log.Info("stop processing data from kafka")
			return

		case cve := <-topicChannels[cveIndexName]:
			processCVE(cve, bulkp)

		case cveLog := <-topicChannels[cveScanLogsIndexName]:
			if err := addToES(cveLog, cveScanLogsIndexName, bulkp); err != nil {
				log.Errorf("failed to process cve scan log error: %s", err.Error())
			}

		case secret := <-topicChannels[secretScanIndexName]:
			if err := addToES(secret, secretScanIndexName, bulkp); err != nil {
				log.Errorf("failed to process secret scan error: %s", err.Error())
			}

		case secretLog := <-topicChannels[secretScanLogsIndexName]:
			if err := addToES(secretLog, secretScanLogsIndexName, bulkp); err != nil {
				log.Errorf("failed to process secret scan log error: %s", err.Error())
			}

		case sbomArtifact := <-topicChannels[sbomArtifactsIndexName]:
			if err := addToES(sbomArtifact, sbomArtifactsIndexName, bulkp); err != nil {
				log.Errorf("failed to process sbom artifacts error: %s", err.Error())
			}

		case sbomCve := <-topicChannels[sbomCveScanIndexName]:
			if err := addToES(sbomCve, sbomCveScanIndexName, bulkp); err != nil {
				log.Errorf("failed to process sbom artifacts error: %s", err.Error())
			}

		}
	}
}

func subscribeTOMaskedCVE(ctx context.Context, rpool *redis.Pool, mchan chan MaskDocID) {
	c := rpool.Get()
	psc := redis.PubSubConn{Conn: c}
	psc.Subscribe("mask-cve")

	for {
		select {
		case <-ctx.Done():
			if err := psc.Unsubscribe(); err != nil {
				log.Error(err)
			}
			log.Info("stop receiving from redis, unsubscribe all")
			return
		default:
			switch v := psc.Receive().(type) {
			case redis.Message:
				log.Infof("redis channel:%s message:%s", v.Channel, v.Data)
				var m MaskDocID
				if err := json.Unmarshal(v.Data, &m); err != nil {
					log.Errorf("failed to unmarshal data from mask-cve subscription: %s", err)
				} else {
					mchan <- m
				}
			case redis.Subscription:
				log.Infof("channel:%s kind:%s #subscriptions:%d", v.Channel, v.Kind, v.Count)
			case error:
				log.Error(v)
			}
		}
	}
}