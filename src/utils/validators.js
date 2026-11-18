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

/**
 * Normaliza y valida el cuerpo de creación/actualización de producto.
 * Campos requeridos: name, description, category, price (> 0).
 * stock es opcional (entero >= 0).
 * @param {unknown} body
 */
function validateProductInput(body) {
  const shapeErrors = getBodyShapeErrors(body);
  if (shapeErrors.length > 0) {
    return {
      errors: shapeErrors,
      value: {
        name: '',
        description: '',
        category: '',
        price: null,
        stock: 0,
      },
    };
  }

  const errors = [];
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description =
    typeof body.description === 'string' ? body.description.trim() : null;
  const category = typeof body.category === 'string' ? body.category.trim() : '';

  if (!name) {
    errors.push('El nombre es obligatorio');
  } else if (name.length > 150) {
    errors.push('El nombre no puede superar 150 caracteres');
  }

  if (description == null) {
    errors.push('La descripción es obligatoria y debe ser texto');
  }

  if (!category) {
    errors.push('La categoría es obligatoria');
  } else if (category.length > 100) {
    errors.push('La categoría no puede superar 100 caracteres');
  }

  let price = null;
  if (body.price === undefined || body.price === null || body.price === '') {
    errors.push('El precio es obligatorio');
  } else if (typeof body.price === 'boolean' || Array.isArray(body.price)) {
    errors.push('El precio debe ser un número mayor que cero');
  } else {
    const parsedPrice = Number(body.price);
    if (!Number.isFinite(parsedPrice)) {
      errors.push('El precio debe ser un número mayor que cero');
    } else if (!(parsedPrice > 0)) {
      errors.push('El precio debe ser estrictamente mayor que cero');
    } else {
      price = Math.round(parsedPrice * 100) / 100;
    }
  }

  let stock = 0;
  if (body.stock !== undefined && body.stock !== null && body.stock !== '') {
    if (typeof body.stock === 'boolean' || Array.isArray(body.stock)) {
      errors.push('El stock debe ser un entero mayor o igual a cero');
    } else {
      const parsedStock = Number(body.stock);
      if (!Number.isInteger(parsedStock) || parsedStock < 0) {
        errors.push('El stock debe ser un entero mayor o igual a cero');
      } else {
        stock = parsedStock;
      }
    }
  }

  return {
    errors,
    value: {
      name,
      description: description || '',
      category,
      price,
      stock,
    },
  };
}

/**
 * Valida el parámetro :id de producto.
 * @param {unknown} rawId
 */
function validateProductId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return { errors: ['El identificador del producto no es válido'], id: null };
  }
  return { errors: [], id };
}

/**
 * Valida el cuerpo para agregar un favorito.
 * Solo acepta productId; ignora cualquier userId del cliente.
 * @param {unknown} body
 */
function validateFavoriteInput(body) {
  const shapeErrors = getBodyShapeErrors(body);
  if (shapeErrors.length > 0) {
    return {
      errors: shapeErrors,
      value: { productId: null },
    };
  }

  const rawProductId =
    body.productId !== undefined ? body.productId : body.product_id;
  const { errors, id } = validateProductId(rawProductId);

  if (errors.length > 0 || rawProductId === undefined || rawProductId === null) {
    return {
      errors:
        errors.length > 0
          ? errors
          : ['El identificador del producto es obligatorio'],
      value: { productId: null },
    };
  }

  return {
    errors: [],
    value: { productId: id },
  };
}

module.exports = {
  EMAIL_REGEX,
  MIN_PASSWORD_LENGTH,
  getBodyShapeErrors,
  validateRegisterInput,
  validateLoginInput,
  validateProductInput,
  validateProductId,
  validateFavoriteInput,
};
