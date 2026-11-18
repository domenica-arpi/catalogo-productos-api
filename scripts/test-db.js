/**
 * Verifica la conexión a PostgreSQL y lista las tablas del esquema.
 *
 * Uso:
 *   npm run db:test
 */
const { testConnection, query, closePool } = require('../src/config/database');
const config = require('../src/config');

async function testDb() {
  console.log(
    `Probando conexión → ${config.db.user}@${config.db.host}:${config.db.port}/${config.db.name}`
  );

  await testConnection();
  console.log('Conexión a PostgreSQL correcta.');

  const tables = await query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  if (tables.rows.length === 0) {
    console.log('No hay tablas todavía. Ejecuta: npm run db:migrate');
  } else {
    console.log('Tablas encontradas:');
    tables.rows.forEach((row) => console.log(` - ${row.table_name}`));
  }
}

testDb()
  .catch((error) => {
    console.error('No se pudo conectar a PostgreSQL:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
