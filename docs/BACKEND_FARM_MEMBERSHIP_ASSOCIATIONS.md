# Especificación Técnica de Backend y Base de Datos: Asociaciones de Campos y Usuarios (Multi-Tenant & Roles)

Este documento detalla la estructura de **Base de Datos Relacional**, **Modelos ORM**, **Lógica de Negocio** y **Endpoints de la API REST** que debes implementar en tu servidor backend (**FastAPI / Python** o **Express / Node.js**) para soportar la gestión de miembros y roles por establecimiento (**Dueño**, **Asesor Agronómico**, **Operario de Campo**) y permitir que cualquier usuario que inicie sesión acceda directamente a sus campos asociados sin pasar por el Onboarding.

---

## 🏗️ 1. Modelo de Datos Relacional (PostgreSQL DDL)

Para que un campo (**Farm / Field**) pueda tener múltiples colaboradores con distintos roles, y para que un usuario pueda pertenecer a uno o más campos, se implementa la tabla asociativa `farm_members` con clave foránea compuesta e índice único.

```sql
-- 1. EXTENSIÓN UUID (SI NO ESTÁ HABILITADA)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DE ESTABLECIMIENTOS / CAMPOS (FARMS)
CREATE TABLE IF NOT EXISTS farms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL DEFAULT 'Campo Principal',
    center_latitude DOUBLE PRECISION NOT NULL,
    center_longitude DOUBLE PRECISION NOT NULL,
    agricultural_zone VARCHAR(150) DEFAULT 'Zona Núcleo (Pergamino)',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA ASOCIATIVA DE MIEMBROS DEL CAMPO (FARM_MEMBERS)
CREATE TABLE IF NOT EXISTS farm_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Rol específico que cumple este usuario dentro de ESTE campo:
    -- 'admin' (Dueño/Administrador), 'agronomist' (Asesor Agronómico), 'operator' (Operario/Regador)
    role VARCHAR(50) NOT NULL DEFAULT 'operator',
    
    -- Estado de la membresía: 'active' (Activo), 'invited' (Invitación pendiente de registro)
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    
    invited_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Garantizar que un usuario no esté duplicado en el mismo campo
    CONSTRAINT unique_farm_user UNIQUE(farm_id, user_id)
);

-- 4. TABLA DE LOTES PARCELARIOS (LOTS / FIELDS)
CREATE TABLE IF NOT EXISTS lots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    geometry_geojson JSONB NOT NULL, -- Polígono GeoJSON estándar
    area_ha DOUBLE PRECISION NOT NULL,
    crop_type VARCHAR(100) NOT NULL, -- 'Soja', 'Maíz', 'Trigo', 'Girasol'
    soil_type VARCHAR(100) NOT NULL, -- 'Franco', 'Franco-Arenoso', 'Arcilloso'
    irrigation_system VARCHAR(100) NOT NULL, -- 'Pivote', 'Goteo', 'Aspersión', 'Gravedad'
    
    -- Parámetros FAO-56
    field_capacity_fc DOUBLE PRECISION,
    wilting_point_wp DOUBLE PRECISION,
    total_available_water_taw DOUBLE PRECISION,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. ÍNDICES DE BÚSQUEDA OPTIMIZADOS
CREATE INDEX IF NOT EXISTS idx_farm_members_user_id ON farm_members(user_id);
CREATE INDEX IF NOT EXISTS idx_farm_members_farm_id ON farm_members(farm_id);
CREATE INDEX IF NOT EXISTS idx_lots_farm_id ON lots(farm_id);
```

---

## 🐍 2. Modelos ORM y Esquemas en Python (FastAPI + SQLAlchemy + Pydantic)

### A. Modelos SQLAlchemy (`models/farm.py`)

```python
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from database import Base

class Farm(Base):
    __tablename__ = "farms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(150), nullable=False, default="Establecimiento Principal")
    center_latitude = Column(Float, nullable=False)
    center_longitude = Column(Float, nullable=False)
    agricultural_zone = Column(String(150), default="Pergamino, Buenos Aires")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    members = relationship("FarmMember", back_populates="farm", cascade="all, delete-orphan")
    lots = relationship("Lot", back_populates="farm", cascade="all, delete-orphan")


class FarmMember(Base):
    __tablename__ = "farm_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farm_id = Column(UUID(as_uuid=True), ForeignKey("farms.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50), nullable=False, default="operator") # 'admin', 'agronomist', 'operator'
    status = Column(String(30), nullable=False, default="active") # 'active', 'invited'
    invited_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    joined_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("farm_id", "user_id", name="unique_farm_user"),
    )

    # Relaciones
    farm = relationship("Farm", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])
```

---

### B. Esquemas Pydantic (`schemas/farm_member.py`)

```python
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class FarmMemberBase(BaseModel):
    role: str # 'admin' | 'agronomist' | 'operator'

class AddFarmMemberRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone_whatsapp: str
    role: str # 'admin' | 'agronomist' | 'operator'

class UpdateFarmMemberRoleRequest(BaseModel):
    role: str

class FarmMemberResponse(BaseModel):
    id: UUID
    farm_id: UUID
    user_id: UUID
    first_name: str
    last_name: str
    name: str
    email: str
    phone_whatsapp: Optional[str]
    role: str
    status: str
    joined_at: datetime

    class Config:
        orm_mode = True
```

---

## 📡 3. Especificación de Endpoints REST Necesarios

### 1. `GET /api/v1/users/me` (Actualizado con Campos y Rol Asociado)
Devuelve el perfil del usuario autenticado y la lista de todos los campos en los que participa, junto con el rol que cumple en cada uno.

* **Headers**: `Authorization: Bearer <access_token>`
* **Response (200 OK)**:
```json
{
  "user": {
    "id": "c1f72df9-78c6-43b9-a292-963d80a1c6a2",
    "email": "esteban@campo.com",
    "first_name": "Esteban",
    "last_name": "Ferreyra",
    "phone_whatsapp": "+5492477458921",
    "role": "admin"
  },
  "fields": [
    {
      "id": "f83a21b4-1029-4d6e-82f3-102948a7b1c3",
      "name": "Lote Norte",
      "area_ha": 65.0,
      "crop_type": "Soja",
      "soil_type": "Franco",
      "irrigation_system": "Pivote",
      "center_latitude": -33.8820,
      "center_longitude": -60.5750,
      "field_capacity_fc": 28.0,
      "wilting_point_wp": 14.0,
      "total_available_water_taw": 140.0,
      "user_role_in_farm": "admin"
    }
  ]
}
```

> **📌 Regla de Oro Frontend**: Si `fields.length > 0`, el frontend redirige automáticamente a `/` (Dashboard) y omite el Onboarding.

---

### 2. `GET /api/v1/farms/members` o `GET /api/v1/fields/{field_id}/members` (Listar Miembros del Establecimiento)
Obtiene todos los usuarios con acceso al campo actual.

* **Headers**: `Authorization: Bearer <access_token>`
* **Response (200 OK)**:
```json
[
  {
    "id": "a1101b22-3344-5566-7788-99aabbccdde1",
    "user_id": "c1f72df9-78c6-43b9-a292-963d80a1c6a2",
    "first_name": "Esteban",
    "last_name": "Ferreyra",
    "name": "Esteban Ferreyra",
    "email": "esteban@campo.com",
    "phone_whatsapp": "+5492477458921",
    "role": "admin",
    "status": "active",
    "joined_at": "2026-03-15T10:00:00Z"
  },
  {
    "id": "b2202c33-4455-6677-8899-00bbccddee22",
    "user_id": "d2e83ea0-89d7-54ca-b3a3-074e91b2d7b3",
    "first_name": "Ing. Lucas",
    "last_name": "Fredes",
    "name": "Ing. Lucas Fredes",
    "email": "l.fredes@agroconsultora.com.ar",
    "phone_whatsapp": "+5491138441920",
    "role": "agronomist",
    "status": "active",
    "joined_at": "2026-04-02T14:30:00Z"
  },
  {
    "id": "c3303d44-5566-7788-9900-11ccddeeff33",
    "user_id": "e3f94fb1-90e8-65db-c4b4-185fa2c3e8c4",
    "first_name": "Carlos",
    "last_name": "Benítez",
    "name": "Carlos Benítez",
    "email": "carlos.b@campodonpedro.com",
    "phone_whatsapp": "+5492477621105",
    "role": "operator",
    "status": "active",
    "joined_at": "2026-05-18T09:15:00Z"
  }
]
```

---

### 3. `POST /api/v1/farms/members` o `POST /api/v1/fields/{field_id}/members` (Invitar / Agregar Usuario al Campo)
Permite al **Dueño** (`admin`) agregar un nuevo usuario al establecimiento.

* **Headers**: `Authorization: Bearer <access_token>`
* **Request Body**:
```json
{
  "first_name": "Martín",
  "last_name": "García",
  "email": "m.garcia@campo.com",
  "phone_whatsapp": "+5492477334455",
  "role": "operator",
  "field_id": "f83a21b4-1029-4d6e-82f3-102948a7b1c3"
}
```
* **Lógica en Backend**:
  1. Verificar que el usuario autenticado que realiza la petición sea `admin` en el campo `field_id` (de lo contrario devolver `403 Forbidden`).
  2. Buscar si ya existe un usuario registrado con ese `email`:
     - **Si ya existe**: Insertar registro en `farm_members` con `user_id = user.id`, `role = payload.role`, `status = 'active'`.
     - **Si no existe**: Crear el registro de usuario en `users` con contraseña provisional o marcarlo con `status = 'invited'`, e insertar la asociación en `farm_members`.
  3. Devolver el objeto de miembro creado (`201 Created`).

---

### 4. `PATCH /api/v1/members/{member_id}/role` (Cambiar Rol de un Miembro)
Permite modificar el rol de un colaborador en el campo.

* **Headers**: `Authorization: Bearer <access_token>`
* **Request Body**:
```json
{
  "role": "agronomist"
}
```
* **Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Rol actualizado a agronomist",
  "member_id": "c3303d44-5566-7788-9900-11ccddeeff33",
  "new_role": "agronomist"
}
```

---

### 5. `DELETE /api/v1/members/{member_id}` (Desvincular Miembro del Campo)
Elimina la asociación del usuario con el campo (no borra la cuenta del usuario, solo el registro en `farm_members`).

* **Headers**: `Authorization: Bearer <access_token>`
* **Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Usuario desvinculado del establecimiento"
}
```

---

## 🔒 4. Middleware de Autorización por Rol en FastAPI

Para proteger los endpoints de configuración y que únicamente el Dueño pueda agregar miembros, utiliza la siguiente dependencia reutilizable:

```python
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.farm import FarmMember
from auth import get_current_user

def require_farm_admin(
    field_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verifica que el usuario actual tenga rol de 'admin' (Dueño) en el campo especificado.
    """
    membership = db.query(FarmMember).filter(
        FarmMember.farm_id == field_id,
        FarmMember.user_id == current_user.id
    ).first()

    if not membership or membership.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permisos insuficientes: Solo el Dueño / Administrador puede gestionar usuarios del campo."
        )
    return membership
```

---

## 🔄 5. Flujo Automático al Crear Lotes en Onboarding

Cuando el Dueño termina el Onboarding por primera vez (`POST /api/v1/fields`):
1. El backend crea el registro en la tabla `farms` (o asigna el campo).
2. **Automáticamente crea la membresía del Dueño en `farm_members`**:
   ```sql
   INSERT INTO farm_members (farm_id, user_id, role, status)
   VALUES (new_farm_id, current_user.id, 'admin', 'active');
   ```
3. Inserta los lotes parcelarios asociados a ese `farm_id`.

De esta forma, en el siguiente inicio de sesión, `GET /api/v1/users/me` retornará inmediatamente los lotes creados y el usuario accederá directo al Dashboard sin volver a ver la pantalla de carga de parámetros.
