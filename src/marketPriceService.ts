/**
 * Market Price Service for Service #7: Daily Market Price
 * Integrates agricultural market price data with offline-first caching
 */

export type MarketPrice = {
  commodity: string;
  variety?: string;
  grade?: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  priceUnit: string;
  arrivalQuantity: number;
  market: string;
  district: string;
  state: string;
  reportedDate: string;
  timestamp: number;
};

export type PriceTrend = {
  date: string;
  modalPrice: number;
  minPrice: number;
  maxPrice: number;
};

export type MarketInfo = {
  marketName: string;
  district: string;
  state: string;
  commoditiesAvailable: string[];
};

export type MarketPriceResponse = {
  prices: MarketPrice[];
  trends: PriceTrend[];
  market: MarketInfo;
  fetchedAt: number;
  source: 'api' | 'cache';
};

export type PriceComparison = {
  commodity: string;
  currentPrice: number;
  weekAgoPrice: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
};

export type SellingRecommendation = {
  commodity: string;
  recommendation: 'sell_now' | 'wait' | 'hold';
  reason: string;
  expectedTrend: string;
  confidenceLevel: 'high' | 'medium' | 'low';
};

// Tamil Nadu Major Agricultural Markets
const TAMIL_NADU_MARKETS: Record<string, { name: string; district: string }> = {
  chennai: { name: 'Chennai (Koyambedu)', district: 'Chennai' },
  coimbatore: { name: 'Coimbatore', district: 'Coimbatore' },
  madurai: { name: 'Madurai (Mattuthavani)', district: 'Madurai' },
  tiruchirappalli: { name: 'Tiruchirappalli', district: 'Tiruchirappalli' },
  salem: { name: 'Salem', district: 'Salem' },
  erode: { name: 'Erode', district: 'Erode' },
  tiruppur: { name: 'Tiruppur', district: 'Tiruppur' },
  thanjavur: { name: 'Thanjavur', district: 'Thanjavur' },
  tirunelveli: { name: 'Tirunelveli', district: 'Tirunelveli' },
  vellore: { name: 'Vellore', district: 'Vellore' },
  dindigul: { name: 'Dindigul', district: 'Dindigul' },
  karur: { name: 'Karur', district: 'Karur' },
  namakkal: { name: 'Namakkal', district: 'Namakkal' },
  theni: { name: 'Theni', district: 'Theni' },
  virudhunagar: { name: 'Virudhunagar', district: 'Virudhunagar' },
};

// Common Tamil Nadu Agricultural Commodities
const COMMODITIES = [
  'Paddy',
  'Rice',
  'Groundnut',
  'Coconut',
  'Sugarcane',
  'Cotton',
  'Turmeric',
  'Chilli',
  'Banana',
  'Tomato',
  'Onion',
  'Potato',
  'Brinjal',
  'Cauliflower',
  'Cabbage',
  'Green Gram',
  'Black Gram',
  'Red Gram',
];

const MARKET_PRICE_CACHE_KEY = 'market_price_cache_v1';
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours (prices update daily)

type CachedMarketPrice = {
  response: MarketPriceResponse;
  cachedAt: number;
};

class MarketPriceService {
  private apiKey: string;
  private baseUrl = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';

  constructor(apiKey: string = '') {
    this.apiKey = apiKey;
  }

  /**
   * Set API key after initialization
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Get all available markets
   */
  getAllMarkets(): string[] {
    return Object.values(TAMIL_NADU_MARKETS).map((m) => m.name);
  }

  /**
   * Get all commodities
   */
  getAllCommodities(): string[] {
    return [...COMMODITIES];
  }

  /**
   * Get market info by district
   */
  getMarketByDistrict(district: string): { name: string; district: string } | null {
    const normalized = district.toLowerCase().trim();
    return TAMIL_NADU_MARKETS[normalized] || null;
  }

  /**
   * Load prices from cache
   */
  private loadFromCache(cacheKey: string): MarketPriceResponse | null {
    try {
      const cached = localStorage.getItem(`${MARKET_PRICE_CACHE_KEY}_${cacheKey}`);
      if (!cached) return null;

      const parsed: CachedMarketPrice = JSON.parse(cached);
      const age = Date.now() - parsed.cachedAt;

      if (age > CACHE_DURATION_MS) {
        localStorage.removeItem(`${MARKET_PRICE_CACHE_KEY}_${cacheKey}`);
        return null;
      }

      return { ...parsed.response, source: 'cache' as const };
    } catch {
      return null;
    }
  }

  /**
   * Save prices to cache
   */
  private saveToCache(cacheKey: string, response: MarketPriceResponse): void {
    try {
      const cached: CachedMarketPrice = {
        response,
        cachedAt: Date.now(),
      };
      localStorage.setItem(`${MARKET_PRICE_CACHE_KEY}_${cacheKey}`, JSON.stringify(cached));
    } catch (error) {
      console.warn('[MarketPriceService] Failed to cache:', error);
    }
  }

  /**
   * Fetch market prices
   */
  async fetchPrices(market: string, commodity?: string): Promise<MarketPriceResponse> {
    if (!this.apiKey) {
      throw new Error('Market Price API key not configured');
    }

    const cacheKey = `${market}_${commodity || 'all'}`.toLowerCase().replace(/\s+/g, '_');
    const cached = this.loadFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Build API URL with filters
      const params = new URLSearchParams({
        'api-key': this.apiKey,
        format: 'json',
        limit: '100',
        'filters[state]': 'Tamil Nadu',
      });

      if (market) {
        params.append('filters[market]', market);
      }

      if (commodity) {
        params.append('filters[commodity]', commodity);
      }

      const url = `${this.baseUrl}?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Market Price API error: ${response.status}`);
      }

      const data = await response.json();
      const records = data.records || [];

      // Parse market prices
      const prices: MarketPrice[] = records.map((record: any) => ({
        commodity: record.commodity || '',
        variety: record.variety || '',
        grade: record.grade || '',
        minPrice: parseFloat(record.min_price) || 0,
        maxPrice: parseFloat(record.max_price) || 0,
        modalPrice: parseFloat(record.modal_price) || 0,
        priceUnit: 'Rs/Quintal',
        arrivalQuantity: parseFloat(record.arrival_tonnes) || 0,
        market: record.market || market,
        district: record.district || '',
        state: record.state || 'Tamil Nadu',
        reportedDate: record.reported_date || '',
        timestamp: new Date(record.reported_date || Date.now()).getTime(),
      }));

      // Calculate 7-day trends (mock for now, requires historical API)
      const trends = this.calculateTrends(prices);

      const marketInfo: MarketInfo = {
        marketName: market,
        district: this.getDistrictFromMarket(market),
        state: 'Tamil Nadu',
        commoditiesAvailable: Array.from(new Set(prices.map((p) => p.commodity))),
      };

      const result: MarketPriceResponse = {
        prices,
        trends,
        market: marketInfo,
        fetchedAt: Date.now(),
        source: 'api',
      };

      this.saveToCache(cacheKey, result);
      return result;
    } catch (error) {
      const cached = this.loadFromCache(cacheKey);
      if (cached) {
        console.warn('[MarketPriceService] API failed, using stale cache');
        return cached;
      }
      throw error;
    }
  }

  /**
   * Fetch prices by district
   */
  async fetchPricesByDistrict(district: string, commodity?: string): Promise<MarketPriceResponse> {
    const marketInfo = this.getMarketByDistrict(district);
    if (!marketInfo) {
      throw new Error(`No market found for district: ${district}`);
    }
    return this.fetchPrices(marketInfo.name, commodity);
  }

  /**
   * Calculate price trends (7-day)
   */
  private calculateTrends(prices: MarketPrice[]): PriceTrend[] {
    if (prices.length === 0) return [];

    // Group by commodity and calculate average
    const commodityPrices = new Map<string, number[]>();
    prices.forEach((price) => {
      if (!commodityPrices.has(price.commodity)) {
        commodityPrices.set(price.commodity, []);
      }
      commodityPrices.get(price.commodity)!.push(price.modalPrice);
    });

    // Generate mock 7-day trends (in production, fetch historical data)
    const trends: PriceTrend[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const avgModalPrice =
        prices.reduce((sum, p) => sum + p.modalPrice, 0) / prices.length || 0;

      // Add slight variation for mock trend
      const variation = (Math.random() - 0.5) * 0.1 * avgModalPrice;

      trends.push({
        date: date.toISOString().split('T')[0],
        modalPrice: avgModalPrice + variation,
        minPrice: avgModalPrice + variation - 50,
        maxPrice: avgModalPrice + variation + 50,
      });
    }

    return trends;
  }

  /**
   * Compare prices (current vs week ago)
   */
  comparePrices(response: MarketPriceResponse): PriceComparison[] {
    const comparisons: PriceComparison[] = [];
    const { prices, trends } = response;

    if (trends.length < 2) return comparisons;

    const currentPrices = new Map<string, number>();
    prices.forEach((price) => {
      currentPrices.set(price.commodity, price.modalPrice);
    });

    const weekAgoPrice = trends[0]?.modalPrice || 0;

    currentPrices.forEach((currentPrice, commodity) => {
      const change = currentPrice - weekAgoPrice;
      const changePercent = weekAgoPrice > 0 ? (change / weekAgoPrice) * 100 : 0;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (Math.abs(changePercent) < 2) {
        trend = 'stable';
      } else if (changePercent > 0) {
        trend = 'up';
      } else {
        trend = 'down';
      }

      comparisons.push({
        commodity,
        currentPrice,
        weekAgoPrice,
        change,
        changePercent,
        trend,
      });
    });

    return comparisons;
  }

  /**
   * Generate selling recommendations
   */
  generateRecommendations(response: MarketPriceResponse): SellingRecommendation[] {
    const recommendations: SellingRecommendation[] = [];
    const comparisons = this.comparePrices(response);

    comparisons.forEach((comparison) => {
      let recommendation: 'sell_now' | 'wait' | 'hold' = 'hold';
      let reason = '';
      let expectedTrend = '';
      let confidenceLevel: 'high' | 'medium' | 'low' = 'medium';

      if (comparison.trend === 'up' && comparison.changePercent > 5) {
        recommendation = 'sell_now';
        reason = `Price increased by ${comparison.changePercent.toFixed(1)}% over last week`;
        expectedTrend = 'Prices may stabilize soon';
        confidenceLevel = 'high';
      } else if (comparison.trend === 'up' && comparison.changePercent > 2) {
        recommendation = 'sell_now';
        reason = `Moderate price increase of ${comparison.changePercent.toFixed(1)}%`;
        expectedTrend = 'Gradual upward trend';
        confidenceLevel = 'medium';
      } else if (comparison.trend === 'down' && comparison.changePercent < -5) {
        recommendation = 'hold';
        reason = `Price dropped by ${Math.abs(comparison.changePercent).toFixed(1)}%`;
        expectedTrend = 'Wait for price recovery';
        confidenceLevel = 'medium';
      } else if (comparison.trend === 'stable') {
        recommendation = 'sell_now';
        reason = 'Prices are stable, good time to sell';
        expectedTrend = 'Stable prices expected';
        confidenceLevel = 'high';
      } else {
        recommendation = 'wait';
        reason = 'Price trending downward';
        expectedTrend = 'Monitor for next 2-3 days';
        confidenceLevel = 'low';
      }

      recommendations.push({
        commodity: comparison.commodity,
        recommendation,
        reason,
        expectedTrend,
        confidenceLevel,
      });
    });

    return recommendations;
  }

  /**
   * Get district from market name
   */
  private getDistrictFromMarket(market: string): string {
    const entry = Object.values(TAMIL_NADU_MARKETS).find(
      (m) => m.name.toLowerCase() === market.toLowerCase()
    );
    return entry?.district || '';
  }

  /**
   * Clear all cached prices
   */
  clearCache(): void {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(MARKET_PRICE_CACHE_KEY)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('[MarketPriceService] Failed to clear cache:', error);
    }
  }
}

// Singleton instance
export const marketPriceService = new MarketPriceService();

// Export for testing/custom instances
export default MarketPriceService;
