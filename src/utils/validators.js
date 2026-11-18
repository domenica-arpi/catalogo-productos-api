const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;

/**
 * Comprueba que el cuerpo sea un objeto plano JSON (no null, array ni primitivo).
 * @param {unknown} body
 * @returns {string[]}
 */
function getBodyShapeErrors(body) {
  if (body == null) {
    return ['El cuerpo de la solicitud es obligatorio'];
  }

  if (typeof body !== 'object' || Array.isArray(body)) {
    return ['El cuerpo de la solicitud debe ser un objeto JSON'];
  }

  return [];
}

/**
 * Normaliza y valida los datos de registro.
 * @param {unknown} body
 */
function validateRegisterInput(body) {
  const shapeErrors = getBodyShapeErrors(body);
  if (shapeErrors.length > 0) {
    return {
      errors: shapeErrors,
      value: { name: '', email: '', password: '' },
    };
  }

  const errors = [];
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!name) {
    errors.push('El nombre es obligatorio');
  } else if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
    errors.push(`El nombre debe tener entre ${MIN_NAME_LENGTH} y ${MAX_NAME_LENGTH} caracteres`);
  }

  if (!email) {
    errors.push('El correo electrónico es obligatorio');
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push('El formato del correo electrónico no es válido');
  }

  if (!password) {
    errors.push('La contraseña es obligatoria');
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
  }

  return {
    errors,
    value: { name, email, password },
  };
}

/**
 * Normaliza y valida los datos de inicio de sesión.
 * @param {unknown} body
 */
function validateLoginInput(body) {
  const shapeErrors = getBodyShapeErrors(body);
  if (shapeErrors.length > 0) {
    return {
      errors: shapeErrors,
      value: { email: '', password: '' },
    };
  }

  const errors = [];
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email) {
    errors.push('El correo electrónico es obligatorio');
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push('El formato del correo electrónico no es válido');
  }

  if (!password) {
    errors.push('La contraseña es obligatoria');
  }

  return {
    errors,
    value: { email, password },
  };
}

module.exports = {
  EMAIL_REGEX,
  MIN_PASSWORD_LENGTH,
  getBodyShapeErrors,
  validateRegisterInput,
  validateLoginInput,
};
