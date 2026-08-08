"use client";

import { useEffect, useRef } from 'react';
import "leaflet/dist/leaflet.css";

export interface MapLotItem {
  id: string;
  name: string;
  polygon: [number, number][];
  area: number;
  crop: string;
  hydricStatus?: 'Normal' | 'Atencion' | 'Critico';
  deficitDr_mm?: number;
  waterAvailableAU_pct?: number;
}

interface DashboardMapProps {
  center: [number, number];
  lots: MapLotItem[];
  selectedLotId?: string;
  onSelectLot?: (lotId: string) => void;
  className?: string;
}

export default function DashboardMap({
  center,
  lots,
  selectedLotId,
  onSelectLot,
  className = "",
}: DashboardMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const polygonLayersRef = useRef<{ [id: string]: any }>({});

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let active = true;

    const initMap = async () => {
      const L = await import('leaflet');
      if (!active) return;

      // Fix default icons path issue in Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      // Esri Satellite Layer
      const esriSatellite = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      );

      // Labels Overlay
      const CartoDBLabels = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
        { subdomains: 'abcd', maxZoom: 20 }
      );

      if (mapRef.current) {
        mapRef.current.remove();
      }

      const mapInstance = L.map(container, {
        center: center,
        zoom: 15,
        layers: [esriSatellite, CartoDBLabels],
        zoomControl: false,
        attributionControl: false,
      });

      mapRef.current = mapInstance;
      L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);

      // Plot lots on map
      const polygons: any[] = [];
      polygonLayersRef.current = {};

      lots.forEach((lot) => {
        if (!lot.polygon || lot.polygon.length === 0) return;

        const isSelected = lot.id === selectedLotId;
        
        // Status Colors
        const status = lot.hydricStatus || 'Normal';
        const colorMap = {
          Normal: { border: '#10b981', fill: '#34d399', badge: 'bg-emerald-500 text-white' },
          Atencion: { border: '#f59e0b', fill: '#fbbf24', badge: 'bg-amber-500 text-slate-950' },
          Critico: { border: '#ef4444', fill: '#f87171', badge: 'bg-rose-500 text-white' },
        }[status];

        const polygon = L.polygon(lot.polygon, {
          color: isSelected ? '#38bdf8' : colorMap.border,
          fillColor: isSelected ? '#38bdf8' : colorMap.fill,
          fillOpacity: isSelected ? 0.55 : 0.35,
          weight: isSelected ? 4 : 2.5,
          dashArray: isSelected ? undefined : undefined,
        }).addTo(mapInstance);

        polygon.on('click', () => {
          if (onSelectLot) {
            onSelectLot(lot.id);
          }
        });

        const statusLabel = status === 'Normal' ? '🟢 Normal' : status === 'Atencion' ? '🟡 Atención' : '🔴 Crítico';

        polygon.bindTooltip(
          `<div class="p-1.5 text-xs text-white min-w-[130px]">
            <div class="flex items-center justify-between gap-2 border-b border-white/20 pb-1 mb-1">
              <strong class="text-white text-xs">${lot.name}</strong>
              <span class="text-[10px] font-bold px-1.5 py-0.2 rounded ${colorMap.badge}">${status}</span>
            </div>
            <p class="text-slate-200 text-[11px]">${lot.crop} &bull; ${lot.area.toFixed(1)} ha</p>
            ${lot.deficitDr_mm !== undefined ? `<p class="text-amber-300 text-[10px] font-mono mt-0.5">Dr: ${lot.deficitDr_mm} mm &bull; AU: ${lot.waterAvailableAU_pct}%</p>` : ''}
            <p class="text-[9px] text-sky-300 mt-1 italic">Click para ver ficha y balance</p>
           </div>`,
          {
            permanent: false,
            direction: 'top',
            className: 'custom-map-tooltip',
          }
        );

        polygonLayersRef.current[lot.id] = polygon;
        polygons.push(polygon);
      });

      // Fit bounds if lots exist
      if (polygons.length > 0) {
        const group = L.featureGroup(polygons);
        mapInstance.fitBounds(group.getBounds(), { padding: [50, 50] });
      }
    };

    initMap();

    return () => {
      active = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center, lots, selectedLotId]);

  return (
    <div className={`relative w-full h-full min-h-[480px] lg:min-h-[540px] rounded-[28px] overflow-hidden border border-white/10 shadow-inner ${className}`}>
      <div ref={containerRef} className="w-full h-full min-h-[480px] lg:min-h-[540px]" />
      
      {/* Map Floating Legend */}
      <div className="absolute top-4 left-4 z-[400] flex flex-wrap items-center gap-2 rounded-2xl border border-white/20 bg-slate-950/80 p-2 text-xs text-white backdrop-blur-md shadow-lg">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-1">Estado:</span>
        <span className="flex items-center gap-1 text-[11px] rounded-lg bg-emerald-500/20 px-2 py-0.5 text-emerald-300 border border-emerald-500/30">
          <span className="h-2 w-2 rounded-full bg-emerald-400" /> Normal
        </span>
        <span className="flex items-center gap-1 text-[11px] rounded-lg bg-amber-500/20 px-2 py-0.5 text-amber-300 border border-amber-500/30">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> Atención
        </span>
        <span className="flex items-center gap-1 text-[11px] rounded-lg bg-rose-500/20 px-2 py-0.5 text-rose-300 border border-rose-500/30">
          <span className="h-2 w-2 rounded-full bg-rose-400" /> Crítico
        </span>
      </div>
    </div>
  );
}
