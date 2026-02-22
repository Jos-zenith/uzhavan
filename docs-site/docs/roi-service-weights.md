---
id: roi-service-weights
title: Service Attribution Weights
slug: /roi-service-weights
---

# Service Attribution Weights

Each vital service contributes differently to a farmer's ROI. The predictive engine uses weighted attribution scores to determine each service's impact.

**Source:** `src/roiEngine.ts`

## Weight Table

| Service ID | Service | Weight | Contribution Label |
|-----------|---------|--------|-------------------|
| 16 | Pest Identification | **0.32** | Pest Risk Mitigation |
| 13 | Farming Guidance | **0.24** | Cultivation Guidance |
| 7 | Market Prices | **0.20** | Market Optimization |
| 8 | Weather Forecast | **0.18** | Weather Risk Planning |
| 3 | Insurance Calculator | **0.14** | Insurance Cushion |

Services not in this table receive a default weight of **0.04**.

## calculateModularAttribution

```ts
const result = calculateModularAttribution([7, 8, 16]);
// {
//   attributionScore: 0.70,         // sum of weights for active services
//   riskMitigationScore: 79,        // pest-specific score
// }
```

### Attribution Score

Sum of weights for all active services, capped at 1.0:

```ts
attributionScore = Math.min(
  activeServiceIds.reduce((sum, id) => sum + (SERVICE_WEIGHTS[id]?.weight ?? 0.04), 0),
  1.0
);
```

### Risk Mitigation Score

If pest identification (service 16) is active:

```
riskMitigationScore = 70 + min(activeServiceCount * 3, 20)
```

If pest identification is not active, `riskMitigationScore` is 0.

## Usage in Predictive ROI

The attribution scores are included in every `RoiComputation` result and can be used to:

- Show farmers which services contribute most to their profit
- Recommend activating additional services for higher ROI
- Track the correlation between service usage and actual outcomes

## Examples

| Active Services | Attribution Score | Risk Mitigation |
|----------------|-------------------|-----------------|
| [7] Market only | 0.20 | 0 |
| [7, 8] Market + Weather | 0.38 | 0 |
| [7, 8, 16] Market + Weather + Pest | 0.70 | 79 |
| [7, 8, 13, 16] All top 4 | 0.94 | 82 |
| [3, 7, 8, 13, 16] All 5 weighted | 1.00 (capped) | 85 |
