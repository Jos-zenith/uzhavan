/**
 * Insurance Premium Calculator Component
 * Complete UI for Service #13: Insurance Premium Calculator
 * Direct integration with PMFBY (https://pmfby.gov.in/)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  insuranceService,
  PremiumCalculation,
  InsuranceScheme,
  InsuranceProvider,
  CropInsuranceType,
} from './insuranceService';
import { useVictori } from './victoriSdk';

export type UseInsuranceReturn = {
  calculation: PremiumCalculation | null;
  scheme: InsuranceScheme;
  providers: InsuranceProvider[];
  recentCalculations: PremiumCalculation[];
  loading: boolean;
  error: string | null;
  calculatePremium: (crop: string, season: CropInsuranceType, area: number) => void;
  openPMFBYPortal: () => void;
  openPMFBYCalculator: () => void;
  getProvidersForDistrict: (district: string) => void;
};

/**
 * useInsurance Hook
 * Manages insurance calculation and state
 */
export function useInsurance(): UseInsuranceReturn {
  const [calculation, setCalculation] = useState<PremiumCalculation | null>(null);
  const [providers, setProviders] = useState<InsuranceProvider[]>([]);
  const [recentCalculations, setRecentCalculations] = useState<PremiumCalculation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { track } = useVictori();
  const scheme = insuranceService.getSchemeDetails();

  const calculatePremium = useCallback(
    (crop: string, season: CropInsuranceType, area: number) => {
      setLoading(true);
      setError(null);

      try {
        const result = insuranceService.calculatePremium(crop, season, area);
        
        if (!result) {
          setError(`Invalid crop or season combination: ${crop} for ${season}`);
          setCalculation(null);
        } else {
          setCalculation(result);
          
          // Track calculation event
          track({
            eventId: 'INSURANCE_PREMIUM_CALCULATED',
            payload: {
              cropName: result.cropName,
              season: result.season,
              areaInHectares: result.areaInHectares,
              premiumAmount: result.farmerPremiumAmount,
              sumInsured: result.sumInsured,
              serviceId: 13,
            },
          });

          // Update recent calculations
          setRecentCalculations(insuranceService.getRecentCalculations());
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to calculate premium');
        setCalculation(null);
      } finally {
        setLoading(false);
      }
    },
    [track]
  );

  const openPMFBYPortal = useCallback(() => {
    insuranceService.openPMFBYPortal();
    track({
      eventId: 'INSURANCE_PREMIUM_CALCULATED',
      payload: {
        action: 'open_pmfby_portal',
        url: insuranceService.getPMFBYUrl(),
        serviceId: 13,
      },
    });
  }, [track]);

  const openPMFBYCalculator = useCallback(() => {
    insuranceService.openPMFBYCalculator();
    track({
      eventId: 'INSURANCE_PREMIUM_CALCULATED',
      payload: {
        action: 'open_pmfby_calculator',
        serviceId: 13,
      },
    });
  }, [track]);

  const getProvidersForDistrict = useCallback(
    (district: string) => {
      const districtProviders = insuranceService.getProvidersByDistrict(district);
      setProviders(districtProviders.length > 0 ? districtProviders : insuranceService.getAllProviders());
    },
    []
  );

  useEffect(() => {
    setProviders(insuranceService.getAllProviders());
    setRecentCalculations(insuranceService.getRecentCalculations());
  }, []);

  return {
    calculation,
    scheme,
    providers,
    recentCalculations,
    loading,
    error,
    calculatePremium,
    openPMFBYPortal,
    openPMFBYCalculator,
    getProvidersForDistrict,
  };
}

/**
 * InsurancePremiumCalculator Component
 * Full UI for insurance premium calculation with PMFBY integration
 */
export function InsurancePremiumCalculator() {
  const [selectedCrop, setSelectedCrop] = useState('paddy');
  const [selectedSeason, setSelectedSeason] = useState<CropInsuranceType>('kharif');
  const [area, setArea] = useState<number>(1);
  const [selectedDistrict, setSelectedDistrict] = useState('Chennai');
  const [showIframe, setShowIframe] = useState(false);

  const {
    calculation,
    scheme,
    providers,
    recentCalculations,
    loading,
    error,
    calculatePremium,
    openPMFBYPortal,
    openPMFBYCalculator,
    getProvidersForDistrict,
  } = useInsurance();

  const crops = insuranceService.getAllCrops();
  const seasons: CropInsuranceType[] = ['kharif', 'rabi', 'annual_horticultural', 'annual_commercial'];
  const districts = [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
    'Erode', 'Tiruppur', 'Thanjavur', 'Tirunelveli', 'Vellore',
    'Dindigul', 'Karur', 'Namakkal', 'Theni', 'Virudhunagar',
  ];

  const handleCalculate = () => {
    if (area > 0 && area <= 100) {
      calculatePremium(selectedCrop, selectedSeason, area);
    } else {
      alert('Please enter area between 0.1 and 100 hectares');
    }
  };

  const handleDistrictChange = (district: string) => {
    setSelectedDistrict(district);
    getProvidersForDistrict(district);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🛡️ Crop Insurance Premium Calculator</h1>
      <p style={styles.subtitle}>
        Pradhan Mantri Fasal Bima Yojana (PMFBY) - Tamil Nadu
      </p>

      {/* Quick Actions */}
      <div style={styles.quickActions}>
        <button style={styles.primaryButton} onClick={openPMFBYPortal}>
          🌐 Visit PMFBY Portal
        </button>
        <button style={styles.secondaryButton} onClick={openPMFBYCalculator}>
          🧮 Official Calculator
        </button>
        <button style={styles.secondaryButton} onClick={() => setShowIframe(!showIframe)}>
          {showIframe ? '📋 Hide' : '🔗 Embed'} PMFBY Portal
        </button>
        <a
          href={insuranceService.getRegistrationUrl()}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.linkButton}
        >
          📝 Register Now
        </a>
      </div>

      {/* PMFBY Portal Iframe */}
      {showIframe && (
        <div style={styles.iframeContainer}>
          <div style={styles.iframeHeader}>
            <h3>PMFBY Portal (https://pmfby.gov.in/)</h3>
            <button style={styles.closeButton} onClick={() => setShowIframe(false)}>
              ✕ Close
            </button>
          </div>
          <iframe
            src="https://pmfby.gov.in/"
            title="PMFBY Portal"
            style={styles.iframe}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
          <p style={styles.iframeNote}>
            Note: Some features may require opening in a new tab. Click "Visit PMFBY Portal" above.
          </p>
        </div>
      )}

      {/* Premium Calculator */}
      <div style={styles.calculatorSection}>
        <h2>📊 Calculate Your Premium</h2>

        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Select Crop:</label>
            <select
              style={styles.select}
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
            >
              {crops.map((crop) => (
                <option key={crop.name} value={crop.name.toLowerCase().replace(/\s+/g, '')}>
                  {crop.name} ({crop.farmerPremiumRate}% premium)
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Season:</label>
            <select
              style={styles.select}
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value as CropInsuranceType)}
            >
              {seasons.map((season) => (
                <option key={season} value={season}>
                  {season.replace(/_/g, ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Area (Hectares):</label>
            <input
              type="number"
              style={styles.input}
              value={area}
              onChange={(e) => setArea(parseFloat(e.target.value) || 0)}
              min="0.1"
              max="100"
              step="0.1"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>District:</label>
            <select
              style={styles.select}
              value={selectedDistrict}
              onChange={(e) => handleDistrictChange(e.target.value)}
            >
              {districts.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          style={styles.calculateButton}
          onClick={handleCalculate}
          disabled={loading}
        >
          {loading ? 'Calculating...' : '💰 Calculate Premium'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div style={styles.errorBox}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Calculation Result */}
      {calculation && (
        <div style={styles.resultSection}>
          <h2>💵 Premium Calculation Result</h2>
          
          <div style={styles.resultCard}>
            <div style={styles.resultHeader}>
              <h3>{calculation.cropName} - {calculation.season.toUpperCase()}</h3>
              <span style={styles.areaBadge}>{calculation.areaInHectares} Hectares</span>
            </div>

            <div style={styles.resultGrid}>
              <div style={styles.resultItem}>
                <span style={styles.resultLabel}>Sum Insured:</span>
                <span style={styles.resultValue}>₹{calculation.sumInsured.toLocaleString()}</span>
              </div>

              <div style={{ ...styles.resultItem, ...styles.highlightItem }}>
                <span style={styles.resultLabel}>Your Premium (Farmer):</span>
                <span style={styles.resultValueLarge}>
                  ₹{calculation.farmerPremiumAmount.toLocaleString()}
                </span>
                <span style={styles.resultNote}>
                  ({calculation.farmerPremiumRate}% of sum insured)
                </span>
              </div>

              <div style={styles.resultItem}>
                <span style={styles.resultLabel}>Government Subsidy:</span>
                <span style={styles.resultValue}>
                  ₹{calculation.governmentSubsidy.toLocaleString()}
                </span>
              </div>

              <div style={styles.resultItem}>
                <span style={styles.resultLabel}>Total Premium:</span>
                <span style={styles.resultValue}>
                  ₹{calculation.totalPremium.toLocaleString()}
                </span>
              </div>
            </div>

            <div style={styles.coverageBox}>
              <strong>Coverage Details:</strong>
              <p>{calculation.coverageDetails}</p>
            </div>

            <div style={styles.actionButtons}>
              <button style={styles.actionButton} onClick={() => openPMFBYPortal()}>
                Apply for Insurance
              </button>
              <button
                style={styles.actionButtonSecondary}
                onClick={() => window.print()}
              >
                🖨️ Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PMFBY Scheme Details */}
      <div style={styles.schemeSection}>
        <h2>📋 {scheme.schemeName}</h2>
        <p style={styles.schemeDescription}>{scheme.description}</p>

        <div style={styles.schemeGrid}>
          <div style={styles.schemeCard}>
            <h3>✅ Eligibility</h3>
            <ul style={styles.list}>
              {scheme.eligibility.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div style={styles.schemeCard}>
            <h3>🛡️ Coverage</h3>
            <ul style={styles.list}>
              {scheme.coverage.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div style={styles.schemeCard}>
            <h3>⭐ Key Features</h3>
            <ul style={styles.list}>
              {scheme.keyFeatures.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div style={styles.schemeCard}>
            <h3>📄 Required Documents</h3>
            <ul style={styles.list}>
              {scheme.documents.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div style={styles.claimProcess}>
          <h3>🔄 Claim Process</h3>
          <ol style={styles.orderedList}>
            {scheme.claimProcess.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
        </div>
      </div>

      {/* Insurance Providers */}
      <div style={styles.providersSection}>
        <h2>📞 Insurance Providers - {selectedDistrict}</h2>
        
        <div style={styles.providersGrid}>
          {providers.map((provider, idx) => (
            <div key={idx} style={styles.providerCard}>
              <h3>{provider.name}</h3>
              <p><strong>Districts Covered:</strong> {provider.districts.join(', ')}</p>
              <p><strong>📞 Helpline:</strong> {provider.contactNumber}</p>
              <p><strong>📧 Email:</strong> {provider.email}</p>
              <a
                href={provider.website}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.providerLink}
              >
                Visit Website →
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Calculations */}
      {recentCalculations.length > 0 && (
        <div style={styles.recentSection}>
          <h2>🕒 Recent Calculations</h2>
          <div style={styles.recentGrid}>
            {recentCalculations.slice(0, 3).map((calc, idx) => (
              <div key={idx} style={styles.recentCard}>
                <strong>{calc.cropName}</strong> - {calc.season}
                <p>{calc.areaInHectares} ha → ₹{calc.farmerPremiumAmount.toLocaleString()}</p>
                <span style={styles.recentDate}>
                  {new Date(calc.calculatedAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Helpline */}
      <div style={styles.helpline}>
        <h3>📞 PMFBY Toll-Free Helpline</h3>
        <p style={styles.helplineNumber}>{insuranceService.getHelpline()}</p>
        <p>Available 24/7 for queries and claim intimation</p>
      </div>
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
    fontSize: '18px',
    color: '#7f8c8d',
    marginBottom: '24px',
  },
  quickActions: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  primaryButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#2ecc71',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  linkButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#e74c3c',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    display: 'inline-block',
  },
  iframeContainer: {
    marginBottom: '24px',
    border: '2px solid #3498db',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  iframeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#3498db',
    color: 'white',
  },
  closeButton: {
    padding: '6px 12px',
    backgroundColor: 'white',
    color: '#3498db',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  iframe: {
    width: '100%',
    height: '600px',
    border: 'none',
  },
  iframeNote: {
    padding: '12px',
    backgroundColor: '#ecf0f1',
    fontSize: '14px',
    color: '#7f8c8d',
    textAlign: 'center',
  },
  calculatorSection: {
    marginBottom: '32px',
    padding: '24px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
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
  input: {
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ccc',
    borderRadius: '6px',
  },
  calculateButton: {
    width: '100%',
    padding: '14px',
    fontSize: '18px',
    fontWeight: 'bold',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  errorBox: {
    padding: '12px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  resultSection: {
    marginBottom: '32px',
  },
  resultCard: {
    padding: '24px',
    backgroundColor: 'white',
    border: '2px solid #27ae60',
    borderRadius: '8px',
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  areaBadge: {
    padding: '6px 12px',
    backgroundColor: '#3498db',
    color: 'white',
    borderRadius: '6px',
    fontSize: '14px',
  },
  resultGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  resultItem: {
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
  },
  highlightItem: {
    backgroundColor: '#d5f4e6',
    border: '2px solid #27ae60',
  },
  resultLabel: {
    display: 'block',
    fontSize: '14px',
    color: '#7f8c8d',
    marginBottom: '8px',
  },
  resultValue: {
    display: 'block',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  resultValueLarge: {
    display: 'block',
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#27ae60',
  },
  resultNote: {
    display: 'block',
    fontSize: '12px',
    color: '#7f8c8d',
    marginTop: '4px',
  },
  coverageBox: {
    padding: '16px',
    backgroundColor: '#e8f5e9',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
  },
  actionButton: {
    flex: 1,
    padding: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  actionButtonSecondary: {
    flex: 1,
    padding: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#95a5a6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  schemeSection: {
    marginBottom: '32px',
  },
  schemeDescription: {
    fontSize: '16px',
    color: '#7f8c8d',
    marginBottom: '24px',
  },
  schemeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  schemeCard: {
    padding: '20px',
    backgroundColor: 'white',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
  },
  list: {
    paddingLeft: '20px',
    lineHeight: '1.8',
  },
  orderedList: {
    paddingLeft: '20px',
    lineHeight: '1.8',
  },
  claimProcess: {
    padding: '20px',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    borderRadius: '8px',
  },
  providersSection: {
    marginBottom: '32px',
  },
  providersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
  },
  providerCard: {
    padding: '20px',
    backgroundColor: 'white',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
  },
  providerLink: {
    display: 'inline-block',
    marginTop: '12px',
    color: '#3498db',
    textDecoration: 'none',
    fontWeight: 'bold',
  },
  recentSection: {
    marginBottom: '32px',
  },
  recentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
  },
  recentCard: {
    padding: '16px',
    backgroundColor: '#ecf0f1',
    borderRadius: '8px',
  },
  recentDate: {
    fontSize: '12px',
    color: '#7f8c8d',
  },
  helpline: {
    padding: '24px',
    backgroundColor: '#e8f5e9',
    borderRadius: '8px',
    textAlign: 'center',
  },
  helplineNumber: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#27ae60',
    margin: '12px 0',
  },
};

export default InsurancePremiumCalculator;
