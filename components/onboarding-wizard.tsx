"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  MapPin, Compass, Settings2, Sparkles, ChevronLeft, ChevronRight, 
  Trash2, Sprout, Layers3, Droplet, CheckCircle, Info, ArrowLeft,
  Home
} from 'lucide-react';
import InteractiveOnboardingMap from './interactive-onboarding-map';
import { createFieldApi, updateFieldApi, deleteFieldApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface Lot {
  id: string;
  name: string;
  polygon: [number, number][];
  area: number;
  crop: string;
  soil: string;
  irrigation: string;
  // FAO-56 Specific parameters
  fc?: number; // Field Capacity (%)
  wp?: number; // Wilting Point (%)
  taw?: number; // Total Available Water (mm/m)
  initialWaterPct?: number | null;
  initialWaterMm?: number | null;
  initialWaterSource?: string | null;
  sowingDate?: string | null;
  emergenceDate?: string | null;
  expectedHarvestDate?: string | null;
  phenologicalStage?: string | null;
}

// Preset locations for Norpatagonia farming regions (Argentina)
const PRESET_REGIONS = [
  { name: 'Alto Valle (Río Negro)', lat: -39.0267, lng: -67.5750, desc: 'Fruticultura intensiva (manzanas, peras) y vid bajo riego' },
  { name: 'Valle Medio (Río Negro)', lat: -39.2667, lng: -65.6667, desc: 'Horticultura, pasturas y cereales en transición' },
  { name: 'San Patricio del Chañar (Neuquén)', lat: -38.6500, lng: -68.3167, desc: 'Vitivinicultura fina y fruticultura de precisión' },
  { name: 'Valle Inferior - IDEVI (Río Negro)', lat: -40.8135, lng: -62.9967, desc: 'Producción de frutos secos y forrajes bajo riego' },
  { name: 'Valle del Río Colorado (Buenos Aires/Río Negro)', lat: -39.4833, lng: -62.6833, desc: 'Principal zona productora de cebolla y semillas' }
];

const AUTO_SOIL_ID = 'AUTO';

// FAO/soil physical properties fallback lookup. AWC is shown as mm/m and
// backend combines it with crop root depth; it is not sent as measured TAW.
const SOIL_TYPES = [
  { id: AUTO_SOIL_ID, name: 'Auto / estimado', fc: null, wp: null, taw: null, desc: 'Permite avanzar si no se conoce la textura; menor precisión hasta validar el suelo' },
  { id: 'Arena Gruesa', name: 'Arena gruesa', fc: 8, wp: 4, taw: 80, desc: 'Muy baja retención; riegos cortos y frecuentes' },
  { id: 'Arena', name: 'Arena', fc: 14, wp: 4, taw: 150, desc: 'Baja retención y drenaje rápido' },
  { id: 'Arena Fina', name: 'Arena fina', fc: 14, wp: 4, taw: 150, desc: 'Retención baja a moderada' },
  { id: 'Arenoso', name: 'Arenoso', fc: 14, wp: 4, taw: 150, desc: 'Textura liviana con alta infiltración' },
  { id: 'Arenoso Franco', name: 'Arenoso franco', fc: 18, wp: 7, taw: 160, desc: 'Transición arenosa con algo más de reserva' },
  { id: 'Franco-Arenoso', name: 'Franco arenoso', fc: 26, wp: 9, taw: 180, desc: 'Buen drenaje y reserva media' },
  { id: 'Franco Arenoso Fino', name: 'Franco arenoso fino', fc: 26, wp: 9, taw: 180, desc: 'Reserva media con fracción fina mayor' },
  { id: 'Franco', name: 'Franco', fc: 30, wp: 13, taw: 180, desc: 'Equilibrio entre retención y aireación' },
  { id: 'Franco Limoso', name: 'Franco limoso', fc: 34, wp: 16, taw: 200, desc: 'Alta reserva de agua disponible' },
  { id: 'Limoso', name: 'Limoso', fc: 34, wp: 16, taw: 200, desc: 'Alta retención, sensible a estructura superficial' },
  { id: 'Franco Arcillo Arenoso', name: 'Franco arcillo arenoso', fc: 26, wp: 15, taw: 150, desc: 'Reserva media y drenaje más lento' },
  { id: 'Franco Arcilloso Arenoso', name: 'Franco arcilloso arenoso', fc: 26, wp: 15, taw: 150, desc: 'Variante equivalente de textura mixta' },
  { id: 'Franco Arcilloso', name: 'Franco arcilloso', fc: 34, wp: 18, taw: 180, desc: 'Buena reserva, infiltración moderada' },
  { id: 'Franco Arcillo Limoso', name: 'Franco arcillo limoso', fc: 43, wp: 20, taw: 190, desc: 'Alta retención con manejo cuidadoso de drenaje' },
  { id: 'Franco Arcilloso Limoso', name: 'Franco arcilloso limoso', fc: 43, wp: 20, taw: 190, desc: 'Variante equivalente de textura fina' },
  { id: 'Arcillo Arenoso', name: 'Arcillo arenoso', fc: 29, wp: 19, taw: 140, desc: 'Textura pesada con fracción arenosa' },
  { id: 'Arcilla Arenosa', name: 'Arcilla arenosa', fc: 29, wp: 19, taw: 140, desc: 'Retención moderada y drenaje lento' },
  { id: 'Arcilloso', name: 'Arcilloso', fc: 42, wp: 25, taw: 180, desc: 'Alta retención total, agua menos disponible' },
  { id: 'Arcilla', name: 'Arcilla', fc: 42, wp: 25, taw: 180, desc: 'Textura pesada; cuidar encharcamiento' },
  { id: 'Arcillo Limoso', name: 'Arcillo limoso', fc: 43, wp: 20, taw: 190, desc: 'Alta retención y drenaje lento' }
];

const INITIAL_WATER_OPTIONS = [
  { id: 'FIELD_CAPACITY', label: 'Suelo cargado', pct: 100, desc: 'El lote arranca cerca de capacidad de campo' },
  { id: 'MEDIUM', label: 'Humedad media', pct: 60, desc: 'Reserva intermedia cuando no hay medición' },
  { id: 'DRY', label: 'Suelo seco', pct: 30, desc: 'Condición inicial conservadora para lotes secos' },
  { id: 'MEASURED', label: 'Valor medido', pct: null, desc: 'Carga agua disponible inicial en milímetros' },
  { id: 'UNKNOWN', label: 'Auto / no sé', pct: null, desc: 'El backend usará capacidad de campo y avisará menor precisión' },
];

const PHENOLOGICAL_STAGES = [
  { id: '', label: 'Auto / sin etapa' },
  { id: 'inicial', label: 'Inicial' },
  { id: 'desarrollo', label: 'Desarrollo' },
  { id: 'media', label: 'Etapa media' },
  { id: 'maduracion', label: 'Maduración' },
];

const CROPS = [
  { id: 'Soja', name: 'Soja', icon: Sprout, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { id: 'Maíz', name: 'Maíz', icon: Layers3, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { id: 'Trigo', name: 'Trigo', icon: Sparkles, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  { id: 'Girasol', name: 'Girasol', icon: Droplet, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  { id: 'Cebada', name: 'Cebada', icon: Sparkles, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  { id: 'Avena', name: 'Avena', icon: Sparkles, color: 'text-lime-400 bg-lime-500/10 border-lime-500/20' },
  { id: 'Sorgo', name: 'Sorgo', icon: Layers3, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  { id: 'Arroz', name: 'Arroz', icon: Droplet, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
  { id: 'Algodón', name: 'Algodón', icon: Sprout, color: 'text-slate-300 bg-slate-500/10 border-slate-500/20' },
  { id: 'Maní', name: 'Maní', icon: Sprout, color: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
  { id: 'Caña de Azúcar', name: 'Caña de azúcar', icon: Layers3, color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  { id: 'Alfalfa', name: 'Alfalfa', icon: Sprout, color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
  { id: 'Papa', name: 'Papa', icon: Sprout, color: 'text-stone-300 bg-stone-500/10 border-stone-500/20' },
  { id: 'Tomate', name: 'Tomate', icon: Sprout, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  { id: 'Cebolla', name: 'Cebolla', icon: Sprout, color: 'text-violet-300 bg-violet-500/10 border-violet-500/20' },
  { id: 'Poroto', name: 'Poroto', icon: Sprout, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { id: 'Arveja', name: 'Arveja', icon: Sprout, color: 'text-green-300 bg-green-500/10 border-green-500/20' },
  { id: 'Garbanzo', name: 'Garbanzo', icon: Sprout, color: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20' },
  { id: 'Lenteja', name: 'Lenteja', icon: Sprout, color: 'text-lime-300 bg-lime-500/10 border-lime-500/20' },
  { id: 'Colza', name: 'Colza/Canola', icon: Sparkles, color: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20' },
  { id: 'Lino', name: 'Lino', icon: Sparkles, color: 'text-sky-300 bg-sky-500/10 border-sky-500/20' },
  { id: 'Vid', name: 'Vid', icon: Sprout, color: 'text-purple-300 bg-purple-500/10 border-purple-500/20' },
  { id: 'Citrus', name: 'Citrus', icon: Sprout, color: 'text-orange-300 bg-orange-500/10 border-orange-500/20' },
  { id: 'Olivo', name: 'Olivo', icon: Sprout, color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
  { id: 'Pastura', name: 'Pastura', icon: Sprout, color: 'text-green-400 bg-green-500/10 border-green-500/20' }
];

const IRRIGATION_SYSTEMS = [
  { id: 'Pivote', name: 'Pivote Central', desc: 'Ideal para parcelas circulares extensas' },
  { id: 'Goteo', name: 'Goteo Localizado', desc: 'Máxima eficiencia de uso del agua' },
  { id: 'Aspersión', name: 'Aspersión Fija/Móvil', desc: 'Riego uniforme a campo abierto' },
  { id: 'Gravedad', name: 'Gravedad / Surcos', desc: 'Riego tradicional por escurrimiento' }
];

export default function OnboardingWizard() {
  const router = useRouter();
  const auth = useAuth();
  const [step, setStep] = useState(1);
  
  // States
  const [center, setCenter] = useState<[number, number]>([-39.0267, -67.5750]); // Default: Alto Valle (Río Negro)
  const [lots, setLots] = useState<Lot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [drawingVertices, setDrawingVertices] = useState<[number, number][]>([]);

  // Predefined shapes drawing state
  const [drawMode, setDrawMode] = useState<'free' | 'circle' | 'rectangle'>('free');
  const [circleRadius, setCircleRadius] = useState<number>(400); // 400 meters radius (~50 hectares)
  const [rectWidth, setRectWidth] = useState<number>(500);       // 500 meters width
  const [rectHeight, setRectHeight] = useState<number>(500);     // 500 meters height

  // Agronomic form inputs for selected lot
  const [lotName, setLotName] = useState('');
  const [lotCrop, setLotCrop] = useState('');
  const [lotSoil, setLotSoil] = useState('');
  const [lotIrrigation, setLotIrrigation] = useState('');
  const [lotInitialWaterSource, setLotInitialWaterSource] = useState('UNKNOWN');
  const [lotInitialWaterMm, setLotInitialWaterMm] = useState('');
  const [lotSowingDate, setLotSowingDate] = useState('');
  const [lotEmergenceDate, setLotEmergenceDate] = useState('');
  const [lotExpectedHarvestDate, setLotExpectedHarvestDate] = useState('');
  const [lotPhenologicalStage, setLotPhenologicalStage] = useState('');

  // Setup completion animation state
  const [isFinishing, setIsFinishing] = useState(false);

  // Load existing fields on mount if they exist
  useEffect(() => {
    if (!auth.isLoading && auth.fields && auth.fields.length > 0) {
      const mappedLots: Lot[] = auth.fields.map((f, idx) => {
        let coords: [number, number][] = [];
        if (f.geometry_geojson?.coordinates?.[0]) {
          coords = f.geometry_geojson.coordinates[0].map((c: any) => [c[1], c[0]]);
          // Remove closing coordinate if it equals the first coordinate to avoid duplicate vertex markers
          if (coords.length > 1) {
            const first = coords[0];
            const last = coords[coords.length - 1];
            if (first[0] === last[0] && first[1] === last[1]) {
              coords.pop();
            }
          }
        }
        return {
          id: String(f.id),
          name: f.name,
          polygon: coords,
          area: f.area_ha,
          crop: f.crop_type,
          soil: f.soil_type || AUTO_SOIL_ID,
          irrigation: f.irrigation_system,
          fc: f.field_capacity_fc,
          wp: f.wilting_point_wp,
          taw: f.total_available_water_taw,
          initialWaterPct: f.initial_available_water_pct,
          initialWaterMm: f.initial_available_water_mm,
          initialWaterSource: f.initial_water_source || 'UNKNOWN',
          sowingDate: f.sowing_date,
          emergenceDate: f.emergence_date,
          expectedHarvestDate: f.expected_harvest_date,
          phenologicalStage: f.phenological_stage
        };
      });

      setLots(mappedLots);

      // Center the map on the first field coordinates
      const firstField = auth.fields[0];
      if (firstField?.geometry_geojson?.coordinates?.[0]?.[0]) {
        const poly = firstField.geometry_geojson.coordinates[0];
        const sum = poly.reduce((acc: number[], coord: number[]) => {
          const lat = typeof coord[1] === 'number' ? coord[1] : 0;
          const lng = typeof coord[0] === 'number' ? coord[0] : 0;
          return [acc[0] + lat, acc[1] + lng];
        }, [0, 0]);
        setCenter([sum[0] / poly.length, sum[1] / poly.length]);
      }

      // Automatically jump to Step 2
      setStep(2);
    }
  }, [auth.fields, auth.isLoading]);

  // Handle Preset selection
  const handlePresetSelect = (preset: typeof PRESET_REGIONS[0]) => {
    setCenter([preset.lat, preset.lng]);
  };

  // Add a newly drawn polygon as a lot
  const handleAddLot = (newLot: { id: string; name: string; polygon: [number, number][]; area: number }) => {
    // Estimate default agronomic parameters
    const defaultSoil = SOIL_TYPES[0];
    const crop = 'Maíz';
    const irrigation = 'Pivote';

    const fullLot: Lot = {
      ...newLot,
      crop,
      soil: defaultSoil.id,
      irrigation,
      fc: undefined,
      wp: undefined,
      taw: undefined,
      initialWaterPct: null,
      initialWaterMm: null,
      initialWaterSource: 'UNKNOWN',
      sowingDate: null,
      emergenceDate: null,
      expectedHarvestDate: null,
      phenologicalStage: null
    };

    setLots((prev) => [...prev, fullLot]);
    setSelectedLotId(fullLot.id);
    
    // Auto fill agronomic inputs for this new lot
    setLotName(fullLot.name);
    setLotCrop(crop);
    setLotSoil(defaultSoil.id);
    setLotIrrigation(irrigation);
    setLotInitialWaterSource('UNKNOWN');
    setLotInitialWaterMm('');
    setLotSowingDate('');
    setLotEmergenceDate('');
    setLotExpectedHarvestDate('');
    setLotPhenologicalStage('');
  };

  // Select lot for agronomic configuration
  const handleSelectLot = (id: string) => {
    setSelectedLotId(id);
    const lot = lots.find((l) => l.id === id);
    if (lot) {
      setLotName(lot.name);
      setLotCrop(lot.crop);
      setLotSoil(lot.soil);
      setLotIrrigation(lot.irrigation);
      setLotInitialWaterSource(lot.initialWaterSource || 'UNKNOWN');
      setLotInitialWaterMm(lot.initialWaterMm ? String(lot.initialWaterMm) : '');
      setLotSowingDate(lot.sowingDate || '');
      setLotEmergenceDate(lot.emergenceDate || '');
      setLotExpectedHarvestDate(lot.expectedHarvestDate || '');
      setLotPhenologicalStage(lot.phenologicalStage || '');
    }
  };

  // Update lot polygon from interactive map
  const handleUpdateLotPolygon = (id: string, newPolygon: [number, number][], newArea: number) => {
    setLots((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        return {
          ...l,
          polygon: newPolygon,
          area: newArea
        };
      })
    );
  };

  // Update agronomic data of the selected lot synchronously without stale closures
  const updateLotField = (field: 'name' | 'crop' | 'soil' | 'irrigation', value: string) => {
    if (!selectedLotId) return;

    if (field === 'name') setLotName(value);
    if (field === 'crop') setLotCrop(value);
    if (field === 'soil') setLotSoil(value);
    if (field === 'irrigation') setLotIrrigation(value);

    setLots((prev) =>
      prev.map((l) => {
        if (l.id !== selectedLotId) return l;

        const effectiveSoilId = field === 'soil' ? value : (l.soil || lotSoil);
        const matchedSoil = SOIL_TYPES.find((s) => s.id === effectiveSoilId) || SOIL_TYPES[0];

        return {
          ...l,
          name: field === 'name' ? value : l.name,
          crop: field === 'crop' ? value : l.crop,
          soil: effectiveSoilId,
          irrigation: field === 'irrigation' ? value : l.irrigation,
          fc: matchedSoil.fc ?? undefined,
          wp: matchedSoil.wp ?? undefined,
          taw: matchedSoil.taw ?? undefined,
        };
      })
    );
  };

  const updateSelectedLotAgronomicDetails = (updates: Partial<Lot>) => {
    if (!selectedLotId) return;
    setLots((prev) => prev.map((l) => (l.id === selectedLotId ? { ...l, ...updates } : l)));
  };

  // Remove a lot
  const handleDeleteLot = (id: string) => {
    setLots((prev) => prev.filter((l) => l.id !== id));
    if (selectedLotId === id) {
      setSelectedLotId(null);
    }
  };

  // Handle Wizard Navigation
  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (lots.length === 0) {
        alert('Por favor dibuja al menos un lote sobre el mapa para continuar.');
        return;
      }
      // If we have lots but none selected, select the first one
      if (!selectedLotId && lots.length > 0) {
        handleSelectLot(lots[0].id);
      }
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Complete onboarding flow, save results and redirect
  const handleFinish = async () => {
    setIsFinishing(true);
    
    // Save to localStorage as immediate offline cache
    localStorage.setItem('agromas_lots', JSON.stringify(lots));
    localStorage.setItem('agromas_center', JSON.stringify(center));

    // Persist each lot to the backend database via POST/PATCH/DELETE
    try {
      const existingFieldIds = auth.fields?.map((f) => String(f.id)) || [];
      const currentLotIds = lots.map((l) => String(l.id));
      const deletedFieldIds = existingFieldIds.filter((id) => !currentLotIds.includes(id));

      // 1. Delete fields removed by the user
      for (const idToDelete of deletedFieldIds) {
        await deleteFieldApi(idToDelete);
      }

      // 2. Create or update current lots
      for (const [idx, lot] of lots.entries()) {
        // Convert [lat, lng] to standard GeoJSON [lng, lat]
        const geojsonCoords = lot.polygon.map(([lat, lng]) => [lng, lat]);
        
        // Ensure closed ring in GeoJSON polygon
        if (geojsonCoords.length > 0) {
          const first = geojsonCoords[0];
          const last = geojsonCoords[geojsonCoords.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) {
            geojsonCoords.push([first[0], first[1]]);
          }
        }

        const payload = {
          name: lot.name || `Lote ${idx + 1}`,
          geometry_geojson: {
            type: 'Polygon' as const,
            coordinates: [geojsonCoords]
          },
          area_ha: parseFloat(lot.area.toFixed(2)),
          soil_type: lot.soil === AUTO_SOIL_ID ? null : lot.soil,
          crop_type: lot.crop,
          irrigation_system: lot.irrigation,
          initial_available_water_pct: lot.initialWaterPct ?? null,
          initial_available_water_mm: lot.initialWaterSource === 'MEASURED' ? lot.initialWaterMm ?? null : null,
          initial_water_source: lot.initialWaterSource || 'UNKNOWN',
          sowing_date: lot.sowingDate || null,
          emergence_date: lot.emergenceDate || null,
          expected_harvest_date: lot.expectedHarvestDate || null,
          phenological_stage: lot.phenologicalStage || null
        };

        const isExisting = existingFieldIds.includes(String(lot.id));
        if (isExisting) {
          // Update existing field
          await updateFieldApi(lot.id, payload);
        } else {
          // Create new field
          await createFieldApi(payload);
        }
      }

      // Refresh auth profile to update fields globally
      await auth.refreshProfile();
    } catch (err) {
      console.warn('Backend field sync error during onboarding:', err);
    }

    // Redirect to Dashboard
    setTimeout(() => {
      router.push('/');
    }, 1800);
  };

  const currentSelectedLot = lots.find((l) => l.id === selectedLotId);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* Dynamic Splash Screen on finish */}
      {isFinishing && (
        <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="relative flex items-center justify-center h-24 w-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 mb-6">
            <CheckCircle className="h-12 w-12 text-emerald-400 animate-bounce" />
            <div className="absolute inset-0 rounded-full border border-emerald-500/40 animate-ping" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            ¡Configuración Completada Exitosamente!
          </h2>
          <p className="text-slate-400 mt-3 max-w-md leading-relaxed text-sm">
            El Agente de Riego AgroMAS está procesando tus lotes con el modelo FAO-56. Cargando interfaz de monitoreo satelital...
          </p>
        </div>
      )}

      {/* Control Sidebar Panel */}
      <aside className="w-full lg:w-[450px] shrink-0 border-b lg:border-b-0 lg:border-r border-white/10 bg-slate-900/90 backdrop-blur-md p-6 flex flex-col justify-between shadow-2xl relative z-10">
        <div className="flex flex-col h-full justify-start">
          
          {/* Header */}
          <header className="border-b border-white/10 pb-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
                  <Sprout className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400">Onboarding</p>
                  <h1 className="text-lg font-bold text-white">Configuración del Campo</h1>
                </div>
              </div>

              <Link
                href="/"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Volver</span>
              </Link>
            </div>

            {auth.fields && auth.fields.length > 0 && (
              <div className="mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                <span>Ya cuentas con {auth.fields.length} lotes activos</span>
                <Link href="/" className="font-bold underline hover:text-emerald-200">
                  Ir al Tablero &rarr;
                </Link>
              </div>
            )}

            {/* Stepper Steps UI */}
            <nav className="mt-5 grid grid-cols-4 gap-2">
              {[
                { stepNum: 1, label: 'Campo', icon: MapPin },
                { stepNum: 2, label: 'Lotes', icon: Compass },
                { stepNum: 3, label: 'Cultivos', icon: Settings2 },
                { stepNum: 4, label: 'Resumen', icon: CheckCircle }
              ].map((s) => {
                const isActive = step >= s.stepNum;
                const isCurrent = step === s.stepNum;
                return (
                  <div key={s.stepNum} className="flex flex-col items-center">
                    <div 
                      className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                        isActive ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' : 'bg-slate-800'
                      } ${isCurrent ? 'ring-2 ring-emerald-500/30' : ''}`}
                    />
                    <span className={`text-[10px] mt-1.5 font-medium ${isCurrent ? 'text-emerald-400 font-bold' : isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </nav>
          </header>

          {/* Steps Content Area */}
          <main className="py-6 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
            
            {/* STEP 1: Ubicación */}
            {step === 1 && (
              <section className="space-y-5 animate-slide-in">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-sky-400" />
                    1. Centro del Establecimiento
                  </h2>
                  <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                    Localiza el casco o el centro geométrico de tu campo. Puedes usar las regiones productivas sugeridas o mover directamente el mapa.
                  </p>
                </div>

                {/* Preset List */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    Regiones Agropecuarias de Prueba
                  </label>
                  <div className="grid gap-2">
                    {PRESET_REGIONS.map((preset) => {
                      const isSelected = Math.abs(center[0] - preset.lat) < 0.001 && Math.abs(center[1] - preset.lng) < 0.001;
                      return (
                        <button
                          key={preset.name}
                          onClick={() => handlePresetSelect(preset)}
                          className={`text-left p-3 rounded-2xl border transition duration-200 ${
                            isSelected 
                              ? 'bg-sky-500/10 border-sky-400 text-white shadow-lg shadow-sky-500/5' 
                              : 'bg-slate-900/40 border-white/5 text-slate-300 hover:bg-slate-800/50 hover:border-white/10'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-sm">{preset.name}</span>
                            {isSelected && <span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{preset.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Inputs */}
                <div className="space-y-3 pt-2">
                  <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">
                    Coordenadas Geográficas Manuales
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 block">Latitud</span>
                      <input
                        type="number"
                        value={center[0]}
                        onChange={(e) => setCenter([parseFloat(e.target.value) || 0, center[1]])}
                        className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-400 transition"
                        step="0.00001"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 block">Longitud</span>
                      <input
                        type="number"
                        value={center[1]}
                        onChange={(e) => setCenter([center[0], parseFloat(e.target.value) || 0])}
                        className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-400 transition"
                        step="0.00001"
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* STEP 2: Delimitación */}
            {step === 2 && (
              <section className="space-y-5 animate-slide-in">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Compass className="h-5 w-5 text-emerald-400" />
                    2. Dibujar Lotes Productivos
                  </h2>
                  <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                    Elige una herramienta de trazado y haz clic sobre el mapa. Puedes trazar libremente o colocar formas de círculos o rectángulos.
                  </p>
                </div>

                {/* Drawing Tools Selector */}
                <div className="space-y-2">
                  <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                    Herramienta de Trazado
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'free', name: 'Libre', desc: 'Clics sucesivos' },
                      { id: 'circle', name: 'Círculo', desc: 'Pivote (r)' },
                      { id: 'rectangle', name: 'Rectángulo', desc: 'Ancho x Alto' }
                    ].map((mode) => {
                      const isSelected = drawMode === mode.id;
                      return (
                        <button
                          key={mode.id}
                          onClick={() => setDrawMode(mode.id as any)}
                          className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition ${
                            isSelected 
                              ? 'bg-emerald-500/10 border-emerald-400 text-emerald-400 shadow-md shadow-emerald-500/5' 
                              : 'bg-slate-950 border-white/5 text-slate-400 hover:bg-slate-800/30'
                          }`}
                        >
                          <span className="font-bold text-xs block">{mode.name}</span>
                          <span className="text-[9px] text-slate-500 mt-0.5 block">{mode.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Circles Parameter Slider */}
                {drawMode === 'circle' && (
                  <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Radio del Círculo</span>
                      <span className="font-bold font-mono text-emerald-400">{circleRadius} metros</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="1000"
                      step="25"
                      value={circleRadius}
                      onChange={(e) => setCircleRadius(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>100m (~3.1 ha)</span>
                      <span>1000m (~314.1 ha)</span>
                    </div>
                    <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 text-center text-xs">
                      <span className="text-slate-400">Superficie estimada: </span>
                      <span className="font-bold font-mono text-white">
                        {((Math.PI * circleRadius * circleRadius) / 10000).toFixed(1)} hectáreas
                      </span>
                    </div>
                  </div>
                )}

                {/* Rectangles Parameter Sliders */}
                {drawMode === 'rectangle' && (
                  <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Ancho (Este-Oeste)</span>
                        <span className="font-bold font-mono text-emerald-400">{rectWidth} metros</span>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="1500"
                        step="50"
                        value={rectWidth}
                        onChange={(e) => setRectWidth(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Alto (Norte-Sur)</span>
                        <span className="font-bold font-mono text-emerald-400">{rectHeight} metros</span>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="1500"
                        step="50"
                        value={rectHeight}
                        onChange={(e) => setRectHeight(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                      />
                    </div>

                    <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 text-center text-xs">
                      <span className="text-slate-400">Superficie estimada: </span>
                      <span className="font-bold font-mono text-white">
                        {((rectWidth * rectHeight) / 10000).toFixed(1)} hectáreas
                      </span>
                    </div>
                  </div>
                )}

                {/* List of current lots */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                      Lotes Creados ({lots.length})
                    </span>
                    {lots.length > 0 && (
                      <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                        {lots.reduce((acc, curr) => acc + curr.area, 0).toFixed(1)} ha Totales
                      </span>
                    )}
                  </div>

                  {lots.length === 0 ? (
                    <div className="border border-dashed border-white/10 rounded-2xl p-6 text-center text-slate-500 bg-slate-900/20">
                      <Layers3 className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                      <p className="text-xs">No has delimitado ningún lote aún.</p>
                      <p className="text-[10px] text-slate-600 mt-1">Haz clic en el mapa satelital a la derecha para empezar.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {lots.map((lot, idx) => (
                        <div
                          key={lot.id}
                          onClick={() => handleSelectLot(lot.id)}
                          className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition ${
                            selectedLotId === lot.id
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                              : 'bg-slate-900/40 border-white/5 hover:border-white/10'
                          }`}
                        >
                          <div>
                            <span className="font-semibold text-xs text-slate-400 uppercase tracking-widest block">Lote #{idx + 1}</span>
                            <span className="font-bold text-sm text-white block mt-0.5">{lot.name}</span>
                            <span className="text-[11px] text-emerald-400 font-mono mt-0.5 block">{lot.area.toFixed(2)} ha calculadas</span>
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLot(lot.id);
                            }}
                            className="p-2 hover:bg-rose-500/10 rounded-xl group transition"
                          >
                            <Trash2 className="h-4 w-4 text-slate-500 group-hover:text-rose-400 transition" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* STEP 3: Parámetros Agronómicos */}
            {step === 3 && (
              <section className="space-y-5 animate-slide-in">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Settings2 className="h-5 w-5 text-cyan-400" />
                    3. Parámetros del Cultivo y Suelo
                  </h2>
                  <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                    Selecciona un lote del mapa o de la lista inferior y completa su información agronómica crítica para configurar el balance hídrico diario FAO-56.
                  </p>
                </div>

                {/* Lot selector tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1.5">
                  {lots.map((lot, idx) => (
                    <button
                      key={lot.id}
                      onClick={() => handleSelectLot(lot.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition border ${
                        selectedLotId === lot.id
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                          : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {lot.name || `Lote ${idx + 1}`}
                    </button>
                  ))}
                </div>

                {currentSelectedLot ? (() => {
                  const activeSoil = SOIL_TYPES.find((s) => s.id === (currentSelectedLot.soil || lotSoil)) || SOIL_TYPES[0];
                  return (
                  <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 space-y-4">
                    
                    {/* Input Lote Name */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Nombre del Lote</label>
                      <input
                        type="text"
                        value={lotName}
                        onChange={(e) => updateLotField('name', e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 transition"
                      />
                    </div>

                    {/* Crop selector */}
                    <div className="space-y-2">
                      <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Tipo de Cultivo Actual</label>
                      <div className="grid grid-cols-2 gap-2">
                        {CROPS.map((crop) => {
                          const Icon = crop.icon;
                          const isSelected = (currentSelectedLot.crop || lotCrop) === crop.id;
                          return (
                            <button
                              key={crop.id}
                              onClick={() => updateLotField('crop', crop.id)}
                              className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition ${
                                isSelected 
                                  ? 'bg-cyan-500/10 border-cyan-400 text-white' 
                                  : 'bg-slate-950 border-white/5 text-slate-400 hover:bg-slate-800/30'
                              }`}
                            >
                              <div className={`p-1.5 rounded-lg ${crop.color}`}>
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <span>{crop.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Soil Texture selector */}
                    <div className="space-y-2">
                      <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block flex items-center justify-between">
                        <span>Textura del Suelo (Física)</span>
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 normal-case font-normal">
                          <Info className="h-3 w-3" /> FAO-56 Auto
                        </span>
                      </label>
                      
                      <div className="space-y-1.5">
                        {SOIL_TYPES.map((soil) => {
                          const isSelected = (currentSelectedLot.soil || lotSoil) === soil.id;
                          return (
                            <button
                              key={soil.id}
                              onClick={() => updateLotField('soil', soil.id)}
                              className={`w-full text-left p-2.5 rounded-xl border text-xs transition ${
                                isSelected 
                                  ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-sm ring-1 ring-cyan-400/30' 
                                  : 'bg-slate-950 border-white/5 text-slate-400 hover:bg-slate-800/30'
                              }`}
                            >
                              <div className="flex justify-between items-center font-bold text-slate-200">
                                <span>{soil.name}</span>
                                <span className={`text-[10px] font-mono ${isSelected ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}>
                                  {soil.taw === null ? 'Menor precisión' : `TAW: ${soil.taw} mm/m`}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{soil.desc}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Initial water state */}
                    <div className="space-y-2">
                      <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                        Estado hídrico inicial
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {INITIAL_WATER_OPTIONS.map((option) => {
                          const isSelected = (currentSelectedLot.initialWaterSource || lotInitialWaterSource) === option.id;
                          return (
                            <button
                              key={option.id}
                              onClick={() => {
                                setLotInitialWaterSource(option.id);
                                updateSelectedLotAgronomicDetails({
                                  initialWaterSource: option.id,
                                  initialWaterPct: option.pct,
                                  initialWaterMm: option.id === 'MEASURED' ? currentSelectedLot.initialWaterMm ?? null : null,
                                });
                              }}
                              className={`text-left rounded-xl border p-2.5 text-xs transition ${
                                isSelected
                                  ? 'bg-cyan-500/10 border-cyan-400 text-white'
                                  : 'bg-slate-950 border-white/5 text-slate-400 hover:bg-slate-800/30'
                              }`}
                            >
                              <span className="block font-bold text-slate-200">{option.label}</span>
                              <span className="mt-0.5 block text-[10px] leading-relaxed text-slate-500">{option.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                      {(currentSelectedLot.initialWaterSource || lotInitialWaterSource) === 'MEASURED' && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                            Agua disponible inicial medida (mm)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={currentSelectedLot.initialWaterMm ?? lotInitialWaterMm}
                            onChange={(e) => {
                              const value = e.target.value;
                              setLotInitialWaterMm(value);
                              updateSelectedLotAgronomicDetails({
                                initialWaterMm: value === '' ? null : Number(value),
                                initialWaterPct: null,
                                initialWaterSource: 'MEASURED',
                              });
                            }}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 transition"
                          />
                        </div>
                      )}
                    </div>

                    {/* Crop timing and stage */}
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Fecha de siembra</label>
                        <input
                          type="date"
                          value={currentSelectedLot.sowingDate || lotSowingDate}
                          onChange={(e) => {
                            setLotSowingDate(e.target.value);
                            updateSelectedLotAgronomicDetails({ sowingDate: e.target.value || null });
                          }}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 transition"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Emergencia</label>
                        <input
                          type="date"
                          value={currentSelectedLot.emergenceDate || lotEmergenceDate}
                          onChange={(e) => {
                            setLotEmergenceDate(e.target.value);
                            updateSelectedLotAgronomicDetails({ emergenceDate: e.target.value || null });
                          }}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 transition"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Cosecha estimada</label>
                        <input
                          type="date"
                          value={currentSelectedLot.expectedHarvestDate || lotExpectedHarvestDate}
                          onChange={(e) => {
                            setLotExpectedHarvestDate(e.target.value);
                            updateSelectedLotAgronomicDetails({ expectedHarvestDate: e.target.value || null });
                          }}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 transition"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Etapa fenológica</label>
                        <select
                          value={currentSelectedLot.phenologicalStage || lotPhenologicalStage}
                          onChange={(e) => {
                            setLotPhenologicalStage(e.target.value);
                            updateSelectedLotAgronomicDetails({ phenologicalStage: e.target.value || null });
                          }}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 transition"
                        >
                          {PHENOLOGICAL_STAGES.map((stage) => (
                            <option key={stage.id || 'auto'} value={stage.id}>
                              {stage.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Irrigation System selector */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Sistema de Riego Instalado</label>
                      <select
                        value={currentSelectedLot.irrigation || lotIrrigation}
                        onChange={(e) => updateLotField('irrigation', e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 transition"
                      >
                        {IRRIGATION_SYSTEMS.map((sys) => (
                          <option key={sys.id} value={sys.id}>
                            {sys.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Dynamic Agronomic Estimates display (FAO-56 parameters) */}
                    <div className="bg-black/50 border border-white/5 rounded-xl p-3 space-y-2 text-[11px]">
                      <div className="flex items-center justify-between border-b border-white/5 pb-1">
                        <p className="font-bold text-slate-300 uppercase tracking-widest text-[9px]">
                          Valores Agronómicos Estimados (FAO-56)
                        </p>
                        <span className="text-[9px] text-slate-500 font-mono">
                          TAW = 1000 × (FC - WP)
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-slate-950 p-2 rounded-lg border border-white/5">
                          <span className="text-slate-500 block text-[10px]">Cap. Campo (FC)</span>
                          <span className="text-sm font-semibold text-white font-mono">{activeSoil.fc ?? '-'}{activeSoil.fc === null ? '' : '%'}</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-lg border border-white/5">
                          <span className="text-slate-500 block text-[10px]">Pto. Marchitez (WP)</span>
                          <span className="text-sm font-semibold text-amber-300 font-mono">{activeSoil.wp ?? '-'}{activeSoil.wp === null ? '' : '%'}</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-lg border border-white/5">
                          <span className="text-slate-500 block text-[10px]">Agua Útil (TAW)</span>
                          <span className="text-sm font-semibold text-sky-300 font-mono">{activeSoil.taw === null ? 'Auto' : `${activeSoil.taw} mm/m`}</span>
                        </div>
                      </div>
                    </div>

                  </div>
                  );
                })() : (
                  <div className="border border-dashed border-white/10 rounded-2xl p-6 text-center text-slate-500 bg-slate-900/20">
                    <p className="text-xs">No hay lotes para parametrizar.</p>
                    <p className="text-[10px] text-slate-600 mt-1">Retrocede al Paso 2 para delimitar tus parcelas.</p>
                  </div>
                )}
              </section>
            )}

            {/* STEP 4: Resumen y Finalizar */}
            {step === 4 && (
              <section className="space-y-5 animate-slide-in">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-amber-400" />
                    4. Resumen de la Estructura
                  </h2>
                  <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                    Confirma que la delimitación espacial y los cultivos asignados coincidan con la realidad operativa del campo antes de iniciar el monitoreo diario.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 space-y-3">
                    <p className="text-xs uppercase tracking-wider text-slate-400 font-bold border-b border-white/5 pb-2">
                      Ficha de Establecimiento
                    </p>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Coordenadas del Centro</span>
                      <span className="font-mono text-white text-right">
                        {center[0].toFixed(4)}, {center[1].toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Cantidad de Lotes</span>
                      <span className="font-bold text-white">{lots.length} lotes</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Superficie Total Delimitada</span>
                      <span className="font-bold text-emerald-400 font-mono">
                        {lots.reduce((acc, curr) => acc + curr.area, 0).toFixed(1)} ha
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block">
                      Detalle de Lotes a Monitorear
                    </span>

                    {lots.map((lot, idx) => (
                      <div key={lot.id} className="bg-slate-900/40 border border-white/5 rounded-2xl p-3.5 flex justify-between items-center text-xs">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-400 text-[10px]">LOTE #{idx + 1}</span>
                          <p className="font-bold text-sm text-white">{lot.name}</p>
                          <div className="flex gap-2 items-center text-[10px] text-slate-400 mt-1">
                            <span className="bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{lot.crop}</span>
                            <span className="bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{lot.soil}</span>
                            <span className="bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{lot.irrigation}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-sm text-emerald-400 font-mono">{lot.area.toFixed(1)} ha</span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">TAW: {lot.taw} mm</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

          </main>
        </div>

        {/* Footer Actions Panel */}
        <footer className="border-t border-white/10 pt-4 flex gap-3">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex items-center justify-center gap-1.5 border border-white/15 bg-white/5 hover:bg-white/10 text-white rounded-2xl px-4 py-3 text-sm font-semibold transition"
            >
              <ChevronLeft className="h-4 w-4" /> Atrás
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-slate-950 rounded-2xl py-3 text-sm font-bold shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:scale-[1.01] transition duration-200"
            >
              Siguiente <ChevronRight className="h-4 w-4 text-slate-950" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-500 hover:to-cyan-500 text-slate-950 rounded-2xl py-3 text-sm font-bold shadow-lg shadow-emerald-400/20 hover:scale-[1.01] transition duration-200"
            >
              Comenzar a Monitorear <CheckCircle className="h-4 w-4 text-slate-950" />
            </button>
          )}
        </footer>
      </aside>

      {/* Map Content Pane */}
      <section className="flex-1 p-4 lg:p-6 bg-slate-950 flex flex-col justify-between min-h-[500px] lg:h-screen relative">
        <InteractiveOnboardingMap
          step={step}
          center={center}
          onCenterChange={setCenter}
          lots={lots}
          selectedLotId={selectedLotId}
          onSelectLot={handleSelectLot}
          onAddLot={handleAddLot}
          drawingVertices={drawingVertices}
          setDrawingVertices={setDrawingVertices}
          drawMode={drawMode}
          circleRadius={circleRadius}
          rectWidth={rectWidth}
          rectHeight={rectHeight}
          onUpdateLotPolygon={handleUpdateLotPolygon}
        />
      </section>

      {/* Embedded Animations & Transitions style */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
