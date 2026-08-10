"use client";

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  AlertTriangle,
  Bot,
  CalendarRange,
  ChevronRight,
  CircleGauge,
  Droplets,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Home,
  Layers3,
  Leaf,
  LogOut,
  Map,
  MapPinned,
  PanelLeftClose,
  Search,
  Settings,
  ShieldAlert,
  Sliders,
  Sparkles,
  Sprout,
  SunMedium,
  Truck,
  UserCircle,
  Waves,
  Wind,
} from 'lucide-react';
import { Fao56LotDetail } from '@/components/fao56-lot-detail';
import { LotDetailView, LotHydricData } from '@/components/lot-detail-view';
import { Topbar } from '@/components/topbar';
import { useAuth } from '@/lib/auth-context';
import {
  FieldAgentSnapshot,
  FieldItem,
  getFieldAgentSnapshotApi,
  refreshFieldAgentSnapshotApi,
} from '@/lib/api';

// Load DashboardMap only on client side to prevent Leaflet SSR errors
const DashboardMap = dynamic(
  () => import('@/components/dashboard-map'),
  { ssr: false }
);

export type MenuTab = 'dashboard' | 'mapa_lotes' | 'historial' | 'asistente_ia' | 'configuracion';

const navigationItems = [
  { id: 'dashboard' as MenuTab, label: 'Inicio / Dashboard', icon: Home },
  { id: 'mapa_lotes' as MenuTab, label: 'Mapa de Lotes', icon: Map },
  { id: 'historial' as MenuTab, label: 'Historial y Reportes', icon: History },
  { id: 'asistente_ia' as MenuTab, label: 'Asistente IA', icon: Bot, badge: 'MAS' },
  { id: 'configuracion' as MenuTab, label: 'Configuración', icon: Settings },
];

const kpis = [
  { title: 'Lotes monitoreados', value: '4', delta: '+1 este ciclo', icon: MapPinned, tone: 'text-crop-700 bg-crop-100 dark:bg-crop-950 dark:text-crop-300' },
  { title: 'Alertas activas', value: '2', delta: '1 crítica en Lote Sur', icon: AlertTriangle, tone: 'text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300' },
  { title: 'Agua optimizada', value: '18.4%', delta: 'vs. método tradicional', icon: Droplets, tone: 'text-water-700 bg-water-100 dark:bg-water-950 dark:text-water-300' },
  { title: 'Eficiencia MAS', value: '92%', delta: 'decisiones en ventana óptima', icon: CircleGauge, tone: 'text-sky-700 bg-sky-100 dark:bg-sky-950 dark:text-sky-300' },
];

// Rich baseline dataset for default lots with full FAO-56 metrics
const initialMockLots: LotHydricData[] = [
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

// Default demo polygons (Pergamino, Buenos Aires agricultural belt)
const defaultDemoPolygons: { [id: string]: [number, number][] } = {
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

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatDate(value: string | undefined, fallback = '-'): string {
  if (!value) return fallback;
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return fallback;
  return `${day}/${month}/${year}`;
}

function priorityFromUrgency(urgency?: string): 'Alta' | 'Media' | 'Baja' {
  if (urgency === 'HIGH') return 'Alta';
  if (urgency === 'MEDIUM') return 'Media';
  return 'Baja';
}

function statusFromUrgency(urgency?: string): 'Normal' | 'Atencion' | 'Critico' {
  if (urgency === 'HIGH') return 'Critico';
  if (urgency === 'MEDIUM') return 'Atencion';
  return 'Normal';
}

function buildAgentTimeline(
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

function fieldToLot(field: FieldItem, index: number, snapshot?: FieldAgentSnapshot | null): LotHydricData {
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
  const ndvi = asNumber(ndviMetrics.ndvi_mean, 0);
  const dateTo = snapshot?.analyze_payload?.date_to || snapshot?.weather_compare_payload?.date_to;

  return {
    id: String(field.id),
    name: field.name,
    crop: field.crop_type || 'Cultivo',
    areaHa: field.area_ha || 0,
    soilType: field.soil_type || 'Sin especificar',
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

export default function DashboardPage() {
  const auth = useAuth();
  const [currentTab, setCurrentTab] = useState<MenuTab>('mapa_lotes');
  const [lotsData, setLotsData] = useState<LotHydricData[]>(initialMockLots);
  const [selectedLotId, setSelectedLotId] = useState<string>(initialMockLots[0]?.id || '');
  const [hasCustomLots, setHasCustomLots] = useState(false);
  const [customCenter, setCustomCenter] = useState<[number, number]>([-33.8906, -60.5732]);
  const [rawCustomPolygons, setRawCustomPolygons] = useState<{ [id: string]: [number, number][] }>(defaultDemoPolygons);
  const [fieldSnapshots, setFieldSnapshots] = useState<Record<string, FieldAgentSnapshot | null>>({});
  const [isRefreshingAgents, setIsRefreshingAgents] = useState(false);
  const [agentRefreshError, setAgentRefreshError] = useState<string | null>(null);

  const currentUser = auth.user;

  useEffect(() => {
    if (auth.isLoading || !auth.fields || auth.fields.length === 0) {
      setFieldSnapshots({});
      return;
    }

    let isCancelled = false;

    async function loadSnapshots() {
      const entries = await Promise.all(
        auth.fields.map(async (field) => {
          const snapshot = field.agent_snapshot ?? (await getFieldAgentSnapshotApi(field.id));
          return [String(field.id), snapshot] as const;
        })
      );

      if (!isCancelled) {
        setFieldSnapshots(Object.fromEntries(entries));
      }
    }

    loadSnapshots();

    return () => {
      isCancelled = true;
    };
  }, [auth.fields, auth.isLoading]);

  // Initialize lots from API or localStorage
  useEffect(() => {
    if (auth.isLoading) return;

    if (auth.fields && auth.fields.length > 0) {
      setHasCustomLots(true);
      const polyMap: { [id: string]: [number, number][] } = {};
      
      const converted: LotHydricData[] = auth.fields.map((f, idx) => {
        const coords = f.geometry_geojson?.coordinates?.[0] || [];
        const polygon = coords.map(([lng, lat]) => [lat, lng] as [number, number]);
        const lotId = String(f.id);
        polyMap[lotId] = polygon;

        return fieldToLot(f, idx, fieldSnapshots[lotId] ?? f.agent_snapshot ?? null);
      });

      setLotsData(converted);
      setRawCustomPolygons(polyMap);
      if (converted.length > 0) {
        setSelectedLotId((currentId) =>
          converted.some((lot) => lot.id === currentId) ? currentId : converted[0].id
        );
      }
      if (auth.fields[0]?.center_latitude && auth.fields[0]?.center_longitude) {
        setCustomCenter([auth.fields[0].center_latitude, auth.fields[0].center_longitude]);
      }
      return;
    }

    setHasCustomLots(false);
    setLotsData(initialMockLots);
    setRawCustomPolygons(defaultDemoPolygons);
    setCustomCenter([-33.8906, -60.5732]);
    setSelectedLotId((currentId) =>
      initialMockLots.some((lot) => lot.id === currentId) ? currentId : initialMockLots[0]?.id || ''
    );
  }, [auth.fields, auth.isLoading, fieldSnapshots]);

  // Selected Lot object
  const selectedLot = useMemo(() => {
    return lotsData.find((l) => l.id === selectedLotId) || lotsData[0];
  }, [lotsData, selectedLotId]);

  const selectedField = useMemo(() => {
    return auth.fields.find((field) => String(field.id) === selectedLotId) || null;
  }, [auth.fields, selectedLotId]);

  const selectedSnapshot = selectedField ? fieldSnapshots[String(selectedField.id)] : null;

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
  }, [lotsData, rawCustomPolygons]);

  // Handler for CU-05 (Registrar Riego)
  const handleRegisterIrrigation = (
    lotId: string,
    data: { date: string; amount_mm: number; method: string; notes?: string }
  ) => {
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
  };

  const handleRefreshSelectedAgents = async () => {
    if (!selectedField) return;

    setIsRefreshingAgents(true);
    setAgentRefreshError(null);

    const result = await refreshFieldAgentSnapshotApi(selectedField.id, {
      force: false,
      max_age_hours: 6,
    });

    if (result.ok) {
      setFieldSnapshots((prev) => ({
        ...prev,
        [String(selectedField.id)]: result.data,
      }));
    } else {
      setAgentRefreshError(result.data?.detail || 'No se pudo actualizar el análisis MAS del lote.');
    }

    setIsRefreshingAgents(false);
  };

  const breadcrumbLabels: { [key in MenuTab]: string } = {
    dashboard: 'Inicio / Dashboard',
    mapa_lotes: 'Mapa de Lotes',
    historial: 'Historial y Reportes',
    asistente_ia: 'Asistente IA',
    configuracion: 'Configuración',
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f6f1_0%,#eef2eb_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 p-4 lg:p-6">
        
        {/* SIDEBAR NAVIGATION (Fixed Viewport Height & Sticky) */}
        <aside className="hidden w-[280px] shrink-0 sticky top-4 lg:top-6 h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)] flex-col rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-soft backdrop-blur xl:flex justify-between overflow-y-auto">
          <div>
            
            {/* Logo & Brand */}
            <div className="flex items-center gap-3 border-b border-slate-200/80 pb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-crop-500 to-water-500 text-white shadow-lg shadow-crop-500/20">
                <Sprout className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">AgroMAS</p>
                <h1 className="text-lg font-semibold text-slate-950">Gestión inteligente</h1>
              </div>
            </div>

            {/* 5 Main Navigation Items */}
            <nav className="mt-6 space-y-1.5">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`group flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-crop-50 text-crop-800 font-bold shadow-sm ring-1 ring-crop-200 dark:bg-crop-950 dark:text-crop-300'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-crop-600' : 'text-slate-400 group-hover:text-slate-700'}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        {item.badge}
                      </span>
                    ) : isActive ? (
                      <ChevronRight className="h-4 w-4 text-crop-600" />
                    ) : null}
                  </button>
                );
              })}
            </nav>

            {/* Wizard & Lot Config Link */}
            <div className="mt-6 pt-4 border-t border-slate-200/80 space-y-2">
              <Link 
                href="/onboarding" 
                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-crop-600 to-water-600 hover:from-crop-500 hover:to-water-500 text-white rounded-2xl py-3 px-4 text-xs font-bold shadow-md hover:shadow-lg transition duration-200"
              >
                <MapPinned className="h-4 w-4" />
                Configurar Campo (Wizard)
              </Link>
            </div>
          </div>

          {/* System Status in Sidebar (User is in Topbar) */}
          <div className="space-y-3 pt-4 border-t border-slate-200/80">
            <div className="rounded-[24px] bg-slate-950 p-4 text-white shadow-lg">
              <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400 font-semibold">Estado del sistema</p>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Sentinel-2 MSI</span>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">Activo</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Balance FAO-56</span>
                  <span className="rounded-full bg-water-500/15 px-2 py-0.5 text-[10px] text-water-300">Calibrado</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Agente de Riego</span>
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300">Monitoreando</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <section className="flex min-w-0 flex-1 flex-col gap-6">
          
          {/* Top Bar with dynamic Breadcrumbs matching selected tab */}
          <Topbar 
            breadcrumbs={[
              { label: 'Inicio', href: '/' },
              { label: breadcrumbLabels[currentTab], active: true }
            ]}
          />

          {/* TAB 1: INICIO / DASHBOARD */}
          {currentTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              <div className="rounded-[28px] border border-white/70 bg-white/75 px-5 py-4 shadow-soft backdrop-blur md:px-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Tablero general</p>
                    <h2 className="text-2xl font-semibold text-slate-950 md:text-3xl">Monitoreo agroclimático y balance de lotes</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setCurrentTab('mapa_lotes')}
                      className="flex items-center gap-2 rounded-2xl bg-slate-950 text-white hover:bg-slate-800 px-4 py-2.5 text-xs font-bold shadow-md transition"
                    >
                      <Map className="h-4 w-4 text-emerald-400" />
                      Ir al Mapa de Lotes
                    </button>
                  </div>
                </div>
              </div>

              {/* KPI Cards */}
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {kpis.map((item) => {
                  const Icon = item.icon;
                  return (
                    <article key={item.title} className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-500">{item.title}</p>
                          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{item.value}</p>
                          <p className="mt-1 text-sm text-slate-500">{item.delta}</p>
                        </div>
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>

              {/* Overview FAO-56 section */}
              <section className="rounded-[30px] border border-slate-200/70 bg-slate-100/60 p-4 shadow-soft backdrop-blur md:p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Vista consolidada</p>
                    <h3 className="mt-1 text-2xl font-semibold text-slate-950">Balance hídrico global de la explotación</h3>
                  </div>
                </div>
                <Fao56LotDetail />
              </section>
            </div>
          )}

          {/* TAB 2: MAPA DE LOTES (Interactive Map + Specific Technical Lot Details + Event Markers + CU-05) */}
          {currentTab === 'mapa_lotes' && (
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
                        {selectedLot.name}
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
                      const statusColor = lot.hydricStatus === 'Normal' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : lot.hydricStatus === 'Atencion' ? 'border-amber-500/40 bg-amber-500/10 text-amber-400' : 'border-rose-500/40 bg-rose-500/10 text-rose-400';
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
                  onRegisterIrrigation={handleRegisterIrrigation}
                />
              )}

            </div>
          )}

          {/* TAB 3: HISTORIAL Y REPORTES */}
          {currentTab === 'historial' && (
            <div className="space-y-6 animate-fade-in">
              <div className="rounded-[28px] border border-white/70 bg-white/75 p-6 shadow-soft backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-water-100 text-water-700">
                    <History className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-950">Historial y Reportes de Riego</h2>
                    <p className="text-xs text-slate-500">Registro histórico de balances hídricos, precipitaciones y eventos de riego por lote.</p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-bold text-slate-800 mb-3">Registros de Riegos y Lluvias Recientes</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-slate-900 uppercase font-semibold border-b">
                        <tr>
                          <th className="p-3">Fecha</th>
                          <th className="p-3">Lote</th>
                          <th className="p-3">Tipo Evento</th>
                          <th className="p-3">Lámina (mm)</th>
                          <th className="p-3">Método / Fuente</th>
                          <th className="p-3">Estado Post-Evento</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="p-3 font-mono">04/08/2026</td>
                          <td className="p-3 font-semibold text-slate-900">Lote Norte</td>
                          <td className="p-3 text-cyan-600 font-bold">💧 Riego (CU-05)</td>
                          <td className="p-3 font-mono font-bold">20.0 mm</td>
                          <td className="p-3">Pivote Central</td>
                          <td className="p-3"><span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800 font-bold">Normal (86% AU)</span></td>
                        </tr>
                        <tr>
                          <td className="p-3 font-mono">01/08/2026</td>
                          <td className="p-3 font-semibold text-slate-900">Lote Centro</td>
                          <td className="p-3 text-cyan-600 font-bold">💧 Riego (CU-05)</td>
                          <td className="p-3 font-mono font-bold">15.0 mm</td>
                          <td className="p-3">Goteo Subterráneo</td>
                          <td className="p-3"><span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800 font-bold">Atención (63% AU)</span></td>
                        </tr>
                        <tr>
                          <td className="p-3 font-mono">28/07/2026</td>
                          <td className="p-3 font-semibold text-slate-900">Todos los lotes</td>
                          <td className="p-3 text-blue-600 font-bold">🌧️ Precipitación</td>
                          <td className="p-3 font-mono font-bold">18.0 mm</td>
                          <td className="p-3">Estación Meteorológica</td>
                          <td className="p-3"><span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800 font-bold">Recarga TAW</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ASISTENTE IA (MAS) */}
          {currentTab === 'asistente_ia' && (
            <div className="space-y-6 animate-fade-in">
              <div className="rounded-[28px] border border-white/70 bg-white/75 p-6 shadow-soft backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-crop-700">
                    <Bot className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-950">Asistente Inteligente MAS (Multi-Agent System)</h2>
                    <p className="text-xs text-slate-500">Agente autónomo de riego y optimización energética para agricultura de precisión.</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <span className="text-xs font-bold text-crop-700 uppercase">Agente FAO-56</span>
                    <p className="mt-1 text-sm font-semibold text-slate-900">Balance Hídrico Dinámico</p>
                    <p className="mt-2 text-xs text-slate-500">Calcula Dr, AU y AFD integrando Kc satelital con ET0 de estaciones locales.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <span className="text-xs font-bold text-water-700 uppercase">Agente Sentinel-2</span>
                    <p className="mt-1 text-sm font-semibold text-slate-900">NDVI & Vigor Vegetativo</p>
                    <p className="mt-2 text-xs text-slate-500">Procesa imágenes multiespectrales cada 5 días para ajuste del coeficiente de cultivo.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <span className="text-xs font-bold text-amber-700 uppercase">Agente de Bombeo</span>
                    <p className="mt-1 text-sm font-semibold text-slate-900">Tarifa Eléctrica & Eficiencia</p>
                    <p className="mt-2 text-xs text-slate-500">Programa ventanas de riego nocturnas (01:00 a 07:00 hs) para reducir costo energético.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CONFIGURACIÓN */}
          {currentTab === 'configuracion' && (
            <div className="space-y-6 animate-fade-in">
              <div className="rounded-[28px] border border-white/70 bg-white/75 p-6 shadow-soft backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 text-slate-800">
                    <Settings className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-950">Configuración de la Explotación</h2>
                    <p className="text-xs text-slate-500">Gestión de parámetros edafológicos, equipos de riego y umbrales de alerta.</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/onboarding"
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-crop-600 to-water-600 px-5 py-3 text-xs font-bold text-white shadow-md hover:shadow-lg transition"
                  >
                    <MapPinned className="h-4 w-4" />
                    Abrir Wizard de Configuración de Campo
                  </Link>
                </div>
              </div>
            </div>
          )}

        </section>
      </div>

      <style jsx global>{`
        .animate-fade-in {
          animation: fadeIn 0.35s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .custom-map-tooltip {
          background: rgba(15, 23, 42, 0.92) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 14px !important;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35) !important;
          backdrop-filter: blur(8px) !important;
          padding: 8px 12px !important;
        }
        .custom-map-tooltip:before {
          border-top-color: rgba(15, 23, 42, 0.92) !important;
        }
      `}</style>
    </main>
  );
}
