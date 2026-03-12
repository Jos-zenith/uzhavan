import React, { useState } from 'react';
import type {
  ExecutiveKPI,
  PortfolioFeature,
  GovernanceCheckpoint,
  DateRange,
  Environment,
  DashboardFilters,
} from '../types/roiConsole';
import '../styles/roiDashboard.css';

interface Props {
  onSelectFeature?: (featureId: string) => void;
  onNavigate?: (screen: string) => void;
}

export const FeatureRoiDashboard: React.FC<Props> = ({ onSelectFeature, onNavigate }) => {
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: '7d',
    environment: 'prod',
    showAssumptions: false,
  });

  const [sortKey, setSortKey] = useState<keyof PortfolioFeature>('roiPercent');
  const [sortDesc, setSortDesc] = useState(true);

  // Mock data - replace with actual data in production
  const executiveKpis: ExecutiveKPI[] = [
    {
      id: 'features-measured',
      label: 'Total Features Measured',
      value: '18 / 18',
      context: 'instrumented',
    },
    {
      id: 'portfolio-roi',
      label: 'Portfolio ROI',
      value: '+42%',
      context: 'based on measured benefits',
    },
    {
      id: 'adoption',
      label: 'Active Farmers',
      value: '3,247',
      unit: 'last 7 days',
    },
    {
      id: 'reliability',
      label: 'Telemetry Coverage',
      value: '99.2%',
      unit: 'Event success rate',
    },
  ];

  const portfolioFeatures: PortfolioFeature[] = [
    {
      featureId: 'WEATHER_FORECAST',
      serviceName: 'Weather Forecast',
      owner: 'Product Team A',
      status: 'ready',
      adoptionUniqueUsers: 1247,
      outcomeKpi: {
        name: 'Time Saved',
        value: '18',
        unit: 'min/session',
      },
      roiPercent: 68,
      confidence: 'High',
      lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      version: '2.1',
      businessGoal: 'Reduce time-to-decision on irrigation',
    },
    {
      featureId: 'MARKET_PRICE',
      serviceName: 'Market Price Lookup',
      owner: 'Product Team B',
      status: 'ready',
      adoptionUniqueUsers: 892,
      outcomeKpi: {
        name: 'Error Rate ↓',
        value: '0.8%',
        unit: '',
      },
      roiPercent: 52,
      confidence: 'High',
      lastUpdated: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      version: '1.9',
      businessGoal: 'Accurate market intelligence',
    },
    {
      featureId: 'FERTILIZER_STOCK',
      serviceName: 'Fertilizer Stock Tracking',
      owner: 'Product Team A',
      status: 'measuring',
      adoptionUniqueUsers: 156,
      outcomeKpi: {
        name: 'Inventory Accuracy',
        value: '+34%',
        unit: '',
      },
      roiPercent: 28,
      confidence: 'Med',
      lastUpdated: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      version: '1.0',
      businessGoal: 'Reduce stock-outs',
    },
    {
      featureId: 'SEED_STOCK',
      serviceName: 'Seed Stock Management',
      owner: 'Product Team C',
      status: 'missing-kpi',
      adoptionUniqueUsers: 423,
      outcomeKpi: {
        name: 'Adoption %',
        value: '35%',
        unit: '',
      },
      roiPercent: 0,
      confidence: 'Low',
      lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      version: '0.8',
      businessGoal: 'Seed procurement optimization',
    },
  ];

  const governanceCheckpoints: GovernanceCheckpoint[] = [
    { id: 'kpi-spec', label: '✅ KPI spec defined', completed: true },
    { id: 'baseline', label: '✅ Baseline captured', completed: true },
    { id: 'target-delta', label: '✅ Target delta defined', completed: true },
    { id: 'telemetry-registered', label: '✅ Telemetry events registered', completed: true },
    { id: 'privacy-check', label: '✅ Privacy check ok', completed: true },
    { id: 'attribution-plan', label: '✅ Attribution plan selected', completed: true },
    { id: 'observation-window', label: '✅ Observation window met', completed: true },
  ];

  const statusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return '✅';
      case 'measuring':
        return '⏱️';
      case 'missing-kpi':
        return '⚠️';
      case 'no-telemetry':
        return '❌';
      default:
        return '❓';
    }
  };

  const confidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High':
        return 'confidence-high';
      case 'Med':
        return 'confidence-med';
      case 'Low':
        return 'confidence-low';
      default:
        return '';
    }
  };

  const sortedFeatures = [...portfolioFeatures].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDesc ? bVal - aVal : aVal - bVal;
    }
    return 0;
  });

  const handleSort = (key: keyof PortfolioFeature) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  const handleRowClick = (featureId: string) => {
    onSelectFeature?.(featureId);
    onNavigate?.('feature-detail');
  };

  return (
    <div className="roi-dashboard">
      {/* Header */}
      <div className="roi-header">
        <div className="roi-header-title">
          <h1>🚀 Uzhavan – Feature ROI & Telemetry Console</h1>
          <p className="roi-subtitle">
            Data-driven feature management • Portfolio view • Governance gates
          </p>
        </div>

        <div className="roi-header-controls">
          <div className="control-group">
            <label htmlFor="date-range">Date Range:</label>
            <select
              id="date-range"
              value={filters.dateRange}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  dateRange: e.target.value as DateRange,
                }))
              }
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="environment">Environment:</label>
            <select
              id="environment"
              value={filters.environment}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  environment: e.target.value as Environment,
                }))
              }
            >
              <option value="prod">Production</option>
              <option value="staging">Staging</option>
              <option value="demo">Demo</option>
            </select>
          </div>

          <div className="control-group control-checkbox">
            <label htmlFor="show-assumptions">
              <input
                id="show-assumptions"
                type="checkbox"
                checked={filters.showAssumptions}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    showAssumptions: e.target.checked,
                  }))
                }
              />
              Show assumptions
            </label>
          </div>
        </div>
      </div>

      {/* Executive KPIs */}
      <div className="executive-kpis">
        {executiveKpis.map((kpi) => (
          <div key={kpi.id} className="kpi-card">
            <div className="kpi-card-label">{kpi.label}</div>
            <div className="kpi-card-value">{kpi.value}</div>
            {kpi.context && <div className="kpi-card-context">{kpi.context}</div>}
            {kpi.unit && <div className="kpi-card-unit">{kpi.unit}</div>}
          </div>
        ))}
      </div>

      {/* Portfolio Table */}
      <div className="portfolio-section">
        <div className="section-header">
          <h2>📊 Feature Portfolio (Sortable)</h2>
          <div className="section-meta">
            <span className="feature-count">{portfolioFeatures.length} features</span>
            <span className="ready-count">
              {portfolioFeatures.filter((f) => f.status === 'ready').length} ready
            </span>
          </div>
        </div>

        <div className="table-container">
          <table className="portfolio-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('serviceName')} className="sortable">
                  Service / Feature {sortKey === 'serviceName' && (sortDesc ? '↓' : '↑')}
                </th>
                <th>Owner</th>
                <th>Status</th>
                <th onClick={() => handleSort('adoptionUniqueUsers')} className="sortable">
                  Adoption (7d) {sortKey === 'adoptionUniqueUsers' && (sortDesc ? '↓' : '↑')}
                </th>
                <th>Outcome KPI</th>
                <th onClick={() => handleSort('roiPercent')} className="sortable">
                  ROI % {sortKey === 'roiPercent' && (sortDesc ? '↓' : '↑')}
                </th>
                <th>Confidence</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {sortedFeatures.map((feature) => (
                <tr
                  key={feature.featureId}
                  className="portfolio-row"
                  onClick={() => handleRowClick(feature.featureId)}
                >
                  <td className="feature-name">
                    <span className="feature-name-text">{feature.serviceName}</span>
                    {feature.version && <span className="feature-version">v{feature.version}</span>}
                  </td>
                  <td>{feature.owner}</td>
                  <td className="status-cell">
                    <span className="status-badge">{statusIcon(feature.status)}</span>
                    <span className="status-label">{feature.status}</span>
                  </td>
                  <td className="adoption-cell">
                    <strong>{feature.adoptionUniqueUsers.toLocaleString()}</strong>
                    <span className="adoption-label">users</span>
                  </td>
                  <td className="kpi-cell">
                    <div className="kpi-name">{feature.outcomeKpi.name}</div>
                    <div className="kpi-value">
                      {feature.outcomeKpi.value} {feature.outcomeKpi.unit}
                    </div>
                  </td>
                  <td className="roi-cell">
                    <div className={`roi-percentage ${feature.roiPercent > 0 ? 'positive' : 'neutral'}`}>
                      {feature.roiPercent > 0 ? '+' : ''}{feature.roiPercent}%
                    </div>
                  </td>
                  <td>
                    <span className={`confidence-badge ${confidenceColor(feature.confidence)}`}>
                      {feature.confidence}
                    </span>
                  </td>
                  <td className="timestamp-cell">{new Date(feature.lastUpdated).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Governance Gate Panel */}
      <div className="governance-panel">
        <div className="section-header">
          <h2>🛡️ Release Readiness / Governance Gate</h2>
          <span className="help-text">Proof of standardized metrics process</span>
        </div>

        <div className="governance-checklist">
          {governanceCheckpoints.map((checkpoint) => (
            <div
              key={checkpoint.id}
              className={`governance-item ${checkpoint.completed ? 'completed' : 'pending'}`}
            >
              <span className="checkpoint-label">{checkpoint.label}</span>
              {checkpoint.details && <span className="checkpoint-details">{checkpoint.details}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="info-box">
        <strong>💡 How to use this console:</strong>
        <ul>
          <li>
            <strong>Executive KPIs:</strong> Understand portfolio health at a glance
          </li>
          <li>
            <strong>Portfolio Table:</strong> Click any feature to see detailed KPI story, ROI breakdown,
            and decision recommendations
          </li>
          <li>
            <strong>Governance Gate:</strong> Confirms metrics capture is standardized and repeatable
          </li>
        </ul>
      </div>
    </div>
  );
};
