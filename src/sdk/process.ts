import { readJson, writeJson } from './storage';
import type {
  FeatureExperimentPlan,
  FeatureOutcomeSpec,
  FeatureSpecValidationResult,
  KpiDefinition,
  KpiMetricEmitInput,
  Primitive,
  TelemetryPayload,
} from './types';

const DEFAULT_SPEC_STORAGE_KEY = 'tn.agri.sdk.feature.specs.v1';

type FeatureSpecStore = Record<string, FeatureOutcomeSpec>;

function normalizeNumber(value: number): number {
  return Number((Number.isFinite(value) ? value : 0).toFixed(4));
}

function validateExperimentPlan(plan: FeatureExperimentPlan): string[] {
  const errors: string[] = [];

  if (!plan.hypothesis.trim()) {
    errors.push('experimentPlan.hypothesis is required.');
  }

  if (!plan.segmentIds.length) {
    errors.push('experimentPlan.segmentIds must include at least one segment.');
  }

  if (!(plan.trafficPercent > 0 && plan.trafficPercent <= 100)) {
    errors.push('experimentPlan.trafficPercent must be between 0 and 100.');
  }

  if (plan.method === 'ab_test') {
    if (!plan.controlGroupId?.trim() || !plan.treatmentGroupId?.trim()) {
      errors.push('A/B test requires controlGroupId and treatmentGroupId.');
    }
  }

  if (plan.method === 'phased_rollout') {
    if (!plan.rolloutSteps?.length) {
      errors.push('Phased rollout requires rolloutSteps.');
    }
  }

  if (plan.method === 'pre_post') {
    if (!plan.prePeriodStart || !plan.postPeriodStart) {
      errors.push('Pre/post method requires prePeriodStart and postPeriodStart.');
    }
  }

  return errors;
}

export function validateFeatureOutcomeSpec(
  spec: FeatureOutcomeSpec
): FeatureSpecValidationResult {
  const errors: string[] = [];

  if (!spec.featureId.trim()) {
    errors.push('featureId is required.');
  }

  if (!spec.featureName.trim()) {
    errors.push('featureName is required.');
  }

  if (!spec.releaseId.trim()) {
    errors.push('releaseId is required.');
  }

  if (!spec.primaryGoals.length || spec.primaryGoals.length > 3) {
    errors.push('primaryGoals must contain 1 to 3 goals.');
  }

  if (!spec.kpis.length) {
    errors.push('At least one KPI is required.');
  }

  if (!spec.experimentPlan) {
    errors.push('experimentPlan is required.');
  } else {
    errors.push(...validateExperimentPlan(spec.experimentPlan));
  }

  if (!spec.owners.product.trim() || !spec.owners.engineering.trim() || !spec.owners.analytics.trim()) {
    errors.push('Owners for product, engineering, and analytics are required.');
  }

  const kpiIds = new Set<string>();
  spec.kpis.forEach((kpi, index) => {
    if (!kpi.kpiId.trim()) {
      errors.push(`kpis[${index}].kpiId is required.`);
    }
    if (!kpi.kpiName.trim()) {
      errors.push(`kpis[${index}].kpiName is required.`);
    }
    if (!kpi.measurementEventId.trim()) {
      errors.push(`kpis[${index}].measurementEventId is required.`);
    }
    if (kpiIds.has(kpi.kpiId)) {
      errors.push(`Duplicate KPI id detected: ${kpi.kpiId}`);
    }
    kpiIds.add(kpi.kpiId);
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export class FeatureOutcomeRegistry {
  constructor(private readonly storageKey = DEFAULT_SPEC_STORAGE_KEY) {}

  private readStore(): FeatureSpecStore {
    return readJson<FeatureSpecStore>(this.storageKey, {});
  }

  private writeStore(store: FeatureSpecStore): void {
    writeJson(this.storageKey, store);
  }

  upsert(spec: FeatureOutcomeSpec): FeatureSpecValidationResult {
    const validation = validateFeatureOutcomeSpec(spec);
    if (!validation.valid) {
      return validation;
    }

    const store = this.readStore();
    store[spec.featureId] = spec;
    this.writeStore(store);

    return validation;
  }

  list(): FeatureOutcomeSpec[] {
    return Object.values(this.readStore()).sort((a, b) =>
      a.featureName.localeCompare(b.featureName)
    );
  }

  get(featureId: string): FeatureOutcomeSpec | null {
    const store = this.readStore();
    return store[featureId] ?? null;
  }

  getKpi(featureId: string, kpiId: string): KpiDefinition | null {
    const spec = this.get(featureId);
    if (!spec) {
      return null;
    }

    return spec.kpis.find((kpi) => kpi.kpiId === kpiId) ?? null;
  }
}

export function buildKpiMetricPayload(
  spec: FeatureOutcomeSpec,
  kpi: KpiDefinition,
  currentValue: number,
  context?: Record<string, Primitive>
): TelemetryPayload {
  const safeCurrent = normalizeNumber(currentValue);
  const baseline = normalizeNumber(kpi.baselineValue);
  const targetDelta = normalizeNumber(kpi.targetDelta);
  const deltaFromBaseline = normalizeNumber(safeCurrent - baseline);

  const progressDenominator = targetDelta === 0 ? 1 : Math.abs(targetDelta);
  const signedProgress =
    kpi.targetDirection === 'increase'
      ? deltaFromBaseline / progressDenominator
      : (baseline - safeCurrent) / progressDenominator;

  const targetProgressPercent = normalizeNumber(signedProgress * 100);

  return {
    featureId: spec.featureId,
    featureName: spec.featureName,
    releaseId: spec.releaseId,
    kpiId: kpi.kpiId,
    kpiName: kpi.kpiName,
    baselineValue: baseline,
    currentValue: safeCurrent,
    targetDelta,
    targetDirection: kpi.targetDirection,
    deltaFromBaseline,
    targetProgressPercent,
    ...(context ?? {}),
  };
}

export function buildFeatureSpecFromTelemetrySpec(args: {
  featureId: string;
  featureName: string;
  releaseId: string;
  serviceId?: number;
  owners: {
    product: string;
    engineering: string;
    analytics: string;
  };
  goals: Array<{ goalId: string; category: FeatureOutcomeSpec['primaryGoals'][number]['category']; statement: string }>;
  kpis: KpiDefinition[];
  experimentPlan: FeatureExperimentPlan;
}): FeatureOutcomeSpec {
  return {
    featureId: args.featureId,
    featureName: args.featureName,
    releaseId: args.releaseId,
    serviceId: args.serviceId,
    owners: args.owners,
    primaryGoals: args.goals,
    kpis: args.kpis,
    experimentPlan: args.experimentPlan,
    createdAt: new Date().toISOString(),
  };
}

export function ensureKpiEmitInput(input: KpiMetricEmitInput): FeatureSpecValidationResult {
  const errors: string[] = [];

  if (!input.featureId.trim()) {
    errors.push('featureId is required.');
  }

  if (!input.kpiId.trim()) {
    errors.push('kpiId is required.');
  }

  if (!Number.isFinite(input.currentValue)) {
    errors.push('currentValue must be a finite number.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
