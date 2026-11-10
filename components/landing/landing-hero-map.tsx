'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

const ESRI_WORLD_IMAGERY_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

type LatLng = [number, number];

type LotStatus = 'Normal' | 'Atencion' | 'Critico';

type Lot = {
  name: string;
  crop: string;
  status: LotStatus;
  auPct: number;
  polygon: LatLng[];
};

const STATUS_STYLE: Record<LotStatus, { color: string; fill: string; badge: string }> = {
  Normal: { color: '#10b981', fill: '#34d399', badge: 'Óptimo' },
  Atencion: { color: '#f59e0b', fill: '#fbbf24', badge: 'Atención' },
  Critico: { color: '#ef4444', fill: '#f87171', badge: 'Crítico' },
};

/** Contorno NW→NE del predio real (Valle Inferior). */
const FARM_NW: LatLng[] = [
  [-40.8021573, -63.0710599],
  [-40.7973533, -63.0646669],
  [-40.7955462, -63.0622622],
  [-40.7918586, -63.0574986],
];

/** Contorno SW→SE del mismo predio. */
const FARM_SE: LatLng[] = [
  [-40.8064453, -63.0657169],
  [-40.8053084, -63.0644724],
  [-40.8041714, -63.0638715],
  [-40.8031806, -63.0634853],
  [-40.8030019, -63.0630991],
  [-40.8031319, -63.0626485],
  [-40.8039603, -63.0603739],
  [-40.8041064, -63.0574986],
  [-40.8046262, -63.0555460],
  [-40.7984376, -63.0475208],
];

function metersBetween(a: LatLng, b: LatLng) {
  const dLat = (b[0] - a[0]) * 111320;
  const dLng = (b[1] - a[1]) * 111320 * Math.cos((a[0] * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

function interpolate(a: LatLng, b: LatLng, t: number): LatLng {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function pointAt(line: LatLng[], t: number): LatLng {
  const clamped = Math.min(1, Math.max(0, t));
  const lengths = [0];
  for (let i = 1; i < line.length; i += 1) {
    lengths.push(lengths[i - 1] + metersBetween(line[i - 1], line[i]));
  }
  const target = clamped * lengths[lengths.length - 1];
  for (let i = 1; i < line.length; i += 1) {
    if (target <= lengths[i]) {
      const span = lengths[i] - lengths[i - 1] || 1;
      return interpolate(line[i - 1], line[i], (target - lengths[i - 1]) / span);
    }
  }
  return line[line.length - 1];
}

function sampleRange(line: LatLng[], t0: number, t1: number, steps = 6): LatLng[] {
  return Array.from({ length: steps }, (_, index) => {
    const t = t0 + ((t1 - t0) * index) / (steps - 1);
    return pointAt(line, t);
  });
}

function stripPolygon(t0: number, t1: number): LatLng[] {
  const north = sampleRange(FARM_NW, t0, t1);
  const south = sampleRange(FARM_SE, t1, t0);
  return [...north, ...south];
}

function polygonAreaHa(polygon: LatLng[]) {
  let area = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const [lat1, lng1] = polygon[i];
    const [lat2, lng2] = polygon[(i + 1) % polygon.length];
    const y1 = lat1 * 111320;
    const x1 = lng1 * 111320 * Math.cos((lat1 * Math.PI) / 180);
    const y2 = lat2 * 111320;
    const x2 = lng2 * 111320 * Math.cos((lat2 * Math.PI) / 180);
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2 / 10000;
}

const GENERIC_LOTS: Lot[] = [
  { name: 'Lote Norte', crop: 'Soja 2da', status: 'Normal', auPct: 86, polygon: stripPolygon(0.02, 0.23) },
  { name: 'Lote Centro', crop: 'Maíz Tardío', status: 'Atencion', auPct: 63, polygon: stripPolygon(0.265, 0.48) },
  { name: 'Lote Sur', crop: 'Trigo', status: 'Critico', auPct: 38, polygon: stripPolygon(0.515, 0.72) },
  { name: 'Lote Este', crop: 'Girasol', status: 'Normal', auPct: 79, polygon: stripPolygon(0.76, 0.98) },
];

type LandingHeroMapProps = {
  showPoint?: boolean;
  className?: string;
};

export function LandingHeroMap({ showPoint = false, className }: LandingHeroMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: any;
    let cancelled = false;

    const setup = async () => {
      if (!containerRef.current) return;
      const L = await import('leaflet');
      if (cancelled || !containerRef.current) return;

      map = L.map(containerRef.current, {
        center: GENERIC_LOTS[1].polygon[0],
        zoom: 15,
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: false,
        dragging: !showPoint,
        doubleClickZoom: !showPoint,
        boxZoom: !showPoint,
        keyboard: !showPoint,
        touchZoom: !showPoint,
        minZoom: 14,
        maxZoom: 17,
      });

      L.tileLayer(ESRI_WORLD_IMAGERY_URL, {
        maxZoom: 18,
        attribution: 'Esri',
      }).addTo(map);

      const polygons = GENERIC_LOTS.map((lot) => {
        const style = STATUS_STYLE[lot.status];
        const layer = L.polygon(lot.polygon, {
          color: '#f8fafc',
          fillColor: style.fill,
          fillOpacity: 0.28,
          weight: 2.6,
          opacity: 0.95,
        }).addTo(map);

        if (!showPoint) {
          const area = polygonAreaHa(lot.polygon);
          layer.bindTooltip(
            `<div class="space-y-0.5">
              <strong>${lot.name}</strong>
              <span style="margin-left:6px;font-size:9px;font-weight:700;padding:1px 6px;border-radius:999px;background:${style.color};color:#0f172a">${style.badge}</span>
              <br/><span>${lot.crop} · ${area.toFixed(1)} ha</span>
              <br/><span>Agua útil ${lot.auPct}%</span>
            </div>`,
            { sticky: true, className: 'landing-map-tooltip' }
          );
        }

        return layer;
      });

      if (showPoint) {
        const lot = GENERIC_LOTS[1];
        const lat = lot.polygon.reduce((sum, point) => sum + point[0], 0) / lot.polygon.length;
        const lng = lot.polygon.reduce((sum, point) => sum + point[1], 0) / lot.polygon.length;
        L.circleMarker([lat, lng], {
          radius: 11,
          color: '#ffffff',
          weight: 3,
          fillColor: '#0f172a',
          fillOpacity: 1,
        }).addTo(map);
        L.circleMarker([lat, lng], {
          radius: 4,
          color: '#ffffff',
          weight: 0,
          fillColor: '#ffffff',
          fillOpacity: 1,
        }).addTo(map);
      }

      const group = L.featureGroup(polygons);
      map.fitBounds(group.getBounds(), { padding: [16, 16], maxZoom: 16 });

      requestAnimationFrame(() => {
        map.invalidateSize();
      });
    };

    void setup();

    return () => {
      cancelled = true;
      if (map) {
        map.remove();
      }
    };
  }, [showPoint]);

  return (
    <div
      ref={containerRef}
      className={className ?? 'landing-hero-map h-[240px] w-full overflow-hidden rounded-2xl sm:h-[280px]'}
    />
  );
}
