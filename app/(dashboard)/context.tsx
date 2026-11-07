"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { fieldDateString, shiftFieldDate } from '@/lib/field-dates';
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
  hydricStatus: 'Normal' | 'Atencion' | 'Critico' | 'Sin datos';
  hydricStateDate: string | null;
  hydricStateIsCurrent: boolean;
  isRecommendationPublishable: boolean;
  warnings: string[];
  deficitDr_mm: number | null;
  recommendedNetIrrigation_mm?: number;
  recommendedGrossIrrigation_mm?: number;
  waterAvailableAU_mm: number | null;
  waterAvailableAU_pct: number | null;
  easilyAvailableAFD_mm: number | null;
  totalAvailableTAW_mm: number | null;
  etcToday_mm: number | null;
  et0Today_mm: number | null;
  ndviCurrent: number | null;
  ndviDataAvailable?: boolean;
  ndviObservationDate?: string | null;
  ndviCloudCoveragePct?: number | null;
  ndviValidPixelCoveragePct?: number | null;
  ndviSceneId?: string | null;
  usesEstimatedAgronomicData?: boolean;
  kcSatellite: number | null;
  irrigationPriority: 'Alta' | 'Media' | 'Baja' | 'Sin datos';
  priorityReason: string;
  pumpingWindow: string;
  lastIrrigationDate: string;
  lastIrrigationAmount_mm: number | null;
  lastRainDate: string;
  lastRainAmount_mm: number | null;
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

export function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function formatMetric(value: number | null | undefined, digits = 1): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '-';
}

export function formatDate(value: string | undefined, fallback = '-'): string {
  if (!value) return fallback;
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? day + '/' + month + '/' + year : fallback;
}

export function fieldToLot(field: FieldItem, _index: number, snapshot?: FieldAgentSnapshot | null): LotHydricData {
  const analyze = snapshot?.analyze_response || {};
  const recommendation = analyze.recommendation || {};
  const recommendationMetrics = recommendation.status === 'NO_DATA' ? {} : recommendation.metrics || {};
  const waterBalance = recommendation.water_balance || {};
  const metrics = waterBalance.status === 'NO_DATA' ? {} : waterBalance.metrics || {};
  const weather = waterBalance.weather_context || {};
  const weatherMetrics = weather.status === 'NO_DATA' ? {} : weather.metrics || {};
  const ndviContext = analyze.ndvi_context || {};
  const ndviMetrics = ndviContext.status === 'NO_DATA' ? {} : ndviContext.metrics || {};
  const kcContext = analyze.crop_coefficient_context || {};
  // The interval deficit is not root-zone Dr. Only use persisted FAO-56
  // evidence, including its real AFD; never assume p=0.5 or TAW=100 here.
  const evidence = recommendation.evidence || {};
  const tawCandidate = nullableNumber(evidence.current_taw_mm) ?? nullableNumber(field.total_available_water_taw);
  const taw = tawCandidate !== null && tawCandidate > 0 ? tawCandidate : null;
  const raw = nullableNumber(evidence.current_raw_mm);
  const afd = raw !== null && raw >= 0 && taw !== null && raw <= taw ? raw : null;
  const dr = nullableNumber(evidence.current_dr_mm);
  const deficit = dr !== null && dr >= 0 && taw !== null && dr <= taw ? dr : null;
  const reportedAu = nullableNumber(evidence.current_au_mm);
  const available = deficit !== null && taw !== null
    ? (reportedAu !== null && reportedAu >= 0 && reportedAu <= taw ? reportedAu : Math.max(0, taw - deficit))
    : null;
  const hasHydricState = deficit !== null && afd !== null && taw !== null;
  const stateDate = typeof evidence.hydric_state_date === 'string' ? evidence.hydric_state_date : null;
  const today = fieldDateString();
  const current = hasHydricState && stateDate === today && analyze.date_to === today && snapshot?.is_stale !== true;
  const publishable = current && evidence.balance_source === 'PERSISTED_HYDRIC_HISTORY' &&
    analyze.validation?.is_recommendation_safe === true && recommendation.status === 'COMPLETED' &&
    ['IRRIGATE', 'MONITOR', 'NO_IRRIGATION'].includes(analyze.action) &&
    snapshot?.weather_compare_response?.evidence?.historical_only !== true;
  const urgency = publishable ? analyze.urgency : undefined;
  const hydricStatus = current && deficit !== null && afd !== null
    ? deficit > afd ? 'Critico' : deficit >= afd * 0.8 ? 'Atencion' : 'Normal' : 'Sin datos';
  const priority = urgency === 'HIGH' ? 'Alta' : urgency === 'MEDIUM' ? 'Media' : urgency === 'LOW' ? 'Baja' : 'Sin datos';
  const daysAnalyzed = nullableNumber(metrics.days_analyzed);
  const totalEtc = nullableNumber(metrics.total_etc_mm);
  const totalEt0 = nullableNumber(metrics.total_et0_mm) ?? nullableNumber(weatherMetrics.total_et0_mm);
  const kc = nullableNumber(evidence.current_kc) ??
    (kcContext.status !== 'NO_DATA' ? nullableNumber(kcContext.crop_coefficient) : null) ?? nullableNumber(metrics.crop_coefficient);
  const ndviCandidate = nullableNumber(ndviMetrics.ndvi_mean);
  const ndvi = ndviCandidate !== null && ndviCandidate >= -1 && ndviCandidate <= 1 ? ndviCandidate : null;
  const usesEstimatedAgronomicData = !field.soil_type || field.soil_type === 'AUTO' ||
    !field.total_available_water_taw ||
    (field.initial_available_water_pct == null && field.initial_available_water_mm == null);

  return {
    id: String(field.id), name: field.name, crop: field.crop_type || 'Sin especificar',
    areaHa: field.area_ha || 0, soilType: field.soil_type || 'Auto / estimado',
    irrigationSystem: field.irrigation_system || 'Sin especificar',
    hydricStatus, hydricStateDate: stateDate, hydricStateIsCurrent: current,
    isRecommendationPublishable: publishable,
    warnings: Array.from(new Set([
      ...(analyze.warnings || []), ...(recommendation.warnings || []),
      ...(analyze.validation?.warnings || []), ...(analyze.validation?.issues || []),
      ...(snapshot?.weather_compare_response?.warnings || []),
      ...(hasHydricState && !current ? ['El balance disponible es histórico, está obsoleto o carece de fecha verificable; no representa el estado actual.'] : []),
      ...(!publishable ? ['No hay una recomendación operativa publicable para hoy.'] : []),
    ].filter((warning) => typeof warning === 'string'))),
    deficitDr_mm: deficit,
    recommendedNetIrrigation_mm: publishable ? nullableNumber(recommendationMetrics.recommended_net_irrigation_mm) ?? undefined : undefined,
    recommendedGrossIrrigation_mm: publishable ? nullableNumber(recommendationMetrics.recommended_gross_irrigation_mm) ?? undefined : undefined,
    waterAvailableAU_mm: available,
    waterAvailableAU_pct: available !== null && taw !== null ? Math.round(available / taw * 100) : null,
    easilyAvailableAFD_mm: afd, totalAvailableTAW_mm: taw,
    etcToday_mm: totalEtc !== null && daysAnalyzed !== null && daysAnalyzed > 0 ? totalEtc / daysAnalyzed : null,
    et0Today_mm: totalEt0 !== null && daysAnalyzed !== null && daysAnalyzed > 0 ? totalEt0 / daysAnalyzed : null,
    ndviCurrent: ndvi, ndviDataAvailable: ndvi !== null,
    ndviObservationDate: typeof ndviMetrics.observation_date === 'string' ? ndviMetrics.observation_date : null,
    ndviCloudCoveragePct: nullableNumber(ndviMetrics.cloud_coverage_pct),
    ndviValidPixelCoveragePct: nullableNumber(ndviMetrics.valid_pixel_coverage_pct),
    ndviSceneId: typeof ndviMetrics.sentinel_scene_id === 'string' ? ndviMetrics.sentinel_scene_id : null,
    usesEstimatedAgronomicData, kcSatellite: kc, irrigationPriority: priority,
    priorityReason: publishable ? recommendation.summary || 'Balance modelado disponible.' : 'Recomendación operativa no publicable. Revisá los datos y advertencias.',
    pumpingWindow: 'Sin ventana operativa validada',
    // Period totals are not the date/amount of the last actual event.
    lastIrrigationDate: '-', lastIrrigationAmount_mm: null,
    lastRainDate: '-', lastRainAmount_mm: null,
    // Daily history must come from the history API, not fabricated by
    // distributing accumulated rain/ETc uniformly over seven dates.
    timeline: [],
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
  historyLoadError: string | null;
  setAgentRefreshError: (err: string | null) => void;
  dateFrom: string;
  setDateFrom: (val: string) => void;
  dateTo: string;
  setDateTo: (val: string) => void;
  historyReloadTrigger: number;
  setHistoryReloadTrigger: React.Dispatch<React.SetStateAction<number>>;
  realHistory: HydricHistoryDay[];
  isLoadingHistory: boolean;
  setIsLoadingHistory: (val: boolean) => void;
  refreshAgentSnapshots: () => Promise<void>;
  teamMembers: FieldTeamMember[];
  setTeamMembers: React.Dispatch<React.SetStateAction<FieldTeamMember[]>>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  const [lotsData, setLotsData] = useState<LotHydricData[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string>('');
  const [hasCustomLots, setHasCustomLots] = useState(false);
  const [customCenter, setCustomCenter] = useState<[number, number]>([-33.8906, -60.5732]);
  const [rawCustomPolygons, setRawCustomPolygons] = useState<{ [id: string]: [number, number][] }>({});
  const [fieldSnapshots, setFieldSnapshots] = useState<Record<string, FieldAgentSnapshot | null>>({});
  const [isRefreshingAgents, setIsRefreshingAgents] = useState(false);
  const [agentRefreshError, setAgentRefreshError] = useState<string | null>(null);
  const [historyLoadError, setHistoryLoadError] = useState<string | null>(null);

  // Real daily history states
  const [loadedHistory, setLoadedHistory] = useState<{ key: string; days: HydricHistoryDay[] } | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyReloadTrigger, setHistoryReloadTrigger] = useState(0);
  const [teamMembers, setTeamMembers] = useState<FieldTeamMember[]>([]);

  // Date range selectors (default to last 30 days)
  const [dateFrom, setDateFrom] = useState(() => shiftFieldDate(fieldDateString(), -30));
  const [dateTo, setDateTo] = useState(() => fieldDateString());

  // Resolved Selected Field
  const selectedField = useMemo(() => {
    return auth.currentFields?.find((field) => String(field.id) === selectedLotId) || null;
  }, [auth.currentFields, selectedLotId]);
  const historyKey = `${auth.user?.id ?? ''}:${selectedField?.id ?? ''}:${dateFrom}:${dateTo}:${historyReloadTrigger}`;
  const realHistory = useMemo(() => loadedHistory?.key === historyKey ? loadedHistory.days : [],
    [loadedHistory, historyKey]);

  // Resolved Selected Snapshot
  const selectedSnapshot = useMemo(() => {
    return selectedField ? fieldSnapshots[String(selectedField.id)] : null;
  }, [fieldSnapshots, selectedField]);

  // Refresh agent snapshots
  const refreshAgentSnapshots = async () => {
    if (!auth.currentFields || auth.currentFields.length === 0) return;
    setIsRefreshingAgents(true);
    setAgentRefreshError(null);

    try {
      const failures: string[] = [];
      await Promise.all(
        auth.currentFields.map(async (field) => {
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
          } else { failures.push(field.name); }
        })
      );
      if (failures.length) setAgentRefreshError('No se pudieron actualizar: ' + failures.join(', ') + '. Se conserva el último snapshot con su fecha.');
    } catch (err) {
      console.error('Error refreshing agent snapshots:', err);
      setAgentRefreshError('Ocurrió un error al contactar a los agentes. Inténtelo de nuevo.');
    } finally {
      setIsRefreshingAgents(false);
    }
  };

  // 1. Initial snapshot loading on mount
  useEffect(() => {
    if (auth.isLoading || !auth.currentFields) return;

    let isCancelled = false;
    async function loadAllSnapshots() {
      const snapshotsMap: Record<string, FieldAgentSnapshot | null> = {};
      await Promise.all(
        auth.currentFields.map(async (field) => {
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

    if (auth.currentFields.length > 0) {
      loadAllSnapshots();
    } else {
      setFieldSnapshots({});
    }
  }, [auth.currentFields, auth.isLoading]);

  // 2. Synchronize lotsData with custom fields & snapshots
  useEffect(() => {
    const hasCustom = auth.currentFields && auth.currentFields.length > 0;
    setHasCustomLots(hasCustom);

    if (hasCustom) {
      const customLots = auth.currentFields.map((field, idx) => {
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
      const firstField = auth.currentFields[0];
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
      auth.currentFields.forEach((f) => {
        if (f.geometry_geojson?.coordinates?.[0]) {
          polygonsMap[String(f.id)] = f.geometry_geojson.coordinates[0].map((c: any) => [c[1], c[0]]);
        }
      });
      setRawCustomPolygons(polygonsMap);
    } else {
      setLotsData([]);
      setRawCustomPolygons({});
      setSelectedLotId('');
    }
  }, [auth.currentFields, auth.isLoading, fieldSnapshots]);

  // 3. Load real daily history when lot selected or trigger fired
  useEffect(() => {
    if (!selectedField) {
      setLoadedHistory(null);
      setIsLoadingHistory(false);
      setHistoryLoadError(null);
      return;
    }

    const fieldId = selectedField.id;
    setHistoryLoadError(null);
    let isCancelled = false;
    async function loadRealHistory() {
      setIsLoadingHistory(true);
      try {
        const history = await getHydricHistoryApi(fieldId, dateFrom, dateTo);
        if (!isCancelled) {
          setLoadedHistory({ key: historyKey, days: history });
        }
      } catch (err) {
        if (!isCancelled) setHistoryLoadError(err instanceof Error ? err.message : 'No se pudo cargar el historial hídrico.');
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
  }, [selectedField?.id, dateFrom, dateTo, historyKey]);

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
        historyLoadError,
        setAgentRefreshError,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        historyReloadTrigger,
        setHistoryReloadTrigger,
        realHistory,
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
