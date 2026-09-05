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
Authorization: Bearer <access_token>
```

Roles: `admin` y `agronomist`. El operador recibe `403` (misma regla que ver el
equipo). `days` default `7`, rango `1..90`.

El frontend agrupa `items` por `member_id`. Cruzar con
`GET /api/v1/farms/{farm_id}/members` (`id` = `member_id`, `user_id`,
`phone_whatsapp`).

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
      "phone_whatsapp": "+5492477458921",
      "date": "2026-09-04T15:40:00+00:00",
      "query": "hace falta regar el lote norte?",
      "ai_response": "Hay que regar 18.5 mm. Regar mañana temprano.",
      "category": "irrigation",
      "status": "resolved",
      "field_id": 7,
      "field_name": "Lote Norte"
    }
  ]
}
```

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

Solo aparecen interacciones de miembros **activos** del `farm_id`. Si el turno
quedo asociado a otro establecimiento (`farm_id` distinto), no se incluye. Un
turno sin lote elegido (`farm_id` nulo) si aparece en todos los campos donde
ese usuario es miembro.

No hay SSE ni WebSockets. El dashboard puede hacer polling suave del mismo GET
mientras la pestana Asistente este abierta.

Los chats anteriores a esta persistencia no se pueden reconstruir: solo hay
historial desde que corre la migracion `20260904_0015`.

## Archivos Backend Relevantes

```text
app/api/routes_agents.py
app/api/routes_farms.py
app/api/routes_whatsapp.py
app/schemas/agents.py
app/schemas/assistant.py
app/services/whatsapp/history.py
app/services/whatsapp/conversation.py
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
