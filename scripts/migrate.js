/**
 * Aplica el esquema SQL (database/schema.sql) usando la conexión de pg.
 *
 * Uso:
 *   npm run db:migrate
 */
const fs = require('fs');
const path = require('path');
const { testConnection, query, closePool } = require('../src/config/database');
const config = require('../src/config');

async function migrate() {
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  console.log('Comprobando conexión a PostgreSQL...');
  console.log(
    `Host=${config.db.host} Port=${config.db.port} DB=${config.db.name} User=${config.db.user}`
  );

  await testConnection();
  console.log('Conexión OK.');

  console.log('Aplicando esquema desde database/schema.sql...');
  await query(schemaSql);

  const tablesResult = await query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('users', 'products', 'favorites')
    ORDER BY table_name;
  `);

  console.log(
    'Tablas disponibles:',
    tablesResult.rows.map((row) => row.table_name).join(', ')
  );
  console.log('Migración completada correctamente.');
}

migrate()
  .catch((error) => {
    console.error('Error al migrar la base de datos:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
