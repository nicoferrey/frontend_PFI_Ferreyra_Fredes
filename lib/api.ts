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
