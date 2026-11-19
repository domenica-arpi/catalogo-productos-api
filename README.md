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
│   ├── test-auth.js
│   ├── test-products.js
│   ├── test-favorites.js
│   └── run-test-server.js
├── postman/
│   ├── Catalogo-Productos-API.postman_collection.json
│   └── Catalogo-Productos-API.postman_environment.json
├── src/
│   ├── config/
│   │   ├── index.js
│   │   └── database.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── admin.controller.js
│   │   ├── product.controller.js
│   │   ├── favorite.controller.js
│   │   └── health.controller.js
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   ├── role.middleware.js
│   │   └── error.middleware.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── admin.routes.js
│   │   ├── product.routes.js
│   │   ├── favorite.routes.js
│   │   ├── health.routes.js
│   │   └── index.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── user.service.js
│   │   ├── product.service.js
│   │   └── favorite.service.js
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
- **products**: catálogo (`id`, `name` único, `description`, `category`, `price` > 0, `stock`, fechas).
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
| `JWT_SECRET` | Clave secreta para firmar tokens | *(cadena larga y aleatoria, ≥ 32 caracteres en producción)* |
| `JWT_EXPIRES_IN` | Expiración del token | `1d` |

En **producción** (`NODE_ENV=production`) la API **no arranca** si `JWT_SECRET` falta, es demasiado corta o coincide con un valor de ejemplo/inseguro.  
En **desarrollo**, si no defines `JWT_SECRET`, se usa un fallback local claramente marcado como exclusivo de desarrollo (con aviso en consola).

No subas el archivo `.env` al repositorio (está en `.gitignore`). No documentes ni registres en logs el valor real del secreto.

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

La migración es idempotente y **no modifica automáticamente** precios, stock ni otros datos de negocio.  
Si existen productos con `price <= 0`, la migración se aborta con un mensaje claro para corregirlos manualmente antes de aplicar `price > 0`.  
Solo rellena `category = 'General'` cuando la columna nueva viene en `NULL` (bases de etapas anteriores).

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

## CRUD de productos

| Método | Endpoint | Acceso |
| --- | --- | --- |
| `GET` | `/api/products` | Público |
| `GET` | `/api/products/:id` | Público |
| `POST` | `/api/products` | Solo `admin` (JWT) |
| `PUT` | `/api/products/:id` | Solo `admin` (JWT) |
| `DELETE` | `/api/products/:id` | Solo `admin` (JWT) |

### Query params

- `category` (opcional): filtra por categoría. Ejemplo: `/api/products?category=Electrónica`

### Códigos HTTP usados

| Código | Uso |
| --- | --- |
| `200` | Listado, detalle, actualización o eliminación correctos |
| `201` | Producto creado |
| `400` | Validación fallida (precio ≤ 0, campos vacíos, body inválido, id inválido) |
| `401` | Sin token o token inválido en operaciones admin |
| `403` | Usuario autenticado sin rol `admin` |
| `404` | Producto no encontrado |
| `409` | Nombre de producto duplicado |

### Ejemplos

Listar productos:

```bash
curl http://localhost:3000/api/products
curl "http://localhost:3000/api/products?category=Electrónica"
```

Crear producto (admin):

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teclado mecánico",
    "description": "Teclado con switches rojos",
    "category": "Electrónica",
    "price": 59.99,
    "stock": 10
  }'
```

Respuesta `201` (ejemplo):

```json
{
  "status": "ok",
  "message": "Producto creado correctamente",
  "data": {
    "product": {
      "id": 6,
      "name": "Teclado mecánico",
      "description": "Teclado con switches rojos",
      "category": "Electrónica",
      "price": 59.99,
      "stock": 10,
      "createdAt": "2026-11-18T23:40:00.000Z",
      "updatedAt": "2026-11-18T23:40:00.000Z"
    }
  }
}
```

Actualizar / eliminar:

```bash
curl -X PUT http://localhost:3000/api/products/6 \
  -H "Authorization: Bearer TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teclado mecánico RGB",
    "description": "Con iluminación",
    "category": "Electrónica",
    "price": 64.5,
    "stock": 8
  }'

curl -X DELETE http://localhost:3000/api/products/6 \
  -H "Authorization: Bearer TOKEN_ADMIN"
```

Errores frecuentes:

- Sin token en `POST/PUT/DELETE` → `401`
- Usuario normal → `403`
- Precio `0` o negativo → `400`
- Nombre duplicado → `409`
- Id inexistente → `404`

Campos requeridos en `POST`/`PUT`: `name`, `description`, `category`, `price` (> 0). `stock` es opcional (por defecto `0`).

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
11. Registro sin cuerpo → `400`
12. Login sin cuerpo → `400`
13. Registro con cuerpo no objeto → `400`
14. Producción sin `JWT_SECRET` → fallo de arranque
15. Producción con secreto de ejemplo → fallo de arranque
16. Producción con secreto seguro → arranque correcto

## Pruebas de productos

```bash
npm run db:migrate
npm run db:seed
npm run test:products
```

También puedes ejecutar autenticación + productos + favoritos:

```bash
npm test
```

El script `scripts/test-products.js` valida listado/detalle públicos, filtro por categoría, CRUD admin, rechazos `401`/`403`, validaciones, duplicados, persistencia tras reinicio e integridad `ON DELETE CASCADE` de favoritos.

## CRUD de favoritos

Todos los endpoints requieren autenticación JWT.  
El usuario se identifica **solo** desde el token (`req.auth.id`); cualquier `userId` en el cuerpo se ignora.

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `POST` | `/api/favorites` | Agregar un producto a favoritos |
| `GET` | `/api/favorites` | Listar favoritos del usuario autenticado |
| `DELETE` | `/api/favorites/:productId` | Quitar un producto de favoritos |

### Cuerpo de `POST /api/favorites`

```json
{
  "productId": 2
}
```

### Ejemplos

```bash
# Agregar
curl -X POST http://localhost:3000/api/favorites \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId": 2}'

# Listar
curl http://localhost:3000/api/favorites \
  -H "Authorization: Bearer TU_TOKEN"

# Eliminar
curl -X DELETE http://localhost:3000/api/favorites/2 \
  -H "Authorization: Bearer TU_TOKEN"
```

Respuesta de listado (ejemplo):

```json
{
  "status": "ok",
  "message": "Favoritos obtenidos correctamente",
  "data": {
    "count": 1,
    "favorites": [
      {
        "id": 1,
        "productId": 2,
        "createdAt": "2026-11-18T23:50:00.000Z",
        "product": {
          "id": 2,
          "name": "Bolígrafo azul",
          "description": "Bolígrafo de tinta gel",
          "category": "Papelería",
          "price": 1.25,
          "stock": 120
        }
      }
    ]
  }
}
```

### Códigos HTTP

| Código | Caso |
| --- | --- |
| `200` | Listado o eliminación correcta |
| `201` | Favorito agregado |
| `400` | `productId` inválido o ausente |
| `401` | Sin token o token inválido |
| `404` | Producto inexistente / favorito no encontrado para el usuario |
| `409` | El producto ya está en favoritos |
| `500` | Error interno (sin detalles sensibles) |

### Pruebas de favoritos

```bash
npm run db:migrate
npm run db:seed
npm run test:favorites
```

## Colección de Postman

Archivos listos para importar:

- `postman/Catalogo-Productos-API.postman_collection.json`
- `postman/Catalogo-Productos-API.postman_environment.json`

### Cómo importar

1. Abre Postman.
2. **Import** → selecciona ambos archivos JSON de la carpeta `postman/`.
3. En la esquina superior derecha, elige el entorno **Catalogo Productos API - Local**.

### Variables del entorno

| Variable | Uso | Valor inicial |
| --- | --- | --- |
| `baseUrl` | URL base de la API | `http://localhost:3000` |
| `token` | JWT activo (el que usan las solicitudes autenticadas) | *(vacío)* |
| `userToken` | Copia del JWT del usuario demo (`user`) | *(vacío)* |
| `adminToken` | Copia del JWT del administrador demo | *(vacío)* |
| `secondUserToken` | JWT del segundo usuario de prueba | *(vacío)* |
| `registerEmail` | Correo único generado al registrar | *(vacío)* |
| `secondUserEmail` | Correo único del segundo usuario | *(vacío)* |
| `productId` | ID de producto para detalle/update/delete | `1` |
| `favoriteProductId` | ID de producto para favoritos | `2` |
| `missingProductId` | ID inexistente para pruebas 404 | `999999` |

No se incluyen JWT reales ni secretos en el entorno. Las contraseñas de las solicitudes de ejemplo son las del seed/demo local documentadas aquí; no van como variables de entorno.

### Cómo configurar y ejecutar

1. Arranca la API localmente (`npm run db:migrate`, `npm run db:seed`, `npm start`).
2. Ajusta `baseUrl` si tu servidor no está en el puerto 3000.
3. En la carpeta **Autenticación**:
   - `Registrar usuario` genera un correo único en `registerEmail` (prerequest) y espera `201` con rol `user`.
   - `Iniciar sesión (usuario)` → guarda `token` y `userToken` (favoritos y `/me`).
   - `Iniciar sesión (administrador)` → guarda `token` y `adminToken` (Create/Update/Delete de productos).
   - `Registrar segundo usuario` + `Iniciar sesión (segundo usuario)` → para el escenario de favorito ajeno.
4. En **Productos**:
   - Listar / consultar / filtrar son públicos (sin JWT).
   - Crear / actualizar / eliminar requieren token de **administrador**.
   - Las pruebas negativas (precio inválido, campos vacíos, ID inexistente) también requieren admin salvo el GET 404.
5. En **Favoritos**:
   - Todas las solicitudes requieren JWT de usuario autenticado.
   - Usa `Iniciar sesión (usuario)` antes de probar esta carpeta.

### Alternar token de administrador y usuario

Las solicitudes autenticadas leen solo `{{token}}`.

1. Ejecuta `Iniciar sesión (administrador)` → `token` y `adminToken` quedan con el JWT admin.
2. Ejecuta las operaciones administrativas de productos.
3. Para volver al usuario normal:
   - vuelve a ejecutar `Iniciar sesión (usuario)`, **o**
   - en el entorno, copia el valor de `userToken` a `token`.
4. Del mismo modo, `secondUserToken` guarda el JWT del segundo usuario tras su login.

### Orden recomendado de ejecución

**Flujo feliz**

1. `Registrar usuario` (correo único; repetible).
2. `Iniciar sesión (usuario)` → token de usuario.
3. `Consultar usuario autenticado`.
4. `Listar productos` / `Consultar producto por ID` / `Filtrar por categoría`.
5. `Iniciar sesión (administrador)` → token admin.
6. `Crear producto` (guarda `productId`) → `Actualizar producto` → (opcional) `Eliminar producto`.
7. `Iniciar sesión (usuario)` de nuevo.
8. `Agregar favorito` → `Listar favoritos` → `Eliminar favorito`.

**Pruebas negativas de autenticación / autorización (conservadas)**

1. `Consultar usuario sin token` → `401`.
2. Con token de **usuario**: `Crear producto sin rol admin` → `403`.
3. `Crear producto sin token` → `401`.
4. `Listar favoritos sin token` → `401`.

**Pruebas negativas de productos** (después de `Iniciar sesión (administrador)`)

1. `Crear producto con precio cero` → `400`.
2. `Crear producto con precio negativo` → `400`.
3. `Crear producto con campos obligatorios vacíos` → `400`.
4. `Consultar producto inexistente` (`missingProductId`) → `404`.
5. `Actualizar producto inexistente` → `404`.
6. `Eliminar producto inexistente` → `404`.

**Pruebas negativas de favoritos** (después de `Iniciar sesión (usuario)`)

1. `Agregar favorito` (debe responder `201`; si ya existía, elimínalo antes o cambia `favoriteProductId`).
2. `Agregar favorito duplicado` → `409`.
3. `Agregar favorito de producto inexistente` → `404`.
4. Escenario de favorito ajeno (una sola corrida, sin datos previos):
   1. `Iniciar sesión (usuario)` → `userToken`.
   2. `Registrar segundo usuario`.
   3. `Iniciar sesión (segundo usuario)`.
   4. `Agregar favorito` (como segundo usuario, mismo `favoriteProductId`).
   5. `Iniciar sesión (usuario)` otra vez (token del seed).
   6. `Eliminar favorito de otro usuario` → `404`.

### Limpieza de datos de prueba

- Los registros con correos `postman.user.*@example.com` / `postman.second.*@example.com` son descartables; puedes dejarlos o borrar esas filas en `users` si quieres una BD limpia.
- Productos creados desde Postman (p. ej. categoría `Pruebas` o el creado en el flujo feliz) se pueden eliminar con `Eliminar producto` usando el `productId` guardado, o con el usuario admin vía SQL/seed.
- Favoritos de prueba: `Eliminar favorito` con el usuario dueño, o cambia `favoriteProductId` a un producto que aún no esté marcado.
- Tras una corrida, deja `token` / `userToken` / `adminToken` / `secondUserToken` vacíos si compartes el entorno exportado (no subas JWT).

### Limitación: JWT vencido

No hay una solicitud Postman de “token expirado” reproducible sin incrustar o generar un JWT firmado con `JWT_SECRET`. Eso expondría el secreto o no sería portable entre entornos. El caso sí está cubierto en `npm run test:auth` (firma un token con `expiresIn: '1ms'` en el servidor de pruebas).

### Qué endpoints requieren JWT / admin

| Endpoint | JWT | Rol |
| --- | --- | --- |
| `POST /api/auth/register` | No | — |
| `POST /api/auth/login` | No | — |
| `GET /api/auth/me` | Sí | cualquier autenticado |
| `GET /api/products` | No | público |
| `GET /api/products/:id` | No | público |
| `GET /api/products?category=` | No | público |
| `POST /api/products` | Sí | `admin` |
| `PUT /api/products/:id` | Sí | `admin` |
| `DELETE /api/products/:id` | Sí | `admin` |
| `GET /api/favorites` | Sí | cualquier autenticado |
| `POST /api/favorites` | Sí | cualquier autenticado |
| `DELETE /api/favorites/:productId` | Sí | cualquier autenticado |

La colección incluye scripts de prueba (Tests) para códigos HTTP, estructura de respuesta, restricción admin (`403`), errores `401`/`400`/`404`/`409` y registro repetible con correo único.

## Estado actual

Incluido hasta ahora:

- Estructura modular del backend
- Servidor Express y `GET /api/health`
- Conexión a PostgreSQL con `pg`
- Esquema SQL de `users`, `products` y `favorites`
- Autenticación JWT (`register`, `login`, `me`)
- Middlewares de autenticación y autorización por roles
- CRUD de productos con filtro por categoría
- CRUD de favoritos por usuario autenticado
- Colección y entorno de Postman documentados
