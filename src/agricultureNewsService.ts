/**
 * Service #11: Agriculture News
 * Department updates, technology bulletins, and agricultural advisories
 * 
 * Primary Sources:
 * - TNAU Press Notes (Tamil Nadu Agricultural University)
 * - TN Agricultural Department Advisories
 * - Technology Bulletins & Best Practices
 * 
 * Features:
 * - Fetch agriculture news from multiple sources
 * - Offline caching (7-day localStorage cache)
 * - Search and filter by category
 * - categorization: Department Updates, Tech Bulletins, Advisories
 * - Full Article Reading
 */

export interface NewsArticle {
  newsId: string;
  title: string;
  description: string;
  content?: string;
  category: NewsCategory;
  date: string;
  source: NewsSource;
  imageUrl?: string;
  pdfLink?: string;
  readMoreUrl: string;
  author?: string;
  crops?: string[];
  districts?: string[];
  severity?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface NewsCategory {
  type: 'DEPARTMENT_UPDATE' | 'TECH_BULLETIN' | 'ADVISORY' | 'TRAINING' | 'INNOVATION' | 'POLICY';
  name: string;
}

export interface NewsSource {
  name: string;
  abbreviation: string;
  url: string;
  category: 'UNIVERSITY' | 'GOVERNMENT' | 'RESEARCH' | 'NGO';
}

export interface NewsFilter {
  category?: string;
  source?: string;
  crops?: string[];
  dateRange?: {
    from: string;
    to: string;
  };
  searchKeyword?: string;
}

export interface NewsStatistics {
  totalArticles: number;
  categoryCounts: Record<string, number>;
  sourceCounts: Record<string, number>;
  latestUpdate: string;
  topCrops: string[];
  topDistricts: string[];
}

/**
 * News Sources Configuration
 */
const NEWS_SOURCES: Record<string, NewsSource> = {
  TNAU: {
    name: 'Tamil Nadu Agricultural University',
    abbreviation: 'TNAU',
    url: 'https://agritech.tnau.ac.in/tnaupressnotes/pnindex2026.html',
    category: 'UNIVERSITY'
  },
  TNAGRI: {
    name: 'TN Agricultural Department',
    abbreviation: 'TNAGRI',
    url: 'https://agriculture.tn.gov.in/',
    category: 'GOVERNMENT'
  },
  ICAR: {
    name: 'Indian Council of Agricultural Research',
    abbreviation: 'ICAR',
    url: 'https://www.icar.org.in/',
    category: 'RESEARCH'
  },
  TNAHD: {
    name: 'TN Horticulture Department',
    abbreviation: 'TNAHD',
    url: 'https://horticulture.tn.gov.in/',
    category: 'GOVERNMENT'
  }
};

/**
 * Sample News Database (Offline Cache)
 * Contains TNAU press notes and advisories
 */
const AGRICULTURE_NEWS_DATABASE: NewsArticle[] = [
  {
    newsId: 'NEWS_2026_02_17_001',
    title: 'TNAU Conducted Workshop on Worldwide Carbon Markets and Emerging Opportunities',
    description: 'TNAU organized a comprehensive workshop exploring global carbon markets and their emerging opportunities for agricultural stakeholders.',
    category: { type: 'TECH_BULLETIN', name: 'Technology Bulletin' },
    date: '2026-02-17',
    source: NEWS_SOURCES.TNAU,
    pdfLink: 'https://agritech.tnau.ac.in/tnaupressnotes/pdf/2026/TNAU%20conducted%20Workshop%20on%20Worldwide%20Carbon%20Markets%20and%20Emerging%20Opportunities%20-%20Eng.pdf',
    readMoreUrl: 'https://agritech.tnau.ac.in/tnaupressnotes/pnindex2026.html',
    author: 'TNAU',
    crops: ['General Agriculture'],
    severity: 'MEDIUM'
  },
  {
    newsId: 'NEWS_2026_02_17_002',
    title: 'TNAU Received Patent for Sugarcane Single Bud Sett Cutter',
    description: 'TNAU has received patent protection for their innovative sugarcane single bud sett cutter technology, improving sugarcane propagation efficiency.',
    category: { type: 'INNOVATION', name: 'Innovation' },
    date: '2026-02-17',
    source: NEWS_SOURCES.TNAU,
    crops: ['Sugarcane'],
    pdfLink: 'https://agritech.tnau.ac.in/tnaupressnotes/pdf/2026/TNAU%20received%20patent%20for%20Sugarcane%20single%20bud%20sett%20cutter%20-%20Eng.pdf',
    readMoreUrl: 'https://agritech.tnau.ac.in/tnaupressnotes/pnindex2026.html',
    author: 'TNAU',
    severity: 'HIGH'
  },
  {
    newsId: 'NEWS_2026_02_13_001',
    title: 'TNAU Conducted Training on Value Addition and Marketing of Traditional Minor Millet Varieties',
    description: 'A training program was organized focusing on value addition techniques and marketing strategies for traditional minor millet varieties to enhance farmer income.',
    category: { type: 'TRAINING', name: 'Training Program' },
    date: '2026-02-13',
    source: NEWS_SOURCES.TNAU,
    crops: ['Millets', 'Minor Millets'],
    pdfLink: 'https://agritech.tnau.ac.in/tnaupressnotes/pdf/2026/TNAU%20conducted%20Training%20on%20value%20addition%20and%20marketing%20of%20traditional%20minor%20millet%20varieties%20-%20Eng.pdf',
    readMoreUrl: 'https://agritech.tnau.ac.in/tnaupressnotes/pnindex2026.html',
    author: 'TNAU',
    severity: 'MEDIUM'
  },
  {
    newsId: 'NEWS_2026_02_09_001',
    title: 'TNAU Conducts Training cum Awareness Programme for Farmers',
    description: 'TNAU conducted an integrated training and awareness program targeting farmers on modern agricultural practices and technology adoption.',
    category: { type: 'TRAINING', name: 'Training Program' },
    date: '2026-02-09',
    source: NEWS_SOURCES.TNAU,
    crops: ['General Agriculture'],
    pdfLink: 'https://agritech.tnau.ac.in/tnaupressnotes/pdf/2026/TNAU%20conducts%20training%20cum%20awareness%20programme%20for%20farmers.pdf',
    readMoreUrl: 'https://agritech.tnau.ac.in/tnaupressnotes/pnindex2026.html',
    author: 'TNAU',
    severity: 'MEDIUM'
  },
  {
    newsId: 'NEWS_2026_02_07_001',
    title: 'TNAU Hosts National Science Day',
    description: 'TNAU successfully organized the National Science Day celebration, highlighting agricultural research innovations and achievements.',
    category: { type: 'DEPARTMENT_UPDATE', name: 'Department Update' },
    date: '2026-02-07',
    source: NEWS_SOURCES.TNAU,
    pdfLink: 'https://agritech.tnau.ac.in/tnaupressnotes/pdf/2026/TNAU%20Hosts%20National%20Science%20Day%20-%20Eng.pdf',
    readMoreUrl: 'https://agritech.tnau.ac.in/tnaupressnotes/pnindex2026.html',
    author: 'TNAU',
    severity: 'LOW'
  },
  {
    newsId: 'NEWS_2026_02_07_002',
    title: 'TNAU Conducts Training on Value Added Products from Millets',
    description: 'Educational training session on processing and creating value-added products from various millet varieties for commercial benefit.',
    category: { type: 'TRAINING', name: 'Training Program' },
    date: '2026-02-07',
    source: NEWS_SOURCES.TNAU,
    crops: ['Millets'],
    pdfLink: 'https://agritech.tnau.ac.in/tnaupressnotes/pdf/2026/TNAU%20conducts%20Training%20on%20Value%20Added%20Products%20from%20Millets%20-%20Eng.pdf',
    readMoreUrl: 'https://agritech.tnau.ac.in/tnaupressnotes/pnindex2026.html',
    author: 'TNAU',
    severity: 'MEDIUM'
  },
  {
    newsId: 'NEWS_2026_01_31_001',
    title: 'TNAU Offers One Day Training on Mushroom Cultivation',
    description: 'One-day intensive training program on mushroom cultivation techniques for farmers interested in diversifying their income sources.',
    category: { type: 'TRAINING', name: 'Training Program' },
    date: '2026-01-31',
    source: NEWS_SOURCES.TNAU,
    crops: ['Mushroom', 'Horticulture'],
    pdfLink: 'https://agritech.tnau.ac.in/tnaupressnotes/pdf/2026/TNAU%20offers%20one%20day%20training%20on%20%E2%80%9CMushroom%20Cultivation%E2%80%9D%20-%20Eng.pdf',
    readMoreUrl: 'https://agritech.tnau.ac.in/tnaupressnotes/pnindex2026.html',
    author: 'TNAU',
    severity: 'MEDIUM'
  },
  {
    newsId: 'NEWS_2026_01_31_002',
    title: 'TNAU Conducts Training on Microgreen Production and Value Addition',
    description: 'Training focused on microgreen production techniques and value-added product development for urban and peri-urban farming.',
    category: { type: 'TRAINING', name: 'Training Program' },
    date: '2026-01-31',
    source: NEWS_SOURCES.TNAU,
    crops: ['Vegetables', 'Microgreens'],
    pdfLink: 'https://agritech.tnau.ac.in/tnaupressnotes/pdf/2026/TNAU%20conducts%20Training%20on%20Microgreen%20production%20and%20Value%20addition%20-%20Eng.pdf',
    readMoreUrl: 'https://agritech.tnau.ac.in/tnaupressnotes/pnindex2026.html',
    author: 'TNAU',
    severity: 'MEDIUM'
  },
  {
    newsId: 'NEWS_2026_01_30_001',
    title: 'TNAU Conducts Training on Export Potentials and Opportunities in Fresh Fruits & Vegetables',
    description: 'Training program on export guidelines, quality standards, and market opportunities for fresh fruits and vegetables.',
    category: { type: 'DEPARTMENT_UPDATE', name: 'Department Update' },
    date: '2026-01-30',
    source: NEWS_SOURCES.TNAU,
    crops: ['Fruits', 'Vegetables'],
    pdfLink: 'https://agritech.tnau.ac.in/tnaupressnotes/pdf/2026/TNAU%20conducts%20training%20on%20Export%20potentials%20and%20opportunities%20in%20Fresh%20Fruits%20&%20Vegetables-english.pdf',
    readMoreUrl: 'https://agritech.tnau.ac.in/tnaupressnotes/pnindex2026.html',
    author: 'TNAU',
    severity: 'HIGH'
  },
  {
    newsId: 'NEWS_2026_01_24_001',
    title: 'TNAU Conducted Training Programme on STCR Based Fertilizer Prescription for Various Crops',
    description: 'Advanced training on Soil Test Crop Response (STCR) methodology for precise fertilizer recommendations across different crops.',
    category: { type: 'TECH_BULLETIN', name: 'Technology Bulletin' },
    date: '2026-01-24',
    source: NEWS_SOURCES.TNAU,
    crops: ['General Agriculture'],
    pdfLink: 'https://agritech.tnau.ac.in/tnaupressnotes/pdf/2026/TNAU%20conducted%20Training%20Programme%20on%20%E2%80%9CSTCR%20Based%20Fertilizer%20Prescription%20for%20Various%20Crops%E2%80%9D%20-%20Eng.pdf',
    readMoreUrl: 'https://agritech.tnau.ac.in/tnaupressnotes/pnindex2026.html',
    author: 'TNAU',
    severity: 'HIGH'
  },
  {
    newsId: 'NEWS_2026_01_21_001',
    title: 'TNAU Conducted Training on Cotton Variety Suitable for Mechanization',
    description: 'Specialized training on mechanization-suitable cotton varieties and adoption strategies for large-scale farming.',
    category: { type: 'TRAINING', name: 'Training Program' },
    date: '2026-01-21',
    source: NEWS_SOURCES.TNAU,
    crops: ['Cotton'],
    pdfLink: 'https://agritech.tnau.ac.in/tnaupressnotes/pdf/2026/TNAU%20Conducted%20Training%20on%20Cotton%20Variety%20Suitable%20for%20Mechanization%20-%20english.pdf',
    readMoreUrl: 'https://agritech.tnau.ac.in/tnaupressnotes/pnindex2026.html',
    author: 'TNAU',
    severity: 'MEDIUM'
  },
  {
    newsId: 'NEWS_2026_01_21_002',
    title: 'TNAU Conducts National Workshop on Tracking the Carbon Footprint',
    description: 'National workshop addressing carbon footprint tracking in agriculture and sustainable farming practices.',
    category: { type: 'TECH_BULLETIN', name: 'Technology Bulletin' },
    date: '2026-01-21',
    source: NEWS_SOURCES.TNAU,
    crops: ['General Agriculture'],
    pdfLink: 'https://agritech.tnau.ac.in/tnaupressnotes/pdf/2026/TNAU%20conducts%20National%20Workshop%20on%20%E2%80%9CTracking%20the%20Carbon%20Footprint%E2%80%9D%20-%20Eng.pdf',
    readMoreUrl: 'https://agritech.tnau.ac.in/tnaupressnotes/pnindex2026.html',
    author: 'TNAU',
    severity: 'HIGH'
  },
  {
    newsId: 'NEWS_2026_01_19_001',
    title: 'TNAU Training on Mass Production and Use of Predators and Parasitoids',
    description: 'Specialised training on biocontrol agents for integrated pest management using natural predators and parasitoids.',
    category: { type: 'TRAINING', name: 'Training Program' },
    date: '2026-01-19',
    source: NEWS_SOURCES.TNAU,
    crops: ['General Agriculture'],
    pdfLink: 'https://agritech.tnau.ac.in/tnaupressnotes/pdf/2026/TNAU%20training%20on%20%E2%80%9CMass%20production%20and%20use%20of%20predators%20and%20parasitoids%E2%80%9D%20-%20Eng.pdf',
    readMoreUrl: 'https://agritech.tnau.ac.in/tnaupressnotes/pnindex2026.html',
    author: 'TNAU',
    severity: 'HIGH'
  },
  {
    newsId: 'NEWS_2026_01_05_001',
    title: 'TNAU Conducts One Day Training on Organic Farming',
    description: 'One-day intensive training on organic farming practices, certification, and market opportunities.',
    category: { type: 'TRAINING', name: 'Training Program' },
    date: '2026-01-05',
    source: NEWS_SOURCES.TNAU,
    crops: ['General Agriculture'],
    pdfLink: 'https://agritech.tnau.ac.in/tnaupressnotes/pdf/2025/TNAU%20conducts%20One%20day%20Training%20on%20Organic%20Farming%20-%20Eng.pdf',
    readMoreUrl: 'https://agritech.tnau.ac.in/tnaupressnotes/pnindex2026.html',
    author: 'TNAU',
    severity: 'MEDIUM'
  },
  {
    newsId: 'NEWS_2026_01_03_001',
    title: 'TNAU Offers One Day Training on Bee Keeping',
    description: 'One-day training program on modern beekeeping techniques, hive management, and honey production.',
    category: { type: 'TRAINING', name: 'Training Program' },
    date: '2026-01-03',
    source: NEWS_SOURCES.TNAU,
    crops: ['Apiculture', 'Bee Keeping'],
    pdfLink: 'https://agritech.tnau.ac.in/tnaupressnotes/pdf/2025/TNAU%20offers%20one%20day%20training%20on%20%E2%80%9Cbee%20keeping%E2%80%9D%20-%20Eng.pdf',
    readMoreUrl: 'https://agritech.tnau.ac.in/tnaupressnotes/pnindex2026.html',
    author: 'TNAU',
    severity: 'MEDIUM'
  }
];

/**
 * Agriculture News Service Class
 */
export class AgricultureNewsService {
  private cacheKey = 'agriculture_news_cache';
  private cacheExpiryKey = 'agriculture_news_cache_expiry';
  private cacheDurationMs = 7 * 24 * 60 * 60 * 1000; // 7 days

  /**
   * Get all news articles with optional filtering
   */
  async getAllNews(filter?: NewsFilter): Promise<NewsArticle[]> {
    let articles = await this.getCachedNews();
    
    if (!articles || articles.length === 0) {
      articles = AGRICULTURE_NEWS_DATABASE;
      this.cacheNews(articles);
    }

    return this.filterNews(articles, filter);
  }

  /**
   * Search news by keyword
   */
  async searchNews(keyword: string): Promise<NewsArticle[]> {
    const articles = await this.getAllNews();
    const lowerKeyword = keyword.toLowerCase();

    return articles.filter(article =>
      article.title.toLowerCase().includes(lowerKeyword) ||
      article.description.toLowerCase().includes(lowerKeyword) ||
      (article.content && article.content.toLowerCase().includes(lowerKeyword)) ||
      (article.crops && article.crops.some(crop => crop.toLowerCase().includes(lowerKeyword)))
    );
  }

  /**
   * Get news by category
   */
  async getNewsByCategory(categoryType: string): Promise<NewsArticle[]> {
    const articles = await this.getAllNews();
    return articles.filter(article => article.category.type === categoryType);
  }

  /**
   * Get news by source
   */
  async getNewsBySource(sourceName: string): Promise<NewsArticle[]> {
    const articles = await this.getAllNews();
    return articles.filter(article => article.source.abbreviation === sourceName);
  }

  /**
   * Get news by crop
   */
  async getNewsByCrop(crop: string): Promise<NewsArticle[]> {
    const articles = await this.getAllNews();
    return articles.filter(article =>
      article.crops && article.crops.some(c => c.toLowerCase().includes(crop.toLowerCase()))
    );
  }

  /**
   * Get recent news (last N days)
   */
  async getRecentNews(days: number = 30): Promise<NewsArticle[]> {
    const articles = await this.getAllNews();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return articles
      .filter(article => new Date(article.date) >= cutoffDate)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Get trending topics
   */
  async getTrendingTopics(): Promise<string[]> {
    const articles = await this.getAllNews();
    const keywords: Record<string, number> = {};

    articles.forEach(article => {
      const words = article.title.split(' ').filter(w => w.length > 5);
      words.forEach(word => {
        keywords[word] = (keywords[word] || 0) + 1;
      });
    });

    return Object.entries(keywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Get featured article
   */
  async getFeaturedArticle(): Promise<NewsArticle | null> {
    const articles = await this.getRecentNews(7);
    if (articles.length === 0) return null;
    
    const highSeverity = articles.filter(a => a.severity === 'HIGH');
    return highSeverity.length > 0 ? highSeverity[0] : articles[0];
  }

  /**
   * Get news statistics
   */
  async getNewsStatistics(): Promise<NewsStatistics> {
    const articles = await this.getAllNews();

    const categoryCounts: Record<string, number> = {};
    const sourceCounts: Record<string, number> = {};
    const cropCounts: Record<string, number> = {};
    const districtCounts: Record<string, number> = {};

    articles.forEach(article => {
      categoryCounts[article.category.type] = (categoryCounts[article.category.type] || 0) + 1;
      sourceCounts[article.source.abbreviation] = (sourceCounts[article.source.abbreviation] || 0) + 1;
      
      if (article.crops) {
        article.crops.forEach(crop => {
          cropCounts[crop] = (cropCounts[crop] || 0) + 1;
        });
      }
      
      if (article.districts) {
        article.districts.forEach(district => {
          districtCounts[district] = (districtCounts[district] || 0) + 1;
        });
      }
    });

    const sortedCrops = Object.entries(cropCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([crop]) => crop);

    const sortedDistricts = Object.entries(districtCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([district]) => district);

    return {
      totalArticles: articles.length,
      categoryCounts,
      sourceCounts,
      latestUpdate: articles.length > 0 
        ? articles[0].date 
        : new Date().toISOString().split('T')[0],
      topCrops: sortedCrops,
      topDistricts: sortedDistricts
    };
  }

  /**
   * Get news sources
   */
  getNewsSources(): NewsSource[] {
    return Object.values(NEWS_SOURCES);
  }

  /**
   * Get advisory-type news (high priority)
   */
  async getAdvisories(): Promise<NewsArticle[]> {
    const articles = await this.getAllNews();
    return articles
      .filter(article => article.category.type === 'ADVISORY' || article.severity === 'HIGH')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Cache news articles in localStorage
   */
  private cacheNews(articles: NewsArticle[]): void {
    try {
      const cacheData = {
        articles,
        timestamp: Date.now()
      };
      localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Failed to cache news:', error);
    }
  }

  /**
   * Get cached news articles
   */
  private getCachedNews(): NewsArticle[] | null {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const timestamp = cacheData.timestamp || 0;
      const isExpired = Date.now() - timestamp > this.cacheDurationMs;

      if (isExpired) {
        localStorage.removeItem(this.cacheKey);
        return null;
      }

      return cacheData.articles || null;
    } catch (error) {
      console.error('Failed to retrieve cached news:', error);
      return null;
    }
  }

  /**
   * Filter news articles
   */
  private filterNews(articles: NewsArticle[], filter?: NewsFilter): NewsArticle[] {
    if (!filter) return articles;

    let filtered = articles;

    if (filter.category) {
      filtered = filtered.filter(a => a.category.type === filter.category);
    }

    if (filter.source) {
      filtered = filtered.filter(a => a.source.abbreviation === filter.source);
    }

    if (filter.crops && filter.crops.length > 0) {
      filtered = filtered.filter(a =>
        a.crops && a.crops.some(crop =>
          filter.crops!.some(c => crop.toLowerCase().includes(c.toLowerCase()))
        )
      );
    }

    if (filter.dateRange) {
      filtered = filtered.filter(a => {
        const date = new Date(a.date);
        const from = new Date(filter.dateRange!.from);
        const to = new Date(filter.dateRange!.to);
        return date >= from && date <= to;
      });
    }

    if (filter.searchKeyword) {
      const keyword = filter.searchKeyword.toLowerCase();
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(keyword) ||
        a.description.toLowerCase().includes(keyword) ||
        (a.content && a.content.toLowerCase().includes(keyword))
      );
    }

    return filtered.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    try {
      localStorage.removeItem(this.cacheKey);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Get cache info
   */
  getCacheInfo(): { isCached: boolean; cacheDate: string | null } {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) {
        return { isCached: false, cacheDate: null };
      }

      const cacheData = JSON.parse(cached);
      const cacheDate = new Date(cacheData.timestamp).toLocaleString();
      return { isCached: true, cacheDate };
    } catch (error) {
      return { isCached: false, cacheDate: null };
    }
  }
}

export default new AgricultureNewsService();
