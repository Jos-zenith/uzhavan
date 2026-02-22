/**
 * Service #1: MSME & Charter Browser
 * Government schemes for Small Enterprises & Agricultural Welfare
 * 
 * Data Sources:
 * - MSME sheet: 45+ incentive schemes for enterprises
 * - Charter sheet: 802+ agricultural welfare schemes
 * - Uses uzhavan.xlsx for offline-first caching
 */

import * as XLSX from 'xlsx';

export interface MSMEScheme {
  slNo: number;
  scheme: string;
  location: string;
  quantumOfIncentives: string;
  maximumEligibility: string;
  timeLimitForSubmission: string;
  ineligibleActivities: string;
  whoCanApply: string;
  category?: string;
  estimatedBenefit?: number;
}

export interface CharterScheme {
  component: string;
  eligibilityConditions: string;
  officerContact: string;
  department?: string;
  schemeType?: string;
  benefitAmount?: string;
}

export interface SchemeFilter {
  searchKeyword?: string;
  schemeType?: string;
  location?: string;
  minBenefit?: number;
  maxBenefit?: number;
  eligibilityStatus?: 'eligible' | 'ineligible' | 'unknown';
}

export interface EligibilityCheckResult {
  scheme: MSMEScheme | CharterScheme;
  isEligible: boolean;
  reasons: string[];
  recommendations: string[];
  nextSteps: string[];
}

export interface SchemeStatistics {
  totalMSMESchemes: number;
  totalCharterSchemes: number;
  totalBenefitAmount: number;
  schemesByCategory: Record<string, number>;
  schemesByLocation: Record<string, number>;
  averageBenefit: number;
}

/**
 * MSME Scheme Categories
 */
const MSME_CATEGORIES = {
  INFRASTRUCTURE: 'Infrastructure Support',
  CAPITAL_SUBSIDY: 'Capital Subsidy',
  EMPLOYMENT: 'Employment Support',
  TAX_EXEMPTION: 'Tax Exemption',
  EXPORT_PROMOTION: 'Export Promotion',
  SKILL_DEVELOPMENT: 'Skill Development'
};

/**
 * Charter Scheme Types
 */
const CHARTER_SCHEME_TYPES = {
  SEED_MULTIPLICATION: 'Seed Multiplication',
  BIO_FERTILIZER: 'Bio-Fertilizer',
  INSURANCE: 'Insurance',
  SUBSIDY: 'Subsidy',
  TRAINING: 'Training',
  LOAN: 'Loan Assistance',
  DIRECT_BENEFIT: 'Direct Benefit'
};

/**
 * MSME & Charter Browser Service Class
 */
export class MSMECharterService {
  private msmeSchemes: MSMEScheme[] = [];
  private charterSchemes: CharterScheme[] = [];
  private cacheKey = 'msme_charter_cache';
  private cacheDurationMs = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Initialize service with Excel data
   */
  async initialize(excelPath: string): Promise<void> {
    try {
      // Try to load from cache first
      const cached = this.loadFromCache();
      if (cached) {
        this.msmeSchemes = cached.msme;
        this.charterSchemes = cached.charter;
        return;
      }

      // Load from Excel file
      const response = await fetch(excelPath);
      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      // Parse MSME sheet
      this.msmeSchemes = this.parseMSMESheet(workbook);

      // Parse Charter sheet
      this.charterSchemes = this.parseCharterSheet(workbook);

      // Cache the data
      this.saveToCache();
    } catch (error) {
      console.warn('Failed to load from Excel, using mock data:', error);
      this.loadMockData();
    }
  }

  /**
   * Parse MSME sheet from workbook
   */
  private parseMSMESheet(workbook: XLSX.WorkBook): MSMEScheme[] {
    const worksheet = workbook.Sheets['msme'];
    if (!worksheet) return [];

    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    const schemes: MSMEScheme[] = [];

    rows.forEach((row: any, index: number) => {
      if (index < 2) return; // Skip headers

      const scheme: MSMEScheme = {
        slNo: parseFloat(row['Sl. No'] || row['Sl.No'] || row['Serial'] || index),
        scheme: row['Scheme'] || row['scheme name'] || '',
        location: row['Location of the enterprise'] || row['Location'] || '',
        quantumOfIncentives: row['Quantum of incentives'] || row['Quantum'] || '',
        maximumEligibility: row['Maximum eligibility'] || row['Max Eligibility'] || '',
        timeLimitForSubmission: row['Time limit for submission'] || row['Time limit'] || '',
        ineligibleActivities: row['Ineligible activities/Enterprises'] || row['Ineligible'] || '',
        whoCanApply: row['Who can apply'] || row['Eligibility'] || '',
        category: this.categorizeMSMEScheme(row['Scheme'] || ''),
        estimatedBenefit: this.extractBenefitAmount(row['Quantum of incentives'] || '')
      };

      if (scheme.scheme) {
        schemes.push(scheme);
      }
    });

    return schemes;
  }

  /**
   * Parse Charter sheet from workbook
   */
  private parseCharterSheet(workbook: XLSX.WorkBook): CharterScheme[] {
    const worksheet = workbook.Sheets['charter'];
    if (!worksheet) return [];

    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    const schemes: CharterScheme[] = [];

    let currentDepartment = '';

    rows.forEach((row: any, index: number) => {
      if (index < 2) return; // Skip headers

      // Extract department from first column if it changes
      const component = row['Welfare scheme components and its benefits'] || 
                       row['Scheme'] || 
                       row['Component'] || '';
      
      if (component.includes('DEPARTMENT') || component.includes('Department')) {
        currentDepartment = component;
        return;
      }

      const scheme: CharterScheme = {
        component: component,
        eligibilityConditions: row['Eligibility and conditions for availing the benefits'] || 
                              row['Eligibility'] || 
                              row['Conditions'] || '',
        officerContact: row['Officer to be contacted'] || row['Officer'] || row['Contact'] || '',
        department: currentDepartment || 'Agriculture Department',
        schemeType: this.categorizeCharterScheme(component),
        benefitAmount: this.extractBenefit(row['Eligibility and conditions for availing the benefits'] || '')
      };

      if (scheme.component) {
        schemes.push(scheme);
      }
    });

    return schemes;
  }

  /**
   * Categorize MSME scheme
   */
  private categorizeMSMEScheme(schemeName: string): string {
    const name = schemeName.toLowerCase();
    if (name.includes('infrastructure')) return MSME_CATEGORIES.INFRASTRUCTURE;
    if (name.includes('subsidy') || name.includes('capital')) return MSME_CATEGORIES.CAPITAL_SUBSIDY;
    if (name.includes('employment') || name.includes('job')) return MSME_CATEGORIES.EMPLOYMENT;
    if (name.includes('tax') || name.includes('exemption')) return MSME_CATEGORIES.TAX_EXEMPTION;
    if (name.includes('export')) return MSME_CATEGORIES.EXPORT_PROMOTION;
    if (name.includes('skill') || name.includes('training')) return MSME_CATEGORIES.SKILL_DEVELOPMENT;
    return 'Other';
  }

  /**
   * Categorize Charter scheme
   */
  private categorizeCharterScheme(component: string): string {
    const comp = component.toLowerCase();
    if (comp.includes('seed')) return CHARTER_SCHEME_TYPES.SEED_MULTIPLICATION;
    if (comp.includes('fertilizer') || comp.includes('bio')) return CHARTER_SCHEME_TYPES.BIO_FERTILIZER;
    if (comp.includes('insurance')) return CHARTER_SCHEME_TYPES.INSURANCE;
    if (comp.includes('subsidy')) return CHARTER_SCHEME_TYPES.SUBSIDY;
    if (comp.includes('training') || comp.includes('skill')) return CHARTER_SCHEME_TYPES.TRAINING;
    if (comp.includes('loan') || comp.includes('credit')) return CHARTER_SCHEME_TYPES.LOAN;
    return 'Direct Benefit';
  }

  /**
   * Extract benefit amount from text
   */
  private extractBenefitAmount(text: string): number {
    const match = text.match(/(\d+(?:\.\d+)?)\s*%/);
    if (match) return parseFloat(match[1]);
    
    const rupeeMatch = text.match(/₹?\s*(\d+(?:,\d+)*)/);
    if (rupeeMatch) return parseFloat(rupeeMatch[1].replace(/,/g, ''));
    
    return 0;
  }

  /**
   * Extract benefit description from text
   */
  private extractBenefit(text: string): string {
    const match = text.match(/[₹₹]?\s*(\d+(?:,\d+)*)/);
    return match ? match[1] : '';
  }

  /**
   * Get all MSME schemes
   */
  getAllMSMESchemes(): MSMEScheme[] {
    return this.msmeSchemes;
  }

  /**
   * Get all Charter schemes
   */
  getAllCharterSchemes(): CharterScheme[] {
    return this.charterSchemes;
  }

  /**
   * Search schemes by keyword
   */
  searchSchemes(keyword: string, type: 'msme' | 'charter' | 'both' = 'both'): (MSMEScheme | CharterScheme)[] {
    const results: (MSMEScheme | CharterScheme)[] = [];
    const lowerKeyword = keyword.toLowerCase();

    if (type === 'msme' || type === 'both') {
      results.push(
        ...this.msmeSchemes.filter(
          scheme =>
            scheme.scheme.toLowerCase().includes(lowerKeyword) ||
            scheme.location.toLowerCase().includes(lowerKeyword) ||
            scheme.whoCanApply.toLowerCase().includes(lowerKeyword)
        )
      );
    }

    if (type === 'charter' || type === 'both') {
      results.push(
        ...this.charterSchemes.filter(
          scheme =>
            scheme.component.toLowerCase().includes(lowerKeyword) ||
            scheme.eligibilityConditions.toLowerCase().includes(lowerKeyword) ||
            scheme.officerContact.toLowerCase().includes(lowerKeyword)
        )
      );
    }

    return results;
  }

  /**
   * Filter MSME schemes
   */
  filterMSMESchemes(filter: SchemeFilter): MSMEScheme[] {
    return this.msmeSchemes.filter(scheme => {
      if (filter.searchKeyword) {
        const keyword = filter.searchKeyword.toLowerCase();
        if (!scheme.scheme.toLowerCase().includes(keyword)) return false;
      }

      if (filter.schemeType && scheme.category !== filter.schemeType) return false;

      if (filter.location && !scheme.location.toLowerCase().includes(filter.location.toLowerCase())) return false;

      if (filter.minBenefit && (scheme.estimatedBenefit || 0) < filter.minBenefit) return false;

      if (filter.maxBenefit && (scheme.estimatedBenefit || 0) > filter.maxBenefit) return false;

      return true;
    });
  }

  /**
   * Filter Charter schemes
   */
  filterCharterSchemes(filter: SchemeFilter): CharterScheme[] {
    return this.charterSchemes.filter(scheme => {
      if (filter.searchKeyword) {
        const keyword = filter.searchKeyword.toLowerCase();
        if (!scheme.component.toLowerCase().includes(keyword)) return false;
      }

      if (filter.schemeType && scheme.schemeType !== filter.schemeType) return false;

      return true;
    });
  }

  /**
   * Get schemes by category
   */
  getSchemesByCategory(category: string): (MSMEScheme | CharterScheme)[] {
    const msme = this.msmeSchemes.filter(s => s.category === category);
    const charter = this.charterSchemes.filter(s => s.schemeType === category);
    return [...msme, ...charter];
  }

  /**
   * Check eligibility for a scheme
   */
  checkEligibility(scheme: MSMEScheme | CharterScheme, userProfile: any): EligibilityCheckResult {
    const reasons: string[] = [];
    const recommendations: string[] = [];
    const nextSteps: string[] = [];
    let isEligible = true;

    if ('whoCanApply' in scheme) {
      // MSME Scheme
      const eligibilityText = scheme.whoCanApply.toLowerCase();
      
      if (eligibilityText.includes('not eligible') || scheme.ineligibleActivities) {
        reasons.push(`Enterprise type restrictions: ${scheme.ineligibleActivities}`);
      }

      if (userProfile.categoryType) {
        if (eligibilityText.includes('micro') || eligibilityText.includes('small')) {
          recommendations.push('Your enterprise category matches this scheme');
        }
      }

      nextSteps.push(`Submit application within: ${scheme.timeLimitForSubmission}`);
      nextSteps.push(`Maximum eligibility: ${scheme.maximumEligibility}`);
    } else {
      // Charter Scheme
      const eligibilityText = scheme.eligibilityConditions.toLowerCase();
      reasons.push(`Eligibility: ${scheme.eligibilityConditions}`);
      nextSteps.push(`Contact: ${scheme.officerContact}`);
    }

    return {
      scheme,
      isEligible,
      reasons,
      recommendations,
      nextSteps
    };
  }

  /**
   * Get statistics
   */
  getStatistics(): SchemeStatistics {
    const msmeByCategory: Record<string, number> = {};
    const charterByType: Record<string, number> = {};
    let totalBenefit = 0;

    this.msmeSchemes.forEach(scheme => {
      const cat = scheme.category || 'Other';
      msmeByCategory[cat] = (msmeByCategory[cat] || 0) + 1;
      totalBenefit += scheme.estimatedBenefit || 0;
    });

    this.charterSchemes.forEach(scheme => {
      const type = scheme.schemeType || 'Other';
      charterByType[type] = (charterByType[type] || 0) + 1;
    });

    const categories = { ...msmeByCategory, ...charterByType };
    const avgBenefit = this.msmeSchemes.length > 0 
      ? totalBenefit / this.msmeSchemes.length 
      : 0;

    return {
      totalMSMESchemes: this.msmeSchemes.length,
      totalCharterSchemes: this.charterSchemes.length,
      totalBenefitAmount: totalBenefit,
      schemesByCategory: categories,
      schemesByLocation: this.getLocationDistribution(),
      averageBenefit: avgBenefit
    };
  }

  /**
   * Get location distribution
   */
  private getLocationDistribution(): Record<string, number> {
    const locations: Record<string, number> = {};

    this.msmeSchemes.forEach(scheme => {
      const loc = scheme.location || 'All TN';
      locations[loc] = (locations[loc] || 0) + 1;
    });

    return locations;
  }

  /**
   * Save to cache
   */
  private saveToCache(): void {
    try {
      const data = {
        msme: this.msmeSchemes,
        charter: this.charterSchemes,
        timestamp: Date.now()
      };
      localStorage.setItem(this.cacheKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to cache:', error);
    }
  }

  /**
   * Load from cache
   */
  private loadFromCache(): { msme: MSMEScheme[]; charter: CharterScheme[] } | null {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;

      const data = JSON.parse(cached);
      const isExpired = Date.now() - data.timestamp > this.cacheDurationMs;

      if (isExpired) {
        localStorage.removeItem(this.cacheKey);
        return null;
      }

      return { msme: data.msme || [], charter: data.charter || [] };
    } catch (error) {
      return null;
    }
  }

  /**
   * Load mock data for development
   */
  private loadMockData(): void {
    // Mock MSME data
    this.msmeSchemes = [
      {
        slNo: 1,
        scheme: 'Infrastructure Support Scheme',
        location: 'All SIPCOT Industrial Estates',
        quantumOfIncentives: '20% of area',
        maximumEligibility: 'No limit',
        timeLimitForSubmission: 'Ongoing',
        ineligibleActivities: 'None specified',
        whoCanApply: 'New/expansion micro, small enterprises',
        category: MSME_CATEGORIES.INFRASTRUCTURE,
        estimatedBenefit: 20
      },
      {
        slNo: 2,
        scheme: 'Capital Subsidy Scheme',
        location: 'All of Tamil Nadu',
        quantumOfIncentives: '25% subsidy',
        maximumEligibility: '₹50 lakhs',
        timeLimitForSubmission: 'Within 6 months',
        ineligibleActivities: 'Alcohol, tobacco',
        whoCanApply: 'Registered MSMEs',
        category: MSME_CATEGORIES.CAPITAL_SUBSIDY,
        estimatedBenefit: 25
      }
    ];

    // Mock Charter data
    this.charterSchemes = [
      {
        component: 'Seed Multiplication Scheme - Paddy',
        eligibilityConditions: 'Farmers with assured irrigation, 5 acre limit',
        officerContact: 'Village Level Seed Officer, Block Level',
        department: 'Agriculture Department',
        schemeType: CHARTER_SCHEME_TYPES.SEED_MULTIPLICATION,
        benefitAmount: 'Certified seeds at MSP'
      }
    ];
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    localStorage.removeItem(this.cacheKey);
  }

  /**
   * Get cache info
   */
  getCacheInfo(): { cached: boolean; date: string | null } {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return { cached: false, date: null };

      const data = JSON.parse(cached);
      return {
        cached: true,
        date: new Date(data.timestamp).toLocaleString('en-IN')
      };
    } catch {
      return { cached: false, date: null };
    }
  }
}

export default new MSMECharterService();
