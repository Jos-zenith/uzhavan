/**
 * MSME & Charter Browser Screen Component
 * Service #1: Government schemes for Small Enterprises & Agricultural Welfare
 */

import React, { useState, useEffect, useCallback } from 'react';
import msmeCharterService, {
  MSMEScheme,
  CharterScheme,
  SchemeStatistics,
  EligibilityCheckResult
} from './msmeCharterService';
import './styles/msmeCharter.css';

interface UseMSMECharter {
  msmeSchemes: MSMEScheme[];
  charterSchemes: CharterScheme[];
  statistics: SchemeStatistics | null;
  searchKeyword: string;
  selectedCategory: string;
  selectedScheme: MSMEScheme | CharterScheme | null;
  loading: boolean;
  error: string | null;
  handleSearch: (keyword: string) => void;
  handleCategoryFilter: (category: string) => void;
  handleSelectScheme: (scheme: MSMEScheme | CharterScheme | null) => void;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Custom Hook: useMSMECharter
 */
function useMSMECharter(): UseMSMECharter {
  const [msmeSchemes, setMsmeSchemes] = useState<MSMEScheme[]>([]);
  const [charterSchemes, setCharterSchemes] = useState<CharterScheme[]>([]);
  const [statistics, setStatistics] = useState<SchemeStatistics | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedScheme, setSelectedScheme] = useState<MSMEScheme | CharterScheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialize = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await msmeCharterService.initialize('/data/uzhavan.xlsx');
      
      setMsmeSchemes(msmeCharterService.getAllMSMESchemes());
      setCharterSchemes(msmeCharterService.getAllCharterSchemes());
      setStatistics(msmeCharterService.getStatistics());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    if (keyword.trim()) {
      const results = msmeCharterService.searchSchemes(keyword);
      const msme = results.filter((s): s is MSMEScheme => 'whoCanApply' in s);
      const charter = results.filter((s): s is CharterScheme => 'officerContact' in s);
      setMsmeSchemes(msme);
      setCharterSchemes(charter);
    } else {
      setMsmeSchemes(msmeCharterService.getAllMSMESchemes());
      setCharterSchemes(msmeCharterService.getAllCharterSchemes());
    }
  }, []);

  const handleCategoryFilter = useCallback((category: string) => {
    setSelectedCategory(category);
    if (category) {
      const schemes = msmeCharterService.getSchemesByCategory(category);
      const msme = schemes.filter((s): s is MSMEScheme => 'whoCanApply' in s);
      const charter = schemes.filter((s): s is CharterScheme => 'officerContact' in s);
      setMsmeSchemes(msme);
      setCharterSchemes(charter);
    } else {
      setMsmeSchemes(msmeCharterService.getAllMSMESchemes());
      setCharterSchemes(msmeCharterService.getAllCharterSchemes());
    }
  }, []);

  const refresh = useCallback(async () => {
    msmeCharterService.clearCache();
    await initialize();
  }, [initialize]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    msmeSchemes,
    charterSchemes,
    statistics,
    searchKeyword,
    selectedCategory,
    selectedScheme,
    loading,
    error,
    handleSearch,
    handleCategoryFilter,
    handleSelectScheme: setSelectedScheme,
    initialize,
    refresh
  };
}

/**
 * Main MSME & Charter Browser Component
 */
export const MSMECharterScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'msme' | 'charter' | 'search' | 'stats'>('msme');
  const state = useMSMECharter();

  if (state.loading) {
    return <div className="msme-loading">Loading schemes database...</div>;
  }

  return (
    <div className="msme-charter-container">
      <div className="msme-header">
        <h1>💼 MSME & Charter Browser</h1>
        <p>Government schemes for small enterprises & agricultural welfare</p>
        <div className="scheme-counts">
          <span className="count-badge">
            📊 {state.statistics?.totalMSMESchemes || 0} MSME Schemes
          </span>
          <span className="count-badge">
            🌾 {state.statistics?.totalCharterSchemes || 0} Charter Schemes
          </span>
        </div>
      </div>

      <div className="msme-search-section">
        <input
          type="text"
          placeholder="Search schemes by keyword..."
          value={state.searchKeyword}
          onChange={(e) => state.handleSearch(e.target.value)}
          className="msme-search-input"
        />
        <button onClick={state.refresh} className="msme-refresh-btn">🔄 Refresh</button>
      </div>

      <div className="msme-tabs">
        <button
          className={`tab-btn ${activeTab === 'msme' ? 'active' : ''}`}
          onClick={() => setActiveTab('msme')}
        >
          💼 MSME Schemes ({state.msmeSchemes.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'charter' ? 'active' : ''}`}
          onClick={() => setActiveTab('charter')}
        >
          🌾 Charter Schemes ({state.charterSchemes.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          🔍 Filter & Search
        </button>
        <button
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Statistics
        </button>
      </div>

      {state.error && <div className="msme-error">{state.error}</div>}

      {/* MSME Tab */}
      {activeTab === 'msme' && (
        <div className="tab-content msme-tab">
          <div className="schemes-grid">
            {state.msmeSchemes.map((scheme, idx) => (
              <div
                key={idx}
                className="scheme-card msme-card"
                onClick={() => state.handleSelectScheme(scheme)}
              >
                <div className="card-header">
                  <h3>{scheme.scheme}</h3>
                  {scheme.category && (
                    <span className="category-badge">{scheme.category}</span>
                  )}
                </div>
                <div className="card-body">
                  <p className="location">📍 {scheme.location}</p>
                  <p className="benefit">
                    <strong>Incentive:</strong> {scheme.quantumOfIncentives}
                  </p>
                  <p className="eligibility">
                    <strong>Max Eligibility:</strong> {scheme.maximumEligibility}
                  </p>
                  <p className="deadline">
                    <strong>Deadline:</strong> {scheme.timeLimitForSubmission}
                  </p>
                </div>
                <div className="card-footer">
                  <button className="view-details-btn">View Details</button>
                </div>
              </div>
            ))}
          </div>
          {state.msmeSchemes.length === 0 && (
            <div className="empty-state">No MSME schemes found</div>
          )}
        </div>
      )}

      {/* Charter Tab */}
      {activeTab === 'charter' && (
        <div className="tab-content charter-tab">
          <div className="schemes-list">
            {state.charterSchemes.map((scheme, idx) => (
              <div
                key={idx}
                className="scheme-item charter-item"
                onClick={() => state.handleSelectScheme(scheme)}
              >
                <div className="item-header">
                  <h4>{scheme.component}</h4>
                  {scheme.schemeType && (
                    <span className="type-badge">{scheme.schemeType}</span>
                  )}
                </div>
                <div className="item-details">
                  <p>
                    <strong>Eligibility:</strong> {scheme.eligibilityConditions}
                  </p>
                  <p>
                    <strong>Contact:</strong> {scheme.officerContact}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {state.charterSchemes.length === 0 && (
            <div className="empty-state">No charter schemes found</div>
          )}
        </div>
      )}

      {/* Search & Filter Tab */}
      {activeTab === 'search' && (
        <div className="tab-content search-tab">
          <div className="filter-section">
            <h3>Filter by Category</h3>
            <div className="filter-buttons">
              <button
                className={`filter-btn ${!state.selectedCategory ? 'active' : ''}`}
                onClick={() => state.handleCategoryFilter('')}
              >
                All Schemes
              </button>
              {state.statistics &&
                Object.keys(state.statistics.schemesByCategory).map((cat) => (
                  <button
                    key={cat}
                    className={`filter-btn ${state.selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => state.handleCategoryFilter(cat)}
                  >
                    {cat} ({state.statistics?.schemesByCategory[cat]})
                  </button>
                ))}
            </div>
          </div>

          <div className="results-section">
            {state.msmeSchemes.length > 0 && (
              <div className="results-group">
                <h4>MSME Schemes ({state.msmeSchemes.length})</h4>
                {state.msmeSchemes.map((scheme, idx) => (
                  <div key={idx} className="result-item">
                    <p>{scheme.scheme}</p>
                    <small>{scheme.category}</small>
                  </div>
                ))}
              </div>
            )}

            {state.charterSchemes.length > 0 && (
              <div className="results-group">
                <h4>Charter Schemes ({state.charterSchemes.length})</h4>
                {state.charterSchemes.map((scheme, idx) => (
                  <div key={idx} className="result-item">
                    <p>{scheme.component}</p>
                    <small>{scheme.schemeType}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && state.statistics && (
        <div className="tab-content stats-tab">
          <div className="stats-grid">
            <div className="stat-card">
              <h3>MSME Schemes</h3>
              <p className="stat-number">{state.statistics.totalMSMESchemes}</p>
            </div>
            <div className="stat-card">
              <h3>Charter Schemes</h3>
              <p className="stat-number">{state.statistics.totalCharterSchemes}</p>
            </div>
            <div className="stat-card">
              <h3>Total Schemes</h3>
              <p className="stat-number">
                {state.statistics.totalMSMESchemes + state.statistics.totalCharterSchemes}
              </p>
            </div>
            <div className="stat-card">
              <h3>Avg. MSME Benefit</h3>
              <p className="stat-number">{state.statistics.averageBenefit.toFixed(0)}%</p>
            </div>
          </div>

          <div className="distribution-section">
            <h3>Schemes by Category</h3>
            <div className="distribution-list">
              {Object.entries(state.statistics.schemesByCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => (
                  <div key={cat} className="distribution-item">
                    <span>{cat}</span>
                    <div className="bar">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${
                            state.statistics
                              ? (count /
                                  (state.statistics.totalMSMESchemes +
                                    state.statistics.totalCharterSchemes)) *
                                100
                              : 0
                          }%`
                        }}
                      />
                    </div>
                    <span>{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Scheme Details Modal */}
      {state.selectedScheme && (
        <div
          className="details-modal"
          onClick={() => state.handleSelectScheme(null)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="close-btn"
              onClick={() => state.handleSelectScheme(null)}
            >
              ✕
            </button>

            {'whoCanApply' in state.selectedScheme ? (
              // MSME Scheme Details
              <div className="msme-details">
                <h2>{state.selectedScheme.scheme}</h2>
                <div className="detail-row">
                  <label>Category:</label>
                  <span>{state.selectedScheme.category}</span>
                </div>
                <div className="detail-row">
                  <label>Location:</label>
                  <span>{state.selectedScheme.location}</span>
                </div>
                <div className="detail-row">
                  <label>Quantum of Incentives:</label>
                  <span>{state.selectedScheme.quantumOfIncentives}</span>
                </div>
                <div className="detail-row">
                  <label>Maximum Eligibility:</label>
                  <span>{state.selectedScheme.maximumEligibility}</span>
                </div>
                <div className="detail-row">
                  <label>Time Limit:</label>
                  <span>{state.selectedScheme.timeLimitForSubmission}</span>
                </div>
                <div className="detail-row">
                  <label>Who Can Apply:</label>
                  <span>{state.selectedScheme.whoCanApply}</span>
                </div>
                <div className="detail-row">
                  <label>Ineligible Activities:</label>
                  <span>{state.selectedScheme.ineligibleActivities || 'None specified'}</span>
                </div>
                <button className="apply-btn">Apply for This Scheme</button>
              </div>
            ) : (
              // Charter Scheme Details
              <div className="charter-details">
                <h2>{state.selectedScheme.component}</h2>
                <div className="detail-row">
                  <label>Department:</label>
                  <span>{state.selectedScheme.department}</span>
                </div>
                <div className="detail-row">
                  <label>Scheme Type:</label>
                  <span>{state.selectedScheme.schemeType}</span>
                </div>
                <div className="detail-row">
                  <label>Eligibility & Conditions:</label>
                  <span className="multiline">{state.selectedScheme.eligibilityConditions}</span>
                </div>
                <div className="detail-row">
                  <label>Officer to Contact:</label>
                  <span className="multiline">{state.selectedScheme.officerContact}</span>
                </div>
                {state.selectedScheme.benefitAmount && (
                  <div className="detail-row">
                    <label>Benefits:</label>
                    <span>{state.selectedScheme.benefitAmount}</span>
                  </div>
                )}
                <button className="apply-btn">Register for This Scheme</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MSMECharterScreen;
