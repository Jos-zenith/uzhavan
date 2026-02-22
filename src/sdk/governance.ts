import { readJson, writeJson } from './storage';
import type {
  FeatureGovernanceRecord,
  FeatureSpecApproval,
  FeatureTelemetrySpec,
  ReleaseReadinessResult,
} from './types';

const DEFAULT_GOVERNANCE_STORAGE_KEY = 'tn.agri.sdk.governance.records.v1';

type GovernanceStore = Record<string, FeatureGovernanceRecord>;

export function validateTelemetrySpec(spec: FeatureTelemetrySpec): ReleaseReadinessResult {
  const reasons: string[] = [];

  if (!spec.featureId.trim()) {
    reasons.push('featureId is required.');
  }

  if (!spec.featureName.trim()) {
    reasons.push('featureName is required.');
  }

  if (!spec.ownerProduct.trim()) {
    reasons.push('Product owner is required.');
  }

  if (!spec.ownerEngineering.trim()) {
    reasons.push('Engineering owner is required.');
  }

  if (!spec.ownerAnalytics.trim()) {
    reasons.push('Analytics owner is required.');
  }

  if (!spec.kpis.length) {
    reasons.push('At least one KPI must be defined.');
  }

  if (!spec.events.length) {
    reasons.push('At least one telemetry event must be defined.');
  }

  spec.events.forEach((event, index) => {
    if (!event.eventId.trim()) {
      reasons.push(`events[${index}].eventId is required.`);
    }

    if (!event.requiredFields.length) {
      reasons.push(`events[${index}] must include requiredFields.`);
    }
  });

  return {
    ready: reasons.length === 0,
    reasons,
  };
}

export function evaluateReleaseReadiness(
  spec: FeatureTelemetrySpec,
  approval: FeatureSpecApproval,
  observedEventIds: string[]
): ReleaseReadinessResult {
  const reasons: string[] = [];

  const specValidation = validateTelemetrySpec(spec);
  if (!specValidation.ready) {
    reasons.push(...specValidation.reasons);
  }

  if (!approval.productApproved) {
    reasons.push('Product approval is required before release.');
  }

  if (!approval.engineeringApproved) {
    reasons.push('Engineering approval is required before release.');
  }

  if (!approval.analyticsApproved) {
    reasons.push('Analytics approval is required before release.');
  }

  const observed = new Set(observedEventIds);
  const missingEvents = spec.events
    .map((entry) => entry.eventId)
    .filter((eventId) => !observed.has(eventId));

  if (missingEvents.length) {
    reasons.push(`Instrumentation missing for events: ${missingEvents.join(', ')}`);
  }

  return {
    ready: reasons.length === 0,
    reasons,
  };
}

export function nextPortfolioAction(
  roiPercent: number,
  adoptionRatePercent: number,
  engagementTrendDelta: number
): 'iterate' | 'scale' | 'retire' {
  if (roiPercent >= 30 && adoptionRatePercent >= 40 && engagementTrendDelta >= 0) {
    return 'scale';
  }

  if (roiPercent < 0 && adoptionRatePercent < 15 && engagementTrendDelta < 0) {
    return 'retire';
  }

  return 'iterate';
}

export class GovernanceRegistry {
  constructor(private readonly storageKey = DEFAULT_GOVERNANCE_STORAGE_KEY) {}

  private readStore(): GovernanceStore {
    return readJson<GovernanceStore>(this.storageKey, {});
  }

  private writeStore(store: GovernanceStore): void {
    writeJson(this.storageKey, store);
  }

  upsertTelemetrySpec(spec: FeatureTelemetrySpec): ReleaseReadinessResult {
    const validation = validateTelemetrySpec(spec);
    if (!validation.ready) {
      return validation;
    }

    const store = this.readStore();
    const existing = store[spec.featureId];
    const now = new Date().toISOString();

    store[spec.featureId] = {
      featureId: spec.featureId,
      telemetrySpec: spec,
      approvals: existing?.approvals ?? {
        productApproved: false,
        engineeringApproved: false,
        analyticsApproved: false,
      },
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.writeStore(store);
    return validation;
  }

  setApprovals(featureId: string, approvals: FeatureSpecApproval): void {
    const store = this.readStore();
    const existing = store[featureId];
    const now = new Date().toISOString();

    if (!existing) {
      return;
    }

    store[featureId] = {
      ...existing,
      approvals,
      updatedAt: now,
    };
    this.writeStore(store);
  }

  getRecord(featureId: string): FeatureGovernanceRecord | null {
    const store = this.readStore();
    return store[featureId] ?? null;
  }

  listRecords(): FeatureGovernanceRecord[] {
    return Object.values(this.readStore()).sort((a, b) =>
      a.featureId.localeCompare(b.featureId)
    );
  }

  evaluateFeatureReadiness(
    featureId: string,
    observedEventIds: string[]
  ): ReleaseReadinessResult {
    const record = this.getRecord(featureId);
    if (!record) {
      return {
        ready: false,
        reasons: [`No governance record found for featureId=${featureId}`],
      };
    }

    return evaluateReleaseReadiness(
      record.telemetrySpec,
      record.approvals,
      observedEventIds
    );
  }
}
