/**
 * Tests for range forecast projection in menstruation-statistics-card.js
 *
 * Covers:
 *  - _projectRangeWindows returns period/fertility windows for a distant future range (2027-08-01..2027-08-15)
 *  - _projectRangeWindows returns empty arrays when no overlap
 *  - _collectRangeMarkers uses projected windows to mark days in a distant range
 *  - _collectRangeMarkers returns no markers when no overlap exists
 *  - Backward compatibility: near-range markers still work without projected windows
 *
 * Run with: node tests/menstruation-statistics-range-forecast.test.js
 */

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

global.window = { customCards: [], ProductIcons: { getSvgIcon: () => '' } };
global.document = { createElement: () => ({}) };
global.HTMLElement = class HTMLElement {};
const defined = {};
global.customElements = {
  define: (name, cls) => { defined[name] = cls; },
  get: (name) => defined[name] || null,
};

const cardSrc = fs.readFileSync(
  path.join(__dirname, '../custom_components/menstruation_cycle/www/menstruation-statistics-card.js'),
  'utf8',
);
// eslint-disable-next-line no-eval
eval(cardSrc);

const CardClass = defined['menstruation-statistics-card'];

function makeCard() {
  const el = Object.create(CardClass.prototype);
  el.addEventListener = () => {};
  el._config = { entity: 'sensor.menstruation', language: 'en' };
  el._hass = { locale: { language: 'en' }, states: {} };
  return el;
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${error.message}`);
    failed += 1;
  }
}

// Base forecasts: next period 2026-08-05, 28-day cycle.
// At cycle n=13 (+364 days): period 2027-08-04..2027-08-08, fertility 2027-08-14..2027-08-20 (ov 2027-08-19).
// Both overlap the test range 2027-08-01..2027-08-15.
const PERIOD_FORECAST = {
  predicted_start: '2026-08-05',
  predicted_end: '2026-08-09',
  cycle_std_days: 1.0,
  confidence: 'high',
};

const FERTILITY_FORECAST = {
  ovulation_estimate: '2026-08-20',
  fertile_window_start: '2026-08-15',
  fertile_window_end: '2026-08-21',
  best_days_start: '2026-08-18',
  best_days_end: '2026-08-19',
  source: 'estimated',
  confidence: 'medium',
};

console.log('_projectRangeWindows: distant future range');

test('returns period windows overlapping 2027-08-01..2027-08-15', () => {
  const card = makeCard();
  const result = card._projectRangeWindows(PERIOD_FORECAST, FERTILITY_FORECAST, 28, '2027-08-01', '2027-08-15');
  assert.ok(result, 'result should not be null');
  assert.ok(Array.isArray(result.periodWindows), 'periodWindows should be an array');
  assert.ok(result.periodWindows.length > 0, 'Expected at least one period window in distant range');
  for (const w of result.periodWindows) {
    assert.ok(w.start, 'window.start missing');
    assert.ok(w.end, 'window.end missing');
    // start <= end
    assert.ok(w.start <= w.end, `window start ${w.start} > end ${w.end}`);
    // overlap with range
    assert.ok(w.end >= '2027-08-01' && w.start <= '2027-08-15', `window ${w.start}..${w.end} does not overlap range`);
  }
});

test('returns fertility windows overlapping 2027-08-01..2027-08-15', () => {
  const card = makeCard();
  const result = card._projectRangeWindows(PERIOD_FORECAST, FERTILITY_FORECAST, 28, '2027-08-01', '2027-08-15');
  assert.ok(Array.isArray(result.fertilityWindows), 'fertilityWindows should be an array');
  assert.ok(result.fertilityWindows.length > 0, 'Expected at least one fertility window in distant range');
  for (const w of result.fertilityWindows) {
    assert.ok(w.fertileStart, 'window.fertileStart missing');
    assert.ok(w.fertileEnd, 'window.fertileEnd missing');
    assert.ok(w.ovulation, 'window.ovulation missing');
    assert.ok(w.fertileEnd >= '2027-08-01' && w.fertileStart <= '2027-08-15', `fertility window does not overlap range`);
  }
});

console.log('\n_projectRangeWindows: no overlap');

test('returns empty arrays when range is before first forecast', () => {
  const card = makeCard();
  const result = card._projectRangeWindows(PERIOD_FORECAST, FERTILITY_FORECAST, 28, '2025-01-01', '2025-01-15');
  assert.ok(result, 'result should not be null');
  assert.deepStrictEqual(result.periodWindows, []);
  assert.deepStrictEqual(result.fertilityWindows, []);
});

test('returns empty arrays when range is invalid (start > end)', () => {
  const card = makeCard();
  const result = card._projectRangeWindows(PERIOD_FORECAST, FERTILITY_FORECAST, 28, '2027-08-15', '2027-08-01');
  assert.deepStrictEqual(result.periodWindows, []);
  assert.deepStrictEqual(result.fertilityWindows, []);
});

test('returns empty arrays when forecasts are null', () => {
  const card = makeCard();
  const result = card._projectRangeWindows(null, null, 28, '2027-08-01', '2027-08-15');
  assert.deepStrictEqual(result.periodWindows, []);
  assert.deepStrictEqual(result.fertilityWindows, []);
});

console.log('\n_collectRangeMarkers: distant range with projected windows');

test('marks period day in projected distant range', () => {
  const card = makeCard();
  const rangeWindows = card._projectRangeWindows(PERIOD_FORECAST, FERTILITY_FORECAST, 28, '2027-08-01', '2027-08-15');
  // Find a period window start date
  const periodWindow = rangeWindows.periodWindows[0];
  const markers = card._collectRangeMarkers(periodWindow.start, PERIOD_FORECAST, FERTILITY_FORECAST, rangeWindows);
  assert.ok(markers.includes('period'), `Expected 'period' marker on ${periodWindow.start}, got: ${markers}`);
});

test('marks fertile day in projected distant range', () => {
  const card = makeCard();
  const rangeWindows = card._projectRangeWindows(PERIOD_FORECAST, FERTILITY_FORECAST, 28, '2027-08-01', '2027-08-15');
  const fertilityWindow = rangeWindows.fertilityWindows[0];
  const markers = card._collectRangeMarkers(fertilityWindow.fertileStart, PERIOD_FORECAST, FERTILITY_FORECAST, rangeWindows);
  assert.ok(markers.includes('fertile'), `Expected 'fertile' marker on ${fertilityWindow.fertileStart}, got: ${markers}`);
});

test('marks ovulation day in projected distant range', () => {
  const card = makeCard();
  const rangeWindows = card._projectRangeWindows(PERIOD_FORECAST, FERTILITY_FORECAST, 28, '2027-08-01', '2027-08-15');
  const fertilityWindow = rangeWindows.fertilityWindows[0];
  const markers = card._collectRangeMarkers(fertilityWindow.ovulation, PERIOD_FORECAST, FERTILITY_FORECAST, rangeWindows);
  assert.ok(markers.includes('ovulation'), `Expected 'ovulation' marker on ${fertilityWindow.ovulation}, got: ${markers}`);
});

console.log('\n_collectRangeMarkers: no markers when no overlap');

test('returns empty markers for day outside all projected windows', () => {
  const card = makeCard();
  const rangeWindows = card._projectRangeWindows(PERIOD_FORECAST, FERTILITY_FORECAST, 28, '2025-01-01', '2025-01-15');
  // Any day in that range should have no markers
  const markers = card._collectRangeMarkers('2025-01-05', PERIOD_FORECAST, FERTILITY_FORECAST, rangeWindows);
  assert.deepStrictEqual(markers, []);
});

console.log('\n_collectRangeMarkers: backward compat (near range, no rangeWindows)');

test('period marker still works for near-range day without rangeWindows', () => {
  const card = makeCard();
  const markers = card._collectRangeMarkers('2026-08-07', PERIOD_FORECAST, FERTILITY_FORECAST, null);
  assert.ok(markers.includes('period'), `Expected 'period' for 2026-08-07 (in ${PERIOD_FORECAST.predicted_start}..${PERIOD_FORECAST.predicted_end})`);
});

test('fertile marker still works for near-range day without rangeWindows', () => {
  const card = makeCard();
  const markers = card._collectRangeMarkers('2026-08-18', PERIOD_FORECAST, FERTILITY_FORECAST, null);
  assert.ok(markers.includes('fertile'), `Expected 'fertile' for 2026-08-18 (in ${FERTILITY_FORECAST.fertile_window_start}..${FERTILITY_FORECAST.fertile_window_end})`);
});

test('ovulation marker still works for near-range day without rangeWindows', () => {
  const card = makeCard();
  const markers = card._collectRangeMarkers('2026-08-20', PERIOD_FORECAST, FERTILITY_FORECAST, null);
  assert.ok(markers.includes('ovulation'), `Expected 'ovulation' for 2026-08-20`);
});

test('no markers for day outside all near-range windows and no rangeWindows', () => {
  const card = makeCard();
  // A date between period end (2026-08-09) and fertile window start (2026-08-15)
  const markers = card._collectRangeMarkers('2026-08-12', PERIOD_FORECAST, FERTILITY_FORECAST, null);
  assert.deepStrictEqual(markers, []);
});

console.log('\nSummary');
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
