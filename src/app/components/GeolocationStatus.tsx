'use client';

import { useEffect, useState } from 'react';
import { isOnCampus, howestCampuses, type Campus } from '@/data/howestCampuses';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  permissionDenied: boolean;
}

interface CampusCheckResult {
  isOnCampus: boolean;
  nearestCampus: Campus | null;
  distance: number;
}

export default function GeolocationStatus() {
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
    permissionDenied: false,
  });

  const [campusCheck, setCampusCheck] = useState<CampusCheckResult | null>(
    null
  );

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation({
        latitude: null,
        longitude: null,
        error: 'Geolocatie wordt niet ondersteund door je browser',
        loading: false,
        permissionDenied: false,
      });
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0, // Altijd verse locatie ophalen
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({
          latitude,
          longitude,
          error: null,
          loading: false,
          permissionDenied: false,
        });

        // Check of we op een campus zijn
        const check = isOnCampus(latitude, longitude);
        setCampusCheck(check);
      },
      (error) => {
        let errorMessage = 'Locatie kon niet worden bepaald';
        let permissionDenied = false;

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Geolocatie toegang geweigerd. Sta toegang toe om te zien of je op school bent.';
            permissionDenied = true;
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Locatie informatie niet beschikbaar';
            break;
          case error.TIMEOUT:
            errorMessage = 'Locatie request timeout';
            break;
        }

        setLocation({
          latitude: null,
          longitude: null,
          error: errorMessage,
          loading: false,
          permissionDenied,
        });
      },
      options
    );
  }, []);

  const handleRequestLocation = () => {
    setLocation((prev) => ({ ...prev, loading: true, error: null }));
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({
          latitude,
          longitude,
          error: null,
          loading: false,
          permissionDenied: false,
        });

        const check = isOnCampus(latitude, longitude);
        setCampusCheck(check);
      },
      (error) => {
        let errorMessage = 'Locatie kon niet worden bepaald';
        let permissionDenied = false;

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Geolocatie toegang geweigerd';
            permissionDenied = true;
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Locatie informatie niet beschikbaar';
            break;
          case error.TIMEOUT:
            errorMessage = 'Locatie request timeout';
            break;
        }

        setLocation({
          latitude: null,
          longitude: null,
          error: errorMessage,
          loading: false,
          permissionDenied,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="fixed top-4 right-4 p-4 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 min-w-[280px] max-w-[320px]">
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-3 h-3 rounded-full mt-1 ${
              location.loading
                ? 'bg-yellow-500 animate-pulse'
                : campusCheck?.isOnCampus
                ? 'bg-green-500'
                : location.error
                ? 'bg-red-500'
                : 'bg-gray-400'
            }`}
          />
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Locatie Status
            </span>

            {location.loading && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Locatie ophalen...
              </span>
            )}

            {location.error && (
              <div className="flex flex-col gap-2">
                <span className="text-xs text-red-600 dark:text-red-400">
                  {location.error}
                </span>
                {location.permissionDenied && (
                  <button
                    onClick={handleRequestLocation}
                    className="text-xs px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                  >
                    Probeer opnieuw
                  </button>
                )}
              </div>
            )}

            {!location.loading && !location.error && campusCheck && (
              <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                {campusCheck.isOnCampus ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      🎓 Welkom op school!
                    </span>
                    {campusCheck.nearestCampus && (
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">
                        {campusCheck.nearestCampus.name}
                      </span>
                    )}
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {campusCheck.distance}m van campus
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                      🏠 Je bent niet op school
                    </span>
                    {campusCheck.nearestCampus && (
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">
                        Dichtstbijzijnde: {campusCheck.nearestCampus.name}
                      </span>
                    )}
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {campusCheck.distance > 1000
                        ? `${(campusCheck.distance / 1000).toFixed(1)} km`
                        : `${campusCheck.distance} m`}{' '}
                      van dichtstbijzijnde campus
                    </span>
                  </div>
                )}
              </div>
            )}

            {location.latitude && location.longitude && (
              <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 break-all">
                  Jouw locatie: {location.latitude.toFixed(6)},{' '}
                  {location.longitude.toFixed(6)}
                </span>
                {campusCheck?.nearestCampus && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 block mt-1 break-all">
                    Campus: {campusCheck.nearestCampus.latitude.toFixed(6)},{' '}
                    {campusCheck.nearestCampus.longitude.toFixed(6)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

