/**
 * Machinery Hiring Screen Component
 * Service #6: Agricultural Machinery Rental & Repair Portal
 * 
 * Features:
 * - Browse machinery catalogue offline
 * - Book machinery (requires server)
 * - View hiring centre directory
 * - Contact mechanics for repairs
 * - Track bookings and usage statistics
 */

import React, { useState, useEffect } from 'react';
import {
  machineryHiringService,
  MachineryData,
  MechanicData,
  MachineryBooking,
  RepairRequest,
  MachineryType,
  BookingDetails,
  UsageStatistics,
} from './machineryHiringService';
import { victoriSdk } from './victoriSdk';

// ============================================================
// CUSTOM HOOK
// ============================================================

function useMachineryHiring() {
  const [machinery, setMachinery] = useState<MachineryData[]>([]);
  const [mechanics, setMechanics] = useState<MechanicData[]>([]);
  const [bookings, setBookings] = useState<MachineryBooking[]>([]);
  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([]);
  const [stats, setStats] = useState<UsageStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load machinery catalogue
  const loadMachinery = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await machineryHiringService.getAllMachinery();
      setMachinery(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load machinery data');
    } finally {
      setLoading(false);
    }
  };

  // Load mechanics
  const loadMechanics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await machineryHiringService.getAllMechanics();
      setMechanics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load mechanic data');
    } finally {
      setLoading(false);
    }
  };

  // Search machinery
  const searchMachinery = async (district?: string, type?: MachineryType) => {
    try {
      setLoading(true);
      setError(null);
      const data = await machineryHiringService.searchMachinery(district, type);
      setMachinery(data);
    } catch (err: any) {
      setError(err.message || 'Failed to search machinery');
    } finally {
      setLoading(false);
    }
  };

  // Book machinery
  const bookMachinery = async (
    farmerDetails: BookingDetails,
    machineryType: MachineryType,
    rentalDate: string,
    duration: number
  ) => {
    try {
      setLoading(true);
      setError(null);
      const booking = await machineryHiringService.bookMachinery(
        farmerDetails,
        machineryType,
        rentalDate,
        duration
      );

      // Track event
      if (victoriSdk) {
        victoriSdk.track('ANY_EVENT_WITH_LOCATION', {
          service: 'Machinery Hiring',
          action: 'Book Machinery',
          machineryType,
          duration,
          district: farmerDetails.district,
        });
      }

      return booking;
    } catch (err: any) {
      setError(err.message || 'Failed to book machinery');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load bookings by mobile
  const loadBookingsByMobile = async (mobileNumber: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await machineryHiringService.getBookingsByMobile(mobileNumber);
      setBookings(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  // Request repair
  const requestRepair = async (
    farmerDetails: BookingDetails,
    machineryType: MachineryType,
    problemDescription: string,
    urgency: RepairRequest['urgency']
  ) => {
    try {
      setLoading(true);
      setError(null);
      const request = await machineryHiringService.requestRepair(
        farmerDetails,
        machineryType,
        problemDescription,
        urgency
      );

      // Track event
      if (victoriSdk) {
        victoriSdk.track('ANY_EVENT_WITH_LOCATION', {
          service: 'Machinery Hiring',
          action: 'Request Repair',
          machineryType,
          urgency,
          district: farmerDetails.district,
        });
      }

      return request;
    } catch (err: any) {
      setError(err.message || 'Failed to request repair');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load repair requests by mobile
  const loadRepairRequestsByMobile = async (mobileNumber: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await machineryHiringService.getRepairRequestsByMobile(mobileNumber);
      setRepairRequests(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load repair requests');
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await machineryHiringService.getUsageStatistics();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  return {
    machinery,
    mechanics,
    bookings,
    repairRequests,
    stats,
    loading,
    error,
    loadMachinery,
    loadMechanics,
    searchMachinery,
    bookMachinery,
    loadBookingsByMobile,
    requestRepair,
    loadRepairRequestsByMobile,
    loadStatistics,
  };
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function MachineryHiringScreen() {
  const [activeTab, setActiveTab] = useState<'catalogue' | 'book' | 'repair' | 'bookings' | 'stats'>('catalogue');
  
  const {
    machinery,
    mechanics,
    bookings,
    repairRequests,
    stats,
    loading,
    error,
    loadMachinery,
    loadMechanics,
    searchMachinery,
    bookMachinery,
    loadBookingsByMobile,
    requestRepair,
    loadRepairRequestsByMobile,
    loadStatistics,
  } = useMachineryHiring();

  // Catalogue tab state
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterType, setFilterType] = useState<MachineryType | ''>('');

  // Booking tab state
  const [bookingForm, setBookingForm] = useState({
    farmerName: '',
    mobileNumber: '',
    district: '',
    block: '',
    villageName: '',
    landArea: '',
    cropType: '',
    machineryType: '' as MachineryType | '',
    rentalDate: '',
    duration: '',
  });

  // Repair tab state
  const [repairForm, setRepairForm] = useState({
    farmerName: '',
    mobileNumber: '',
    district: '',
    block: '',
    machineryType: '' as MachineryType | '',
    problemDescription: '',
    urgency: 'Medium' as RepairRequest['urgency'],
  });

  // Search state
  const [searchMobile, setSearchMobile] = useState('');
  const [repairSearchMobile, setRepairSearchMobile] = useState('');

  // Load initial data
  useEffect(() => {
    loadMachinery();
    loadMechanics();
  }, []);

  // Handle catalogue search
  const handleCatalogueSearch = () => {
    searchMachinery(
      filterDistrict || undefined,
      (filterType as MachineryType) || undefined
    );
  };

  // Handle booking submission
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bookingForm.farmerName || !bookingForm.mobileNumber || !bookingForm.district || 
        !bookingForm.machineryType || !bookingForm.rentalDate || !bookingForm.duration) {
      alert('Please fill all required fields');
      return;
    }

    if (bookingForm.mobileNumber.length !== 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

    try {
      const farmerDetails: BookingDetails = {
        farmerName: bookingForm.farmerName,
        mobileNumber: bookingForm.mobileNumber,
        district: bookingForm.district,
        block: bookingForm.block,
        villageName: bookingForm.villageName || undefined,
        landArea: bookingForm.landArea ? Number(bookingForm.landArea) : undefined,
        cropType: bookingForm.cropType || undefined,
      };

      const booking = await bookMachinery(
        farmerDetails,
        bookingForm.machineryType as MachineryType,
        bookingForm.rentalDate,
        Number(bookingForm.duration)
      );

      alert(`Booking successful!\nConfirmation: ${booking.confirmationNumber}\nTotal Cost: ₹${booking.totalCost}`);
      
      // Reset form
      setBookingForm({
        farmerName: '',
        mobileNumber: '',
        district: '',
        block: '',
        villageName: '',
        landArea: '',
        cropType: '',
        machineryType: '',
        rentalDate: '',
        duration: '',
      });

      // Switch to bookings tab
      setActiveTab('bookings');
      loadBookingsByMobile(farmerDetails.mobileNumber);
    } catch (err: any) {
      alert(`Booking failed: ${err.message}`);
    }
  };

  // Handle repair submission
  const handleRepairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!repairForm.farmerName || !repairForm.mobileNumber || !repairForm.district ||
        !repairForm.machineryType || !repairForm.problemDescription) {
      alert('Please fill all required fields');
      return;
    }

    if (repairForm.mobileNumber.length !== 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

    try {
      const farmerDetails: BookingDetails = {
        farmerName: repairForm.farmerName,
        mobileNumber: repairForm.mobileNumber,
        district: repairForm.district,
        block: repairForm.block,
      };

      const request = await requestRepair(
        farmerDetails,
        repairForm.machineryType as MachineryType,
        repairForm.problemDescription,
        repairForm.urgency
      );

      const mechanicInfo = request.assignedMechanic
        ? `\nMechanic: ${request.assignedMechanic.mechanicName}\nContact: ${request.assignedMechanic.contactNumber}`
        : '\nWaiting for mechanic assignment';

      alert(`Repair request submitted!\nRequest ID: ${request.requestId}${mechanicInfo}`);

      // Reset form
      setRepairForm({
        farmerName: '',
        mobileNumber: '',
        district: '',
        block: '',
        machineryType: '',
        problemDescription: '',
        urgency: 'Medium',
      });
    } catch (err: any) {
      alert(`Request failed: ${err.message}`);
    }
  };

  // Handle bookings search
  const handleBookingsSearch = () => {
    if (searchMobile.length === 10) {
      loadBookingsByMobile(searchMobile);
    } else {
      alert('Please enter a valid 10-digit mobile number');
    }
  };

  // Handle repair requests search
  const handleRepairSearch = () => {
    if (repairSearchMobile.length === 10) {
      loadRepairRequestsByMobile(repairSearchMobile);
    } else {
      alert('Please enter a valid 10-digit mobile number');
    }
  };

  // Machinery types for dropdown
  const machineryTypes: MachineryType[] = [
    'Tractor',
    'Power Tiller',
    'Harvester',
    'Rotavator',
    'Weeder',
    'Sprayer',
    'Seed Drill',
    'Planter',
    'Cultivator',
    'Other',
  ];

  // Get unique districts
  const districts = Array.from(new Set(machinery.map((m) => m.district))).sort();

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed':
      case 'Available':
        return '#28a745';
      case 'Completed':
        return '#007bff';
      case 'Pending':
      case 'Assigned':
        return '#ffc107';
      case 'In Progress':
        return '#17a2b8';
      case 'Cancelled':
        return '#dc3545';
      case 'Booked':
      case 'Busy':
        return '#fd7e14';
      default:
        return '#6c757d';
    }
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ color: '#2c5f2d', marginBottom: '10px' }}>🚜 Machinery Hiring Service</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Agricultural Machinery Rental & Repair Portal • Generated 1,900+ hours of machinery usage
      </p>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '2px solid #e0e0e0' }}>
        {[
          { id: 'catalogue', label: '📋 Catalogue', emoji: '📋' },
          { id: 'book', label: '📝 Book Machinery', emoji: '📝' },
          { id: 'repair', label: '🔧 Repair Service', emoji: '🔧' },
          { id: 'bookings', label: '📊 My Bookings', emoji: '📊' },
          { id: 'stats', label: '📈 Statistics', emoji: '📈' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              if (tab.id === 'stats') loadStatistics();
            }}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === tab.id ? '#2c5f2d' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#666',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              borderRadius: '8px 8px 0 0',
              transition: 'all 0.3s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div
          style={{
            padding: '15px',
            backgroundColor: '#ffebee',
            border: '1px solid #ef5350',
            borderRadius: '8px',
            marginBottom: '20px',
            color: '#c62828',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <div>Loading...</div>
        </div>
      )}

      {/* Tab 1: Machinery Catalogue */}
      {activeTab === 'catalogue' && !loading && (
        <div>
          <h2 style={{ color: '#2c5f2d', marginBottom: '20px' }}>📋 Machinery Catalogue (Offline)</h2>

          {/* Search Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '30px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>District:</label>
              <select
                value={filterDistrict}
                onChange={(e) => setFilterDistrict(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
              >
                <option value="">All Districts</option>
                {districts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Machinery Type:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as MachineryType)}
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
              >
                <option value="">All Types</option>
                {machineryTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={handleCatalogueSearch}
                style={{
                  width: '100%',
                  padding: '10px 20px',
                  backgroundColor: '#2c5f2d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                🔍 Search
              </button>
            </div>
          </div>

          {/* Machinery Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {machinery.map((item, index) => (
              <div
                key={index}
                style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '10px',
                  padding: '20px',
                  backgroundColor: 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                  <div>
                    <h3 style={{ color: '#2c5f2d', marginBottom: '5px' }}>{item.machineryType}</h3>
                    <p style={{ color: '#666', fontSize: '14px' }}>{item.brand} {item.model}</p>
                  </div>
                  <span
                    style={{
                      padding: '5px 10px',
                      backgroundColor: getStatusColor(item.availability),
                      color: 'white',
                      borderRadius: '5px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                  >
                    {item.availability}
                  </span>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>
                    <strong>Location:</strong> {item.block}, {item.district}
                  </p>
                  {item.horsepower && (
                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                      <strong>Power:</strong> {item.horsepower} HP
                    </p>
                  )}
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>
                    <strong>Contact:</strong> {item.contactNumber}
                  </p>
                  {item.ownerName && (
                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                      <strong>Owner:</strong> {item.ownerName}
                    </p>
                  )}
                </div>

                <div
                  style={{
                    padding: '15px',
                    backgroundColor: '#f0f8f0',
                    borderRadius: '5px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c5f2d' }}>
                    ₹{item.hiringRate}/hr
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Hiring Rate</div>
                </div>
              </div>
            ))}
          </div>

          {machinery.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              No machinery found. Try adjusting your filters.
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Book Machinery */}
      {activeTab === 'book' && !loading && (
        <div>
          <h2 style={{ color: '#2c5f2d', marginBottom: '20px' }}>📝 Book Machinery (Requires Server)</h2>
          
          <form onSubmit={handleBookingSubmit} style={{ maxWidth: '600px' }}>
            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Farmer Name<span style={{ color: 'red' }}>*</span>:</label>
                <input
                  type="text"
                  value={bookingForm.farmerName}
                  onChange={(e) => setBookingForm({ ...bookingForm, farmerName: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Mobile Number<span style={{ color: 'red' }}>*</span>:</label>
                <input
                  type="tel"
                  value={bookingForm.mobileNumber}
                  onChange={(e) => setBookingForm({ ...bookingForm, mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                  placeholder="10-digit mobile number"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>District<span style={{ color: 'red' }}>*</span>:</label>
                  <select
                    value={bookingForm.district}
                    onChange={(e) => setBookingForm({ ...bookingForm, district: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                    required
                  >
                    <option value="">Select District</option>
                    {districts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Block:</label>
                  <input
                    type="text"
                    value={bookingForm.block}
                    onChange={(e) => setBookingForm({ ...bookingForm, block: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Village Name:</label>
                <input
                  type="text"
                  value={bookingForm.villageName}
                  onChange={(e) => setBookingForm({ ...bookingForm, villageName: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Land Area (acres):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={bookingForm.landArea}
                    onChange={(e) => setBookingForm({ ...bookingForm, landArea: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Crop Type:</label>
                  <input
                    type="text"
                    value={bookingForm.cropType}
                    onChange={(e) => setBookingForm({ ...bookingForm, cropType: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                    placeholder="e.g., Paddy, Cotton"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Machinery Type<span style={{ color: 'red' }}>*</span>:</label>
                <select
                  value={bookingForm.machineryType}
                  onChange={(e) => setBookingForm({ ...bookingForm, machineryType: e.target.value as MachineryType })}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                  required
                >
                  <option value="">Select Machinery Type</option>
                  {machineryTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Rental Date<span style={{ color: 'red' }}>*</span>:</label>
                  <input
                    type="date"
                    value={bookingForm.rentalDate}
                    onChange={(e) => setBookingForm({ ...bookingForm, rentalDate: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Duration (hours)<span style={{ color: 'red' }}>*</span>:</label>
                  <input
                    type="number"
                    min="1"
                    value={bookingForm.duration}
                    onChange={(e) => setBookingForm({ ...bookingForm, duration: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                style={{
                  padding: '15px 30px',
                  backgroundColor: '#2c5f2d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  marginTop: '20px',
                }}
              >
                📝 Submit Booking
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Repair Service */}
      {activeTab === 'repair' && !loading && (
        <div>
          <h2 style={{ color: '#2c5f2d', marginBottom: '20px' }}>🔧 Repair Service</h2>

          {/* Mechanic Directory */}
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ color: '#2c5f2d', marginBottom: '15px' }}>Available Mechanics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
              {mechanics.map((mechanic, index) => (
                <div
                  key={index}
                  style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '15px',
                    backgroundColor: 'white',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h4 style={{ color: '#2c5f2d', margin: 0 }}>{mechanic.mechanicName}</h4>
                    <span
                      style={{
                        padding: '3px 8px',
                        backgroundColor: getStatusColor(mechanic.availability),
                        color: 'white',
                        borderRadius: '3px',
                        fontSize: '11px',
                      }}
                    >
                      {mechanic.availability}
                    </span>
                  </div>
                  <p style={{ margin: '5px 0', fontSize: '13px' }}><strong>District:</strong> {mechanic.district}</p>
                  <p style={{ margin: '5px 0', fontSize: '13px' }}><strong>Contact:</strong> {mechanic.contactNumber}</p>
                  <p style={{ margin: '5px 0', fontSize: '13px' }}><strong>Specialization:</strong> {mechanic.specialization.join(', ')}</p>
                  {mechanic.experience && (
                    <p style={{ margin: '5px 0', fontSize: '13px' }}><strong>Experience:</strong> {mechanic.experience} years</p>
                  )}
                  {mechanic.serviceRate && (
                    <p style={{ margin: '5px 0', fontSize: '13px' }}><strong>Rate:</strong> ₹{mechanic.serviceRate}/hr</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Repair Request Form */}
          <div>
            <h3 style={{ color: '#2c5f2d', marginBottom: '15px' }}>Request Repair Service</h3>
            <form onSubmit={handleRepairSubmit} style={{ maxWidth: '600px' }}>
              <div style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Farmer Name<span style={{ color: 'red' }}>*</span>:</label>
                  <input
                    type="text"
                    value={repairForm.farmerName}
                    onChange={(e) => setRepairForm({ ...repairForm, farmerName: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Mobile Number<span style={{ color: 'red' }}>*</span>:</label>
                  <input
                    type="tel"
                    value={repairForm.mobileNumber}
                    onChange={(e) => setRepairForm({ ...repairForm, mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                    placeholder="10-digit mobile number"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>District<span style={{ color: 'red' }}>*</span>:</label>
                    <select
                      value={repairForm.district}
                      onChange={(e) => setRepairForm({ ...repairForm, district: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                      required
                    >
                      <option value="">Select District</option>
                      {districts.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Block:</label>
                    <input
                      type="text"
                      value={repairForm.block}
                      onChange={(e) => setRepairForm({ ...repairForm, block: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Machinery Type<span style={{ color: 'red' }}>*</span>:</label>
                  <select
                    value={repairForm.machineryType}
                    onChange={(e) => setRepairForm({ ...repairForm, machineryType: e.target.value as MachineryType })}
                    style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                    required
                  >
                    <option value="">Select Machinery Type</option>
                    {machineryTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Problem Description<span style={{ color: 'red' }}>*</span>:</label>
                  <textarea
                    value={repairForm.problemDescription}
                    onChange={(e) => setRepairForm({ ...repairForm, problemDescription: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd', minHeight: '100px' }}
                    placeholder="Describe the problem with your machinery..."
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Urgency<span style={{ color: 'red' }}>*</span>:</label>
                  <select
                    value={repairForm.urgency}
                    onChange={(e) => setRepairForm({ ...repairForm, urgency: e.target.value as RepairRequest['urgency'] })}
                    style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                    required
                  >
                    <option value="Low">Low - Can wait a few days</option>
                    <option value="Medium">Medium - Need repair soon</option>
                    <option value="High">High - Urgent, need immediate repair</option>
                  </select>
                </div>

                <button
                  type="submit"
                  style={{
                    padding: '15px 30px',
                    backgroundColor: '#2c5f2d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    marginTop: '20px',
                  }}
                >
                  🔧 Submit Repair Request
                </button>
              </div>
            </form>
          </div>

          {/* View Repair Requests */}
          <div style={{ marginTop: '40px' }}>
            <h3 style={{ color: '#2c5f2d', marginBottom: '15px' }}>Track My Repair Requests</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', maxWidth: '600px' }}>
              <input
                type="tel"
                value={repairSearchMobile}
                onChange={(e) => setRepairSearchMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                placeholder="Enter mobile number"
              />
              <button
                onClick={handleRepairSearch}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#2c5f2d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                🔍 Search
              </button>
            </div>

            {repairRequests.length > 0 && (
              <div style={{ display: 'grid', gap: '15px' }}>
                {repairRequests.map((request) => (
                  <div
                    key={request.requestId}
                    style={{
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      padding: '20px',
                      backgroundColor: 'white',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                      <div>
                        <h4 style={{ color: '#2c5f2d', margin: 0 }}>{request.machineryType} Repair</h4>
                        <p style={{ color: '#666', fontSize: '13px', margin: '5px 0' }}>Request ID: {request.requestId}</p>
                      </div>
                      <span
                        style={{
                          padding: '5px 10px',
                          backgroundColor: getStatusColor(request.status),
                          color: 'white',
                          borderRadius: '5px',
                          fontSize: '12px',
                          height: 'fit-content',
                        }}
                      >
                        {request.status}
                      </span>
                    </div>

                    <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Problem:</strong> {request.problemDescription}</p>
                    <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Urgency:</strong> {request.urgency}</p>
                    <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Date:</strong> {new Date(request.requestDate).toLocaleDateString()}</p>

                    {request.assignedMechanic && (
                      <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f0f8f0', borderRadius: '5px' }}>
                        <p style={{ margin: '5px 0', fontSize: '14px', fontWeight: 'bold', color: '#2c5f2d' }}>Assigned Mechanic:</p>
                        <p style={{ margin: '5px 0', fontSize: '13px' }}><strong>Name:</strong> {request.assignedMechanic.mechanicName}</p>
                        <p style={{ margin: '5px 0', fontSize: '13px' }}><strong>Contact:</strong> {request.assignedMechanic.contactNumber}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: My Bookings */}
      {activeTab === 'bookings' && !loading && (
        <div>
          <h2 style={{ color: '#2c5f2d', marginBottom: '20px' }}>📊 My Bookings</h2>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', maxWidth: '600px' }}>
            <input
              type="tel"
              value={searchMobile}
              onChange={(e) => setSearchMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
              style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
              placeholder="Enter mobile number"
            />
            <button
              onClick={handleBookingsSearch}
              style={{
                padding: '10px 20px',
                backgroundColor: '#2c5f2d',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              🔍 Search Bookings
            </button>
          </div>

          {bookings.length > 0 ? (
            <div style={{ display: 'grid', gap: '20px' }}>
              {bookings.map((booking) => (
                <div
                  key={booking.bookingId}
                  style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '10px',
                    padding: '25px',
                    backgroundColor: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div>
                      <h3 style={{ color: '#2c5f2d', margin: 0 }}>{booking.machineryType}</h3>
                      <p style={{ color: '#666', fontSize: '14px', margin: '5px 0' }}>
                        Confirmation: {booking.confirmationNumber}
                      </p>
                    </div>
                    <span
                      style={{
                        padding: '8px 15px',
                        backgroundColor: getStatusColor(booking.status),
                        color: 'white',
                        borderRadius: '5px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        height: 'fit-content',
                      }}
                    >
                      {booking.status}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Farmer:</strong> {booking.farmerDetails.farmerName}</p>
                      <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Mobile:</strong> {booking.farmerDetails.mobileNumber}</p>
                      <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Location:</strong> {booking.farmerDetails.block}, {booking.farmerDetails.district}</p>
                    </div>
                    <div>
                      <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Rental Date:</strong> {new Date(booking.rentalDate).toLocaleDateString()}</p>
                      <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Duration:</strong> {booking.duration} hours</p>
                      <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Rate:</strong> ₹{booking.hiringRate}/hr</p>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: '15px',
                      padding: '15px',
                      backgroundColor: '#f0f8f0',
                      borderRadius: '5px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c5f2d' }}>₹{booking.totalCost}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Total Cost</div>
                    </div>
                    <div
                      style={{
                        padding: '5px 10px',
                        backgroundColor: booking.paymentStatus === 'Paid' ? '#28a745' : '#ffc107',
                        color: 'white',
                        borderRadius: '5px',
                        fontSize: '12px',
                      }}
                    >
                      Payment: {booking.paymentStatus}
                    </div>
                  </div>

                  <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '5px' }}>
                    <p style={{ margin: '5px 0', fontSize: '13px' }}><strong>Hiring Centre:</strong></p>
                    <p style={{ margin: '5px 0', fontSize: '13px' }}>Contact: {booking.hiringCentre.contactNumber}</p>
                    <p style={{ margin: '5px 0', fontSize: '13px' }}>Location: {booking.hiringCentre.district}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              {searchMobile ? 'No bookings found for this mobile number.' : 'Enter a mobile number to search for bookings.'}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Statistics */}
      {activeTab === 'stats' && !loading && stats && (
        <div>
          <h2 style={{ color: '#2c5f2d', marginBottom: '20px' }}>📈 Usage Statistics</h2>

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            {[
              { label: 'Total Bookings', value: stats.totalBookings, color: '#2c5f2d' },
              { label: 'Hours Generated', value: `${stats.totalHoursGenerated}h`, color: '#007bff' },
              { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, color: '#28a745' },
              { label: 'Pending', value: stats.pendingBookings, color: '#ffc107' },
              { label: 'Completed', value: stats.completedBookings, color: '#17a2b8' },
              { label: 'Repair Requests', value: stats.totalRepairRequests, color: '#fd7e14' },
            ].map((stat, index) => (
              <div
                key={index}
                style={{
                  padding: '25px',
                  backgroundColor: 'white',
                  borderRadius: '10px',
                  border: '1px solid #e0e0e0',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: stat.color, marginBottom: '10px' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Average Rental Duration */}
          <div style={{ marginBottom: '40px', padding: '20px', backgroundColor: '#f0f8f0', borderRadius: '10px' }}>
            <h3 style={{ color: '#2c5f2d', marginBottom: '10px' }}>Average Rental Duration</h3>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2c5f2d' }}>
              {stats.averageRentalDuration.toFixed(1)} hours
            </div>
          </div>

          {/* Machinery Type Distribution */}
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ color: '#2c5f2d', marginBottom: '20px' }}>Machinery Type Distribution</h3>
            <div style={{ display: 'grid', gap: '10px' }}>
              {Object.entries(stats.machineryTypeDistribution)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => {
                  const percentage = stats.totalBookings > 0 ? (count / stats.totalBookings) * 100 : 0;
                  return (
                    <div key={type}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontWeight: 'bold' }}>{type}</span>
                        <span>{count} bookings ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '30px', backgroundColor: '#e0e0e0', borderRadius: '5px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${percentage}%`,
                            height: '100%',
                            backgroundColor: '#2c5f2d',
                            transition: 'width 0.3s',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* District-wise Usage */}
          <div>
            <h3 style={{ color: '#2c5f2d', marginBottom: '20px' }}>District-wise Usage</h3>
            <div style={{ display: 'grid', gap: '10px' }}>
              {Object.entries(stats.districtWiseUsage)
                .sort(([, a], [, b]) => b - a)
                .map(([district, count]) => {
                  const percentage = stats.totalBookings > 0 ? (count / stats.totalBookings) * 100 : 0;
                  return (
                    <div key={district}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontWeight: 'bold' }}>{district}</span>
                        <span>{count} bookings ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '30px', backgroundColor: '#e0e0e0', borderRadius: '5px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${percentage}%`,
                            height: '100%',
                            backgroundColor: '#007bff',
                            transition: 'width 0.3s',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
