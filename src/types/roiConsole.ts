/**
 * ROI Console Data Types
 * Comprehensive types for Feature ROI Dashboard, KPI tracking, and Governance
 */

export type DateRange = '7d' | '30d' | 'custom';
export type Environment = 'prod' | 'staging' | 'demo';
export type FeatureStatus = 'ready' | 'missing-kpi' | 'no-telemetry' | 'measuring' | 'inconclusive';
export type Confidence = 'High' | 'Med' | 'Low';
export type Decision = 'Scale' | 'Iterate' | 'Rollback' | 'Sunset';

export interface ExecutiveKPI {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  context?: string; // e.g., "based on measured benefits"
}

export interface PortfolioFeature {
  featureId: string;
  serviceName: string;
  owner: string;
  status: FeatureStatus;
  adoptionUniqueUsers: number;
  outcomeKpi: {
    name: string;
    value: number | string;
    unit: string;
  };
  roiPercent: number;
  confidence: Confidence;
  lastUpdated: string; // ISO date
  version?: string;
  businessGoal?: string;
}

export interface GovernanceCheckpoint {
  id: 'kpi-spec' | 'baseline' | 'target-delta' | 'telemetry-registered' | 'privacy-check' | 'attribution-plan' | 'observation-window';
  label: string;
  completed: boolean;
  details?: string;
}

export interface FeatureIntentVsReality {
  goal: string;
  baseline: {
    metric: string;
    value: number | string;
    unit: string;
  };
  current: {
    metric: string;
    value: number | string;
    unit: string;
    percentChangeFromBaseline: number;
  };
}

export interface TimeSeriesDatum {
  date: string;
  value: number;
  label?: string;
}

export interface RoiBenefits {
  timeSavedValue?: number;
  costSavings?: number;
  revenueLift?: number;
  qualitativeLabels?: string[];
}

export interface RoiCosts {
  devCost: number;
  infraCost: number;
  supportMaintenance: number;
  totalCost: number;
}

export interface RoiBreakdown {
  benefits: RoiBenefits;
  costs: RoiCosts;
  roiPercent: number;
  paybackPeriodDays?: number;
  confidenceLabel: string;
  confidenceReason: string;
}

export interface FeatureDetailView {
  featureId: string;
  serviceName: string;
  owner: string;
  releaseVersion?: string;
  releaseDate?: string;
  businessGoal: string;
  status: FeatureStatus;
  intentVsReality: FeatureIntentVsReality;
  adoptionTrend: TimeSeriesDatum[];
  primaryKpiTrend: TimeSeriesDatum[];
  qualityMetric: {
    label: string;
    successRate: number;
    failureRate: number;
  };
  roiBreakdown: RoiBreakdown;
  recommendation: Decision;
  recommendationReason: string;
  governanceCheckpoints?: GovernanceCheckpoint[];
}

export interface KpiDefinition {
  kpiId: string;
  kpiName: string;
  definition: string;
  formula: string;
  requiredEvents: string[];
  requiredFields: string[];
  dataSource: 'telemetry' | 'support_tickets' | 'infra' | 'hybrid';
  category: 'adoption' | 'engagement' | 'outcome' | 'quality' | 'revenue';
  unit?: string;
}

export interface LiveTelemetryEvent {
  timestamp: string;
  userSessionHash: string;
  featureId: string;
  eventId: string;
  latencyMs: number;
  status: 'success' | 'failure' | 'timeout';
}

export interface OfflineQueueStatus {
  queuedEventCount: number;
  lastSyncTime: string;
  syncStatus: 'synced' | 'syncing' | 'queued';
}

export interface DashboardFilters {
  dateRange: DateRange;
  environment: Environment;
  showAssumptions: boolean;
}

export interface DashboardState {
  filters: DashboardFilters;
  selectedFeature?: string;
  expandedFeatures: Set<string>;
}
