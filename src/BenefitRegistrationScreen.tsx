/**
 * Benefit Registration Screen Component
 * Complete UI for Service #2: Benefit Registration
 * Uses block_eng sheet from uzhavan.xlsx for district/block mapping
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  benefitRegistrationService,
  BenefitScheme,
  FarmerDetails,
  BenefitRegistration,
  BlockData,
  RegistrationStats,
} from './benefitRegistrationService';
import { useVictori, BUSINESS_POLICIES } from './victoriSdk';

export type UseBenefitRegistrationReturn = {
  schemes: BenefitScheme[];
  districts: string[];
  blocks: BlockData[];
  registrations: BenefitRegistration[];
  stats: RegistrationStats | null;
  loading: boolean;
  error: string | null;
  loadSchemes: () => Promise<void>;
  loadDistricts: () => Promise<void>;
  loadBlocks: (district: string) => Promise<void>;
  registerFarmer: (farmerDetails: FarmerDetails, schemeId: string) => Promise<BenefitRegistration>;
  loadRegistrationsByMobile: (mobile: string) => Promise<void>;
  loadAllRegistrations: () => Promise<void>;
  loadStats: () => Promise<void>;
  updateStatus: (
    registrationId: string,
    status: BenefitRegistration['status'],
    remarks?: string,
    approvedAmount?: number
  ) => Promise<void>;
};

/**
 * useBenefitRegistration Hook
 * Manages benefit registration state and operations
 */
export function useBenefitRegistration(): UseBenefitRegistrationReturn {
  const [schemes, setSchemes] = useState<BenefitScheme[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [registrations, setRegistrations] = useState<BenefitRegistration[]>([]);
  const [stats, setStats] = useState<RegistrationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { track } = useVictori();

  const loadSchemes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await benefitRegistrationService.getBenefitSchemes();
      setSchemes(data);

      track({
        policyId: BUSINESS_POLICIES.POL_BENEFIT_REGISTRATION,
        eventId: 'REGISTRATION_FORM_VIEWED',
        payload: {
          farmerId: 'anonymous_farmer',
          schemeId: 'all_schemes',
        },
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to load schemes');
    } finally {
      setLoading(false);
    }
  }, [track]);

  const loadDistricts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await benefitRegistrationService.getDistricts();
      setDistricts(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load districts');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBlocks = useCallback(async (district: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await benefitRegistrationService.getBlocksByDistrict(district);
      setBlocks(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load blocks');
    } finally {
      setLoading(false);
    }
  }, []);

  const registerFarmer = useCallback(
    async (farmerDetails: FarmerDetails, schemeId: string) => {
      setLoading(true);
      setError(null);
      try {
        const registration = await benefitRegistrationService.registerBenefit(
          farmerDetails,
          schemeId
        );

        track({
          policyId: BUSINESS_POLICIES.POL_BENEFIT_REGISTRATION,
          eventId: 'REGISTRATION_SUBMITTED',
          payload: {
            farmerId: farmerDetails.mobileNumber,
            schemeId,
            aadhaarNumber: farmerDetails.aadhaarNumber,
            bankAccountNumber: farmerDetails.bankAccountNumber,
            landArea: farmerDetails.landArea,
            cropType: farmerDetails.cropType,
            bankIfsc: farmerDetails.ifscCode,
          },
        });

        return registration;
      } catch (err: any) {
        setError(err?.message || 'Failed to register farmer');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [track]
  );

  const loadRegistrationsByMobile = useCallback(async (mobile: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await benefitRegistrationService.getRegistrationsByMobile(mobile);
      setRegistrations(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load registrations');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllRegistrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await benefitRegistrationService.getAllRegistrations();
      setRegistrations(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load registrations');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await benefitRegistrationService.getRegistrationStats();
      setStats(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = useCallback(
    async (
      registrationId: string,
      status: BenefitRegistration['status'],
      remarks?: string,
      approvedAmount?: number
    ) => {
      setLoading(true);
      setError(null);
      try {
        await benefitRegistrationService.updateRegistrationStatus(
          registrationId,
          status,
          remarks,
          approvedAmount
        );
        // Reload registrations
        await loadAllRegistrations();
      } catch (err: any) {
        setError(err?.message || 'Failed to update status');
      } finally {
        setLoading(false);
      }
    },
    [loadAllRegistrations]
  );

  return {
    schemes,
    districts,
    blocks,
    registrations,
    stats,
    loading,
    error,
    loadSchemes,
    loadDistricts,
    loadBlocks,
    registerFarmer,
    loadRegistrationsByMobile,
    loadAllRegistrations,
    loadStats,
    updateStatus,
  };
}

/**
 * BenefitRegistrationScreen Component
 * Full UI for benefit registration management
 */
export function BenefitRegistrationScreen() {
  const [activeTab, setActiveTab] = useState<'register' | 'view' | 'schemes' | 'stats'>('schemes');
  const [selectedScheme, setSelectedScheme] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedBlock, setSelectedBlock] = useState<string>('');
  const [searchMobile, setSearchMobile] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState<FarmerDetails>({
    farmerName: '',
    mobileNumber: '',
    aadhaarNumber: '',
    landArea: 0,
    cropType: '',
    lgdDistrictCode: '',
    districtName: '',
    blockName: '',
    villageName: '',
    bankAccountNumber: '',
    ifscCode: '',
  });

  const {
    schemes,
    districts,
    blocks,
    registrations,
    stats,
    loading,
    error,
    loadSchemes,
    loadDistricts,
    loadBlocks,
    registerFarmer,
    loadRegistrationsByMobile,
    loadAllRegistrations,
    loadStats,
  } = useBenefitRegistration();

  useEffect(() => {
    loadSchemes();
    loadDistricts();
    loadStats();
  }, [loadSchemes, loadDistricts, loadStats]);

  useEffect(() => {
    if (selectedDistrict) {
      loadBlocks(selectedDistrict);
    }
  }, [selectedDistrict, loadBlocks]);

  const handleDistrictChange = (district: string) => {
    setSelectedDistrict(district);
    setFormData((prev) => ({
      ...prev,
      districtName: district,
      blockName: '',
      lgdDistrictCode: '',
    }));
  };

  const handleBlockChange = (blockName: string) => {
    const block = blocks.find((b) => b.blockName === blockName);
    if (block) {
      setSelectedBlock(blockName);
      setFormData((prev) => ({
        ...prev,
        blockName: block.blockName,
        lgdDistrictCode: block.lgdDistrictCode,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');

    // Validation
    if (!formData.farmerName || !formData.mobileNumber || !selectedScheme) {
      alert('Please fill all required fields');
      return;
    }

    if (formData.mobileNumber.length !== 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

    try {
      const registration = await registerFarmer(formData, selectedScheme);
      setSuccessMessage(
        `✅ Registration Successful! Application Number: ${registration.applicationNumber}`
      );

      // Reset form
      setFormData({
        farmerName: '',
        mobileNumber: '',
        aadhaarNumber: '',
        landArea: 0,
        cropType: '',
        lgdDistrictCode: '',
        districtName: '',
        blockName: '',
        villageName: '',
        bankAccountNumber: '',
        ifscCode: '',
      });
      setSelectedScheme('');
      setSelectedDistrict('');
      setSelectedBlock('');

      // Switch to view tab
      setTimeout(() => {
        setActiveTab('view');
        loadAllRegistrations();
      }, 2000);
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  const handleSearch = () => {
    if (searchMobile.length === 10) {
      loadRegistrationsByMobile(searchMobile);
    } else {
      alert('Please enter a valid 10-digit mobile number');
    }
  };

  const getStatusColor = (status: BenefitRegistration['status']) => {
    switch (status) {
      case 'Approved':
        return '#2ecc71';
      case 'Completed':
        return '#3498db';
      case 'Pending':
        return '#f39c12';
      case 'Under Review':
        return '#9b59b6';
      case 'Rejected':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🌾 Benefit Registration Portal</h1>
      <p style={styles.subtitle}>Government Agricultural Schemes - Tamil Nadu</p>

      {/* Tab Navigation */}
      <div style={styles.tabContainer}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'schemes' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('schemes')}
        >
          📋 Schemes
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'register' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('register')}
        >
          ✍️ Register
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'view' ? styles.tabActive : {}),
          }}
          onClick={() => {
            setActiveTab('view');
            loadAllRegistrations();
          }}
        >
          📂 My Registrations
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'stats' ? styles.tabActive : {}),
          }}
          onClick={() => {
            setActiveTab('stats');
            loadStats();
          }}
        >
          📊 Statistics
        </button>
      </div>

      {error && (
        <div style={styles.errorBox}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {successMessage && (
        <div style={styles.successBox}>
          {successMessage}
        </div>
      )}

      {/* Schemes Tab */}
      {activeTab === 'schemes' && (
        <div style={styles.content}>
          <h2>Available Benefit Schemes</h2>
          {loading ? (
            <p>Loading schemes...</p>
          ) : (
            <div style={styles.schemesGrid}>
              {schemes.map((scheme) => (
                <div key={scheme.schemeId} style={styles.schemeCard}>
                  <h3 style={styles.schemeTitle}>{scheme.schemeName}</h3>
                  <div style={styles.schemeBadge}>{scheme.schemeType}</div>
                  <p style={styles.schemeDesc}>{scheme.description}</p>
                  
{scheme.benefitAmount && (
                    <div style={styles.benefitAmount}>
                      <strong>Benefit Amount:</strong> ₹{scheme.benefitAmount.toLocaleString()}
                    </div>
                  )}
                  
                  <div style={styles.schemeDetails}>
                    <h4>Eligibility:</h4>
                    <ul style={styles.criteriaList}>
                      {scheme.eligibilityCriteria.map((criteria, idx) => (
                        <li key={idx}>{criteria}</li>
                      ))}
                    </ul>
                    
                    <h4>Required Documents:</h4>
                    <ul style={styles.docList}>
                      {scheme.requiredDocuments.map((doc, idx) => (
                        <li key={idx}>{doc}</li>
                      ))}
                    </ul>
                    
                    <p style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '12px' }}>
                      <strong>Department:</strong> {scheme.department}
                    </p>
                    {scheme.applicationDeadline && (
                      <p style={{ fontSize: '12px', color: '#e74c3c' }}>
                        <strong>Deadline:</strong> {scheme.applicationDeadline}
                      </p>
                    )}
                  </div>
                  
                  <button
                    style={styles.applyButton}
                    onClick={() => {
                      setSelectedScheme(scheme.schemeId);
                      setActiveTab('register');
                    }}
                  >
                    Apply Now →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Registration Form Tab */}
      {activeTab === 'register' && (
        <div style={styles.content}>
          <h2>Benefit Registration Form</h2>
          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Scheme Selection */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Select Scheme *</label>
              <select
                style={styles.select}
                value={selectedScheme}
                onChange={(e) => setSelectedScheme(e.target.value)}
                required
              >
                <option value="">-- Select a scheme --</option>
                {schemes.map((scheme) => (
                  <option key={scheme.schemeId} value={scheme.schemeId}>
                    {scheme.schemeName}
                  </option>
                ))}
              </select>
            </div>

            {/* Farmer Details */}
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Farmer Name *</label>
                <input
                  type="text"
                  style={styles.input}
                  value={formData.farmerName}
                  onChange={(e) => setFormData({ ...formData, farmerName: e.target.value })}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Mobile Number *</label>
                <input
                  type="tel"
                  style={styles.input}
                  value={formData.mobileNumber}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                  maxLength={10}
                  required
                />
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Aadhaar Number</label>
                <input
                  type="text"
                  style={styles.input}
                  value={formData.aadhaarNumber}
                  onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value })}
                  maxLength={12}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Land Area (acres)</label>
                <input
                  type="number"
                  style={styles.input}
                  value={formData.landArea || ''}
                  onChange={(e) => setFormData({ ...formData, landArea: Number(e.target.value) })}
                  step="0.1"
                />
              </div>
            </div>

            {/* Location Details */}
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>District *</label>
                <select
                  style={styles.select}
                  value={selectedDistrict}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  required
                >
                  <option value="">-- Select District --</option>
                  {districts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Block *</label>
                <select
                  style={styles.select}
                  value={selectedBlock}
                  onChange={(e) => handleBlockChange(e.target.value)}
                  required
                  disabled={!selectedDistrict}
                >
                  <option value="">-- Select Block --</option>
                  {blocks.map((block) => (
                    <option key={block.blockName} value={block.blockName}>
                      {block.blockName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Village Name</label>
              <input
                type="text"
                style={styles.input}
                value={formData.villageName}
                onChange={(e) => setFormData({ ...formData, villageName: e.target.value })}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Crop Type</label>
              <input
                type="text"
                style={styles.input}
                value={formData.cropType}
                onChange={(e) => setFormData({ ...formData, cropType: e.target.value })}
                placeholder="e.g., Rice, Cotton, Sugarcane"
              />
            </div>

            {/* Bank Details */}
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Bank Account Number</label>
                <input
                  type="text"
                  style={styles.input}
                  value={formData.bankAccountNumber}
                  onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>IFSC Code</label>
                <input
                  type="text"
                  style={styles.input}
                  value={formData.ifscCode}
                  onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                  maxLength={11}
                />
              </div>
            </div>

            <button type="submit" style={styles.submitButton} disabled={loading}>
              {loading ? 'Submitting...' : '✓ Submit Registration'}
            </button>
          </form>
        </div>
      )}

      {/* View Registrations Tab */}
      {activeTab === 'view' && (
        <div style={styles.content}>
          <h2>My Benefit Registrations</h2>
          
          {/* Search by Mobile */}
          <div style={styles.searchBox}>
            <input
              type="tel"
              style={styles.searchInput}
              placeholder="Enter mobile number to search"
              value={searchMobile}
              onChange={(e) => setSearchMobile(e.target.value)}
              maxLength={10}
            />
            <button style={styles.searchButton} onClick={handleSearch}>
              🔍 Search
            </button>
          </div>

          {loading ? (
            <p>Loading registrations...</p>
          ) : registrations.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No registrations found. Register for a scheme to get started!</p>
            </div>
          ) : (
            <div style={styles.registrationsGrid}>
              {registrations.map((reg) => (
                <div key={reg.registrationId} style={styles.registrationCard}>
                  <div style={styles.regHeader}>
                    <strong>{reg.schemeName}</strong>
                    <span
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: getStatusColor(reg.status),
                      }}
                    >
                      {reg.status}
                    </span>
                  </div>
                  
                  <div style={styles.regDetails}>
                    <p>
                      <strong>Application No:</strong> {reg.applicationNumber}
                    </p>
                    <p>
                      <strong>Farmer:</strong> {reg.farmerDetails.farmerName}
                    </p>
                    <p>
                      <strong>Mobile:</strong> {reg.farmerDetails.mobileNumber}
                    </p>
                    <p>
                      <strong>Location:</strong> {reg.farmerDetails.blockName}, {reg.farmerDetails.districtName}
                    </p>
                    <p>
                      <strong>Registration Date:</strong>{' '}
                      {new Date(reg.registrationDate).toLocaleDateString()}
                    </p>
                    {reg.approvedAmount && (
                      <p style={{ color: '#2ecc71', fontWeight: 'bold' }}>
                        <strong>Approved Amount:</strong> ₹{reg.approvedAmount.toLocaleString()}
                      </p>
                    )}
                    {reg.remarks && (
                      <p style={{ fontSize: '14px', color: '#7f8c8d' }}>
                        <strong>Remarks:</strong> {reg.remarks}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && stats && (
        <div style={styles.content}>
          <h2>Registration Statistics</h2>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{stats.totalRegistrations}</div>
              <div style={styles.statLabel}>Total Registrations</div>
            </div>
            <div style={{ ...styles.statCard, borderLeft: '4px solid #f39c12' }}>
              <div style={styles.statValue}>{stats.pendingCount}</div>
              <div style={styles.statLabel}>Pending</div>
            </div>
            <div style={{ ...styles.statCard, borderLeft: '4px solid #2ecc71' }}>
              <div style={styles.statValue}>{stats.approvedCount}</div>
              <div style={styles.statLabel}>Approved</div>
            </div>
            <div style={{ ...styles.statCard, borderLeft: '4px solid #3498db' }}>
              <div style={styles.statValue}>{stats.completedCount}</div>
              <div style={styles.statLabel}>Completed</div>
            </div>
            <div style={{ ...styles.statCard, borderLeft: '4px solid #e74c3c' }}>
              <div style={styles.statValue}>{stats.rejectedCount}</div>
              <div style={styles.statLabel}>Rejected</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>₹{stats.totalBenefitAmount.toLocaleString()}</div>
              <div style={styles.statLabel}>Total Benefits</div>
            </div>
          </div>

          {/* Scheme-wise breakdown */}
          <h3 style={{ marginTop: '32px' }}>Scheme-wise Registrations</h3>
          <div style={styles.chartContainer}>
            {Object.entries(stats.schemeWiseCount).map(([scheme, count]) => (
              <div key={scheme} style={styles.chartRow}>
                <div style={styles.chartLabel}>{scheme}</div>
                <div style={styles.chartBar}>
                  <div
                    style={{
                      ...styles.chartFill,
                      width: `${(count / stats.totalRegistrations) * 100}%`,
                    }}
                  />
                </div>
                <div style={styles.chartValue}>{count}</div>
              </div>
            ))}
          </div>

          {/* District-wise breakdown */}
          <h3 style={{ marginTop: '32px' }}>District-wise Registrations</h3>
          <div style={styles.chartContainer}>
            {Object.entries(stats.districtWiseCount).map(([district, count]) => (
              <div key={district} style={styles.chartRow}>
                <div style={styles.chartLabel}>{district}</div>
                <div style={styles.chartBar}>
                  <div
                    style={{
                      ...styles.chartFill,
                      width: `${(count / stats.totalRegistrations) * 100}%`,
                      backgroundColor: '#3498db',
                    }}
                  />
                </div>
                <div style={styles.chartValue}>{count}</div>
              </div>
            ))}
          </div>
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
  tabContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '2px solid #ecf0f1',
  },
  tab: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: 'transparent',
    color: '#7f8c8d',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  tabActive: {
    color: '#3498db',
    borderBottomColor: '#3498db',
  },
  errorBox: {
    padding: '12px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  successBox: {
    padding: '12px',
    backgroundColor: '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  content: {
    marginTop: '20px',
  },
  schemesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '20px',
    marginTop: '16px',
  },
  schemeCard: {
    padding: '20px',
    backgroundColor: 'white',
    border: '2px solid #ecf0f1',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  schemeTitle: {
    fontSize: '20px',
    color: '#2c3e50',
    marginBottom: '8px',
  },
  schemeBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#3498db',
    color: 'white',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    marginBottom: '12px',
  },
  schemeDesc: {
    color: '#7f8c8d',
    marginBottom: '16px',
    lineHeight: '1.5',
  },
  benefitAmount: {
    padding: '12px',
    backgroundColor: '#d4edda',
    color: '#155724',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  schemeDetails: {
    marginTop: '16px',
  },
  criteriaList: {
    paddingLeft: '20px',
    lineHeight: '1.8',
    fontSize: '14px',
  },
  docList: {
    paddingLeft: '20px',
    lineHeight: '1.8',
    fontSize: '14px',
  },
  applyButton: {
    width: '100%',
    padding: '12px',
    marginTop: '16px',
    backgroundColor: '#2ecc71',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  form: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: 'white',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  input: {
    width: '100%',
    padding: '10px',
    fontSize: '16px',
    border: '1px solid #ccc',
    borderRadius: '4px',
  },
  select: {
    width: '100%',
    padding: '10px',
    fontSize: '16px',
    border: '1px solid #ccc',
    borderRadius: '4px',
  },
  submitButton: {
    width: '100%',
    padding: '14px',
    fontSize: '18px',
    fontWeight: 'bold',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginTop: '20px',
  },
  searchBox: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  searchInput: {
    flex: 1,
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #ccc',
    borderRadius: '6px',
  },
  searchButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  registrationsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '16px',
  },
  registrationCard: {
    padding: '16px',
    backgroundColor: 'white',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
  },
  regHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid #ecf0f1',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  regDetails: {
    fontSize: '14px',
    lineHeight: '1.8',
    color: '#2c3e50',
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center',
    color: '#7f8c8d',
    fontSize: '18px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginTop: '16px',
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
  chartContainer: {
    marginTop: '16px',
  },
  chartRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  chartLabel: {
    width: '200px',
    fontSize: '14px',
    color: '#2c3e50',
  },
  chartBar: {
    flex: 1,
    height: '24px',
    backgroundColor: '#ecf0f1',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  chartFill: {
    height: '100%',
    backgroundColor: '#2ecc71',
    transition: 'width 0.3s ease',
  },
  chartValue: {
    width: '50px',
    textAlign: 'right',
    fontWeight: 'bold',
    color: '#2c3e50',
  },
};

export default BenefitRegistrationScreen;
