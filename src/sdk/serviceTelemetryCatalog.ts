import {
  BUSINESS_POLICIES,
  PolicyRegistryClient,
  type BusinessPolicy,
  type BusinessPolicyId,
  type PolicyEventSchema,
} from './policy';
import type { FeatureTelemetrySpec, RoiCostModel, TelemetryEvent } from './types';

export type TrackedServiceDefinition = {
  serviceId: number;
  featureId: string;
  featureName: string;
  serviceName: string;
  policyId: BusinessPolicyId;
  owners: {
    product: string;
    engineering: string;
    analytics: string;
  };
  eligibleUsers: number;
  roiCosts: RoiCostModel;
  datasetPaths?: string[];
  isHero?: boolean;
};

export type ServiceMeasuredKpi = {
  featureId: string;
  serviceId: number;
  uniqueSessions7d: number;
  actionsCompleted7d: number;
  successRatePercent: number;
  p95LatencyMs: number;
  totalTimeSavedMinutes7d: number;
  totalMeasuredBenefit7d: number;
  observedEvents7d: number;
};

const SESSION_KEY = 'tn.agri.telemetry.sessionId.v1';
const ANON_USER_KEY = 'tn.agri.telemetry.anonUserId.v1';
const DEFAULT_TIME_VALUE_PER_HOUR = 150;

const patchedPolicyIds = new Set<string>();

export const STANDARD_SERVICE_EVENT_SCHEMAS: PolicyEventSchema[] = [
  {
    eventId: 'service_opened',
    description: 'Service screen opened',
    requiredFields: ['featureId', 'sessionId', 'timestamp', 'source'],
    optionalFields: ['userId', 'screen', 'district', 'commodity', 'market', 'module'],
  },
  {
    eventId: 'service_data_load_started',
    description: 'Service data load started',
    requiredFields: ['featureId', 'sessionId', 'timestamp', 'source', 'operation'],
    optionalFields: [
      'userId',
      'district',
      'commodity',
      'market',
      'module',
      'datasetPath',
      'cacheLayer',
    ],
  },
  {
    eventId: 'service_data_load_succeeded',
    description: 'Service data load succeeded',
    requiredFields: [
      'featureId',
      'sessionId',
      'timestamp',
      'source',
      'operation',
      'latencyMs',
      'records',
    ],
    optionalFields: [
      'userId',
      'district',
      'commodity',
      'market',
      'module',
      'datasetPath',
      'cacheLayer',
    ],
  },
  {
    eventId: 'service_data_load_failed',
    description: 'Service data load failed',
    requiredFields: [
      'featureId',
      'sessionId',
      'timestamp',
      'source',
      'operation',
      'latencyMs',
      'errorCode',
    ],
    optionalFields: [
      'userId',
      'district',
      'commodity',
      'market',
      'module',
      'datasetPath',
      'cacheLayer',
    ],
  },
  {
    eventId: 'service_action_completed',
    description: 'Service interaction completed successfully',
    requiredFields: ['featureId', 'sessionId', 'timestamp', 'source', 'actionName'],
    optionalFields: [
      'userId',
      'district',
      'commodity',
      'market',
      'module',
      'records',
      'timeSavedMinutes',
      'timeSavedHours',
      'timeSavedValue',
      'valuePerHour',
      'costSaved',
      'costSavings',
      'incrementalRevenue',
      'revenueGained',
      'productivityValue',
      'qualitativeBenefitValue',
    ],
  },
];

export const TRACKED_SERVICE_DEFINITIONS: TrackedServiceDefinition[] = [
  {
    serviceId: 1,
    featureId: 'SUBSIDY_SCHEMES_INFO',
    featureName: 'Subsidy Schemes Information',
    serviceName: 'Subsidy Schemes Info',
    policyId: BUSINESS_POLICIES.POL_SUBSIDY_VELOCITY,
    owners: { product: 'Citizen Services', engineering: 'SDK Platform', analytics: 'Field Insights' },
    eligibleUsers: 10000,
    roiCosts: { developmentCost: 90000, infrastructureCost: 15000, supportCost: 12000, maintenanceCost: 10000 },
    datasetPaths: ['/data/service-1-schemes.json'],
  },
  {
    serviceId: 2,
    featureId: 'BENEFIT_REGISTRATION',
    featureName: 'Benefit Registration',
    serviceName: 'Benefit Registration',
    policyId: BUSINESS_POLICIES.POL_BENEFIT_REGISTRATION,
    owners: { product: 'Citizen Services', engineering: 'SDK Platform', analytics: 'Field Insights' },
    eligibleUsers: 10000,
    roiCosts: { developmentCost: 140000, infrastructureCost: 22000, supportCost: 18000, maintenanceCost: 15000 },
    datasetPaths: ['/data/service-2-benefits.json'],
  },
  {
    serviceId: 3,
    featureId: 'CROP_INSURANCE',
    featureName: 'Crop Insurance',
    serviceName: 'Crop Insurance',
    policyId: BUSINESS_POLICIES.POL_FARMING_GUIDANCE,
    owners: { product: 'Citizen Services', engineering: 'SDK Platform', analytics: 'Field Insights' },
    eligibleUsers: 9000,
    roiCosts: { developmentCost: 110000, infrastructureCost: 18000, supportCost: 15000, maintenanceCost: 12000 },
  },
  {
    serviceId: 4,
    featureId: 'FERTILIZER_STOCK',
    featureName: 'Fertilizer Stock',
    serviceName: 'Fertilizer Stock',
    policyId: BUSINESS_POLICIES.POL_FERTILIZER_SUPPLY,
    owners: { product: 'Input Supply', engineering: 'SDK Platform', analytics: 'Field Insights' },
    eligibleUsers: 8500,
    roiCosts: { developmentCost: 100000, infrastructureCost: 17000, supportCost: 14000, maintenanceCost: 12000 },
    datasetPaths: ['/data/service-4-fertilizer-stock.json'],
  },
  {
    serviceId: 5,
    featureId: 'SEED_STOCK',
    featureName: 'Seed Stock',
    serviceName: 'Seed Stock',
    policyId: BUSINESS_POLICIES.POL_SEED_STOCK,
    owners: { product: 'Input Supply', engineering: 'SDK Platform', analytics: 'Field Insights' },
    eligibleUsers: 8500,
    roiCosts: { developmentCost: 100000, infrastructureCost: 17000, supportCost: 14000, maintenanceCost: 12000 },
    datasetPaths: ['/data/service-5-seed-stock.json'],
  },
  {
    serviceId: 6,
    featureId: 'MACHINERY_HIRING',
    featureName: 'Machinery Hiring',
    serviceName: 'Machinery Hiring',
    policyId: BUSINESS_POLICIES.POL_MACHINERY_HIRING,
    owners: { product: 'Operations', engineering: 'SDK Platform', analytics: 'Field Insights' },
    eligibleUsers: 7000,
    roiCosts: { developmentCost: 110000, infrastructureCost: 18000, supportCost: 16000, maintenanceCost: 13000 },
    datasetPaths: ['/data/service-6-machinery.json'],
  },
  {
    serviceId: 7,
    featureId: 'MARKET_PRICE',
    featureName: 'Daily Market Price',
    serviceName: 'Daily Market Price',
    policyId: BUSINESS_POLICIES.POL_MARKET_PRICING,
    owners: { product: 'Market Services', engineering: 'SDK Platform', analytics: 'Field Insights' },
    eligibleUsers: 9500,
    roiCosts: { developmentCost: 120000, infrastructureCost: 20000, supportCost: 15000, maintenanceCost: 13000 },
  },
  {
    serviceId: 8,
    featureId: 'WEATHER_FORECAST',
    featureName: 'Daily Weather Forecast',
    serviceName: 'Daily Weather Forecast',
    policyId: BUSINESS_POLICIES.POL_WEATHER_ADVISORY,
    owners: { product: 'Advisory Services', engineering: 'SDK Platform', analytics: 'Field Insights' },
    eligibleUsers: 12000,
    roiCosts: { developmentCost: 180000, infrastructureCost: 30000, supportCost: 20000, maintenanceCost: 20000 },
    isHero: true,
  },
  {
    serviceId: 9,
    featureId: 'OFFICER_CONTACT_INFO',
    featureName: 'Officer Contact Info',
    serviceName: 'Officer Contact Info',
    policyId: BUSINESS_POLICIES.POL_FARMING_GUIDANCE,
    owners: { product: 'Citizen Services', engineering: 'SDK Platform', analytics: 'Field Insights' },
    eligibleUsers: 6500,
    roiCosts: { developmentCost: 80000, infrastructureCost: 10000, supportCost: 10000, maintenanceCost: 9000 },
    datasetPaths: ['/data/service-9-officer-visits.json'],
  },
  {
    serviceId: 10,
    featureId: 'RESERVOIR_LEVELS',
    featureName: 'Reservoir Levels',
    serviceName: 'Reservoir Levels',
    policyId: BUSINESS_POLICIES.POL_RESERVOIR_LEVELS,
    owners: { product: 'Water Services', engineering: 'SDK Platform', analytics: 'Field Insights' },
    eligibleUsers: 7000,
    roiCosts: { developmentCost: 100000, infrastructureCost: 16000, supportCost: 13000, maintenanceCost: 11000 },
    datasetPaths: ['/data/service-10-reservoirs.json'],
  },
  {
    serviceId: 11,
    featureId: 'AGRICULTURE_NEWS',
    featureName: 'Agriculture News',
    serviceName: 'Agriculture News',
    policyId: BUSINESS_POLICIES.POL_AGRICULTURAL_NEWS,
    owners: { product: 'Advisory Services', engineering: 'SDK Platform', analytics: 'Field Insights' },
    eligibleUsers: 9000,
    roiCosts: { developmentCost: 85000, infrastructureCost: 12000, supportCost: 11000, maintenanceCost: 10000 },
    datasetPaths: ['/data/service-11-wiring-joins.json'],
  },
  {
    serviceId: 12,
    featureId: 'USER_FEEDBACK',
    featureName: 'User Feedback',
    serviceName: 'User Feedback',
    policyId: BUSINESS_POLICIES.POL_FARMING_GUIDANCE,
    owners: { product: 'Citizen Services', engineering: 'SDK Platform', analytics: 'Field Insights' },
    eligibleUsers: 5000,
    roiCosts: { developmentCost: 70000, infrastructureCost: 8000, supportCost: 10000, maintenanceCost: 8000 },
  },
  {
    serviceId: 13,
    featureId: 'MY_FARM_GUIDE',
    featureName: 'My Farm Guide',
    serviceName: 'My Farm Guide',
    policyId: BUSINESS_POLICIES.POL_FARMING_GUIDANCE,
    owners: { product: 'Advisory Services', engineering: 'SDK Platform', analytics: 'Field Insights' },
    eligibleUsers: 9500,
    roiCosts: { developmentCost: 120000, infrastructureCost: 14000, supportCost: 15000, maintenanceCost: 12000 },
  },
  {
    serviceId: 14,
    featureId: 'ORGANIC_FARMING_INFO',
    featureName: 'Organic Farming Info',
    serviceName: 'Organic Farming Info',
    policyId: BUSINESS_POLICIES.POL_FARMING_GUIDANCE,
    owners: { product: 'Advisory Services', engineering: 'SDK Platform', analytics: 'Field Insights' },
    eligibleUsers: 6000,
    roiCosts: { developmentCost: 75000, infrastructureCost: 9000, supportCost: 9000, maintenanceCost: 8000 },
  },
  {
    serviceId: 15,
    featureId: 'FPO_PRODUCTS',
    featureName: 'FPO Products',
    serviceName: 'FPO Products',
    policyId: BUSINESS_POLICIES.POL_COMMODITY_TRENDS,
    owners: { product: 'Market Services', engineering: 'SDK Platform', analytics: 'Field Insights' },
    eligibleUsers: 6500,
    roiCosts: { developmentCost: 90000, infrastructureCost: 15000, supportCost: 12000, maintenanceCost: 10000 },
  },
  {
    serviceId: 16,
    featureId: 'AI_PEST_IDENTIFICATION',
    featureName: 'AI Pest Identification',
    serviceName: 'AI Pest Identification',
    policyId: BUSINESS_POLICIES.POL_PEST_IDENTIFICATION,
    owners: { product: 'Advisory Services', engineering: 'SDK Platform', analytics: 'Field Insights' },
    eligibleUsers: 7000,
    roiCosts: { developmentCost: 150000, infrastructureCost: 22000, supportCost: 18000, maintenanceCost: 17000 },
  },
  {
    serviceId: 17,
    featureId: 'ATMA_TRAINING_REGISTRATION',
    featureName: 'ATMA Training Registration',
    serviceName: 'ATMA Training Registration',
    policyId: BUSINESS_POLICIES.POL_FARMING_GUIDANCE,
    owners: { product: 'Citizen Services', engineering: 'SDK Platform', analytics: 'Field Insights' },
    eligibleUsers: 5000,
    roiCosts: { developmentCost: 85000, infrastructureCost: 10000, supportCost: 11000, maintenanceCost: 9000 },
  },
  {
    serviceId: 18,
    featureId: 'UZHAVAN_E_MARKET',
    featureName: 'Uzhavan e-Market',
    serviceName: 'Uzhavan e-Market',
    policyId: BUSINESS_POLICIES.POL_MARKET_PRICING,
    owners: { product: 'Market Services', engineering: 'SDK Platform', analytics: 'Field Insights' },
    eligibleUsers: 8000,
    roiCosts: { developmentCost: 180000, infrastructureCost: 30000, supportCost: 22000, maintenanceCost: 20000 },
    isHero: true,
  },
];

export const HERO_SERVICE_DEFINITIONS = TRACKED_SERVICE_DEFINITIONS.filter(
  (definition) => definition.isHero
);

function createRandomId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateTelemetrySessionId(): string {
  if (typeof window === 'undefined') {
    return createRandomId('session');
  }

  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) {
    return existing;
  }

  const next = createRandomId('session');
  window.sessionStorage.setItem(SESSION_KEY, next);
  return next;
}

export function getOrCreateTelemetryAnonUserId(): string {
  if (typeof window === 'undefined') {
    return createRandomId('anon');
  }

  const existing = window.localStorage.getItem(ANON_USER_KEY);
  if (existing) {
    return existing;
  }

  const next = createRandomId('anon');
  window.localStorage.setItem(ANON_USER_KEY, next);
  return next;
}

export function ensureStandardPolicyEvents(policyId: BusinessPolicyId): void {
  if (patchedPolicyIds.has(policyId)) {
    return;
  }

  const client = new PolicyRegistryClient();
  const policy = client.getPolicy(policyId);
  if (!policy) {
    return;
  }

  const existing = new Set(policy.events.map((entry) => entry.eventId));
  const nextEvents = [...policy.events];

  STANDARD_SERVICE_EVENT_SCHEMAS.forEach((schema) => {
    if (!existing.has(schema.eventId)) {
      nextEvents.push(schema);
    }
  });

  if (nextEvents.length !== policy.events.length) {
    const nextPolicy: BusinessPolicy = {
      ...policy,
      events: nextEvents,
      approvedAt: policy.approvedAt || new Date().toISOString(),
    };
    client.registerPolicy(nextPolicy);
  }

  patchedPolicyIds.add(policyId);
}

export function createTelemetrySpec(
  definition: TrackedServiceDefinition
): FeatureTelemetrySpec {
  return {
    featureId: definition.featureId,
    featureName: definition.featureName,
    ownerProduct: definition.owners.product,
    ownerEngineering: definition.owners.engineering,
    ownerAnalytics: definition.owners.analytics,
    kpis: ['Adoption', 'Reliability', 'P95 Latency', 'Engagement', 'Measured ROI'],
    events: STANDARD_SERVICE_EVENT_SCHEMAS.map((schema) => ({
      eventId: schema.eventId,
      requiredFields: [...schema.requiredFields],
    })),
  };
}

export function getTrackedServiceByServiceId(
  serviceId: number
): TrackedServiceDefinition | undefined {
  return TRACKED_SERVICE_DEFINITIONS.find((definition) => definition.serviceId === serviceId);
}

export function getTrackedServiceByFeatureId(
  featureId: string
): TrackedServiceDefinition | undefined {
  return TRACKED_SERVICE_DEFINITIONS.find((definition) => definition.featureId === featureId);
}

export function getTrackedServiceByDatasetPath(
  datasetPath: string
): TrackedServiceDefinition | undefined {
  return TRACKED_SERVICE_DEFINITIONS.find((definition) =>
    (definition.datasetPaths || []).includes(datasetPath)
  );
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function percentile95(values: number[]): number {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function detectAverageHourlyValue(events: TelemetryEvent[]): number {
  const values = events
    .map((event) => event.payload.valuePerHour)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);

  if (!values.length) {
    return DEFAULT_TIME_VALUE_PER_HOUR;
  }

  return Number(
    (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)
  );
}

export function computeMeasuredKpi(
  events: TelemetryEvent[],
  featureId: string,
  serviceId: number
): ServiceMeasuredKpi {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const scoped = events.filter((event) => {
    if (event.serviceId !== serviceId || event.payload.featureId !== featureId) {
      return false;
    }

    const occurredAt = new Date(event.occurredAt).getTime();
    return Number.isFinite(occurredAt) && occurredAt >= sevenDaysAgo;
  });

  const sessions = new Set<string>();
  const latencies: number[] = [];
  const hourlyValue = detectAverageHourlyValue(scoped);

  let succeeded = 0;
  let failed = 0;
  let actionsCompleted = 0;
  let timeSavedMinutes = 0;
  let measuredBenefit = 0;

  scoped.forEach((event) => {
    const sessionId = event.payload.sessionId;
    if (sessionId) {
      sessions.add(String(sessionId));
    }

    if (event.eventId === 'service_data_load_succeeded') {
      succeeded += 1;
      latencies.push(asNumber(event.payload.latencyMs));
    }

    if (event.eventId === 'service_data_load_failed') {
      failed += 1;
    }

    if (event.eventId === 'service_action_completed') {
      actionsCompleted += 1;
    }

    const explicitMinutes = asNumber(event.payload.timeSavedMinutes);
    const hoursToMinutes = asNumber(event.payload.timeSavedHours) * 60;
    const explicitTimeValue = asNumber(event.payload.timeSavedValue);
    const computedTimeValue = ((explicitMinutes + hoursToMinutes) / 60) * hourlyValue;

    timeSavedMinutes += explicitMinutes + hoursToMinutes;
    measuredBenefit +=
      asNumber(event.payload.incrementalRevenue) +
      asNumber(event.payload.revenueGained) +
      asNumber(event.payload.costSaved) +
      asNumber(event.payload.costSavings) +
      asNumber(event.payload.productivityValue) +
      asNumber(event.payload.qualitativeBenefitValue) +
      explicitTimeValue +
      computedTimeValue;
  });

  const requests = succeeded + failed;
  const successRatePercent = requests > 0 ? (succeeded / requests) * 100 : 0;

  return {
    featureId,
    serviceId,
    uniqueSessions7d: sessions.size,
    actionsCompleted7d: actionsCompleted,
    successRatePercent: Number(successRatePercent.toFixed(2)),
    p95LatencyMs: Number(percentile95(latencies).toFixed(2)),
    totalTimeSavedMinutes7d: Number(timeSavedMinutes.toFixed(2)),
    totalMeasuredBenefit7d: Number(measuredBenefit.toFixed(2)),
    observedEvents7d: scoped.length,
  };
}

export function countObservedStandardEvents(
  events: TelemetryEvent[],
  featureId: string,
  serviceId: number
): Record<string, number> {
  return STANDARD_SERVICE_EVENT_SCHEMAS.reduce<Record<string, number>>((accumulator, schema) => {
    accumulator[schema.eventId] = events.filter(
      (event) =>
        event.serviceId === serviceId &&
        event.payload.featureId === featureId &&
        event.eventId === schema.eventId
    ).length;
    return accumulator;
  }, {});
}

export function formatAssumptionLabel(events: TelemetryEvent[]): string {
  return `INR ${detectAverageHourlyValue(events).toFixed(0)}/hour`; 
}