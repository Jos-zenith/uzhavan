/**
 * SDK Policy Layer
 *
 * Enforces the core MRD requirement:
 * "Developers cannot track events without linking to a pre-defined Business Policy"
 *
 * All telemetry events MUST reference a pre-registered business policy.
 * Policies define:
 * - Which events are allowed
 * - Required fields for each event
 * - Usage velocity constraints
 * - Approval requirements
 */

import { readJson, writeJson } from './storage';
import type { Primitive } from './types';

export const BUSINESS_POLICIES = {
  // Subsidy & Benefit Registration
  POL_SUBSIDY_VELOCITY: 'POL_SUBSIDY_VELOCITY',
  POL_BENEFIT_REGISTRATION: 'POL_BENEFIT_REGISTRATION',
  
  // Pest & Disease Alerts
  POL_PEST_ALERT_CONVERSION: 'POL_PEST_ALERT_CONVERSION',
  POL_PEST_IDENTIFICATION: 'POL_PEST_IDENTIFICATION',

  // Weather & Advisory
  POL_WEATHER_ADVISORY: 'POL_WEATHER_ADVISORY',
  POL_FARMING_GUIDANCE: 'POL_FARMING_GUIDANCE',

  // Market Intelligence
  POL_MARKET_PRICING: 'POL_MARKET_PRICING',
  POL_COMMODITY_TRENDS: 'POL_COMMODITY_TRENDS',

  // Machinery & Operations
  POL_MACHINERY_HIRING: 'POL_MACHINERY_HIRING',
  POL_REPAIR_REQUESTS: 'POL_REPAIR_REQUESTS',

  // Seeds & Inputs
  POL_SEED_STOCK: 'POL_SEED_STOCK',
  POL_FERTILIZER_SUPPLY: 'POL_FERTILIZER_SUPPLY',

  // Reservoir & Water
  POL_RESERVOIR_LEVELS: 'POL_RESERVOIR_LEVELS',
  POL_WATER_ADVISORY: 'POL_WATER_ADVISORY',

  // MSME & Charter
  POL_MSME_CHARTER: 'POL_MSME_CHARTER',
  POL_AGRICULTURAL_NEWS: 'POL_AGRICULTURAL_NEWS',
} as const;

export type BusinessPolicyId = typeof BUSINESS_POLICIES[keyof typeof BUSINESS_POLICIES];

/**
 * Schema for allowed event payload fields
 * Defines required and optional fields per policy–event combination
 */
export interface PolicyEventSchema {
  eventId: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  maxFrequencyPerHour?: number; // null = unlimited
}

/**
 * A Business Policy groups related events and enforces constraints
 */
export interface BusinessPolicy {
  policyId: BusinessPolicyId;
  name: string;
  purpose: string;
  owner: string; // Team/person responsible
  approvedAt: string;
  events: PolicyEventSchema[];
  velocityLimitPerHour?: number; // Overall policy velocity limit
}

/**
 * Internal registry type
 */
type PolicyRegistry = Record<BusinessPolicyId | string, BusinessPolicy>;

const DEFAULT_POLICIES_STORAGE_KEY = 'tn.agri.sdk.business.policies.v1';

/**
 * PolicyRegistry: Manages business policy definitions and enforcement
 */
export class PolicyRegistryClient {
  constructor(
    private readonly storageKey: string = DEFAULT_POLICIES_STORAGE_KEY,
    private initialized = false
  ) {}

  /**
   * Initialize default policies on first load
   */
  private ensureDefaults(): void {
    if (this.initialized) return;

    const existing = readJson<PolicyRegistry>(this.storageKey, {});
    let hasNewPolicies = false;

    const defaults = this.getDefaultPolicies();
    Object.entries(defaults).forEach(([key, policy]) => {
      if (!existing[key as BusinessPolicyId]) {
        existing[key as BusinessPolicyId] = policy;
        hasNewPolicies = true;
      }
    });

    if (hasNewPolicies) {
      writeJson(this.storageKey, existing);
    }
    this.initialized = true;
  }

  /**
   * Define default policies for Tamil Nadu agriculture
   */
  private getDefaultPolicies(): PolicyRegistry {
    const now = new Date().toISOString();
    return {
      [BUSINESS_POLICIES.POL_SUBSIDY_VELOCITY]: {
        policyId: BUSINESS_POLICIES.POL_SUBSIDY_VELOCITY,
        name: 'Subsidy Velocity Policy',
        purpose: 'Track subsidy disbursement events across all schemes',
        owner: 'Finance Team',
        approvedAt: now,
        velocityLimitPerHour: 1000,
        events: [
          {
            eventId: 'SUBSIDY_APPLICATION_INITIATED',
            description: 'Farmer initiates subsidy application',
            requiredFields: ['farmerId', 'schemeId', 'farmerName', 'phoneNumber'],
            optionalFields: ['landArea', 'cropsGrown', 'previousSubsidies'],
            maxFrequencyPerHour: 100,
          },
          {
            eventId: 'SUBSIDY_ELIGIBILITY_CHECKED',
            description: 'Eligibility criteria validated',
            requiredFields: ['farmerId', 'schemeId', 'eligibilityStatus'],
            optionalFields: ['reasonIfRejected', 'requiredDocuments'],
            maxFrequencyPerHour: 200,
          },
          {
            eventId: 'SUBSIDY_APPROVED',
            description: 'Application approved for disbursement',
            requiredFields: ['farmerId', 'schemeId', 'approvalAmount', 'approverName'],
            optionalFields: ['approvalNotes', 'disbursementDate'],
          },
          {
            eventId: 'SUBSIDY_DISBURSED',
            description: 'Funds transferred to farmer account',
            requiredFields: ['farmerId', 'schemeId', 'disburseAmount', 'transactionId'],
            optionalFields: ['bankName', 'accountNumber'],
          },
        ],
      },

      [BUSINESS_POLICIES.POL_BENEFIT_REGISTRATION]: {
        policyId: BUSINESS_POLICIES.POL_BENEFIT_REGISTRATION,
        name: 'Benefit Registration Policy',
        purpose: 'Track farmer benefit scheme registrations',
        owner: 'Benefit Administration',
        approvedAt: now,
        velocityLimitPerHour: 500,
        events: [
          {
            eventId: 'REGISTRATION_FORM_VIEWED',
            description: 'Farmer opened registration form',
            requiredFields: ['farmerId', 'schemeId'],
            optionalFields: [],
          },
          {
            eventId: 'REGISTRATION_SUBMITTED',
            description: 'Farmer submitted registration',
            requiredFields: ['farmerId', 'schemeId', 'aadhaarNumber', 'bankAccountNumber'],
            optionalFields: ['landArea', 'cropType', 'bankIfsc'],
          },
          {
            eventId: 'REGISTRATION_APPROVED',
            description: 'Admin approved registration',
            requiredFields: ['registrationId', 'approverName'],
            optionalFields: ['approvalNotes'],
          },
        ],
      },

      [BUSINESS_POLICIES.POL_PEST_ALERT_CONVERSION]: {
        policyId: BUSINESS_POLICIES.POL_PEST_ALERT_CONVERSION,
        name: 'Pest Alert Conversion Policy',
        purpose: 'Track pest alert effectiveness and farmer actions',
        owner: 'Pest Management',
        approvedAt: now,
        velocityLimitPerHour: 2000,
        events: [
          {
            eventId: 'PEST_ALERT_RECEIVED',
            description: 'Farmer received pest alert',
            requiredFields: ['farmerId', 'pestType', 'severity', 'district'],
            optionalFields: ['crop', 'alertId'],
          },
          {
            eventId: 'PEST_IDENTIFIED',
            description: 'Pest identified via camera/manual input',
            requiredFields: ['identificationId', 'pestType', 'confidence'],
            optionalFields: ['imageUrl', 'location'],
            maxFrequencyPerHour: 500,
          },
          {
            eventId: 'REMEDY_APPLIED',
            description: 'Farmer applied recommended remedy',
            requiredFields: ['pestId', 'remedyType', 'farmerId'],
            optionalFields: ['remedyName', 'quantity', 'cost'],
          },
        ],
      },

      [BUSINESS_POLICIES.POL_PEST_IDENTIFICATION]: {
        policyId: BUSINESS_POLICIES.POL_PEST_IDENTIFICATION,
        name: 'Pest Identification Policy',
        purpose: 'Track pest identification requests and ML model performance',
        owner: 'Pest Science',
        approvedAt: now,
        velocityLimitPerHour: 5000,
        events: [
          {
            eventId: 'IDENTIFICATION_REQUESTED',
            description: 'Farmer requested pest identification',
            requiredFields: ['requestId', 'farmerId'],
            optionalFields: ['imageUrl', 'cropType'],
            maxFrequencyPerHour: 1000,
          },
          {
            eventId: 'ML_MODEL_INFERENCE',
            description: 'ML model processed identification request',
            requiredFields: ['requestId', 'modelVersion', 'pestDetected', 'confidence'],
            optionalFields: ['inferenceTimeMs', 'topN'],
          },
          {
            eventId: 'IDENTIFICATION_CONFIRMED',
            description: 'Human expert confirmed AI identification',
            requiredFields: ['requestId', 'expertId', 'pestsConfirmed'],
            optionalFields: ['notes', 'falsePositives'],
          },
        ],
      },

      [BUSINESS_POLICIES.POL_WEATHER_ADVISORY]: {
        policyId: BUSINESS_POLICIES.POL_WEATHER_ADVISORY,
        name: 'Weather Advisory Policy',
        purpose: 'Track weather advisory delivery and farmer engagement',
        owner: 'Meteorology',
        approvedAt: now,
        velocityLimitPerHour: 3000,
        events: [
          {
            eventId: 'WEATHER_FORECAST_FETCHED',
            description: 'Weather forecast retrieved for district',
            requiredFields: ['district', 'forecastDays'],
            optionalFields: ['source', 'accuracy'],
          },
          {
            eventId: 'ADVISORY_GENERATED',
            description: 'Farming advisory generated from weather data',
            requiredFields: ['advisoryId', 'district', 'cropType'],
            optionalFields: ['riskLevel', 'recommendedActions'],
          },
          {
            eventId: 'ADVISORY_VIEWED',
            description: 'Farmer viewed advisory',
            requiredFields: ['advisoryId', 'farmerId'],
            optionalFields: ['timeSpentSeconds'],
          },
        ],
      },

      [BUSINESS_POLICIES.POL_MARKET_PRICING]: {
        policyId: BUSINESS_POLICIES.POL_MARKET_PRICING,
        name: 'Market Pricing Policy',
        purpose: 'Track market price queries and commodity trends',
        owner: 'Market Intelligence',
        approvedAt: now,
        velocityLimitPerHour: 2000,
        events: [
          {
            eventId: 'PRICE_QUERY',
            description: 'Farmer queried commodity price',
            requiredFields: ['commodity', 'district', 'queryCount'],
            optionalFields: ['expectedPrice', 'timeToSell'],
            maxFrequencyPerHour: 500,
          },
          {
            eventId: 'PRICE_COMPARISON',
            description: 'Farmer compared prices across markets',
            requiredFields: ['commodity', 'marketsCompared'],
            optionalFields: ['selectedMarket'],
          },
        ],
      },

      [BUSINESS_POLICIES.POL_MACHINERY_HIRING]: {
        policyId: BUSINESS_POLICIES.POL_MACHINERY_HIRING,
        name: 'Machinery Hiring Policy',
        purpose: 'Track machinery rental bookings and usage',
        owner: 'Operations',
        approvedAt: now,
        velocityLimitPerHour: 500,
        events: [
          {
            eventId: 'MACHINERY_BROWSED',
            description: 'Farmer browsed available machinery',
            requiredFields: ['farmerId', 'machineryType'],
            optionalFields: [],
          },
          {
            eventId: 'BOOKING_INITIATED',
            description: 'Farmer initiated machinery booking',
            requiredFields: ['farmerId', 'machineryId', 'rentalDate'],
            optionalFields: ['duration', 'hiringCentre'],
          },
          {
            eventId: 'BOOKING_CONFIRMED',
            description: 'Machinery booking confirmed',
            requiredFields: ['bookingId', 'totalCost'],
            optionalFields: ['paymentStatus'],
          },
        ],
      },

      [BUSINESS_POLICIES.POL_SEED_STOCK]: {
        policyId: BUSINESS_POLICIES.POL_SEED_STOCK,
        name: 'Seed Stock Policy',
        purpose: 'Track seed availability and farmer requests',
        owner: 'Supply Chain',
        approvedAt: now,
        velocityLimitPerHour: 500,
        events: [
          {
            eventId: 'SEED_STOCK_QUERIED',
            description: 'Farmer queried seed availability',
            requiredFields: ['seedVariety', 'district'],
            optionalFields: ['quantity'],
          },
          {
            eventId: 'SEED_ORDER_PLACED',
            description: 'Farmer placed seed order',
            requiredFields: ['orderId', 'seedVariety', 'quantity'],
            optionalFields: ['requestedDeliveryDate'],
          },
        ],
      },

      [BUSINESS_POLICIES.POL_FERTILIZER_SUPPLY]: {
        policyId: BUSINESS_POLICIES.POL_FERTILIZER_SUPPLY,
        name: 'Fertilizer Supply Policy',
        purpose: 'Track fertilizer stock and distribution',
        owner: 'Agriculture Inputs',
        approvedAt: now,
        velocityLimitPerHour: 500,
        events: [
          {
            eventId: 'FERTILIZER_STOCK_VIEWED',
            description: 'Farmer checked fertilizer stock',
            requiredFields: ['district'],
            optionalFields: ['fertilizerType'],
          },
          {
            eventId: 'FERTILIZER_RESERVED',
            description: 'Fertilizer reserved for farmer',
            requiredFields: ['reservationId', 'quantity', 'type'],
            optionalFields: ['pickupDate'],
          },
        ],
      },

      [BUSINESS_POLICIES.POL_RESERVOIR_LEVELS]: {
        policyId: BUSINESS_POLICIES.POL_RESERVOIR_LEVELS,
        name: 'Reservoir Levels Policy',
        purpose: 'Track water availability and farmer notifications',
        owner: 'Water Management',
        approvedAt: now,
        velocityLimitPerHour: 1000,
        events: [
          {
            eventId: 'RESERVOIR_STATUS_CHECKED',
            description: 'Farmer checked reservoir water level',
            requiredFields: ['reservoirId', 'district'],
            optionalFields: [],
            maxFrequencyPerHour: 200,
          },
          {
            eventId: 'WATER_ALERT_TRIGGERED',
            description: 'Low water alert issued',
            requiredFields: ['reservoirId', 'currentLevel', 'threshold'],
            optionalFields: ['affectedFarmers'],
          },
        ],
      },

      [BUSINESS_POLICIES.POL_MSME_CHARTER]: {
        policyId: BUSINESS_POLICIES.POL_MSME_CHARTER,
        name: 'MSME Charter Policy',
        purpose: 'Track MSME registrations and certifications',
        owner: 'MSME Development',
        approvedAt: now,
        velocityLimitPerHour: 300,
        events: [
          {
            eventId: 'MSME_REGISTRATION_VIEWED',
            description: 'Farmer viewed MSME registration process',
            requiredFields: [],
            optionalFields: [],
          },
          {
            eventId: 'MSME_CERTIFICATE_REQUESTED',
            description: 'Farmer requested MSME certificate',
            requiredFields: ['certificateType', 'businessDetails'],
            optionalFields: [],
          },
        ],
      },

      [BUSINESS_POLICIES.POL_FARMING_GUIDANCE]: {
        policyId: BUSINESS_POLICIES.POL_FARMING_GUIDANCE,
        name: 'Farming Guidance Policy',
        purpose: 'Track advisory, guidance articles, and farmer learning',
        owner: 'Extension',
        approvedAt: now,
        velocityLimitPerHour: 5000,
        events: [
          {
            eventId: 'GUIDANCE_ARTICLE_VIEWED',
            description: 'Farmer viewed farming guidance article',
            requiredFields: ['articleId', 'topicId'],
            optionalFields: ['readTimeSeconds', 'userRating'],
            maxFrequencyPerHour: 1000,
          },
          {
            eventId: 'GUIDANCE_SHARED',
            description: 'Farmer shared guidance with others',
            requiredFields: ['articleId', 'shareMethod'],
            optionalFields: [],
          },
        ],
      },

      [BUSINESS_POLICIES.POL_AGRICULTURAL_NEWS]: {
        policyId: BUSINESS_POLICIES.POL_AGRICULTURAL_NEWS,
        name: 'Agricultural News Policy',
        purpose: 'Track news consumption and relevance',
        owner: 'Content',
        approvedAt: now,
        velocityLimitPerHour: 5000,
        events: [
          {
            eventId: 'NEWS_ARTICLE_VIEWED',
            description: 'Farmer viewed agricultural news',
            requiredFields: ['articleId', 'category'],
            optionalFields: ['readTimeSeconds'],
            maxFrequencyPerHour: 1000,
          },
          {
            eventId: 'NEWS_SAVED',
            description: 'Farmer saved news article',
            requiredFields: ['articleId'],
            optionalFields: [],
          },
        ],
      },

      [BUSINESS_POLICIES.POL_COMMODITY_TRENDS]: {
        policyId: BUSINESS_POLICIES.POL_COMMODITY_TRENDS,
        name: 'Commodity Trends Policy',
        purpose: 'Track commodity trend analysis and farmer interest',
        owner: 'Data Analytics',
        approvedAt: now,
        velocityLimitPerHour: 2000,
        events: [
          {
            eventId: 'TREND_ANALYSIS_VIEWED',
            description: 'Farmer viewed commodity trend analysis',
            requiredFields: ['commodityId', 'timeframe'],
            optionalFields: [],
          },
          {
            eventId: 'PRICE_ALERT_SET',
            description: 'Farmer set commodity price alert',
            requiredFields: ['commodityId', 'targetPrice'],
            optionalFields: ['alertFrequency'],
          },
        ],
      },

      [BUSINESS_POLICIES.POL_REPAIR_REQUESTS]: {
        policyId: BUSINESS_POLICIES.POL_REPAIR_REQUESTS,
        name: 'Repair Requests Policy',
        purpose: 'Track machinery repair requests and service completion',
        owner: 'Service Management',
        approvedAt: now,
        velocityLimitPerHour: 300,
        events: [
          {
            eventId: 'REPAIR_REQUEST_SUBMITTED',
            description: 'Farmer submitted machinery repair request',
            requiredFields: ['requestId', 'machineryType', 'problemDescription'],
            optionalFields: ['urgency'],
          },
          {
            eventId: 'REPAIR_ASSIGNED',
            description: 'Repair assigned to mechanic',
            requiredFields: ['requestId', 'mechanicId'],
            optionalFields: ['estimatedCost'],
          },
          {
            eventId: 'REPAIR_COMPLETED',
            description: 'Repair work completed',
            requiredFields: ['requestId', 'actualCost'],
            optionalFields: ['feedbackScore'],
          },
        ],
      },

      [BUSINESS_POLICIES.POL_WATER_ADVISORY]: {
        policyId: BUSINESS_POLICIES.POL_WATER_ADVISORY,
        name: 'Water Advisory Policy',
        purpose: 'Track irrigation advisories and water management',
        owner: 'Hydrology',
        approvedAt: now,
        velocityLimitPerHour: 1500,
        events: [
          {
            eventId: 'IRRIGATION_ADVISORY_DELIVERED',
            description: 'Water management advisory delivered to farmer',
            requiredFields: ['advisoryId', 'farmerId', 'cropType'],
            optionalFields: ['waterQuantity', 'applicationMethod'],
          },
        ],
      },
    };
  }

  /**
   * Register or override a policy
   */
  registerPolicy(policy: BusinessPolicy): void {
    const store = readJson<PolicyRegistry>(this.storageKey, {});
    store[policy.policyId] = {
      ...policy,
      approvedAt: policy.approvedAt || new Date().toISOString(),
    };
    writeJson(this.storageKey, store);
    this.initialized = false; // Re-init to ensure consistency
  }

  /**
   * Get a single policy
   */
  getPolicy(policyId: BusinessPolicyId): BusinessPolicy | null {
    this.ensureDefaults();
    const store = readJson<PolicyRegistry>(this.storageKey, {});
    return store[policyId] ?? null;
  }

  /**
   * List all registered policies
   */
  listPolicies(): BusinessPolicy[] {
    this.ensureDefaults();
    const store = readJson<PolicyRegistry>(this.storageKey, {});
    return Object.values(store);
  }

  /**
   * Validate that an eventId belongs to a policy and check payload schema
   *
   * @returns { valid: true } if valid
   * @returns { valid: false, errors: [...] } if invalid
   */
  validateEvent(policyId: BusinessPolicyId, eventId: string, payload: Record<string, Primitive>): {
    valid: boolean;
    errors: string[];
  } {
    const policy = this.getPolicy(policyId);
    if (!policy) {
      return {
        valid: false,
        errors: [`Policy ${policyId} is not registered`],
      };
    }

    const event = policy.events.find((e) => e.eventId === eventId);
    if (!event) {
      return {
        valid: false,
        errors: [`Event ${eventId} is not defined in policy ${policyId}`],
      };
    }

    const errors: string[] = [];

    // Check required fields
    for (const required of event.requiredFields) {
      if (!payload.hasOwnProperty(required)) {
        errors.push(`Event ${eventId} requires field '${required}' but it was not provided`);
      }
    }

    // Check for unknown fields (optional warning)
    const allowed = new Set([...event.requiredFields, ...event.optionalFields]);
    for (const key of Object.keys(payload)) {
      if (!allowed.has(key)) {
        // Log as warning but don't fail validation
        console.warn(`Event ${eventId} has unexpected field '${key}' not in schema`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
