import React from 'react';
import {
  buildFeatureSpecFromTelemetrySpec,
  type FeatureOutcomeSpec,
  type TelemetryEvent,
  useOfflineAgriSdk,
} from '../sdk';
import {
  buildAdoptionStageInsightMatrix,
  computePredictiveRoi,
  detectThreeSigmaAnomalies,
  type TimeSeriesPoint,
} from '../roiEngine';
import '../styles/roiPortfolio.css';

const DEFAULT_DEMO_MODE =
  (process.env.REACT_APP_ROI_DEMO_MODE || 'false').trim().toLowerCase() !== 'false';

type ServiceMeasuredKpi = {
  featureId: string;
  serviceId: number;
  uniqueSessions7d: number;
  actionsCompleted7d: number;
  successRatePercent: number;
  p95LatencyMs: number;
};

const HERO_FEATURES: Array<{ featureId: string; serviceId: number; label: string }> = [
  { featureId: 'WEATHER_FORECAST', serviceId: 8, label: 'Weather Forecast' },
  { featureId: 'MARKET_PRICE', serviceId: 7, label: 'Market Price' },
];

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function percentile95(values: number[]): number {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function computeMeasuredKpi(
  events: TelemetryEvent[],
  featureId: string,
  serviceId: number
): ServiceMeasuredKpi {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const scoped = events.filter((event) => {
    if (event.serviceId !== serviceId) {
      return false;
    }

    if (event.payload.featureId !== featureId) {
      return false;
    }

    const occurredAt = new Date(event.occurredAt).getTime();
    return Number.isFinite(occurredAt) && occurredAt >= sevenDaysAgo;
  });

  const sessions = new Set<string>();
  const latencies: number[] = [];

  let succeeded = 0;
  let failed = 0;
  let actionsCompleted = 0;

  scoped.forEach((event) => {
    const sessionId = event.payload.sessionId;
    if (sessionId) {
      sessions.add(String(sessionId));
    }

    if (event.eventId === 'service_data_load_succeeded') {
      succeeded += 1;
      latencies.push(asNumber(event.payload.latencyMs));
    }

    if (event.eventId === 'service_data_load_failed') {
      failed += 1;
    }

    if (event.eventId === 'service_action_completed') {
      actionsCompleted += 1;
    }
  });

  const requests = succeeded + failed;
  const successRatePercent = requests > 0 ? (succeeded / requests) * 100 : 0;

  return {
    featureId,
    serviceId,
    uniqueSessions7d: sessions.size,
    actionsCompleted7d: actionsCompleted,
    successRatePercent: Number(successRatePercent.toFixed(2)),
    p95LatencyMs: Number(percentile95(latencies).toFixed(2)),
  };
}

function createDefaultSpecs(): FeatureOutcomeSpec[] {
  return [
    buildFeatureSpecFromTelemetrySpec({
      featureId: 'svc-4-fertilizer',
      featureName: 'Fertilizer Stock Intelligence',
      releaseId: '2026.02.r1',
      serviceId: 4,
      owners: {
        product: 'Agri PM',
        engineering: 'Platform Eng',
        analytics: 'Data Analytics',
      },
      goals: [
        {
          goalId: 'g1',
          category: 'cost_savings',
          statement: 'Reduce fertilizer procurement waste through stock visibility.',
        },
        {
          goalId: 'g2',
          category: 'productivity',
          statement: 'Reduce time spent finding available fertilizer sources.',
        },
      ],
      kpis: [
        {
          kpiId: 'kpi_cost_saved',
          kpiName: 'Average Cost Saved per Procurement',
          unit: 'INR',
          baselineValue: 0,
          targetDelta: 500,
          targetDirection: 'increase',
          measurementEventId: 'FEATURE_KPI_METRIC',
        },
        {
          kpiId: 'kpi_time_saved',
          kpiName: 'Minutes Saved per Search',
          unit: 'minutes',
          baselineValue: 0,
          targetDelta: 12,
          targetDirection: 'increase',
          measurementEventId: 'FEATURE_KPI_METRIC',
        },
      ],
      experimentPlan: {
        featureId: 'svc-4-fertilizer',
        method: 'phased_rollout',
        hypothesis:
          'District-level stock visibility reduces sourcing time and fertilizer waste during sowing windows.',
        trafficPercent: 40,
        segmentIds: ['delta_region', 'western_region'],
        rolloutSteps: [
          {
            stepLabel: 'pilot',
            trafficPercent: 10,
            segmentIds: ['delta_region'],
            startAt: '2026-02-01',
          },
          {
            stepLabel: 'expanded',
            trafficPercent: 40,
            segmentIds: ['delta_region', 'western_region'],
            startAt: '2026-02-15',
          },
        ],
      },
    }),
    buildFeatureSpecFromTelemetrySpec({
      featureId: 'svc-8-weather',
      featureName: 'Weather Advisory Intelligence',
      releaseId: '2026.02.r1',
      serviceId: 8,
      owners: {
        product: 'Agri PM',
        engineering: 'Data Platform',
        analytics: 'Risk Intelligence',
      },
      goals: [
        {
          goalId: 'g1',
          category: 'risk_reduction',
          statement: 'Reduce weather-driven operational loss events.',
        },
      ],
      kpis: [
        {
          kpiId: 'kpi_revenue_lift',
          kpiName: 'Incremental Revenue from Advisory Usage',
          unit: 'INR',
          baselineValue: 0,
          targetDelta: 1000,
          targetDirection: 'increase',
          measurementEventId: 'FEATURE_KPI_METRIC',
        },
      ],
      experimentPlan: {
        featureId: 'svc-8-weather',
        method: 'ab_test',
        hypothesis:
          'Actionable weather advisories improve seasonal revenue and lower loss risk.',
        trafficPercent: 50,
        segmentIds: ['rainfed', 'irrigated'],
        controlGroupId: 'control',
        treatmentGroupId: 'treatment',
      },
    }),
  ];
}

export default function RoiPortfolioScreen() {
  const sdk = useOfflineAgriSdk();
  const [ready, setReady] = React.useState(false);
  const [demoMode, setDemoMode] = React.useState(DEFAULT_DEMO_MODE);
  const initializedRef = React.useRef(false);
  const seededDemoRef = React.useRef(false);

  React.useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    const defaults = createDefaultSpecs();
    defaults.forEach((spec) => {
      sdk.registerFeatureOutcomeSpec(spec);

      sdk.registerTelemetrySpec({
        featureId: spec.featureId,
        featureName: spec.featureName,
        ownerProduct: spec.owners.product,
        ownerEngineering: spec.owners.engineering,
        ownerAnalytics: spec.owners.analytics,
        kpis: spec.kpis.map((kpi) => kpi.kpiName),
        events: [
          {
            eventId: 'FEATURE_KPI_METRIC',
            requiredFields: ['featureId', 'kpiId', 'currentValue'],
          },
        ],
      });

      sdk.setFeatureApprovals(spec.featureId, {
        productApproved: true,
        engineeringApproved: true,
        analyticsApproved: true,
        approvedAt: new Date().toISOString(),
      });
    });

    initializedRef.current = true;
    setReady(true);
  }, [sdk]);

  React.useEffect(() => {
    if (!demoMode || seededDemoRef.current) {
      return;
    }

    sdk.emitKpiMetric({
      featureId: 'svc-4-fertilizer',
      kpiId: 'kpi_cost_saved',
      currentValue: 620,
      serviceId: 4,
      context: {
        experimentGroupId: 'treatment',
        segmentId: 'western_region',
        district: 'Erode',
        userId: 'farmer-1001',
        costSavings: 620,
      },
    });

    sdk.emitKpiMetric({
      featureId: 'svc-4-fertilizer',
      kpiId: 'kpi_time_saved',
      currentValue: 14,
      serviceId: 4,
      context: {
        experimentGroupId: 'treatment',
        segmentId: 'western_region',
        district: 'Erode',
        userId: 'farmer-1001',
        timeSavedHours: 0.23,
        valuePerHour: 180,
      },
    });

    sdk.emitKpiMetric({
      featureId: 'svc-8-weather',
      kpiId: 'kpi_revenue_lift',
      currentValue: 1150,
      serviceId: 8,
      context: {
        experimentGroupId: 'treatment',
        segmentId: 'rainfed',
        district: 'Madurai',
        userId: 'farmer-2002',
        incrementalRevenue: 1150,
      },
    });

    seededDemoRef.current = true;
  }, [demoMode, sdk]);

  const specs = sdk.listFeatureOutcomeSpecs();
  const attribution = sdk.getAttributionReport();
  const experimentPlans = sdk.listExperimentPlans();
  const governanceRecords = sdk.getGovernanceRecords();
  const queuedEvents = sdk.getQueuedEvents();
  const experimentAttribution = specs
    .map((spec) => {
      const firstKpi = spec.kpis[0];
      if (!firstKpi) {
        return null;
      }
      return sdk.evaluateExperimentAttribution(spec.featureId, firstKpi.kpiId);
    })
    .filter(Boolean);

  const featureDashboards = specs.map((spec) =>
    sdk.computeRoiDashboard(
      {
        developmentCost: 350000,
        infrastructureCost: 90000,
        supportCost: 50000,
        maintenanceCost: 60000,
      },
      spec.serviceId,
      10000
    )
  );

  const portfolio = sdk.computePortfolioRoiDashboard(
    specs.map((spec) => ({
      serviceId: spec.serviceId,
      eligibleUsers: 10000,
      costs: {
        developmentCost: 350000,
        infrastructureCost: 90000,
        supportCost: 50000,
        maintenanceCost: 60000,
      },
    }))
  );

  const avgAdoptionRate = featureDashboards.length
    ? featureDashboards.reduce(
        (sum, dashboard) => sum + dashboard.leadingIndicators.adoptionRatePercent,
        0
      ) / featureDashboards.length
    : 0;

  const avgEngagementPerUser = featureDashboards.length
    ? featureDashboards.reduce(
        (sum, dashboard) => sum + dashboard.leadingIndicators.engagementEventsPerUser,
        0
      ) / featureDashboards.length
    : 0;

  const farmerDaysSinceOnboarding = 10;
  const predictiveInsight = computePredictiveRoi('Madurai', 'Millet', farmerDaysSinceOnboarding, [8, 13, 16, 3], {
    deltaYieldAi: 240,
    deltaMarketPrice: 2.4,
    deltaInputCostSavings: 3200,
    deltaTransactionCostSavings: 550,
    deltaOperationalCostSavings: 760,
    deltaRiskCostSavings: 640,
  });

  const matrixRows = buildAdoptionStageInsightMatrix({
    farmerDaysSinceOnboarding,
    adoptionRatePercent: avgAdoptionRate,
    engagementEventsPerUser: avgEngagementPerUser,
  });

  const yieldIncreasePercent =
    ((predictiveInsight.breakdown.adjustedYield - predictiveInsight.baselineUsed.avgYield) /
      predictiveInsight.baselineUsed.avgYield) *
    100;
  const baselineCostTotal =
    predictiveInsight.baselineUsed.avgInputCost +
    predictiveInsight.baselineUsed.avgTransactionCost +
    predictiveInsight.baselineUsed.avgInputCost * 0.12 +
    predictiveInsight.baselineUsed.avgInputCost * 0.08;
  const costSavingsDelta = baselineCostTotal - predictiveInsight.breakdown.totalCosts;
  const timeSavedHours = 14;
  const pestAlertsResolved = 5;

  const kpiSeries: TimeSeriesPoint[] = attribution.entries.map((entry) => ({
    label: `${entry.featureId}:${entry.kpiId}`,
    value: entry.attributedImpactScore,
  }));
  const anomalyReport = detectThreeSigmaAnomalies(kpiSeries);

  const measuredHeroKpis = React.useMemo(() => {
    return HERO_FEATURES.map((feature) => ({
      ...feature,
      metrics: computeMeasuredKpi(queuedEvents, feature.featureId, feature.serviceId),
      dashboard: sdk.computeRoiDashboard(
        {
          developmentCost: 180000,
          infrastructureCost: 30000,
          supportCost: 20000,
          maintenanceCost: 20000,
        },
        feature.serviceId,
        10000
      ),
    }));
  }, [queuedEvents, sdk]);

  return (
    <div className="roi-screen">
      <h1>ROI Portfolio Dashboard</h1>
      <p>
        Measurement-first governance: feature specs, KPI targets, attribution, and release gates.
      </p>

      <div style={{ marginBottom: '16px', padding: '12px', background: '#eef6ff', borderRadius: '8px' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={demoMode}
            onChange={(event) => setDemoMode(event.target.checked)}
          />
          Demo mode (inject synthetic KPI events)
        </label>
        <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
          Data source: {demoMode ? 'Demo data enabled for presentation scenarios.' : 'No synthetic data injection.'}
        </p>
      </div>

      {!ready ? <p>Preparing dashboard...</p> : null}

      <section className="roi-grid">
        <article className="roi-card">
          <h3>Portfolio ROI</h3>
          <p>{portfolio.totals.roiPercent.toFixed(2)}%</p>
          <small>
            Benefits ₹{portfolio.totals.totalBenefits.toFixed(2)} · Costs ₹
            {portfolio.totals.totalCosts.toFixed(2)}
          </small>
        </article>
        <article className="roi-card">
          <h3>Tracked Features</h3>
          <p>{attribution.totalTrackedFeatures}</p>
          <small>KPI Series: {attribution.totalKpiSeries}</small>
        </article>
        <article className="roi-card">
          <h3>Queue Size</h3>
          <p>{sdk.queueSize}</p>
          <small>{sdk.isOnline ? 'Online' : 'Offline'}</small>
        </article>
      </section>

      <section className="table-wrap">
        <h2>Measured KPI & ROI (Last 7 Days)</h2>
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Unique Sessions</th>
              <th>Actions Completed</th>
              <th>Success Rate %</th>
              <th>P95 Latency (ms)</th>
              <th>Measured ROI %</th>
            </tr>
          </thead>
          <tbody>
            {measuredHeroKpis.map((row) => (
              <tr key={row.featureId}>
                <td>{row.label}</td>
                <td>{row.metrics.uniqueSessions7d}</td>
                <td>{row.metrics.actionsCompleted7d}</td>
                <td>{row.metrics.successRatePercent.toFixed(2)}</td>
                <td>{row.metrics.p95LatencyMs.toFixed(2)}</td>
                <td>{row.dashboard.roiPercent.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: '10px', fontSize: '14px' }}>
          ROI is computed from emitted telemetry values (incrementalRevenue, costSaved, timeSavedHours, valuePerHour) and service cost model assumptions.
        </p>
      </section>

      <section className="impact-nudge-grid">
        {farmerDaysSinceOnboarding < 14 && (
          <article className="impact-nudge cold-start">
            <h3>Learning Mode (14-day warmup)</h3>
            <p>
              We are analyzing regional signals to unlock your first profit prediction.
            </p>
            <small>Estimated readiness: {14 - farmerDaysSinceOnboarding} days</small>
          </article>
        )}
        <article className="impact-nudge">
          <h3>Yield Increase</h3>
          <p>AI alerts helped increase yield by {yieldIncreasePercent.toFixed(1)}%</p>
          <small>Baseline: {predictiveInsight.baselineUsed.district}</small>
        </article>
        <article className="impact-nudge">
          <h3>Cost Savings</h3>
          <p>Saved ₹{Math.abs(costSavingsDelta).toFixed(0)} above district average</p>
          <small>Inputs + transactions + operational savings</small>
        </article>
        <article className="impact-nudge">
          <h3>Time Saved</h3>
          <p>Digital services saved you {timeSavedHours} hours of travel</p>
          <small>Assisted journeys this season</small>
        </article>
        {pestAlertsResolved >= 5 && (
          <article className="impact-nudge milestone">
            <h3>Milestone Triggered</h3>
            <p>Resolved {pestAlertsResolved} pest alerts this month</p>
            <small>High-impact card pushed immediately</small>
          </article>
        )}
      </section>

      <section className="table-wrap">
        <h2>Personalized Impact Insights</h2>
        <div className="insight-grid">
          <article className="insight-card">
            <h3>ROI Formula (Implemented)</h3>
            <p className="formula-line">{predictiveInsight.formulaUsed}</p>
            <small>
              P_net: ₹{predictiveInsight.netProfit.toFixed(2)} · Stage: {predictiveInsight.adoptionStage}
            </small>
          </article>
          <article className="insight-card">
            <h3>Synthetic Baseline (District Proxy)</h3>
            <p>
              {predictiveInsight.baselineUsed.district} · {predictiveInsight.baselineUsed.crop}
            </p>
            <small>
              Yield {predictiveInsight.baselineUsed.avgYield.toFixed(0)} | Price ₹
              {predictiveInsight.baselineUsed.avgMarketPrice.toFixed(2)} | Input ₹
              {predictiveInsight.baselineUsed.avgInputCost.toFixed(2)}
            </small>
          </article>
          <article className="insight-card">
            <h3>3 Sigma Anomaly Detection</h3>
            <p>{anomalyReport.anomalies.length} flagged KPI signals</p>
            <small>
              μ {anomalyReport.mean.toFixed(2)} · σ {anomalyReport.standardDeviation.toFixed(2)} ·
              threshold {anomalyReport.threshold.toFixed(2)}
            </small>
          </article>
        </div>
      </section>

      <section className="table-wrap">
        <h2>Learning Mode (Cold Start Cards)</h2>
        <div className="insight-grid">
          {predictiveInsight.learningModeCards.map((card) => (
            <article key={card.id} className="insight-card">
              <h3>{card.title}</h3>
              <p>{card.body}</p>
              <small>Priority: {card.priority}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="table-wrap">
        <h2>Adoption Stage Insight Matrix</h2>
        <table>
          <thead>
            <tr>
              <th>Stage</th>
              <th>Entry Criteria</th>
              <th>Expected Signal</th>
              <th>Recommended Action</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {matrixRows.map((row) => (
              <tr key={row.stage}>
                <td>{row.stage}</td>
                <td>{row.entryCriteria}</td>
                <td>{row.expectedSignal}</td>
                <td>{row.recommendedAction}</td>
                <td className={row.active ? 'matrix-active' : 'matrix-inactive'}>
                  {row.active ? 'Active' : 'Planned'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="table-wrap">
        <h2>Anomaly Flags (3 Sigma)</h2>
        <table>
          <thead>
            <tr>
              <th>Signal</th>
              <th>Value</th>
              <th>Z-Score</th>
            </tr>
          </thead>
          <tbody>
            {anomalyReport.anomalies.length ? (
              anomalyReport.anomalies.map((point) => (
                <tr key={point.label}>
                  <td>{point.label}</td>
                  <td>{point.value.toFixed(2)}</td>
                  <td>{point.zScore.toFixed(2)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3}>No anomalies above 3σ threshold in current KPI impact series.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="table-wrap">
        <h2>Governance Readiness</h2>
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Spec Owners</th>
              <th>Approved</th>
              <th>Release Gate</th>
            </tr>
          </thead>
          <tbody>
            {governanceRecords.map((record) => {
              const readiness = sdk.evaluateFeatureReadiness(record.featureId);
              const approved =
                record.approvals.productApproved &&
                record.approvals.engineeringApproved &&
                record.approvals.analyticsApproved;

              return (
                <tr key={record.featureId}>
                  <td>{record.featureId}</td>
                  <td>
                    {record.telemetrySpec.ownerProduct} / {record.telemetrySpec.ownerEngineering} /
                    {' '}
                    {record.telemetrySpec.ownerAnalytics}
                  </td>
                  <td>{approved ? 'Yes' : 'No'}</td>
                  <td>{readiness.ready ? 'Ready' : 'Blocked'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="table-wrap">
        <h2>Experiment Scope Plan</h2>
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Method</th>
              <th>Traffic %</th>
              <th>Segments</th>
            </tr>
          </thead>
          <tbody>
            {experimentPlans.map((plan) => (
              <tr key={plan.featureId}>
                <td>{plan.featureId}</td>
                <td>{plan.method}</td>
                <td>{plan.trafficPercent.toFixed(2)}</td>
                <td>{plan.segmentIds.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="table-wrap">
        <h2>Experiment Attribution (Primary KPI)</h2>
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Method</th>
              <th>KPI</th>
              <th>Control Avg</th>
              <th>Treatment Avg</th>
              <th>Uplift %</th>
              <th>Sample Size</th>
            </tr>
          </thead>
          <tbody>
            {experimentAttribution.map((row) => (
              <tr key={`${row!.featureId}-${row!.kpiId}`}>
                <td>{row!.featureId}</td>
                <td>{row!.method}</td>
                <td>{row!.kpiId}</td>
                <td>{row!.controlAverage.toFixed(2)}</td>
                <td>{row!.treatmentAverage.toFixed(2)}</td>
                <td>{row!.upliftPercent.toFixed(2)}</td>
                <td>{row!.totalSampleSize}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="table-wrap">
        <h2>Feature ROI Recommendations</h2>
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>ROI %</th>
              <th>Adoption %</th>
              <th>Engagement / User</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {featureDashboards.map((dashboard, index) => (
              <tr key={`${dashboard.serviceId}-${index}`}>
                <td>{dashboard.serviceId ?? '-'}</td>
                <td>{dashboard.roiPercent.toFixed(2)}</td>
                <td>{dashboard.leadingIndicators.adoptionRatePercent.toFixed(2)}</td>
                <td>{dashboard.leadingIndicators.engagementEventsPerUser.toFixed(2)}</td>
                <td className={`action ${dashboard.recommendation}`}>{dashboard.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="table-wrap">
        <h2>KPI Attribution</h2>
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>KPI</th>
              <th>Baseline</th>
              <th>Latest</th>
              <th>Target Δ</th>
              <th>Progress %</th>
              <th>Impact Score</th>
            </tr>
          </thead>
          <tbody>
            {attribution.entries.map((entry) => (
              <tr key={`${entry.featureId}-${entry.kpiId}`}>
                <td>{entry.featureName}</td>
                <td>{entry.kpiName}</td>
                <td>{entry.baselineValue.toFixed(2)}</td>
                <td>{entry.latestValue.toFixed(2)}</td>
                <td>{entry.targetDelta.toFixed(2)}</td>
                <td>{entry.targetProgressPercent.toFixed(2)}</td>
                <td>{entry.attributedImpactScore.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
