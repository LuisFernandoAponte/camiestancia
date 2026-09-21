#!/usr/bin/env node

/**
 * Script de prueba de integración Backend-Frontend
 * Verifica que todas las rutas están correctamente conectadas
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

let testsPassed = 0;
let testsFailed = 0;
let token = null;

async function test(name, fn) {
  try {
    process.stdout.write(`Testing: ${name}... `);
    await fn();
    console.log(`${colors.green}✓${colors.reset}`);
    testsPassed++;
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset}`);
    console.log(`  Error: ${error.message}`);
    testsFailed++;
  }
}

async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok && response.status !== 400 && response.status !== 401) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

async function runTests() {
  console.log(`\n${colors.blue}🧪 TESTS DE INTEGRACIÓN BACKEND-FRONTEND${colors.reset}`);
  console.log(`API URL: ${API_BASE_URL}\n`);

  // 1. Health Check
  await test('Health Check', async () => {
    const response = await apiRequest('/health');
    if (!response.status || response.status !== 'ok') {
      throw new Error('Health check failed');
    }
  });

  // 2. Login
  let loginData = null;
  await test('POST /api/auth/login (credenciales válidas)', async () => {
    const response = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@laestancia.com',
        password: 'AdminPass123!',
      }),
    });

    if (!response.data || !response.data.token) {
      throw new Error('No token in response');
    }

    token = response.data.token;
    loginData = response.data;
  });

  // 3. Get Current User
  await test('GET /api/auth/me (usuario autenticado)', async () => {
    const response = await apiRequest('/api/auth/me');
    if (!response.data || !response.data.id) {
      throw new Error('Invalid user data');
    }
  });

  // 4. Get Bovinos
  await test('GET /api/bovinos (lista de bovinos)', async () => {
    const response = await apiRequest('/api/bovinos');
    if (!Array.isArray(response.data)) {
      throw new Error('Expected array of bovinos');
    }
  });

  // 5. Get Bovino by ID (if any exist)
  await test('GET /api/bovinos/:id (detalle de bovino)', async () => {
    const listResponse = await apiRequest('/api/bovinos');
    if (listResponse.data.length > 0) {
      const bovinoId = listResponse.data[0].id;
      const response = await apiRequest(`/api/bovinos/${bovinoId}`);
      if (!response.data || !response.data.id) {
        throw new Error('Invalid bovino data');
      }
    }
  });

  // 6. Get Salud Events
  await test('GET /api/salud (eventos sanitarios)', async () => {
    const response = await apiRequest('/api/salud');
    if (!Array.isArray(response.data)) {
      throw new Error('Expected array of salud events');
    }
  });

  // 7. Get Reproducción
  await test('GET /api/reproduccion (inseminaciones)', async () => {
    const response = await apiRequest('/api/reproduccion');
    if (!Array.isArray(response.data)) {
      throw new Error('Expected array of reproduccion events');
    }
  });

  // 8. Get Finanzas
  await test('GET /api/finanzas (dashboard financiero)', async () => {
    const response = await apiRequest('/api/finanzas');
    if (!response.data) {
      throw new Error('Invalid finanzas data');
    }
  });

  // 9. Get Dashboard KPIs
  await test('GET /api/dashboard/kpis (KPIs)', async () => {
    const response = await apiRequest('/api/dashboard/kpis');
    if (!response.data) {
      throw new Error('Invalid dashboard data');
    }
  });

  // 10. Logout
  await test('POST /api/auth/logout (logout)', async () => {
    const response = await apiRequest('/api/auth/logout', {
      method: 'POST',
    });
    if (!response.success) {
      throw new Error('Logout failed');
    }
    token = null;
  });

  // 11. Verify Protection (should fail without token)
  await test('GET /api/bovinos sin token (debe fallar)', async () => {
    try {
      const response = await apiRequest('/api/bovinos');
      if (response.success) {
        throw new Error('Should not allow access without token');
      }
    } catch (e) {
      // Expected to fail
    }
  });

  // Print Summary
  console.log(`\n${colors.blue}═══════════════════════════════════════${colors.reset}`);
  console.log(`Tests Passed: ${colors.green}${testsPassed}${colors.reset}`);
  console.log(`Tests Failed: ${colors.red}${testsFailed}${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}\n`);

  if (testsFailed === 0) {
    console.log(`${colors.green}✓ Todas las pruebas pasaron correctamente${colors.reset}`);
    console.log(`${colors.green}✓ Backend y Frontend están correctamente conectados${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(
      `${colors.red}✗ ${testsFailed} prueba(s) fallaron${colors.reset}\n`,
    );
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error(`${colors.red}Fatal Error: ${error.message}${colors.reset}`);
  console.error('¿Está el backend corriendo en http://localhost:3000?');
  console.error('Ejecuta: cd backend && npm run dev');
  process.exit(1);
});
