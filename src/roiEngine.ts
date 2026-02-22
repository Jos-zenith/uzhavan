export type RoiInputs = {
  yieldBase: number;
  deltaYieldAi: number;
  marketPriceBase: number;
  deltaMarketPrice: number;
  inputCostBase: number;
  deltaInputCostSavings: number;
  transactionCostBase: number;
  deltaTransactionCostSavings: number;
  operationalCostBase?: number;
  deltaOperationalCostSavings?: number;
  riskCostBase?: number;
  deltaRiskCostSavings?: number;
};

export type DistrictProxyBaseline = {
  district: string;
  crop: string;
  avgYield: number;
  avgMarketPrice: number;
  avgInputCost: number;
  avgTransactionCost: number;
  observationDays: number;
};

export type ServiceAttribution = {
  serviceId: number;
  weight: number;
  contributionLabel: string;
};

export type RoiComputation = {
  netProfit: number;
  formulaUsed: string;
  attributionScore: number;
  riskMitigationScore: number;
  baselineUsed: DistrictProxyBaseline;
  breakdown: RoiFormulaBreakdown;
  learningModeCards: LearningModeCard[];
  adoptionStage: AdoptionStage;
};

export type RoiFormulaBreakdown = {
  adjustedYield: number;
  adjustedMarketPrice: number;
  grossRevenue: number;
  effectiveInputCost: number;
  effectiveTransactionCost: number;
  effectiveOperationalCost: number;
  effectiveRiskCost: number;
  totalCosts: number;
  pNet: number;
};

export type LearningModeCard = {
  id: string;
  title: string;
  body: string;
  priority: 'high' | 'medium' | 'low';
};

export type TimeSeriesPoint = {
  label: string;
  value: number;
};

export type AnomalyPoint = TimeSeriesPoint & {
  zScore: number;
};

export type ThreeSigmaAnomalyReport = {
  mean: number;
  standardDeviation: number;
  threshold: number;
  anomalies: AnomalyPoint[];
};

export type AdoptionStage = 'cold-start' | 'assisted' | 'guided' | 'scaled';

export type AdoptionStageMatrixRow = {
  stage: AdoptionStage;
  entryCriteria: string;
  expectedSignal: string;
  recommendedAction: string;
  active: boolean;
};

const DISTRICT_PROXY_BASELINES: DistrictProxyBaseline[] = [
  {
    district: 'Thanjavur',
    crop: 'Paddy',
    avgYield: 5200,
    avgMarketPrice: 24,
    avgInputCost: 42000,
    avgTransactionCost: 3500,
    observationDays: 90,
  },
  {
    district: 'Madurai',
    crop: 'Millet',
    avgYield: 2600,
    avgMarketPrice: 34,
    avgInputCost: 18000,
    avgTransactionCost: 2200,
    observationDays: 90,
  },
  {
    district: 'Coimbatore',
    crop: 'Groundnut',
    avgYield: 2100,
    avgMarketPrice: 58,
    avgInputCost: 32000,
    avgTransactionCost: 2800,
    observationDays: 90,
  },
];

const SERVICE_WEIGHTS: Record<number, ServiceAttribution> = {
  7: { serviceId: 7, weight: 0.2, contributionLabel: 'Market Optimization' },
  8: { serviceId: 8, weight: 0.18, contributionLabel: 'Weather Risk Planning' },
  13: { serviceId: 13, weight: 0.24, contributionLabel: 'Cultivation Guidance' },
  16: { serviceId: 16, weight: 0.32, contributionLabel: 'Pest Risk Mitigation' },
  3: { serviceId: 3, weight: 0.14, contributionLabel: 'Insurance Cushion' },
};

export function calculateNetProfit(inputs: RoiInputs): number {
  return calculateRoiFormulaBreakdown(inputs).pNet;
}

export function calculateRoiFormulaBreakdown(inputs: RoiInputs): RoiFormulaBreakdown {
  const adjustedYield = inputs.yieldBase + inputs.deltaYieldAi;
  const adjustedMarketPrice = inputs.marketPriceBase + inputs.deltaMarketPrice;
  const grossRevenue = adjustedYield * adjustedMarketPrice;

  const effectiveInputCost = inputs.inputCostBase - inputs.deltaInputCostSavings;
  const effectiveTransactionCost =
    inputs.transactionCostBase - inputs.deltaTransactionCostSavings;
  const effectiveOperationalCost =
    (inputs.operationalCostBase ?? 0) - (inputs.deltaOperationalCostSavings ?? 0);
  const effectiveRiskCost = (inputs.riskCostBase ?? 0) - (inputs.deltaRiskCostSavings ?? 0);

  const totalCosts =
    effectiveInputCost +
    effectiveTransactionCost +
    effectiveOperationalCost +
    effectiveRiskCost;

  return {
    adjustedYield,
    adjustedMarketPrice,
    grossRevenue,
    effectiveInputCost,
    effectiveTransactionCost,
    effectiveOperationalCost,
    effectiveRiskCost,
    totalCosts,
    pNet: grossRevenue - totalCosts,
  };
}

export function getSyntheticBaseline(
  district: string,
  crop: string,
  farmerDaysSinceOnboarding: number
): DistrictProxyBaseline {
  const baseline =
    DISTRICT_PROXY_BASELINES.find(
      (item) =>
        item.district.toLowerCase() === district.toLowerCase() &&
        item.crop.toLowerCase() === crop.toLowerCase()
    ) ?? DISTRICT_PROXY_BASELINES[0];

  if (farmerDaysSinceOnboarding >= 90) {
    return baseline;
  }

  const ramp = Math.max(0, Math.min(1, farmerDaysSinceOnboarding / 90));

  return {
    ...baseline,
    avgYield: baseline.avgYield * (0.75 + 0.25 * ramp),
    avgMarketPrice: baseline.avgMarketPrice * (0.9 + 0.1 * ramp),
    avgInputCost: baseline.avgInputCost * (1.1 - 0.1 * ramp),
    avgTransactionCost: baseline.avgTransactionCost * (1.15 - 0.15 * ramp),
    observationDays: farmerDaysSinceOnboarding,
  };
}

export function calculateModularAttribution(
  activeServiceIds: number[]
): { attributionScore: number; riskMitigationScore: number } {
  const uniqueServices = Array.from(new Set(activeServiceIds));

  const attributionScore = uniqueServices.reduce((sum, serviceId) => {
    const service = SERVICE_WEIGHTS[serviceId];
    return sum + (service ? service.weight : 0.04);
  }, 0);

  const pestOnlyScore = uniqueServices.includes(16)
    ? 70 + Math.min(uniqueServices.length * 3, 20)
    : 0;

  return {
    attributionScore: Math.min(attributionScore, 1),
    riskMitigationScore: Math.min(pestOnlyScore, 100),
  };
}

export function computePredictiveRoi(
  district: string,
  crop: string,
  farmerDaysSinceOnboarding: number,
  activeServiceIds: number[],
  deltas: Pick<
    RoiInputs,
    | 'deltaYieldAi'
    | 'deltaMarketPrice'
    | 'deltaInputCostSavings'
    | 'deltaTransactionCostSavings'
    | 'deltaOperationalCostSavings'
    | 'deltaRiskCostSavings'
  >
): RoiComputation {
  const baseline = getSyntheticBaseline(
    district,
    crop,
    farmerDaysSinceOnboarding
  );

  const formulaInputs: RoiInputs = {
    yieldBase: baseline.avgYield,
    deltaYieldAi: deltas.deltaYieldAi,
    marketPriceBase: baseline.avgMarketPrice,
    deltaMarketPrice: deltas.deltaMarketPrice,
    inputCostBase: baseline.avgInputCost,
    deltaInputCostSavings: deltas.deltaInputCostSavings,
    transactionCostBase: baseline.avgTransactionCost,
    deltaTransactionCostSavings: deltas.deltaTransactionCostSavings,
    operationalCostBase: Math.round(baseline.avgInputCost * 0.12),
    deltaOperationalCostSavings: deltas.deltaOperationalCostSavings ?? 0,
    riskCostBase: Math.round(baseline.avgInputCost * 0.08),
    deltaRiskCostSavings: deltas.deltaRiskCostSavings ?? 0,
  };

  const breakdown = calculateRoiFormulaBreakdown(formulaInputs);
  const netProfit = breakdown.pNet;

  const attribution = calculateModularAttribution(activeServiceIds);
  const adoptionStage = deriveAdoptionStage(farmerDaysSinceOnboarding);
  const learningModeCards = createLearningModeCards(
    farmerDaysSinceOnboarding,
    baseline,
    adoptionStage
  );

  return {
    netProfit,
    formulaUsed:
      'P_net = (Y + ΔY_AI) · (P_m + ΔP_m) - (C_i - ΔC_i) - (C_t - ΔC_t) - (C_o - ΔC_o) - (R_b - ΔR)',
    attributionScore: attribution.attributionScore,
    riskMitigationScore: attribution.riskMitigationScore,
    baselineUsed: baseline,
    breakdown,
    learningModeCards,
    adoptionStage,
  };
}

export function deriveAdoptionStage(farmerDaysSinceOnboarding: number): AdoptionStage {
  if (farmerDaysSinceOnboarding < 30) {
    return 'cold-start';
  }
  if (farmerDaysSinceOnboarding < 90) {
    return 'assisted';
  }
  if (farmerDaysSinceOnboarding < 180) {
    return 'guided';
  }
  return 'scaled';
}

export function createLearningModeCards(
  farmerDaysSinceOnboarding: number,
  baseline: DistrictProxyBaseline,
  stage: AdoptionStage
): LearningModeCard[] {
  const cards: LearningModeCard[] = [
    {
      id: 'lm-baseline',
      title: 'Synthetic district baseline active',
      body: `${baseline.district} · ${baseline.crop}: Yield ${Math.round(
        baseline.avgYield
      )} kg/ha, price ₹${baseline.avgMarketPrice.toFixed(2)}.`,
      priority: 'high',
    },
    {
      id: 'lm-capture-window',
      title: 'Learning window in progress',
      body: `${Math.max(0, 90 - farmerDaysSinceOnboarding)} days remaining before farmer-specific baseline lock.`,
      priority: farmerDaysSinceOnboarding < 90 ? 'high' : 'low',
    },
    {
      id: 'lm-stage',
      title: 'Current adoption stage',
      body: `Stage: ${stage}. Keep collecting consistent interaction and outcome telemetry.`,
      priority: 'medium',
    },
  ];

  return cards;
}

export function detectThreeSigmaAnomalies(
  series: TimeSeriesPoint[]
): ThreeSigmaAnomalyReport {
  const safeSeries = series.filter((point) => Number.isFinite(point.value));

  if (!safeSeries.length) {
    return {
      mean: 0,
      standardDeviation: 0,
      threshold: 0,
      anomalies: [],
    };
  }

  const mean = safeSeries.reduce((sum, point) => sum + point.value, 0) / safeSeries.length;
  const variance =
    safeSeries.reduce((sum, point) => sum + (point.value - mean) ** 2, 0) / safeSeries.length;
  const standardDeviation = Math.sqrt(variance);
  const threshold = mean + 3 * standardDeviation;

  const anomalies = safeSeries
    .filter((point) => point.value > threshold && standardDeviation > 0)
    .map((point) => ({
      ...point,
      zScore: Number(((point.value - mean) / standardDeviation).toFixed(2)),
    }));

  return {
    mean: Number(mean.toFixed(2)),
    standardDeviation: Number(standardDeviation.toFixed(2)),
    threshold: Number(threshold.toFixed(2)),
    anomalies,
  };
}

export function buildAdoptionStageInsightMatrix(input: {
  farmerDaysSinceOnboarding: number;
  adoptionRatePercent: number;
  engagementEventsPerUser: number;
}): AdoptionStageMatrixRow[] {
  const currentStage = deriveAdoptionStage(input.farmerDaysSinceOnboarding);

  return [
    {
      stage: 'cold-start',
      entryCriteria: '< 30 days from onboarding',
      expectedSignal: 'Adoption < 10%, sparse telemetry',
      recommendedAction: 'Show learning-mode onboarding and enable assisted guidance.',
      active: currentStage === 'cold-start',
    },
    {
      stage: 'assisted',
      entryCriteria: '30-89 days from onboarding',
      expectedSignal: 'Adoption 10-30%, repeat usage starts',
      recommendedAction: 'Drive task completion nudges and trust reinforcement.',
      active: currentStage === 'assisted',
    },
    {
      stage: 'guided',
      entryCriteria: '90-179 days from onboarding',
      expectedSignal: 'Adoption 30-50%, engagement stabilizes',
      recommendedAction: 'Optimize per-service recommendations and anomaly guardrails.',
      active: currentStage === 'guided',
    },
    {
      stage: 'scaled',
      entryCriteria: '>= 180 days from onboarding',
      expectedSignal: `Adoption ${input.adoptionRatePercent.toFixed(
        1
      )}% and engagement ${input.engagementEventsPerUser.toFixed(2)} / user`,
      recommendedAction: 'Scale high ROI pathways and keep weekly drift checks active.',
      active: currentStage === 'scaled',
    },
  ];
}
