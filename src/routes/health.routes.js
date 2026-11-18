const { Router } = require('express');
const { getHealth } = require('../controllers/health.controller');

const router = Router();

/**
 * GET /api/health
 * Ruta de prueba para verificar que el servidor responde.
 */
router.get('/', getHealth);

module.exports = router;
