---
id: service-catalog
title: Service Catalog
slug: /service-catalog
---

# Vital Services Catalog

The platform delivers 18 vital agricultural services to farmers across Tamil Nadu. Each service has a unique ID, dedicated source module, business policy, and offline capability.

## Complete Service Registry

| ID | Service | Module | Policy | Offline |
|----|---------|--------|--------|---------|
| 1 | Benefit Registration | `benefitRegistrationService.ts` | `POL_BENEFIT_REGISTRATION` | Draft save |
| 2 | Subsidy Disbursement | `benefitRegistrationService.ts` | `POL_SUBSIDY_VELOCITY` | Status cache |
| 3 | Insurance Calculator | `insuranceService.ts` | `POL_BENEFIT_REGISTRATION` | Full offline |
| 7 | Market Prices | `marketPriceService.ts` | `POL_MARKET_PRICING` | Price cache |
| 8 | Weather Forecast | `weatherService.ts` | `POL_WEATHER_ADVISORY` | Forecast cache |
| 9 | Reservoir Levels | `reservoirService.ts` | `POL_RESERVOIR_LEVELS` | Level cache |
| 10 | Seed Stock | `seedStockService.ts` | `POL_SEED_STOCK` | Stock cache |
| 11 | Fertilizer Stock | `fertilizerStockService.ts` | `POL_FERTILIZER_SUPPLY` | Stock cache |
| 13 | Farming Guidance | (organic/advisory) | `POL_FARMING_GUIDANCE` | Articles offline |
| 14 | Machinery Hiring | `machineryHiringService.ts` | `POL_MACHINERY_HIRING` | Booking draft |
| 15 | Agricultural News | `agricultureNewsService.ts` | `POL_AGRICULTURAL_NEWS` | Article cache |
| 16 | Pest Identification | `pestIdentificationService.ts` | `POL_PEST_IDENTIFICATION` | Basic remedies |
| 17 | MSME Charter | `msmeCharterService.ts` | `POL_MSME_CHARTER` | Form cache |
| 18 | Commodity Trends | `marketPriceService.ts` | `POL_COMMODITY_TRENDS` | Trend cache |

## ROI Attribution Weights

Five services carry explicit attribution weights in the predictive ROI engine:

| Service ID | Service | Weight | Label |
|-----------|---------|--------|-------|
| 16 | Pest Identification | 0.32 | Pest Risk Mitigation |
| 13 | Farming Guidance | 0.24 | Cultivation Guidance |
| 7 | Market Prices | 0.20 | Market Optimization |
| 8 | Weather Forecast | 0.18 | Weather Risk Planning |
| 3 | Insurance Calculator | 0.14 | Insurance Cushion |

All other services receive a default weight of 0.04.

## Screen Components

Each service has a dedicated React screen component:

| Service | Screen Component |
|---------|-----------------|
| Weather | `WeatherForecastScreen.tsx` |
| Market Prices | `MarketPriceScreen.tsx` |
| Pest Identification | `PestIdentificationScreen.tsx` |
| Insurance | `InsuranceScreen.tsx` |
| Seed Stock | `SeedStockScreen.tsx` |
| Reservoir Levels | `ReservoirLevelsScreen.tsx` |
| Fertilizer Stock | `FertilizerStockScreen.tsx` |
| Machinery Hiring | `MachineryHiringScreen.tsx` |
| MSME Charter | `MSMECharterScreen.tsx` |
| Agricultural News | `AgricultureNewsScreen.tsx` |
| Benefit Registration | `BenefitRegistrationScreen.tsx` |

## Service Architecture Pattern

Every service follows the same architecture:

```
ServiceModule.ts
  ├── Type definitions (exported types)
  ├── Static data (TN-specific constants, district mappings)
  ├── API integration functions (fetch from external APIs)
  ├── Offline cache functions (read/write to SQLite/localStorage)
  ├── Business logic (calculations, recommendations)
  └── Telemetry integration points (policy-linked events)
```
