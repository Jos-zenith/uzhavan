---
id: roi-predictive
title: Predictive ROI
slug: /roi-predictive
---

# Predictive ROI Engine

The predictive ROI engine (`src/roiEngine.ts`) provides **district-proxy baselines**, **adoption stage modeling**, **3-sigma anomaly detection**, and the core net profit formula for farming operations.

## Core Formula

```
P_net = (Y + DY_AI) * (P_m + DP_m) - (C_i - DC_i) - (C_t - DC_t) - (C_o - DC_o) - (R_b - DR)
```

Where:
- **Y** = Baseline yield (kg/ha), **DY_AI** = AI-driven yield improvement
- **P_m** = Market price (INR/kg), **DP_m** = Price improvement via market intelligence
- **C_i** = Input cost, **DC_i** = Input cost savings
- **C_t** = Transaction cost, **DC_t** = Transaction cost savings
- **C_o** = Operational cost, **DC_o** = Operational cost savings
- **R_b** = Risk cost (insurance, crop loss), **DR** = Risk cost reduction

## District Proxy Baselines

For farmers in the learning period (< 90 days), the engine uses synthetic baselines from real Tamil Nadu district data:

| District | Crop | Avg Yield (kg/ha) | Avg Price (INR/kg) | Avg Input Cost | Avg Transaction Cost |
|----------|------|-------------------|--------------------|--------------------|---------------------|
| **Thanjavur** | Paddy | 5,200 | 24.00 | 42,000 | 3,500 |
| **Madurai** | Millet | 2,600 | 34.00 | 18,000 | 2,200 |
| **Coimbatore** | Groundnut | 2,100 | 58.00 | 32,000 | 2,800 |

### Ramping Baselines

For farmers with fewer than 90 days of data, baselines are ramped linearly:

```ts
const ramp = Math.max(0, Math.min(1, farmerDaysSinceOnboarding / 90));

// Yield ramps from 75% to 100%
avgYield * (0.75 + 0.25 * ramp)
// Prices ramp from 90% to 100%
avgMarketPrice * (0.9 + 0.1 * ramp)
// Input costs ramp down from 110% to 100%
avgInputCost * (1.1 - 0.1 * ramp)
```

## computePredictiveRoi

The main entry point:

```ts
const result = computePredictiveRoi(
  'Thanjavur',   // district
  'Paddy',       // crop
  45,            // farmerDaysSinceOnboarding
  [7, 8, 16],   // activeServiceIds
  {
    deltaYieldAi: 400,
    deltaMarketPrice: 2,
    deltaInputCostSavings: 3000,
    deltaTransactionCostSavings: 500,
  }
);
```

Returns `RoiComputation`:

```ts
{
  netProfit: number,
  formulaUsed: 'P_net = (Y + DY_AI) * (P_m + DP_m) - ...',
  attributionScore: number,     // 0-1, from active services
  riskMitigationScore: number,  // 0-100
  baselineUsed: DistrictProxyBaseline,
  breakdown: RoiFormulaBreakdown,
  learningModeCards: LearningModeCard[],
  adoptionStage: AdoptionStage,
}
```

## Adoption Stage Matrix

| Stage | Days | Entry Criteria | Recommended Action |
|-------|------|---------------|-------------------|
| **cold-start** | 0-29 | New to platform | Show learning-mode onboarding, enable assisted guidance |
| **assisted** | 30-89 | Repeat usage starts | Drive task completion nudges and trust reinforcement |
| **guided** | 90-179 | Engagement stabilizes | Optimize per-service recommendations and anomaly guardrails |
| **scaled** | 180+ | Full platform usage | Scale high ROI pathways, keep weekly drift checks active |

## 3-Sigma Anomaly Detection

Detects outlier data points in time series:

```ts
const report = detectThreeSigmaAnomalies(series);
```

Returns `ThreeSigmaAnomalyReport`:

```ts
{
  mean: number,
  standardDeviation: number,
  threshold: number,           // mean + 3 * stdDev
  anomalies: AnomalyPoint[],  // points above threshold with z-scores
}
```

## Learning Mode Cards

During the cold-start and assisted stages, the engine generates contextual cards:

1. **Synthetic district baseline active** -- Shows the proxy district and crop baseline being used
2. **Learning window in progress** -- Days remaining before farmer-specific baseline lock
3. **Current adoption stage** -- The farmer's current stage with guidance
