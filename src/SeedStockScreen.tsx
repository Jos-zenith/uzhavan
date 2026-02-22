/**
 * Service #5: Seedlings & Farm Stock Browser Screen Component
 * Browse seeds, seedlings, and plants by location and variety
 */

import React, { useState, useEffect, useCallback } from 'react';
import seedStockService, {
  SeedStock,
  LocationHierarchy,
  StockFilter,
  AvailabilityStatus
} from './seedStockService';
import './styles/seedStock.css';

interface SeedStockState {
  allStock: SeedStock[];
  filteredStock: SeedStock[];
  locationHierarchy: LocationHierarchy;
  availability: AvailabilityStatus | null;
  loading: boolean;
  error: string | null;
  selectedDistrict: string;
  selectedFarm: string;
  selectedCategory: string;
  selectedFarmStock: SeedStock[];
  selectedStockItem: SeedStock | null;
}

/**
 * Custom Hook: useSeedStock
 */
function useSeedStock() {
  const [state, setState] = useState<SeedStockState>({
    allStock: [],
    filteredStock: [],
    locationHierarchy: { districts: [], farmsByDistrict: {}, categoriesByFarm: {} },
    availability: null,
    loading: true,
    error: null,
    selectedDistrict: '',
    selectedFarm: '',
    selectedCategory: '',
    selectedFarmStock: [],
    selectedStockItem: null
  });

  // Initialize service
  useEffect(() => {
    (async () => {
      try {
        await seedStockService.initialize('/data/farm_stock_report.xlsx');
        
        setState((prev) => ({
          ...prev,
          allStock: seedStockService.getAllStock(),
          filteredStock: seedStockService.getAllStock(),
          locationHierarchy: seedStockService.getLocationHierarchy(),
          availability: seedStockService.getAvailabilityOverview(),
          loading: false
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Failed to initialize',
          loading: false
        }));
      }
    })();
  }, []);

  // Handle district selection
  const selectDistrict = useCallback((district: string) => {
    const stocks = seedStockService.getStockByDistrict(district);
    const farms = seedStockService.getFarmsByDistrict(district);

    setState((prev) => ({
      ...prev,
      selectedDistrict: district,
      selectedFarm: farms.length > 0 ? farms[0] : '',
      filteredStock: stocks,
      selectedFarmStock: farms.length > 0 ? seedStockService.getStockByFarm(district, farms[0]) : []
    }));
  }, []);

  // Handle farm selection
  const selectFarm = useCallback((farm: string) => {
    const stocks = seedStockService.getStockByFarm(state.selectedDistrict, farm);
    setState((prev) => ({
      ...prev,
      selectedFarm: farm,
      selectedFarmStock: stocks
    }));
  }, [state.selectedDistrict]);

  // Handle category selection
  const selectCategory = useCallback((category: string) => {
    const stocks = seedStockService.getStockByCategory(category);
    setState((prev) => ({
      ...prev,
      selectedCategory: category,
      filteredStock: stocks
    }));
  }, []);

  // Handle search
  const handleSearch = useCallback((keyword: string) => {
    if (keyword.trim()) {
      const results = seedStockService.searchStock(keyword);
      setState((prev) => ({
        ...prev,
        filteredStock: results
      }));
    } else {
      setState((prev) => ({
        ...prev,
        filteredStock: prev.allStock
      }));
    }
  }, []);

  // Refresh cache
  const refresh = useCallback(async () => {
    try {
      seedStockService.clearCache();
      await seedStockService.initialize('/data/farm_stock_report.xlsx');
      
      setState((prev) => ({
        ...prev,
        allStock: seedStockService.getAllStock(),
        filteredStock: seedStockService.getAllStock(),
        availability: seedStockService.getAvailabilityOverview()
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to refresh'
      }));
    }
  }, []);

  return {
    ...state,
    selectDistrict,
    selectFarm,
    selectCategory,
    handleSearch,
    refresh,
    setSelectedStockItem: (item: SeedStock | null) =>
      setState((prev) => ({ ...prev, selectedStockItem: item }))
  };
}

/**
 * Main Seedlings Browser Component
 */
export const SeedStockScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'location' | 'category' | 'search' | 'inventory'>('location');
  const state = useSeedStock();

  if (state.loading) {
    return <div className="seed-loading">Loading seed inventory...</div>;
  }

  return (
    <div className="seed-stock-container">
      <div className="seed-header">
        <h1>🌱 Seedlings & Farm Stock Browser</h1>
        <p>Find seeds, seedlings, and plants from horticultural parks across Tamil Nadu</p>
        <div className="stock-summary">
          <span className="summary-badge">
            📦 {state.availability?.inStock || 0} In Stock
          </span>
          <span className="summary-badge warning">
            ⚠️ {state.availability?.lowStock || 0} Low Stock
          </span>
          <span className="summary-badge danger">
            ❌ {state.availability?.outOfStock || 0} Out of Stock
          </span>
          <span className="summary-badge">
            📍 {state.locationHierarchy.districts.length} Districts
          </span>
        </div>
      </div>

      <div className="seed-search-section">
        <input
          type="text"
          placeholder="Search by crop, variety, or location..."
          onChange={(e) => state.handleSearch(e.target.value)}
          className="seed-search-input"
        />
        <button onClick={state.refresh} className="seed-refresh-btn">
          🔄 Refresh
        </button>
      </div>

      <div className="seed-tabs">
        <button
          className={`tab-btn ${activeTab === 'location' ? 'active' : ''}`}
          onClick={() => setActiveTab('location')}
        >
          📍 Browse by Location
        </button>
        <button
          className={`tab-btn ${activeTab === 'category' ? 'active' : ''}`}
          onClick={() => setActiveTab('category')}
        >
          🌾 Browse by Type
        </button>
        <button
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          🔍 Search Results
        </button>
        <button
          className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          📊 Inventory Stats
        </button>
      </div>

      {state.error && <div className="seed-error">{state.error}</div>}

      {/* Location Tab */}
      {activeTab === 'location' && (
        <div className="tab-content location-tab">
          <div className="location-explorer">
            {/* District Selection */}
            <div className="explorer-section">
              <h3>Select District</h3>
              <div className="district-list">
                {state.locationHierarchy.districts.map((district) => {
                  const districtStock = state.allStock.filter((s) => s.district === district);
                  const totalStock = districtStock.reduce((sum, s) => sum + s.totalStock, 0);
                  return (
                    <button
                      key={district}
                      className={`location-btn ${state.selectedDistrict === district ? 'active' : ''}`}
                      onClick={() => state.selectDistrict(district)}
                    >
                      <span className="location-name">{district}</span>
                      <span className="location-badge">{totalStock.toLocaleString()} units</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Farm Selection */}
            {state.selectedDistrict && (
              <div className="explorer-section">
                <h3>Farms in {state.selectedDistrict}</h3>
                <div className="farm-list">
                  {state.locationHierarchy.farmsByDistrict[state.selectedDistrict]?.map(
                    (farm) => {
                      const farmStock = state.allStock.filter(
                        (s) => s.district === state.selectedDistrict && s.farmName === farm
                      );
                      const totalStock = farmStock.reduce((sum, s) => sum + s.totalStock, 0);
                      return (
                        <button
                          key={farm}
                          className={`farm-btn ${state.selectedFarm === farm ? 'active' : ''}`}
                          onClick={() => state.selectFarm(farm)}
                        >
                          <span className="farm-name">{farm}</span>
                          <span className="farm-badge">{totalStock.toLocaleString()} units</span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Farm Stock Display */}
          {state.selectedFarmStock.length > 0 && (
            <div className="farm-stock-section">
              <h3>Available at {state.selectedFarm}</h3>
              <div className="stock-cards">
                {state.selectedFarmStock.map((stock, idx) => (
                  <div
                    key={idx}
                    className={`stock-card ${stock.availability.toLowerCase().replace(' ', '-')}`}
                    onClick={() => state.setSelectedStockItem(stock)}
                  >
                    <div className="card-header">
                      <h4>{stock.subCategory}</h4>
                      <span
                        className={`availability-badge ${stock.availability
                          .toLowerCase()
                          .replace(' ', '-')}`}
                      >
                        {stock.availability}
                      </span>
                    </div>
                    <div className="card-body">
                      <p className="category">{stock.category}</p>
                      <p className="stock">
                        <strong>Stock:</strong> {stock.totalStock.toLocaleString()} units
                      </p>
                      <p className="price">
                        <strong>Price:</strong> ₹{stock.pricePerPlant.toFixed(2)}/unit
                      </p>
                      <p className="value">
                        <strong>Value:</strong> ₹{stock.totalValue.toLocaleString()}
                      </p>
                      <p className="updated text-muted">
                        Updated: {stock.lastUpdated}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Category Tab */}
      {activeTab === 'category' && (
        <div className="tab-content category-tab">
          <div className="category-grid">
            {state.locationHierarchy.categoriesByFarm &&
              Array.from(
                new Set(
                  Object.values(state.locationHierarchy.categoriesByFarm)
                    .flat()
                    .filter((v) => v)
                )
              )
                .sort()
                .map((category) => {
                  const categoryStock = state.allStock.filter((s) => s.category === category);
                  const totalStock = categoryStock.reduce((sum, s) => sum + s.totalStock, 0);
                  const avgPrice =
                    categoryStock.length > 0
                      ? categoryStock.reduce((sum, s) => sum + s.pricePerPlant, 0) /
                        categoryStock.length
                      : 0;

                  return (
                    <div
                      key={category}
                      className="category-card"
                      onClick={() => state.selectCategory(category)}
                    >
                      <h4>{category}</h4>
                      <div className="category-stats">
                        <p>
                          <strong>Varieties:</strong> {categoryStock.length}
                        </p>
                        <p>
                          <strong>Total Stock:</strong> {totalStock.toLocaleString()} units
                        </p>
                        <p>
                          <strong>Avg Price:</strong> ₹{avgPrice.toFixed(2)}/unit
                        </p>
                      </div>
                    </div>
                  );
                })}
          </div>

          {state.selectedCategory && state.filteredStock.length > 0 && (
            <div className="category-stocks">
              <h3>Varieties in {state.selectedCategory}</h3>
              <div className="stock-list">
                {state.filteredStock.map((stock, idx) => (
                  <div
                    key={idx}
                    className="stock-item"
                    onClick={() => state.setSelectedStockItem(stock)}
                  >
                    <div className="item-left">
                      <h5>{stock.subCategory}</h5>
                      <p className="location">{stock.farmName}, {stock.district}</p>
                    </div>
                    <div className="item-right">
                      <span
                        className={`availability ${stock.availability
                          .toLowerCase()
                          .replace(' ', '-')}`}
                      >
                        {stock.availability}
                      </span>
                      <p className="price">₹{stock.pricePerPlant.toFixed(2)}/unit</p>
                      <p className="stock">{stock.totalStock.toLocaleString()} available</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Results Tab */}
      {activeTab === 'search' && (
        <div className="tab-content search-tab">
          <div className="search-results">
            <p className="result-count">Found {state.filteredStock.length} matches</p>
            {state.filteredStock.length > 0 ? (
              <div className="results-grid">
                {state.filteredStock.slice(0, 50).map((stock, idx) => (
                  <div
                    key={idx}
                    className="result-card"
                    onClick={() => state.setSelectedStockItem(stock)}
                  >
                    <div className="result-header">
                      <h5>{stock.subCategory}</h5>
                      <span
                        className={`badge ${stock.availability
                          .toLowerCase()
                          .replace(' ', '-')}`}
                      >
                        {stock.availability}
                      </span>
                    </div>
                    <div className="result-info">
                      <p>
                        <strong>Category:</strong> {stock.category}
                      </p>
                      <p>
                        <strong>Location:</strong> {stock.farmName}, {stock.district}
                      </p>
                      <p>
                        <strong>Stock:</strong> {stock.totalStock.toLocaleString()}
                      </p>
                      <p>
                        <strong>Price:</strong> ₹{stock.pricePerPlant.toFixed(2)}/unit
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-results">No matching seeds found. Try a different search.</div>
            )}
          </div>
        </div>
      )}

      {/* Inventory Statistics Tab */}
      {activeTab === 'inventory' && (
        <div className="tab-content inventory-tab">
          <div className="inventory-header">
            <h3>Inventory Overview</h3>
            <div className="update-info">
              Last Updated: {seedStockService.getStatistics().lastUpdateDate}
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <h4>Total Records</h4>
              <p className="stat-value">{seedStockService.getStatistics().totalRecords}</p>
            </div>
            <div className="stat-card">
              <h4>Total Stock Units</h4>
              <p className="stat-value">
                {seedStockService.getStatistics().totalStock.toLocaleString()}
              </p>
            </div>
            <div className="stat-card">
              <h4>Total Inventory Value</h4>
              <p className="stat-value">₹{(seedStockService.getStatistics().totalValue / 100000).toFixed(1)}L</p>
            </div>
            <div className="stat-card">
              <h4>Average Price</h4>
              <p className="stat-value">₹{seedStockService.getStatistics().averagePrice.toFixed(2)}</p>
            </div>
          </div>

          <div className="distribution-section">
            <h3>Stock Distribution by Category</h3>
            <div className="distribution-list">
              {Object.entries(seedStockService.getStatistics().stockByCategory)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([cat, stock]) => (
                  <div key={cat} className="distribution-item">
                    <span className="label">{cat}</span>
                    <div className="bar">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${
                            (stock /
                              seedStockService.getStatistics().totalStock) *
                            100
                          }%`
                        }}
                      />
                    </div>
                    <span className="value">{stock.toLocaleString()}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="distribution-section">
            <h3>Stock Distribution by District (Top 10)</h3>
            <div className="distribution-list">
              {Object.entries(seedStockService.getStatistics().stockByDistrict)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([dist, stock]) => (
                  <div key={dist} className="distribution-item">
                    <span className="label">{dist}</span>
                    <div className="bar">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${
                            (stock /
                              seedStockService.getStatistics().totalStock) *
                            100
                          }%`
                        }}
                      />
                    </div>
                    <span className="value">{stock.toLocaleString()}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Stock Details Modal */}
      {state.selectedStockItem && (
        <div
          className="seed-modal"
          onClick={() => state.setSelectedStockItem(null)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="close-btn"
              onClick={() => state.setSelectedStockItem(null)}
            >
              ✕
            </button>

            <div className="stock-details">
              <div className="detail-header">
                <h2>{state.selectedStockItem.subCategory}</h2>
                <span
                  className={`availability-badge ${state.selectedStockItem.availability
                    .toLowerCase()
                    .replace(' ', '-')}`}
                >
                  {state.selectedStockItem.availability}
                </span>
              </div>

              <div className="detail-grid">
                <div className="detail-row">
                  <label>Category</label>
                  <span>{state.selectedStockItem.category}</span>
                </div>
                <div className="detail-row">
                  <label>Location</label>
                  <span>
                    {state.selectedStockItem.farmName}, {state.selectedStockItem.district}
                  </span>
                </div>
                <div className="detail-row">
                  <label>Total Stock</label>
                  <span className="highlight">
                    {state.selectedStockItem.totalStock.toLocaleString()} units
                  </span>
                </div>
                <div className="detail-row">
                  <label>Price Per Unit</label>
                  <span className="highlight">
                    ₹{state.selectedStockItem.pricePerPlant.toFixed(2)}
                  </span>
                </div>
                <div className="detail-row">
                  <label>Total Value</label>
                  <span className="highlight">
                    ₹{state.selectedStockItem.totalValue.toLocaleString()}
                  </span>
                </div>
                <div className="detail-row">
                  <label>Last Updated</label>
                  <span>{state.selectedStockItem.lastUpdated}</span>
                </div>
              </div>

              <div className="action-section">
                <p className="info-text">
                  💡 For real-time availability updates and to place orders, contact the farm directly.
                </p>
                <button className="action-btn contact">📞 Request Contact Details</button>
                <button className="action-btn reserve">🔖 Add to Wishlist</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeedStockScreen;
