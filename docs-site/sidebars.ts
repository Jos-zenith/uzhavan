import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  mainSidebar: [
    'intro',
    'installation',
    'sdk-npm-installation',
    {
      type: 'category',
      label: 'SDK & Governance',
      items: ['sdk-framework'],
    },
    {
      type: 'category',
      label: 'Policy-First Telemetry',
      items: ['policy-enforcement', 'policy-migration'],
    },
  ],
};

export default sidebars;
