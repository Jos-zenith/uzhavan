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

---

## 13) Repo-Attached Feature Measurement Map (Top 10)

This section links the ROI design directly to the TypeScript codebase and defines where instrumentation must exist.

### 13.1 Concrete repo artifacts (current)
- Shared telemetry SDK wrapper:
  - `src/sdk/telemetry.ts`
  - `src/sdk/provider.tsx`
  - `src/sdk/httpTransport.ts`
  - `src/sdkHooks/useServiceTelemetry.ts`
- Single event and telemetry type source:
  - `src/sdk/types.ts`
  - `src/sdk/serviceTelemetryCatalog.ts` (`STANDARD_SERVICE_EVENT_SCHEMAS`)
- Feature-level instrumentation points already active:
  - `src/screens/WeatherForecastScreen.tsx`
  - `src/screens/services/MarketPriceScreen.tsx`
- Feature-level instrumentation points to complete next:
  - `src/screens/services/BenefitRegistrationScreen.tsx`
  - `src/screens/services/InsurancePremiumCalculator.tsx`
  - `src/screens/services/FertilizerStockScreen.tsx`
  - `src/screens/services/SeedStockScreen.tsx`
  - `src/screens/services/MachineryHiringScreen.tsx`
  - `src/screens/services/ReservoirLevelsScreen.tsx`
  - `src/screens/OfficerContactInfoScreen.tsx`

### 13.2 Top 10 features: journeys, events, KPIs

All features should emit the standard lifecycle events:
- `service_opened`
- `service_data_load_started`
- `service_data_load_succeeded`
- `service_data_load_failed`
- `service_action_completed`

| Feature (serviceId) | Key user journeys | Events to emit (name + key properties) | KPI(s) computed from events |
|---|---|---|---|
| Subsidy Schemes Info (1) | Open service, fetch schemes, view eligibility | `service_opened` (`featureId`, `sessionId`, `district`), `service_data_load_succeeded` (`operation=fetch_schemes`, `latencyMs`, `records`), `service_action_completed` (`actionName=scheme_viewed`, `timeSavedMinutes`) | Adoption rate, p95 load latency, time-on-task (proxy via `timeSavedMinutes`) |
| Benefit Registration (2) | Open form, validate form, submit registration | `service_data_load_succeeded` (`operation=load_benefit_form`), `service_action_completed` (`actionName=registration_submitted`, `beneficiaryCount`, `timeSavedMinutes`, `costSaved`) | Registration completion rate, subsidy cycle-time reduction, cost saved per registration |
| Crop Insurance (3) | Open premium calculator, calculate premium, start enrollment | `service_data_load_succeeded` (`operation=load_insurance_products`), `service_action_completed` (`actionName=premium_calculated`, `cropType`, `sumInsured`) | Insurance intent conversion, quote success rate, support ticket reduction |
| Fertilizer Stock (4) | Load district stock, search fertilizer, refresh inventory | `service_data_load_succeeded` (`operation=load_fertilizer_stock`, `district`, `records`), `service_action_completed` (`actionName=stock_query_completed`, `fertilizerType`, `timeSavedMinutes`, `costSaved`) | Stock lookup success, input cost savings, stock-out avoidance proxy |
| Seed Stock (5) | Load seed catalog, filter by district, check availability | `service_data_load_succeeded` (`operation=load_seed_stock`, `district`, `records`), `service_action_completed` (`actionName=seed_selection_completed`, `variety`, `costSaved`) | Seed discovery completion rate, input optimization ratio, adoption rate |
| Machinery Hiring (6) | Browse machines, estimate hours, submit rental intent | `service_data_load_succeeded` (`operation=load_machinery_options`), `service_action_completed` (`actionName=machinery_booking_intent`, `machineType`, `hoursUsed`, `costSaved`) | Rental intent conversion, capital efficiency gain, cost saved per session |
| Daily Market Price (7) | Fetch prices, compare markets, decide selling plan | `service_data_load_succeeded` (`operation=fetch_market_prices`, `market`, `commodity`, `records`, `latencyMs`), `service_action_completed` (`actionName=price_lookup_completed`, `incrementalRevenue`, `timeSavedMinutes`) | Price-query completion, price realization delta proxy, incremental revenue |
| Weather Forecast (8) | Select district, load forecast, apply advisory | `service_data_load_succeeded` (`operation=fetch_weather_forecast`, `district`, `records`, `latencyMs`), `service_action_completed` (`actionName=weather_forecast_loaded`, `costSaved`, `incrementalRevenue`, `timeSavedHours`) | Advisory adoption, weather fetch reliability, productivity/time-saved value |
| Officer Contact Info (9) | Load officer list, find nearest officer, place call | `service_data_load_succeeded` (`operation=load_officer_contacts`, `district`, `records`), `service_action_completed` (`actionName=officer_contact_initiated`) | Service completion rate, issue-resolution lead indicator, time saved |
| Reservoir Levels (10) | Load reservoir data, filter by basin, check irrigation risk | `service_data_load_succeeded` (`operation=load_reservoir_levels`, `district`, `records`), `service_action_completed` (`actionName=reservoir_risk_reviewed`, `riskLevel`) | Advisory reach, irrigation risk mitigation proxy, retention/revisit rate |

Notes:
- KPI formulas should use `computeMeasuredKpi()` and ROI dashboard outputs in `src/sdk/serviceTelemetryCatalog.ts` and `src/sdk/roi.ts`.
- Event emission should be wired through `useServiceTelemetry` for all service screens to keep schema consistency.

---

## 14) Appendix A: Telemetry Contract v1

This appendix defines the mandatory event contract for all feature telemetry.

### 14.1 Event naming convention
- Current standard events (already in production): snake_case, for example `service_data_load_succeeded`.
- New feature-specific events: `<domain>_<action>_v1` (snake_case with explicit version), for example `market_transaction_posted_v1`.
- Versioning rule:
  - Backward-compatible metadata additions: keep same event name.
  - Breaking payload changes: increment suffix (`_v2`).

### 14.2 Required vs optional fields

Required envelope fields (all events):
- `eventId`
- `occurredAt`
- `featureId`
- `serviceId`
- `sessionId`
- `userId` (anonymous ID only)
- `timestamp`
- `source`

Required operation fields (for load and action events):
- `operation` for `service_data_load_*`
- `latencyMs` for `service_data_load_succeeded` and `service_data_load_failed`
- `records` for `service_data_load_succeeded`
- `errorCode` for `service_data_load_failed`
- `actionName` for `service_action_completed`

Optional context fields:
- `district`
- `commodity`
- `market`
- `module`
- `cacheLayer`
- `datasetPath`
- `riskLevel`

Optional value fields (ROI side):
- `timeSavedMinutes`
- `timeSavedHours`
- `timeSavedValue`
- `valuePerHour`
- `costSaved` or `costSavings`
- `incrementalRevenue` or `revenueGained`
- `productivityValue`
- `qualitativeBenefitValue`
- `beneficiaryCount`

### 14.3 PII policy

Forbidden in telemetry payloads:
- Aadhaar number
- Bank account number
- Phone number
- Full name
- Exact street address
- Precise GPS coordinates (lat/lon)

Allowed with transformation:
- `userId`: anonymous generated ID only (`getOrCreateTelemetryAnonUserId()`)
- Contact identifiers: one-way hash with salt if absolutely required for deduplication

Allowed coarse context:
- district/block/pincode prefix (no full address)
- crop/commodity category
- app version/release/channel

### 14.4 Canonical JSON shape

```json
{
  "id": "evt_1741862400000_ab12cd34",
  "eventId": "service_action_completed",
  "policyId": "POL_MARKET_PRICING",
  "serviceId": 7,
  "occurredAt": "2026-03-13T09:10:00.000Z",
  "payload": {
    "featureId": "MARKET_PRICE",
    "sessionId": "session_1741860000_x1y2z3",
    "userId": "anon_1741859000_u7v8w9",
    "timestamp": "2026-03-13T09:10:00.000Z",
    "source": "web",
    "operation": "fetch_market_prices",
    "district": "Thanjavur",
    "commodity": "Paddy",
    "actionName": "price_lookup_completed",
    "records": 22,
    "latencyMs": 418,
    "timeSavedMinutes": 18,
    "costSaved": 140,
    "incrementalRevenue": 220
  },
  "retries": 0
}
```

### 14.5 Example: feature-specific event

```json
{
  "eventId": "market_transaction_posted_v1",
  "serviceId": 18,
  "payload": {
    "featureId": "UZHAVAN_E_MARKET",
    "sessionId": "session_1741860000_x1y2z3",
    "userId": "anon_1741859000_u7v8w9",
    "timestamp": "2026-03-13T09:15:00.000Z",
    "source": "web",
    "district": "Villupuram",
    "commodity": "Tomato",
    "quantityKg": 500,
    "expectedPricePerKg": 26,
    "transactionValue": 13000
  }
}
```

---

## 15) Implementation Plan (2-Week Hackathon Version)

### 15.1 Technology choice for this repo
- App type: React web TypeScript app (not React Native).
- Instrumentation path:
  - Keep existing SDK event path (`useServiceTelemetry` -> `TelemetryClient` -> `HttpTelemetryTransport`).
  - Add OTel-compatible backend ingestion pipeline without changing screen code shape.

### 15.2 Pipeline architecture
1. Frontend emits policy-enforced events via `src/sdk/telemetry.ts`.
2. Events are batched by `src/sdk/queue.ts` and sent via `src/sdk/httpTransport.ts`.
3. Ingestion endpoint (`REACT_APP_TELEMETRY_ENDPOINT`) receives `{ events: [...] }`.
4. Endpoint maps business events to:
   - OTel logs (event stream),
   - derived OTel metrics (counters/histograms),
   - warehouse fact table keyed by `featureId`, `serviceId`, `eventId`, and release.
5. OTel Collector exports to observability backend and analytics store.

Collector location (hackathon):
- Run OTel Collector as a local Docker service during demo.
- Optional cloud run: one small VM/container in the same VNet as analytics sink.

### 15.3 Batching and offline queue approach
- Keep existing queue defaults for MVP:
  - `maxQueueSize=5000`
  - `flushBatchSize=100`
  - `flushIntervalMs=30000`
  - `maxRetries=5`
- On reconnect, flush in FIFO batches; if transport fails, retry and drop only after max retries.

### 15.4 Sampling rules
- Business outcome events (`service_action_completed`, `FEATURE_KPI_METRIC`): 100% sample.
- Reliability events:
  - failures (`service_data_load_failed`): 100% sample.
  - successes (`service_data_load_succeeded`): 25% sample once volume exceeds threshold.
- Debug/developer-only events: 0% in production.

### 15.5 Two-week execution schedule
- Days 1-2:
  - Finalize Telemetry Contract v1.
  - Register telemetry specs for 10 features.
- Days 3-5:
  - Complete instrumentation for top 10 service screens.
  - Add policy validation checks for required fields.
- Days 6-8:
  - Stand up ingestion endpoint + OTel Collector + warehouse table.
  - Validate replay behavior in offline/online transitions.
- Days 9-11:
  - Compute KPI jobs and ROI summary tables.
  - Build dashboard views for feature-level ROI and portfolio view.
- Days 12-14:
  - Run attribution windows, generate evidence pack, and freeze demo.

---

## 16) MVP ROI Loop (Closed-Loop Demo Scope)

For hackathon credibility, use a narrow loop with two features and three KPIs.

### 16.1 Selected features
- Money-like feature: `UZHAVAN_E_MARKET` (serviceId 18)
- Cost-saving feature: `FERTILIZER_STOCK` (serviceId 4)
- Optional third feature for risk reduction: `AI_PEST_IDENTIFICATION` (serviceId 16)

### 16.2 MVP KPIs
- KPI-1 (Revenue): Price realization delta per listing
  - Formula: `avg(app_price_per_kg - mandi_price_per_kg)`
  - Source events: `market_transaction_posted_v1`, `service_action_completed`
- KPI-2 (Cost Saving): Input optimization savings per farmer
  - Formula: `sum(costSaved) / unique_farmers`
  - Source events: `service_action_completed` from fertilizer and pest flows
- KPI-3 (Operational): Feature completion rate
  - Formula: `completed_actions / opened_sessions`
  - Source events: `service_opened`, `service_action_completed`

### 16.3 Sample ROI output (single feature)

Uzhavan e-Market monthly sample:
- Incremental revenue: INR 420,000
- Time-saved value: INR 36,000
- Total measured benefits: INR 456,000
- Total monthly feature costs: INR 190,000

ROI calculation:

`ROI % = ((456000 - 190000) / 190000) * 100 = 140%`

### 16.4 MVP deliverables checklist
- Instrumented events for selected features in production build.
- KPI table generated from telemetry batches.
- One dashboard showing:
  - event volume and completion funnel,
  - KPI trend (7d/30d),
  - ROI card with assumptions.
- One evidence page documenting attribution method and sample-size window.
