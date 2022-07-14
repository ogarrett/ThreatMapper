/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  threatmapper: [
    {
      type: 'html',
      value: 'Deepfence ThreatMapper',
      className: 'sidebar-title',
    },

    'threatmapper/index',
    'threatmapper/architecture',
    'threatmapper/demo',

    {
      type: 'category',
      label: 'Management Console',
      items: [
        'threatmapper/console/docker',
        'threatmapper/console/kubernetes',
        'threatmapper/console/initial-configuration',
        'threatmapper/console/manage-users',
      ],
    },

    {
      type: 'category',
      label: 'Sensor Agents',
      link: {
        type: 'doc',
        id: 'threatmapper/sensors/index'
      },
      items: [
        'threatmapper/sensors/kubernetes',
        'threatmapper/sensors/docker',
        'threatmapper/sensors/amazon-ecs',
        'threatmapper/sensors/amazon-fargate',
        'threatmapper/sensors/azure-aks',
        'threatmapper/sensors/google-gke',
        'threatmapper/sensors/linux-host',
      ],
    },

    {
      type: 'category',
      label: 'Operations',
      link: {
        type: 'doc',
        id: 'threatmapper/operations/index'
      },
      items: [
        'threatmapper/operations/scanning',
        'threatmapper/operations/sboms',
        'threatmapper/operations/scanning-registries',
        'threatmapper/operations/scanning-ci',
        'threatmapper/operations/support',
      ],
    },

    {
      type: 'category',
      label: 'Notifications',
      link: {
        type: 'doc',
        id: 'threatmapper/notifications/index'
      },
      items: [
        'threatmapper/notifications/pagerduty',
        'threatmapper/notifications/slack',
        'threatmapper/notifications/sumo-logic',
      ],
    },

    {
      type: 'category',
      label: 'Developers',
      link: {
        type: 'doc',
        id: 'threatmapper/developers/index'
      },
      items: [
        'threatmapper/developers/build',
        'threatmapper/developers/deploy-console',
        'threatmapper/developers/deploy-agent',
      ],
    },

    {
      type: 'category',
      label: 'Tips',
      link: {
        type: 'generated-index',
        description:
          "Tips and Techniques to get the most from ThreatMapper"
      },
      items: [
        {
          type: 'autogenerated',
          dirName: 'threatmapper/tips',
        },
      ],
    },
  ],
};

module.exports = sidebars;
