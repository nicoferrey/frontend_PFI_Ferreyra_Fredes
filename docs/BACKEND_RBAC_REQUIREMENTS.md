# Requerimientos de Autorización y Control de Acceso Basado en Roles (RBAC) para el Backend

Este documento contiene las especificaciones técnicas y directivas de seguridad para la implementación del Control de Acceso por Roles (RBAC) en el servidor backend (FastAPI / Pydantic).

---

## 1. Definición de Roles en el Establecimiento (`FieldRole`)

En el modelo de datos `FarmMember` / `FieldTeamMember`, cada usuario asociado a un campo posee uno de los tres niveles de acceso:

1. **`admin` (Dueño / Administrador del Establecimiento)**:
   - Propietario o encargado general. Posee control absoluto sobre la configuración del campo, gestión de miembros y parámetros agronómicos.
2. **`agronomist` (Asesor Agrónomo)**:
   - Profesional técnico. Puede visualizar el estado hídrico de los lotes, ajustar parámetros FAO-56 (Kc, RAW, capacidad de campo) y registrar riegos. **No puede invitar miembros, editar roles ni eliminar usuarios**.
3. **`operator` (Operador de Riego)**:
   - Personal de campo. Puede consultar el mapa, el estado de los lotes y registrar eventos de riego o lluvia aplicada. **No puede modificar la estructura del campo, parámetros agronómicos ni gestionar usuarios**.

---

## 2. Protección de Endpoints REST por Rol

El backend debe verificar el rol del usuario autenticado (`current_user`) dentro de la granja (`farm_id`) para cada petición HTTP.

### A. Gestión de Equipo (`/api/v1/farms/{farm_id}/members` & `/api/v1/fields/{field_id}/members`)

| Endpoint | Método | Roles Permitidos | Respuesta si No Autorizado |
| :--- | :---: | :---: | :---: |
| GET `/farms/{farm_id}/members` | `GET` | `admin`, `agronomist` | `HTTP 403 Forbidden` |
| POST `/farms/{farm_id}/members` | `POST` | **Solo `admin`** | `HTTP 403 Forbidden` |
| PATCH `/members/{member_id}/role` | `PATCH` | **Solo `admin`** | `HTTP 403 Forbidden` |
| DELETE `/members/{member_id}` | `DELETE` | **Solo `admin`** | `HTTP 403 Forbidden` |
| POST `/members/{member_id}/resend-invitation` | `POST` | **Solo `admin`** | `HTTP 403 Forbidden` |

### B. Configuración del Establecimiento (`/api/v1/farms/{farm_id}`)

| Endpoint | Método | Roles Permitidos | Respuesta si No Autorizado |
| :--- | :---: | :---: | :---: |
| GET `/farms/{farm_id}` | `GET` | `admin`, `agronomist`, `operator` | `HTTP 403 Forbidden` |
| PATCH `/farms/{farm_id}` | `PATCH` | **Solo `admin`** | `HTTP 403 Forbidden` |
| DELETE `/farms/{farm_id}` | `DELETE` | **Solo `admin`** | `HTTP 403 Forbidden` |

### C. Gestión de Lotes y Parámetros Agronómicos (`/api/v1/lots` & `/api/v1/fields/{field_id}/lots`)

| Endpoint | Método | Roles Permitidos | Respuesta si No Autorizado |
| :--- | :---: | :---: | :---: |
| GET `/fields/{field_id}/lots` | `GET` | `admin`, `agronomist`, `operator` | `HTTP 403 Forbidden` |
| POST `/fields/{field_id}/lots` | `POST` | `admin`, `agronomist` | `HTTP 403 Forbidden` |
| PATCH `/lots/{lot_id}` (Parámetros FAO-56) | `PATCH` | `admin`, `agronomist` | `HTTP 403 Forbidden` |
| DELETE `/lots/{lot_id}` | `DELETE` | **Solo `admin`** | `HTTP 403 Forbidden` |
| POST `/lots/{lot_id}/irrigation-events` | `POST` | `admin`, `agronomist`, `operator` | `HTTP 403 Forbidden` |

---

## 3. Implementación Sugerida en FastAPI

Para garantizar el cumplimiento de RBAC sin duplicar código en las rutas, se sugiere definir dependencias reutilizables:

```python
# app/api/deps.py

from fastapi import Depends, HTTPException, status
from app.models.user import User
from app.models.farm import FarmMemberRole

async def require_farm_role(allowed_roles: list[FarmMemberRole]):
    async def dependency(
        farm_id: int,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
    ):
        membership = await get_user_farm_membership(db, current_user.id, farm_id)
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No perteneces a este establecimiento."
            )
        if membership.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permiso insuficiente. Requiere rol de: {', '.join([r.value for r in allowed_roles])}"
            )
        return membership
    return dependency

# Uso en endpoints:
require_farm_admin = require_farm_role([FarmMemberRole.ADMIN])
require_farm_agronomist = require_farm_role([FarmMemberRole.ADMIN, FarmMemberRole.AGRONOMIST])
require_farm_member = require_farm_role([FarmMemberRole.ADMIN, FarmMemberRole.AGRONOMIST, FarmMemberRole.OPERATOR])
```

---

## 4. Esquema de Respuestas de Error HTTP 403

Cuando un usuario intente ejecutar una acción no autorizada para su rol, la API debe devolver una estructura de error estándar Pydantic:

```json
{
  "detail": "Acceso denegado: Solo el Dueño del establecimiento puede gestionar miembros del equipo."
}
```

---

## 5. Resumen de Integración Frontend-Backend

1. **Frontend**: Oculta/deshabilita controles visuales (`disabled`, componentes ocultos) según el rol. Además, provee el selector demo en la barra superior para cambiar el rol simulado (`Dueño`, `Agrónomo`, `Operador`).
2. **Backend**: Aplica la validación real en la capa de endpoints impidiendo cualquier mutación no autorizada.
