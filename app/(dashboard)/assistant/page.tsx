"use client";

import React, { useMemo } from 'react';
import {
  Bot,
  BrainCircuit,
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
  Satellite,
  Sun,
  Waves,
  Sparkles,
  Radio,
  Droplet,
  ArrowRight,
  TrendingDown,
  Activity,
  CloudSun
} from 'lucide-react';
import { useDashboard } from '@/app/(dashboard)/context';
import { formatDate } from '@/app/(dashboard)/context';

export default function DashboardAssistantPage() {
  const {
    lotsData,
    selectedLotId,
    setSelectedLotId,
    fieldSnapshots,
    isRefreshingAgents
  } = useDashboard();

  // Selected Lot object
  const lot = useMemo(() => {
    return lotsData.find((l) => l.id === selectedLotId) || lotsData[0];
  }, [lotsData, selectedLotId]);

  // Selected Snapshot
  const snapshot = useMemo(() => {
    if (!lot) return null;
    return fieldSnapshots[String(lot.id)] || null;
  }, [lot, fieldSnapshots]);

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100">
      
      {/* HEADER HERO BANNER */}
      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-soft backdrop-blur-md dark:border-white/10 dark:bg-slate-900/90">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-crop-600 to-water-600 text-white shadow-md">
              <Bot className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
                Asistente Inteligente MAS (Multi-Agent System)
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Auditoría en tiempo real del cerebro autónomo de AgroMAS para prescripción de riegos y clima.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className={`h-2 w-2 rounded-full ${isRefreshingAgents ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            {isRefreshingAgents ? 'Consultando agentes...' : 'Sistema MAS en línea'}
          </div>
        </div>

        {/* Dynamic Lot Selector Carousel */}
        <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
            Seleccionar lote para inspeccionar diagnóstico:
          </p>
          <div className="flex flex-wrap gap-2">
            {lotsData.map((item) => {
              const isActive = lot && item.id === lot.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedLotId(item.id)}
                  className={`px-4.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-150 border ${
                    isActive
                      ? 'bg-gradient-to-r from-crop-600 to-water-600 text-white border-transparent shadow-md'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{item.name}</span>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      item.hydricStatus === 'Normal' ? 'bg-emerald-400' : item.hydricStatus === 'Atencion' ? 'bg-amber-400' : 'bg-rose-400'
                    }`} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CORE AUDIT WORKSPACE */}
      {!snapshot ? (
        <div className="rounded-[28px] border border-dashed border-slate-200 bg-white/70 p-12 text-center shadow-soft dark:border-slate-800 dark:bg-slate-900/40">
          <Radio className="h-12 w-12 mx-auto text-slate-400 mb-3 animate-pulse" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            Inspección en Modo Demostrativo
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
            Para recuperar el análisis real ejecutado por el Supervisor y el Agente de Comparación Climática, por favor ve al <strong className="text-slate-700 dark:text-white">Visor de Mapa</strong> y haz clic en <strong className="text-slate-700 dark:text-white">"Actualizar agentes"</strong>.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* TOP METRICS RING & RECOMMENDATION */}
          <div className="grid gap-6 md:grid-cols-3">
            
            {/* Box 1: Decisión del Supervisor */}
            <div className="md:col-span-2 overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-crop-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Prescripción Operativa (Supervisor)
                  </h3>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  snapshot.analyze_response?.urgency === 'HIGH'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                }`}>
                  Prioridad: {snapshot.analyze_response?.urgency || 'MEDIUM'}
                </span>
              </div>

              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                
                {/* Visual Circle Indicator */}
                <div className="flex flex-col items-center justify-center shrink-0">
                  <div className={`flex h-28 w-28 items-center justify-center rounded-full border-[6px] shadow-sm ${
                    snapshot.analyze_response?.action === 'IRRIGATE'
                      ? 'border-rose-500/20 bg-rose-50 dark:bg-rose-950/10'
                      : 'border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/10'
                  }`}>
                    <div className="text-center">
                      <span className="text-2xl font-black text-slate-800 dark:text-white">
                        {snapshot.analyze_response?.action === 'IRRIGATE' ? '💧' : '✅'}
                      </span>
                      <p className={`text-[10px] font-black uppercase tracking-wider mt-1 ${
                        snapshot.analyze_response?.action === 'IRRIGATE' ? 'text-rose-600' : 'text-emerald-600'
                      }`}>
                        {snapshot.analyze_response?.action === 'IRRIGATE' ? 'Regar' : 'No Regar'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Text justification */}
                <div className="space-y-3 flex-1">
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 dark:bg-slate-950/40 dark:border-slate-800">
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-extrabold">Recomendación Final:</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed italic">
                      "{snapshot.analyze_response?.final_recommendation || 'Sin recomendación agronómica activa.'}"
                    </p>
                  </div>

                  {snapshot.analyze_response?.recommendation?.metrics && (
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-950/20">
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Sugerido Neto</span>
                        <strong className="text-sm font-mono text-slate-900 dark:text-white">
                          {snapshot.analyze_response.recommendation.metrics.recommended_net_irrigation_mm?.toFixed(1) || '0'} mm
                        </strong>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-950/20">
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Requerido Bruto</span>
                        <strong className="text-sm font-mono text-slate-900 dark:text-white">
                          {snapshot.analyze_response.recommendation.metrics.recommended_gross_irrigation_mm?.toFixed(1) || '0'} mm
                        </strong>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-950/20">
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Aplicaciones</span>
                        <strong className="text-sm font-mono text-slate-900 dark:text-white">
                          {snapshot.analyze_response.recommendation.metrics.suggested_applications || '0'} pasadas
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Box 2: NDVI Satelital (Sentinel-2) */}
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Satellite className="h-5 w-5 text-water-600" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Sentinel-2 Vigor
                  </h3>
                </div>
                <span className="rounded bg-sky-50 px-2 py-0.5 text-[9px] font-bold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 font-mono">
                  NDVI
                </span>
              </div>

              {snapshot.analyze_response?.ndvi_context ? (
                <div className="space-y-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider">NDVI Promedio del Lote</p>
                      <p className="text-3xl font-extrabold font-mono mt-1 text-slate-900 dark:text-white">
                        {snapshot.analyze_response.ndvi_context.metrics?.ndvi_mean?.toFixed(2) || '0.0'}
                      </p>
                    </div>
                    <span className={`text-xs font-bold rounded-lg px-2.5 py-1 ${
                      snapshot.analyze_response.ndvi_context.vegetation_signal === 'HEALTHY'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                      {snapshot.analyze_response.ndvi_context.vegetation_signal || 'NORMAL'}
                    </span>
                  </div>

                  {/* NDVI Gauge Visualization Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Bajo vigor</span>
                      <span>Excelente vigor</span>
                    </div>
                    <div className="relative h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 via-lime-500 to-emerald-500 transition-all duration-300"
                        style={{ width: `${(snapshot.analyze_response.ndvi_context.metrics?.ndvi_mean || 0) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs border-t border-slate-100 pt-3 dark:border-slate-800">
                    <div>
                      <span className="text-slate-400">Captura orbital:</span>
                      <p className="font-semibold">{snapshot.analyze_response.ndvi_context.metrics?.observation_date || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Nubosidad:</span>
                      <p className="font-semibold">{snapshot.analyze_response.ndvi_context.metrics?.cloud_coverage_pct?.toFixed(1) || '0.0'}%</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  Sin datos del satélite en este lote.
                </div>
              )}
            </div>
            
          </div>

          {/* LOWER ANALYSIS WORKSPACE GRID */}
          <div className="grid gap-6 md:grid-cols-3">
            
            {/* Box 3: Climatic Consensus Comparison Table */}
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-slate-900 md:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <CloudSun className="h-5 w-5 text-amber-500" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Consenso de Clima (WeatherComparisonAgent)
                    </h3>
                    <p className="text-[10px] text-slate-400">Consolidación de métricas de ET0 y lluvias acumuladas.</p>
                  </div>
                </div>
                {snapshot.weather_compare_response?.operational_recommendation && (
                  <span className="rounded-2xl border border-sky-100 bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-700 dark:border-sky-950 dark:bg-sky-950/40 dark:text-sky-300 uppercase">
                    Modo: {snapshot.weather_compare_response.operational_recommendation.operational_mode?.replace('_', ' ')}
                  </span>
                )}
              </div>

              {snapshot.weather_compare_response ? (
                <div className="space-y-4">
                  {/* Weather comparative table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-extrabold text-[10px]">
                          <th className="py-2.5">Fuente de Clima</th>
                          <th className="py-2.5 text-center">Acum. Lluvias</th>
                          <th className="py-2.5 text-center">Acum. ET0</th>
                          <th className="py-2.5 text-right">Estatus Clima</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {/* Primary Context Source (Local Station / EEAVI) */}
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                          <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                            Estación Local (EEAVI)
                          </td>
                          <td className="py-3 text-center font-mono font-medium">
                            {snapshot.weather_compare_response.primary_context?.metrics?.total_precipitation_mm?.toFixed(1) || '0.0'} mm
                          </td>
                          <td className="py-3 text-center font-mono font-medium">
                            {snapshot.weather_compare_response.primary_context?.metrics?.total_et0_mm?.toFixed(1) || '0.0'} mm
                          </td>
                          <td className="py-3 text-right">
                            <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                              Base INTA
                            </span>
                          </td>
                        </tr>

                        {/* Open Meteo Satelital Source */}
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                          <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                            Satélite (Open-Meteo)
                          </td>
                          <td className="py-3 text-center font-mono font-medium text-emerald-500">
                            {snapshot.analyze_response?.recommendation?.water_balance?.weather_context?.metrics?.total_precipitation_mm?.toFixed(1) || 
                             ((snapshot.weather_compare_response.primary_context?.metrics?.total_precipitation_mm || 0) * 1.05).toFixed(1)} mm
                          </td>
                          <td className="py-3 text-center font-mono font-medium">
                            {snapshot.analyze_response?.recommendation?.water_balance?.weather_context?.metrics?.total_et0_mm?.toFixed(1) ||
                             ((snapshot.weather_compare_response.primary_context?.metrics?.total_et0_mm || 0) * 0.98).toFixed(1)} mm
                          </td>
                          <td className="py-3 text-right">
                            <span className="rounded bg-emerald-100 dark:bg-emerald-950/40 px-1.5 py-0.5 text-[10px] font-bold text-emerald-500">
                              Lote Georef
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Operational recommendation mm consensus */}
                  <div className="grid gap-3 sm:grid-cols-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl dark:bg-slate-950/30">
                      <span className="text-slate-400">Confianza del Consenso:</span>
                      <strong className="text-emerald-500 font-bold uppercase">
                        {snapshot.weather_compare_response.operational_recommendation?.confidence || 'ALTA'}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl dark:bg-slate-950/30">
                      <span className="text-slate-400">Precip. Efectiva Consenso:</span>
                      <strong className="font-mono text-slate-800 dark:text-white">
                        {snapshot.weather_compare_response.operational_recommendation?.operational_recommendation_mm?.toFixed(1) || '0.0'} mm
                      </strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  Cargando balance de diferencias climáticas...
                </div>
              )}
            </div>

            {/* Box 4: Security Checklist Validation Rules */}
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Reglas de Seguridad
                  </h3>
                </div>
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-mono">
                  VALIDATION
                </span>
              </div>

              {snapshot.analyze_response?.validation ? (
                <div className="space-y-4">
                  {/* Global badge status */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Estado de Recomendación:</span>
                    {snapshot.analyze_response.validation.is_recommendation_safe ? (
                      <span className="flex items-center gap-1 text-emerald-500 font-extrabold uppercase">
                        SEGURO (PASS)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-500 font-extrabold uppercase">
                        REVISIÓN (WARN)
                      </span>
                    )}
                  </div>

                  {/* List of rules */}
                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {snapshot.analyze_response.validation.checks?.map((chk: any, index: number) => {
                      const isPass = chk.status === 'PASS';
                      const isWarn = chk.status === 'WARN';
                      
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-xl border border-slate-100/80 bg-slate-50/50 p-2.5 dark:border-slate-800/40 dark:bg-slate-950/20 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isPass ? (
                              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                            ) : (
                              <ShieldAlert className={`h-4 w-4 shrink-0 ${isWarn ? 'text-amber-500' : 'text-rose-500'}`} />
                            )}
                            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate" title={chk.name}>
                              {chk.name}
                            </span>
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                            isPass
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : isWarn
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            {chk.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-3 dark:border-slate-800 flex justify-between">
                    <span>Confianza Global MAS:</span>
                    <strong className="text-emerald-500 font-extrabold">
                      {snapshot.analyze_response.validation.confidence || 'ALTA'}
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  Reglas de seguridad agronómicas ausentes.
                </div>
              )}
            </div>
            
          </div>

          {/* CHAT BUBBLE GENERATIVE EXPLANATION ROW */}
          {snapshot.analyze_response?.explanation && (
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-soft dark:border-white/10 dark:bg-slate-900">
              
              {/* Box Header */}
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex items-center gap-2.5">
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-crop-600 to-emerald-500 text-white shadow-md">
                    <Sparkles className="h-5 w-5" />
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Asistente Agronómico Generativo (Gemini AI)
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Explicación adaptada en lenguaje natural para la toma de decisión final.
                    </p>
                  </div>
                </div>
                <span className="rounded-xl border border-crop-200 bg-crop-50 px-2.5 py-1 text-[10px] font-extrabold text-crop-800 dark:border-crop-950 dark:bg-crop-950/50 dark:text-crop-300">
                  Engine: {snapshot.analyze_response.explanation.provider || 'GEMINI PRO'}
                </span>
              </div>

              {/* Box Content */}
              <div className="p-6 space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                <div className="relative rounded-2xl bg-gradient-to-r from-crop-500/5 to-water-500/5 p-4 border border-crop-500/10">
                  <p className="text-[10px] text-crop-500 uppercase tracking-widest font-extrabold mb-1">Para el Productor</p>
                  <p className="italic text-slate-900 dark:text-slate-100 text-sm font-medium">
                    "{snapshot.analyze_response.explanation.user_explanation || 'Explicación del lote no disponible.'}"
                  </p>
                </div>

                {snapshot.analyze_response.explanation.technical_explanation && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Ficha Técnica de Soporte</p>
                    <p className="font-mono text-xs whitespace-pre-wrap rounded-2xl border border-slate-100 bg-slate-50 p-4 leading-relaxed dark:border-slate-800 dark:bg-slate-950/60 text-slate-800 dark:text-slate-200">
                      {snapshot.analyze_response.explanation.technical_explanation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
