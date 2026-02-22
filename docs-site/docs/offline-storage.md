---
id: offline-storage
title: Offline Storage
slug: /offline-storage
---

# Offline Storage Infrastructure

The SDK provides a multi-layer encrypted storage system designed for offline-first operation in rural areas with intermittent connectivity.

## Storage Layer Cascade

**Source:** `src/sdk/storage.ts`

The SDK resolves storage in this priority order:

1. **SQLite** (Expo/React Native) -- `expo-sqlite` for native apps
2. **localStorage** -- Browser fallback for web apps
3. **In-memory Map** -- Final fallback when neither is available

```ts
function resolveStorage(): StorageLike {
  // 1. Try SQLite (creates sdk_kv_store table)
  // 2. Try localStorage (with probe write/read)
  // 3. Fall back to in-memory Map
}
```

## Encrypted Storage

All data persisted through the SDK is **AES-encrypted** using CryptoJS:

```ts
// Write: serialize → encrypt → store
function writeJson<T>(key: string, value: T): void {
  const serialized = JSON.stringify(value);
  storage.setItem(key, encryptSerialized(serialized, storage));
}

// Read: retrieve → decrypt → parse
function readJson<T>(key: string, fallback: T): T {
  const raw = storage.getItem(key);
  if (raw.startsWith('tn.agri.enc.v1:')) {
    const decrypted = decryptSerialized(raw, storage);
    return JSON.parse(decrypted);
  }
  // Auto-encrypt unencrypted legacy data
  return parsed;
}
```

### Encryption Details

- **Algorithm**: AES (via CryptoJS)
- **Key**: Auto-generated 32-byte hex secret, stored at key `offline.encryption.secret.v1`
- **Prefix**: Encrypted values are prefixed with `tn.agri.enc.v1:` for detection
- **Migration**: Unencrypted values are automatically re-encrypted on first read

## SQLite Schema

**Source:** `src/sqlite.ts` (1,830 lines)

The full SQLite layer provides 12 tables for comprehensive offline data management:

| Table | Purpose |
|-------|---------|
| `sdk_kv_store` | Generic key-value storage for SDK data |
| `weather_cache` | Cached weather forecasts |
| `market_prices` | Commodity price snapshots |
| `pest_identifications` | Pest scan results and history |
| `benefit_registrations` | Farmer benefit application drafts |
| `insurance_calculations` | Insurance premium calculations |
| `machinery_bookings` | Machinery hiring bookings |
| `seed_stock_cache` | Seed availability snapshots |
| `fertilizer_stock` | Fertilizer stock levels |
| `reservoir_levels` | Water level snapshots |
| `user_feedback` | Farmer feedback and ratings |
| `sync_queue` | Pending sync operations |

## OfflineDatasetCache

**Source:** `src/sdk/offline.ts`

TTL-based caching for any dataset:

```ts
const cache = new OfflineDatasetCache();

// Store with 1-hour TTL
cache.put(
  { datasetId: 'market-prices', ttlMs: 3600000 },
  'paddy-thanjavur',
  { price: 24.50, market: 'Thanjavur' }
);

// Retrieve (returns null if expired)
const data = cache.get(
  { datasetId: 'market-prices', ttlMs: 3600000 },
  'paddy-thanjavur'
);
```

### Auto-Compaction

On every `get()` or `list()`, expired records are automatically removed:

```ts
compact(config): DatasetRecord[] {
  const records = readJson(storageKey, []);
  const valid = records.filter(item => new Date(item.expiresAt).getTime() > now);
  if (valid.length !== records.length) {
    writeJson(storageKey, valid);  // Auto-compact
  }
  return valid;
}
```

## Storage Keys Used

| Key | Module | Purpose |
|-----|--------|---------|
| `tn.agri.sdk.telemetry.queue.v1` | TelemetryClient | Event queue |
| `tn.agri.sdk.business.policies.v1` | PolicyRegistryClient | Business policies |
| `tn.agri.sdk.governance.records.v1` | GovernanceRegistry | Feature governance |
| `tn.agri.sdk.feature.experiments.v1` | ExperimentPlanRegistry | Experiment plans |
| `tn.agri.sdk.dataset.*` | OfflineDatasetCache | Cached datasets |
| `offline.encryption.secret.v1` | Storage | AES encryption key |
