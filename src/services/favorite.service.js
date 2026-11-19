const { query } = require('../config/database');
const { AppError } = require('../utils/errors');
const {
  validateFavoriteInput,
  validateProductId,
} = require('../utils/validators');

/**
 * @param {Record<string, unknown>} row
 */
function toPublicFavorite(row) {
  return {
    id: row.id,
    productId: row.product_id,
    createdAt: row.created_at,
    product: {
      id: row.product_id,
      name: row.product_name,
      description: row.product_description,
      category: row.product_category,
      price: Number(row.product_price),
      stock: row.product_stock,
    },
  };
}

function isUniqueViolation(error) {
  return error && error.code === '23505';
}

function isForeignKeyViolation(error) {
  return error && error.code === '23503';
}

/**
 * Lista los favoritos del usuario autenticado con datos del producto.
 * @param {number} userId
 */
async function listFavorites(userId) {
  const result = await query(
    `
      SELECT
        f.id,
        f.product_id,
        f.created_at,
        p.name AS product_name,
        p.description AS product_description,
        p.category AS product_category,
        p.price AS product_price,
        p.stock AS product_stock
      FROM favorites f
      INNER JOIN products p ON p.id = f.product_id
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC, f.id DESC;
    `,
    [userId]
  );

  return result.rows.map(toPublicFavorite);
}

/**
 * Agrega un producto a los favoritos del usuario autenticado.
 * @param {number} userId
 * @param {unknown} body
 */
async function addFavorite(userId, body) {
  const { errors, value } = validateFavoriteInput(body);
  if (errors.length > 0) {
    throw new AppError(errors.join('. '), 400);
  }

  const productResult = await query(
    `
      SELECT id, name, description, category, price, stock
      FROM products
      WHERE id = $1
      LIMIT 1;
    `,
    [value.productId]
  );

  if (productResult.rows.length === 0) {
    throw new AppError('Producto no encontrado', 404);
  }

  try {
    const result = await query(
      `
        INSERT INTO favorites (user_id, product_id)
        VALUES ($1, $2)
        RETURNING id, product_id, created_at;
      `,
      [userId, value.productId]
    );

    const favorite = result.rows[0];
    const product = productResult.rows[0];

    return {
      id: favorite.id,
      productId: favorite.product_id,
      createdAt: favorite.created_at,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        category: product.category,
        price: Number(product.price),
        stock: product.stock,
      },
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError('El producto ya está en tus favoritos', 409);
    }
    if (isForeignKeyViolation(error)) {
      throw new AppError('Producto no encontrado', 404);
    }
    throw error;
  }
}

/**
 * Elimina un favorito del usuario autenticado por productId.
 * @param {number} userId
 * @param {unknown} rawProductId
 */
async function removeFavorite(userId, rawProductId) {
  const { errors, id: productId } = validateProductId(rawProductId);
  if (errors.length > 0) {
    throw new AppError(errors.join('. '), 400);
  }

  const result = await query(
    `
      DELETE FROM favorites
      WHERE user_id = $1
        AND product_id = $2
      RETURNING id, product_id;
    `,
    [userId, productId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Favorito no encontrado', 404);
  }

  return {
    id: result.rows[0].id,
    productId: result.rows[0].product_id,
  };
}

module.exports = {
  listFavorites,
  addFavorite,
  removeFavorite,
  toPublicFavorite,
};
