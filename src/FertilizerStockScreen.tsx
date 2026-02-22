import React from 'react';
import fertilizerStockService, {
  type FertilizerStock,
  type FertilizerStockStatistics,
  type FertilizerAvailabilityOverview,
} from './fertilizerStockService';
import './styles/fertilizerStock.css';

type TabKey = 'district' | 'fertilizer' | 'search' | 'inventory';

interface ScreenState {
  loading: boolean;
  error: string;
  activeTab: TabKey;
  allStock: FertilizerStock[];
  districts: string[];
  fertilizers: string[];
  selectedDistrict: string;
  selectedFertilizer: string;
  districtStock: FertilizerStock[];
  fertilizerStock: FertilizerStock[];
  searchKeyword: string;
  searchResults: FertilizerStock[];
  availability: FertilizerAvailabilityOverview;
  statistics: FertilizerStockStatistics | null;
  selectedItem: FertilizerStock | null;
}

const INITIAL_STATE: ScreenState = {
  loading: true,
  error: '',
  activeTab: 'district',
  allStock: [],
  districts: [],
  fertilizers: [],
  selectedDistrict: '',
  selectedFertilizer: '',
  districtStock: [],
  fertilizerStock: [],
  searchKeyword: '',
  searchResults: [],
  availability: { inStock: 0, lowStock: 0, outOfStock: 0, totalRecords: 0 },
  statistics: null,
  selectedItem: null,
};

function FertilizerStockScreen() {
  const [state, setState] = React.useState<ScreenState>(INITIAL_STATE);

  const initialize = React.useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: '' }));

    try {
      await fertilizerStockService.initialize('/data/tn_fertilizer_stock.csv');

      const allStock = fertilizerStockService.getAllStock();
      const districts = fertilizerStockService.getAllDistricts();
      const fertilizers = fertilizerStockService.getAllFertilizers();
      const availability = fertilizerStockService.getAvailabilityOverview();
      const statistics = fertilizerStockService.getStatistics();

      const selectedDistrict = districts[0] ?? '';
      const selectedFertilizer = fertilizers[0] ?? '';

      setState((prev) => ({
        ...prev,
        loading: false,
        allStock,
        districts,
        fertilizers,
        selectedDistrict,
        selectedFertilizer,
        districtStock: selectedDistrict
          ? fertilizerStockService.getStockByDistrict(selectedDistrict)
          : [],
        fertilizerStock: selectedFertilizer
          ? fertilizerStockService.getStockByFertilizer(selectedFertilizer)
          : [],
        searchResults: allStock.slice(0, 80),
        availability,
        statistics,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load fertilizer stock data',
      }));
    }
  }, []);

  React.useEffect(() => {
    initialize();
  }, [initialize]);

  const setActiveTab = (activeTab: TabKey) => {
    setState((prev) => ({ ...prev, activeTab }));
  };

  const onDistrictSelect = (district: string) => {
    setState((prev) => ({
      ...prev,
      selectedDistrict: district,
      districtStock: fertilizerStockService.getStockByDistrict(district),
    }));
  };

  const onFertilizerSelect = (fertilizerName: string) => {
    setState((prev) => ({
      ...prev,
      selectedFertilizer: fertilizerName,
      fertilizerStock: fertilizerStockService.getStockByFertilizer(fertilizerName),
    }));
  };

  const onSearchChange = (value: string) => {
    const trimmed = value.trim();
    const searchResults = trimmed
      ? fertilizerStockService.searchStock(trimmed).slice(0, 100)
      : state.allStock.slice(0, 80);

    setState((prev) => ({
      ...prev,
      searchKeyword: value,
      searchResults,
    }));
  };

  const onRefresh = async () => {
    fertilizerStockService.clearCache();
    await initialize();
  };

  const renderStockCard = (item: FertilizerStock) => {
    const availabilityClass = item.availability.toLowerCase().replace(/\s+/g, '-');

    return (
      <button
        type="button"
        key={`${item.district}-${item.fertilizerName}-${item.sourceType}`}
        className="fert-card"
        onClick={() => setState((prev) => ({ ...prev, selectedItem: item }))}
      >
        <div className="fert-card-top">
          <h4>{item.fertilizerName}</h4>
          <span className={`badge ${availabilityClass}`}>{item.availability}</span>
        </div>
        <p className="meta">{item.district}</p>
        <p className="meta">Source: {item.sourceType}</p>
        <p className="qty">{item.quantity.toLocaleString()} MT</p>
      </button>
    );
  };

  return (
    <div className="fert-screen">
      <header className="fert-header">
        <div>
          <h1>🧪 Service #4 - Fertilizer Stock Browser</h1>
          <p>District-wise fertilizer inventory snapshot for Tamil Nadu</p>
        </div>
        <button type="button" className="refresh-btn" onClick={onRefresh}>
          Refresh
        </button>
      </header>

      <section className="summary-row">
        <div className="summary-pill green">In Stock: {state.availability.inStock}</div>
        <div className="summary-pill amber">Low Stock: {state.availability.lowStock}</div>
        <div className="summary-pill red">Out of Stock: {state.availability.outOfStock}</div>
        <div className="summary-pill blue">Districts: {state.districts.length}</div>
        <div className="summary-pill purple">Types: {state.fertilizers.length}</div>
      </section>

      <nav className="tab-row">
        <button
          type="button"
          className={state.activeTab === 'district' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('district')}
        >
          District
        </button>
        <button
          type="button"
          className={state.activeTab === 'fertilizer' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('fertilizer')}
        >
          Fertilizer
        </button>
        <button
          type="button"
          className={state.activeTab === 'search' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('search')}
        >
          Search
        </button>
        <button
          type="button"
          className={state.activeTab === 'inventory' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('inventory')}
        >
          Inventory
        </button>
      </nav>

      {state.loading ? <div className="loading">Loading fertilizer stock...</div> : null}
      {state.error ? <div className="error">{state.error}</div> : null}

      {!state.loading && !state.error && (
        <section>
          {state.activeTab === 'district' && (
            <div className="panel">
              <div className="selector-grid">
                {state.districts.map((district) => (
                  <button
                    type="button"
                    key={district}
                    className={state.selectedDistrict === district ? 'choice active' : 'choice'}
                    onClick={() => onDistrictSelect(district)}
                  >
                    {district}
                  </button>
                ))}
              </div>

              <div className="cards-grid">
                {state.districtStock.map((item) => renderStockCard(item))}
              </div>
            </div>
          )}

          {state.activeTab === 'fertilizer' && (
            <div className="panel">
              <div className="selector-grid">
                {state.fertilizers.map((fertilizerName) => (
                  <button
                    type="button"
                    key={fertilizerName}
                    className={
                      state.selectedFertilizer === fertilizerName ? 'choice active' : 'choice'
                    }
                    onClick={() => onFertilizerSelect(fertilizerName)}
                  >
                    {fertilizerName}
                  </button>
                ))}
              </div>

              <div className="cards-grid">
                {state.fertilizerStock.map((item) => renderStockCard(item))}
              </div>
            </div>
          )}

          {state.activeTab === 'search' && (
            <div className="panel">
              <input
                value={state.searchKeyword}
                onChange={(event) => onSearchChange(event.target.value)}
                className="search-input"
                placeholder="Search district, fertilizer type, source..."
              />

              <div className="cards-grid">
                {state.searchResults.map((item) => renderStockCard(item))}
              </div>
            </div>
          )}

          {state.activeTab === 'inventory' && state.statistics && (
            <div className="panel">
              <div className="stats-grid">
                <article className="stat-card">
                  <h3>Total Records</h3>
                  <p>{state.statistics.totalRecords.toLocaleString()}</p>
                </article>
                <article className="stat-card">
                  <h3>Total Quantity</h3>
                  <p>{state.statistics.totalQuantity.toLocaleString()} MT</p>
                </article>
                <article className="stat-card">
                  <h3>Avg / Record</h3>
                  <p>{state.statistics.averageStockPerRecord.toFixed(2)} MT</p>
                </article>
                <article className="stat-card">
                  <h3>Active Districts</h3>
                  <p>{state.statistics.activeDistricts}</p>
                </article>
              </div>

              <div className="top-lists">
                <div>
                  <h3>Top Fertilizers</h3>
                  <ul>
                    {state.statistics.topFertilizers.map((item) => (
                      <li key={item.name}>
                        <span>{item.name}</span>
                        <strong>{item.quantity.toLocaleString()} MT</strong>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3>Top Districts</h3>
                  <ul>
                    {state.statistics.topDistricts.map((item) => (
                      <li key={item.district}>
                        <span>{item.district}</span>
                        <strong>{item.quantity.toLocaleString()} MT</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {state.selectedItem && (
        <div className="modal-overlay" role="presentation">
          <div className="modal-card">
            <button
              type="button"
              className="close-btn"
              onClick={() => setState((prev) => ({ ...prev, selectedItem: null }))}
            >
              ✕
            </button>
            <h2>{state.selectedItem.fertilizerName}</h2>
            <p>
              <strong>District:</strong> {state.selectedItem.district}
            </p>
            <p>
              <strong>Stock:</strong> {state.selectedItem.quantity.toLocaleString()} MT
            </p>
            <p>
              <strong>Source:</strong> {state.selectedItem.sourceType}
            </p>
            <p>
              <strong>Status:</strong> {state.selectedItem.availability}
            </p>
            <p>
              <strong>Updated:</strong> {state.selectedItem.updatedOn}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default FertilizerStockScreen;
