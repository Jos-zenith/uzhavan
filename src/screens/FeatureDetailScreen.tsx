import React, { useState } from 'react';
import type {
  FeatureDetailView,
  GovernanceCheckpoint,
  TimeSeriesDatum,
  Decision,
} from '../types/roiConsole';
import '../styles/featureDetail.css';

interface Props {
  featureId?: string;
  onNavigateBack?: () => void;
  onNavigate?: (screen: string) => void;
}

// Simple LineChart component (no external library dependency)
const SimpleLineChart: React.FC<{ data: TimeSeriesDatum[]; label: string }> = ({
  data,
  label,
}) => {
  if (!data.length) return <div className="no-data">No data available</div>;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const width = 400;
  const height = 200;
  const padding = 40;
  const graphWidth = width - 2 * padding;
  const graphHeight = height - 2 * padding;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * graphWidth + padding;
    const y = height - ((d.value - minVal) / range) * graphHeight - padding;
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="simple-chart">
      <div className="chart-label">{label}</div>
      <svg width={width} height={height} className="chart-svg">
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((pct) => (
          <line
            key={`grid-${pct}`}
            x1={padding}
            y1={height - pct * graphHeight - padding}
            x2={width - padding}
            y2={height - pct * graphHeight - padding}
            stroke="rgba(255,255,255,0.1)"
            strokeDasharray="4,4"
          />
        ))}

        {/* Line path */}
        <path d={pathD} stroke="#7ad8ff" strokeWidth={2} fill="none" />

        {/* Points */}
        {points.map((p, i) => (
          <circle
            key={`point-${i}`}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="#7ad8ff"
            opacity={0.7}
            className="data-point"
          />
        ))}

        {/* Axes */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#666" strokeWidth={1} />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#666" strokeWidth={1} />
      </svg>
      <div className="chart-values">
        <div>Min: {minVal.toFixed(1)}</div>
        <div>Max: {maxVal.toFixed(1)}</div>
        <div>Latest: {points[points.length - 1]?.value.toFixed(1)}</div>
      </div>
    </div>
  );
};

const SimpleBarChart: React.FC<{ successRate: number; failureRate: number; label: string }> = ({
  successRate,
  failureRate,
  label,
}) => {
  const total = successRate + failureRate;
  const successPct = total > 0 ? (successRate / total) * 100 : 0;
  const failurePct = total > 0 ? (failureRate / total) * 100 : 0;

  return (
    <div className="bar-chart">
      <div className="chart-label">{label}</div>
      <div className="bar-container">
        <div className="bar-wrapper">
          <div className="bar success" style={{ width: `${successPct}%` }} />
          <div className="bar-label success-label">{successRate} success</div>
        </div>
        <div className="bar-wrapper">
          <div className="bar failure" style={{ width: `${failurePct}%` }} />
          <div className="bar-label failure-label">{failureRate} failed</div>
        </div>
      </div>
      <div className="bar-stats">
        <div>Success Rate: {successPct.toFixed(1)}%</div>
        <div>Failure Rate: {failurePct.toFixed(1)}%</div>
      </div>
    </div>
  );
};

export const FeatureDetailScreen: React.FC<Props> = ({
  featureId = 'WEATHER_FORECAST',
  onNavigateBack,
  onNavigate,
}) => {
  // Mock data - replace with actual data fetched by featureId
  const feature: FeatureDetailView = {
    featureId,
    serviceName: 'Weather Forecast',
    owner: 'Product Team A',
    releaseVersion: '2.1',
    releaseDate: '2024-02-15',
    businessGoal: 'Reduce time-to-market-price lookup by 20%',
    status: 'ready',
    intentVsReality: {
      goal: 'Reduce time-to-decision on irrigation by 20%',
      baseline: {
        metric: 'Avg time to access forecast',
        value: '3m 10s',
        unit: '',
      },
      current: {
        metric: 'Avg time to access forecast',
        value: '2m 20s',
        unit: '',
        percentChangeFromBaseline: -26,
      },
    },
    adoptionTrend: [
      { date: 'Day 1', value: 120, label: 'Mon' },
      { date: 'Day 2', value: 180, label: 'Tue' },
      { date: 'Day 3', value: 95, label: 'Wed' },
      { date: 'Day 4', value: 250, label: 'Thu' },
      { date: 'Day 5', value: 340, label: 'Fri' },
      { date: 'Day 6', value: 410, label: 'Sat' },
      { date: 'Day 7', value: 502, label: 'Sun' },
    ],
    primaryKpiTrend: [
      { date: 'Day 1', value: 210, label: 'Mon' },
      { date: 'Day 2', value: 195, label: 'Tue' },
      { date: 'Day 3', value: 180, label: 'Wed' },
      { date: 'Day 4', value: 165, label: 'Thu' },
      { date: 'Day 5', value: 155, label: 'Fri' },
      { date: 'Day 6', value: 145, label: 'Sat' },
      { date: 'Day 7', value: 140, label: 'Sun' },
    ],
    qualityMetric: {
      label: 'Data Availability',
      successRate: 1247,
      failureRate: 18,
    },
    roiBreakdown: {
      benefits: {
        timeSavedValue: 45000,
        costSavings: 12000,
        revenueLift: 8500,
        qualitativeLabels: ['Improved farmer satisfaction', 'Reduced support load'],
      },
      costs: {
        devCost: 8000,
        infraCost: 2000,
        supportMaintenance: 1200,
        totalCost: 11200,
      },
      roiPercent: 428,
      paybackPeriodDays: 7,
      confidenceLabel: 'High',
      confidenceReason: 'Sample size 12,000 sessions; stable for 30 days; pre/post validated',
    },
    recommendation: 'Scale',
    recommendationReason: 'High ROI + high adoption + stable performance. Ready for scale.',
    governanceCheckpoints: [
      { id: 'kpi-spec', label: 'KPI spec defined', completed: true, details: 'Defined 2024-02-10' },
      { id: 'baseline', label: 'Baseline captured', completed: true, details: 'Jan 2024 baseline: 3m 10s' },
      {
        id: 'target-delta',
        label: 'Target delta defined',
        completed: true,
        details: 'Target: −20% time',
      },
      { id: 'telemetry-registered', label: 'Telemetry registered', completed: true },
      { id: 'privacy-check', label: 'Privacy check ok', completed: true },
      { id: 'attribution-plan', label: 'Attribution: Pre/post', completed: true },
      { id: 'observation-window', label: 'Observation window met', completed: true },
    ],
  };

  const getDecisionColor = (decision: Decision): string => {
    switch (decision) {
      case 'Scale':
        return 'decision-scale';
      case 'Iterate':
        return 'decision-iterate';
      case 'Rollback':
        return 'decision-rollback';
      case 'Sunset':
        return 'decision-sunset';
      default:
        return '';
    }
  };

  return (
    <div className="feature-detail-screen">
      {/* Header */}
      <div className="detail-header">
        <button className="btn-back" onClick={onNavigateBack}>
          ← Back to Portfolio
        </button>

        <div className="feature-summary">
          <div className="feature-title-section">
            <h1>{feature.serviceName}</h1>
            {feature.releaseVersion && <span className="release-version">v{feature.releaseVersion}</span>}
            {feature.releaseDate && (
              <span className="release-date">Released {new Date(feature.releaseDate).toLocaleDateString()}</span>
            )}
          </div>

          <div className="feature-meta-row">
            <div className="meta-item">
              <span className="meta-label">Owner:</span>
              <span className="meta-value">{feature.owner}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Business Goal:</span>
              <span className="meta-value">{feature.businessGoal}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Status:</span>
              <span className={`status-badge status-${feature.status}`}>{feature.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Intent vs Reality */}
      <div className="intent-reality-section">
        <h2>📋 Intent vs Reality</h2>

        <div className="intent-reality-grid">
          <div className="intent-card goal-card">
            <div className="card-label">Goal</div>
            <div className="card-content">
              <div className="card-value">{feature.intentVsReality.goal}</div>
            </div>
          </div>

          <div className="intent-card baseline-card">
            <div className="card-label">Baseline</div>
            <div className="card-content">
              <div className="baseline-metric">{feature.intentVsReality.baseline.metric}</div>
              <div className="baseline-value">{feature.intentVsReality.baseline.value}</div>
            </div>
          </div>

          <div className="intent-card current-card">
            <div className="card-label">Current (Measured)</div>
            <div className="card-content">
              <div className="current-metric">{feature.intentVsReality.current.metric}</div>
              <div className="current-value">{feature.intentVsReality.current.value}</div>
              <div
                className={`percent-change ${feature.intentVsReality.current.percentChangeFromBaseline < 0 ? 'positive' : 'negative'}`}
              >
                {feature.intentVsReality.current.percentChangeFromBaseline < 0 ? '✓' : ''}
                {feature.intentVsReality.current.percentChangeFromBaseline}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-section">
        <h2>📈 Trends & Metrics</h2>

        <div className="charts-grid">
          <div className="chart-card">
            <SimpleLineChart data={feature.adoptionTrend} label="Daily Active Users (7d)" />
          </div>

          <div className="chart-card">
            <SimpleLineChart data={feature.primaryKpiTrend} label="Avg Time to Access (seconds)" />
          </div>

          <div className="chart-card">
            <SimpleBarChart
              successRate={feature.qualityMetric.successRate}
              failureRate={feature.qualityMetric.failureRate}
              label={feature.qualityMetric.label}
            />
          </div>
        </div>
      </div>

      {/* ROI Breakdown */}
      <div className="roi-breakdown-section">
        <h2>💰 ROI Breakdown</h2>

        <div className="roi-grid">
          <div className="roi-box benefits-box">
            <h3>Benefits</h3>
            <div className="benefit-item">
              <span className="benefit-label">Time Saved Value:</span>
              <span className="benefit-value">₹ {feature.roiBreakdown.benefits.timeSavedValue?.toLocaleString()}</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-label">Cost Savings:</span>
              <span className="benefit-value">₹ {feature.roiBreakdown.benefits.costSavings?.toLocaleString()}</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-label">Revenue Lift:</span>
              <span className="benefit-value">₹ {feature.roiBreakdown.benefits.revenueLift?.toLocaleString()}</span>
            </div>
            {feature.roiBreakdown.benefits.qualitativeLabels && (
              <div className="qualitative-tags">
                {feature.roiBreakdown.benefits.qualitativeLabels.map((tag, i) => (
                  <span key={i} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="roi-box costs-box">
            <h3>Costs</h3>
            <div className="cost-item">
              <span className="cost-label">Dev Cost:</span>
              <span className="cost-value">₹ {feature.roiBreakdown.costs.devCost.toLocaleString()}</span>
            </div>
            <div className="cost-item">
              <span className="cost-label">Infrastructure Cost:</span>
              <span className="cost-value">₹ {feature.roiBreakdown.costs.infraCost.toLocaleString()}</span>
            </div>
            <div className="cost-item">
              <span className="cost-label">Support & Maintenance:</span>
              <span className="cost-value">₹ {feature.roiBreakdown.costs.supportMaintenance.toLocaleString()}</span>
            </div>
            <div className="cost-total">
              <span className="cost-label">Total Cost:</span>
              <span className="cost-value">₹ {feature.roiBreakdown.costs.totalCost.toLocaleString()}</span>
            </div>
          </div>

          <div className="roi-box summary-box">
            <h3>ROI Summary</h3>
            <div className="roi-big-number">
              {feature.roiBreakdown.roiPercent > 0 ? '+' : ''}
              {feature.roiBreakdown.roiPercent}%
            </div>
            {feature.roiBreakdown.paybackPeriodDays && (
              <div className="payback-period">
                Payback: ~{feature.roiBreakdown.paybackPeriodDays} days
              </div>
            )}
            <div className="confidence-info">
              <strong className="confidence-label">{feature.roiBreakdown.confidenceLabel} Confidence</strong>
              <p className="confidence-reason">{feature.roiBreakdown.confidenceReason}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Governance Checkpoints */}
      {feature.governanceCheckpoints && (
        <div className="governance-section">
          <h2>🛡️ Release Readiness Checklist</h2>

          <div className="governance-list">
            {feature.governanceCheckpoints.map((checkpoint) => (
              <div key={checkpoint.id} className="governance-item-detail">
                <span className="checkpoint-check">{checkpoint.completed ? '✅' : '⏳'}</span>
                <span className="checkpoint-name">{checkpoint.label}</span>
                {checkpoint.details && <span className="checkpoint-detail-text">{checkpoint.details}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decision Banner */}
      <div className={`decision-banner ${getDecisionColor(feature.recommendation)}`}>
        <div className="decision-content">
          <h3>📊 Decision: {feature.recommendation}</h3>
          <p className="decision-reason">{feature.recommendationReason}</p>
        </div>

        <div className="decision-actions">
          <button className="btn-action" onClick={() => onNavigate?.('feature-detail')}>
            View Full Analysis
          </button>
          <button className="btn-action btn-secondary" onClick={() => onNavigate?.('telemetry-live')}>
            View Live Telemetry
          </button>
        </div>
      </div>
    </div>
  );
};
