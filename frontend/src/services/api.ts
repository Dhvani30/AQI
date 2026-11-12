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

import { authFetch } from './auth';
import type { Advisory } from './auth';

export type { Advisory, HealthProfile, UserProfile } from './auth';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  return readJson<T>(response);
}

async function requestAuthenticatedJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  return readJson<T>(await authFetch(path, init));
}

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const detail = typeof body === 'object' && body !== null && 'detail' in body
      ? body.detail
      : null;
    const message = typeof detail === 'string' ? detail : `Request failed with HTTP ${response.status}`;
    throw new ApiError(message, response.status);
  }
  return body as T;
}

async function getJson<T>(path: string, signal: AbortSignal): Promise<T> {
  return requestJson<T>(path, { signal });
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

export function evaluateAqi(aqi: number, signal?: AbortSignal): Promise<Advisory> {
  return requestAuthenticatedJson('/users/me/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aqi }),
    signal,
  });
}

export function saveLocationHistory(
  latitude: number,
  longitude: number,
  username: string,
): Promise<{ stored: boolean }> {
  const query = new URLSearchParams({ username });
  return requestAuthenticatedJson(`/location/update?${query}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude, longitude }),
  });
}
