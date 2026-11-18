const favoriteService = require('../services/favorite.service');
const { asyncHandler } = require('../utils/errors');

/**
 * GET /api/favorites
 */
const listFavorites = asyncHandler(async (req, res) => {
  const favorites = await favoriteService.listFavorites(req.auth.id);

  res.status(200).json({
    status: 'ok',
    message:
      favorites.length === 0
        ? 'No tienes productos en favoritos'
        : 'Favoritos obtenidos correctamente',
    data: {
      count: favorites.length,
      favorites,
    },
  });
});

/**
 * POST /api/favorites
 */
const addFavorite = asyncHandler(async (req, res) => {
  const favorite = await favoriteService.addFavorite(req.auth.id, req.body);

  res.status(201).json({
    status: 'ok',
    message: 'Producto agregado a favoritos',
    data: { favorite },
  });
});

/**
 * DELETE /api/favorites/:productId
 */
const removeFavorite = asyncHandler(async (req, res) => {
  const result = await favoriteService.removeFavorite(
    req.auth.id,
    req.params.productId
  );

  res.status(200).json({
    status: 'ok',
    message: 'Producto eliminado de favoritos',
    data: result,
  });
});

module.exports = {
  listFavorites,
  addFavorite,
  removeFavorite,
};
