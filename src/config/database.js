const { Pool } = require('pg');
const config = require('./index');

/**
 * Pool de conexiones a PostgreSQL.
 * Reutiliza conexiones para consultas de la API.
 */
const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
});

pool.on('error', (error) => {
  console.error('Error inesperado en el pool de PostgreSQL:', error.message);
});

/**
 * Ejecuta una consulta SQL parametrizada.
 * @param {string} text
 * @param {unknown[]} [params]
 */
async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Obtiene un cliente del pool para transacciones.
 */
async function getClient() {
  return pool.connect();
}

/**
 * Comprueba que la base de datos responde.
 * @returns {Promise<boolean>}
 */
async function testConnection() {
  const client = await pool.connect();

  try {
    await client.query('SELECT 1');
    return true;
  } finally {
    client.release();
  }
}

/**
 * Cierra el pool (útil en scripts y apagado controlado).
 */
async function closePool() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  closePool,
};
