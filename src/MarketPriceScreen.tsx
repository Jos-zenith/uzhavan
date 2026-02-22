/**
 * Market Price Screen Component
 * Complete UI for Service #7: Daily Market Price
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  marketPriceService,
  MarketPriceResponse,
  PriceComparison,
  SellingRecommendation,
} from './marketPriceService';
import { useVictori, BUSINESS_POLICIES } from './victoriSdk';

export type UseMarketPriceReturn = {
  prices: MarketPriceResponse | null;
  comparisons: PriceComparison[];
  recommendations: SellingRecommendation[];
  loading: boolean;
  error: string | null;
  fetchPrices: (market: string, commodity?: string) => Promise<void>;
  fetchPricesByDistrict: (district: string, commodity?: string) => Promise<void>;
};

/**
 * useMarketPrice Hook
 * Manages market price data fetching and state
 */
export function useMarketPrice(
  initialMarket?: string,
  initialCommodity?: string
): UseMarketPriceReturn {
  const [prices, setPrices] = useState<MarketPriceResponse | null>(null);
  const [comparisons, setComparisons] = useState<PriceComparison[]>([]);
  const [recommendations, setRecommendations] = useState<SellingRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { track } = useVictori();

  const fetchPrices = useCallback(
    async (market: string, commodity?: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await marketPriceService.fetchPrices(market, commodity);
        setPrices(response);

        const comp = marketPriceService.comparePrices(response);
        setComparisons(comp);

        const recs = marketPriceService.generateRecommendations(response);
        setRecommendations(recs);

        // Track event
        track({
          policyId: BUSINESS_POLICIES.POL_MARKET_PRICING,
          eventId: 'PRICE_QUERY',
          payload: {
            commodity: commodity || 'all',
            district: response.market.district,
            queryCount: response.prices.length,
          },
        });
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch market prices');
        setPrices(null);
        setComparisons([]);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    },
    [track]
  );

  const fetchPricesByDistrict = useCallback(
    async (district: string, commodity?: string) => {
      const marketInfo = marketPriceService.getMarketByDistrict(district);
      if (!marketInfo) {
        setError(`No market found for district: ${district}`);
        return;
      }
      await fetchPrices(marketInfo.name, commodity);
    },
    [fetchPrices]
  );

  useEffect(() => {
    if (initialMarket) {
      fetchPrices(initialMarket, initialCommodity);
    }
  }, [initialMarket, initialCommodity, fetchPrices]);

  return {
    prices,
    comparisons,
    recommendations,
    loading,
    error,
    fetchPrices,
    fetchPricesByDistrict,
  };
}

/**
 * MarketPriceScreen Component
 * Full UI for daily market prices
 */
export function MarketPriceScreen() {
  const [selectedMarket, setSelectedMarket] = useState('Chennai (Koyambedu)');
  const [selectedCommodity, setSelectedCommodity] = useState<string>('');

  const { prices, comparisons, recommendations, loading, error, fetchPrices } = useMarketPrice();

  const markets = marketPriceService.getAllMarkets();
  const commodities = marketPriceService.getAllCommodities();

  const handleFetch = () => {
    if (selectedMarket) {
      fetchPrices(selectedMarket, selectedCommodity || undefined);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Daily Market Price</h1>
      <p style={styles.subtitle}>277 Regulated Agricultural Markets across Tamil Nadu</p>

      {/* Market and Commodity Selection */}
      <div style={styles.selectorContainer}>
        <div style={styles.selectorGroup}>
          <label style={styles.label}>Market:</label>
          <select
            style={styles.select}
            value={selectedMarket}
            onChange={(e) => setSelectedMarket(e.target.value)}
          >
            {markets.map((market) => (
              <option key={market} value={market}>
                {market}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.selectorGroup}>
          <label style={styles.label}>Commodity (Optional):</label>
          <select
            style={styles.select}
            value={selectedCommodity}
            onChange={(e) => setSelectedCommodity(e.target.value)}
          >
            <option value="">All Commodities</option>
            {commodities.map((commodity) => (
              <option key={commodity} value={commodity}>
                {commodity}
              </option>
            ))}
          </select>
        </div>

        <button style={styles.fetchButton} onClick={handleFetch} disabled={loading}>
          {loading ? 'Loading...' : 'Get Prices'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div style={styles.errorBox}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading Indicator */}
      {loading && <div style={styles.loading}>Fetching market prices...</div>}

      {/* Price Display */}
      {!loading && prices && (
        <>
          {/* Market Info */}
          <div style={styles.marketInfo}>
            <h2>{prices.market.marketName}</h2>
            <p>
              District: {prices.market.district} | State: {prices.market.state}
            </p>
            <p style={styles.timestamp}>
              Updated: {new Date(prices.fetchedAt).toLocaleString()} ({prices.source})
            </p>
          </div>

          {/* Current Prices Table */}
          <div style={styles.section}>
            <h3>Current Market Prices</h3>
            {prices.prices.length > 0 ? (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Commodity</th>
                      <th style={styles.th}>Variety</th>
                      <th style={styles.th}>Min Price</th>
                      <th style={styles.th}>Max Price</th>
                      <th style={styles.th}>Modal Price</th>
                      <th style={styles.th}>Arrival (Tonnes)</th>
                      <th style={styles.th}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prices.prices.map((price, idx) => (
                      <tr key={idx} style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                        <td style={styles.td}>{price.commodity}</td>
                        <td style={styles.td}>{price.variety || '-'}</td>
                        <td style={styles.td}>₹{price.minPrice.toFixed(0)}</td>
                        <td style={styles.td}>₹{price.maxPrice.toFixed(0)}</td>
                        <td style={{ ...styles.td, fontWeight: 'bold' }}>
                          ₹{price.modalPrice.toFixed(0)}
                        </td>
                        <td style={styles.td}>{price.arrivalQuantity.toFixed(1)}</td>
                        <td style={styles.td}>
                          {new Date(price.reportedDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={styles.noData}>No price data available</p>
            )}
          </div>

          {/* Price Comparisons */}
          {comparisons.length > 0 && (
            <div style={styles.section}>
              <h3>Price Trends (vs Last Week)</h3>
              <div style={styles.comparisonGrid}>
                {comparisons.map((comp, idx) => (
                  <div key={idx} style={styles.comparisonCard}>
                    <h4 style={styles.commodityName}>{comp.commodity}</h4>
                    <div style={styles.priceRow}>
                      <span>Current:</span>
                      <strong>₹{comp.currentPrice.toFixed(0)}</strong>
                    </div>
                    <div style={styles.priceRow}>
                      <span>Week Ago:</span>
                      <span>₹{comp.weekAgoPrice.toFixed(0)}</span>
                    </div>
                    <div
                      style={{
                        ...styles.trendBadge,
                        backgroundColor:
                          comp.trend === 'up'
                            ? '#d4edda'
                            : comp.trend === 'down'
                            ? '#f8d7da'
                            : '#d1ecf1',
                        color:
                          comp.trend === 'up'
                            ? '#155724'
                            : comp.trend === 'down'
                            ? '#721c24'
                            : '#0c5460',
                      }}
                    >
                      {comp.trend === 'up' ? '↑' : comp.trend === 'down' ? '↓' : '→'}{' '}
                      {comp.changePercent.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selling Recommendations */}
          {recommendations.length > 0 && (
            <div style={styles.section}>
              <h3>Selling Recommendations</h3>
              <div style={styles.recommendationGrid}>
                {recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    style={{
                      ...styles.recommendationCard,
                      borderLeftColor:
                        rec.recommendation === 'sell_now'
                          ? '#28a745'
                          : rec.recommendation === 'wait'
                          ? '#ffc107'
                          : '#6c757d',
                    }}
                  >
                    <div style={styles.recHeader}>
                      <h4 style={styles.recCommodity}>{rec.commodity}</h4>
                      <span
                        style={{
                          ...styles.recBadge,
                          backgroundColor:
                            rec.recommendation === 'sell_now'
                              ? '#d4edda'
                              : rec.recommendation === 'wait'
                              ? '#fff3cd'
                              : '#e2e3e5',
                          color:
                            rec.recommendation === 'sell_now'
                              ? '#155724'
                              : rec.recommendation === 'wait'
                              ? '#856404'
                              : '#383d41',
                        }}
                      >
                        {rec.recommendation === 'sell_now'
                          ? '✓ Sell Now'
                          : rec.recommendation === 'wait'
                          ? '⏳ Wait'
                          : '⊙ Hold'}
                      </span>
                    </div>
                    <p style={styles.recReason}>{rec.reason}</p>
                    <p style={styles.recTrend}>
                      <strong>Expected:</strong> {rec.expectedTrend}
                    </p>
                    <p style={styles.recConfidence}>
                      Confidence: <strong>{rec.confidenceLevel}</strong>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7-Day Trend Chart (Simple) */}
          {prices.trends.length > 0 && (
            <div style={styles.section}>
              <h3>7-Day Price Trend</h3>
              <div style={styles.trendChart}>
                {prices.trends.map((trend, idx) => (
                  <div key={idx} style={styles.trendBar}>
                    <div style={styles.trendDate}>{trend.date.slice(5)}</div>
                    <div
                      style={{
                        ...styles.trendBarFill,
                        height: `${(trend.modalPrice / Math.max(...prices.trends.map((t) => t.modalPrice))) * 100}%`,
                      }}
                    />
                    <div style={styles.trendPrice}>₹{trend.modalPrice.toFixed(0)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Inline Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '24px',
  },
  selectorContainer: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  selectorGroup: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    minWidth: '200px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '6px',
  },
  select: {
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ccc',
    borderRadius: '6px',
  },
  fetchButton: {
    padding: '10px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    alignSelf: 'flex-end',
  },
  errorBox: {
    padding: '12px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    fontSize: '18px',
    color: '#666',
  },
  marketInfo: {
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  timestamp: {
    fontSize: '14px',
    color: '#666',
    marginTop: '8px',
  },
  section: {
    marginBottom: '32px',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    border: '1px solid #dee2e6',
  },
  th: {
    padding: '12px',
    backgroundColor: '#007bff',
    color: 'white',
    textAlign: 'left',
    fontWeight: 'bold',
    borderBottom: '2px solid #0056b3',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #dee2e6',
  },
  rowEven: {
    backgroundColor: '#ffffff',
  },
  rowOdd: {
    backgroundColor: '#f8f9fa',
  },
  noData: {
    padding: '40px',
    textAlign: 'center',
    color: '#666',
  },
  comparisonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '16px',
  },
  comparisonCard: {
    padding: '16px',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
  },
  commodityName: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '12px',
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  trendBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '6px',
    fontWeight: 'bold',
    marginTop: '8px',
  },
  recommendationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  recommendationCard: {
    padding: '16px',
    border: '1px solid #dee2e6',
    borderLeft: '4px solid',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
  },
  recHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  recCommodity: {
    fontSize: '18px',
    fontWeight: 'bold',
  },
  recBadge: {
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  recReason: {
    marginBottom: '8px',
    color: '#333',
  },
  recTrend: {
    marginBottom: '8px',
    fontSize: '14px',
    color: '#666',
  },
  recConfidence: {
    fontSize: '14px',
    color: '#666',
  },
  trendChart: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '200px',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    gap: '8px',
  },
  trendBar: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  trendDate: {
    fontSize: '12px',
    marginBottom: '4px',
  },
  trendBarFill: {
    width: '100%',
    backgroundColor: '#007bff',
    borderRadius: '4px 4px 0 0',
    minHeight: '20px',
  },
  trendPrice: {
    fontSize: '12px',
    fontWeight: 'bold',
    marginTop: '4px',
  },
};

export default MarketPriceScreen;
