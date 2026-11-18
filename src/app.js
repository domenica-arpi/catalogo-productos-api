const express = require('express');
const cors = require('cors');
const routes = require('./routes');

/**
 * Configura y exporta la aplicación Express.
 * Separada de server.js para facilitar pruebas y organización.
 */
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.use((_req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Ruta no encontrada',
  });
});

module.exports = app;
