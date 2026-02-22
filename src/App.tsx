import React from 'react';
import './App.css';
import {
  clearDraft,
  getDraftAbandonmentAnalytics,
  getDraftResumePrompt,
  getVitalServices,
  initializeDatabase,
  loadDraftPayload,
  processSyncQueue,
  saveDraftFieldAtomic,
  type DraftAbandonmentAnalytics,
  type VitalService,
} from './sqlite';
import {
  getConnectivityState,
  subscribeConnectivity,
  type ConnectivityState,
} from './connectivity';
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

  const refreshDraftAnalytics = React.useCallback(async () => {
    const analytics = await getDraftAbandonmentAnalytics(
      BENEFIT_REGISTRATION_SERVICE_ID,
      BENEFIT_DRAFT_KEY
    );
    setDraftAnalytics(analytics);
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
  }, [connectivity.isOnline, refreshDraftAnalytics]);

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
          <section className="summary-grid">
            <article className="summary-card">
              <h3>Total Services</h3>
              <p>{services.length}</p>
            </article>
            <article className="summary-card">
              <h3>Draft Completion</h3>
              <p>{completedDraftFields}/4</p>
            </article>
            <article className="summary-card">
              <h3>Draft Status</h3>
              <p>
                {draftAnalytics?.isAbandoned
                  ? `Abandoned (${draftAnalytics.resumeCount} resumes)`
                  : showResumePrompt
                    ? 'Saved draft detected'
                    : 'No pending resume'}
              </p>
            </article>
            <article className="summary-card">
              <h3>Last Saved</h3>
              <p>{lastSavedAt || 'Not saved yet'}</p>
            </article>
          </section>
        )}

        {activeView === 'draft' && (
          <section className="panel">
            {showResumePrompt && (
              <div className="prompt-box">
                <p>Saved draft detected. Resume or start fresh.</p>
                <div className="prompt-actions">
                  <button onClick={handleResumeDraft}>Resume</button>
                  <button onClick={handleStartFresh}>Start Fresh</button>
                </div>
              </div>
            )}

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
