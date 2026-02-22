/**
 * Weather Service for Service #8: Daily Weather Forecast
 * Integrates OpenWeatherMap API with offline-first caching
 */

export type WeatherCondition = {
  id: number;
  main: string;
  description: string;
  icon: string;
};

export type WeatherData = {
  temperature: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  pressure: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  cloudiness: number;
  rainfall?: number;
  conditions: WeatherCondition[];
  sunrise: number;
  sunset: number;
  visibility: number;
};

export type WeatherForecast = {
  dt: number;
  temperature: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  windSpeed: number;
  rainfall: number;
  conditions: WeatherCondition[];
  dateText: string;
};

export type LocationCoordinates = {
  lat: number;
  lon: number;
  district?: string;
  block?: string;
};

export type WeatherAlert = {
  event: string;
  start: number;
  end: number;
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
};

export type WeatherResponse = {
  current: WeatherData;
  forecast: WeatherForecast[];
  alerts: WeatherAlert[];
  location: {
    name: string;
    district: string;
    lat: number;
    lon: number;
  };
  fetchedAt: number;
  source: 'api' | 'cache';
};

export type FarmingAdvisory = {
  activity: string;
  recommendation: 'favorable' | 'caution' | 'avoid';
  reason: string;
  timing?: string;
};

// Tamil Nadu District Coordinates
const TAMIL_NADU_DISTRICTS: Record<string, LocationCoordinates> = {
  chennai: { lat: 13.0827, lon: 80.2707, district: 'Chennai' },
  coimbatore: { lat: 11.0168, lon: 76.9558, district: 'Coimbatore' },
  madurai: { lat: 9.9252, lon: 78.1198, district: 'Madurai' },
  tiruchirappalli: { lat: 10.7905, lon: 78.7047, district: 'Tiruchirappalli' },
  salem: { lat: 11.6643, lon: 78.1460, district: 'Salem' },
  tirunelveli: { lat: 8.7139, lon: 77.7567, district: 'Tirunelveli' },
  thanjavur: { lat: 10.7870, lon: 79.1378, district: 'Thanjavur' },
  vellore: { lat: 12.9165, lon: 79.1325, district: 'Vellore' },
  erode: { lat: 11.3410, lon: 77.7172, district: 'Erode' },
  tiruppur: { lat: 11.1085, lon: 77.3411, district: 'Tiruppur' },
  dindigul: { lat: 10.3673, lon: 77.9803, district: 'Dindigul' },
  cuddalore: { lat: 11.7480, lon: 79.7714, district: 'Cuddalore' },
  kanchipuram: { lat: 12.8342, lon: 79.7036, district: 'Kanchipuram' },
  namakkal: { lat: 11.2189, lon: 78.1677, district: 'Namakkal' },
  viluppuram: { lat: 11.9401, lon: 79.4861, district: 'Viluppuram' },
  karur: { lat: 10.9601, lon: 78.0766, district: 'Karur' },
  theni: { lat: 10.0104, lon: 77.4777, district: 'Theni' },
  nagapattinam: { lat: 10.7672, lon: 79.8449, district: 'Nagapattinam' },
  pudukkottai: { lat: 10.3833, lon: 78.8000, district: 'Pudukkottai' },
  ramanathapuram: { lat: 9.3639, lon: 78.8370, district: 'Ramanathapuram' },
};

const WEATHER_CACHE_KEY = 'weather_cache_v1';
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

type CachedWeather = {
  response: WeatherResponse;
  cachedAt: number;
};

class WeatherService {
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/2.5';

  constructor(apiKey: string = '') {
    this.apiKey = apiKey;
  }

  /**
   * Set API key after initialization
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Get district coordinates
   */
  getDistrictCoordinates(district: string): LocationCoordinates | null {
    const normalized = district.toLowerCase().trim();
    return TAMIL_NADU_DISTRICTS[normalized] || null;
  }

  /**
   * Get all available districts
   */
  getAllDistricts(): string[] {
    return Object.values(TAMIL_NADU_DISTRICTS).map((d) => d.district || '');
  }

  /**
   * Load weather from cache
   */
  private loadFromCache(cacheKey: string): WeatherResponse | null {
    try {
      const cached = localStorage.getItem(`${WEATHER_CACHE_KEY}_${cacheKey}`);
      if (!cached) return null;

      const parsed: CachedWeather = JSON.parse(cached);
      const age = Date.now() - parsed.cachedAt;

      if (age > CACHE_DURATION_MS) {
        localStorage.removeItem(`${WEATHER_CACHE_KEY}_${cacheKey}`);
        return null;
      }

      return { ...parsed.response, source: 'cache' as const };
    } catch {
      return null;
    }
  }

  /**
   * Save weather to cache
   */
  private saveToCache(cacheKey: string, response: WeatherResponse): void {
    try {
      const cached: CachedWeather = {
        response,
        cachedAt: Date.now(),
      };
      localStorage.setItem(`${WEATHER_CACHE_KEY}_${cacheKey}`, JSON.stringify(cached));
    } catch (error) {
      console.warn('[WeatherService] Failed to cache:', error);
    }
  }

  /**
   * Fetch current weather and forecast
   */
  async fetchWeather(location: LocationCoordinates): Promise<WeatherResponse> {
    if (!this.apiKey) {
      throw new Error('OpenWeatherMap API key not configured');
    }

    const cacheKey = `${location.lat}_${location.lon}`;
    const cached = this.loadFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Fetch current weather
      const currentUrl = `${this.baseUrl}/weather?lat=${location.lat}&lon=${location.lon}&appid=${this.apiKey}&units=metric`;
      const currentResponse = await fetch(currentUrl);
      
      if (!currentResponse.ok) {
        throw new Error(`Weather API error: ${currentResponse.status}`);
      }

      const currentData = await currentResponse.json();

      // Fetch 5-day forecast
      const forecastUrl = `${this.baseUrl}/forecast?lat=${location.lat}&lon=${location.lon}&appid=${this.apiKey}&units=metric`;
      const forecastResponse = await fetch(forecastUrl);
      const forecastData = await forecastResponse.json();

      const response: WeatherResponse = {
        current: {
          temperature: currentData.main.temp,
          feelsLike: currentData.main.feels_like,
          tempMin: currentData.main.temp_min,
          tempMax: currentData.main.temp_max,
          pressure: currentData.main.pressure,
          humidity: currentData.main.humidity,
          windSpeed: currentData.wind.speed,
          windDirection: currentData.wind.deg,
          cloudiness: currentData.clouds.all,
          rainfall: currentData.rain?.['1h'] || 0,
          conditions: currentData.weather || [],
          sunrise: currentData.sys.sunrise,
          sunset: currentData.sys.sunset,
          visibility: currentData.visibility,
        },
        forecast: this.parseForecast(forecastData.list || []),
        alerts: [],
        location: {
          name: currentData.name,
          district: location.district || '',
          lat: location.lat,
          lon: location.lon,
        },
        fetchedAt: Date.now(),
        source: 'api',
      };

      this.saveToCache(cacheKey, response);
      return response;
    } catch (error) {
      const cached = this.loadFromCache(cacheKey);
      if (cached) {
        console.warn('[WeatherService] API failed, using stale cache');
        return cached;
      }
      throw error;
    }
  }

  /**
   * Parse forecast data
   */
  private parseForecast(list: any[]): WeatherForecast[] {
    const dailyForecasts = new Map<string, any[]>();

    // Group by date
    list.forEach((item) => {
      const date = new Date(item.dt * 1000).toISOString().split('T')[0];
      if (!dailyForecasts.has(date)) {
        dailyForecasts.set(date, []);
      }
      dailyForecasts.get(date)!.push(item);
    });

    // Convert to forecast array
    return Array.from(dailyForecasts.entries())
      .slice(0, 5)
      .map(([date, items]) => {
        const temps = items.map((i) => i.main.temp);
        const rainfall = items.reduce((sum, i) => sum + (i.rain?.['3h'] || 0), 0);

        return {
          dt: items[0].dt,
          temperature: temps.reduce((a, b) => a + b, 0) / temps.length,
          tempMin: Math.min(...items.map((i) => i.main.temp_min)),
          tempMax: Math.max(...items.map((i) => i.main.temp_max)),
          humidity: items[0].main.humidity,
          windSpeed: items[0].wind.speed,
          rainfall,
          conditions: items[0].weather || [],
          dateText: date,
        };
      });
  }

  /**
   * Fetch weather by district name
   */
  async fetchWeatherByDistrict(district: string): Promise<WeatherResponse> {
    const coords = this.getDistrictCoordinates(district);
    if (!coords) {
      throw new Error(`Unknown district: ${district}`);
    }
    return this.fetchWeather(coords);
  }

  /**
   * Generate farming advisory based on weather
   */
  generateAdvisory(weather: WeatherResponse): FarmingAdvisory[] {
    const advisories: FarmingAdvisory[] = [];
    const current = weather.current;
    const forecast = weather.forecast[0];

    // Sowing advisory
    if (forecast && forecast.rainfall > 20) {
      advisories.push({
        activity: 'Sowing',
        recommendation: 'caution',
        reason: 'Heavy rainfall expected in next 24 hours',
        timing: 'Postpone by 1-2 days',
      });
    } else if (current.humidity > 70 && current.temperature < 35) {
      advisories.push({
        activity: 'Sowing',
        recommendation: 'favorable',
        reason: 'Good soil moisture and moderate temperature',
        timing: 'Morning hours (6-10 AM)',
      });
    }

    // Irrigation advisory
    if (forecast && forecast.rainfall > 10) {
      advisories.push({
        activity: 'Irrigation',
        recommendation: 'avoid',
        reason: 'Rainfall expected, skip irrigation',
      });
    } else if (current.humidity < 40 && current.temperature > 35) {
      advisories.push({
        activity: 'Irrigation',
        recommendation: 'favorable',
        reason: 'High temperature and low humidity',
        timing: 'Evening hours (5-7 PM)',
      });
    }

    // Spraying advisory
    if (current.windSpeed > 15) {
      advisories.push({
        activity: 'Pesticide/Fertilizer Spraying',
        recommendation: 'avoid',
        reason: 'High wind speed may cause spray drift',
      });
    } else if (current.windSpeed < 8 && current.humidity > 50) {
      advisories.push({
        activity: 'Pesticide/Fertilizer Spraying',
        recommendation: 'favorable',
        reason: 'Low wind and moderate humidity',
        timing: 'Morning (7-10 AM) or Evening (4-6 PM)',
      });
    }

    // Harvesting advisory
    if (forecast && forecast.rainfall > 5) {
      advisories.push({
        activity: 'Harvesting',
        recommendation: 'caution',
        reason: 'Rainfall may affect harvest quality',
        timing: 'Complete before rain',
      });
    } else if (current.humidity < 60) {
      advisories.push({
        activity: 'Harvesting',
        recommendation: 'favorable',
        reason: 'Low humidity, good for drying',
        timing: 'Midday (10 AM - 3 PM)',
      });
    }

    return advisories;
  }

  /**
   * Clear all cached weather data
   */
  clearCache(): void {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(WEATHER_CACHE_KEY)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('[WeatherService] Failed to clear cache:', error);
    }
  }
}

// Singleton instance
export const weatherService = new WeatherService();

// Export for testing/custom instances
export default WeatherService;
