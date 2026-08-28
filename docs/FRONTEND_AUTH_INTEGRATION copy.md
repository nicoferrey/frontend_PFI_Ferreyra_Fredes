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
NEXT_PUBLIC_GOOGLE_CLIENT_ID=560671538785-fojlgl5o7qnk6l93o0dh51d2f589h3g7.apps.googleusercontent.com
```

- `NEXT_PUBLIC_API_URL` debe apuntar al backend FastAPI (sin `/api/v1` al final).
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` debe ser el **mismo** `GOOGLE_CLIENT_ID` configurado en el backend.

Los endpoints de agentes (`/agents/*`) siguen usando `X-API-Key` por ahora. No exponer `AGENT_API_KEY` en el cliente; llamarlos desde Route Handlers / Server Actions del propio Next.js.

---

## 2. Resumen de endpoints

| Metodo | Ruta | Auth | Uso en UI |
|--------|------|------|-----------|
| `POST` | `/api/v1/auth/register` | No | Registro email/password (paso 1+2 juntos) |
| `POST` | `/api/v1/auth/login` | No | Login email/password |
| `POST` | `/api/v1/auth/google` | No | Login/registro Google (2 pasos) |
| `POST` | `/api/v1/auth/refresh` | Cookie | Renovar access token |
| `POST` | `/api/v1/auth/logout` | Cookie | Cerrar sesion |
| `GET` | `/api/v1/users/me` | Bearer | Perfil + lotes accesibles con `user_role_in_farm` |
| `POST` | `/api/v1/fields` | Bearer | Crear lote; si no hay `farm_id`, crea farm + membresia admin |
| `GET` | `/api/v1/fields` | Bearer | Listar lotes de todos los farms donde el usuario es miembro |
| `GET` | `/api/v1/fields/{id}` | Bearer | Detalle de lote |
| `PATCH` | `/api/v1/fields/{id}` | Bearer | Editar lote |
| `DELETE` | `/api/v1/fields/{id}` | Bearer | Eliminar lote |
| `GET` | `/api/v1/fields/{id}/members` | Bearer | Listar miembros del establecimiento del lote |
| `POST` | `/api/v1/fields/{id}/members` | Bearer (admin) | Invitar/agregar colaborador |
| `PATCH` | `/api/v1/members/{member_id}/role` | Bearer (admin) | Cambiar rol de miembro |
| `POST` | `/api/v1/members/{member_id}/resend-invitation` | Bearer (admin) | Reenviar link de invitacion |
| `GET` | `/api/v1/auth/check-email?email=` | No | Detectar si email tiene invitacion pendiente |
| `GET` | `/api/v1/invitations/{token}` | No | Preview de invitacion (pantalla /invitation) |
| `POST` | `/api/v1/invitations/{token}/accept` | No | Completar cuenta y abrir sesion |

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

#### Configuracion previa en Google Cloud Console (obligatoria)

Si ves `Error 400: origin_mismatch`, falta registrar el origen del frontend.

1. Entra a [Google Cloud Console](https://console.cloud.google.com/) → **APIs y servicios** → **Credenciales**.
2. Edita el cliente OAuth 2.0 cuyo ID coincide con `NEXT_PUBLIC_GOOGLE_CLIENT_ID`:
   ```text
   560671538785-fojlgl5o7qnk6l93o0dh51d2f589h3g7.apps.googleusercontent.com
   ```
3. En **Origenes de JavaScript autorizados**, agrega **exactamente** (sin `/` final):
   ```text
   http://localhost:3000
   ```
4. Cuando deployes el frontend, agrega tambien su URL publica, por ejemplo:
   ```text
   https://tu-app.vercel.app
   ```
5. Tipo de cliente: debe ser **Aplicacion web** (Web application), no Android/iOS.
6. Guarda y espera 1-5 minutos a que Google propague el cambio.

No hace falta agregar el backend (`backendpfiferreyrafredes-production.up.railway.app`) en origenes JS: el boton Google corre en el frontend. El backend solo valida el `id_token` recibido.

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

Opcionales:
- `farm_id` — agregar lote a un establecimiento existente (usuario debe ser miembro).
- `farm_name` — nombre del establecimiento si es el primer lote (default: nombre del lote).
- `agricultural_zone` — zona agricola del establecimiento.

En el **primer lote**, el backend crea automaticamente `farms` + `farm_members` con rol `admin` para el usuario.

El backend calcula `center_latitude` / `center_longitude` del poligono si no se envian.

Para un **segundo lote** del mismo campo, reenviar `farm_id` devuelto en el primer lote:

```typescript
body: JSON.stringify({
  farm_id: firstField.farm_id,
  name: "Lote Sur",
  // ... resto igual
})
```

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
      "farm_id": "f83a21b4-1029-4d6e-82f3-102948a7b1c3",
      "name": "Lote Norte",
      "geometry_geojson": { "type": "Polygon", "coordinates": [...] },
      "area_ha": 45.2,
      "soil_type": "Franco-Arenoso",
      "crop_type": "Maíz",
      "irrigation_system": "Pivote",
      "center_latitude": -40.799,
      "center_longitude": -63.059,
      "user_role_in_farm": "admin",
      "field_capacity_fc": 28.5,
      "wilting_point_wp": 12.0,
      "total_available_water_taw": 120.0,
      "created_at": "2026-08-08T20:00:00Z",
      "updated_at": "2026-08-08T20:00:00Z"
    }
  ]
}
```

> **Regla frontend:** si `fields.length > 0`, redirigir al Dashboard (`/`) y omitir Onboarding.

---

### 4.6 Gestion de miembros del establecimiento

Los miembros pertenecen al **establecimiento (`farm`)**, no a un lote individual. Usa una de estas rutas:

| Caso | Ruta recomendada |
|------|------------------|
| Un solo campo / UX simple | `GET/POST /api/v1/farms/members` |
| Con `farm_id` de `/users/me` | `GET/POST /api/v1/farms/{farm_id}/members` |
| Con `id` del lote (entero) | `GET/POST /api/v1/fields/{field_id}/members` |

**No uses** `/fields/default/members` — `field_id` debe ser un **entero** (`1`, `2`, ...) o usar las rutas `/farms/...`.

El admin invita solo con **email** y **rol**. Nombre, apellido y WhatsApp son opcionales en este POST: el invitado los completa al aceptar el link.

```typescript
// Opcion A — mas simple (primer farm del usuario)
await apiFetch("/api/v1/farms/members");

await apiFetch("/api/v1/farms/members", {
  method: "POST",
  body: JSON.stringify({
    email: "m.garcia@campo.com",
    role: "operator",
  }),
});

// Opcion B — con farm_id UUID de GET /users/me → fields[0].farm_id
const farmId = fields[0].farm_id;
await apiFetch(`/api/v1/farms/${farmId}/members`, { method: "POST", ... });

// Opcion C — con id entero del lote
const fieldId = fields[0].id; // ej: 1
await apiFetch(`/api/v1/fields/${fieldId}/members`, { method: "POST", ... });
```

// Cambiar rol
await apiFetch(`/api/v1/members/${memberId}/role`, {
  method: "PATCH",
  body: JSON.stringify({ role: "agronomist" }),
});

// Desvincular
await apiFetch(`/api/v1/members/${memberId}`, { method: "DELETE" });
```

Roles validos por establecimiento: `admin` (dueno), `agronomist`, `operator`.

Al invitar, el miembro queda en `status: "invited"` **aunque ya tenga cuenta**. Recibe un email con el botón **Aceptar y unirme**. Hasta que acepte, no accede al campo.

```json
{
  "status": "invited",
  "invitation_url": "https://agromasapp.vercel.app/invitation/abc123...",
  "email_sent": true,
  "email_error": null
}
```

Si el envío falla, `email_sent: false`, `email_error` describe el motivo y el dueño puede copiar `invitation_url` manualmente.

**409 Conflict** si ese email ya es miembro **activo** del establecimiento.

---

### 4.7 Flujo de invitacion (link magico)

**Pantalla frontend:** `/invitation/[token]`

#### Paso 1 — Cargar datos de la invitacion

```typescript
const preview = await fetch(`${API_URL}/api/v1/invitations/${token}`);
// 404 si expiro o es invalido
```

```json
{
  "email": "m.garcia@campo.com",
  "first_name": "",
  "last_name": "",
  "farm_name": "Campo Don Pedro",
  "role": "operator",
  "invited_by_name": "Esteban Ferreyra",
  "expires_at": "2026-08-20T00:00:00Z",
  "requires_password": true,
  "requires_profile": true
}
```

Si `requires_profile` es `true`, la pantalla de invitacion debe pedir nombre y apellido (y WhatsApp si aplica).

Si `requires_password` es `false`, el usuario **ya tiene cuenta**: mostrar el botón **Aceptar y unirme** sin pedir contraseña.

```json
{
  "email": "m.garcia@campo.com",
  "first_name": "Martín",
  "last_name": "García",
  "farm_name": "Campo Los Alamos",
  "role": "agronomist",
  "invited_by_name": "Esteban Ferreyra",
  "expires_at": "2026-08-20T00:00:00Z",
  "requires_password": false,
  "requires_profile": false
}
```

#### Paso 2 — Completar cuenta y entrar

Usuario **nuevo** (`requires_password: true`):

```typescript
const response = await fetch(`${API_URL}/api/v1/invitations/${token}/accept`, {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    password: "PasswordSeguro123!",
    first_name: "Martín",
    last_name: "García",
    phone_whatsapp: "+5492477334455",
  }),
});
// 200 → { access_token, user } — redirect a Dashboard
```

Usuario **con cuenta** (`requires_password: false`):

```typescript
const response = await fetch(`${API_URL}/api/v1/invitations/${token}/accept`, {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({}),
});
// 200 → { access_token, user } — el miembro pasa a status active
```

#### Alternativa: detectar email en login

Antes de mostrar error en login, consultar:

```typescript
const check = await fetch(`${API_URL}/api/v1/auth/check-email?email=${encodeURIComponent(email)}`);
```

```json
{
  "email": "m.garcia@campo.com",
  "exists": true,
  "has_password": false,
  "invitation_pending": true,
  "pending_farms": ["Campo Don Pedro"]
}
```

Si `invitation_pending && !has_password` → mostrar: *"Tenés una invitacion pendiente. Revisá tu email o pedile el link al administrador."*

Si `invitation_pending && has_password` → mostrar: *"Te invitaron a un campo. Revisá tu email y aceptá para unirte."*

#### Reenviar invitacion (admin)

```typescript
await apiFetch(`/api/v1/members/${memberId}/resend-invitation`, { method: "POST" });
```

#### Registro alternativo (sin token)

Sigue funcionando `POST /auth/register` con el mismo email si el usuario no tiene el link.

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
| `/invitation/[token]` | `GET /invitations/{token}`, `POST /invitations/{token}/accept` |

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
| Google `origin_mismatch` | Origen no registrado en Cloud Console | Agregar `http://localhost:3000` en **Origenes de JavaScript autorizados** |

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
