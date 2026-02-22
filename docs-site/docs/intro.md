---
id: intro
title: Introduction
slug: /
---

# VICT Digital Agriculture Platform

The **VICT (Victori) SDK** powers the Tamil Nadu Digital Agriculture Platform -- an offline-first, policy-enforced telemetry and ROI analysis system designed for 18 vital agricultural services reaching farmers across every district.

## The Problem

Feature value and impact are poorly understood due to inconsistent metrics capture and ROI analysis. Teams ship features without a standardized way to measure whether they actually improve farmer outcomes, reduce costs, or drive adoption.

## The Solution

A **standardized telemetry architecture** where every event is linked to a pre-defined Business Policy, every feature has measurable KPIs, and a built-in ROI engine computes the true return on investment across the entire service portfolio.

## Architecture Pillars

| Pillar | Description |
|--------|-------------|
| **Policy-First Telemetry** | No event can be tracked without linking to a registered Business Policy. 16 policies cover all agricultural domains. |
| **Offline-First Queue** | Events queue locally with encrypted storage, batch flush, retry with exponential backoff, and automatic sync when connectivity resumes. |
| **ROI Engine** | Dual-layer ROI: the SDK `RoiEngine` for real-time benefit/cost dashboards, and the predictive `roiEngine` for district-proxy baselines, adoption stages, and 3-sigma anomaly detection. |
| **Feature Governance** | Every feature must register a `FeatureTelemetrySpec` with tri-party approval (Product, Engineering, Analytics) before release. |
| **Experimentation** | Built-in A/B testing, phased rollout, and pre/post analysis with segment-level attribution. |

## 18 Vital Services

The platform provides these services to farmers across Tamil Nadu:

| # | Service | Policy ID |
|---|---------|-----------|
| 1 | Benefit Registration | `POL_BENEFIT_REGISTRATION` |
| 2 | Subsidy Disbursement | `POL_SUBSIDY_VELOCITY` |
| 3 | Insurance Calculator | `POL_BENEFIT_REGISTRATION` |
| 7 | Market Prices | `POL_MARKET_PRICING` |
| 8 | Weather Forecast | `POL_WEATHER_ADVISORY` |
| 9 | Reservoir Levels | `POL_RESERVOIR_LEVELS` |
| 10 | Seed Stock | `POL_SEED_STOCK` |
| 11 | Fertilizer Stock | `POL_FERTILIZER_SUPPLY` |
| 13 | Farming Guidance | `POL_FARMING_GUIDANCE` |
| 14 | Machinery Hiring | `POL_MACHINERY_HIRING` |
| 15 | Agricultural News | `POL_AGRICULTURAL_NEWS` |
| 16 | Pest Identification | `POL_PEST_IDENTIFICATION` |
| 17 | MSME Charter | `POL_MSME_CHARTER` |
| 18 | Commodity Trends | `POL_COMMODITY_TRENDS` |

## SDK Module Map

```
src/sdk/
  index.ts          -- barrel re-exports
  types.ts          -- all TypeScript interfaces
  provider.tsx      -- OfflineAgriSdkProvider React context
  telemetry.ts      -- TelemetryClient (policy-enforced tracking)
  policy.ts         -- 16 BusinessPolicy definitions + PolicyRegistryClient
  queue.ts          -- OfflineEventQueue (localStorage persistence)
  storage.ts        -- encrypted storage (AES via CryptoJS, SQLite fallback)
  roi.ts            -- RoiEngine (benefit/cost dashboards)
  governance.ts     -- GovernanceRegistry (spec registration + release readiness)
  process.ts        -- FeatureOutcomeRegistry (KPI tracking)
  attribution.ts    -- Feature attribution reports
  experimentation.ts -- ExperimentPlanRegistry (A/B, phased rollout)
  offline.ts        -- OfflineDatasetCache (TTL-based caching)
```

## Quick Start

```tsx
import { OfflineAgriSdkProvider, useOfflineAgriSdk } from './sdk';
import { BUSINESS_POLICIES } from './sdk/policy';

function App() {
  return (
    <OfflineAgriSdkProvider>
      <MyFeature />
    </OfflineAgriSdkProvider>
  );
}

function MyFeature() {
  const sdk = useOfflineAgriSdk();

  const handleAction = () => {
    sdk.track(
      BUSINESS_POLICIES.POL_MARKET_PRICING,
      'PRICE_QUERY',
      { commodity: 'Paddy', district: 'Thanjavur', queryCount: 1 },
      7
    );
  };

  return <button onClick={handleAction}>Check Price</button>;
}
```

## Documentation Sections

1. **[Installation](installation)** -- Prerequisites, setup, and build
2. **[SDK npm Installation](sdk-npm-installation)** -- Publishing and consuming the SDK
3. **[SDK Framework](sdk-framework)** -- Architecture and module reference
4. **[SDK Provider](sdk-provider)** -- React context and hooks
5. **[Type Reference](sdk-types)** -- Complete TypeScript interface catalog
6. **[Policy Enforcement](policy-enforcement)** -- All 16 business policies
7. **[Telemetry Client](telemetry-client)** -- TelemetryClient class API
8. **[ROI Engine](roi-engine)** -- Benefit/cost dashboard computation
9. **[Predictive ROI](roi-predictive)** -- District baselines and adoption stages
10. **[Governance](governance)** -- Feature spec registration and approval
11. **[Experimentation](experimentation)** -- A/B testing and attribution
12. **[Service Catalog](service-catalog)** -- All 18 vital services
