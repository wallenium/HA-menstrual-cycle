'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

class FakeShadowRoot {
  constructor() { this._html = ''; }
  set innerHTML(v) { this._html = v; }
  get innerHTML() { return this._html; }
  addEventListener() {}
  getElementById() { return null; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
}

global.ResizeObserver = class { observe() {} disconnect() {} };
global.window = { customCards: [] };
global.document = undefined;
global.HTMLElement = class HTMLElement {};
const defined = {};
global.customElements = { define: (name, cls) => { defined[name] = cls; }, get: () => undefined };

const iconsSrc = fs.readFileSync(
  path.join(__dirname, '../custom_components/menstruation_cycle/www/menstruation-icons.js'),
  'utf8',
);
// eslint-disable-next-line no-eval
eval(iconsSrc);

const gaugeSrc = fs.readFileSync(
  path.join(__dirname, '../custom_components/menstruation_cycle/www/menstruation-gauge-card.js'),
  'utf8',
);
// eslint-disable-next-line no-eval
eval(gaugeSrc);

const GaugeCard = defined['menstruation-cycle-card'] || defined['menstruation-gauge-card'];
if (!GaugeCard) throw new Error('MenstruationGaugeCard was not registered');

function makeCard(config = {}) {
  const shadow = new FakeShadowRoot();
  const card = Object.create(GaugeCard.prototype);
  card.attachShadow = () => shadow;
  Object.defineProperty(card, 'shadowRoot', { get: () => shadow, configurable: true });
  card.getBoundingClientRect = () => ({ width: 400 });
  card.addEventListener = () => {};
  card.closest = () => null;
  card.setConfig({ entity: 'sensor.menstruation', ...config });
  card._viewDate = new Date(2026, 6, 1, 12, 0, 0, 0);
  return card;
}

function makeHass(attributes = {}) {
  return {
    locale: { language: 'en' },
    themes: { darkMode: false },
    states: {
      'sensor.menstruation': {
        state: 'neutral',
        attributes: {
          entry_id: 'test',
          friendly_name: 'Test',
          history: [],
          grouped_starts: ['2026-06-07'],
          period_duration_days: 5,
          next_predicted_start: '2026-07-05',
          predicted_cycle_starts: ['2026-07-05', '2026-07-20', '2026-08-17'],
          symptom_history: [],
          ...attributes,
        },
      },
    },
  };
}

function testGaugeUsesMultiplePredictedStarts() {
  const card = makeCard({ show_predicted_cycles: true, num_predicted_cycles: 3 });
  card._hass = makeHass();
  const model = card._buildModel();
  assert.deepStrictEqual(
    model.predictedStarts,
    ['2026-07-05', '2026-07-20', '2026-08-17'],
    'model should expose all normalized predicted cycle starts',
  );

  card._render();
  const html = card.shadowRoot.innerHTML;
  const predictedPrimaryMarkers = (html.match(/r="5\.5"/g) || []).length;
  assert.strictEqual(predictedPrimaryMarkers, 2, 'two predicted starts in view month should render two primary predicted markers');
  console.log('  ✓ renders multiple predicted cycle markers from predicted_cycle_starts');
}

function testGaugeCanHidePredictedCycles() {
  const card = makeCard({ show_predicted_cycles: false, num_predicted_cycles: 3 });
  card._hass = makeHass();
  card._render();
  const html = card.shadowRoot.innerHTML;
  assert.strictEqual((html.match(/r="5\.5"/g) || []).length, 0, 'predicted markers should be hidden when show_predicted_cycles is false');
  console.log('  ✓ hides predicted cycle markers when disabled');
}

function testTimelineMarkersCoverFutureMonths() {
  const card = makeCard({ show_predicted_cycles: true, num_predicted_cycles: 6 });
  card._hass = makeHass({
    grouped_starts: ['2026-06-07', '2026-07-05', '2026-08-02'],
    predicted_cycle_starts: ['2026-08-30', '2026-09-27', '2026-10-25', '2026-11-22', '2026-12-20'],
    nfp_analysis: { fertile_window: ['2026-07-10', '2026-07-16'], confidence_level: 'high', ovulation_detected: true },
    fertile_window_start: '2026-07-10',
    fertile_window_end: '2026-07-16',
    ovulation_day: '2026-07-14',
  });
  const model = card._buildModel();
  const months = card._timelineStripMonths();
  const markers = card._timelineMarkerSets(model, months);
  const futureOvulation = Array.from(markers.ovulationSet).filter((iso) => iso >= '2026-09-01');
  const futureFertile = Array.from(markers.fertileSet).filter((iso) => iso >= '2026-09-01');
  assert.ok(futureOvulation.length > 0, 'future months should contain ovulation markers');
  assert.ok(futureFertile.length > 0, 'future months should contain fertile window days');
  assert.ok(markers.predictedSet.has('2026-11-22'), 'predicted period start should be marked in future months');
  console.log('  ✓ timeline marks predicted fertile and ovulation days across future months');
}

let failed = 0;
[
  testGaugeUsesMultiplePredictedStarts,
  testGaugeCanHidePredictedCycles,
  testTimelineMarkersCoverFutureMonths,
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
