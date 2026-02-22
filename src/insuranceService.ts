/**
 * Insurance Service for Service #13: Insurance Premium Calculator
 * Direct integration with PMFBY (Pradhan Mantri Fasal Bima Yojana)
 */

export type CropInsuranceType = 'kharif' | 'rabi' | 'annual_horticultural' | 'annual_commercial';

export type CropCategory = 
  | 'food_crops'
  | 'oilseeds'
  | 'annual_commercial'
  | 'annual_horticultural'
  | 'perennial_horticultural';

export type InsuranceCrop = {
  name: string;
  category: CropCategory;
  season: CropInsuranceType[];
  sumInsuredPerHectare: number; // in Rs
  farmerPremiumRate: number; // percentage
};

export type PremiumCalculation = {
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

export type InsuranceScheme = {
  schemeName: string;
  description: string;
  eligibility: string[];
  coverage: string[];
  keyFeatures: string[];
  claimProcess: string[];
  documents: string[];
};

export type InsuranceProvider = {
  name: string;
  state: string;
  districts: string[];
  contactNumber: string;
  email: string;
  website: string;
};

// Tamil Nadu Common Crops with PMFBY Premium Rates
const TAMIL_NADU_CROPS: Record<string, InsuranceCrop> = {
  paddy: {
    name: 'Paddy',
    category: 'food_crops',
    season: ['kharif', 'rabi'],
    sumInsuredPerHectare: 35000,
    farmerPremiumRate: 2.0, // 2% for food crops
  },
  groundnut: {
    name: 'Groundnut',
    category: 'oilseeds',
    season: ['kharif', 'rabi'],
    sumInsuredPerHectare: 40000,
    farmerPremiumRate: 2.0, // 2% for oilseeds
  },
  cotton: {
    name: 'Cotton',
    category: 'annual_commercial',
    season: ['kharif'],
    sumInsuredPerHectare: 45000,
    farmerPremiumRate: 5.0, // 5% for annual commercial/horticultural
  },
  sugarcane: {
    name: 'Sugarcane',
    category: 'annual_commercial',
    season: ['annual_commercial'],
    sumInsuredPerHectare: 80000,
    farmerPremiumRate: 5.0,
  },
  maize: {
    name: 'Maize',
    category: 'food_crops',
    season: ['kharif', 'rabi'],
    sumInsuredPerHectare: 30000,
    farmerPremiumRate: 2.0,
  },
  blackGram: {
    name: 'Black Gram',
    category: 'food_crops',
    season: ['kharif', 'rabi'],
    sumInsuredPerHectare: 28000,
    farmerPremiumRate: 2.0,
  },
  redGram: {
    name: 'Red Gram',
    category: 'food_crops',
    season: ['kharif'],
    sumInsuredPerHectare: 32000,
    farmerPremiumRate: 2.0,
  },
  banana: {
    name: 'Banana',
    category: 'annual_horticultural',
    season: ['annual_horticultural'],
    sumInsuredPerHectare: 100000,
    farmerPremiumRate: 5.0,
  },
  turmeric: {
    name: 'Turmeric',
    category: 'annual_horticultural',
    season: ['annual_horticultural'],
    sumInsuredPerHectare: 60000,
    farmerPremiumRate: 5.0,
  },
  chilli: {
    name: 'Chilli',
    category: 'annual_horticultural',
    season: ['kharif', 'rabi'],
    sumInsuredPerHectare: 50000,
    farmerPremiumRate: 5.0,
  },
  coconut: {
    name: 'Coconut',
    category: 'perennial_horticultural',
    season: ['annual_horticultural'],
    sumInsuredPerHectare: 120000,
    farmerPremiumRate: 5.0,
  },
  mango: {
    name: 'Mango',
    category: 'perennial_horticultural',
    season: ['annual_horticultural'],
    sumInsuredPerHectare: 90000,
    farmerPremiumRate: 5.0,
  },
};

// PMFBY Scheme Details
const PMFBY_SCHEME: InsuranceScheme = {
  schemeName: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
  description: 'Comprehensive crop insurance scheme providing financial support to farmers suffering crop loss/damage',
  eligibility: [
    'All farmers including sharecroppers and tenant farmers',
    'Compulsory for loanee farmers',
    'Voluntary for non-loanee farmers',
    'Coverage available for notified crops in notified areas',
  ],
  coverage: [
    'Prevented Sowing/Planting Risk - Due to deficit rainfall or adverse seasonal conditions',
    'Standing Crop (Sowing to Harvesting) - Comprehensive risk coverage for non-preventable risks',
    'Post-Harvest Losses - Coverage up to maximum 14 days from harvesting',
    'Localized Calamities - Hailstorm, Landslide, Inundation affecting isolated farms',
    'Wildlife Attack - Add-on coverage in localized areas',
  ],
  keyFeatures: [
    'Low premium rates: 2% for Kharif, 1.5% for Rabi food & oilseed crops, 5% for commercial/horticultural crops',
    'No upper limit on government subsidy',
    'Use of technology (Smartphones, Drones, Satellite imagery) for crop loss assessment',
    'One insurance unit = Village/Village Panchayat level',
    'Sum insured equals Scale of finance per hectare',
    'Minimum 25% crop loss required for claim (for localized risks)',
  ],
  claimProcess: [
    '1. Crop loss intimation within 72 hours of loss occurrence',
    '2. Call toll-free number or notify through app/portal',
    '3. Insurance company conducts loss assessment',
    '4. Claim amount calculated based on threshold yield',
    '5. Payment directly to farmer\'s bank account',
    '6. Timeline: Within 2 months of harvest/crop cutting experiments',
  ],
  documents: [
    'Land records (7/12, 8A, RTC, etc.)',
    'Aadhaar Card',
    'Bank Account details (with passbook)',
    'Loan documents (for loanee farmers)',
    'Receipt of premium payment',
    'Declaration form',
  ],
};

// Insurance Providers in Tamil Nadu
const TN_INSURANCE_PROVIDERS: InsuranceProvider[] = [
  {
    name: 'Agriculture Insurance Company of India Ltd (AIC)',
    state: 'Tamil Nadu',
    districts: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Erode'],
    contactNumber: '1800-116-515',
    email: 'support@aicofindia.com',
    website: 'https://www.aicofindia.com',
  },
  {
    name: 'ICICI Lombard General Insurance',
    state: 'Tamil Nadu',
    districts: ['Chennai', 'Vellore', 'Thanjavur', 'Dindigul'],
    contactNumber: '1800-266-7766',
    email: 'cropsupport@icicilombard.com',
    website: 'https://www.icicilombard.com',
  },
  {
    name: 'Reliance General Insurance',
    state: 'Tamil Nadu',
    districts: ['Chennai', 'Tirunelveli', 'Kanyakumari', 'Virudhunagar'],
    contactNumber: '1800-3009',
    email: 'rgi.customercare@relianceada.com',
    website: 'https://www.reliancegeneral.co.in',
  },
];

const INSURANCE_CACHE_KEY = 'insurance_calculation_cache_v1';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

type CachedCalculation = {
  calculation: PremiumCalculation;
  cachedAt: number;
};

class InsuranceService {
  private pmfbyUrl = 'https://pmfby.gov.in/';
  private calculatorUrl = 'https://pmfby.gov.in/rpt/statewise_data_farmer_report_detail/30'; // Tamil Nadu

  /**
   * Get all available crops
   */
  getAllCrops(): InsuranceCrop[] {
    return Object.values(TAMIL_NADU_CROPS);
  }

  /**
   * Get crop by name
   */
  getCropByName(cropName: string): InsuranceCrop | null {
    const normalized = cropName.toLowerCase().replace(/\s+/g, '');
    const entry = Object.entries(TAMIL_NADU_CROPS).find(
      ([key, crop]) =>
        key.toLowerCase() === normalized ||
        crop.name.toLowerCase().replace(/\s+/g, '') === normalized
    );
    return entry ? entry[1] : null;
  }

  /**
   * Get crops by season
   */
  getCropsBySeason(season: CropInsuranceType): InsuranceCrop[] {
    return Object.values(TAMIL_NADU_CROPS).filter((crop) =>
      crop.season.includes(season)
    );
  }

  /**
   * Calculate insurance premium
   */
  calculatePremium(
    cropName: string,
    season: CropInsuranceType,
    areaInHectares: number
  ): PremiumCalculation | null {
    const crop = this.getCropByName(cropName);
    if (!crop) return null;

    if (!crop.season.includes(season)) {
      return null;
    }

    const sumInsured = crop.sumInsuredPerHectare * areaInHectares;
    const farmerPremiumAmount = (sumInsured * crop.farmerPremiumRate) / 100;
    
    // Government subsidy covers the difference between actuarial premium and farmer premium
    // Assuming actuarial rate is typically 12-15% for most crops
    const estimatedActuarialRate = 12;
    const totalPremium = (sumInsured * estimatedActuarialRate) / 100;
    const governmentSubsidy = totalPremium - farmerPremiumAmount;

    const coverageDetails = `Covers ${crop.name} for ${season} season against prevented sowing, standing crop losses, post-harvest losses, and localized calamities`;

    const calculation: PremiumCalculation = {
      cropName: crop.name,
      season,
      areaInHectares,
      sumInsured,
      farmerPremiumRate: crop.farmerPremiumRate,
      farmerPremiumAmount,
      governmentSubsidy,
      totalPremium,
      coverageDetails,
      calculatedAt: Date.now(),
    };

    this.saveToCache(calculation);
    return calculation;
  }

  /**
   * Get PMFBY scheme details
   */
  getSchemeDetails(): InsuranceScheme {
    return { ...PMFBY_SCHEME };
  }

  /**
   * Get insurance providers for district
   */
  getProvidersByDistrict(district: string): InsuranceProvider[] {
    const normalized = district.toLowerCase().trim();
    return TN_INSURANCE_PROVIDERS.filter((provider) =>
      provider.districts.some((d) => d.toLowerCase() === normalized)
    );
  }

  /**
   * Get all insurance providers
   */
  getAllProviders(): InsuranceProvider[] {
    return [...TN_INSURANCE_PROVIDERS];
  }

  /**
   * Open PMFBY portal in new window
   */
  openPMFBYPortal(): void {
    window.open(this.pmfbyUrl, '_blank', 'noopener,noreferrer');
  }

  /**
   * Open PMFBY calculator for Tamil Nadu
   */
  openPMFBYCalculator(): void {
    window.open(this.calculatorUrl, '_blank', 'noopener,noreferrer');
  }

  /**
   * Generate farmer registration link
   */
  getRegistrationUrl(): string {
    return 'https://pmfby.gov.in/farmerRegistration';
  }

  /**
   * Generate claim intimation link
   */
  getClaimIntimationUrl(): string {
    return 'https://pmfby.gov.in/claimIntimation';
  }

  /**
   * Get toll-free helpline
   */
  getHelpline(): string {
    return '1800-180-1551';
  }

  /**
   * Load calculation from cache
   */
  private loadFromCache(key: string): PremiumCalculation | null {
    try {
      const cached = localStorage.getItem(`${INSURANCE_CACHE_KEY}_${key}`);
      if (!cached) return null;

      const parsed: CachedCalculation = JSON.parse(cached);
      const age = Date.now() - parsed.cachedAt;

      if (age > CACHE_DURATION_MS) {
        localStorage.removeItem(`${INSURANCE_CACHE_KEY}_${key}`);
        return null;
      }

      return parsed.calculation;
    } catch {
      return null;
    }
  }

  /**
   * Save calculation to cache
   */
  private saveToCache(calculation: PremiumCalculation): void {
    try {
      const key = `${calculation.cropName}_${calculation.season}_${calculation.areaInHectares}`;
      const cached: CachedCalculation = {
        calculation,
        cachedAt: Date.now(),
      };
      localStorage.setItem(
        `${INSURANCE_CACHE_KEY}_${key.toLowerCase().replace(/\s+/g, '_')}`,
        JSON.stringify(cached)
      );
    } catch (error) {
      console.warn('[InsuranceService] Failed to cache calculation:', error);
    }
  }

  /**
   * Clear all cached calculations
   */
  clearCache(): void {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(INSURANCE_CACHE_KEY)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('[InsuranceService] Failed to clear cache:', error);
    }
  }

  /**
   * Get recent calculations from cache
   */
  getRecentCalculations(): PremiumCalculation[] {
    try {
      const calculations: PremiumCalculation[] = [];
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(INSURANCE_CACHE_KEY)) {
          const cached = localStorage.getItem(key);
          if (cached) {
            const parsed: CachedCalculation = JSON.parse(cached);
            const age = Date.now() - parsed.cachedAt;
            if (age <= CACHE_DURATION_MS) {
              calculations.push(parsed.calculation);
            }
          }
        }
      });
      return calculations.sort((a, b) => b.calculatedAt - a.calculatedAt);
    } catch {
      return [];
    }
  }

  /**
   * Get PMFBY portal URL
   */
  getPMFBYUrl(): string {
    return this.pmfbyUrl;
  }
}

// Singleton instance
export const insuranceService = new InsuranceService();

// Export for testing/custom instances
export default InsuranceService;
