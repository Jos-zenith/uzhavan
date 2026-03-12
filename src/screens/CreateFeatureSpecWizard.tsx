import React, { useState } from 'react';
import type { FeatureStatus } from '../types/roiConsole';
import '../styles/createFeatureSpec.css';

interface Props {
  onNavigateBack?: () => void;
  onNavigate?: (screen: string) => void;
}

interface FeatureSpec {
  featureName: string;
  owner: string;
  businessGoal: string;
  primaryGoalCategory: 'Revenue' | 'Cost' | 'Productivity' | 'Risk' | '';
  selectedKpis: string[];
  baseline: string;
  target: string;
  attribution: 'A/B' | 'rollout' | 'pre/post' | '';
  step: number;
}

export const CreateFeatureSpecWizard: React.FC<Props> = ({ onNavigateBack, onNavigate }) => {
  const [spec, setSpec] = useState<FeatureSpec>({
    featureName: '',
    owner: '',
    businessGoal: '',
    primaryGoalCategory: '',
    selectedKpis: [],
    baseline: '',
    target: '',
    attribution: '',
    step: 1,
  });

  const totalSteps = 5;

  const kpiOptions = [
    { id: 'adoption_rate', name: 'Feature Adoption Rate', category: 'adoption' },
    { id: 'time_saved', name: 'Time Saved (Task Completion)', category: 'outcome' },
    { id: 'success_rate', name: 'Success Rate', category: 'quality' },
    { id: 'p95_latency', name: 'P95 Latency', category: 'quality' },
    { id: 'error_rate', name: 'Error Rate', category: 'quality' },
    { id: 'engagement', name: 'Engagement Score', category: 'engagement' },
    { id: 'cost_savings', name: 'Cost Savings Value', category: 'revenue' },
    { id: 'revenue_lift', name: 'Revenue Lift', category: 'revenue' },
  ];

  const goalCategoryInfo: Record<string, string[]> = {
    Revenue: [
      'revenue_lift',
      'cost_savings',
      'engagement',
      'adoption_rate',
    ],
    Cost: [
      'cost_savings',
      'time_saved',
      'error_rate',
    ],
    Productivity: [
      'time_saved',
      'success_rate',
      'engagement',
      'adoption_rate',
    ],
    Risk: [
      'error_rate',
      'success_rate',
      'p95_latency',
    ],
  };

  const toggleKpi = (kpiId: string) => {
    setSpec((prev) => ({
      ...prev,
      selectedKpis: prev.selectedKpis.includes(kpiId)
        ? prev.selectedKpis.filter((id) => id !== kpiId)
        : [...prev.selectedKpis, kpiId],
    }));
  };

  const nextStep = () => {
    if (spec.step < totalSteps) {
      setSpec((prev) => ({ ...prev, step: prev.step + 1 }));
    }
  };

  const prevStep = () => {
    if (spec.step > 1) {
      setSpec((prev) => ({ ...prev, step: prev.step - 1 }));
    }
  };

  const isStepValid = (): boolean => {
    switch (spec.step) {
      case 1:
        return spec.featureName.trim() !== '' && spec.owner.trim() !== '';
      case 2:
        return spec.businessGoal.trim() !== '';
      case 3:
        return spec.primaryGoalCategory !== '' && spec.selectedKpis.length > 0;
      case 4:
        return spec.baseline.trim() !== '' && spec.target.trim() !== '';
      case 5:
        return spec.attribution !== '';
      default:
        return false;
    }
  };

  const suggestedKpis = spec.primaryGoalCategory
    ? (goalCategoryInfo[spec.primaryGoalCategory] || [])
    : [];

  const handleFinish = () => {
    const specJson = {
      featureId: spec.featureName.toUpperCase().replace(/\s+/g, '_'),
      featureName: spec.featureName,
      owner: spec.owner,
      businessGoal: spec.businessGoal,
      primaryGoal: spec.primaryGoalCategory,
      kpis: spec.selectedKpis,
      baseline: spec.baseline,
      target: spec.target,
      attributionMethod: spec.attribution,
      createdAt: new Date().toISOString(),
    };

    alert(`Feature Spec Created!\n\n${JSON.stringify(specJson, null, 2)}`);
    onNavigate?.('dashboard');
  };

  return (
    <div className="create-spec-wizard">
      <div className="wizard-container">
        {/* Header */}
        <div className="wizard-header">
          <button className="btn-back" onClick={onNavigateBack}>
            ← Cancel
          </button>
          <h1>✨ Feature Spec Wizard</h1>
          <div className="progress-indicator">
            Step {spec.step} of {totalSteps}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-bar-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(spec.step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Feature Name & Owner */}
        {spec.step === 1 && (
          <div className="wizard-step">
            <h2>📝 Step 1: Feature Name & Owner</h2>
            <div className="form-group">
              <label htmlFor="feature-name">Feature Name *</label>
              <input
                id="feature-name"
                type="text"
                placeholder="e.g., Weather Forecast Optimization"
                value={spec.featureName}
                onChange={(e) =>
                  setSpec((prev) => ({ ...prev, featureName: e.target.value }))
                }
              />
              <small className="help-text">
                Use a clear, descriptive name that your team recognizes
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="owner">Owner (Team/Person) *</label>
              <input
                id="owner"
                type="text"
                placeholder="e.g., Product Team A / John Doe"
                value={spec.owner}
                onChange={(e) =>
                  setSpec((prev) => ({ ...prev, owner: e.target.value }))
                }
              />
              <small className="help-text">Who is accountable for this feature's success?</small>
            </div>
          </div>
        )}

        {/* Step 2: Business Goal */}
        {spec.step === 2 && (
          <div className="wizard-step">
            <h2>🎯 Step 2: Business Goal</h2>
            <div className="form-group">
              <label htmlFor="business-goal">What problem does this feature solve? *</label>
              <textarea
                id="business-goal"
                placeholder="e.g., Reduce time-to-decision on irrigation scheduling by 20%; improve forecast accuracy for smallholder farmers"
                value={spec.businessGoal}
                onChange={(e) =>
                  setSpec((prev) => ({ ...prev, businessGoal: e.target.value }))
                }
                rows={4}
              />
              <small className="help-text">
                Be specific. This becomes the narrative for your feature story.
              </small>
            </div>
          </div>
        )}

        {/* Step 3: Goal Category & KPIs */}
        {spec.step === 3 && (
          <div className="wizard-step">
            <h2>📊 Step 3: Primary Goal & KPIs</h2>

            <div className="form-group">
              <label>Select primary goal category *</label>
              <div className="goal-buttons">
                {['Revenue', 'Cost', 'Productivity', 'Risk'].map((cat) => (
                  <button
                    key={cat}
                    className={`goal-btn ${spec.primaryGoalCategory === cat ? 'active' : ''}`}
                    onClick={() =>
                      setSpec((prev) => ({
                        ...prev,
                        primaryGoalCategory: cat as typeof spec.primaryGoalCategory,
                        selectedKpis: [],
                      }))
                    }
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {spec.primaryGoalCategory && (
              <div className="form-group">
                <label>Select KPI(s) {spec.selectedKpis.length > 0 && `(${spec.selectedKpis.length} selected)`} *</label>
                <p className="suggested-kpis-label">
                  Suggested for {spec.primaryGoalCategory}:
                </p>
                <div className="kpi-checkboxes">
                  {kpiOptions.map((kpi) => {
                    const suggested = suggestedKpis.includes(kpi.id);
                    return (
                      <label
                        key={kpi.id}
                        className={`kpi-checkbox ${suggested ? 'suggested' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={spec.selectedKpis.includes(kpi.id)}
                          onChange={() => toggleKpi(kpi.id)}
                        />
                        <span className="kpi-label">{kpi.name}</span>
                        {suggested && <span className="suggested-badge">✓ Suggested</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Baseline & Target */}
        {spec.step === 4 && (
          <div className="wizard-step">
            <h2>📈 Step 4: Baseline & Target</h2>

            <div className="form-group">
              <label htmlFor="baseline">Baseline (current state) *</label>
              <input
                id="baseline"
                type="text"
                placeholder="e.g., Avg time 3m 10s, Error rate 2.1%, Adoption 15%"
                value={spec.baseline}
                onChange={(e) =>
                  setSpec((prev) => ({ ...prev, baseline: e.target.value }))
                }
              />
              <small className="help-text">Describe the current state before this feature. Usually from last 7-30 days data.</small>
            </div>

            <div className="form-group">
              <label htmlFor="target">Target (desired future state) *</label>
              <input
                id="target"
                type="text"
                placeholder="e.g., Avg time 2m 30s (−20%), Error rate <0.5%, Adoption 40%"
                value={spec.target}
                onChange={(e) =>
                  setSpec((prev) => ({ ...prev, target: e.target.value }))
                }
              />
              <small className="help-text">
                What does success look like? Be measurable and achievable.
              </small>
            </div>
          </div>
        )}

        {/* Step 5: Attribution Method */}
        {spec.step === 5 && (
          <div className="wizard-step">
            <h2>🧪 Step 5: Attribution Method</h2>

            <div className="form-group">
              <label>How should we measure impact? *</label>
              <div className="attribution-options">
                <button
                  className={`attribution-btn ${spec.attribution === 'A/B' ? 'active' : ''}`}
                  onClick={() =>
                    setSpec((prev) => ({ ...prev, attribution: 'A/B' }))
                  }
                >
                  <strong>A/B Test</strong>
                  <small>Control vs. treatment groups (gold standard)</small>
                </button>

                <button
                  className={`attribution-btn ${spec.attribution === 'rollout' ? 'active' : ''}`}
                  onClick={() =>
                    setSpec((prev) => ({
                      ...prev,
                      attribution: 'rollout',
                    }))
                  }
                >
                  <strong>Gradual Rollout</strong>
                  <small>Measure when subset gets feature (natural cohorts)</small>
                </button>

                <button
                  className={`attribution-btn ${spec.attribution === 'pre/post' ? 'active' : ''}`}
                  onClick={() =>
                    setSpec((prev) => ({
                      ...prev,
                      attribution: 'pre/post',
                    }))
                  }
                >
                  <strong>Pre/Post</strong>
                  <small>Before-after for simple features (lower confidence)</small>
                </button>
              </div>
            </div>

            {/* Spec Preview */}
            <div className="spec-preview">
              <h3>📋 Spec Summary</h3>
              <div className="preview-content">
                <div className="preview-item">
                  <strong>Feature:</strong> {spec.featureName || '(not set)'}
                </div>
                <div className="preview-item">
                  <strong>Owner:</strong> {spec.owner || '(not set)'}
                </div>
                <div className="preview-item">
                  <strong>Goal:</strong> {spec.businessGoal.substring(0, 60)}...
                </div>
                <div className="preview-item">
                  <strong>Category:</strong> {spec.primaryGoalCategory || '(not set)'}
                </div>
                <div className="preview-item">
                  <strong>KPIs:</strong>{' '}
                  {spec.selectedKpis.length > 0 ? `${spec.selectedKpis.length} selected` : '(not set)'}
                </div>
                <div className="preview-item">
                  <strong>Attribution:</strong> {spec.attribution || '(not set)'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="wizard-footer">
          <button className="btn-prev" onClick={prevStep} disabled={spec.step === 1}>
            ← Previous
          </button>

          {spec.step < totalSteps ? (
            <button
              className="btn-next"
              onClick={nextStep}
              disabled={!isStepValid()}
            >
              Next →
            </button>
          ) : (
            <button
              className="btn-finish"
              onClick={handleFinish}
              disabled={!isStepValid()}
            >
              ✅ Create Feature Spec
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
