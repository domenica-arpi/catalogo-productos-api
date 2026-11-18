/**
 * Pruebas mínimas de autenticación y autorización JWT.
 *
 * Uso:
 *   npm run test:auth
 */
const http = require('http');
const path = require('path');
const { spawnSync } = require('child_process');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const config = require('../src/config');
const { closePool, testConnection } = require('../src/config/database');
const {
  resolveJwtConfig,
  DEV_ONLY_JWT_SECRET,
} = require('../src/config');

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

async function request(baseUrl, method, pathName, options = {}) {
  const {
    body,
    token,
    rawBody,
    omitBody = false,
    contentType = 'application/json',
  } = options;

  const headers = {};

  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let payload;

  if (!omitBody) {
    if (rawBody !== undefined) {
      payload = rawBody;
    } else if (body !== undefined) {
      payload = JSON.stringify(body);
    }
  }

  const response = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers,
    body: payload,
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

function loadConfigInChild(envOverrides) {
  return spawnSync(
    process.execPath,
    ['-e', "require('./src/config'); console.log('CONFIG_OK');"],
    {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        ...envOverrides,
      },
      encoding: 'utf8',
    }
  );
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

    console.log('\n11) Registro sin cuerpo');
    const registerNoBody = await request(baseUrl, 'POST', '/api/auth/register', {
      omitBody: true,
      contentType: null,
    });
    assert(registerNoBody.status === 400, 'HTTP 400');
    assert(
      typeof registerNoBody.body?.message === 'string' &&
        registerNoBody.body.message.length > 0,
      'mensaje controlado'
    );
    assert(registerNoBody.status !== 500, 'no responde 500');

    console.log('\n12) Login sin cuerpo');
    const loginNoBody = await request(baseUrl, 'POST', '/api/auth/login', {
      omitBody: true,
      contentType: null,
    });
    assert(loginNoBody.status === 400, 'HTTP 400');
    assert(
      typeof loginNoBody.body?.message === 'string' &&
        loginNoBody.body.message.length > 0,
      'mensaje controlado'
    );
    assert(loginNoBody.status !== 500, 'no responde 500');

    console.log('\n13) Registro con cuerpo que no es objeto');
    const registerArrayBody = await request(baseUrl, 'POST', '/api/auth/register', {
      body: ['no', 'es', 'objeto'],
    });
    assert(registerArrayBody.status === 400, 'HTTP 400 (array)');
    assert(registerArrayBody.status !== 500, 'array no provoca 500');

    const registerStringBody = await request(baseUrl, 'POST', '/api/auth/register', {
      rawBody: '"texto-plano"',
    });
    assert(registerStringBody.status === 400, 'HTTP 400 (string JSON)');
    assert(registerStringBody.status !== 500, 'string no provoca 500');

    console.log('\n14) Producción sin JWT_SECRET');
    let missingThrew = false;
    try {
      resolveJwtConfig({
        nodeEnv: 'production',
        secretFromEnv: '',
        expiresInFromEnv: '1d',
      });
    } catch (error) {
      missingThrew = /JWT_SECRET/i.test(error.message);
    }
    assert(missingThrew, 'resolveJwtConfig lanza error sin secreto');

    const childMissing = loadConfigInChild({
      NODE_ENV: 'production',
      JWT_SECRET: '',
    });
    assert(childMissing.status !== 0, 'arranque producción sin JWT_SECRET falla');
    assert(!childMissing.stdout.includes('CONFIG_OK'), 'no carga config inválida');

    console.log('\n15) Producción con clave de ejemplo insegura');
    let insecureThrew = false;
    try {
      resolveJwtConfig({
        nodeEnv: 'production',
        secretFromEnv: 'cambia_este_secreto_por_uno_seguro',
        expiresInFromEnv: '1d',
      });
    } catch (error) {
      insecureThrew = /inseguro|ejemplo|JWT_SECRET/i.test(error.message);
    }
    assert(insecureThrew, 'rechaza secreto de ejemplo');

    const childInsecure = loadConfigInChild({
      NODE_ENV: 'production',
      JWT_SECRET: 'dev_secret_change_me',
    });
    assert(childInsecure.status !== 0, 'arranque con secreto de ejemplo falla');

    console.log('\n16) Inicio correcto con clave segura');
    const secureSecret = `secure-prod-secret-${'x'.repeat(40)}`;
    const secureConfig = resolveJwtConfig({
      nodeEnv: 'production',
      secretFromEnv: secureSecret,
      expiresInFromEnv: '2h',
    });
    assert(secureConfig.secret === secureSecret, 'acepta secreto seguro');
    assert(secureConfig.expiresIn === '2h', 'respeta JWT_EXPIRES_IN');

    const childSecure = loadConfigInChild({
      NODE_ENV: 'production',
      JWT_SECRET: secureSecret,
      JWT_EXPIRES_IN: '2h',
    });
    assert(childSecure.status === 0, 'arranque producción con secreto seguro OK');
    assert(childSecure.stdout.includes('CONFIG_OK'), 'config carga correctamente');

    console.log('\n17) Desarrollo puede usar fallback local identificado');
    const devFallback = resolveJwtConfig({
      nodeEnv: 'development',
      secretFromEnv: '',
      expiresInFromEnv: '1d',
    });
    assert(
      devFallback.secret === DEV_ONLY_JWT_SECRET,
      'fallback exclusivo de desarrollo'
    );
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
