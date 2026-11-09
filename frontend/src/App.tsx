import { useEffect, useState } from 'react';
import { useGeolocation } from './hooks/useGeolocation';
import './App.css';

interface AqiResponse {
  aqi: number;
  dominentpol: string;
  city: string;
  error?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

function formatLocationTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp);
}

function App() {
  const { location, loading: locationLoading, error: locationError, requestLocation } = useGeolocation();
  const [aqiData, setAqiData] = useState<AqiResponse | null>(null);
  const [aqiLoading, setAqiLoading] = useState(false);
  const [aqiError, setAqiError] = useState<string | null>(null);

  useEffect(() => {
    if (!location) return;
    const controller = new AbortController();
    const query = new URLSearchParams({
      lat: String(location.latitude),
      lon: String(location.longitude),
    });

    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setAqiData(null);
      setAqiError(null);
      setAqiLoading(true);
    });

    fetch(`${API_BASE_URL}/api/aqi/current?${query}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`AQI service returned HTTP ${response.status}`);
        const payload = (await response.json()) as AqiResponse;
        if (payload.error) throw new Error(payload.error);
        return payload;
      })
      .then(setAqiData)
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        setAqiError(error instanceof Error ? error.message : 'Could not load AQI for this location.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setAqiLoading(false);
      });

    return () => controller.abort();
  }, [location]);

  const poorAccuracy = location !== null && location.accuracy !== null && location.accuracy > 1000;

  return (
    <main className="location-app">
      <header className="location-header">
        <p className="location-eyebrow">AIRSENSE ENVIRONMENTAL INTELLIGENCE</p>
        <h1>Air Quality Dashboard</h1>
        <p>Use your device location to see the closest available air quality reading.</p>
      </header>

      <section className="location-panel" aria-labelledby="location-heading">
        <div className="section-heading">
          <div>
            <p className="location-eyebrow">LOCATION</p>
            <h2 id="location-heading">Your current location</h2>
          </div>
          <div className="location-actions">
            <button type="button" onClick={requestLocation} disabled={locationLoading}>
              {locationLoading ? 'Locating...' : 'Use my device location'}
            </button>
          </div>
        </div>

        {locationError && <p className="feedback error-feedback" role="alert">{locationError}</p>}

        {location && (
          <div className="location-details">
            <div className="coordinate-line">
              <strong>Device location</strong>
              <span>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</span>
            </div>
            <dl className="debug-grid">
              <div><dt>Location source</dt><dd>Device location</dd></div>
              <div><dt>Location fix time</dt><dd>{formatLocationTime(location.timestamp)}</dd></div>
              <div>
                <dt>Accuracy radius (68% estimate)</dt>
                <dd>{location.accuracy === null ? 'Not reported' : `About ${Math.round(location.accuracy).toLocaleString()} m`}</dd>
              </div>
              <div><dt>Request mode</dt><dd>{location.accuracyMode === 'standard' ? 'Standard fallback' : 'High accuracy requested'}</dd></div>
            </dl>

            <p className="source-note">The browser does not reveal whether this fix came from GPS, Wi-Fi, or IP.</p>
            {poorAccuracy && (
              <p className="feedback warning-feedback" role="status">
                This location has a large uncertainty radius. Check your device location settings and try again.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="aqi-panel" aria-labelledby="aqi-heading" aria-live="polite">
        <div className="section-heading">
          <div>
            <p className="location-eyebrow">NEARBY MONITOR</p>
            <h2 id="aqi-heading">Current air quality</h2>
          </div>
          {aqiData && <span className="aqi-value">AQI {aqiData.aqi}</span>}
        </div>
        {!location && <p className="muted-copy">Use your device location to load AQI.</p>}
        {aqiLoading && <p className="muted-copy">Loading AQI for the selected coordinates...</p>}
        {aqiError && <p className="feedback error-feedback" role="alert">{aqiError}</p>}
        {aqiData && (
          <dl className="aqi-details">
            <div><dt>Reporting station</dt><dd>{aqiData.city}</dd></div>
            <div><dt>Dominant pollutant</dt><dd>{aqiData.dominentpol || 'Not reported'}</dd></div>
          </dl>
        )}
      </section>

    </main>
  );
}

export default App;
