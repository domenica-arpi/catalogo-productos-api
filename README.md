# Catálogo de Productos API

API REST académica para la gestión de un catálogo de productos y favoritos.

## Tecnologías

- Node.js
- Express
- PostgreSQL *(pendiente de conectar)*
- JWT *(pendiente de implementar)*
- bcrypt *(pendiente de implementar)*

## Estructura del proyecto

```text
catalogo-productos-api/
├── src/
│   ├── config/          # Configuración (variables de entorno)
│   ├── controllers/     # Lógica de respuesta HTTP
│   ├── middlewares/     # Middlewares (auth, errores, etc.)
│   ├── models/          # Modelos / acceso a datos
│   ├── routes/          # Definición de rutas
│   ├── services/        # Lógica de negocio
│   ├── utils/           # Utilidades auxiliares
│   ├── app.js           # Configuración de Express
│   └── server.js        # Arranque del servidor
├── .env.example         # Plantilla de variables de entorno
├── .gitignore
├── package.json
└── README.md
```

## Requisitos

- Node.js 18 o superior
- npm

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

4. (Opcional) Ajusta `PORT` u otras variables en `.env`.

## Ejecución

Modo desarrollo (reinicio automático con nodemon):

```bash
npm run dev
```

Modo producción / ejecución normal:

```bash
npm start
```

Por defecto el servidor queda en `http://localhost:3000`.

## Comprobar que funciona

Abre en el navegador o con curl:

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

En esta etapa inicial el proyecto incluye:

- Estructura modular del backend
- Servidor Express básico
- Ruta de prueba `GET /api/health`

Pendiente para siguientes etapas:

- Conexión a PostgreSQL
- Autenticación con JWT y bcrypt
- Módulos de productos y favoritos
