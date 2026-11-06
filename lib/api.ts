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
  const isPublicAuthRoute = path.startsWith('/api/v1/auth/');
  if (token && !headers.has('Authorization') && !isPublicAuthRoute) {
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
  id_token?: string;
  credential?: string;
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

export interface FarmSummary {
  id: string;
  name: string;
  agricultural_zone?: string | null;
  user_role_in_farm: 'admin' | 'agronomist' | 'operator';
  field_ids: Array<number | string>;
}

export interface FieldItem {
  id: number | string;
  farm_id?: string | null;
  name: string;
  user_role_in_farm?: FieldRole;
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
  initial_available_water_pct?: number | null;
  initial_available_water_mm?: number | null;
  initial_water_source?: string | null;
  sowing_date?: string | null;
  emergence_date?: string | null;
  expected_harvest_date?: string | null;
  phenological_stage?: string | null;
  created_at?: string;
  updated_at?: string;
  agent_snapshot?: FieldAgentSnapshot | null;
}

export interface CreateFieldPayload {
  name: string;
  geometry_geojson: FieldGeometry;
  area_ha: number;
  soil_type?: string | null;
  crop_type: string;
  irrigation_system: string;
  field_capacity_fc?: number;
  wilting_point_wp?: number;
  total_available_water_taw?: number;
  initial_available_water_pct?: number | null;
  initial_available_water_mm?: number | null;
  initial_water_source?: string | null;
  sowing_date?: string | null;
  emergence_date?: string | null;
  expected_harvest_date?: string | null;
  phenological_stage?: string | null;
  estimate_soil?: boolean;
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
  const token = payload.id_token || payload.credential || '';
  const res = await apiFetch('/api/v1/auth/google', {
    method: 'POST',
    body: JSON.stringify({
      id_token: token,
      credential: token,
      phone_whatsapp: payload.phone_whatsapp,
      role: payload.role,
    }),
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

export async function updateUserProfileApi(payload: {
  first_name?: string;
  last_name?: string;
  name?: string;
  phone?: string;
  role?: string;
}): Promise<{ ok: boolean; message: string; user?: any }> {
  try {
    const res = await apiFetch('/api/v1/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, message: 'Perfil actualizado con éxito.', user: data.user || data };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: false, message: typeof data.detail === 'string' ? data.detail : typeof data.message === 'string' ? data.message : 'No se pudo actualizar el perfil.' };
  } catch (err) {
    console.error('Error hitting PATCH /api/v1/users/me:', err);
  }
  return { ok: false, message: 'No se pudo conectar con el servidor. El perfil no se actualizó.' };
}

export async function changePasswordApi(payload: {
  current_password: string;
  new_password: string;
}): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await apiFetch('/api/v1/users/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return { ok: true, message: 'Contraseña actualizada correctamente.' };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: false, message: typeof data.detail === 'string' ? data.detail : typeof data.message === 'string' ? data.message : 'Error al cambiar contraseña.' };
  } catch (err) {
    console.error('Error hitting POST /api/v1/users/change-password:', err);
  }
  return { ok: false, message: 'No se pudo conectar con el servidor. La contraseña no se actualizó.' };
}

/* ==========================================================================
   INVITATIONS & EMAIL CHECK API METHODS
   ========================================================================== */

export interface CheckEmailResponse {
  email: string;
  exists: boolean;
  has_password: boolean;
  invitation_pending: boolean;
  pending_farms?: string[];
}

export interface InvitationPreviewResponse {
  email: string;
  first_name?: string;
  last_name?: string;
  farm_name: string;
  role: FieldRole;
  invited_by_name?: string;
  expires_at: string;
  requires_password: boolean;
  requires_profile: boolean;
}

export async function checkEmailApi(email: string): Promise<CheckEmailResponse | null> {
  try {
    const res = await apiFetch(`/api/v1/auth/check-email?email=${encodeURIComponent(email)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Error checking email status:', err);
  }
  return null;
}

export async function getInvitationPreviewApi(token: string): Promise<{ ok: boolean; status: number; data?: InvitationPreviewResponse }> {
  try {
    const res = await apiFetch(`/api/v1/invitations/${encodeURIComponent(token)}`);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data: res.ok ? data : undefined };
  } catch (err) {
    return { ok: false, status: 500 };
  }
}

export async function acceptInvitationApi(
  token: string,
  payload: {
    password?: string;
    first_name?: string;
    last_name?: string;
    phone_whatsapp?: string;
  }
): Promise<{ ok: boolean; status: number; data?: any; access_token?: string }> {
  try {
    const res = await apiFetch(`/api/v1/invitations/${encodeURIComponent(token)}/accept`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.access_token) {
      setAccessToken(data.access_token);
    }
    return { ok: res.ok, status: res.status, data, access_token: data.access_token };
  } catch (err) {
    return { ok: false, status: 500 };
  }
}

export async function resendInvitationApi(memberId: string): Promise<{ ok: boolean; message?: string; invitation_url?: string }> {
  try {
    const res = await apiFetch(`/api/v1/members/${encodeURIComponent(memberId)}/resend-invitation`, {
      method: 'POST',
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return { ok: true, message: 'Enlace de invitación generado con éxito.', invitation_url: data.invitation_url };
    }
    return { ok: false, message: data.detail || 'No se pudo reenviar la invitación.' };
  } catch {
    return { ok: false, message: 'No se pudo contactar al servidor. La invitación no fue reenviada.' };
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

export async function updateFieldApi(fieldId: string | number, payload: Partial<CreateFieldPayload>): Promise<{ ok: boolean; data: any }> {
  const res = await apiFetch(`/api/v1/fields/${fieldId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

/* ==========================================================================
   FIELD TEAM & USERS API METHODS (CU - Gestión de Usuarios del Campo)
   ========================================================================== */

export type FieldRole = 'admin' | 'agronomist' | 'operator';

export interface FieldTeamMember {
  id: string;
  first_name: string;
  last_name: string;
  name?: string;
  email: string;
  phone_whatsapp?: string;
  phone?: string;
  role: FieldRole;
  status: 'active' | 'invited' | 'pending';
  joined_at: string;
  avatar_color?: string;
  invitation_url?: string;
}

export interface AddTeamMemberPayload {
  email: string;
  role: FieldRole;
  first_name?: string;
  last_name?: string;
  phone_whatsapp?: string;
  farm_id?: string | null;
}

export async function getTeamMembersApi(farmId?: string | null): Promise<FieldTeamMember[]> {
  try {
    const endpoint = farmId && farmId !== 'default' 
      ? `/api/v1/farms/${farmId}/members` 
      : `/api/v1/farms/members`;
    const res = await apiFetch(endpoint);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn('No se pudo consultar el equipo del establecimiento.');
  }

  // Never fabricate team members, including when RBAC rejected the request.
  return [];
}

export async function addTeamMemberApi(payload: AddTeamMemberPayload): Promise<{ ok: boolean; member?: FieldTeamMember; invitation_url?: string; error?: string }> {
  try {
    const endpoint = payload.farm_id && payload.farm_id !== 'default'
      ? `/api/v1/farms/${payload.farm_id}/members`
      : `/api/v1/farms/members`;

    const res = await apiFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      const invUrl = data.invitation_url;
      const memberObj: FieldTeamMember = {
        ...data,
        invitation_url: invUrl,
      };
      return { ok: true, member: memberObj, invitation_url: invUrl };
    } else {
      const errorData = await res.json().catch(() => ({}));
      const errorMsg = Array.isArray(errorData.detail)
        ? errorData.detail.map((d: any) => `${d.loc?.join('.')}: ${d.msg}`).join(', ')
        : errorData.detail || errorData.message;
      if (errorMsg) {
        return { ok: false, error: errorMsg };
      }
      return { ok: false, error: 'No se pudo agregar el miembro. Revisá tus permisos.' };
    }
  } catch (err) {
    return { ok: false, error: 'No se pudo contactar al servidor. El miembro no fue agregado.' };
  }
}

export async function updateTeamMemberRoleApi(memberId: string, newRole: FieldRole, farmId?: string | null): Promise<boolean> {
  try {
    const res = await apiFetch(`/api/v1/farms/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) return true;
  } catch {}

  return false;
}

export async function removeTeamMemberApi(memberId: string, farmId?: string | null): Promise<boolean> {
  try {
    const res = await apiFetch(`/api/v1/farms/members/${memberId}`, {
      method: 'DELETE',
    });
    if (res.ok) return true;
  } catch {}

  return false;
}

/* ==========================================================================
   AGENT API METHODS
   ========================================================================== */

export interface SupervisorEvaluation {
  run_id: string;
  mode: 'ACTIVE' | 'SHADOW';
  status: string;
  field_id: number;
  model?: string | null;
  conclusion?: string | null;
  question?: string | null;
  warnings: string[];
  evidence_warnings: string[];
  knowledge_warnings: string[];
  model_state_summary: {
    dr_mm?: number; afd_mm?: number; taw_mm?: number;
    state_date?: string; threshold_status?: string;
    operational_recommendation?: boolean;
  };
  steps: Array<{
    index: number;
    decision: { action: string; tool_name?: string | null; reason: string };
    tool_result?: { tool_name: string; status: string } | null;
  }>;
}

export async function evaluateSupervisorApi(fieldId: number, maxSteps = 6): Promise<
  { ok: true; data: SupervisorEvaluation } | { ok: false; error: string }
> {
  const token = getAccessToken();
  if (!token) return { ok: false, error: 'Iniciá sesión para evaluar el lote.' };
  try {
    const response = await fetch('/api/agents/supervisor-evaluate', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ field_id: fieldId, max_steps: maxSteps }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: typeof data.detail === 'string' ? data.detail : 'No se pudo evaluar el lote.' };
    if (data.mode !== 'ACTIVE' || data.field_id !== fieldId || typeof data.status !== 'string' || !Array.isArray(data.steps)) {
      return { ok: false, error: 'El servicio devolvió una evaluación inválida.' };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'No se pudo contactar al Supervisor. No se ejecutaron acciones de riego.' };
  }
}

export interface FieldHistoryAnswer {
  status: 'ANSWERED' | 'NO_DATA' | 'UNSUPPORTED';
  answer: string;
  date_from: string;
  date_to: string;
  days_found: number;
  warnings: string[];
  target_date?: string | null;
  mode?: 'CURRENT' | 'FORECAST' | null;
  parts?: FieldHistoryAnswer[];
  selected_field_id?: number | null;
  field_name?: string | null;
  draft?: FieldWaterDraft | null;
}

export interface FieldWaterDraft {
  id: string;
  field_id: number;
  field_name: string;
  kind: 'irrigation' | 'rain';
  event_date: string;
  amount_mm: number;
  efficiency_pct?: number | null;
}

export async function decideFieldWaterDraft(draftId: string, confirm: boolean): Promise<'SAVED' | 'CANCELLED'> {
  const response = await apiFetch(`/api/v1/fields/history-chat/drafts/${encodeURIComponent(draftId)}/decision`, {
    method: 'POST', body: JSON.stringify({ confirm }), cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'No se pudo resolver el registro.');
  if (data.status !== 'SAVED' && data.status !== 'CANCELLED') throw new Error('Respuesta de registro inválida.');
  return data.status;
}

export async function askFieldHistoryApi(
  fieldId: number, query: { question: string; date_from: string; date_to: string;
    previous_question?: string },
): Promise<FieldHistoryAnswer> {
  const response = await apiFetch(`/api/v1/fields/${fieldId}/history-chat`, {
    method: 'POST', body: JSON.stringify(query), cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'No se pudo consultar el historial.');
  const valid = (item: FieldHistoryAnswer) => item && ['ANSWERED', 'NO_DATA', 'UNSUPPORTED'].includes(item.status) &&
    typeof item.answer === 'string' && item.date_from === query.date_from && item.date_to === query.date_to &&
    Array.isArray(item.warnings) && item.warnings.every(warning => typeof warning === 'string');
  const draft = data?.draft;
  if (!valid(data) || (draft && (typeof draft.id !== 'string' ||
      !['irrigation', 'rain'].includes(draft.kind) || !Number.isFinite(draft.amount_mm) ||
      typeof draft.field_name !== 'string' || typeof draft.event_date !== 'string')) ||
      (data.parts !== undefined &&
      (!Array.isArray(data.parts) || data.parts.length > 3 || !data.parts.every(valid)))) {
    throw new Error('El servicio devolvió una respuesta inválida.');
  }
  return data;
}

export interface FieldAgentSnapshot {
  id: number;
  field_id: number;
  analyze_payload?: Record<string, any> | null;
  analyze_response?: Record<string, any> | null;
  weather_compare_payload?: Record<string, any> | null;
  weather_compare_response?: Record<string, any> | null;
  generated_at: string;
  created_at: string;
  updated_at: string;
  is_stale?: boolean;
}

export interface FieldAgentSnapshotRefreshPayload {
  force?: boolean;
  max_age_hours?: number;
  date_from?: string;
  date_to?: string;
  initial_available_water_mm?: number;
  irrigation_applied_mm?: number;
}

export interface AnalyzeIrrigationPayload {
  field_id: number;
  field_name?: string;
  user_query?: string;
  date_from: string;
  date_to: string;
  crop_name: string;
  crop_coefficient?: number;
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
  field_id: number;
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
  crop_coefficient?: number;
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
  maiz: 1.2,
  corn: 1.2,
  soja: 1.15,
  soy: 1.15,
  soybean: 1.15,
  trigo: 1.15,
  wheat: 1.15,
  cebada: 1.15,
  barley: 1.15,
  avena: 1.15,
  oats: 1.15,
  sorgo: 1.05,
  sorghum: 1.05,
  arroz: 1.2,
  rice: 1.2,
  girasol: 1.1,
  sunflower: 1.1,
  algodon: 1.17,
  cotton: 1.17,
  mani: 1.15,
  peanut: 1.15,
  groundnut: 1.15,
  'cana de azucar': 1.25,
  sugarcane: 1.25,
  alfalfa: 0.95,
  papa: 1.15,
  potato: 1.15,
  tomate: 1.15,
  tomato: 1.15,
  cebolla: 1.05,
  onion: 1.05,
  poroto: 1.15,
  bean: 1.15,
  arveja: 1.15,
  pea: 1.15,
  garbanzo: 1.15,
  chickpea: 1.15,
  lenteja: 1.1,
  lentil: 1.1,
  colza: 1.08,
  canola: 1.08,
  rapeseed: 1.08,
  lino: 1.1,
  flax: 1.1,
  vid: 0.7,
  grape: 0.7,
  citrus: 0.7,
  citricos: 0.7,
  limon: 0.7,
  naranja: 0.7,
  mandarina: 0.7,
  olivo: 0.7,
  olive: 0.7,
  pastura: 0.95,
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
  return cropName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[_-]/g, ' ');
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
    crop_coefficient: options.cropCoefficient,
    effective_precipitation_ratio: options.effectivePrecipitationRatio ?? 0.8,
    // Unknown water is omitted; it is not a measurement of an empty profile.
    // Persisted field analyses resolve initialization in the backend's history.
    initial_available_water_mm: options.initialAvailableWaterMm,
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
    field_id: Number(field.id),
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
    field_id: Number(field.id),
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
  const token = getAccessToken();
  const res = await fetch('/api/agents/analyze-irrigation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload),
  });

  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

export async function weatherCompareApi(payload: WeatherComparePayload) {
  const token = getAccessToken();
  const res = await fetch('/api/agents/weather-compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload),
  });

  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

export async function getFieldAgentSnapshotApi(fieldId: string | number): Promise<FieldAgentSnapshot | null> {
  try {
    const res = await apiFetch(`/api/v1/fields/${fieldId}/agent-snapshot`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function refreshFieldAgentSnapshotApi(
  fieldId: string | number,
  payload: FieldAgentSnapshotRefreshPayload = {}
): Promise<{ ok: boolean; status: number; data: FieldAgentSnapshot | any }> {
  const res = await apiFetch(`/api/v1/fields/${fieldId}/agent-snapshot/refresh`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

/* ==========================================================================
   HISTORY AND REPORTS API METHODS
   ========================================================================== */

export interface IrrigationEvent {
  id: number | string;
  field_id: number;
  applied_at: string;
  amount_mm: number;
  method?: string;
  notes?: string;
  registered_by?: string; // UUID
  created_at?: string;
}

export interface RainfallEvent {
  id: number | string;
  field_id: number;
  recorded_at: string;
  amount_mm: number;
  notes?: string;
  registered_by?: string; // UUID
  created_at?: string;
}

export interface HydricHistoryDay {
  date: string;
  dr_mm: number;
  au_mm: number;
  raw_mm?: number;
  afd_mm: number;
  taw_mm: number;
  etc_mm: number;
  et0_mm: number;
  rain_mm: number;
  irrigation_mm: number;
  deep_percolation_mm?: number;
  ndvi?: number;
  ndvi_is_interpolated?: boolean;
  ndvi_source_date?: string | null;
  kc?: number;
  kc_source?: string;
  under_stress?: boolean;
  depletion_fraction_p?: number;
  rain_source: 'manual' | 'open_meteo' | 'nasa_power' | 'none';
  warnings?: string[];
}

export interface ReportsSummary {
  field_id: number;
  field_name: string;
  crop: string;
  area_ha: number;
  period: {
    from: string;
    to: string;
  };
  metrics: {
    total_precipitation_mm: number;
    total_irrigation_applied_mm: number;
    total_water_volume_m3: number;
    total_evapotranspiration_etc_mm: number;
    days_under_stress_raw: number;
    water_efficiency_index: number;
  };
}

export async function getIrrigationEventsApi(
  fieldId: string | number,
  dateFrom?: string,
  dateTo?: string
): Promise<IrrigationEvent[]> {
  try {
    let url = `/api/v1/fields/${fieldId}/irrigation-events`;
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    const query = params.toString();
    if (query) url += `?${query}`;

    const res = await apiFetch(url);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function createIrrigationEventApi(
  fieldId: string | number,
  payload: Partial<IrrigationEvent>
): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await apiFetch(`/api/v1/fields/${fieldId}/irrigation-events`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

export async function updateIrrigationEventApi(
  fieldId: string | number,
  eventId: string | number,
  payload: Partial<IrrigationEvent>
): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await apiFetch(`/api/v1/fields/${fieldId}/irrigation-events/${eventId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

export async function deleteIrrigationEventApi(
  fieldId: string | number,
  eventId: string | number
): Promise<boolean> {
  try {
    const res = await apiFetch(`/api/v1/fields/${fieldId}/irrigation-events/${eventId}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getRainfallEventsApi(
  fieldId: string | number,
  dateFrom?: string,
  dateTo?: string
): Promise<RainfallEvent[]> {
  try {
    let url = `/api/v1/fields/${fieldId}/rainfall-events`;
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    const query = params.toString();
    if (query) url += `?${query}`;

    const res = await apiFetch(url);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function createRainfallEventApi(
  fieldId: string | number,
  payload: Partial<RainfallEvent>
): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await apiFetch(`/api/v1/fields/${fieldId}/rainfall-events`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

export async function updateRainfallEventApi(
  fieldId: string | number,
  eventId: string | number,
  payload: Partial<RainfallEvent>
): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await apiFetch(`/api/v1/fields/${fieldId}/rainfall-events/${eventId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

export async function deleteRainfallEventApi(
  fieldId: string | number,
  eventId: string | number
): Promise<boolean> {
  try {
    const res = await apiFetch(`/api/v1/fields/${fieldId}/rainfall-events/${eventId}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getHydricHistoryApi(
  fieldId: string | number,
  dateFrom: string,
  dateTo: string
): Promise<HydricHistoryDay[]> {
  const res = await apiFetch(`/api/v1/fields/${fieldId}/hydric-history?date_from=${dateFrom}&date_to=${dateTo}`);
  if (!res.ok) throw new Error('No se pudo cargar el historial hídrico. La falta de datos no equivale a cero.');
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('El historial hídrico recibido no es válido.');
  return data;
}

export async function getReportsSummaryApi(
  fieldId: string | number,
  dateFrom: string,
  dateTo: string
): Promise<ReportsSummary | null> {
  try {
    const res = await apiFetch(`/api/v1/fields/${fieldId}/reports/summary?date_from=${dateFrom}&date_to=${dateTo}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function exportReportBlobApi(
  fieldId: string | number,
  format: 'csv' | 'xlsx',
  dateFrom: string,
  dateTo: string
): Promise<Blob> {
  const token = getAccessToken();
  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(
    `${API_URL}/api/v1/fields/${fieldId}/reports/export?format=${format}&date_from=${dateFrom}&date_to=${dateTo}`,
    { headers }
  );
  if (!response.ok) throw new Error('Failed to export report');
  return response.blob();
}

export interface NdviHistoryItem {
  id: number;
  field_id: number;
  date: string;
  ndvi_mean: number;
  ndvi_min: number;
  ndvi_max: number;
  cloud_coverage_pct: number;
  valid_pixel_coverage_pct?: number | null;
  sentinel_scene_id?: string | null;
  source: string;
  quality_score: number;
  quality_status: string;
  vegetation_signal: string;
  warnings: string[];
  created_at: string;
}

export interface NdviPreview {
  field_id: number;
  field_name: string;
  date: string | null;
  ndvi_mean: number | null;
  cloud_coverage_pct?: number | null;
  valid_pixel_coverage_pct?: number | null;
  sentinel_scene_id?: string | null;
  quality_score: number;
  quality_status: string;
  warnings: string[];
  sentinel_rgb_preview_data_url?: string | null;
  ndvi_preview_data_url?: string | null;
}

export interface SentinelMapLayer {
  field_id: number;
  field_name: string;
  date: string | null;
  cloud_coverage_pct?: number | null;
  sentinel_scene_id: string;
  tile_url_template: string;
}

export async function getNdviHistoryApi(
  fieldId: string | number,
  dateFrom: string,
  dateTo: string,
  source?: string,
  refresh?: boolean
): Promise<NdviHistoryItem[]> {
  try {
    let url = `/api/v1/fields/${fieldId}/ndvi-history?date_from=${dateFrom}&date_to=${dateTo}`;
    if (source) {
      url += `&source=${source}`;
    }
    if (refresh) {
      url += `&refresh=true`;
    }
    const res = await apiFetch(url);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function getSentinelMapLayerApi(
  fieldId: string | number,
  sceneId?: string | null
): Promise<{ ok: boolean; status: number; data: SentinelMapLayer | any }> {
  let url = `/api/v1/fields/${fieldId}/sentinel-map-layer`;
  if (sceneId) {
    url += `?scene_id=${encodeURIComponent(sceneId)}`;
  }

  try {
    const res = await apiFetch(url);
    return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
  } catch {
    return {
      ok: false,
      status: 0,
      data: { detail: 'No se pudo cargar la capa Sentinel-2 del lote.' },
    };
  }
}

export async function getSentinelMapLayerByCenterApi(
  latitude: number,
  longitude: number,
  radiusM = 6000
): Promise<{ ok: boolean; status: number; data: SentinelMapLayer | any }> {
  const url =
    `/api/v1/sentinel/map-layer?latitude=${encodeURIComponent(latitude)}` +
    `&longitude=${encodeURIComponent(longitude)}&radius_m=${encodeURIComponent(radiusM)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const res = await apiFetch(url, { signal: controller.signal });
    return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    return {
      ok: false,
      status: 0,
      data: {
        detail: isTimeout
          ? 'La imagen Sentinel-2 tardó demasiado en cargar.'
          : 'No se pudo cargar la imagen Sentinel-2.',
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getNdviPreviewApi(
  fieldId: string | number,
  dateFrom: string,
  dateTo: string,
  cloudCoverageMaxPct = 30,
  sceneId?: string | null,
  includeNdviPreview = false
): Promise<{ ok: boolean; status: number; data: NdviPreview | any }> {
  let url =
    `/api/v1/fields/${fieldId}/ndvi-preview?date_from=${dateFrom}&date_to=${dateTo}` +
    `&cloud_coverage_max_pct=${cloudCoverageMaxPct}`;
  if (sceneId) {
    url += `&scene_id=${encodeURIComponent(sceneId)}`;
  }
  if (includeNdviPreview) {
    url += '&include_ndvi_preview=true';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await apiFetch(url, { signal: controller.signal });
    return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    return {
      ok: false,
      status: 0,
      data: {
        detail: isTimeout
          ? 'La generación de la imagen tardó demasiado. Probá de nuevo en unos minutos.'
          : 'No se pudo generar la imagen Sentinel-2 del lote.',
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/* ==========================================================================
   ASSISTANT API METHODS
   ========================================================================== */

export interface AssistantHistoryItem {
  id: string;
  member_id: string;
  user_id: string;
  phone_whatsapp: string;
  date: string;
  query: string;
  ai_response: string;
  category: 'irrigation' | 'weather' | 'ndvi' | 'register_irrigation' | 'register_rainfall' | 'navigation' | string;
  status: 'resolved' | 'pending' | 'registered' | string;
  field_id?: number | null;
  field_name?: string | null;
  turn_count?: number;
}

export interface AssistantHistoryResponse {
  farm_id: string;
  days: number;
  items: AssistantHistoryItem[];
}

export async function getAssistantHistoryApi(
  farmId?: string | null,
  days: number = 7
): Promise<AssistantHistoryResponse | null> {
  if (!farmId || farmId === 'default') return null; // Enforce UUID
  try {
    const res = await apiFetch(`/api/v1/farms/${farmId}/assistant/history?days=${days}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getFarmApi(farmId: string): Promise<FarmSummary | null> {
  try {
    const res = await apiFetch(`/api/v1/farms/${farmId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function updateFarmApi(farmId: string, payload: { name?: string }): Promise<boolean> {
  try {
    const res = await apiFetch(`/api/v1/farms/${farmId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* ==========================================================================
   NOTIFICATIONS API
   ========================================================================== */

export type NotificationType =
  | 'rainfall_forecast'
  | 'irrigation'
  | 'water_stress'
  | 'frost'
  | 'high_et0'
  | 'ndvi_drop';

export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface BackendNotification {
  id: string;
  farm_id: string;
  farm_name?: string;
  field_id?: number;
  field_name?: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string;
  payload?: Record<string, any>;
  read_at: string | null;
  whatsapp_status?: string;
  whatsapp_sent_at?: string | null;
  created_at: string;
}

export interface NotificationsListResponse {
  unread_count: number;
  items: BackendNotification[];
}

export interface UnreadCountResponse {
  unread_count: number;
}

/**
 * Get notifications for the current user.
 * Uses /api/v1/notifications with optional farm_id filter.
 */
export async function getNotificationsApi(opts?: {
  farmId?: string;
  unreadOnly?: boolean;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}): Promise<NotificationsListResponse | null> {
  try {
    const params = new URLSearchParams();
    if (opts?.farmId) params.set('farm_id', opts.farmId);
    if (opts?.unreadOnly) params.set('unread_only', 'true');
    if (opts?.type) params.set('type', opts.type);
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.offset) params.set('offset', String(opts.offset));

    const qs = params.toString();
    const res = await apiFetch(`/api/v1/notifications${qs ? `?${qs}` : ''}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Get notifications scoped to a specific farm.
 */
export async function getFarmNotificationsApi(
  farmId: string,
  opts?: { unreadOnly?: boolean; limit?: number }
): Promise<NotificationsListResponse | null> {
  try {
    const params = new URLSearchParams();
    if (opts?.unreadOnly) params.set('unread_only', 'true');
    if (opts?.limit) params.set('limit', String(opts.limit));

    const qs = params.toString();
    const res = await apiFetch(`/api/v1/farms/${farmId}/notifications${qs ? `?${qs}` : ''}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Get unread notification count for the current user.
 */
export async function getNotificationsUnreadCountApi(): Promise<number> {
  try {
    const res = await apiFetch('/api/v1/notifications/unread-count');
    if (!res.ok) return 0;
    const data: UnreadCountResponse = await res.json();
    return data.unread_count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationReadApi(notificationId: string): Promise<boolean> {
  try {
    const res = await apiFetch(`/api/v1/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Mark all notifications as read for the current user.
 */
export async function markAllNotificationsReadApi(): Promise<boolean> {
  try {
    const res = await apiFetch('/api/v1/notifications/read-all', {
      method: 'POST',
    });
    return res.ok;
  } catch {
    return false;
  }
}
