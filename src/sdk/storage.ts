import CryptoJS from 'crypto-js';
import * as SQLite from 'expo-sqlite';

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const ENCRYPTION_SECRET_KEY = 'offline.encryption.secret.v1';
const ENCRYPTED_STORAGE_PREFIX = 'tn.agri.enc.v1:';
const SDK_STORAGE_DATABASE = 'tn_agri_sdk_storage.db';
const SQLITE_TABLE_NAME = 'sdk_kv_store';

let cachedStorage: StorageLike | null = null;
let cachedSqliteStorage: StorageLike | null | undefined;

const memoryStorage = new Map<string, string>();

const fallbackStorage: StorageLike = {
  getItem: (key) => memoryStorage.get(key) ?? null,
  setItem: (key, value) => {
    memoryStorage.set(key, value);
  },
  removeItem: (key) => {
    memoryStorage.delete(key);
  },
};

function resolveSqliteStorage(): StorageLike | null {
  if (cachedSqliteStorage !== undefined) {
    return cachedSqliteStorage;
  }

  try {
    const database = SQLite.openDatabaseSync(SDK_STORAGE_DATABASE);
    database.runSync(
      `CREATE TABLE IF NOT EXISTS ${SQLITE_TABLE_NAME} (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)`
    );

    cachedSqliteStorage = {
      getItem: (key: string) => {
        const row = database.getFirstSync<{ value: string }>(
          `SELECT value FROM ${SQLITE_TABLE_NAME} WHERE key = ?`,
          key
        );
        return row?.value ?? null;
      },
      setItem: (key: string, value: string) => {
        database.runSync(
          `INSERT INTO ${SQLITE_TABLE_NAME} (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          key,
          value
        );
      },
      removeItem: (key: string) => {
        database.runSync(`DELETE FROM ${SQLITE_TABLE_NAME} WHERE key = ?`, key);
      },
    };

    return cachedSqliteStorage;
  } catch {
    cachedSqliteStorage = null;
    return null;
  }
}

export function resolveStorage(): StorageLike {
  if (cachedStorage) {
    return cachedStorage;
  }

  const sqliteStorage = resolveSqliteStorage();
  if (sqliteStorage) {
    cachedStorage = sqliteStorage;
    return sqliteStorage;
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const probeKey = '__sdk_probe__';
      window.localStorage.setItem(probeKey, '1');
      window.localStorage.removeItem(probeKey);
      cachedStorage = window.localStorage;
      return window.localStorage;
    }
  } catch {
    cachedStorage = fallbackStorage;
    return fallbackStorage;
  }

  cachedStorage = fallbackStorage;
  return fallbackStorage;
}

function getOrCreateStorageSecret(storage: StorageLike): string {
  const existingSecret = storage.getItem(ENCRYPTION_SECRET_KEY);
  if (existingSecret) {
    return existingSecret;
  }

  const generatedSecret = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
  storage.setItem(ENCRYPTION_SECRET_KEY, generatedSecret);
  return generatedSecret;
}

function encryptSerialized(serializedValue: string, storage: StorageLike): string {
  const secret = getOrCreateStorageSecret(storage);
  const encrypted = CryptoJS.AES.encrypt(serializedValue, secret).toString();
  return `${ENCRYPTED_STORAGE_PREFIX}${encrypted}`;
}

function decryptSerialized(encryptedValue: string, storage: StorageLike): string {
  const secret = getOrCreateStorageSecret(storage);
  const payload = encryptedValue.slice(ENCRYPTED_STORAGE_PREFIX.length);
  const decrypted = CryptoJS.AES.decrypt(payload, secret).toString(CryptoJS.enc.Utf8);

  if (!decrypted) {
    throw new Error('Failed to decrypt local storage payload');
  }

  return decrypted;
}

export function readJson<T>(key: string, fallback: T): T {
  const storage = resolveStorage();
  try {
    const raw = storage.getItem(key);
    if (!raw) {
      return fallback;
    }
    if (raw.startsWith(ENCRYPTED_STORAGE_PREFIX)) {
      const decrypted = decryptSerialized(raw, storage);
      return JSON.parse(decrypted) as T;
    }

    const parsed = JSON.parse(raw) as T;
    storage.setItem(key, encryptSerialized(raw, storage));
    return parsed;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(key: string, value: T): void {
  const storage = resolveStorage();
  const serialized = JSON.stringify(value);
  storage.setItem(key, encryptSerialized(serialized, storage));
}

export function removeKey(key: string): void {
  const storage = resolveStorage();
  storage.removeItem(key);
}
