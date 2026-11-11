import type { WeatherInfo } from '../../services/api';
import SectionState from './SectionState';

interface WeatherCardProps {
  weather: WeatherInfo | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function display(value: number | null | undefined, suffix: string): string {
  return value === null || value === undefined ? '—' : `${value}${suffix}`;
}

export default function WeatherCard({ weather, loading, error, onRetry }: WeatherCardProps) {
  return (
    <section className="panel weather-panel" aria-labelledby="weather-title">
      <div className="panel-heading"><div><p className="eyebrow">LOCAL CONDITIONS</p><h2 id="weather-title">Weather</h2></div><span className="source-label">OPENWEATHER</span></div>
      <SectionState loading={loading} error={error} onRetry={onRetry} label="weather">
        <div className="weather-summary">
          <strong>{display(weather?.temperature, '°C')}</strong>
          <span>{weather?.weather ?? 'No weather reading'}</span>
        </div>
        <dl className="weather-grid">
          <div><dt>Humidity</dt><dd>{display(weather?.humidity, '%')}</dd></div>
          <div><dt>Pressure</dt><dd>{display(weather?.pressure, ' hPa')}</dd></div>
          <div><dt>Wind</dt><dd>{display(weather?.wind_speed, ' m/s')}</dd></div>
          <div><dt>Wind direction</dt><dd>{display(weather?.wind_direction, '°')}</dd></div>
        </dl>
      </SectionState>
    </section>
  );
}
