"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Activity, AlertTriangle, Droplets, Sparkles } from 'lucide-react';
import {
  FieldAgentSnapshot,
  FieldItem,
  getFieldAgentSnapshotApi,
  refreshFieldAgentSnapshotApi,
  getHydricHistoryApi,
  HydricHistoryDay,
  FieldTeamMember,
  getTeamMembersApi
} from '@/lib/api';

export interface LotHydricData {
  id: string;
  name: string;
  crop: string;
  areaHa: number;
  soilType: string;
  irrigationSystem: string;
  hydricStatus: 'Normal' | 'Atencion' | 'Critico';
  deficitDr_mm: number;
  waterAvailableAU_mm: number;
  waterAvailableAU_pct: number;
  easilyAvailableAFD_mm: number;
  totalAvailableTAW_mm: number;
  etcToday_mm: number;
  et0Today_mm: number;
  ndviCurrent: number;
  ndviDataAvailable?: boolean;
  ndviObservationDate?: string | null;
  ndviCloudCoveragePct?: number | null;
  ndviValidPixelCoveragePct?: number | null;
  usesEstimatedAgronomicData?: boolean;
  kcSatellite: number;
  irrigationPriority: 'Alta' | 'Media' | 'Baja';
  priorityReason: string;
  pumpingWindow: string;
  lastIrrigationDate: string;
  lastIrrigationAmount_mm: number;
  lastRainDate: string;
  lastRainAmount_mm: number;
  timeline: {
    date: string;
    dayLabel: string;
    dr_mm: number;
    au_mm: number;
    afd_mm: number;
    raw_mm?: number;
    taw_mm: number;
    rain_mm?: number;
    irrigation_mm?: number;
    deep_percolation_mm?: number;
    ndvi?: number;
    kc?: number;
    kc_source?: string;
    under_stress?: boolean;
    rain_source?: string;
  }[];
}

export type MenuTab = 'dashboard' | 'mapa_lotes' | 'historial' | 'asistente_ia' | 'configuracion';

export const kpis = [
  { title: 'Próxima acción', value: 'Revisar riego', delta: '1 lote se acerca al umbral', icon: Sparkles, tone: 'text-crop-700 bg-crop-100 dark:bg-crop-950 dark:text-crop-300' },
  { title: 'Lotes críticos', value: '1', delta: 'Lote Sur', icon: AlertTriangle, tone: 'text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300' },
  { title: 'Agua disponible', value: '68%', delta: 'Promedio utilizable por el cultivo', icon: Droplets, tone: 'text-water-700 bg-water-100 dark:bg-water-950 dark:text-water-300' },
  { title: 'Estado agentes', value: 'OK', delta: 'Agentes con datos actualizados', icon: Activity, tone: 'text-sky-700 bg-sky-100 dark:bg-sky-950 dark:text-sky-300' },
];

export const initialMockLots: LotHydricData[] = [
  {
    id: 'lote-1',
    name: 'Lote Norte',
    crop: 'Soja 2da',
    areaHa: 65,
    soilType: 'Franco Limoso',
    irrigationSystem: 'Pivote Central',
    hydricStatus: 'Normal',
    deficitDr_mm: 14.2,
    waterAvailableAU_mm: 85.8,
    waterAvailableAU_pct: 86,
    easilyAvailableAFD_mm: 45.0,
    totalAvailableTAW_mm: 100.0,
    etcToday_mm: 4.8,
    et0Today_mm: 4.2,
    ndviCurrent: 0.82,
    ndviObservationDate: '2026-08-08',
    ndviCloudCoveragePct: 4,
    ndviValidPixelCoveragePct: null,
    kcSatellite: 1.15,
    irrigationPriority: 'Baja',
    priorityReason: 'Confort hídrico adecuado. Sin estrés proyectado en 72 h.',
    pumpingWindow: '04:00 - 07:00 hs',
    lastIrrigationDate: '04/08/2026',
    lastIrrigationAmount_mm: 20,
    lastRainDate: '28/07/2026',
    lastRainAmount_mm: 18,
    timeline: [
      { date: '02/08', dayLabel: 'Dom', dr_mm: 8.0, au_mm: 92.0, afd_mm: 45, taw_mm: 100, rain_mm: 12 },
      { date: '03/08', dayLabel: 'Lun', dr_mm: 12.5, au_mm: 87.5, afd_mm: 45, taw_mm: 100 },
      { date: '04/08', dayLabel: 'Mar', dr_mm: 6.0, au_mm: 94.0, afd_mm: 45, taw_mm: 100, irrigation_mm: 20 },
      { date: '05/08', dayLabel: 'Mie', dr_mm: 9.8, au_mm: 90.2, afd_mm: 45, taw_mm: 100 },
      { date: '06/08', dayLabel: 'Jue', dr_mm: 13.5, au_mm: 86.5, afd_mm: 45, taw_mm: 100 },
      { date: '07/08', dayLabel: 'Vie', dr_mm: 14.0, au_mm: 86.0, afd_mm: 45, taw_mm: 100 },
      { date: '08/08', dayLabel: 'Sab', dr_mm: 14.2, au_mm: 85.8, afd_mm: 45, taw_mm: 100 },
    ],
  },
  {
    id: 'lote-2',
    name: 'Lote Centro',
    crop: 'Maíz Tardío',
    areaHa: 92,
    soilType: 'Franco Arcilloso',
    irrigationSystem: 'Goteo Subterráneo',
    hydricStatus: 'Atencion',
    deficitDr_mm: 36.5,
    waterAvailableAU_mm: 63.5,
    waterAvailableAU_pct: 63,
    easilyAvailableAFD_mm: 42.0,
    totalAvailableTAW_mm: 100.0,
    etcToday_mm: 5.4,
    et0Today_mm: 4.5,
    ndviCurrent: 0.74,
    ndviObservationDate: '2026-08-08',
    ndviCloudCoveragePct: 5,
    ndviValidPixelCoveragePct: null,
    kcSatellite: 1.20,
    irrigationPriority: 'Media',
    priorityReason: 'Déficit Dr aproximándose al umbral AFD. Conviene aplicar en 24h.',
    pumpingWindow: '23:00 - 05:00 hs',
    lastIrrigationDate: '01/08/2026',
    lastIrrigationAmount_mm: 15,
    lastRainDate: '26/07/2026',
    lastRainAmount_mm: 10,
    timeline: [
      { date: '02/08', dayLabel: 'Dom', dr_mm: 20.0, au_mm: 80.0, afd_mm: 42, taw_mm: 100 },
      { date: '03/08', dayLabel: 'Lun', dr_mm: 24.5, au_mm: 75.5, afd_mm: 42, taw_mm: 100 },
      { date: '04/08', dayLabel: 'Mar', dr_mm: 28.0, au_mm: 72.0, afd_mm: 42, taw_mm: 100 },
      { date: '05/08', dayLabel: 'Mie', dr_mm: 31.0, au_mm: 69.0, afd_mm: 42, taw_mm: 100 },
      { date: '06/08', dayLabel: 'Jue', dr_mm: 34.0, au_mm: 66.0, afd_mm: 42, taw_mm: 100 },
      { date: '07/08', dayLabel: 'Vie', dr_mm: 35.8, au_mm: 64.2, afd_mm: 42, taw_mm: 100 },
      { date: '08/08', dayLabel: 'Sab', dr_mm: 36.5, au_mm: 63.5, afd_mm: 42, taw_mm: 100 },
    ],
  },
  {
    id: 'lote-3',
    name: 'Lote Sur',
    crop: 'Trigo',
    areaHa: 48,
    soilType: 'Franco Arenoso',
    irrigationSystem: 'Aspersión Fija',
    hydricStatus: 'Critico',
    deficitDr_mm: 52.0,
    waterAvailableAU_mm: 38.0,
    waterAvailableAU_pct: 38,
    easilyAvailableAFD_mm: 40.0,
    totalAvailableTAW_mm: 90.0,
    etcToday_mm: 3.9,
    et0Today_mm: 4.1,
    ndviCurrent: 0.58,
    ndviObservationDate: '2026-08-08',
    ndviCloudCoveragePct: 7,
    ndviValidPixelCoveragePct: null,
    kcSatellite: 0.95,
    irrigationPriority: 'Alta',
    priorityReason: 'Déficit superó el umbral RAW (40 mm). Estrés hídrico inminente.',
    pumpingWindow: 'Inmediata / Noche 01:00 hs',
    lastIrrigationDate: '26/07/2026',
    lastIrrigationAmount_mm: 22,
    lastRainDate: '20/07/2026',
    lastRainAmount_mm: 5,
    timeline: [
      { date: '02/08', dayLabel: 'Dom', dr_mm: 32.0, au_mm: 58.0, afd_mm: 40, taw_mm: 90 },
      { date: '03/08', dayLabel: 'Lun', dr_mm: 36.0, au_mm: 54.0, afd_mm: 40, taw_mm: 90 },
      { date: '04/08', dayLabel: 'Mar', dr_mm: 40.5, au_mm: 49.5, afd_mm: 40, taw_mm: 90 },
      { date: '05/08', dayLabel: 'Mie', dr_mm: 44.0, au_mm: 46.0, afd_mm: 40, taw_mm: 90 },
      { date: '06/08', dayLabel: 'Jue', dr_mm: 47.5, au_mm: 42.5, afd_mm: 40, taw_mm: 90 },
      { date: '07/08', dayLabel: 'Vie', dr_mm: 50.0, au_mm: 40.0, afd_mm: 40, taw_mm: 90 },
      { date: '08/08', dayLabel: 'Sab', dr_mm: 52.0, au_mm: 38.0, afd_mm: 40, taw_mm: 90 },
    ],
  },
  {
    id: 'lote-4',
    name: 'Lote Este',
    crop: 'Girasol',
    areaHa: 75,
    soilType: 'Franco Limoso',
    irrigationSystem: 'Pivote Central',
    hydricStatus: 'Normal',
    deficitDr_mm: 21.0,
    waterAvailableAU_mm: 79.0,
    waterAvailableAU_pct: 79,
    easilyAvailableAFD_mm: 44.0,
    totalAvailableTAW_mm: 100.0,
    etcToday_mm: 4.2,
    et0Today_mm: 4.3,
    ndviCurrent: 0.79,
    ndviObservationDate: '2026-08-08',
    ndviCloudCoveragePct: 4,
    ndviValidPixelCoveragePct: null,
    kcSatellite: 1.05,
    irrigationPriority: 'Baja',
    priorityReason: 'Reserva hídrica suficiente. Balance positivo con ETc moderada.',
    pumpingWindow: '05:00 - 08:00 hs',
    lastIrrigationDate: '03/08/2026',
    lastIrrigationAmount_mm: 16,
    lastRainDate: '28/07/2026',
    lastRainAmount_mm: 14,
    timeline: [
      { date: '02/08', dayLabel: 'Dom', dr_mm: 22.0, au_mm: 78.0, afd_mm: 44, taw_mm: 100 },
      { date: '03/08', dayLabel: 'Lun', dr_mm: 10.0, au_mm: 90.0, afd_mm: 44, taw_mm: 100, irrigation_mm: 16 },
      { date: '04/08', dayLabel: 'Mar', dr_mm: 13.0, au_mm: 87.0, afd_mm: 44, taw_mm: 100 },
      { date: '05/08', dayLabel: 'Mie', dr_mm: 15.5, au_mm: 84.5, afd_mm: 44, taw_mm: 100 },
      { date: '06/08', dayLabel: 'Jue', dr_mm: 18.0, au_mm: 82.0, afd_mm: 44, taw_mm: 100 },
      { date: '07/08', dayLabel: 'Vie', dr_mm: 19.8, au_mm: 80.2, afd_mm: 44, taw_mm: 100 },
      { date: '08/08', dayLabel: 'Sab', dr_mm: 21.0, au_mm: 79.0, afd_mm: 44, taw_mm: 100 },
    ],
  },
];

export const defaultDemoPolygons: { [id: string]: [number, number][] } = {
  'lote-1': [
    [-33.8820, -60.5820],
    [-33.8820, -60.5690],
    [-33.8890, -60.5690],
    [-33.8890, -60.5820],
  ],
  'lote-2': [
    [-33.8910, -60.5820],
    [-33.8910, -60.5690],
    [-33.8980, -60.5690],
    [-33.8980, -60.5820],
  ],
  'lote-3': [
    [-33.8820, -60.5670],
    [-33.8820, -60.5540],
    [-33.8890, -60.5540],
    [-33.8890, -60.5670],
  ],
  'lote-4': [
    [-33.8910, -60.5670],
    [-33.8910, -60.5540],
    [-33.8980, -60.5540],
    [-33.8980, -60.5670],
  ],
};

export function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function formatDate(value: string | undefined, fallback = '-'): string {
  if (!value) return fallback;
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return fallback;
  return `${day}/${month}/${year}`;
}

export function priorityFromUrgency(urgency?: string): 'Alta' | 'Media' | 'Baja' {
  if (urgency === 'HIGH') return 'Alta';
  if (urgency === 'MEDIUM') return 'Media';
  return 'Baja';
}

export function statusFromUrgency(urgency?: string): 'Normal' | 'Atencion' | 'Critico' {
  if (urgency === 'HIGH') return 'Critico';
  if (urgency === 'MEDIUM') return 'Atencion';
  return 'Normal';
}

export function buildAgentTimeline(
  dateTo: string | undefined,
  deficitMm: number,
  tawMm: number,
  afdMm: number,
  totalEtcMm: number,
  totalRainMm: number,
  irrigationAppliedMm: number,
  ndvi?: number,
  kc?: number
): LotHydricData['timeline'] {
  const end = dateTo ? new Date(`${dateTo}T00:00:00`) : new Date();
  const days = 7;
  const dailyEtc = totalEtcMm > 0 ? totalEtcMm / days : 3.5;
  const dailyRain = totalRainMm > 0 ? totalRainMm / days : 0;
  const startDeficit = Math.max(0, deficitMm - (dailyEtc - dailyRain) * (days - 1) + irrigationAppliedMm);

  return Array.from({ length: days }, (_, index) => {
    const current = new Date(end);
    current.setDate(end.getDate() - (days - 1 - index));
    const dr = Math.max(0, round1(startDeficit + (dailyEtc - dailyRain) * index - (index === 0 ? irrigationAppliedMm : 0)));
    const au = Math.max(0, round1(tawMm - dr));

    return {
      date: `${String(current.getDate()).padStart(2, '0')}/${String(current.getMonth() + 1).padStart(2, '0')}`,
      dayLabel: current.toLocaleDateString('es-AR', { weekday: 'short' }),
      dr_mm: dr,
      au_mm: au,
      afd_mm: afdMm,
      taw_mm: tawMm,
      rain_mm: totalRainMm > 0 ? round1(dailyRain) : undefined,
      irrigation_mm: index === 0 && irrigationAppliedMm > 0 ? irrigationAppliedMm : undefined,
      ndvi,
      kc,
    };
  });
}

export function fieldToLot(field: FieldItem, index: number, snapshot?: FieldAgentSnapshot | null): LotHydricData {
  const analyze = snapshot?.analyze_response || {};
  const recommendation = analyze.recommendation || {};
  const waterBalance = recommendation.water_balance || {};
  const metrics = waterBalance.metrics || {};
  const weatherMetrics = waterBalance.weather_context?.metrics || {};
  const ndviMetrics = analyze.ndvi_context?.metrics || {};
  const kcContext = analyze.crop_coefficient_context || {};
  const weatherCompare = snapshot?.weather_compare_response?.operational_recommendation || {};

  const taw = asNumber(field.total_available_water_taw, 100);
  const afd = round1(taw * 0.5);
  const deficit = round1(asNumber(metrics.deficit_mm, 0));
  const available = Math.max(0, round1(taw - deficit));
  const urgency = analyze.urgency || recommendation.urgency || weatherCompare.urgency;
  const hydricStatus = snapshot ? statusFromUrgency(urgency) : 'Atencion';
  const priority = snapshot ? priorityFromUrgency(urgency) : 'Media';
  const daysAnalyzed = Math.max(1, asNumber(metrics.days_analyzed, 7));
  const totalEtc = asNumber(metrics.total_etc_mm, 0);
  const totalEt0 = asNumber(weatherMetrics.total_et0_mm, 0);
  const totalRain = asNumber(weatherMetrics.total_precipitation_mm, 0);
  const irrigationApplied = asNumber(metrics.irrigation_applied_mm, 0);
  const kc = asNumber(kcContext.crop_coefficient, asNumber(metrics.crop_coefficient, 1));
  const hasNdvi = typeof ndviMetrics.ndvi_mean === 'number';
  const ndvi = hasNdvi ? asNumber(ndviMetrics.ndvi_mean, 0) : 0;
  const ndviObservationDate = typeof ndviMetrics.observation_date === 'string' ? ndviMetrics.observation_date : null;
  const ndviCloudCoveragePct =
    typeof ndviMetrics.cloud_coverage_pct === 'number' ? ndviMetrics.cloud_coverage_pct : null;
  const ndviValidPixelCoveragePct =
    typeof ndviMetrics.valid_pixel_coverage_pct === 'number' ? ndviMetrics.valid_pixel_coverage_pct : null;
  const usesEstimatedAgronomicData =
    !field.soil_type ||
    field.soil_type === 'AUTO' ||
    !field.total_available_water_taw ||
    (field.initial_available_water_pct == null && field.initial_available_water_mm == null);
  const dateTo = snapshot?.analyze_payload?.date_to || snapshot?.weather_compare_payload?.date_to;

  return {
    id: String(field.id),
    name: field.name,
    crop: field.crop_type || 'Cultivo',
    areaHa: field.area_ha || 0,
    soilType: field.soil_type || 'Auto / estimado',
    irrigationSystem: field.irrigation_system || 'Sin especificar',
    hydricStatus,
    deficitDr_mm: deficit,
    waterAvailableAU_mm: available,
    waterAvailableAU_pct: taw > 0 ? Math.max(0, Math.min(100, Math.round((available / taw) * 100))) : 0,
    easilyAvailableAFD_mm: afd,
    totalAvailableTAW_mm: taw,
    etcToday_mm: round1(totalEtc / daysAnalyzed),
    et0Today_mm: round1(totalEt0 / daysAnalyzed),
    ndviCurrent: ndvi,
    ndviDataAvailable: hasNdvi,
    ndviObservationDate,
    ndviCloudCoveragePct,
    ndviValidPixelCoveragePct,
    usesEstimatedAgronomicData,
    kcSatellite: kc,
    irrigationPriority: priority,
    priorityReason:
      analyze.final_recommendation ||
      recommendation.summary ||
      weatherCompare.evidence?.decision_rule ||
      (snapshot ? 'Análisis MAS disponible para el lote.' : 'Sin snapshot de agentes. Actualizá agentes para cargar datos reales.'),
    pumpingWindow: priority === 'Alta' ? 'Inmediata / próxima ventana nocturna' : '04:00 - 07:00 hs',
    lastIrrigationDate: irrigationApplied > 0 ? formatDate(dateTo) : '-',
    lastIrrigationAmount_mm: irrigationApplied,
    lastRainDate: totalRain > 0 ? formatDate(dateTo) : '-',
    lastRainAmount_mm: round1(totalRain),
    timeline: buildAgentTimeline(dateTo, deficit, taw, afd, totalEtc, totalRain, irrigationApplied, ndvi || undefined, kc),
  };
}

interface DashboardContextType {
  lotsData: LotHydricData[];
  setLotsData: React.Dispatch<React.SetStateAction<LotHydricData[]>>;
  selectedLotId: string;
  setSelectedLotId: (id: string) => void;
  selectedField: FieldItem | null;
  selectedSnapshot: FieldAgentSnapshot | null;
  hasCustomLots: boolean;
  setHasCustomLots: (val: boolean) => void;
  customCenter: [number, number];
  setCustomCenter: (coords: [number, number]) => void;
  rawCustomPolygons: Record<string, [number, number][]>;
  setRawCustomPolygons: React.Dispatch<React.SetStateAction<Record<string, [number, number][]>>>;
  fieldSnapshots: Record<string, FieldAgentSnapshot | null>;
  setFieldSnapshots: React.Dispatch<React.SetStateAction<Record<string, FieldAgentSnapshot | null>>>;
  isRefreshingAgents: boolean;
  setIsRefreshingAgents: (val: boolean) => void;
  agentRefreshError: string | null;
  setAgentRefreshError: (err: string | null) => void;
  dateFrom: string;
  setDateFrom: (val: string) => void;
  dateTo: string;
  setDateTo: (val: string) => void;
  historyReloadTrigger: number;
  setHistoryReloadTrigger: React.Dispatch<React.SetStateAction<number>>;
  realHistory: HydricHistoryDay[];
  setRealHistory: React.Dispatch<React.SetStateAction<HydricHistoryDay[]>>;
  isLoadingHistory: boolean;
  setIsLoadingHistory: (val: boolean) => void;
  refreshAgentSnapshots: () => Promise<void>;
  teamMembers: FieldTeamMember[];
  setTeamMembers: React.Dispatch<React.SetStateAction<FieldTeamMember[]>>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  const [lotsData, setLotsData] = useState<LotHydricData[]>(initialMockLots);
  const [selectedLotId, setSelectedLotId] = useState<string>(initialMockLots[0]?.id || '');
  const [hasCustomLots, setHasCustomLots] = useState(false);
  const [customCenter, setCustomCenter] = useState<[number, number]>([-33.8906, -60.5732]);
  const [rawCustomPolygons, setRawCustomPolygons] = useState<{ [id: string]: [number, number][] }>(defaultDemoPolygons);
  const [fieldSnapshots, setFieldSnapshots] = useState<Record<string, FieldAgentSnapshot | null>>({});
  const [isRefreshingAgents, setIsRefreshingAgents] = useState(false);
  const [agentRefreshError, setAgentRefreshError] = useState<string | null>(null);

  // Real daily history states
  const [realHistory, setRealHistory] = useState<HydricHistoryDay[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyReloadTrigger, setHistoryReloadTrigger] = useState(0);
  const [teamMembers, setTeamMembers] = useState<FieldTeamMember[]>([]);

  // Date range selectors (default to last 30 days)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  // Resolved Selected Field
  const selectedField = useMemo(() => {
    return auth.fields?.find((field) => String(field.id) === selectedLotId) || null;
  }, [auth.fields, selectedLotId]);

  // Resolved Selected Snapshot
  const selectedSnapshot = useMemo(() => {
    return selectedField ? fieldSnapshots[String(selectedField.id)] : null;
  }, [fieldSnapshots, selectedField]);

  // Refresh agent snapshots
  const refreshAgentSnapshots = async () => {
    if (!auth.fields || auth.fields.length === 0) return;
    setIsRefreshingAgents(true);
    setAgentRefreshError(null);

    try {
      await Promise.all(
        auth.fields.map(async (field) => {
          const res = await refreshFieldAgentSnapshotApi(field.id, {
            force: true,
            date_from: dateFrom,
            date_to: dateTo,
          });
          if (res.ok && res.data) {
            setFieldSnapshots((prev) => ({
              ...prev,
              [String(field.id)]: res.data,
            }));
          }
        })
      );
    } catch (err) {
      console.error('Error refreshing agent snapshots:', err);
      setAgentRefreshError('Ocurrió un error al contactar a los agentes. Inténtelo de nuevo.');
    } finally {
      setIsRefreshingAgents(false);
    }
  };

  // 1. Initial snapshot loading on mount
  useEffect(() => {
    if (auth.isLoading || !auth.fields) return;

    let isCancelled = false;
    async function loadAllSnapshots() {
      const snapshotsMap: Record<string, FieldAgentSnapshot | null> = {};
      await Promise.all(
        auth.fields.map(async (field) => {
          try {
            const data = await getFieldAgentSnapshotApi(field.id);
            snapshotsMap[String(field.id)] = data;
          } catch (err) {
            console.error(`Failed to load snapshot for field ${field.id}:`, err);
            snapshotsMap[String(field.id)] = null;
          }
        })
      );

      if (!isCancelled) {
        setFieldSnapshots(snapshotsMap);
      }
    }

    if (auth.fields.length > 0) {
      loadAllSnapshots();
    }
  }, [auth.fields, auth.isLoading]);

  // 2. Synchronize lotsData with custom fields & snapshots
  useEffect(() => {
    const hasCustom = auth.fields && auth.fields.length > 0;
    setHasCustomLots(hasCustom);

    if (hasCustom) {
      const customLots = auth.fields.map((field, idx) => {
        const snapshot = fieldSnapshots[String(field.id)];
        return fieldToLot(field, idx, snapshot);
      });
      setLotsData(customLots);

      // Auto-select first lot if current lot is invalid
      const currentExists = customLots.some((l) => l.id === selectedLotId);
      if (!currentExists && customLots[0]) {
        setSelectedLotId(customLots[0].id);
      }

      // Center map on first custom field polygon
      const firstField = auth.fields[0];
      if (firstField?.geometry_geojson?.coordinates?.[0]?.[0]) {
        const poly = firstField.geometry_geojson.coordinates[0];
        const sum = poly.reduce((acc: number[], coord: number[]) => {
          const lat = typeof coord[1] === 'number' ? coord[1] : 0;
          const lng = typeof coord[0] === 'number' ? coord[0] : 0;
          return [acc[0] + lat, acc[1] + lng];
        }, [0, 0]);
        setCustomCenter([sum[0] / poly.length, sum[1] / poly.length]);
      }

      // Map raw coordinates for drawing
      const polygonsMap: { [id: string]: [number, number][] } = {};
      auth.fields.forEach((f) => {
        if (f.geometry_geojson?.coordinates?.[0]) {
          polygonsMap[String(f.id)] = f.geometry_geojson.coordinates[0].map((c: any) => [c[1], c[0]]);
        }
      });
      setRawCustomPolygons(polygonsMap);
    } else {
      setLotsData(initialMockLots);
      setRawCustomPolygons(defaultDemoPolygons);
      const currentExists = initialMockLots.some((l) => l.id === selectedLotId);
      if (!currentExists && initialMockLots[0]) {
        setSelectedLotId(initialMockLots[0].id);
      }
    }
  }, [auth.fields, auth.isLoading, fieldSnapshots]);

  // 3. Load real daily history when lot selected or trigger fired
  useEffect(() => {
    if (!selectedField) {
      setRealHistory([]);
      return;
    }

    const fieldId = selectedField.id;
    let isCancelled = false;
    async function loadRealHistory() {
      setIsLoadingHistory(true);
      try {
        const history = await getHydricHistoryApi(fieldId, dateFrom, dateTo);
        if (!isCancelled) {
          setRealHistory(history);
        }
      } catch (err) {
        console.error('Failed to load real history:', err);
      } finally {
        if (!isCancelled) {
          setIsLoadingHistory(false);
        }
      }
    }

    loadRealHistory();

    return () => {
      isCancelled = true;
    };
  }, [selectedField, dateFrom, dateTo, historyReloadTrigger]);

  return (
    <DashboardContext.Provider
      value={{
        lotsData,
        setLotsData,
        selectedLotId,
        setSelectedLotId,
        selectedField,
        selectedSnapshot,
        hasCustomLots,
        setHasCustomLots,
        customCenter,
        setCustomCenter,
        rawCustomPolygons,
        setRawCustomPolygons,
        fieldSnapshots,
        setFieldSnapshots,
        isRefreshingAgents,
        setIsRefreshingAgents,
        agentRefreshError,
        setAgentRefreshError,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        historyReloadTrigger,
        setHistoryReloadTrigger,
        realHistory,
        setRealHistory,
        isLoadingHistory,
        setIsLoadingHistory,
        refreshAgentSnapshots,
        teamMembers,
        setTeamMembers,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
