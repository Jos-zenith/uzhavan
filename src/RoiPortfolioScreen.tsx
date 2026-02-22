import React from 'react';
import {
  buildFeatureSpecFromTelemetrySpec,
  type FeatureOutcomeSpec,
  useOfflineAgriSdk,
} from './sdk';
import './styles/roiPortfolio.css';

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

  React.useEffect(() => {
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

    setReady(true);
  }, [sdk]);

  const specs = sdk.listFeatureOutcomeSpecs();
  const attribution = sdk.getAttributionReport();
  const experimentPlans = sdk.listExperimentPlans();
  const governanceRecords = sdk.getGovernanceRecords();
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

  return (
    <div className="roi-screen">
      <h1>ROI Portfolio Dashboard</h1>
      <p>
        Measurement-first governance: feature specs, KPI targets, attribution, and release gates.
      </p>

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
