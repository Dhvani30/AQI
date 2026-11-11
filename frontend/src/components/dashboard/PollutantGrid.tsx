import type { Pollutants } from '../../services/api';
import SectionState from './SectionState';

interface PollutantGridProps {
  pollutants: Pollutants | null;
  sourceTimestamp: string | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const pollutantLabels = [
  { key: 'pm25', label: 'PM2.5' },
  { key: 'pm10', label: 'PM10' },
  { key: 'no2', label: 'NO₂' },
  { key: 'o3', label: 'O₃' },
  { key: 'co', label: 'CO' },
] as const;

export default function PollutantGrid({ pollutants, sourceTimestamp, loading, error, onRetry }: PollutantGridProps) {
  return (
    <section className="panel pollutant-panel" aria-labelledby="pollutant-title">
      <div className="panel-heading">
        <div><p className="eyebrow">STATION BREAKDOWN</p><h2 id="pollutant-title">Pollutants</h2></div>
        {sourceTimestamp && <span className="muted-label">Observed {new Date(sourceTimestamp).toLocaleTimeString()}</span>}
      </div>
      <SectionState loading={loading} error={error} onRetry={onRetry} label="pollutants">
        <div className="pollutant-grid">
          {pollutantLabels.map(({ key, label }) => {
            const reading = pollutants?.[key];
            return (
              <div className="pollutant-reading" key={key}>
                <span>{label}</span>
                <strong>{reading?.value ?? '—'}</strong>
                <small>{reading?.value === null || reading?.value === undefined ? 'Not reported' : reading.unit}</small>
              </div>
            );
          })}
        </div>
        <p className="data-note">WAQI individual sub-index values are shown as provided; they are not converted to pollutant concentrations.</p>
      </SectionState>
    </section>
  );
}
