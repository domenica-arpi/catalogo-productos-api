/**
 * Inserta datos de prueba.
 * Las contraseñas se cifran con bcrypt en tiempo de ejecución
 * (nunca se guardan en texto plano en archivos SQL).
 *
 * Uso:
 *   npm run db:seed
 *
 * Credenciales locales de demo (solo desarrollo):
 *   admin@example.com / Admin123!
 *   user@example.com  / User123!
 */
const bcrypt = require('bcrypt');
const { testConnection, query, closePool } = require('../src/config/database');

const DEMO_USERS = [
  {
    name: 'Administrador Demo',
    email: 'admin@example.com',
    password: 'Admin123!',
    role: 'admin',
  },
  {
    name: 'Usuario Demo',
    email: 'user@example.com',
    password: 'User123!',
    role: 'user',
  },
];

const DEMO_PRODUCTS = [
  {
    name: 'Cuaderno universitario',
    description: 'Cuaderno de 100 hojas rayadas',
    price: 3.5,
    stock: 40,
  },
  {
    name: 'Bolígrafo azul',
    description: 'Bolígrafo de tinta gel',
    price: 1.25,
    stock: 120,
  },
  {
    name: 'Mochila ligera',
    description: 'Mochila para laptop de 15 pulgadas',
    price: 28.9,
    stock: 15,
  },
];

async function seed() {
  console.log('Comprobando conexión a PostgreSQL...');
  await testConnection();
  console.log('Conexión OK. Insertando datos de prueba...');

  const userIds = [];

  for (const user of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(user.password, 10);

    const result = await query(
      `
        INSERT INTO users (name, email, password, role)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO UPDATE
          SET name = EXCLUDED.name,
              password = EXCLUDED.password,
              role = EXCLUDED.role,
              updated_at = NOW()
        RETURNING id, email;
      `,
      [user.name, user.email, passwordHash, user.role]
    );

    userIds.push(result.rows[0].id);
    console.log(`Usuario listo: ${result.rows[0].email} (id=${result.rows[0].id})`);
  }

  const productIds = [];

  for (const product of DEMO_PRODUCTS) {
    const result = await query(
      `
        INSERT INTO products (name, description, price, stock)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (name) DO UPDATE
          SET description = EXCLUDED.description,
              price = EXCLUDED.price,
              stock = EXCLUDED.stock,
              updated_at = NOW()
        RETURNING id;
      `,
      [product.name, product.description, product.price, product.stock]
    );

    const productId = result.rows[0].id;
    productIds.push(productId);
    console.log(`Producto listo: ${product.name} (id=${productId})`);
  }

  // Un favorito de ejemplo: usuario demo → primer producto
  if (userIds[1] && productIds[0]) {
    await query(
      `
        INSERT INTO favorites (user_id, product_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, product_id) DO NOTHING;
      `,
      [userIds[1], productIds[0]]
    );
    console.log(
      `Favorito listo: user_id=${userIds[1]} → product_id=${productIds[0]}`
    );
  }

  console.log('Seed completado correctamente.');
}

seed()
  .catch((error) => {
    console.error('Error al insertar datos de prueba:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
