/*eslint-disable*/

// React imports
import React from 'react';
import { connect } from 'react-redux';

import SunburstChart from '../common/charts/sunburst-chart/index';

import {
  getSecretScanChartDataAction,
  setSearchQuery,
} from '../../actions/app-actions';
import { constructGlobalSearchQuery } from '../../utils/search-utils';
import { severityColorsSunBurst } from '../../constants/colors';

class SecretScanChartView extends React.Component {
  constructor() {
    super();
    this.state = {};
    this.sectionClickHandler = this.sectionClickHandler.bind(this);
  }

  componentDidMount() {
    // Initial api call to get data
    this.getCveSeverityChartData();

    // Calls on the basis of active time interval
    if (this.props.refreshInterval) {
      const interval = setInterval(() => {
        this.getCveSeverityChartData();
      }, this.props.refreshInterval.value * 1000);
      this.setState({ intervalObj: interval });
    }
  }

  UNSAFE_componentWillReceiveProps(newProps) {
    if (
      newProps.refreshInterval &&
      this.props.refreshInterval != newProps.refreshInterval
    ) {
      const interval = setInterval(() => {
        this.getCveSeverityChartData();
      }, newProps.refreshInterval.value * 1000);
      if (this.state.intervalObj) {
        clearInterval(this.state.intervalObj);
      }
      this.setState({ intervalObj: interval });
    }
    if (newProps.searchQuery !== this.props.searchQuery) {
      this.setState(
        { display: undefined, number: undefined, time_unit: undefined },
        function stateUpdateComplete() {
          const activeDuration = newProps.days.value;
          this.getCveSeverityChartData(
            activeDuration.number,
            activeDuration.time_unit,
            newProps.searchQuery
          );
        }.bind(this)
      );
    } else if (newProps.days != this.props.days) {
      this.setState(
        { display: undefined, number: undefined, time_unit: undefined },
        function stateUpdateComplete() {
          const activeDuration = newProps.days.value;
          this.getCveSeverityChartData(
            activeDuration.number,
            activeDuration.time_unit,
            newProps.searchQuery
          );
        }.bind(this)
      );
    }
  }

  componentWillUnmount() {
    // Clearing the intervals
    if (this.state.intervalObj) {
      clearInterval(this.state.intervalObj);
    }
  }

  getCveSeverityChartData(number, time_unit, lucene_query) {
    if (this.props.days || number) {
      const params = {
        number: number || this.state.number || this.props.days.value.number,
        time_unit:
          time_unit || this.state.time_unit || this.props.days.value.time_unit,
        lucene_query: lucene_query || this.props.searchQuery,
        scan_id: this.props.scanId,
      };
      this.props.dispatch(getSecretScanChartDataAction(params));
    }
  }

  sectionClickHandler(point) {
    const { globalSearchQuery: existingQuery = [], dispatch } = this.props;
    let searchQuery = existingQuery;

    const newSearchParams = {};
    if (point.path === '') return;

    const paths = point.path.split(' / ');

    switch (paths.length) {
      case 1:
        newSearchParams["Severity.level"] = paths[0];
        break;
      case 2:
        newSearchParams["Severity.level"] = paths[0];
        newSearchParams["Rule.name"] = paths[1];
        break;
      default:
        return;
    }
    for (const param in newSearchParams) {
      let newParam = {};
      newParam[param] = newSearchParams[param];
      searchQuery = constructGlobalSearchQuery(searchQuery, newParam);
    }
    dispatch(setSearchQuery({ searchQuery }));
  }

  render() {
    const { cveSeverityChartData = [] } = this.props;
    let allEmpty = false;
    if (cveSeverityChartData && cveSeverityChartData.children) {
      if (cveSeverityChartData.children.length === 0) {
        allEmpty = true;
      }
    }
    const emptyData = allEmpty;
    return (
      <div className="cve-severity-chart-view-wrapper">
        {emptyData && <div className="absolute-center">No Data Available</div>}
        <div className="cve-severity-chart-wrapper">
          <SunburstChart
            data={cveSeverityChartData}
            name="Secret scan details"
            chartWidth={600}
            chartHeight={600}
            colors={severityColorsSunBurst}
            onSectionClick={this.sectionClickHandler}
          />
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    isSideNavCollapsed: state.get('isSideNavCollapsed'),
    searchQuery: state.get('globalSearchQuery'),
    days: state.get('alertPanelHistoryBound'),
    refreshInterval: state.get('refreshInterval'),
    cveSeverityChartData: state.getIn(['secretScanChart', 'data']),
  };
}

export default connect(mapStateToProps)(SecretScanChartView);