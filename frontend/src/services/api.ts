export type PollutantKey = 'pm25' | 'pm10' | 'no2' | 'o3' | 'co';

export interface PollutantReading {
  value: number | null;
  unit: string;
}

export type Pollutants = Record<PollutantKey, PollutantReading>;

export interface WaqiAqiData {
  aqi: number | string | null;
  dominentpol?: string | null;
  city?: { name?: string; geo?: [number, number] };
  time?: { iso?: string; s?: string; v?: number };
}

export interface WeatherInfo {
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  weather: string | null;
  wind_speed: number | null;
  wind_direction: number | null;
}

export interface TrafficInfo {
  current_speed: number | null;
  free_flow_speed: number | null;
  confidence: number | null;
  road_closed: boolean | null;
  jam_factor: number | null;
  speed_limit: number | null;
}

export interface ServiceQuality {
  status: 'ok' | 'unavailable';
  message: string | null;
}

export interface AqiSpatialQuality extends ServiceQuality {
  method: 'station_direct' | 'idw_interpolated' | 'nearest_station_far' | 'no_data';
  nearest_station_km: number | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  stations_used: number;
  search_radius_km: number;
}

export interface CombinedEnvironmentResponse {
  location: { lat: number; lon: number };
  aqi: WaqiAqiData | null;
  weather: WeatherInfo | null;
  traffic: TrafficInfo | null;
  timestamp: number;
  pollutants: Pollutants;
  source_timestamp: string | null;
  request_timestamp: string;
  data_quality: {
    aqi: AqiSpatialQuality;
    weather: ServiceQuality;
    traffic: ServiceQuality;
    method: AqiSpatialQuality['method'];
    nearest_station_km: number | null;
    confidence: AqiSpatialQuality['confidence'];
  };
  stations: StationInfo[];
}

export interface StationInfo {
  uid: number;
  name: string;
  latitude: number;
  longitude: number;
  aqi: number | string | null;
  dominant_pollutant?: string | null;
  pollutants: Pollutants;
  source_timestamp: string | null;
  distance_km: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

async function getJson<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { signal });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Request failed with HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export function getCombinedEnvironment(
  lat: number,
  lon: number,
  signal: AbortSignal,
): Promise<CombinedEnvironmentResponse> {
  const query = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  return getJson<CombinedEnvironmentResponse>(`/api/environment/combined?${query}`, signal);
}

export function getStations(
  lat: number,
  lon: number,
  signal: AbortSignal,
): Promise<{ stations: StationInfo[] }> {
  const query = new URLSearchParams({ lat: String(lat), lon: String(lon), radius_km: '25' });
  return getJson<{ stations: StationInfo[] }>(`/api/aqi/stations?${query}`, signal);
}
