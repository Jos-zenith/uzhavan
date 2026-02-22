import { readJson, writeJson, removeKey } from './storage';
import type { DatasetRecord, OfflineDatasetConfig, Primitive } from './types';

export class OfflineDatasetCache {
  constructor(private readonly namespace = 'tn.agri.sdk.dataset') {}

  private key(datasetId: string): string {
    return `${this.namespace}.${datasetId}`;
  }

  put(
    config: OfflineDatasetConfig,
    key: string,
    value: Record<string, Primitive>
  ): void {
    const storageKey = this.key(config.datasetId);
    const existing = readJson<DatasetRecord[]>(storageKey, []);
    const now = Date.now();
    const record: DatasetRecord = {
      key,
      value,
      cachedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + config.ttlMs).toISOString(),
    };

    const withoutCurrent = existing.filter((item) => item.key !== key);
    withoutCurrent.push(record);
    writeJson(storageKey, withoutCurrent);
  }

  get(config: OfflineDatasetConfig, key: string): Record<string, Primitive> | null {
    const records = this.compact(config);
    const found = records.find((item) => item.key === key);
    return found ? found.value : null;
  }

  list(config: OfflineDatasetConfig): DatasetRecord[] {
    return this.compact(config);
  }

  clear(config: OfflineDatasetConfig): void {
    removeKey(this.key(config.datasetId));
  }

  compact(config: OfflineDatasetConfig): DatasetRecord[] {
    const storageKey = this.key(config.datasetId);
    const records = readJson<DatasetRecord[]>(storageKey, []);
    const now = Date.now();
    const valid = records.filter((item) => new Date(item.expiresAt).getTime() > now);

    if (valid.length !== records.length) {
      writeJson(storageKey, valid);
    }

    return valid;
  }
}
