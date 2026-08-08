"use client";

import { useEffect, useRef } from 'react';
import "leaflet/dist/leaflet.css";

interface DashboardMapProps {
  center: [number, number];
  lots: any[];
}

export default function DashboardMap({ center, lots }: DashboardMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let active = true;
    let mapInstance: any;

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

      mapInstance = L.map(container, {
        center: center,
        zoom: 15,
        layers: [esriSatellite, CartoDBLabels],
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);

      // Plot lots on map
      const polygons: any[] = [];
      lots.forEach((lot) => {
        if (!lot.polygon || lot.polygon.length === 0) return;
        
        const polygon = L.polygon(lot.polygon, {
          color: '#3f9d4f', // Crop green border
          fillColor: '#85cb92', // Light crop green fill
          fillOpacity: 0.3,
          weight: 3,
        }).addTo(mapInstance);

        polygon.bindTooltip(
          `<div class="p-1 text-xs text-white">
            <p class="font-bold text-slate-100">${lot.name}</p>
            <p class="text-emerald-400 mt-0.5">${lot.area.toFixed(1)} ha &bull; ${lot.crop}</p>
           </div>`,
          {
            permanent: true,
            direction: 'center',
            className: 'custom-map-tooltip',
          }
        );

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
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [center, lots]);

  return (
    <div className="relative w-full h-full min-h-[560px] rounded-[28px] overflow-hidden border border-white/10 shadow-inner">
      <div ref={containerRef} className="w-full h-full min-h-[560px]" />
    </div>
  );
}
