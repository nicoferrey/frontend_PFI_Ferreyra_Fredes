"use client";

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Sparkles } from 'lucide-react';
import { useDashboard, formatDate, defaultDemoPolygons } from '../context';
import { LotDetailView } from '@/components/lot-detail-view';
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
          taw_mm: day.taw_mm,
          irrigation_mm: day.irrigation_mm > 0 ? day.irrigation_mm : undefined,
          rain_mm: day.rain_mm > 0 ? day.rain_mm : undefined,
          ndvi: day.ndvi,
          kc: day.kc,
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

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Page Subheader */}
      <div className="rounded-[28px] border border-white/70 bg-white/75 px-5 py-4 shadow-soft backdrop-blur md:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Mapeo Satelital & Balance</p>
            <h2 className="text-2xl font-bold text-slate-950">Mapa de Lotes y Fichas de Balance Hídrico</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Haz clic en cualquier lote en el mapa o en las tarjetas inferiores para inspeccionar sus parámetros en tiempo real.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
              <span className="font-semibold text-slate-700">Lote activo:</span>
              <span className="rounded-md bg-crop-50 px-2 py-0.5 font-bold text-crop-800 border border-crop-200">
                {selectedLot?.name || 'N/A'}
              </span>
            </div>
            {selectedField && (
              <button
                onClick={handleRefreshSelectedAgents}
                disabled={isRefreshingAgents}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
                {isRefreshingAgents ? 'Actualizando...' : selectedSnapshot ? 'Actualizar agentes' : 'Cargar agentes'}
              </button>
            )}
            {selectedSnapshot && (
              <span className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                Snapshot: {formatDate(selectedSnapshot.generated_at)}
              </span>
            )}
          </div>
        </div>
        {agentRefreshError && (
          <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {agentRefreshError}
          </p>
        )}
      </div>

      {/* Interactive Satellite Map Container */}
      <div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 p-6 text-white shadow-soft">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Capa Satelital Esri / Sentinel-2</span>
            <h3 className="text-xl font-bold text-white mt-0.5">
              Delimitación de Parcelas por Estado Hídrico
            </h3>
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
              const dotColor = lot.hydricStatus === 'Normal' ? 'bg-emerald-400' : lot.hydricStatus === 'Atencion' ? 'bg-amber-400' : 'bg-rose-400';

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
                    <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{lot.crop} &bull; {lot.areaHa} ha</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-white/10">
                    <span className="text-slate-400">Déficit Dr:</span>
                    <strong className="text-amber-300 font-mono">{lot.deficitDr_mm.toFixed(1)} mm</strong>
                  </div>
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
