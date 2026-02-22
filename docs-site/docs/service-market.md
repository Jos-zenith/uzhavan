---
id: service-market
title: Market Price Service
slug: /service-market
---

# Market Price Service (Service #7)

Daily agricultural market prices from Tamil Nadu mandis with price trends, comparisons, and selling recommendations.

**Source:** `src/marketPriceService.ts`  
**Policy:** `POL_MARKET_PRICING`  
**Screen:** `MarketPriceScreen.tsx`

## Data Types

### MarketPrice

Individual commodity price record:

```ts
type MarketPrice = {
  commodity: string;
  variety?: string;
  grade?: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  priceUnit: string;
  arrivalQuantity: number;
  market: string;
  district: string;
  state: string;
  reportedDate: string;
  timestamp: number;
};
```

### PriceComparison

Week-over-week price movement:

```ts
type PriceComparison = {
  commodity: string;
  currentPrice: number;
  weekAgoPrice: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
};
```

### SellingRecommendation

AI-driven market intelligence:

```ts
type SellingRecommendation = {
  commodity: string;
  recommendation: 'sell_now' | 'wait' | 'hold';
  reason: string;
  expectedTrend: string;
  confidenceLevel: 'high' | 'medium' | 'low';
};
```

## Tamil Nadu Markets

15 major agricultural markets covered:

| Market | District |
|--------|----------|
| Chennai (Koyambedu) | Chennai |
| Coimbatore | Coimbatore |
| Madurai (Mattuthavani) | Madurai |
| Tiruchirappalli | Tiruchirappalli |
| Salem | Salem |
| Erode | Erode |
| Tiruppur | Tiruppur |
| Thanjavur | Thanjavur |
| Tirunelveli | Tirunelveli |
| Vellore | Vellore |
| Dindigul | Dindigul |
| Karur | Karur |
| Namakkal | Namakkal |
| Theni | Theni |
| Virudhunagar | Virudhunagar |

## Telemetry Events

Under `POL_MARKET_PRICING`:

| Event | Required Fields | Description |
|-------|----------------|-------------|
| `PRICE_QUERY` | `commodity`, `district`, `queryCount` | Farmer checked price |
| `PRICE_COMPARISON` | `commodity`, `marketsCompared` | Cross-market comparison |

## ROI Attribution

Market Price service carries a weight of **0.20** in the predictive ROI engine, labeled "Market Optimization". It directly impacts the `DP_m` (delta market price) variable in the net profit formula.
