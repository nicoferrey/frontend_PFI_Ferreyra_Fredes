"use client";

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Sparkles } from 'lucide-react';
import { useDashboard, formatDate, defaultDemoPolygons } from '../context';
import { LotDetailView } from '@/components/lot-detail-view';
import { DashboardMapLayer } from '@/components/dashboard-map';
import { PageHeader } from '@/components/page-header';
import { HeaderButton } from '@/components/header-button';
import {
  createIrrigationEventApi,
  refreshFieldAgentSnapshotApi,
  getFieldAgentSnapshotApi
} from '@/lib/api';

const DashboardMap = dynamic(
  () => import('@/components/dashboard-map'),
  { ssr: false }
);

export default function DashboardMapPage() {
  const [activeMapLayer, setActiveMapLayer] = useState<DashboardMapLayer>('ndvi');
  const {
    lotsData,
    setLotsData,
    selectedLotId,
    setSelectedLotId,
    selectedField,
    selectedSnapshot,
    customCenter,
    rawCustomPolygons,
    setFieldSnapshots,
    isRefreshingAgents,
    setIsRefreshingAgents,
    agentRefreshError,
    setAgentRefreshError,
    setHistoryReloadTrigger,
    realHistory,
    dateFrom,
    dateTo
  } = useDashboard();

  // Selected Lot object (with real history overlay)
  const selectedLot = useMemo(() => {
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
          deep_percolation_mm: day.deep_percolation_mm,
          ndvi: day.ndvi,
          kc: day.kc,
          kc_source: day.kc_source,
          under_stress: day.under_stress,
          rain_source: day.rain_source,
        };
      });

      return {
        ...baseLot,
        timeline: mappedTimeline,
      };
    }
    return baseLot;
  }, [lotsData, selectedLotId, realHistory, selectedField]);

  // Formatted lot list for DashboardMap component
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
    }));
  }, [lotsData, rawCustomPolygons, defaultDemoPolygons]);

  const handleRegisterIrrigation = async (
    lotId: string,
    data: { date: string; amount_mm: number; method: string; notes?: string }
  ) => {
    const hasCustom = selectedField && String(selectedField.id) === lotId;

    if (hasCustom) {
      const [datePart, timePart] = data.date.split(' ');
      const localDate = new Date(`${datePart}T${timePart || '00:00'}`);
      const isoDate = isNaN(localDate.getTime()) ? new Date().toISOString() : localDate.toISOString();

      const res = await createIrrigationEventApi(lotId, {
        applied_at: isoDate,
        amount_mm: data.amount_mm,
        method: data.method,
        notes: data.notes
      });

      if (res.ok) {
        // Trigger history reload
        setHistoryReloadTrigger((prev: number) => prev + 1);

        // Force a snapshot refresh so the agents compute new values
        setIsRefreshingAgents(true);
        const refreshRes = await refreshFieldAgentSnapshotApi(lotId, {
          force: true,
          date_from: dateFrom,
          date_to: dateTo,
        });
        if (refreshRes.ok) {
          setFieldSnapshots((prev: any) => ({
            ...prev,
            [lotId]: refreshRes.data,
          }));
        } else {
          const snap = await getFieldAgentSnapshotApi(lotId);
          if (snap) {
            setFieldSnapshots((prev: any) => ({
              ...prev,
              [lotId]: snap,
            }));
          }
        }
        setIsRefreshingAgents(false);
      } else {
        console.error('Failed to create irrigation event in backend:', res.data);
        alert('Error al registrar el riego en el servidor: ' + (res.data?.detail || 'Inténtelo de nuevo.'));
      }
    } else {
      // Mock lot fallback
      setLotsData((prev) =>
        prev.map((lot) => {
          if (lot.id === lotId) {
            const newDr = Math.max(0, lot.deficitDr_mm - data.amount_mm);
            const newAu = Math.min(lot.totalAvailableTAW_mm, lot.waterAvailableAU_mm + data.amount_mm);
            const newStatus: 'Normal' | 'Atencion' | 'Critico' =
              newDr <= lot.easilyAvailableAFD_mm ? 'Normal' : newDr <= lot.easilyAvailableAFD_mm * 1.15 ? 'Atencion' : 'Critico';

            const newTimelineItem = {
              date: data.date.split(' ')[0],
              dayLabel: 'Hoy',
              dr_mm: newDr,
              au_mm: newAu,
              afd_mm: lot.easilyAvailableAFD_mm,
              taw_mm: lot.totalAvailableTAW_mm,
              irrigation_mm: data.amount_mm,
            };

            return {
              ...lot,
              deficitDr_mm: newDr,
              waterAvailableAU_mm: newAu,
              waterAvailableAU_pct: Math.round((newAu / lot.totalAvailableTAW_mm) * 100),
              hydricStatus: newStatus,
              irrigationPriority: newStatus === 'Normal' ? 'Baja' : 'Media',
              lastIrrigationDate: data.date.split(' ')[0],
              lastIrrigationAmount_mm: data.amount_mm,
              timeline: [...lot.timeline, newTimelineItem],
            };
          }
          return lot;
        })
      );
    }
  };

  const handleRefreshSelectedAgents = async () => {
    if (!selectedField) return;

    setIsRefreshingAgents(true);
    setAgentRefreshError(null);

    const result = await refreshFieldAgentSnapshotApi(selectedField.id, {
      force: true,
      date_from: dateFrom,
      date_to: dateTo,
    });

    if (result.ok) {
      setFieldSnapshots((prev: any) => ({
        ...prev,
        [String(selectedField.id)]: result.data,
      }));
    } else {
      setAgentRefreshError(result.data?.detail || 'No se pudo actualizar el análisis MAS del lote.');
    }

    setIsRefreshingAgents(false);
  };

  const activeLayerCopy = {
    alertas: {
      eyebrow: 'Capa activa: balance hídrico',
      title: 'Delimitación de parcelas por necesidad de riego',
      help: 'El color del lote representa si requiere riego, no el vigor del cultivo.',
    },
    ndvi: {
      eyebrow: 'Capa activa: vigor satelital',
      title: 'Delimitación de parcelas por vigor vegetativo',
      help: 'El color del lote representa NDVI. El fondo satelital puede verse amarillo aunque el índice calculado sea alto.',
    },
    humedad: {
      eyebrow: 'Capa activa: agua disponible',
      title: 'Delimitación de parcelas por agua disponible',
      help: 'El color del lote representa el agua que todavía puede usar el cultivo.',
    },
  }[activeMapLayer];

  const getVigorLabel = (lot: typeof lotsData[number]) => {
    if (!lot.ndviDataAvailable) return 'Vigor: sin dato';
    if (lot.ndviCurrent >= 0.6) return 'Vigor: sano';
    if (lot.ndviCurrent >= 0.35) return 'Vigor: moderado';
    return 'Vigor: bajo';
  };

  const getVigorClass = (lot: typeof lotsData[number]) => {
    if (!lot.ndviDataAvailable) return 'border-slate-500/40 bg-slate-500/15 text-slate-300';
    if (lot.ndviCurrent >= 0.6) return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300';
    if (lot.ndviCurrent >= 0.35) return 'border-amber-500/40 bg-amber-500/15 text-amber-300';
    return 'border-rose-500/40 bg-rose-500/15 text-rose-300';
  };

  const formatNdviDate = (value?: string | null) => {
    if (!value) return 'sin fecha';
    const [year, month, day] = value.slice(0, 10).split('-');
    return year && month && day ? `${day}/${month}` : value;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Subheader - PageHeader Component */}
      <PageHeader
        badge="Mapeo Satelital & Balance"
        title="Mapa de Lotes y Fichas de"
        titleAccent="Balance Hídrico"
        action={
          <div className="flex items-center gap-3">
            {selectedField && (
              <HeaderButton
                variant="primary"
                icon={<Sparkles className="h-3.5 w-3.5" />}
                disabled={isRefreshingAgents}
                onClick={handleRefreshSelectedAgents}
              >
                {isRefreshingAgents ? 'Actualizando...' : selectedSnapshot ? 'Actualizar agentes' : 'Cargar agentes'}
              </HeaderButton>
            )}

            {/* Compact 2-line mini badge card (Exact h-10 matching button height) */}
            <div className="flex h-10 flex-col justify-center rounded-2xl border border-slate-200/90 bg-white/90 px-3.5 shadow-2xs backdrop-blur-sm text-right leading-tight">
              <span className="text-xs font-extrabold text-slate-950">
                {selectedLot?.name || 'Lote N/A'}
              </span>
              {selectedSnapshot && (
                <span className="text-[10px] font-semibold text-emerald-700 font-mono">
                  Snapshot: {formatDate(selectedSnapshot.generated_at)}
                </span>
              )}
            </div>
          </div>
        }
      />
        {agentRefreshError && (
          <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {agentRefreshError}
          </p>
        )}

      {/* Interactive Satellite Map Container */}
      <div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 p-6 text-white shadow-soft">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs uppercase tracking-[0.24em] text-slate-400">{activeLayerCopy.eyebrow}</span>
            <h3 className="text-xl font-bold text-white mt-0.5">
              {activeLayerCopy.title}
            </h3>
            <p className="mt-1 text-xs text-slate-400">{activeLayerCopy.help}</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-white/10 px-3 py-1 text-slate-300">Resolución: 10m</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-slate-300">Órbita: Sentinel-2A</span>
          </div>
        </div>

        <div className="relative">
          <DashboardMap
            center={customCenter}
            lots={mapLots}
            selectedLotId={selectedLotId}
            onSelectLot={(id) => setSelectedLotId(id)}
            initialLayer="ndvi"
            onLayerChange={setActiveMapLayer}
            grayscale={true}
          />
        </div>

        {/* Lot Quick Selector Cards Carousel */}
        <div className="mt-5 pt-4 border-t border-white/10">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold mb-3">
            Seleccionar Lote para Inspección:
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {lotsData.map((lot) => {
              const isSelected = lot.id === selectedLotId;
              const statusClass = lot.hydricStatus === 'Normal'
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : lot.hydricStatus === 'Atencion'
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                : 'border-rose-500/40 bg-rose-500/15 text-rose-300';

              return (
                <button
                  key={lot.id}
                  onClick={() => setSelectedLotId(lot.id)}
                  className={`flex flex-col text-left p-3.5 rounded-2xl border transition-all ${
                    isSelected
                      ? 'border-sky-400 bg-sky-950/40 shadow-lg ring-2 ring-sky-400/40'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-bold text-white">{lot.name}</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{lot.crop} &bull; {lot.areaHa} ha</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${statusClass}`}>
                      Riego: {lot.hydricStatus}
                    </span>
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${getVigorClass(lot)}`}>
                      {getVigorLabel(lot)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-400">
                    NDVI: {lot.ndviDataAvailable ? `${lot.ndviCurrent.toFixed(2)} · ${formatNdviDate(lot.ndviObservationDate)}` : 'sin dato'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* DETAILED TECHNICAL LOT VIEW COMPONENT */}
      {selectedLot && (
        <LotDetailView
          lot={selectedLot}
          snapshot={selectedSnapshot}
          onRegisterIrrigation={handleRegisterIrrigation}
        />
      )}

    </div>
  );
}
