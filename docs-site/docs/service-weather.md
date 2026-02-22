---
id: service-weather
title: Weather Service
slug: /service-weather
---

# Weather Forecast Service (Service #8)

Daily weather forecasts with farming advisories for all Tamil Nadu districts. Integrates with OpenWeatherMap API and provides offline caching.

**Source:** `src/weatherService.ts`  
**Policy:** `POL_WEATHER_ADVISORY`  
**Screen:** `WeatherForecastScreen.tsx`

## Data Types

### WeatherData

Current weather conditions:

```ts
type WeatherData = {
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
```

### WeatherForecast

Multi-day forecast entries:

```ts
type WeatherForecast = {
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
```

### WeatherAlert

Severe weather warnings:

```ts
type WeatherAlert = {
  event: string;
  start: number;
  end: number;
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
};
```

### FarmingAdvisory

AI-generated farming recommendations based on weather:

```ts
type FarmingAdvisory = {
  activity: string;
  recommendation: 'favorable' | 'caution' | 'avoid';
  reason: string;
  timing?: string;
};
```

## Tamil Nadu District Coverage

The service includes coordinates for all major TN districts including Chennai, Coimbatore, Madurai, Tiruchirappalli, Salem, Tirunelveli, Erode, Tiruppur, Thanjavur, Vellore, and more.

## Telemetry Events

Under `POL_WEATHER_ADVISORY`:

| Event | Required Fields | Description |
|-------|----------------|-------------|
| `WEATHER_FORECAST_FETCHED` | `district`, `forecastDays` | Forecast retrieved |
| `ADVISORY_GENERATED` | `advisoryId`, `district`, `cropType` | Farming advisory created |
| `ADVISORY_VIEWED` | `advisoryId`, `farmerId` | Farmer viewed advisory |

## Offline Behavior

- Forecasts are cached locally with TTL
- Last-known conditions displayed when offline
- Cache invalidation on connectivity restoration
