import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  mainSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: ['intro', 'installation', 'sdk-npm-installation'],
    },
    {
      type: 'category',
      label: 'Core SDK',
      collapsed: false,
      items: ['sdk-framework', 'sdk-provider', 'sdk-types'],
    },
    {
      type: 'category',
      label: 'Telemetry & Policy',
      items: ['policy-enforcement', 'policy-migration', 'telemetry-client', 'offline-queue'],
    },
    {
      type: 'category',
      label: 'ROI Analysis Engine',
      items: ['roi-engine', 'roi-predictive', 'roi-service-weights'],
    },
    {
      type: 'category',
      label: 'Feature Governance',
      items: ['governance', 'experimentation'],
    },
    {
      type: 'category',
      label: 'Offline Infrastructure',
      items: ['offline-storage', 'connectivity'],
    },
    {
      type: 'category',
      label: 'Vital Services',
      items: ['service-catalog', 'service-weather', 'service-market', 'service-pest', 'service-insurance'],
    },
    {
      type: 'category',
      label: 'Data Layer',
      items: ['data-layer'],
    },
  ],
};

export default sidebars;
