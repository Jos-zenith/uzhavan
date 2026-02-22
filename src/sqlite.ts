import * as SQLite from 'expo-sqlite';
import {
  markSynced,
  markSyncing,
  queueLocalChange,
  type ConnectivityState,
  getConnectivityState,
} from './connectivity';
import {
  decryptJson,
  encryptJson,
  getOrCreateEncryptionSecret,
  sha256Hex,
} from './security';

const DATABASE_NAME = 'farm_offline.db';

export type VitalService = {
  id: number;
  name: string;
  purpose: string;
  dataRequired: string;
  localCache: string;
  offlineCapability: string;
  usageImpact: string;
  dependencies: string;
};

export type DraftRecord = {
  id: number;
  serviceId: number;
  draftKey: string;
  encryptedPayload: string;
  updatedAt: string;
  syncState: 'queued' | 'syncing' | 'synced';
};

export type ResumePrompt = {
  hasDraft: boolean;
  draftKey: string;
  updatedAt?: string;
};

export type SyncQueueStatus = 'queued' | 'syncing' | 'synced' | 'failed';

export type SubsidyApplicationInput = {
  farmerId: string;
  schemeId: string;
  year: number;
  payload: Record<string, string>;
};

export type RosterSyncResult = {
  processed: number;
  failed: number;
};

type ServiceCacheSeed = {
  serviceId: number;
  payload: unknown;
};

const VITAL_SERVICES: VitalService[] = [
  {
    id: 1,
    name: 'Subsidy Schemes Info',
    purpose: 'View details on Government and Sister Department subsidy schemes.',
    dataRequired: 'District, Block, and Scheme category search parameters.',
    localCache:
      'Full database of current schemes, subsidy percentages, and eligibility rules.',
    offlineCapability: 'Entirely Offline (Information only).',
    usageImpact: 'Part of the 70% search time reduction.',
    dependencies: 'None.',
  },
  {
    id: 2,
    name: 'Benefit Registration',
    purpose:
      'Advance registration for high-value agricultural inputs (e.g., tractors, equipment).',
    dataRequired:
      'Farmer Name, Aadhaar, Land documents (Chitta, Adangal), Bank information.',
    localCache: 'Digital application forms and District/Block ID mappings.',
    offlineCapability:
      'Offline Draft; requires server connection for Seniority Number assignment.',
    usageImpact: 'High; 70% of users utilize this service most frequently.',
    dependencies: 'Farmer Profile, Land Registration.',
  },
  {
    id: 3,
    name: 'Crop Insurance',
    purpose: 'View premium rates and track crop insurance policy status.',
    dataRequired: 'Land survey number or registered phone number.',
    localCache: 'Village-level notified crop list and premium rate tables.',
    offlineCapability:
      'Offline Information viewing; Status tracking requires server connection.',
    usageImpact: 'Significant (Seasonal use, especially pre-sowing).',
    dependencies: 'Land Survey details.',
  },
  {
    id: 4,
    name: 'Fertilizer Stock',
    purpose: 'Real-time Government and Private outlet fertilizer stock checking.',
    dataRequired: 'Location/Outlet selection.',
    localCache: 'Recent stock snapshots (updated on last sync).',
    offlineCapability:
      'Snapshot Offline; Real-time stock requires server connection.',
    usageImpact: 'Frequent usage (Every 2 days on average).',
    dependencies: 'Location access permission.',
  },
  {
    id: 5,
    name: 'Seed Stock',
    purpose:
      'Real-time seed availability across 880 Government and 8,400 private seed centres.',
    dataRequired: 'Location and Crop variety selection.',
    localCache: 'Seed variety lists and outlet location database.',
    offlineCapability:
      'Snapshot Offline; Real-time availability requires server connection.',
    usageImpact: 'High (Peak usage during sowing season).',
    dependencies: 'Location access permission.',
  },
  {
    id: 6,
    name: 'Machinery Hiring',
    purpose: 'Renting farm equipment from government and private hiring centres.',
    dataRequired: 'Machinery type, Rental date, Contact details.',
    localCache: 'Hiring centre location directory and contact numbers.',
    offlineCapability:
      'Browse catalogue offline; Booking confirmation requires server connection.',
    usageImpact: 'Generated 1,900+ hours of machinery usage.',
    dependencies: 'User contact information.',
  },
  {
    id: 7,
    name: 'Daily Market Price',
    purpose:
      'Price updates for 277 regulated agricultural markets across Tamil Nadu.',
    dataRequired: 'Commodity and Market selection.',
    localCache: "Last 7-day price trends and current day's synced rates.",
    offlineCapability:
      'Snapshot Offline; Daily updates require server synchronization.',
    usageImpact: 'Used by 33% of farmers daily for selling decisions.',
    dependencies: 'None.',
  },
  {
    id: 8,
    name: 'Daily Weather Forecast',
    purpose:
      'Cultivation planning based on IMD (India Meteorological Department) advisories.',
    dataRequired: 'Farmer location.',
    localCache: 'Regional advisory bulletins and historical weather patterns.',
    offlineCapability:
      'Offline Advisory viewing; Live forecast requires server connection.',
    usageImpact: 'Critical for sowing and irrigation planning.',
    dependencies: 'Location access permission.',
  },
  {
    id: 9,
    name: 'Officer Contact Info',
    purpose:
      'Access contact details and visit schedules of local agricultural officers.',
    dataRequired: 'Village selection.',
    localCache:
      'Full District/Block officer database and scheduled visit dates.',
    offlineCapability: 'Entirely Offline (if previously synced).',
    usageImpact: 'Occasional usage but builds high farmer trust.',
    dependencies: 'Village location data.',
  },
  {
    id: 10,
    name: 'Reservoir Levels',
    purpose:
      'Track water levels in 19 major dams across Tamil Nadu and Karnataka.',
    dataRequired: 'Dam selection.',
    localCache: 'Weekly water level history and reservoir capacity data.',
    offlineCapability:
      'Snapshot Offline; Daily level updates require server synchronization.',
    usageImpact: 'Critical for Delta region irrigation planning.',
    dependencies: 'None.',
  },
  {
    id: 11,
    name: 'Agriculture News',
    purpose:
      'Department updates, technology bulletins, and agricultural advisories.',
    dataRequired: 'None (passive consumption).',
    localCache: 'Pre-synced news articles and PDF bulletins.',
    offlineCapability: 'Entirely Offline (if previously synced).',
    usageImpact: 'Higher engagement among literate farmer segments.',
    dependencies: 'None.',
  },
  {
    id: 12,
    name: 'User Feedback',
    purpose:
      'Report system issues or provide service improvement suggestions.',
    dataRequired: 'Text description and optional rating.',
    localCache: 'Feedback form templates.',
    offlineCapability:
      'Offline Draft; Submission requires server connection for processing.',
    usageImpact: 'Low utilization but critical for system improvement.',
    dependencies: 'User Profile.',
  },
  {
    id: 13,
    name: 'My Farm Guide',
    purpose:
      'Comprehensive sowing-to-harvest cultivation advice for various crops.',
    dataRequired: 'Crop type and Sowing date.',
    localCache:
      'Complete cultivation database (fertilizer schedules, irrigation timing, pest management).',
    offlineCapability: 'Entirely Offline.',
    usageImpact: 'Directly influences 10-15% yield increase when followed.',
    dependencies: 'Crop type selection.',
  },
  {
    id: 14,
    name: 'Organic Farming Info',
    purpose:
      'Contact information for organic produce traders and certification agencies.',
    dataRequired: 'Category selection (trader/certifier).',
    localCache: 'Organic farmer/trader directory and contact list.',
    offlineCapability: 'Entirely Offline (if previously synced).',
    usageImpact: 'High value for organic farming niche segment.',
    dependencies: 'None.',
  },
  {
    id: 15,
    name: 'FPO Products',
    purpose: 'View and purchase products from Farmer Producer Organizations.',
    dataRequired: 'None (Catalog browsing).',
    localCache: 'Product catalog, pricing information, and FPO locations.',
    offlineCapability:
      'Browse Offline; Purchase transaction requires server connection.',
    usageImpact: 'Growing engagement as FPO network expands.',
    dependencies: 'Location access for nearby FPO discovery.',
  },
  {
    id: 16,
    name: 'AI Pest Identification',
    purpose:
      'Automated pest/disease identification with remedial measures using image recognition.',
    dataRequired: 'Photos of infected crop leaves/stems.',
    localCache: 'Local symptom database and basic remediation guide.',
    offlineCapability:
      'Basic remedy suggestions offline; Advanced AI analysis requires server connection.',
    usageImpact: 'Critical during pest outbreak seasons.',
    dependencies: 'Camera access permission.',
  },
  {
    id: 17,
    name: 'ATMA Training Registration',
    purpose:
      'Register for Agricultural Technology Management Agency demonstrations and training sessions.',
    dataRequired: 'Personal details and Land information.',
    localCache: 'Training calendar and venue locations.',
    offlineCapability:
      'Offline Draft; Server validation required for seat confirmation.',
    usageImpact:
      'High network failure rate historically; offline capability critical.',
    dependencies: 'Farmer Profile.',
  },
  {
    id: 18,
    name: 'Uzhavan e-Market',
    purpose: 'Buyer-seller digital marketplace platform for agricultural produce.',
    dataRequired: 'Produce details, Expected price, Contact information.',
    localCache: 'Buyer directory and listing form templates.',
    offlineCapability:
      'Draft listing offline; Posting and buyer matching require server connection.',
    usageImpact: '25% of users request enhanced marketplace features.',
    dependencies: 'Seller Registration and verification.',
  },
];

const SERVICE_CACHE_SEEDS: ServiceCacheSeed[] = [
  {
    serviceId: 1,
    payload: {
      categories: ['Crop', 'Equipment', 'Irrigation'],
      eligibilityRules: 'Farmer category and landholding based',
      subsidyPercentRanges: '25%-75%',
    },
  },
  {
    serviceId: 2,
    payload: {
      districtBlockMappings: true,
      requiredFields: ['Farmer Name', 'Aadhaar', 'Chitta', 'Adangal', 'Bank'],
    },
  },
  {
    serviceId: 3,
    payload: {
      notifiedCrops: ['Paddy', 'Millet', 'Sugarcane'],
      premiumRateTableVersion: 'local-v1',
    },
  },
  {
    serviceId: 4,
    payload: {
      stockSnapshotUpdatedOn: 'last-sync',
      outlets: 'government/private',
    },
  },
  {
    serviceId: 5,
    payload: {
      govtCenters: 880,
      privateCenters: 8400,
      seedVarieties: ['Paddy ADT', 'Groundnut TMV'],
    },
  },
  {
    serviceId: 6,
    payload: {
      machineryTypes: ['Tractor', 'Power Tiller', 'Seeder'],
      centerContacts: 'cached',
    },
  },
  {
    serviceId: 7,
    payload: {
      regulatedMarkets: 277,
      trendDays: 7,
    },
  },
  {
    serviceId: 8,
    payload: {
      source: 'IMD',
      hasRegionalBulletins: true,
    },
  },
  {
    serviceId: 9,
    payload: {
      officerDirectory: 'district/block wise',
      includesVisitSchedules: true,
    },
  },
  {
    serviceId: 10,
    payload: {
      majorDams: 19,
      includesWeeklyHistory: true,
    },
  },
  {
    serviceId: 11,
    payload: {
      hasDepartmentNews: true,
      includesPdfBulletins: true,
    },
  },
  {
    serviceId: 12,
    payload: {
      feedbackTemplateVersion: 'v1',
      allowsRating: true,
    },
  },
  {
    serviceId: 13,
    payload: {
      journeyCoverage: 'sowing-to-harvest',
      includesPestIrrigationFertilizerSchedule: true,
    },
  },
  {
    serviceId: 14,
    payload: {
      contacts: ['traders', 'certifiers'],
      coverage: 'statewide',
    },
  },
  {
    serviceId: 15,
    payload: {
      catalogCached: true,
      hasFpoLocations: true,
    },
  },
  {
    serviceId: 16,
    payload: {
      symptomDatabase: 'basic',
      remediationGuide: 'offline-basic',
    },
  },
  {
    serviceId: 17,
    payload: {
      hasTrainingCalendar: true,
      hasVenueLocations: true,
    },
  },
  {
    serviceId: 18,
    payload: {
      buyerDirectory: 'cached',
      listingTemplates: true,
    },
  },
];

const SERVICE_SYNC_PRIORITY: Record<number, number> = {
  4: 100,
  7: 95,
  5: 85,
  8: 80,
};

const DEFAULT_SYNC_PRIORITY = 50;
const MAX_RETRY_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 30_000;

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }

  return databasePromise;
}

async function createSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS vital_services (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      purpose TEXT NOT NULL,
      data_required TEXT NOT NULL,
      local_cache TEXT NOT NULL,
      offline_capability TEXT NOT NULL,
      usage_impact TEXT NOT NULL,
      dependencies TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS service_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      cache_type TEXT NOT NULL,
      encrypted_payload TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (service_id) REFERENCES vital_services(id)
    );

    CREATE TABLE IF NOT EXISTS service_drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      draft_key TEXT NOT NULL,
      encrypted_payload TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_state TEXT NOT NULL,
      UNIQUE(service_id, draft_key),
      FOREIGN KEY (service_id) REFERENCES vital_services(id)
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      draft_key TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      queued_at TEXT NOT NULL,
      processed_at TEXT,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_queue_policy (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      draft_key TEXT,
      operation_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      priority INTEGER NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TEXT NOT NULL,
      queued_at TEXT NOT NULL,
      processed_at TEXT,
      status TEXT NOT NULL,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS local_event_store (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      entity_key TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      local_timestamp_ns TEXT NOT NULL,
      created_at TEXT NOT NULL,
      replay_status TEXT NOT NULL DEFAULT 'queued'
    );

    CREATE TABLE IF NOT EXISTS subsidy_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      policy_hash TEXT NOT NULL UNIQUE,
      farmer_id TEXT NOT NULL,
      scheme_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      encrypted_payload TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_state TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subsidy_rules_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      district TEXT,
      block TEXT,
      scheme_category TEXT,
      encrypted_payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS crop_lists_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      village TEXT,
      crop_name TEXT,
      encrypted_payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS weather_bulletins_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      region TEXT,
      bulletin_date TEXT,
      encrypted_payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS market_prices_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      market_name TEXT,
      commodity TEXT,
      updated_on TEXT,
      encrypted_payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reservoir_levels_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      dam_name TEXT,
      measured_on TEXT,
      encrypted_payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS officer_contacts_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      district TEXT,
      block TEXT,
      village TEXT,
      encrypted_payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

async function seedVitalServices(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('DELETE FROM vital_services;');

  for (const service of VITAL_SERVICES) {
    await db.runAsync(
      `INSERT INTO vital_services (
        id,
        name,
        purpose,
        data_required,
        local_cache,
        offline_capability,
        usage_impact,
        dependencies
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        service.id,
        service.name,
        service.purpose,
        service.dataRequired,
        service.localCache,
        service.offlineCapability,
        service.usageImpact,
        service.dependencies,
      ]
    );
  }
}

async function seedServiceCache(db: SQLite.SQLiteDatabase, secret: string): Promise<void> {
  await db.execAsync(
    `
      DELETE FROM service_cache;
      DELETE FROM subsidy_rules_cache;
      DELETE FROM crop_lists_cache;
      DELETE FROM weather_bulletins_cache;
      DELETE FROM market_prices_cache;
      DELETE FROM reservoir_levels_cache;
      DELETE FROM officer_contacts_cache;
    `
  );

  const now = new Date().toISOString();

  for (const seed of SERVICE_CACHE_SEEDS) {
    const encryptedPayload = await encryptJson(seed.payload, secret);

    await db.runAsync(
      `INSERT INTO service_cache (
        service_id,
        cache_type,
        encrypted_payload,
        updated_at
      ) VALUES (?, ?, ?, ?);`,
      [seed.serviceId, 'baseline', encryptedPayload, now]
    );

    if (seed.serviceId === 1) {
      await db.runAsync(
        `INSERT INTO subsidy_rules_cache (
          service_id,
          district,
          block,
          scheme_category,
          encrypted_payload,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?);`,
        [1, 'Default District', 'Default Block', 'General', encryptedPayload, now]
      );
    }

    if (seed.serviceId === 3) {
      await db.runAsync(
        `INSERT INTO crop_lists_cache (
          service_id,
          village,
          crop_name,
          encrypted_payload,
          updated_at
        ) VALUES (?, ?, ?, ?, ?);`,
        [3, 'Default Village', 'Paddy', encryptedPayload, now]
      );
    }

    if (seed.serviceId === 8) {
      await db.runAsync(
        `INSERT INTO weather_bulletins_cache (
          service_id,
          region,
          bulletin_date,
          encrypted_payload,
          updated_at
        ) VALUES (?, ?, ?, ?, ?);`,
        [8, 'Tamil Nadu', now.slice(0, 10), encryptedPayload, now]
      );
    }

    if (seed.serviceId === 7) {
      await db.runAsync(
        `INSERT INTO market_prices_cache (
          service_id,
          market_name,
          commodity,
          updated_on,
          encrypted_payload,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?);`,
        [7, 'Default Market', 'Paddy', now.slice(0, 10), encryptedPayload, now]
      );
    }

    if (seed.serviceId === 10) {
      await db.runAsync(
        `INSERT INTO reservoir_levels_cache (
          service_id,
          dam_name,
          measured_on,
          encrypted_payload,
          updated_at
        ) VALUES (?, ?, ?, ?, ?);`,
        [10, 'Default Dam', now.slice(0, 10), encryptedPayload, now]
      );
    }

    if (seed.serviceId === 9) {
      await db.runAsync(
        `INSERT INTO officer_contacts_cache (
          service_id,
          district,
          block,
          village,
          encrypted_payload,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?);`,
        [9, 'Default District', 'Default Block', 'Default Village', encryptedPayload, now]
      );
    }
  }
}

export async function initializeDatabase(): Promise<number> {
  const db = await getDatabase();
  const secret = getOrCreateEncryptionSecret();

  await createSchema(db);
  await seedVitalServices(db);
  await seedServiceCache(db, secret);

  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM vital_services;'
  );

  return row?.count ?? 0;
}

export async function getVitalServices(): Promise<VitalService[]> {
  const db = await getDatabase();

  return db.getAllAsync<VitalService>(
    `SELECT
      id,
      name,
      purpose,
      data_required as dataRequired,
      local_cache as localCache,
      offline_capability as offlineCapability,
      usage_impact as usageImpact,
      dependencies
    FROM vital_services
    ORDER BY id ASC;`
  );
}

function getServicePriority(serviceId: number): number {
  return SERVICE_SYNC_PRIORITY[serviceId] ?? DEFAULT_SYNC_PRIORITY;
}

function getHighPrecisionTimestampNs(): string {
  const epochMillis = Date.now().toString();
  const fractionalMicros = Math.floor((performance.now() % 1) * 1000000)
    .toString()
    .padStart(6, '0');
  return `${epochMillis}${fractionalMicros}`;
}

function getNextAttemptIso(retryCount: number): string {
  const delay = Math.min(
    BASE_RETRY_DELAY_MS * Math.pow(2, retryCount),
    15 * 60 * 1000
  );
  return new Date(Date.now() + delay).toISOString();
}

async function enqueuePolicySyncOperation(
  serviceId: number,
  draftKey: string | null,
  operationType: string,
  payload: string
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO sync_queue_policy (
      service_id,
      draft_key,
      operation_type,
      payload,
      priority,
      retry_count,
      next_attempt_at,
      queued_at,
      status
    ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, 'queued');`,
    [
      serviceId,
      draftKey,
      operationType,
      payload,
      getServicePriority(serviceId),
      now,
      now,
    ]
  );
}

async function recordSequentialEvent(
  serviceId: number,
  entityKey: string,
  operationType: string,
  payload: string
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO local_event_store (
      service_id,
      entity_key,
      operation_type,
      payload,
      local_timestamp_ns,
      created_at,
      replay_status
    ) VALUES (?, ?, ?, ?, ?, ?, 'queued');`,
    [
      serviceId,
      entityKey,
      operationType,
      payload,
      getHighPrecisionTimestampNs(),
      now,
    ]
  );
}

async function executeRemoteSync(payload: string): Promise<void> {
  const parsed = JSON.parse(payload) as { forceFailure?: boolean };
  if (parsed.forceFailure) {
    throw new Error('Forced sync failure for retry testing');
  }
}

export async function saveDraftFieldAtomic(
  serviceId: number,
  draftKey: string,
  fieldName: string,
  fieldValue: string
): Promise<void> {
  const db = await getDatabase();
  const secret = getOrCreateEncryptionSecret();
  const updatedAt = new Date().toISOString();

  const existingRow = await db.getFirstAsync<{ encrypted_payload: string }>(
    'SELECT encrypted_payload FROM service_drafts WHERE service_id = ? AND draft_key = ?;',
    [serviceId, draftKey]
  );

  const existingPayload = existingRow
    ? await decryptJson<Record<string, string>>(existingRow.encrypted_payload, secret)
    : {};

  const nextPayload = {
    ...existingPayload,
    [fieldName]: fieldValue,
  };

  const encryptedPayload = await encryptJson(nextPayload, secret);

  await db.runAsync(
    `INSERT INTO service_drafts (
      service_id,
      draft_key,
      encrypted_payload,
      updated_at,
      sync_state
    ) VALUES (?, ?, ?, ?, 'queued')
    ON CONFLICT(service_id, draft_key)
    DO UPDATE SET
      encrypted_payload = excluded.encrypted_payload,
      updated_at = excluded.updated_at,
      sync_state = 'queued';`,
    [serviceId, draftKey, encryptedPayload, updatedAt]
  );

  await db.runAsync(
    `UPDATE service_drafts
     SET sync_state = 'queued'
     WHERE service_id = ? AND draft_key = ?;`,
    [serviceId, draftKey]
  );

  await enqueuePolicySyncOperation(
    serviceId,
    draftKey,
    'draft_field_update',
    encryptedPayload
  );

  await recordSequentialEvent(
    serviceId,
    draftKey,
    `draft_field_update:${fieldName}`,
    encryptedPayload
  );

  queueLocalChange();

  if (getConnectivityState().isOnline) {
    await processSyncQueue();
  }
}

export async function generatePolicyHash(
  farmerId: string,
  schemeId: string,
  year: number
): Promise<string> {
  return sha256Hex(`${farmerId.trim()}|${schemeId.trim()}|${year}`);
}

export async function upsertSubsidyApplicationOffline(
  input: SubsidyApplicationInput
): Promise<{ policyHash: string }> {
  const db = await getDatabase();
  const secret = getOrCreateEncryptionSecret();
  const now = new Date().toISOString();
  const policyHash = await generatePolicyHash(
    input.farmerId,
    input.schemeId,
    input.year
  );
  const encryptedPayload = await encryptJson(input.payload, secret);

  await db.runAsync(
    `INSERT INTO subsidy_applications (
      policy_hash,
      farmer_id,
      scheme_id,
      year,
      encrypted_payload,
      updated_at,
      sync_state
    ) VALUES (?, ?, ?, ?, ?, ?, 'queued')
    ON CONFLICT(policy_hash)
    DO UPDATE SET
      farmer_id = excluded.farmer_id,
      scheme_id = excluded.scheme_id,
      year = excluded.year,
      encrypted_payload = excluded.encrypted_payload,
      updated_at = excluded.updated_at,
      sync_state = 'queued';`,
    [
      policyHash,
      input.farmerId,
      input.schemeId,
      input.year,
      encryptedPayload,
      now,
    ]
  );

  await enqueuePolicySyncOperation(
    1,
    policyHash,
    'subsidy_application_upsert',
    encryptedPayload
  );
  await recordSequentialEvent(
    1,
    policyHash,
    'subsidy_application_upsert',
    encryptedPayload
  );

  queueLocalChange();
  return { policyHash };
}

export async function getDraftResumePrompt(
  serviceId: number,
  draftKey: string
): Promise<ResumePrompt> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<{ updated_at: string }>(
    'SELECT updated_at FROM service_drafts WHERE service_id = ? AND draft_key = ?;',
    [serviceId, draftKey]
  );

  if (!row) {
    return {
      hasDraft: false,
      draftKey,
    };
  }

  return {
    hasDraft: true,
    draftKey,
    updatedAt: row.updated_at,
  };
}

export async function loadDraftPayload(
  serviceId: number,
  draftKey: string
): Promise<Record<string, string> | null> {
  const db = await getDatabase();
  const secret = getOrCreateEncryptionSecret();

  const row = await db.getFirstAsync<{ encrypted_payload: string }>(
    'SELECT encrypted_payload FROM service_drafts WHERE service_id = ? AND draft_key = ?;',
    [serviceId, draftKey]
  );

  if (!row) {
    return null;
  }

  return decryptJson<Record<string, string>>(row.encrypted_payload, secret);
}

export async function clearDraft(
  serviceId: number,
  draftKey: string
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    'DELETE FROM service_drafts WHERE service_id = ? AND draft_key = ?;',
    [serviceId, draftKey]
  );
}

export async function processSyncQueue(): Promise<ConnectivityState> {
  const db = await getDatabase();
  const connection = getConnectivityState();

  if (!connection.isOnline) {
    return connection;
  }

  markSyncing();

  await replayEventStoreChronologically();

  const now = new Date().toISOString();
  const queuedItems = await db.getAllAsync<{
    id: number;
    service_id: number;
    draft_key: string | null;
    payload: string;
    retry_count: number;
  }>(
    `SELECT id, service_id, draft_key, payload, retry_count
     FROM sync_queue_policy
     WHERE status IN ('queued', 'failed')
       AND next_attempt_at <= ?
     ORDER BY priority DESC, queued_at ASC
     LIMIT 200;`,
    [now]
  );

  for (const item of queuedItems) {
    try {
      await db.runAsync(
        `UPDATE sync_queue_policy
         SET status = 'syncing', processed_at = NULL, error_message = NULL
         WHERE id = ?;`,
        [item.id]
      );

      await executeRemoteSync(item.payload);

      const processedAt = new Date().toISOString();

      await db.runAsync(
        `UPDATE sync_queue_policy
         SET status = 'synced', processed_at = ?
         WHERE id = ?;`,
        [processedAt, item.id]
      );

      if (item.draft_key) {
        await db.runAsync(
          `UPDATE service_drafts
           SET sync_state = 'synced'
           WHERE service_id = ? AND draft_key = ?;`,
          [item.service_id, item.draft_key]
        );
      }
    } catch (error) {
      const retryCount = item.retry_count + 1;
      const failedStatus: SyncQueueStatus =
        retryCount >= MAX_RETRY_ATTEMPTS ? 'failed' : 'queued';

      await db.runAsync(
        `UPDATE sync_queue_policy
         SET
           status = ?,
           retry_count = ?,
           next_attempt_at = ?,
           error_message = ?
         WHERE id = ?;`,
        [
          failedStatus,
          retryCount,
          getNextAttemptIso(retryCount),
          error instanceof Error ? error.message : String(error),
          item.id,
        ]
      );
    }
  }

  const pendingRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM sync_queue_policy
     WHERE status IN ('queued', 'syncing', 'failed');`
  );

  if ((pendingRow?.count ?? 0) === 0) {
    markSynced();
  }

  return getConnectivityState();
}

export async function replayEventStoreChronologically(): Promise<RosterSyncResult> {
  const db = await getDatabase();
  const events = await db.getAllAsync<{
    id: number;
    service_id: number;
    entity_key: string;
    operation_type: string;
    payload: string;
  }>(
    `SELECT id, service_id, entity_key, operation_type, payload
     FROM local_event_store
     WHERE replay_status IN ('queued', 'failed')
     ORDER BY CAST(local_timestamp_ns AS INTEGER) ASC, id ASC
     LIMIT 500;`
  );

  let processed = 0;
  let failed = 0;
  for (const event of events) {
    try {
      await enqueuePolicySyncOperation(
        event.service_id,
        event.entity_key,
        `event_replay:${event.operation_type}`,
        event.payload
      );

      await db.runAsync(
        `UPDATE local_event_store
         SET replay_status = 'synced'
         WHERE id = ?;`,
        [event.id]
      );
      processed += 1;
    } catch {
      await db.runAsync(
        `UPDATE local_event_store
         SET replay_status = 'failed'
         WHERE id = ?;`,
        [event.id]
      );
      failed += 1;
    }
  }

  return { processed, failed };
}

export async function getAllDrafts(): Promise<DraftRecord[]> {
  const db = await getDatabase();

  return db.getAllAsync<DraftRecord>(
    `SELECT
      id,
      service_id as serviceId,
      draft_key as draftKey,
      encrypted_payload as encryptedPayload,
      updated_at as updatedAt,
      sync_state as syncState
    FROM service_drafts
    ORDER BY updated_at DESC;`
  );
}
