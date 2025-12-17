export interface Campus {
  id: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  latitude: number;
  longitude: number;
  radius: number; // radius in meters - binnen deze afstand ben je "op school"
}

export const howestCampuses: Campus[] = [
  {
    id: 'kortrijk-weide-algemene-diensten',
    name: 'Campus Kortrijk Weide – Algemene Diensten',
    address: 'Marksesteenweg 58',
    postalCode: '8500',
    city: 'Kortrijk',
    latitude: 50.8219128, // Exacte coördinaten via OpenStreetMap
    longitude: 3.2505731,
    radius: 200, // 200 meter radius
  },
  {
    id: 'kortrijk-weide-the-level',
    name: 'Campus Kortrijk Weide – The Level',
    address: 'Botenkopersstraat 2',
    postalCode: '8500',
    city: 'Kortrijk',
    latitude: 50.8274911, // Exacte coördinaten via OpenStreetMap
    longitude: 3.2546115,
    radius: 200,
  },
  {
    id: 'kortrijk-weide-idc',
    name: 'Campus Kortrijk Weide – Industrial Design Center (IDC)',
    address: 'Marksesteenweg 58',
    postalCode: '8500',
    city: 'Kortrijk',
    latitude: 50.8219128, // Zelfde als Algemene Diensten (zelfde adres)
    longitude: 3.2505731,
    radius: 200,
  },
  {
    id: 'kortrijk-weide-the-penta',
    name: 'Campus Kortrijk Weide – The Penta',
    address: 'Sint-Martens-Latemlaan 1B',
    postalCode: '8500',
    city: 'Kortrijk',
    latitude: 50.8240808, // Exacte coördinaten via OpenStreetMap
    longitude: 3.2513689,
    radius: 200,
  },
  {
    id: 'kortrijk-weide-the-core',
    name: 'Campus Kortrijk Weide – The Core',
    address: 'Sint-Martens-Latemlaan 2B',
    postalCode: '8500',
    city: 'Kortrijk',
    latitude: 50.8243776, // Exacte coördinaten via OpenStreetMap
    longitude: 3.2500602,
    radius: 200,
  },
  {
    id: 'ugent-campus-kortrijk',
    name: 'UGent Campus Kortrijk',
    address: 'Sint-Martens-Latemlaan 2B',
    postalCode: '8500',
    city: 'Kortrijk',
    latitude: 50.8243776, // Zelfde als The Core (zelfde adres)
    longitude: 3.2500602,
    radius: 200,
  },
  {
    id: 'kortrijk-buda',
    name: 'Campus Kortrijk Buda',
    address: 'Dam 2A',
    postalCode: '8500',
    city: 'Kortrijk',
    latitude: 50.8313827, // Exacte coördinaten via OpenStreetMap
    longitude: 3.2631356,
    radius: 200,
  },
  {
    id: 'kortrijk-the-square',
    name: 'Campus Kortrijk The Square',
    address: 'Luipaardstraat 12a',
    postalCode: '8500',
    city: 'Kortrijk',
    latitude: 50.8243668, // Exacte coördinaten via OpenStreetMap
    longitude: 3.3047714,
    radius: 200,
  },
];

/**
 * Bereken de afstand tussen twee GPS coördinaten in meters
 * Gebruikt de Haversine formule
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Aardstraal in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if a location falls within a campus radius
 * Always returns the nearest campus, even if you're within multiple radii
 */
export function isOnCampus(
  userLat: number,
  userLon: number,
  campuses: Campus[] = howestCampuses
): { isOnCampus: boolean; nearestCampus: Campus | null; distance: number } {
  let nearestCampus: Campus | null = null;
  let minDistance = Infinity;
  let isOnAnyCampus = false;

  // Eerst alle campussen checken om de dichtstbijzijnde te vinden
  for (const campus of campuses) {
    const distance = calculateDistance(
      userLat,
      userLon,
      campus.latitude,
      campus.longitude
    );

    // Houd bij welke campus het dichtstbij is
    if (distance < minDistance) {
      minDistance = distance;
      nearestCampus = campus;
    }

    // Check of we binnen de radius van deze campus zijn
    if (distance <= campus.radius) {
      isOnAnyCampus = true;
    }
  }

  // Return de dichtstbijzijnde campus, niet de eerste die binnen radius valt
  return {
    isOnCampus: isOnAnyCampus,
    nearestCampus,
    distance: Math.round(minDistance),
  };
}

