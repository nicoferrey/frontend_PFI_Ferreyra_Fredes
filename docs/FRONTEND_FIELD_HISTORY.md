# API de Historial Hídrico y Reportes (Frontend)

Endpoints bajo `/api/v1/fields/{field_id}/...` con `Authorization: Bearer <token>`.
El usuario debe ser miembro activo del establecimiento del lote.

## Eventos de riego

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/irrigation-events` | Crear riego |
| GET | `/irrigation-events?date_from=&date_to=` | Listar |
| PATCH | `/irrigation-events/{event_id}` | Editar |
| DELETE | `/irrigation-events/{event_id}` | Eliminar |

`method` es opcional en POST; si se omite, usa `fields.irrigation_system`.
`registered_by` en la respuesta es UUID del usuario.

## Eventos de lluvia (manual)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/rainfall-events` | Registrar lluvia de pluviómetro |
| GET | `/rainfall-events?date_from=&date_to=` | Listar |
| PATCH | `/rainfall-events/{event_id}` | Editar |
| DELETE | `/rainfall-events/{event_id}` | Eliminar |

## Historial hídrico diario

`GET /hydric-history?date_from=2026-08-08&date_to=2026-08-15`

Respuesta: array con `date`, `dr_mm`, `au_mm`, `afd_mm`, `taw_mm`, `etc_mm`, `et0_mm`, `rain_mm`, `irrigation_mm`, `ndvi`, `kc`, `rain_source` (`manual` | `open_meteo` | `none`).

## Reportes

- `GET /reports/summary?date_from=&date_to=` — métricas agregadas del período.
- `GET /reports/export?format=csv|xlsx&date_from=&date_to=` — descarga del historial diario.

## Integración con agentes

Al refrescar snapshot del lote (`POST /api/v1/fields/{id}/agent-snapshot`), el backend pasa `field_id` al `SupervisorAgent` y suma automáticamente los riegos persistidos del período.

Para análisis directo vía `/agents/analyze-irrigation`, enviar en el body:

```json
{
  "field_id": 3,
  "use_persisted_irrigation_events": true,
  "date_from": "2026-08-01",
  "date_to": "2026-08-15"
}
```

Con `use_persisted_irrigation_events: true`, `irrigation_applied_mm` del request se ignora y se usa la suma de `irrigation_events`.

## Migración

```bash
alembic upgrade head
```

Nueva revisión: `20260815_0006_field_hydric_history`.
