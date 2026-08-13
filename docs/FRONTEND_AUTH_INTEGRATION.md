# Frontend — Integracion con Auth y Lotes (`fields`)

Guia para conectar el frontend Next.js con el backend FastAPI usando **auth JWT + lotes persistidos en `fields`**.

Backend cloud (staging):

```text
https://backendpfiferreyrafredes-production.up.railway.app
```

Base path de auth y lotes:

```text
/api/v1
```

---

## 1. Variables de entorno (frontend)

Archivo `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com
```

- `NEXT_PUBLIC_API_URL` debe apuntar al backend FastAPI (sin `/api/v1` al final).
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` debe ser el **mismo** `GOOGLE_CLIENT_ID` configurado en el backend.

Los endpoints de agentes (`/agents/*`) siguen usando `X-API-Key` por ahora. No exponer `AGENT_API_KEY` en el cliente; llamarlos desde Route Handlers / Server Actions del propio Next.js.

---

## 2. Resumen de endpoints

| Metodo | Ruta | Auth | Uso en UI |
|--------|------|------|-----------|
| `POST` | `/api/v1/auth/register` | No | Registro directo de Productor/Dueño (1 paso unificado) |
| `POST` | `/api/v1/auth/login` | No | Login email/password |
| `POST` | `/api/v1/auth/google` | No | Login/registro Google (1 clic + WhatsApp si falta) |
| `POST` | `/api/v1/auth/refresh` | Cookie | Renovar access token |
| `POST` | `/api/v1/auth/logout` | Cookie | Cerrar sesion |
| `GET` | `/api/v1/users/me` | Bearer | Perfil + lotes del usuario (si hay lotes omite onboarding) |
| `POST` | `/api/v1/fields` | Bearer | Crear lote (onboarding mapa) |
| `GET` | `/api/v1/fields` | Bearer | Listar lotes |
| `GET` | `/api/v1/fields/{id}` | Bearer | Detalle de lote |
| `PATCH` | `/api/v1/fields/{id}` | Bearer | Editar lote |
| `DELETE` | `/api/v1/fields/{id}` | Bearer | Eliminar lote |
| `GET` | `/api/v1/farms/members` | Bearer | Listar miembros del establecimiento (`/api/v1/fields/{id}/members`) |
| `POST` | `/api/v1/farms/members` | Bearer | Agregar/invitar usuario al campo con rol (Dueño, Asesor, Operario) |
| `PATCH` | `/api/v1/farms/members/{member_id}` | Bearer | Cambiar rol de un miembro en el campo |
| `DELETE` | `/api/v1/farms/members/{member_id}` | Bearer | Desvincular miembro del campo |

---

## 3. Manejo de tokens en el cliente

### Access token (JSON)

- Viene en el body de `register`, `login`, `google` (cuando la sesion queda completa) y `refresh`.
- Guardarlo en memoria (React state / context) o `sessionStorage`.
- Enviarlo en cada request protegido:

```text
Authorization: Bearer <access_token>
```

### Refresh token (cookie HttpOnly)

- El backend lo setea en cookie `refresh_token` (no accesible desde JS).
- Todas las llamadas a `/api/v1/auth/refresh` y `/api/v1/auth/logout` deben usar:

```typescript
fetch(`${API_URL}/api/v1/auth/refresh`, {
  method: "POST",
  credentials: "include",
});
```

### Cliente API sugerido

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL!;

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: path.startsWith("/api/v1/auth/") ? "include" : init.credentials,
  });

  if (response.status === 401 && path !== "/api/v1/auth/refresh") {
    const refreshed = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (refreshed.ok) {
      const data = await refreshed.json();
      setAccessToken(data.access_token);
      headers.set("Authorization", `Bearer ${data.access_token}`);
      response = await fetch(`${API_URL}${path}`, { ...init, headers });
    }
  }

  return response;
}
```

---

## 4. Flujos de pantalla

### 4.1 Registro tradicional (email + password)

Un solo POST con datos de acceso y perfil:

```typescript
const response = await fetch(`${API_URL}/api/v1/auth/register`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    email: "productor@campo.com",
    password: "PasswordSeguro123!",
    first_name: "Esteban",
    last_name: "Ferreyra",
    role: "admin",
    phone_whatsapp: "+5492477458921",
  }),
});
```

**201 Created:**

```json
{
  "status": "success",
  "access_token": "eyJ...",
  "user": {
    "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "email": "productor@campo.com",
    "first_name": "Esteban",
    "last_name": "Ferreyra",
    "role": "admin",
    "phone_whatsapp": "+5492477458921"
  }
}
```

**409 Conflict** si el email ya existe.

Roles validos: `admin` (productor), `agronomist`, `operator`.

---

### 4.2 Login tradicional

```typescript
await fetch(`${API_URL}/api/v1/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ email, password }),
});
```

Misma forma de respuesta que register (sin `status` opcional). **401** si credenciales invalidas.

---

### 4.3 Google OAuth (2 pasos)

**Paso 1 — boton Google en frontend:**

Usar `@react-oauth/google` o GIS y obtener `credential` (id_token JWT de Google).

```typescript
const response = await fetch(`${API_URL}/api/v1/auth/google`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ id_token: googleCredential }),
});
```

Si el usuario es nuevo y falta perfil (**200** con flag):

```json
{
  "requires_profile": true,
  "google_email": "user@gmail.com",
  "first_name": "Esteban",
  "last_name": "Ferreyra"
}
```

Mostrar formulario paso 2 (telefono WhatsApp + rol).

**Paso 2 — completar perfil:**

```typescript
await fetch(`${API_URL}/api/v1/auth/google`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    id_token: googleCredential,
    phone_whatsapp: "+5492477458921",
    role: "admin",
  }),
});
```

Respuesta de sesion completa (igual que login):

```json
{
  "access_token": "eyJ...",
  "user": { "...": "..." }
}
```

---

### 4.4 Onboarding — dibujar lote en mapa

Despues del login, persistir el poligono:

```typescript
await apiFetch("/api/v1/fields", {
  method: "POST",
  body: JSON.stringify({
    name: "Lote Norte",
    geometry_geojson: {
      type: "Polygon",
      coordinates: [
        [
          [-63.05929, -40.79915],
          [-63.058, -40.799],
          [-63.058, -40.798],
          [-63.05929, -40.79915]
        ]
      ]
    },
    area_ha: 45.2,
    soil_type: "Franco-Arenoso",
    crop_type: "Maíz",
    irrigation_system: "Pivote",
    field_capacity_fc: 28.5,
    wilting_point_wp: 12.0,
    total_available_water_taw: 120.0
  }),
});
```

**Importante:** GeoJSON usa orden `[longitude, latitude]`, no al reves.

Campos obligatorios al crear: `name`, `geometry_geojson`, `area_ha`, `crop_type`, `irrigation_system`.

El backend calcula `center_latitude` / `center_longitude` del poligono si no se envian.

---

### 4.5 Dashboard — perfil y lotes

```typescript
const response = await apiFetch("/api/v1/users/me");
const { user, fields } = await response.json();
```

```json
{
  "user": {
    "id": "...",
    "email": "...",
    "first_name": "...",
    "last_name": "...",
    "role": "admin",
    "phone_whatsapp": "+549..."
  },
  "fields": [
    {
      "id": 1,
      "name": "Lote Norte",
      "geometry_geojson": { "type": "Polygon", "coordinates": [...] },
      "area_ha": 45.2,
      "soil_type": "Franco-Arenoso",
      "crop_type": "Maíz",
      "irrigation_system": "Pivote",
      "center_latitude": -40.799,
      "center_longitude": -63.059,
      "field_capacity_fc": 28.5,
      "wilting_point_wp": 12.0,
      "total_available_water_taw": 120.0,
      "created_at": "2026-08-08T20:00:00Z",
      "updated_at": "2026-08-08T20:00:00Z"
    }
  ]
}
```

---

## 5. Conectar lotes con agentes de riego

Los agentes **aun no leen** la tabla `fields`. El frontend debe armar el request desde el lote guardado.

Ejemplo Server Action / Route Handler en Next.js:

```typescript
async function analyzeField(field: Field, dateFrom: string, dateTo: string) {
  const body = {
    field_name: field.name,
    date_from: dateFrom,
    date_to: dateTo,
    crop_name: field.crop_type.toLowerCase(),
    crop_coefficient: 1.15,
    irrigation_system: field.irrigation_system.toLowerCase(),
    use_inta_eeavi_station: false,
    geometry_geojson: field.geometry_geojson,
  };

  const response = await fetch(`${API_URL}/agents/analyze-irrigation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.AGENT_API_KEY!,
    },
    body: JSON.stringify(body),
  });

  return response.json();
}
```

Si no hay poligono, usar centroide:

```typescript
latitude: field.center_latitude,
longitude: field.center_longitude,
```

Contratos completos de agentes: [`FRONTEND_AND_CONSOLE_FLOW.md`](./FRONTEND_AND_CONSOLE_FLOW.md).

---

## 6. Mapa de rutas sugerido en Next.js

| Ruta UI | Accion backend |
|---------|----------------|
| `/login` | `POST /auth/login` o Google paso 1 |
| `/register` | `POST /auth/register` |
| `/register/complete` | Google paso 2 (`requires_profile`) |
| `/onboarding/map` | `POST /fields` |
| `/dashboard` | `GET /users/me` |
| `/fields/[id]` | `GET /fields/{id}`, `PATCH`, `DELETE` |
| `/analysis` | Proxy a `POST /agents/analyze-irrigation` |

---

## 7. Errores HTTP a manejar

| Codigo | Cuando | Accion UI |
|--------|--------|-----------|
| `400` | Payload invalido | Mostrar errores de validacion |
| `401` | Token expirado o credenciales mal | Refresh automatico o redirect `/login` |
| `403` | Lote de otro usuario | Mensaje "sin permiso" |
| `404` | Lote inexistente | Redirect dashboard |
| `409` | Email duplicado en register | "Este email ya esta registrado" |
| `503` | Backend sin JWT/DB config | Pagina de mantenimiento |

---

## 8. CORS y cookies en desarrollo

El backend permite el origen configurado en `CORS_ORIGINS` (default `http://localhost:3000`).

Para que la cookie de refresh funcione en local:

- Frontend en `http://localhost:3000`
- Backend en `http://localhost:8000`
- Siempre `credentials: "include"` en auth

En produccion, ambos deben estar en HTTPS; la cookie usa `Secure` fuera de `ENVIRONMENT=local`.

---

## 9. Checklist de implementacion frontend

- [ ] Configurar `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- [ ] Contexto de auth (`user`, `accessToken`, `login`, `logout`, `refresh`)
- [ ] Pantallas login / register / complete-profile (Google)
- [ ] Guard de rutas: redirect a `/login` si no hay sesion
- [ ] Onboarding mapa → `POST /api/v1/fields`
- [ ] Dashboard con `GET /api/v1/users/me`
- [ ] CRUD de lotes (editar nombre, cultivo, riego)
- [ ] Server proxy para `/agents/*` con `AGENT_API_KEY` solo en servidor
- [ ] Mapear `field` → body de `analyze-irrigation`

---

## 10. Referencias

- [`backend-auth-architecture.md`](./backend-auth-architecture.md) — spec original de auth
- [`AUTH_IMPLEMENTATION_GAP.md`](./AUTH_IMPLEMENTATION_GAP.md) — decision de usar `fields` extendido (Opcion D)
- [`FRONTEND_AND_CONSOLE_FLOW.md`](./FRONTEND_AND_CONSOLE_FLOW.md) — contratos de agentes
