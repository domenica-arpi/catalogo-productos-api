const app = require('./app');
const config = require('./config');

/**
 * Punto de entrada del servidor.
 * Arranca Express en el puerto configurado.
 */
app.listen(config.port, () => {
  console.log(`Servidor escuchando en http://localhost:${config.port}`);
  console.log(`Entorno: ${config.nodeEnv}`);
  console.log(`Health check: http://localhost:${config.port}/api/health`);
});
