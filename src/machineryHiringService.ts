/**
 * Machinery Hiring Service
 * Service #6: Agricultural Machinery Rental & Repair
 * Data Sources: 
 *   - tractor sheet (machinery rental directory)
 *   - mechanic sheet (repair services)
 * 
 * Provides machinery booking, hiring centre directory, and mechanic contact
 */

import * as XLSX from 'xlsx';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type MachineryType = 
  | 'Tractor'
  | 'Power Tiller'
  | 'Harvester'
  | 'Rotavator'
  | 'Weeder'
  | 'Sprayer'
  | 'Seed Drill'
  | 'Planter'
  | 'Cultivator'
  | 'Other';

export type MachineryData = {
  district: string;
  block: string;
  machineryType: MachineryType;
  ownerName?: string;
  contactNumber: string;
  hiringRate: number;                // Per hour rate in INR
  availability: 'Available' | 'Booked' | 'Maintenance';
  horsepower?: number;
  brand?: string;
  model?: string;
  yearOfManufacture?: number;
  location?: string;
  address?: string;
};

export type MechanicData = {
  district: string;
  block?: string;
  mechanicName: string;
  contactNumber: string;
  specialization: string[];          // Types of machinery they can repair
  experience?: number;               // Years of experience
  availability: 'Available' | 'Busy' | 'Not Available';
  serviceRate?: number;              // Per hour rate
  address?: string;
  workingHours?: string;
};

export type BookingDetails = {
  farmerName: string;
  mobileNumber: string;
  district: string;
  block: string;
  villageName?: string;
  landArea?: number;                 // In acres
  cropType?: string;
};

export type MachineryBooking = {
  bookingId: string;
  bookingDate: string;
  farmerDetails: BookingDetails;
  machineryType: MachineryType;
  rentalDate: string;                // Requested rental date
  duration: number;                  // In hours
  hiringRate: number;
  totalCost: number;
  hiringCentre: MachineryData;
  status: 'Pending' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled';
  confirmationNumber?: string;
  paymentStatus?: 'Pending' | 'Paid' | 'Partial';
  remarks?: string;
  lastUpdated: string;
};

export type RepairRequest = {
  requestId: string;
  requestDate: string;
  farmerDetails: BookingDetails;
  machineryType: MachineryType;
  problemDescription: string;
  urgency: 'High' | 'Medium' | 'Low';
  assignedMechanic?: MechanicData;
  status: 'Pending' | 'Assigned' | 'In Progress' | 'Completed' | 'Cancelled';
  estimatedCost?: number;
  actualCost?: number;
  completionDate?: string;
  remarks?: string;
  lastUpdated: string;
};

export type UsageStatistics = {
  totalBookings: number;
  totalHoursGenerated: number;
  totalRevenue: number;
  pendingBookings: number;
  completedBookings: number;
  machineryTypeDistribution: Record<MachineryType, number>;
  districtWiseUsage: Record<string, number>;
  averageRentalDuration: number;
  totalRepairRequests: number;
};

// ============================================================
// MACHINERY HIRING SERVICE CLASS
// ============================================================

class MachineryHiringService {
  private machineryData: MachineryData[] = [];
  private mechanicData: MechanicData[] = [];
  private cacheKey = 'victori_machinery_data';
  private mechanicCacheKey = 'victori_mechanic_data';
  private bookingKey = 'victori_machinery_bookings';
  private repairKey = 'victori_repair_requests';
  private cacheDuration = 6 * 60 * 60 * 1000; // 6 hours

  /**
   * Load machinery data from tractor sheet in uzhavan.xlsx
   */
  async loadMachineryData(): Promise<MachineryData[]> {
    // Check cache first
    const cached = localStorage.getItem(this.cacheKey);
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < this.cacheDuration) {
        this.machineryData = data;
        return data;
      }
    }

    try {
      // Fetch Excel file
      const response = await fetch('/data/uzhavan.xlsx');
      if (!response.ok) {
        throw new Error('Failed to fetch uzhavan.xlsx');
      }

      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Read tractor sheet
      const tractorSheet = workbook.Sheets['tractor'];
      if (!tractorSheet) {
        throw new Error('tractor sheet not found in uzhavan.xlsx');
      }

      const jsonData = XLSX.utils.sheet_to_json<any>(tractorSheet);

      // Parse machinery data
      this.machineryData = jsonData.map((row) => {
        const district = String(row['District'] || row['district'] || '').trim();
        const block = String(row['Block'] || row['block'] || '').trim();
        const machineryType = this.normalizeMachineryType(
          String(row['Machinery Type'] || row['machinery_type'] || row['Type'] || 'Other')
        );
        const contactNumber = String(row['Contact Number'] || row['contact_number'] || row['Mobile'] || '').trim();
        const hiringRate = Number(row['Hire_Charges_per_Hour'] || row['hire_charges'] || row['Rate'] || 0);

        return {
          district,
          block,
          machineryType,
          ownerName: String(row['Owner Name'] || row['owner_name'] || '').trim() || undefined,
          contactNumber,
          hiringRate,
          availability: (row['Availability'] || 'Available') as any,
          horsepower: Number(row['HP'] || row['horsepower'] || 0) || undefined,
          brand: String(row['Brand'] || row['brand'] || '').trim() || undefined,
          model: String(row['Model'] || row['model'] || '').trim() || undefined,
          yearOfManufacture: Number(row['Year'] || row['year'] || 0) || undefined,
          location: String(row['Location'] || row['location'] || '').trim() || undefined,
          address: String(row['Address'] || row['address'] || '').trim() || undefined,
        };
      }).filter(m => m.district && m.machineryType);

      // Cache the data
      localStorage.setItem(
        this.cacheKey,
        JSON.stringify({
          timestamp: Date.now(),
          data: this.machineryData,
        })
      );

      return this.machineryData;
    } catch (error) {
      console.error('Error loading machinery data:', error);
      throw error;
    }
  }

  /**
   * Load mechanic data from mechanic sheet in uzhavan.xlsx
   */
  async loadMechanicData(): Promise<MechanicData[]> {
    // Check cache first
    const cached = localStorage.getItem(this.mechanicCacheKey);
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < this.cacheDuration) {
        this.mechanicData = data;
        return data;
      }
    }

    try {
      // Fetch Excel file
      const response = await fetch('/data/uzhavan.xlsx');
      if (!response.ok) {
        throw new Error('Failed to fetch uzhavan.xlsx');
      }

      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Read mechanic sheet
      const mechanicSheet = workbook.Sheets['mechanic'];
      if (!mechanicSheet) {
        console.warn('mechanic sheet not found, using mock data');
        return this.getMockMechanicData();
      }

      const jsonData = XLSX.utils.sheet_to_json<any>(mechanicSheet);

      // Parse mechanic data
      this.mechanicData = jsonData.map((row) => {
        const district = String(row['District'] || row['district'] || '').trim();
        const mechanicName = String(row['Mechanic Name'] || row['mechanic_name'] || row['Name'] || '').trim();
        const contactNumber = String(row['Contact Number'] || row['contact_number'] || row['Mobile'] || '').trim();
        const specialization = String(row['Specialization'] || row['specialization'] || 'All')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);

        return {
          district,
          block: String(row['Block'] || row['block'] || '').trim() || undefined,
          mechanicName,
          contactNumber,
          specialization,
          experience: Number(row['Experience'] || row['experience'] || 0) || undefined,
          availability: (row['Availability'] || 'Available') as any,
          serviceRate: Number(row['Service Rate'] || row['service_rate'] || row['Rate'] || 0) || undefined,
          address: String(row['Address'] || row['address'] || '').trim() || undefined,
          workingHours: String(row['Working Hours'] || row['working_hours'] || '9 AM - 6 PM').trim() || undefined,
        };
      }).filter(m => m.district && m.mechanicName && m.contactNumber);

      // Cache the data
      localStorage.setItem(
        this.mechanicCacheKey,
        JSON.stringify({
          timestamp: Date.now(),
          data: this.mechanicData,
        })
      );

      return this.mechanicData;
    } catch (error) {
      console.error('Error loading mechanic data:', error);
      return this.getMockMechanicData();
    }
  }

  /**
   * Get all available machinery
   */
  async getAllMachinery(): Promise<MachineryData[]> {
    if (this.machineryData.length === 0) {
      await this.loadMachineryData();
    }
    return this.machineryData;
  }

  /**
   * Get machinery by district
   */
  async getMachineryByDistrict(district: string): Promise<MachineryData[]> {
    if (this.machineryData.length === 0) {
      await this.loadMachineryData();
    }
    return this.machineryData.filter(
      (m) => m.district.toLowerCase() === district.toLowerCase()
    );
  }

  /**
   * Get machinery by type
   */
  async getMachineryByType(type: MachineryType): Promise<MachineryData[]> {
    if (this.machineryData.length === 0) {
      await this.loadMachineryData();
    }
    return this.machineryData.filter((m) => m.machineryType === type);
  }

  /**
   * Get available machinery (not booked)
   */
  async getAvailableMachinery(): Promise<MachineryData[]> {
    if (this.machineryData.length === 0) {
      await this.loadMachineryData();
    }
    return this.machineryData.filter((m) => m.availability === 'Available');
  }

  /**
   * Search machinery by district and type
   */
  async searchMachinery(
    district?: string,
    type?: MachineryType,
    maxRate?: number
  ): Promise<MachineryData[]> {
    if (this.machineryData.length === 0) {
      await this.loadMachineryData();
    }

    let results = this.machineryData;

    if (district) {
      results = results.filter(
        (m) => m.district.toLowerCase() === district.toLowerCase()
      );
    }

    if (type) {
      results = results.filter((m) => m.machineryType === type);
    }

    if (maxRate !== undefined) {
      results = results.filter((m) => m.hiringRate <= maxRate);
    }

    return results;
  }

  /**
   * Book machinery
   */
  async bookMachinery(
    farmerDetails: BookingDetails,
    machineryType: MachineryType,
    rentalDate: string,
    duration: number
  ): Promise<MachineryBooking> {
    // Find available machinery
    const available = await this.searchMachinery(
      farmerDetails.district,
      machineryType
    );

    if (available.length === 0) {
      throw new Error('No machinery available for the selected type and location');
    }

    // Select first available
    const hiringCentre = available[0];

    // Calculate cost
    const totalCost = hiringCentre.hiringRate * duration;

    // Generate booking ID
    const bookingId = `BOOK${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const confirmationNumber = `CONF${Date.now().toString().slice(-8)}`;

    // Create booking
    const booking: MachineryBooking = {
      bookingId,
      bookingDate: new Date().toISOString(),
      farmerDetails,
      machineryType,
      rentalDate,
      duration,
      hiringRate: hiringCentre.hiringRate,
      totalCost,
      hiringCentre,
      status: 'Pending',
      confirmationNumber,
      paymentStatus: 'Pending',
      lastUpdated: new Date().toISOString(),
    };

    // Save booking
    const bookings = this.getBookingsFromStorage();
    bookings.push(booking);
    localStorage.setItem(this.bookingKey, JSON.stringify(bookings));

    return booking;
  }

  /**
   * Get bookings by mobile number
   */
  async getBookingsByMobile(mobileNumber: string): Promise<MachineryBooking[]> {
    const bookings = this.getBookingsFromStorage();
    return bookings.filter(
      (b) => b.farmerDetails.mobileNumber === mobileNumber
    );
  }

  /**
   * Get booking by ID
   */
  async getBookingById(bookingId: string): Promise<MachineryBooking | null> {
    const bookings = this.getBookingsFromStorage();
    return bookings.find((b) => b.bookingId === bookingId) || null;
  }

  /**
   * Update booking status
   */
  async updateBookingStatus(
    bookingId: string,
    status: MachineryBooking['status'],
    remarks?: string
  ): Promise<MachineryBooking> {
    const bookings = this.getBookingsFromStorage();
    const index = bookings.findIndex((b) => b.bookingId === bookingId);

    if (index === -1) {
      throw new Error('Booking not found');
    }

    bookings[index].status = status;
    bookings[index].lastUpdated = new Date().toISOString();
    if (remarks) bookings[index].remarks = remarks;

    localStorage.setItem(this.bookingKey, JSON.stringify(bookings));

    return bookings[index];
  }

  /**
   * Get all mechanics
   */
  async getAllMechanics(): Promise<MechanicData[]> {
    if (this.mechanicData.length === 0) {
      await this.loadMechanicData();
    }
    return this.mechanicData;
  }

  /**
   * Get mechanics by district
   */
  async getMechanicsByDistrict(district: string): Promise<MechanicData[]> {
    if (this.mechanicData.length === 0) {
      await this.loadMechanicData();
    }
    return this.mechanicData.filter(
      (m) => m.district.toLowerCase() === district.toLowerCase()
    );
  }

  /**
   * Get mechanics by specialization
   */
  async getMechanicsBySpecialization(machineryType: MachineryType): Promise<MechanicData[]> {
    if (this.mechanicData.length === 0) {
      await this.loadMechanicData();
    }
    return this.mechanicData.filter(
      (m) =>
        m.specialization.includes(machineryType) ||
        m.specialization.includes('All') ||
        m.specialization.includes('General')
    );
  }

  /**
   * Request repair service
   */
  async requestRepair(
    farmerDetails: BookingDetails,
    machineryType: MachineryType,
    problemDescription: string,
    urgency: RepairRequest['urgency']
  ): Promise<RepairRequest> {
    // Generate request ID
    const requestId = `REP${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Find available mechanic
    const mechanics = await this.getMechanicsByDistrict(farmerDetails.district);
    const availableMechanic = mechanics.find(
      (m) =>
        m.availability === 'Available' &&
        (m.specialization.includes(machineryType) || m.specialization.includes('All'))
    );

    // Create repair request
    const request: RepairRequest = {
      requestId,
      requestDate: new Date().toISOString(),
      farmerDetails,
      machineryType,
      problemDescription,
      urgency,
      assignedMechanic: availableMechanic,
      status: availableMechanic ? 'Assigned' : 'Pending',
      lastUpdated: new Date().toISOString(),
    };

    // Save request
    const requests = this.getRepairRequestsFromStorage();
    requests.push(request);
    localStorage.setItem(this.repairKey, JSON.stringify(requests));

    return request;
  }

  /**
   * Get repair requests by mobile
   */
  async getRepairRequestsByMobile(mobileNumber: string): Promise<RepairRequest[]> {
    const requests = this.getRepairRequestsFromStorage();
    return requests.filter(
      (r) => r.farmerDetails.mobileNumber === mobileNumber
    );
  }

  /**
   * Get usage statistics
   */
  async getUsageStatistics(): Promise<UsageStatistics> {
    const bookings = this.getBookingsFromStorage();

    const stats: UsageStatistics = {
      totalBookings: bookings.length,
      totalHoursGenerated: 0,
      totalRevenue: 0,
      pendingBookings: 0,
      completedBookings: 0,
      machineryTypeDistribution: {} as any,
      districtWiseUsage: {},
      averageRentalDuration: 0,
      totalRepairRequests: this.getRepairRequestsFromStorage().length,
    };

    let totalDuration = 0;

    bookings.forEach((booking) => {
      // Count hours
      stats.totalHoursGenerated += booking.duration;
      totalDuration += booking.duration;

      // Count revenue
      if (booking.status === 'Completed') {
        stats.totalRevenue += booking.totalCost;
        stats.completedBookings++;
      }

      if (booking.status === 'Pending') {
        stats.pendingBookings++;
      }

      // Count by machinery type
      stats.machineryTypeDistribution[booking.machineryType] =
        (stats.machineryTypeDistribution[booking.machineryType] || 0) + 1;

      // Count by district
      const district = booking.farmerDetails.district;
      stats.districtWiseUsage[district] = (stats.districtWiseUsage[district] || 0) + 1;
    });

    stats.averageRentalDuration =
      bookings.length > 0 ? totalDuration / bookings.length : 0;

    return stats;
  }

  /**
   * Clear cache (force reload)
   */
  clearCache(): void {
    localStorage.removeItem(this.cacheKey);
    localStorage.removeItem(this.mechanicCacheKey);
    this.machineryData = [];
    this.mechanicData = [];
  }

  // Helper methods

  private normalizeMachineryType(type: string): MachineryType {
    const normalized = type.toLowerCase().trim();
    if (normalized.includes('tractor')) return 'Tractor';
    if (normalized.includes('tiller')) return 'Power Tiller';
    if (normalized.includes('harvest')) return 'Harvester';
    if (normalized.includes('rotavator')) return 'Rotavator';
    if (normalized.includes('weeder')) return 'Weeder';
    if (normalized.includes('spray')) return 'Sprayer';
    if (normalized.includes('seed') || normalized.includes('drill')) return 'Seed Drill';
    if (normalized.includes('plant')) return 'Planter';
    if (normalized.includes('cultivator')) return 'Cultivator';
    return 'Other';
  }

  private getBookingsFromStorage(): MachineryBooking[] {
    const stored = localStorage.getItem(this.bookingKey);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  private getRepairRequestsFromStorage(): RepairRequest[] {
    const stored = localStorage.getItem(this.repairKey);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  private getMockMechanicData(): MechanicData[] {
    // Fallback mechanic data if sheet not found
    return [
      {
        district: 'Salem',
        mechanicName: 'Kumar Mechanic Services',
        contactNumber: '9876543210',
        specialization: ['Tractor', 'Power Tiller', 'All'],
        experience: 10,
        availability: 'Available',
        serviceRate: 300,
        workingHours: '8 AM - 7 PM',
      },
      {
        district: 'Erode',
        mechanicName: 'Raja Repair Works',
        contactNumber: '9876543211',
        specialization: ['Harvester', 'Tractor'],
        experience: 8,
        availability: 'Available',
        serviceRate: 350,
        workingHours: '9 AM - 6 PM',
      },
      {
        district: 'Coimbatore',
        mechanicName: 'Murugan Agricultural Services',
        contactNumber: '9876543212',
        specialization: ['All'],
        experience: 15,
        availability: 'Available',
        serviceRate: 400,
        workingHours: '7 AM - 8 PM',
      },
    ];
  }
}

// ============================================================
// EXPORT SINGLETON
// ============================================================

export const machineryHiringService = new MachineryHiringService();
