"use client";

import React, { useMemo } from 'react';
import {
  Bot,
  BrainCircuit,
  ShieldCheck,
  ShieldAlert,
  Satellite,
  Radio,
  Sparkles,
  MessageSquare,
  CheckCheck,
  User,
  Phone,
  Calendar,
  Layers
} from 'lucide-react';
import { useDashboard } from '@/app/(dashboard)/context';
import { PageHeader } from '@/components/page-header';

function formatDate(value: string | undefined, fallback = '-'): string {
  if (!value) return fallback;
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return fallback;
  return `${day}/${month}/${year}`;
}

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

  // Simulated WhatsApp conversation history associated with the lot
  const whatsappConversations = useMemo(() => {
    if (!lot) return [];
    return [
      {
        user: "Ing. Carlos Gómez (Asesor Agrónomo)",
        phone: "+54 9 11 5555-0192",
        avatar: "CG",
        lastMessage: "Confirmado. Las lecturas de humedad de suelo coinciden con el Dr de 15 mm estimado por el agente.",
        summary: "Validación del balance hídrico y confirmación del programa de riego preventivo nocturno.",
        timestamp: "Hoy, 10:24 hs",
        tag: "Validación Balance",
        tagClass: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-900/40",
        isDarkCard: false
      },
      {
        user: "Martín Ferreyra (Operador de Pivot)",
        phone: "+54 9 341 5555-0211",
        avatar: "MF",
        lastMessage: "Se completaron las 3 aplicaciones de 5 mm cada una sin novedades en la presión.",
        summary: "Notificación de finalización de aplicación de riego manual de 15 mm en el lote.",
        timestamp: "Ayer, 18:45 hs",
        tag: "Riego Aplicado",
        tagClass: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
        isDarkCard: true
      },
      {
        user: "Luis Gómez (Encargado de Riego)",
        phone: "+54 9 261 5555-0309",
        avatar: "LG",
        lastMessage: "Entendido, postergamos el inicio para las 02:00 debido a la alerta de ráfagas.",
        summary: "Coordinación y reprogramación de la ventana de bombeo por alerta climatológica.",
        timestamp: "Hace 2 días",
        tag: "Aviso Clima",
        tagClass: "bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-400 dark:border-amber-900/40",
        isDarkCard: false
      }
    ];
  }, [lot]);

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100">
      
      {/* HEADER HERO BANNER - PageHeader Component */}
      <PageHeader
        badge="Multi-Agent System"
        title="Asistente Inteligente"
        titleAccent="MAS"
        action={
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
            <span className={`h-2 w-2 rounded-full ${isRefreshingAgents ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span>{isRefreshingAgents ? 'Consultando agentes...' : 'Sistema MAS en línea'}</span>
          </div>
        }
      >
        {/* Dynamic Lot Selector Cards */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
            Seleccionar lote para inspeccionar diagnóstico:
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            {lotsData.map((item) => {
              const isActive = lot && item.id === lot.id;
              const dotColor = item.hydricStatus === 'Normal' ? 'bg-emerald-400' : item.hydricStatus === 'Atencion' ? 'bg-amber-400' : 'bg-rose-400';
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedLotId(item.id)}
                  className={`flex flex-col text-left p-3.5 rounded-2xl border transition-all duration-150 ${
                    isActive
                      ? 'border-sky-400 bg-sky-950/40 shadow-lg ring-2 ring-sky-400/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`font-bold text-sm ${isActive ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{item.name}</span>
                    <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                  </div>
                  <span className={`text-[11px] mt-1 ${isActive ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    {item.crop} &bull; {item.areaHa} ha
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </PageHeader>

      {/* THREE ACTIVE AGENTS CARDS (Alternating dark and light) */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Light */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-slate-900">
          <span className="text-xs font-bold text-crop-700 uppercase tracking-wide">Agente FAO-56</span>
          <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">Balance Hídrico Dinámico</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Calcula Dr, AU y AFD integrando Kc satelital con ET0 de estaciones locales y evapotranspiración.
          </p>
        </div>
        {/* Card 2: Dark */}
        <div className="rounded-2xl border border-slate-900 bg-slate-950 p-5 shadow-soft text-white dark:border-white/10 dark:bg-slate-900">
          <span className="text-xs font-bold text-water-400 uppercase tracking-wide">Agente Sentinel-2</span>
          <p className="mt-1 text-base font-bold text-white">NDVI & Vigor Vegetativo</p>
          <p className="mt-2 text-xs text-slate-300 leading-relaxed">
            Procesa imágenes multiespectrales cada 5 días para ajuste dinámico del coeficiente de cultivo.
          </p>
        </div>
        {/* Card 3: Light */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-slate-900">
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Agente de Bombeo</span>
          <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">Tarifa Eléctrica & Eficiencia</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Programa ventanas de riego nocturnas (01:00 a 07:00 hs) para reducir drásticamente el costo energético.
          </p>
        </div>
      </div>

      {/* CORE AUDIT WORKSPACE */}
      {!snapshot ? (
        <div className="rounded-[28px] border border-dashed border-slate-200 bg-white/70 p-12 text-center shadow-soft dark:border-slate-800 dark:bg-slate-900/40">
          <Radio className="h-12 w-12 mx-auto text-slate-400 mb-3 animate-pulse" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            Diagnóstico en Modo Demostrativo
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

          {/* SECOND ROW (100% Width): WHATSAPP CONVERSATIONS SUMMARY */}
          <div className="w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
                  <MessageSquare className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Resumen de Conversaciones por WhatsApp
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Registro consolidado de reportes y notificaciones automáticas acordadas con el personal.
                  </p>
                </div>
              </div>
              <span className="rounded bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                Conectado
              </span>
            </div>

            {/* Conversation Blocks with Alternating Styles */}
            <div className="space-y-4">
              {whatsappConversations.map((chat, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col sm:flex-row gap-3.5 items-start justify-between rounded-2xl border p-4 transition-all duration-150 ${
                    chat.isDarkCard
                      ? 'border-slate-900 bg-slate-950 text-white dark:border-white/10 dark:bg-slate-950/60'
                      : 'border-slate-100 bg-slate-50 dark:border-slate-850 dark:bg-slate-950/20'
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    {/* Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-250 text-slate-700 font-bold text-xs dark:bg-slate-800 dark:text-slate-300">
                      {chat.avatar}
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`font-bold ${chat.isDarkCard ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                          {chat.user}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium font-mono">{chat.phone}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium">{chat.timestamp}</p>
                      
                      <div className={`mt-2.5 rounded-lg p-2.5 border ${
                        chat.isDarkCard 
                          ? 'bg-white/5 border-white/5' 
                          : 'bg-white border-black/5 dark:bg-slate-900/60 dark:border-slate-800'
                      }`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wide ${chat.isDarkCard ? 'text-slate-300' : 'text-slate-500'}`}>
                          Resumen:
                        </p>
                        <p className={`mt-0.5 leading-relaxed ${chat.isDarkCard ? 'text-slate-200' : 'text-slate-700 dark:text-slate-300'}`}>
                          {chat.summary}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 mt-2 text-slate-400">
                        <CheckCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span className="italic truncate max-w-[320px] text-[11px]">"{chat.lastMessage}"</span>
                      </div>
                    </div>
                  </div>

                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    chat.isDarkCard ? 'bg-sky-500 text-slate-950 font-extrabold' : chat.tagClass
                  }`}>
                    {chat.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* THIRD ROW (100% Width): SECURITY RULES SPLIT IN 2 COLUMNS */}
          <div className="w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-slate-900">
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
                {/* Global status */}
                <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2 dark:border-slate-800">
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

                {/* Checklist of evaluated checks SPLIT IN 2 COLUMNS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {snapshot.analyze_response.validation.checks?.map((chk: any, index: number) => {
                    const isPass = chk.status === 'PASS';
                    const isWarn = chk.status === 'WARN';
                    
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-xl border border-slate-100/80 bg-slate-50/50 p-3 dark:border-slate-800/40 dark:bg-slate-950/20 text-xs"
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
      )}

    </div>
  );
}
