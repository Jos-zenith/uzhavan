# Tamil Nadu Digital Agriculture SDK & Telemetry Framework

## 1) Purpose
This SDK provides an offline-first foundation for digital agriculture services in Tamil Nadu, designed to support a core ROI engine and production telemetry pipeline.

It is built for:
- resilient field usage with intermittent connectivity,
- local event buffering with safe replay,
- dataset snapshot caching,
- ROI metric computation from service telemetry.

---

## 2) What Was Standardized
- All previous markdown docs were removed.
- One canonical document now exists: `SDK_FRAMEWORK.md`.
- Legacy monolithic SDK entrypoint was replaced with modular architecture.

Current SDK modules:
- `src/sdk/types.ts`
- `src/sdk/storage.ts`
- `src/sdk/queue.ts`
- `src/sdk/telemetry.ts`
- `src/sdk/offline.ts`
- `src/sdk/roi.ts`
- `src/sdk/provider.tsx`
- `src/sdk/index.ts`
- Backward-compatible entrypoint: `src/victoriSdk.tsx`

---

## 3) Project Setup

This section is the canonical onboarding flow for engineering teams and mirrors a production SDK setup pattern.

### 3.1 Prerequisites
- Node.js 18+
- npm 9+
- Windows/macOS/Linux shell

### 3.2 Install Dependencies
```bash
npm install
```

### 3.3 Validate Project Setup
Run setup validation before first start:
```bash
npm run setup:project
```

Verification-only mode:
```bash
npm run setup:verify
```

These checks validate:
- runtime version,
- required data assets,
- SDK module wiring,
- single-documentation policy,
- dependency installation state.

### 3.4 Start Development Server
```bash
npm start
```

Expected output:
- local app URL,
- webpack compile success,
- no TypeScript compile errors.

### 3.5 Build Production Bundle
```bash
npm run build
```

### 3.6 Recommended First-Run Smoke Test
1. Open app home and verify connectivity banner.
2. Open ROI & Governance tab.
3. Confirm feature specs, experiment plan, and readiness rows appear.
4. Confirm no runtime crashes in console.

### 3.7 Troubleshooting
- If setup check fails for missing dependencies: run `npm install`.
- If setup check fails for missing data files: verify files under `data/`.
- If start fails with port conflict: free port 3000 or set a new port.
- If telemetry readiness shows blocked: register spec + approvals and verify required events.

---

## 4) SDK Design

### 4.1 Telemetry Client (`telemetry.ts`)
Responsibilities:
- track service events,
- queue events offline,
- auto-flush in online mode,
- retry failed batches,
- drop records exceeding retry ceiling.

Config knobs:
- `storageKey`
- `maxQueueSize`
- `flushBatchSize`
- `flushIntervalMs`
- `maxRetries`

### 4.2 Offline Queue (`queue.ts`)
Responsibilities:
- persistent event storage,
- bounded queue growth,
- dequeue by batch,
- retry increments,
- queue snapshot observability.

### 4.3 Dataset Cache (`offline.ts`)
Responsibilities:
- TTL-based dataset records,
- key-based put/get/list,
- compaction of expired snapshots,
- explicit cache clear per dataset.

### 4.4 ROI Engine (`roi.ts`)
Current baseline metrics:
- `total_events`
- `total_benefit` (sum of `outcomeValue + costSaved + revenueGained`)
- `roi_percent`

Comprehensive ROI dashboard models now include:
- **Value side**
  - incremental revenue,
  - cost savings,
  - productivity gain value,
  - time saved value (explicit or derived from hours × value/hour),
  - qualitative benefits converted to value where measurable.
- **Cost side**
  - development cost,
  - infrastructure cost,
  - support cost,
  - maintenance cost.

Standard formula:

`ROI % = ((Total Benefits - Total Costs) / Total Costs) * 100`

Leading indicators included in dashboard outputs:
- active users,
- adoption rate,
- engagement events per user,
- adoption trend by period,
- engagement trend by period.

Standard recommendation signal:
- `scale` / `iterate` / `retire`.

### 4.5 Governance Layer (`governance.ts`)
Governance enforces measurement-first delivery:
- telemetry spec validation before build,
- cross-functional approval checks (product, engineering, analytics),
- release readiness gate requiring instrumentation coverage,
- periodic portfolio action model (`iterate`/`scale`/`retire`).

### 4.6 React Provider (`provider.tsx`)
Exposes runtime API:
- `track(eventId, payload, serviceId?)`
- `flush()`
- `cachePut(config, key, value)`
- `cacheGet(config, key)`
- `computeRoi(baselineCost?, serviceId?)`
- `computeRoiDashboard(costs, serviceId?, eligibleUsers?)`
- `computePortfolioRoiDashboard(entries)`
- `evaluateReleaseReadiness(spec, approval)`

Runtime signals:
- `ready`
- `isOnline`
- `queueSize`

---

## 5) Quick Integration

### 5.1 Wrap App
```tsx
import { OfflineAgriSdkProvider } from './sdk';

export default function Root() {
  return (
    <OfflineAgriSdkProvider>
      <App />
    </OfflineAgriSdkProvider>
  );
}
```

### 5.2 Track Telemetry in Services
```tsx
import { useOfflineAgriSdk } from './sdk';

function ExampleScreen() {
  const sdk = useOfflineAgriSdk();

  const onUserAction = () => {
    sdk.track('SERVICE_ACTION', {
      district: 'Erode',
      outcomeValue: 1200,
      costSaved: 300,
      revenueGained: 500,
    }, 4);
  };

  return <button onClick={onUserAction}>Track</button>;
}
```

### 5.3 Cache Offline Dataset Snapshot
```tsx
sdk.cachePut(
  { datasetId: 'fertilizer-stock', ttlMs: 12 * 60 * 60 * 1000 },
  'erode-dap',
  { district: 'Erode', fertilizer: 'DAP', quantity: 806.23 }
);
```

### 5.4 Compute ROI
```tsx
const metrics = sdk.computeRoi(10000, 4);
```

---

## 6) Telemetry Transport Contract
The SDK accepts a transport implementing:
```ts
interface TelemetryTransport {
  sendBatch(events: TelemetryEvent[]): Promise<void>;
}
```

Plug into provider:
```tsx
<OfflineAgriSdkProvider telemetryTransport={transportImpl} />
```

Expected backend behaviors:
- idempotent event ingestion,
- batch write API,
- dead-letter handling for invalid payloads,
- server-side schema versioning.

---

## 7) Recommended Event Schema for ROI Layer
Minimum payload fields:
- `district`
- `serviceAction`
- `outcomeValue`
- `costSaved`
- `revenueGained`
- `beneficiaryCount`
- `sessionId`

Service-specific dimensions:
- Fertilizer: `fertilizerType`, `stockQty`
- Seed: `variety`, `farmId`
- Machinery: `machineType`, `hoursUsed`
- Market: `commodity`, `marketPrice`
- Weather: `forecastType`, `riskLevel`

Cost-side data model per feature:
- `developmentCost`
- `infrastructureCost`
- `supportCost`
- `maintenanceCost`

Value-side measurable model per feature:
- `incrementalRevenue`
- `costSavings`
- `productivityValue`
- `timeSavedValue` or (`timeSavedHours` + `valuePerHour`)
- `qualitativeBenefitValue`

---

## 8) Offline-First Operational Pattern
1. User action occurs in field.
2. Event tracked locally.
3. Queue persists in storage.
4. App reconnects.
5. Auto-flush sends telemetry in batches.
6. ROI computation can run locally from queued snapshots.

---

## 9) Migration Notes
- Existing imports from `victoriSdk.tsx` continue working.
- Internally, `victoriSdk.tsx` now re-exports modular SDK APIs.
- Demo/integration example artifacts were removed to keep production footprint clean.

---

## 10) Governance and Operating Model

### 10.0 Core Solution Concept
Use a common product process and telemetry architecture where every feature must:
- declare target outcomes and KPIs before development,
- emit standardized telemetry and KPI metric events after deployment,
- flow into a central analytics layer that attributes KPI changes to features/releases as far as possible.

### 10.1 Feature Design Gate (Mandatory)
Every feature must include a **metrics and telemetry spec** before implementation starts, including:
- KPI list,
- telemetry event definitions,
- required event fields,
- owners for product, engineering, analytics.

Process rule for objective and KPI definition up front:
- each feature defines **1–3 primary goals** (for example: incremental revenue, cost savings, productivity, risk reduction),
- each goal maps to measurable KPIs (for example: conversion, retention, time-on-task, time saved, error rate),
- each KPI must include **baseline value** and **target delta**.

Examples:
- reduce checkout time by 20%,
- increase activation by 5 percentage points.

Experiment and attribution plan requirement (mandatory per feature):
- choose one method: **A/B test**, **phased rollout**, or **pre/post comparison**,
- define traffic scope (for example, 10%, 40%, 50%),
- define in-scope segments/users (for example, district clusters, crop cohorts, or user tiers),
- define attribution KPI event used for evaluation.

Implemented in SDK:
- `FeatureExperimentPlan` in `src/sdk/types.ts`,
- experiment storage and evaluator in `src/sdk/experimentation.ts`,
- provider APIs:
  - `registerExperimentPlan(plan)`
  - `listExperimentPlans()`
  - `evaluateExperimentAttribution(featureId, kpiId, metricEventId?)`

Standardized process + telemetry architecture APIs:
- governance registry in `src/sdk/governance.ts` (`GovernanceRegistry`),
- provider APIs:
  - `registerTelemetrySpec(spec)`
  - `setFeatureApprovals(featureId, approval)`
  - `getGovernanceRecords()`
  - `evaluateFeatureReadiness(featureId)`
  - `trackFeatureEvent(featureId, eventId, payload, serviceId?)`

`trackFeatureEvent` enforces declared event schema (`requiredFields`) so KPI capture is standardized across features.

### 10.2 Release Gate (Mandatory)
Releases are blocked unless:
- spec validation passes,
- product + engineering + analytics approvals are present,
- required events are observed in instrumentation.
- experiment plan is present and segment scope is defined.

This removes “ship now, measure later”.

### 10.3 Portfolio Review Cadence
Run periodic product portfolio reviews using standardized ROI dashboards:
- compare value vs cost by feature,
- inspect adoption and engagement trends,
- decide `iterate`, `scale`, or `retire`.

### 10.4 Expected Outcome
With this model, every shipped feature has measurable KPIs and traceable ROI, improving prioritization, reducing ambiguity, and aligning engineering investment with business value.

---

## 11) Roadmap to High-End Documentation App
Target outcome: dedicated docs app with product-grade SDK docs and install flow.

Suggested structure:
- `/docs/getting-started`
- `/docs/installation`
- `/docs/sdk-core`
- `/docs/offline-cache`
- `/docs/telemetry`
- `/docs/roi-engine`
- `/docs/reference`
- `/docs/changelog`

Authoring style:
- installation-first,
- copy/paste runnable snippets,
- API reference generated from TypeScript types,
- versioned documentation per SDK release.

Suggested build stack (non-web3):
- Next.js + MDX + TypeDoc + OpenAPI (if backend contract docs are needed)

---

## 12) Current Status
- SDK modularization: complete.
- Telemetry offline queue framework: complete.
- Dataset TTL cache: complete.
- ROI dashboard and governance model: complete.
- Single unified documentation file: complete.
