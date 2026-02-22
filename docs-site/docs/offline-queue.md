---
id: offline-queue
title: Offline Event Queue
slug: /offline-queue
---

# Offline Event Queue

`OfflineEventQueue` is a localStorage-backed FIFO queue that persists telemetry events across page reloads and offline periods.

**Source:** `src/sdk/queue.ts`

## Constructor

```ts
const queue = new OfflineEventQueue(storageKey: string, maxQueueSize: number);
```

- `storageKey`: localStorage key for persistence (default: `tn.agri.sdk.telemetry.queue.v1`)
- `maxQueueSize`: Maximum events to store (default: 5000). Older events are dropped when exceeded.

## API Reference

### enqueue(event)

Appends a `TelemetryEvent` to the queue and persists to storage.

```ts
queue.enqueue(event);
```

### dequeueBatch(limit)

Returns the first `limit` events from the queue (does not remove them).

```ts
const batch = queue.dequeueBatch(100);
```

### removeByIds(ids)

Removes events by their `id` values after successful transport.

```ts
queue.removeByIds(batch.map(e => e.id));
```

### incrementRetries(ids)

Increments the retry counter for events that failed to send.

### dropExceededRetries(maxRetries)

Removes events whose retry count exceeds the threshold.

### snapshot()

Returns a `QueueSnapshot` with size, oldest, and newest event timestamps.

```ts
const snap = queue.snapshot();
// { size: 42, oldestEventAt: '2025-01-01T...', newestEventAt: '2025-01-02T...' }
```

### all()

Returns all queued events as `TelemetryEvent[]`.

### clear()

Empties the queue entirely.

## Storage Layer

All reads and writes go through `readJson` / `writeJson` from `src/sdk/storage.ts`, which provides **AES encryption** for all persisted data. The storage resolution cascade is:

1. **SQLite** (Expo) -- if available
2. **localStorage** -- browser fallback
3. **In-memory Map** -- final fallback

## Bounded Queue

When writing, the queue is bounded to `maxQueueSize` by keeping only the most recent events:

```ts
private writeAll(events: TelemetryEvent[]): void {
  const bounded = events.slice(-this.maxQueueSize);
  writeJson(this.storageKey, bounded);
}
```
