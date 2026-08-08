# Especificación de Arquitectura Backend y Base de Datos: Sistema de Autenticación AgroMAS

Este documento detalla la estructura técnica que debes implementar en tu **Backend** (Node.js/Express, Python/FastAPI, o Go) y en tu **Base de Datos** (PostgreSQL con PostGIS o MySQL) para gestionar usuarios, soportar inicio de sesión con **Google OAuth2** y **Email/Contraseña**, y conectar los lotes del Onboarding y las alertas del canal WhatsApp.

---

## 🗄️ 1. Esquema Relacional de Base de Datos (SQL DDL)

A continuación se presenta el script DDL estándar (compatible con **PostgreSQL 14+**) para crear las tablas necesarias:

```sql
-- Habilitar extensión UUID y PostGIS (si se desea almacenar geometrías nativas)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA DE USUARIOS (USERS)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- Nulo si el usuario solo se registró con Google
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin', -- 'admin' (Productor), 'agronomist', 'operator'
    phone_whatsapp VARCHAR(50), -- Teléfono para vincular al canal RAG de WhatsApp (Requerido)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA DE PROVEEDORES DE IDENTIDAD EXTERNOS (AUTH_ACCOUNTS / GOOGLE OAUTH)
CREATE TABLE auth_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'google', 'apple', etc.
    provider_account_id VARCHAR(255) NOT NULL, -- Google 'sub' ID único del usuario
    linked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_provider_account UNIQUE(provider, provider_account_id)
);

-- 3. TABLA DE SESIONES Y REFRESH TOKENS (JWT REFRESH)
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA DE ESTABLECIMIENTOS / CAMPOS (FARMS)
CREATE TABLE farms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL DEFAULT 'Campo Principal',
    center_latitude DOUBLE PRECISION NOT NULL,
    center_longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLA DE LOTES PARCELARIOS (LOTS - Generados en el Onboarding)
CREATE TABLE lots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    polygon_coordinates JSONB NOT NULL, -- Array de pares [[lat, lng], [lat, lng], ...]
    area_hectares DOUBLE PRECISION NOT NULL,
    crop_type VARCHAR(100) NOT NULL, -- 'Soja', 'Maíz', 'Trigo', 'Girasol'
    soil_texture VARCHAR(100) NOT NULL, -- 'Franco', 'Franco-Arenoso', 'Arcilloso'
    irrigation_system VARCHAR(100) NOT NULL, -- 'Pivote', 'Goteo', 'Aspersión'
    
    -- Parámetros Físicos Estimados para Balance FAO-56
    field_capacity_fc DOUBLE PRECISION, -- Capacidad de Campo (%)
    wilting_point_wp DOUBLE PRECISION,  -- Punto de Marchitez (%)
    total_available_water_taw DOUBLE PRECISION, -- Agua Útil Total (mm/m)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices de búsqueda optimizados
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_auth_accounts_provider ON auth_accounts(provider, provider_account_id);
CREATE INDEX idx_lots_farm_id ON lots(farm_id);
```

---

## 📡 2. Especificación de Endpoints de la API REST

### 1. `POST /api/v1/auth/register` (Registro Tradicional en 2 Etapas)
Crea un usuario nuevo con contraseña encriptada tras completar los datos de acceso (Paso 1) y el perfil/WhatsApp (Paso 2).
* **Request Body**:
  ```json
  {
    "email": "productor@campo.com",
    "password": "PasswordSeguro123!",
    "first_name": "Esteban",
    "last_name": "Ferreyra",
    "role": "admin",
    "phone_whatsapp": "+5492477458921"
  }
  ```
* **Lógica en Backend**:
  1. Verificar si el `email` ya existe en la base de datos (devolver `409 Conflict`).
  2. Hashear la contraseña con **Argon2id** o **bcrypt** (`cost >= 12`).
  3. Insertar el registro en la tabla `users` con sus campos separados `first_name` y `last_name`.
  4. Generar **Access Token** (JWT, 15 min) y **Refresh Token** (7 días).
  5. Devolver Access Token en JSON y Refresh Token en `Set-Cookie`.
* **Response (201 Created)**:
  ```json
  {
    "status": "success",
    "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
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

---

### 2. `POST /api/v1/auth/login` (Inicio de Sesión)
* **Request Body**:
  ```json
  {
    "email": "productor@campo.com",
    "password": "PasswordSeguro123!"
  }
  ```
* **Lógica en Backend**:
  1. Buscar el usuario por `email`.
  2. Comparar el hash de la contraseña usando `bcrypt.compare()` o `argon2.verify()`.
  3. Si es incorrecto, devolver `401 Unauthorized`.
  4. Generar y responder con los tokens de sesión.

---

### 3. `POST /api/v1/auth/google` (Google OAuth2 + Completado de Perfil)
Permite registro e inicio de sesión con Google, solicitando teléfono de WhatsApp y rol si es un usuario nuevo.
* **Request Body**:
  ```json
  {
    "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
    "phone_whatsapp": "+5492477458921", // Opcional en el primer llamado, enviado en Paso 2
    "role": "admin"                     // Opcional en el primer llamado, enviado en Paso 2
  }
  ```
* **Lógica en Backend (Flujo en 2 Pasos con Google)**:
  1. Validar la firma del `id_token` usando la librería de Google con el `GOOGLE_CLIENT_ID`.
  2. Extraer las claims: `email`, `sub` (Google User ID), `given_name` (Nombre), `family_name` (Apellido).
  3. Buscar en la tabla `auth_accounts` si existe `provider = 'google'` y `provider_account_id = sub`:
     * **Si existe y el usuario ya tiene `phone_whatsapp`**: Emite JWT y responde con sesión iniciada (`200 OK`).
     * **Si no existe (nuevo registro) y NO se enviaron `phone_whatsapp` ni `role`**:
       * Devuelve un estado `requires_profile: true` con los datos básicos de Google para que el frontend despliegue el **Paso 2**.
     * **Si se envían los datos del Paso 2 (`phone_whatsapp` y `role`)**:
       * Crea el registro en `users` (con `password_hash = NULL`, `first_name`, `last_name`, `phone_whatsapp`, `role`) e inserta en `auth_accounts`.
       * Emite los tokens JWT correspondientes.

#### Ejemplo de Implementación en Python (FastAPI):
```python
from fastapi import APIRouter, HTTPException, Depends
from google.oauth2 import id_token
from google.auth.transport import requests
import os

router = APIRouter()
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

@router.post("/api/v1/auth/google")
async def google_auth(payload: dict):
    token = payload.get("id_token")
    if not token:
        raise HTTPException(status_code=400, detail="Token no provisto")
    
    try:
        # Verifica la firma criptográfica contra los servidores de Google
        id_info = id_token.verify_oauth2_token(
            token, 
            requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        google_user_id = id_info['sub']
        email = id_info['email']
        name = id_info.get('name', 'Usuario Google')
        
        # Lógica de base de datos (buscar o crear usuario y vincular)
        user = await get_or_create_google_user(google_user_id, email, name)
        
        # Generar tokens propios de AgroMAS
        access_token = create_jwt_access_token(user.id)
        return {"access_token": access_token, "user": user}
        
    except ValueError:
        raise HTTPException(status_code=401, detail="Token de Google inválido o expirado")
```

#### Ejemplo de Implementación en Node.js (Express):
```javascript
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.post('/api/v1/auth/google', async (req, res) => {
  const { id_token } = req.body;
  
  try {
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const googleId = payload['sub'];
    const email = payload['email'];
    const name = payload['name'];

    // Buscar o crear usuario en PostgreSQL
    const user = await findOrCreateGoogleUser({ googleId, email, name });
    const accessToken = generateJWT(user.id);
    
    return res.status(200).json({ access_token: accessToken, user });
  } catch (error) {
    return res.status(401).json({ error: 'Token de Google inválido' });
  }
});
```

---

### 4. `POST /api/v1/auth/refresh` (Rotación de Tokens)
* Lee el Refresh Token desde la cookie HttpOnly.
* Valida que no esté revocado en la tabla `refresh_tokens`.
* Emite un nuevo Access Token y rota el Refresh Token para máxima seguridad.

### 5. `GET /api/v1/users/me` (Perfil del Usuario Autenticado)
* **Headers**: `Authorization: Bearer <access_token>`
* Devuelve los datos del usuario logueado y la lista de sus establecimientos asociados.

---

## 🔒 3. Buenas Prácticas de Seguridad Implementadas

1. **Hasheo de Contraseñas**: Nunca almacenar contraseñas en texto plano. Utilizar siempre `Argon2id` o `bcrypt` con un factor de trabajo adecuado.
2. **Tokens en Cookies Seguras**: El `Refresh Token` debe enviarse en una cookie con los atributos:
   * `HttpOnly = true` (previene ataques XSS / robo de token por JavaScript).
   * `Secure = true` (solo se transmite por HTTPS).
   * `SameSite = Strict` o `Lax` (protege contra ataques CSRF).
3. **CORS (Cross-Origin Resource Sharing)**: Configurar en el backend para permitir únicamente el origen del frontend (ej. `http://localhost:3000` en desarrollo y `https://tu-dominio-pfi.com` en producción).
4. **Vinculación con WhatsApp (RAG)**: El campo `phone_whatsapp` es la clave que utilizarán tus Agentes del Sistema Multi-Agente (MAS) para identificar qué usuario está interactuando a través de la API de WhatsApp Cloud / Twilio y responder consultas sobre sus lotes específicos.

---

## ⚙️ 4. Variables de Entorno Necesarias (.env)

### En el Frontend Next.js (`frontend_PFI_Ferreyra_Fredes/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=tu-google-client-id.apps.googleusercontent.com
```

### En tu Servidor Backend (`.env`):
```env
PORT=8000
DATABASE_URL=postgresql://usuario:password@localhost:5432/agromas_db
JWT_SECRET=clave_secreta_super_segura_de_al_menos_32_caracteres_12345
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=tu-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-google-client-secret
```
