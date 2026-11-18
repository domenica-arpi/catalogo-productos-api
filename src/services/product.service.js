const { query } = require('../config/database');
const { AppError } = require('../utils/errors');
const {
  validateProductInput,
  validateProductId,
} = require('../utils/validators');

/**
 * @param {Record<string, unknown>} row
 */
function toPublicProduct(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    price: Number(row.price),
    stock: row.stock,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isUniqueViolation(error) {
  return error && error.code === '23505';
}

/**
 * Lista productos, opcionalmente filtrados por categoría.
 * @param {{ category?: string }} [filters]
 */
async function listProducts(filters = {}) {
  const category =
    typeof filters.category === 'string' ? filters.category.trim() : '';

  let result;

  if (category) {
    result = await query(
      `
        SELECT id, name, description, category, price, stock, created_at, updated_at
        FROM products
        WHERE category ILIKE $1
        ORDER BY id ASC;
      `,
      [category]
    );
  } else {
    result = await query(
      `
        SELECT id, name, description, category, price, stock, created_at, updated_at
        FROM products
        ORDER BY id ASC;
      `
    );
  }

  return result.rows.map(toPublicProduct);
}

/**
 * Obtiene un producto por id.
 * @param {unknown} rawId
 */
async function getProductById(rawId) {
  const { errors, id } = validateProductId(rawId);
  if (errors.length > 0) {
    throw new AppError(errors.join('. '), 400);
  }

  const result = await query(
    `
      SELECT id, name, description, category, price, stock, created_at, updated_at
      FROM products
      WHERE id = $1
      LIMIT 1;
    `,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Producto no encontrado', 404);
  }

  return toPublicProduct(result.rows[0]);
}

/**
 * Crea un producto.
 * @param {unknown} body
 */
async function createProduct(body) {
  const { errors, value } = validateProductInput(body);
  if (errors.length > 0) {
    throw new AppError(errors.join('. '), 400);
  }

  try {
    const result = await query(
      `
        INSERT INTO products (name, description, category, price, stock)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, description, category, price, stock, created_at, updated_at;
      `,
      [value.name, value.description, value.category, value.price, value.stock]
    );

    return toPublicProduct(result.rows[0]);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError('Ya existe un producto con ese nombre', 409);
    }
    throw error;
  }
}

/**
 * Actualiza un producto existente (PUT completo).
 * @param {unknown} rawId
 * @param {unknown} body
 */
async function updateProduct(rawId, body) {
  const { errors: idErrors, id } = validateProductId(rawId);
  if (idErrors.length > 0) {
    throw new AppError(idErrors.join('. '), 400);
  }

  const { errors, value } = validateProductInput(body);
  if (errors.length > 0) {
    throw new AppError(errors.join('. '), 400);
  }

  try {
    const result = await query(
      `
        UPDATE products
        SET name = $1,
            description = $2,
            category = $3,
            price = $4,
            stock = $5,
            updated_at = NOW()
        WHERE id = $6
        RETURNING id, name, description, category, price, stock, created_at, updated_at;
      `,
      [
        value.name,
        value.description,
        value.category,
        value.price,
        value.stock,
        id,
      ]
    );

    if (result.rows.length === 0) {
      throw new AppError('Producto no encontrado', 404);
    }

    return toPublicProduct(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (isUniqueViolation(error)) {
      throw new AppError('Ya existe un producto con ese nombre', 409);
    }
    throw error;
  }
}

/**
 * Elimina un producto por id.
 * @param {unknown} rawId
 */
async function deleteProduct(rawId) {
  const { errors, id } = validateProductId(rawId);
  if (errors.length > 0) {
    throw new AppError(errors.join('. '), 400);
  }

  const result = await query(
    `
      DELETE FROM products
      WHERE id = $1
      RETURNING id;
    `,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Producto no encontrado', 404);
  }

  return { id: result.rows[0].id };
}

module.exports = {
  toPublicProduct,
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
