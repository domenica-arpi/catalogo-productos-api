const { Router } = require('express');
const favoriteController = require('../controllers/favorite.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = Router();

/**
 * Todos los endpoints de favoritos requieren JWT.
 * El userId se toma exclusivamente de req.auth (token).
 */
router.use(authenticate);

router.get('/', favoriteController.listFavorites);
router.post('/', favoriteController.addFavorite);
router.delete('/:productId', favoriteController.removeFavorite);

module.exports = router;
