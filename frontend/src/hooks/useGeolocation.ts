import { useCallback, useEffect, useRef, useState } from 'react';

export type LocationSource = 'device' | 'manual';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
  source: LocationSource;
  label?: string;
  accuracyMode?: 'high' | 'standard' | null;
}

function describeError(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return 'Location permission was denied. Allow location access in your browser, or search for a place manually.';
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return 'Your device could not determine a location. Try again or search for a place manually.';
  }
  if (error.code === error.TIMEOUT) {
    return 'Location lookup timed out. Try again or search for a place manually.';
  }
  return 'Could not get your location. Try again or search for a place manually.';
}

export function useGeolocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => () => {
    requestId.current += 1;
  }, []);

  const requestLocation = useCallback(() => {
    const id = ++requestId.current;
    if (!navigator.geolocation) {
      setError('Location is unavailable. Use HTTPS or localhost, or search for a place manually.');
      return;
    }

    setLoading(true);
    setError(null);

    const onSuccess = (position: GeolocationPosition, accuracyMode: 'high' | 'standard') => {
      if (id !== requestId.current) return;
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
        source: 'device',
        accuracyMode,
      });
      setLoading(false);
    };

    const onStandardError = (positionError: GeolocationPositionError) => {
      if (id !== requestId.current) return;
      setError(describeError(positionError));
      setLoading(false);
    };

    navigator.geolocation.getCurrentPosition(
      (position) => onSuccess(position, 'high'),
      (highAccuracyError) => {
        if (id !== requestId.current) return;
        // Permission denial cannot be fixed by retrying with lower accuracy.
        if (highAccuracyError.code === highAccuracyError.PERMISSION_DENIED) {
          setError(describeError(highAccuracyError));
          setLoading(false);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => onSuccess(position, 'standard'),
          onStandardError,
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, []);

  const setManualLocation = useCallback((place: { latitude: number; longitude: number; label: string }) => {
    requestId.current += 1;
    setLocation({
      latitude: place.latitude,
      longitude: place.longitude,
      accuracy: null,
      timestamp: Date.now(),
      source: 'manual',
      label: place.label,
      accuracyMode: null,
    });
    setLoading(false);
    setError(null);
  }, []);

  return { location, loading, error, requestLocation, setManualLocation };
}
