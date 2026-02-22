import type {
  FeatureAttributionReport,
  FeatureKpiAttribution,
  FeatureOutcomeSpec,
  TelemetryEvent,
} from './types';

function safeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function latestEventForKpi(events: TelemetryEvent[], featureId: string, kpiId: string): TelemetryEvent | null {
  const filtered = events.filter(
    (event) =>
      event.payload.featureId === featureId &&
      event.payload.kpiId === kpiId &&
      event.eventId === 'FEATURE_KPI_METRIC'
  );

  if (!filtered.length) {
    return null;
  }

  return filtered.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
}

export function buildFeatureAttributionReport(
  specs: FeatureOutcomeSpec[],
  events: TelemetryEvent[]
): FeatureAttributionReport {
  const totalEvents = events.length || 1;
  const entries: FeatureKpiAttribution[] = [];

  specs.forEach((spec) => {
    spec.kpis.forEach((kpi) => {
      const latest = latestEventForKpi(events, spec.featureId, kpi.kpiId);
      const latestValue = safeNumber(latest?.payload.currentValue);
      const baselineValue = safeNumber(kpi.baselineValue);
      const targetDelta = safeNumber(kpi.targetDelta);

      const deltaFromBaseline = latestValue - baselineValue;
      const progressNumerator = kpi.targetDirection === 'increase'
        ? deltaFromBaseline
        : baselineValue - latestValue;
      const progressDenominator = targetDelta === 0 ? 1 : Math.abs(targetDelta);
      const targetProgressPercent = (progressNumerator / progressDenominator) * 100;

      const relatedEvents = events.filter((event) => {
        return event.payload.featureId === spec.featureId;
      }).length;

      const attributedImpactScore = (relatedEvents / totalEvents) * 100;

      entries.push({
        featureId: spec.featureId,
        featureName: spec.featureName,
        releaseId: spec.releaseId,
        kpiId: kpi.kpiId,
        kpiName: kpi.kpiName,
        baselineValue: Number(baselineValue.toFixed(4)),
        targetDelta: Number(targetDelta.toFixed(4)),
        targetDirection: kpi.targetDirection,
        latestValue: Number(latestValue.toFixed(4)),
        deltaFromBaseline: Number(deltaFromBaseline.toFixed(4)),
        targetProgressPercent: Number(targetProgressPercent.toFixed(2)),
        attributedImpactScore: Number(attributedImpactScore.toFixed(2)),
      });
    });
  });

  return {
    generatedAt: new Date().toISOString(),
    totalTrackedFeatures: specs.length,
    totalKpiSeries: entries.length,
    entries,
  };
}
