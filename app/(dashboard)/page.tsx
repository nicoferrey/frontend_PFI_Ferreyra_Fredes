"use client";

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Map,
  AlertTriangle,
  Droplets,
  Sparkles,
  ArrowUpRight,
  Activity,
  CheckCircle,
  CheckCircle2,
  BrainCircuit,
  Eye
} from 'lucide-react';
import { useDashboard, defaultDemoPolygons } from './context';
import { PageHeader } from '@/components/page-header';
import { HeaderButton } from '@/components/header-button';
import { KpiCard } from '@/components/kpi-card';

const DashboardMap = dynamic(
  () => import('@/components/dashboard-map'),
  { ssr: false }
);

export default function DashboardHome() {
  const router = useRouter();
  const {
    lotsData,
    setSelectedLotId,
    customCenter,
    rawCustomPolygons,
    fieldSnapshots,
    isRefreshingAgents
  } = useDashboard();

  const criticalLots = useMemo(() => {
    return lotsData.filter((lot) => lot.hydricStatus === 'Critico');
  }, [lotsData]);

  const nextAction = useMemo(() => {
    if (criticalLots.length > 0) {
      return {
        value: 'Regar hoy',
        delta: `${criticalLots[0].name} requiere prioridad alta`,
      };
    }
    const attentionLot = lotsData.find((lot) => lot.hydricStatus === 'Atencion');
    if (attentionLot) {
      return {
        value: 'Revisar riego',
        delta: `${attentionLot.name} se acerca al umbral`,
      };
    }
    return {
      value: 'Esperar',
      delta: 'Sin intervención urgente',
    };
  }, [criticalLots, lotsData]);

  const averageAvailableWater = useMemo(() => {
    if (lotsData.length === 0) return 0;
    const total = lotsData.reduce((sum, lot) => sum + lot.waterAvailableAU_pct, 0);
    return Math.round(total / lotsData.length);
  }, [lotsData]);

  const agentStatus = useMemo(() => {
    if (isRefreshingAgents) return { value: 'Actualizando', delta: 'Agentes recalculando datos' };
    const snapshotCount = Object.values(fieldSnapshots).filter(Boolean).length;
    if (lotsData.length === 0 || snapshotCount === 0) {
      return { value: 'Incompleto', delta: 'Faltan análisis de agentes' };
    }
    if (snapshotCount < lotsData.length) {
      return { value: 'Revisar', delta: `${snapshotCount}/${lotsData.length} lotes analizados` };
    }
    return { value: 'OK', delta: 'Agentes con datos actualizados' };
  }, [fieldSnapshots, isRefreshingAgents, lotsData.length]);

  const dynamicKpis = [
    {
      title: 'Próxima acción',
      value: nextAction.value,
      delta: nextAction.delta,
      icon: Sparkles,
      tone: 'text-crop-700 bg-crop-100 dark:bg-crop-950 dark:text-crop-300'
    },
    {
      title: 'Lotes críticos',
      value: String(criticalLots.length),
      delta: criticalLots.length > 0 ? criticalLots.map((lot) => lot.name).slice(0, 2).join(', ') : 'Sin estrés crítico',
      icon: AlertTriangle,
      tone: 'text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300'
    },
    {
      title: 'Agua disponible',
      value: `${averageAvailableWater}%`,
      delta: 'Promedio utilizable por el cultivo',
      icon: Droplets,
      tone: 'text-water-700 bg-water-100 dark:bg-water-950 dark:text-water-300'
    },
    {
      title: 'Estado agentes',
      value: agentStatus.value,
      delta: agentStatus.delta,
      icon: Activity,
      tone: 'text-sky-700 bg-sky-100 dark:bg-sky-950 dark:text-sky-300'
    }
  ];

  // Map lots dataset mapping
  const mapLots = useMemo(() => {
    return lotsData.map((l) => ({
      id: l.id,
      name: l.name,
      polygon: rawCustomPolygons[l.id] || defaultDemoPolygons[l.id] || [],
      area: l.areaHa,
      crop: l.crop,
      hydricStatus: l.hydricStatus,
      deficitDr_mm: l.deficitDr_mm,
      waterAvailableAU_pct: l.waterAvailableAU_pct,
      ndviCurrent: l.ndviDataAvailable ? l.ndviCurrent : undefined,
      ndviObservationDate: l.ndviObservationDate,
      ndviCloudCoveragePct: l.ndviCloudCoveragePct,
      ndviValidPixelCoveragePct: l.ndviValidPixelCoveragePct,
      ndviSceneId: l.ndviSceneId,
    }));
  }, [lotsData, rawCustomPolygons, defaultDemoPolygons]);

  const estimatedLots = useMemo(() => {
    return lotsData.filter((lot) => lot.usesEstimatedAgronomicData);
  }, [lotsData]);

  // Extract proactive alerts recommended by agents
  const priorityAlerts = useMemo(() => {
    return lotsData
      .filter((lot) => lot.irrigationPriority === 'Alta' || lot.irrigationPriority === 'Media')
      .map((lot) => ({
        id: lot.id,
        name: lot.name,
        crop: lot.crop,
        priority: lot.irrigationPriority,
        reason: lot.priorityReason,
        window: lot.pumpingWindow,
        status: lot.hydricStatus,
      }))
      .sort((a, b) => (a.priority === 'Alta' ? -1 : 1));
  }, [lotsData]);

  const handleInspectLot = (lotId: string) => {
    setSelectedLotId(lotId);
    router.push('/map');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Subheader Title Banner - PageHeader Component */}
      <PageHeader
        badge="Tablero General"
        title="Monitoreo Agroclimático &"
        titleAccent="Balance de Lotes"
        action={
          <HeaderButton
            href="/map"
            icon={<Map className="h-3.5 w-3.5" />}
            trailingIcon={<ArrowUpRight className="h-3.5 w-3.5" />}
          >
            Ver Visor Detallado
          </HeaderButton>
        }
      />

      {estimatedLots.length > 0 && (
        <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950 shadow-soft">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <h3 className="text-sm font-extrabold">Parámetros agronómicos estimados</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
                  {estimatedLots.length} lote{estimatedLots.length === 1 ? '' : 's'} usan suelo, capacidad hídrica o estado inicial estimado. Validar esos datos mejora la precisión del balance y de la recomendación.
                </p>
              </div>
            </div>
            <Link
              href="/settings"
              className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-amber-700"
            >
              Revisar datos
            </Link>
          </div>
        </div>
      )}

      {/* Interactive Satellite Overview Map */}
      <section className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 p-6 text-white shadow-soft">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Visor de Campo Persistente</span>
            <h3 className="text-xl font-bold text-white mt-0.5">
              Estado Espacial y Capas Espectrales
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-white/10 px-3 py-1 text-slate-300">Monitoreo Satelital Activo</span>
          </div>
        </div>

        <div className="relative">
          <DashboardMap
            center={customCenter}
            lots={mapLots}
            selectedLotId={undefined}
            onSelectLot={handleInspectLot}
          />
        </div>
      </section>

      {/* KPI Cards Grid */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dynamicKpis.map((item) => {
          const Icon = item.icon;
          return (
            <KpiCard
              key={item.title}
              title={item.title}
              value={item.value}
              subtitle={item.delta}
              icon={<Icon className="h-5 w-5" />}
              iconBgColor={`${item.tone} shadow-2xs`}
            />
          );
        })}
      </section>

      {/* Two Columns: IA Agent Priority Warnings & Consolidated List */}
      <div className="grid gap-6 lg:grid-cols-12">
        
        {/* IA Priority Alerts Panel (Left Column - Compact & Emerald/Water Palette) */}
        <section className="lg:col-span-5 flex flex-col h-full">
          <div className="rounded-[28px] border border-slate-200/90 bg-white p-5 shadow-soft flex-1 flex flex-col justify-between text-slate-900">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-crop-50 text-crop-700 border border-crop-200/80 shadow-2xs">
                    <BrainCircuit className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-950">Alertas Prioritarias de Agentes</h3>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Recomendaciones operativas de MAS</p>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 space-y-3">
                {priorityAlerts.length === 0 ? (
                  <div className="py-8 px-4 text-center rounded-2xl bg-emerald-50/50 border border-dashed border-emerald-200">
                    <CheckCircle2 className="h-9 w-9 mx-auto text-emerald-500 mb-2" />
                    <h4 className="text-sm font-bold text-emerald-950">¡Estabilidad Hídrica Lograda!</h4>
                    <p className="text-xs text-emerald-700 mt-1 max-w-[280px] mx-auto leading-relaxed">
                      Ningún lote se encuentra bajo estrés crítico. Los agentes no recomiendan intervención inmediata.
                    </p>
                  </div>
                ) : (
                  priorityAlerts.map((alert) => {
                    const isHigh = alert.priority === 'Alta';
                    return (
                      <div
                        key={alert.id}
                        className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3"
                      >
                        {/* Status Banner (Green & Blue Tones) */}
                        <div className={`flex items-center justify-between gap-2.5 rounded-xl p-3 border shadow-2xs ${
                          isHigh
                            ? 'bg-gradient-to-r from-sky-50 via-water-50/50 to-white border-sky-200/90'
                            : 'bg-gradient-to-r from-emerald-50 via-crop-50/50 to-white border-emerald-200/90'
                        }`}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-2xs ${
                              isHigh ? 'bg-water-600 text-white' : 'bg-emerald-600 text-white'
                            }`}>
                              {isHigh ? (
                                <AlertTriangle className="h-4.5 w-4.5" />
                              ) : (
                                <Sparkles className="h-4.5 w-4.5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="text-[9px] uppercase font-extrabold tracking-wider text-slate-400 block">Lote</span>
                              <h4 className="text-xs sm:text-sm font-black text-slate-950 truncate">
                                {alert.name} <span className="text-xs font-semibold text-slate-500">({alert.crop})</span>
                              </h4>
                            </div>
                          </div>

                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${
                            isHigh
                              ? 'bg-sky-100 text-sky-800 border-sky-200'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}>
                            Prioridad: {alert.priority}
                          </span>
                        </div>

                        {/* Justification Box (Compact with Green Left Border Accent) */}
                        <div className="rounded-xl bg-slate-50/90 p-3 border border-slate-200/80 border-l-4 border-l-crop-600">
                          <p className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold">
                            Diagnóstico y Recomendación Agronómica:
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-800 leading-relaxed">
                            "{alert.reason}"
                          </p>
                        </div>

                        {/* Footer & Compact Action Button */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-0.5">
                          <div className="text-xs">
                            <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider">Ventana sugerida:</span>
                            <span className="font-extrabold font-mono text-slate-900 text-xs">{alert.window}</span>
                          </div>

                          <button
                            onClick={() => handleInspectLot(alert.id)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-extrabold px-3.5 py-2 text-xs transition shadow-2xs"
                          >
                            <span>Inspeccionar</span>
                            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {priorityAlerts.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-500" /> Optimización energética activa
                </span>
                <span className="font-extrabold text-slate-700 text-xs">{priorityAlerts.length} alerta{priorityAlerts.length > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </section>

        {/* Consolidated Water Balance Detail (Right Column) */}
        <section className="lg:col-span-7 flex flex-col h-full">
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-soft flex-1 flex flex-col justify-between text-slate-900">
            <div>
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Lista consolidada</span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">Estado operativo por lote</h3>
                </div>
              </div>
              
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200/80 select-none">
                    <tr>
                      <th className="py-2.5 px-3">Lote</th>
                      <th className="py-2.5 px-3">Cultivo</th>
                      <th className="py-2.5 px-3 text-center">Estado</th>
                      <th className="py-2.5 px-3 text-center">Agua Faltante</th>
                      <th className="py-2.5 px-3 text-center">Agua Disponible</th>
                      <th className="py-2.5 px-3 text-center">Último Riego</th>
                      <th className="py-2.5 px-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/90 text-xs">
                    {lotsData.map((lotItem) => {
                      const statusColor = lotItem.hydricStatus === 'Normal'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/90'
                        : lotItem.hydricStatus === 'Atencion'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200/90'
                        : 'bg-rose-50 text-rose-800 border border-rose-200/90';

                      return (
                        <tr key={lotItem.id} className="hover:bg-slate-50/70 transition-colors duration-150">
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {lotItem.name}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-500">
                            {lotItem.crop} ({lotItem.areaHa} ha)
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block rounded-lg px-2.5 py-0.5 font-extrabold text-[11px] shadow-2xs ${statusColor}`}>
                              {lotItem.hydricStatus}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                            <div className="flex items-baseline justify-center">
                              <span className="text-xs font-black text-slate-950">{lotItem.deficitDr_mm.toFixed(1)}</span>
                              <span className="text-[11px] font-bold text-slate-400 ml-0.5">mm</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-baseline justify-center">
                              <span className="text-xs font-extrabold text-slate-950">{lotItem.waterAvailableAU_pct}</span>
                              <span className="text-[11px] font-bold text-slate-400 ml-0.5">%</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-medium text-slate-500">
                            {lotItem.lastIrrigationDate !== '-' 
                              ? `${lotItem.lastIrrigationAmount_mm} mm (${lotItem.lastIrrigationDate})` 
                              : 'Ninguno'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleInspectLot(lotItem.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 transition shadow-2xs"
                                title="Ver detalle del lote"
                              >
                                <Eye className="h-4 w-4 text-slate-700" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

      </div>

    </div>
  );
}
