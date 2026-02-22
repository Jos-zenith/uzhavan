---
id: telemetry-client
title: Telemetry Client
slug: /telemetry-client
---

# Telemetry Client

`TelemetryClient` is the central class for policy-enforced event tracking. It manages the event queue, online/offline transitions, auto-flush scheduling, and policy validation.

**Source:** `src/sdk/telemetry.ts`

## Constructor

```ts
const client = new TelemetryClient(config?: TelemetryConfig, transport?: TelemetryTransport);
```

Internally initializes:
- `OfflineEventQueue` with the configured storage key and max queue size
- `PolicyRegistryClient` with all 16 default business policies
- Browser `online`/`offline` event listeners

## API Reference

### track(policyId, eventId, payload, serviceId?)

**Policy-enforced tracking.** Validates the event against the registered policy before queueing.

```ts
client.track(
  BUSINESS_POLICIES.POL_MARKET_PRICING,
  'PRICE_QUERY',
  { commodity: 'Paddy', district: 'Thanjavur', queryCount: 1 },
  7
);
```

Throws `Error` if:
- Policy is not registered
- Event is not defined in the policy
- Required payload fields are missing

### trackFeatureEvent(eventId, payload, serviceId?)

Tracks feature-level events for the governance and experimentation layer. **Not policy-enforced** -- used internally by the SDK provider for `trackFeatureEvent` and `emitKpiMetric`.

### flush()

Manually flushes the queue. Skips if offline. Processes events in batches (default: 100).

```ts
await client.flush();
```

On failure:
1. Increments retry count on failed events
2. Drops events exceeding `maxRetries` (default: 5)

### startAutoFlush() / stopAutoFlush()

Starts/stops the periodic flush timer (default: every 30 seconds).

### isOnline() / queueSize()

```ts
client.isOnline();  // boolean
client.queueSize(); // number
```

### getPolicyRegistry()

Returns the `PolicyRegistryClient` instance for querying or registering policies.

### getQueuedEvents()

Returns all queued `TelemetryEvent[]` (used by ROI engine and attribution).

### clearQueue() / destroy()

`clearQueue()` empties the queue. `destroy()` stops auto-flush and removes event listeners.

## Lifecycle

```
1. Constructor → create queue, policy registry, listen for online/offline
2. startAutoFlush() → setInterval for periodic flush
3. track() → validate policy → enqueue event
4. flush() → dequeue batch → transport.sendBatch() → remove on success
5. destroy() → stopAutoFlush + remove listeners
```

## Default Transport

If no custom transport is provided, events are logged to console:

```ts
const defaultTransport: TelemetryTransport = {
  async sendBatch(events: TelemetryEvent[]) {
    console.log('[SDK Telemetry] buffered batch', events.length);
  },
};
```
