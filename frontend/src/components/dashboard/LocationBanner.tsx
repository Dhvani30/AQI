import type { UserLocation } from '../../hooks/useGeolocation';

interface LocationBannerProps {
  location: UserLocation | null;
  loading: boolean;
  error: string | null;
  onRequestLocation: () => void;
}

function formatFixTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp);
}

export default function LocationBanner({ location, loading, error, onRequestLocation }: LocationBannerProps) {
  return (
    <section className="location-banner" aria-labelledby="location-title">
      <div className="location-banner-copy">
        <p className="eyebrow">YOUR AREA</p>
        <h1 id="location-title">Air near you</h1>
        {location ? (
          <>
            <p className="coordinate-text">{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</p>
            <p className="location-meta">
              Fix: {formatFixTime(location.timestamp)}
              {location.accuracy !== null && ` · ±${Math.round(location.accuracy).toLocaleString()} m`}
              {location.accuracyMode === 'standard' && ' · standard accuracy'}
            </p>
          </>
        ) : (
          <p className="location-meta">
            Share your device location to find nearby air-quality stations.
          </p>
        )}
        <p className="location-meta">Coordinates are sent to location history when you use this control.</p>
        {error && <p className="location-error" role="alert">{error}</p>}
        {location?.accuracy !== null && location?.accuracy !== undefined && location.accuracy > 1000 && (
          <p className="location-warning" role="status">Location uncertainty is over 1 km. Check device location settings for a closer fix.</p>
        )}
      </div>
      <button className="location-button" type="button" onClick={onRequestLocation} disabled={loading}>
        {loading ? 'Finding location…' : location ? 'Update location' : 'Use my location'}
      </button>
    </section>
  );
}
