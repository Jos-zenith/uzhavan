---
id: connectivity
title: Connectivity
slug: /connectivity
---

# Connectivity Management

The SDK automatically manages online/offline state transitions to ensure telemetry is never lost in rural field conditions.

**Source:** `src/connectivity.ts`

## Network State Machine

The connectivity module provides a state machine with two primary states:

```
ONLINE ←→ OFFLINE
```

State changes are detected via:
- **Browser events**: `window.addEventListener('online' | 'offline')`
- **Polling**: Periodic connectivity checks for environments where events are unreliable

## TelemetryClient Integration

The `TelemetryClient` listens for connectivity changes:

```ts
// In constructor:
if (typeof window !== 'undefined') {
  this.online = window.navigator.onLine;
  window.addEventListener('online', this.handleOnline);
  window.addEventListener('offline', this.handleOffline);
}
```

### Online Transition

When connectivity is restored:
1. `this.online = true`
2. Immediate `flush()` is triggered to send queued events

### Offline Transition

When connectivity is lost:
1. `this.online = false`
2. `flush()` calls short-circuit (no-op)
3. Events continue to be queued locally

## Flush Behavior

```
flush() called
  └─ Is online?
       ├─ No → return (events stay in queue)
       └─ Yes → dequeue batch
             └─ transport.sendBatch(batch)
                   ├─ Success → removeByIds
                   └─ Failure → incrementRetries
                                  └─ dropExceededRetries(5)
```

## Provider Polling

The `OfflineAgriSdkProvider` polls connectivity status every second:

```tsx
React.useEffect(() => {
  const timer = window.setInterval(() => {
    setOnline(telemetry.isOnline());
    setQueueSize(telemetry.queueSize());
  }, 1000);
  return () => window.clearInterval(timer);
}, []);
```

This ensures UI components reflect real-time connectivity status.

## Design for Rural India

The offline-first architecture is designed for:

- **Intermittent 2G/3G coverage** in rural Tamil Nadu
- **No connectivity** during field work in agricultural areas
- **Batch sync** when farmers return to coverage zones
- **Zero data loss** through persistent encrypted queuing
