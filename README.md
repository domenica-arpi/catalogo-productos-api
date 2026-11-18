# Catálogo de Productos API

API REST académica para la gestión de un catálogo de productos y favoritos.

## Tecnologías

- Node.js
- Express
- PostgreSQL
- JWT *(pendiente de implementar)*
- bcrypt *(usado en el seed de datos de prueba; autenticación pendiente)*

## Estructura del proyecto

```text
catalogo-productos-api/
├── database/
│   └── schema.sql       # Creación de tablas (users, products, favorites)
├── scripts/
│   ├── migrate.js       # Aplica el esquema SQL
│   ├── seed.js          # Datos de prueba (contraseñas con bcrypt)
│   └── test-db.js       # Comprueba la conexión a PostgreSQL
├── src/
│   ├── config/
│   │   ├── index.js     # Variables de entorno
│   │   └── database.js  # Pool de conexión con pg
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
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

4. Edita `.env` con tus credenciales reales de PostgreSQL (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`).  
   No subas el archivo `.env` al repositorio.

## Base de datos

### 1. Crear la base de datos en PostgreSQL

Desde `psql` o tu cliente favorito:

```sql
CREATE DATABASE catalogo_productos;
```

Si usas el usuario `postgres` por defecto:

```bash
sudo -u postgres createdb catalogo_productos
```

### 2. Aplicar el esquema (tablas, claves y restricciones)

```bash
npm run db:migrate
```

Esto ejecuta `database/schema.sql` mediante la conexión de `src/config/database.js`.

### 3. (Opcional) Insertar datos de prueba

```bash
npm run db:seed
```

Las contraseñas de los usuarios demo se cifran con **bcrypt** al ejecutar el script (no se almacenan en texto plano en archivos SQL).

Credenciales locales de demo:

| Email | Contraseña | Rol |
| --- | --- | --- |
| `admin@example.com` | `Admin123!` | `admin` |
| `user@example.com` | `User123!` | `user` |

### 4. Verificar la conexión

```bash
npm run db:test
```

## Ejecución del servidor

Modo desarrollo:

```bash
npm run dev
```

Modo normal:

```bash
npm start
```

Por defecto: `http://localhost:3000`.

## Comprobar que el servidor funciona

```bash
curl http://localhost:3000/api/health
```

Respuesta esperada (ejemplo):

```json
{
  "status": "ok",
  "message": "El servidor está funcionando correctamente",
  "timestamp": "2026-11-18T23:00:00.000Z"
}
```

## Estado actual

Incluido hasta ahora:

- Estructura modular del backend
- Servidor Express y `GET /api/health`
- Conexión a PostgreSQL con `pg`
- Esquema SQL de `users`, `products` y `favorites`
- Scripts `db:migrate`, `db:seed` y `db:test`

Pendiente para siguientes etapas:

- Autenticación con JWT y bcrypt
- Endpoints de productos y favoritos
