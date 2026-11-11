import { useCallback, useEffect, useState } from 'react';

import { useGeolocation } from './hooks/useGeolocation';
import { getCombinedEnvironment } from './services/api';
import type {
  CombinedEnvironmentResponse,
  StationInfo,
} from './services/api';
import AqiCard from './components/dashboard/AqiCard';
import DashboardLayout from './components/dashboard/DashboardLayout';
import LocationBanner from './components/dashboard/LocationBanner';
import PollutionMap from './components/dashboard/PollutionMap';
import PollutantGrid from './components/dashboard/PollutantGrid';
import WeatherCard from './components/dashboard/WeatherCard';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function parseAqi(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '-') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function Dashboard() {
  const { location, loading: locationLoading, error: locationError, requestLocation } = useGeolocation();
  const [environmentResult, setEnvironmentResult] = useState<{
    key: string;
    data?: CombinedEnvironmentResponse;
    error?: string;
  } | null>(null);
  const [selectedStation, setSelectedStation] = useState<StationInfo | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const retryEnvironment = useCallback(() => setReloadKey((current) => current + 1), []);

  const requestKey = location
    ? `${location.latitude},${location.longitude}:${reloadKey}`
    : null;
  const environment = environmentResult?.key === requestKey ? environmentResult.data ?? null : null;
  const environmentError = environmentResult?.key === requestKey ? environmentResult.error ?? null : null;
  const environmentLoading = Boolean(requestKey && environmentResult?.key !== requestKey);
  const stations = environment?.stations ?? [];
  const stationsLoading = environmentLoading;
  const stationsError = environmentError
    ?? (environment?.data_quality.aqi.status === 'unavailable'
      ? environment.data_quality.aqi.message
      : null);

  useEffect(() => {
    if (!location) return;

    const controller = new AbortController();
    getCombinedEnvironment(location.latitude, location.longitude, controller.signal)
      .then((data) => {
        setEnvironmentResult({ key: requestKey as string, data });
        setSelectedStation(null);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        setEnvironmentResult({
          key: requestKey as string,
          error: error instanceof Error ? error.message : 'Environmental data is unavailable.',
        });
      });

    return () => controller.abort();
  }, [location, reloadKey, requestKey]);

  const quality = environment?.data_quality;
  const aqiError = environmentError
    ?? (quality?.aqi.status === 'unavailable' ? quality.aqi.message : null);
  const weatherError = environmentError
    ?? (quality?.weather.status === 'unavailable' ? quality.weather.message : null);
  const pollutantError = environmentError
    ?? (quality?.aqi.status === 'unavailable' ? quality.aqi.message : null);
  const aqi = parseAqi(environment?.aqi?.aqi);

  return (
    <DashboardLayout>
      <LocationBanner
        location={location}
        loading={locationLoading}
        error={locationError}
        onRequestLocation={requestLocation}
      />

      <div className="dashboard-grid">
        <div className="dashboard-map-column">
          <PollutionMap
            location={location}
            stations={stations}
            selectedStation={selectedStation}
            onSelectStation={setSelectedStation}
            loading={stationsLoading}
            error={stationsError}
            onRetry={retryEnvironment}
            searchRadiusKm={quality?.aqi.search_radius_km ?? 100}
          />
        </div>
        <div className="dashboard-summary-column">
          <AqiCard
            value={aqi}
            dominantPollutant={environment?.aqi?.dominentpol ?? null}
            station={environment?.aqi?.city?.name ?? null}
            sourceTimestamp={environment?.source_timestamp ?? null}
            spatialQuality={quality?.aqi ?? null}
            loading={environmentLoading}
            error={aqiError}
            onRetry={retryEnvironment}
          />
          <WeatherCard
            weather={environment?.weather ?? null}
            loading={environmentLoading}
            error={weatherError}
            onRetry={retryEnvironment}
          />
        </div>
        <PollutantGrid
          pollutants={environment?.pollutants ?? null}
          sourceTimestamp={environment?.source_timestamp ?? null}
          loading={environmentLoading}
          error={pollutantError}
          onRetry={retryEnvironment}
        />
      </div>
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}
