import { useEffect, useMemo, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import * as LOriginal from 'leaflet';

// Fix Leaflet's default icon paths when bundled by Vite (must run once)
let iconFixed = false;
function ensureIconsFixed() {
  if (iconFixed) return;
  iconFixed = true;
  // @ts-ignore
  delete LOriginal.Icon.Default.prototype._getIconUrl;
  LOriginal.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

const L = LOriginal;

function formatPrice(value: any) {
  return `${new Intl.NumberFormat('en-TZ').format(Number(value || 0))} TZS`;
}

function escapeHtml(value: any) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizePoints(points: any[]) {
  const lats = points.map((item) => Number(item.lat));
  const lngs = points.map((item) => Number(item.lng));
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  return points.map((item) => {
    const lat = Number(item.lat);
    const lng = Number(item.lng);
    const x = maxLng === minLng ? 50 : ((lng - minLng) / (maxLng - minLng)) * 100;
    const y = maxLat === minLat ? 50 : (1 - (lat - minLat) / (maxLat - minLat)) * 100;
    return {
      ...item,
      normalizedX: Math.max(6, Math.min(94, x)),
      normalizedY: Math.max(8, Math.min(92, y)),
    };
  });
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
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerLayerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const validPoints = useMemo(
    () => listings.filter(
      (listing) => Number.isFinite(Number(listing.lat)) && Number.isFinite(Number(listing.lng))
    ),
    [listings]
  );

  const fallbackPoints = useMemo(() => normalizePoints(validPoints), [validPoints]);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!mapElementRef.current || validPoints.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        ensureIconsFixed();

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = L.map(mapElementRef.current, {
            zoomControl: true,
            scrollWheelZoom: false,
          });

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
          }).addTo(mapInstanceRef.current);
        }

        if (markerLayerRef.current) {
          markerLayerRef.current.remove();
        }

        markerLayerRef.current = L.layerGroup();
        const bounds: [number, number][] = [];

        validPoints.forEach((listing) => {
          const lat = Number(listing.lat);
          const lng = Number(listing.lng);
          bounds.push([lat, lng]);

          const marker = L.marker([lat, lng]);
          marker.bindPopup(
            `<strong>${escapeHtml(listing.title)}</strong><br/>${formatPrice(listing.priceMonthly)}/month`
          );
          marker.on('click', () => onMarkerSelect?.(listing));
          markerLayerRef.current.addLayer(marker);
        });

        markerLayerRef.current.addTo(mapInstanceRef.current);

        if (bounds.length === 1) {
          mapInstanceRef.current.setView(bounds[0], 18);
        } else {
          mapInstanceRef.current.fitBounds(bounds, { padding: [28, 28], maxZoom: 18 });
        }

        setTimeout(() => {
          if (!cancelled) mapInstanceRef.current?.invalidateSize();
        }, 150);
      } catch (mapError) {
        if (!cancelled) {
          setError(
            mapError instanceof Error ? mapError.message : 'Unable to initialize map.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initMap();
    return () => { cancelled = true; };
  }, [validPoints, onMarkerSelect]);

  useEffect(
    () => () => {
      markerLayerRef.current?.remove();
      markerLayerRef.current = null;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    },
    []
  );

  if (validPoints.length === 0) {
    return (
      <div className="leaflet-map-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 240, background: '#f7f7f7', borderRadius: 16, border: '1px solid var(--border)' }}>
        <p className="muted" style={{ textAlign: 'center', padding: '2rem' }}>
          📍 No location coordinates available for these listings yet.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaflet-map-wrap">
        <p className="muted map-loading" style={{ marginBottom: '0.5rem', color: 'var(--mid)', fontSize: '0.85rem' }}>
          Map could not load — showing approximate position layout instead.
        </p>
        <div className="map-fallback" role="region" aria-label="Listing map fallback">
          {fallbackPoints.map((listing) => (
            <button
              key={listing.id}
              type="button"
              className="map-fallback__marker"
              style={{ left: `${listing.normalizedX}%`, top: `${listing.normalizedY}%` }}
              title={`${listing.title} • ${formatPrice(listing.priceMonthly)}/month`}
              onClick={() => onMarkerSelect?.(listing)}
            >
              ●
            </button>
          ))}
        </div>
        <div className="map-fallback__legend">
          {fallbackPoints.slice(0, 6).map((listing) => (
            <button
              key={`legend-${listing.id}`}
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => onMarkerSelect?.(listing)}
            >
              {listing.title}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="leaflet-map-wrap">
      <div ref={mapElementRef} className="leaflet-map" aria-label="Listing map" />
      {loading && (
        <p className="muted map-loading map-loading--overlay">Loading map…</p>
      )}
    </div>
  );
}
