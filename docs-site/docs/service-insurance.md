---
id: service-insurance
title: Insurance Service
slug: /service-insurance
---

# Insurance Calculator Service (Service #3)

PMFBY (Pradhan Mantri Fasal Bima Yojana) insurance premium calculator with Tamil Nadu crop-specific rates.

**Source:** `src/insuranceService.ts`  
**Policy:** `POL_BENEFIT_REGISTRATION`  
**Screen:** `InsuranceScreen.tsx`

## Supported Crop Categories

```ts
type CropCategory = 
  | 'food_crops'
  | 'oilseeds'
  | 'annual_commercial'
  | 'annual_horticultural'
  | 'perennial_horticultural';

type CropInsuranceType = 'kharif' | 'rabi' | 'annual_horticultural' | 'annual_commercial';
```

## Tamil Nadu Crop Premium Rates

| Crop | Category | Sum Insured/Ha | Farmer Premium Rate |
|------|----------|----------------|-------------------|
| **Paddy** | Food Crops | Rs 35,000 | 2.0% |
| **Groundnut** | Oilseeds | Rs 40,000 | 2.0% |
| **Cotton** | Annual Commercial | Rs 45,000 | 5.0% |
| **Sugarcane** | Annual Commercial | Rs 55,000 | 5.0% |

PMFBY premium rates:
- **Food crops / Oilseeds**: 2% (Kharif), 1.5% (Rabi)
- **Annual commercial / Horticultural**: 5%

## PremiumCalculation

```ts
type PremiumCalculation = {
  cropName: string;
  season: CropInsuranceType;
  areaInHectares: number;
  sumInsured: number;
  farmerPremiumRate: number;
  farmerPremiumAmount: number;
  governmentSubsidy: number;
  totalPremium: number;
  coverageDetails: string;
  calculatedAt: number;
};
```

## InsuranceScheme

```ts
type InsuranceScheme = {
  schemeName: string;
  description: string;
  eligibility: string[];
  coverage: string[];
  keyFeatures: string[];
  claimProcess: string[];
  documents: string[];
};
```

## Offline Behavior

The insurance calculator works **fully offline** since premium rates are embedded in the service module. No API calls required for basic calculations.

## ROI Attribution

Insurance Calculator carries a weight of **0.14** in the predictive ROI engine, labeled "Insurance Cushion". It directly reduces the `R_b` (risk cost) variable in the net profit formula.
