/**
 * Reservoir Service for Service #10: Reservoir Levels
 * Uses river sheet from uzhavan.xlsx for real-time water level monitoring
 */

import { clearServiceDataCache, getService10Dataset } from './serviceDataLoader';

export type ReservoirData = {
  district: string;
  block: string;
  station: string;
  riverName: string;
  damName?: string;
  currentLevel: number;        // in feet
  fullReservoirLevel: number;  // FRL in feet
  deadStorageLevel: number;    // DSL in feet
  totalCapacity: number;       // in TMC (Thousand Million Cubic feet)
  liveStorage: number;         // in TMC
  currentStorage: number;      // in TMC
  flowRate: number;            // in cusecs
  inflow: number;              // in cusecs
  outflow: number;             // in cusecs
  percentageFull: number;
  status: 'critical' | 'low' | 'moderate' | 'good' | 'full';
  alertLevel: 'danger' | 'warning' | 'normal';
  lastUpdated: number;
};

export type ReservoirAlert = {
  station: string;
  district: string;
  alertType: 'flood_risk' | 'drought_risk' | 'maintenance_required' | 'optimal';
  severity: 'high' | 'medium' | 'low';
  message: string;
  recommendation: string;
};

export type ReservoirStatistics = {
  totalReservoirs: number;
  criticalCount: number;
  lowCount: number;
  moderateCount: number;
  goodCount: number;
  fullCount: number;
  totalCapacity: number;
  totalCurrentStorage: number;
  averagePercentageFull: number;
};

export type IrrigationRecommendation = {
  district: string;
  availableWater: number;
  recommendedCrops: string[];
  irrigationSchedule: string;
  waterSavingTips: string[];
  criticalityLevel: 'high' | 'medium' | 'low';
};

// Tamil Nadu Major Reservoirs
const TN_MAJOR_RESERVOIRS = [
  'Mettur Dam',
  'Bhavani Sagar',
  'Amaravathi Dam',
  'Vaigai Dam',
  'Papanasam Dam',
  'Manimuthar Dam',
  'Sathanur Dam',
  'Krishnagiri Dam',
  'Aliyar Dam',
  'Parambikulam Dam',
  'Stanley Reservoir',
  'Poondi Reservoir',
  'Chembarambakkam',
  'Red Hills',
  'Cholavaram',
];

const RESERVOIR_CACHE_KEY = 'reservoir_levels_cache_v1';
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

type CachedReservoirData = {
  reservoirs: ReservoirData[];
  cachedAt: number;
};

class ReservoirService {
  private workbookPath = '/data/uzhavan.xlsx';
  private reservoirs: Map<string, ReservoirData> = new Map();
  private loaded = false;

  /**
   * Load reservoir data from uzhavan.xlsx river sheet
   */
  async loadReservoirData(): Promise<void> {
    try {
      const dataset = await getService10Dataset();
      this.reservoirs.clear();
      dataset.reservoirs.forEach((item) => {
        const reservoirData: ReservoirData = {
          district: item.district,
          block: item.block,
          station: item.station,
          riverName: item.riverName,
          damName:
            TN_MAJOR_RESERVOIRS.find(
              (dam) =>
                item.station.toLowerCase().includes(dam.toLowerCase()) ||
                item.riverName.toLowerCase().includes(dam.toLowerCase())
            ) || item.damName,
          currentLevel: item.currentLevel,
          fullReservoirLevel: item.fullReservoirLevel,
          deadStorageLevel: item.deadStorageLevel,
          totalCapacity: item.totalCapacity,
          liveStorage: item.liveStorage,
          currentStorage: item.currentStorage,
          flowRate: item.flowRate,
          inflow: item.inflow,
          outflow: item.outflow,
          percentageFull: item.percentageFull,
          status: item.status,
          alertLevel: item.alertLevel,
          lastUpdated: new Date(item.lastUpdated).getTime() || Date.now(),
        };

        const key = `${item.district.toLowerCase()}_${item.station.toLowerCase()}`;
        this.reservoirs.set(key, reservoirData);
      });

      this.loaded = true;
      this.saveToCache(Array.from(this.reservoirs.values()));
    } catch (error) {
      console.error('[ReservoirService] Failed to load data:', error);
      // Try loading from cache
      const cached = this.loadFromCache();
      if (cached) {
        cached.forEach((res) => {
          const key = `${res.district.toLowerCase()}_${res.station.toLowerCase()}`;
          this.reservoirs.set(key, res);
        });
        this.loaded = true;
      }
    }
  }

  /**
   * Get all reservoirs
   */
  async getAllReservoirs(): Promise<ReservoirData[]> {
    if (!this.loaded) {
      await this.loadReservoirData();
    }
    return Array.from(this.reservoirs.values());
  }

  /**
   * Get reservoirs by district
   */
  async getReservoirsByDistrict(district: string): Promise<ReservoirData[]> {
    if (!this.loaded) {
      await this.loadReservoirData();
    }
    
    const normalized = district.toLowerCase().trim();
    return Array.from(this.reservoirs.values()).filter(
      (res) => res.district.toLowerCase() === normalized
    );
  }

  /**
   * Get reservoir by station name
   */
  async getReservoirByStation(station: string, district?: string): Promise<ReservoirData | null> {
    if (!this.loaded) {
      await this.loadReservoirData();
    }

    if (district) {
      const key = `${district.toLowerCase()}_${station.toLowerCase()}`;
      return this.reservoirs.get(key) || null;
    }

    // Search by station name only
    const normalized = station.toLowerCase().trim();
    return Array.from(this.reservoirs.values()).find(
      (res) => res.station.toLowerCase().includes(normalized)
    ) || null;
  }

  /**
   * Get reservoirs by status
   */
  async getReservoirsByStatus(status: ReservoirData['status']): Promise<ReservoirData[]> {
    if (!this.loaded) {
      await this.loadReservoirData();
    }
    
    return Array.from(this.reservoirs.values()).filter(
      (res) => res.status === status
    );
  }

  /**
   * Get critical reservoirs (below 20%)
   */
  async getCriticalReservoirs(): Promise<ReservoirData[]> {
    return this.getReservoirsByStatus('critical');
  }

  /**
   * Generate alerts for all reservoirs
   */
  async generateAlerts(): Promise<ReservoirAlert[]> {
    if (!this.loaded) {
      await this.loadReservoirData();
    }

    const alerts: ReservoirAlert[] = [];

    Array.from(this.reservoirs.values()).forEach((reservoir) => {
      if (reservoir.percentageFull >= 95) {
        alerts.push({
          station: reservoir.station,
          district: reservoir.district,
          alertType: 'flood_risk',
          severity: 'high',
          message: `${reservoir.station} at ${reservoir.percentageFull.toFixed(1)}% capacity - Flood risk`,
          recommendation: 'Monitor water release. Alert downstream areas. Prepare flood management protocols.',
        });
      } else if (reservoir.percentageFull <= 20) {
        alerts.push({
          station: reservoir.station,
          district: reservoir.district,
          alertType: 'drought_risk',
          severity: 'high',
          message: `${reservoir.station} critically low at ${reservoir.percentageFull.toFixed(1)}% - Drought risk`,
          recommendation: 'Implement water rationing. Prioritize drinking water. Restrict irrigation water release.',
        });
      } else if (reservoir.percentageFull <= 40) {
        alerts.push({
          station: reservoir.station,
          district: reservoir.district,
          alertType: 'drought_risk',
          severity: 'medium',
          message: `${reservoir.station} below normal at ${reservoir.percentageFull.toFixed(1)}%`,
          recommendation: 'Monitor water usage. Plan water conservation measures. Advise farmers on water-efficient crops.',
        });
      } else if (reservoir.percentageFull >= 80 && reservoir.inflow > reservoir.outflow * 1.5) {
        alerts.push({
          station: reservoir.station,
          district: reservoir.district,
          alertType: 'flood_risk',
          severity: 'medium',
          message: `${reservoir.station} high inflow detected - Rising water levels`,
          recommendation: 'Increase controlled releases. Monitor weather forecasts. Prepare flood alerts.',
        });
      } else {
        alerts.push({
          station: reservoir.station,
          district: reservoir.district,
          alertType: 'optimal',
          severity: 'low',
          message: `${reservoir.station} operating normally at ${reservoir.percentageFull.toFixed(1)}%`,
          recommendation: 'Maintain current water management practices.',
        });
      }
    });

    return alerts.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Get statistics for all reservoirs
   */
  async getStatistics(): Promise<ReservoirStatistics> {
    if (!this.loaded) {
      await this.loadReservoirData();
    }

    const reservoirs = Array.from(this.reservoirs.values());
    
    const stats: ReservoirStatistics = {
      totalReservoirs: reservoirs.length,
      criticalCount: reservoirs.filter(r => r.status === 'critical').length,
      lowCount: reservoirs.filter(r => r.status === 'low').length,
      moderateCount: reservoirs.filter(r => r.status === 'moderate').length,
      goodCount: reservoirs.filter(r => r.status === 'good').length,
      fullCount: reservoirs.filter(r => r.status === 'full').length,
      totalCapacity: reservoirs.reduce((sum, r) => sum + r.totalCapacity, 0),
      totalCurrentStorage: reservoirs.reduce((sum, r) => sum + r.currentStorage, 0),
      averagePercentageFull: reservoirs.length > 0
        ? reservoirs.reduce((sum, r) => sum + r.percentageFull, 0) / reservoirs.length
        : 0,
    };

    return stats;
  }

  /**
   * Generate irrigation recommendations based on water availability
   */
  async getIrrigationRecommendations(district: string): Promise<IrrigationRecommendation> {
    const reservoirs = await this.getReservoirsByDistrict(district);
    
    if (reservoirs.length === 0) {
      return {
        district,
        availableWater: 0,
        recommendedCrops: ['Rainfed crops only'],
        irrigationSchedule: 'No irrigation water available',
        waterSavingTips: ['Implement rainwater harvesting', 'Use drip irrigation if possible'],
        criticalityLevel: 'high',
      };
    }

    const totalStorage = reservoirs.reduce((sum, r) => sum + r.currentStorage, 0);
    const averagePercentage = reservoirs.reduce((sum, r) => sum + r.percentageFull, 0) / reservoirs.length;

    let recommendedCrops: string[] = [];
    let irrigationSchedule = '';
    let waterSavingTips: string[] = [];
    let criticalityLevel: 'high' | 'medium' | 'low' = 'low';

    if (averagePercentage >= 60) {
      recommendedCrops = ['Paddy', 'Sugarcane', 'Banana', 'Cotton', 'Maize'];
      irrigationSchedule = 'Regular irrigation available. Follow standard crop water requirements.';
      waterSavingTips = [
        'Use drip irrigation for horticultural crops',
        'Schedule irrigation during early morning or evening',
        'Maintain field channels to prevent water loss',
      ];
      criticalityLevel = 'low';
    } else if (averagePercentage >= 40) {
      recommendedCrops = ['Groundnut', 'Millets', 'Pulses', 'Cotton', 'Maize'];
      irrigationSchedule = 'Moderate water availability. Rotate irrigation between fields.';
      waterSavingTips = [
        'Adopt drip or sprinkler irrigation',
        'Use mulching to reduce evaporation',
        'Schedule irrigation at critical crop stages only',
        'Prefer short-duration varieties',
      ];
      criticalityLevel = 'medium';
    } else {
      recommendedCrops = ['Millets', 'Pulses', 'Dry-land crops', 'Short-duration varieties'];
      irrigationSchedule = 'Limited water. Prioritize critical growth stages. Consider rainfed farming.';
      waterSavingTips = [
        'Mandatory drip irrigation',
        'Use moisture sensors',
        'Implement alternate wetting and drying',
        'Prefer drought-resistant crops',
        'Use organic mulch extensively',
      ];
      criticalityLevel = 'high';
    }

    return {
      district,
      availableWater: totalStorage,
      recommendedCrops,
      irrigationSchedule,
      waterSavingTips,
      criticalityLevel,
    };
  }

  /**
   * Load from cache
   */
  private loadFromCache(): ReservoirData[] | null {
    try {
      const cached = localStorage.getItem(RESERVOIR_CACHE_KEY);
      if (!cached) return null;

      const parsed: CachedReservoirData = JSON.parse(cached);
      const age = Date.now() - parsed.cachedAt;

      if (age > CACHE_DURATION_MS) {
        localStorage.removeItem(RESERVOIR_CACHE_KEY);
        return null;
      }

      return parsed.reservoirs;
    } catch {
      return null;
    }
  }

  /**
   * Save to cache
   */
  private saveToCache(reservoirs: ReservoirData[]): void {
    try {
      const cached: CachedReservoirData = {
        reservoirs,
        cachedAt: Date.now(),
      };
      localStorage.setItem(RESERVOIR_CACHE_KEY, JSON.stringify(cached));
    } catch (error) {
      console.warn('[ReservoirService] Failed to cache:', error);
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    try {
      localStorage.removeItem(RESERVOIR_CACHE_KEY);
      clearServiceDataCache();
      this.loaded = false;
      this.reservoirs.clear();
    } catch (error) {
      console.warn('[ReservoirService] Failed to clear cache:', error);
    }
  }

  /**
   * Check if data is loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }
}

// Singleton instance
export const reservoirService = new ReservoirService();

// Export for testing/custom instances
export default ReservoirService;
