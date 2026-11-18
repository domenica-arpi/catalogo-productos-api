const { query } = require('../config/database');

/**
 * Campos públicos del usuario (sin contraseña).
 * @param {Record<string, unknown>} row
 */
function toPublicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Busca un usuario por correo electrónico.
 * @param {string} email
 */
async function findByEmail(email) {
  const result = await query(
    `
      SELECT id, name, email, password, role, created_at, updated_at
      FROM users
      WHERE email = $1
      LIMIT 1;
    `,
    [email]
  );

  return result.rows[0] || null;
}

/**
 * Busca un usuario por id.
 * @param {number} id
 */
async function findById(id) {
  const result = await query(
    `
      SELECT id, name, email, password, role, created_at, updated_at
      FROM users
      WHERE id = $1
      LIMIT 1;
    `,
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Crea un usuario con rol fijo "user".
 * @param {{ name: string, email: string, passwordHash: string }} data
 */
async function createUser({ name, email, passwordHash }) {
  const result = await query(
    `
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, 'user')
      RETURNING id, name, email, role, created_at, updated_at;
    `,
    [name, email, passwordHash]
  );

  return result.rows[0];
}

module.exports = {
  toPublicUser,
  findByEmail,
  findById,
  createUser,
};
