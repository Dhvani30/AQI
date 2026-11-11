import type { AqiSpatialQuality } from '../../services/api';
import SectionState from './SectionState';

interface AqiCardProps {
  value: number | null;
  dominantPollutant: string | null;
  station: string | null;
  sourceTimestamp: string | null;
  spatialQuality: AqiSpatialQuality | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function categoryFor(value: number | null): { label: string; tone: string } {
  if (value === null) return { label: 'Waiting for a reading', tone: 'unknown' };
  if (value <= 50) return { label: 'Good', tone: 'good' };
  if (value <= 100) return { label: 'Moderate', tone: 'moderate' };
  if (value <= 150) return { label: 'Unhealthy for sensitive groups', tone: 'sensitive' };
  if (value <= 200) return { label: 'Unhealthy', tone: 'unhealthy' };
  if (value <= 300) return { label: 'Very unhealthy', tone: 'very-unhealthy' };
  return { label: 'Hazardous', tone: 'hazardous' };
}

export default function AqiCard({
  value,
  dominantPollutant,
  station,
  sourceTimestamp,
  spatialQuality,
  loading,
  error,
  onRetry,
}: AqiCardProps) {
  const category = categoryFor(value);
  const distance = spatialQuality?.nearest_station_km;

  return (
    <section className={`panel aqi-card tone-${category.tone}`} aria-labelledby="aqi-title">
      <div className="panel-topline"><p className="eyebrow">CURRENT AIR QUALITY</p><span className="source-label">WAQI</span></div>
      <h2 id="aqi-title" className="visually-hidden">Current air quality</h2>
      <SectionState loading={loading} error={error} onRetry={onRetry} label="air quality">
        {spatialQuality?.method === 'no_data' ? (
          <p className="aqi-no-data" role="status">No air quality data available for this region yet.</p>
        ) : (
          <>
            <div className="aqi-reading">
              <strong>{value ?? '—'}</strong>
              <div><span className="aqi-category">{category.label}</span><span className="aqi-scale">US AQI</span></div>
            </div>
            <div className="aqi-details">
              <p><span>Station / source</span><strong>{station ?? 'No station yet'}</strong></p>
              <p>
                <span>{spatialQuality?.method === 'idw_interpolated' ? "Nearest station's main pollutant" : 'Main pollutant'}</span>
                <strong>{dominantPollutant?.toUpperCase() ?? '—'}</strong>
              </p>
              <p>
                <span>{spatialQuality?.method === 'idw_interpolated' ? 'Nearest source updated' : 'Observed'}</span>
                <strong>{sourceTimestamp ? new Date(sourceTimestamp).toLocaleString() : '—'}</strong>
              </p>
            </div>
            {spatialQuality && spatialQuality.method !== 'station_direct' && (
              <div className={`spatial-quality quality-${spatialQuality.confidence}`} role="status">
                {spatialQuality.method === 'idw_interpolated' ? (
                  <>
                    Estimated from {spatialQuality.stations_used} stations using inverse-distance weighting.
                    {' '}Nearest station: {distance?.toFixed(1)} km.
                  </>
                ) : (
                  <>
                    Only one reporting station was found. Showing its reading without interpolation.
                    {' '}Station distance: {distance?.toFixed(1)} km.
                  </>
                )}
                {' '}Confidence: {spatialQuality.confidence}.
              </div>
            )}
          </>
        )}
      </SectionState>
    </section>
  );
}
