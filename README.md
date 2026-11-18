# Catálogo de Productos API

API REST académica para la gestión de un catálogo de productos y favoritos.

## Tecnologías

- Node.js
- Express
- PostgreSQL
- JWT (autenticación y autorización)
- bcrypt (cifrado de contraseñas)

## Estructura del proyecto

```text
catalogo-productos-api/
├── database/
│   └── schema.sql
├── scripts/
│   ├── migrate.js
│   ├── seed.js
│   ├── test-db.js
│   └── test-auth.js
├── src/
│   ├── config/
│   │   ├── index.js
│   │   └── database.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── admin.controller.js
│   │   └── health.controller.js
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   ├── role.middleware.js
│   │   └── error.middleware.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── admin.routes.js
│   │   ├── health.routes.js
│   │   └── index.js
│   ├── services/
│   │   ├── auth.service.js
│   │   └── user.service.js
│   ├── utils/
│   │   ├── errors.js
│   │   └── validators.js
│   ├── app.js
│   └── server.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Modelo relacional

- **users**: usuarios del sistema (`id`, `name`, `email`, `password` cifrada, `role`, fechas).
- **products**: catálogo (`id`, `name` único, `description`, `price`, `stock`, fechas).
- **favorites**: relación N:M entre usuarios y productos.
  - Claves foráneas a `users` y `products` con `ON DELETE CASCADE`.
  - Restricción `UNIQUE (user_id, product_id)` para evitar duplicados.

## Requisitos

- Node.js 18 o superior
- npm
- PostgreSQL 14 o superior

## Instalación

1. Clona el repositorio:

```bash
git clone https://github.com/domenica-arpi/catalogo-productos-api.git
cd catalogo-productos-api
```

2. Instala las dependencias:

```bash
npm install
```

3. Crea tu archivo de entorno a partir del ejemplo:

```bash
cp .env.example .env
```

4. Edita `.env` con tus valores reales. Variables relevantes:

| Variable | Descripción | Ejemplo |
| --- | --- | --- |
| `PORT` | Puerto del servidor | `3000` |
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_NAME` | Nombre de la base | `catalogo_productos` |
| `DB_USER` | Usuario de la base | `postgres` |
| `DB_PASSWORD` | Contraseña de la base | *(tu password local)* |
| `JWT_SECRET` | Clave secreta para firmar tokens | *(cadena larga y aleatoria)* |
| `JWT_EXPIRES_IN` | Expiración del token | `1d` |

No subas el archivo `.env` al repositorio (está en `.gitignore`).

## Base de datos

### 1. Crear la base de datos en PostgreSQL

```sql
CREATE DATABASE catalogo_productos;
```

o:

```bash
sudo -u postgres createdb catalogo_productos
```

### 2. Aplicar el esquema

```bash
npm run db:migrate
```

### 3. (Opcional) Insertar datos de prueba

```bash
npm run db:seed
```

| Email | Contraseña | Rol |
| --- | --- | --- |
| `admin@example.com` | `Admin123!` | `admin` |
| `user@example.com` | `User123!` | `user` |

### 4. Verificar la conexión

```bash
npm run db:test
```

## Autenticación y autorización

- Las contraseñas se cifran con **bcrypt** antes de guardarse.
- El registro público siempre asigna el rol `user` (no se puede autoasignar `admin`).
- Tras el login se emite un **JWT** firmado con `JWT_SECRET`.
- El token incluye `sub` (id de usuario) y `role`.
- Las rutas protegidas exigen `Authorization: Bearer <token>`.
- La autorización por roles revalida en PostgreSQL que el usuario exista y conserve ese rol.

### Endpoints de autenticación

#### `POST /api/auth/register`

Registro de usuario.

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ana Pérez",
    "email": "ana@example.com",
    "password": "Secreta123"
  }'
```

Respuesta `201`:

```json
{
  "status": "ok",
  "message": "Usuario registrado correctamente",
  "data": {
    "user": {
      "id": 3,
      "name": "Ana Pérez",
      "email": "ana@example.com",
      "role": "user",
      "createdAt": "2026-11-18T23:30:00.000Z",
      "updatedAt": "2026-11-18T23:30:00.000Z"
    }
  }
}
```

#### `POST /api/auth/login`

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ana@example.com",
    "password": "Secreta123"
  }'
```

Respuesta `200`:

```json
{
  "status": "ok",
  "message": "Inicio de sesión correcto",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 3,
      "name": "Ana Pérez",
      "email": "ana@example.com",
      "role": "user",
      "createdAt": "2026-11-18T23:30:00.000Z",
      "updatedAt": "2026-11-18T23:30:00.000Z"
    }
  }
}
```

Si las credenciales fallan, la API responde `401` con el mensaje genérico `Credenciales inválidas`.

#### `GET /api/auth/me`

Requiere token válido.

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

#### Ruta de prueba solo admin

```bash
curl http://localhost:3000/api/admin/ping \
  -H "Authorization: Bearer TOKEN_DE_ADMIN"
```

- Usuario `user` → `403`
- Usuario `admin` → `200`

### Uso del token en Postman

1. Ejecuta `POST /api/auth/login` y copia `data.token`.
2. En la petición protegida ve a **Authorization**.
3. Tipo: **Bearer Token**.
4. Pega el JWT en el campo **Token**.
5. Envía la solicitud (Postman añadirá `Authorization: Bearer ...`).

## Ejecución del servidor

```bash
npm run dev
```

o:

```bash
npm start
```

Por defecto: `http://localhost:3000`.

Comprobar salud:

```bash
curl http://localhost:3000/api/health
```

## Pruebas de autenticación

Asegúrate de tener la base migrada y, para la prueba de admin, el seed cargado:

```bash
npm run db:migrate
npm run db:seed
npm run test:auth
```

El script `scripts/test-auth.js` valida:

1. Registro exitoso
2. Correo duplicado
3. Datos inválidos / intento de registrarse como admin
4. Login exitoso
5. Credenciales incorrectas
6. `/api/auth/me` con token válido
7. Acceso sin token
8. Token inválido o expirado
9. Usuario normal bloqueado en ruta admin
10. Administrador autorizado en ruta admin

## Estado actual

Incluido hasta ahora:

- Estructura modular del backend
- Servidor Express y `GET /api/health`
- Conexión a PostgreSQL con `pg`
- Esquema SQL de `users`, `products` y `favorites`
- Autenticación JWT (`register`, `login`, `me`)
- Middlewares de autenticación y autorización por roles
- Ruta de prueba `GET /api/admin/ping`

Pendiente para siguientes etapas:

- CRUD de productos
- CRUD de favoritos
