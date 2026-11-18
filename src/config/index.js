require('dotenv').config();

/**
 * Secreto EXCLUSIVO DE DESARROLLO.
 * Nunca debe usarse en producción.
 */
const DEV_ONLY_JWT_SECRET = 'dev-only-insecure-jwt-secret';

/**
 * Valores de ejemplo / inseguros que no se aceptan en producción.
 * No son secretos reales; solo placeholders conocidos.
 */
const INSECURE_JWT_SECRETS = new Set([
  'dev_secret_change_me',
  'dev-only-insecure-jwt-secret',
  'cambia_este_secreto_por_uno_seguro',
  'changeme',
  'secret',
  'jwt_secret',
  'your_jwt_secret',
]);

const MIN_PRODUCTION_JWT_SECRET_LENGTH = 32;

/**
 * @param {string} secret
 * @returns {boolean}
 */
function isInsecureJwtSecret(secret) {
  if (typeof secret !== 'string') {
    return true;
  }

  const trimmed = secret.trim();
  if (!trimmed) {
    return true;
  }

  return INSECURE_JWT_SECRETS.has(trimmed.toLowerCase());
}

/**
 * Resuelve la configuración JWT según el entorno.
 * En producción exige JWT_SECRET seguro; en desarrollo puede usar un fallback local.
 *
 * @param {{ nodeEnv?: string, secretFromEnv?: string, expiresInFromEnv?: string }} [options]
 */
function resolveJwtConfig(options = {}) {
  const nodeEnv = options.nodeEnv || 'development';
  const expiresIn = options.expiresInFromEnv || '1d';
  const rawSecret =
    typeof options.secretFromEnv === 'string' ? options.secretFromEnv.trim() : '';

  if (nodeEnv === 'production') {
    if (!rawSecret) {
      throw new Error(
        'Configuración inválida: JWT_SECRET es obligatoria en producción.'
      );
    }

    if (isInsecureJwtSecret(rawSecret)) {
      throw new Error(
        'Configuración inválida: JWT_SECRET usa un valor de ejemplo o inseguro. Configura un secreto fuerte en producción.'
      );
    }

    if (rawSecret.length < MIN_PRODUCTION_JWT_SECRET_LENGTH) {
      throw new Error(
        `Configuración inválida: JWT_SECRET debe tener al menos ${MIN_PRODUCTION_JWT_SECRET_LENGTH} caracteres en producción.`
      );
    }

    return {
      secret: rawSecret,
      expiresIn,
    };
  }

  if (!rawSecret) {
    console.warn(
      '[config] JWT_SECRET no está definida. Usando secreto EXCLUSIVO DE DESARROLLO. No usar en producción.'
    );
    return {
      secret: DEV_ONLY_JWT_SECRET,
      expiresIn,
    };
  }

  if (isInsecureJwtSecret(rawSecret)) {
    console.warn(
      '[config] JWT_SECRET parece un valor de ejemplo. Solo es aceptable en desarrollo.'
    );
  }

  return {
    secret: rawSecret,
    expiresIn,
  };
}

/**
 * Configuración centralizada de la aplicación.
 * Lee variables desde el entorno (.env).
 * La conexión a PostgreSQL se gestiona en ./database.js.
 */
const nodeEnv = process.env.NODE_ENV || 'development';
const jwt = resolveJwtConfig({
  nodeEnv,
  secretFromEnv: process.env.JWT_SECRET,
  expiresInFromEnv: process.env.JWT_EXPIRES_IN,
});

const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'catalogo_productos',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
  jwt,
};

module.exports = config;
module.exports.resolveJwtConfig = resolveJwtConfig;
module.exports.isInsecureJwtSecret = isInsecureJwtSecret;
module.exports.DEV_ONLY_JWT_SECRET = DEV_ONLY_JWT_SECRET;
module.exports.MIN_PRODUCTION_JWT_SECRET_LENGTH = MIN_PRODUCTION_JWT_SECRET_LENGTH;
