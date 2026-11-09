import { useState, useEffect } from 'react';

// 1. FIX: Define a strict TypeScript interface instead of using 'any'
interface AqiResponse {
  aqi: number;
  dominentpol: string;
  city: string;
  error?: string;
}

function App() {
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  
  // 2. FIX: Check for geolocation support during initial state setup.
  // This prevents calling setError synchronously inside the useEffect.
  const [error, setError] = useState<string>(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return 'Geolocation is not supported by your browser';
    }
    return '';
  });
  
  const [aqiData, setAqiData] = useState<AqiResponse | null>(null);

  // Effect 1: Get User Location
  useEffect(() => {
    // If we already know it's not supported from the initial state, exit early
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (err) => {
        // These are async callbacks, so setting state here is perfectly valid 
        // and won't trigger the linter warning.
        if (err.code === 1) setError('Location permission denied.');
        else if (err.code === 2) setError('Location unavailable.');
        else if (err.code === 3) setError('Location request timed out.');
        else setError('An unknown location error occurred.');
      }
    );
  }, []);

  // Effect 2: Fetch AQI Data once Location is found
  useEffect(() => {
    if (location) {
      fetch(`http://127.0.0.1:8000/api/aqi/current?lat=${location.lat}&lon=${location.lon}`)
        .then((res) => res.json())
        .then((data: AqiResponse) => setAqiData(data))
        .catch((err) => {
          console.error('AQI Fetch Error:', err);
          setError('Failed to connect to backend.');
        });
    }
  }, [location]);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '2rem' }}>
      <h1>AQI Smart Mobility Dashboard</h1>
      
      {/* Show Errors */}
      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>⚠️ {error}</p>}
      
      {/* Show Location */}
      {location && (
        <p style={{ color: '#555' }}>
          <strong>📍 Current Coordinates:</strong> {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
        </p>
      )}

      {/* Show AQI Data */}
      {aqiData && !aqiData.error && (
        <div style={{ 
          padding: '1.5rem', 
          background: '#e0f7fa', 
          borderRadius: '8px', 
          marginTop: '1rem',
          maxWidth: '400px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 10px 0' }}>Current AQI: {aqiData.aqi}</h2>
          <p style={{ margin: '5px 0' }}><strong>Dominant Pollutant:</strong> {aqiData.dominentpol}</p>
          <p style={{ margin: '5px 0' }}><strong>City:</strong> {aqiData.city}</p>
        </div>
      )}

      {/* Show Backend Error if AQI fails */}
      {aqiData?.error && <p style={{ color: 'orange', marginTop: '1rem' }}>{aqiData.error}</p>}
      
      {/* Loading state */}
      {!location && !error && <p>Fetching your location...</p>}
    </div>
  );
}

export default App;