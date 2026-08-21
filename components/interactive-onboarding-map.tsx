"use client";

import { useEffect, useRef, useState } from 'react';
import { Compass, Layers, MapPin, Check, RefreshCw } from 'lucide-react';
import "leaflet/dist/leaflet.css";
import { getSentinelMapLayerByCenterApi } from '@/lib/api';

const ESRI_WORLD_IMAGERY_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

interface Lot {
  id: string;
  name: string;
  polygon: [number, number][]; // LatLng tuple
  area: number;
  crop: string;
  soil: string;
  irrigation: string;
}

interface InteractiveOnboardingMapProps {
  step: number;
  center: [number, number];
  onCenterChange: (center: [number, number]) => void;
  lots: Lot[];
  selectedLotId: string | null;
  onSelectLot: (id: string) => void;
  onAddLot: (lot: Omit<Lot, 'crop' | 'soil' | 'irrigation'>) => void;
  drawingVertices: [number, number][];
  setDrawingVertices: React.Dispatch<React.SetStateAction<[number, number][]>>;
  drawMode: 'free' | 'circle' | 'rectangle';
  circleRadius: number;
  rectWidth: number;
  rectHeight: number;
  onUpdateLotPolygon?: (id: string, polygon: [number, number][], area: number) => void;
}

// Equirectangular local projection for small agricultural lots (highly accurate under 100km2)
function calculateAreaInHectares(coords: [number, number][]): number {
  if (coords.length < 3) return 0;
  const R = 6378137; // Earth's radius in meters
  const latRad = coords.map(c => (c[0] * Math.PI) / 180);
  const lngRad = coords.map(c => (c[1] * Math.PI) / 180);

  const avgLat = latRad.reduce((sum, val) => sum + val, 0) / coords.length;
  const cosLat = Math.cos(avgLat);

  let area = 0;
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const x1 = R * lngRad[i] * cosLat;
    const y1 = R * latRad[i];
    const x2 = R * lngRad[j] * cosLat;
    const y2 = R * latRad[j];
    area += (x1 * y2 - x2 * y1);
  }
  return Math.abs(area / 2) / 10000;
}

// Generates a 32-point polygon approximating a circle (in meters)
function generateCirclePolygon(center: [number, number], radiusInMeters: number, numPoints = 32): [number, number][] {
  const [lat, lng] = center;
  const coords: [number, number][] = [];
  const R = 6378137; // Earth's radius in meters

  for (let i = 0; i < numPoints; i++) {
    const angle = (i * 2 * Math.PI) / numPoints;
    const dx = radiusInMeters * Math.cos(angle);
    const dy = radiusInMeters * Math.sin(angle);

    const deltaLat = dy / R;
    const deltaLng = dx / (R * Math.cos((lat * Math.PI) / 180));

    const pLat = lat + (deltaLat * 180) / Math.PI;
    const pLng = lng + (deltaLng * 180) / Math.PI;

    coords.push([pLat, pLng]);
  }
  return coords;
}

// Generates a 4-point rectangle polygon centered on lat/lng (in meters)
function generateRectanglePolygon(center: [number, number], widthMeters: number, heightMeters: number): [number, number][] {
  const [lat, lng] = center;
  const R = 6378137;

  const dy = heightMeters / 2;
  const dx = widthMeters / 2;

  const dLat = (dy / R) * (180 / Math.PI);
  const dLng = (dx / (R * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI);

  return [
    [lat + dLat, lng - dLng], // Top Left
    [lat + dLat, lng + dLng], // Top Right
    [lat - dLat, lng + dLng], // Bottom Right
    [lat - dLat, lng - dLng], // Bottom Left
  ];
}

// Helper to find the index of the closest segment to insert a new vertex
function findInsertIndex(clickLatLng: [number, number], polygon: [number, number][]): number {
  let minDistance = Infinity;
  let insertIndex = polygon.length;
  const R = 6378137;

  // Click point in radians
  const cLat = clickLatLng[0] * Math.PI / 180;
  const cLng = clickLatLng[1] * Math.PI / 180;

  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];

    // Midpoint of the segment as a simple approximation
    const mLat = ((p1[0] + p2[0]) / 2) * Math.PI / 180;
    const mLng = ((p1[1] + p2[1]) / 2) * Math.PI / 180;

    // Distance from click point to midpoint
    const dLat = cLat - mLat;
    const dLng = cLng - mLng;
    const d = dLat * dLat + dLng * dLng;

    if (d < minDistance) {
      minDistance = d;
      insertIndex = i + 1;
    }
  }

  return insertIndex;
}

export default function InteractiveOnboardingMap({
  step,
  center,
  onCenterChange,
  lots,
  selectedLotId,
  onSelectLot,
  onAddLot,
  drawingVertices,
  setDrawingVertices,
  drawMode,
  circleRadius,
  rectWidth,
  rectHeight,
  onUpdateLotPolygon,
}: InteractiveOnboardingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const baseLayerRef = useRef<any>(null);
  const sentinelLayerRef = useRef<any>(null);
  const centerMarkerRef = useRef<any>(null);
  const currentDrawPolygonRef = useRef<any>(null);
  const currentDrawLineRef = useRef<any>(null);
  const drawMarkersRef = useRef<any[]>([]);
  const editMarkersRef = useRef<any[]>([]);
  const lotsLayersRef = useRef<{ [id: string]: any }>({});
  const LRef = useRef<any>(null);
 
  // References to dynamic variables to prevent stale closures in event handlers
  const stepRef = useRef(step);
  const centerRefVal = useRef(center);
  const lotsRef = useRef(lots);
  const selectedLotIdRef = useRef(selectedLotId);
  const drawingVerticesRef = useRef(drawingVertices);
  const onCenterChangeRef = useRef(onCenterChange);
  const onSelectLotRef = useRef(onSelectLot);
  const onAddLotRef = useRef(onAddLot);
  const setDrawingVerticesRef = useRef(setDrawingVertices);
  const onUpdateLotPolygonRef = useRef(onUpdateLotPolygon);
  const [useCurrentImage, setUseCurrentImage] = useState(false);
  const [sentinelLayerStatus, setSentinelLayerStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [sentinelLayerDate, setSentinelLayerDate] = useState<string | null>(null);
  const [sentinelLayerError, setSentinelLayerError] = useState<string | null>(null);
 
  const drawModeRef = useRef(drawMode);
  const circleRadiusRef = useRef(circleRadius);
  const rectWidthRef = useRef(rectWidth);
  const rectHeightRef = useRef(rectHeight);
 
  // Keep references updated on every render
  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { centerRefVal.current = center; }, [center]);
  useEffect(() => { lotsRef.current = lots; }, [lots]);
  useEffect(() => { selectedLotIdRef.current = selectedLotId; }, [selectedLotId]);
  useEffect(() => { drawingVerticesRef.current = drawingVertices; }, [drawingVertices]);
  useEffect(() => { onCenterChangeRef.current = onCenterChange; }, [onCenterChange]);
  useEffect(() => { onSelectLotRef.current = onSelectLot; }, [onSelectLot]);
  useEffect(() => { onAddLotRef.current = onAddLot; }, [onAddLot]);
  useEffect(() => { setDrawingVerticesRef.current = setDrawingVertices; }, [setDrawingVertices]);
  useEffect(() => { onUpdateLotPolygonRef.current = onUpdateLotPolygon; }, [onUpdateLotPolygon]);
 
  useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);
  useEffect(() => { circleRadiusRef.current = circleRadius; }, [circleRadius]);
  useEffect(() => { rectWidthRef.current = rectWidth; }, [rectWidth]);
  useEffect(() => { rectHeightRef.current = rectHeight; }, [rectHeight]);

  // Clean up drawing vertices and preview layers when switching drawing modes
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    setDrawingVertices([]);
    if (currentDrawPolygonRef.current) {
      map.removeLayer(currentDrawPolygonRef.current);
      currentDrawPolygonRef.current = null;
    }
    if (currentDrawLineRef.current) {
      map.removeLayer(currentDrawLineRef.current);
      currentDrawLineRef.current = null;
    }
    drawMarkersRef.current.forEach((m) => map.removeLayer(m));
    drawMarkersRef.current = [];
  }, [drawMode]);

  // Dynamic import Leaflet and initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const container = mapContainerRef.current;
    let active = true;
    let mapInstance: any;

    const initMap = async () => {
      const L = await import('leaflet');
      if (!active) return;
      LRef.current = L;

      // Fix default icons path issue in Next.js/Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      mapInstance = L.map(container, {
        center: centerRefVal.current,
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });

      // Custom Zoom Control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);

      mapRef.current = mapInstance;

      baseLayerRef.current = L.tileLayer(ESRI_WORLD_IMAGERY_URL, {
        maxZoom: 19,
        zIndex: 0,
      }).addTo(mapInstance);

      // Map Click Event handling using references to prevent stale closures
      mapInstance.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        
        // Step 1: Update farm center on map click
        if (stepRef.current === 1) {
          onCenterChangeRef.current([lat, lng]);
        }
        
        // Step 2: Drawing shapes based on mode
        if (stepRef.current === 2) {
          if (drawModeRef.current === 'free') {
            setDrawingVerticesRef.current((prev) => {
              const next: [number, number][] = [...prev, [lat, lng]];
              return next;
            });
          } else if (drawModeRef.current === 'circle') {
            const polygonCoords = generateCirclePolygon([lat, lng], circleRadiusRef.current);
            const area = (Math.PI * circleRadiusRef.current * circleRadiusRef.current) / 10000;
            onAddLotRef.current({
              id: Math.random().toString(36).substr(2, 9),
              name: `Lote Círculo ${lotsRef.current.length + 1}`,
              polygon: polygonCoords,
              area: area,
            });
          } else if (drawModeRef.current === 'rectangle') {
            const polygonCoords = generateRectanglePolygon([lat, lng], rectWidthRef.current, rectHeightRef.current);
            const area = (rectWidthRef.current * rectHeightRef.current) / 10000;
            onAddLotRef.current({
              id: Math.random().toString(36).substr(2, 9),
              name: `Lote Rectángulo ${lotsRef.current.length + 1}`,
              polygon: polygonCoords,
              area: area,
            });
          }
        }
      });

      // Mousemove dynamic preview for predefined shapes
      mapInstance.on('mousemove', (e: any) => {
        const { lat, lng } = e.latlng;

        if (stepRef.current !== 2) {
          if (currentDrawPolygonRef.current) {
            mapInstance.removeLayer(currentDrawPolygonRef.current);
            currentDrawPolygonRef.current = null;
          }
          return;
        }

        if (drawModeRef.current === 'circle') {
          const coords = generateCirclePolygon([lat, lng], circleRadiusRef.current);
          if (!currentDrawPolygonRef.current) {
            currentDrawPolygonRef.current = L.polygon(coords, {
              color: '#22d3ee',
              fillColor: '#22d3ee',
              fillOpacity: 0.15,
              weight: 2,
              dashArray: '5, 5',
              className: 'draw-line-glow',
            }).addTo(mapInstance);
          } else {
            currentDrawPolygonRef.current.setLatLngs(coords);
          }
        } else if (drawModeRef.current === 'rectangle') {
          const coords = generateRectanglePolygon([lat, lng], rectWidthRef.current, rectHeightRef.current);
          if (!currentDrawPolygonRef.current) {
            currentDrawPolygonRef.current = L.polygon(coords, {
              color: '#22d3ee',
              fillColor: '#22d3ee',
              fillOpacity: 0.15,
              weight: 2,
              dashArray: '5, 5',
              className: 'draw-line-glow',
            }).addTo(mapInstance);
          } else {
            currentDrawPolygonRef.current.setLatLngs(coords);
          }
        } else if (drawModeRef.current === 'free') {
          if (currentDrawPolygonRef.current) {
            mapInstance.removeLayer(currentDrawPolygonRef.current);
            currentDrawPolygonRef.current = null;
          }

          const vertices = drawingVerticesRef.current;
          if (vertices.length > 0) {
            const tempCoords = [...vertices, [lat, lng]];
            if (!currentDrawLineRef.current) {
              currentDrawLineRef.current = L.polyline(tempCoords, {
                color: '#22d3ee',
                weight: 2,
                dashArray: '5, 10',
              }).addTo(mapInstance);
            } else {
              currentDrawLineRef.current.setLatLngs(tempCoords);
            }
          }
        }
      });

      // Mouseout event handler
      mapInstance.on('mouseout', () => {
        if (currentDrawPolygonRef.current) {
          mapInstance.removeLayer(currentDrawPolygonRef.current);
          currentDrawPolygonRef.current = null;
        }
        if (currentDrawLineRef.current && drawModeRef.current === 'free' && drawingVerticesRef.current.length === 0) {
          mapInstance.removeLayer(currentDrawLineRef.current);
          currentDrawLineRef.current = null;
        }
      });

      // Step 1 Marker Initializer
      if (stepRef.current === 1) {
        centerMarkerRef.current = L.marker(centerRefVal.current, { draggable: true })
          .addTo(mapInstance)
          .bindPopup('<b class="text-slate-900 font-semibold">Centro del Establecimiento</b><br>Arrastra para corregir.')
          .openPopup();

        centerMarkerRef.current.on('dragend', () => {
          const position = centerMarkerRef.current.getLatLng();
          onCenterChangeRef.current([position.lat, position.lng]);
        });
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
  }, []);

  useEffect(() => {
    if (!mapRef.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapRef.current;
    let cancelled = false;

    if (!useCurrentImage) {
      if (sentinelLayerRef.current) {
        map.removeLayer(sentinelLayerRef.current);
        sentinelLayerRef.current = null;
      }
      setSentinelLayerStatus('idle');
      setSentinelLayerDate(null);
      setSentinelLayerError(null);
      return;
    }

    setSentinelLayerStatus('loading');
    setSentinelLayerError(null);

    const timeoutId = setTimeout(() => {
      getSentinelMapLayerByCenterApi(center[0], center[1]).then((result) => {
        if (cancelled) return;

        if (sentinelLayerRef.current) {
          map.removeLayer(sentinelLayerRef.current);
          sentinelLayerRef.current = null;
        }

        if (result.ok && result.data?.tile_url_template) {
          const layer = L.tileLayer(result.data.tile_url_template, {
            maxZoom: 18,
            opacity: 1,
            zIndex: 1,
          }).addTo(map);

          layer.on('tileerror', () => {
            if (cancelled) return;
            setSentinelLayerStatus('error');
            setSentinelLayerError('Earth Engine devolvió la escena, pero no se pudieron cargar los tiles Sentinel-2.');
          });

          sentinelLayerRef.current = layer;
          setSentinelLayerDate(result.data.date || null);
          setSentinelLayerStatus('ready');
        } else {
          setSentinelLayerStatus('error');
          setSentinelLayerError(result.data?.detail || 'No se pudo cargar Sentinel-2 para esta zona.');
        }
      }).catch(() => {
        if (cancelled) return;
        setSentinelLayerStatus('error');
        setSentinelLayerError('No se pudo cargar Sentinel-2 para esta zona.');
      });
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [center, useCurrentImage]);

  // Update Map Center View
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(center, mapRef.current.getZoom());

    if (step === 1 && centerMarkerRef.current) {
      centerMarkerRef.current.setLatLng(center);
    }
  }, [center]);

  // Handle Step changes (cleanup/prepare UI)
  useEffect(() => {
    if (!mapRef.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapRef.current;

    // Cleanup Step 1 center marker if not in step 1 or step 4
    if (step !== 1 && step !== 4 && centerMarkerRef.current) {
      map.removeLayer(centerMarkerRef.current);
      centerMarkerRef.current = null;
    } else if (step === 1 && !centerMarkerRef.current) {
      centerMarkerRef.current = L.marker(center, { draggable: true })
        .addTo(map)
        .bindPopup('<b class="text-slate-900">Centro del Establecimiento</b>')
        .openPopup();

      centerMarkerRef.current.on('dragend', () => {
        const position = centerMarkerRef.current.getLatLng();
        onCenterChangeRef.current([position.lat, position.lng]);
      });
    }
  }, [step]);

  // Rendering and managing drawing state (vertices, active lines)
  useEffect(() => {
    if (!mapRef.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapRef.current;

    // Cleanup previous drawing layers
    if (currentDrawPolygonRef.current) map.removeLayer(currentDrawPolygonRef.current);
    if (currentDrawLineRef.current) map.removeLayer(currentDrawLineRef.current);
    drawMarkersRef.current.forEach((m) => map.removeLayer(m));
    drawMarkersRef.current = [];

    if (step !== 2 || drawingVertices.length === 0) {
      return;
    }

    // Draw active lines
    if (drawingVertices.length > 0) {
      // Vertex markers
      drawingVertices.forEach((vertex, idx) => {
        const isFirst = idx === 0;
        const iconHtml = isFirst 
          ? `<div class="flex items-center justify-center w-5 h-5 bg-emerald-500 border-2 border-white rounded-full shadow-[0_0_12px_#10b981] animate-pulse cursor-pointer"><div class="w-1.5 h-1.5 bg-white rounded-full"></div></div>`
          : `<div class="w-3.5 h-3.5 bg-cyan-400 border border-white rounded-full shadow-[0_0_8px_#22d3ee] cursor-pointer"></div>`;

        const vertexMarker = L.marker(vertex, {
          icon: L.divIcon({
            className: 'custom-vertex-marker',
            html: iconHtml,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          }),
        }).addTo(map);

        // Click first marker to close polygon
        if (isFirst && drawingVertices.length >= 3) {
          vertexMarker.bindTooltip('<span class="text-xs bg-slate-900 text-emerald-400 font-medium px-2 py-1 rounded">Cerrar lote</span>', {
            permanent: false,
            direction: 'top',
          });
          vertexMarker.on('click', (e: any) => {
            L.DomEvent.stopPropagation(e);
            handleCloseLot();
          });
        }

        drawMarkersRef.current.push(vertexMarker);
      });

      // Lines
      if (drawingVertices.length >= 2) {
        currentDrawLineRef.current = L.polyline(drawingVertices, {
          color: '#22d3ee',
          weight: 3,
          dashArray: '5, 10',
          className: 'draw-line-glow',
        }).addTo(map);
      }
    }
  }, [drawingVertices, step]);

  // Handle final lot layers rendering (Step 2, 3, 4)
  useEffect(() => {
    if (!mapRef.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapRef.current;

    // Clear old lot layers
    Object.keys(lotsLayersRef.current).forEach((id) => {
      map.removeLayer(lotsLayersRef.current[id]);
    });
    lotsLayersRef.current = {};

    // Clear old edit markers
    editMarkersRef.current.forEach((m) => map.removeLayer(m));
    editMarkersRef.current = [];

    // Redraw lots
    lots.forEach((lot) => {
      const isSelected = lot.id === selectedLotId;

      const polygonLayer = L.polygon(lot.polygon, {
        color: isSelected ? '#22c55e' : '#3b82f6',
        fillColor: isSelected ? '#10b981' : '#1e3a8a',
        fillOpacity: isSelected ? 0.35 : 0.20,
        weight: isSelected ? 4 : 2,
        dashArray: isSelected ? '' : '3, 6',
      }).addTo(map);

      // Tooltip with details
      polygonLayer.bindTooltip(
        `<div class="p-1.5 text-xs text-white font-medium">
          <p class="font-bold text-slate-100">${lot.name || 'Lote Sin Nombre'}</p>
          <p class="text-emerald-400 mt-0.5">${lot.area.toFixed(1)} ha</p>
          ${lot.crop ? `<p class="text-blue-300">${lot.crop}</p>` : ''}
         </div>`,
        {
          permanent: step === 4,
          direction: 'center',
          className: 'custom-map-tooltip',
        }
      );

      // Draggable vertex markers for selected lot in Step 2
      if (step === 2 && isSelected) {
        lot.polygon.forEach((vertex, idx) => {
          const vertexMarker = L.marker(vertex, {
            draggable: true,
            icon: L.divIcon({
              className: 'custom-edit-vertex-marker',
              html: `<div class="w-3.5 h-3.5 bg-yellow-400 border border-white rounded-full shadow-[0_0_8px_#facc15] cursor-move"></div>`,
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            }),
          }).addTo(map);

          vertexMarker.bindTooltip(
            `<span class="text-[10px] bg-slate-950 text-white border border-white/10 px-2 py-0.5 rounded-lg">
              Mover. Click derecho / Doble click para borrar.
            </span>`,
            { permanent: false, direction: 'top' }
          );

          // Drag vertex (native update for smooth visual feedback)
          vertexMarker.on('drag', (e: any) => {
            const newPos = e.target.getLatLng();
            const updatedPolygon = [...lot.polygon];
            updatedPolygon[idx] = [newPos.lat, newPos.lng];
            if (polygonLayer) {
              polygonLayer.setLatLngs(updatedPolygon);
            }
          });

          // Drag end (save changes to React state)
          vertexMarker.on('dragend', (e: any) => {
            const newPos = e.target.getLatLng();
            const updatedPolygon = [...lot.polygon];
            updatedPolygon[idx] = [newPos.lat, newPos.lng];
            const newArea = calculateAreaInHectares(updatedPolygon);
            if (onUpdateLotPolygonRef.current) {
              onUpdateLotPolygonRef.current(lot.id, updatedPolygon, newArea);
            }
          });

          // Delete vertex
          const handleDeleteVertex = (e: any) => {
            L.DomEvent.stopPropagation(e);
            if (lot.polygon.length <= 3) {
              alert('Un lote debe tener al menos 3 vértices.');
              return;
            }
            const updatedPolygon = lot.polygon.filter((_, i) => i !== idx);
            const newArea = calculateAreaInHectares(updatedPolygon);
            if (onUpdateLotPolygonRef.current) {
              onUpdateLotPolygonRef.current(lot.id, updatedPolygon, newArea);
            }
          };

          vertexMarker.on('contextmenu', handleDeleteVertex);
          vertexMarker.on('dblclick', handleDeleteVertex);

          editMarkersRef.current.push(vertexMarker);
        });
      }

      // Click to select/edit agronomic parameters (use ref to avoid stale state)
      // If selected and step === 2, clicking inserts a new vertex
      polygonLayer.on('click', (e: any) => {
        L.DomEvent.stopPropagation(e);
        if (stepRef.current === 2) {
          if (isSelected) {
            // Insert a new point at click location
            const clickLatLng: [number, number] = [e.latlng.lat, e.latlng.lng];
            const insertIdx = findInsertIndex(clickLatLng, lot.polygon);
            const updatedPolygon = [...lot.polygon];
            updatedPolygon.splice(insertIdx, 0, clickLatLng);
            const newArea = calculateAreaInHectares(updatedPolygon);
            if (onUpdateLotPolygonRef.current) {
              onUpdateLotPolygonRef.current(lot.id, updatedPolygon, newArea);
            }
          } else {
            onSelectLotRef.current(lot.id);
          }
        } else if (stepRef.current === 3) {
          onSelectLotRef.current(lot.id);
        }
      });

      lotsLayersRef.current[lot.id] = polygonLayer;
    });
  }, [lots, selectedLotId, step]);

  const handleCloseLot = () => {
    const vertices = drawingVerticesRef.current;
    if (vertices.length < 3) return;
    const area = calculateAreaInHectares(vertices);
    
    // Add lot
    onAddLotRef.current({
      id: Math.random().toString(36).substr(2, 9),
      name: `Lote ${lotsRef.current.length + 1}`,
      polygon: vertices,
      area: area,
    });

    // Reset vertices
    setDrawingVerticesRef.current([]);
  };

  const handleResetDrawing = () => {
    setDrawingVerticesRef.current([]);
  };

  return (
    <div className="relative w-full h-full min-h-[520px] rounded-[28px] overflow-hidden border border-white/80 shadow-soft">
      {/* Leaflet container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[520px] bg-slate-200" />

      <div className="absolute top-4 right-4 z-[999] rounded-2xl border border-white/80 bg-white/90 p-1.5 text-xs text-slate-800 shadow-soft backdrop-blur-md">
        <button
          type="button"
          onClick={() => setUseCurrentImage((value) => !value)}
          className={`rounded-xl px-3 py-1.5 font-bold transition ${
            useCurrentImage ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
          }`}
        >
          {useCurrentImage ? 'Imagen actual activa' : 'Usar imagen actual'}
        </button>
      </div>

      {useCurrentImage && (
        <div className="absolute bottom-4 left-4 z-[999] max-w-[calc(100%-2rem)] rounded-2xl border border-white/80 bg-white/90 px-3 py-2 text-xs text-slate-800 shadow-soft backdrop-blur-md">
          {sentinelLayerStatus === 'loading' && (
            <span className="font-semibold text-slate-700">Cargando imagen Sentinel-2...</span>
          )}
          {sentinelLayerStatus === 'ready' && (
            <span className="font-semibold text-slate-700">
              Sentinel-2 activo{sentinelLayerDate ? ` · ${sentinelLayerDate}` : ''}
            </span>
          )}
          {sentinelLayerStatus === 'error' && (
            <span className="font-semibold text-amber-700">{sentinelLayerError}</span>
          )}
        </div>
      )}

      <div className="absolute bottom-4 right-16 z-[999] rounded-2xl border border-white/80 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow-soft backdrop-blur-md">
        {useCurrentImage
          ? sentinelLayerDate
            ? `Imagen reciente · ${sentinelLayerDate}`
            : 'Imagen reciente Sentinel-2'
          : 'Imagen guía HD · no actual'}
      </div>

      {/* Floating map UI info */}
      <div className="absolute top-4 left-4 z-[999] flex flex-col gap-2 max-w-xs">
        {step === 1 && (
          <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-4 shadow-soft text-slate-900">
            <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
              <MapPin className="h-4 w-4" />
              <span>Establecimiento</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Haz clic en el mapa o arrastra el marcador rojo para fijar el centro de tu campo productivo.
            </p>
            <div className="mt-2.5 text-[11px] text-slate-600 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200 font-mono">
              Lat: {center[0].toFixed(5)}<br />
              Lng: {center[1].toFixed(5)}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-4 shadow-soft text-slate-900">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <Compass className="h-4 w-4" />
              <span>Trazado de Polígonos</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Haz clics sucesivos para delimitar las parcelas. Haz clic en el primer punto verde para cerrar y calcular las hectáreas del lote.
            </p>
            
            {drawingVertices.length > 0 && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleResetDrawing}
                  className="flex-1 flex items-center justify-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 py-1.5 px-2 rounded-xl text-xs font-semibold transition"
                >
                  <RefreshCw className="h-3 w-3" /> Reiniciar
                </button>
                {drawingVertices.length >= 3 && (
                  <button
                    onClick={handleCloseLot}
                    className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-2 rounded-xl text-xs font-bold transition"
                  >
                    <Check className="h-3 w-3" /> Cerrar Lote
                  </button>
                )}
              </div>
            )}
            
            <div className="mt-2.5 text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 flex justify-between">
              <span>Vértices marcados:</span>
              <span className="font-mono text-cyan-400 font-bold">{drawingVertices.length}</span>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-4 shadow-soft text-slate-900">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
              <Layers className="h-4 w-4" />
              <span>Parámetros del Lote</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Haz clic sobre cualquiera de los polígonos dibujados (se verán destacados en verde) para editar sus parámetros agronómicos.
            </p>
            <div className="mt-2.5 text-[11px] text-slate-600 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200">
              Lotes totales: <span className="text-slate-950 font-semibold font-mono">{lots.length}</span>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-4 shadow-soft text-slate-900">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
              <Check className="h-4 w-4" />
              <span>Vista Consolidada</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Tus lotes han sido creados y listados. Haz clic en "Comenzar a Monitorear" en el panel derecho para guardar y finalizar.
            </p>
          </div>
        )}
      </div>

      {/* CSS injection for Leaflet map styling */}
      <style jsx global>{`
        .leaflet-container {
          background: #090d16 !important;
        }
        .custom-map-tooltip {
          background: rgba(15, 23, 42, 0.9) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          border-radius: 12px !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4) !important;
          padding: 4px 8px !important;
        }
        .custom-map-tooltip::before {
          border-top-color: rgba(15, 23, 42, 0.9) !important;
        }
        .leaflet-bar {
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 12px !important;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
        }
        .leaflet-bar a {
          background-color: rgba(15, 23, 42, 0.85) !important;
          color: #f8fafc !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(8px);
          transition: all 0.2s;
        }
        .leaflet-bar a:hover {
          background-color: rgba(30, 41, 59, 0.95) !important;
          color: #22d3ee !important;
        }
        .draw-line-glow {
          filter: drop-shadow(0 0 6px rgba(34, 211, 238, 0.6));
        }
      `}</style>
    </div>
  );
}
