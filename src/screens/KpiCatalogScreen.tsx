import React, { useState } from 'react';
import type { KpiDefinition } from '../types/roiConsole';
import '../styles/kpiCatalog.css';

interface Props {
  onNavigateBack?: () => void;
  onNavigate?: (screen: string) => void;
}

export const KpiCatalogScreen: React.FC<Props> = ({ onNavigateBack, onNavigate }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedKpiId, setExpandedKpiId] = useState<string | null>(null);

  const kpiDefinitions: KpiDefinition[] = [
    {
      kpiId: 'adoption_rate',
      kpiName: 'Feature Adoption Rate',
      definition: 'Percentage of active users (DAU/MAU) who used the feature in the measured period',
      formula: 'Unique feature users / Total active users × 100',
      requiredEvents: ['service_data_load_succeeded', 'service_action_completed'],
      requiredFields: ['userId', 'featureId', 'occurredAt'],
      dataSource: 'telemetry',
      category: 'adoption',
      unit: '%',
    },
    {
      kpiId: 'time_saved',
      kpiName: 'Time Saved (Task Completion)',
      definition: 'Reduction in time to complete a task using the feature vs. baseline',
      formula: '(Baseline avg time − Current avg time) / Baseline avg time × 100',
      requiredEvents: ['service_action_started', 'service_action_completed'],
      requiredFields: ['latencyMs', 'featureId', 'sessionId'],
      dataSource: 'telemetry',
      category: 'outcome',
      unit: 'min',
    },
    {
      kpiId: 'success_rate',
      kpiName: 'Success Rate',
      definition: 'Percentage of requests that complete successfully without errors',
      formula: 'Successful requests / Total requests × 100',
      requiredEvents: ['service_data_load_succeeded', 'service_data_load_failed'],
      requiredFields: ['eventId', 'featureId'],
      dataSource: 'telemetry',
      category: 'quality',
      unit: '%',
    },
    {
      kpiId: 'p95_latency',
      kpiName: 'P95 Latency',
      definition: '95th percentile of request latency; measures tail performance',
      formula: 'Percentile(latencyMs, 0.95)',
      requiredEvents: ['service_action_completed'],
      requiredFields: ['latencyMs', 'featureId'],
      dataSource: 'telemetry',
      category: 'quality',
      unit: 'ms',
    },
    {
      kpiId: 'error_rate',
      kpiName: 'Error Rate',
      definition: 'Percentage of requests that fail or timeout',
      formula: 'Failed requests / Total requests × 100',
      requiredEvents: ['service_data_load_failed', 'service_action_failed'],
      requiredFields: ['eventId', 'featureId'],
      dataSource: 'telemetry',
      category: 'quality',
      unit: '%',
    },
    {
      kpiId: 'engagement',
      kpiName: 'Engagement Score',
      definition: 'Average number of feature interactions per active user',
      formula: 'Total feature events / Unique users',
      requiredEvents: ['service_data_load_succeeded', 'service_action_completed'],
      requiredFields: ['userId', 'featureId'],
      dataSource: 'telemetry',
      category: 'engagement',
      unit: 'events/user',
    },
    {
      kpiId: 'cost_savings',
      kpiName: 'Cost Savings Value',
      definition: 'Monetary value of operational cost reductions attributed to the feature',
      formula: 'Baseline cost − New cost (after feature deployment)',
      requiredEvents: ['business_transaction_completed'],
      requiredFields: ['costValue', 'featureId', 'transactionType'],
      dataSource: 'hybrid',
      category: 'revenue',
      unit: '₹',
    },
    {
      kpiId: 'revenue_lift',
      kpiName: 'Revenue Lift',
      definition: 'Incremental revenue directly attributed to the feature',
      formula: '(Revenue with feature − Baseline revenue) / Baseline revenue × 100',
      requiredEvents: ['transaction_completed', 'service_action_completed'],
      requiredFields: ['transactionValue', 'featureId'],
      dataSource: 'hybrid',
      category: 'revenue',
      unit: '₹',
    },
    {
      kpiId: 'support_tickets',
      kpiName: 'Support Ticket Reduction',
      definition: 'Decrease in support tickets attributed to feature reducing friction',
      formula: '(Baseline tickets − Current tickets) / Baseline tickets × 100',
      requiredEvents: ['feature_used_to_self_serve'],
      requiredFields: ['ticketCategory', 'resolved', 'featureId'],
      dataSource: 'support_tickets',
      category: 'outcome',
      unit: 'tickets',
    },
  ];

  const categories = ['all', 'adoption', 'engagement', 'outcome', 'quality', 'revenue'];

  const filteredKpis = kpiDefinitions.filter((kpi) => {
    const matchesCategory = selectedCategory === 'all' || kpi.category === selectedCategory;
    const matchesSearch =
      kpi.kpiName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kpi.definition.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kpi.kpiId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleExpandKpi = (kpiId: string) => {
    setExpandedKpiId(expandedKpiId === kpiId ? null : kpiId);
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'adoption':
        return 'category-adoption';
      case 'engagement':
        return 'category-engagement';
      case 'outcome':
        return 'category-outcome';
      case 'quality':
        return 'category-quality';
      case 'revenue':
        return 'category-revenue';
      default:
        return '';
    }
  };

  const getDataSourceIcon = (dataSource: string): string => {
    switch (dataSource) {
      case 'telemetry':
        return '📊';
      case 'support_tickets':
        return '🎟️';
      case 'infra':
        return '⚙️';
      case 'hybrid':
        return '🔗';
      default:
        return '?';
    }
  };

  return (
    <div className="kpi-catalog-screen">
      {/* Header */}
      <div className="kc-header">
        <button className="btn-back" onClick={onNavigateBack}>
          ← Back
        </button>
        <div className="kc-title-section">
          <h1>📚 KPI Catalog</h1>
          <p className="kc-subtitle">Standardized metrics • Definitions • Formulas • Data sources</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="kc-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search KPI by name, definition, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="category-filter">
          <label>Category:</label>
          <div className="category-buttons">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI List */}
      <div className="kpi-list">
        <div className="kpi-count">
          Showing {filteredKpis.length} of {kpiDefinitions.length} KPIs
        </div>

        {filteredKpis.map((kpi) => (
          <div key={kpi.kpiId} className="kpi-card">
            <div
              className="kpi-card-header"
              onClick={() => toggleExpandKpi(kpi.kpiId)}
            >
              <div className="kpi-header-left">
                <span className={`category-badge ${getCategoryColor(kpi.category)}`}>
                  {kpi.category}
                </span>
                <h3 className="kpi-name">{kpi.kpiName}</h3>
                {kpi.unit && <span className="kpi-unit">({kpi.unit})</span>}
              </div>

              <div className="kpi-header-right">
                <span className="data-source" title={`Data source: ${kpi.dataSource}`}>
                  {getDataSourceIcon(kpi.dataSource)}
                </span>
                <span className="expand-icon">{expandedKpiId === kpi.kpiId ? '▼' : '▶'}</span>
              </div>
            </div>

            {expandedKpiId === kpi.kpiId && (
              <div className="kpi-card-expanded">
                <div className="kpi-detail">
                  <label>Definition:</label>
                  <p className="kpi-definition">{kpi.definition}</p>
                </div>

                <div className="kpi-detail">
                  <label>Formula:</label>
                  <code className="kpi-formula">{kpi.formula}</code>
                </div>

                <div className="kpi-detail">
                  <label>Data Source:</label>
                  <span className="data-source-label">
                    {getDataSourceIcon(kpi.dataSource)} {kpi.dataSource.replace('_', ' ')}
                  </span>
                </div>

                <div className="kpi-detail">
                  <label>Required Events:</label>
                  <div className="event-list">
                    {kpi.requiredEvents.map((event, i) => (
                      <span key={i} className="event-tag">
                        {event}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="kpi-detail">
                  <label>Required Fields:</label>
                  <div className="field-list">
                    {kpi.requiredFields.map((field, i) => (
                      <code key={i} className="field-tag">
                        {field}
                      </code>
                    ))}
                  </div>
                </div>

                <div className="kpi-actions">
                  <button
                    className="btn-action"
                    onClick={() => onNavigate?.('create-spec')}
                  >
                    Use in Feature Spec
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredKpis.length === 0 && (
          <div className="no-results">
            <p>No KPIs match your search or filter.</p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="info-box">
        <strong>💡 About the KPI Catalog:</strong>
        <ul>
          <li>
            <strong>Standardization:</strong> Every KPI in this catalog is reviewed for consistency
            and clarity
          </li>
          <li>
            <strong>Reusability:</strong> Select KPIs for your feature spec; avoid reinventing metrics
          </li>
          <li>
            <strong>Data lineage:</strong> Each KPI lists required events and fields so engineering can
            validate telemetry
          </li>
          <li>
            <strong>Cross-team alignment:</strong> All teams use the same KPI definitions for
            portfolio rollup
          </li>
        </ul>
      </div>
    </div>
  );
};
