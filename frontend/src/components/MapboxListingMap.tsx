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
  const [mapStyle, setMapStyle] = useState<'light' | 'satellite'>('satellite');

  // === Init map ===
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: mapStyle === 'light' ? 'mapbox://styles/mapbox/light-v11' : 'mapbox://styles/mapbox/satellite-v9',
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

  // Update style when mapStyle state changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const styles: Record<string, string> = {
      light: 'mapbox://styles/mapbox/light-v11',
      satellite: 'mapbox://styles/mapbox/satellite-v9',
      streets: 'mapbox://styles/mapbox/streets-v12'
    };
    mapRef.current.setStyle(styles[mapStyle] || styles.satellite);
  }, [mapStyle, mapLoaded]);

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

      const iconSvg = room.availability_status === 'available'
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

      // Custom SVG pin
      const el = document.createElement('div');
      el.style.cssText = `
        width: 40px; height: 40px; cursor: pointer;
        position: relative;
        display: flex; align-items: flex-start; justify-content: center;
        padding-top: 8px;
        transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      `;
      el.innerHTML = `
        <svg style="position: absolute; top: 0; left: 0; z-index: -1;" width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" filter="drop-shadow(0px 3px 4px rgba(0,0,0,0.3))">
          <path d="M20 38 C20 38 6 24 6 15 C6 7.26801 12.268 1 20 1 C27.732 1 34 7.26801 34 15 C34 24 20 38 20 38 Z" fill="${colour}" stroke="white" stroke-width="2"/>
        </svg>
        ${iconSvg}
      `;

      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.2)'; });
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

      const popup = new mapboxgl.Popup({ offset: [0, -36], closeButton: false, maxWidth: '240px' })
        .setHTML(`
          <div style="font-family:'Inter',sans-serif;padding:4px 0">
            <strong style="font-size:13px;color:#1e293b">${room.title}${comingSoonBadge(room.availability_status)}</strong>
            <p style="margin:4px 0 0;font-size:12px;color:#64748b">${room.ward ? `📍 ${room.ward}` : ''}</p>
            <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#22c55e">${formatTZS(room.price_tzs)}<span style="font-weight:400;font-size:11px;color:#94a3b8">/mo</span></p>
            <button onclick="window.dispatchEvent(new CustomEvent('irent:room-click',{detail:'${room.id}'}))"
              style="margin-top:8px;padding:6px 14px;background:#22c55e;color:white;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;width:100%">
              View Room
            </button>
          </div>
        `);

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
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

  // Cycle through styles
  const toggleStyle = () => {
    const sequence: ('satellite' | 'streets' | 'light')[] = ['satellite', 'streets', 'light'];
    const currentIndex = sequence.indexOf(mapStyle);
    const nextIndex = (currentIndex + 1) % sequence.length;
    setMapStyle(sequence[nextIndex]);
  };

  const getStyleLabel = () => {
    if (mapStyle === 'satellite') return '🛰️ Satellite';
    if (mapStyle === 'streets') return '🛣️ Streets';
    return '⚪ Light';
  };

  return (
    <div style={{ position: 'relative', height, width: '100%' }}>
      {/* Magic Toggle Button */}
      <button
        onClick={toggleStyle}
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 5,
          padding: '8px 16px',
          background: 'rgba(255, 255, 255, 0.95)',
          color: '#1A1A2E',
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: '700',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = '#fff'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)'; }}
      >
        <MapIcon size={18} />
        {getStyleLabel()}
      </button>

      <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: '12px' }} />

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

      {/* Style Toggle */}
      <div style={{
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: 10
      }}>
        <button
          onClick={() => setMapStyle(prev => prev === 'light' ? 'satellite' : 'light')}
          style={{
            background: 'white',
            border: 'none',
            borderRadius: '10px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#1e293b',
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f8fafc';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          {mapStyle === 'light' ? 'Satellite View' : 'Map View'}
        </button>
      </div>
    </div>
  );
}
