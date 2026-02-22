type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

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

export function resolveStorage(): StorageLike {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const probeKey = '__sdk_probe__';
      window.localStorage.setItem(probeKey, '1');
      window.localStorage.removeItem(probeKey);
      return window.localStorage;
    }
  } catch {
    return fallbackStorage;
  }

  return fallbackStorage;
}

export function readJson<T>(key: string, fallback: T): T {
  const storage = resolveStorage();
  try {
    const raw = storage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(key: string, value: T): void {
  const storage = resolveStorage();
  storage.setItem(key, JSON.stringify(value));
}

export function removeKey(key: string): void {
  const storage = resolveStorage();
  storage.removeItem(key);
}
