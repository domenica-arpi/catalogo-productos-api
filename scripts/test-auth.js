/**
 * Pruebas mínimas de autenticación y autorización JWT.
 *
 * Uso:
 *   npm run test:auth
 */
const http = require('http');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const config = require('../src/config');
const { closePool, testConnection } = require('../src/config/database');

const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const demoUser = {
  name: 'Usuario Prueba Auth',
  email: `auth.user.${suffix}@example.com`,
  password: 'Prueba123!',
};

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

async function request(baseUrl, method, path, { body, token } = {}) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
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

async function run() {
  console.log('Comprobando PostgreSQL...');
  await testConnection();
  console.log('Conexión OK.\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Servidor de prueba en ${baseUrl}\n`);

  try {
    console.log('1) Registro exitoso');
    const registerOk = await request(baseUrl, 'POST', '/api/auth/register', {
      body: demoUser,
    });
    assert(registerOk.status === 201, 'HTTP 201');
    assert(registerOk.body?.data?.user?.email === demoUser.email, 'email correcto');
    assert(registerOk.body?.data?.user?.role === 'user', 'rol user asignado');
    assert(
      registerOk.body?.data?.user?.password === undefined,
      'no expone password'
    );

    console.log('\n2) Registro con correo duplicado');
    const registerDup = await request(baseUrl, 'POST', '/api/auth/register', {
      body: demoUser,
    });
    assert(registerDup.status === 409, 'HTTP 409');

    console.log('\n3) Registro con datos inválidos');
    const registerInvalid = await request(baseUrl, 'POST', '/api/auth/register', {
      body: { name: '', email: 'correo-invalido', password: '123' },
    });
    assert(registerInvalid.status === 400, 'HTTP 400');

    console.log('\n3b) Intento de registrarse como admin (ignorado)');
    const registerAsAdmin = await request(baseUrl, 'POST', '/api/auth/register', {
      body: {
        name: 'Fake Admin',
        email: `fake.admin.${suffix}@example.com`,
        password: 'Prueba123!',
        role: 'admin',
      },
    });
    assert(registerAsAdmin.status === 201, 'HTTP 201');
    assert(registerAsAdmin.body?.data?.user?.role === 'user', 'rol forzado a user');

    console.log('\n4) Login exitoso');
    const loginOk = await request(baseUrl, 'POST', '/api/auth/login', {
      body: {
        email: demoUser.email,
        password: demoUser.password,
      },
    });
    assert(loginOk.status === 200, 'HTTP 200');
    assert(typeof loginOk.body?.data?.token === 'string', 'devuelve token');
    assert(loginOk.body?.data?.user?.password === undefined, 'login sin password');
    const userToken = loginOk.body.data.token;

    console.log('\n5) Login con credenciales incorrectas');
    const loginBad = await request(baseUrl, 'POST', '/api/auth/login', {
      body: {
        email: demoUser.email,
        password: 'clave-incorrecta',
      },
    });
    assert(loginBad.status === 401, 'HTTP 401');
    assert(
      loginBad.body?.message === 'Credenciales inválidas',
      'mensaje genérico'
    );

    console.log('\n6) GET /api/auth/me con token válido');
    const meOk = await request(baseUrl, 'GET', '/api/auth/me', {
      token: userToken,
    });
    assert(meOk.status === 200, 'HTTP 200');
    assert(meOk.body?.data?.user?.email === demoUser.email, 'devuelve el usuario');
    assert(meOk.body?.data?.user?.role === 'user', 'incluye rol');

    console.log('\n7) GET /api/auth/me sin token');
    const meNoToken = await request(baseUrl, 'GET', '/api/auth/me');
    assert(meNoToken.status === 401, 'HTTP 401');

    console.log('\n8) Token inválido o expirado');
    const meInvalid = await request(baseUrl, 'GET', '/api/auth/me', {
      token: 'token.invalido.aqui',
    });
    assert(meInvalid.status === 401, 'token inválido → 401');

    const expiredToken = jwt.sign(
      { sub: 1, role: 'user' },
      config.jwt.secret,
      { expiresIn: '1ms' }
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    const meExpired = await request(baseUrl, 'GET', '/api/auth/me', {
      token: expiredToken,
    });
    assert(meExpired.status === 401, 'token expirado → 401');

    console.log('\n9) Usuario normal no accede a ruta admin');
    const adminAsUser = await request(baseUrl, 'GET', '/api/admin/ping', {
      token: userToken,
    });
    assert(adminAsUser.status === 403, 'HTTP 403');

    console.log('\n10) Administrador sí accede a ruta admin');
    const adminLogin = await request(baseUrl, 'POST', '/api/auth/login', {
      body: {
        email: 'admin@example.com',
        password: 'Admin123!',
      },
    });

    if (adminLogin.status !== 200) {
      assert(false, 'login admin (ejecuta npm run db:seed antes)');
    } else {
      const adminPing = await request(baseUrl, 'GET', '/api/admin/ping', {
        token: adminLogin.body.data.token,
      });
      assert(adminPing.status === 200, 'HTTP 200');
      assert(
        adminPing.body?.message === 'Acceso de administrador concedido',
        'mensaje admin'
      );
    }

    console.log('\nExtra) Health sigue disponible');
    const health = await request(baseUrl, 'GET', '/api/health');
    assert(health.status === 200, 'GET /api/health → 200');
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await closePool();
  }

  console.log(`\nResultado: ${passed} PASS / ${failed} FAIL`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

run().catch(async (error) => {
  console.error('Error ejecutando pruebas de auth:', error);
  process.exitCode = 1;
  try {
    await closePool();
  } catch {
    // ignore
  }
});
