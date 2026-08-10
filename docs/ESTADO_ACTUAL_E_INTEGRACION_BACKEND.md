# Estado actual e instrucciones de integracion frontend-backend

Fecha de corte: 2026-08-09  
Backend: `https://backendpfiferreyrafredes-production.up.railway.app`  
Frontend repo: `frontend_PFI_Ferreyra_Fredes`  
Backend repo: `backend_PFI_Ferreyra_Fredes`

Este documento resume que ya esta desarrollado, que falta conectar y como debe
integrarse el frontend actual con las funcionalidades disponibles hoy.

## 1. Estado general del proyecto

El backend ya tiene una base funcional para el MVP:

- Autenticacion de usuarios.
- Registro y login con email/password.
- Login/registro con Google OAuth.
- Refresh token con cookie HttpOnly.
- Perfil de usuario autenticado.
- CRUD de lotes por usuario.
- Agentes climaticos, hidricos, NDVI, recomendacion, validacion y explicacion.
- Integracion con Open-Meteo, NASA POWER, Earth Engine/Sentinel-2 y Gemini.
- Documentacion backend para auth, consola y agentes.

El frontend ya tiene una base visual avanzada:

- Next.js 15 + React 19.
- Tailwind.
- Leaflet para mapa.
- Recharts para graficos.
- `lib/api.ts` con cliente HTTP.
- `lib/auth-context.tsx` con estado global de usuario.
- Pantalla de login/register.
- Onboarding de lote con dibujo en mapa.
- Persistencia de lotes contra `POST /api/v1/fields`.
- Dashboard visual con mapa y detalle FAO-56.

El punto principal pendiente es reemplazar datos mockeados del dashboard por
respuestas reales de los agentes.

Actualizacion aplicada: ya existen los Route Handlers server-side para llamar a
los agentes sin exponer `AGENT_API_KEY`:

```text
app/api/agents/analyze-irrigation/route.ts
app/api/agents/weather-compare/route.ts
```

## 2. Ya desarrollado en backend

### Infraestructura

- FastAPI.
- PostgreSQL/Neon.
- Alembic.
- Railway production.
- CORS configurable por `CORS_ORIGINS`.
- Healthcheck:

```text
GET /health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "pfi-riego-api",
  "database_configured": true,
  "jwt_configured": true,
  "google_oauth_configured": true,
  "cors_origins": ["http://localhost:3000"],
  "timestamp": "..."
}
```

### Auth de usuarios

Endpoints disponibles:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/google
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/users/me
```

Auth usa:

- Access token JWT en JSON.
- Refresh token en cookie HttpOnly.
- `Authorization: Bearer <access_token>` para endpoints protegidos.
- `credentials: "include"` para refresh/logout y llamadas que necesiten cookie.

El frontend ya tiene gran parte de esto implementado en:

```text
lib/api.ts
lib/auth-context.tsx
components/auth-form.tsx
```

### Lotes por usuario

Endpoints disponibles:

```text
POST   /api/v1/fields
GET    /api/v1/fields
GET    /api/v1/fields/{field_id}
PATCH  /api/v1/fields/{field_id}
DELETE /api/v1/fields/{field_id}
```

Todos requieren:

```text
Authorization: Bearer <access_token>
```

Request para crear lote:

```json
{
  "name": "Lote Norte",
  "geometry_geojson": {
    "type": "Polygon",
    "coordinates": [
      [
        [-60.582, -33.882],
        [-60.569, -33.882],
        [-60.569, -33.889],
        [-60.582, -33.889],
        [-60.582, -33.882]
      ]
    ]
  },
  "area_ha": 65,
  "soil_type": "Franco",
  "crop_type": "Maiz",
  "irrigation_system": "Pivote",
  "field_capacity_fc": 28,
  "wilting_point_wp": 14,
  "total_available_water_taw": 140
}
```

Respuesta:

```json
{
  "id": 1,
  "name": "Lote Norte",
  "geometry_geojson": {},
  "area_ha": 65,
  "soil_type": "Franco",
  "crop_type": "Maiz",
  "irrigation_system": "Pivote",
  "field_capacity_fc": 28,
  "wilting_point_wp": 14,
  "total_available_water_taw": 140,
  "center_latitude": -33.8855,
  "center_longitude": -60.5755,
  "created_at": "...",
  "updated_at": "..."
}
```

El frontend ya crea lotes desde:

```text
components/onboarding-wizard.tsx
lib/api.ts -> createFieldApi()
```

### Agentes disponibles

Los endpoints de agentes siguen usando:

```text
X-API-Key: <AGENT_API_KEY>
```

Importante: `AGENT_API_KEY` no debe ir nunca en componentes client-side.
Debe usarse desde Route Handlers de Next.js o un backend intermedio.

Endpoints:

```text
POST /agents/weather/context
POST /agents/weather/compare
POST /agents/water-balance/analyze
POST /agents/recommendation/irrigation
POST /agents/ndvi/context
POST /agents/analyze-irrigation
```

### Flujo completo de agentes

Endpoint recomendado para analisis por lote:

```text
POST /agents/analyze-irrigation
```

Flujo interno:

```text
SupervisorAgent
  -> NDVIAgent
  -> CropCoefficientAgent
  -> RecommendationAgent
    -> WaterBalanceAgent
      -> WeatherDataAgent
  -> ValidationAgent
  -> LLMExplanationAgent
```

Respuesta principal:

```json
{
  "status": "COMPLETED",
  "action": "IRRIGATE",
  "urgency": "HIGH",
  "final_recommendation": "...",
  "next_steps": [],
  "rationale": [],
  "trace": {},
  "recommendation": {},
  "validation": {},
  "explanation": {},
  "ndvi_context": {},
  "crop_coefficient_context": {},
  "warnings": [],
  "evidence": {}
}
```

### Comparacion climatica externa

Endpoint recomendado para comparar fuentes climaticas:

```text
POST /agents/weather/compare
```

Este endpoint ya usa Open-Meteo + NASA POWER como fuentes operativas
georreferenciadas. EEAVI/INTA queda como referencia local/demo.

Campo principal para frontend:

```text
operational_recommendation
```

Ejemplo de respuesta parcial:

```json
{
  "operational_recommendation": {
    "operational_mode": "EXTERNAL_CONSENSUS",
    "sources_used": ["OPEN_METEO", "NASA_POWER"],
    "reference_sources": ["EEAVI"],
    "action": "IRRIGATE",
    "urgency": "HIGH",
    "confidence": "MEDIUM",
    "recommended_gross_min_mm": 42.46,
    "recommended_gross_median_mm": 49.13,
    "recommended_gross_max_mm": 55.8,
    "operational_recommendation_mm": 49.13,
    "suggested_applications": 2,
    "gross_mm_per_application": 24.57,
    "warnings": []
  }
}
```

## 3. Ya desarrollado en frontend

### Archivos clave

```text
lib/api.ts
lib/auth-context.tsx
components/auth-form.tsx
components/onboarding-wizard.tsx
components/interactive-onboarding-map.tsx
components/dashboard-map.tsx
components/lot-detail-view.tsx
components/fao56-lot-detail.tsx
app/login/page.tsx
app/onboarding/page.tsx
app/page.tsx
```

### Conectado o parcialmente conectado

- Login email/password: conectado contra backend.
- Register email/password: conectado contra backend.
- Refresh token: contemplado en `apiFetch`.
- Logout: conectado contra backend.
- `GET /api/v1/users/me`: conectado desde `AuthContext`.
- Crear lote desde onboarding: conectado con `createFieldApi`.
- Dashboard lee `auth.fields` y arma lotes visuales.
- Mapa muestra poligonos guardados.

### Todavia mockeado en frontend

En `app/page.tsx`:

- KPIs del dashboard.
- Estado hidrico de cada lote.
- Deficit Dr.
- AU/TAW/AFD.
- ET0/ETc.
- NDVI.
- Kc satelital.
- Prioridad de riego.
- Motivos de prioridad.
- Timeline/grafico historico.
- Registro de riego: modifica solo estado local, no persiste en backend.

En `components/fao56-lot-detail.tsx`:

- Curva FAO-56.
- Recomendaciones.
- Metricas de impacto.

En `components/auth-form.tsx`:

- Hay fallback con `mock_google_id_token`.
- Para produccion, Google debe usar un `id_token` real de Google Identity
  Services. El mock sirve solo como demo visual, no para autenticar contra
  backend real.

## 4. Variables de entorno necesarias en frontend

Crear `.env.local` en el repo frontend:

```bash
NEXT_PUBLIC_API_URL=https://backendpfiferreyrafredes-production.up.railway.app
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<client-id-publico-de-google>
AGENT_API_KEY=<clave-privada-del-backend>
```

Reglas:

- `NEXT_PUBLIC_API_URL` puede usarse en cliente.
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` puede usarse en cliente.
- `AGENT_API_KEY` no puede tener prefijo `NEXT_PUBLIC_`.
- `AGENT_API_KEY` solo puede leerse desde Route Handlers server-side.

Si el frontend corre en otro dominio, agregar ese origen en Railway:

```text
CORS_ORIGINS=http://localhost:3000,https://dominio-del-front.vercel.app
```

## 5. Implementacion recomendada en frontend

### Paso 1 - Mantener auth como esta

El archivo `lib/api.ts` ya tiene:

```ts
apiFetch()
registerApi()
loginApi()
googleAuthApi()
logoutApi()
getMeApi()
createFieldApi()
getFieldsApi()
deleteFieldApi()
```

Antes de tocar agentes, validar:

1. Registrar usuario.
2. Login.
3. Crear lote en onboarding.
4. Volver al dashboard.
5. Confirmar que `auth.fields` tiene lotes reales.

### Paso 2 - Agregar proxy server-side para flujo completo

Crear archivo:

```text
app/api/agents/analyze-irrigation/route.ts
```

Contenido sugerido:

```ts
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://backendpfiferreyrafredes-production.up.railway.app";

export async function POST(request: NextRequest) {
  const apiKey = process.env.AGENT_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { detail: "AGENT_API_KEY is not configured in frontend server env" },
      { status: 500 }
    );
  }

  const body = await request.json();

  const response = await fetch(`${BACKEND_URL}/agents/analyze-irrigation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));

  return NextResponse.json(data, { status: response.status });
}
```

El cliente debe llamar a:

```text
POST /api/agents/analyze-irrigation
```

No debe llamar directo a:

```text
POST https://backend.../agents/analyze-irrigation
```

### Paso 3 - Agregar proxy para comparacion climatica

Crear archivo:

```text
app/api/agents/weather-compare/route.ts
```

Contenido sugerido:

```ts
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://backendpfiferreyrafredes-production.up.railway.app";

export async function POST(request: NextRequest) {
  const apiKey = process.env.AGENT_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { detail: "AGENT_API_KEY is not configured in frontend server env" },
      { status: 500 }
    );
  }

  const body = await request.json();

  const response = await fetch(`${BACKEND_URL}/agents/weather/compare`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));

  return NextResponse.json(data, { status: response.status });
}
```

El cliente debe llamar a:

```text
POST /api/agents/weather-compare
```

### Paso 4 - Agregar funciones client-side en `lib/api.ts`

Agregar tipos minimos:

```ts
export interface AnalyzeIrrigationPayload {
  field_name?: string;
  date_from: string;
  date_to: string;
  crop_name: string;
  crop_coefficient: number;
  use_ndvi_for_kc?: boolean;
  max_ndvi_age_days?: number;
  effective_precipitation_ratio?: number;
  initial_available_water_mm?: number;
  irrigation_applied_mm?: number;
  irrigation_system?: string;
  irrigation_efficiency?: number | null;
  minimum_irrigation_threshold_mm?: number;
  max_single_application_mm?: number;
  geometry_geojson?: FieldGeometry;
  ndvi_cloud_coverage_max_pct?: number;
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
  external_sources?: Array<"OPEN_METEO" | "NASA_POWER">;
  crop_name: string;
  crop_coefficient: number;
  effective_precipitation_ratio?: number;
  initial_available_water_mm?: number;
  irrigation_applied_mm?: number;
  irrigation_system?: string;
  irrigation_efficiency?: number | null;
}
```

Agregar funciones:

```ts
export async function analyzeIrrigationApi(payload: AnalyzeIrrigationPayload) {
  const response = await fetch("/api/agents/analyze-irrigation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return {
    ok: response.ok,
    status: response.status,
    data: await response.json().catch(() => ({})),
  };
}

export async function weatherCompareApi(payload: WeatherComparePayload) {
  const response = await fetch("/api/agents/weather-compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return {
    ok: response.ok,
    status: response.status,
    data: await response.json().catch(() => ({})),
  };
}
```

## 6. Como armar payload desde un FieldItem

Agregar helpers en `lib/api.ts` o en un nuevo archivo:

```text
lib/agent-payloads.ts
```

Codigo sugerido:

```ts
import { FieldItem } from "./api";

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function defaultPeriod(days = 7) {
  const dateTo = new Date();
  const dateFrom = new Date();
  dateFrom.setDate(dateTo.getDate() - (days - 1));

  return {
    date_from: toDateString(dateFrom),
    date_to: toDateString(dateTo),
  };
}

export function defaultKcForCrop(crop?: string) {
  const normalized = (crop || "").toLowerCase();
  if (normalized.includes("maiz") || normalized.includes("maíz")) return 1.15;
  if (normalized.includes("soja")) return 1.0;
  if (normalized.includes("trigo")) return 0.95;
  if (normalized.includes("girasol")) return 1.05;
  return 1.0;
}

export function buildAnalyzePayload(field: FieldItem) {
  const period = defaultPeriod(7);

  return {
    field_name: field.name,
    ...period,
    crop_name: field.crop_type || "cultivo generico",
    crop_coefficient: defaultKcForCrop(field.crop_type),
    use_ndvi_for_kc: true,
    max_ndvi_age_days: 16,
    effective_precipitation_ratio: 0.8,
    initial_available_water_mm: 0,
    irrigation_applied_mm: 0,
    irrigation_system: field.irrigation_system,
    irrigation_efficiency: null,
    minimum_irrigation_threshold_mm: 5,
    max_single_application_mm: 40,
    geometry_geojson: field.geometry_geojson,
    ndvi_cloud_coverage_max_pct: 30,
  };
}

export function buildWeatherComparePayload(field: FieldItem) {
  const period = defaultPeriod(7);

  return {
    ...period,
    latitude: field.center_latitude || undefined,
    longitude: field.center_longitude || undefined,
    geometry_geojson: field.geometry_geojson,
    use_inta_eeavi_station: false,
    include_eeavi_reference: true,
    use_eeavi_as_operational_source: false,
    external_sources: ["OPEN_METEO", "NASA_POWER"] as const,
    crop_name: field.crop_type || "cultivo generico",
    crop_coefficient: defaultKcForCrop(field.crop_type),
    effective_precipitation_ratio: 0.8,
    initial_available_water_mm: 0,
    irrigation_applied_mm: 0,
    irrigation_system: field.irrigation_system,
    irrigation_efficiency: null,
  };
}
```

Notas importantes:

- `initial_available_water_mm` hoy se manda en `0` si el usuario no lo carga.
  Eso baja precision y genera warnings. Ideal: agregarlo como input en UI.
- `irrigation_applied_mm` hoy se manda en `0` si no hay registro de riegos.
  Ideal: cuando se implemente persistencia de eventos, sumar riegos del periodo.
- `geometry_geojson` es necesario para NDVI.
- `center_latitude` y `center_longitude` los calcula backend al crear el lote.

## 7. Como mapear respuesta del agente al dashboard

Respuesta de `POST /api/agents/analyze-irrigation`:

```text
data.action
data.urgency
data.final_recommendation
data.recommendation.metrics.net_deficit_mm
data.recommendation.metrics.recommended_gross_irrigation_mm
data.recommendation.metrics.suggested_applications
data.recommendation.metrics.gross_mm_per_application
data.recommendation.water_balance.metrics.total_et0_mm
data.recommendation.water_balance.metrics.total_etc_mm
data.recommendation.water_balance.metrics.total_precipitation_mm
data.ndvi_context.metrics.ndvi_mean
data.ndvi_context.metrics.observation_date
data.crop_coefficient_context.crop_coefficient
data.crop_coefficient_context.source
data.validation.confidence
data.validation.is_recommendation_safe
data.explanation.user_explanation
data.warnings
```

Mapeo sugerido a `LotHydricData`:

```text
hydricStatus:
  action=IRRIGATE + urgency=HIGH    -> Critico
  action=IRRIGATE + urgency=MEDIUM  -> Atencion
  action=MONITOR                    -> Atencion
  action=NO_IRRIGATION              -> Normal

deficitDr_mm:
  recommendation.metrics.net_deficit_mm

waterAvailableAU_mm:
  max(totalAvailableTAW_mm - deficitDr_mm, 0)

waterAvailableAU_pct:
  round(waterAvailableAU_mm / totalAvailableTAW_mm * 100)

etcToday_mm:
  water_balance.metrics.total_etc_mm / cantidad_de_dias

et0Today_mm:
  water_balance.metrics.total_et0_mm / cantidad_de_dias

ndviCurrent:
  ndvi_context.metrics.ndvi_mean

kcSatellite:
  crop_coefficient_context.crop_coefficient

irrigationPriority:
  urgency HIGH -> Alta
  urgency MEDIUM -> Media
  urgency LOW -> Baja

priorityReason:
  final_recommendation o explanation.user_explanation

pumpingWindow:
  por ahora mantener valor fijo de UI hasta crear agente/heuristica de ventana
```

Limitacion actual:

- El backend todavia no devuelve una serie temporal lista para el grafico
  `timeline`. Se puede seguir usando el timeline mockeado o construir un punto
  unico con el resultado actual.

## 8. Como mapear comparacion climatica

Respuesta de `POST /api/agents/weather-compare`:

```text
data.operational_recommendation.action
data.operational_recommendation.urgency
data.operational_recommendation.confidence
data.operational_recommendation.operational_recommendation_mm
data.operational_recommendation.recommended_gross_min_mm
data.operational_recommendation.recommended_gross_max_mm
data.operational_recommendation.sources_used
data.operational_recommendation.reference_sources
data.source_recommendations[]
data.external_contexts[]
data.comparisons[]
data.warnings[]
```

UI sugerida:

- Card principal: `operational_recommendation_mm`.
- Badge: `action`, `urgency`, `confidence`.
- Rango: min-mediana-max.
- Tabla por fuente: `source_recommendations`.
- Panel tecnico: `comparisons`.
- Warnings visibles si fuentes difieren.

Regla de producto:

- La decision operativa sale de Open-Meteo + NASA POWER.
- EEAVI/INTA se muestra como referencia local/demo, no como verdad unica.

## 9. Orden recomendado de implementacion para Nico

### Tarea 1 - Validar auth real

Archivos:

```text
lib/api.ts
lib/auth-context.tsx
components/auth-form.tsx
```

Checklist:

- [ ] `.env.local` con `NEXT_PUBLIC_API_URL`.
- [ ] Registro email/password funcionando.
- [ ] Login funcionando.
- [ ] Refresh no rompe al recargar pagina.
- [ ] Logout limpia token y usuario.
- [ ] Si Google no esta configurado, ocultar boton real o marcarlo como demo.

### Tarea 2 - Validar lotes reales

Archivos:

```text
components/onboarding-wizard.tsx
app/page.tsx
lib/api.ts
```

Checklist:

- [ ] Crear lote desde onboarding.
- [ ] Confirmar que aparece en `GET /api/v1/users/me`.
- [ ] Confirmar que el mapa usa `geometry_geojson` real.
- [ ] Confirmar que `center_latitude` y `center_longitude` llegan desde backend.
- [ ] Agregar UI para editar/borrar lote si hace falta.

### Tarea 3 - Crear proxies server-side de agentes

Estado: implementado.

Archivos nuevos:

```text
app/api/agents/analyze-irrigation/route.ts
app/api/agents/weather-compare/route.ts
```

Checklist:

- [x] Leer `AGENT_API_KEY` solo desde servidor.
- [x] No exponer `AGENT_API_KEY` en `NEXT_PUBLIC_*`.
- [x] Manejar error de configuracion si falta `AGENT_API_KEY`.
- [x] Usar `cache: "no-store"`.
- [ ] Mostrar errores 401/500 de agentes en la UI.

### Tarea 4 - Conectar analisis por lote

Archivos sugeridos:

```text
lib/api.ts
lib/agent-payloads.ts
app/page.tsx
components/lot-detail-view.tsx
```

Checklist:

- [ ] Boton "Analizar lote" o carga automatica por lote seleccionado.
- [ ] Llamar `analyzeIrrigationApi(buildAnalyzePayload(field))`.
- [ ] Guardar estado loading/error por lote.
- [ ] Reemplazar `deficitDr_mm`, `ndviCurrent`, `kcSatellite`, `priorityReason`.
- [ ] Mostrar `warnings`.
- [ ] Mostrar `explanation.user_explanation`.

### Tarea 5 - Conectar comparacion climatica

Archivos sugeridos:

```text
app/page.tsx
components/lot-detail-view.tsx
```

Checklist:

- [ ] Llamar `weatherCompareApi(buildWeatherComparePayload(field))`.
- [ ] Mostrar Open-Meteo vs NASA POWER.
- [ ] Mostrar rango min-mediana-max.
- [ ] Mostrar EEAVI solo como referencia si viene `primary_context`.
- [ ] Mostrar `confidence` y `warnings`.

### Tarea 6 - Reemplazar mocks gradualmente

No hace falta reemplazar todo de golpe.

Prioridad:

1. Accion/urgencia/recomendacion final.
2. Deficit y riego recomendado.
3. NDVI y Kc.
4. Comparacion climatica.
5. Timeline historico.
6. Registro de riego persistente.

## 10. Funcionalidades que faltan en backend o estan incompletas

Estas cosas no conviene prometer como terminadas todavia:

- Persistencia de eventos de riego desde el frontend.
- Endpoint de historial hidrico listo para graficar series `timeline`.
- Forecast futuro de clima.
- Agente de ventana horaria de bombeo.
- Notificaciones WhatsApp reales.
- Asociar ejecuciones de agentes a usuario/lote con permisos de usuario.
- Usar consenso Open-Meteo/NASA POWER dentro del `SupervisorAgent`. Hoy el
  supervisor sigue usando el balance MVP con `WeatherDataAgent`/EEAVI; la
  comparacion externa ya esta disponible en `/agents/weather/compare`.
- Entradas agronomicas finas: etapa fenologica, profundidad radicular, humedad
  inicial real medida, caudal disponible, lamina maxima por equipo.

## 11. Datos que deberia pedir el frontend para mejorar precision

Minimos:

- Nombre del lote.
- Poligono del lote.
- Cultivo.
- Sistema de riego.
- Tipo de suelo.
- Area.

Muy recomendados:

- Etapa fenologica.
- Fecha de siembra.
- Kc conocido o sugerido por cultivo/etapa.
- Humedad inicial o agua disponible inicial.
- Riego aplicado durante el periodo.
- Eficiencia real del sistema.
- Lamina maxima por evento.
- Capacidad de campo.
- Punto de marchitez.
- TAW.
- Profundidad radicular.

## 12. Validacion manual minima

### Backend

```bash
curl -sS https://backendpfiferreyrafredes-production.up.railway.app/health
```

### Frontend local

```bash
npm install
npm run dev
```

Abrir:

```text
http://localhost:3000/login
```

Flujo minimo:

1. Registrar usuario.
2. Crear lote en onboarding.
3. Ver lote en dashboard.
4. Ejecutar analisis por lote con proxy.
5. Mostrar recomendacion real.
6. Ejecutar comparacion climatica.
7. Mostrar rango Open-Meteo/NASA POWER.

## 13. Criterio de demo para mostrar hoy

Demo recomendada:

1. Login/register.
2. Onboarding con dibujo de lote.
3. Dashboard con lote real guardado.
4. Boton "Analizar con agentes".
5. Mostrar:
   - accion (`IRRIGATE`, `MONITOR`, `NO_IRRIGATION`);
   - mm brutos recomendados;
   - cantidad de aplicaciones;
   - NDVI;
   - Kc usado;
   - validacion;
   - explicacion Gemini;
   - warnings.
6. Segunda pestana o panel: comparacion Open-Meteo vs NASA POWER vs EEAVI.

Mensaje tecnico para la tesis:

```text
El sistema no entrena un modelo desde cero. Aplica IA por orquestacion de
agentes especializados, inferencia LLM para explicacion, NDVI satelital para
ajuste agronomico de Kc y validacion automatica de recomendaciones. Los modelos
externos no deciden solos: el backend impone formulas, umbrales, reglas de
validacion y trazabilidad.
```
