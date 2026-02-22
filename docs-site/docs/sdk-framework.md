---
id: sdk-framework
title: SDK Framework
slug: /sdk-framework
---

# SDK Framework

The VICT SDK is a **policy-enforced, offline-first telemetry and ROI analysis framework** built for the Tamil Nadu Digital Agriculture Platform. It is designed for resilient field operations where connectivity is intermittent and measurable product outcomes are mandatory.

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  React App                       │
│  ┌─────────────────────────────────────────────┐ │
│  │        OfflineAgriSdkProvider               │ │
│  │  ┌──────────┐  ┌────────────┐  ┌─────────┐ │ │
│  │  │Telemetry │  │ ROI Engine │  │Governance│ │ │
│  │  │  Client  │  │            │  │ Registry │ │ │
│  │  └────┬─────┘  └────────────┘  └─────────┘ │ │
│  │       │                                      │ │
│  │  ┌────▼─────┐  ┌────────────┐  ┌─────────┐ │ │
│  │  │ Policy   │  │Experiment  │  │ Offline  │ │ │
│  │  │ Registry │  │  Registry  │  │  Cache   │ │ │
│  │  └────┬─────┘  └────────────┘  └─────────┘ │ │
│  │       │                                      │ │
│  │  ┌────▼─────┐  ┌────────────┐               │ │
│  │  │ Offline  │  │ Encrypted  │               │ │
│  │  │  Queue   │  │  Storage   │               │ │
│  │  └──────────┘  └────────────┘               │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## Module Reference

| Module | Path | Purpose |
|--------|------|---------|
| **Types** | `src/sdk/types.ts` | All TypeScript interfaces and type definitions |
| **Provider** | `src/sdk/provider.tsx` | React context provider and `useOfflineAgriSdk` hook |
| **Telemetry** | `src/sdk/telemetry.ts` | `TelemetryClient` -- policy-enforced event tracking |
| **Policy** | `src/sdk/policy.ts` | 16 `BusinessPolicy` definitions and `PolicyRegistryClient` |
| **Queue** | `src/sdk/queue.ts` | `OfflineEventQueue` -- localStorage-backed FIFO |
| **Storage** | `src/sdk/storage.ts` | Encrypted read/write (AES via CryptoJS, SQLite fallback) |
| **ROI** | `src/sdk/roi.ts` | `RoiEngine` -- benefit/cost computation and dashboards |
| **Governance** | `src/sdk/governance.ts` | `GovernanceRegistry` -- spec registration and release readiness |
| **Process** | `src/sdk/process.ts` | `FeatureOutcomeRegistry` -- KPI measurement and emission |
| **Attribution** | `src/sdk/attribution.ts` | Feature-level KPI attribution reports |
| **Experimentation** | `src/sdk/experimentation.ts` | `ExperimentPlanRegistry` -- A/B, phased rollout, pre/post |
| **Offline** | `src/sdk/offline.ts` | `OfflineDatasetCache` -- TTL-based dataset caching |

## Dependency Graph

```
provider.tsx
  ├── telemetry.ts
  │     ├── queue.ts
  │     │     └── storage.ts (encrypted localStorage / SQLite)
  │     └── policy.ts (16 business policies)
  ├── roi.ts
  ├── governance.ts
  │     └── storage.ts
  ├── process.ts
  ├── experimentation.ts
  │     └── storage.ts
  ├── attribution.ts
  └── offline.ts
        └── storage.ts
```

## Core Design Principles

### 1. Policy-First Enforcement

Every telemetry event **must** reference a pre-registered `BusinessPolicyId`. The `TelemetryClient.track()` method validates the policy, event, and payload schema before queueing. Events without a valid policy are rejected with an error.

### 2. Offline-First Queue

The `OfflineEventQueue` persists events to encrypted local storage. When the device goes offline, events continue to accumulate. When connectivity resumes, the `TelemetryClient` auto-flushes in configurable batches (default: 100 events every 30 seconds).

### 3. Dual-Layer ROI

- **SDK RoiEngine** (`src/sdk/roi.ts`): Real-time computation from telemetry events. Produces `FeatureRoiDashboard` and `PortfolioRoiDashboard` with leading indicators, trend analysis, and scale/iterate/retire recommendations.
- **Predictive RoiEngine** (`src/roiEngine.ts`): District-proxy baselines (Thanjavur, Madurai, Coimbatore), adoption stage matrix (cold-start/assisted/guided/scaled), 3-sigma anomaly detection, and the core formula:

```
P_net = (Y + DY_AI) * (P_m + DP_m) - (C_i - DC_i) - (C_t - DC_t) - (C_o - DC_o) - (R_b - DR)
```

### 4. Tri-Party Governance

Features cannot ship without telemetry specs approved by Product, Engineering, and Analytics owners. The `GovernanceRegistry` enforces this via `evaluateReleaseReadiness()`.

### 5. Encrypted Storage

All persisted data is encrypted using AES (CryptoJS) with auto-generated secrets. The storage layer cascades: SQLite (Expo) -> localStorage -> in-memory fallback.

## Default Configuration

```ts
const DEFAULT_CONFIG: Required<TelemetryConfig> = {
  storageKey: 'tn.agri.sdk.telemetry.queue.v1',
  maxQueueSize: 5000,
  flushBatchSize: 100,
  flushIntervalMs: 30000,  // 30 seconds
  maxRetries: 5,
};
```

## Source Barrel Export

The SDK index (`src/sdk/index.ts`) re-exports all modules:

```ts
export * from './types';
export * from './storage';
export * from './queue';
export * from './telemetry';
export * from './offline';
export * from './policy';
export * from './roi';
export * from './governance';
export * from './process';
export * from './attribution';
export * from './experimentation';
export * from './provider';
```
