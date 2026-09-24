/**
 * Regression tests for the UTC/local-timezone date-mismatch bug class
 * fixed 23./24.09.2026 (GitHub #255 and its further occurrences, see
 * M-Cycle_HA-Component-Roadmap.md items 64/65).
 *
 * Two distinct mismatches were fixed:
 *  - "Type A" (_weekdayLabels): reference dates built via Date.UTC() were
 *    formatted via Intl.DateTimeFormat WITHOUT an explicit timeZone, so the
 *    formatter silently used the HOST's local zone. For negative UTC
 *    offsets (e.g. America/Los_Angeles) this rolled the weekday labels
 *    back by a day. Fix: pass `timeZone: 'UTC'` explicitly.
 *  - "Type B" (_todayIso()/_isoFromDate(new Date())/todayDateKey()):
 *    "now" was turned into a calendar-date string via
 *    new Date().toISOString().slice(0, 10), which extracts the UTC
 *    calendar date, not the local one. Wrong for positive-offset zones
 *    (e.g. Europe/Berlin) shortly after local midnight.
 *
 * Both bugs only reproduce when the *host* timezone differs from UTC, so
 * these tests run each card's source in a freshly spawned Node child
 * process with TZ set via env (honored by the OS from process start) and,
 * for Type B, a mocked "now". This is deliberately NOT the same as the
 * existing `card._todayDate = () => new Date(2026, 6, 27, ...)` override
 * used elsewhere (see menstruation-gauge-card.test.js) - that technique
 * already returns an unambiguous local date and would not catch a
 * regression back to `new Date().toISOString().slice(0, 10)`.
 *
 * Run with: node tests/timezone-date-bugfix.test.js
 */

'use strict';

const assert = require('assert');
const path = require('path');
const { execFileSync } = require('child_process');

const CARDS_DIR = path.join(__dirname, '../custom_components/menstruation_cycle/www');

// A real moment that is just after local midnight in Europe/Berlin (UTC+1
// in January) but still "yesterday" in UTC - exactly the shape of instant
// that new Date().toISOString().slice(0, 10) gets wrong.
const FIXED_ISO = '2026-01-14T23:30:00.000Z';

function localDateIn(timeZone) {
  // Ground truth, independent of the card code and of the child process's
  // TZ env var (Intl's explicit timeZone option is unaffected by either).
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(FIXED_ISO));
}

const DOM_STUBS = `
  global.window = {};
  global.document = { createElement: () => ({}) };
  const defined = {};
  global.customElements = { get: (name) => defined[name] || null, define: (name, cls) => { defined[name] = cls; } };
  global.HTMLElement = class HTMLElement {};
`;

function loadCard(fileName, elementName) {
  return `
    const fs = require('fs');
    const src = fs.readFileSync(${JSON.stringify(path.join(CARDS_DIR, fileName))}, 'utf8');
    eval(src);
    const CardClass = defined[${JSON.stringify(elementName)}];
    const card = Object.create(CardClass.prototype);
  `;
}

function runInChildTZ(timeZone, script) {
  return execFileSync(process.execPath, ['-e', script], {
    encoding: 'utf8',
    env: { ...process.env, TZ: timeZone },
  }).trim();
}

// Mocks the global Date so that `new Date()` (no args) resolves to
// FIXED_ISO, while explicit-args construction (used all over these cards
// for noon-anchored local dates) still behaves normally.
const MOCK_NOW = `
  const __fixedMs = new Date(${JSON.stringify(FIXED_ISO)}).getTime();
  class MockDate extends Date {
    constructor(...args) {
      if (args.length === 0) { super(__fixedMs); } else { super(...args); }
    }
  }
  MockDate.now = () => __fixedMs;
  global.Date = MockDate;
`;

function assertTodayIsoMatchesLocalBerlin(fileName, elementName, description) {
  const tz = 'Europe/Berlin';
  const got = runInChildTZ(tz, MOCK_NOW + DOM_STUBS + loadCard(fileName, elementName) + `console.log(card._todayIso());`);
  assert.strictEqual(got, localDateIn(tz), description);
}

function testCycleCardCompactTodayIsoUsesLocalDate() {
  assertTodayIsoMatchesLocalBerlin(
    'menstruation-cycle-card-compact.js',
    'menstruation-cycle-card',
    '_todayIso() should return the Berlin-local date, not the UTC date',
  );
  console.log('  ✓ menstruation-cycle-card-compact.js _todayIso() uses local calendar date');
}

function testCountdownTimerTodayIsoUsesLocalDate() {
  assertTodayIsoMatchesLocalBerlin(
    'menstruation-countdown-timer.js',
    'menstruation-countdown-timer',
    '_todayIso() should return the Berlin-local date, not the UTC date',
  );
  console.log('  ✓ menstruation-countdown-timer.js _todayIso() uses local calendar date');
}

function testHeatmapCardTodayIsoUsesLocalDate() {
  assertTodayIsoMatchesLocalBerlin(
    'menstruation-cycle-heatmap-card.js',
    'menstruation-cycle-heatmap-card',
    '_todayIso() should return the Berlin-local date, not the UTC date',
  );
  console.log('  ✓ menstruation-cycle-heatmap-card.js _todayIso() uses local calendar date');
}

function testGaugeCardIsoFromDateOfNowUsesLocalDate() {
  const tz = 'Europe/Berlin';
  const script = MOCK_NOW + DOM_STUBS + loadCard('menstruation-gauge-card.js', 'menstruation-gauge-card')
    + `console.log(card._isoFromDate(new Date()));`;
  const got = runInChildTZ(tz, script);
  assert.strictEqual(got, localDateIn(tz), '_isoFromDate(new Date()) should return the Berlin-local date');
  console.log('  ✓ menstruation-gauge-card.js _isoFromDate(new Date()) uses local calendar date');
}

function testStatisticsCardTodayDateKeyUsesLocalDate() {
  const tz = 'Europe/Berlin';
  const script = MOCK_NOW + DOM_STUBS + loadCard('menstruation-statistics-card.js', 'menstruation-statistics-card')
    + `console.log(CardClass._hygieneHelpers.todayDateKey());`;
  const got = runInChildTZ(tz, script);
  assert.strictEqual(got, localDateIn(tz), 'todayDateKey() should return the Berlin-local date');
  console.log('  ✓ menstruation-statistics-card.js todayDateKey() uses local calendar date');
}

function assertWeekdayLabelsIndependentOfHostTZ(fileName, elementName, description) {
  const script = DOM_STUBS + loadCard(fileName, elementName) + `console.log(JSON.stringify(card._weekdayLabels('en')));`;
  const utc = JSON.parse(runInChildTZ('UTC', script));
  const losAngeles = JSON.parse(runInChildTZ('America/Los_Angeles', script));
  assert.deepStrictEqual(losAngeles, utc, description);
}

function testCalendarCardWeekdayLabelsIndependentOfHostTZ() {
  assertWeekdayLabelsIndependentOfHostTZ(
    'menstruation-calendar-card.js',
    'menstruation-calendar-card',
    '_weekdayLabels() must not shift when the host TZ has a negative UTC offset (GitHub #255)',
  );
  console.log('  ✓ menstruation-calendar-card.js _weekdayLabels() is host-TZ independent');
}

function testGaugeCardWeekdayLabelsIndependentOfHostTZ() {
  assertWeekdayLabelsIndependentOfHostTZ(
    'menstruation-gauge-card.js',
    'menstruation-gauge-card',
    '_weekdayLabels() must not shift when the host TZ has a negative UTC offset (GitHub #255)',
  );
  console.log('  ✓ menstruation-gauge-card.js _weekdayLabels() is host-TZ independent');
}

let failed = 0;

[
  testCalendarCardWeekdayLabelsIndependentOfHostTZ,
  testGaugeCardWeekdayLabelsIndependentOfHostTZ,
  testCycleCardCompactTodayIsoUsesLocalDate,
  testCountdownTimerTodayIsoUsesLocalDate,
  testHeatmapCardTodayIsoUsesLocalDate,
  testGaugeCardIsoFromDateOfNowUsesLocalDate,
  testStatisticsCardTodayDateKeyUsesLocalDate,
].forEach((fn) => {
  try {
    fn();
  } catch (err) {
    console.error(`  ✗ ${fn.name}: ${err.message}`);
    failed += 1;
  }
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('\nAll tests passed.');
}
