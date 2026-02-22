---
id: sdk-framework
title: SDK Framework
slug: /sdk-framework
---

# SDK Framework

The VICT SDK is designed for resilient field operations and measurable product outcomes.

## Core capabilities

- Offline-first telemetry queue with retry and batch flush
- Dataset snapshot caching with TTL
- ROI engine for benefit/cost tracking
- Governance checks for release readiness

## Main modules

- `src/sdk/telemetry.ts`
- `src/sdk/queue.ts`
- `src/sdk/offline.ts`
- `src/sdk/roi.ts`
- `src/sdk/governance.ts`
- `src/sdk/provider.tsx`

## Formula

`ROI % = ((Total Benefits - Total Costs) / Total Costs) * 100`

## Source document

See `SDK_FRAMEWORK.md` for complete architecture and operating model.