const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError, asyncHandler } = require('../utils/errors');

/**
 * Extrae y verifica el JWT del encabezado Authorization: Bearer <token>.
 * Deja en req.auth la información firmada del token (id y rol).
 */
const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) {
    throw new AppError('Token no proporcionado', 401);
  }

  const token = header.slice('Bearer '.length).trim();

  if (!token) {
    throw new AppError('Token no proporcionado', 401);
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);

    if (!payload || payload.sub == null || !payload.role) {
      throw new AppError('Token inválido', 401);
    }

    req.auth = {
      id: Number(payload.sub),
      role: payload.role,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token expirado', 401);
    }

    throw new AppError('Token inválido', 401);
  }
});

module.exports = {
  authenticate,
};
