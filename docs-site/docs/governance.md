---
id: governance
title: Feature Governance
slug: /governance
---

# Feature Governance

The `GovernanceRegistry` ensures every feature ships with proper telemetry instrumentation and tri-party approval. No feature can be released without a validated `FeatureTelemetrySpec`.

**Source:** `src/sdk/governance.ts`

## GovernanceRegistry

```ts
const registry = new GovernanceRegistry(storageKey?: string);
```

Persists to localStorage key `tn.agri.sdk.governance.records.v1`.

### upsertTelemetrySpec(spec)

Registers or updates a feature's telemetry specification. Returns a `ReleaseReadinessResult` indicating if the spec is valid.

```ts
const result = registry.upsertTelemetrySpec({
  featureId: 'pest-scanner-v2',
  featureName: 'AI Pest Scanner',
  ownerProduct: 'Ravi Kumar',
  ownerEngineering: 'Priya Sharma',
  ownerAnalytics: 'Anand Patel',
  kpis: ['identification_accuracy', 'remedy_conversion'],
  events: [
    { eventId: 'SCAN_INITIATED', requiredFields: ['farmerId', 'cropType'] },
    { eventId: 'SCAN_COMPLETED', requiredFields: ['pestDetected', 'confidence'] },
  ],
});

// result.ready: true/false
// result.reasons: string[] (validation errors)
```

### Validation Rules

`validateTelemetrySpec()` checks:

- `featureId` is non-empty
- `featureName` is non-empty
- `ownerProduct`, `ownerEngineering`, `ownerAnalytics` are non-empty
- At least one KPI is defined
- At least one event is defined
- Each event has a non-empty `eventId` and at least one `requiredField`

### setApprovals(featureId, approval)

Sets the tri-party approval status for a registered feature.

```ts
registry.setApprovals('pest-scanner-v2', {
  productApproved: true,
  engineeringApproved: true,
  analyticsApproved: true,
  approvedAt: new Date().toISOString(),
});
```

### evaluateFeatureReadiness(featureId, observedEventIds)

Evaluates whether a feature is ready for release by checking:

1. Spec validation passes
2. Product approval granted
3. Engineering approval granted
4. Analytics approval granted
5. All declared events have been observed in telemetry (instrumentation verified)

```ts
const readiness = registry.evaluateFeatureReadiness('pest-scanner-v2', ['SCAN_INITIATED', 'SCAN_COMPLETED']);
// { ready: true, reasons: [] }
```

### listRecords() / getRecord(featureId)

List all governance records or get a specific one.

## Portfolio Action Recommendation

The `nextPortfolioAction()` function determines the recommended action for a feature:

```ts
function nextPortfolioAction(
  roiPercent: number,
  adoptionRatePercent: number,
  engagementTrendDelta: number
): 'iterate' | 'scale' | 'retire';
```

| Condition | Recommendation |
|-----------|---------------|
| ROI >= 30%, Adoption >= 40%, Trend >= 0 | **Scale** |
| ROI < 0%, Adoption < 15%, Trend < 0 | **Retire** |
| Everything else | **Iterate** |
