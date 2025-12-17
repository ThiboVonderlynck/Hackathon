// Script om exacte GPS coördinaten op te halen voor Howest campussen
// Gebruikt OpenStreetMap Nominatim API (gratis, geen API key nodig)

const campuses = [
  { name: 'Campus Kortrijk Weide – Algemene Diensten', address: 'Marksesteenweg 58', postalCode: '8500', city: 'Kortrijk' },
  { name: 'Campus Kortrijk Weide – The Level', address: 'Botenkopersstraat 2', postalCode: '8500', city: 'Kortrijk' },
  { name: 'Campus Kortrijk Weide – Industrial Design Center (IDC)', address: 'Marksesteenweg 58', postalCode: '8500', city: 'Kortrijk' },
  { name: 'Campus Kortrijk Weide – The Penta', address: 'Sint-Martens-Latemlaan 1B', postalCode: '8500', city: 'Kortrijk' },
  { name: 'Campus Kortrijk Weide – The Core', address: 'Sint-Martens-Latemlaan 2B', postalCode: '8500', city: 'Kortrijk' },
  { name: 'UGent Campus Kortrijk', address: 'Sint-Martens-Latemlaan 2B', postalCode: '8500', city: 'Kortrijk' },
  { name: 'Campus Kortrijk Buda', address: 'Dam 2A', postalCode: '8500', city: 'Kortrijk' },
  { name: 'Campus Kortrijk The Square', address: 'Luipaardstraat 12a', postalCode: '8500', city: 'Kortrijk' },
];

async function geocodeAddress(address, postalCode, city) {
  const query = `${address}, ${postalCode} ${city}, Belgium`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Howest Campus Locator'
      }
    });
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error(`Error geocoding ${address}:`, error);
    return null;
  }
}

async function fetchAllCoordinates() {
  console.log('Fetching coordinates for all campuses...\n');
  
  for (const campus of campuses) {
    console.log(`Fetching: ${campus.name}`);
    console.log(`Address: ${campus.address}, ${campus.postalCode} ${campus.city}`);
    
    const coords = await geocodeAddress(campus.address, campus.postalCode, campus.city);
    
    if (coords) {
      console.log(`Coordinates: ${coords.lat}, ${coords.lon}\n`);
    } else {
      console.log('Coordinates not found\n');
    }
    
    // Rate limiting: wait 1 second between requests (Nominatim requirement)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

fetchAllCoordinates();

