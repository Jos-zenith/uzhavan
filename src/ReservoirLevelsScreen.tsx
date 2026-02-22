/**
 * Reservoir Levels Screen Component
 * Complete UI for Service #10: Reservoir Levels
 * Uses river sheet from uzhavan.xlsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  reservoirService,
  ReservoirData,
  ReservoirAlert,
  ReservoirStatistics,
  IrrigationRecommendation,
} from './reservoirService';
import { useVictori, BUSINESS_POLICIES } from './victoriSdk';

export type UseReservoirReturn = {
  reservoirs: ReservoirData[];
  alerts: ReservoirAlert[];
  statistics: ReservoirStatistics | null;
  irrigationRecommendation: IrrigationRecommendation | null;
  loading: boolean;
  error: string | null;
  loadAllReservoirs: () => Promise<void>;
  loadReservoirsByDistrict: (district: string) => Promise<void>;
  loadCriticalReservoirs: () => Promise<void>;
  getIrrigationAdvice: (district: string) => Promise<void>;
};

/**
 * useReservoir Hook
 * Manages reservoir data fetching and state
 */
export function useReservoir(): UseReservoirReturn {
  const [reservoirs, setReservoirs] = useState<ReservoirData[]>([]);
  const [alerts, setAlerts] = useState<ReservoirAlert[]>([]);
  const [statistics, setStatistics] = useState<ReservoirStatistics | null>(null);
  const [irrigationRecommendation, setIrrigationRecommendation] = useState<IrrigationRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { track } = useVictori();

  const loadAllReservoirs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [data, alertData, stats] = await Promise.all([
        reservoirService.getAllReservoirs(),
        reservoirService.generateAlerts(),
        reservoirService.getStatistics(),
      ]);

      setReservoirs(data);
      setAlerts(alertData);
      setStatistics(stats);

      if (data.length > 0) {
        const first = data[0];
        track({
          policyId: BUSINESS_POLICIES.POL_RESERVOIR_LEVELS,
          eventId: 'RESERVOIR_STATUS_CHECKED',
          payload: {
            reservoirId: first.station,
            district: first.district,
          },
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load reservoir data');
    } finally {
      setLoading(false);
    }
  }, [track]);

  const loadReservoirsByDistrict = useCallback(
    async (district: string) => {
      setLoading(true);
      setError(null);

      try {
        const data = await reservoirService.getReservoirsByDistrict(district);
        setReservoirs(data);

        const alertData = await reservoirService.generateAlerts();
        const districtAlerts = alertData.filter(
          (alert) => alert.district.toLowerCase() === district.toLowerCase()
        );
        setAlerts(districtAlerts);

        if (data.length > 0) {
          track({
            policyId: BUSINESS_POLICIES.POL_RESERVOIR_LEVELS,
            eventId: 'RESERVOIR_STATUS_CHECKED',
            payload: {
              reservoirId: data[0].station,
              district,
            },
          });
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load district reservoirs');
      } finally {
        setLoading(false);
      }
    },
    [track]
  );

  const loadCriticalReservoirs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await reservoirService.getCriticalReservoirs();
      setReservoirs(data);

      const alertData = await reservoirService.generateAlerts();
      const criticalAlerts = alertData.filter(
        (alert) => alert.severity === 'high'
      );
      setAlerts(criticalAlerts);

      if (data.length > 0) {
        const firstCritical = data[0];
        track({
          policyId: BUSINESS_POLICIES.POL_RESERVOIR_LEVELS,
          eventId: 'WATER_ALERT_TRIGGERED',
          payload: {
            reservoirId: firstCritical.station,
            currentLevel: firstCritical.currentLevel,
            threshold: firstCritical.deadStorageLevel,
          },
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load critical reservoirs');
    } finally {
      setLoading(false);
    }
  }, [track]);

  const getIrrigationAdvice = useCallback(
    async (district: string) => {
      setLoading(true);
      setError(null);

      try {
        const recommendation = await reservoirService.getIrrigationRecommendations(district);
        setIrrigationRecommendation(recommendation);

        track({
          policyId: BUSINESS_POLICIES.POL_RESERVOIR_LEVELS,
          eventId: 'RESERVOIR_STATUS_CHECKED',
          payload: {
            reservoirId: `${district}_irrigation_advisory`,
            district,
          },
        });
      } catch (err: any) {
        setError(err?.message || 'Failed to get irrigation recommendations');
      } finally {
        setLoading(false);
      }
    },
    [track]
  );

  return {
    reservoirs,
    alerts,
    statistics,
    irrigationRecommendation,
    loading,
    error,
    loadAllReservoirs,
    loadReservoirsByDistrict,
    loadCriticalReservoirs,
    getIrrigationAdvice,
  };
}

/**
 * ReservoirLevelsScreen Component
 * Full UI for reservoir water level monitoring
 */
export function ReservoirLevelsScreen() {
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'all' | 'critical' | 'district'>('all');

  const {
    reservoirs,
    alerts,
    statistics,
    irrigationRecommendation,
    loading,
    error,
    loadAllReservoirs,
    loadReservoirsByDistrict,
    loadCriticalReservoirs,
    getIrrigationAdvice,
  } = useReservoir();

  const districts = [
    'Salem',
    'Erode',
    'Namakkal',
    'Dharmapuri',
    'Krishnagiri',
    'Coimbatore',
    'Tiruppur',
    'Dindigul',
    'Theni',
    'Madurai',
    'Virudhunagar',
    'Thanjavur',
    'Tiruchirappalli',
    'Karur',
    'Chennai',
  ];

  useEffect(() => {
    loadAllReservoirs();
  }, [loadAllReservoirs]);

  const handleViewChange = (mode: 'all' | 'critical' | 'district', district?: string) => {
    setViewMode(mode);
    if (mode === 'all') {
      loadAllReservoirs();
    } else if (mode === 'critical') {
      loadCriticalReservoirs();
    } else if (mode === 'district' && district) {
      setSelectedDistrict(district);
      loadReservoirsByDistrict(district);
      getIrrigationAdvice(district);
    }
  };

  const getStatusColor = (status: ReservoirData['status']) => {
    switch (status) {
      case 'full':
        return '#2ecc71';
      case 'good':
        return '#3498db';
      case 'moderate':
        return '#f39c12';
      case 'low':
        return '#e67e22';
      case 'critical':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  const getAlertColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return '#e74c3c';
      case 'medium':
        return '#f39c12';
      case 'low':
        return '#2ecc71';
      default:
        return '#95a5a6';
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>💧 Reservoir Water Levels</h1>
      <p style={styles.subtitle}>Real-time monitoring from uzhavan.xlsx river sheet</p>

      {/* View Mode Selector */}
      <div style={styles.viewSelector}>
        <button
          style={{
            ...styles.viewButton,
            ...(viewMode === 'all' ? styles.viewButtonActive : {}),
          }}
          onClick={() => handleViewChange('all')}
        >
          🌊 All Reservoirs
        </button>
        <button
          style={{
            ...styles.viewButton,
            ...(viewMode === 'critical' ? styles.viewButtonActive : {}),
          }}
          onClick={() => handleViewChange('critical')}
        >
          ⚠️ Critical Levels
        </button>
        <div style={styles.districtSelector}>
          <select
            style={styles.select}
            value={selectedDistrict}
            onChange={(e) => handleViewChange('district', e.target.value)}
          >
            <option value="all">Select District</option>
            {districts.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={styles.errorBox}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading Indicator */}
      {loading && <div style={styles.loading}>Loading reservoir data...</div>}

      {/* Statistics Dashboard */}
      {statistics && !loading && (
        <div style={styles.statsSection}>
          <h2>📊 Overview</h2>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{statistics.totalReservoirs}</div>
              <div style={styles.statLabel}>Total Reservoirs</div>
            </div>
            <div style={{ ...styles.statCard, borderLeft: '4px solid #e74c3c' }}>
              <div style={styles.statValue}>{statistics.criticalCount}</div>
              <div style={styles.statLabel}>Critical ({'\u003C'}20%)</div>
            </div>
            <div style={{ ...styles.statCard, borderLeft: '4px solid #e67e22' }}>
              <div style={styles.statValue}>{statistics.lowCount}</div>
              <div style={styles.statLabel}>Low (20-40%)</div>
            </div>
            <div style={{ ...styles.statCard, borderLeft: '4px solid #f39c12' }}>
              <div style={styles.statValue}>{statistics.moderateCount}</div>
              <div style={styles.statLabel}>Moderate (40-60%)</div>
            </div>
            <div style={{ ...styles.statCard, borderLeft: '4px solid #3498db' }}>
              <div style={styles.statValue}>{statistics.goodCount}</div>
              <div style={styles.statLabel}>Good (60-90%)</div>
            </div>
            <div style={{ ...styles.statCard, borderLeft: '4px solid #2ecc71' }}>
              <div style={styles.statValue}>{statistics.fullCount}</div>
              <div style={styles.statLabel}>Full ({'\u003E'}90%)</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>
                {statistics.averagePercentageFull.toFixed(1)}%
              </div>
              <div style={styles.statLabel}>Average Capacity</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>
                {statistics.totalCurrentStorage.toFixed(1)} TMC
              </div>
              <div style={styles.statLabel}>Total Storage</div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Section */}
      {alerts.length > 0 && !loading && (
        <div style={styles.alertsSection}>
          <h2>🚨 Alerts & Warnings</h2>
          <div style={styles.alertsGrid}>
            {alerts.slice(0, 5).map((alert, idx) => (
              <div
                key={idx}
                style={{
                  ...styles.alertCard,
                  borderLeftColor: getAlertColor(alert.severity),
                }}
              >
                <div style={styles.alertHeader}>
                  <strong>{alert.station}</strong>
                  <span
                    style={{
                      ...styles.severityBadge,
                      backgroundColor:
                        alert.severity === 'high'
                          ? '#fee'
                          : alert.severity === 'medium'
                          ? '#fff3cd'
                          : '#d4edda',
                      color: getAlertColor(alert.severity),
                    }}
                  >
                    {alert.severity.toUpperCase()}
                  </span>
                </div>
                <p style={styles.alertMessage}>{alert.message}</p>
                <p style={styles.alertRecommendation}>
                  <strong>Action:</strong> {alert.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reservoir List */}
      {reservoirs.length > 0 && !loading && (
        <div style={styles.reservoirSection}>
          <h2>🏞️ Reservoir Details</h2>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Station/Dam</th>
                  <th style={styles.th}>District</th>
                  <th style={styles.th}>River</th>
                  <th style={styles.th}>Current Level</th>
                  <th style={styles.th}>Capacity</th>
                  <th style={styles.th}>Storage</th>
                  <th style={styles.th}>Inflow</th>
                  <th style={styles.th}>Outflow</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {reservoirs.map((reservoir, idx) => (
                  <tr key={idx} style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                    <td style={styles.td}>
                      <strong>{reservoir.damName || reservoir.station}</strong>
                    </td>
                    <td style={styles.td}>{reservoir.district}</td>
                    <td style={styles.td}>{reservoir.riverName || '-'}</td>
                    <td style={styles.td}>
                      {reservoir.currentLevel.toFixed(1)} ft
                      <br />
                      <small style={{ color: '#7f8c8d' }}>
                        (FRL: {reservoir.fullReservoirLevel.toFixed(0)} ft)
                      </small>
                    </td>
                    <td style={styles.td}>
                      <div
                        style={{
                          ...styles.progressBar,
                          width: '100px',
                          backgroundColor: '#ecf0f1',
                        }}
                      >
                        <div
                          style={{
                            ...styles.progressFill,
                            width: `${Math.min(100, reservoir.percentageFull)}%`,
                            backgroundColor: getStatusColor(reservoir.status),
                          }}
                        />
                      </div>
                      <strong>{reservoir.percentageFull.toFixed(1)}%</strong>
                    </td>
                    <td style={styles.td}>{reservoir.currentStorage.toFixed(2)} TMC</td>
                    <td style={styles.td}>{reservoir.inflow.toFixed(0)} cusecs</td>
                    <td style={styles.td}>{reservoir.outflow.toFixed(0)} cusecs</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: getStatusColor(reservoir.status),
                        }}
                      >
                        {reservoir.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Irrigation Recommendations */}
      {irrigationRecommendation && !loading && (
        <div style={styles.recommendationSection}>
          <h2>🌾 Irrigation Recommendations - {irrigationRecommendation.district}</h2>
          
          <div
            style={{
              ...styles.recommendationCard,
              borderLeftColor:
                irrigationRecommendation.criticalityLevel === 'high'
                  ? '#e74c3c'
                  : irrigationRecommendation.criticalityLevel === 'medium'
                  ? '#f39c12'
                  : '#2ecc71',
            }}
          >
            <div style={styles.recHeader}>
              <h3>Water Availability</h3>
              <span
                style={{
                  ...styles.criticalityBadge,
                  backgroundColor:
                    irrigationRecommendation.criticalityLevel === 'high'
                      ? '#fee'
                      : irrigationRecommendation.criticalityLevel === 'medium'
                      ? '#fff3cd'
                      : '#d4edda',
                }}
              >
                {irrigationRecommendation.criticalityLevel.toUpperCase()} PRIORITY
              </span>
            </div>
            <p style={styles.waterAmount}>
              <strong>Available Water:</strong>{' '}
              {irrigationRecommendation.availableWater.toFixed(2)} TMC
            </p>

            <div style={styles.recSection}>
              <h4>✅ Recommended Crops:</h4>
              <div style={styles.chipContainer}>
                {irrigationRecommendation.recommendedCrops.map((crop, idx) => (
                  <span key={idx} style={styles.chip}>
                    {crop}
                  </span>
                ))}
              </div>
            </div>

            <div style={styles.recSection}>
              <h4>📅 Irrigation Schedule:</h4>
              <p>{irrigationRecommendation.irrigationSchedule}</p>
            </div>

            <div style={styles.recSection}>
              <h4>💧 Water Saving Tips:</h4>
              <ul style={styles.tipsList}>
                {irrigationRecommendation.waterSavingTips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {reservoirs.length === 0 && !loading && !error && (
        <div style={styles.emptyState}>
          <p>No reservoir data available. Please check the river sheet in uzhavan.xlsx.</p>
        </div>
      )}

      {/* Last Updated */}
      {reservoirs.length > 0 && (
        <div style={styles.lastUpdated}>
          <p>
            📅 Last Updated:{' '}
            {reservoirs[0]?.lastUpdated
              ? new Date(reservoirs[0].lastUpdated).toLocaleString()
              : 'Unknown'}
          </p>
          <p style={{ fontSize: '12px', color: '#7f8c8d' }}>
            Data refreshed every 6 hours. Offline access available.
          </p>
        </div>
      )}
    </div>
  );
}

// Inline Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  title: {
    fontSize: '36px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: '16px',
    color: '#7f8c8d',
    marginBottom: '24px',
  },
  viewSelector: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  viewButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#ecf0f1',
    color: '#2c3e50',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  viewButtonActive: {
    backgroundColor: '#3498db',
    color: 'white',
  },
  districtSelector: {
    flex: '1',
    minWidth: '200px',
  },
  select: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #ccc',
    borderRadius: '8px',
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
  statsSection: {
    marginBottom: '32px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
  },
  statCard: {
    padding: '20px',
    backgroundColor: 'white',
    border: '1px solid #dee2e6',
    borderLeft: '4px solid #3498db',
    borderRadius: '8px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#7f8c8d',
  },
  alertsSection: {
    marginBottom: '32px',
  },
  alertsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
  },
  alertCard: {
    padding: '16px',
    backgroundColor: 'white',
    border: '1px solid #dee2e6',
    borderLeft: '4px solid',
    borderRadius: '8px',
  },
  alertHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  severityBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  alertMessage: {
    marginBottom: '12px',
    color: '#2c3e50',
  },
  alertRecommendation: {
    fontSize: '14px',
    color: '#7f8c8d',
  },
  reservoirSection: {
    marginBottom: '32px',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    border: '1px solid #dee2e6',
    backgroundColor: 'white',
  },
  th: {
    padding: '12px',
    backgroundColor: '#3498db',
    color: 'white',
    textAlign: 'left',
    fontWeight: 'bold',
    borderBottom: '2px solid #2980b9',
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
  progressBar: {
    height: '8px',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '4px',
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  recommendationSection: {
    marginBottom: '32px',
  },
  recommendationCard: {
    padding: '24px',
    backgroundColor: 'white',
    border: '1px solid #dee2e6',
    borderLeft: '4px solid',
    borderRadius: '8px',
  },
  recHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  criticalityBadge: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  waterAmount: {
    fontSize: '18px',
    marginBottom: '24px',
    color: '#2c3e50',
  },
  recSection: {
    marginBottom: '24px',
  },
  chipContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  chip: {
    padding: '6px 12px',
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    borderRadius: '16px',
    fontSize: '14px',
  },
  tipsList: {
    paddingLeft: '20px',
    lineHeight: '1.8',
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center',
    color: '#7f8c8d',
    fontSize: '18px',
  },
  lastUpdated: {
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    textAlign: 'center',
    color: '#7f8c8d',
  },
};

export default ReservoirLevelsScreen;
