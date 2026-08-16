"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  History,
  Plus,
  CloudRain,
  Download,
  Trash2,
  Pencil,
  X,
  CheckCircle2,
  Droplets,
  SunMedium,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useDashboard } from '../context';
import {
  getIrrigationEventsApi,
  getRainfallEventsApi,
  getReportsSummaryApi,
  getTeamMembersApi,
  createRainfallEventApi,
  createIrrigationEventApi,
  deleteIrrigationEventApi,
  deleteRainfallEventApi,
  updateIrrigationEventApi,
  updateRainfallEventApi,
  exportReportBlobApi,
  IrrigationEvent,
  RainfallEvent,
  ReportsSummary
} from '@/lib/api';

export default function DashboardHistoryPage() {
  const auth = useAuth();
  const {
    lotsData,
    selectedLotId,
    setSelectedLotId,
    selectedField,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    realHistory,
    historyReloadTrigger,
    setHistoryReloadTrigger,
    teamMembers,
    setTeamMembers,
  } = useDashboard();

  // Reports and Local Loading States
  const [reportsSummary, setReportsSummary] = useState<ReportsSummary | null>(null);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [irrigationEvents, setIrrigationEvents] = useState<IrrigationEvent[]>([]);
  const [rainfallEvents, setRainfallEvents] = useState<RainfallEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Rainfall registration modal state
  const [isRainModalOpen, setIsRainModalOpen] = useState(false);
  const [rainForm, setRainForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '12:00',
    amount_mm: '10',
    notes: 'Registro manual del pluviómetro.',
  });
  const [isSubmittingRain, setIsSubmittingRain] = useState(false);
  const [rainFormSuccess, setRainFormSuccess] = useState(false);

  // Edit event modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editFormSuccess, setEditFormSuccess] = useState(false);
  const [editingEvent, setEditingEvent] = useState<{
    type: 'riego' | 'lluvia';
    id: string | number;
    date: string;
    time: string;
    amount_mm: string;
    method?: string;
    notes: string;
  } | null>(null);

  // Manual irrigation modal state in history tab
  const [isHistoryIrrigModalOpen, setIsHistoryIrrigModalOpen] = useState(false);
  const [historyIrrigForm, setHistoryIrrigForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '08:00',
    amount_mm: '15',
    method: 'Pivote Central',
    notes: 'Riego manual registrado en historial.',
  });
  const [isSubmittingHistoryIrrig, setIsSubmittingHistoryIrrig] = useState(false);
  const [historyIrrigFormSuccess, setHistoryIrrigFormSuccess] = useState(false);

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

  // Load consolidated reports & events for History Tab
  useEffect(() => {
    if (!selectedField) return;

    const fieldId = selectedField.id;
    let isCancelled = false;

    async function loadData() {
      setIsLoadingEvents(true);
      setIsLoadingReports(true);

      try {
        const [irrigs, rains, summary, team] = await Promise.all([
          getIrrigationEventsApi(fieldId, dateFrom, dateTo),
          getRainfallEventsApi(fieldId, dateFrom, dateTo),
          getReportsSummaryApi(fieldId, dateFrom, dateTo),
          getTeamMembersApi(fieldId)
        ]);

        if (!isCancelled) {
          setIrrigationEvents(irrigs);
          setRainfallEvents(rains);
          setReportsSummary(summary);
          setTeamMembers(team);
        }
      } catch (err) {
        console.error('Error loading history/reports data:', err);
      } finally {
        if (!isCancelled) {
          setIsLoadingEvents(false);
          setIsLoadingReports(false);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [selectedField, dateFrom, dateTo, historyReloadTrigger]);

  // Consolidated list of events for History Tab
  const consolidatedEvents = useMemo(() => {
    const hasCustom = auth.fields && auth.fields.length > 0;
    if (hasCustom) {
      const getMemberName = (uuid?: string) => {
        if (!uuid) return 'Sistema';
        const member = teamMembers.find((m) => String(m.id) === String(uuid));
        if (member) {
          return member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim();
        }
        return uuid;
      };

      const mappedIrrig = irrigationEvents.map((e) => ({
        id: e.id,
        type: 'riego' as const,
        applied_at: e.applied_at,
        amount_mm: e.amount_mm,
        method: e.method || 'N/A',
        notes: e.notes || '',
        registered_by: getMemberName(e.registered_by),
      }));

      const mappedRain = rainfallEvents.map((e) => ({
        id: e.id,
        type: 'lluvia' as const,
        applied_at: e.applied_at,
        amount_mm: e.amount_mm,
        method: 'Pluviómetro Manual',
        notes: e.notes || '',
        registered_by: getMemberName(e.registered_by),
      }));

      return [...mappedIrrig, ...mappedRain].sort(
        (a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime()
      );
    } else {
      // Mock events fallback
      return [
        {
          id: 'mock-i-1',
          type: 'riego' as const,
          applied_at: '2026-08-04T08:00:00Z',
          amount_mm: 20.0,
          method: 'Pivote Central',
          notes: 'Riego optimizado',
          registered_by: 'Esteban Ferreyra',
        },
        {
          id: 'mock-i-2',
          type: 'riego' as const,
          applied_at: '2026-08-01T14:30:00Z',
          amount_mm: 15.0,
          method: 'Goteo Subterráneo',
          notes: 'Riego localizado',
          registered_by: 'Carlos Benítez',
        },
        {
          id: 'mock-r-1',
          type: 'lluvia' as const,
          applied_at: '2026-07-28T18:00:00Z',
          amount_mm: 18.0,
          method: 'Estación Meteorológica',
          notes: 'Precipitación regional',
          registered_by: 'Automático',
        },
      ];
    }
  }, [auth.fields, irrigationEvents, rainfallEvents, teamMembers]);

  // Handler to register rainfall manual
  const handleSaveRainfall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedField) return;
    setIsSubmittingRain(true);
    const localDate = new Date(`${rainForm.date}T${rainForm.time}`);
    const isoDate = isNaN(localDate.getTime()) ? new Date().toISOString() : localDate.toISOString();

    const res = await createRainfallEventApi(selectedField.id, {
      applied_at: isoDate,
      amount_mm: parseFloat(rainForm.amount_mm) || 0,
      notes: rainForm.notes,
    });

    if (res.ok) {
      setRainFormSuccess(true);
      setTimeout(() => {
        setRainFormSuccess(false);
        setIsRainModalOpen(false);
        setHistoryReloadTrigger((prev: number) => prev + 1);
        setRainForm({
          date: new Date().toISOString().split('T')[0],
          time: '12:00',
          amount_mm: '10',
          notes: 'Registro manual del pluviómetro.',
        });
      }, 1000);
    } else {
      alert('Error al registrar lluvia: ' + (res.data?.detail || 'Inténtelo de nuevo.'));
    }
    setIsSubmittingRain(false);
  };

  // Handler to register manual irrigation from history tab
  const handleSaveHistoryIrrig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedField) return;
    setIsSubmittingHistoryIrrig(true);
    const localDate = new Date(`${historyIrrigForm.date}T${historyIrrigForm.time}`);
    const isoDate = isNaN(localDate.getTime()) ? new Date().toISOString() : localDate.toISOString();

    const res = await createIrrigationEventApi(selectedField.id, {
      applied_at: isoDate,
      amount_mm: parseFloat(historyIrrigForm.amount_mm) || 0,
      method: historyIrrigForm.method,
      notes: historyIrrigForm.notes,
    });

    if (res.ok) {
      setHistoryIrrigFormSuccess(true);
      setTimeout(() => {
        setHistoryIrrigFormSuccess(false);
        setIsHistoryIrrigModalOpen(false);
        setHistoryReloadTrigger((prev: number) => prev + 1);
        setHistoryIrrigForm({
          date: new Date().toISOString().split('T')[0],
          time: '08:00',
          amount_mm: '15',
          method: 'Pivote Central',
          notes: 'Riego manual registrado en historial.',
        });
      }, 1000);
    } else {
      alert('Error al registrar riego: ' + (res.data?.detail || 'Inténtelo de nuevo.'));
    }
    setIsSubmittingHistoryIrrig(false);
  };

  // Handler to delete event (irrigation or rainfall)
  const handleDeleteEvent = async (type: 'riego' | 'lluvia', eventId: string | number) => {
    if (!selectedField) return;
    const confirmDelete = window.confirm(`¿Está seguro de que desea eliminar este evento de ${type}?`);
    if (!confirmDelete) return;

    const success =
      type === 'riego'
        ? await deleteIrrigationEventApi(selectedField.id, eventId)
        : await deleteRainfallEventApi(selectedField.id, eventId);

    if (success) {
      setHistoryReloadTrigger((prev: number) => prev + 1);
    } else {
      alert('Error al eliminar el evento. Inténtelo de nuevo.');
    }
  };

  // Handler to update event (irrigation or rainfall)
  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedField || !editingEvent) return;
    setIsSubmittingEdit(true);

    const localDate = new Date(`${editingEvent.date}T${editingEvent.time}`);
    const isoDate = isNaN(localDate.getTime()) ? new Date().toISOString() : localDate.toISOString();
    const payload = {
      applied_at: isoDate,
      amount_mm: parseFloat(editingEvent.amount_mm) || 0,
      notes: editingEvent.notes,
      ...(editingEvent.type === 'riego' ? { method: editingEvent.method } : {}),
    };

    const apiCall =
      editingEvent.type === 'riego'
        ? updateIrrigationEventApi(selectedField.id, editingEvent.id, payload)
        : updateRainfallEventApi(selectedField.id, editingEvent.id, payload);

    const res = await apiCall;

    if (res.ok) {
      setEditFormSuccess(true);
      setTimeout(() => {
        setEditFormSuccess(false);
        setIsEditModalOpen(false);
        setEditingEvent(null);
        setHistoryReloadTrigger((prev: number) => prev + 1);
      }, 1000);
    } else {
      alert('Error al actualizar evento: ' + (res.data?.detail || 'Inténtelo de nuevo.'));
    }
    setIsSubmittingEdit(false);
  };

  // Handler to export report
  const handleExportReport = async (format: 'csv' | 'xlsx') => {
    if (!selectedField) return;
    try {
      const blob = await exportReportBlobApi(selectedField.id, format, dateFrom, dateTo);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte_balance_lote_${selectedField.id}.${format}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Error al exportar reporte. Asegúrese de que el servidor esté activo.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header card with selection and export actions */}
      <div className="rounded-[28px] border border-white/70 bg-white/75 p-6 shadow-soft backdrop-blur">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-water-100 text-water-700">
              <History className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-950">Historial y Reportes del Campo</h2>
              <p className="text-xs text-slate-500">Registro histórico de balances hídricos, precipitaciones y eventos de riego por lote.</p>
            </div>
          </div>

          {/* Actions buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsHistoryIrrigModalOpen(true)}
              disabled={!selectedField}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-crop-600 to-water-600 hover:from-crop-500 hover:to-water-500 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition duration-150 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Registrar Riego (CU-05)
            </button>

            <button
              onClick={() => setIsRainModalOpen(true)}
              disabled={!selectedField}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition duration-150 disabled:opacity-50"
            >
              <CloudRain className="h-4 w-4" />
              Registrar Lluvia Manual
            </button>

            <button
              onClick={() => handleExportReport('xlsx')}
              disabled={!selectedField || isLoadingReports}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition disabled:opacity-50"
            >
              <Download className="h-4 w-4 text-emerald-600" />
              Excel (XLSX)
            </button>

            <button
              onClick={() => handleExportReport('csv')}
              disabled={!selectedField || isLoadingReports}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition disabled:opacity-50"
            >
              <Download className="h-4 w-4 text-crop-600" />
              CSV
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-6 grid gap-4 border-t border-slate-200/80 pt-5 sm:grid-cols-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Lote activo</label>
            <select
              value={selectedLotId}
              onChange={(e) => setSelectedLotId(e.target.value)}
              className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-crop-500 shadow-sm"
            >
              {lotsData.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.name} ({lot.crop})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Fecha desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-crop-500 shadow-sm"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Fecha hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-crop-500 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Reports Summary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* 1. Riegos Totales */}
        <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Riegos Aplicados</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 font-mono">
              {reportsSummary?.metrics?.total_irrigation_applied_mm.toFixed(1) ?? '35.0'} <span className="text-xs font-normal text-slate-500">mm</span>
            </p>
            <p className="mt-1 text-[11px] text-water-600 font-medium">
              Vol. est: {reportsSummary?.metrics?.total_water_volume_m3.toLocaleString('es-AR') ?? '16.800'} m³
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-water-50 text-water-600 flex items-center justify-center">
            <Droplets className="h-5 w-5" />
          </div>
        </div>

        {/* 2. Lluvias Totales */}
        <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Lluvias Registradas</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 font-mono">
              {reportsSummary?.metrics?.total_precipitation_mm.toFixed(1) ?? '18.0'} <span className="text-xs font-normal text-slate-500">mm</span>
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Automáticas + manuales
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <CloudRain className="h-5 w-5" />
          </div>
        </div>

        {/* 3. Evapotranspiración Acumulada */}
        <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Consumo Cultivo (ETc)</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 font-mono">
              {reportsSummary?.metrics?.total_evapotranspiration_etc_mm.toFixed(1) ?? '58.5'} <span className="text-xs font-normal text-slate-500">mm</span>
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Evapotranspiración acumulada
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <SunMedium className="h-5 w-5" />
          </div>
        </div>

        {/* 4. Estrés Hídrico */}
        <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Estrés Crítico</p>
            <p className="mt-2 text-2xl font-bold text-rose-600 font-mono">
              {reportsSummary?.metrics?.days_under_stress_raw ?? 3} <span className="text-xs font-normal text-slate-500">días</span>
            </p>
            <p className="mt-1 text-[11px] text-rose-500 font-medium">
              Bajo el umbral óptimo (AFD)
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Historical balance evolution chart */}
      <div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 p-6 text-white shadow-soft">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Evolución Hídrica Histórica</span>
            <h3 className="text-xl font-bold text-white mt-0.5">
              Curva de Balance Hídrico para el Período Seleccionado
            </h3>
          </div>
          {isLoadingHistory && (
            <span className="text-xs rounded-full bg-white/10 px-3 py-1 text-slate-300 animate-pulse">
              Cargando historial...
            </span>
          )}
        </div>

        <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.8),rgba(2,6,23,0.95))] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-500" /> Agua Útil (AU)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-amber-500" /> Déficit (Dr)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-sky-400 border-dashed" /> Umbral AFD ({selectedLot?.easilyAvailableAFD_mm?.toFixed(0) ?? 40} mm)
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Capacidad Campo TAW = {selectedLot?.totalAvailableTAW_mm ?? 100} mm</span>
          </div>

          <div className="h-[300px] w-full">
            {selectedLot?.timeline && selectedLot.timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={selectedLot.timeline} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="auHistoryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} domain={[0, Math.ceil((selectedLot?.totalAvailableTAW_mm || 100) * 1.05)]} unit=" mm" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-2xl border border-slate-700 bg-slate-900/95 p-3.5 text-xs text-white shadow-2xl backdrop-blur-md">
                            <p className="font-bold text-slate-200 border-b border-slate-800 pb-1 mb-2">
                              Fecha: {data.date} ({data.dayLabel})
                            </p>
                            <div className="space-y-1">
                              <p className="text-emerald-400 font-semibold">Agua Útil (AU): {data.au_mm?.toFixed(1)} mm</p>
                              <p className="text-amber-400 font-semibold">Déficit (Dr): {data.dr_mm?.toFixed(1)} mm</p>
                              <p className="text-sky-300">Umbral RAW: {(data.raw_mm || data.afd_mm)?.toFixed(1)} mm</p>
                              {data.kc ? (
                                <p className="text-slate-350">
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
                  <ReferenceLine y={selectedLot?.easilyAvailableAFD_mm} stroke="#38bdf8" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'AFD', fill: '#7dd3fc', fontSize: 10, position: 'insideTopRight' }} />
                  <ReferenceLine y={selectedLot?.totalAvailableTAW_mm} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth={1} label={{ value: 'TAW', fill: '#cbd5e1', fontSize: 10, position: 'insideTopLeft' }} />
                  <Area type="monotone" dataKey="au_mm" stroke="#10b981" fill="url(#auHistoryGrad)" strokeWidth={2.5} />
                  <Line type="monotone" dataKey="dr_mm" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: '#f59e0b' }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                No hay serie temporal disponible para este rango de fechas.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event Log Table */}
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Registros de Riegos y Lluvias del Período</h3>
          {isLoadingEvents && (
            <span className="text-xs text-slate-500 animate-pulse">Cargando eventos...</span>
          )}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-900 uppercase font-semibold border-b">
              <tr>
                <th className="p-3">Fecha y Hora</th>
                <th className="p-3">Tipo de Evento</th>
                <th className="p-3">Lámina (mm)</th>
                <th className="p-3">Método / Fuente</th>
                <th className="p-3">Registrado Por</th>
                <th className="p-3">Observaciones</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {consolidatedEvents.map((item, idx) => {
                const isRiego = item.type === 'riego';
                return (
                  <tr key={item.id || idx} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono">
                      {new Date(item.applied_at).toLocaleString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-bold ${
                        isRiego
                          ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {isRiego ? '💧 Riego' : '🌧️ Lluvia'}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900">{item.amount_mm.toFixed(1)} mm</td>
                    <td className="p-3 text-slate-700">{item.method}</td>
                    <td className="p-3 text-slate-500">{item.registered_by}</td>
                    <td className="p-3 text-slate-400 italic max-w-[200px] truncate" title={item.notes}>
                      {item.notes}
                    </td>
                    <td className="p-3 text-right">
                      {/* Show action buttons only if not mock events */}
                      {String(item.id).startsWith('mock') ? (
                        <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded">Mock Event</span>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              const parts = item.applied_at.split('T');
                              setEditingEvent({
                                type: item.type,
                                id: item.id,
                                date: parts[0],
                                time: parts[1] ? parts[1].slice(0, 5) : '12:00',
                                amount_mm: String(item.amount_mm),
                                method: isRiego ? item.method : undefined,
                                notes: item.notes,
                              });
                              setIsEditModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                            title="Editar evento"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(item.type, item.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Eliminar evento"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {consolidatedEvents.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No se encontraron riegos o lluvias registradas para el período seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==========================================
         MODAL 1: REGISTRAR LLUVIA MANUAL
         ========================================== */}
      {isRainModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <CloudRain className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Registrar Lluvia (Pluviómetro)</h3>
                  <p className="text-xs text-slate-500">Lote: <strong className="text-slate-700 dark:text-slate-200">{selectedLot?.name || 'N/A'}</strong></p>
                </div>
              </div>
              <button onClick={() => setIsRainModalOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {rainFormSuccess ? (
              <div className="py-10 text-center animate-fade-in">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h4 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">¡Lluvia Registrada Exitosamente!</h4>
                <p className="mt-1 text-xs text-slate-500">El registro manual ha sido guardado.</p>
              </div>
            ) : (
              <form onSubmit={handleSaveRainfall} className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Fecha</label>
                    <input
                      type="date"
                      required
                      value={rainForm.date}
                      onChange={(e) => setRainForm({ ...rainForm, date: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Hora</label>
                    <input
                      type="time"
                      required
                      value={rainForm.time}
                      onChange={(e) => setRainForm({ ...rainForm, time: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Lámina caída (mm)</label>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="300"
                      required
                      value={rainForm.amount_mm}
                      onChange={(e) => setRainForm({ ...rainForm, amount_mm: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold outline-none"
                    />
                    <span className="absolute right-3 top-2 text-xs font-medium text-slate-400">mm</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Notas / Observaciones</label>
                  <textarea
                    rows={2}
                    value={rainForm.notes}
                    onChange={(e) => setRainForm({ ...rainForm, notes: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none"
                    placeholder="Detalles adicionales..."
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button type="button" disabled={isSubmittingRain} onClick={() => setIsRainModalOpen(false)} className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isSubmittingRain} className="rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 px-5 py-2 text-xs font-bold text-white shadow-md transition disabled:opacity-50">
                    {isSubmittingRain ? 'Guardando...' : 'Guardar Registro'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
         MODAL 2: REGISTRAR RIEGO MANUAL (TAB HISTORIAL)
         ========================================== */}
      {isHistoryIrrigModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-water-50 text-water-600">
                  <Droplets className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Registrar Riego</h3>
                  <p className="text-xs text-slate-500">Lote: <strong className="text-slate-700 dark:text-slate-200">{selectedLot?.name || 'N/A'}</strong></p>
                </div>
              </div>
              <button onClick={() => setIsHistoryIrrigModalOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {historyIrrigFormSuccess ? (
              <div className="py-10 text-center animate-fade-in">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h4 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">¡Riego Registrado Exitosamente!</h4>
                <p className="mt-1 text-xs text-slate-500">El registro manual ha sido guardado.</p>
              </div>
            ) : (
              <form onSubmit={handleSaveHistoryIrrig} className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Fecha</label>
                    <input
                      type="date"
                      required
                      value={historyIrrigForm.date}
                      onChange={(e) => setHistoryIrrigForm({ ...historyIrrigForm, date: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Hora</label>
                    <input
                      type="time"
                      required
                      value={historyIrrigForm.time}
                      onChange={(e) => setHistoryIrrigForm({ ...historyIrrigForm, time: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Lámina aplicada (mm)</label>
                    <div className="relative mt-1">
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max="100"
                        required
                        value={historyIrrigForm.amount_mm}
                        onChange={(e) => setHistoryIrrigForm({ ...historyIrrigForm, amount_mm: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold outline-none"
                      />
                      <span className="absolute right-3 top-2 text-xs font-medium text-slate-400">mm</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Método / Equipo</label>
                    <select
                      value={historyIrrigForm.method}
                      onChange={(e) => setHistoryIrrigForm({ ...historyIrrigForm, method: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-crop-500"
                    >
                      <option value="Pivote Central">Pivote Central</option>
                      <option value="Goteo">Goteo Subterráneo</option>
                      <option value="Aspersión">Aspersión Fija</option>
                      <option value="Cañón Enrollador">Cañón Enrollador</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Notes / Observaciones</label>
                  <textarea
                    rows={2}
                    value={historyIrrigForm.notes}
                    onChange={(e) => setHistoryIrrigForm({ ...historyIrrigForm, notes: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none"
                    placeholder="Detalles adicionales..."
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button type="button" disabled={isSubmittingHistoryIrrig} onClick={() => setIsHistoryIrrigModalOpen(false)} className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isSubmittingHistoryIrrig} className="rounded-xl bg-gradient-to-r from-crop-600 to-water-600 hover:from-crop-500 hover:to-water-500 px-5 py-2 text-xs font-bold text-white shadow-md transition disabled:opacity-50">
                    {isSubmittingHistoryIrrig ? 'Guardando...' : 'Guardar Riego'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
         MODAL 3: EDITAR EVENTO (RIEGO O LLUVIA)
         ========================================== */}
      {isEditModalOpen && editingEvent && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  editingEvent.type === 'riego'
                    ? 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400'
                    : 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                }`}>
                  {editingEvent.type === 'riego' ? <Droplets className="h-5 w-5" /> : <CloudRain className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Editar Registro</h3>
                  <p className="text-xs text-slate-500">Modificando evento de {editingEvent.type}</p>
                </div>
              </div>
              <button onClick={() => { setIsEditModalOpen(false); setEditingEvent(null); }} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {editFormSuccess ? (
              <div className="py-10 text-center animate-fade-in">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h4 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">¡Registro Actualizado!</h4>
                <p className="mt-1 text-xs text-slate-500">Los cambios han sido guardados.</p>
              </div>
            ) : (
              <form onSubmit={handleUpdateEvent} className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Fecha</label>
                    <input
                      type="date"
                      required
                      value={editingEvent.date}
                      onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Hora</label>
                    <input
                      type="time"
                      required
                      value={editingEvent.time}
                      onChange={(e) => setEditingEvent({ ...editingEvent, time: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Lámina (mm)</label>
                    <div className="relative mt-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        required
                        value={editingEvent.amount_mm}
                        onChange={(e) => setEditingEvent({ ...editingEvent, amount_mm: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold outline-none"
                      />
                      <span className="absolute right-3 top-2 text-xs font-medium text-slate-400">mm</span>
                    </div>
                  </div>
                  {editingEvent.type === 'riego' && (
                    <div>
                      <label className="text-xs font-semibold text-slate-700">Método / Equipo</label>
                      <select
                        value={editingEvent.method || ''}
                        onChange={(e) => setEditingEvent({ ...editingEvent, method: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-crop-500"
                      >
                        <option value="Pivote Central">Pivote Central</option>
                        <option value="Goteo">Goteo Subterráneo</option>
                        <option value="Aspersión">Aspersión Fija</option>
                        <option value="Cañón Enrollador">Cañón Enrollador</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Notas / Observaciones</label>
                  <textarea
                    rows={2}
                    value={editingEvent.notes}
                    onChange={(e) => setEditingEvent({ ...editingEvent, notes: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button type="button" disabled={isSubmittingEdit} onClick={() => { setIsEditModalOpen(false); setEditingEvent(null); }} className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isSubmittingEdit} className="rounded-xl bg-gradient-to-r from-crop-600 to-water-600 hover:from-crop-500 hover:to-water-500 px-5 py-2 text-xs font-bold text-white shadow-md transition disabled:opacity-50">
                    {isSubmittingEdit ? 'Guardando...' : 'Guardar Cambios'}
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
