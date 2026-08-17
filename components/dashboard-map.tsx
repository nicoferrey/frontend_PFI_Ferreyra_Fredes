"use client";

import { useEffect, useRef, useState } from 'react';
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
  ndviCurrent?: number;
}

interface DashboardMapProps {
  center: [number, number];
  lots: MapLotItem[];
  selectedLotId?: string;
  onSelectLot?: (lotId: string) => void;
  className?: string;
  grayscale?: boolean;
}

export default function DashboardMap({
  center,
  lots,
  selectedLotId,
  onSelectLot,
  className = "",
  grayscale = false,
}: DashboardMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);
  const polygonLayersRef = useRef<{ [id: string]: any }>({});
  const lastGeometrySignatureRef = useRef('');
  const onSelectLotRef = useRef(onSelectLot);

  const [activeLayer, setActiveLayer] = useState<'alertas' | 'ndvi' | 'humedad'>('alertas');
  const [mapInstance, setMapInstance] = useState<any>(null);

  useEffect(() => {
    onSelectLotRef.current = onSelectLot;
  }, [onSelectLot]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let active = true;
    let localMapInstance: any = null;

    const initMap = async () => {
      const L = await import('leaflet');
      if (!active) return;
      leafletRef.current = L;

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

      const instance = L.map(container, {
        center: center,
        zoom: 15,
        layers: [esriSatellite, CartoDBLabels],
        zoomControl: false,
        attributionControl: false,
      });

      localMapInstance = instance;
      setTimeout(() => {
        instance.invalidateSize();
      }, 100);

      L.control.zoom({ position: 'bottomright' }).addTo(instance);
      setMapInstance(instance);
    };

    initMap();

    return () => {
      active = false;
      if (localMapInstance) {
        localMapInstance.remove();
      }
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    if (!L || !mapInstance) return;

    Object.values(polygonLayersRef.current).forEach((layer) => {
      mapInstance.removeLayer(layer);
    });

    const polygons: any[] = [];
    polygonLayersRef.current = {};
    
    const geometrySignature = lots
      .map((lot) => `${lot.id}:${lot.polygon.map(([lat, lng]) => `${lat},${lng}`).join(';')}`)
      .join('|') + `|layer:${activeLayer}`;
    const geometryChanged = geometrySignature !== lastGeometrySignatureRef.current;

    lots.forEach((lot) => {
      if (!lot.polygon || lot.polygon.length === 0) return;

      let colorMap = { border: '#10b981', fill: '#34d399', badge: 'bg-emerald-500 text-white', label: 'Normal' };
      
      if (activeLayer === 'alertas') {
        const status = lot.hydricStatus || 'Normal';
        colorMap = {
          Normal: { border: '#10b981', fill: '#34d399', badge: 'bg-emerald-500 text-white', label: 'Normal' },
          Atencion: { border: '#f59e0b', fill: '#fbbf24', badge: 'bg-amber-500 text-slate-950', label: 'Atención' },
          Critico: { border: '#ef4444', fill: '#f87171', badge: 'bg-rose-500 text-white', label: 'Crítico' },
        }[status];
      } else if (activeLayer === 'ndvi') {
        const ndvi = lot.ndviCurrent;
        if (ndvi === undefined) {
          colorMap = { border: '#64748b', fill: '#94a3b8', badge: 'bg-slate-500 text-white', label: 'NDVI: sin dato' };
        } else if (ndvi >= 0.6) {
          colorMap = { border: '#047857', fill: '#10b981', badge: 'bg-emerald-600 text-white', label: `NDVI: ${ndvi.toFixed(2)} (Sano)` };
        } else if (ndvi >= 0.35) {
          colorMap = { border: '#854d0e', fill: '#fbbf24', badge: 'bg-amber-500 text-slate-950', label: `NDVI: ${ndvi.toFixed(2)} (Moderado)` };
        } else {
          colorMap = { border: '#be123c', fill: '#f43f5e', badge: 'bg-rose-600 text-white', label: `NDVI: ${ndvi.toFixed(2)} (Bajo)` };
        }
      } else if (activeLayer === 'humedad') {
        const au = lot.waterAvailableAU_pct ?? 70;
        if (au >= 80) {
          colorMap = { border: '#0369a1', fill: '#0284c7', badge: 'bg-sky-600 text-white', label: `AU: ${au}% (Húmedo)` };
        } else if (au >= 60) {
          colorMap = { border: '#0e7490', fill: '#06b6d4', badge: 'bg-cyan-600 text-white', label: `AU: ${au}% (Óptimo)` };
        } else if (au >= 45) {
          colorMap = { border: '#b45309', fill: '#fb923c', badge: 'bg-orange-500 text-white', label: `AU: ${au}% (Moderado)` };
        } else {
          colorMap = { border: '#be123c', fill: '#f43f5e', badge: 'bg-rose-600 text-white', label: `AU: ${au}% (Crítico)` };
        }
      }

      const polygon = L.polygon(lot.polygon, {
        color: colorMap.border,
        fillColor: colorMap.fill,
        fillOpacity: 0.32,
        weight: 2.5,
      }).addTo(mapInstance);

      polygon.on('click', () => {
        if (onSelectLotRef.current) {
          onSelectLotRef.current(lot.id);
        }
      });

      polygon.bindTooltip(
        `<div class="p-1.5 text-xs text-white min-w-[150px]">
          <div class="flex items-center justify-between gap-2 border-b border-white/20 pb-1 mb-1">
            <strong class="text-white text-xs">${lot.name}</strong>
            <span class="text-[9px] font-bold px-1.5 py-0.2 rounded ${colorMap.badge}">${colorMap.label}</span>
          </div>
          <p class="text-slate-200 text-[11px]">${lot.crop} &bull; ${lot.area.toFixed(1)} ha</p>
          ${lot.deficitDr_mm !== undefined ? `<p class="text-amber-300 text-[10px] font-mono mt-0.5">Déficit: ${lot.deficitDr_mm} mm &bull; AU: ${lot.waterAvailableAU_pct}%</p>` : ''}
          ${lot.ndviCurrent !== undefined ? `<p class="text-emerald-300 text-[10px] font-mono">NDVI Satelital: ${lot.ndviCurrent.toFixed(2)}</p>` : ''}
          <p class="text-[9px] text-sky-300 mt-1 italic">Click para seleccionar lote</p>
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

    if (geometryChanged && polygons.length > 0) {
      const group = L.featureGroup(polygons);
      mapInstance.fitBounds(group.getBounds(), { padding: [50, 50] });
      mapInstance.invalidateSize();
      lastGeometrySignatureRef.current = geometrySignature;
    } else if (polygons.length === 0) {
      mapInstance.setView(center, 15);
      mapInstance.invalidateSize();
      lastGeometrySignatureRef.current = '';
    }
  }, [center, lots, activeLayer, mapInstance]);

  useEffect(() => {
    if (!mapInstance) return;
    lots.forEach((lot) => {
      const polygon = polygonLayersRef.current[lot.id];
      if (!polygon) return;

      const isSelected = lot.id === selectedLotId;
      
      let colorMap = { border: '#10b981', fill: '#34d399' };
      
      if (activeLayer === 'alertas') {
        const status = lot.hydricStatus || 'Normal';
        colorMap = {
          Normal: { border: '#10b981', fill: '#34d399' },
          Atencion: { border: '#f59e0b', fill: '#fbbf24' },
          Critico: { border: '#ef4444', fill: '#f87171' },
        }[status];
      } else if (activeLayer === 'ndvi') {
        const ndvi = lot.ndviCurrent;
        if (ndvi === undefined) {
          colorMap = { border: '#64748b', fill: '#94a3b8' };
        } else if (ndvi >= 0.6) {
          colorMap = { border: '#047857', fill: '#10b981' };
        } else if (ndvi >= 0.35) {
          colorMap = { border: '#854d0e', fill: '#fbbf24' };
        } else {
          colorMap = { border: '#be123c', fill: '#f43f5e' };
        }
      } else if (activeLayer === 'humedad') {
        const au = lot.waterAvailableAU_pct ?? 70;
        if (au >= 80) {
          colorMap = { border: '#0369a1', fill: '#0284c7' };
        } else if (au >= 60) {
          colorMap = { border: '#0e7490', fill: '#06b6d4' };
        } else if (au >= 45) {
          colorMap = { border: '#b45309', fill: '#fb923c' };
        } else {
          colorMap = { border: '#be123c', fill: '#f43f5e' };
        }
      }

      polygon.setStyle({
        color: isSelected ? '#e0f2fe' : colorMap.border,
        fillColor: colorMap.fill,
        fillOpacity: isSelected ? 0.5 : 0.24,
        weight: isSelected ? 5 : 2.5,
        opacity: isSelected ? 1 : 0.78,
      });

      if (isSelected) {
        polygon.bringToFront();
      }
    });
  }, [lots, selectedLotId, activeLayer, mapInstance]);

  return (
    <div className={`relative w-full h-full min-h-[480px] lg:min-h-[540px] rounded-[28px] overflow-hidden border border-white/10 shadow-inner ${grayscale ? 'map-grayscale' : ''} ${className}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        .leaflet-tooltip.custom-map-tooltip {
          background: #0f172a !important;
          border: 1px solid rgba(255, 255, 255, 0.18) !important;
          border-radius: 14px !important;
          padding: 10px 14px !important;
          box-shadow: 0 10px 20px -3px rgba(0, 0, 0, 0.55), 0 4px 8px -2px rgba(0, 0, 0, 0.35) !important;
          font-family: inherit !important;
        }
        .leaflet-tooltip.custom-map-tooltip::before {
          border-top-color: #0f172a !important;
          border-bottom-color: #0f172a !important;
        }
        ${grayscale ? `
          .map-grayscale .leaflet-tile-pane {
            filter: grayscale(100%) brightness(0.8) contrast(1.15);
          }
        ` : ''}
      `}} />
      <div ref={containerRef} className="w-full h-full min-h-[480px] lg:min-h-[540px]" />
      
      {/* Map Floating Legend */}
      <div className="absolute top-4 left-4 z-[400] flex flex-wrap items-center gap-2 rounded-2xl border border-white/20 bg-slate-950/80 p-2 text-xs text-white backdrop-blur-md shadow-lg">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-1">
          {activeLayer === 'alertas' ? 'Estado:' : activeLayer === 'ndvi' ? 'NDVI Satelital:' : 'Humedad (Agua Útil):'}
        </span>
        {activeLayer === 'alertas' && (
          <>
            <span className="flex items-center gap-1 text-[11px] rounded-lg bg-emerald-500/20 px-2 py-0.5 text-emerald-300 border border-emerald-500/30">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Normal
            </span>
            <span className="flex items-center gap-1 text-[11px] rounded-lg bg-amber-500/20 px-2 py-0.5 text-amber-300 border border-amber-500/30">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> Atención
            </span>
            <span className="flex items-center gap-1 text-[11px] rounded-lg bg-rose-500/20 px-2 py-0.5 text-rose-300 border border-rose-500/30">
              <span className="h-2 w-2 rounded-full bg-rose-400" /> Crítico
            </span>
          </>
        )}
        {activeLayer === 'ndvi' && (
          <>
            <span className="flex items-center gap-1 text-[11px] rounded-lg bg-emerald-800/40 px-2 py-0.5 text-emerald-300 border border-emerald-800/40">
              <span className="h-2 w-2 rounded-full bg-emerald-800" /> &gt;=0.60 (Sano)
            </span>
            <span className="flex items-center gap-1 text-[11px] rounded-lg bg-emerald-600/20 px-2 py-0.5 text-emerald-400 border border-emerald-600/30">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> 0.35-0.60 (Moderado)
            </span>
            <span className="flex items-center gap-1 text-[11px] rounded-lg bg-amber-500/20 px-2 py-0.5 text-amber-300 border border-amber-500/30">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> &lt;0.35 (Bajo)
            </span>
            <span className="flex items-center gap-1 text-[11px] rounded-lg bg-amber-700/20 px-2 py-0.5 text-amber-500 border border-amber-700/30">
              <span className="h-2 w-2 rounded-full bg-slate-400" /> Sin dato
            </span>
          </>
        )}
        {activeLayer === 'humedad' && (
          <>
            <span className="flex items-center gap-1 text-[11px] rounded-lg bg-sky-600/20 px-2 py-0.5 text-sky-300 border border-sky-600/30">
              <span className="h-2 w-2 rounded-full bg-sky-400" /> &gt;80% (Húmedo)
            </span>
            <span className="flex items-center gap-1 text-[11px] rounded-lg bg-cyan-600/20 px-2 py-0.5 text-cyan-300 border border-cyan-600/30">
              <span className="h-2 w-2 rounded-full bg-cyan-400" /> 60-80% (Óptimo)
            </span>
            <span className="flex items-center gap-1 text-[11px] rounded-lg bg-orange-500/20 px-2 py-0.5 text-orange-300 border border-orange-500/30">
              <span className="h-2 w-2 rounded-full bg-orange-400" /> 45-60% (Mod)
            </span>
            <span className="flex items-center gap-1 text-[11px] rounded-lg bg-rose-500/20 px-2 py-0.5 text-rose-300 border border-rose-500/30">
              <span className="h-2 w-2 rounded-full bg-rose-400" /> &lt;45% (Crítico)
            </span>
          </>
        )}
      </div>

      {/* Floating Layer Switcher */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-1.5 rounded-2xl border border-white/20 bg-slate-950/80 p-1.5 text-xs text-white backdrop-blur-md shadow-lg">
        <button
          onClick={() => setActiveLayer('alertas')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
            activeLayer === 'alertas' ? 'bg-crop-600 text-white shadow-sm font-extrabold' : 'text-slate-300 hover:text-white'
          }`}
        >
          <span>Alertas de Balance</span>
        </button>
        <button
          onClick={() => setActiveLayer('ndvi')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
            activeLayer === 'ndvi' ? 'bg-crop-600 text-white shadow-sm font-extrabold' : 'text-slate-300 hover:text-white'
          }`}
        >
          <span>NDVI Satelital</span>
        </button>
        <button
          onClick={() => setActiveLayer('humedad')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
            activeLayer === 'humedad' ? 'bg-crop-600 text-white shadow-sm font-extrabold' : 'text-slate-300 hover:text-white'
          }`}
        >
          <span>Humedad Suelo (AU)</span>
        </button>
      </div>
    </div>
  );
}
