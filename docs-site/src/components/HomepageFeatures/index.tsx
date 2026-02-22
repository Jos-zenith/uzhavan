import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Policy-First Telemetry',
    description: (
      <>
        Every event is linked to one of 16 pre-defined Business Policies.
        No rogue tracking -- the SDK enforces schema validation, required fields,
        and velocity limits at the API level.
      </>
    ),
  },
  {
    title: 'Offline-First Architecture',
    description: (
      <>
        Built for rural Tamil Nadu where connectivity is intermittent. Events queue
        locally with AES encryption, batch-flush on reconnect, and zero data loss
        across 12 SQLite tables.
      </>
    ),
  },
  {
    title: 'ROI Engine',
    description: (
      <>
        Dual-layer ROI computation: real-time dashboards from telemetry events plus
        predictive district-proxy baselines with 3-sigma anomaly detection and
        adoption stage modeling.
      </>
    ),
  },
];

function Feature({title, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md" style={{paddingTop: '2rem'}}>
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
