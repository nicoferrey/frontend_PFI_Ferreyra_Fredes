"use client";

import React, { useState, useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  CloudRain,
  Download,
  Droplet,
  Droplets,
  FileSpreadsheet,
  Gauge,
  Info,
  Layers,
  Leaf,
  Maximize2,
  Plus,
  Radio,
  Satellite,
  ShieldAlert,
  Sparkles,
  Sun,
  Timer,
  Waves,
  X
} from 'lucide-react';

export interface LotHydricData {
  id: string;
  name: string;
  crop: string;
  areaHa: number;
  soilType: string;
  irrigationSystem: string;
  // Hydric Status
  hydricStatus: 'Normal' | 'Atencion' | 'Critico';
  deficitDr_mm: number;
  waterAvailableAU_mm: number;
  waterAvailableAU_pct: number;
  easilyAvailableAFD_mm: number;
  totalAvailableTAW_mm: number;
  etcToday_mm: number;
  et0Today_mm: number;
  ndviCurrent: number;
  kcSatellite: number;
  irrigationPriority: 'Alta' | 'Media' | 'Baja';
  priorityReason: string;
  pumpingWindow: string;
  lastIrrigationDate: string;
  lastIrrigationAmount_mm: number;
  lastRainDate: string;
  lastRainAmount_mm: number;
  // History series
  timeline: Array<{
    date: string;
    dayLabel: string;
    dr_mm: number;
    au_mm: number;
    afd_mm: number;
    taw_mm: number;
    irrigation_mm?: number;
    rain_mm?: number;
    ndvi?: number;
    kc?: number;
  }>;
}

interface LotDetailViewProps {
  lot: LotHydricData;
  onRegisterIrrigation?: (lotId: string, irrigationData: { date: string; amount_mm: number; method: string; notes?: string }) => void;
  className?: string;
}

export function LotDetailView({ lot, onRegisterIrrigation, className = "" }: LotDetailViewProps) {
  const [timeScale, setTimeScale] = useState<'7d' | '14d' | '30d'>('7d');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'balance' | 'events' | 'specs'>('balance');

  // Form State for CU-05 (Registrar Riego)
  const [irrigationForm, setIrrigationForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '06:00',
    amount_mm: '18',
    method: lot.irrigationSystem || 'Pivote Central',
    notes: 'Riego nocturno optimizado según ventana MAS.',
  });

  const [formSuccess, setFormSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status visual styles
  const statusConfig = {
    Normal: {
      label: 'Normal',
      badgeClass: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400',
      icon: CheckCircle2,
      dotClass: 'bg-emerald-500 ring-emerald-200 dark:ring-emerald-900',
      bgGradient: 'from-emerald-500/10 to-transparent',
    },
    Atencion: {
      label: 'Atención',
      badgeClass: 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400',
      icon: AlertTriangle,
      dotClass: 'bg-amber-500 ring-amber-200 dark:ring-amber-900',
      bgGradient: 'from-amber-500/10 to-transparent',
    },
    Critico: {
      label: 'Crítico',
      badgeClass: 'bg-rose-500/15 text-rose-600 border-rose-500/30 dark:text-rose-400',
      icon: AlertCircle,
      dotClass: 'bg-rose-500 ring-rose-200 dark:ring-rose-900',
      bgGradient: 'from-rose-500/10 to-transparent',
    },
  }[lot.hydricStatus] || {
    label: 'Normal',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
    icon: CheckCircle2,
    dotClass: 'bg-emerald-500 ring-emerald-200',
    bgGradient: 'from-emerald-500/10 to-transparent',
  };

  const priorityConfig = {
    Alta: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    Media: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    Baja: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  }[lot.irrigationPriority];

  // Filter timeline based on scale
  const displayedTimeline = useMemo(() => {
    const days = timeScale === '7d' ? 7 : timeScale === '14d' ? 14 : 30;
    return lot.timeline.slice(-days);
  }, [lot.timeline, timeScale]);

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      'Fecha',
      'Dia',
      'Deficit_Dr_mm',
      'Agua_Util_AU_mm',
      'Agua_Facilmente_Disp_AFD_mm',
      'Capacidad_Campo_TAW_mm',
      'Riego_mm',
      'Lluvia_mm',
      'NDVI',
      'Kc'
    ];

    const rows = lot.timeline.map((item) => [
      item.date,
      item.dayLabel,
      item.dr_mm.toFixed(1),
      item.au_mm.toFixed(1),
      item.afd_mm.toFixed(1),
      item.taw_mm.toFixed(1),
      item.irrigation_mm || 0,
      item.rain_mm || 0,
      item.ndvi || lot.ndviCurrent,
      item.kc || lot.kcSatellite
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `balance_hidrico_${lot.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit CU-05 form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (onRegisterIrrigation) {
        await onRegisterIrrigation(lot.id, {
          date: `${irrigationForm.date} ${irrigationForm.time}`,
          amount_mm: parseFloat(irrigationForm.amount_mm) || 0,
          method: irrigationForm.method,
          notes: irrigationForm.notes,
        });
      }
      setFormSuccess(true);
      setTimeout(() => {
        setFormSuccess(false);
        setIsRegisterModalOpen(false);
      }, 1200);
    } catch (err) {
      console.error('Failed to submit irrigation event:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const StatusIcon = statusConfig.icon;

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* 1. TOP SUMMARY CARD: Lot Header & Quick FAO-56 Matrix */}
      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-soft backdrop-blur-md dark:border-white/10 dark:bg-slate-900/90">
        
        {/* Header Title + Action Buttons */}
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between dark:border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <span className={`h-3.5 w-3.5 rounded-full ring-4 ${statusConfig.dotClass}`} />
              <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
                {lot.name}
              </h2>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${statusConfig.badgeClass}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                Estado: {statusConfig.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Cultivo: <strong className="text-slate-800 dark:text-slate-200">{lot.crop}</strong> &bull; Superficie: <strong>{lot.areaHa} ha</strong> &bull; Sistema: <strong>{lot.irrigationSystem}</strong> &bull; Suelo: <strong>{lot.soilType}</strong>
            </p>
          </div>

          {/* Action Buttons: Registrar Riego (CU-05) & Exportar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-crop-600 to-water-600 hover:from-crop-500 hover:to-water-500 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition duration-150"
            >
              <Plus className="h-4 w-4" />
              Registrar Riego (CU-05)
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Download className="h-4 w-4 text-crop-600" />
              Exportar Datos
            </button>
          </div>
        </div>

        {/* 2. GRID OF 10 SPECIFIC TECHNICAL INDICATORS */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          
          {/* 1. Déficit Hídrico Dr */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Déficit hídrico (Dr)</span>
              <Droplet className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <p className="mt-1.5 text-xl font-extrabold text-slate-900 dark:text-white">
              {lot.deficitDr_mm.toFixed(1)} <span className="text-xs font-medium text-slate-500">mm</span>
            </p>
            <span className="text-[10px] text-slate-400">Lámina neta faltante</span>
          </div>

          {/* 2. Agua Útil AU */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Agua Útil (AU)</span>
              <Waves className="h-3.5 w-3.5 text-water-600" />
            </div>
            <p className="mt-1.5 text-xl font-extrabold text-slate-900 dark:text-white">
              {lot.waterAvailableAU_mm.toFixed(1)} <span className="text-xs font-medium text-slate-500">mm</span>
            </p>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              {lot.waterAvailableAU_pct}% de TAW
            </span>
          </div>

          {/* 3. Agua Fácilmente Disponible AFD */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Umbral AFD (RAW)</span>
              <Gauge className="h-3.5 w-3.5 text-sky-500" />
            </div>
            <p className="mt-1.5 text-xl font-extrabold text-slate-900 dark:text-white">
              {lot.easilyAvailableAFD_mm.toFixed(1)} <span className="text-xs font-medium text-slate-500">mm</span>
            </p>
            <span className="text-[10px] text-slate-400">Límite antes de estrés</span>
          </div>

          {/* 4. ETc del día */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>ETc del día</span>
              <Sun className="h-3.5 w-3.5 text-orange-500" />
            </div>
            <p className="mt-1.5 text-xl font-extrabold text-slate-900 dark:text-white">
              {lot.etcToday_mm.toFixed(1)} <span className="text-xs font-medium text-slate-500">mm/día</span>
            </p>
            <span className="text-[10px] text-slate-400">ET0: {lot.et0Today_mm.toFixed(1)} mm</span>
          </div>

          {/* 5. NDVI Actual */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>NDVI Satelital</span>
              <Satellite className="h-3.5 w-3.5 text-crop-600" />
            </div>
            <p className="mt-1.5 text-xl font-extrabold text-slate-900 dark:text-white">
              {lot.ndviCurrent.toFixed(2)}
            </p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Vigor vegetativo alto</span>
          </div>

          {/* 6. Kc Dinámico */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Kc satélite</span>
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <p className="mt-1.5 text-xl font-extrabold text-slate-900 dark:text-white">
              {lot.kcSatellite.toFixed(2)}
            </p>
            <span className="text-[10px] text-slate-400">Ajustado por Sentinel-2</span>
          </div>

          {/* 7. Prioridad de Riego */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Prioridad riego</span>
              <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
            </div>
            <div className="mt-1.5">
              <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-bold ${priorityConfig}`}>
                {lot.irrigationPriority}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 line-clamp-1">{lot.priorityReason}</span>
          </div>

          {/* 8. Ventana recomendada para bombeo */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Ventana bombeo</span>
              <Clock className="h-3.5 w-3.5 text-sky-600" />
            </div>
            <p className="mt-1.5 text-sm font-bold text-slate-900 dark:text-white">
              {lot.pumpingWindow}
            </p>
            <span className="text-[10px] text-water-600 font-medium">Tarifa eléctrica valle</span>
          </div>

          {/* 9. Último riego registrado */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Último riego</span>
              <Droplets className="h-3.5 w-3.5 text-water-600" />
            </div>
            <p className="mt-1.5 text-sm font-bold text-slate-900 dark:text-white">
              {lot.lastIrrigationDate}
            </p>
            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
              {lot.lastIrrigationAmount_mm} mm aplicados
            </span>
          </div>

          {/* 10. Última lluvia registrada */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Última lluvia</span>
              <CloudRain className="h-3.5 w-3.5 text-sky-500" />
            </div>
            <p className="mt-1.5 text-sm font-bold text-slate-900 dark:text-white">
              {lot.lastRainDate}
            </p>
            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
              {lot.lastRainAmount_mm} mm registrados
            </span>
          </div>

        </div>

      </div>

      {/* 3. DETAILED FAO-56 TEMPORAL CHART & EVENT MARKERS */}
      <div className="overflow-hidden rounded-[28px] border border-slate-900 bg-slate-950 p-6 text-white shadow-soft">
        
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.24em] text-slate-400">FAO-56 Balance Hídrico</span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                Sentinel-2 + Estación Meteorológica
              </span>
            </div>
            <h3 className="mt-1 text-xl font-bold text-white">
              Evolución Temporal de Déficit ($D_r$), Agua Útil ($AU$) y Umbral ($AFD$)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Los puntos marcados indican eventos de aplicación de riego (💧) y precipitaciones efectivas (🌧️).
            </p>
          </div>

          {/* Scale Buttons (7d, 14d, 30d) */}
          <div className="flex items-center gap-1.5 rounded-2xl bg-white/10 p-1">
            {(['7d', '14d', '30d'] as const).map((scale) => (
              <button
                key={scale}
                onClick={() => setTimeScale(scale)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                  timeScale === scale
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {scale === '7d' ? '7 Días' : scale === '14d' ? '14 Días' : '30 Días'}
              </button>
            ))}
          </div>
        </div>

        {/* Chart area */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
          
          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.8),rgba(2,6,23,0.95))] p-4">
            
            {/* Legend guide */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" /> Agua Útil (AU)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-amber-500" /> Déficit (Dr)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 bg-sky-400 border-dashed" /> Umbral AFD ({lot.easilyAvailableAFD_mm.toFixed(0)} mm)
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Capacidad Campo TAW = {lot.totalAvailableTAW_mm} mm</span>
            </div>

            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={displayedTimeline} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="auGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                  
                  <XAxis 
                    dataKey="dayLabel" 
                    tick={{ fill: '#94a3b8', fontSize: 11 }} 
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} 
                    tickLine={false} 
                  />
                  
                  <YAxis 
                    tick={{ fill: '#94a3b8', fontSize: 11 }} 
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} 
                    tickLine={false} 
                    domain={[0, Math.ceil(lot.totalAvailableTAW_mm * 1.05)]}
                    unit=" mm"
                  />
                  
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-2xl border border-slate-700 bg-slate-900/95 p-3.5 text-xs text-white shadow-2xl backdrop-blur-md">
                            <p className="font-bold text-slate-200 border-b border-slate-800 pb-1 mb-2">
                              {data.date} ({data.dayLabel})
                            </p>
                            <div className="space-y-1">
                              <p className="text-emerald-400 font-semibold">Agua Útil (AU): {data.au_mm} mm</p>
                              <p className="text-amber-400 font-semibold">Déficit (Dr): {data.dr_mm} mm</p>
                              <p className="text-sky-300">Umbral AFD: {data.afd_mm} mm</p>
                              {data.irrigation_mm ? (
                                <p className="text-cyan-300 font-bold mt-1 bg-cyan-500/20 px-2 py-0.5 rounded">
                                  💧 Riego: +{data.irrigation_mm} mm
                                </p>
                              ) : null}
                              {data.rain_mm ? (
                                <p className="text-blue-300 font-bold mt-1 bg-blue-500/20 px-2 py-0.5 rounded">
                                  🌧️ Lluvia: +{data.rain_mm} mm
                                </p>
                              ) : null}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  
                  {/* Reference line for AFD threshold */}
                  <ReferenceLine 
                    y={lot.easilyAvailableAFD_mm} 
                    stroke="#38bdf8" 
                    strokeDasharray="5 5" 
                    strokeWidth={2} 
                    label={{ value: 'AFD (Umbral RAW)', fill: '#7dd3fc', fontSize: 10, position: 'insideTopRight' }} 
                  />

                  {/* Reference line for TAW */}
                  <ReferenceLine 
                    y={lot.totalAvailableTAW_mm} 
                    stroke="#94a3b8" 
                    strokeDasharray="3 3" 
                    strokeWidth={1} 
                    label={{ value: 'TAW (Capacidad Campo)', fill: '#cbd5e1', fontSize: 10, position: 'insideTopLeft' }} 
                  />

                  <Area 
                    type="monotone" 
                    dataKey="au_mm" 
                    name="Agua Útil (AU)" 
                    stroke="#10b981" 
                    fill="url(#auGrad)" 
                    strokeWidth={2.5} 
                  />

                  <Line 
                    type="monotone" 
                    dataKey="dr_mm" 
                    name="Déficit (Dr)" 
                    stroke="#f59e0b" 
                    strokeWidth={2.5} 
                    dot={{ r: 3, fill: '#f59e0b' }} 
                    activeDot={{ r: 6 }} 
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

          </div>

          {/* Event markers & MAS agronomic advice */}
          <div className="flex flex-col justify-between gap-4 rounded-[24px] border border-white/10 bg-white/5 p-5">
            
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                  Marcadores de Eventos Registrados
                </h4>
              </div>

              <div className="mt-3 space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {displayedTimeline
                  .filter((t) => t.irrigation_mm || t.rain_mm)
                  .map((evt, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl bg-black/30 border border-white/5 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">
                          {evt.irrigation_mm ? '💧' : '🌧️'}
                        </span>
                        <div>
                          <p className="font-semibold text-white">
                            {evt.irrigation_mm ? `Riego programado (+${evt.irrigation_mm} mm)` : `Lluvia (+${evt.rain_mm} mm)`}
                          </p>
                          <p className="text-[10px] text-slate-400">{evt.date}</p>
                        </div>
                      </div>
                      <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-mono text-slate-200">
                        {evt.irrigation_mm ? 'CU-05' : 'Metar'}
                      </span>
                    </div>
                  ))}
                {displayedTimeline.filter((t) => t.irrigation_mm || t.rain_mm).length === 0 && (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    No hay eventos de riego o lluvia en este rango seleccionado.
                  </p>
                )}
              </div>
            </div>

            {/* MAS Decision Support Banner */}
            <div className="rounded-2xl border border-crop-500/30 bg-gradient-to-br from-crop-950/60 to-slate-900 p-4">
              <div className="flex items-start gap-2.5">
                <Info className="h-4 w-4 text-crop-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-crop-300 uppercase">
                    Diagnóstico del Agente de Riego
                  </h5>
                  <p className="mt-1 text-xs text-slate-200 leading-relaxed">
                    {lot.hydricStatus === 'Normal'
                      ? `El lote se encuentra dentro del rango de confort hídrico. Se proyecta mantener lámina actual sin intervención por las próximas 48 h.`
                      : lot.hydricStatus === 'Atencion'
                      ? `El déficit Dr (${lot.deficitDr_mm} mm) se aproxima al umbral crítico AFD. Se sugiere aplicar ${Math.round(lot.deficitDr_mm * 0.75)} mm en la ventana nocturna.`
                      : `Estado crítico: Déficit superó el umbral de estrés. Aplicar ${Math.round(lot.deficitDr_mm)} mm en forma urgente para restaurar capacidad de campo.`}
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* 4. MODAL: REGISTRAR RIEGO (CU-05) */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-water-50 text-water-600 dark:bg-water-950 dark:text-water-400">
                  <Droplet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Registrar Riego (CU-05)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Lote: <strong className="text-slate-700 dark:text-slate-200">{lot.name}</strong> ({lot.crop})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formSuccess ? (
              <div className="py-10 text-center animate-fade-in">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h4 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
                  ¡Riego Registrado Exitosamente!
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  El balance hídrico del lote ha sido actualizado en tiempo real.
                </p>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Fecha de aplicación
                    </label>
                    <input
                      type="date"
                      required
                      value={irrigationForm.date}
                      onChange={(e) => setIrrigationForm({ ...irrigationForm, date: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-crop-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Hora de inicio
                    </label>
                    <input
                      type="time"
                      required
                      value={irrigationForm.time}
                      onChange={(e) => setIrrigationForm({ ...irrigationForm, time: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-crop-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Lámina aplicada (mm)
                    </label>
                    <div className="relative mt-1">
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max="100"
                        required
                        value={irrigationForm.amount_mm}
                        onChange={(e) => setIrrigationForm({ ...irrigationForm, amount_mm: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-crop-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                      <span className="absolute right-3 top-2 text-xs font-medium text-slate-400">mm</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Método / Equipo
                    </label>
                    <select
                      value={irrigationForm.method}
                      onChange={(e) => setIrrigationForm({ ...irrigationForm, method: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-crop-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="Pivote Central">Pivote Central</option>
                      <option value="Goteo">Goteo Subterráneo</option>
                      <option value="Aspersión">Aspersión Fija</option>
                      <option value="Cañón Enrollador">Cañón Enrollador</option>
                      <option value="Surco">Riego por Gravedad / Surco</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Notas y Observaciones
                  </label>
                  <textarea
                    rows={2}
                    value={irrigationForm.notes}
                    onChange={(e) => setIrrigationForm({ ...irrigationForm, notes: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 outline-none focus:border-crop-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="Detalles sobre presión, pluviometría o anomalías..."
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setIsRegisterModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl bg-gradient-to-r from-crop-600 to-water-600 hover:from-crop-500 hover:to-water-500 px-5 py-2 text-xs font-bold text-white shadow-md transition disabled:opacity-70"
                  >
                    {isSubmitting ? 'Guardando...' : 'Guardar Registro (CU-05)'}
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

export default LotDetailView;
