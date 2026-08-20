"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ShieldAlert,
  Calendar,
  SlidersHorizontal,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { useDashboard } from '../context';
import { CustomSelect, SelectOption } from '@/components/custom-select';
import { CustomDatePicker } from '@/components/custom-date-picker';
import { PageHeader } from '@/components/page-header';
import { HeaderButton } from '@/components/header-button';
import {
  getIrrigationEventsApi,
  getNdviHistoryApi,
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
  NdviHistoryItem,
  RainfallEvent,
  ReportsSummary
} from '@/lib/api';

export default function DashboardHistoryPage() {
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
    fieldSnapshots,
    isRefreshingAgents,
  } = useDashboard();

  // Mapped options for custom dropdown
  const lotSelectOptions: SelectOption[] = useMemo(() => {
    return lotsData.map((lot) => ({
      value: lot.id,
      label: lot.name,
      sublabel: `${lot.crop} · ${lot.areaHa} ha`,
    }));
  }, [lotsData]);

  // Reports and Local Loading States
  const [reportsSummary, setReportsSummary] = useState<ReportsSummary | null>(null);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [irrigationEvents, setIrrigationEvents] = useState<IrrigationEvent[]>([]);
  const [rainfallEvents, setRainfallEvents] = useState<RainfallEvent[]>([]);
  const [ndviHistory, setNdviHistory] = useState<NdviHistoryItem[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Export report dropdown state & ref
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Unified event registration modal state (Riego / Lluvia)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventForm, setEventForm] = useState<{
    type: 'riego' | 'lluvia';
    date: string;
    time: string;
    amount_mm: string;
    method: string;
    notes: string;
  }>({
    type: 'riego',
    date: new Date().toISOString().split('T')[0],
    time: '12:00',
    amount_mm: '15',
    method: 'Pivote Central',
    notes: '',
  });
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [eventFormSuccess, setEventFormSuccess] = useState(false);

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
        const [irrigs, rains, ndviItems, summary, team] = await Promise.all([
          getIrrigationEventsApi(fieldId, dateFrom, dateTo),
          getRainfallEventsApi(fieldId, dateFrom, dateTo),
          getNdviHistoryApi(fieldId, dateFrom, dateTo),
          getReportsSummaryApi(fieldId, dateFrom, dateTo),
          getTeamMembersApi(fieldId)
        ]);

        if (!isCancelled) {
          setIrrigationEvents(irrigs);
          setRainfallEvents(rains);
          setNdviHistory(ndviItems);
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

  // Consolidated list of events for History Tab (Manual + Climatic Rainfall & Irrigation)
  const consolidatedEvents = useMemo(() => {
    const getMemberName = (uuid?: string) => {
      if (!uuid) return 'Sistema';
      const member = teamMembers.find((m) => String(m.id) === String(uuid));
      if (member) {
        return member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim();
      }
      return uuid;
    };

    const eventDateKey = (value: string) => value.slice(0, 10);
    const formatDateLabel = (value: string) => {
      const [year, month, day] = value.split('-');
      return year && month && day ? `${day}/${month}` : value;
    };
    const ndviObservations = [
      ...realHistory
        .filter((day) => typeof day.ndvi === 'number')
        .map((day) => ({ date: day.date, value: day.ndvi as number })),
      ...ndviHistory.map((item) => ({ date: item.date, value: item.ndvi_mean })),
    ]
      .filter((item, index, items) => items.findIndex((other) => other.date === item.date) === index)
      .sort((a, b) => a.date.localeCompare(b.date));

    const findNdviForDate = (dateKey: string, fallback?: number | null) => {
      const exact = ndviObservations.find((item) => item.date === dateKey);
      if (exact) return { ...exact, exact: true };

      const previous = [...ndviObservations]
        .reverse()
        .find((item) => item.date <= dateKey);
      if (previous) return { ...previous, exact: false };

      if (typeof fallback === 'number') return { date: dateKey, value: fallback, exact: true };
      return null;
    };

    const selectedLotNdvi = selectedLot?.ndviDataAvailable ? selectedLot.ndviCurrent : null;
    const formatNdviObservation = (dateKey: string, fallback?: number | null, originalNotes?: string) => {
      const observation = findNdviForDate(dateKey, fallback);
      const ndviText = observation
        ? observation.exact
          ? `NDVI del día: ${observation.value.toFixed(2)}`
          : `NDVI más reciente ${formatDateLabel(observation.date)}: ${observation.value.toFixed(2)}`
        : 'NDVI: sin observación en el período';
      return originalNotes ? `${ndviText} | ${originalNotes}` : ndviText;
    };

    // 1. Manual irrigation events from API
    const mappedIrrig = irrigationEvents.map((e) => ({
      id: e.id,
      type: 'riego' as const,
      applied_at: e.applied_at,
      amount_mm: e.amount_mm,
      method: e.method || 'Manual Campo',
      notes: formatNdviObservation(eventDateKey(e.applied_at), null, e.notes),
      registered_by: getMemberName(e.registered_by),
      isManual: true,
    }));

    // 2. Manual rainfall events from API
    const mappedRain = rainfallEvents.map((e) => ({
      id: e.id,
      type: 'lluvia' as const,
      applied_at: e.recorded_at,
      amount_mm: e.amount_mm,
      method: 'Pluviómetro Manual',
      notes: formatNdviObservation(eventDateKey(e.recorded_at), null, e.notes),
      registered_by: getMemberName(e.registered_by),
      isManual: true,
    }));

    const manualEvents = [...mappedIrrig, ...mappedRain];

    // Set of manual event date keys to avoid duplicating climatic rain on dates with manual rain
    const manualDateKeys = new Set(
      manualEvents.map((m) => {
        const d = m.applied_at.split('T')[0];
        return `${d}-${m.type}`;
      })
    );

    // 3. Climatic rain & irrigation events from active lot timeline (Open-Meteo & FAO-56 model)
    const climaticEvents: any[] = [];
    if (selectedLot?.timeline && selectedLot.timeline.length > 0) {
      selectedLot.timeline.forEach((day: any, idx: number) => {
        const dateStr = day.date.includes('/')
          ? day.date.split('/').reverse().join('-')
          : day.date;
        const normalizedDate = dateStr.length === 5 ? `2026-${dateStr}` : dateStr;
        const isoDate = `${normalizedDate}T08:00:00Z`;

        // Climatic Rain (if no manual rain registered on this date)
        if (day.rain_mm && day.rain_mm > 0 && !manualDateKeys.has(`${normalizedDate}-lluvia`)) {
          climaticEvents.push({
            id: `climate-r-${idx}`,
            type: 'lluvia' as const,
            applied_at: isoDate,
            amount_mm: day.rain_mm,
            method: day.rain_source === 'manual' ? 'Pluviómetro Manual' : 'Estación Open-Meteo',
            notes: formatNdviObservation(normalizedDate, day.ndvi),
            registered_by: day.rain_source === 'manual' ? 'Operario Campo' : 'Open-Meteo Satelital',
            isManual: false,
          });
        }

        // Irrigation from timeline model (if no manual irrigation registered on this date)
        if (day.irrigation_mm && day.irrigation_mm > 0 && !manualDateKeys.has(`${normalizedDate}-riego`)) {
          climaticEvents.push({
            id: `climate-i-${idx}`,
            type: 'riego' as const,
            applied_at: isoDate,
            amount_mm: day.irrigation_mm,
            method: 'Pivote Central (Modelo MAS)',
            notes: formatNdviObservation(normalizedDate, day.ndvi),
            registered_by: 'Sistema AgroMAS',
            isManual: false,
          });
        }
      });
    }

    // Merge both manual entries and climatic rain entries!
    const consolidated = [...manualEvents, ...climaticEvents];

    if (consolidated.length > 0) {
      return consolidated.sort(
        (a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime()
      );
    }

    // Fallback demo events
    return [
      {
        id: 'mock-i-1',
        type: 'riego' as const,
        applied_at: '2026-08-04T08:00:00Z',
        amount_mm: 20.0,
        method: 'Pivote Central',
        notes: selectedLotNdvi ? `NDVI del día: ${selectedLotNdvi.toFixed(2)}` : 'NDVI: sin observación en el período',
        registered_by: 'Esteban Ferreyra',
        isManual: false,
      },
      {
        id: 'mock-r-1',
        type: 'lluvia' as const,
        applied_at: '2026-07-28T18:00:00Z',
        amount_mm: 18.0,
        method: 'Estación Meteorológica',
        notes: selectedLotNdvi ? `NDVI del día: ${selectedLotNdvi.toFixed(2)}` : 'NDVI: sin observación en el período',
        registered_by: 'Open-Meteo Satelital',
        isManual: false,
      },
    ];
  }, [irrigationEvents, rainfallEvents, ndviHistory, realHistory, teamMembers, selectedLot]);

  // Pagination state for consolidated events table (5 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const EVENTS_PER_PAGE = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLotId, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(consolidatedEvents.length / EVENTS_PER_PAGE));

  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * EVENTS_PER_PAGE;
    return consolidatedEvents.slice(startIndex, startIndex + EVENTS_PER_PAGE);
  }, [consolidatedEvents, currentPage]);

  // Handler for unified event registration (Riego or Lluvia)
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedField) return;
    setIsSubmittingEvent(true);
    const localDate = new Date(`${eventForm.date}T${eventForm.time}`);
    const isoDate = isNaN(localDate.getTime()) ? new Date().toISOString() : localDate.toISOString();

    let res;
    if (eventForm.type === 'riego') {
      res = await createIrrigationEventApi(selectedField.id, {
        applied_at: isoDate,
        amount_mm: parseFloat(eventForm.amount_mm) || 0,
        method: eventForm.method,
        notes: eventForm.notes,
      });
    } else {
      res = await createRainfallEventApi(selectedField.id, {
        recorded_at: isoDate,
        amount_mm: parseFloat(eventForm.amount_mm) || 0,
        notes: eventForm.notes,
      });
    }

    if (res.ok) {
      setEventFormSuccess(true);
      setTimeout(() => {
        setEventFormSuccess(false);
        setIsEventModalOpen(false);
        setHistoryReloadTrigger((prev: number) => prev + 1);
        setEventForm({
          type: 'riego',
          date: new Date().toISOString().split('T')[0],
          time: '12:00',
          amount_mm: '15',
          method: 'Pivote Central',
          notes: '',
        });
      }, 1000);
    } else {
      alert(`Error al registrar ${eventForm.type}: ` + (res.data?.detail || 'Inténtelo de nuevo.'));
    }
    setIsSubmittingEvent(false);
  };

  // Quick preset helper for date range filter
  const handleApplyQuickDatePreset = (days: number) => {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - days);
    setDateTo(today.toISOString().split('T')[0]);
    setDateFrom(past.toISOString().split('T')[0]);
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
    const apiCall =
      editingEvent.type === 'riego'
        ? updateIrrigationEventApi(selectedField.id, editingEvent.id, {
            applied_at: isoDate,
            amount_mm: parseFloat(editingEvent.amount_mm) || 0,
            method: editingEvent.method,
            notes: editingEvent.notes,
          })
        : updateRainfallEventApi(selectedField.id, editingEvent.id, {
            recorded_at: isoDate,
            amount_mm: parseFloat(editingEvent.amount_mm) || 0,
            notes: editingEvent.notes,
          });

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

  const handleExportOperationalSummary = () => {
    const escapeCsv = (value: string | number | null | undefined) => {
      const text = value == null ? '' : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };

    const getNextAction = (status: string) => {
      if (status === 'Critico') return 'Regar hoy';
      if (status === 'Atencion') return 'Revisar riego';
      return 'Esperar';
    };

    const getSuggestedWater = (lot: typeof lotsData[number]) => {
      if (lot.hydricStatus === 'Normal') return 0;
      return Math.max(5, Math.round(Math.min(lot.deficitDr_mm, lot.totalAvailableTAW_mm)));
    };

    const getDaysUntilStress = (lot: typeof lotsData[number]) => {
      const dailyCropUse = Math.max(0.1, lot.etcToday_mm);
      return Math.max(0, Math.floor((lot.easilyAvailableAFD_mm - lot.deficitDr_mm) / dailyCropUse));
    };

    const headers = [
      'Lote',
      'Cultivo',
      'Fecha del análisis',
      'Estado',
      'Próxima acción recomendada',
      'Agua disponible (%)',
      'Agua disponible (mm)',
      'Agua faltante (mm)',
      'Agua recomendada para aplicar (mm)',
      'Días estimados hasta estrés',
      'Último riego',
      'Aporte reciente por lluvia',
      'Vigor satelital (NDVI)',
      'Estado del análisis de agentes',
    ];

    const rows = lotsData.map((lot) => {
      const agentState = isRefreshingAgents
        ? 'Actualizando'
        : fieldSnapshots[lot.id]
        ? 'OK'
        : 'Incompleto';

      return [
        lot.name,
        lot.crop,
        dateTo,
        lot.hydricStatus,
        getNextAction(lot.hydricStatus),
        lot.waterAvailableAU_pct,
        lot.waterAvailableAU_mm.toFixed(1),
        lot.deficitDr_mm.toFixed(1),
        getSuggestedWater(lot),
        getDaysUntilStress(lot),
        lot.lastIrrigationDate !== '-' ? `${lot.lastIrrigationAmount_mm} mm (${lot.lastIrrigationDate})` : 'Sin registro',
        lot.lastRainDate !== '-' ? `${lot.lastRainAmount_mm} mm (${lot.lastRainDate})` : 'Sin registro',
        lot.ndviDataAvailable ? lot.ndviCurrent.toFixed(2) : 'Sin dato',
        agentState,
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `resumen_operativo_riego_${dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header card with selection and export actions - PageHeader Component */}
      <PageHeader
        className="z-30"
        badge="Historial & Reportes"
        title="Historial y Reportes del"
        titleAccent="Campo"
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <HeaderButton
              variant="crop"
              icon={<Plus className="h-3.5 w-3.5" />}
              disabled={!selectedField}
              onClick={() => {
                setEventForm({
                  type: 'riego',
                  date: new Date().toISOString().split('T')[0],
                  time: '12:00',
                  amount_mm: '15',
                  method: 'Pivote Central',
                  notes: '',
                });
                setIsEventModalOpen(true);
              }}
            >
              Registrar Evento (Riego / Lluvia)
            </HeaderButton>

            {/* Unified Export Report Dropdown Button */}
            <div className="relative z-50" ref={exportDropdownRef}>
              <HeaderButton
                variant="primary"
                icon={<Download className="h-3.5 w-3.5" />}
                trailingIcon={
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      isExportDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                }
                disabled={!selectedField || isLoadingReports}
                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              >
                Exportar Reporte
              </HeaderButton>

              {isExportDropdownOpen && (
                <div className="absolute right-0 mt-2.5 w-72 rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 z-50">
                  <button
                    type="button"
                    onClick={() => {
                      handleExportReport('xlsx');
                      setIsExportDropdownOpen(false);
                    }}
                    disabled={!selectedField || isLoadingReports}
                    className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <FileSpreadsheet className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Reporte Detallado del Lote</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Formato Excel (.xlsx) con balances y eventos</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleExportOperationalSummary();
                      setIsExportDropdownOpen(false);
                    }}
                    disabled={lotsData.length === 0}
                    className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50 disabled:opacity-50 border-t border-slate-100 mt-1 pt-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                      <FileText className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Resumen Operativo del Campo</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Formato CSV (.csv) con superficies y métricas</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        }
      >
        {/* Modernized Filter bar */}
        <div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <SlidersHorizontal className="h-4 w-4 text-crop-600" />
              <span>Filtros de Análisis</span>
            </div>

            {/* Quick date range preset pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-slate-400 mr-1">Rápido:</span>
              <button
                type="button"
                onClick={() => handleApplyQuickDatePreset(7)}
                className="rounded-full border border-slate-200 bg-slate-50 hover:bg-crop-50 hover:border-crop-300 px-3 py-1 text-[11px] font-medium text-slate-700 transition"
              >
                Últimos 7d
              </button>
              <button
                type="button"
                onClick={() => handleApplyQuickDatePreset(30)}
                className="rounded-full border border-slate-200 bg-slate-50 hover:bg-crop-50 hover:border-crop-300 px-3 py-1 text-[11px] font-medium text-slate-700 transition"
              >
                Últimos 30d
              </button>
              <button
                type="button"
                onClick={() => handleApplyQuickDatePreset(90)}
                className="rounded-full border border-slate-200 bg-slate-50 hover:bg-crop-50 hover:border-crop-300 px-3 py-1 text-[11px] font-medium text-slate-700 transition"
              >
                Últimos 90d
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Lote Selector */}
            <div className="relative z-30">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                <Layers className="h-3.5 w-3.5 text-crop-600" />
                Lote Activo
              </label>
              <CustomSelect
                options={lotSelectOptions}
                value={selectedLotId}
                onChange={setSelectedLotId}
                placeholder="Seleccionar Lote"
              />
            </div>

            {/* Fecha Desde */}
            <div className="relative z-20">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                <Calendar className="h-3.5 w-3.5 text-water-600" />
                Fecha Desde
              </label>
              <CustomDatePicker
                value={dateFrom}
                onChange={setDateFrom}
                placeholder="Fecha inicial"
              />
            </div>

            {/* Fecha Hasta */}
            <div className="relative z-10">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                <Calendar className="h-3.5 w-3.5 text-water-600" />
                Fecha Hasta
              </label>
              <CustomDatePicker
                value={dateTo}
                onChange={setDateTo}
                placeholder="Fecha final"
              />
            </div>
          </div>
        </div>
      </PageHeader>

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
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Consumo del cultivo (ETc)</p>
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
              Días por encima del umbral de estrés
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
                <span className="h-3 w-3 rounded-full bg-emerald-500" /> Agua disponible (AU)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-amber-500" /> Agua faltante (Dr)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-sky-400 border-dashed" /> Umbral antes de estrés (AFD: {selectedLot?.easilyAvailableAFD_mm?.toFixed(0) ?? 40} mm)
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Capacidad total del suelo (TAW) = {selectedLot?.totalAvailableTAW_mm ?? 100} mm</span>
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
                              <p className="text-emerald-400 font-semibold">Agua disponible (AU): {data.au_mm?.toFixed(1)} mm</p>
                              <p className="text-amber-400 font-semibold">Agua faltante (Dr): {data.dr_mm?.toFixed(1)} mm</p>
                              <p className="text-sky-300">Umbral antes de estrés (AFD/RAW): {(data.raw_mm || data.afd_mm)?.toFixed(1)} mm</p>
                              {data.kc ? (
                                <p className="text-slate-350">
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
                  <ReferenceLine y={selectedLot?.easilyAvailableAFD_mm} stroke="#38bdf8" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Umbral estrés', fill: '#7dd3fc', fontSize: 10, position: 'insideTopRight' }} />
                  <ReferenceLine y={selectedLot?.totalAvailableTAW_mm} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth={1} label={{ value: 'Capacidad suelo', fill: '#cbd5e1', fontSize: 10, position: 'insideTopLeft' }} />
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
                <th className="p-3">Agua registrada (mm)</th>
                <th className="p-3">Método / Fuente</th>
                <th className="p-3">Registrado Por</th>
                <th className="p-3">Observaciones</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedEvents.map((item, idx) => {
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
                    <td className="p-3">
                      <span className="inline-flex items-center font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                        {item.notes}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {/* Show action buttons for manual entries, or badge for climatic entries */}
                      {item.isManual === false || String(item.id).startsWith('mock') || String(item.id).startsWith('climate') || String(item.id).startsWith('auto') ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200 bg-slate-100 text-slate-600">
                          Climático
                        </span>
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

        {/* Pagination Controls Footer */}
        {consolidatedEvents.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
            <div>
              Mostrando <span className="font-bold text-slate-800">{((currentPage - 1) * 5) + 1}</span> a{' '}
              <span className="font-bold text-slate-800">{Math.min(currentPage * 5, consolidatedEvents.length)}</span> de{' '}
              <span className="font-bold text-slate-800">{consolidatedEvents.length}</span> registros
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>

              <span className="px-2 font-semibold text-slate-700">
                Página {currentPage} de {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==========================================
         UNIFIED MODAL: REGISTRAR EVENTO HÍDRICO (RIEGO / LLUVIA)
         ========================================== */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                  eventForm.type === 'riego' 
                    ? 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400' 
                    : 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                }`}>
                  {eventForm.type === 'riego' ? <Droplets className="h-5 w-5" /> : <CloudRain className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {eventForm.type === 'riego' ? 'Registrar Evento de Riego' : 'Registrar Lluvia Manual'}
                  </h3>
                  <p className="text-xs text-slate-500">Lote: <strong className="text-slate-700 dark:text-slate-200">{selectedLot?.name || 'N/A'}</strong></p>
                </div>
              </div>
              <button 
                onClick={() => setIsEventModalOpen(false)} 
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {eventFormSuccess ? (
              <div className="py-10 text-center animate-fade-in">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h4 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
                  ¡{eventForm.type === 'riego' ? 'Riego' : 'Lluvia'} Registrado Exitosamente!
                </h4>
                <p className="mt-1 text-xs text-slate-500">El evento hídrico ha sido guardado en el historial.</p>
              </div>
            ) : (
              <form onSubmit={handleSaveEvent} className="mt-4 space-y-4">
                {/* Event Type Toggle Selector */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Tipo de Evento Hídrico</label>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => setEventForm((prev) => ({ ...prev, type: 'riego' }))}
                      className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition ${
                        eventForm.type === 'riego'
                          ? 'bg-white text-cyan-700 shadow-sm dark:bg-slate-700 dark:text-cyan-300'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                      }`}
                    >
                      <Droplets className="h-4 w-4 text-cyan-600" />
                      💧 Riego Aplicado
                    </button>
                    <button
                      type="button"
                      onClick={() => setEventForm((prev) => ({ ...prev, type: 'lluvia' }))}
                      className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition ${
                        eventForm.type === 'lluvia'
                          ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-blue-300'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                      }`}
                    >
                      <CloudRain className="h-4 w-4 text-blue-600" />
                      🌧️ Lluvia Pluviómetro
                    </button>
                  </div>
                </div>

                {/* Date & Time fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Fecha</label>
                    <input
                      type="date"
                      required
                      value={eventForm.date}
                      onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-crop-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Hora</label>
                    <input
                      type="time"
                      required
                      value={eventForm.time}
                      onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-crop-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* Amount and Method */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {eventForm.type === 'riego' ? 'Agua aplicada en el riego (mm)' : 'Agua caída por lluvia (mm)'}
                    </label>
                    <div className="relative mt-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="300"
                        required
                        value={eventForm.amount_mm}
                        onChange={(e) => setEventForm({ ...eventForm, amount_mm: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-crop-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                      <span className="absolute right-3 top-2 text-xs font-medium text-slate-400">mm</span>
                    </div>
                  </div>

                  {eventForm.type === 'riego' ? (
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Método / Equipo</label>
                      <select
                        value={eventForm.method}
                        onChange={(e) => setEventForm({ ...eventForm, method: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-crop-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="Pivote Central">Pivote Central</option>
                        <option value="Goteo">Goteo Subterráneo</option>
                        <option value="Aspersión">Aspersión Fija</option>
                        <option value="Cañón Enrollador">Cañón Enrollador</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Fuente de Medición</label>
                      <input
                        type="text"
                        disabled
                        value="Pluviómetro Manual Campo"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500 outline-none dark:border-slate-700 dark:bg-slate-800/50"
                      />
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Observaciones</label>
                  <textarea
                    rows={2}
                    value={eventForm.notes}
                    onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 outline-none focus:border-crop-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="Detalles adicionales sobre la condición o mediciones..."
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    type="button" 
                    disabled={isSubmittingEvent} 
                    onClick={() => setIsEventModalOpen(false)} 
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmittingEvent} 
                    className="rounded-xl bg-gradient-to-r from-crop-600 to-water-600 hover:from-crop-500 hover:to-water-500 px-5 py-2 text-xs font-bold text-white shadow-md transition disabled:opacity-50"
                  >
                    {isSubmittingEvent ? 'Guardando...' : 'Guardar Evento'}
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
                    <label className="text-xs font-semibold text-slate-700">Agua registrada (mm)</label>
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
