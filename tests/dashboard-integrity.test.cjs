// Offline regressions: no production DB, browser network or AI providers.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(relativePath, dependencies = {}, fetch = async () => { throw new Error('No network allowed'); }) {
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const compiled = ts.transpileModule(source, { fileName: relativePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  const dependency = (name) => {
    if (Object.prototype.hasOwnProperty.call(dependencies, name)) return dependencies[name];
    if (name.startsWith('@/')) {
      const base = name.slice(2);
      const resolved = [base, base + '.ts', base + '.tsx', base + '/index.ts', base + '/index.tsx'].find(candidate => fs.existsSync(path.join(__dirname, '..', candidate)));
      if (resolved) return load(resolved, dependencies, fetch);
    }
    return require(name);
  };
  vm.runInNewContext(compiled, { module, exports: module.exports, require: dependency, fetch, Headers,
    process: { env: { NEXT_PUBLIC_API_URL: 'http://backend.test' } }, console,
  }, { filename: relativePath });
  return module.exports;
}

function contextApi() {
  return load('app/(dashboard)/context.tsx', {
    '@/lib/auth-context': {}, '@/lib/api': {},
    '@/lib/field-dates': { fieldDateString: () => '2026-10-08', shiftFieldDate: () => '2026-09-08' },
  });
}

function canonicalSnapshot() {
  return { is_stale: false, analyze_response: {
    date_to: '2026-10-08', action: 'NO_IRRIGATION', urgency: 'LOW',
    validation: { is_recommendation_safe: true, warnings: [] }, warnings: ['Initial water estimated'],
    recommendation: { status: 'COMPLETED', urgency: 'LOW', summary: 'Canonical model summary',
      metrics: { recommended_net_irrigation_mm: 0, recommended_gross_irrigation_mm: 0 },
      evidence: { balance_source: 'PERSISTED_HYDRIC_HISTORY', hydric_state_date: '2026-10-08',
        current_dr_mm: 3.03, current_au_mm: 136.97, current_raw_mm: 77, current_taw_mm: 140, current_kc: 0.8 },
      water_balance: { status: 'COMPLETED', metrics: { deficit_mm: 999, days_analyzed: 10,
        total_etc_mm: 40, total_et0_mm: 50, total_precipitation_mm: 70, irrigation_applied_mm: 20 } },
    }, ndvi_context: { status: 'COMPLETED', metrics: { ndvi_mean: 0 } },
  }, weather_compare_response: { evidence: { historical_only: false } } };
}

test('missing values remain unknown, never fake full soil, NDVI or daily history', () => {
  const api = contextApi();
  const lot = api.fieldToLot({ id: 4, name: 'Registered lot' }, 0, null);
  for (const name of ['deficitDr_mm', 'waterAvailableAU_mm', 'waterAvailableAU_pct',
    'easilyAvailableAFD_mm', 'totalAvailableTAW_mm', 'ndviCurrent', 'kcSatellite',
    'etcToday_mm', 'et0Today_mm', 'lastRainAmount_mm', 'lastIrrigationAmount_mm']) assert.equal(lot[name], null, name);
  assert.equal(lot.hydricStatus, 'Sin datos');
  assert.equal(lot.irrigationPriority, 'Sin datos');
  assert.equal(lot.isRecommendationPublishable, false);
  assert.equal(lot.timeline.length, 0);
  assert.equal(api.formatMetric(null), '-');
  assert.equal(api.formatMetric(Number.NaN), '-');
  assert.equal(api.formatMetric(0), '0.0');
});

test('dashboard uses persisted FAO Dr/AFD/TAW, not interval deficit or p=0.5', () => {
  const lot = contextApi().fieldToLot({ id: 4, name: 'Registered lot', total_available_water_taw: 100 }, 0, canonicalSnapshot());
  assert.equal(lot.deficitDr_mm, 3.03);
  assert.equal(lot.easilyAvailableAFD_mm, 77);
  assert.equal(lot.totalAvailableTAW_mm, 140);
  assert.equal(lot.waterAvailableAU_mm, 136.97);
  assert.equal(lot.ndviCurrent, 0);
  assert.equal(lot.ndviDataAvailable, true);
  assert.equal(lot.kcSatellite, 0.8);
  assert.equal(lot.etcToday_mm, 4); // Period mean, never today's measurement.
  assert.equal(lot.et0Today_mm, 5);
  assert.equal(lot.isRecommendationPublishable, true);
  assert.equal(lot.recommendedGrossIrrigation_mm, 0);
  assert.equal(lot.timeline.length, 0); // Only history API supplies daily dates.
  assert.equal(lot.lastRainAmount_mm, null); // Period total is not a last event.
  assert.ok(lot.warnings.includes('Initial water estimated'));
});

test('UI cannot bypass rejected validation, historical dates or stale recommendations', () => {
  for (const mutate of [
    (snapshot) => { snapshot.analyze_response.validation.is_recommendation_safe = false; },
    (snapshot) => { snapshot.analyze_response.action = 'INSUFFICIENT_DATA'; },
    (snapshot) => { snapshot.is_stale = true; },
    (snapshot) => { snapshot.analyze_response.date_to = '2026-10-07'; },
    (snapshot) => { snapshot.analyze_response.recommendation.evidence.hydric_state_date = '2026-10-07'; },
    (snapshot) => { snapshot.weather_compare_response.evidence.historical_only = true; },
  ]) {
    const snapshot = canonicalSnapshot();
    snapshot.analyze_response.recommendation.metrics.recommended_gross_irrigation_mm = 70;
    mutate(snapshot);
    const lot = contextApi().fieldToLot({ id: 4, name: 'Registered lot' }, 0, snapshot);
    assert.equal(lot.isRecommendationPublishable, false);
    assert.equal(lot.recommendedNetIrrigation_mm, undefined);
    assert.equal(lot.recommendedGrossIrrigation_mm, undefined);
    assert.equal(lot.irrigationPriority, 'Sin datos');
    assert.equal(lot.deficitDr_mm, 3.03); // Historical model retains date/provenance.
  }
});

test('Argentine field calendar round-trips forms across UTC midnight', () => {
  const api = load('lib/field-dates.ts');
  assert.equal(api.fieldDateString(new Date('2026-10-08T01:00:00Z')), '2026-10-07');
  assert.equal(api.fieldDateTimeIso('2026-10-07', '23:30'), '2026-10-08T02:30:00.000Z');
  assert.equal(api.fieldEventDate('2026-10-08T02:30:00Z'), '2026-10-07');
  assert.equal(api.fieldEventTime('2026-10-08T02:30:00Z'), '23:30');
  assert.equal(api.shiftFieldDate('2026-01-01', -1), '2025-12-31');
  assert.throws(() => api.fieldDateTimeIso('2026-02-31', '12:00'));
});

test('history HTTP failure is visible, not an empty successful balance', async () => {
  const api = load('lib/api.ts', {}, async () => new Response('{}', { status: 500 }));
  await assert.rejects(api.getHydricHistoryApi(4, '2026-10-01', '2026-10-08'), /No se pudo cargar/);
});

test('Leaflet tooltip safely escapes producer-entered names', () => {
  const api = load('components/dashboard-map.tsx', { '@/lib/api': {}, 'leaflet/dist/leaflet.css': {} });
  assert.equal(api.escapeMapHtml('<img src=x onerror="bad()"> & \'crop\''), '&lt;img src=x onerror=&quot;bad()&quot;&gt; &amp; &#39;crop&#39;');
});

test('assistant renders canonical values and warnings, never drafts, raw data or fake WhatsApp history', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  let stateIndex = 0;
  const result = { mode: 'ACTIVE', field_id: 4, status: 'COMPLETED', conclusion: 'Canonical FAO summary',
    warnings: ['IRRIGATION_UNKNOWN'], evidence_warnings: ['INITIAL_ESTIMATED'], knowledge_warnings: ['RAG_LIMITED'],
    model_state_summary: { dr_mm: 3.03, afd_mm: 77, taw_mm: 140, state_date: '2026-10-08' },
    steps: [{ index: 1, decision: { action: 'CONCLUDE', reason: 'Enough structured data', conclusion: 'REJECTED_DRAFT' },
      tool_result: { status: 'COMPLETED', data: { secret: 'RAW_PAYLOAD' } } }],
  };
  const page = load('app/(dashboard)/assistant/page.tsx', {
    react: { ...React, useState: (initial) => React.useState(stateIndex++ === 0 ? { 4: result } : initial) },
    '@/components/page-header': load('components/page-header.tsx'),
    '@/components/field-history-chat': load('components/field-history-chat.tsx', {
      '@/lib/api': {}, '@/lib/field-dates': load('lib/field-dates.ts'),
    }),
    '@/app/(dashboard)/context': { useDashboard: () => ({ selectedLotId: '4', setSelectedLotId: () => {}, lotsData: [{ name: 'FAKE_DEMO_LOT' }] }) },
    '@/lib/auth-context': { useAuth: () => ({ user: { id: 'real-user' }, isLoading: false, currentFields: [{ id: 4, name: 'Registered lot' }] }) },
    '@/lib/api': { evaluateSupervisorApi: () => {}, getTeamMembersApi: () => Promise.resolve([]) },
  });
  const html = renderToStaticMarkup(React.createElement(page.default));
  for (const expected of ['Registered lot', 'Preguntá por el historial del lote', 'Canonical FAO summary', '3.03 mm', '77.00 mm', '140.00 mm',
    'IRRIGATION_UNKNOWN', 'INITIAL_ESTIMATED', 'RAG_LIMITED', 'Cargando historial de WhatsApp',
    'Historial de conversaciones', 'Mis chats web']) assert.ok(html.includes(expected), expected);
  for (const excluded of ['REJECTED_DRAFT', 'RAW_PAYLOAD', 'FAKE_DEMO_LOT', 'Carlos Gómez', '5555-010']) assert.equal(html.includes(excluded), false, excluded);
  assert.equal(html.includes('Gemini interpreta las preguntas'), false);
  assert.equal(html.includes('Gemini elige las herramientas'), false);
});

test('forgot-password declares unavailable and signup accepts real owner email', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const page = load('components/auth-form.tsx', {
    'next/navigation': { useRouter: () => ({ push: () => {} }) }, '@/lib/phone-formatter': {},
    '@/lib/auth-context': { useAuth: () => ({ fields: [] }) }, '@/lib/api': {},
  });
  const forgot = renderToStaticMarkup(React.createElement(page.default, { initialMode: 'forgot' }));
  assert.ok(forgot.includes('Funcionalidad no disponible'));
  assert.equal(forgot.includes('Hemos enviado un código'), false);
  assert.equal(forgot.includes('Contraseña Actualizada'), false);
  const signup = renderToStaticMarkup(React.createElement(page.default, { initialMode: 'signup' }));
  assert.ok(signup.includes('id="signup-email"'));
  assert.equal(signup.includes('demo@agromas.com'), false);
});
