import React from 'react';
import { evaluateReleaseReadiness, GovernanceRegistry } from './governance';
import { buildFeatureAttributionReport } from './attribution';
import {
  evaluateExperimentAttribution,
  ExperimentPlanRegistry,
} from './experimentation';
import { OfflineDatasetCache } from './offline';
import {
  buildKpiMetricPayload,
  ensureKpiEmitInput,
  FeatureOutcomeRegistry,
} from './process';
import { RoiEngine } from './roi';
import { TelemetryClient } from './telemetry';
import type {
  FeatureAttributionReport,
  ExperimentAttributionResult,
  FeatureExperimentPlan,
  FeatureGovernanceRecord,
  FeatureOutcomeSpec,
  FeatureRoiDashboard,
  FeatureSpecApproval,
  FeatureSpecValidationResult,
  FeatureTelemetrySpec,
  KpiMetricEmitInput,
  OfflineDatasetConfig,
  PortfolioRoiDashboard,
  Primitive,
  ReleaseReadinessResult,
  RoiCostModel,
  RoiMetric,
  TelemetryConfig,
  TelemetryPayload,
  TelemetryTransport,
  BusinessPolicyId,
} from './types';

type SdkContextValue = {
  ready: boolean;
  isOnline: boolean;
  queueSize: number;
  /** POLICY-ENFORCED: track(policyId, eventId, payload, serviceId) */
  track: (policyId: BusinessPolicyId, eventId: string, payload: TelemetryPayload, serviceId?: number) => void;
  flush: () => Promise<void>;
  cachePut: (
    config: OfflineDatasetConfig,
    key: string,
    value: Record<string, Primitive>
  ) => void;
  cacheGet: (config: OfflineDatasetConfig, key: string) => Record<string, Primitive> | null;
  computeRoi: (baselineCost?: number, serviceId?: number) => RoiMetric[];
  computeRoiDashboard: (
    costs: RoiCostModel,
    serviceId?: number,
    eligibleUsers?: number
  ) => FeatureRoiDashboard;
  computePortfolioRoiDashboard: (
    entries: Array<{ costs: RoiCostModel; serviceId?: number; eligibleUsers?: number }>
  ) => PortfolioRoiDashboard;
  evaluateReleaseReadiness: (
    spec: FeatureTelemetrySpec,
    approval: FeatureSpecApproval
  ) => ReleaseReadinessResult;
  registerTelemetrySpec: (spec: FeatureTelemetrySpec) => ReleaseReadinessResult;
  setFeatureApprovals: (featureId: string, approval: FeatureSpecApproval) => void;
  getGovernanceRecords: () => FeatureGovernanceRecord[];
  evaluateFeatureReadiness: (featureId: string) => ReleaseReadinessResult;
  trackFeatureEvent: (
    featureId: string,
    eventId: string,
    payload: TelemetryPayload,
    serviceId?: number
  ) => FeatureSpecValidationResult;
  registerFeatureOutcomeSpec: (spec: FeatureOutcomeSpec) => FeatureSpecValidationResult;
  listFeatureOutcomeSpecs: () => FeatureOutcomeSpec[];
  emitKpiMetric: (input: KpiMetricEmitInput) => FeatureSpecValidationResult;
  getAttributionReport: () => FeatureAttributionReport;
  registerExperimentPlan: (plan: FeatureExperimentPlan) => void;
  listExperimentPlans: () => FeatureExperimentPlan[];
  evaluateExperimentAttribution: (
    featureId: string,
    kpiId: string,
    metricEventId?: string
  ) => ExperimentAttributionResult | null;
};

const SdkContext = React.createContext<SdkContextValue | null>(null);

export type OfflineAgriSdkProviderProps = {
  children: React.ReactNode;
  telemetryConfig?: TelemetryConfig;
  telemetryTransport?: TelemetryTransport;
};

export function OfflineAgriSdkProvider({
  children,
  telemetryConfig,
  telemetryTransport,
}: OfflineAgriSdkProviderProps) {
  const telemetryRef = React.useRef<TelemetryClient | null>(null);
  const cacheRef = React.useRef<OfflineDatasetCache | null>(null);
  const roiRef = React.useRef<RoiEngine | null>(null);
  const featureRegistryRef = React.useRef<FeatureOutcomeRegistry | null>(null);
  const experimentRegistryRef = React.useRef<ExperimentPlanRegistry | null>(null);
  const governanceRegistryRef = React.useRef<GovernanceRegistry | null>(null);
  const [queueSize, setQueueSize] = React.useState(0);
  const [online, setOnline] = React.useState(true);

  if (!telemetryRef.current) {
    telemetryRef.current = new TelemetryClient(telemetryConfig, telemetryTransport);
    telemetryRef.current.startAutoFlush();
  }

  if (!cacheRef.current) {
    cacheRef.current = new OfflineDatasetCache();
  }

  if (!roiRef.current) {
    roiRef.current = new RoiEngine();
  }

  if (!featureRegistryRef.current) {
    featureRegistryRef.current = new FeatureOutcomeRegistry();
  }

  if (!experimentRegistryRef.current) {
    experimentRegistryRef.current = new ExperimentPlanRegistry();
  }

  if (!governanceRegistryRef.current) {
    governanceRegistryRef.current = new GovernanceRegistry();
  }

  React.useEffect(() => {
    const telemetry = telemetryRef.current;
    if (!telemetry) {
      return;
    }

    setOnline(telemetry.isOnline());
    setQueueSize(telemetry.queueSize());

    const timer = window.setInterval(() => {
      setOnline(telemetry.isOnline());
      setQueueSize(telemetry.queueSize());
    }, 1000);

    return () => {
      window.clearInterval(timer);
      telemetry.destroy();
    };
  }, []);

  const value = React.useMemo<SdkContextValue>(() => {
    const telemetry = telemetryRef.current!;
    const cache = cacheRef.current!;
    const roi = roiRef.current!;
    const featureRegistry = featureRegistryRef.current!;
    const experiments = experimentRegistryRef.current!;
    const governance = governanceRegistryRef.current!;

    return {
      ready: true,
      isOnline: online,
      queueSize,
      track: (policyId, eventId, payload, serviceId) => {
        telemetry.track(policyId, eventId, payload, serviceId);
        setQueueSize(telemetry.queueSize());
      },
      flush: async () => {
        await telemetry.flush();
        setQueueSize(telemetry.queueSize());
      },
      cachePut: (config, key, payload) => {
        cache.put(config, key, payload);
      },
      cacheGet: (config, key) => {
        return cache.get(config, key);
      },
      computeRoi: (baselineCost?: number, serviceId?: number) => {
        return roi.compute({
          events: telemetry.getQueuedEvents(),
          baselineCost,
          serviceId,
        });
      },
      computeRoiDashboard: (costs, serviceId, eligibleUsers) => {
        return roi.computeFeatureDashboard({
          events: telemetry.getQueuedEvents(),
          costs,
          serviceId,
          eligibleUsers,
        });
      },
      computePortfolioRoiDashboard: (entries) => {
        return roi.computePortfolioDashboard(
          entries.map((entry) => ({
            events: telemetry.getQueuedEvents(),
            costs: entry.costs,
            serviceId: entry.serviceId,
            eligibleUsers: entry.eligibleUsers,
          }))
        );
      },
      evaluateReleaseReadiness: (spec, approval) => {
        const observedEventIds = telemetry
          .getQueuedEvents()
          .map((event) => event.eventId);
        return evaluateReleaseReadiness(spec, approval, observedEventIds);
      },
      registerTelemetrySpec: (spec) => {
        return governance.upsertTelemetrySpec(spec);
      },
      setFeatureApprovals: (featureId, approval) => {
        governance.setApprovals(featureId, approval);
      },
      getGovernanceRecords: () => {
        return governance.listRecords();
      },
      evaluateFeatureReadiness: (featureId) => {
        const observedEventIds = telemetry
          .getQueuedEvents()
          .map((event) => event.eventId);
        return governance.evaluateFeatureReadiness(featureId, observedEventIds);
      },
      trackFeatureEvent: (featureId, eventId, payload, serviceId) => {
        const record = governance.getRecord(featureId);
        if (!record) {
          return {
            valid: false,
            errors: [`Telemetry spec not registered for featureId=${featureId}`],
          };
        }

        const telemetryEvent = record.telemetrySpec.events.find((entry) => entry.eventId === eventId);
        if (!telemetryEvent) {
          return {
            valid: false,
            errors: [`Event ${eventId} is not declared in telemetry spec for featureId=${featureId}`],
          };
        }

        const missingFields = telemetryEvent.requiredFields.filter(
          (field) => payload[field] === undefined || payload[field] === null
        );

        if (missingFields.length) {
          return {
            valid: false,
            errors: [`Missing required telemetry fields: ${missingFields.join(', ')}`],
          };
        }

        telemetry.trackFeatureEvent(
          eventId,
          {
            featureId,
            ...payload,
          },
          serviceId
        );
        setQueueSize(telemetry.queueSize());

        return { valid: true, errors: [] };
      },
      registerFeatureOutcomeSpec: (spec) => {
        experiments.upsert(spec.experimentPlan);
        return featureRegistry.upsert(spec);
      },
      listFeatureOutcomeSpecs: () => {
        return featureRegistry.list();
      },
      emitKpiMetric: (input) => {
        const inputValidation = ensureKpiEmitInput(input);
        if (!inputValidation.valid) {
          return inputValidation;
        }

        const spec = featureRegistry.get(input.featureId);
        if (!spec) {
          return {
            valid: false,
            errors: [`Feature spec not found for featureId=${input.featureId}`],
          };
        }

        const kpi = featureRegistry.getKpi(input.featureId, input.kpiId);
        if (!kpi) {
          return {
            valid: false,
            errors: [`KPI ${input.kpiId} not found in feature ${input.featureId}`],
          };
        }

        const payload = buildKpiMetricPayload(spec, kpi, input.currentValue, input.context);

        telemetry.trackFeatureEvent(
          'FEATURE_KPI_METRIC',
          {
            ...payload,
            releaseId: input.releaseId ?? spec.releaseId,
          },
          input.serviceId ?? spec.serviceId
        );
        setQueueSize(telemetry.queueSize());

        return { valid: true, errors: [] };
      },
      getAttributionReport: () => {
        return buildFeatureAttributionReport(
          featureRegistry.list(),
          telemetry.getQueuedEvents()
        );
      },
      registerExperimentPlan: (plan) => {
        experiments.upsert(plan);
      },
      listExperimentPlans: () => {
        return experiments.list();
      },
      evaluateExperimentAttribution: (featureId, kpiId, metricEventId = 'FEATURE_KPI_METRIC') => {
        const spec = featureRegistry.get(featureId);
        if (!spec) {
          return null;
        }

        const plan = experiments.get(featureId);
        if (!plan) {
          return null;
        }

        return evaluateExperimentAttribution({
          spec: {
            ...spec,
            experimentPlan: plan,
          },
          kpiId,
          metricEventId,
          events: telemetry.getQueuedEvents(),
        });
      },
    };
  }, [online, queueSize]);

  return <SdkContext.Provider value={value}>{children}</SdkContext.Provider>;
}

export function useOfflineAgriSdk(): SdkContextValue {
  const context = React.useContext(SdkContext);
  if (!context) {
    throw new Error('useOfflineAgriSdk must be used inside OfflineAgriSdkProvider');
  }

  return context;
}
