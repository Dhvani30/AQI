import { useCallback, useEffect, useRef, useState } from 'react';

import { useGeolocation } from './hooks/useGeolocation';
import { ApiError, evaluateAqi, getCombinedEnvironment, saveLocationHistory } from './services/api';
import type { CombinedEnvironmentResponse, StationInfo } from './services/api';
import { authFetch, clearSession, getSession } from './services/auth';
import type { Advisory, Session } from './services/auth';
import AqiCard from './components/dashboard/AqiCard';
import DashboardLayout from './components/dashboard/DashboardLayout';
import LocationBanner from './components/dashboard/LocationBanner';
import PollutionMap from './components/dashboard/PollutionMap';
import AuthPage from './components/AuthPage';
import ErrorBoundary from './components/ErrorBoundary';
import ProfilePage from './components/ProfilePage';
import './App.css';

type Page = 'map' | 'trips' | 'alerts' | 'profile';

function ComingSoonPage({ title }: { title: string }) {
  return (
    <section className="coming-soon-page" aria-labelledby="coming-soon-title">
      <p className="eyebrow">PLANNED</p>
      <h1 id="coming-soon-title">{title}</h1>
      <p>This page is to be added later.</p>
    </section>
  );
}

function parseAqi(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '-') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

interface DashboardProps {
  username: string;
  profileRevision: number;
  onUnauthorized: () => void;
  onPlanTrip: () => void;
}

function Dashboard({ username, profileRevision, onUnauthorized, onPlanTrip }: DashboardProps) {
  const { location, loading: locationLoading, error: locationError, requestLocation } = useGeolocation();
  const [advisoryResult, setAdvisoryResult] = useState<{ key: string; data: Advisory } | null>(null);
  const lastHistoryKey = useRef<string | null>(null);
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
  }, [location, requestKey]);

  const quality = environment?.data_quality;
  const aqiError = environmentError
    ?? (quality?.aqi.status === 'unavailable' ? quality.aqi.message : null);
  const aqi = parseAqi(environment?.aqi?.aqi);
  const advisoryKey = aqi === null ? null : `${aqi}:${profileRevision}`;
  const advisory = advisoryResult?.key === advisoryKey ? advisoryResult.data : null;

  useEffect(() => {
    if (aqi === null || advisoryKey === null) return;
    const controller = new AbortController();
    evaluateAqi(aqi, controller.signal)
      .then((data) => setAdvisoryResult({ key: advisoryKey, data }))
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        setAdvisoryResult(null);
        if (error instanceof ApiError && error.status === 401) onUnauthorized();
      });
    return () => controller.abort();
  }, [aqi, advisoryKey, onUnauthorized]);

  useEffect(() => {
    if (!location) return;
    const historyKey = `${location.timestamp}:${username}`;
    if (lastHistoryKey.current === historyKey) return;
    lastHistoryKey.current = historyKey;
    saveLocationHistory(location.latitude, location.longitude, username).catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        onUnauthorized();
        return;
      }
      console.error('Could not save location history', error);
    });
  }, [location, username, onUnauthorized]);

  return (
    <>
      <div className="map-home">
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
        {aqi !== null && <div className="map-air-note">Air quality is {aqi} AQI nearby. Check conditions before you leave.</div>}
        <LocationBanner
          location={location}
          loading={locationLoading}
          error={locationError}
          onRequestLocation={requestLocation}
        />
      </div>
      <div className="air-summary">
        <div className="air-summary-heading"><div><h1>Air near you</h1><p>{environment?.aqi?.city?.name ?? 'Nearby monitoring area'}</p></div><span>Updated {environment?.source_timestamp ? new Date(environment.source_timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}</span></div>
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
        <button className="primary-action plan-trip-button" type="button" onClick={onPlanTrip}>Plan a trip</button>
      </div>
      {advisory && (
        <section
          className={`advisory-banner${advisory.alert ? ' advisory-alert' : ''}`}
          aria-live="polite"
          aria-label="Personalized air quality advisory"
        >
          <div className="advisory-heading">
            <strong>{advisory.alert ? 'Personal AQI alert' : 'Personal AQI guidance'}</strong>
            <span>{advisory.category}</span>
          </div>
          <p>Personal alert threshold: {advisory.personal_threshold}</p>
          <ul>
            {advisory.advisories.map((message) => <li key={message}>{message}</li>)}
          </ul>
        </section>
      )}
    </>
  );
}

interface AuthenticatedAppProps {
  session: Session;
  onLogout: () => void;
}

function AuthenticatedApp({ session, onLogout }: AuthenticatedAppProps) {
  const [page, setPage] = useState<Page>('map');
  const [profileRevision, setProfileRevision] = useState(0);
  const onUnauthorized = useCallback(() => onLogout(), [onLogout]);
  const selectedTab = page;
  const pages: { id: Extract<Page, 'map' | 'trips' | 'alerts' | 'profile'>; label: string; icon: string }[] = [
    { id: 'map', label: 'Map', icon: 'map' },
    { id: 'trips', label: 'Trips', icon: 'route' },
    { id: 'alerts', label: 'Alerts', icon: 'bell' },
    { id: 'profile', label: 'Profile', icon: 'person' },
  ];
  const navigation = (
    <nav className="bottom-navigation" aria-label="Main navigation">
      {pages.map(({ id, label, icon }) => (
        <button key={id} type="button" className={selectedTab === id ? 'active' : ''}
          aria-current={selectedTab === id ? 'page' : undefined}
          onClick={() => setPage(id)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {icon === 'map' && <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15m6-12v15"/></>}
            {icon === 'route' && <><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18h2a3 3 0 0 0 3-3v-2a3 3 0 0 1 3-3H18"/></>}
            {icon === 'bell' && <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>}
            {icon === 'person' && <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>}
          </svg>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <DashboardLayout navigation={navigation}>
      <div hidden={page !== 'map'}>
        <Dashboard username={session.username} profileRevision={profileRevision} onUnauthorized={onUnauthorized} onPlanTrip={() => setPage('trips')} />
      </div>
      {page === 'trips' && <ComingSoonPage title="Trips" />}
      
      {page === 'alerts' && <ComingSoonPage title="Alerts" />}
      
      <div hidden={page !== 'profile'}>
        <ProfilePage
          onLogout={onLogout}
          onProfileSaved={() => setProfileRevision((revision) => revision + 1)}
        />
      </div>
    </DashboardLayout>
  );
}

export default function App() {
  const [session, setSessionState] = useState<Session | null>(() => getSession());
  const [checkedToken, setCheckedToken] = useState<string | null>(null);
  const checkingSession = Boolean(session && checkedToken !== session.token);

  const logout = useCallback(() => {
    clearSession();
    setSessionState(null);
    setCheckedToken(null);
  }, []);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    authFetch('/users/me', { signal: controller.signal })
      .then((response) => {
        if (response.status === 401) logout();
        else setCheckedToken(session.token);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== 'AbortError') setCheckedToken(session.token);
      });
    return () => controller.abort();
  }, [session, logout]);

  const authenticated = useCallback(() => {
    setSessionState(getSession());
  }, []);

  if (!session) return <AuthPage onAuthenticated={authenticated} />;
  if (checkingSession) {
    return <main className="session-check" role="status">Checking your session...</main>;
  }
  return <AuthenticatedApp key={session.token} session={session} onLogout={logout} />;
}

export function RootApp() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
