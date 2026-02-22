---
id: experimentation
title: Experimentation
slug: /experimentation
---

# Experimentation

The SDK includes built-in experimentation support for A/B testing, phased rollouts, and pre/post analysis with segment-level attribution.

**Source:** `src/sdk/experimentation.ts`

## ExperimentPlanRegistry

```ts
const experiments = new ExperimentPlanRegistry(storageKey?: string);
```

Persists to localStorage key `tn.agri.sdk.feature.experiments.v1`.

### Methods

| Method | Description |
|--------|-------------|
| `upsert(plan)` | Register or update an experiment plan |
| `get(featureId)` | Get experiment for a feature |
| `list()` | List all experiment plans |

## Experiment Methods

### A/B Test

Split traffic between control and treatment groups:

```ts
sdk.registerExperimentPlan({
  featureId: 'weather-ui-v2',
  method: 'ab_test',
  hypothesis: 'New weather UI increases advisory engagement by 20%',
  trafficPercent: 50,
  segmentIds: ['Thanjavur', 'Madurai'],
  controlGroupId: 'control',
  treatmentGroupId: 'treatment',
});
```

### Phased Rollout

Gradually increase traffic through defined steps:

```ts
sdk.registerExperimentPlan({
  featureId: 'pest-scanner-v2',
  method: 'phased_rollout',
  hypothesis: 'AI pest scanner reduces crop loss',
  trafficPercent: 10,
  segmentIds: ['Coimbatore'],
  rolloutSteps: [
    { stepLabel: 'Phase 1', trafficPercent: 10, segmentIds: ['Coimbatore'], startAt: '2025-06-01' },
    { stepLabel: 'Phase 2', trafficPercent: 50, segmentIds: ['Coimbatore', 'Salem'], startAt: '2025-07-01' },
    { stepLabel: 'Phase 3', trafficPercent: 100, segmentIds: ['all'], startAt: '2025-08-01' },
  ],
});
```

### Pre/Post Analysis

Compare KPI values before and after a feature launch:

```ts
sdk.registerExperimentPlan({
  featureId: 'subsidy-fast-track',
  method: 'pre_post',
  hypothesis: 'Fast-track reduces disbursement time by 40%',
  trafficPercent: 100,
  segmentIds: ['all'],
  prePeriodStart: '2025-01-01',
  postPeriodStart: '2025-04-01',
});
```

## evaluateExperimentAttribution

Evaluates the impact of an experiment by comparing control vs treatment groups:

```ts
const result = sdk.evaluateExperimentAttribution(
  'weather-ui-v2',
  'advisory_engagement_rate',
  'FEATURE_KPI_METRIC'
);
```

### ExperimentAttributionResult

```ts
{
  featureId: 'weather-ui-v2',
  method: 'ab_test',
  kpiId: 'advisory_engagement_rate',
  metricEventId: 'FEATURE_KPI_METRIC',
  trafficPercent: 50,
  totalSampleSize: 1200,
  controlAverage: 0.32,
  treatmentAverage: 0.41,
  upliftPercent: 28.12,
  segmentResults: [
    { segmentId: 'Thanjavur', sampleSize: 600, averageKpiValue: 0.39, deltaVsControl: 0.07 },
    { segmentId: 'Madurai', sampleSize: 600, averageKpiValue: 0.43, deltaVsControl: 0.11 },
  ],
  generatedAt: '2025-07-01T...'
}
```

## Segment Resolution

Events are assigned to segments using this priority:

```ts
event.payload.segmentId ?? event.payload.userSegment ?? event.payload.district ?? 'unknown'
```

## Uplift Calculation

```
upliftPercent = ((treatmentAverage - controlAverage) / |controlAverage|) * 100
```

If `controlAverage` is 0, uplift is 100% when treatment is positive, 0% otherwise.
