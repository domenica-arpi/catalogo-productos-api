const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError } = require('../utils/errors');
const {
  validateRegisterInput,
  validateLoginInput,
} = require('../utils/validators');
const userService = require('./user.service');

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Genera un JWT con id y rol del usuario.
 * @param {{ id: number, role: string }} user
 */
function generateToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiresIn,
    }
  );
}

/**
 * Registra un nuevo usuario con rol "user".
 * Ignora cualquier intento de autoasignarse rol admin.
 * @param {Record<string, unknown>} body
 */
async function register(body) {
  const { errors, value } = validateRegisterInput(body);

  if (errors.length > 0) {
    throw new AppError(errors.join('. '), 400);
  }

  const existing = await userService.findByEmail(value.email);
  if (existing) {
    throw new AppError('El correo electrónico ya está registrado', 409);
  }

  const passwordHash = await bcrypt.hash(value.password, BCRYPT_SALT_ROUNDS);
  const created = await userService.createUser({
    name: value.name,
    email: value.email,
    passwordHash,
  });

  return userService.toPublicUser(created);
}

/**
 * Autentica un usuario y emite un JWT.
 * @param {Record<string, unknown>} body
 */
async function login(body) {
  const { errors, value } = validateLoginInput(body);

  if (errors.length > 0) {
    throw new AppError(errors.join('. '), 400);
  }

  const user = await userService.findByEmail(value.email);
  if (!user) {
    throw new AppError('Credenciales inválidas', 401);
  }

  const passwordMatches = await bcrypt.compare(value.password, user.password);
  if (!passwordMatches) {
    throw new AppError('Credenciales inválidas', 401);
  }

  const token = generateToken(user);

  return {
    token,
    user: userService.toPublicUser(user),
  };
}

/**
 * Obtiene el perfil público del usuario autenticado.
 * @param {number} userId
 */
async function getAuthenticatedUser(userId) {
  const user = await userService.findById(userId);

  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }

  return userService.toPublicUser(user);
}

module.exports = {
  register,
  login,
  getAuthenticatedUser,
  generateToken,
};
