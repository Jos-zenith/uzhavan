/**
 * Benefit Registration Service
 * Service #2: Government Benefit Scheme Registration
 * Data Source: block_eng sheet from uzhavan.xlsx
 * 
 * Provides district/block mapping and benefit registration management
 */

import * as XLSX from 'xlsx';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type BlockData = {
  lgdDistrictCode: string;
  districtName: string;
  blockName: string;
  stateName?: string;
  lgdBlockCode?: string;
  population?: number;
  ruralUrban?: 'Rural' | 'Urban' | 'Mixed';
};

export type BenefitScheme = {
  schemeId: string;
  schemeName: string;
  schemeType: 'Subsidy' | 'Insurance' | 'Training' | 'Input' | 'Credit' | 'Direct Transfer';
  eligibilityCriteria: string[];
  requiredDocuments: string[];
  benefitAmount?: number;
  description: string;
  applicationDeadline?: string;
  department: string;
};

export type FarmerDetails = {
  farmerId?: string;
  farmerName: string;
  mobileNumber: string;
  aadhaarNumber?: string;
  landArea: number; // in acres
  cropType?: string;
  lgdDistrictCode: string;
  districtName: string;
  blockName: string;
  villageName?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
};

export type BenefitRegistration = {
  registrationId: string;
  farmerId?: string;
  farmerDetails: FarmerDetails;
  schemeId: string;
  schemeName: string;
  registrationDate: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Under Review' | 'Completed';
  applicationNumber?: string;
  remarks?: string;
  approvedAmount?: number;
  disbursementDate?: string;
  lastUpdated: string;
};

export type RegistrationStats = {
  totalRegistrations: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  completedCount: number;
  totalBenefitAmount: number;
  schemeWiseCount: Record<string, number>;
  districtWiseCount: Record<string, number>;
};

// ============================================================
// BENEFIT REGISTRATION SERVICE CLASS
// ============================================================

class BenefitRegistrationService {
  private blockData: BlockData[] = [];
  private cacheKey = 'victori_block_data';
  private registrationKey = 'victori_benefit_registrations';
  private cacheDuration = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Load block/district data from block_eng sheet in uzhavan.xlsx
   */
  async loadBlockData(): Promise<BlockData[]> {
    // Check cache first
    const cached = localStorage.getItem(this.cacheKey);
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < this.cacheDuration) {
        this.blockData = data;
        return data;
      }
    }

    try {
      // Fetch Excel file
      const response = await fetch('/data/uzhavan.xlsx');
      if (!response.ok) {
        throw new Error('Failed to fetch uzhavan.xlsx');
      }

      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Read block_eng sheet
      const blockSheet = workbook.Sheets['block_eng'];
      if (!blockSheet) {
        throw new Error('block_eng sheet not found in uzhavan.xlsx');
      }

      const jsonData = XLSX.utils.sheet_to_json<any>(blockSheet);

      // Parse block data
      this.blockData = jsonData.map((row) => {
        const lgdCode = String(row['LGD District Code'] || row['lgd_district_code'] || '').trim();
        const districtName = String(row['District Name'] || row['district_name'] || row['District'] || '').trim();
        const blockName = String(row['Block Name'] || row['block_name'] || row['Block'] || '').trim();

        return {
          lgdDistrictCode: lgdCode,
          districtName,
          blockName,
          stateName: String(row['State Name'] || row['state_name'] || 'Tamil Nadu').trim(),
          lgdBlockCode: String(row['LGD Block Code'] || row['lgd_block_code'] || '').trim(),
          population: Number(row['Population'] || row['population'] || 0) || undefined,
          ruralUrban: (row['Rural/Urban'] || row['Type'] || 'Rural') as any,
        };
      }).filter(block => block.lgdDistrictCode && block.districtName);

      // Cache the data
      localStorage.setItem(
        this.cacheKey,
        JSON.stringify({
          timestamp: Date.now(),
          data: this.blockData,
        })
      );

      return this.blockData;
    } catch (error) {
      console.error('Error loading block data:', error);
      throw error;
    }
  }

  /**
   * Get all unique districts
   */
  async getDistricts(): Promise<string[]> {
    if (this.blockData.length === 0) {
      await this.loadBlockData();
    }

    const districts = Array.from(
      new Set(this.blockData.map((block) => block.districtName))
    ).filter(Boolean).sort();

    return districts;
  }

  /**
   * Get blocks for a specific district
   */
  async getBlocksByDistrict(districtName: string): Promise<BlockData[]> {
    if (this.blockData.length === 0) {
      await this.loadBlockData();
    }

    return this.blockData.filter(
      (block) => block.districtName.toLowerCase() === districtName.toLowerCase()
    );
  }

  /**
   * Get block data by LGD District Code
   */
  async getBlockByLGDCode(lgdCode: string): Promise<BlockData[]> {
    if (this.blockData.length === 0) {
      await this.loadBlockData();
    }

    return this.blockData.filter(
      (block) => block.lgdDistrictCode === lgdCode
    );
  }

  /**
   * Search block by name (fuzzy search)
   */
  async searchBlock(query: string): Promise<BlockData[]> {
    if (this.blockData.length === 0) {
      await this.loadBlockData();
    }

    const lowerQuery = query.toLowerCase();
    return this.blockData.filter(
      (block) =>
        block.blockName.toLowerCase().includes(lowerQuery) ||
        block.districtName.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get all available benefit schemes
   */
  async getBenefitSchemes(): Promise<BenefitScheme[]> {
    // Tamil Nadu Government Agricultural Benefit Schemes
    return [
      {
        schemeId: 'PMKSY_2024',
        schemeName: 'Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)',
        schemeType: 'Subsidy',
        eligibilityCriteria: [
          'Must be a registered farmer',
          'Land ownership documents required',
          'Minimum 1 acre cultivable land',
        ],
        requiredDocuments: [
          'Aadhaar Card',
          'Land Ownership Certificate',
          'Bank Account Details',
          'Passport Size Photo',
        ],
        benefitAmount: 50000,
        description: 'Subsidy for drip irrigation and water conservation systems',
        department: 'Department of Agriculture',
        applicationDeadline: '2024-12-31',
      },
      {
        schemeId: 'PMFBY_2024',
        schemeName: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
        schemeType: 'Insurance',
        eligibilityCriteria: [
          'All farmers including sharecroppers and tenant farmers',
          'Must have cultivable land',
          'Premium payment required',
        ],
        requiredDocuments: [
          'Aadhaar Card',
          'Bank Account Details',
          'Land Records',
          'Sowing Certificate',
        ],
        benefitAmount: 200000,
        description: 'Crop insurance scheme covering yield losses',
        department: 'Department of Agriculture',
        applicationDeadline: '2024-06-30',
      },
      {
        schemeId: 'PMKISAN_2024',
        schemeName: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
        schemeType: 'Direct Transfer',
        eligibilityCriteria: [
          'Small and marginal farmers',
          'Maximum 2 hectares landholding',
          'Bank account linked to Aadhaar',
        ],
        requiredDocuments: [
          'Aadhaar Card',
          'Bank Account Details',
          'Land Ownership Records',
        ],
        benefitAmount: 6000,
        description: 'Direct income support of ₹6000 per year in three installments',
        department: 'Department of Agriculture & Farmers Welfare',
      },
      {
        schemeId: 'TNFSP_2024',
        schemeName: 'Tamil Nadu Free Seed Distribution Program',
        schemeType: 'Input',
        eligibilityCriteria: [
          'Registered Tamil Nadu farmers',
          'Minimum 0.5 acre land',
          'First-come-first-served basis',
        ],
        requiredDocuments: [
          'Aadhaar Card',
          'Farmer Registration ID',
          'Land Records',
        ],
        description: 'Free distribution of high-quality seeds to farmers',
        department: 'Tamil Nadu Agriculture Department',
      },
      {
        schemeId: 'KCC_2024',
        schemeName: 'Kisan Credit Card (KCC)',
        schemeType: 'Credit',
        eligibilityCriteria: [
          'Farmers owning cultivable land',
          'Good credit history',
          'Age: 18-75 years',
        ],
        requiredDocuments: [
          'Aadhaar Card',
          'PAN Card',
          'Land Ownership Documents',
          'Bank Account Details',
        ],
        benefitAmount: 300000,
        description: 'Credit facility for agricultural needs at subsidized interest rates',
        department: 'Banking and Financial Services',
      },
      {
        schemeId: 'SMAM_2024',
        schemeName: 'Sub-Mission on Agricultural Mechanization (SMAM)',
        schemeType: 'Subsidy',
        eligibilityCriteria: [
          'Small and marginal farmers',
          'SC/ST/Women farmers get priority',
          'Land ownership required',
        ],
        requiredDocuments: [
          'Aadhaar Card',
          'Caste Certificate (if applicable)',
          'Land Records',
          'Bank Account Details',
        ],
        benefitAmount: 80000,
        description: 'Subsidy on farm machinery and equipment purchase',
        department: 'Department of Agriculture',
      },
      {
        schemeId: 'ATMA_2024',
        schemeName: 'Agricultural Technology Management Agency (ATMA)',
        schemeType: 'Training',
        eligibilityCriteria: [
          'All farmers and agricultural workers',
          'Interest in modern farming techniques',
        ],
        requiredDocuments: [
          'Aadhaar Card',
          'Photo ID',
        ],
        description: 'Free training on modern agricultural practices and technology',
        department: 'Department of Agriculture',
      },
    ];
  }

  /**
   * Register a farmer for a benefit scheme
   */
  async registerBenefit(
    farmerDetails: FarmerDetails,
    schemeId: string
  ): Promise<BenefitRegistration> {
    // Generate registration ID
    const registrationId = `REG${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Get scheme details
    const schemes = await this.getBenefitSchemes();
    const scheme = schemes.find((s) => s.schemeId === schemeId);
    if (!scheme) {
      throw new Error('Invalid scheme ID');
    }

    // Create registration
    const registration: BenefitRegistration = {
      registrationId,
      farmerId: farmerDetails.farmerId,
      farmerDetails,
      schemeId,
      schemeName: scheme.schemeName,
      registrationDate: new Date().toISOString(),
      status: 'Pending',
      applicationNumber: `APP${Date.now()}`,
      lastUpdated: new Date().toISOString(),
    };

    // Save to localStorage
    const registrations = this.getRegistrationsFromStorage();
    registrations.push(registration);
    localStorage.setItem(this.registrationKey, JSON.stringify(registrations));

    return registration;
  }

  /**
   * Get all registrations for a farmer
   */
  async getRegistrationsByFarmer(farmerId: string): Promise<BenefitRegistration[]> {
    const registrations = this.getRegistrationsFromStorage();
    return registrations.filter(
      (reg) => reg.farmerId === farmerId || reg.farmerDetails.farmerId === farmerId
    );
  }

  /**
   * Get all registrations by mobile number
   */
  async getRegistrationsByMobile(mobileNumber: string): Promise<BenefitRegistration[]> {
    const registrations = this.getRegistrationsFromStorage();
    return registrations.filter(
      (reg) => reg.farmerDetails.mobileNumber === mobileNumber
    );
  }

  /**
   * Get registration by ID
   */
  async getRegistrationById(registrationId: string): Promise<BenefitRegistration | null> {
    const registrations = this.getRegistrationsFromStorage();
    return registrations.find((reg) => reg.registrationId === registrationId) || null;
  }

  /**
   * Update registration status
   */
  async updateRegistrationStatus(
    registrationId: string,
    status: BenefitRegistration['status'],
    remarks?: string,
    approvedAmount?: number,
    disbursementDate?: string
  ): Promise<BenefitRegistration> {
    const registrations = this.getRegistrationsFromStorage();
    const index = registrations.findIndex((reg) => reg.registrationId === registrationId);

    if (index === -1) {
      throw new Error('Registration not found');
    }

    registrations[index].status = status;
    registrations[index].lastUpdated = new Date().toISOString();

    if (remarks) registrations[index].remarks = remarks;
    if (approvedAmount !== undefined) registrations[index].approvedAmount = approvedAmount;
    if (disbursementDate) registrations[index].disbursementDate = disbursementDate;

    localStorage.setItem(this.registrationKey, JSON.stringify(registrations));

    return registrations[index];
  }

  /**
   * Get registration statistics
   */
  async getRegistrationStats(): Promise<RegistrationStats> {
    const registrations = this.getRegistrationsFromStorage();

    const stats: RegistrationStats = {
      totalRegistrations: registrations.length,
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      completedCount: 0,
      totalBenefitAmount: 0,
      schemeWiseCount: {},
      districtWiseCount: {},
    };

    registrations.forEach((reg) => {
      // Count by status
      if (reg.status === 'Pending') stats.pendingCount++;
      else if (reg.status === 'Approved') stats.approvedCount++;
      else if (reg.status === 'Rejected') stats.rejectedCount++;
      else if (reg.status === 'Completed') stats.completedCount++;

      // Total benefit amount
      if (reg.approvedAmount) {
        stats.totalBenefitAmount += reg.approvedAmount;
      }

      // Count by scheme
      stats.schemeWiseCount[reg.schemeName] =
        (stats.schemeWiseCount[reg.schemeName] || 0) + 1;

      // Count by district
      const district = reg.farmerDetails.districtName;
      stats.districtWiseCount[district] = (stats.districtWiseCount[district] || 0) + 1;
    });

    return stats;
  }

  /**
   * Get all registrations (admin view)
   */
  async getAllRegistrations(): Promise<BenefitRegistration[]> {
    return this.getRegistrationsFromStorage();
  }

  /**
   * Delete a registration
   */
  async deleteRegistration(registrationId: string): Promise<boolean> {
    const registrations = this.getRegistrationsFromStorage();
    const filtered = registrations.filter((reg) => reg.registrationId !== registrationId);

    if (filtered.length === registrations.length) {
      return false; // Not found
    }

    localStorage.setItem(this.registrationKey, JSON.stringify(filtered));
    return true;
  }

  /**
   * Helper: Get registrations from localStorage
   */
  private getRegistrationsFromStorage(): BenefitRegistration[] {
    const stored = localStorage.getItem(this.registrationKey);
    if (!stored) return [];

    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  /**
   * Export registrations to CSV format
   */
  async exportRegistrationsToCSV(): Promise<string> {
    const registrations = this.getRegistrationsFromStorage();

    const headers = [
      'Registration ID',
      'Application Number',
      'Farmer Name',
      'Mobile Number',
      'District',
      'Block',
      'Scheme Name',
      'Status',
      'Registration Date',
      'Approved Amount',
      'Remarks',
    ].join(',');

    const rows = registrations.map((reg) =>
      [
        reg.registrationId,
        reg.applicationNumber || '',
        reg.farmerDetails.farmerName,
        reg.farmerDetails.mobileNumber,
        reg.farmerDetails.districtName,
        reg.farmerDetails.blockName,
        reg.schemeName,
        reg.status,
        new Date(reg.registrationDate).toLocaleDateString(),
        reg.approvedAmount || '',
        reg.remarks || '',
      ].join(',')
    );

    return [headers, ...rows].join('\n');
  }

  /**
   * Clear cache (force reload)
   */
  clearCache(): void {
    localStorage.removeItem(this.cacheKey);
    this.blockData = [];
  }
}

// ============================================================
// EXPORT SINGLETON
// ============================================================

export const benefitRegistrationService = new BenefitRegistrationService();
