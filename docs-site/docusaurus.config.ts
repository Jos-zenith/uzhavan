import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'VICT SDK Documentation',
  tagline: 'Policy-enforced telemetry, ROI analysis, and 18 vital agricultural services for Tamil Nadu',
  favicon: 'img/favicon.ico',
  future: {
    v4: true,
  },
  url: 'http://localhost',
  baseUrl: '/',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'VICT Docs',
      logo: {
        alt: 'VICT Docs Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'mainSidebar',
          position: 'left',
          label: 'Documentation',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Getting Started',
          items: [
            { label: 'Introduction', to: '/' },
            { label: 'Installation', to: '/installation' },
            { label: 'SDK Framework', to: '/sdk-framework' },
          ],
        },
        {
          title: 'Core SDK',
          items: [
            { label: 'SDK Provider', to: '/sdk-provider' },
            { label: 'Policy Enforcement', to: '/policy-enforcement' },
            { label: 'ROI Engine', to: '/roi-engine' },
          ],
        },
        {
          title: 'Services',
          items: [
            { label: 'Service Catalog', to: '/service-catalog' },
            { label: 'Weather Service', to: '/service-weather' },
            { label: 'Pest Identification', to: '/service-pest' },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} VICT Platform -- Tamil Nadu Digital Agriculture`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
