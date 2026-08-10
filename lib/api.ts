/**
 * AgroMAS API Client
 * Connects Next.js frontend to FastAPI backend using JWT + HttpOnly refresh cookies.
 */

const DEFAULT_BACKEND_URL = 'https://backendpfiferreyrafredes-production.up.railway.app';
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');

let inMemoryToken: string | null = null;

export function setAccessToken(token: string | null) {
  inMemoryToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      sessionStorage.setItem('agromas_access_token', token);
      localStorage.setItem('agromas_access_token', token);
    } else {
      sessionStorage.removeItem('agromas_access_token');
      localStorage.removeItem('agromas_access_token');
    }
  }
}

export function getAccessToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  if (typeof window !== 'undefined') {
    inMemoryToken = sessionStorage.getItem('agromas_access_token') || localStorage.getItem('agromas_access_token');
  }
  return inMemoryToken;
}

/**
 * Universal fetch wrapper with Bearer token injection and automatic 401 refresh
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Ensure auth endpoints and api requests include cookies for refresh_token
  const isAuthOrFields = path.startsWith('/api/v1/');
  const credentialsMode = isAuthOrFields ? 'include' : init.credentials;

  let response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: credentialsMode,
  });

  // If unauthorized (and not already on refresh endpoint), try to refresh token
  if (response.status === 401 && path !== '/api/v1/auth/refresh' && path !== '/api/v1/auth/login') {
    try {
      const refreshed = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshed.ok) {
        const data = await refreshed.json();
        if (data.access_token) {
          setAccessToken(data.access_token);
          headers.set('Authorization', `Bearer ${data.access_token}`);
          // Retry original request with fresh token
          response = await fetch(`${API_URL}${path}`, {
            ...init,
            headers,
            credentials: credentialsMode,
          });
        }
      } else {
        // Refresh failed, clean up session
        setAccessToken(null);
      }
    } catch (refreshErr) {
      console.warn('Automatic token refresh failed:', refreshErr);
    }
  }

  return response;
}

/* ==========================================================================
   AUTH API METHODS
   ========================================================================== */

export interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'agronomist' | 'operator';
  phone_whatsapp: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface GoogleAuthPayload {
  id_token: string;
  phone_whatsapp?: string;
  role?: 'admin' | 'agronomist' | 'operator';
}

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  name?: string;
  role: 'admin' | 'agronomist' | 'operator';
  phone_whatsapp?: string;
  created_at?: string;
}

export interface FieldGeometry {
  type: 'Polygon';
  coordinates: number[][][]; // [ [ [lng, lat], [lng, lat], ... ] ]
}

export interface FieldItem {
  id: number | string;
  name: string;
  geometry_geojson: FieldGeometry;
  area_ha: number;
  soil_type?: string;
  crop_type: string;
  irrigation_system: string;
  center_latitude?: number;
  center_longitude?: number;
  field_capacity_fc?: number;
  wilting_point_wp?: number;
  total_available_water_taw?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateFieldPayload {
  name: string;
  geometry_geojson: FieldGeometry;
  area_ha: number;
  soil_type?: string;
  crop_type: string;
  irrigation_system: string;
  field_capacity_fc?: number;
  wilting_point_wp?: number;
  total_available_water_taw?: number;
}

export async function registerApi(payload: RegisterPayload) {
  const res = await apiFetch('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

export async function loginApi(payload: LoginPayload) {
  const res = await apiFetch('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

export async function googleAuthApi(payload: GoogleAuthPayload) {
  const res = await apiFetch('/api/v1/auth/google', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

export async function logoutApi() {
  try {
    await apiFetch('/api/v1/auth/logout', {
      method: 'POST',
    });
  } catch (e) {
    console.warn('Logout API error:', e);
  } finally {
    setAccessToken(null);
  }
}

export async function getMeApi(): Promise<{ user: UserProfile; fields: FieldItem[] } | null> {
  try {
    const res = await apiFetch('/api/v1/users/me');
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Error fetching /api/v1/users/me:', err);
    return null;
  }
}

/* ==========================================================================
   FIELDS (LOTS) API METHODS
   ========================================================================== */

export async function createFieldApi(payload: CreateFieldPayload): Promise<{ ok: boolean; data: any }> {
  const res = await apiFetch('/api/v1/fields', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

export async function getFieldsApi(): Promise<FieldItem[]> {
  try {
    const res = await apiFetch('/api/v1/fields');
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function deleteFieldApi(fieldId: string | number): Promise<boolean> {
  try {
    const res = await apiFetch(`/api/v1/fields/${fieldId}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* ==========================================================================
   AGENT API METHODS
   ========================================================================== */

export interface AnalyzeIrrigationPayload {
  field_name?: string;
  user_query?: string;
  date_from: string;
  date_to: string;
  crop_name: string;
  crop_coefficient: number;
  source?: string | null;
  effective_precipitation_ratio?: number;
  initial_available_water_mm?: number;
  irrigation_applied_mm?: number;
  irrigation_system?: string | null;
  irrigation_efficiency?: number | null;
  minimum_irrigation_threshold_mm?: number;
  max_single_application_mm?: number;
  geometry_geojson?: FieldGeometry;
  ndvi_date_from?: string | null;
  ndvi_date_to?: string | null;
  ndvi_cloud_coverage_max_pct?: number;
  use_ndvi_for_kc?: boolean;
  max_ndvi_age_days?: number;
}

export interface WeatherComparePayload {
  date_from: string;
  date_to: string;
  latitude?: number;
  longitude?: number;
  geometry_geojson?: FieldGeometry;
  use_inta_eeavi_station?: boolean;
  include_eeavi_reference?: boolean;
  use_eeavi_as_operational_source?: boolean;
  primary_source?: string | null;
  external_sources?: Array<'OPEN_METEO' | 'NASA_POWER'>;
  crop_name: string;
  crop_coefficient: number;
  effective_precipitation_ratio?: number;
  initial_available_water_mm?: number;
  irrigation_applied_mm?: number;
  irrigation_system?: string | null;
  irrigation_efficiency?: number | null;
  minimum_irrigation_threshold_mm?: number;
  max_single_application_mm?: number;
}

interface AgentPayloadOptions {
  dateFrom?: string | Date;
  dateTo?: string | Date;
  ndviDateFrom?: string | Date | null;
  ndviDateTo?: string | Date | null;
  cropCoefficient?: number;
  effectivePrecipitationRatio?: number;
  initialAvailableWaterMm?: number;
  irrigationAppliedMm?: number;
  irrigationEfficiency?: number | null;
  minimumIrrigationThresholdMm?: number;
  maxSingleApplicationMm?: number;
  useNdviForKc?: boolean;
  maxNdviAgeDays?: number;
}

const DEFAULT_CROP_COEFFICIENT_BY_CROP: Record<string, number> = {
  maiz: 1.15,
  maíz: 1.15,
  corn: 1.15,
  soja: 1.1,
  soy: 1.1,
  soybean: 1.1,
  trigo: 1.05,
  wheat: 1.05,
  girasol: 1,
  sunflower: 1,
  alfalfa: 1.05,
};

function toIsoDate(value: string | Date): string {
  if (typeof value === 'string') return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysToIsoDate(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function buildDateRange(options: AgentPayloadOptions = {}) {
  const dateTo = options.dateTo ? toIsoDate(options.dateTo) : toIsoDate(new Date());
  const dateFrom = options.dateFrom ? toIsoDate(options.dateFrom) : addDaysToIsoDate(dateTo, -6);
  return { dateFrom, dateTo };
}

function normalizeCropName(field: FieldItem): string {
  return field.crop_type?.trim() || 'cultivo generico';
}

function normalizeCropKey(cropName: string): string {
  return cropName.trim().toLowerCase();
}

function getCropCoefficient(field: FieldItem, override?: number): number {
  if (typeof override === 'number') return override;
  return DEFAULT_CROP_COEFFICIENT_BY_CROP[normalizeCropKey(normalizeCropName(field))] || 1;
}

function getIrrigationEfficiency(field: FieldItem, override?: number | null): number | null {
  if (typeof override === 'number' || override === null) return override;

  const system = field.irrigation_system?.trim().toLowerCase() || '';
  if (system.includes('goteo')) return 0.9;
  if (system.includes('pivote')) return 0.85;
  if (system.includes('aspers')) return 0.75;
  if (system.includes('gravedad') || system.includes('surco')) return 0.6;
  return null;
}

function getFieldCenter(field: FieldItem): { latitude?: number; longitude?: number } {
  if (typeof field.center_latitude === 'number' && typeof field.center_longitude === 'number') {
    return {
      latitude: field.center_latitude,
      longitude: field.center_longitude,
    };
  }

  const coords = field.geometry_geojson?.coordinates?.[0] || [];
  if (coords.length === 0) return {};

  const totals = coords.reduce(
    (acc, [lng, lat]) => ({
      latitude: acc.latitude + lat,
      longitude: acc.longitude + lng,
    }),
    { latitude: 0, longitude: 0 }
  );

  return {
    latitude: totals.latitude / coords.length,
    longitude: totals.longitude / coords.length,
  };
}

function buildCommonAgentPayload(field: FieldItem, options: AgentPayloadOptions = {}) {
  const { dateFrom, dateTo } = buildDateRange(options);

  return {
    date_from: dateFrom,
    date_to: dateTo,
    crop_name: normalizeCropName(field),
    crop_coefficient: getCropCoefficient(field, options.cropCoefficient),
    effective_precipitation_ratio: options.effectivePrecipitationRatio ?? 0.8,
    initial_available_water_mm: options.initialAvailableWaterMm ?? 0,
    irrigation_applied_mm: options.irrigationAppliedMm ?? 0,
    irrigation_system: field.irrigation_system || null,
    irrigation_efficiency: getIrrigationEfficiency(field, options.irrigationEfficiency),
    minimum_irrigation_threshold_mm: options.minimumIrrigationThresholdMm ?? 5,
    max_single_application_mm: options.maxSingleApplicationMm ?? 40,
  };
}

export function buildAnalyzePayload(
  field: FieldItem,
  options: AgentPayloadOptions = {}
): AnalyzeIrrigationPayload {
  const { dateFrom, dateTo } = buildDateRange(options);
  const ndviDateTo = options.ndviDateTo === null ? null : toIsoDate(options.ndviDateTo || dateTo);
  const ndviDateFrom =
    options.ndviDateFrom === null ? null : toIsoDate(options.ndviDateFrom || addDaysToIsoDate(dateTo, -30));

  return {
    ...buildCommonAgentPayload(field, { ...options, dateFrom, dateTo }),
    field_name: field.name,
    user_query: `Analizar necesidad de riego para ${field.name}`,
    source: null,
    geometry_geojson: field.geometry_geojson,
    ndvi_date_from: ndviDateFrom,
    ndvi_date_to: ndviDateTo,
    ndvi_cloud_coverage_max_pct: 30,
    use_ndvi_for_kc: options.useNdviForKc ?? true,
    max_ndvi_age_days: options.maxNdviAgeDays ?? 16,
  };
}

export function buildWeatherComparePayload(
  field: FieldItem,
  options: AgentPayloadOptions = {}
): WeatherComparePayload {
  return {
    ...buildCommonAgentPayload(field, options),
    ...getFieldCenter(field),
    geometry_geojson: field.geometry_geojson,
    use_inta_eeavi_station: false,
    include_eeavi_reference: true,
    use_eeavi_as_operational_source: false,
    primary_source: null,
    external_sources: ['OPEN_METEO', 'NASA_POWER'],
  };
}

export async function analyzeIrrigationApi(payload: AnalyzeIrrigationPayload) {
  const res = await fetch('/api/agents/analyze-irrigation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

export async function weatherCompareApi(payload: WeatherComparePayload) {
  const res = await fetch('/api/agents/weather-compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}
