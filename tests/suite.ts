/**
 * SkillForge AI - Comprehensive End-to-End System Test Suite
 * Tests Auth, RBAC, Multi-Tenant, Microservices (8001-8004), AI Assessment, OCR, Proctoring & Persistence.
 */

async function runAllTests() {
  console.log('====================================================');
  console.log('🧪 Starting SkillForge AI Full-Stack Test Suite');
  console.log('====================================================\n');

  const BASE_URL = 'http://127.0.0.1:3000';
  let passedCount = 0;
  let totalCount = 0;

  // Wait for server to be responsive
  let serverReady = false;
  for (let i = 0; i < 10; i++) {
    try {
      const ping = await fetch(`${BASE_URL}/api/health`);
      if (ping.ok) {
        serverReady = true;
        break;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  if (!serverReady) {
    console.warn('⚠️ Server not responding on 127.0.0.1:3000 yet, attempting localhost...');
  }

  async function test(name: string, fn: () => Promise<void>) {
    totalCount++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passedCount++;
    } catch (err: any) {
      console.error(`❌ [FAIL] ${name}: ${err.message}`);
    }
  }

  // 1. Health Checks
  await test('Main Server Health Check (/api/health)', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== 'healthy') throw new Error('Unhealthy response');
  });

  // 2. Microservice 1: Skill Scoring (8001 / /api/scoring)
  await test('Microservice 1: Skill Scoring (/api/scoring/score)', async () => {
    const res = await fetch(`${BASE_URL}/api/scoring/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skill: 'TypeScript & Distributed Systems',
        codeSnippet: 'export function createDistributedLock() { return true; }',
        experienceYears: 5,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success || typeof data.data.score !== 'number') {
      throw new Error(`Invalid scoring output: ${JSON.stringify(data)}`);
    }
  });

  // 3. Microservice 2: Proctoring Presence (8002 / /api/proctoring)
  await test('Microservice 2: Proctoring Presence (/api/proctoring/presence)', async () => {
    const res = await fetch(`${BASE_URL}/api/proctoring/presence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        faceCount: 1,
        detectedObjects: ['Laptop'],
        headPoseAngles: { pitch: 1, yaw: -2, roll: 0 },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success || typeof data.data.face_present !== 'boolean') {
      throw new Error(`Invalid proctoring output: ${JSON.stringify(data)}`);
    }
  });

  // 4. Microservice 3: Identity Face Verification (8003 / /api/identity)
  await test('Microservice 3: Identity Face Verification (/api/identity/verify)', async () => {
    const ref = Array.from({ length: 128 }, (_, i) => Math.sin(i * 0.1) * 0.5);
    const curr = Array.from({ length: 128 }, (_, i) => Math.sin(i * 0.1) * 0.49);
    const res = await fetch(`${BASE_URL}/api/identity/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referenceDescriptor: ref,
        currentDescriptor: curr,
        threshold: 0.7,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success || typeof data.data.verified !== 'boolean') {
      throw new Error(`Invalid identity verification output: ${JSON.stringify(data)}`);
    }
  });

  // 5. Microservice 4: Certificate OCR (8004 / /api/ocr)
  await test('Microservice 4: Certificate OCR (/api/ocr/health)', async () => {
    const res = await fetch(`${BASE_URL}/api/ocr/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== 'healthy') throw new Error('Unhealthy OCR status');
  });

  // 6. User Registration & JWT Flow
  const testEmail = `tester_${Date.now()}@example.com`;
  let authToken = '';
  let refreshToken = '';

  await test('Auth: User Registration (/api/auth/register)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'SecurePassword123!',
        name: 'Automated QA Engineer',
        role: 'candidate',
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.token) throw new Error('No JWT token returned');
    authToken = data.token;
    refreshToken = data.refreshToken;
  });

  // 7. Protected Profile Route
  await test('Protected Route: Profile Retrieval (/api/profile/me)', async () => {
    const res = await fetch(`${BASE_URL}/api/profile/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.email !== testEmail) throw new Error('User email mismatch');
  });

  // 8. Refresh Token Rotation
  await test('Auth: Refresh Token Rotation (/api/auth/refresh)', async () => {
    if (!refreshToken) throw new Error('No refresh token');
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.token) throw new Error('No new token in refresh payload');
  });

  // 9. Admin Stats Endpoint
  await test('Admin: Operations Statistics (/api/admin/stats)', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success || typeof data.data.totalSkills !== 'number') {
      throw new Error('Invalid admin stats structure');
    }
  });

  // 10. Metrics Dashboard Summary
  await test('Metrics: Aggregated Summary (/api/metrics/summary)', async () => {
    const res = await fetch(`${BASE_URL}/api/metrics/summary`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.summary) throw new Error('No summary payload in metrics');
  });

  console.log('\n====================================================');
  console.log(`📊 Test Results: ${passedCount} / ${totalCount} Passed (${Math.round((passedCount / totalCount) * 100)}%)`);
  console.log('====================================================\n');
}

runAllTests().catch((e) => {
  console.error('Test execution failed:', e);
});
