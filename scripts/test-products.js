/**
 * Pruebas de integración del CRUD de productos.
 *
 * Uso:
 *   npm run test:products
 */
const http = require('http');
const app = require('../src/app');
const { closePool, testConnection, query } = require('../src/config/database');

const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

let passed = 0;
let failed = 0;

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

async function login(baseUrl, email, password) {
  const result = await request(baseUrl, 'POST', '/api/auth/login', {
    body: { email, password },
  });
  return result;
}

async function run() {
  console.log('Comprobando PostgreSQL...');
  await testConnection();
  console.log('Conexión OK.\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Servidor de prueba en ${baseUrl}\n`);

  let adminToken = null;
  let userToken = null;
  let createdProductId = null;
  const uniqueName = `Producto Test ${suffix}`;

  try {
    const adminLogin = await login(baseUrl, 'admin@example.com', 'Admin123!');
    const userLogin = await login(baseUrl, 'user@example.com', 'User123!');
    assert(adminLogin.status === 200, 'login admin disponible (db:seed)');
    assert(userLogin.status === 200, 'login user disponible (db:seed)');
    adminToken = adminLogin.body?.data?.token;
    userToken = userLogin.body?.data?.token;

    console.log('\n1) Listado público de productos');
    const listPublic = await request(baseUrl, 'GET', '/api/products');
    assert(listPublic.status === 200, 'HTTP 200');
    assert(Array.isArray(listPublic.body?.data?.products), 'devuelve arreglo');
    assert(
      typeof listPublic.body?.data?.count === 'number',
      'incluye count'
    );

    const existingId = listPublic.body.data.products[0]?.id;
    assert(existingId != null, 'hay al menos un producto seed');

    console.log('\n2) Consulta pública de producto existente');
    const getOk = await request(baseUrl, 'GET', `/api/products/${existingId}`);
    assert(getOk.status === 200, 'HTTP 200');
    assert(getOk.body?.data?.product?.id === existingId, 'producto correcto');

    console.log('\n3) Consulta de producto inexistente');
    const getMissing = await request(baseUrl, 'GET', '/api/products/999999');
    assert(getMissing.status === 404, 'HTTP 404');

    console.log('\n4) Filtro por categoría');
    const filtered = await request(
      baseUrl,
      'GET',
      '/api/products?category=Electr%C3%B3nica'
    );
    assert(filtered.status === 200, 'HTTP 200');
    assert(Array.isArray(filtered.body?.data?.products), 'arreglo filtrado');
    assert(
      filtered.body.data.products.every(
        (product) => product.category.toLowerCase() === 'electrónica'
      ),
      'todos coinciden con la categoría'
    );

    console.log('\n5) Creación exitosa como administrador');
    const createOk = await request(baseUrl, 'POST', '/api/products', {
      token: adminToken,
      body: {
        name: uniqueName,
        description: 'Producto creado en prueba',
        category: 'Pruebas',
        price: 12.5,
        stock: 7,
      },
    });
    assert(createOk.status === 201, 'HTTP 201');
    createdProductId = createOk.body?.data?.product?.id;
    assert(createdProductId != null, 'devuelve id');
    assert(createOk.body.data.product.category === 'Pruebas', 'category guardada');
    assert(createOk.body.data.product.price === 12.5, 'price guardado');

    console.log('\n6) Actualización exitosa como administrador');
    const updateOk = await request(
      baseUrl,
      'PUT',
      `/api/products/${createdProductId}`,
      {
        token: adminToken,
        body: {
          name: `${uniqueName} Editado`,
          description: 'Descripción actualizada',
          category: 'Pruebas',
          price: 15.75,
          stock: 3,
        },
      }
    );
    assert(updateOk.status === 200, 'HTTP 200');
    assert(
      updateOk.body?.data?.product?.name === `${uniqueName} Editado`,
      'nombre actualizado'
    );
    assert(updateOk.body?.data?.product?.price === 15.75, 'precio actualizado');

    console.log('\n7) Eliminación exitosa como administrador');
    const disposable = await request(baseUrl, 'POST', '/api/products', {
      token: adminToken,
      body: {
        name: `Producto Borrar ${suffix}`,
        description: 'Temporal',
        category: 'Pruebas',
        price: 9.99,
      },
    });
    const disposableId = disposable.body?.data?.product?.id;
    const deleteOk = await request(
      baseUrl,
      'DELETE',
      `/api/products/${disposableId}`,
      { token: adminToken }
    );
    assert(deleteOk.status === 200, 'HTTP 200');
    const afterDelete = await request(
      baseUrl,
      'GET',
      `/api/products/${disposableId}`
    );
    assert(afterDelete.status === 404, 'ya no existe');

    console.log('\n8) Creación sin token → 401');
    const createNoToken = await request(baseUrl, 'POST', '/api/products', {
      body: {
        name: `Sin Token ${suffix}`,
        description: 'x',
        category: 'Pruebas',
        price: 1,
      },
    });
    assert(createNoToken.status === 401, 'HTTP 401');

    console.log('\n9) Actualización sin token → 401');
    const updateNoToken = await request(
      baseUrl,
      'PUT',
      `/api/products/${createdProductId}`,
      {
        body: {
          name: `${uniqueName} Editado`,
          description: 'x',
          category: 'Pruebas',
          price: 1,
        },
      }
    );
    assert(updateNoToken.status === 401, 'HTTP 401');

    console.log('\n10) Eliminación sin token → 401');
    const deleteNoToken = await request(
      baseUrl,
      'DELETE',
      `/api/products/${createdProductId}`
    );
    assert(deleteNoToken.status === 401, 'HTTP 401');

    console.log('\n11) Creación con usuario normal → 403');
    const createAsUser = await request(baseUrl, 'POST', '/api/products', {
      token: userToken,
      body: {
        name: `User Create ${suffix}`,
        description: 'x',
        category: 'Pruebas',
        price: 1,
      },
    });
    assert(createAsUser.status === 403, 'HTTP 403');

    console.log('\n12) Actualización con usuario normal → 403');
    const updateAsUser = await request(
      baseUrl,
      'PUT',
      `/api/products/${createdProductId}`,
      {
        token: userToken,
        body: {
          name: `${uniqueName} Editado`,
          description: 'x',
          category: 'Pruebas',
          price: 1,
        },
      }
    );
    assert(updateAsUser.status === 403, 'HTTP 403');

    console.log('\n13) Eliminación con usuario normal → 403');
    const deleteAsUser = await request(
      baseUrl,
      'DELETE',
      `/api/products/${createdProductId}`,
      { token: userToken }
    );
    assert(deleteAsUser.status === 403, 'HTTP 403');

    console.log('\n14) Rechazo de precio cero o negativo');
    const priceZero = await request(baseUrl, 'POST', '/api/products', {
      token: adminToken,
      body: {
        name: `Precio Cero ${suffix}`,
        description: 'x',
        category: 'Pruebas',
        price: 0,
      },
    });
    assert(priceZero.status === 400, 'precio 0 → 400');

    const priceNegative = await request(baseUrl, 'POST', '/api/products', {
      token: adminToken,
      body: {
        name: `Precio Negativo ${suffix}`,
        description: 'x',
        category: 'Pruebas',
        price: -5,
      },
    });
    assert(priceNegative.status === 400, 'precio negativo → 400');

    console.log('\n15) Rechazo de nombre o categoría vacíos');
    const emptyName = await request(baseUrl, 'POST', '/api/products', {
      token: adminToken,
      body: {
        name: '   ',
        description: 'x',
        category: 'Pruebas',
        price: 1,
      },
    });
    assert(emptyName.status === 400, 'nombre vacío → 400');

    const emptyCategory = await request(baseUrl, 'POST', '/api/products', {
      token: adminToken,
      body: {
        name: `Sin Categoria ${suffix}`,
        description: 'x',
        category: '',
        price: 1,
      },
    });
    assert(emptyCategory.status === 400, 'categoría vacía → 400');

    console.log('\n16) Rechazo de producto duplicado');
    const duplicate = await request(baseUrl, 'POST', '/api/products', {
      token: adminToken,
      body: {
        name: `${uniqueName} Editado`,
        description: 'duplicado',
        category: 'Pruebas',
        price: 2,
      },
    });
    assert(duplicate.status === 409, 'HTTP 409');

    console.log('\n17) Persistencia tras reiniciar el servidor');
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });

    const server2 = http.createServer(app);
    await new Promise((resolve) => server2.listen(0, '127.0.0.1', resolve));
    const port2 = server2.address().port;
    const baseUrl2 = `http://127.0.0.1:${port2}`;

    const persisted = await request(
      baseUrl2,
      'GET',
      `/api/products/${createdProductId}`
    );
    assert(persisted.status === 200, 'producto sigue existiendo');
    assert(
      persisted.body?.data?.product?.name === `${uniqueName} Editado`,
      'datos persistidos'
    );

    console.log('\n18) Integridad de favoritos al eliminar producto');
    const favProduct = await request(baseUrl2, 'POST', '/api/products', {
      token: adminToken,
      body: {
        name: `Producto Favorito Cascade ${suffix}`,
        description: 'para cascade',
        category: 'Pruebas',
        price: 4.5,
      },
    });
    const favProductId = favProduct.body?.data?.product?.id;
    const userRow = await query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1;`,
      ['user@example.com']
    );
    const userId = userRow.rows[0].id;

    await query(
      `
        INSERT INTO favorites (user_id, product_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, product_id) DO NOTHING;
      `,
      [userId, favProductId]
    );

    const favBefore = await query(
      `SELECT COUNT(*)::int AS count FROM favorites WHERE product_id = $1;`,
      [favProductId]
    );
    assert(favBefore.rows[0].count === 1, 'favorito creado');

    const deleteFavProduct = await request(
      baseUrl2,
      'DELETE',
      `/api/products/${favProductId}`,
      { token: adminToken }
    );
    assert(deleteFavProduct.status === 200, 'producto eliminado');

    const favAfter = await query(
      `SELECT COUNT(*)::int AS count FROM favorites WHERE product_id = $1;`,
      [favProductId]
    );
    assert(favAfter.rows[0].count === 0, 'favoritos en cascada eliminados');

    await new Promise((resolve, reject) => {
      server2.close((error) => (error ? reject(error) : resolve()));
    });
  } finally {
    // cleanup best-effort
    if (createdProductId) {
      try {
        await query(`DELETE FROM products WHERE id = $1;`, [createdProductId]);
      } catch {
        // ignore
      }
    }
    try {
      await query(`DELETE FROM products WHERE name LIKE $1;`, [
        `%${suffix}%`,
      ]);
    } catch {
      // ignore
    }
    await closePool();
  }

  console.log(`\nResultado: ${passed} PASS / ${failed} FAIL`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

run().catch(async (error) => {
  console.error('Error ejecutando pruebas de productos:', error);
  process.exitCode = 1;
  try {
    await closePool();
  } catch {
    // ignore
  }
});
