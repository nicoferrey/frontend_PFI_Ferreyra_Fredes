"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MapPin, Compass, Settings2, Sparkles, ChevronLeft, ChevronRight, 
  Trash2, Sprout, Layers3, Droplet, CheckCircle, Info 
} from 'lucide-react';
import InteractiveOnboardingMap from './interactive-onboarding-map';
import { createFieldApi } from '@/lib/api';

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
}

// Preset locations for Argentinian farming regions (perfect for demo/thesis)
const PRESET_REGIONS = [
  { name: 'Pergamino (Buenos Aires)', lat: -33.8906, lng: -60.5732, desc: 'Zona núcleo de cultivos anuales' },
  { name: 'Tandil (Buenos Aires)', lat: -37.3216, lng: -59.1332, desc: 'Suelos con relieve y cultivos de invierno' },
  { name: 'Río Cuarto (Córdoba)', lat: -33.1232, lng: -64.3492, desc: 'Clima semiárido con riego por pivote' },
  { name: 'Balcarce (Buenos Aires)', lat: -37.8482, lng: -58.2612, desc: 'Papa, maíz y trigo de alto rendimiento' },
  { name: 'San Francisco (Córdoba)', lat: -31.4278, lng: -62.0827, desc: 'Cuenca lechera y pasturas' }
];

// FAO-56 soil parameters lookup
const SOIL_TYPES = [
  { id: 'Franco', name: 'Franco (Loam)', fc: 28, wp: 14, taw: 140, desc: 'Excelente retención y drenaje moderado' },
  { id: 'Franco-Arenoso', name: 'Franco Arenoso (Sandy Loam)', fc: 18, wp: 8, taw: 100, desc: 'Drenaje rápido, requiere riegos más frecuentes' },
  { id: 'Arcilloso', name: 'Arcilloso (Clay)', fc: 38, wp: 22, taw: 160, desc: 'Alta retención hídrica, drenaje lento' },
  { id: 'Arenoso', name: 'Arenoso (Sand)', fc: 10, wp: 5, taw: 50, desc: 'Muy baja capacidad de almacenamiento' }
];

const CROPS = [
  { id: 'Soja', name: 'Soja', icon: Sprout, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { id: 'Maíz', name: 'Maíz', icon: Layers3, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { id: 'Trigo', name: 'Trigo', icon: Sparkles, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  { id: 'Girasol', name: 'Girasol', icon: Droplet, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' }
];

const IRRIGATION_SYSTEMS = [
  { id: 'Pivote', name: 'Pivote Central', desc: 'Ideal para parcelas circulares extensas' },
  { id: 'Goteo', name: 'Goteo Localizado', desc: 'Máxima eficiencia de uso del agua' },
  { id: 'Aspersión', name: 'Aspersión Fija/Móvil', desc: 'Riego uniforme a campo abierto' },
  { id: 'Gravedad', name: 'Gravedad / Surcos', desc: 'Riego tradicional por escurrimiento' }
];

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  
  // States
  const [center, setCenter] = useState<[number, number]>([-33.8906, -60.5732]); // Default: Pergamino
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

  // Setup completion animation state
  const [isFinishing, setIsFinishing] = useState(false);

  // Handle Preset selection
  const handlePresetSelect = (preset: typeof PRESET_REGIONS[0]) => {
    setCenter([preset.lat, preset.lng]);
  };

  // Add a newly drawn polygon as a lot
  const handleAddLot = (newLot: { id: string; name: string; polygon: [number, number][]; area: number }) => {
    // Estimate default agronomic parameters
    const defaultSoil = SOIL_TYPES[0]; // Franco
    const crop = 'Maíz';
    const irrigation = 'Pivote';

    const fullLot: Lot = {
      ...newLot,
      crop,
      soil: defaultSoil.id,
      irrigation,
      fc: defaultSoil.fc,
      wp: defaultSoil.wp,
      taw: defaultSoil.taw
    };

    setLots((prev) => [...prev, fullLot]);
    setSelectedLotId(fullLot.id);
    
    // Auto fill agronomic inputs for this new lot
    setLotName(fullLot.name);
    setLotCrop(crop);
    setLotSoil(defaultSoil.id);
    setLotIrrigation(irrigation);
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
      
      // If we are in Step 2, auto-advance to Step 3 so they configure it!
      if (step === 2) {
        setStep(3);
      }
    }
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
          fc: matchedSoil.fc,
          wp: matchedSoil.wp,
          taw: matchedSoil.taw,
        };
      })
    );
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

    // Persist each lot to the backend database via POST /api/v1/fields
    try {
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

        await createFieldApi({
          name: lot.name || `Lote ${idx + 1}`,
          geometry_geojson: {
            type: 'Polygon',
            coordinates: [geojsonCoords]
          },
          area_ha: parseFloat(lot.area.toFixed(2)),
          soil_type: lot.soil,
          crop_type: lot.crop,
          irrigation_system: lot.irrigation,
          field_capacity_fc: lot.fc,
          wilting_point_wp: lot.wp,
          total_available_water_taw: lot.taw
        });
      }
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
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
                <Sprout className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400">Onboarding</p>
                <h1 className="text-lg font-bold text-white">Configuración del Campo</h1>
              </div>
            </div>

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
                                  TAW: {soil.taw} mm/m
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{soil.desc}</p>
                            </button>
                          );
                        })}
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
                          <span className="text-sm font-semibold text-white font-mono">{activeSoil.fc}%</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-lg border border-white/5">
                          <span className="text-slate-500 block text-[10px]">Pto. Marchitez (WP)</span>
                          <span className="text-sm font-semibold text-amber-300 font-mono">{activeSoil.wp}%</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-lg border border-white/5">
                          <span className="text-slate-500 block text-[10px]">Agua Útil (TAW)</span>
                          <span className="text-sm font-semibold text-sky-300 font-mono">{activeSoil.taw} mm/m</span>
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
