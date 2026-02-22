---
id: roi-engine
title: ROI Engine
slug: /roi-engine
---

# ROI Engine

The `RoiEngine` computes real-time return on investment from telemetry events. It produces per-feature dashboards, portfolio-level summaries, and actionable recommendations (scale, iterate, or retire).

**Source:** `src/sdk/roi.ts`

## RoiEngine Class

```ts
const engine = new RoiEngine();
```

### compute(input)

Basic ROI metrics from events:

```ts
const metrics = engine.compute({
  events: telemetryEvents,
  baselineCost: 100000,
  serviceId: 7,  // optional: filter by service
});
```

Returns `RoiMetric[]`:

| metricId | unit | Description |
|----------|------|-------------|
| `total_events` | count | Total events processed |
| `total_benefit` | INR | Sum of `outcomeValue + costSaved + revenueGained` |
| `roi_percent` | percent | `((totalBenefit - baselineCost) / baselineCost) * 100` |

### computeFeatureDashboard(input)

Comprehensive feature-level dashboard:

```ts
const dashboard = engine.computeFeatureDashboard({
  events: telemetryEvents,
  costs: {
    developmentCost: 50000,
    infrastructureCost: 10000,
    supportCost: 5000,
    maintenanceCost: 3000,
  },
  serviceId: 7,
  eligibleUsers: 5000,
});
```

Returns `FeatureRoiDashboard` with:

- **Value Model**: incremental revenue, cost savings, productivity value, time saved value, qualitative benefit value
- **Cost Model**: development, infrastructure, support, maintenance
- **Leading Indicators**: active users, adoption rate, engagement per user, adoption and engagement trends
- **Recommendation**: `'scale'`, `'iterate'`, or `'retire'`

### computePortfolioDashboard(inputs)

Aggregates multiple feature dashboards into a portfolio view:

```ts
const portfolio = engine.computePortfolioDashboard([
  { events, costs: costModel1, serviceId: 7, eligibleUsers: 5000 },
  { events, costs: costModel2, serviceId: 8, eligibleUsers: 3000 },
  { events, costs: costModel3, serviceId: 16, eligibleUsers: 8000 },
]);
```

## Value Model Extraction

The engine extracts value from telemetry event payloads using these fields:

| Value Category | Payload Fields Summed |
|---------------|----------------------|
| Incremental Revenue | `incrementalRevenue`, `revenueGained`, `outcomeValue` |
| Cost Savings | `costSavings`, `costSaved` |
| Productivity | `productivityValue`, `productivityGainValue`, `outputGainValue` |
| Time Saved | `timeSavedValue` + (`timeSavedHours` * hourly rate) |
| Qualitative | `qualitativeBenefitValue`, `riskReductionValue`, `trustImprovementValue` |

Default hourly value: **150 INR** (auto-detected from `valuePerHour` in events if available).

## Recommendation Logic

| Condition | Action |
|-----------|--------|
| ROI >= 30% AND Adoption >= 40% AND Trend non-negative | **Scale** |
| ROI < 0% AND Adoption < 15% AND Trend negative | **Retire** |
| Everything else | **Iterate** |

## Trend Computation

Events are bucketed by month (`YYYY-MM`) to compute adoption and engagement trends. The last trend delta determines trend direction for recommendation logic.
