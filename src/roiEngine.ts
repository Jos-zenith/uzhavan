export type RoiInputs = {
  yieldBase: number;
  deltaYieldAi: number;
  marketPriceBase: number;
  deltaMarketPrice: number;
  inputCostBase: number;
  deltaInputCostSavings: number;
  transactionCostBase: number;
  deltaTransactionCostSavings: number;
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
  const revenue = (inputs.yieldBase + inputs.deltaYieldAi) *
    (inputs.marketPriceBase + inputs.deltaMarketPrice);
  const effectiveInputCost = inputs.inputCostBase - inputs.deltaInputCostSavings;
  const effectiveTransactionCost =
    inputs.transactionCostBase - inputs.deltaTransactionCostSavings;

  return revenue - effectiveInputCost - effectiveTransactionCost;
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
  >
): RoiComputation {
  const baseline = getSyntheticBaseline(
    district,
    crop,
    farmerDaysSinceOnboarding
  );

  const netProfit = calculateNetProfit({
    yieldBase: baseline.avgYield,
    deltaYieldAi: deltas.deltaYieldAi,
    marketPriceBase: baseline.avgMarketPrice,
    deltaMarketPrice: deltas.deltaMarketPrice,
    inputCostBase: baseline.avgInputCost,
    deltaInputCostSavings: deltas.deltaInputCostSavings,
    transactionCostBase: baseline.avgTransactionCost,
    deltaTransactionCostSavings: deltas.deltaTransactionCostSavings,
  });

  const attribution = calculateModularAttribution(activeServiceIds);

  return {
    netProfit,
    formulaUsed:
      'P_net = (Y + ΔY_AI) · (P_m + ΔP_m) - (C_i - ΔC_i) - (C_t - ΔC_t)',
    attributionScore: attribution.attributionScore,
    riskMitigationScore: attribution.riskMitigationScore,
  };
}
