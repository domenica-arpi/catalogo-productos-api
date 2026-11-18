/**
 * Pruebas de integración del CRUD de favoritos.
 *
 * Uso:
 *   npm run test:favorites
 *
 * Limpia únicamente los registros creados por este script.
 */
const http = require('http');
const app = require('../src/app');
const { closePool, testConnection, query } = require('../src/config/database');

const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

const userA = {
  name: 'Usuario Favoritos A',
  email: `fav.a.${suffix}@example.com`,
  password: 'Favoritos123!',
};

const userB = {
  name: 'Usuario Favoritos B',
  email: `fav.b.${suffix}@example.com`,
  password: 'Favoritos123!',
};

let passed = 0;
let failed = 0;
const createdUserIds = [];
const createdFavoriteIds = [];

function assert(condition, label) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    console.error(`  FAIL  ${label}`);
  }
}

async function request(baseUrl, method, pathName, { body, token } = {}) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  return { status: response.status, body: json };
}

async function registerAndLogin(baseUrl, user) {
  const register = await request(baseUrl, 'POST', '/api/auth/register', {
    body: user,
  });
  if (register.status !== 201) {
    return { register, login: null, token: null, userId: null };
  }

  const userId = register.body?.data?.user?.id;
  if (userId) {
    createdUserIds.push(userId);
  }

  const login = await request(baseUrl, 'POST', '/api/auth/login', {
    body: { email: user.email, password: user.password },
  });

  return {
    register,
    login,
    token: login.body?.data?.token || null,
    userId,
  };
}

async function cleanup() {
  if (createdFavoriteIds.length > 0) {
    await query(`DELETE FROM favorites WHERE id = ANY($1::int[]);`, [
      createdFavoriteIds,
    ]);
  }

  if (createdUserIds.length > 0) {
    await query(`DELETE FROM favorites WHERE user_id = ANY($1::int[]);`, [
      createdUserIds,
    ]);
    await query(`DELETE FROM users WHERE id = ANY($1::int[]);`, [
      createdUserIds,
    ]);
  }
}

async function run() {
  console.log('Comprobando PostgreSQL...');
  await testConnection();
  console.log('Conexión OK.\n');

  const productsResult = await query(
    `
      SELECT id, name
      FROM products
      ORDER BY id ASC
      LIMIT 2;
    `
  );

  if (productsResult.rows.length < 2) {
    console.error('Se necesitan al menos 2 productos seed (npm run db:seed).');
    process.exitCode = 1;
    await closePool();
    return;
  }

  const productOne = productsResult.rows[0];
  const productTwo = productsResult.rows[1];

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Servidor de prueba en ${baseUrl}\n`);

  let tokenA = null;
  let tokenB = null;
  let userIdA = null;

  try {
    const authA = await registerAndLogin(baseUrl, userA);
    const authB = await registerAndLogin(baseUrl, userB);
    assert(authA.token != null, 'usuario A autenticado');
    assert(authB.token != null, 'usuario B autenticado');
    tokenA = authA.token;
    tokenB = authB.token;
    userIdA = authA.userId;

    console.log('\n1) Usuario autenticado agrega un favorito');
    const addOk = await request(baseUrl, 'POST', '/api/favorites', {
      token: tokenA,
      body: {
        productId: productOne.id,
        userId: 999999, // debe ignorarse
      },
    });
    assert(addOk.status === 201, 'HTTP 201');
    assert(addOk.body?.data?.favorite?.productId === productOne.id, 'productId correcto');
    assert(
      addOk.body?.data?.favorite?.product?.name === productOne.name,
      'incluye nombre del producto'
    );
    if (addOk.body?.data?.favorite?.id) {
      createdFavoriteIds.push(addOk.body.data.favorite.id);
    }

    console.log('\n2) Usuario consulta su lista de favoritos');
    const listA = await request(baseUrl, 'GET', '/api/favorites', {
      token: tokenA,
    });
    assert(listA.status === 200, 'HTTP 200');
    assert(Array.isArray(listA.body?.data?.favorites), 'devuelve arreglo');
    assert(
      listA.body.data.favorites.some((item) => item.productId === productOne.id),
      'incluye el favorito agregado'
    );
    assert(
      listA.body.data.favorites.every(
        (item) =>
          item.product &&
          item.product.name != null &&
          item.product.category != null &&
          item.product.price != null
      ),
      'incluye datos del producto'
    );

    console.log('\n3) Usuario elimina un favorito correctamente');
    const addTemp = await request(baseUrl, 'POST', '/api/favorites', {
      token: tokenA,
      body: { productId: productTwo.id },
    });
    assert(addTemp.status === 201, 'favorito temporal creado');
    if (addTemp.body?.data?.favorite?.id) {
      createdFavoriteIds.push(addTemp.body.data.favorite.id);
    }

    const removeOk = await request(
      baseUrl,
      'DELETE',
      `/api/favorites/${productTwo.id}`,
      { token: tokenA }
    );
    assert(removeOk.status === 200, 'HTTP 200');
    const listAfterRemove = await request(baseUrl, 'GET', '/api/favorites', {
      token: tokenA,
    });
    assert(
      !listAfterRemove.body.data.favorites.some(
        (item) => item.productId === productTwo.id
      ),
      'ya no aparece en la lista'
    );

    console.log('\n4) No se permite agregar dos veces el mismo producto');
    const duplicate = await request(baseUrl, 'POST', '/api/favorites', {
      token: tokenA,
      body: { productId: productOne.id },
    });
    assert(duplicate.status === 409, 'HTTP 409');

    console.log('\n5) No se permite agregar un producto inexistente');
    const missingProduct = await request(baseUrl, 'POST', '/api/favorites', {
      token: tokenA,
      body: { productId: 999999 },
    });
    assert(missingProduct.status === 404, 'HTTP 404');

    console.log('\n6) No se permite consultar favoritos sin token');
    const listNoToken = await request(baseUrl, 'GET', '/api/favorites');
    assert(listNoToken.status === 401, 'HTTP 401');

    console.log('\n7) No se permite agregar favoritos sin token');
    const addNoToken = await request(baseUrl, 'POST', '/api/favorites', {
      body: { productId: productOne.id },
    });
    assert(addNoToken.status === 401, 'HTTP 401');

    console.log('\n8) No se permite eliminar favoritos sin token');
    const deleteNoToken = await request(
      baseUrl,
      'DELETE',
      `/api/favorites/${productOne.id}`
    );
    assert(deleteNoToken.status === 401, 'HTTP 401');

    console.log('\n9) Usuario A no puede consultar favoritos de usuario B');
    const listB = await request(baseUrl, 'GET', '/api/favorites', {
      token: tokenB,
    });
    assert(listB.status === 200, 'HTTP 200 para B');
    assert(
      !listB.body.data.favorites.some((item) => item.productId === productOne.id),
      'B no ve el favorito de A'
    );
    assert(listB.body.data.count === 0, 'lista de B vacía');

    console.log('\n10) Usuario A no puede eliminar favoritos de usuario B');
    // B agrega su propio favorito
    const addForB = await request(baseUrl, 'POST', '/api/favorites', {
      token: tokenB,
      body: { productId: productTwo.id },
    });
    assert(addForB.status === 201, 'B agrega favorito');
    if (addForB.body?.data?.favorite?.id) {
      createdFavoriteIds.push(addForB.body.data.favorite.id);
    }

    // A intenta borrar el productTwo de "sus" favoritos (no lo tiene) → 404
    // Esto demuestra aislamiento: A no elimina el de B
    const deleteAsA = await request(
      baseUrl,
      'DELETE',
      `/api/favorites/${productTwo.id}`,
      { token: tokenA }
    );
    assert(deleteAsA.status === 404, 'A obtiene 404 (no es su favorito)');

    const stillForB = await request(baseUrl, 'GET', '/api/favorites', {
      token: tokenB,
    });
    assert(
      stillForB.body.data.favorites.some(
        (item) => item.productId === productTwo.id
      ),
      'el favorito de B sigue existiendo'
    );

    console.log('\n11) Los favoritos persisten tras reiniciar la aplicación');
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });

    const server2 = http.createServer(app);
    await new Promise((resolve) => server2.listen(0, '127.0.0.1', resolve));
    const port2 = server2.address().port;
    const baseUrl2 = `http://127.0.0.1:${port2}`;

    const persisted = await request(baseUrl2, 'GET', '/api/favorites', {
      token: tokenA,
    });
    assert(persisted.status === 200, 'HTTP 200 tras reinicio');
    assert(
      persisted.body.data.favorites.some(
        (item) => item.productId === productOne.id
      ),
      'favorito de A persistido'
    );

    console.log('\n12) Códigos HTTP de error correspondientes');
    const invalidId = await request(baseUrl2, 'POST', '/api/favorites', {
      token: tokenA,
      body: { productId: 'abc' },
    });
    assert(invalidId.status === 400, 'id inválido → 400');

    const deleteMissing = await request(
      baseUrl2,
      'DELETE',
      '/api/favorites/999999',
      { token: tokenA }
    );
    assert(deleteMissing.status === 404, 'favorito inexistente → 404');

    const invalidToken = await request(baseUrl2, 'GET', '/api/favorites', {
      token: 'token.invalido',
    });
    assert(invalidToken.status === 401, 'token inválido → 401');

    // Confirmar aislamiento en BD: el favorito de A pertenece a userIdA
    const ownership = await query(
      `
        SELECT user_id
        FROM favorites
        WHERE user_id = $1 AND product_id = $2
        LIMIT 1;
      `,
      [userIdA, productOne.id]
    );
    assert(ownership.rows.length === 1, 'favorito de A ligado a su user_id JWT');

    await new Promise((resolve, reject) => {
      server2.close((error) => (error ? reject(error) : resolve()));
    });
  } finally {
    try {
      await cleanup();
    } catch (error) {
      console.error('Aviso: limpieza parcial de favoritos/usuarios de prueba:', error.message);
    }
    await closePool();
  }

  console.log(`\nResultado: ${passed} PASS / ${failed} FAIL`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

run().catch(async (error) => {
  console.error('Error ejecutando pruebas de favoritos:', error);
  process.exitCode = 1;
  try {
    await cleanup();
  } catch {
    // ignore
  }
  try {
    await closePool();
  } catch {
    // ignore
  }
});
