const authService = require('../services/auth.service');
const { asyncHandler } = require('../utils/errors');

/**
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);

  res.status(201).json({
    status: 'ok',
    message: 'Usuario registrado correctamente',
    data: { user },
  });
});

/**
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);

  res.status(200).json({
    status: 'ok',
    message: 'Inicio de sesión correcto',
    data: result,
  });
});

/**
 * GET /api/auth/me
 */
const me = asyncHandler(async (req, res) => {
  const user = await authService.getAuthenticatedUser(req.auth.id);

  res.status(200).json({
    status: 'ok',
    message: 'Usuario autenticado',
    data: { user },
  });
});

module.exports = {
  register,
  login,
  me,
};
