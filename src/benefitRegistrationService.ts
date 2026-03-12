/**
 * Benefit Registration Service
 * Service #2: Government Benefit Scheme Registration
 * Data Source: block_eng sheet from uzhavan.xlsx
 * 
 * Provides district/block mapping and benefit registration management
 */

import {
  clearServiceDataCache,
  getService2Dataset,
  type Service2Dataset,
} from './serviceDataLoader';

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
  private benefitSchemes: BenefitScheme[] = [];
  private historicalRegistrations: BenefitRegistration[] = [];
  private datasetPromise: Promise<Service2Dataset> | null = null;
  private cacheKey = 'victori_block_data_v2';
  private registrationKey = 'victori_benefit_registrations';
  private cacheDuration = 24 * 60 * 60 * 1000; // 24 hours

  private async getDataset(): Promise<Service2Dataset> {
    if (!this.datasetPromise) {
      this.datasetPromise = getService2Dataset();
    }

    return this.datasetPromise;
  }

  private normalizeSchemeType(
    schemeType: string
  ): BenefitScheme['schemeType'] {
    switch (schemeType) {
      case 'Insurance':
      case 'Training':
      case 'Input':
      case 'Credit':
      case 'Direct Transfer':
        return schemeType;
      default:
        return 'Subsidy';
    }
  }

  private buildEligibilityCriteria(record: Service2Dataset['benefitSchemes'][number]): string[] {
    if (record.eligibilityConditions) {
      const fromDataset = record.eligibilityConditions
        .split(/\s*(?:\u2022|\n|\r|;|\.|\d+\))\s*/)
        .map((item) => item.trim())
        .filter((item) => item.length > 10)
        .slice(0, 6);

      if (fromDataset.length > 0) {
        return fromDataset;
      }
    }

    return [
      'Farmer registration and identity verification required.',
      `Administered through ${record.department}.`,
      `${record.totalApplications.toLocaleString()} total applications available in source records.`,
    ];
  }

  private buildRequiredDocuments(record: Service2Dataset['benefitSchemes'][number]): string[] {
    const documents = ['Aadhaar Card', 'Bank Account Details'];

    if (record.schemeType === 'Subsidy' || record.schemeType === 'Input') {
      documents.push('Land Records');
    }

    if (record.schemeType === 'Insurance') {
      documents.push('Crop Sowing Details');
    }

    if (record.schemeType === 'Credit') {
      documents.push('Income / Credit Proof');
    }

    return documents;
  }

  private mapHistoricalRegistration(
    record: Service2Dataset['historicalRegistrations'][number]
  ): BenefitRegistration {
    return {
      registrationId: record.registrationId,
      farmerDetails: {
        farmerName: record.farmerDetails.farmerName,
        mobileNumber: record.farmerDetails.mobileNumber,
        landArea: record.farmerDetails.landArea,
        lgdDistrictCode: record.farmerDetails.lgdDistrictCode,
        districtName: record.farmerDetails.districtName,
        blockName: record.farmerDetails.blockName,
        villageName: record.farmerDetails.villageName,
      },
      schemeId: record.schemeId,
      schemeName: record.schemeName,
      registrationDate: record.registrationDate,
      status: record.status,
      applicationNumber: record.applicationNumber,
      remarks: record.remarks,
      approvedAmount: record.approvedAmount,
      lastUpdated: record.registrationDate,
    };
  }

  private mergeRegistrations(localRegistrations: BenefitRegistration[]): BenefitRegistration[] {
    const merged = new Map<string, BenefitRegistration>();

    this.historicalRegistrations.forEach((registration) => {
      merged.set(registration.registrationId, registration);
    });

    localRegistrations.forEach((registration) => {
      merged.set(registration.registrationId, registration);
    });

    return Array.from(merged.values()).sort(
      (left, right) =>
        new Date(right.registrationDate).getTime() - new Date(left.registrationDate).getTime()
    );
  }

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
      const dataset = await this.getDataset();
      this.blockData = dataset.districtBlocks
        .map((row) => ({
          lgdDistrictCode: row.lgdDistrictCode,
          districtName: row.districtName,
          blockName: row.blockName,
          stateName: 'Tamil Nadu',
          lgdBlockCode: row.lgdBlockCode,
          ruralUrban: 'Rural' as const,
        }))
        .filter((block) => block.lgdDistrictCode && block.districtName && block.blockName);

      this.historicalRegistrations = dataset.historicalRegistrations.map((record) =>
        this.mapHistoricalRegistration(record)
      );

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
    if (this.benefitSchemes.length > 0) {
      return this.benefitSchemes;
    }

    const dataset = await this.getDataset();
    this.benefitSchemes = dataset.benefitSchemes.map((record) => ({
      schemeId: record.schemeId,
      schemeName: record.schemeName,
      schemeType: this.normalizeSchemeType(record.schemeType),
      eligibilityCriteria: this.buildEligibilityCriteria(record),
      requiredDocuments: this.buildRequiredDocuments(record),
      benefitAmount: undefined,
      description: record.officerToBeContacted
        ? `Officer to be contacted: ${record.officerToBeContacted}`
        : `${record.approved.toLocaleString()} approved, ${record.pending.toLocaleString()} pending, ${record.rejected.toLocaleString()} rejected applications in the extracted source data.`,
      department: record.department,
      applicationDeadline: undefined,
    }));

    if (this.historicalRegistrations.length === 0) {
      this.historicalRegistrations = dataset.historicalRegistrations.map((record) =>
        this.mapHistoricalRegistration(record)
      );
    }

    return this.benefitSchemes;
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
    const registrations = await this.getAllRegistrations();
    return registrations.filter(
      (reg) => reg.farmerId === farmerId || reg.farmerDetails.farmerId === farmerId
    );
  }

  /**
   * Get all registrations by mobile number
   */
  async getRegistrationsByMobile(mobileNumber: string): Promise<BenefitRegistration[]> {
    const registrations = await this.getAllRegistrations();
    return registrations.filter(
      (reg) => reg.farmerDetails.mobileNumber === mobileNumber
    );
  }

  /**
   * Get registration by ID
   */
  async getRegistrationById(registrationId: string): Promise<BenefitRegistration | null> {
    const registrations = await this.getAllRegistrations();
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
      const historical = await this.getRegistrationById(registrationId);
      if (!historical) {
        throw new Error('Registration not found');
      }

      const updatedHistorical: BenefitRegistration = {
        ...historical,
        status,
        lastUpdated: new Date().toISOString(),
      };

      if (remarks) updatedHistorical.remarks = remarks;
      if (approvedAmount !== undefined) updatedHistorical.approvedAmount = approvedAmount;
      if (disbursementDate) updatedHistorical.disbursementDate = disbursementDate;

      registrations.push(updatedHistorical);
      localStorage.setItem(this.registrationKey, JSON.stringify(registrations));
      return updatedHistorical;
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
    const registrations = await this.getAllRegistrations();

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
    if (this.historicalRegistrations.length === 0) {
      const dataset = await this.getDataset();
      this.historicalRegistrations = dataset.historicalRegistrations.map((record) =>
        this.mapHistoricalRegistration(record)
      );
    }

    return this.mergeRegistrations(this.getRegistrationsFromStorage());
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
    const registrations = await this.getAllRegistrations();

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
    clearServiceDataCache();
    this.blockData = [];
    this.benefitSchemes = [];
    this.historicalRegistrations = [];
    this.datasetPromise = null;
  }
}

// ============================================================
// EXPORT SINGLETON
// ============================================================

export const benefitRegistrationService = new BenefitRegistrationService();
