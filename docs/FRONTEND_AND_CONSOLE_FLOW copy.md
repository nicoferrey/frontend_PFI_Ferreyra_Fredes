# PFI Riego - Guia De Integracion Frontend Y Consola

Esta guia describe el contrato actual del backend para que frontend, Claude,
Codex, Gemini y Cursor puedan trabajar sin asumir datos incorrectos.

Backend cloud:

```text
https://backendpfiferreyrafredes-production.up.railway.app
```

Todos los endpoints bajo `/agents` requieren header:

```text
X-API-Key: <AGENT_API_KEY>
Content-Type: application/json
```

No hardcodear claves en frontend ni en repositorio. El frontend debe leer la URL
del backend desde una variable de entorno publica, y la API key desde backend
propio, proxy seguro o entorno privado segun arquitectura final.

> Referencia completa de agentes (parámetros, respuestas, integración con lotes):
> `docs/AGENTS_REFERENCE.md`

## Objetivo Del Sistema

El sistema no intenta que una IA "adivine" el riego. El backend calcula una
recomendacion trazable usando:

- Fuentes climaticas externas georreferenciadas: Open-Meteo y NASA POWER.
- Datos climaticos locales EEAVI/INTA almacenados en Neon como referencia,
  demo y validacion historica de una estacion puntual.
- NDVI real desde Google Earth Engine / Sentinel-2.
- Kc informado por usuario o Kc dinamico derivado de NDVI.
- Balance hidrico MVP.
- Validacion automatica.
- Explicacion final con Gemini si `GOOGLE_API_KEY` esta configurada.

## Flujo A: Comparacion Meteorologica Por Fuente

Endpoint:

```text
POST /agents/weather/compare
```

Uso principal en frontend:

- Mostrar la recomendacion operativa basada en consenso externo
  georreferenciado.
- Mostrar si EEAVI, Open-Meteo y NASA POWER coinciden o difieren cuando EEAVI
  se incluye como referencia.
- Calcular que riego recomendaria cada fuente climatica usando los mismos
  parametros agronomicos.
- Mostrar confianza y warnings cuando las fuentes discrepan.

### Coordenadas Que Usa

Por defecto conserva la estacion INTA/EEAVI Valle Inferior como punto de demo:

```text
latitude: -40.79915
longitude: -63.05929
coordinate_strategy: inta_eeavi_station
```

Prioridad de coordenadas:

1. Si el request trae `latitude` y `longitude`, usa ese punto.
2. Si `use_inta_eeavi_station=true`, usa la estacion INTA/EEAVI.
3. Si `use_inta_eeavi_station=false` y viene `geometry_geojson`, usa el centroide del lote.

Regla de producto:

- Para demo y validacion contra la estacion local, usar
  `include_eeavi_reference=true`.
- Para decision operativa en lotes reales, enviar `latitude`/`longitude` o
  `geometry_geojson`, usar Open-Meteo + NASA POWER, y mantener
  `use_eeavi_as_operational_source=false`.
- Solo usar `use_eeavi_as_operational_source=true` si se quiere forzar una demo
  historica centrada en esa estacion.

### Input

```json
{
  "date_from": "2025-01-01",
  "date_to": "2025-01-07",
  "latitude": -40.7983,
  "longitude": -62.98,
  "use_inta_eeavi_station": false,
  "include_eeavi_reference": true,
  "use_eeavi_as_operational_source": false,
  "external_sources": ["OPEN_METEO", "NASA_POWER"],
  "crop_name": "maiz",
  "crop_coefficient": 1.15,
  "effective_precipitation_ratio": 0.8,
  "initial_available_water_mm": 0,
  "irrigation_applied_mm": 0,
  "irrigation_system": "goteo",
  "irrigation_efficiency": null,
  "minimum_irrigation_threshold_mm": 5,
  "max_single_application_mm": 40
}
```

Campos importantes:

| Campo | Tipo | Obligatorio | Uso |
|---|---:|---:|---|
| `date_from` | `YYYY-MM-DD` | Si | Inicio del periodo climatico. |
| `date_to` | `YYYY-MM-DD` | Si | Fin del periodo climatico. Maximo 366 dias. |
| `latitude` | number | No | Punto explicito si no se usa estacion default. |
| `longitude` | number | No | Punto explicito si no se usa estacion default. |
| `geometry_geojson` | GeoJSON | No | Poligono del lote para calcular centroide si no se usa estacion default. |
| `use_inta_eeavi_station` | boolean | No | Default `true`. Solo recomendado para demo EEAVI. |
| `include_eeavi_reference` | boolean | No | Default `true`. Incluye EEAVI como referencia comparativa. |
| `use_eeavi_as_operational_source` | boolean | No | Default `false`. Si queda `false`, EEAVI no entra al consenso operativo. |
| `external_sources` | array | No | Valores: `OPEN_METEO`, `NASA_POWER`. |
| `crop_name` | string | No | Nombre de cultivo. Ejemplo: `maiz`. |
| `crop_coefficient` | number | No | Kc usado para comparar fuentes. |
| `effective_precipitation_ratio` | number | No | Porcentaje de lluvia que se considera efectiva. Default `0.8`. |
| `initial_available_water_mm` | number | No | Agua inicial disponible en suelo. Si falta, se asume `0` y baja confianza. |
| `irrigation_applied_mm` | number | No | Riego aplicado antes o durante el periodo. |
| `irrigation_system` | string | No | Ejemplos: `goteo`, `pivote`, `aspersion`, `surco`. |
| `irrigation_efficiency` | number | No | Si falta, se infiere por sistema. Goteo = `0.9`. |
| `minimum_irrigation_threshold_mm` | number | No | Deficit minimo para recomendar riego. |
| `max_single_application_mm` | number | No | Lamina maxima por aplicacion. |

### Output Principal

```json
{
  "status": "COMPLETED",
  "latitude": -40.79915,
  "longitude": -63.05929,
  "primary_context": null,
  "external_contexts": [],
  "comparisons": [],
  "source_recommendations": [],
  "operational_recommendation": {},
  "warnings": [],
  "evidence": {}
}
```

Mapeo recomendado para frontend:

| UI | Campo backend |
|---|---|
| Estado general | `status` |
| Punto usado | `latitude`, `longitude`, `evidence.coordinate_strategy` |
| Datos EEAVI | `primary_context.metrics` si `primary_context` no es `null` |
| Datos Open-Meteo/NASA | `external_contexts[]` |
| Diferencias entre fuentes | `comparisons[]` |
| Recomendacion por fuente | `source_recommendations[]` |
| Decision operativa | `operational_recommendation` |
| Alertas | `warnings[]` |

`source_recommendations[]` contiene una recomendacion calculada por fuente:

```json
{
  "source": "EEAVI",
  "status": "COMPLETED",
  "action": "IRRIGATE",
  "urgency": "HIGH",
  "crop_name": "maiz",
  "crop_coefficient": 1.15,
  "total_precipitation_mm": 8.0,
  "total_et0_mm": 49.13,
  "total_etc_mm": 56.5,
  "effective_precipitation_mm": 6.4,
  "deficit_mm": 50.1,
  "recommended_net_irrigation_mm": 50.1,
  "irrigation_efficiency": 0.9,
  "recommended_gross_irrigation_mm": 55.67,
  "suggested_applications": 2,
  "gross_mm_per_application": 27.84,
  "warnings": []
}
```

Interpretacion:

- `action=IRRIGATE`: recomienda regar.
- `action=MONITOR`: hay deficit bajo, conviene monitorear.
- `action=NO_IRRIGATION`: no recomienda riego.
- `action=INSUFFICIENT_DATA`: faltan datos para calcular.

`operational_recommendation` es el objeto que debe tomar el frontend como
decision principal:

```json
{
  "operational_mode": "EXTERNAL_CONSENSUS",
  "sources_used": ["OPEN_METEO", "NASA_POWER"],
  "reference_sources": ["EEAVI"],
  "action": "IRRIGATE",
  "confidence": "MEDIUM",
  "recommended_gross_min_mm": 42.46,
  "recommended_gross_median_mm": 49.13,
  "recommended_gross_max_mm": 55.8,
  "operational_recommendation_mm": 49.13,
  "suggested_applications": 2,
  "gross_mm_per_application": 24.57,
  "warnings": [
    "EEAVI se usa como referencia local de validacion, no como fuente operativa del consenso."
  ]
}
```

Si `include_eeavi_reference=false`, `primary_context` puede venir `null` y no se
generan `comparisons[]` contra EEAVI. Aun asi puede existir
`operational_recommendation` si las fuentes externas respondieron.

### Comando Por Consola

```bash
export API_URL="https://backendpfiferreyrafredes-production.up.railway.app"
export AGENT_API_KEY="<tu_api_key>"

curl -sS -X POST "$API_URL/agents/weather/compare" \
  -H "X-API-Key: $AGENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "date_from":"2025-01-01",
    "date_to":"2025-01-07",
    "latitude":-40.7983,
    "longitude":-62.98,
    "use_inta_eeavi_station":false,
    "include_eeavi_reference":true,
    "use_eeavi_as_operational_source":false,
    "external_sources":["OPEN_METEO","NASA_POWER"],
    "crop_name":"maiz",
    "crop_coefficient":1.15,
    "effective_precipitation_ratio":0.8,
    "irrigation_system":"goteo"
  }'
```

Ejemplo con otro punto de la zona:

```json
{
  "date_from": "2025-03-01",
  "date_to": "2025-03-07",
  "latitude": -40.7983,
  "longitude": -62.98,
  "use_inta_eeavi_station": false,
  "external_sources": ["OPEN_METEO", "NASA_POWER"],
  "crop_name": "maiz",
  "crop_coefficient": 1.15,
  "effective_precipitation_ratio": 0.8,
  "irrigation_system": "goteo"
}
```

## Flujo B: Recomendacion Completa Con Agentes, NDVI Y Gemini

Endpoint:

```text
POST /agents/analyze-irrigation
```

Uso principal en frontend:

- Ejecutar el flujo completo de recomendacion.
- Usar NDVI para ajustar Kc cuando la imagen es temporalmente coherente.
- Calcular balance hidrico MVP. En el estado actual del MVP, el flujo
  supervisor sigue usando `WeatherDataAgent`/EEAVI para el balance historico; la
  migracion siguiente es conectar el consenso externo del
  `WeatherComparisonAgent` como fuente climatica operativa del supervisor.
- Validar seguridad/confianza.
- Generar explicacion con Gemini.

### Orden Real De Agentes

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

### Input

```json
{
  "field_name": "Pivot RP 53",
  "date_from": "2025-01-01",
  "date_to": "2025-01-07",
  "crop_name": "maiz",
  "crop_coefficient": 1.15,
  "use_ndvi_for_kc": true,
  "max_ndvi_age_days": 16,
  "effective_precipitation_ratio": 0.8,
  "initial_available_water_mm": 0,
  "irrigation_applied_mm": 0,
  "irrigation_system": "goteo",
  "irrigation_efficiency": null,
  "minimum_irrigation_threshold_mm": 5,
  "max_single_application_mm": 40,
  "geometry_geojson": {
    "type": "Polygon",
    "coordinates": [[[0, 0], [0, 1], [1, 1], [0, 0]]]
  },
  "ndvi_cloud_coverage_max_pct": 30
}
```

No usar el poligono placeholder. El frontend debe enviar el GeoJSON real del lote.

Campos criticos:

| Campo | Uso |
|---|---|
| `geometry_geojson` | Permite consultar NDVI en Earth Engine. |
| `date_from`, `date_to` | Periodo de clima y recomendacion. Para operacion usar 7 a 10 dias. |
| `crop_name` | Se muestra y ayuda a interpretar Kc. |
| `crop_coefficient` | Kc base si no se usa NDVI o si NDVI no es valido. |
| `use_ndvi_for_kc` | Si `true`, NDVI puede ajustar Kc. |
| `max_ndvi_age_days` | Maxima diferencia entre fecha NDVI y fin del periodo. |
| `effective_precipitation_ratio` | Lluvia efectiva. Default razonable: `0.8`. |
| `initial_available_water_mm` | Mejora mucho la precision. Si falta, se asume `0`. |
| `irrigation_applied_mm` | Riegos previos que deben entrar al balance. |
| `irrigation_system` | Permite inferir eficiencia. |
| `irrigation_efficiency` | Si el usuario la conoce, usarla antes que inferir. |

### Output Principal

```json
{
  "status": "COMPLETED",
  "action": "IRRIGATE",
  "urgency": "HIGH",
  "final_recommendation": "...",
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

Mapeo recomendado para frontend:

| UI | Campo backend |
|---|---|
| Accion principal | `action` |
| Urgencia | `urgency` |
| Texto explicativo | `final_recommendation` |
| Riego bruto | `recommendation.metrics.recommended_gross_irrigation_mm` |
| Riego neto | `recommendation.metrics.recommended_net_irrigation_mm` |
| Aplicaciones | `recommendation.metrics.suggested_applications` |
| mm por aplicacion | `recommendation.metrics.gross_mm_per_application` |
| ET0 clima | `recommendation.water_balance.weather_context.metrics.total_et0_mm` |
| Lluvia | `recommendation.water_balance.weather_context.metrics.total_precipitation_mm` |
| ETc | `recommendation.water_balance.metrics.total_etc_mm` |
| Deficit | `recommendation.metrics.net_deficit_mm` |
| NDVI medio | `ndvi_context.metrics.ndvi_mean` |
| Fecha NDVI | `ndvi_context.metrics.observation_date` |
| Kc usado | `crop_coefficient_context.crop_coefficient` |
| Fuente del Kc | `crop_coefficient_context.source` |
| Validacion segura | `validation.is_recommendation_safe` |
| Confianza | `validation.confidence` |
| Explicacion IA | `explanation.user_explanation` |
| Proveedor LLM | `explanation.provider` |
| Trazabilidad | `trace`, `evidence.orchestration` |
| Alertas | `warnings[]` |

### Comando Por Consola

Guardar el body en un archivo local, por ejemplo `payload-supervisor.json`, y
ejecutar:

```bash
export API_URL="https://backendpfiferreyrafredes-production.up.railway.app"
export AGENT_API_KEY="<tu_api_key>"

curl -sS -X POST "$API_URL/agents/analyze-irrigation" \
  -H "X-API-Key: $AGENT_API_KEY" \
  -H "Content-Type: application/json" \
  --data @payload-supervisor.json
```

## Datos Que Debe Pedir El Frontend Al Usuario

Minimos para que el sistema funcione:

- Nombre del lote.
- Periodo: `date_from`, `date_to`.
- Cultivo.
- Sistema de riego.
- Kc o etapa fenologica.
- Poligono GeoJSON del lote si se quiere usar NDVI.

Datos que aumentan mucho la precision:

- Humedad inicial o agua disponible en suelo (`initial_available_water_mm`).
- Tipo de suelo.
- Capacidad de campo.
- Punto de marchitez.
- Profundidad radicular.
- Riego aplicado previamente (`irrigation_applied_mm`).
- Eficiencia real del sistema (`irrigation_efficiency`).
- Etapa fenologica exacta.
- Fecha de siembra.
- Area del lote.
- Caudal disponible.
- Lamina maxima aplicable por evento (`max_single_application_mm`).
- Lluvia medida por el productor si existe.
- Pronostico de lluvia si luego se agrega forecast.

## Regla De Interpretacion Para La UI

No mostrar un unico numero sin contexto cuando las fuentes difieren.

Recomendado:

- Mostrar `operational_recommendation.operational_recommendation_mm` como valor
  operativo principal.
- Mostrar rango entre fuentes climaticas.
- Mostrar EEAVI como referencia local/demo, no como verdad unica.
- Mostrar `confidence` y `warnings`.
- Si falta humedad inicial del suelo, mostrar advertencia visible.
- Si NDVI no es temporalmente coherente, aclarar que no ajusto Kc.
- Si NDVI ajusta Kc, mostrar Kc usuario vs Kc dinamico.

## Estados Y Warnings

Estados posibles:

```text
COMPLETED
NO_DATA
```

Acciones posibles:

```text
IRRIGATE
MONITOR
NO_IRRIGATION
INSUFFICIENT_DATA
```

Confianza posible:

```text
HIGH
MEDIUM
LOW
```

Warnings frecuentes:

- Falta agua inicial disponible en suelo.
- Se uso eficiencia de riego estimada.
- Precipitacion externa difiere mas de 30% respecto de EEAVI.
- ET0 externa difiere mas de 20% respecto de EEAVI.
- EEAVI se usa como referencia local de validacion, no como fuente operativa.
- ET0 NASA POWER estimada por FAO-56 Penman-Monteith.
- Imagen NDVI con nubosidad moderada.
- Kc dinamico difiere del Kc informado.

## Historial Del Asistente WhatsApp

El webhook `GET/POST /webhooks/whatsapp` recibe los mensajes de Meta, identifica
al usuario por `phone_whatsapp` (E.164) y responde. Cada turno de un usuario
registrado se persiste para el dashboard **Asistente IA**.

Endpoint (JWT, no `X-API-Key`):

```text
GET /api/v1/farms/{farm_id}/assistant/history?days=7
GET /api/v1/farms/assistant/history?days=7
Authorization: Bearer <access_token>
```

El `farm_id` de la URL es un UUID. Mandar `default` da `422`. Si el frontend no
tiene el UUID a mano, usar el segundo path: resuelve el establecimiento primario
del usuario, igual que `GET /api/v1/farms/members`. Con mas de un campo, no
usar el atajo: ver [`FRONTEND_MULTI_FARM.md`](./FRONTEND_MULTI_FARM.md).

Roles: `admin` y `agronomist`. El operador recibe `403` (misma regla que ver el
equipo). `days` default `7`, rango `1..90`.

El frontend agrupa `items` por `member_id`. Cruzar con
`GET /api/v1/farms/{farm_id}/members` (`id` = `member_id`, `user_id`,
`phone_whatsapp`).

**Cada `item` es una sesion completa**, no un mensaje. Los turnos del mismo
numero se agrupan mientras no pasen 24 h de inactividad (el TTL del chat). El
dueño debe ver un bloque por conversacion, con un resumen.

### Output

```json
{
  "farm_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "days": 7,
  "items": [
    {
      "id": "8b2c1a10-4d3e-4f11-9a22-11aa22bb33cc",
      "member_id": "1c2d3e4f-5555-6666-7777-888899990000",
      "user_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "phone_whatsapp": "+5491138440500",
      "date": "2026-09-06T16:21:00+00:00",
      "started_at": "2026-09-06T16:21:00+00:00",
      "ended_at": "2026-09-06T16:21:40+00:00",
      "turn_count": 5,
      "query": "NDVI · Lote 1",
      "summary": "Conversación de 5 mensajes. Lote: Lote 1. Consultó NDVI. El cultivo se ve sano, NDVI 0.72.",
      "ai_response": "Conversación de 5 mensajes. Lote: Lote 1. Consultó NDVI. El cultivo se ve sano, NDVI 0.72.",
      "category": "ndvi",
      "status": "resolved",
      "field_id": 1,
      "field_name": "Lote 1"
    }
  ]
}
```

Campos para la UI:

| Campo | Uso en el dashboard |
|---|---|
| `query` | Titulo corto de la sesion (tema + lote), no el ultimo "hola" |
| `summary` / `ai_response` | Resumen de **toda** la conversacion. `ai_response` replica `summary` para no romper el mapeo actual |
| `turn_count` | "5 consultas" en el encabezado |
| `date` / `ended_at` | Cuando termino la sesion |
| `started_at` | Cuando arranco |
| `category` / `status` | Etiqueta de la sesion (ultimo tema util; `pending` gana si quedo algo sin confirmar) |

En el modal: un card por `item` (sesion). No iterar mensajes individuales.
Textos sugeridos: "Tema de la sesion" y "Resumen de la conversacion". El
transcript por turno no se expone en este GET; sigue guardado en backend.

`category` (codigos estables, el frontend traduce las etiquetas):

```text
irrigation
weather
ndvi
register_irrigation
register_rainfall
navigation
```

`status`:

```text
resolved
pending
registered
```

Mapeo sugerido en UI:

- `irrigation` → Balance Hidrico
- `weather` → Alerta Clima
- `ndvi` → NDVI
- `register_irrigation` / `register_rainfall` → Registro
- `resolved` → RESUELTO
- `pending` → POSTERGADO
- `registered` → REGISTRADO

Los mensajes salientes usan formato de bot de WhatsApp: iconos, párrafos
separados, *negritas*, encabezado del lote y botones 💧 Riego / 🌦️ Clima /
🌿 NDVI. El cuerpo interactivo se recorta a 1024 caracteres (límite de Meta)
conservando saltos de línea. Al recibir un mensaje se marca leído y se muestra
indicador de “escribiendo” mientras se calcula la respuesta.

Si el lote ya tiene `agent_snapshot`, WhatsApp **responde con ese cache**
(Riego, Clima y NDVI) y muestra la hora. No vuelve a correr Earth Engine,
Open-Meteo, NASA POWER ni Gemini. Si el cache tiene más de 6 h, aclara
que escriban *actualizar*. Sin cache, manda “Consultando…” y recién ahí
calcula (sin Gemini, para recortar segundos). Después de elegir un lote
o de una consulta con cache viejo, el backend calienta el snapshot en
segundo plano para que el próximo toque sea instantáneo.

Al confirmar un riego o lluvia por WhatsApp (`sí` o el botón Confirmar), el
evento **no** queda solo en `whatsapp_interactions`. Se inserta en las mismas
tablas que la app:

- Riego → `irrigation_events` (`notes = "Registrado por WhatsApp"`).
- Lluvia → `rainfall_events` (`source = "manual"`, mismas notes).

Se invalida `field_hydric_history` desde esa fecha para que el próximo
`GET /api/v1/fields/{field_id}/hydric-history` lo recalcule. El snapshot de
agentes se limpia al registrar; WhatsApp lo vuelve a calcular en segundo
plano después de responder “registrado”. Para listar el evento:

```text
GET /api/v1/fields/{field_id}/irrigation-events
GET /api/v1/fields/{field_id}/rainfall-events
```

Solo aparecen interacciones de miembros **activos** del `farm_id`. Si el turno
quedo asociado a otro establecimiento (`farm_id` distinto), no se incluye. Un
turno sin lote elegido (`farm_id` nulo) si aparece en todos los campos donde
ese usuario es miembro.

No hay SSE ni WebSockets. El dashboard puede hacer polling suave del mismo GET
mientras la pestana Asistente este abierta.

Los chats anteriores a esta persistencia no se pueden reconstruir: solo hay
historial desde que corre la migracion `20260904_0015`.

## Notificaciones Proactivas

Las alertas agronómicas se persisten para el inbox **Notificaciones** del
frontend y también se envían por WhatsApp: mensaje libre si hay ventana
de 24 h, o plantilla Utility (lluvia / riego / estrés) si no la hay.

Auth: JWT `Authorization: Bearer`. No usar `X-API-Key` en el inbox.

```text
GET /api/v1/notifications
GET /api/v1/notifications/unread-count
PATCH /api/v1/notifications/{notification_id}/read
POST /api/v1/notifications/read-all
GET /api/v1/farms/{farm_id}/notifications
GET /api/v1/farms/notifications
```

El `farm_id` de la URL es un UUID. Mandar `default` da `422`. El atajo sin
UUID resuelve el establecimiento primario, igual que el Asistente. Cada
usuario ve **solo las suyas**; no hay inbox compartido del equipo.

Roles: cualquier miembro activo (`admin`, `agronomist`, `operator`).

Query params del listado:

| Param | Default | Uso |
|---|---|---|
| `unread_only` | `false` | Solo no leídas. |
| `type` | — | Filtro estable: ver códigos abajo. |
| `farm_id` | — | Solo en `GET /api/v1/notifications`. |
| `limit` | `50` | Max `200`. |
| `offset` | `0` | Paginación. |

### Output

```json
{
  "unread_count": 2,
  "items": [
    {
      "id": "8b2c1a10-4d3e-4f11-9a22-11aa22bb33cc",
      "farm_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "farm_name": "Campo Sur",
      "field_id": 1,
      "field_name": "Lote 1",
      "type": "rainfall_forecast",
      "severity": "warning",
      "title": "Lluvia próxima",
      "body": "Se esperan 18 mm en las próximas 48 h en Lote 1 (máximo el martes 8, 12 mm). Conviene postergar el riego si el suelo todavía cubre la demanda.",
      "payload": {
        "source": "OPEN_METEO",
        "precipitation_48h_mm": 18
      },
      "read_at": null,
      "whatsapp_status": "sent",
      "whatsapp_sent_at": "2026-09-06T10:15:00+00:00",
      "created_at": "2026-09-06T10:15:00+00:00"
    }
  ]
}
```

`type` (códigos estables, el frontend traduce las etiquetas):

```text
rainfall_forecast
irrigation
water_stress
frost
high_et0
ndvi_drop
```

`severity`:

```text
info
warning
critical
```

Mapeo sugerido en UI:

- `rainfall_forecast` → Lluvia próxima
- `irrigation` → Recomendación de riego
- `water_stress` → Estrés hídrico
- `frost` → Riesgo de helada
- `high_et0` → Alta demanda hídrica
- `ndvi_drop` → Caída de NDVI
- `info` / `warning` / `critical` → color del badge

`whatsapp_status`:

```text
pending
sent
skipped_no_phone
skipped_outside_window
failed
```

WhatsApp Cloud API permite texto libre solo dentro de las 24 h del último
mensaje del usuario. Fuera de esa ventana, lluvia / riego / estrés se
mandan con **plantillas Utility** aprobadas en Meta
(`agromas_alert_rainfall`, `agromas_alert_irrigation`,
`agromas_alert_water_stress`). Helada, ET0 y NDVI siguen siendo inbox
solamente si no hay sesión abierta. La alerta **siempre** queda en el
inbox. No hay SSE: el badge puede hacer polling suave de
`GET /api/v1/notifications/unread-count`.

Crear las 3 plantillas en WhatsApp Manager → Message templates,
categoría **Utility**, idioma **Spanish (`es`)**. El nombre y el cuerpo
tienen que coincidir con esto (las variables `{{1}}` y `{{2}}` no se
traducen):

**`agromas_alert_rainfall`**

```text
Alerta de lluvia en {{1}}.

Se esperan {{2}} mm en las próximas 48 horas. Si el suelo todavía cubre la demanda, conviene postergar el riego.

Abrí Notificaciones en la app o respondé este chat para consultar el lote.
```

Ejemplo: `{{1}}=Campo Sur / Lote 1` · `{{2}}=18`

**`agromas_alert_irrigation`**

```text
Recomendación de riego en {{1}}.

La decisión operativa sugiere aplicar {{2}} mm (Open-Meteo y NASA POWER).

Abrí Notificaciones en la app o respondé este chat para ver el detalle.
```

Ejemplo: `{{1}}=Campo Sur / Lote 1` · `{{2}}=24.5`

**`agromas_alert_water_stress`**

```text
Alerta de estrés hídrico en {{1}}.

El lote está en estrés hídrico. Déficit aproximado: {{2}} mm.

Revisá el lote en Notificaciones de la app o respondé este chat.
```

Ejemplo: `{{1}}=Campo Sur / Lote 1` · `{{2}}=18.4`

Hasta que Meta las apruebe, poné `WHATSAPP_TEMPLATES_ENABLED=false` para
no spamear errores `132001` en el scan. Si el usuario responde el
template, se reabre la ventana de 24 h y el bot vuelve a mensajes
libres.

### Como Se Generan

El pronóstico de lluvia, helada y ET0 usa **Open-Meteo Forecast** en las
coordenadas del lote. No usa EEAVI. La recomendación de riego toma
`operational_recommendation` del snapshot (Open-Meteo + NASA POWER). El
estrés hídrico sale del último día de `field_hydric_history`.

Reglas:

- Lluvia ≥ 10 mm a 48 h → alerta de lluvia. ≥ 25 mm → `critical`.
- Si la lluvia a 48 h es ≥ 15 mm, **no** se manda alerta de riego (se
  sugiere postergar).
- `operational_recommendation.action=IRRIGATE` → alerta de riego.
- `under_stress=true` → estrés hídrico. 3+ días seguidos → `critical`.
- Mínima ≤ 2 °C → helada. ET0 ≥ 7 mm o máxima ≥ 35 °C → alta demanda.
- Caída de NDVI ≥ 0.15 desde un valor previo ≥ 0.4.

Hay una alerta por usuario / tipo / lote / día (`dedupe_key`). Destinatarios:
miembros `active` del farm.

Cron / job interno (`X-API-Key`):

```text
POST /internal/notifications/scan
GET  /internal/notifications/scan
```

También corre después de un refresh real del snapshot del lote. En local:

```bash
python -m app.jobs.scan_notifications
```

En Railway, un cron diario (por ejemplo 07:00 ART) puede pegarle al
`POST /internal/notifications/scan` con `AGENT_API_KEY`.

## Archivos Backend Relevantes

```text
app/api/routes_agents.py
app/api/routes_farms.py
app/api/routes_whatsapp.py
app/api/routes_notifications.py
app/schemas/agents.py
app/schemas/assistant.py
app/schemas/notifications.py
app/services/whatsapp/history.py
app/services/notifications/evaluate.py
app/services/whatsapp/alert_templates.py
app/services/weather_forecast.py
app/services/whatsapp/conversation.py
app/services/whatsapp/writes.py
app/agents/weather_comparison_agent.py
app/services/external_weather.py
app/agents/supervisor_agent.py
app/agents/ndvi_agent.py
app/agents/crop_coefficient_agent.py
app/agents/water_balance_agent.py
app/agents/recommendation_agent.py
app/agents/validation_agent.py
app/agents/llm_explanation_agent.py
tests/test_agent_calculations.py
```

## Checklist Para Editar Sin Romper El Front

- Si se cambia un schema en `app/schemas/agents.py`, actualizar esta guia.
- Si se cambia un endpoint, actualizar `README.md` y esta guia.
- Si se agregan campos nuevos, mantener compatibilidad con defaults.
- No eliminar campos ya usados por frontend: `source_recommendations`,
  `comparisons`, `recommendation`, `validation`, `explanation`,
  `ndvi_context`, `crop_coefficient_context`, `warnings`, `evidence`.
- Correr tests antes de deploy:

```bash
PYTHONDONTWRITEBYTECODE=1 .venv/bin/pytest -q -p no:cacheprovider
```
