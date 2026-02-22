import React from 'react';
import { weatherService, type WeatherResponse, type FarmingAdvisory } from './weatherService';
import { useOfflineAgriSdk } from './sdk/provider';
import { BUSINESS_POLICIES } from './sdk/policy';

export type UseWeatherResult = {
  weather: WeatherResponse | null;
  loading: boolean;
  error: string | null;
  advisories: FarmingAdvisory[];
  fetchWeather: (district: string) => Promise<void>;
  refreshWeather: () => Promise<void>;
  clearCache: () => void;
};

/**
 * Hook for fetching and managing weather data with SDK tracking
 */
export function useWeather(initialDistrict?: string): UseWeatherResult {
  const [weather, setWeather] = React.useState<WeatherResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentDistrict, setCurrentDistrict] = React.useState(initialDistrict);
  const sdk = useOfflineAgriSdk();

  const fetchWeather = React.useCallback(async (district: string) => {
    setLoading(true);
    setError(null);
    setCurrentDistrict(district);

    try {
      const data = await weatherService.fetchWeatherByDistrict(district);
      setWeather(data);

      // Track weather fetch with SDK telemetry
      if (sdk.ready) {
        sdk.track(
          BUSINESS_POLICIES.POL_WEATHER_ADVISORY,
          'WEATHER_FORECAST_FETCHED',
          {
            district,
            temperature: data.current.temperature,
            humidity: data.current.humidity,
            rainfall: data.current.rainfall || 0,
            source: data.source,
          },
          8
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch weather';
      setError(errorMessage);
      console.error('[useWeather]', err);
    } finally {
      setLoading(false);
    }
  }, [sdk]);

  const refreshWeather = React.useCallback(async () => {
    if (currentDistrict) {
      await fetchWeather(currentDistrict);
    }
  }, [currentDistrict, fetchWeather]);

  const clearCache = React.useCallback(() => {
    weatherService.clearCache();
    setWeather(null);
  }, []);

  const advisories = React.useMemo(() => {
    return weather ? weatherService.generateAdvisory(weather) : [];
  }, [weather]);

  // Auto-fetch on mount if initialDistrict provided
  React.useEffect(() => {
    if (initialDistrict && !weather) {
      fetchWeather(initialDistrict);
    }
  }, [initialDistrict]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    weather,
    loading,
    error,
    advisories,
    fetchWeather,
    refreshWeather,
    clearCache,
  };
}

/**
 * Example Weather Component for Service #8
 */
export function WeatherForecastScreen() {
  const [selectedDistrict, setSelectedDistrict] = React.useState('thanjavur');
  const { weather, loading, error, advisories, fetchWeather, refreshWeather } = useWeather();
  const districts = weatherService.getAllDistricts();

  React.useEffect(() => {
    fetchWeather(selectedDistrict);
  }, [selectedDistrict, fetchWeather]);

  const formatTemp = (temp: number) => `${Math.round(temp)}°C`;
  const formatDate = (timestamp: number) => new Date(timestamp * 1000).toLocaleDateString('en-IN');
  const formatTime = (timestamp: number) => new Date(timestamp * 1000).toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const getAdvisoryColor = (recommendation: string) => {
    switch (recommendation) {
      case 'favorable': return '#4caf50';
      case 'caution': return '#ff9800';
      case 'avoid': return '#f44336';
      default: return '#757575';
    }
  };

  const getAdvisoryIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'favorable': return '✅';
      case 'caution': return '⚠️';
      case 'avoid': return '🚫';
      default: return 'ℹ️';
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🌤️ Daily Weather Forecast (Service #8)</h1>

      {/* District Selector */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Select District:
        </label>
        <select 
          value={selectedDistrict}
          onChange={(e) => setSelectedDistrict(e.target.value)}
          style={{ padding: '8px', fontSize: '16px', width: '200px' }}
        >
          {districts.map((district) => (
            <option key={district} value={district.toLowerCase()}>
              {district}
            </option>
          ))}
        </select>
        <button 
          onClick={refreshWeather}
          disabled={loading}
          style={{ marginLeft: '10px', padding: '8px 16px', cursor: 'pointer' }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Loading State */}
      {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading weather data...</div>}

      {/* Error State */}
      {error && (
        <div style={{ 
          padding: '15px', 
          background: '#ffebee', 
          color: '#c62828',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          ❌ {error}
          <div style={{ marginTop: '10px', fontSize: '14px' }}>
            💡 <strong>Tip:</strong> Configure your OpenWeatherMap API key: 
            <code style={{ background: '#fff', padding: '2px 6px', marginLeft: '5px' }}>
              weatherService.setApiKey('YOUR_KEY')
            </code>
          </div>
        </div>
      )}

      {/* Current Weather */}
      {weather && (
        <>
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '25px',
            borderRadius: '12px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: '0 0 10px 0' }}>{weather.location.name}</h2>
                <p style={{ margin: 0, opacity: 0.9 }}>
                  {weather.current.conditions[0]?.description || 'Clear'}
                </p>
                <p style={{ margin: '5px 0', opacity: 0.8, fontSize: '14px' }}>
                  {weather.source === 'cache' ? '📦 Cached' : '🌐 Live'} • 
                  Updated: {new Date(weather.fetchedAt).toLocaleTimeString('en-IN')}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '48px', fontWeight: 'bold' }}>
                  {formatTemp(weather.current.temperature)}
                </div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>
                  Feels like {formatTemp(weather.current.feelsLike)}
                </div>
              </div>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '15px',
              marginTop: '20px'
            }}>
              <div>
                <div style={{ opacity: 0.8, fontSize: '12px' }}>💧 Humidity</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{weather.current.humidity}%</div>
              </div>
              <div>
                <div style={{ opacity: 0.8, fontSize: '12px' }}>💨 Wind</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  {Math.round(weather.current.windSpeed)} km/h
                </div>
              </div>
              <div>
                <div style={{ opacity: 0.8, fontSize: '12px' }}>🌧️ Rainfall</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  {weather.current.rainfall || 0} mm
                </div>
              </div>
              <div>
                <div style={{ opacity: 0.8, fontSize: '12px' }}>☁️ Clouds</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{weather.current.cloudiness}%</div>
              </div>
            </div>

            <div style={{ 
              marginTop: '15px',
              paddingTop: '15px',
              borderTop: '1px solid rgba(255,255,255,0.2)',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '14px'
            }}>
              <span>🌅 Sunrise: {formatTime(weather.current.sunrise)}</span>
              <span>🌇 Sunset: {formatTime(weather.current.sunset)}</span>
            </div>
          </div>

          {/* Farming Advisories */}
          {advisories.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3>🌾 Farming Advisories</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {advisories.map((advisory, index) => (
                  <div key={index} style={{
                    padding: '15px',
                    background: '#f5f5f5',
                    borderRadius: '8px',
                    borderLeft: `4px solid ${getAdvisoryColor(advisory.recommendation)}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '20px', marginRight: '10px' }}>
                        {getAdvisoryIcon(advisory.recommendation)}
                      </span>
                      <strong>{advisory.activity}</strong>
                      <span style={{ 
                        marginLeft: 'auto',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: 'white',
                        background: getAdvisoryColor(advisory.recommendation)
                      }}>
                        {advisory.recommendation.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ margin: '5px 0', color: '#555' }}>{advisory.reason}</p>
                    {advisory.timing && (
                      <p style={{ margin: '5px 0', fontSize: '14px', color: '#777' }}>
                        ⏰ <strong>Best timing:</strong> {advisory.timing}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5-Day Forecast */}
          <div>
            <h3>📅 5-Day Forecast</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '15px'
            }}>
              {weather.forecast.map((day, index) => (
                <div key={index} style={{
                  padding: '15px',
                  background: '#f9f9f9',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                    {formatDate(day.dt)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                    {day.conditions[0]?.description || 'Clear'}
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0' }}>
                    {formatTemp(day.temperature)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888' }}>
                    {formatTemp(day.tempMin)} / {formatTemp(day.tempMax)}
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '12px' }}>
                    💧 {day.humidity}% | 💨 {Math.round(day.windSpeed)} km/h
                  </div>
                  {day.rainfall > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '14px', color: '#2196f3' }}>
                      🌧️ {day.rainfall.toFixed(1)} mm
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Setup Instructions */}
      {!weather && !loading && !error && (
        <div style={{ 
          padding: '30px', 
          background: '#e3f2fd', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h3>🔑 Setup Required</h3>
          <p>Get your free OpenWeatherMap API key:</p>
          <ol style={{ textAlign: 'left', display: 'inline-block' }}>
            <li>Visit <a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer">
              openweathermap.org/api
            </a></li>
            <li>Sign up for a free account</li>
            <li>Generate an API key</li>
            <li>Add to your app: <code>weatherService.setApiKey('YOUR_KEY')</code></li>
          </ol>
        </div>
      )}
    </div>
  );
}

export default WeatherForecastScreen;
