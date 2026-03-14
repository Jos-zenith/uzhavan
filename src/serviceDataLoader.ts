const serviceDataCache = new Map<string, Promise<unknown>>();

export type ServiceDataTelemetryTracker = {
  onLoadStarted?: (path: string) => void;
  onLoadSucceeded?: (path: string, latencyMs: number, records: number) => void;
  onLoadFailed?: (path: string, latencyMs: number, errorCode: string) => void;
};

let serviceDataTelemetryTracker: ServiceDataTelemetryTracker | null = null;

export function setServiceDataTelemetryTracker(
  tracker: ServiceDataTelemetryTracker | null
): void {
  serviceDataTelemetryTracker = tracker;
}

function inferRecordsCount(payload: unknown): number {
  if (Array.isArray(payload)) {
    return payload.length;
  }

  if (!payload || typeof payload !== 'object') {
    return 1;
  }

  const record = payload as Record<string, unknown>;

  for (const value of Object.values(record)) {
    if (Array.isArray(value)) {
      return value.length;
    }
  }

  return 1;
}

async function fetchJson<T>(path: string): Promise<T> {
  if (!serviceDataCache.has(path)) {
    const start = performance.now();
    serviceDataTelemetryTracker?.onLoadStarted?.(path);

    serviceDataCache.set(
      path,
      fetch(path)
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`Failed to load ${path}: ${response.status}`);
          }

          const json = await response.json();
          const latencyMs = Math.round(performance.now() - start);
          serviceDataTelemetryTracker?.onLoadSucceeded?.(
            path,
            latencyMs,
            inferRecordsCount(json)
          );
          return json;
        })
        .catch((error) => {
          const latencyMs = Math.round(performance.now() - start);
          serviceDataTelemetryTracker?.onLoadFailed?.(
            path,
            latencyMs,
            error instanceof Error ? error.message : 'unknown_error'
          );
          serviceDataCache.delete(path);
          throw error;
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

export type DataBackedServiceCatalogItem = {
  id: string;
  name: string;
  purpose: string;
  dataRequired: string;
  localCache: string;
  offlineCapability: string;
  usageImpact: string;
  dependencies: string;
  source: 'json' | 'excel';
  sourcePath: string;
  recordCount: number;
  generatedAt?: string;
};

export type ServiceDataFilePreview = {
  id: string;
  name: string;
  sourcePath: string;
  sourceType: 'json' | 'excel';
  status: 'loaded' | 'error' | 'file-only';
  recordCount: number;
  generatedAt?: string;
  sample: unknown;
  error?: string;
};

type JsonServiceDescriptor = {
  id: string;
  name: string;
  sourcePath: string;
  purpose: string;
  dataRequired: string;
  localCache: string;
  offlineCapability: string;
  usageImpact: string;
  dependencies: string;
};

type ExcelSheetSummary = {
  sheetName: string;
  recordCount: number;
};

type ExcelSheetSummaryPayload = {
  source: string;
  generatedAt: string;
  sheets: ExcelSheetSummary[];
};

const JSON_SERVICE_DESCRIPTORS: JsonServiceDescriptor[] = [
  {
    id: 'service-1',
    name: 'Service 1: MSME & Charter Schemes',
    sourcePath: '/data/service-1-schemes.json',
    purpose: 'Enterprise incentives and charter-based agriculture welfare lookup.',
    dataRequired: 'Scheme category, district preference, and eligibility filters.',
    localCache: 'MSME and charter scheme collections from curated JSON export.',
    offlineCapability: 'Full read access offline after initial fetch.',
    usageImpact: 'Improves discovery of eligible schemes and submission confidence.',
    dependencies: 'Scheme metadata and charter records.',
  },
  {
    id: 'service-2',
    name: 'Service 2: Benefit Registration Data',
    sourcePath: '/data/service-2-benefits.json',
    purpose: 'Benefit registration and district/block mapping support.',
    dataRequired: 'District, block, and selected scheme.',
    localCache: 'District blocks, benefit schemes, and registration history.',
    offlineCapability: 'Drafting and verification data available offline.',
    usageImpact: 'Accelerates scheme enrollment with validated location mapping.',
    dependencies: 'District directory and scheme registry.',
  },
  {
    id: 'service-4',
    name: 'Service 4: Fertilizer Stock',
    sourcePath: '/data/service-4-fertilizer-stock.json',
    purpose: 'District-level fertilizer stock visibility.',
    dataRequired: 'District and fertilizer type filters.',
    localCache: 'Stock snapshots with availability status.',
    offlineCapability: 'Snapshot browsing offline.',
    usageImpact: 'Reduces travel and failed outlet visits.',
    dependencies: 'Stock update feed.',
  },
  {
    id: 'service-5',
    name: 'Service 5: Seed Stock',
    sourcePath: '/data/service-5-seed-stock.json',
    purpose: 'Seed and nursery stock exploration by district.',
    dataRequired: 'District, category, and sub-category.',
    localCache: 'Farm-wise stock, pricing, and recency fields.',
    offlineCapability: 'Snapshot browsing offline.',
    usageImpact: 'Improves sourcing decisions before on-ground procurement.',
    dependencies: 'Nursery/farm inventory updates.',
  },
  {
    id: 'service-6',
    name: 'Service 6: Machinery & Mechanics',
    sourcePath: '/data/service-6-machinery.json',
    purpose: 'Machinery hiring and mechanic discovery support.',
    dataRequired: 'District, block, and machinery type.',
    localCache: 'Machinery list, mechanic roster, and rate card.',
    offlineCapability: 'Browse contacts and pricing offline.',
    usageImpact: 'Improves farm operations planning and turnaround time.',
    dependencies: 'Machinery roster and rate datasets.',
  },
  {
    id: 'service-9',
    name: 'Service 9: Officer Visit Directory',
    sourcePath: '/data/service-9-officer-visits.json',
    purpose: 'Officer roles and visit-support mapping.',
    dataRequired: 'Designation, level, and support scope search.',
    localCache: 'Officer visit dataset with role-level guidance.',
    offlineCapability: 'Directory lookup offline.',
    usageImpact: 'Improves field coordination and escalation clarity.',
    dependencies: 'Officer directory exports.',
  },
  {
    id: 'service-10',
    name: 'Service 10: Reservoir Levels',
    sourcePath: '/data/service-10-reservoirs.json',
    purpose: 'Water level and reservoir status intelligence.',
    dataRequired: 'District, basin, river, or station filters.',
    localCache: 'Reservoir levels with flow and alert status.',
    offlineCapability: 'Snapshot access offline.',
    usageImpact: 'Supports irrigation and risk planning.',
    dependencies: 'Reservoir telemetry exports.',
  },
  {
    id: 'service-11',
    name: 'Service 11: Cross-Service Wiring Joins',
    sourcePath: '/data/service-11-wiring-joins.json',
    purpose: 'Joined insights across location, machinery, and market layers.',
    dataRequired: 'Location or crop-centric lookup keys.',
    localCache: 'Pre-joined layer datasets and summary stats.',
    offlineCapability: 'Joined insights available offline.',
    usageImpact: 'Provides richer recommendations through data joins.',
    dependencies: 'Service-layer join model outputs.',
  },
];

function extractSample(payload: unknown, sampleSize: number): unknown {
  if (Array.isArray(payload)) {
    return payload.slice(0, sampleSize);
  }

  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const source = payload as Record<string, unknown>;
  const sample: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      sample[key] = value.slice(0, sampleSize);
      continue;
    }

    sample[key] = value;
  }

  return sample;
}

export async function getServiceDataFilePreviews(
  sampleSize = 2
): Promise<ServiceDataFilePreview[]> {
  const size = Number.isFinite(sampleSize) ? Math.max(1, Math.floor(sampleSize)) : 2;

  const jsonResults = await Promise.allSettled(
    JSON_SERVICE_DESCRIPTORS.map(async (descriptor) => {
      const payload = await fetchJson<Record<string, unknown>>(descriptor.sourcePath);

      return {
        id: descriptor.id,
        name: descriptor.name,
        sourcePath: descriptor.sourcePath,
        sourceType: 'json' as const,
        status: 'loaded' as const,
        recordCount: inferRecordsCount(payload),
        generatedAt:
          typeof payload.generatedAt === 'string' ? payload.generatedAt : undefined,
        sample: extractSample(payload, size),
      };
    })
  );

  const previews: ServiceDataFilePreview[] = jsonResults.map((result, index) => {
    const descriptor = JSON_SERVICE_DESCRIPTORS[index];

    if (result.status === 'fulfilled') {
      return result.value;
    }

    return {
      id: descriptor.id,
      name: descriptor.name,
      sourcePath: descriptor.sourcePath,
      sourceType: 'json' as const,
      status: 'error' as const,
      recordCount: 0,
      sample: null,
      error:
        result.reason instanceof Error ? result.reason.message : String(result.reason),
    };
  });

  previews.push({
    id: 'excel-workbook',
    name: 'Excel Workbook: uzhavan.xlsx',
    sourcePath: '/data/uzhavan.xlsx',
    sourceType: 'excel',
    status: 'file-only',
    recordCount: 0,
    sample: null,
  });

  return previews;
}

export async function getDataBackedServiceCatalog(): Promise<DataBackedServiceCatalogItem[]> {
  const jsonResults = await Promise.allSettled(
    JSON_SERVICE_DESCRIPTORS.map(async (descriptor) => {
      const payload = await fetchJson<Record<string, unknown>>(descriptor.sourcePath);

      return {
        id: descriptor.id,
        name: descriptor.name,
        purpose: descriptor.purpose,
        dataRequired: descriptor.dataRequired,
        localCache: descriptor.localCache,
        offlineCapability: descriptor.offlineCapability,
        usageImpact: descriptor.usageImpact,
        dependencies: descriptor.dependencies,
        source: 'json' as const,
        sourcePath: descriptor.sourcePath,
        recordCount: inferRecordsCount(payload),
        generatedAt:
          typeof payload.generatedAt === 'string' ? payload.generatedAt : undefined,
      };
    })
  );

  const jsonCatalog = jsonResults.reduce<DataBackedServiceCatalogItem[]>(
    (accumulator, result) => {
      if (result.status === 'fulfilled') {
        accumulator.push(result.value);
      }
      return accumulator;
    },
    []
  );

  const workbookPath = '/data/uzhavan.xlsx';
  const summaryPath = '/data/uzhavan-sheet-summary.json';
  let excelCatalog: DataBackedServiceCatalogItem[] = [];

  try {
    const summary = await fetchJson<ExcelSheetSummaryPayload>(summaryPath);
    excelCatalog = summary.sheets.map((sheet, index) => {
      const recordCount = Math.max(0, Number(sheet.recordCount) || 0);

      return {
        id: `excel-${index + 1}`,
        name: `Excel Sheet: ${sheet.sheetName}`,
        purpose: 'Structured source sheet loaded from uzhavan.xlsx.',
        dataRequired: `Sheet columns from ${sheet.sheetName}.`,
        localCache: `Workbook sheet ${sheet.sheetName} with ${recordCount} records.`,
        offlineCapability: 'Accessible from local workbook snapshot after load.',
        usageImpact: 'Expands service discovery with full workbook coverage.',
        dependencies: 'uzhavan.xlsx',
        source: 'excel' as const,
        sourcePath: workbookPath,
        generatedAt: summary.generatedAt,
        recordCount,
      };
    }).filter((item) => item.recordCount > 0);
  } catch {
    excelCatalog = [];
  }

  return [...jsonCatalog, ...excelCatalog];
}

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
