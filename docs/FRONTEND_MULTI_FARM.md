# Frontend — Establecimiento Activo Y Multi-Campo

Guia para que el dashboard deje de asumir un unico campo global y use el
modelo que el backend ya tiene.

Backend:

```text
https://backendpfiferreyrafredes-production.up.railway.app
```

Auth: JWT `Authorization: Bearer`. No usar `X-API-Key` aca.

---

## 1. Por que existe `farm_id`

Hay dos niveles, no uno:

| Concepto | Tabla | Que es |
|---|---|---|
| Establecimiento / campo | `farms` | La granja. Equipo, WhatsApp y settings viven aca. |
| Lote | `fields` | Una parcela dentro de un `farm`. Balance hidrico, NDVI, riego. |

`farm_id` no nacio solo para el Asistente. Es la clave de **todo** lo que es
del establecimiento: miembros, invitaciones, rol del usuario, historial del
bot. El lote (`field_id`, entero) no alcanza: un miembro ve **todos** los lotes
de ese farm, no uno solo.

Hoy el producto se usa como un solo establecimiento. El backend ya contempla
varios:

- Un usuario puede ser miembro de **N farms** (`farm_members`).
- El rol es **por farm** (`admin` / `agronomist` / `operator`), no global.
- `/users/me` devuelve **todos** los lotes de todos los farms donde el usuario
  esta `active`.
- Las rutas `GET /api/v1/farms/members` y `GET /api/v1/farms/assistant/history`
  (sin UUID) eligen el farm **primario**: la membresia activa mas antigua.
  Sirven para UX de un solo campo. Con varios campos mezclan o muestran el
  farm equivocado.

No hay que esperar un endpoint nuevo de "listar farms" para arrancar el
switcher: los farms se derivan de `fields[].farm_id`.

---

## 2. Lo que el front hace hoy (y se rompe con 2 campos)

- `useAuth.fields` es una lista plana de lotes, sin `farm_id` en el tipo
  `FieldItem`.
- `lotsData` / `fieldToLot` no copian `farm_id`.
- `user.role` e `isOwner` salen de `users.role` (dato de registro). El rol
  real esta en `fields[].user_role_in_farm`.
- Equipo: si no hay id, pega `/api/v1/farms/members` (farm primario).
- Asistente: manda `farm_id = 'default'` → **422**. `default` no es UUID.
- El selector de lote del Asistente no cambia de establecimiento.

Con un solo campo esto "casi" anda. Con dos, lotes, equipo y WhatsApp se
mezclan.

---

## 3. Contrato que ya existe

### 3.1 Perfil + lotes (fuente de farms)

```text
GET /api/v1/users/me
```

Cada lote trae el farm:

```json
{
  "user": {
    "id": "…",
    "email": "dueno@campo.com",
    "role": "admin",
    "phone_whatsapp": "+5492477458921"
  },
  "fields": [
    {
      "id": 1,
      "farm_id": "f83a21b4-1029-4d6e-82f3-102948a7b1c3",
      "name": "Lote Norte",
      "user_role_in_farm": "admin"
    },
    {
      "id": 2,
      "farm_id": "f83a21b4-1029-4d6e-82f3-102948a7b1c3",
      "name": "Lote Sur",
      "user_role_in_farm": "admin"
    },
    {
      "id": 9,
      "farm_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "name": "Lote A",
      "user_role_in_farm": "agronomist"
    }
  ]
}
```

Reglas:

- `fields[].id` = lote (entero).
- `fields[].farm_id` = establecimiento (UUID). Agrupar por este campo.
- `fields[].user_role_in_farm` = rol **en ese farm**. Usar esto para UI/RBAC.
- `user.role` es el rol de la cuenta al registrarse. No usarlo para ocultar
  botones de equipo o settings si el usuario es operator en un farm y admin
  en otro.

`FieldResponse` hoy **no** manda `farm_name`. El nombre del establecimiento
sale de:

```text
GET /api/v1/farms/{farm_id}
```

```json
{
  "id": "f83a21b4-1029-4d6e-82f3-102948a7b1c3",
  "name": "Campo Principal",
  "center_latitude": -40.79,
  "center_longitude": -63.05,
  "agricultural_zone": "Valle Inferior",
  "user_role_in_farm": "admin"
}
```

Unicos `farm_id` de `fields` + un GET por farm = lista del switcher.

Lotes de un farm (alternativa a filtrar `me.fields`):

```text
GET /api/v1/farms/{farm_id}/fields
```

### 3.2 Rutas con farm vs atajo primario

| Uso | Con farm activo (multi-campo) | Atajo un solo campo |
|---|---|---|
| Equipo | `GET/POST /api/v1/farms/{farm_id}/members` | `GET/POST /api/v1/farms/members` |
| Asistente IA | `GET /api/v1/farms/{farm_id}/assistant/history?days=7` | `GET /api/v1/farms/assistant/history?days=7` |
| Detalle / editar farm | `GET/PATCH/DELETE /api/v1/farms/{farm_id}` | no hay atajo |
| Lotes del farm | `GET /api/v1/farms/{farm_id}/fields` | filtrar `me.fields` |

`{farm_id}` es UUID. Nunca `default`. Eso da `422`.

Mientras no haya switcher, el atajo primario esta bien. El dia que haya dos
campos, **todas** las rutas de la tabla izquierda tienen que usar el UUID
activo. No mezclar atajo y UUID.

Alias por lote (si ya tenes `field_id` entero):

```text
GET/POST /api/v1/fields/{field_id}/members
```

Equivale al farm de ese lote.

### 3.3 Asistente WhatsApp (por farm)

```text
GET /api/v1/farms/{farm_id}/assistant/history?days=7
Authorization: Bearer <JWT>
```

Roles: `admin` y `agronomist` de **ese** farm. Operator: `403`.

```json
{
  "farm_id": "f83a21b4-1029-4d6e-82f3-102948a7b1c3",
  "days": 7,
  "items": [
    {
      "id": "…",
      "member_id": "…",
      "user_id": "…",
      "phone_whatsapp": "+5492477458921",
      "date": "2026-09-04T15:40:00+00:00",
      "query": "hace falta regar?",
      "ai_response": "Hay que regar 18.5 mm.",
      "category": "irrigation",
      "status": "resolved",
      "field_id": 1,
      "field_name": "Lote Norte"
    }
  ]
}
```

Agrupar `items` por `member_id` (= `id` de `GET .../members`).

Cruzar con el equipo del **mismo** `farm_id`. Un agronomo en dos campos tiene
dos `member_id` distintos.

El bot de WhatsApp, en el telefono, lista lotes de **todos** los farms del
usuario. El dashboard solo muestra el historial del farm activo.

`category`: `irrigation` | `weather` | `ndvi` | `register_irrigation` |
`register_rainfall` | `navigation`.

`status`: `resolved` | `pending` | `registered`.

---

## 4. Que hay que cambiar en el front

### 4.1 Tipos

En `lib/api.ts`, `FieldItem` tiene que incluir lo que `/users/me` ya manda:

```ts
export interface FieldItem {
  id: number | string;
  farm_id?: string | null;
  user_role_in_farm?: 'admin' | 'agronomist' | 'operator';
  name: string;
  // ...resto igual
}

export interface FarmSummary {
  id: string;
  name: string;
  agricultural_zone?: string | null;
  user_role_in_farm: 'admin' | 'agronomist' | 'operator';
  field_ids: Array<number | string>;
}
```

`LotHydricData` (o el lote del dashboard) debe llevar `farm_id`.

### 4.2 `useAuth`: farm activo

No alcanza con `user` + `fields`. Estado extra:

```ts
currentFarmId: string | null;
farms: FarmSummary[];
currentFarm: FarmSummary | null;
currentFields: FieldItem[]; // lots del farm activo
currentRole: 'admin' | 'agronomist' | 'operator' | null;
isOwner: boolean; // currentRole === 'admin', NO user.role
setCurrentFarmId: (farmId: string) => void;
```

Al hidratar desde `/users/me`:

1. Agrupar `fields` por `farm_id`.
2. Por cada grupo, `GET /api/v1/farms/{farm_id}` para `name` (cachear).
3. Elegir `currentFarmId`:
   - el guardado en `localStorage` si sigue existiendo;
   - si no, el del primer lote (`fields[0].farm_id`).
4. Persistir `agromas_current_farm_id`.

```ts
function groupFarms(fields: FieldItem[]): Map<string, FieldItem[]> {
  const map = new Map<string, FieldItem[]>();
  for (const field of fields) {
    if (!field.farm_id) continue;
    const list = map.get(field.farm_id) ?? [];
    list.push(field);
    map.set(field.farm_id, list);
  }
  return map;
}
```

`isOwner` / botones de invitar / borrar lote / editar farm: usar
`currentRole`, no `user.role`. El selector demo `setUserRole` no autoriza
nada en backend.

### 4.3 Donde filtrar

Con `currentFarmId` seteado:

| Superficie | Datos |
|---|---|
| Mapa / dashboard / historial hidrico | `fields` con ese `farm_id` |
| Settings del establecimiento | `GET/PATCH /api/v1/farms/{currentFarmId}` |
| Equipo | `GET /api/v1/farms/{currentFarmId}/members` |
| Asistente IA | `GET /api/v1/farms/{currentFarmId}/assistant/history` |
| Crear lote extra | `POST /api/v1/fields` con `farm_id: currentFarmId` |

Si `farms.length === 1`, no hace falta UI de switcher. Igual guardar
`currentFarmId` y usarlo en las URLs: queda listo para el segundo campo.

### 4.4 Switcher (cuando haya 2+)

En topbar / sidebar: nombre del farm activo + lista.

Al cambiar:

1. `setCurrentFarmId(id)`
2. Recargar lotes, snapshots, miembros, historial WhatsApp del farm nuevo.
3. Si el lote seleccionado no pertenece al farm, elegir el primer lote de ese
   farm.

No hace falta recargar `/users/me` en cada switch: filtrar `fields` en memoria.

### 4.5 Asistente: dejar de mandar `default`

```ts
export async function getAssistantHistoryApi(
  farmId?: string | null,
  days = 7,
): Promise<AssistantHistoryResponse | null> {
  const path =
    farmId && farmId !== 'default'
      ? `/api/v1/farms/${farmId}/assistant/history?days=${days}`
      : `/api/v1/farms/assistant/history?days=${days}`;
  const res = await apiFetch(path);
  if (!res.ok) return null;
  return res.json();
}
```

En `assistant/page.tsx`:

- Importar `useEffect`.
- `getAssistantHistoryApi(currentFarmId)` (nunca `'default'`).
- Las cards de WhatsApp **fuera** del `if (!snapshot)`. El historial del bot
  no depende de “Actualizar agentes”.
- El selector de lote del Asistente es diagnostico FAO/NDVI del lote, no el
  farm. El historial WhatsApp es de todo el establecimiento.

Equipo: misma regla que ya usan para miembros, pero con UUID real:

```ts
const endpoint = currentFarmId
  ? `/api/v1/farms/${currentFarmId}/members`
  : `/api/v1/farms/members`;
```

### 4.6 Onboarding vs segundo farm

- Primer lote **sin** `farm_id`: el backend crea farm + membresia `admin`.
- Lotes siguientes **sin** `farm_id`: van al farm primario del admin (un
  establecimiento por dueno).
- Para un lote en **otro** farm hay que mandar ese `farm_id` (el usuario tiene
  que ser miembro `admin` o `agronomist` ahi).

Mientras el switcher no exista, no ofrezcan “crear otro establecimiento” en
UI: el POST sin `farm_id` sigue metiendo lotes en el mismo farm. Eso esta bien.

Un agronomo invitado a dos campos **ya** recibe lotes de ambos en `/users/me`.
Ahi el switcher deja de ser opcional.

---

## 5. Checklist

- [ ] `FieldItem.farm_id` y `user_role_in_farm` tipados y leidos de `/users/me`
- [ ] `currentFarmId` en auth/dashboard + `localStorage`
- [ ] `isOwner` / RBAC de UI segun `user_role_in_farm` del farm activo
- [ ] Mapa y lotes filtrados por `currentFarmId`
- [ ] Equipo: `/api/v1/farms/{farm_id}/members`
- [ ] Asistente: `/api/v1/farms/{farm_id}/assistant/history` (sin `default`)
- [ ] Cards WhatsApp visibles aunque no haya snapshot de agentes
- [ ] Switcher solo si hay 2+ `farm_id` distintos
- [ ] Crear lote extra con `farm_id: currentFarmId`

---

## 6. Que no esta en el backend (todavia)

- `GET /api/v1/farms` (listar establecimientos). Se arma con `/users/me` +
  `GET /farms/{id}`.
- `farm_name` dentro de cada lote. Pedir el farm o cachear el GET.
- Farm activo en el JWT. Es estado de cliente.
- SSE/WebSockets del Asistente. Polling 15–30 s en esa pestana.

Si hace falta un `GET /api/v1/farms` con `{ id, name, role, field_count }`,
pedirlo al backend; no bloquea el primer switcher.

---

## 7. Mensaje corto para el PR del front

El backend ya es multi-establecimiento: lotes traen `farm_id`, el rol es por
farm, equipo y Asistente se scopedan con UUID. Los atajos sin UUID
(`/farms/members`, `/farms/assistant/history`) son el farm primario (un solo
campo). `default` en la URL da 422.

Hay que guardar `currentFarmId` (de `fields[0].farm_id` o localStorage),
filtrar lotes, y pegarle a `/api/v1/farms/{farm_id}/members` y
`/api/v1/farms/{farm_id}/assistant/history`. No hace falta un campo nuevo en
el JWT. El switcher de UI se prende cuando `/users/me` tenga mas de un
`farm_id`.
