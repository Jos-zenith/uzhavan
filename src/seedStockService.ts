/**
 * Service #5: Seedlings & Farm Stock Browser
 * Seed varieties, seedlings, and plants from horticultural parks
 * 
 * Data Sources:
 * - Farm Stock Report: 2,486 inventory records
 * - 41 districts across Tamil Nadu
 * - 107 horticultural parks and farms
 * - 304 distinct seedling/plant varieties
 */

import * as XLSX from 'xlsx';

export interface SeedStock {
  district: string;
  farmName: string;
  category: string;
  subCategory: string;
  totalStock: number;
  pricePerPlant: number;
  totalValue: number;
  lastUpdated: string;
  availability: 'In Stock' | 'Low Stock' | 'Out of Stock';
  farmId?: string;
}

export interface StockFilter {
  searchKeyword?: string;
  district?: string;
  farmName?: string;
  category?: string;
  minStock?: number;
  maxPrice?: number;
  updated?: string;
}

export interface StockStatistics {
  totalRecords: number;
  totalStock: number;
  totalValue: number;
  averagePrice: number;
  stockByDistrict: Record<string, number>;
  stockByCategory: Record<string, number>;
  stockByFarm: Record<string, number>;
  priceRange: { min: number; max: number };
  lastUpdateDate: string;
}

export interface LocationHierarchy {
  districts: string[];
  farmsByDistrict: Record<string, string[]>;
  categoriesByFarm: Record<string, string[]>;
}

export interface AvailabilityStatus {
  inStock: number;
  lowStock: number;
  outOfStock: number;
  totalRecords: number;
}

/**
 * Stock availability thresholds
 */
const STOCK_THRESHOLDS = {
  OUT_OF_STOCK: 0,
  LOW_STOCK: 100,
  IN_STOCK: Infinity
};

/**
 * Seedlings & Farm Stock Browser Service
 */
export class SeedStockService {
  private stockData: SeedStock[] = [];
  private locationHierarchy: LocationHierarchy = {
    districts: [],
    farmsByDistrict: {},
    categoriesByFarm: {}
  };
  private cacheKey = 'seedlings_stock_cache';
  private cacheDurationMs = 12 * 60 * 60 * 1000; // 12 hours (peak sowing season)

  /**
   * Initialize service with Excel data
   */
  async initialize(excelPath: string): Promise<void> {
    try {
      // Try to load from cache first
      const cached = this.loadFromCache();
      if (cached) {
        this.stockData = cached;
        this.buildHierarchy();
        return;
      }

      // Load from Excel file
      const response = await fetch(excelPath);
      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      // Parse main sheet
      this.parseStockSheet(workbook);

      // Build location hierarchy
      this.buildHierarchy();

      // Cache the data
      this.saveToCache();
    } catch (error) {
      console.warn('Failed to load from Excel, using mock data:', error);
      this.loadMockData();
    }
  }

  /**
   * Parse stock sheet from workbook
   */
  private parseStockSheet(workbook: XLSX.WorkBook): void {
    const worksheet = workbook.Sheets['Worksheet'] || workbook.Sheets[workbook.SheetNames[0]];
    if (!worksheet) {
      console.warn('No worksheet found');
      return;
    }

    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    this.stockData = [];

    rows.forEach((row: any) => {
      const stock: SeedStock = {
        district: row['District']?.trim() || '',
        farmName: row['Park / Farm']?.trim() || row['Farm']?.trim() || '',
        category: row['Category']?.trim() || '',
        subCategory: row['Sub-Category']?.trim() || '',
        totalStock: parseInt(row['Total Stock(in Nos)'] || row['Stock'] || '0'),
        pricePerPlant: parseFloat(row['Rate /plant (in Rs.)'] || row['Price'] || '0'),
        totalValue: parseInt(row['Value (in RS.)'] || row['Value'] || '0'),
        lastUpdated: row['Last Updated On'] || new Date().toLocaleDateString('en-IN'),
        availability: this.getAvailabilityStatus(
          parseInt(row['Total Stock(in Nos)'] || row['Stock'] || '0')
        ),
        farmId: `${row['District']?.trim()}-${row['Park / Farm']?.trim()}`.replace(/\s+/g, '_')
      };

      if (stock.district && stock.farmName && stock.category) {
        this.stockData.push(stock);
      }
    });
  }

  /**
   * Build location hierarchy for navigation
   */
  private buildHierarchy(): void {
    this.locationHierarchy = {
      districts: [],
      farmsByDistrict: {},
      categoriesByFarm: {}
    };

    // Extract unique districts
    const districts = new Set<string>();
    const farmsByDistrict: Record<string, Set<string>> = {};
    const categoriesByFarm: Record<string, Set<string>> = {};

    this.stockData.forEach((stock) => {
      districts.add(stock.district);

      // Build farms by district
      if (!farmsByDistrict[stock.district]) {
        farmsByDistrict[stock.district] = new Set();
      }
      farmsByDistrict[stock.district].add(stock.farmName);

      // Build categories by farm
      const farmKey = `${stock.district}|${stock.farmName}`;
      if (!categoriesByFarm[farmKey]) {
        categoriesByFarm[farmKey] = new Set();
      }
      categoriesByFarm[farmKey].add(stock.category);
    });

    this.locationHierarchy.districts = Array.from(districts).sort();

    // Convert sets to arrays
    Object.keys(farmsByDistrict).forEach((district) => {
      this.locationHierarchy.farmsByDistrict[district] = Array.from(
        farmsByDistrict[district]
      ).sort();
    });

    Object.keys(categoriesByFarm).forEach((farm) => {
      this.locationHierarchy.categoriesByFarm[farm] = Array.from(
        categoriesByFarm[farm]
      ).sort();
    });
  }

  /**
   * Get availability status based on stock
   */
  private getAvailabilityStatus(
    stock: number
  ): 'In Stock' | 'Low Stock' | 'Out of Stock' {
    if (stock === 0) return 'Out of Stock';
    if (stock < STOCK_THRESHOLDS.LOW_STOCK) return 'Low Stock';
    return 'In Stock';
  }

  /**
   * Get all stock records
   */
  getAllStock(): SeedStock[] {
    return this.stockData;
  }

  /**
   * Get stock by district
   */
  getStockByDistrict(district: string): SeedStock[] {
    return this.stockData.filter((s) => s.district === district);
  }

  /**
   * Get stock by farm
   */
  getStockByFarm(district: string, farmName: string): SeedStock[] {
    return this.stockData.filter((s) => s.district === district && s.farmName === farmName);
  }

  /**
   * Get stock by category
   */
  getStockByCategory(category: string): SeedStock[] {
    return this.stockData.filter((s) => s.category === category);
  }

  /**
   * Get stock by variety (sub-category)
   */
  getStockByVariety(variety: string): SeedStock[] {
    return this.stockData.filter((s) => s.subCategory === variety);
  }

  /**
   * Search stock across all fields
   */
  searchStock(keyword: string): SeedStock[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.stockData.filter(
      (s) =>
        s.district.toLowerCase().includes(lowerKeyword) ||
        s.farmName.toLowerCase().includes(lowerKeyword) ||
        s.category.toLowerCase().includes(lowerKeyword) ||
        s.subCategory.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * Filter stock with advanced criteria
   */
  filterStock(filter: StockFilter): SeedStock[] {
    let results = this.stockData;

    if (filter.searchKeyword) {
      results = results.filter(
        (s) =>
          s.category.toLowerCase().includes(filter.searchKeyword!.toLowerCase()) ||
          s.subCategory.toLowerCase().includes(filter.searchKeyword!.toLowerCase())
      );
    }

    if (filter.district) {
      results = results.filter((s) => s.district === filter.district);
    }

    if (filter.farmName) {
      results = results.filter((s) => s.farmName === filter.farmName);
    }

    if (filter.category) {
      results = results.filter((s) => s.category === filter.category);
    }

    if (filter.minStock !== undefined) {
      results = results.filter((s) => s.totalStock >= filter.minStock!);
    }

    if (filter.maxPrice !== undefined) {
      results = results.filter((s) => s.pricePerPlant <= filter.maxPrice!);
    }

    return results;
  }

  /**
   * Get location hierarchy for navigation
   */
  getLocationHierarchy(): LocationHierarchy {
    return this.locationHierarchy;
  }

  /**
   * Get varieties available at a specific farm
   */
  getVarietiesAtFarm(district: string, farmName: string): string[] {
    const farmKey = `${district}|${farmName}`;
    return this.locationHierarchy.categoriesByFarm[farmKey] || [];
  }

  /**
   * Get all categories
   */
  getAllCategories(): string[] {
    const categories = new Set<string>();
    this.stockData.forEach((s) => categories.add(s.category));
    return Array.from(categories).sort();
  }

  /**
   * Get all districts
   */
  getAllDistricts(): string[] {
    return this.locationHierarchy.districts;
  }

  /**
   * Get farms in a district
   */
  getFarmsByDistrict(district: string): string[] {
    return this.locationHierarchy.farmsByDistrict[district] || [];
  }

  /**
   * Get in-stock items (filtered)
   */
  getInStockItems(): SeedStock[] {
    return this.stockData.filter((s) => s.totalStock > 0);
  }

  /**
   * Get low-stock items
   */
  getLowStockItems(): SeedStock[] {
    return this.stockData.filter((s) => s.availability === 'Low Stock');
  }

  /**
   * Get out-of-stock items
   */
  getOutOfStockItems(): SeedStock[] {
    return this.stockData.filter((s) => s.availability === 'Out of Stock');
  }

  /**
   * Get availability overview
   */
  getAvailabilityOverview(): AvailabilityStatus {
    return {
      inStock: this.stockData.filter((s) => s.totalStock > STOCK_THRESHOLDS.LOW_STOCK).length,
      lowStock: this.stockData.filter(
        (s) => s.totalStock > 0 && s.totalStock <= STOCK_THRESHOLDS.LOW_STOCK
      ).length,
      outOfStock: this.stockData.filter((s) => s.totalStock === 0).length,
      totalRecords: this.stockData.length
    };
  }

  /**
   * Get statistics
   */
  getStatistics(): StockStatistics {
    const totalStock = this.stockData.reduce((sum, s) => sum + s.totalStock, 0);
    const totalValue = this.stockData.reduce((sum, s) => sum + s.totalValue, 0);
    const prices = this.stockData.map((s) => s.pricePerPlant).filter((p) => p > 0);

    // Stock by district
    const stockByDistrict: Record<string, number> = {};
    this.stockData.forEach((s) => {
      stockByDistrict[s.district] = (stockByDistrict[s.district] || 0) + s.totalStock;
    });

    // Stock by category
    const stockByCategory: Record<string, number> = {};
    this.stockData.forEach((s) => {
      stockByCategory[s.category] = (stockByCategory[s.category] || 0) + s.totalStock;
    });

    // Stock by farm
    const stockByFarm: Record<string, number> = {};
    this.stockData.forEach((s) => {
      const farmKey = `${s.district} - ${s.farmName}`;
      stockByFarm[farmKey] = (stockByFarm[farmKey] || 0) + s.totalStock;
    });

    return {
      totalRecords: this.stockData.length,
      totalStock,
      totalValue,
      averagePrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
      stockByDistrict,
      stockByCategory,
      stockByFarm,
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices)
      },
      lastUpdateDate: this.getLatestUpdateDate()
    };
  }

  /**
   * Get latest update date
   */
  private getLatestUpdateDate(): string {
    if (this.stockData.length === 0) return new Date().toLocaleDateString('en-IN');

    const dates = this.stockData
      .map((s) => {
        // Try to parse date in DD-MM-YYYY format
        const parts = s.lastUpdated.split('-');
        if (parts.length === 3) {
          return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
        return new Date(s.lastUpdated);
      })
      .filter((d) => !isNaN(d.getTime()));

    if (dates.length === 0) return new Date().toLocaleDateString('en-IN');

    const latest = dates.reduce((max, date) => (date > max ? date : max));
    return latest.toLocaleDateString('en-IN');
  }

  /**
   * Get varieties in a category
   */
  getVarietiesInCategory(category: string): string[] {
    const varieties = new Set<string>();
    this.stockData
      .filter((s) => s.category === category)
      .forEach((s) => varieties.add(s.subCategory));
    return Array.from(varieties).sort();
  }

  /**
   * Save to cache
   */
  private saveToCache(): void {
    try {
      const cacheData = {
        stockData: this.stockData,
        timestamp: Date.now()
      };
      localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save to cache:', error);
    }
  }

  /**
   * Load from cache
   */
  private loadFromCache(): SeedStock[] | null {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;

      const data = JSON.parse(cached);
      const isExpired = Date.now() - data.timestamp > this.cacheDurationMs;

      if (isExpired) {
        localStorage.removeItem(this.cacheKey);
        return null;
      }

      return data.stockData || [];
    } catch (error) {
      return null;
    }
  }

  /**
   * Load mock data for development
   */
  private loadMockData(): void {
    this.stockData = [
      {
        district: 'Namakkal',
        farmName: 'Regional Horticultural Park',
        category: 'Fruit seedlings',
        subCategory: 'Mango Softwood Graft',
        totalStock: 5280,
        pricePerPlant: 70,
        totalValue: 369600,
        lastUpdated: '11-11-2025',
        availability: 'In Stock',
        farmId: 'Namakkal-RHP'
      },
      {
        district: 'Erode',
        farmName: 'District Farm',
        category: 'Annual Flower seedlings',
        subCategory: 'Ixora Dwarf',
        totalStock: 1506,
        pricePerPlant: 25,
        totalValue: 37650,
        lastUpdated: '04-09-2025',
        availability: 'In Stock',
        farmId: 'Erode-DF'
      },
      {
        district: 'Coimbatore',
        farmName: 'Plant Nursery',
        category: 'Coconut Seedlings',
        subCategory: 'Tall',
        totalStock: 140,
        pricePerPlant: 0,
        totalValue: 0,
        lastUpdated: '11-11-2025',
        availability: 'Low Stock',
        farmId: 'Coimbatore-PN'
      }
    ];

    this.buildHierarchy();
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

export default new SeedStockService();
