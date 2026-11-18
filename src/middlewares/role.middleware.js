const userService = require('../services/user.service');
const { AppError, asyncHandler } = require('../utils/errors');

/**
 * Autoriza el acceso solo a los roles indicados.
 * No confía únicamente en el JWT: revalida existencia y rol en PostgreSQL.
 *
 * @param {...string} allowedRoles
 */
function authorize(...allowedRoles) {
  return asyncHandler(async (req, _res, next) => {
    if (!req.auth || req.auth.id == null) {
      throw new AppError('No autenticado', 401);
    }

    const user = await userService.findById(req.auth.id);

    if (!user) {
      throw new AppError('Usuario no encontrado o inactivo', 401);
    }

    if (!allowedRoles.includes(user.role)) {
      throw new AppError('No tienes permisos para acceder a este recurso', 403);
    }

    req.user = userService.toPublicUser(user);
    next();
  });
}

module.exports = {
  authorize,
};
