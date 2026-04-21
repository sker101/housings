/**
 * useMapboxGeocoding.ts
 * iRent — Mapbox Geocoding & Reverse Geocoding utilities.
 *
 * Provides:
 *  - wardFromCoords(lng, lat) → reverse-geocode a pin to get ward/district
 *  - geocodeWard(wardName)    → forward-geocode to get bbox/centre
 *  - suggestAddresses(query)  → address autofill suggestions
 */

import { useCallback, useState } from 'react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const GEOCODE_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

/** Dar es Salaam approximate bounding box for proximity bias */
const DAR_PROXIMITY = '39.2766,-6.8235';

export interface ReverseGeocodeResult {
  ward: string | null;
  district: string | null;
  neighbourhood: string | null;
  city: string;
  formatted: string;
}

export interface AddressSuggestion {
  id: string;
  place_name: string;
  ward: string | null;
  district: string | null;
  centre: [number, number];
}

/** 
 * Reverse geocodes a coordinate to extract ward, district, neighbourhood.
 * Uses Mapbox Places API (locality → ward, district → district).
 */
export async function wardFromCoords(lng: number, lat: number): Promise<ReverseGeocodeResult> {
  const url = `${GEOCODE_BASE}/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=neighborhood,locality,district,place&language=en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding failed');
  const data = await res.json();

  let ward: string | null = null;
  let district: string | null = null;
  let neighbourhood: string | null = null;
  let city = 'Dar es Salaam';
  let formatted = '';

  for (const feature of data.features ?? []) {
    const type = feature.place_type?.[0];
    if (type === 'neighborhood' && !neighbourhood) neighbourhood = feature.text;
    if (type === 'locality'     && !ward)          ward          = feature.text;
    if (type === 'district'     && !district)      district      = feature.text;
    if (type === 'place'        && !city)          city          = feature.text;
    if (!formatted)                                formatted     = feature.place_name;
  }

  return { ward, district, neighbourhood, city, formatted };
}

/**
 * Forward-geocodes a ward name to get a centre coordinate.
 * Returns null if the ward cannot be found.
 */
export async function geocodeWard(wardName: string): Promise<{ centre: [number, number]; bbox?: number[] } | null> {
  const query = encodeURIComponent(`${wardName}, Dar es Salaam, Tanzania`);
  const url   = `${GEOCODE_BASE}/${query}.json?access_token=${MAPBOX_TOKEN}&types=locality,neighborhood,district&proximity=${DAR_PROXIMITY}&country=TZ`;
  const res   = await fetch(url);
  if (!res.ok) return null;
  const data  = await res.json();
  const top   = data.features?.[0];
  if (!top) return null;
  return {
    centre: top.center as [number, number],
    bbox:   top.bbox,
  };
}

/**
 * Autofill suggestions for address inputs.
 * Returns a ranked list filtered to Tanzania.
 */
export async function suggestAddresses(query: string): Promise<AddressSuggestion[]> {
  if (query.length < 3) return [];
  const q   = encodeURIComponent(query);
  const url = `${GEOCODE_BASE}/${q}.json?access_token=${MAPBOX_TOKEN}&proximity=${DAR_PROXIMITY}&country=TZ&types=address,poi,neighborhood,locality&limit=6&language=en`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();

  return (data.features ?? []).map((f: any) => {
    // Extract ward from context
    let ward: string | null = null;
    let district: string | null = null;
    for (const ctx of f.context ?? []) {
      if (ctx.id?.startsWith('locality.'))  ward     = ctx.text;
      if (ctx.id?.startsWith('district.'))  district = ctx.text;
    }
    return {
      id:         f.id,
      place_name: f.place_name,
      ward,
      district,
      centre:     f.center as [number, number],
    };
  });
}

/** Hook: address autofill with debounce */
export function useAddressAutofill(debounceMs = 300) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading]         = useState(false);
  const [timer, setTimer]             = useState<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((query: string) => {
    if (timer) clearTimeout(timer);
    if (!query || query.length < 3) { setSuggestions([]); return; }

    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await suggestAddresses(query);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    setTimer(t);
  }, [timer, debounceMs]);

  const clear = useCallback(() => {
    if (timer) clearTimeout(timer);
    setSuggestions([]);
  }, [timer]);

  return { suggestions, loading, search, clear };
}
