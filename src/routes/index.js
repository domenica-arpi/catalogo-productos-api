const { Router } = require('express');
const healthRoutes = require('./health.routes');

const router = Router();

/**
 * Agrupador de rutas de la API.
 * Aquí se registrarán más módulos (auth, productos, favoritos, etc.).
 */
router.use('/health', healthRoutes);

module.exports = router;
