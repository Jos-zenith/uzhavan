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
import {
  getDataBackedServiceCatalog,
  getService2Dataset,
  type DataBackedServiceCatalogItem,
  getServiceDataFilePreviews,
  type ServiceDataFilePreview,
} from './serviceDataLoader';
import { useTelemetryGovernance } from './sdkHooks/useTelemetryGovernance';
import {
  AdminPanelScreen,
  AtmaTrainingRegistrationScreen,
  DeveloperToolsScreen,
  FpoProductsScreen,
  MyFarmGuideScreen,
  OfficerContactInfoScreen,
  OrganicFarmingInfoScreen,
  RoiPortfolioScreen,
  SyncStatusScreen,
  UserFeedbackScreen,
  UzhavanEMarketScreen,
  WeatherForecastScreen,
  AgricultureNewsScreen,
  BenefitRegistrationScreen,
  CropInsuranceScreen,
  FertilizerStockScreen,
  MachineryHiringScreen,
  MarketPriceScreen,
  MSMECharterScreen,
  PestIdentificationScreen,
  ReservoirLevelsScreen,
  SeedStockScreen,
} from './screens';
import { RoiConsole } from './components/RoiConsole';

const BENEFIT_REGISTRATION_SERVICE_ID = 2;
const BENEFIT_DRAFT_KEY = 'benefit_registration';
const SYNC_ACTIONS_PREVIEW_LIMIT = 25;

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
  | 'roi-console'
  | 'admin'
  | 'developer';

function App() {
  const draftSaveTimersRef = React.useRef<Partial<Record<keyof DraftFields, number>>>({});
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
  const [catalogServices, setCatalogServices] = React.useState<
    DataBackedServiceCatalogItem[]
  >([]);
  const [catalogLoading, setCatalogLoading] = React.useState(false);
  const [catalogResolved, setCatalogResolved] = React.useState(false);
  const [catalogError, setCatalogError] = React.useState('');
  const [filePreviewRows, setFilePreviewRows] = React.useState<ServiceDataFilePreview[]>([]);
  const [filePreviewLoading, setFilePreviewLoading] = React.useState(false);
  const [filePreviewResolved, setFilePreviewResolved] = React.useState(false);
  const [filePreviewError, setFilePreviewError] = React.useState('');
  const [activeServiceId, setActiveServiceId] = React.useState<number>(1);
  const [syncSnapshot, setSyncSnapshot] = React.useState<SyncStatusSnapshot>(
    EMPTY_SYNC_SNAPSHOT
  );
  const [syncMessage, setSyncMessage] = React.useState('');
  const [locationDistricts, setLocationDistricts] = React.useState<string[]>([]);
  const [locationBlocksByDistrict, setLocationBlocksByDistrict] = React.useState<
    Record<string, string[]>
  >({});
  const [selectedLocationDistrict, setSelectedLocationDistrict] = React.useState('');
  const [selectedLocationBlock, setSelectedLocationBlock] = React.useState('');
  const [locationScopeLoading, setLocationScopeLoading] = React.useState(false);
  const [locationScopeError, setLocationScopeError] = React.useState('');

  // Initialize telemetry governance specs and policies at app startup
  useTelemetryGovernance();

  const refreshDraftAnalytics = React.useCallback(async () => {
    const analytics = await getDraftAbandonmentAnalytics(
      BENEFIT_REGISTRATION_SERVICE_ID,
      BENEFIT_DRAFT_KEY
    );
    setDraftAnalytics(analytics);
  }, []);

  const refreshSyncSnapshot = React.useCallback(async () => {
    const snapshot = await getSyncStatusSnapshot(SYNC_ACTIONS_PREVIEW_LIMIT);
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
  }, [refreshDraftAnalytics, refreshSyncSnapshot]);

  React.useEffect(() => {
    if (!connectivity.isOnline) {
      return;
    }

    let cancelled = false;

    const syncWhenOnline = async () => {
      try {
        await processSyncQueue();
      } finally {
        if (!cancelled) {
          await refreshSyncSnapshot();
        }
      }
    };

    void syncWhenOnline();

    return () => {
      cancelled = true;
    };
  }, [connectivity.isOnline, refreshSyncSnapshot]);

  React.useEffect(() => {
    if (
      (activeView !== 'services' && activeView !== 'serviceScreens') ||
      catalogServices.length > 0 ||
      catalogLoading
    ) {
      return;
    }

    let cancelled = false;
    setCatalogLoading(true);
    setCatalogResolved(false);
    setCatalogError('');

    const loadCatalog = async () => {
      try {
        const catalog = await getDataBackedServiceCatalog();
        if (!cancelled) {
          setCatalogServices(catalog);
        }
      } catch (error) {
        if (!cancelled) {
          setCatalogError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!cancelled) {
          setCatalogLoading(false);
          setCatalogResolved(true);
        }
      }
    };

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [activeView, catalogLoading, catalogServices.length]);

  const loadFilePreviews = React.useCallback(async () => {
    setFilePreviewLoading(true);
    setFilePreviewError('');

    try {
      const previews = await getServiceDataFilePreviews(2);
      setFilePreviewRows(previews);
    } catch (error) {
      setFilePreviewError(error instanceof Error ? error.message : String(error));
    } finally {
      setFilePreviewLoading(false);
      setFilePreviewResolved(true);
    }
  }, []);

  React.useEffect(() => {
    if (activeView !== 'services' || filePreviewLoading || filePreviewResolved) {
      return;
    }

    void loadFilePreviews();
  }, [activeView, filePreviewLoading, filePreviewResolved, loadFilePreviews]);

  React.useEffect(() => {
    void refreshSyncSnapshot();
    const interval = window.setInterval(() => {
      void refreshSyncSnapshot();
    }, 20000);

    return () => window.clearInterval(interval);
  }, [refreshSyncSnapshot]);

  React.useEffect(() => {
    const draftSaveTimers = draftSaveTimersRef.current;

    return () => {
      Object.values(draftSaveTimers).forEach((timerId) => {
        if (timerId) {
          window.clearTimeout(timerId);
        }
      });
    };
  }, []);

  const persistDraftField = React.useCallback(
    async (fieldName: keyof DraftFields, fieldValue: string) => {
      try {
        await saveDraftFieldAtomic(
          BENEFIT_REGISTRATION_SERVICE_ID,
          BENEFIT_DRAFT_KEY,
          fieldName,
          fieldValue
        );

        setLastSavedAt(new Date().toLocaleTimeString());
        await refreshDraftAnalytics();
      } catch (error) {
        setSyncMessage(
          `Draft save failed: ${error instanceof Error ? error.message : String(error)}`
        );
        window.setTimeout(() => setSyncMessage(''), 3500);
      }
    },
    [refreshDraftAnalytics]
  );

  const handleDraftFieldChange =
    (fieldName: keyof DraftFields) => async (event: React.ChangeEvent<HTMLInputElement>) => {
      const fieldValue = event.target.value;

      setDraft((previous) => ({
        ...previous,
        [fieldName]: fieldValue,
      }));

      const existingTimer = draftSaveTimersRef.current[fieldName];
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }

      draftSaveTimersRef.current[fieldName] = window.setTimeout(() => {
        void persistDraftField(fieldName, fieldValue);
      }, 450);

      if (syncMessage.startsWith('Draft save failed')) {
        setSyncMessage('');
      }
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
  const predictiveHero = React.useMemo(
    () =>
      computePredictiveRoi('Madurai', 'Millet', heroDaysSinceOnboarding, [8, 13, 16, 3], {
        deltaYieldAi: 240,
        deltaMarketPrice: 2.4,
        deltaInputCostSavings: 3200,
        deltaTransactionCostSavings: 550,
        deltaOperationalCostSavings: 760,
        deltaRiskCostSavings: 640,
      }),
    [heroDaysSinceOnboarding]
  );

  const { yieldIncreasePercent, costSavings } = React.useMemo(() => {
    const increasePercent =
      ((predictiveHero.breakdown.adjustedYield - predictiveHero.baselineUsed.avgYield) /
        predictiveHero.baselineUsed.avgYield) *
      100;
    const baselineCostTotal =
      predictiveHero.baselineUsed.avgInputCost +
      predictiveHero.baselineUsed.avgTransactionCost +
      predictiveHero.baselineUsed.avgInputCost * 0.12 +
      predictiveHero.baselineUsed.avgInputCost * 0.08;

    return {
      yieldIncreasePercent: increasePercent,
      costSavings: baselineCostTotal - predictiveHero.breakdown.totalCosts,
    };
  }, [predictiveHero]);

  const timeSavedHours = 14;
  const pestAlertsResolved = Math.max(0, services.length - 12);

  const setActiveViewDeferred = React.useCallback((view: AppView) => {
    React.startTransition(() => {
      setActiveView(view);
    });
  }, []);

  const servicesForTab = React.useMemo<DataBackedServiceCatalogItem[]>(() => {
    if (!catalogResolved) {
      return [];
    }

    if (catalogServices.length > 0) {
      return catalogServices;
    }

    return services.map((service) => ({
      id: String(service.id),
      name: service.name,
      purpose: service.purpose,
      dataRequired: service.dataRequired,
      localCache: service.localCache,
      offlineCapability: service.offlineCapability,
      usageImpact: service.usageImpact,
      dependencies: service.dependencies,
      source: 'json' as const,
      sourcePath: 'seed:vital_services',
      recordCount: 0,
    }));
  }, [catalogResolved, catalogServices, services]);

  const filteredServices = React.useMemo(() => {
    const keyword = serviceSearch.trim().toLowerCase();
    if (!keyword) {
      return servicesForTab;
    }

    return servicesForTab.filter((service) => {
      return (
        service.name.toLowerCase().includes(keyword) ||
        service.purpose.toLowerCase().includes(keyword) ||
        service.dataRequired.toLowerCase().includes(keyword)
      );
    });
  }, [serviceSearch, servicesForTab]);

  // All 18 Uzhavan services are immediately available from the SQLite seed;
  // no need to wait for the async catalog load.
  const uzhavanServicesForScreens = services;

  const loadLocationScope = React.useCallback(async () => {
    setLocationScopeLoading(true);
    setLocationScopeError('');

    try {
      const dataset = await getService2Dataset();
      const blocksByDistrict = dataset.districtBlocks.reduce<Record<string, Set<string>>>(
        (accumulator, row) => {
          const district = row.districtName.trim();
          const block = row.blockName.trim();

          if (!district || !block) {
            return accumulator;
          }

          if (!accumulator[district]) {
            accumulator[district] = new Set<string>();
          }

          accumulator[district].add(block);
          return accumulator;
        },
        {}
      );

      const districts = Object.keys(blocksByDistrict).sort((a, b) =>
        a.localeCompare(b, 'en', { sensitivity: 'base' })
      );

      const normalizedBlocksByDistrict = Object.entries(blocksByDistrict).reduce<
        Record<string, string[]>
      >((accumulator, [district, blocks]) => {
        accumulator[district] = Array.from(blocks).sort((a, b) =>
          a.localeCompare(b, 'en', { sensitivity: 'base' })
        );
        return accumulator;
      }, {});

      setLocationDistricts(districts);
      setLocationBlocksByDistrict(normalizedBlocksByDistrict);

      const defaultDistrict = districts[0] ?? '';
      setSelectedLocationDistrict((current) => current || defaultDistrict);
      setSelectedLocationBlock((current) => {
        if (current) {
          return current;
        }

        return defaultDistrict
          ? normalizedBlocksByDistrict[defaultDistrict]?.[0] ?? ''
          : '';
      });
    } catch (error) {
      setLocationScopeError(
        error instanceof Error ? error.message : 'Unable to load location context'
      );
    } finally {
      setLocationScopeLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (
      activeView !== 'serviceScreens' ||
      locationScopeLoading ||
      locationDistricts.length > 0
    ) {
      return;
    }

    void loadLocationScope();
  }, [
    activeView,
    loadLocationScope,
    locationDistricts.length,
    locationScopeLoading,
  ]);

  React.useEffect(() => {
    if (!selectedLocationDistrict) {
      setSelectedLocationBlock('');
      return;
    }

    const blocks = locationBlocksByDistrict[selectedLocationDistrict] ?? [];
    if (!blocks.length) {
      setSelectedLocationBlock('');
      return;
    }

    if (!blocks.includes(selectedLocationBlock)) {
      setSelectedLocationBlock(blocks[0]);
    }
  }, [locationBlocksByDistrict, selectedLocationBlock, selectedLocationDistrict]);

  const selectedDistrictBlocks = React.useMemo(() => {
    if (!selectedLocationDistrict) {
      return [];
    }

    return locationBlocksByDistrict[selectedLocationDistrict] ?? [];
  }, [locationBlocksByDistrict, selectedLocationDistrict]);

  const getServiceScreenComponent = React.useCallback(
    (serviceId: number) => {
      switch (serviceId) {
        case 1:
          return <MSMECharterScreen />;
        case 2:
          return (
            <BenefitRegistrationScreen
              initialDistrict={selectedLocationDistrict || undefined}
              initialBlock={selectedLocationBlock || undefined}
            />
          );
        case 3:
          return <CropInsuranceScreen />;
        case 4:
          return (
            <FertilizerStockScreen initialDistrict={selectedLocationDistrict || undefined} />
          );
        case 5:
          return <SeedStockScreen initialDistrict={selectedLocationDistrict || undefined} />;
        case 6:
          return (
            <MachineryHiringScreen
              initialDistrict={selectedLocationDistrict || undefined}
              initialBlock={selectedLocationBlock || undefined}
            />
          );
        case 7:
          return <MarketPriceScreen />;
        case 8:
          return <WeatherForecastScreen />;
        case 9:
          return <OfficerContactInfoScreen />;
        case 10:
          return (
            <ReservoirLevelsScreen initialDistrict={selectedLocationDistrict || undefined} />
          );
        case 11:
          return <AgricultureNewsScreen />;
        case 12:
          return <UserFeedbackScreen />;
        case 13:
          return <MyFarmGuideScreen />;
        case 14:
          return <OrganicFarmingInfoScreen />;
        case 15:
          return <FpoProductsScreen />;
        case 16:
          return <PestIdentificationScreen />;
        case 17:
          return <AtmaTrainingRegistrationScreen />;
        case 18:
          return <UzhavanEMarketScreen />;
        default:
          return null;
      }
    },
    [selectedLocationBlock, selectedLocationDistrict]
  );

  const totalSyncActions = syncSnapshot.actions.length;
  const syncedActions = syncSnapshot.actions.filter((action) => action.status === 'synced').length;
  const syncHealthPercent =
    totalSyncActions > 0 ? Math.round((syncedActions / totalSyncActions) * 100) : 100;
  const draftProgressPercent = Math.round((completedDraftFields / 4) * 100);
  const draftEngagementLabel = draftAnalytics
    ? `${draftAnalytics.saveCount} saves · ${draftAnalytics.resumeCount} resumes`
    : 'No draft activity yet';

  const frontLayerModules: Array<{
    title: string;
    subtitle: string;
    metric: string;
    view: AppView;
  }> = [
    {
      title: 'Offline Draft Engine',
      subtitle: 'Atomic save + resume flow',
      metric: `${draftProgressPercent}% completion`,
      view: 'draft',
    },
    {
      title: 'Connectivity Transparency',
      subtitle: 'Queue, sync state, retry visibility',
      metric: `${outboxCount} pending`,
      view: 'sync',
    },
    {
      title: 'ROI Intelligence Layer',
      subtitle: 'Predictive returns + impact cards',
      metric: `₹${Math.abs(costSavings).toFixed(0)} savings`,
      view: 'roi',
    },
    {
      title: 'Governance & Admin',
      subtitle: 'District metrics + trust signals',
      metric: `${syncHealthPercent}% sync health`,
      view: 'admin',
    },
  ];

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
            <h1>VICT SDK</h1>
            <p className="brand-tagline">Offline-first intelligence for resilient agriculture services.</p>
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
            onClick={() => setActiveViewDeferred('overview')}
          >
            Overview
          </button>
          <button
            className={activeView === 'draft' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveViewDeferred('draft')}
          >
            Draft
          </button>
          <button
            className={activeView === 'services' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveViewDeferred('services')}
          >
            Services
          </button>
          <button
            className={activeView === 'serviceScreens' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveViewDeferred('serviceScreens')}
          >
            Service Screens
          </button>
          <button
            className={activeView === 'sync' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveViewDeferred('sync')}
          >
            Sync Status
          </button>
          <button
            className={activeView === 'roi' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveViewDeferred('roi')}
          >
            ROI & Governance
          </button>
          <button
            className={activeView === 'roi-console' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveViewDeferred('roi-console')}
          >
            🚀 ROI Console (NEW)
          </button>
          <button
            className={activeView === 'admin' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveViewDeferred('admin')}
          >
            Admin
          </button>
          <button
            className={activeView === 'developer' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveViewDeferred('developer')}
          >
            Developer Tools
          </button>
        </nav>

        {activeView === 'overview' && (
          <section className="overview-stack">
            <section className="command-strip">
              <article className="command-item">
                <p>Platform Readiness</p>
                <strong>{services.length} Services Live</strong>
              </article>
              <article className="command-item">
                <p>Data Reliability</p>
                <strong>{syncHealthPercent}% Sync Health</strong>
              </article>
              <article className="command-item">
                <p>Farmer Workflow</p>
                <strong>{draftProgressPercent}% Draft Completion</strong>
              </article>
              <article className="command-item">
                <p>Engagement Signal</p>
                <strong>{draftEngagementLabel}</strong>
              </article>
              <article className="command-item">
                <p>Impact Signal</p>
                <strong>{yieldIncreasePercent.toFixed(1)}% Yield Lift</strong>
              </article>
            </section>

            <div className="hero-grid">
              <div className="hero-copy">
                <p className="hero-kicker">VICT SDK</p>
                <h2>Trusted offline-first orchestration for digital agriculture.</h2>
                <p className="hero-subtitle">
                  Built for real-world field conditions with transparent sync, secure drafts,
                  and measurable farmer outcomes.
                </p>
                <div className="hero-actions">
                  <button className="primary-btn" onClick={() => setActiveViewDeferred('draft')}>
                    Start Benefit Draft
                  </button>
                  <button className="secondary-btn" onClick={() => setActiveViewDeferred('sync')}>
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

            <section className="showcase-grid">
              {frontLayerModules.map((module) => (
                <button
                  key={module.title}
                  className="showcase-card"
                  onClick={() => setActiveViewDeferred(module.view)}
                >
                  <span className="showcase-title">{module.title}</span>
                  <span className="showcase-subtitle">{module.subtitle}</span>
                  <strong className="showcase-metric">{module.metric}</strong>
                </button>
              ))}
            </section>

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
              <h2>Data-backed Services ({filteredServices.length})</h2>
              <input
                value={serviceSearch}
                onChange={(event) => setServiceSearch(event.target.value)}
                placeholder="Search by name, purpose, data required"
              />
            </div>

            <section className="file-preview-panel">
              <div className="file-preview-header">
                <h3>JSON/File Data Preview</h3>
                <button
                  className="secondary-btn"
                  onClick={() => void loadFilePreviews()}
                  disabled={filePreviewLoading}
                >
                  {filePreviewLoading ? 'Refreshing...' : 'Refresh Previews'}
                </button>
              </div>
              <p className="saved-meta">
                Showing live payload samples loaded from files under <strong>/public/data</strong>.
              </p>

              {filePreviewError && (
                <p className="status-error">Unable to load file previews: {filePreviewError}</p>
              )}

              {!filePreviewLoading && filePreviewRows.length === 0 && (
                <p className="saved-meta">No file preview data available yet.</p>
              )}

              <div className="file-preview-grid">
                {filePreviewRows.map((preview) => (
                  <article key={preview.id} className="file-preview-card">
                    <h4>{preview.name}</h4>
                    <span className="service-badge">
                      {preview.sourceType.toUpperCase()} · {preview.status.toUpperCase()} · Records:{' '}
                      {preview.recordCount}
                    </span>
                    <p>
                      <strong>File:</strong> {preview.sourcePath}
                    </p>
                    {preview.generatedAt && (
                      <p>
                        <strong>Generated:</strong> {preview.generatedAt}
                      </p>
                    )}
                    {preview.error && <p className="status-error">{preview.error}</p>}
                    {preview.status === 'loaded' && (
                      <pre className="json-preview">
                        {JSON.stringify(preview.sample, null, 2)}
                      </pre>
                    )}
                    {preview.status === 'file-only' && (
                      <p className="saved-meta">
                        Binary workbook file detected. Row counts are listed in catalog via sheet
                        summary JSON.
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </section>

            {catalogLoading && <p className="saved-meta">Loading catalog from JSON and Excel...</p>}
            {catalogError && (
              <p className="status-error">Failed to load full catalog: {catalogError}</p>
            )}

            <div className="service-grid">
              {filteredServices.map((service) => (
                <article key={service.id} className="service-card">
                  <h3>
                    {service.id} - {service.name}
                  </h3>
                  <span className="service-badge">
                    Source: {service.source.toUpperCase()} · Records: {service.recordCount}
                  </span>
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
                  <p>
                    <strong>Source Path:</strong> {service.sourcePath}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeView === 'serviceScreens' && (() => {
          const activeService = uzhavanServicesForScreens.find((s) => s.id === activeServiceId)
            ?? uzhavanServicesForScreens[0];
          const activeScreen = activeService ? getServiceScreenComponent(activeService.id) : null;

          return (
            <section className="panel uzhavan-layout">
              {/* Sidebar */}
              <aside className="uzhavan-sidebar">
                <div className="uzhavan-sidebar-header">
                  <span className="uzhavan-sidebar-title">Uzhavan Services</span>
                  <span className="uzhavan-sidebar-count">{uzhavanServicesForScreens.length || 18}</span>
                </div>
                <ul className="uzhavan-service-list">
                  {(uzhavanServicesForScreens.length > 0
                    ? uzhavanServicesForScreens
                    : (Array.from({ length: 18 }, (_, i) => ({ id: i + 1, name: `Service ${i + 1}` })) as Array<{ id: number; name: string }>)
                  ).map((service) => (
                    <li key={service.id}>
                      <button
                        className={`uzhavan-service-item${ service.id === activeServiceId ? ' active' : ''}`}
                        onClick={() => setActiveServiceId(service.id)}
                      >
                        <span className="uzhavan-service-num">#{service.id}</span>
                        <span className="uzhavan-service-name">{service.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>

              {/* Main content */}
              <div className="uzhavan-main">
                {/* Location bar */}
                <div className="uzhavan-location-bar">
                  <label className="uzhavan-loc-field">
                    <span>District</span>
                    <select
                      value={selectedLocationDistrict}
                      onChange={(e) => setSelectedLocationDistrict(e.target.value)}
                    >
                      <option value="">Select district</option>
                      {locationDistricts.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </label>
                  <label className="uzhavan-loc-field">
                    <span>Block</span>
                    <select
                      value={selectedLocationBlock}
                      onChange={(e) => setSelectedLocationBlock(e.target.value)}
                      disabled={!selectedLocationDistrict || selectedDistrictBlocks.length === 0}
                    >
                      <option value="">Select block</option>
                      {selectedDistrictBlocks.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="secondary-btn"
                    onClick={() => void loadLocationScope()}
                    disabled={locationScopeLoading}
                    style={{ alignSelf: 'flex-end' }}
                  >
                    {locationScopeLoading ? 'Loading...' : 'Reload'}
                  </button>
                  {locationScopeError ? (
                    <p className="status-error" style={{ margin: 0, alignSelf: 'center' }}>{locationScopeError}</p>
                  ) : null}
                </div>

                {/* Active service header */}
                {activeService && (
                  <div className="uzhavan-service-header">
                    <h2>#{activeService.id} — {activeService.name}</h2>
                    <div className="uzhavan-meta-row">
                      <span><strong>Purpose:</strong> {activeService.purpose}</span>
                    </div>
                    <div className="uzhavan-meta-chips">
                      <span className="uzhavan-chip">{activeService.offlineCapability}</span>
                      <span className="uzhavan-chip uzhavan-chip--impact">{activeService.usageImpact}</span>
                    </div>
                  </div>
                )}

                {/* Screen or placeholder */}
                <div className="uzhavan-screen-body">
                  {activeScreen ?? (
                    <div className="uzhavan-coming-soon">
                      <p>Interactive screen coming soon for this service.</p>
                      {activeService && (
                        <ul>
                          <li><strong>Data required:</strong> {activeService.dataRequired}</li>
                          <li><strong>Local cache:</strong> {activeService.localCache}</li>
                          <li><strong>Dependencies:</strong> {activeService.dependencies}</li>
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        })()}

        {activeView === 'roi' && (
          <section className="panel roi-panel">
            <RoiPortfolioScreen />
          </section>
        )}

        {activeView === 'roi-console' && <RoiConsole />}

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
