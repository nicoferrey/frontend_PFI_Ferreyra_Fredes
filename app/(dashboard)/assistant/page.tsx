"use client";

import React, { useMemo, useState } from 'react';
import {
  BrainCircuit,
  ShieldCheck,
  ShieldAlert,
  Satellite,
  MessageSquare,
  CheckCheck,
  Calendar,
  Layers,
  Sparkles,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  X
} from 'lucide-react';
import { useDashboard } from '@/app/(dashboard)/context';
import { PageHeader } from '@/components/page-header';
import { formatPhoneWhatsapp } from '@/lib/phone-formatter';
import { useAuth } from '@/lib/auth-context';
import { useEffect } from 'react';

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
    isRefreshingAgents,
    teamMembers
  } = useDashboard();
  const { currentFarmId } = useAuth();

  // State for interactive member history modal
  const [selectedMemberHistory, setSelectedMemberHistory] = useState<any | null>(null);

  // Selected Lot object
  const lot = useMemo(() => {
    return lotsData.find((l) => l.id === selectedLotId) || lotsData[0];
  }, [lotsData, selectedLotId]);

  // Selected Snapshot
  const snapshot = useMemo(() => {
    if (!lot) return null;
    return fieldSnapshots[String(lot.id)] || null;
  }, [lot, fieldSnapshots]);

  // Dynamic Team WhatsApp members & interaction histories
  const [whatsappMembers, setWhatsappMembers] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    
    async function fetchAssistantHistory() {
      setIsLoadingHistory(true);
      try {
        if (!currentFarmId) return;
        
        const { getAssistantHistoryApi } = await import('@/lib/api');
        
        const historyRes = await getAssistantHistoryApi(currentFarmId, 7);
        if (isCancelled) return;
        
        if (historyRes && historyRes.items) {
          const itemsByMember = historyRes.items.reduce((acc: any, item: any) => {
            if (!acc[item.member_id]) acc[item.member_id] = [];
            acc[item.member_id].push(item);
            return acc;
          }, {});

          const roleLabels: Record<string, string> = {
            admin: 'Dueño / Administrador',
            agronomist: 'Asesor Agrónomo',
            operator: 'Operador de Riego',
          };

          const dynamicMembers = Object.keys(itemsByMember).map((memberId, idx) => {
            const memberHistory = itemsByMember[memberId];
            // Sort by newest first
            memberHistory.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            const latest = memberHistory[0];
            const memberInfo = teamMembers?.find((m) => String(m.id) === String(memberId));
            
            const name = memberInfo?.name || `${memberInfo?.first_name || ''} ${memberInfo?.last_name || ''}`.trim() || `Usuario WhatsApp`;
            const initials = name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'WA';
            const rawRole = memberInfo?.role || 'operator';
            const role = roleLabels[rawRole] || rawRole;
            const phone = memberInfo?.phone_whatsapp || memberInfo?.phone || latest.phone_whatsapp;
            
            const colors = ['bg-emerald-100 text-emerald-800 border-emerald-300', 'bg-sky-100 text-sky-800 border-sky-300', 'bg-amber-100 text-amber-800 border-amber-300', 'bg-indigo-100 text-indigo-800 border-indigo-300'];
            const avatarBg = colors[idx % colors.length];

            const categoryLabels: Record<string, string> = {
              irrigation: 'Balance Hídrico',
              weather: 'Alerta Clima',
              ndvi: 'Índices Satelitales',
              register_irrigation: 'Registro Riego',
              register_rainfall: 'Registro Lluvia',
              navigation: 'Navegación'
            };

            const statusLabels: Record<string, string> = {
              resolved: 'RESUELTO',
              pending: 'POSTERGADO',
              registered: 'REGISTRADO'
            };

            return {
              id: memberId,
              name,
              role,
              phone,
              avatar: initials,
              avatarBg,
              lastActive: formatDate(latest.date, 'Reciente'),
              latestQuery: latest.query,
              latestSummary: latest.ai_response,
              historyCount: memberHistory.length,
              history: memberHistory.map((h: any) => ({
                id: h.id,
                date: new Date(h.date).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) + ' hs',
                query: h.query,
                aiResponse: h.ai_response,
                category: categoryLabels[h.category] || h.category || 'Consulta',
                status: statusLabels[h.status] || h.status || 'OK'
              }))
            };
          });

          setWhatsappMembers(dynamicMembers);
        } else {
          setWhatsappMembers([]);
        }
      } catch (err) {
        console.error('Failed to fetch assistant history:', err);
      } finally {
        if (!isCancelled) setIsLoadingHistory(false);
      }
    }

    fetchAssistantHistory();
    
    // Soft polling every 30 seconds
    const interval = setInterval(fetchAssistantHistory, 30000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [currentFarmId, teamMembers]);

  return (
    <div className="space-y-6 animate-fade-in text-slate-900">
      
      {/* HEADER HERO BANNER - PageHeader Component */}
      <PageHeader
        badge="Multi-Agent System"
        title="Asistente Inteligente"
        titleAccent="MAS"
        action={
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 shadow-2xs">
            <span className={`h-2 w-2 rounded-full ${isRefreshingAgents ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span>{isRefreshingAgents ? 'Consultando agentes...' : 'Sistema MAS en línea'}</span>
          </div>
        }
      >
        {/* Dynamic Lot Selector Cards (High-Contrast Clean Design) */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Seleccionar lote para inspeccionar diagnóstico:
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            {lotsData.map((item) => {
              const isActive = lot && item.id === item.id && selectedLotId === item.id;
              const dotColor = item.hydricStatus === 'Normal' ? 'bg-emerald-500' : item.hydricStatus === 'Atencion' ? 'bg-amber-500' : 'bg-rose-500';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedLotId(item.id)}
                  className={`flex flex-col text-left p-4 rounded-2xl border transition-all duration-200 shadow-2xs ${
                    isActive
                      ? 'border-slate-900 bg-slate-950 text-white shadow-md ring-2 ring-emerald-500/30'
                      : 'border-slate-200/90 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`font-extrabold text-sm ${isActive ? 'text-white' : 'text-slate-900'}`}>
                      {item.name}
                    </span>
                    <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                  </div>
                  <span className={`text-[11px] mt-1 font-medium ${isActive ? 'text-emerald-300 font-mono' : 'text-slate-500'}`}>
                    {item.crop} &bull; {item.areaHa} ha
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </PageHeader>

      {/* THREE ACTIVE AGENTS CARDS (Uniform Harmonious Design) */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: FAO-56 */}
        <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-block rounded-md bg-crop-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-crop-800 border border-crop-200">
              Agente FAO-56
            </span>
            <Activity className="h-4 w-4 text-crop-600" />
          </div>
          <p className="text-base font-extrabold text-slate-950">Balance Hídrico Dinámico</p>
          <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
            Calcula Dr, AU y AFD integrando Kc satelital con ET0 de estaciones locales y evapotranspiración.
          </p>
        </div>

        {/* Card 2: Sentinel-2 */}
        <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-block rounded-md bg-water-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-water-800 border border-water-200">
              Agente Sentinel-2
            </span>
            <Satellite className="h-4 w-4 text-water-600" />
          </div>
          <p className="text-base font-extrabold text-slate-950">NDVI & Vigor Vegetativo</p>
          <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
            Procesa imágenes multiespectrales cada 5 días para ajuste dinámico del coeficiente de cultivo.
          </p>
        </div>

        {/* Card 3: Bombeo */}
        <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-block rounded-md bg-amber-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-800 border border-amber-200">
              Agente de Bombeo
            </span>
            <Zap className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-base font-extrabold text-slate-950">Tarifa Eléctrica & Eficiencia</p>
          <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
            Programa ventanas de riego nocturnas (01:00 a 07:00 hs) para reducir drásticamente el costo energético.
          </p>
        </div>
      </div>

      {/* CORE AUDIT WORKSPACE */}
      {!snapshot ? (
        <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-12 text-center shadow-soft">
          <Sparkles className="h-10 w-10 mx-auto text-crop-500 mb-3" />
          <h3 className="text-base font-extrabold text-slate-900">
            Diagnóstico en Modo Demostrativo
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
            Para recuperar el análisis real ejecutado por el Supervisor y el Agente de Comparación Climática, dirígete al <strong className="text-slate-800">Visor de Mapa</strong> y haz clic en <strong className="text-slate-800">"Actualizar agentes"</strong>.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* TOP METRICS RING & RECOMMENDATION */}
          <div className="grid gap-6 md:grid-cols-3 items-stretch">
            
            {/* Box 1: Decisión del Supervisor (Redesigned Command Center Card) */}
            <div className="md:col-span-2 overflow-hidden rounded-[28px] border border-slate-200/90 bg-white p-6 shadow-soft flex flex-col justify-between h-full">
              <div>
                {/* Header Row */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-crop-50 text-crop-700 border border-crop-200/80 shadow-2xs">
                      <BrainCircuit className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-950">
                        Prescripción Operativa
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        Supervisor Multi-Agente MAS
                      </p>
                    </div>
                  </div>
                </div>

                {/* Banner Status Row (Regar vs No Regar) */}
                <div className={`mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl p-4 border shadow-2xs ${
                  snapshot.analyze_response?.action === 'IRRIGATE'
                    ? 'bg-gradient-to-r from-rose-50 via-rose-50/60 to-white border-rose-200/90'
                    : 'bg-gradient-to-r from-emerald-50 via-crop-50/50 to-white border-emerald-200/90'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-2xs ${
                      snapshot.analyze_response?.action === 'IRRIGATE'
                        ? 'bg-rose-500 text-white'
                        : 'bg-emerald-500 text-white'
                    }`}>
                      {snapshot.analyze_response?.action === 'IRRIGATE' ? (
                        <AlertTriangle className="h-5.5 w-5.5" />
                      ) : (
                        <CheckCircle2 className="h-5.5 w-5.5" />
                      )}
                    </div>
                    <div>
                      <h4 className={`text-sm font-black uppercase tracking-wide ${
                        snapshot.analyze_response?.action === 'IRRIGATE' ? 'text-rose-950' : 'text-emerald-950'
                      }`}>
                        {snapshot.analyze_response?.action === 'IRRIGATE' ? 'Riego Requerido Inmediato' : 'Sin Necesidad de Riego'}
                      </h4>
                      <p className={`text-xs font-medium mt-0.5 ${
                        snapshot.analyze_response?.action === 'IRRIGATE' ? 'text-rose-700' : 'text-emerald-700'
                      }`}>
                        {snapshot.analyze_response?.action === 'IRRIGATE'
                          ? 'El agotamiento hídrico superó el umbral crítico del cultivo.'
                          : 'El balance hídrico actual se encuentra dentro del rango seguro.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Justification Box */}
                <div className="mb-5 rounded-2xl bg-slate-50/90 p-4 border border-slate-200/80 border-l-4 border-l-crop-600">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">
                    Diagnóstico y Justificación Agronómica:
                  </p>
                  <p className="mt-1.5 text-xs font-medium text-slate-800 leading-relaxed">
                    "{snapshot.analyze_response?.final_recommendation || 'Sin recomendación agronómica activa.'}"
                  </p>
                </div>
              </div>

              {/* Metrics Grid */}
              {snapshot.analyze_response?.recommendation?.metrics && (
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                    <span className="text-[10px] text-slate-400 uppercase font-extrabold block tracking-wider">Sugerido Neto</span>
                    <strong className="text-base font-extrabold text-slate-950 mt-0.5 block">
                      {snapshot.analyze_response.recommendation.metrics.recommended_net_irrigation_mm?.toFixed(1) || '0.0'} <span className="text-xs font-medium text-slate-500">mm</span>
                    </strong>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                    <span className="text-[10px] text-slate-400 uppercase font-extrabold block tracking-wider">Requerido Bruto</span>
                    <strong className="text-base font-extrabold text-slate-950 mt-0.5 block">
                      {snapshot.analyze_response.recommendation.metrics.recommended_gross_irrigation_mm?.toFixed(1) || '0.0'} <span className="text-xs font-medium text-slate-500">mm</span>
                    </strong>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                    <span className="text-[10px] text-slate-400 uppercase font-extrabold block tracking-wider">Aplicaciones</span>
                    <strong className="text-base font-extrabold text-slate-950 mt-0.5 block">
                      {snapshot.analyze_response.recommendation.metrics.suggested_applications || '0'} <span className="text-xs font-medium text-slate-500">pasadas</span>
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Box 2: NDVI Satelital (Sentinel-2) */}
            <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-soft flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Satellite className="h-5 w-5 text-water-600" />
                    <h3 className="text-base font-extrabold text-slate-950">
                      Sentinel-2 Vigor
                    </h3>
                  </div>
                </div>

                {snapshot.analyze_response?.ndvi_context ? (
                  <div className="space-y-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">NDVI Promedio del Lote</p>
                        <p className="text-3xl font-black mt-1 text-slate-950">
                          {snapshot.analyze_response.ndvi_context.metrics?.ndvi_mean?.toFixed(2) || '0.0'}
                        </p>
                      </div>
                      <span className={`text-xs font-bold rounded-lg px-2.5 py-1 ${
                        snapshot.analyze_response.ndvi_context.vegetation_signal === 'HEALTHY'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {snapshot.analyze_response.ndvi_context.vegetation_signal || 'NORMAL'}
                      </span>
                    </div>

                    {/* NDVI Gauge Visualization Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                        <span>Bajo vigor</span>
                        <span>Excelente vigor</span>
                      </div>
                      <div className="relative h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 via-lime-500 to-emerald-500 transition-all duration-300"
                          style={{ width: `${(snapshot.analyze_response.ndvi_context.metrics?.ndvi_mean || 0) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Extended 4-Metric Satellite Detail Grid (Clean UI typography, non-mono) */}
                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3">
                      <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
                        <span className="text-slate-400 block text-[9px] uppercase font-extrabold tracking-wider">Captura Orbital</span>
                        <p className="font-extrabold text-slate-950 text-xs mt-0.5">{snapshot.analyze_response.ndvi_context.metrics?.observation_date || 'N/A'}</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
                        <span className="text-slate-400 block text-[9px] uppercase font-extrabold tracking-wider">Nubosidad</span>
                        <p className="font-extrabold text-slate-950 text-xs mt-0.5">{snapshot.analyze_response.ndvi_context.metrics?.cloud_coverage_pct?.toFixed(1) || '0.0'}%</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
                        <span className="text-slate-400 block text-[9px] uppercase font-extrabold tracking-wider">Kc Ajustado</span>
                        <p className="font-extrabold text-emerald-700 text-xs mt-0.5">
                          {((snapshot.analyze_response.ndvi_context.metrics?.ndvi_mean || 0.75) * 1.22).toFixed(2)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
                        <span className="text-slate-400 block text-[9px] uppercase font-extrabold tracking-wider">Resolución</span>
                        <p className="font-extrabold text-slate-950 text-xs mt-0.5">10m / px (MSI)</p>
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
            
          </div>

          {/* SECOND ROW (100% Width): WHATSAPP CONVERSATIONS BY TEAM MEMBER */}
          <div className="w-full overflow-hidden rounded-[28px] border border-slate-200/90 bg-white p-6 shadow-soft">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                  <MessageSquare className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-950">
                    Conversaciones & Reportes por WhatsApp
                  </h3>
                  <p className="text-xs text-slate-500">
                    Registro consolidado de consultas, alertas y notificaciones intercambiadas por el personal del campo.
                  </p>
                </div>
              </div>
            </div>

            {/* Member Cards Grid (Full Width 3 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {whatsappMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => setSelectedMemberHistory(member)}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5 transition-all duration-200 hover:bg-white hover:border-slate-300 hover:shadow-md cursor-pointer"
                >
                  <div>
                    {/* Member Profile Header */}
                    <div className="flex items-start justify-between border-b border-slate-200/60 pb-3.5 mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-black text-sm border shadow-2xs ${member.avatarBg}`}>
                          {member.avatar}
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-950 group-hover:text-crop-700 transition-colors">
                            {member.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">{member.role}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{member.phone}</p>
                        </div>
                      </div>
                    </div>

                    {/* Latest Consultation */}
                    <div className="space-y-3 mb-4">
                      <div className="rounded-xl bg-white p-3 border border-slate-200/80 shadow-2xs">
                        <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider block mb-1">
                          Última Consulta Enviada:
                        </span>
                        <p className="text-xs font-semibold text-slate-900 leading-snug italic">
                          “{member.latestQuery}”
                        </p>
                      </div>

                      <div className="rounded-xl bg-emerald-50/60 p-3 border border-emerald-100">
                        <span className="text-[9px] text-emerald-700 uppercase font-extrabold tracking-wider block mb-1">
                          Resumen / Diagnóstico MAS:
                        </span>
                        <p className="text-xs font-medium text-emerald-950 leading-relaxed">
                          {member.latestSummary}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Action */}
                  <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-slate-400">
                      {member.lastActive} &bull; {member.historyCount} registros
                    </span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 font-extrabold text-crop-700 hover:text-crop-800 text-xs transition"
                    >
                      <span>Ver Historial</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* THIRD ROW (100% Width): SECURITY RULES SPLIT IN 2 COLUMNS */}
          <div className="w-full overflow-hidden rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-extrabold text-slate-950">
                  Reglas de Seguridad
                </h3>
              </div>
            </div>

            {snapshot.analyze_response?.validation ? (
              <div className="space-y-4">
                {/* Global status */}
                <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-3">
                  <span className="text-slate-500 font-semibold">Estado de Recomendación:</span>
                  {snapshot.analyze_response.validation.is_recommendation_safe ? (
                    <span className="flex items-center gap-1 text-emerald-700 font-extrabold uppercase bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                      SEGURO (PASS)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-700 font-extrabold uppercase bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200">
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
                        className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isPass ? (
                            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                          ) : (
                            <ShieldAlert className={`h-4 w-4 shrink-0 ${isWarn ? 'text-amber-500' : 'text-rose-500'}`} />
                          )}
                          <span className="font-bold text-slate-800 truncate" title={chk.name}>
                            {chk.name}
                          </span>
                        </div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md font-mono ${
                          isPass
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : isWarn
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {chk.status}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="text-xs text-slate-500 border-t border-slate-100 pt-3 flex justify-between">
                  <span>Confianza Global MAS:</span>
                  <strong className="text-emerald-700 font-extrabold">
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

      {/* WHATSAPP HISTORY MODAL DIALOG */}
      {selectedMemberHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in zoom-in-95">
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-[28px] border border-slate-200 bg-white shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-gradient-to-r from-slate-50 via-white to-emerald-50/30">
              <div className="flex items-center gap-3.5">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-black text-base border shadow-2xs ${selectedMemberHistory.avatarBg}`}>
                  {selectedMemberHistory.avatar}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-950">
                    Historial WhatsApp &bull; {selectedMemberHistory.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedMemberHistory.role} &bull; <span className="font-mono text-slate-600">{formatPhoneWhatsapp(selectedMemberHistory.phone)}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMemberHistory(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Timeline Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="flex items-center justify-between text-xs text-slate-400 font-extrabold uppercase tracking-wider pb-2 border-b border-slate-100">
                <span>Línea de Tiempo de Consultas</span>
                <span>{selectedMemberHistory.history.length} consultas registradas</span>
              </div>

              {selectedMemberHistory.history.map((item: any) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-400 font-mono text-[11px]">{item.date}</span>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase">
                        {item.category}
                      </span>
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 uppercase">
                        {item.status}
                      </span>
                    </div>
                  </div>

                  {/* Question */}
                  <div className="rounded-xl bg-white p-3 border border-slate-200/80">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">
                      Mensaje Enviado por WhatsApp:
                    </span>
                    <p className="text-xs font-semibold text-slate-900 leading-snug">
                      "{item.query}"
                    </p>
                  </div>

                  {/* AI Response */}
                  <div className="rounded-xl bg-emerald-50/80 p-3 border border-emerald-100">
                    <span className="text-[9px] text-emerald-800 font-extrabold uppercase tracking-wider block mb-1">
                      Respuesta del Asistente MAS:
                    </span>
                    <p className="text-xs font-medium text-emerald-950 leading-relaxed">
                      {item.aiResponse}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedMemberHistory(null)}
                className="rounded-xl bg-slate-950 px-5 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-slate-800 transition"
              >
                Cerrar Historial
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
