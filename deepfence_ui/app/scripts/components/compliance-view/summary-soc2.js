import React from 'react';
import HostReportContainer from './host-report-container';
import ComplianceTotalTestReportContainer from './total-test-report-container';
import injectModalTrigger from '../common/generic-modal/modal-trigger-hoc';
// import ComplianceRulesTable from './compliance-rules-table';

const testValueConfig = [
  {
    display: 'Alarm',
    value: 'alarm',
  },
  {
    display: 'Ok',
    value: 'ok',
  },
  {
    display: 'Info',
    value: 'info',
  },
  {
    display: 'Skip',
    value: 'skip',
  },
];

// const renderModalContent = complianceChecktype => (
//   <ComplianceRulesTable
//     complianceChecktype={complianceChecktype}
//   />
// );

class Soc2Summary extends React.PureComponent {
  // handleViewRules({
  //   checkType,
  //   label,
  // }) {
  //   const {
  //     triggerModal,
  //   } = this.props;
  //   triggerModal('GENERIC_MODAL', {
  //     title: `Compliance Controls (${label})`,
  //     modalContent: () => renderModalContent(checkType),
  //     contentStyles: {
  //       width: '90%',
  //       height: '600px',
  //     },
  //   });
  // }

  render() {
    const {
      location: urlLocation,
    } = this.props;
    return (
      <div>
        <div className="chart-wrapper top-wrapper">
          <div className="chart-heading">
            <h4>Compliance tests</h4>
            <h5>Overview of the overall compliance</h5>
          </div>
          {/* <div className="pull-right pull-right-control">
            <button
              type="button"
              className="primary-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleViewRules({
                  checkType: 'soc2',
                  label: 'SOC2'
                });
              }}
            >
              View Controls
            </button>
          </div> */}
          <div className="report">
            <div className="total-test-report">
              <ComplianceTotalTestReportContainer
                checkType="soc2"
                nodeId={this.props.match.params.nodeid}
              />
            </div>
          </div>
        </div>
        <div className="chart-wrapper table-wrapper">
          <div className="table relative">
            <HostReportContainer
            nodeId={this.props.match.params.nodeid}
              checkType="soc2"
              testValueConfig={testValueConfig}
              urlLocation={urlLocation}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default injectModalTrigger(Soc2Summary);
