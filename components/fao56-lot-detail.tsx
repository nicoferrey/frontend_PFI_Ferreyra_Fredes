"use client";

import { useMemo, useState } from 'react';
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
import { AlertTriangle, Droplets, Leaf, TimerReset, Waves, Clock, Sparkles } from 'lucide-react';
import { useDashboard } from '@/app/(dashboard)/context';

const scaleOptions = ['7 días', '14 días', '30 días'];

export function Fao56LotDetail() {
  const [scale, setScale] = useState('7 días');
  const {
    lotsData,
    selectedLotId,
    selectedSnapshot,
    realHistory,
    selectedField
  } = useDashboard();

  // Selected active lot (with real history overlay)
  const lot = useMemo(() => {
    const baseLot = lotsData.find((l) => l.id === selectedLotId) || lotsData[0];
    if (baseLot && realHistory.length > 0 && selectedField && String(selectedField.id) === selectedLotId) {
      const mappedTimeline = realHistory.map((day) => {
        const parts = day.date.split('-');
        const dateLabel = parts.length === 3 ? `${parts[2]}/${parts[1]}` : day.date;
        const d = new Date(`${day.date}T12:00:00`);
        const dayLabel = d.toLocaleDateString('es-AR', { weekday: 'short' });

        return {
          date: dateLabel,
          dayLabel,
          dr_mm: day.dr_mm,
          au_mm: day.au_mm,
          afd_mm: day.afd_mm,
          raw_mm: day.raw_mm || day.afd_mm,
          taw_mm: day.taw_mm,
          irrigation_mm: day.irrigation_mm > 0 ? day.irrigation_mm : undefined,
          rain_mm: day.rain_mm > 0 ? day.rain_mm : undefined,
          ndvi: day.ndvi,
          kc: day.kc,
          kc_source: day.kc_source,
          under_stress: day.under_stress,
          rain_source: day.rain_source
        };
      });

      return {
        ...baseLot,
        timeline: mappedTimeline
      };
    }
    return baseLot;
  }, [lotsData, selectedLotId, realHistory, selectedField]);

  // Dynamic chart data extracted from timeline
  const chartData = useMemo(() => {
    if (!lot || !lot.timeline) return [];
    const days = scale === '7 días' ? 7 : scale === '14 días' ? 14 : 30;
    return lot.timeline.slice(-days).map((item) => ({
      day: item.dayLabel, // short weekday label (e.g. Lun, Mar)
      current: item.au_mm,
      depletion: item.dr_mm,
      raw: item.raw_mm || item.afd_mm,
      taw: item.taw_mm,
      date: item.date,
      irrigation_mm: item.irrigation_mm,
      rain_mm: item.rain_mm,
      ndvi: item.ndvi,
      kc: item.kc,
      kc_source: item.kc_source,
      under_stress: item.under_stress,
      rain_source: item.rain_source
    }));
  }, [lot, scale]);

  // Dynamic recommendations based on active snapshot
  const dynamicRecommendations = useMemo(() => {
    if (!lot) return [];
    
    const statusText = lot.hydricStatus === 'Normal'
      ? 'El lote se encuentra dentro del rango de confort hídrico. Se proyecta mantener lámina actual sin intervención por las próximas 48 h.'
      : lot.hydricStatus === 'Atencion'
      ? `El déficit Dr (${lot.deficitDr_mm} mm) se aproxima al umbral crítico AFD. Se sugiere aplicar riego preventivo.`
      : `Estado crítico: Déficit superó el umbral de estrés. Aplicar ${Math.round(lot.deficitDr_mm)} mm en forma urgente.`;

    const summary = selectedSnapshot?.analyze_response?.final_recommendation || statusText;
    const window = selectedSnapshot?.analyze_response?.recommendation?.water_balance?.weather_compare_response?.operational_recommendation?.evidence?.decision_rule ||
      `Programar la ventana entre 01:00 y 07:00 hs (tarifa valle nocturna) para optimizar costos de bombeo.`;

    const ndviText = selectedSnapshot?.analyze_response?.ndvi_context?.summary ||
      `El lote mantiene respuesta estable en NDVI (vigor actual: ${lot.ndviCurrent.toFixed(2)}). Kc ajustado satelitalmente.`;

    return [
      {
        title: 'Sugerencia de Riego MAS',
        text: summary,
        tone: lot.hydricStatus === 'Critico' 
          ? 'border-rose-500/30 bg-rose-500/10 text-rose-50' 
          : lot.hydricStatus === 'Atencion'
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-50'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-50',
        icon: AlertTriangle
      },
      {
        title: 'Ventana Operativa Eléctrica',
        text: window,
        tone: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-50',
        icon: Clock
      },
      {
        title: 'Lectura Vigor Sentinel-2',
        text: ndviText,
        tone: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-50',
        icon: Sparkles
      },
    ];
  }, [lot, selectedSnapshot]);

  // Dynamic impact metrics
  const impactMetrics = useMemo(() => {
    if (!lot) return [];
    
    // Simulate savings index from AU %
    const savingsM3 = Math.round(lot.areaHa * (lot.deficitDr_mm > 0 ? 8.2 : 12.5));
    const fuelL = Math.round(savingsM3 * 0.28);
    const kwh = Math.round(savingsM3 * 0.72);
    
    return [
      { label: 'Agua optimizada est.', value: `${savingsM3.toLocaleString('es-AR')} m³`, icon: Droplets, accent: 'from-cyan-500 to-sky-600' },
      { label: 'Combustible evitado', value: `${fuelL} L`, icon: Waves, accent: 'from-emerald-500 to-crop-600' },
      { label: 'Ahorro energético', value: `${kwh} kWh`, icon: TimerReset, accent: 'from-amber-400 to-orange-500' },
      { label: 'Eficiencia de aplicación', value: lot.irrigationSystem === 'Goteo Subterráneo' ? '90%' : '85%', icon: Leaf, accent: 'from-lime-400 to-emerald-500' },
    ];
  }, [lot]);

  if (!lot) {
    return (
      <div className="py-12 text-center text-slate-400 text-xs">
        Cargando balance hídrico del lote...
      </div>
    );
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.65fr_0.85fr]">
      
      {/* FAO-56 Agotamiento Chart Card */}
      <article className="overflow-hidden rounded-[30px] border border-white/10 bg-slate-950 text-white shadow-[0_24px_80px_rgba(15,23,42,0.35)]">
        <div className="border-b border-white/10 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Lote seleccionado: <strong className="text-white">{lot.name}</strong></p>
              <h3 className="mt-1 text-2xl font-semibold">Curva de agotamiento hídrico FAO-56</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Comparación temporal entre déficit actual, umbral RAW y capacidad de campo TAW para evitar el estrés hídrico.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {scaleOptions.map((item) => (
                <button
                  key={item}
                  onClick={() => setScale(item)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    scale === item ? 'bg-white text-slate-950' : 'bg-white/10 text-slate-300 hover:bg-white/15'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_30%),linear-gradient(180deg,rgba(12,18,28,1),rgba(8,12,18,1))] p-5">
            <div className="mb-4 flex items-center justify-between text-xs text-slate-300">
              <span>TAW = capacidad de campo ({lot.totalAvailableTAW_mm.toFixed(0)} mm)</span>
              <span>RAW = umbral hídrico ({lot.easilyAvailableAFD_mm.toFixed(0)} mm)</span>
            </div>

            <div className="h-[340px] rounded-[24px] border border-white/10 bg-black/20 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="currentWaterFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.12)' }} tickLine={false} />
                  <YAxis tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.12)' }} tickLine={false} domain={[0, Math.ceil(lot.totalAvailableTAW_mm * 1.05)]} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-2xl border border-slate-700 bg-slate-900/95 p-3.5 text-xs text-white shadow-2xl backdrop-blur-md">
                            <p className="font-bold text-slate-200 border-b border-slate-800 pb-1 mb-2">
                              {data.date || data.day} ({data.day})
                            </p>
                            <div className="space-y-1">
                              <p className="text-emerald-400 font-semibold">Agua Útil (AU): {data.current} mm</p>
                              <p className="text-amber-400 font-semibold">Déficit (Dr): {data.depletion} mm</p>
                              <p className="text-sky-300">Umbral RAW: {data.raw} mm</p>
                              {data.kc ? (
                                <p className="text-slate-300">
                                  Kc: {data.kc} {data.kc_source ? `(${data.kc_source})` : ''}
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
                              {(data.under_stress || data.depletion > data.raw) && (
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
                  <ReferenceLine y={lot.easilyAvailableAFD_mm} stroke="#f59e0b" strokeDasharray="6 6" strokeWidth={2} label={{ value: 'RAW', fill: '#fbbf24', position: 'insideTopRight' }} />
                  <ReferenceLine y={lot.totalAvailableTAW_mm} stroke="#60a5fa" strokeDasharray="8 8" strokeWidth={1} label={{ value: 'TAW', fill: '#93c5fd', position: 'insideTopLeft' }} />
                  <Area type="monotone" dataKey="current" stroke="#10b981" fill="url(#currentWaterFill)" strokeWidth={3} name="Agua útil" />
                  <Line type="monotone" dataKey="depletion" stroke="#f97316" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} name="Déficit (Dr)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid gap-3 grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Agua útil (%)</p>
                <p className="mt-2 text-2xl font-bold text-white">{lot.waterAvailableAU_pct}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Déficit (Dr)</p>
                <p className="mt-2 text-2xl font-bold text-amber-400">{lot.deficitDr_mm.toFixed(1)} mm</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Umbral RAW</p>
                <p className="mt-2 text-2xl font-bold text-sky-400">{lot.easilyAvailableAFD_mm.toFixed(0)} mm</p>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Análisis MAS</p>
              <h4 className="mt-1 text-lg font-bold text-white">Recomendaciones</h4>
            </div>

            {dynamicRecommendations.map((item, idx) => {
              const Icon = item.icon;
              return (
                <article key={idx} className={`rounded-3xl border p-4.5 text-xs ${item.tone}`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-xl bg-white/10 p-2">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h5 className="font-bold text-sm">{item.title}</h5>
                      <p className="mt-2 leading-relaxed text-inherit/90">{item.text}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </aside>
        </div>
      </article>

      {/* Metrics side column */}
      <section className="rounded-[28px] border border-white/10 bg-slate-950 p-5 text-white shadow-[0_24px_80px_rgba(15,23,42,0.35)] flex flex-col justify-between h-full gap-5">
        <div>
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Impacto hídrico y de energía</p>
              <h3 className="mt-1 text-xl font-bold">Métricas Est.</h3>
            </div>
            <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-[10px] font-semibold text-emerald-300">vs. método tradicional</span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            {impactMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <article key={metric.label} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${metric.accent} text-white shadow-lg shadow-black/20`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">{metric.label}</p>
                      <p className="text-lg font-bold text-white mt-0.5">{metric.value}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.92))] p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Eficiencia hídrica promedio</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-4xl font-mono font-extrabold text-white">
                {lot.irrigationSystem === 'Goteo Subterráneo' ? '92%' : '88%'}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                La prescripción guiada por balance hídrico satelital FAO-56 optimiza hasta un 24% más de recursos que la programación tradicional.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-300 whitespace-nowrap">
              +24% eficiencia
            </div>
          </div>
        </div>
      </section>
      
    </section>
  );
}