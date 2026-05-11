/**
 * Stable coordinate helpers — shared across all map-enabled pages.
 * Lives here so WARD_COORDS is a module-level singleton (not re-created
 * inside any component on every render, which causes marker flicker).
 */

/** Ward name → [lng, lat] centre point */
export const WARD_COORDS: Record<string, [number, number]> = {
  msasani:        [39.2713, -6.7575],
  masaki:         [39.2698, -6.7608],
  upanga:         [39.2850, -6.8097],
  kariakoo:       [39.2726, -6.8162],
  ilala:          [39.2710, -6.8235],
  kinondoni:      [39.2570, -6.7808],
  temeke:         [39.3140, -6.8727],
  mikocheni:      [39.2680, -6.7720],
  mbezi:          [39.1950, -6.7300],
  kijitonyama:    [39.2530, -6.7890],
  sinza:          [39.2290, -6.8050],
  mwananyamala:   [39.2390, -6.8030],
  manzese:        [39.2150, -6.8200],
  tandale:        [39.2440, -6.7900],
  magomeni:       [39.2610, -6.8000],
  jangwani:       [39.2780, -6.8100],
  kivukoni:       [39.2922, -6.8183],
  gerezani:       [39.2905, -6.8172],
  kisutu:         [39.2873, -6.8206],
  posta:          [39.2891, -6.8193],
  buguruni:       [39.2430, -6.8410],
  vingunguti:     [39.2330, -6.8580],
  changombe:      [39.2720, -6.8650],
  mtoni:          [39.2990, -6.8850],
  mbagala:        [39.3060, -6.9060],
  changanyikeni:  [39.2520, -6.8450],
  mwenge:         [39.2600, -6.7830],
  moroco:         [39.2580, -6.7950],
  tabata:         [39.2450, -6.8500],
  dar_es_salaam:  [39.2766, -6.8235],
};

/**
 * Deterministic sub-ward jitter from listing UUID so that listings in
 * the same ward don't all stack on one point.
 * Offset is ±0.0025° ≈ ±275m — stays inside the ward.
 */
export function stableJitter(id: string): { dlat: number; dlng: number } {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = (h >>> 0) / 0xffffffff;
  const v = ((h >> 8) >>> 0) / 0xffffffff;
  return {
    dlat: (u - 0.5) * 0.005,
    dlng: (v - 0.5) * 0.005,
  };
}

/**
 * Returns { lat, lng } for a listing:
 *  1. Exact GPS from DB (lat/lng columns)
 *  2. Ward/district centre + stable jitter
 *  3. null if we have no location hint at all
 */
export function getApproxCoords(listing: any): { lat: number; lng: number } | null {
  if (listing.lat && listing.lng) {
    return { lat: Number(listing.lat), lng: Number(listing.lng) };
  }
  const ward = (listing.ward || listing.district || listing.location || '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  let base = WARD_COORDS[ward];
  if (!base) {
    const key = Object.keys(WARD_COORDS).find(k => ward.includes(k) || k.includes(ward));
    if (key) base = WARD_COORDS[key];
  }
  if (!base) return null;
  const { dlat, dlng } = stableJitter(listing.id || ward);
  return { lat: base[1] + dlat, lng: base[0] + dlng };
}

/**
 * Convert any listing object into a MapboxListingMap `room` prop entry.
 * Returns null if no coordinates can be resolved.
 */
export function listingToMapRoom(listing: any): {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  price_tzs: number;
  availability_status: string;
  ward: string;
} | null {
  const coords = getApproxCoords(listing);
  if (!coords) return null;
  return {
    id: listing.id,
    latitude: coords.lat,
    longitude: coords.lng,
    title: listing.title || '',
    price_tzs: Number(listing.priceMonthly || listing.price_monthly || 0),
    availability_status: listing.vacancyStatus || listing.vacancy_status || 'available',
    ward: listing.ward || listing.district || listing.location || '',
  };
}
