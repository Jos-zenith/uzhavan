import React from 'react';
import './App.css';
import {
  clearDraft,
  getDraftAbandonmentAnalytics,
  getDraftResumePrompt,
  getSyncStatusSnapshot,
  getVitalServices,
  initializeDatabase,
  loadDraftPayload,
  processSyncQueue,
  saveDraftFieldAtomic,
  triggerManualSync,
  type DraftAbandonmentAnalytics,
  type SyncStatusSnapshot,
  type VitalService,
} from './sqlite';
import {
  getConnectivityState,
  subscribeConnectivity,
  type ConnectivityState,
} from './connectivity';
import { computePredictiveRoi } from './roiEngine';
import RoiPortfolioScreen from './RoiPortfolioScreen';
import AdminPanelScreen from './AdminPanelScreen';
import DeveloperToolsScreen from './DeveloperToolsScreen';
import SyncStatusScreen from './SyncStatusScreen';
import { WeatherForecastScreen } from './WeatherForecastScreen';
import { OfficerContactInfoScreen } from './OfficerContactInfoScreen';
import { UserFeedbackScreen } from './UserFeedbackScreen';
import { OrganicFarmingInfoScreen } from './OrganicFarmingInfoScreen';
import { FpoProductsScreen } from './FpoProductsScreen';
import { AtmaTrainingRegistrationScreen } from './AtmaTrainingRegistrationScreen';
import { UzhavanEMarketScreen } from './UzhavanEMarketScreen';

const BENEFIT_REGISTRATION_SERVICE_ID = 2;
const BENEFIT_DRAFT_KEY = 'benefit_registration';

const EMPTY_SYNC_SNAPSHOT: SyncStatusSnapshot = {
  connectivity: {
    isOnline: false,
    label: 'Queued Locally',
    networkType: 'Offline',
    lastUpdatedAt: Date.now(),
    lastSuccessfulSyncAt: null,
  },
  queueCounts: {
    queued: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
  },
  lastSuccessfulSyncAt: null,
  actions: [],
};

type DraftFields = {
  farmerName: string;
  aadhaar: string;
  landDocument: string;
  bankInfo: string;
};

const EMPTY_DRAFT: DraftFields = {
  farmerName: '',
  aadhaar: '',
  landDocument: '',
  bankInfo: '',
};

type AppView =
  | 'overview'
  | 'draft'
  | 'services'
  | 'serviceScreens'
  | 'sync'
  | 'roi'
  | 'admin'
  | 'developer';

type ServiceScreenKey = 'weather' | 'officer' | 'feedback' | 'organic' | 'fpo' | 'atma' | 'market';

function App() {
  const [status, setStatus] = React.useState('Initializing offline foundation...');
  const [services, setServices] = React.useState<VitalService[]>([]);
  const [connectivity, setConnectivity] = React.useState<ConnectivityState>(
    getConnectivityState()
  );
  const [draft, setDraft] = React.useState<DraftFields>(EMPTY_DRAFT);
  const [showResumePrompt, setShowResumePrompt] = React.useState(false);
  const [lastSavedAt, setLastSavedAt] = React.useState<string>('');
  const [draftAnalytics, setDraftAnalytics] = React.useState<DraftAbandonmentAnalytics | null>(
    null
  );
  const [activeView, setActiveView] = React.useState<AppView>('overview');
  const [serviceSearch, setServiceSearch] = React.useState('');
  const [activeServiceScreen, setActiveServiceScreen] = React.useState<ServiceScreenKey>('weather');
  const [syncSnapshot, setSyncSnapshot] = React.useState<SyncStatusSnapshot>(
    EMPTY_SYNC_SNAPSHOT
  );
  const [syncMessage, setSyncMessage] = React.useState('');

  const refreshDraftAnalytics = React.useCallback(async () => {
    const analytics = await getDraftAbandonmentAnalytics(
      BENEFIT_REGISTRATION_SERVICE_ID,
      BENEFIT_DRAFT_KEY
    );
    setDraftAnalytics(analytics);
  }, []);

  const refreshSyncSnapshot = React.useCallback(async () => {
    const snapshot = await getSyncStatusSnapshot();
    setSyncSnapshot(snapshot);
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    const unsubscribe = subscribeConnectivity((state) => {
      if (isMounted) {
        setConnectivity(state);
      }
    });

    const setup = async () => {
      try {
        const serviceCount = await initializeDatabase();
        const serviceRows = await getVitalServices();
        const resumePrompt = await getDraftResumePrompt(
          BENEFIT_REGISTRATION_SERVICE_ID,
          BENEFIT_DRAFT_KEY
        );

        if (!isMounted) {
          return;
        }

        setServices(serviceRows);
        setShowResumePrompt(resumePrompt.hasDraft);
        setStatus(`Offline foundation ready. Loaded ${serviceCount} services.`);
        await refreshDraftAnalytics();

        if (connectivity.isOnline) {
          await processSyncQueue();
        }
        await refreshSyncSnapshot();
      } catch (error) {
        if (isMounted) {
          setStatus(
            `Initialization failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    };

    setup();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [connectivity.isOnline, refreshDraftAnalytics, refreshSyncSnapshot]);

  React.useEffect(() => {
    void refreshSyncSnapshot();
    const interval = window.setInterval(() => {
      void refreshSyncSnapshot();
    }, 12000);

    return () => window.clearInterval(interval);
  }, [refreshSyncSnapshot]);

  const handleDraftFieldChange =
    (fieldName: keyof DraftFields) => async (event: React.ChangeEvent<HTMLInputElement>) => {
      const fieldValue = event.target.value;

      setDraft((previous) => ({
        ...previous,
        [fieldName]: fieldValue,
      }));

      await saveDraftFieldAtomic(
        BENEFIT_REGISTRATION_SERVICE_ID,
        BENEFIT_DRAFT_KEY,
        fieldName,
        fieldValue
      );

      setLastSavedAt(new Date().toLocaleTimeString());
      await refreshDraftAnalytics();
    };

  const handleResumeDraft = async () => {
    const payload = await loadDraftPayload(
      BENEFIT_REGISTRATION_SERVICE_ID,
      BENEFIT_DRAFT_KEY
    );

    if (payload) {
      setDraft({
        farmerName: payload.farmerName ?? '',
        aadhaar: payload.aadhaar ?? '',
        landDocument: payload.landDocument ?? '',
        bankInfo: payload.bankInfo ?? '',
      });
    }

    setShowResumePrompt(false);
    await refreshDraftAnalytics();
  };

  const handleStartFresh = async () => {
    await clearDraft(BENEFIT_REGISTRATION_SERVICE_ID, BENEFIT_DRAFT_KEY);
    setDraft(EMPTY_DRAFT);
    setShowResumePrompt(false);
    setLastSavedAt('');
    await refreshDraftAnalytics();
  };

  const completedDraftFields = React.useMemo(() => {
    return Object.values(draft).filter((value) => value.trim().length > 0).length;
  }, [draft]);

  const outboxCount =
    syncSnapshot.queueCounts.queued +
    syncSnapshot.queueCounts.syncing +
    syncSnapshot.queueCounts.failed;

  const draftActions = React.useMemo(() => {
    return syncSnapshot.actions.filter(
      (action) =>
        action.serviceId === BENEFIT_REGISTRATION_SERVICE_ID &&
        action.draftKey === BENEFIT_DRAFT_KEY
    );
  }, [syncSnapshot.actions]);

  const hasDraftFailures = draftActions.some((action) => action.status === 'failed');

  const handleManualSync = React.useCallback(async () => {
    try {
      setSyncMessage('Syncing...');
      const snapshot = await triggerManualSync();
      setSyncSnapshot(snapshot);
      setSyncMessage('Sync completed.');
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : String(error));
    } finally {
      window.setTimeout(() => setSyncMessage(''), 3500);
    }
  }, []);

  const heroDaysSinceOnboarding = 10;
  const predictiveHero = computePredictiveRoi(
    'Madurai',
    'Millet',
    heroDaysSinceOnboarding,
    [8, 13, 16, 3],
    {
      deltaYieldAi: 240,
      deltaMarketPrice: 2.4,
      deltaInputCostSavings: 3200,
      deltaTransactionCostSavings: 550,
      deltaOperationalCostSavings: 760,
      deltaRiskCostSavings: 640,
    }
  );

  const yieldIncreasePercent =
    ((predictiveHero.breakdown.adjustedYield - predictiveHero.baselineUsed.avgYield) /
      predictiveHero.baselineUsed.avgYield) *
    100;
  const baselineCostTotal =
    predictiveHero.baselineUsed.avgInputCost +
    predictiveHero.baselineUsed.avgTransactionCost +
    predictiveHero.baselineUsed.avgInputCost * 0.12 +
    predictiveHero.baselineUsed.avgInputCost * 0.08;
  const costSavings = baselineCostTotal - predictiveHero.breakdown.totalCosts;
  const timeSavedHours = 14;
  const pestAlertsResolved = Math.max(0, services.length - 12);

  const filteredServices = React.useMemo(() => {
    const keyword = serviceSearch.trim().toLowerCase();
    if (!keyword) {
      return services;
    }

    return services.filter((service) => {
      return (
        service.name.toLowerCase().includes(keyword) ||
        service.purpose.toLowerCase().includes(keyword) ||
        service.dataRequired.toLowerCase().includes(keyword)
      );
    });
  }, [serviceSearch, services]);

  return (
    <div className="App">
      <div className="App-shell">
        <section className="transparency-bar">
          <div className="status-pill">
            <span className={`status-dot ${connectivity.label.toLowerCase().replace(/\s+/g, '-')}`} />
            <span className="status-label">{connectivity.label}</span>
            <span className="status-sub">{connectivity.networkType}</span>
          </div>
          <div className="outbox-pill">
            <span className="outbox-count">{outboxCount}</span>
            <span>items pending sync</span>
          </div>
          <div className="status-meta">
            <span>Last sync: {syncSnapshot.lastSuccessfulSyncAt ?? 'Not yet'}</span>
            <button
              className="ghost-btn"
              onClick={() => void handleManualSync()}
              disabled={!connectivity.isOnline}
            >
              Sync now
            </button>
            {syncMessage ? <span className="status-message">{syncMessage}</span> : null}
          </div>
        </section>
        <header className="App-header">
          <div>
            <h1>Digital Agriculture Platform</h1>
            <p className="status-text">{status}</p>
          </div>
          <div className="connectivity-chip">
            Connectivity: <strong>{connectivity.label}</strong> · Network:{' '}
            <strong>{connectivity.networkType}</strong>
          </div>
        </header>

        <nav className="app-nav">
          <button
            className={activeView === 'overview' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('overview')}
          >
            Overview
          </button>
          <button
            className={activeView === 'draft' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('draft')}
          >
            Draft
          </button>
          <button
            className={activeView === 'services' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('services')}
          >
            Services
          </button>
          <button
            className={activeView === 'serviceScreens' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('serviceScreens')}
          >
            Service Screens
          </button>
          <button
            className={activeView === 'sync' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('sync')}
          >
            Sync Status
          </button>
          <button
            className={activeView === 'roi' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('roi')}
          >
            ROI & Governance
          </button>
          <button
            className={activeView === 'admin' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('admin')}
          >
            Admin
          </button>
          <button
            className={activeView === 'developer' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('developer')}
          >
            Developer Tools
          </button>
        </nav>

        {activeView === 'overview' && (
          <section className="overview-stack">
            <div className="hero-grid">
              <div className="hero-copy">
                <p className="hero-kicker">MRD Vict SDK</p>
                <h2>Connectivity-transparent, offline-first agriculture services.</h2>
                <p className="hero-subtitle">
                  Designed for real-world rural conditions with policy-first telemetry, safe
                  offline drafts, and measurable impact.
                </p>
                <div className="hero-actions">
                  <button className="primary-btn" onClick={() => setActiveView('draft')}>
                    Start Benefit Draft
                  </button>
                  <button className="secondary-btn" onClick={() => setActiveView('sync')}>
                    Open Sync Console
                  </button>
                </div>
                <div className="hero-metrics">
                  <div>
                    <span className="metric-label">Services active</span>
                    <span className="metric-value">{services.length}</span>
                  </div>
                  <div>
                    <span className="metric-label">Draft completion</span>
                    <span className="metric-value">{completedDraftFields}/4</span>
                  </div>
                  <div>
                    <span className="metric-label">Outbox</span>
                    <span className="metric-value">{outboxCount} pending</span>
                  </div>
                </div>
              </div>
              <div className="hero-card">
                <h3>Transparency Layer</h3>
                <p className="hero-card-label">Connectivity Status</p>
                <div className="hero-status">
                  <span className={`status-dot ${connectivity.label.toLowerCase().replace(/\s+/g, '-')}`} />
                  <strong>{connectivity.label}</strong>
                </div>
                <p className="hero-card-label">Outbox</p>
                <p className="hero-card-value">{outboxCount} items pending sync</p>
                <p className="hero-card-label">Last successful sync</p>
                <p>{syncSnapshot.lastSuccessfulSyncAt ?? 'Not yet synced'}</p>
              </div>
            </div>

            <div className="impact-grid">
              {heroDaysSinceOnboarding < 14 && (
                <article className="impact-card cold-start">
                  <h3>Learning Mode (14-day warmup)</h3>
                  <p>
                    We are analyzing regional signals to unlock your first profit prediction.
                  </p>
                  <small>Estimated readiness: {14 - heroDaysSinceOnboarding} days</small>
                </article>
              )}
              <article className="impact-card">
                <h3>Yield Increase</h3>
                <p>AI alerts helped increase yield by {yieldIncreasePercent.toFixed(1)}%</p>
                <small>
                  Based on {predictiveHero.baselineUsed.district} district baseline
                </small>
              </article>
              <article className="impact-card">
                <h3>Cost Savings</h3>
                <p>You saved ₹{Math.abs(costSavings).toFixed(0)} above district average</p>
                <small>Input + transaction + operational savings</small>
              </article>
              <article className="impact-card">
                <h3>Time Saved</h3>
                <p>Digital services saved you {timeSavedHours} hours of travel</p>
                <small>Estimated from assisted transactions</small>
              </article>
              {pestAlertsResolved >= 5 && (
                <article className="impact-card milestone">
                  <h3>Milestone Triggered</h3>
                  <p>Resolved {pestAlertsResolved} pest alerts this month</p>
                  <small>Impact card pushed immediately</small>
                </article>
              )}
            </div>
          </section>
        )}

        {activeView === 'draft' && (
          <section className="panel">
            {showResumePrompt && (
              <div className="prompt-box">
                <p>Saved draft detected. Resume or start fresh?</p>
                <div className="prompt-actions">
                  <button onClick={handleResumeDraft}>Resume</button>
                  <button onClick={handleStartFresh}>Start Fresh</button>
                </div>
              </div>
            )}

            <section className="stage-grid">
              <article className="stage-card">
                <h3>Offline Draft</h3>
                <p>
                  {completedDraftFields > 0
                    ? 'Data saved locally in secure storage.'
                    : 'Awaiting first draft entry.'}
                </p>
                <span className="stage-pill">Queued Locally</span>
              </article>
              <article className="stage-card">
                <h3>Seniority Number Assignment</h3>
                <p>Requires online sync with TNeGA assignment service.</p>
                <span className="stage-pill">
                  {connectivity.isOnline ? connectivity.label : 'Offline'}
                </span>
              </article>
            </section>

            <section className="draft-form">
              <h2>Benefit Registration Draft</h2>
              <label>
                Farmer Name
                <input
                  value={draft.farmerName}
                  onChange={handleDraftFieldChange('farmerName')}
                  placeholder="Enter farmer name"
                />
              </label>
              <label>
                Aadhaar
                <input
                  value={draft.aadhaar}
                  onChange={handleDraftFieldChange('aadhaar')}
                  placeholder="Enter Aadhaar"
                />
              </label>
              <label>
                Land Document (Chitta/Adangal)
                <input
                  value={draft.landDocument}
                  onChange={handleDraftFieldChange('landDocument')}
                  placeholder="Enter land document"
                />
              </label>
              <label>
                Bank Information
                <input
                  value={draft.bankInfo}
                  onChange={handleDraftFieldChange('bankInfo')}
                  placeholder="Enter bank details"
                />
              </label>
              <p className="saved-meta">Last saved: {lastSavedAt || 'Not saved yet'}</p>
            </section>

            <section className="draft-status">
              <div className="draft-status-header">
                <h3>Per-Action Sync Status</h3>
                {hasDraftFailures && (
                  <button
                    className="secondary-btn"
                    onClick={() => void handleManualSync()}
                    disabled={!connectivity.isOnline}
                  >
                    Retry Failed Syncs
                  </button>
                )}
              </div>
              <div className="status-list">
                {draftActions.length ? (
                  draftActions.map((action) => (
                    <div key={action.id} className="status-row">
                      <span className={`status-badge ${action.status}`}>{action.statusLabel}</span>
                      <div>
                        <strong>{action.operationType}</strong>
                        <p className="status-meta">
                          Queued at {action.queuedAt} · Retries {action.retryCount}
                        </p>
                        {action.errorMessage && (
                          <p className="status-error">{action.errorMessage}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="status-empty">No queued actions yet.</p>
                )}
              </div>
            </section>
          </section>
        )}

        {activeView === 'services' && (
          <section className="panel">
            <div className="services-toolbar">
              <h2>Vital Services</h2>
              <input
                value={serviceSearch}
                onChange={(event) => setServiceSearch(event.target.value)}
                placeholder="Search by name, purpose, data required"
              />
            </div>

            <div className="service-grid">
              {filteredServices.map((service) => (
                <article key={service.id} className="service-card">
                  <h3>
                    {service.id}. {service.name}
                  </h3>
                  {(service.name.includes('Weather') || service.name.includes('Agriculture News')) && (
                    <span className="service-badge">Pre-synced offline bulletin</span>
                  )}
                  <p>
                    <strong>Purpose:</strong> {service.purpose}
                  </p>
                  <p>
                    <strong>Data:</strong> {service.dataRequired}
                  </p>
                  <p>
                    <strong>Cache:</strong> {service.localCache}
                  </p>
                  <p>
                    <strong>Offline:</strong> {service.offlineCapability}
                  </p>
                  <p>
                    <strong>Impact:</strong> {service.usageImpact}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeView === 'serviceScreens' && (
          <section className="panel">
            <div className="services-toolbar">
              <h2>Service Screens</h2>
              <select
                value={activeServiceScreen}
                onChange={(event) => setActiveServiceScreen(event.target.value as ServiceScreenKey)}
              >
                <option value="weather">#8 Daily Weather Forecast</option>
                <option value="officer">#9 Officer Contact Info</option>
                <option value="feedback">#12 User Feedback</option>
                <option value="organic">#14 Organic Farming Info</option>
                <option value="fpo">#15 FPO Products</option>
                <option value="atma">#17 ATMA Training Registration</option>
                <option value="market">#18 Uzhavan e-Market</option>
              </select>
            </div>

            {activeServiceScreen === 'weather' && <WeatherForecastScreen />}
            {activeServiceScreen === 'officer' && <OfficerContactInfoScreen />}
            {activeServiceScreen === 'feedback' && <UserFeedbackScreen />}
            {activeServiceScreen === 'organic' && <OrganicFarmingInfoScreen />}
            {activeServiceScreen === 'fpo' && <FpoProductsScreen />}
            {activeServiceScreen === 'atma' && <AtmaTrainingRegistrationScreen />}
            {activeServiceScreen === 'market' && <UzhavanEMarketScreen />}
          </section>
        )}

        {activeView === 'roi' && (
          <section className="panel roi-panel">
            <RoiPortfolioScreen />
          </section>
        )}

        {activeView === 'sync' && (
          <section className="panel">
            <SyncStatusScreen />
          </section>
        )}

        {activeView === 'admin' && (
          <section className="panel">
            <AdminPanelScreen />
          </section>
        )}

        {activeView === 'developer' && (
          <section className="panel">
            <DeveloperToolsScreen />
          </section>
        )}
      </div>
    </div>
  );
}

export default App;
