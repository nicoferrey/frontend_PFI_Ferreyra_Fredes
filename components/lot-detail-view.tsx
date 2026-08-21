"use client";

import React, { useState, useMemo, useEffect } from 'react';
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
  X,
  ShieldCheck,
  BrainCircuit,
  MessageSquare
} from 'lucide-react';
import { FieldAgentSnapshot, NdviPreview, getNdviPreviewApi } from '@/lib/api';
import { CustomDatePicker } from '@/components/custom-date-picker';
import { CustomSelect } from '@/components/custom-select';
import { CustomTimePicker } from '@/components/custom-time-picker';
import { KpiCard } from '@/components/kpi-card';

function formatDate(value: string | undefined, fallback = '-'): string {
  if (!value) return fallback;
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return fallback;
  return `${day}/${month}/${year}`;
}

function formatShortDate(value: string | null | undefined, fallback = 'sin fecha'): string {
  if (!value) return fallback;
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return fallback;
  return `${day}/${month}`;
}

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
  ndviDataAvailable?: boolean;
  ndviObservationDate?: string | null;
  ndviCloudCoveragePct?: number | null;
  ndviValidPixelCoveragePct?: number | null;
  ndviSceneId?: string | null;
  kcSatellite: number;
  irrigationPriority: 'Alta' | 'Media' | 'Baja';
  priorityReason: string;
  pumpingWindow: string;
  lastIrrigationDate: string;
  lastIrrigationAmount_mm: number;
  lastRainDate: string;
  lastRainAmount_mm: number;
  timeline: Array<{
    date: string;
    dayLabel: string;
    dr_mm: number;
    au_mm: number;
    afd_mm: number;
    raw_mm?: number;
    taw_mm: number;
    irrigation_mm?: number;
    rain_mm?: number;
    deep_percolation_mm?: number;
    ndvi?: number;
    kc?: number;
    kc_source?: string;
    under_stress?: boolean;
    rain_source?: string;
  }>;
}

interface LotDetailViewProps {
  lot: LotHydricData;
  snapshot?: FieldAgentSnapshot | null;
  onRegisterIrrigation?: (lotId: string, irrigationData: { date: string; amount_mm: number; method: string; notes?: string }) => void;
  className?: string;
}

export function LotDetailView({ lot, snapshot, onRegisterIrrigation, className = "" }: LotDetailViewProps) {
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
  const [ndviPreview, setNdviPreview] = useState<NdviPreview | null>(null);
  const [isLoadingNdviPreview, setIsLoadingNdviPreview] = useState(false);
  const [ndviPreviewError, setNdviPreviewError] = useState<string | null>(null);
  const [eventFilter, setEventFilter] = useState<'all' | 'riego' | 'rain'>('all');

  useEffect(() => {
    setNdviPreview(null);
    setNdviPreviewError(null);
  }, [lot.id]);

  const loadNdviPreview = async () => {
    setIsLoadingNdviPreview(true);
    setNdviPreviewError(null);

    try {
      const dateTo = String(
        snapshot?.analyze_payload?.ndvi_date_to ||
        snapshot?.analyze_payload?.date_to ||
        new Date().toISOString().slice(0, 10)
      ).slice(0, 10);
      const dateFromDate = new Date(`${dateTo}T12:00:00`);
      dateFromDate.setDate(dateFromDate.getDate() - 30);
      const dateFrom = dateFromDate.toISOString().slice(0, 10);

      const result = await getNdviPreviewApi(lot.id, dateFrom, dateTo, 30, lot.ndviSceneId);
      if (result.ok) {
        setNdviPreview(result.data);
      } else {
        setNdviPreviewError(result.data?.detail || 'No se pudo generar la imagen Sentinel-2 del lote.');
      }
    } catch {
      setNdviPreviewError('No se pudo generar la imagen Sentinel-2 del lote.');
    } finally {
      setIsLoadingNdviPreview(false);
    }
  };

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

  const dailyCropUseMm = Math.max(0.1, lot.etcToday_mm);
  const daysUntilStress = Math.max(
    0,
    Math.floor((lot.easilyAvailableAFD_mm - lot.deficitDr_mm) / dailyCropUseMm)
  );
  const suggestedWaterMm =
    lot.hydricStatus === 'Normal'
      ? 0
      : Math.max(5, Math.round(Math.min(lot.deficitDr_mm, lot.totalAvailableTAW_mm)));
  const nextActionLabel =
    lot.hydricStatus === 'Critico'
      ? 'Regar hoy'
      : lot.hydricStatus === 'Atencion'
      ? 'Revisar riego'
      : 'Esperar';

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      'Fecha',
      'Dia',
      'Agua_faltante_Dr_mm',
      'Agua_disponible_AU_mm',
      'Umbral_antes_de_estres_AFD_mm',
      'Capacidad_total_suelo_TAW_mm',
      'Riego_mm',
      'Lluvia_mm',
      'Vigor_satelital_NDVI',
      'Coeficiente_cultivo_Kc'
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

          {/* Action Buttons: Registrar Riego & Exportar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-crop-600 to-water-600 hover:from-crop-500 hover:to-water-500 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition duration-150"
            >
              <Plus className="h-4 w-4" />
              Registrar Riego
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
          
          {/* 1. Acción recomendada */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Próxima acción</span>
              <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
            </div>
            <p className="mt-1.5 text-lg font-extrabold text-slate-900 dark:text-white">
              {nextActionLabel}
            </p>
            <span className="text-[10px] text-slate-400">Según balance y agentes</span>
          </div>

          {/* 2. Agua recomendada */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Agua recomendada</span>
              <Droplet className="h-3.5 w-3.5 text-water-600" />
            </div>
            <p className="mt-1.5 text-xl font-extrabold text-slate-900 dark:text-white">
              {suggestedWaterMm} <span className="text-xs font-medium text-slate-500">mm</span>
            </p>
            <span className="text-[10px] text-slate-400">A aplicar si se decide regar</span>
          </div>

          {/* 3. Días hasta estrés */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Días hasta estrés</span>
              <Timer className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <p className="mt-1.5 text-xl font-extrabold text-slate-900 dark:text-white">
              {daysUntilStress} <span className="text-xs font-medium text-slate-500">días</span>
            </p>
            <span className="text-[10px] text-slate-400">Estimado con consumo diario</span>
          </div>

          {/* 4. Agua disponible */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Agua disponible</span>
              <Waves className="h-3.5 w-3.5 text-water-600" />
            </div>
            <p className="mt-1.5 text-xl font-extrabold text-slate-900 dark:text-white">
              {lot.waterAvailableAU_pct}% <span className="text-xs font-medium text-slate-500">({lot.waterAvailableAU_mm.toFixed(1)} mm)</span>
            </p>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              Agua que todavía puede usar el cultivo
            </span>
          </div>

          {/* 5. Vigor satelital NDVI */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Vigor satelital (NDVI)</span>
              <Satellite className="h-3.5 w-3.5 text-crop-600" />
            </div>
            <p className="mt-1.5 text-xl font-extrabold text-slate-900 dark:text-white">
              {lot.ndviDataAvailable ? lot.ndviCurrent.toFixed(2) : '-'}
            </p>
            {(() => {
              if (!lot.ndviDataAvailable) {
                return <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Sin dato satelital reciente</span>;
              }
              const val = lot.ndviCurrent;
              const dateLabel = `Imagen ${formatShortDate(lot.ndviObservationDate)}`;
              if (val >= 0.6) {
                return <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Vigor sano · {dateLabel}</span>;
              } else if (val >= 0.35) {
                return <span className="text-[10px] text-amber-600 dark:text-amber-450 font-semibold">Vigor moderado · {dateLabel}</span>;
              } else {
                return <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">Vigor bajo · {dateLabel}</span>;
              }
            })()}
          </div>

          {/* 6. Consumo del cultivo */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Consumo cultivo (ETc)</span>
              <Sun className="h-3.5 w-3.5 text-orange-500" />
            </div>
            <p className="mt-1.5 text-xl font-extrabold text-slate-900 dark:text-white">
              {lot.etcToday_mm.toFixed(1)} <span className="text-xs font-medium text-slate-500">mm/día</span>
            </p>
            <span className="text-[10px] text-slate-400">Evapotranspiración ref. (ET0): {lot.et0Today_mm.toFixed(1)} mm</span>
          </div>

          {/* 7. Prioridad de riego */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Prioridad riego</span>
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="mt-1.5">
              <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-bold ${priorityConfig}`}>
                {lot.irrigationPriority}
              </span>
            </div>
          </div>

          {/* 8. Ventana recomendada para bombeo */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Ventana bombeo</span>
              <Clock className="h-3.5 w-3.5 text-sky-600" />
            </div>
            <p className="mt-1.5 text-xl font-extrabold text-slate-900 dark:text-white">
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
            <p className="mt-1.5 text-xl font-extrabold text-slate-900 dark:text-white">
              {lot.lastIrrigationDate}
            </p>
            <span className="text-[10px] text-slate-400 font-medium">
              {lot.lastIrrigationAmount_mm} mm aplicados
            </span>
          </div>

          {/* 10. Aporte reciente por lluvia */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Aporte reciente por lluvia</span>
              <CloudRain className="h-3.5 w-3.5 text-sky-500" />
            </div>
            <p className="mt-1.5 text-xl font-extrabold text-slate-900 dark:text-white">
              {lot.lastRainDate}
            </p>
            <span className="text-[10px] text-slate-400 font-medium">
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
              Evolución de agua disponible, agua faltante y umbral antes de estrés
            </h3>
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
                  <span className="h-3 w-3 rounded-full bg-emerald-500" /> Agua disponible (AU)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-amber-500" /> Agua faltante (Dr)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 bg-sky-400 border-dashed" /> Umbral antes de estrés (AFD: {lot.easilyAvailableAFD_mm.toFixed(0)} mm)
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Capacidad total del suelo (TAW) = {lot.totalAvailableTAW_mm} mm</span>
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
                              <p className="text-emerald-400 font-semibold">Agua disponible (AU): {data.au_mm} mm</p>
                              <p className="text-amber-400 font-semibold">Agua faltante (Dr): {data.dr_mm} mm</p>
                              <p className="text-sky-300">Umbral antes de estrés (AFD/RAW): {data.raw_mm || data.afd_mm} mm</p>
                              {data.kc ? (
                                <p className="text-slate-300">
                                  Coeficiente del cultivo (Kc): {data.kc} {data.kc_source ? `(${data.kc_source})` : ''}
                                </p>
                              ) : null}
                              {data.irrigation_mm ? (
                                <p className="text-cyan-300 font-bold mt-1 bg-cyan-500/20 px-2 py-0.5 rounded">
                                  💧 Riego: +{data.irrigation_mm} mm
                                </p>
                              ) : null}
                              {data.rain_mm ? (
                                <p className="text-blue-300 font-bold mt-1 bg-blue-500/20 px-2 py-0.5 rounded">
                                  🌧️ Lluvia: +{data.rain_mm} mm {data.rain_source ? `(${data.rain_source === 'manual' ? 'Manual' : 'Open-Meteo'})` : ''}
                                </p>
                              ) : null}
                              {(data.under_stress || data.dr_mm > (data.raw_mm || data.afd_mm)) && (
                                <p className="text-rose-400 font-bold mt-1 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/25">
                                  ⚠️ Estrés Hídrico Activo
                                </p>
                              )}
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
                    label={{ value: 'Umbral estrés', fill: '#7dd3fc', fontSize: 10, position: 'insideTopRight' }} 
                  />

                  {/* Reference line for TAW */}
                  <ReferenceLine 
                    y={lot.totalAvailableTAW_mm} 
                    stroke="#94a3b8" 
                    strokeDasharray="3 3" 
                    strokeWidth={1} 
                    label={{ value: 'Capacidad suelo', fill: '#cbd5e1', fontSize: 10, position: 'insideTopLeft' }} 
                  />

                  <Area 
                    type="monotone" 
                    dataKey="au_mm" 
                    name="Agua disponible (AU)" 
                    stroke="#10b981" 
                    fill="url(#auGrad)" 
                    strokeWidth={2.5} 
                  />

                  <Line 
                    type="monotone" 
                    dataKey="dr_mm" 
                    name="Agua faltante (Dr)" 
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
          <div className="flex flex-col justify-between gap-4 rounded-[24px] border border-white/10 bg-slate-900/60 p-5">
            
            <div>
              {/* Header with Title and Filter Tabs */}
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                    Eventos Registrados
                  </h4>
                </div>

                {/* Filter Pills */}
                {(() => {
                  const allEvents = displayedTimeline.filter((t) => t.irrigation_mm || t.rain_mm);
                  const riegoCount = allEvents.filter((t) => t.irrigation_mm).length;
                  const rainCount = allEvents.filter((t) => t.rain_mm).length;

                  return (
                    <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setEventFilter('all')}
                        className={`px-2 py-0.5 rounded-lg font-bold transition ${
                          eventFilter === 'all'
                            ? 'bg-white/20 text-white shadow-2xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Todos ({allEvents.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setEventFilter('riego')}
                        className={`px-2 py-0.5 rounded-lg font-bold transition ${
                          eventFilter === 'riego'
                            ? 'bg-water-500/30 text-water-300 shadow-2xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Riegos ({riegoCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setEventFilter('rain')}
                        className={`px-2 py-0.5 rounded-lg font-bold transition ${
                          eventFilter === 'rain'
                            ? 'bg-sky-500/30 text-sky-300 shadow-2xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Lluvias ({rainCount})
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Scrollable Event Markers List with Custom Sleek Scrollbar */}
              {(() => {
                const allEvents = displayedTimeline.filter((t) => t.irrigation_mm || t.rain_mm);
                const filteredEvents = allEvents.filter((evt) => {
                  if (eventFilter === 'riego') return !!evt.irrigation_mm;
                  if (eventFilter === 'rain') return !!evt.rain_mm;
                  return true;
                });

                return (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 text-xs select-none scrollbar-thin [scrollbar-width:thin] [scrollbar-color:#334155_transparent]">
                    {filteredEvents.map((evt, idx) => {
                      const isRiego = !!evt.irrigation_mm;
                      const amount = isRiego ? evt.irrigation_mm : evt.rain_mm;
                      
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-xl bg-slate-950/70 border border-slate-800/80 px-3.5 py-2.5 transition hover:border-slate-700 hover:bg-slate-950"
                        >
                          <div className="flex items-center gap-3">
                            {/* Date pill */}
                            <span className="rounded-lg bg-slate-800/90 border border-slate-700/60 px-2 py-1 text-[11px] font-normal text-slate-300 font-sans">
                              {evt.date}
                            </span>

                            {/* Icon & Label */}
                            <div className="flex items-center gap-2">
                              {isRiego ? (
                                <Droplet className="h-4 w-4 text-water-400 shrink-0" />
                              ) : (
                                <CloudRain className="h-4 w-4 text-sky-400 shrink-0" />
                              )}
                              <span className="font-extrabold text-white text-xs">
                                {isRiego ? 'Riego Aplicado' : 'Precipitación Efectiva'}
                              </span>
                            </div>
                          </div>

                          {/* High impact mm Value (Same font-sans as date) */}
                          <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold font-sans ${
                            isRiego
                              ? 'bg-water-500/15 text-water-300 border border-water-500/25'
                              : 'bg-sky-500/15 text-sky-300 border border-sky-500/25'
                          }`}>
                            +{amount?.toFixed(1)} mm
                          </span>
                        </div>
                      );
                    })}

                    {filteredEvents.length === 0 && (
                      <div className="py-8 text-center text-xs text-slate-400 rounded-xl border border-dashed border-white/10 bg-black/20">
                        {allEvents.length === 0
                          ? 'No hay eventos de riego o lluvia en este rango seleccionado.'
                          : 'No se encontraron eventos para el filtro seleccionado.'}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

          </div>

        </div>

      </div>



      {/* 4. MODAL: REGISTRAR RIEGO */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl text-slate-900">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-water-50 text-water-600 border border-water-200/60">
                  <Droplet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-950">
                    Registrar Riego
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lote: <strong className="text-slate-800 font-bold">{lot.name}</strong> ({lot.crop})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formSuccess ? (
              <div className="py-10 text-center animate-fade-in">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h4 className="mt-3 text-lg font-bold text-slate-950">
                  ¡Riego Registrado Exitosamente!
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  El balance hídrico del lote ha sido actualizado en tiempo real.
                </p>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      Fecha de aplicación
                    </label>
                    <CustomDatePicker
                      value={irrigationForm.date}
                      onChange={(newDate) => setIrrigationForm({ ...irrigationForm, date: newDate })}
                      placeholder="Seleccionar fecha"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      Hora de inicio
                    </label>
                    <CustomTimePicker
                      value={irrigationForm.time}
                      onChange={(newTime) => setIrrigationForm({ ...irrigationForm, time: newTime })}
                      placeholder="Seleccionar hora"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      Agua aplicada en el riego (mm)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max="100"
                        required
                        value={irrigationForm.amount_mm}
                        onChange={(e) => setIrrigationForm({ ...irrigationForm, amount_mm: e.target.value })}
                        className="w-full h-11 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-950 outline-none focus:border-crop-500 focus:ring-2 focus:ring-crop-500/20 shadow-sm"
                      />
                      <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-400">mm</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      Método / Equipo
                    </label>
                    <CustomSelect
                      options={[
                        { value: 'Pivote Central', label: 'Pivote Central' },
                        { value: 'Goteo', label: 'Goteo Subterráneo' },
                        { value: 'Aspersión', label: 'Aspersión Fija' },
                        { value: 'Cañón Enrollador', label: 'Cañón Enrollador' },
                        { value: 'Surco', label: 'Riego por Gravedad / Surco' },
                      ]}
                      value={irrigationForm.method}
                      onChange={(method) => setIrrigationForm({ ...irrigationForm, method })}
                      icon={<Droplets className="h-3.5 w-3.5 text-water-600" />}
                      placeholder="Seleccionar Método"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    Notas y Observaciones
                  </label>
                  <textarea
                    rows={2}
                    value={irrigationForm.notes}
                    onChange={(e) => setIrrigationForm({ ...irrigationForm, notes: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-900 font-medium outline-none focus:border-crop-500 focus:ring-2 focus:ring-crop-500/20 shadow-sm"
                    placeholder="Detalles sobre presión, pluviometría o anomalías..."
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setIsRegisterModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl bg-slate-950 hover:bg-slate-850 px-5 py-2 text-xs font-bold text-white shadow-md transition disabled:opacity-70"
                  >
                    {isSubmitting ? 'Guardando...' : 'Guardar Registro'}
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
