---
id: service-pest
title: Pest Identification Service
slug: /service-pest
---

# Pest Identification Service (Service #16)

AI-powered pest and disease identification using EfficientNetV2L, with offline fallback for basic remedies.

**Source:** `src/pestIdentificationService.ts`  
**Policy:** `POL_PEST_IDENTIFICATION`  
**Screen:** `PestIdentificationScreen.tsx`  
**Model:** `pest-detection-effectivenet.ipynb` (EfficientNetV2L)

## Supported Pest Categories

```ts
type PestCategory = 
  | 'ants' | 'bees' | 'beetle' | 'caterpillar'
  | 'earthworms' | 'earwig' | 'grasshopper' | 'moth'
  | 'slug' | 'snail' | 'wasp' | 'weevil';
```

## Data Types

### PestInfo

```ts
type PestInfo = {
  pestId: string;
  pestName: string;
  scientificName: string;
  category: PestCategory;
  description: string;
  symptoms: string[];
  affectedCrops: string[];
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  imageUrl?: string;
};
```

### IdentificationResult

```ts
type IdentificationResult = {
  resultId: string;
  timestamp: string;
  imageDataUrl?: string;
  aiDetection?: {
    detectedPest: PestCategory;
    confidence: number;
    topPredictions: Array<{ pest: PestCategory; confidence: number }>;
    modelVersion: string;
  };
  manualSelection?: PestCategory;
  pestInfo: PestInfo;
  remedialMeasures: RemedialMeasure[];
};
```

### RemedialMeasure

```ts
type RemedialMeasure = {
  measureId: string;
  title: string;
  type: 'Chemical' | 'Organic' | 'Biological' | 'Cultural' | 'Mechanical';
  description: string;
  materials: string[];
  steps: string[];
  costEstimate?: string;
  effectivenessPeriod: string;
  precautions: string[];
  availability: 'Common' | 'Rare';
};
```

## Offline Behavior

- **Online**: Full AI-powered identification with camera capture and EfficientNetV2L inference
- **Offline**: Manual pest category selection with pre-loaded remedy database

## Telemetry Events

Under `POL_PEST_IDENTIFICATION`:

| Event | Required Fields | Description |
|-------|----------------|-------------|
| `IDENTIFICATION_REQUESTED` | `requestId`, `farmerId` | Scan initiated |
| `ML_MODEL_INFERENCE` | `requestId`, `modelVersion`, `pestDetected`, `confidence` | AI processed |
| `IDENTIFICATION_CONFIRMED` | `requestId`, `expertId`, `pestsConfirmed` | Expert verified |

Under `POL_PEST_ALERT_CONVERSION`:

| Event | Required Fields | Description |
|-------|----------------|-------------|
| `PEST_ALERT_RECEIVED` | `farmerId`, `pestType`, `severity`, `district` | Alert delivered |
| `PEST_IDENTIFIED` | `identificationId`, `pestType`, `confidence` | Pest confirmed |
| `REMEDY_APPLIED` | `pestId`, `remedyType`, `farmerId` | Treatment applied |

## ROI Attribution

Pest Identification carries the **highest weight (0.32)** in the predictive ROI engine, labeled "Pest Risk Mitigation". It is the primary driver of the risk mitigation score.
