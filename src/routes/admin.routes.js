const { Router } = require('express');
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

const router = Router();

/**
 * Ruta de prueba protegida por rol admin.
 * GET /api/admin/ping
 */
router.get(
  '/ping',
  authenticate,
  authorize('admin'),
  adminController.getAdminPing
);

module.exports = router;
