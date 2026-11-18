const { Router } = require('express');
const productController = require('../controllers/product.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

const router = Router();

/**
 * GET /api/products
 * GET /api/products/:id   → públicos
 * POST/PUT/DELETE         → solo admin autenticado
 */
router.get('/', productController.listProducts);
router.get('/:id', productController.getProduct);

router.post(
  '/',
  authenticate,
  authorize('admin'),
  productController.createProduct
);

router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  productController.updateProduct
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  productController.deleteProduct
);

module.exports = router;
