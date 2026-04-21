/**
 * MapboxListingMap.tsx
 * iRent — Mapbox GL map component for listing search.
 * - Green markers for Available rooms
 * - Amber markers for Coming Soon (listed_occupied / available_soon)
 * - Ward-level polygon zoom when user searches by ward name
 * - Occupancy-aware: 'occupied' rooms never appear on map
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

export interface MapRoom {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  price_tzs: number;
  availability_status: 'available' | 'available_soon' | 'listed_occupied' | 'pre_booked';
  ward?: string;
}

interface MapboxListingMapProps {
  rooms: MapRoom[];
  searchWard?: string;
  height?: string;
  onRoomClick?: (_roomId: string) => void;
  onBoundsChange?: (_bounds: { north: number; south: number; east: number; west: number }) => void;
}

/** Dar es Salaam ward → approximate [lng, lat] centre + zoom level */
const WARD_CENTRES: Record<string, { centre: [number, number]; zoom: number }> = {
  msasani:       { centre: [39.2713, -6.7575], zoom: 14.5 },
  masaki:        { centre: [39.2698, -6.7608], zoom: 15 },
  upanga:        { centre: [39.2850, -6.8097], zoom: 14.5 },
  kariakoo:      { centre: [39.2726, -6.8162], zoom: 14.5 },
  ilala:         { centre: [39.2710, -6.8235], zoom: 14 },
  kinondoni:     { centre: [39.2570, -6.7808], zoom: 13.5 },
  temeke:        { centre: [39.3140, -6.8727], zoom: 13.5 },
  mikocheni:     { centre: [39.2680, -6.7720], zoom: 14.5 },
  mbezi:         { centre: [39.1950, -6.7300], zoom: 13.5 },
  kijitonyama:   { centre: [39.2530, -6.7890], zoom: 14.5 },
  sinza:         { centre: [39.2290, -6.8050], zoom: 14.5 },
  mwananyamala:  { centre: [39.2390, -6.8030], zoom: 14 },
  manzese:       { centre: [39.2150, -6.8200], zoom: 14 },
  tandale:       { centre: [39.2440, -6.7900], zoom: 14.5 },
  magomeni:      { centre: [39.2610, -6.8000], zoom: 14.5 },
  jangwani:      { centre: [39.2780, -6.8100], zoom: 14.5 },
  kivukoni:      { centre: [39.2922, -6.8183], zoom: 15 },
  gerezani:      { centre: [39.2905, -6.8172], zoom: 15 },
  kisutu:        { centre: [39.2873, -6.8206], zoom: 15 },
  posta:         { centre: [39.2891, -6.8193], zoom: 15 },
  buguruni:      { centre: [39.2430, -6.8410], zoom: 14.5 },
  vingunguti:    { centre: [39.2330, -6.8580], zoom: 14 },
  changombe:     { centre: [39.2720, -6.8650], zoom: 14.5 },
  mtoni:         { centre: [39.2990, -6.8850], zoom: 14.5 },
  mbagala:       { centre: [39.3060, -6.9060], zoom: 13.5 },
};

const DAR_ES_SALAAM_CENTRE: [number, number] = [39.2766, -6.8235];

function markerColour(status: MapRoom['availability_status']): string {
  if (status === 'available') return '#22c55e';       // Green
  if (status === 'available_soon')   return '#f59e0b'; // Amber
  if (status === 'listed_occupied')  return '#f59e0b'; // Amber
  if (status === 'pre_booked')       return '#6366f1'; // Purple
  return '#94a3b8';
}

function formatTZS(amount: number): string {
  return new Intl.NumberFormat('sw-TZ', {
    style: 'currency', currency: 'TZS', maximumFractionDigits: 0
  }).format(amount);
}

function comingSoonBadge(status: MapRoom['availability_status']): string {
  return (status === 'available_soon' || status === 'listed_occupied')
    ? '<span style="background:#f59e0b;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;margin-left:6px">Coming Soon</span>'
    : '';
}

export default function MapboxListingMap({
  rooms,
  searchWard,
  height = '420px',
  onRoomClick,
  onBoundsChange,
}: MapboxListingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<mapboxgl.Map | null>(null);
  const markersRef   = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // === Init map ===
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: DAR_ES_SALAAM_CENTRE,
      zoom: 12,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('load', () => setMapLoaded(true));

    // Fire bounds on every move so parent can filter listings to viewport
    const fireBounds = () => {
      if (!onBoundsChange) return;
      const b = map.getBounds();
      if (!b) return;
      onBoundsChange({
        north: b.getNorth(),
        south: b.getSouth(),
        east:  b.getEast(),
        west:  b.getWest(),
      });
    };
    map.on('moveend', fireBounds);
    map.on('zoomend', fireBounds);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // === Ward zoom ===
  useEffect(() => {
    if (!mapRef.current || !searchWard) return;
    const key = searchWard.toLowerCase().replace(/\s+/g, '');
    const wardData = WARD_CENTRES[key];
    if (wardData) {
      mapRef.current.flyTo({
        center: wardData.centre,
        zoom: wardData.zoom,
        duration: 1200,
        essential: true,
      });
    }
  }, [searchWard, mapLoaded]);

  // === Place markers ===
  const placeMarkers = useCallback(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    rooms.forEach(room => {
      if (!room.latitude || !room.longitude) return;

      const colour = markerColour(room.availability_status);

      // Custom SVG pin
      const el = document.createElement('div');
      el.style.cssText = `
        width: 36px; height: 36px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        transition: transform 0.15s ease;
      `;
      el.innerHTML = `
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="18" cy="16" r="14" fill="${colour}" stroke="white" stroke-width="2.5"/>
          <path d="M18 34 L12 22 Q18 28 24 22 Z" fill="${colour}"/>
          <text x="18" y="21" text-anchor="middle" fill="white" font-size="12" font-weight="bold" font-family="Inter,sans-serif">
            ${room.availability_status === 'available' ? '✓' : '⏳'}
          </text>
        </svg>
      `;

      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.2)'; });
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false, maxWidth: '240px' })
        .setHTML(`
          <div style="font-family:'Inter',sans-serif;padding:4px 0">
            <strong style="font-size:13px;color:#1e293b">${room.title}${comingSoonBadge(room.availability_status)}</strong>
            <p style="margin:4px 0 0;font-size:12px;color:#64748b">${room.ward ? `📍 ${room.ward}` : ''}</p>
            <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#22c55e">${formatTZS(room.price_tzs)}<span style="font-weight:400;font-size:11px;color:#94a3b8">/mo</span></p>
            <button onclick="window.dispatchEvent(new CustomEvent('irent:room-click',{detail:'${room.id}'})))"
              style="margin-top:8px;padding:6px 14px;background:#22c55e;color:white;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;width:100%">
              View Room
            </button>
          </div>
        `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([room.longitude, room.latitude])
        .setPopup(popup)
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    });
  }, [rooms, mapLoaded]);

  useEffect(() => { placeMarkers(); }, [placeMarkers]);

  // === Delegate click events from popup buttons ===
  useEffect(() => {
    if (!onRoomClick) return;
    const handler = (e: Event) => {
      const roomId = (e as CustomEvent<string>).detail;
      if (roomId) onRoomClick(roomId);
    };
    window.addEventListener('irent:room-click', handler);
    return () => window.removeEventListener('irent:room-click', handler);
  }, [onRoomClick]);

  return (
    <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', height }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 40, left: 12,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
        borderRadius: '10px', padding: '8px 12px', fontSize: '11px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column', gap: 4
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          Available
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
          Coming Soon
        </span>
      </div>
    </div>
  );
}
