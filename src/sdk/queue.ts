import { readJson, writeJson } from './storage';
import type { QueueSnapshot, TelemetryEvent } from './types';

export class OfflineEventQueue {
  constructor(
    private readonly storageKey: string,
    private readonly maxQueueSize: number
  ) {}

  private readAll(): TelemetryEvent[] {
    return readJson<TelemetryEvent[]>(this.storageKey, []);
  }

  private writeAll(events: TelemetryEvent[]): void {
    const bounded = events.slice(-this.maxQueueSize);
    writeJson(this.storageKey, bounded);
  }

  enqueue(event: TelemetryEvent): void {
    const events = this.readAll();
    events.push(event);
    this.writeAll(events);
  }

  dequeueBatch(limit: number): TelemetryEvent[] {
    const events = this.readAll();
    return events.slice(0, Math.max(1, limit));
  }

  removeByIds(ids: string[]): void {
    if (!ids.length) {
      return;
    }

    const idSet = new Set(ids);
    const events = this.readAll().filter((event) => !idSet.has(event.id));
    this.writeAll(events);
  }

  incrementRetries(ids: string[]): void {
    if (!ids.length) {
      return;
    }

    const idSet = new Set(ids);
    const events = this.readAll().map((event) => {
      if (idSet.has(event.id)) {
        return { ...event, retries: event.retries + 1 };
      }
      return event;
    });

    this.writeAll(events);
  }

  dropExceededRetries(maxRetries: number): void {
    const events = this.readAll().filter((event) => event.retries <= maxRetries);
    this.writeAll(events);
  }

  clear(): void {
    this.writeAll([]);
  }

  snapshot(): QueueSnapshot {
    const events = this.readAll();
    return {
      size: events.length,
      oldestEventAt: events.length ? events[0].occurredAt : null,
      newestEventAt: events.length ? events[events.length - 1].occurredAt : null,
    };
  }

  all(): TelemetryEvent[] {
    return this.readAll();
  }
}
