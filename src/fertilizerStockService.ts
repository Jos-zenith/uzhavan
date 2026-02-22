/**
 * Service #4: Fertilizer Stock Browser
 * Data Source: tn_fertilizer_stock.csv
 */

export type FertilizerAvailability = 'In Stock' | 'Low Stock' | 'Out of Stock';
export type FertilizerSourceType = 'Imported' | 'Domestic' | 'Other';

export interface FertilizerStock {
  district: string;
  fertilizerName: string;
  quantity: number;
  availability: FertilizerAvailability;
  sourceType: FertilizerSourceType;
  updatedOn: string;
}

export interface FertilizerStockFilter {
  district?: string;
  fertilizerName?: string;
  sourceType?: FertilizerSourceType;
  minStock?: number;
  maxStock?: number;
  searchKeyword?: string;
}

export interface FertilizerAvailabilityOverview {
  inStock: number;
  lowStock: number;
  outOfStock: number;
  totalRecords: number;
}

export interface FertilizerStockStatistics {
  totalRecords: number;
  totalQuantity: number;
  activeDistricts: number;
  activeFertilizerTypes: number;
  averageStockPerRecord: number;
  stockByDistrict: Record<string, number>;
  stockByFertilizer: Record<string, number>;
  topFertilizers: Array<{ name: string; quantity: number }>;
  topDistricts: Array<{ district: string; quantity: number }>;
}

const LOW_STOCK_THRESHOLD = 100;

export class FertilizerStockService {
  private data: FertilizerStock[] = [];
  private districtList: string[] = [];
  private fertilizerList: string[] = [];
  private readonly cacheKey = 'fertilizer_stock_cache_v1';
  private readonly cacheDurationMs = 12 * 60 * 60 * 1000;

  async initialize(csvPath: string): Promise<void> {
    try {
      const cached = this.loadFromCache();
      if (cached) {
        this.data = cached;
        this.rebuildIndexes();
        return;
      }

      const response = await fetch(csvPath);
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.status}`);
      }

      const csvText = await response.text();
      this.data = this.parseCsvToRows(csvText);

      if (!this.data.length) {
        this.loadMockData();
      }

      this.rebuildIndexes();
      this.saveToCache();
    } catch (error) {
      console.warn('Fertilizer stock initialization failed. Loading mock data.', error);
      this.loadMockData();
      this.rebuildIndexes();
    }
  }

  private parseCsvToRows(csvText: string): FertilizerStock[] {
    const lines = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      return [];
    }

    const headers = this.splitCsvLine(lines[0]);
    const districtIndex = headers.findIndex((h) => h.trim().toLowerCase() === 'district');

    if (districtIndex === -1) {
      return [];
    }

    const fertilizerColumns = headers
      .map((header, index) => ({ header: header.trim(), index }))
      .filter((entry) => entry.index !== districtIndex && entry.header.length > 0);

    const parsedRows: FertilizerStock[] = [];
    const now = new Date().toLocaleDateString('en-IN');

    for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
      const row = this.splitCsvLine(lines[lineIndex]);
      const district = (row[districtIndex] ?? '').trim();

      if (!district || district.toLowerCase() === 'total') {
        continue;
      }

      fertilizerColumns.forEach((column) => {
        const rawValue = (row[column.index] ?? '').trim();
        const quantity = this.parseNumericValue(rawValue);

        if (!Number.isFinite(quantity)) {
          return;
        }

        const stockEntry: FertilizerStock = {
          district,
          fertilizerName: column.header,
          quantity,
          availability: this.getAvailability(quantity),
          sourceType: this.getSourceType(column.header),
          updatedOn: now,
        };

        parsedRows.push(stockEntry);
      });
    }

    return parsedRows;
  }

  private splitCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  private parseNumericValue(value: string): number {
    if (!value) {
      return 0;
    }

    const cleaned = value.replace(/[^0-9.-]/g, '');
    if (!cleaned) {
      return 0;
    }

    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private getSourceType(fertilizerName: string): FertilizerSourceType {
    const lower = fertilizerName.toLowerCase();
    if (lower.includes('imported')) {
      return 'Imported';
    }
    if (lower.includes('urea') || lower.includes('dap') || lower.includes('mop')) {
      return 'Domestic';
    }
    return 'Other';
  }

  private getAvailability(quantity: number): FertilizerAvailability {
    if (quantity <= 0) {
      return 'Out of Stock';
    }
    if (quantity < LOW_STOCK_THRESHOLD) {
      return 'Low Stock';
    }
    return 'In Stock';
  }

  private rebuildIndexes(): void {
    this.districtList = Array.from(new Set(this.data.map((item) => item.district))).sort();
    this.fertilizerList = Array.from(new Set(this.data.map((item) => item.fertilizerName))).sort();
  }

  getAllStock(): FertilizerStock[] {
    return this.data;
  }

  getAllDistricts(): string[] {
    return this.districtList;
  }

  getAllFertilizers(): string[] {
    return this.fertilizerList;
  }

  getStockByDistrict(district: string): FertilizerStock[] {
    return this.data.filter((item) => item.district === district);
  }

  getStockByFertilizer(fertilizerName: string): FertilizerStock[] {
    return this.data.filter((item) => item.fertilizerName === fertilizerName);
  }

  searchStock(keyword: string): FertilizerStock[] {
    const query = keyword.trim().toLowerCase();
    if (!query) {
      return this.data;
    }

    return this.data.filter((item) => {
      return (
        item.district.toLowerCase().includes(query) ||
        item.fertilizerName.toLowerCase().includes(query) ||
        item.sourceType.toLowerCase().includes(query) ||
        item.availability.toLowerCase().includes(query)
      );
    });
  }

  filterStock(filter: FertilizerStockFilter): FertilizerStock[] {
    return this.data.filter((item) => {
      if (filter.district && item.district !== filter.district) {
        return false;
      }
      if (filter.fertilizerName && item.fertilizerName !== filter.fertilizerName) {
        return false;
      }
      if (filter.sourceType && item.sourceType !== filter.sourceType) {
        return false;
      }
      if (typeof filter.minStock === 'number' && item.quantity < filter.minStock) {
        return false;
      }
      if (typeof filter.maxStock === 'number' && item.quantity > filter.maxStock) {
        return false;
      }
      if (filter.searchKeyword) {
        const keyword = filter.searchKeyword.toLowerCase();
        const matchesKeyword =
          item.district.toLowerCase().includes(keyword) ||
          item.fertilizerName.toLowerCase().includes(keyword) ||
          item.sourceType.toLowerCase().includes(keyword);

        if (!matchesKeyword) {
          return false;
        }
      }
      return true;
    });
  }

  getInStockItems(): FertilizerStock[] {
    return this.data.filter((item) => item.availability === 'In Stock');
  }

  getLowStockItems(): FertilizerStock[] {
    return this.data.filter((item) => item.availability === 'Low Stock');
  }

  getOutOfStockItems(): FertilizerStock[] {
    return this.data.filter((item) => item.availability === 'Out of Stock');
  }

  getAvailabilityOverview(): FertilizerAvailabilityOverview {
    const inStock = this.getInStockItems().length;
    const lowStock = this.getLowStockItems().length;
    const outOfStock = this.getOutOfStockItems().length;

    return {
      inStock,
      lowStock,
      outOfStock,
      totalRecords: this.data.length,
    };
  }

  getStatistics(): FertilizerStockStatistics {
    const stockByDistrict: Record<string, number> = {};
    const stockByFertilizer: Record<string, number> = {};

    this.data.forEach((item) => {
      stockByDistrict[item.district] = (stockByDistrict[item.district] || 0) + item.quantity;
      stockByFertilizer[item.fertilizerName] =
        (stockByFertilizer[item.fertilizerName] || 0) + item.quantity;
    });

    const totalQuantity = this.data.reduce((sum, item) => sum + item.quantity, 0);
    const totalRecords = this.data.length;

    const topFertilizers = Object.entries(stockByFertilizer)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    const topDistricts = Object.entries(stockByDistrict)
      .map(([district, quantity]) => ({ district, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return {
      totalRecords,
      totalQuantity,
      activeDistricts: this.districtList.length,
      activeFertilizerTypes: this.fertilizerList.length,
      averageStockPerRecord: totalRecords ? totalQuantity / totalRecords : 0,
      stockByDistrict,
      stockByFertilizer,
      topFertilizers,
      topDistricts,
    };
  }

  getDistrictSummary(district: string): {
    district: string;
    totalQuantity: number;
    availableTypes: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
  } {
    const districtData = this.getStockByDistrict(district);

    return {
      district,
      totalQuantity: districtData.reduce((sum, item) => sum + item.quantity, 0),
      availableTypes: districtData.filter((item) => item.quantity > 0).length,
      inStock: districtData.filter((item) => item.availability === 'In Stock').length,
      lowStock: districtData.filter((item) => item.availability === 'Low Stock').length,
      outOfStock: districtData.filter((item) => item.availability === 'Out of Stock').length,
    };
  }

  clearCache(): void {
    localStorage.removeItem(this.cacheKey);
  }

  getCacheInfo(): { cached: boolean; date: string | null } {
    const raw = localStorage.getItem(this.cacheKey);
    if (!raw) {
      return { cached: false, date: null };
    }

    try {
      const parsed = JSON.parse(raw);
      return { cached: true, date: parsed.timestamp || null };
    } catch {
      return { cached: false, date: null };
    }
  }

  private saveToCache(): void {
    try {
      localStorage.setItem(
        this.cacheKey,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          data: this.data,
        })
      );
    } catch (error) {
      console.warn('Unable to cache fertilizer stock data', error);
    }
  }

  private loadFromCache(): FertilizerStock[] | null {
    try {
      const raw = localStorage.getItem(this.cacheKey);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      const timestamp = new Date(parsed.timestamp).getTime();

      if (!timestamp || Date.now() - timestamp > this.cacheDurationMs) {
        localStorage.removeItem(this.cacheKey);
        return null;
      }

      return Array.isArray(parsed.data) ? parsed.data : null;
    } catch {
      return null;
    }
  }

  private loadMockData(): void {
    const now = new Date().toLocaleDateString('en-IN');
    this.data = [
      {
        district: 'Coimbatore',
        fertilizerName: 'Urea',
        quantity: 250,
        availability: 'In Stock',
        sourceType: 'Domestic',
        updatedOn: now,
      },
      {
        district: 'Namakkal',
        fertilizerName: 'DAP',
        quantity: 65,
        availability: 'Low Stock',
        sourceType: 'Domestic',
        updatedOn: now,
      },
      {
        district: 'Erode',
        fertilizerName: 'Imported 10-26-26',
        quantity: 0,
        availability: 'Out of Stock',
        sourceType: 'Imported',
        updatedOn: now,
      },
    ];
  }
}

const fertilizerStockService = new FertilizerStockService();
export default fertilizerStockService;
