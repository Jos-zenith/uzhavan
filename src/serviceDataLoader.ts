const serviceDataCache = new Map<string, Promise<unknown>>();

async function fetchJson<T>(path: string): Promise<T> {
  if (!serviceDataCache.has(path)) {
    serviceDataCache.set(
      path,
      fetch(path).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${path}: ${response.status}`);
        }
        return response.json();
      })
    );
  }

  return serviceDataCache.get(path) as Promise<T>;
}

export type Service1Dataset = {
  serviceId: 1;
  generatedAt: string;
  msmeSchemes: Array<{
    slNo: number;
    scheme: string;
    location: string;
    quantumOfIncentives: string;
    maximumEligibility: string;
    timeLimitForSubmission: string;
    ineligibleActivities: string;
    whoCanApply: string;
    category: string;
  }>;
  charterSchemes: Array<{
    component: string;
    eligibilityConditions: string;
    officerContact: string;
    department: string;
    section?: string;
    schemeType?: string;
  }>;
};

export type Service2Dataset = {
  serviceId: 2;
  generatedAt: string;
  sourceDocument?: string;
  districtBlocks: Array<{
    lgdDistrictCode: string;
    districtName: string;
    lgdBlockCode: string;
    blockName: string;
  }>;
  benefitSchemes: Array<{
    schemeId: string;
    schemeName: string;
    department: string;
    schemeType: string;
    eligibilityConditions?: string;
    officerToBeContacted?: string;
    totalApplications: number;
    pending: number;
    approved: number;
    rejected: number;
    waiting: number;
  }>;
  historicalRegistrations: Array<{
    registrationId: string;
    schemeId: string;
    schemeName: string;
    registrationDate: string;
    status: 'Pending' | 'Approved';
    applicationNumber: string;
    remarks?: string;
    approvedAmount?: number;
    beneficiaryShare?: number;
    farmerDetails: {
      farmerName: string;
      mobileNumber: string;
      landArea: number;
      lgdDistrictCode: string;
      districtName: string;
      blockName: string;
      villageName?: string;
    };
  }>;
};

export type Service9Dataset = {
  serviceId: 9;
  generatedAt: string;
  sourceDocument?: string;
  officerVisitDetails: Array<{
    officerId: string;
    designation: string;
    level: string;
    visitDetails: string;
    contactScope: string;
  }>;
};

export type Service4Dataset = {
  serviceId: 4;
  generatedAt: string;
  summary: {
    districts: number;
    fertilizerTypes: number;
    totalRecords: number;
  };
  stock: Array<{
    district: string;
    fertilizerName: string;
    quantity: number;
    availability: 'In Stock' | 'Low Stock' | 'Out of Stock';
    sourceType: 'Imported' | 'Domestic' | 'Other';
    updatedOn: string;
  }>;
};

export type Service5Dataset = {
  serviceId: 5;
  generatedAt: string;
  stock: Array<{
    district: string;
    farmName: string;
    category: string;
    subCategory: string;
    totalStock: number;
    pricePerPlant: number;
    totalValue: number;
    lastUpdated: string;
    availability: 'In Stock' | 'Low Stock' | 'Out of Stock';
    farmId: string;
  }>;
};

export type Service6Dataset = {
  serviceId: 6;
  generatedAt: string;
  machinery: Array<{
    district: string;
    block: string;
    machineryType: string;
    ownerName?: string;
    contactNumber: string;
    hiringRate: number;
    availability: 'Available';
    horsepower?: number | null;
    brand?: string | null;
    model?: string | null;
    location?: string | null;
    address?: string | null;
    registrationNumber?: string | null;
    implements?: string[];
  }>;
  mechanics: Array<{
    district: string;
    block?: string | null;
    mechanicName: string;
    contactNumber: string;
    specialization: string[];
    availability: 'Available';
    workingHours?: string;
  }>;
  rateCard: Array<{
    machineryType: string;
    referenceName: string;
    hiringRate: number;
    approximateCostLakh: number;
    subsidyScstWomenLakh: number;
    subsidyOtherLakh: number;
  }>;
};

export type Service10Dataset = {
  serviceId: 10;
  generatedAt: string;
  reservoirs: Array<{
    district: string;
    block: string;
    station: string;
    riverName: string;
    damName: string;
    currentLevel: number;
    fullReservoirLevel: number;
    deadStorageLevel: number;
    totalCapacity: number;
    liveStorage: number;
    currentStorage: number;
    flowRate: number;
    inflow: number;
    outflow: number;
    percentageFull: number;
    status: 'critical' | 'low' | 'moderate' | 'good' | 'full';
    alertLevel: 'danger' | 'warning' | 'normal';
    lastUpdated: string;
    measurementTime: string;
    basin?: string;
    agency?: string;
  }>;
};

export type Service11Dataset = {
  serviceId: 11;
  generatedAt: string;
  joinModel: {
    layerA: string;
    layerB: string;
    layerC: string;
  };
  layerA_location: Array<{
    locationKey: string;
    district: string;
    block: string;
    reservoir: {
      station: string;
      status: string;
      percentageFull: number;
    };
    nursery: {
      farmName: string;
      category: string;
      availability: string;
    };
    insight: string;
  }>;
  layerB_machinery: Array<{
    locationKey: string;
    district: string;
    block: string;
    machinery: {
      type: string;
      ownerName: string;
      contactNumber: string;
      hiringRate: number;
    };
    mechanic: {
      name: string;
      contactNumber: string;
    };
    governmentSubsidy: {
      subsidyScstWomenLakh: number;
      subsidyOtherLakh: number;
    };
    insight: string;
  }>;
  layerC_market: Array<{
    cropId: string;
    cropName: string;
    market: {
      modalPrice: number;
      marketName: string;
    };
    seedSubsidy: {
      percent: number;
      source: string;
    };
    insurance: {
      deadline: string;
      source: string;
    };
    insight: string;
  }>;
  summary: {
    locationJoinRecords: number;
    machineryJoinRecords: number;
    marketJoinRecords: number;
  };
};

export function getService1Dataset(): Promise<Service1Dataset> {
  return fetchJson<Service1Dataset>('/data/service-1-schemes.json');
}

export function getService2Dataset(): Promise<Service2Dataset> {
  return fetchJson<Service2Dataset>('/data/service-2-benefits.json');
}

export function getService4Dataset(): Promise<Service4Dataset> {
  return fetchJson<Service4Dataset>('/data/service-4-fertilizer-stock.json');
}

export function getService5Dataset(): Promise<Service5Dataset> {
  return fetchJson<Service5Dataset>('/data/service-5-seed-stock.json');
}

export function getService6Dataset(): Promise<Service6Dataset> {
  return fetchJson<Service6Dataset>('/data/service-6-machinery.json');
}

export function getService10Dataset(): Promise<Service10Dataset> {
  return fetchJson<Service10Dataset>('/data/service-10-reservoirs.json');
}

export function getService11Dataset(): Promise<Service11Dataset> {
  return fetchJson<Service11Dataset>('/data/service-11-wiring-joins.json');
}

export function getService9Dataset(): Promise<Service9Dataset> {
  return fetchJson<Service9Dataset>('/data/service-9-officer-visits.json');
}

export function clearServiceDataCache(): void {
  serviceDataCache.clear();
}
