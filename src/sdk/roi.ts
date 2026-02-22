import type {
  FeatureRoiDashboard,
  LeadingIndicators,
  PortfolioRoiDashboard,
  RoiComputationInput,
  RoiCostModel,
  RoiDashboardInput,
  RoiMetric,
  RoiValueModel,
  TelemetryEvent,
  TrendPoint,
} from './types';

function sumBy(events: TelemetryEvent[], key: string): number {
  return events.reduce((sum, event) => {
    const value = event.payload[key];
    return sum + (typeof value === 'number' && Number.isFinite(value) ? value : 0);
  }, 0);
}

export class RoiEngine {
  compute(input: RoiComputationInput): RoiMetric[] {
    const events =
      typeof input.serviceId === 'number'
        ? input.events.filter((event) => event.serviceId === input.serviceId)
        : input.events;

    const totalEvents = events.length;
    const baselineCost = input.baselineCost ?? 0;

    const outcomes = sumBy(events, 'outcomeValue');
    const savings = sumBy(events, 'costSaved');
    const revenue = sumBy(events, 'revenueGained');
    const totalBenefit = outcomes + savings + revenue;
    const roiPercent = baselineCost > 0 ? ((totalBenefit - baselineCost) / baselineCost) * 100 : 0;

    return [
      {
        metricId: 'total_events',
        value: totalEvents,
        unit: 'count',
        computedAt: new Date().toISOString(),
      },
      {
        metricId: 'total_benefit',
        value: Number(totalBenefit.toFixed(2)),
        unit: 'INR',
        computedAt: new Date().toISOString(),
      },
      {
        metricId: 'roi_percent',
        value: Number(roiPercent.toFixed(2)),
        unit: 'percent',
        computedAt: new Date().toISOString(),
      },
    ];
  }

  computeFeatureDashboard(input: RoiDashboardInput): FeatureRoiDashboard {
    const events =
      typeof input.serviceId === 'number'
        ? input.events.filter((event) => event.serviceId === input.serviceId)
        : input.events;

    const value = this.computeValueModel(events);
    const costs = this.normalizeCosts(input.costs);

    const totalBenefits =
      value.incrementalRevenue +
      value.costSavings +
      value.productivityValue +
      value.timeSavedValue +
      value.qualitativeBenefitValue;

    const totalCosts =
      costs.developmentCost +
      costs.infrastructureCost +
      costs.supportCost +
      costs.maintenanceCost;

    const netValue = totalBenefits - totalCosts;
    const roiPercent = totalCosts > 0 ? (netValue / totalCosts) * 100 : 0;
    const leadingIndicators = this.computeLeadingIndicators(events, input.eligibleUsers);

    return {
      serviceId: input.serviceId,
      totalBenefits: Number(totalBenefits.toFixed(2)),
      totalCosts: Number(totalCosts.toFixed(2)),
      netValue: Number(netValue.toFixed(2)),
      roiPercent: Number(roiPercent.toFixed(2)),
      value,
      costs,
      leadingIndicators,
      recommendation: this.recommendAction(roiPercent, leadingIndicators),
      computedAt: new Date().toISOString(),
    };
  }

  computePortfolioDashboard(inputs: RoiDashboardInput[]): PortfolioRoiDashboard {
    const features = inputs.map((entry) => this.computeFeatureDashboard(entry));

    const totalBenefits = features.reduce((sum, feature) => sum + feature.totalBenefits, 0);
    const totalCosts = features.reduce((sum, feature) => sum + feature.totalCosts, 0);
    const netValue = totalBenefits - totalCosts;
    const roiPercent = totalCosts > 0 ? (netValue / totalCosts) * 100 : 0;

    return {
      features,
      totals: {
        totalBenefits: Number(totalBenefits.toFixed(2)),
        totalCosts: Number(totalCosts.toFixed(2)),
        netValue: Number(netValue.toFixed(2)),
        roiPercent: Number(roiPercent.toFixed(2)),
      },
      computedAt: new Date().toISOString(),
    };
  }

  private computeValueModel(events: TelemetryEvent[]): RoiValueModel {
    const incrementalRevenue =
      sumBy(events, 'incrementalRevenue') + sumBy(events, 'revenueGained') + sumBy(events, 'outcomeValue');

    const costSavings = sumBy(events, 'costSavings') + sumBy(events, 'costSaved');

    const productivityValue =
      sumBy(events, 'productivityValue') +
      sumBy(events, 'productivityGainValue') +
      sumBy(events, 'outputGainValue');

    const timeSavedHours = sumBy(events, 'timeSavedHours');
    const explicitTimeSavedValue = sumBy(events, 'timeSavedValue');
    const hourlyValue = this.detectAverageHourlyValue(events);
    const timeSavedValue = explicitTimeSavedValue + timeSavedHours * hourlyValue;

    const qualitativeBenefitValue =
      sumBy(events, 'qualitativeBenefitValue') +
      sumBy(events, 'riskReductionValue') +
      sumBy(events, 'trustImprovementValue');

    return {
      incrementalRevenue: Number(incrementalRevenue.toFixed(2)),
      costSavings: Number(costSavings.toFixed(2)),
      productivityValue: Number(productivityValue.toFixed(2)),
      timeSavedValue: Number(timeSavedValue.toFixed(2)),
      qualitativeBenefitValue: Number(qualitativeBenefitValue.toFixed(2)),
    };
  }

  private detectAverageHourlyValue(events: TelemetryEvent[]): number {
    const values: number[] = [];

    events.forEach((event) => {
      const value = event.payload.valuePerHour;
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        values.push(value);
      }
    });

    if (!values.length) {
      return 150;
    }

    const avg = values.reduce((sum, item) => sum + item, 0) / values.length;
    return Number(avg.toFixed(2));
  }

  private normalizeCosts(costs: RoiCostModel): RoiCostModel {
    return {
      developmentCost: Number((costs.developmentCost || 0).toFixed(2)),
      infrastructureCost: Number((costs.infrastructureCost || 0).toFixed(2)),
      supportCost: Number((costs.supportCost || 0).toFixed(2)),
      maintenanceCost: Number((costs.maintenanceCost || 0).toFixed(2)),
    };
  }

  private computeLeadingIndicators(
    events: TelemetryEvent[],
    eligibleUsers?: number
  ): LeadingIndicators {
    const userKeys = new Set<string>();

    events.forEach((event) => {
      const candidate =
        event.payload.userId ?? event.payload.farmerId ?? event.payload.deviceId ?? event.payload.sessionId;
      if (candidate !== null && candidate !== undefined) {
        userKeys.add(String(candidate));
      }
    });

    const activeUsers = userKeys.size;
    const denominator = eligibleUsers && eligibleUsers > 0 ? eligibleUsers : activeUsers;
    const adoptionRatePercent = denominator > 0 ? (activeUsers / denominator) * 100 : 0;
    const engagementEventsPerUser = activeUsers > 0 ? events.length / activeUsers : 0;

    return {
      activeUsers,
      adoptionRatePercent: Number(adoptionRatePercent.toFixed(2)),
      engagementEventsPerUser: Number(engagementEventsPerUser.toFixed(2)),
      adoptionTrend: this.buildTrend(events, 'adoption'),
      engagementTrend: this.buildTrend(events, 'engagement'),
    };
  }

  private buildTrend(events: TelemetryEvent[], mode: 'adoption' | 'engagement'): TrendPoint[] {
    const buckets: Record<string, Set<string> | number> = {};

    events.forEach((event) => {
      const period = this.toMonthBucket(event.occurredAt);
      if (mode === 'engagement') {
        const current = (buckets[period] as number | undefined) ?? 0;
        buckets[period] = current + 1;
        return;
      }

      const currentSet = (buckets[period] as Set<string> | undefined) ?? new Set<string>();
      const userKey =
        event.payload.userId ?? event.payload.farmerId ?? event.payload.deviceId ?? event.payload.sessionId;
      if (userKey !== null && userKey !== undefined) {
        currentSet.add(String(userKey));
      }
      buckets[period] = currentSet;
    });

    return Object.keys(buckets)
      .sort()
      .map((period) => {
        const value =
          mode === 'engagement'
            ? (buckets[period] as number)
            : (buckets[period] as Set<string>).size;
        return { period, value };
      });
  }

  private toMonthBucket(dateValue: string): string {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return 'unknown';
    }

    const year = date.getUTCFullYear();
    const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
    return `${year}-${month}`;
  }

  private recommendAction(
    roiPercent: number,
    indicators: LeadingIndicators
  ): 'iterate' | 'scale' | 'retire' {
    const trendDelta = this.lastTrendDelta(indicators.engagementTrend);

    if (roiPercent >= 30 && indicators.adoptionRatePercent >= 40 && trendDelta >= 0) {
      return 'scale';
    }

    if (roiPercent < 0 && indicators.adoptionRatePercent < 15 && trendDelta < 0) {
      return 'retire';
    }

    return 'iterate';
  }

  private lastTrendDelta(trend: TrendPoint[]): number {
    if (trend.length < 2) {
      return 0;
    }
    return trend[trend.length - 1].value - trend[trend.length - 2].value;
  }
}
