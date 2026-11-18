require('dotenv').config();

/**
 * Configuración centralizada de la aplicación.
 * Lee variables desde el entorno (.env).
 * La conexión a PostgreSQL se añadirá en una etapa posterior.
 */
const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'catalogo_productos',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
};

module.exports = config;
