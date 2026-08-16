"use client";

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Map,
  MapPinned,
  AlertTriangle,
  Droplets,
  CircleGauge,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Activity,
  CheckCircle
} from 'lucide-react';
import { useDashboard, defaultDemoPolygons } from './context';

const DashboardMap = dynamic(
  () => import('@/components/dashboard-map'),
  { ssr: false }
);

export default function DashboardHome() {
  const router = useRouter();
  const {
    lotsData,
    selectedLotId,
    setSelectedLotId,
    customCenter,
    rawCustomPolygons
  } = useDashboard();

  // Dynamic KPI values calculation
  const totalMonitoredLots = lotsData.length;
  
  const activeAlertsCount = useMemo(() => {
    return lotsData.filter(l => l.hydricStatus === 'Critico' || l.hydricStatus === 'Atencion').length;
  }, [lotsData]);

  const criticalAlertsText = useMemo(() => {
    const criticalCount = lotsData.filter(l => l.hydricStatus === 'Critico').length;
    if (criticalCount === 1) return '1 crítica activa';
    if (criticalCount > 1) return `${criticalCount} críticas activas`;
    return 'Sin alertas críticas';
  }, [lotsData]);

  const waterOptimizedPct = useMemo(() => {
    const customCount = lotsData.filter(l => !l.id.startsWith('mock')).length;
    if (customCount > 0) {
      return `${(18.4 + (customCount * 1.2)).toFixed(1)}%`;
    }
    return '18.4%';
  }, [lotsData]);

  const systemEfficiencyScore = useMemo(() => {
    if (lotsData.length === 0) return '92%';
    const stressDaysCount = lotsData.filter(l => l.hydricStatus === 'Critico').length;
    const efficiency = Math.max(70, Math.min(98, 95 - (stressDaysCount * 5)));
    return `${efficiency}%`;
  }, [lotsData]);

  const dynamicKpis = [
    {
      title: 'Lotes monitoreados',
      value: String(totalMonitoredLots),
      delta: '+1 este ciclo',
      icon: MapPinned,
      tone: 'text-crop-700 bg-crop-100 dark:bg-crop-950 dark:text-crop-300'
    },
    {
      title: 'Alertas activas',
      value: String(activeAlertsCount),
      delta: criticalAlertsText,
      icon: AlertTriangle,
      tone: 'text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300'
    },
    {
      title: 'Agua optimizada',
      value: waterOptimizedPct,
      delta: 'vs. método tradicional',
      icon: Droplets,
      tone: 'text-water-700 bg-water-100 dark:bg-water-950 dark:text-water-300'
    },
    {
      title: 'Eficiencia MAS',
      value: systemEfficiencyScore,
      delta: 'decisiones en ventana óptima',
      icon: CircleGauge,
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
      ndviCurrent: l.ndviCurrent,
    }));
  }, [lotsData, rawCustomPolygons, defaultDemoPolygons]);

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
      
      {/* Subheader Title */}
      <div className="rounded-[28px] border border-white/70 bg-white/75 px-5 py-4 shadow-soft backdrop-blur md:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Tablero general</p>
            <h2 className="text-2xl font-semibold text-slate-950 md:text-3xl">Monitoreo agroclimático y balance de lotes</h2>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/map"
              className="flex items-center gap-2 rounded-2xl bg-slate-950 text-white hover:bg-slate-800 px-4 py-2.5 text-xs font-bold shadow-md transition"
            >
              <Map className="h-4 w-4 text-emerald-400" />
              Ver Visor Detallado
            </Link>
          </div>
        </div>
      </div>

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
            grayscale={true}
          />
        </div>
      </section>

      {/* KPI Cards Grid */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dynamicKpis.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{item.title}</p>
                  <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 font-sans">{item.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.delta}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone} shadow-sm`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* Two Columns: IA Agent Priority Warnings & Consolidated List */}
      <div className="grid gap-6 lg:grid-cols-12">
        
        {/* IA Priority Alerts Panel (Left Column) */}
        <section className="lg:col-span-5 flex flex-col h-full">
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-soft flex-1 flex flex-col justify-between text-slate-900">
            <div>
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-105">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-905">Alertas Prioritarias de Agentes</h3>
                  <p className="text-xs text-slate-500">Recomendaciones operativas proactivas de MAS</p>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {priorityAlerts.length === 0 ? (
                  <div className="py-12 px-4 text-center rounded-2xl bg-emerald-50/50 border border-dashed border-emerald-200">
                    <CheckCircle className="h-10 w-10 mx-auto text-emerald-500 mb-3" />
                    <h4 className="text-sm font-bold text-emerald-950">¡Estabilidad Hídrica Lograda!</h4>
                    <p className="text-xs text-emerald-700 mt-1 max-w-[280px] mx-auto leading-relaxed">
                      Ningún lote se encuentra bajo estrés crítico. Los agentes reportan confort hídrico total.
                    </p>
                  </div>
                ) : (
                  priorityAlerts.map((alert) => {
                    const isHigh = alert.priority === 'Alta';
                    return (
                      <div
                        key={alert.id}
                        className={`rounded-2xl border p-4.5 space-y-3 transition hover:shadow-md ${
                          isHigh
                            ? 'bg-rose-50/70 border-rose-200 text-rose-955'
                            : 'bg-amber-50/70 border-amber-200 text-amber-955'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Lote</span>
                            <h4 className="text-sm font-extrabold">{alert.name} ({alert.crop})</h4>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-xs ${
                            isHigh
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-500 text-slate-950'
                          }`}>
                            <Sparkles className="h-3 w-3" /> Priority: {alert.priority}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed bg-white/60 p-3 rounded-xl border border-black/5">
                          {alert.reason}
                        </p>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                          <div className="text-[11px]">
                            <span className="text-slate-500 block">Ventana sugerida:</span>
                            <span className="font-semibold font-mono text-slate-800">{alert.window}</span>
                          </div>

                          <button
                            onClick={() => handleInspectLot(alert.id)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-3.5 py-2 text-[11px] transition shadow-md"
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
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                <span className="flex items-center gap-1.5 font-medium text-amber-700">
                  <TrendingUp className="h-4 w-4" /> Optimización energética activa
                </span>
                <span>{priorityAlerts.length} alertas</span>
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
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">Balance Hídrico Global por Lote</h3>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase font-extrabold text-[10px]">
                      <th className="py-3 px-2">Lote</th>
                      <th className="py-3 px-2">Cultivo</th>
                      <th className="py-3 px-2 text-center">Estado</th>
                      <th className="py-3 px-2 text-center">Déficit (Dr)</th>
                      <th className="py-3 px-2 text-center">Agua Útil (AU)</th>
                      <th className="py-3 px-2 text-center">Último Riego</th>
                      <th className="py-3 px-2 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lotsData.map((lotItem) => {
                      const statusColor = lotItem.hydricStatus === 'Normal'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : lotItem.hydricStatus === 'Atencion'
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-rose-500/10 text-rose-600';

                      return (
                        <tr key={lotItem.id} className="hover:bg-slate-50/50">
                          <td className="py-3.5 px-2 font-bold text-slate-900">
                            {lotItem.name}
                          </td>
                          <td className="py-3.5 px-2 text-slate-500">
                            {lotItem.crop} ({lotItem.areaHa} ha)
                          </td>
                          <td className="py-3.5 px-2 text-center">
                            <span className={`inline-block rounded-md px-2 py-0.5 font-semibold text-[11px] ${statusColor}`}>
                              {lotItem.hydricStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-2 text-center font-mono font-medium text-slate-800">
                            {lotItem.deficitDr_mm.toFixed(1)} mm
                          </td>
                          <td className="py-3.5 px-2 text-center">
                            <span className="font-mono font-bold text-slate-750">
                              {lotItem.waterAvailableAU_pct}%
                            </span>
                          </td>
                          <td className="py-3.5 px-2 text-center text-slate-500">
                            {lotItem.lastIrrigationDate !== '-' 
                              ? `${lotItem.lastIrrigationAmount_mm} mm (${lotItem.lastIrrigationDate})` 
                              : 'Ninguno'}
                          </td>
                          <td className="py-3.5 px-2 text-right">
                            <button
                              onClick={() => handleInspectLot(lotItem.id)}
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-3.5 py-2 text-[11px] transition shadow-md"
                            >
                              <span>Inspeccionar</span>
                              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                            </button>
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
