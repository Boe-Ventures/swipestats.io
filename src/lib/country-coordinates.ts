// Country name to coordinates mapping
// Coordinates are approximate country centers or major cities
const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Major countries
  "United States": { lat: 39.8283, lng: -98.5795 },
  USA: { lat: 39.8283, lng: -98.5795 },
  US: { lat: 39.8283, lng: -98.5795 },
  "United Kingdom": { lat: 55.3781, lng: -3.436 },
  UK: { lat: 55.3781, lng: -3.436 },
  Canada: { lat: 56.1304, lng: -106.3468 },
  Australia: { lat: -25.2744, lng: 133.7751 },
  Germany: { lat: 51.1657, lng: 10.4515 },
  France: { lat: 46.2276, lng: 2.2137 },
  Italy: { lat: 41.8719, lng: 12.5674 },
  Spain: { lat: 40.4637, lng: -3.7492 },
  Netherlands: { lat: 52.1326, lng: 5.2913 },
  Belgium: { lat: 50.5039, lng: 4.4699 },
  Switzerland: { lat: 46.8182, lng: 8.2275 },
  Austria: { lat: 47.5162, lng: 14.5501 },
  Sweden: { lat: 60.1282, lng: 18.6435 },
  Norway: { lat: 60.472, lng: 8.4689 },
  Denmark: { lat: 56.2639, lng: 9.5018 },
  Finland: { lat: 61.9241, lng: 25.7482 },
  Poland: { lat: 51.9194, lng: 19.1451 },
  Portugal: { lat: 39.3999, lng: -8.2245 },
  Greece: { lat: 39.0742, lng: 21.8243 },
  Ireland: { lat: 53.4129, lng: -8.2439 },
  "Czech Republic": { lat: 49.8175, lng: 15.473 },
  Romania: { lat: 45.9432, lng: 24.9668 },
  Hungary: { lat: 47.1625, lng: 19.5033 },
  Croatia: { lat: 45.1, lng: 15.2 },
  Bulgaria: { lat: 42.7339, lng: 25.4858 },
  Slovakia: { lat: 48.669, lng: 19.699 },
  Slovenia: { lat: 46.1512, lng: 14.9955 },
  Estonia: { lat: 58.5953, lng: 25.0136 },
  Latvia: { lat: 56.8796, lng: 24.6032 },
  Lithuania: { lat: 55.1694, lng: 23.8813 },
  Luxembourg: { lat: 49.8153, lng: 6.1296 },
  Malta: { lat: 35.9375, lng: 14.3754 },
  Cyprus: { lat: 35.1264, lng: 33.4299 },
  Iceland: { lat: 64.9631, lng: -19.0208 },
  Russia: { lat: 61.524, lng: 105.3188 },
  Ukraine: { lat: 48.3794, lng: 31.1656 },
  Belarus: { lat: 53.7098, lng: 27.9534 },
  Moldova: { lat: 47.4116, lng: 28.3699 },
  Serbia: { lat: 44.0165, lng: 21.0059 },
  "Bosnia and Herzegovina": { lat: 43.9159, lng: 17.6791 },
  "North Macedonia": { lat: 41.6086, lng: 21.7453 },
  Albania: { lat: 41.1533, lng: 20.1683 },
  Montenegro: { lat: 42.7087, lng: 19.3744 },
  Kosovo: { lat: 42.6026, lng: 20.903 },
  Turkey: { lat: 38.9637, lng: 35.2433 },
  Israel: { lat: 31.0461, lng: 34.8516 },
  "United Arab Emirates": { lat: 23.4241, lng: 53.8478 },
  UAE: { lat: 23.4241, lng: 53.8478 },
  "Saudi Arabia": { lat: 23.8859, lng: 45.0792 },
  Qatar: { lat: 25.3548, lng: 51.1839 },
  Kuwait: { lat: 29.3117, lng: 47.4818 },
  Bahrain: { lat: 26.0667, lng: 50.5577 },
  Oman: { lat: 21.4735, lng: 55.9754 },
  Jordan: { lat: 30.5852, lng: 36.2384 },
  Lebanon: { lat: 33.8547, lng: 35.8623 },
  Egypt: { lat: 26.0975, lng: 30.0444 },
  Morocco: { lat: 31.7917, lng: -7.0926 },
  Tunisia: { lat: 33.8869, lng: 9.5375 },
  Algeria: { lat: 28.0339, lng: 1.6596 },
  "South Africa": { lat: -30.5595, lng: 22.9375 },
  Nigeria: { lat: 9.082, lng: 8.6753 },
  Kenya: { lat: -0.0236, lng: 37.9062 },
  Ghana: { lat: 7.9465, lng: -1.0232 },
  Ethiopia: { lat: 9.145, lng: 38.7667 },
  Tanzania: { lat: -6.369, lng: 34.8888 },
  Uganda: { lat: 1.3733, lng: 32.2903 },
  India: { lat: 20.5937, lng: 78.9629 },
  China: { lat: 35.8617, lng: 104.1954 },
  Japan: { lat: 36.2048, lng: 138.2529 },
  "South Korea": { lat: 35.9078, lng: 127.7669 },
  Singapore: { lat: 1.3521, lng: 103.8198 },
  Malaysia: { lat: 4.2105, lng: 101.9758 },
  Thailand: { lat: 15.87, lng: 100.9925 },
  Indonesia: { lat: -0.7893, lng: 113.9213 },
  Philippines: { lat: 12.8797, lng: 121.774 },
  Vietnam: { lat: 14.0583, lng: 108.2772 },
  Taiwan: { lat: 23.6978, lng: 120.9605 },
  "Hong Kong": { lat: 22.3193, lng: 114.1694 },
  "New Zealand": { lat: -40.9006, lng: 174.886 },
  Brazil: { lat: -14.235, lng: -51.9253 },
  Mexico: { lat: 23.6345, lng: -102.5528 },
  Argentina: { lat: -38.4161, lng: -63.6167 },
  Chile: { lat: -35.6751, lng: -71.543 },
  Colombia: { lat: 4.5709, lng: -74.2973 },
  Peru: { lat: -9.19, lng: -75.0152 },
  Venezuela: { lat: 6.4238, lng: -66.5897 },
  Ecuador: { lat: -1.8312, lng: -78.1834 },
  Uruguay: { lat: -32.5228, lng: -55.7658 },
  Paraguay: { lat: -23.4425, lng: -58.4438 },
  Bolivia: { lat: -16.2902, lng: -63.5887 },
  "Costa Rica": { lat: 9.7489, lng: -83.7534 },
  Panama: { lat: 8.538, lng: -80.7821 },
  Guatemala: { lat: 15.7835, lng: -90.2308 },
  Honduras: { lat: 15.2, lng: -86.2419 },
  "El Salvador": { lat: 13.7942, lng: -88.8965 },
  Nicaragua: { lat: 12.265, lng: -85.2072 },
  Cuba: { lat: 21.5218, lng: -77.7812 },
  "Dominican Republic": { lat: 18.7357, lng: -70.1627 },
  Jamaica: { lat: 18.1096, lng: -77.2975 },
  "Trinidad and Tobago": { lat: 10.6918, lng: -61.2225 },
  "Puerto Rico": { lat: 18.2208, lng: -66.5901 },
};

// Normalize country name for matching
function normalizeCountryName(country: string): string {
  return country
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

// Get coordinates for a country with fuzzy matching
export function getCountryCoordinates(
  country: string | null | undefined,
): { lat: number; lng: number } | null {
  if (!country) return null;

  const normalized = normalizeCountryName(country);

  // Direct match
  if (COUNTRY_COORDINATES[country]) {
    return COUNTRY_COORDINATES[country];
  }

  // Try normalized match
  for (const [key, coords] of Object.entries(COUNTRY_COORDINATES)) {
    if (normalizeCountryName(key) === normalized) {
      return coords;
    }
  }

  // Try partial match
  for (const [key, coords] of Object.entries(COUNTRY_COORDINATES)) {
    const normalizedKey = normalizeCountryName(key);
    if (
      normalizedKey.includes(normalized) ||
      normalized.includes(normalizedKey)
    ) {
      return coords;
    }
  }

  return null;
}

// Add jitter to coordinates to spread markers from same country
export function addJitter(
  coords: { lat: number; lng: number },
  index: number,
  maxJitter = 0.5,
): { lat: number; lng: number } {
  // Use index to create deterministic jitter
  const seed = index * 137.508; // Golden angle for better distribution
  const angle = (seed % 360) * (Math.PI / 180);
  const distance = ((seed % 100) / 100) * maxJitter;

  return {
    lat: coords.lat + Math.cos(angle) * distance,
    lng: coords.lng + Math.sin(angle) * distance,
  };
}
