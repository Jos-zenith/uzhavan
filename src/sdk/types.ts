export type Primitive = string | number | boolean | null | undefined;

// Re-export BusinessPolicyId for convenience
export type { BusinessPolicyId } from './policy';

export type TelemetryPayload = Record<string, Primitive>;

export interface TelemetryEvent {
  id: string;
  eventId: string;
  policyId?: string; // Business Policy ID this event belongs to
  serviceId?: number;
  occurredAt: string;
  payload: TelemetryPayload;
  context?: Record<string, Primitive>;
  retries: number;
}

export interface QueueSnapshot {
  size: number;
  oldestEventAt: string | null;
  newestEventAt: string | null;
}

export interface TelemetryTransport {
  sendBatch(events: TelemetryEvent[]): Promise<void>;
}

export interface TelemetryConfig {
  storageKey?: string;
  maxQueueSize?: number;
  flushBatchSize?: number;
  flushIntervalMs?: number;
  maxRetries?: number;
}

export interface DatasetRecord {
  key: string;
  value: Record<string, Primitive>;
  cachedAt: string;
  expiresAt: string;
}

export interface OfflineDatasetConfig {
  datasetId: string;
  ttlMs: number;
}

export interface RoiMetric {
  metricId: string;
  value: number;
  unit: string;
  computedAt: string;
  dimensions?: Record<string, Primitive>;
}

export interface RoiComputationInput {
  events: TelemetryEvent[];
  baselineCost?: number;
  serviceId?: number;
}

export interface RoiCostModel {
  developmentCost: number;
  infrastructureCost: number;
  supportCost: number;
  maintenanceCost: number;
}

export interface RoiValueModel {
  incrementalRevenue: number;
  costSavings: number;
  productivityValue: number;
  timeSavedValue: number;
  qualitativeBenefitValue: number;
}

export interface TrendPoint {
  period: string;
  value: number;
}

export interface LeadingIndicators {
  activeUsers: number;
  adoptionRatePercent: number;
  engagementEventsPerUser: number;
  adoptionTrend: TrendPoint[];
  engagementTrend: TrendPoint[];
}

export interface FeatureRoiDashboard {
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

export interface PortfolioRoiDashboard {
  features: FeatureRoiDashboard[];
  totals: {
    totalBenefits: number;
    totalCosts: number;
    netValue: number;
    roiPercent: number;
  };
  computedAt: string;
}

export interface RoiDashboardInput {
  events: TelemetryEvent[];
  costs: RoiCostModel;
  serviceId?: number;
  eligibleUsers?: number;
}

export interface FeatureTelemetrySpec {
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

export interface FeatureSpecApproval {
  productApproved: boolean;
  engineeringApproved: boolean;
  analyticsApproved: boolean;
  approvedAt?: string;
}

export interface ReleaseReadinessResult {
  ready: boolean;
  reasons: string[];
}

export type GoalCategory =
  | 'incremental_revenue'
  | 'cost_savings'
  | 'productivity'
  | 'risk_reduction'
  | 'adoption'
  | 'engagement';

export interface FeatureGoal {
  goalId: string;
  category: GoalCategory;
  statement: string;
}

export type KpiDirection = 'increase' | 'decrease';

export interface KpiDefinition {
  kpiId: string;
  kpiName: string;
  unit: string;
  baselineValue: number;
  targetDelta: number;
  targetDirection: KpiDirection;
  measurementEventId: string;
}

export type ExperimentMethod = 'ab_test' | 'phased_rollout' | 'pre_post';

export interface RolloutStep {
  stepLabel: string;
  trafficPercent: number;
  segmentIds: string[];
  startAt: string;
}

export interface FeatureExperimentPlan {
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

export interface FeatureOutcomeSpec {
  featureId: string;
  featureName: string;
  releaseId: string;
  serviceId?: number;
  owners: {
    product: string;
    engineering: string;
    analytics: string;
  };
  primaryGoals: FeatureGoal[];
  kpis: KpiDefinition[];
  experimentPlan: FeatureExperimentPlan;
  createdAt: string;
}

export interface FeatureSpecValidationResult {
  valid: boolean;
  errors: string[];
}

export interface KpiMetricEmitInput {
  featureId: string;
  kpiId: string;
  currentValue: number;
  serviceId?: number;
  releaseId?: string;
  context?: Record<string, Primitive>;
}

export interface FeatureKpiAttribution {
  featureId: string;
  featureName: string;
  releaseId: string;
  kpiId: string;
  kpiName: string;
  baselineValue: number;
  targetDelta: number;
  targetDirection: KpiDirection;
  latestValue: number;
  deltaFromBaseline: number;
  targetProgressPercent: number;
  attributedImpactScore: number;
}

export interface FeatureAttributionReport {
  generatedAt: string;
  totalTrackedFeatures: number;
  totalKpiSeries: number;
  entries: FeatureKpiAttribution[];
}

export interface AttributionSegmentResult {
  segmentId: string;
  sampleSize: number;
  averageKpiValue: number;
  deltaVsControl: number;
}

export interface ExperimentAttributionResult {
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

export interface FeatureGovernanceRecord {
  featureId: string;
  telemetrySpec: FeatureTelemetrySpec;
  approvals: FeatureSpecApproval;
  createdAt: string;
  updatedAt: string;
}
