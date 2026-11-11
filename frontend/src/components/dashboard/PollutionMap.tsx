import { useEffect } from 'react';
import L from 'leaflet';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import type { UserLocation } from '../../hooks/useGeolocation';
import type { PollutantKey, StationInfo } from '../../services/api';

import 'leaflet/dist/leaflet.css';

L.Marker.prototype.options.icon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface PollutionMapProps {
  location: UserLocation | null;
  stations: StationInfo[];
  selectedStation: StationInfo | null;
  onSelectStation: (station: StationInfo) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  searchRadiusKm: number;
}

const pollutantKeys: PollutantKey[] = ['pm25', 'pm10', 'no2', 'o3', 'co'];

function MapViewport({ location }: { location: UserLocation }) {
  const map = useMap();

  useEffect(() => {
    map.setView([location.latitude, location.longitude], 12);
  }, [location.latitude, location.longitude, map]);

  return null;
}

function StationReadings({ station }: { station: StationInfo }) {
  const readings = pollutantKeys
    .map((key) => ({ key, ...station.pollutants[key] }))
    .filter((reading) => reading.value !== null);

  if (readings.length === 0) return <p>No pollutant values reported.</p>;

  return (
    <ul className="station-popup-readings">
      {readings.map((reading) => (
        <li key={reading.key}>{reading.key.toUpperCase()}: {reading.value} {reading.unit}</li>
      ))}
    </ul>
  );
}

export default function PollutionMap({
  location,
  stations,
  selectedStation,
  onSelectStation,
  loading,
  error,
  onRetry,
  searchRadiusKm,
}: PollutionMapProps) {
  if (!location) {
    return (
      <section className="panel map-panel" aria-labelledby="map-title">
        <div className="panel-heading"><div><p className="eyebrow">MONITORING STATIONS</p><h2 id="map-title">Air near you</h2></div></div>
        <div className="map-empty">Share your location to see nearby monitoring stations.</div>
      </section>
    );
  }

  return (
    <section className="panel map-panel" aria-labelledby="map-title">
      <div className="panel-heading">
        <div><p className="eyebrow">MONITORING STATIONS</p><h2 id="map-title">Air near you</h2></div>
        <span className="muted-label">Search radius {searchRadiusKm} km</span>
      </div>
      <div className="map-content">
        <div className="map-frame">
          <MapContainer
            center={[location.latitude, location.longitude]}
            zoom={12}
            scrollWheelZoom={false}
            className="leaflet-map"
          >
            <MapViewport location={location} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <CircleMarker
              center={[location.latitude, location.longitude]}
              radius={8}
              pathOptions={{ color: '#075852', fillColor: '#0b756c', fillOpacity: 1, weight: 3 }}
            >
              <Popup>Your device location</Popup>
            </CircleMarker>
            {stations.map((station) => (
              <Marker
                key={station.uid}
                position={[station.latitude, station.longitude]}
                eventHandlers={{ click: () => onSelectStation(station) }}
              >
                <Popup>
                  <strong>{station.name}</strong>
                  <p>AQI: {station.aqi ?? '—'}</p>
                  <p>{station.distance_km.toFixed(1)} km away</p>
                  <StationReadings station={station} />
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          {loading && <div className="map-status">Loading nearby stations…</div>}
          {error && (
            <div className="map-status map-error" role="alert">
              <span>{error}</span><button type="button" onClick={onRetry}>Retry</button>
            </div>
          )}
        </div>
        <aside className="station-detail" aria-live="polite">
          {selectedStation ? (
            <>
              <p className="eyebrow">SELECTED STATION</p>
              <h3>{selectedStation.name}</h3>
              <strong className="station-aqi">AQI {selectedStation.aqi ?? '—'}</strong>
              <p className="station-distance">{selectedStation.distance_km.toFixed(1)} km from your location</p>
              <p className="station-coordinates">{selectedStation.latitude.toFixed(3)}, {selectedStation.longitude.toFixed(3)}</p>
              <StationReadings station={selectedStation} />
              <p className="muted-label">Observed {selectedStation.source_timestamp ? new Date(selectedStation.source_timestamp).toLocaleString() : 'time unavailable'}</p>
            </>
          ) : (
            <>
              <p className="eyebrow">STATION DETAILS</p>
              <h3>Select a marker</h3>
              <p>Choose a nearby station to view its available readings.</p>
              {!loading && !error && stations.length === 0 && <p>No stations were returned in this area.</p>}
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
