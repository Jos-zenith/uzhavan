/**
 * Agriculture News Screen Component
 * Service #11: Department updates, technology bulletins, and agricultural advisories
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import agricultureNewsService, {
  NewsArticle,
  NewsFilter,
  NewsStatistics,
  NewsSource
} from './agricultureNewsService';
import './styles/agricultureNews.css';

interface UseCategoryNews {
  loading: boolean;
  error: string | null;
  latestNews: NewsArticle[];
  searchResults: NewsArticle[];
  categoryNews: NewsArticle[];
  statistics: NewsStatistics | null;
  sources: NewsSource[];
  selectedArticle: NewsArticle | null;
  searchKeyword: string;
  selectedCategory: string;
  selectedSource: string;
  selectedCrop: string;
  dateRange: { from: string; to: string };
  isCached: boolean;
  cacheDate: string | null;
  fetchLatestNews: () => Promise<void>;
  handleSearch: (keyword: string) => Promise<void>;
  handleCategoryFilter: (category: string) => Promise<void>;
  handleSourceFilter: (source: string) => Promise<void>;
  handleCropFilter: (crop: string) => Promise<void>;
  handleDateRangeFilter: (from: string, to: string) => Promise<void>;
  selectArticle: (article: NewsArticle | null) => void;
  clearFilters: () => Promise<void>;
  refreshNews: () => Promise<void>;
  openArticle: (article: NewsArticle) => void;
  getAllCrops: () => string[];
}

/**
 * Custom Hook: useAgricultureNews
 */
function useAgricultureNews(): UseCategoryNews {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestNews, setLatestNews] = useState<NewsArticle[]>([]);
  const [searchResults, setSearchResults] = useState<NewsArticle[]>([]);
  const [categoryNews, setCategoryNews] = useState<NewsArticle[]>([]);
  const [statistics, setStatistics] = useState<NewsStatistics | null>(null);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [isCached, setIsCached] = useState(false);
  const [cacheDate, setCacheDate] = useState<string | null>(null);

  // Initialize data
  useEffect(() => {
    fetchLatestNews();
    const cacheInfo = agricultureNewsService.getCacheInfo();
    setIsCached(cacheInfo.isCached);
    setCacheDate(cacheInfo.cacheDate);
  }, []);

  const fetchLatestNews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [news, stats, srcs] = await Promise.all([
        agricultureNewsService.getRecentNews(30),
        agricultureNewsService.getNewsStatistics(),
        Promise.resolve(agricultureNewsService.getNewsSources())
      ]);

      setLatestNews(news);
      setStatistics(stats);
      setSources(srcs);

      const cacheInfo = agricultureNewsService.getCacheInfo();
      setIsCached(cacheInfo.isCached);
      setCacheDate(cacheInfo.cacheDate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch news');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(async (keyword: string) => {
    try {
      setSearchKeyword(keyword);
      if (keyword.trim()) {
        const results = await agricultureNewsService.searchNews(keyword);
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    }
  }, []);

  const handleCategoryFilter = useCallback(async (category: string) => {
    try {
      setSelectedCategory(category);
      if (category) {
        const results = await agricultureNewsService.getNewsByCategory(category);
        setCategoryNews(results);
      } else {
        setCategoryNews([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Filter failed');
    }
  }, []);

  const handleSourceFilter = useCallback(async (source: string) => {
    try {
      setSelectedSource(source);
      // Re-fetch with source filter
      const all = await agricultureNewsService.getAllNews();
      const filtered = source
        ? all.filter((a: NewsArticle) => a.source.abbreviation === source)
        : all;
      setLatestNews(filtered.sort((a: NewsArticle, b: NewsArticle) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Filter failed');
    }
  }, []);

  const handleCropFilter = useCallback(async (crop: string) => {
    try {
      setSelectedCrop(crop);
      if (crop) {
        const results = await agricultureNewsService.getNewsByCrop(crop);
        setLatestNews(results);
      } else {
        await fetchLatestNews();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Filter failed');
    }
  }, [fetchLatestNews]);

  const handleDateRangeFilter = useCallback(async (from: string, to: string) => {
    try {
      setDateRange({ from, to });
      if (from && to) {
        const all = await agricultureNewsService.getAllNews({
          dateRange: { from, to }
        });
        setLatestNews(all);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Filter failed');
    }
  }, []);

  const clearFilters = useCallback(async () => {
    setSearchKeyword('');
    setSelectedCategory('');
    setSelectedSource('');
    setSelectedCrop('');
    setDateRange({ from: '', to: '' });
    setSearchResults([]);
    setCategoryNews([]);
    setSelectedArticle(null);
    await fetchLatestNews();
  }, [fetchLatestNews]);

  const refreshNews = useCallback(async () => {
    agricultureNewsService.clearCache();
    await fetchLatestNews();
  }, [fetchLatestNews]);

  const openArticle = useCallback((article: NewsArticle) => {
    if (article.pdfLink) {
      window.open(article.pdfLink, '_blank');
    } else if (article.readMoreUrl) {
      window.open(article.readMoreUrl, '_blank');
    }
  }, []);

  const getAllCrops = useCallback((): string[] => {
    const crops = new Set<string>();
    latestNews.forEach((article: NewsArticle) => {
      if (article.crops) {
        article.crops.forEach((crop: string) => crops.add(crop));
      }
    });
    return Array.from(crops).sort();
  }, [latestNews]);

  return {
    loading,
    error,
    latestNews,
    searchResults,
    categoryNews,
    statistics,
    sources,
    selectedArticle,
    searchKeyword,
    selectedCategory,
    selectedSource,
    selectedCrop,
    dateRange,
    isCached,
    cacheDate,
    fetchLatestNews,
    handleSearch,
    handleCategoryFilter,
    handleSourceFilter,
    handleCropFilter,
    handleDateRangeFilter,
    selectArticle: setSelectedArticle,
    clearFilters,
    refreshNews,
    openArticle,
    getAllCrops
  };
}

/**
 * Main Agriculture News Screen Component
 */
export const AgricultureNewsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'latest' | 'search' | 'categories' | 'statistics' | 'sources'>('latest');
  const state = useAgricultureNews();

  const categoryOptions = [
    { type: 'DEPARTMENT_UPDATE', name: 'Department Updates' },
    { type: 'TECH_BULLETIN', name: 'Technology Bulletins' },
    { type: 'ADVISORY', name: 'Advisories' },
    { type: 'TRAINING', name: 'Training Programs' },
    { type: 'INNOVATION', name: 'Innovations' },
    { type: 'POLICY', name: 'Policy Updates' }
  ];

  if (state.loading) {
    return <div className="news-loading">Loading agriculture news...</div>;
  }

  return (
    <div className="agriculture-news-container">
      <div className="news-header">
        <h1>🌾 Agriculture News & Updates</h1>
        <p>Department updates, technology bulletins, and agricultural advisories</p>
        {state.isCached && state.cacheDate && (
          <div className="cache-info">
            📦 Cached: {state.cacheDate}
            <button onClick={state.refreshNews} className="refresh-btn">Refresh</button>
          </div>
        )}
      </div>

      <div className="news-tabs">
        <button
          className={`tab-button ${activeTab === 'latest' ? 'active' : ''}`}
          onClick={() => setActiveTab('latest')}
        >
          📰 Latest News
        </button>
        <button
          className={`tab-button ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          🔍 Search & Filter
        </button>
        <button
          className={`tab-button ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          📂 Categories
        </button>
        <button
          className={`tab-button ${activeTab === 'statistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('statistics')}
        >
          📊 Statistics
        </button>
        <button
          className={`tab-button ${activeTab === 'sources' ? 'active' : ''}`}
          onClick={() => setActiveTab('sources')}
        >
          📖 Sources
        </button>
      </div>

      {state.error && (
        <div className="error-banner">
          ⚠️ {state.error}
        </div>
      )}

      {/* Latest News Tab */}
      {activeTab === 'latest' && (
        <div className="tab-content latest-news">
          <h2>Latest Agricultural News & Updates</h2>
          {state.latestNews.length > 0 ? (
            <div className="news-timeline">
              {state.latestNews.map((article) => (
                <div key={article.newsId} className="news-card">
                  <div className="news-card-header">
                    <span className="news-date">📅 {new Date(article.date).toLocaleDateString('en-IN')}</span>
                    <span className={`news-category ${article.category.type.toLowerCase()}`}>
                      {article.category.name}
                    </span>
                    <span className={`severity-badge ${'severity-' + article.severity?.toLowerCase()}`}>
                      {article.severity}
                    </span>
                  </div>
                  <h3>{article.title}</h3>
                  <p className="news-description">{article.description}</p>
                  <div className="news-metadata">
                    <span className="source">📌 {article.source.name}</span>
                    {article.crops && article.crops.length > 0 && (
                      <span className="crops">🌱 {article.crops.join(', ')}</span>
                    )}
                  </div>
                  <div className="news-actions">
                    <button
                      className="read-btn"
                      onClick={() => state.openArticle(article)}
                    >
                      Read Full Article →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">No news articles found</div>
          )}
        </div>
      )}

      {/* Search & Filter Tab */}
      {activeTab === 'search' && (
        <div className="tab-content search-filter">
          <h2>Search & Filter News</h2>
          
          <div className="filter-section">
            <h3>Keyword Search</h3>
            <div className="search-box">
              <input
                type="text"
                placeholder="Search by keyword (technology, training, etc.)"
                value={state.searchKeyword}
                onChange={(e) => state.handleSearch(e.target.value)}
                className="search-input"
              />
              {state.searchKeyword && (
                <span className="search-result-count">
                  Found {state.searchResults.length} articles
                </span>
              )}
            </div>
          </div>

          <div className="filter-section">
            <h3>By Category</h3>
            <div className="button-group">
              <button
                className={`filter-btn ${!state.selectedCategory ? 'active' : ''}`}
                onClick={() => state.handleCategoryFilter('')}
              >
                All Categories
              </button>
              {categoryOptions.map((category) => (
                <button
                  key={category.type}
                  className={`filter-btn ${state.selectedCategory === category.type ? 'active' : ''}`}
                  onClick={() => state.handleCategoryFilter(category.type)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h3>By Source</h3>
            <div className="button-group">
              <button
                className={`filter-btn ${!state.selectedSource ? 'active' : ''}`}
                onClick={() => state.handleSourceFilter('')}
              >
                All Sources
              </button>
              {state.sources.map((source) => (
                <button
                  key={source.abbreviation}
                  className={`filter-btn ${state.selectedSource === source.abbreviation ? 'active' : ''}`}
                  onClick={() => state.handleSourceFilter(source.abbreviation)}
                >
                  {source.abbreviation}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h3>By Crop</h3>
            <div className="select-group">
              <select
                value={state.selectedCrop}
                onChange={(e) => state.handleCropFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">All Crops</option>
                {state.getAllCrops().map((crop) => (
                  <option key={crop} value={crop}>
                    {crop}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-section">
            <h3>By Date Range</h3>
            <div className="date-range">
              <input
                type="date"
                value={state.dateRange.from}
                onChange={(e) => state.handleDateRangeFilter(e.target.value, state.dateRange.to)}
                className="date-input"
              />
              <span>to</span>
              <input
                type="date"
                value={state.dateRange.to}
                onChange={(e) => state.handleDateRangeFilter(state.dateRange.from, e.target.value)}
                className="date-input"
              />
            </div>
          </div>

          <button className="clear-filters-btn" onClick={state.clearFilters}>
            Clear All Filters
          </button>

          {/* Search Results */}
          {state.searchKeyword && (
            <div className="search-results">
              <h3>Search Results ({state.searchResults.length})</h3>
              {state.searchResults.length > 0 ? (
                <div className="news-list">
                  {state.searchResults.map((article) => (
                    <div key={article.newsId} className="news-list-item">
                      <div className="list-item-header">
                        <h4>{article.title}</h4>
                        <span className="list-date">
                          {new Date(article.date).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      <p>{article.description}</p>
                      <div className="list-actions">
                        <button
                          className="read-link"
                          onClick={() => state.openArticle(article)}
                        >
                          Read More
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No results found</div>
              )}
            </div>
          )}

          {/* Category Filter Results */}
          {state.selectedCategory && (
            <div className="filter-results">
              <h3>{categoryOptions.find(c => c.type === state.selectedCategory)?.name} ({state.categoryNews.length})</h3>
              {state.categoryNews.length > 0 ? (
                <div className="news-grid">
                  {state.categoryNews.map((article) => (
                    <div key={article.newsId} className="news-grid-item">
                      <h4>{article.title}</h4>
                      <p>{article.description}</p>
                      <div className="grid-footer">
                        <span className="grid-date">
                          {new Date(article.date).toLocaleDateString('en-IN')}
                        </span>
                        <button
                          className="grid-read-btn"
                          onClick={() => state.openArticle(article)}
                        >
                          Read
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No articles in this category</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="tab-content categories">
          <h2>News Categories</h2>
          <div className="categories-grid">
            {categoryOptions.map((category) => {
              const count = state.statistics?.categoryCounts[category.type] || 0;
              return (
                <div
                  key={category.type}
                  className="category-card"
                  onClick={() => {
                    state.handleCategoryFilter(category.type);
                    setActiveTab('search');
                  }}
                >
                  <div className="category-icon">
                    {category.type === 'DEPARTMENT_UPDATE' && '🏢'}
                    {category.type === 'TECH_BULLETIN' && '💡'}
                    {category.type === 'ADVISORY' && '⚠️'}
                    {category.type === 'TRAINING' && '🎓'}
                    {category.type === 'INNOVATION' && '🚀'}
                    {category.type === 'POLICY' && '📋'}
                  </div>
                  <h3>{category.name}</h3>
                  <p className="category-count">{count} articles</p>
                  <div className="category-description">
                    {category.type === 'DEPARTMENT_UPDATE' && 'Official updates from agricultural departments'}
                    {category.type === 'TECH_BULLETIN' && 'Latest technology and research bulletins'}
                    {category.type === 'ADVISORY' && 'Important agricultural advisories'}
                    {category.type === 'TRAINING' && 'Training programs and workshops'}
                    {category.type === 'INNOVATION' && 'New agricultural innovations'}
                    {category.type === 'POLICY' && 'Policy announcements and updates'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'statistics' && (
        <div className="tab-content statistics">
          <h2>News Statistics & Analytics</h2>
          
          {state.statistics && (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>📊 Total Articles</h3>
                  <p className="stat-value">{state.statistics.totalArticles}</p>
                </div>
                <div className="stat-card">
                  <h3>📅 Latest Update</h3>
                  <p className="stat-value">
                    {new Date(state.statistics.latestUpdate).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>

              <div className="stats-section">
                <h3>📂 Articles by Category</h3>
                <div className="stats-list">
                  {Object.entries(state.statistics.categoryCounts)
                    .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
                    .map(([category, count]: [string, number]) => {
                      const catName = categoryOptions.find(c => c.type === category)?.name || category;
                      return (
                        <div key={category} className="stats-item">
                          <span className="stats-label">{catName}</span>
                          <div className="stats-bar">
                            <div
                              className="stats-bar-fill"
                              style={{
                                width: `${((count as number) / state.statistics!.totalArticles) * 100}%`
                              }}
                            />
                          </div>
                          <span className="stats-count">{count as number}</span>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="stats-section">
                <h3>📌 Articles by Source</h3>
                <div className="stats-list">
                  {Object.entries(state.statistics.sourceCounts)
                    .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
                    .map(([source, count]: [string, number]) => (
                      <div key={source} className="stats-item">
                        <span className="stats-label">{source}</span>
                        <div className="stats-bar">
                          <div
                            className="stats-bar-fill"
                            style={{
                              width: `${((count as number) / state.statistics!.totalArticles) * 100}%`
                            }}
                          />
                        </div>
                        <span className="stats-count">{count as number}</span>
                      </div>
                    ))}
                </div>
              </div>

              {state.statistics.topCrops.length > 0 && (
                <div className="stats-section">
                  <h3>🌱 Top Crops Covered</h3>
                  <div className="tag-cloud">
                    {state.statistics.topCrops.map((crop: string) => (
                      <span key={crop} className="tag">
                        {crop}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {state.statistics.topDistricts.length > 0 && (
                <div className="stats-section">
                  <h3>📍 Top Districts</h3>
                  <div className="tag-cloud">
                    {state.statistics.topDistricts.map((district: string) => (
                      <span key={district} className="tag">
                        {district}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Sources Tab */}
      {activeTab === 'sources' && (
        <div className="tab-content sources">
          <h2>News Sources</h2>
          <div className="sources-grid">
            {state.sources.map((source) => (
              <div key={source.abbreviation} className="source-card">
                <div className="source-header">
                  <h3>{source.abbreviation}</h3>
                  <span className="source-category">{source.category}</span>
                </div>
                <h4>{source.name}</h4>
                <p className="source-desc">
                  {source.category === 'UNIVERSITY' && 'Academic research and agricultural innovation from Tamil Nadu Agricultural University'}
                  {source.category === 'GOVERNMENT' && 'Official government regulations and agricultural policies'}
                  {source.category === 'RESEARCH' && 'National research institutes and agricultural science updates'}
                  {source.category === 'NGO' && 'Non-governmental organization initiatives and awareness programs'}
                </p>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="source-link"
                >
                  Visit Source →
                </a>
              </div>
            ))}
          </div>

          <div className="sources-info">
            <h3>About These Sources</h3>
            <p>
              Our agriculture news aggregator pulls from multiple trusted sources to provide comprehensive
              coverage of agricultural updates, research findings, training opportunities, and policy announcements
              relevant to Tamil Nadu farmers and agricultural professionals. All content is verified and regularly updated.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgricultureNewsScreen;
