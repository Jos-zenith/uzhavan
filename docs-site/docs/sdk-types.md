---
id: sdk-types
title: Type Reference
slug: /sdk-types
---

# Type Reference

All TypeScript interfaces and types exported from `src/sdk/types.ts`. These are the building blocks of the entire SDK.

## Core Telemetry Types

### TelemetryEvent

The fundamental unit of data in the SDK.

```ts
interface TelemetryEvent {
  id: string;            // Auto-generated unique ID
  eventId: string;       // Event identifier (e.g., 'PRICE_QUERY')
  policyId?: string;     // Business Policy ID this event belongs to
  serviceId?: number;    // Service number (1-18)
  occurredAt: string;    // ISO timestamp
  payload: TelemetryPayload;
  context?: Record<string, Primitive>;
  retries: number;       // Retry count for failed flushes
}
```

### TelemetryPayload

```ts
type Primitive = string | number | boolean | null | undefined;
type TelemetryPayload = Record<string, Primitive>;
```

### TelemetryConfig

```ts
interface TelemetryConfig {
  storageKey?: string;       // Default: 'tn.agri.sdk.telemetry.queue.v1'
  maxQueueSize?: number;     // Default: 5000
  flushBatchSize?: number;   // Default: 100
  flushIntervalMs?: number;  // Default: 30000 (30s)
  maxRetries?: number;       // Default: 5
}
```

### TelemetryTransport

```ts
interface TelemetryTransport {
  sendBatch(events: TelemetryEvent[]): Promise<void>;
}
```

### QueueSnapshot

```ts
interface QueueSnapshot {
  size: number;
  oldestEventAt: string | null;
  newestEventAt: string | null;
}
```

## ROI Types

### RoiMetric

```ts
interface RoiMetric {
  metricId: string;    // 'total_events', 'total_benefit', 'roi_percent'
  value: number;
  unit: string;        // 'count', 'INR', 'percent'
  computedAt: string;
  dimensions?: Record<string, Primitive>;
}
```

### RoiCostModel

```ts
interface RoiCostModel {
  developmentCost: number;
  infrastructureCost: number;
  supportCost: number;
  maintenanceCost: number;
}
```

### RoiValueModel

```ts
interface RoiValueModel {
  incrementalRevenue: number;
  costSavings: number;
  productivityValue: number;
  timeSavedValue: number;
  qualitativeBenefitValue: number;
}
```

### FeatureRoiDashboard

```ts
interface FeatureRoiDashboard {
  serviceId?: number;
  totalBenefits: number;
  totalCosts: number;
  netValue: number;
  roiPercent: number;
  value: RoiValueModel;
  costs: RoiCostModel;
  leadingIndicators: LeadingIndicators;
  recommendation: 'iterate' | 'scale' | 'retire';
  computedAt: string;
}
```

### PortfolioRoiDashboard

```ts
interface PortfolioRoiDashboard {
  features: FeatureRoiDashboard[];
  totals: {
    totalBenefits: number;
    totalCosts: number;
    netValue: number;
    roiPercent: number;
  };
  computedAt: string;
}
```

### LeadingIndicators

```ts
interface LeadingIndicators {
  activeUsers: number;
  adoptionRatePercent: number;
  engagementEventsPerUser: number;
  adoptionTrend: TrendPoint[];
  engagementTrend: TrendPoint[];
}
```

## Governance Types

### FeatureTelemetrySpec

Every feature must register one of these before shipping.

```ts
interface FeatureTelemetrySpec {
  featureId: string;
  featureName: string;
  ownerProduct: string;
  ownerEngineering: string;
  ownerAnalytics: string;
  kpis: string[];
  events: Array<{
    eventId: string;
    requiredFields: string[];
  }>;
}
```

### FeatureSpecApproval

```ts
interface FeatureSpecApproval {
  productApproved: boolean;
  engineeringApproved: boolean;
  analyticsApproved: boolean;
  approvedAt?: string;
}
```

### FeatureGovernanceRecord

```ts
interface FeatureGovernanceRecord {
  featureId: string;
  telemetrySpec: FeatureTelemetrySpec;
  approvals: FeatureSpecApproval;
  createdAt: string;
  updatedAt: string;
}
```

### ReleaseReadinessResult

```ts
interface ReleaseReadinessResult {
  ready: boolean;
  reasons: string[];  // Empty when ready=true
}
```

## Experimentation Types

### FeatureOutcomeSpec

```ts
interface FeatureOutcomeSpec {
  featureId: string;
  featureName: string;
  releaseId: string;
  serviceId?: number;
  owners: { product: string; engineering: string; analytics: string };
  primaryGoals: FeatureGoal[];
  kpis: KpiDefinition[];
  experimentPlan: FeatureExperimentPlan;
  createdAt: string;
}
```

### KpiDefinition

```ts
interface KpiDefinition {
  kpiId: string;
  kpiName: string;
  unit: string;
  baselineValue: number;
  targetDelta: number;
  targetDirection: 'increase' | 'decrease';
  measurementEventId: string;
}
```

### FeatureExperimentPlan

```ts
type ExperimentMethod = 'ab_test' | 'phased_rollout' | 'pre_post';

interface FeatureExperimentPlan {
  featureId: string;
  method: ExperimentMethod;
  hypothesis: string;
  trafficPercent: number;
  segmentIds: string[];
  controlGroupId?: string;
  treatmentGroupId?: string;
  rolloutSteps?: RolloutStep[];
  prePeriodStart?: string;
  postPeriodStart?: string;
}
```

### ExperimentAttributionResult

```ts
interface ExperimentAttributionResult {
  featureId: string;
  method: ExperimentMethod;
  kpiId: string;
  metricEventId: string;
  trafficPercent: number;
  totalSampleSize: number;
  controlAverage: number;
  treatmentAverage: number;
  upliftPercent: number;
  segmentResults: AttributionSegmentResult[];
  generatedAt: string;
}
```

## Offline Cache Types

### DatasetRecord

```ts
interface DatasetRecord {
  key: string;
  value: Record<string, Primitive>;
  cachedAt: string;
  expiresAt: string;
}
```

### OfflineDatasetConfig

```ts
interface OfflineDatasetConfig {
  datasetId: string;
  ttlMs: number;
}
```
