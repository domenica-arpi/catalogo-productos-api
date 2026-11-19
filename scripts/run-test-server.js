/**
 * Servidor HTTP mínimo para pruebas de reinicio de proceso.
 * Escucha en PORT (obligatorio) y escribe READY cuando está listo.
 */
const app = require('../src/app');

const port = Number(process.env.PORT);

if (!Number.isInteger(port) || port <= 0) {
  console.error('PORT inválido para run-test-server');
  process.exit(1);
}

const server = app.listen(port, '127.0.0.1', () => {
  process.stdout.write(`READY pid=${process.pid} port=${port}\n`);
});

function shutdown() {
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
