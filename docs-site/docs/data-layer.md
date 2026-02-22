---
id: data-layer
title: Data Layer
slug: /data-layer
---

# Data Layer

The platform includes real agricultural data from Tamil Nadu used for service computation, offline fallback, and ROI baseline analysis.

## CSV Data

### Tamil Nadu Fertilizer Stock

**Path:** `data/tn_fertilizer_stock.csv`

Contains district-level fertilizer availability data across Tamil Nadu.

| Column | Description |
|--------|-------------|
| District | TN district name |
| Fertilizer Type | Product name (Urea, DAP, MOP, etc.) |
| Available Stock (MT) | Current available quantity in metric tons |
| Required Stock (MT) | Expected requirement |
| Shortage/Surplus | Calculated gap |
| Last Updated | Data freshness timestamp |

Used by `fertilizerStockService.ts` for Service #11 (Fertilizer Stock) with offline caching.

## Excel Analysis

**Path:** `excel_analysis.json`

Metadata for the 2,486-row farm stock report with column analysis:

```json
{
  "totalRows": 2486,
  "columns": [
    { "name": "District", "type": "string", "uniqueValues": 38 },
    { "name": "Block", "type": "string", "uniqueValues": 385 },
    { "name": "Crop", "type": "string", "uniqueValues": 45 },
    { "name": "Season", "type": "string", "uniqueValues": 3 },
    { "name": "Area_Ha", "type": "number" },
    { "name": "Production_MT", "type": "number" },
    { "name": "Yield_KgPerHa", "type": "number" }
  ]
}
```

This data feeds into the predictive ROI engine for district-proxy baseline calculations.

## District Proxy Baselines

Derived from real data, used when farmers have fewer than 90 days of individual telemetry:

| District | Crop | Yield (kg/ha) | Price (INR/kg) | Input Cost | Transaction Cost |
|----------|------|---------------|----------------|------------|-----------------|
| Thanjavur | Paddy | 5,200 | 24.00 | 42,000 | 3,500 |
| Madurai | Millet | 2,600 | 34.00 | 18,000 | 2,200 |
| Coimbatore | Groundnut | 2,100 | 58.00 | 32,000 | 2,800 |

## SQLite Tables

The full offline data layer (`src/sqlite.ts`, 1,830 lines) provides 12 SQLite tables for comprehensive data persistence. See [Offline Storage](/offline-storage) for the complete schema.
