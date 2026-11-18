const config = require('../config');
const { AppError } = require('../utils/errors');

/**
 * Middleware 404 para rutas no registradas.
 */
function notFoundHandler(_req, res) {
  res.status(404).json({
    status: 'error',
    message: 'Ruta no encontrada',
  });
}

/**
 * Middleware centralizado de errores.
 */
function errorHandler(err, _req, res, _next) {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      status: 'error',
      message: 'JSON inválido en el cuerpo de la solicitud',
    });
  }

  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message =
    err instanceof AppError
      ? err.message
      : 'Error interno del servidor';

  if (!(err instanceof AppError) || statusCode >= 500) {
    console.error('Error no controlado:', err);
  }

  const payload = {
    status: 'error',
    message,
  };

  if (config.nodeEnv === 'development' && !(err instanceof AppError)) {
    payload.details = err.message;
  }

  res.status(statusCode).json(payload);
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
