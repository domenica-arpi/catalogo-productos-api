const { Router } = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const productRoutes = require('./product.routes');

const router = Router();

/**
 * Agrupador de rutas de la API.
 */
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/products', productRoutes);

module.exports = router;
