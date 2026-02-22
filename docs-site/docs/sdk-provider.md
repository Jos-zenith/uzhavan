---
id: sdk-provider
title: SDK Provider
slug: /sdk-provider
---

# SDK Provider

The `OfflineAgriSdkProvider` is the React context provider that initializes all SDK subsystems and exposes them through the `useOfflineAgriSdk` hook.

## Setup

```tsx
import { OfflineAgriSdkProvider } from './sdk';

function App() {
  return (
    <OfflineAgriSdkProvider
      telemetryConfig={{
        maxQueueSize: 5000,
        flushBatchSize: 100,
        flushIntervalMs: 30000,
        maxRetries: 5,
      }}
    >
      {children}
    </OfflineAgriSdkProvider>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `React.ReactNode` | Yes | Application tree |
| `telemetryConfig` | `TelemetryConfig` | No | Override default queue settings |
| `telemetryTransport` | `TelemetryTransport` | No | Custom transport for sending batches |

## Initialization Sequence

On mount, the provider creates singleton instances (via `useRef`) of:

1. **TelemetryClient** -- starts auto-flush timer
2. **OfflineDatasetCache** -- TTL-based caching
3. **RoiEngine** -- benefit/cost computation
4. **FeatureOutcomeRegistry** -- KPI tracking
5. **ExperimentPlanRegistry** -- experiment management
6. **GovernanceRegistry** -- feature spec management

A 1-second interval polls connectivity status and queue size to keep the UI reactive.

## useOfflineAgriSdk Hook

```ts
const sdk = useOfflineAgriSdk();
```

Throws an error if used outside `OfflineAgriSdkProvider`.

### Returned Context

| Property | Type | Description |
|----------|------|-------------|
| `ready` | `boolean` | Always `true` after init |
| `isOnline` | `boolean` | Current network status |
| `queueSize` | `number` | Pending events count |
| `track` | `(policyId, eventId, payload, serviceId?) => void` | Policy-enforced tracking |
| `flush` | `() => Promise<void>` | Manually flush queue |
| `cachePut` | `(config, key, value) => void` | Store offline dataset |
| `cacheGet` | `(config, key) => Record \| null` | Retrieve cached dataset |
| `computeRoi` | `(baselineCost?, serviceId?) => RoiMetric[]` | Basic ROI metrics |
| `computeRoiDashboard` | `(costs, serviceId?, eligibleUsers?) => FeatureRoiDashboard` | Feature dashboard |
| `computePortfolioRoiDashboard` | `(entries) => PortfolioRoiDashboard` | Portfolio dashboard |
| `registerTelemetrySpec` | `(spec) => ReleaseReadinessResult` | Register feature spec |
| `setFeatureApprovals` | `(featureId, approval) => void` | Set tri-party approvals |
| `getGovernanceRecords` | `() => FeatureGovernanceRecord[]` | List all specs |
| `evaluateFeatureReadiness` | `(featureId) => ReleaseReadinessResult` | Check release readiness |
| `trackFeatureEvent` | `(featureId, eventId, payload, serviceId?) => FeatureSpecValidationResult` | Governance-validated tracking |
| `registerFeatureOutcomeSpec` | `(spec) => FeatureSpecValidationResult` | Register outcome spec |
| `emitKpiMetric` | `(input) => FeatureSpecValidationResult` | Emit KPI measurement |
| `getAttributionReport` | `() => FeatureAttributionReport` | Get attribution report |
| `registerExperimentPlan` | `(plan) => void` | Register experiment |
| `evaluateExperimentAttribution` | `(featureId, kpiId, metricEventId?) => ExperimentAttributionResult \| null` | Evaluate experiment |

## Example: Full Feature Lifecycle

```tsx
function FeatureWithGovernance() {
  const sdk = useOfflineAgriSdk();

  // 1. Register telemetry spec
  useEffect(() => {
    sdk.registerTelemetrySpec({
      featureId: 'market-price-v2',
      featureName: 'Market Price Comparison',
      ownerProduct: 'Product Lead',
      ownerEngineering: 'Engineering Lead',
      ownerAnalytics: 'Analytics Lead',
      kpis: ['price_query_conversion'],
      events: [
        { eventId: 'PRICE_COMPARED', requiredFields: ['commodity', 'markets'] }
      ],
    });

    // 2. Set approvals
    sdk.setFeatureApprovals('market-price-v2', {
      productApproved: true,
      engineeringApproved: true,
      analyticsApproved: true,
    });
  }, []);

  // 3. Check readiness
  const readiness = sdk.evaluateFeatureReadiness('market-price-v2');

  // 4. Track governance-validated events
  const handleCompare = () => {
    sdk.trackFeatureEvent('market-price-v2', 'PRICE_COMPARED', {
      commodity: 'Paddy',
      markets: 'Thanjavur,Madurai',
    });
  };

  // 5. Compute ROI
  const dashboard = sdk.computeRoiDashboard(
    { developmentCost: 50000, infrastructureCost: 10000, supportCost: 5000, maintenanceCost: 3000 },
    7
  );

  return <div>ROI: {dashboard.roiPercent}%</div>;
}
```
