// Offline integration: compile TypeScript in memory, never call real providers.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest } = require('next/server');

function load(relativePath, fetch) {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, require, fetch, Headers,
    process: { env: { AGENT_API_KEY: 'synthetic-api-key', NEXT_PUBLIC_API_URL: 'http://backend.test' } }, console,
  }, { filename: relativePath });
  return module.exports;
}

function request(body, authenticated = true) {
  return new NextRequest('http://frontend.test/api/agents/test', {
    method: 'POST', body: JSON.stringify(body),
    headers: authenticated ? { Authorization: 'Bearer synthetic-jwt' } : {},
  });
}

for (const name of ['analyze-irrigation', 'weather-compare']) {
  const source = `app/api/agents/${name}/route.ts`;
  test(`${name}: anonymous requests never invoke the service`, async () => {
    const api = load(source, async () => { throw new Error('No network call allowed'); });
    assert.equal((await api.POST(request({ field_id: 4 }, false))).status, 401);
  });
  test(`${name}: invalid lot identifiers never invoke the service`, async () => {
    const api = load(source, async () => { throw new Error('No network call allowed'); });
    for (const field_id of [undefined, null, 0, -1, 1.5, '4', true]) {
      assert.equal((await api.POST(request({ field_id }))).status, 422);
    }
  });
  test(`${name}: rejected membership does not spend the service API key`, async () => {
    const calls = [];
    const api = load(source, async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ detail: 'No membership' }), { status: 403 });
    });
    assert.equal((await api.POST(request({ field_id: 4 }))).status, 403);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'http://backend.test/api/v1/fields/4');
    assert.equal(calls[0].init.headers.Authorization, 'Bearer synthetic-jwt');
    assert.equal(calls[0].init.headers['X-API-Key'], undefined);
  });
  test(`${name}: authorized lot replaces arbitrary client geometry`, async () => {
    const authorized = { id: 4, name: 'Synthetic lot', crop_type: 'Maiz', irrigation_system: 'Pivote',
      center_latitude: -40, center_longitude: -63,
      geometry_geojson: { type: 'Polygon', coordinates: [[[-63, -40], [-63.01, -40], [-63, -40]]] } };
    const calls = [];
    const api = load(source, async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(calls.length === 1 ? authorized : { status: 'COMPLETED' }), { status: 200 });
    });
    assert.equal((await api.POST(request({ field_id: 4, latitude: 0, longitude: 0,
      geometry_geojson: { type: 'Invalid' }, crop_name: 'Invented crop' }))).status, 200);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].init.headers['X-API-Key'], 'synthetic-api-key');
    const submitted = JSON.parse(calls[1].init.body);
    assert.equal(submitted.latitude, -40);
    assert.equal(submitted.longitude, -63);
    assert.equal(submitted.crop_name, 'Maiz');
    assert.deepEqual(submitted.geometry_geojson, authorized.geometry_geojson);
    if (name === 'analyze-irrigation') assert.equal(submitted.use_persisted_irrigation_events, true);
  });
}

test('field payload does not invent initial zero water or a fixed crop coefficient', () => {
  const api = load('lib/api.ts', async () => { throw new Error('No network call allowed'); });
  const lot = { id: 4, name: 'Synthetic lot', crop_type: 'Maiz', irrigation_system: 'Pivote' };
  const serialized = JSON.parse(JSON.stringify(api.buildAnalyzePayload(lot)));
  assert.equal(serialized.field_id, 4);
  assert.equal('initial_available_water_mm' in serialized, false);
  assert.equal('crop_coefficient' in serialized, false);
  const known = api.buildAnalyzePayload(lot, { initialAvailableWaterMm: 0, cropCoefficient: 0.8 });
  assert.equal(known.initial_available_water_mm, 0);
  assert.equal(known.crop_coefficient, 0.8);
});

test('team writes do not fabricate success, members or invitations after HTTP rejection', async () => {
  const api = load('lib/api.ts', async () => new Response(JSON.stringify({ detail: 'Denied' }), { status: 403 }));
  assert.equal((await api.addTeamMemberApi({ email: 'synthetic@example.com', role: 'operator' })).ok, false);
  assert.equal(await api.updateTeamMemberRoleApi('synthetic-id', 'operator'), false);
  assert.equal(await api.removeTeamMemberApi('synthetic-id'), false);
  assert.equal((await api.resendInvitationApi('synthetic-id')).ok, false);
  assert.equal((await api.getTeamMembersApi()).length, 0);
});

test('team writes do not fabricate success after connection failure', async () => {
  const api = load('lib/api.ts', async () => { throw new Error('Synthetic offline'); });
  assert.equal((await api.addTeamMemberApi({ email: 'synthetic@example.com', role: 'operator' })).ok, false);
  assert.equal(await api.updateTeamMemberRoleApi('synthetic-id', 'operator'), false);
  assert.equal(await api.removeTeamMemberApi('synthetic-id'), false);
  assert.equal((await api.resendInvitationApi('synthetic-id')).ok, false);
});

test('empty real teams remain empty and successful response never invents a token', async () => {
  const api = load('lib/api.ts', async () => new Response(JSON.stringify([]), { status: 200 }));
  assert.equal((await api.getTeamMembersApi()).length, 0);
  const added = await api.addTeamMemberApi({ email: 'synthetic@example.com', role: 'operator' });
  assert.equal(added.invitation_url, undefined);
});

test('supervisor: anonymous and invalid requests never invoke the backend', async () => {
  const api = load('app/api/agents/supervisor-evaluate/route.ts', async () => { throw new Error('No network call allowed'); });
  assert.equal((await api.POST(request({ field_id: 4 }, false))).status, 401);
  for (const body of [null, [], {}, { field_id: null }, { field_id: '4' }, { field_id: 0 },
    { field_id: -1 }, { field_id: 1.5 }, { field_id: true }, { field_id: 4, max_steps: null },
    { field_id: 4, max_steps: 0 }, { field_id: 4, max_steps: 13 }, { field_id: 4, max_steps: '6' },
    { field_id: 4, max_steps: 2.5 }, { field_id: 4, objective: 'Unsafe client instructions' },
    { field_id: 4, latitude: -40 }, { field_id: 4, geometry_geojson: {} }]) {
    assert.equal((await api.POST(request(body))).status, 422, JSON.stringify(body));
  }
});

test('supervisor: membership rejection never passes the service key', async () => {
  const calls = [];
  const api = load('app/api/agents/supervisor-evaluate/route.ts', async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ detail: 'No membership' }), { status: 403 });
  });
  assert.equal((await api.POST(request({ field_id: 4 }))).status, 403);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'http://backend.test/api/v1/fields/4');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer synthetic-jwt');
  assert.equal(calls[0].init.headers['X-API-Key'], undefined);
});

test('supervisor: normal evaluation forwards only authorized field and bounded steps', async () => {
  for (const max_steps of [undefined, 1, 12]) {
    const calls = [];
    const api = load('app/api/agents/supervisor-evaluate/route.ts', async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(calls.length === 1 ? { id: 4 } : { mode: 'ACTIVE', field_id: 4 }), { status: 200 });
    });
    const response = await api.POST(request({ field_id: 4, max_steps }));
    assert.equal(response.status, 200);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].url, 'http://backend.test/agents/supervisor/evaluate');
    assert.deepEqual(JSON.parse(calls[1].init.body), { field_id: 4, max_steps: max_steps === undefined ? 6 : max_steps });
    assert.equal(calls[1].init.headers['X-API-Key'], 'synthetic-api-key');
    assert.equal(calls[1].init.headers.Authorization, undefined);
    assert.equal((await response.json()).mode, 'ACTIVE');
  }
});

test('supervisor client rejects shadow or mismatched evaluations instead of displaying them', async () => {
  for (const data of [{ mode: 'SHADOW', field_id: 4, status: 'COMPLETED', steps: [] },
    { mode: 'ACTIVE', field_id: 5, status: 'COMPLETED', steps: [] }, {}]) {
    const api = load('lib/api.ts', async () => new Response(JSON.stringify(data), { status: 200 }));
    api.setAccessToken('synthetic-jwt');
    assert.equal((await api.evaluateSupervisorApi(4)).ok, false);
  }
});

test('supervisor client shows canonical normal summary and preserves every warning', async () => {
  const result = { mode: 'ACTIVE', field_id: 4, status: 'COMPLETED', steps: [],
    conclusion: 'Synthetic deterministic conclusion', warnings: ['Unknown irrigation'],
    evidence_warnings: ['Initial soil water estimated'], knowledge_warnings: ['Bibliography not sufficient'],
    model_state_summary: { dr_mm: 3.03, afd_mm: 77, taw_mm: 140 } };
  const calls = [];
  const api = load('lib/api.ts', async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(result), { status: 200 });
  });
  api.setAccessToken('synthetic-jwt');
  const response = await api.evaluateSupervisorApi(4);
  assert.equal(response.ok, true);
  assert.deepEqual(JSON.parse(JSON.stringify(response.data)), result);
  assert.equal(calls[0].url, '/api/agents/supervisor-evaluate');
  assert.deepEqual(JSON.parse(calls[0].init.body), { field_id: 4, max_steps: 6 });
  assert.equal(calls[0].init.headers.Authorization, 'Bearer synthetic-jwt');
});
