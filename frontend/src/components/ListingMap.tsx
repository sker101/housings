/**
 * ListingMap.tsx — iRent
 * Single-listing detail map using Mapbox GL (replaces Leaflet).
 * Shows one green pin with a popup. Used in RoomDetailsPage.
 */
import { useEffect, useMemo, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

function formatPrice(value: any) {
  return new Intl.NumberFormat('sw-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

interface Listing {
  id: string;
  title: string;
  lat?: any;
  lng?: any;
  priceMonthly?: any;
  [key: string]: any;
}

interface ListingMapProps {
  listings: Listing[];
  onMarkerSelect?: (_listing: Listing) => void;
}

export default function ListingMap({ listings, onMarkerSelect }: ListingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const validPoints = useMemo(
    () =>
      listings.filter(
        (l) => Number.isFinite(Number(l.lat)) && Number.isFinite(Number(l.lng))
      ),
    [listings]
  );

  // Wire global popup click handler
  useEffect(() => {
    if (!onMarkerSelect) return;
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      const listing = listings.find((l) => l.id === id);
      if (listing) onMarkerSelect(listing);
    };
    window.addEventListener('irent:map-marker-click', handler);
    return () => window.removeEventListener('irent:map-marker-click', handler);
  }, [listings, onMarkerSelect]);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current || validPoints.length === 0) return;

    const first = validPoints[0];
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [Number(first.lng), Number(first.lat)],
      zoom: validPoints.length === 1 ? 15 : 13,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('load', () => {
      // Place markers after map is ready
      validPoints.forEach((listing) => {
        const lat = Number(listing.lat);
        const lng = Number(listing.lng);

        // Custom pin element
        const el = document.createElement('div');
        el.style.cssText = `
          width:36px;height:36px;cursor:pointer;
          display:flex;align-items:center;justify-content:center;
          filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          transition:transform 0.15s ease;
        `;
        el.innerHTML = `
          <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
            <circle cx="18" cy="16" r="14" fill="#22c55e" stroke="white" stroke-width="2.5"/>
            <path d="M18 34 L12 22 Q18 28 24 22 Z" fill="#22c55e"/>
            <text x="18" y="21" text-anchor="middle" fill="white" font-size="13" font-weight="bold" font-family="Inter,sans-serif">✓</text>
          </svg>
        `;
        el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.2)'; });
        el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

        const popup = new mapboxgl.Popup({ offset: 25, closeButton: false, maxWidth: '220px' })
          .setHTML(`
            <div style="font-family:'Inter',sans-serif;padding:4px 0">
              <strong style="font-size:13px;color:#1e293b">${listing.title || 'Listing'}</strong>
              <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#22c55e">
                ${formatPrice(listing.priceMonthly)}<span style="font-weight:400;font-size:11px;color:#94a3b8">/mo</span>
              </p>
              <button
                onclick="window.dispatchEvent(new CustomEvent('irent:map-marker-click',{detail:'${listing.id}'}))"
                style="margin-top:8px;padding:6px 14px;background:#22c55e;color:white;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;width:100%"
              >View Room</button>
            </div>
          `);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });

      // Fit all markers if >1
      if (validPoints.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        validPoints.forEach((l) => bounds.extend([Number(l.lng), Number(l.lat)]));
        map.fitBounds(bounds, { padding: 48, maxZoom: 16 });
      }
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [validPoints]);

  if (validPoints.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 240, background: '#f7f7f7', borderRadius: 16,
        border: '1px solid var(--border)',
      }}>
        <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--mid)' }}>
          📍 No location coordinates available for this listing yet.
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div ref={containerRef} className="listing-map-container" style={{ width: '100%' }} />
    </div>
  );
}

