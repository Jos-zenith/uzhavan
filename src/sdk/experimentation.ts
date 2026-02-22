import { readJson, writeJson } from './storage';
import type {
  ExperimentAttributionResult,
  FeatureExperimentPlan,
  FeatureOutcomeSpec,
  TelemetryEvent,
} from './types';

const DEFAULT_EXPERIMENT_STORAGE_KEY = 'tn.agri.sdk.feature.experiments.v1';

type ExperimentStore = Record<string, FeatureExperimentPlan>;

function safeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function avg(values: number[]): number {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, item) => sum + item, 0) / values.length;
}

function eventSegmentId(event: TelemetryEvent): string {
  const candidate = event.payload.segmentId ?? event.payload.userSegment ?? event.payload.district;
  return candidate ? String(candidate) : 'unknown';
}

export class ExperimentPlanRegistry {
  constructor(private readonly storageKey = DEFAULT_EXPERIMENT_STORAGE_KEY) {}

  private readStore(): ExperimentStore {
    return readJson<ExperimentStore>(this.storageKey, {});
  }

  private writeStore(store: ExperimentStore): void {
    writeJson(this.storageKey, store);
  }

  upsert(plan: FeatureExperimentPlan): void {
    const store = this.readStore();
    store[plan.featureId] = plan;
    this.writeStore(store);
  }

  get(featureId: string): FeatureExperimentPlan | null {
    return this.readStore()[featureId] ?? null;
  }

  list(): FeatureExperimentPlan[] {
    return Object.values(this.readStore());
  }
}

export function evaluateExperimentAttribution(args: {
  spec: FeatureOutcomeSpec;
  kpiId: string;
  metricEventId: string;
  events: TelemetryEvent[];
}): ExperimentAttributionResult {
  const { spec, kpiId, metricEventId, events } = args;
  const plan = spec.experimentPlan;

  const scopedEvents = events.filter((event) => {
    return (
      event.eventId === metricEventId &&
      event.payload.featureId === spec.featureId &&
      event.payload.kpiId === kpiId
    );
  });

  const controlId = plan.controlGroupId ?? 'control';
  const treatmentId = plan.treatmentGroupId ?? 'treatment';

  const controlValues: number[] = [];
  const treatmentValues: number[] = [];
  const segmentMap = new Map<string, number[]>();

  scopedEvents.forEach((event) => {
    const currentValue = safeNumber(event.payload.currentValue);
    const groupId = String(event.payload.experimentGroupId ?? treatmentId);
    const segmentId = eventSegmentId(event);

    if (!segmentMap.has(segmentId)) {
      segmentMap.set(segmentId, []);
    }
    segmentMap.get(segmentId)!.push(currentValue);

    if (groupId === controlId) {
      controlValues.push(currentValue);
    } else {
      treatmentValues.push(currentValue);
    }
  });

  const controlAverage = avg(controlValues);
  const treatmentAverage = avg(treatmentValues);

  const upliftPercent =
    controlAverage !== 0
      ? ((treatmentAverage - controlAverage) / Math.abs(controlAverage)) * 100
      : treatmentAverage > 0
      ? 100
      : 0;

  const segmentResults = Array.from(segmentMap.entries()).map(([segmentId, values]) => {
    const averageKpiValue = avg(values);
    return {
      segmentId,
      sampleSize: values.length,
      averageKpiValue: Number(averageKpiValue.toFixed(4)),
      deltaVsControl: Number((averageKpiValue - controlAverage).toFixed(4)),
    };
  });

  return {
    featureId: spec.featureId,
    method: plan.method,
    kpiId,
    metricEventId,
    trafficPercent: plan.trafficPercent,
    totalSampleSize: scopedEvents.length,
    controlAverage: Number(controlAverage.toFixed(4)),
    treatmentAverage: Number(treatmentAverage.toFixed(4)),
    upliftPercent: Number(upliftPercent.toFixed(2)),
    segmentResults,
    generatedAt: new Date().toISOString(),
  };
}
