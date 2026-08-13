/**
 * Tests for menstruation-calendar-card and editor.
 *
 * Run with: node tests/menstruation-calendar-card.test.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

global.window = { customCards: [] };
const defined = {};
global.customElements = {
  define: (name, cls) => { defined[name] = cls; },
  get: (name) => defined[name] || null,
};

global.document = {
  createElement: () => ({}),
};

global.CustomEvent = class CustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
    this.bubbles = init.bubbles;
    this.composed = init.composed;
  }
};

global.HTMLElement = class HTMLElement {
  attachShadow() {
    this.shadowRoot = {
      innerHTML: '',
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
    };
    return this.shadowRoot;
  }

  dispatchEvent() {}
};

const cardSrc = fs.readFileSync(
  path.join(__dirname, '../custom_components/menstruation_cycle/www/menstruation-calendar-card.js'),
  'utf8',
);
// eslint-disable-next-line no-eval
eval(cardSrc);

const CardClass = defined['menstruation-calendar-card'];
const EditorClass = defined['menstruation-calendar-card-editor'];

function makeHass() {
  return {
    locale: { language: 'en' },
    callService: async () => {},
    states: {
      'sensor.menstruation': {
        state: 'ok',
        attributes: {
          entry_id: 'entry-1',
          profile: 'default',
          history: ['2026-07-02', '2026-07-03'],
          grouped_starts: ['2026-07-02', '2026-07-30'],
          fertile_window_start: '2026-07-10',
          fertile_window_end: '2026-07-16',
          ovulation_day: '2026-07-14',
          avg_cycle_length: 28,
          symptom_history: [
            { date: '2026-07-14', symptom_data: { bleeding_strength: 'light' } },
          ],
        },
      },
    },
  };
}

function makeHassWithPredictions() {
  return {
    locale: { language: 'en' },
    callService: async () => {},
    states: {
      'sensor.menstruation': {
        state: 'ok',
        attributes: {
          entry_id: 'entry-1',
          profile: 'default',
          history: ['2026-07-02', '2026-07-03'],
          grouped_starts: ['2026-07-02'],
          fertile_window_start: '2026-07-10',
          fertile_window_end: '2026-07-16',
          ovulation_day: '2026-07-14',
          avg_cycle_length: 28,
          period_duration_days: 5,
          predicted_cycle_starts: ['2026-07-30', '2026-08-27', '2026-09-24'],
          prediction_day_confidence: {
            by_day: {
              '2026-08-01': { period: { level: 'high', source: 'hybrid' } },
              '2026-08-02': { period: { level: 'high', source: 'hybrid' } },
              '2026-08-08': { fertile: { level: 'medium', source: 'estimated' } },
              '2026-08-09': { fertile: { level: 'medium', source: 'estimated' } },
              '2026-08-12': {
                fertile: { level: 'medium', source: 'estimated' },
                ovulation: { level: 'low', source: 'estimated' },
              },
            },
          },
          symptom_history: [],
        },
      },
    },
  };
}

function testRegistration() {
  assert.ok(CardClass, 'calendar card is registered');
  assert.ok(EditorClass, 'calendar card editor is registered');
  assert.ok(
    Array.isArray(global.window.customCards)
    && global.window.customCards.some((c) => c.type === 'menstruation-calendar-card'),
    'card is listed in window.customCards',
  );
  console.log('  ✓ registers card and editor');
}

function testWeekStartOption() {
  const card = new CardClass();
  card.setConfig({ entity: 'sensor.menstruation', week_start: 'sunday' });
  const labels = card._weekdayLabels('en');
  assert.strictEqual(labels[0].toLowerCase().startsWith('sun'), true, 'sunday week start uses Sunday first');
  card.setConfig({ entity: 'sensor.menstruation', week_start: 'monday' });
  const labelsMon = card._weekdayLabels('en');
  assert.strictEqual(labelsMon[0].toLowerCase().startsWith('mon'), true, 'monday week start uses Monday first');
  console.log('  ✓ supports configurable week start');
}

function testCalendarRenderingStates() {
  const card = new CardClass();
  card.setConfig({
    entity: 'sensor.menstruation',
    show_fertile_period: true,
    show_ovulation_marker: true,
    show_cycle_day_numbers: true,
  });
  card.hass = makeHass();
  card._viewDate = new Date(2026, 6, 1, 12, 0, 0, 0);
  const model = card._buildModel();
  const html = card._calendarGrid(model, 'en');
  assert.ok(html.includes('is-period-day'), 'period days are marked');
  assert.ok(html.includes('is-fertile'), 'fertile days are marked');
  assert.ok(html.includes('is-ovulation'), 'ovulation day is marked');
  assert.ok(html.includes('ovulation-dot'), 'ovulation marker is rendered');
  assert.ok(html.includes('cycle-day'), 'cycle day labels render when enabled');
  assert.ok(html.includes('Cycle day:'), 'tooltip includes cycle day info');
  console.log('  ✓ renders phase markers and cycle-day tooltip');
}

function testOvulationMarkerToggle() {
  const card = new CardClass();
  card.setConfig({
    entity: 'sensor.menstruation',
    show_fertile_period: true,
    show_ovulation_marker: false,
  });
  card.hass = makeHass();
  card._viewDate = new Date(2026, 6, 1, 12, 0, 0, 0);
  const model = card._buildModel();
  const html = card._calendarGrid(model, 'en');
  assert.ok(!html.includes('is-ovulation'), 'ovulation day styling is disabled when marker is off');
  assert.ok(!html.includes('ovulation-dot'), 'ovulation marker dot is hidden when disabled');
  console.log('  ✓ supports ovulation marker toggle');
}

function testPredictedCycleRendering() {
  const card = new CardClass();
  card.setConfig({
    entity: 'sensor.menstruation',
    show_fertile_period: true,
    show_ovulation_marker: true,
    show_predicted_cycles: true,
    num_predicted_cycles: 3,
  });
  card.hass = makeHassWithPredictions();

  // View August 2026 — first predicted cycle starts 2026-07-30, period covers Jul 30 – Aug 3
  card._viewDate = new Date(2026, 7, 1, 12, 0, 0, 0);
  const model = card._buildModel();
  const html = card._calendarGrid(model, 'en');

  assert.ok(html.includes('is-predicted-period'), 'predicted period days are marked with is-predicted-period class');
  assert.ok(html.includes('is-predicted-fertile'), 'predicted fertile days are marked with is-predicted-fertile class');
  assert.ok(html.includes('is-predicted-ovulation'), 'predicted ovulation day is marked with is-predicted-ovulation class');
  assert.ok(html.includes('pred-conf-high'), 'predicted high-confidence days are marked');
  assert.ok(html.includes('pred-conf-medium'), 'predicted medium-confidence days are marked');
  assert.ok(html.includes('pred-conf-low'), 'predicted low-confidence days are marked');
  assert.ok(html.includes('confidence-chip'), 'predicted confidence chip is rendered');
  assert.ok(html.includes('ovulation-dot predicted'), 'predicted ovulation dot has predicted class');
  assert.ok(html.includes('(Predicted, High confidence)'), 'predicted days include confidence label in tooltip');
  console.log('  ✓ renders predicted cycle period, fertile, and ovulation markers');
}

function testPredictedCyclesToggle() {
  const card = new CardClass();
  card.setConfig({
    entity: 'sensor.menstruation',
    show_predicted_cycles: false,
  });
  card.hass = makeHassWithPredictions();
  card._viewDate = new Date(2026, 7, 1, 12, 0, 0, 0);
  const model = card._buildModel();
  const html = card._calendarGrid(model, 'en');

  assert.ok(!html.includes('is-predicted-period'), 'no predicted period when show_predicted_cycles is false');
  assert.ok(!html.includes('is-predicted-fertile'), 'no predicted fertile when show_predicted_cycles is false');
  console.log('  ✓ hides predicted cycles when show_predicted_cycles is false');
}

function testNumPredictedCyclesLimit() {
  const card = new CardClass();
  card.setConfig({
    entity: 'sensor.menstruation',
    show_predicted_cycles: true,
    num_predicted_cycles: 1,
  });
  card.hass = makeHassWithPredictions();
  // Model has 3 predicted starts; only first 1 should be used
  const model = card._buildModel();
  assert.strictEqual(model.predictedStartSet.size, 1, 'only 1 predicted start when num_predicted_cycles is 1');
  assert.ok(model.predictedStartSet.has('2026-07-30'), 'first predicted start is included');
  assert.ok(!model.predictedStartSet.has('2026-08-27'), 'second predicted start is excluded');
  console.log('  ✓ respects num_predicted_cycles limit');
}

function testPredictedLegendEntry() {
  const card = new CardClass();
  card.setConfig({
    entity: 'sensor.menstruation',
    show_predicted_cycles: true,
  });
  card.hass = makeHass();
  card._viewDate = new Date(2026, 6, 1, 12, 0, 0, 0);
  card._render();
  const html = card.shadowRoot.innerHTML;
  assert.ok(html.includes('predicted-period'), 'legend includes predicted-period swatch when show_predicted_cycles is true');
  assert.ok(html.includes('swatch conf-high'), 'legend includes high confidence swatch');
  assert.ok(html.includes('swatch conf-medium'), 'legend includes medium confidence swatch');
  assert.ok(html.includes('swatch conf-low'), 'legend includes low confidence swatch');
  assert.ok(html.includes('High confidence'), 'legend includes high confidence label');
  assert.ok(html.includes('Medium confidence'), 'legend includes medium confidence label');
  assert.ok(html.includes('Low confidence'), 'legend includes low confidence label');
  console.log('  ✓ shows predicted period legend entry when enabled');
}

function testPredictedLegendHidden() {
  const card = new CardClass();
  card.setConfig({
    entity: 'sensor.menstruation',
    show_predicted_cycles: false,
  });
  card.hass = makeHass();
  card._viewDate = new Date(2026, 6, 1, 12, 0, 0, 0);
  card._render();
  const html = card.shadowRoot.innerHTML;
  assert.ok(!html.includes('swatch predicted-period'), 'legend hides predicted-period swatch when show_predicted_cycles is false');
  assert.ok(!html.includes('swatch conf-high'), 'legend hides confidence swatches when show_predicted_cycles is false');
  console.log('  ✓ hides predicted period legend entry when disabled');
}

function testPredictionConfidenceFallbackWhenMissing() {
  const card = new CardClass();
  card.setConfig({
    entity: 'sensor.menstruation',
    show_predicted_cycles: true,
  });
  const hass = makeHassWithPredictions();
  delete hass.states['sensor.menstruation'].attributes.prediction_day_confidence;
  card.hass = hass;
  card._viewDate = new Date(2026, 7, 1, 12, 0, 0, 0);
  const model = card._buildModel();
  const html = card._calendarGrid(model, 'en');
  assert.ok(html.includes('pred-conf-low'), 'missing confidence payload falls back to low confidence style');
  console.log('  ✓ prediction confidence gracefully falls back when metadata is missing');
}

function testEditorHasPredictedOptions() {
  const editor = new EditorClass();
  editor.setConfig({ entity: 'sensor.menstruation' });
  assert.strictEqual(editor._config.show_predicted_cycles, true, 'editor defaults show_predicted_cycles to true');
  assert.strictEqual(editor._config.num_predicted_cycles, 6, 'editor defaults num_predicted_cycles to 6');
  console.log('  ✓ editor defaults show_predicted_cycles and num_predicted_cycles');
}

function testTranslationFallbackHelpers() {
  const card = new CardClass();
  card.setConfig({ entity: 'sensor.menstruation' });
  card.hass = makeHass();

  const prevCache = global.window.menstruationCycleI18n.cache.en;
  global.window.menstruationCycleI18n.cache.en = {
    ...(prevCache || {}),
    cat_libido: 'Libido label',
    intercourse: 'Intercourse label',
    opt_protected: 'Protected label',
    custom_option: 'Custom option label',
    opt_underwear: 'Underwear label',
    underwear: 'Underwear base label',
  };

  assert.strictEqual(card._tCategory('libido'), 'Libido label', 'existing cat_* translations must still be used');
  assert.strictEqual(card._tCategory('intercourse'), 'Intercourse label', 'missing cat_* translations must fall back to the unprefixed key');
  assert.strictEqual(card._tOption('protected'), 'Protected label', 'existing opt_* translations must still be used');
  assert.strictEqual(card._tOption('custom_option'), 'Custom option label', 'missing opt_* translations must fall back to the unprefixed key');
  assert.strictEqual(card._tOption('period_underwear'), 'Underwear label', 'period_underwear should normalize to the underwear translation key');

  global.window.menstruationCycleI18n.cache.en = {
    ...(prevCache || {}),
    cat_libido: 'Libido label',
    intercourse: 'Intercourse label',
    opt_protected: 'Protected label',
    custom_option: 'Custom option label',
    underwear: 'Underwear base label',
  };
  assert.strictEqual(card._tOption('period_panty'), 'Underwear base label', 'period_panty should normalize before the base-key fallback');

  global.window.menstruationCycleI18n.cache.en = prevCache;

  console.log('  ✓ calendar translation helpers normalize aliases and preserve prefixed/base-key fallback');
}

function testNfpLowConfidenceIgnoredInCalendar() {
  // Cycle started June 5; standard calc puts ovulation around June 18.
  // NFP says ovulation on July 25, fertile July 20-26 – but confidence is "low".
  // Calendar must NOT mark July 25 as ovulation or July 20-26 as fertile.

  function makeHassNfp(confidence) {
    return {
      locale: { language: 'en' },
      callService: async () => {},
      states: {
        'sensor.menstruation': {
          state: 'fertile',
          attributes: {
            entry_id: 'entry-1',
            profile: 'default',
            history: ['2026-06-05', '2026-06-06'],
            grouped_starts: ['2026-06-05'],
            fertile_window_start: '2026-07-20',
            fertile_window_end: '2026-07-26',
            ovulation_day: '2026-07-25',
            avg_cycle_length: 28,
            nfp_analysis: {
              confidence_level: confidence,
              fertile_window: { start: '2026-07-20', end: '2026-07-26' },
              ovulation_day: '2026-07-25',
              ovulation_detected: true,
            },
          },
        },
      },
    };
  }

  // --- low confidence: sensor fallback must be suppressed ---
  const cardLow = new CardClass();
  cardLow.setConfig({ entity: 'sensor.menstruation', show_fertile_period: true, show_ovulation_marker: true });
  cardLow.hass = makeHassNfp('low');
  cardLow._viewDate = new Date(2026, 6, 1, 12, 0, 0, 0); // July 2026

  const modelLow = cardLow._buildModel();
  const stLow25 = cardLow._statusForDay('2026-07-25', modelLow);
  const stLow22 = cardLow._statusForDay('2026-07-22', modelLow);

  assert.ok(!stLow25.isOvulation, 'low-confidence NFP: July 25 must NOT be marked as ovulation');
  assert.ok(!stLow22.isFertile, 'low-confidence NFP: July 22 must NOT be marked as fertile');

  // --- medium confidence: sensor fallback must still be used ---
  const cardMed = new CardClass();
  cardMed.setConfig({ entity: 'sensor.menstruation', show_fertile_period: true, show_ovulation_marker: true });
  cardMed.hass = makeHassNfp('medium');
  cardMed._viewDate = new Date(2026, 6, 1, 12, 0, 0, 0); // July 2026

  const modelMed = cardMed._buildModel();
  const stMed25 = cardMed._statusForDay('2026-07-25', modelMed);
  const stMed22 = cardMed._statusForDay('2026-07-22', modelMed);

  assert.ok(stMed25.isOvulation, 'medium-confidence NFP: July 25 must be marked as ovulation');
  assert.ok(stMed22.isFertile, 'medium-confidence NFP: July 22 must be marked as fertile');

  console.log('  ✓ NFP low-confidence: sensor fallback ignored; medium/high confidence respected');
}

function testRenderStability() {
  const CardClass = defined['menstruation-calendar-card'];

  // Initial render
  const card = new CardClass();
  card.setConfig({ entity: 'sensor.menstruation' });
  const hass = makeHass();
  hass.states['sensor.menstruation'].last_changed = '2026-01-01T00:00:00.000Z';
  card.hass = hass;
  const firstHtml = card.shadowRoot.innerHTML;
  assert.ok(firstHtml.length > 0, 'initial render expected');

  // Replace innerHTML with sentinel — render guard must preserve it on identical hass update.
  card.shadowRoot.innerHTML = 'SENTINEL';
  card.hass = hass;
  assert.strictEqual(card.shadowRoot.innerHTML, 'SENTINEL', 'DOM was replaced on identical hass update');

  // A changed last_changed value must trigger a fresh render.
  const hass2 = makeHass();
  hass2.states['sensor.menstruation'].last_changed = '2026-01-02T00:00:00.000Z';
  card.hass = hass2;
  assert.notStrictEqual(card.shadowRoot.innerHTML, 'SENTINEL', 'DOM was not updated after entity state change');

  // Month navigation (viewDate change) must also trigger a fresh render.
  const htmlAfterStateChange = card.shadowRoot.innerHTML;
  card.shadowRoot.innerHTML = 'SENTINEL2';
  card._viewDate = new Date(2020, 0, 1);
  card._lastRenderKey = null;
  card._render();
  assert.notStrictEqual(card.shadowRoot.innerHTML, 'SENTINEL2', 'DOM was not updated after month navigation');

  console.log('  ✓ render stability: repeated identical hass updates do not replace rendered HTML');
}

function testAttributeOnlyChangeTriggersRender() {
  const card = new CardClass();
  card.setConfig({ entity: 'sensor.menstruation' });
  const hass1 = makeHass();
  hass1.states['sensor.menstruation'].last_changed = '2026-01-01T00:00:00.000Z';
  card.hass = hass1;
  assert.ok(card.shadowRoot.innerHTML.length > 0, 'initial render expected');

  card.shadowRoot.innerHTML = 'SENTINEL';
  const hass2 = makeHass();
  hass2.states['sensor.menstruation'].last_changed = '2026-01-01T00:00:00.000Z';
  hass2.states['sensor.menstruation'].attributes.grouped_starts = ['2026-07-02', '2026-08-01'];
  card.hass = hass2;
  assert.notStrictEqual(card.shadowRoot.innerHTML, 'SENTINEL', 'DOM was not updated after attribute-only change');

  console.log('  ✓ render stability: attribute-only changes invalidate calendar render key');
}

/**
 * Helper: create a hass object where all predicted_cycle_starts are within
 * 6 months of today (Jul 2026), so the horizon is at most Sep 2026.
 */
function makeHassShortForecast() {
  return {
    locale: { language: 'en' },
    callService: async () => {},
    states: {
      'sensor.menstruation': {
        state: 'ok',
        attributes: {
          entry_id: 'entry-1',
          profile: 'default',
          history: ['2026-07-02', '2026-07-03'],
          grouped_starts: ['2026-07-02'],
          fertile_window_start: '2026-07-10',
          fertile_window_end: '2026-07-16',
          ovulation_day: '2026-07-14',
          avg_cycle_length: 28,
          period_duration_days: 5,
          // Only 2 predicted starts; last one is 2026-08-27 (< 6 months ahead from Jul 2026)
          predicted_cycle_starts: ['2026-07-30', '2026-08-27'],
          symptom_history: [],
        },
      },
    },
  };
}

function testForecastExtensionBeyondHorizon() {
  const card = new CardClass();
  card.setConfig({
    entity: 'sensor.menstruation',
    show_predicted_cycles: true,
    num_predicted_cycles: 6,
  });
  const hass = makeHassShortForecast();
  card.hass = hass;

  // Navigate 12 months into the future: Jan 2028 — well beyond the Aug 2026 horizon.
  card._viewDate = new Date(2028, 0, 1, 12, 0, 0, 0);
  card._maybeExtendForecast();
  const model = card._buildModel();

  // Extension must have generated extra predicted starts covering Jan 2028.
  assert.ok(
    model.extraPredictedStartSet.size > 0,
    'extraPredictedStartSet must contain dynamically generated starts',
  );

  const html = card._calendarGrid(model, 'en');
  assert.ok(
    html.includes('is-predicted-period') || html.includes('is-predicted-fertile'),
    'navigating to a far-future month shows predicted indicators via forecast extension',
  );

  console.log('  ✓ forecast extension: far-future month shows predicted indicators');
}

function testForecastExtensionRespectsCap() {
  const card = new CardClass();
  card.setConfig({
    entity: 'sensor.menstruation',
    show_predicted_cycles: true,
    num_predicted_cycles: 6,
  });
  card.hass = makeHassShortForecast();

  // Navigate 10 years ahead — should be capped at MAX_EXTRA_YEARS (3 years).
  card._viewDate = new Date(2036, 0, 1, 12, 0, 0, 0);
  card._maybeExtendForecast();

  const capYear = new Date().getFullYear() + 3;
  const allExtra = card._extraPredictedStarts;
  assert.ok(allExtra.length > 0, 'some extra starts generated');
  const maxYear = Math.max(...allExtra.map((iso) => parseInt(iso.slice(0, 4), 10)));
  assert.ok(maxYear <= capYear + 1, `extra starts stay within ~3-year cap (got max year ${maxYear})`);

  console.log('  ✓ forecast extension: capped at ~3 years');
}

function testForecastExtensionSensorLimitPreserved() {
  // num_predicted_cycles=1 still restricts predictedStartSet; extras are separate.
  const card = new CardClass();
  card.setConfig({
    entity: 'sensor.menstruation',
    show_predicted_cycles: true,
    num_predicted_cycles: 1,
  });
  card.hass = makeHassShortForecast();

  card._viewDate = new Date(2027, 0, 1, 12, 0, 0, 0);
  card._maybeExtendForecast();
  const model = card._buildModel();

  // Sensor-limited set remains at 1.
  assert.strictEqual(model.predictedStartSet.size, 1, 'predictedStartSet still limited to 1 by num_predicted_cycles');
  // But extras cover the far month.
  assert.ok(model.extraPredictedStartSet.size > 0, 'extraPredictedStartSet has dynamically extended starts');

  console.log('  ✓ forecast extension: predictedStartSet limit preserved; extras are separate');
}

function testForecastExtensionDisabled() {
  // When show_predicted_cycles is false, no extension should happen.
  const card = new CardClass();
  card.setConfig({
    entity: 'sensor.menstruation',
    show_predicted_cycles: false,
  });
  card.hass = makeHassShortForecast();

  card._viewDate = new Date(2028, 0, 1, 12, 0, 0, 0);
  card._maybeExtendForecast();

  assert.strictEqual(card._extraPredictedStarts.length, 0, 'no extension when show_predicted_cycles is false');
  console.log('  ✓ forecast extension: disabled when show_predicted_cycles is false');
}

// ── Current period predicted tail ────────────────────────────────────────────

function makeHassActivePeriod(loggedDays, periodDuration) {
  // Period started on 2026-08-01; logged through day `loggedDays` (1-indexed).
  const history = [];
  for (let i = 0; i < loggedDays; i += 1) {
    const d = new Date(2026, 7, 1 + i, 12, 0, 0, 0);
    history.push(`2026-08-${String(1 + i).padStart(2, '0')}`);
  }
  const lastLogged = history[history.length - 1];
  return {
    locale: { language: 'en' },
    callService: async () => {},
    states: {
      'sensor.menstruation': {
        state: 'period',
        attributes: {
          entry_id: 'entry-1',
          profile: 'default',
          history,
          grouped_starts: ['2026-08-01'],
          avg_cycle_length: 28,
          period_duration_days: periodDuration,
          symptom_history: [],
          // current_bleeding_block provided by sensor
          current_bleeding_block: {
            start: '2026-08-01',
            end: lastLogged,
            days: history,
          },
        },
      },
    },
  };
}

function testCurrentPeriodTailShowsLightRed() {
  // Period duration 5, logged through day 2 → tail should be days 3–5 (light red).
  const card = new CardClass();
  card.setConfig({ entity: 'sensor.menstruation', show_predicted_cycles: true });
  card.hass = makeHassActivePeriod(2, 5);
  card._viewDate = new Date(2026, 7, 1, 12, 0, 0, 0); // August 2026

  const model = card._buildModel();
  assert.ok(model.currentPeriodTailSet.has('2026-08-03'), 'day 3 is a tail day');
  assert.ok(model.currentPeriodTailSet.has('2026-08-04'), 'day 4 is a tail day');
  assert.ok(model.currentPeriodTailSet.has('2026-08-05'), 'day 5 is a tail day');
  assert.strictEqual(model.currentPeriodTailSet.size, 3, 'exactly 3 tail days for duration 5, logged 2');

  const html = card._calendarGrid(model, 'en');
  assert.ok(html.includes('is-current-period-tail'), 'calendar grid includes is-current-period-tail class');

  console.log('  ✓ current period tail: days 3–5 rendered as light red when logged through day 2 of 5');
}

function testCurrentPeriodTailLoggedDaysNotOverwritten() {
  // Logged days must NOT be overwritten by tail styling.
  const card = new CardClass();
  card.setConfig({ entity: 'sensor.menstruation' });
  card.hass = makeHassActivePeriod(2, 5);
  card._viewDate = new Date(2026, 7, 1, 12, 0, 0, 0);

  const model = card._buildModel();
  // Logged days 1 and 2 must not be in tail set.
  assert.ok(!model.currentPeriodTailSet.has('2026-08-01'), 'logged day 1 not in tail set');
  assert.ok(!model.currentPeriodTailSet.has('2026-08-02'), 'logged day 2 not in tail set');

  // _statusForDay must give isPeriod=true, isCurrentPeriodTail=false for logged days.
  const st1 = card._statusForDay('2026-08-01', model);
  assert.ok(st1.isPeriod, 'logged day 1 is period day');
  assert.ok(!st1.isCurrentPeriodTail, 'logged day 1 not a tail day');
  const st2 = card._statusForDay('2026-08-02', model);
  assert.ok(st2.isPeriod, 'logged day 2 is period day');
  assert.ok(!st2.isCurrentPeriodTail, 'logged day 2 not a tail day');

  console.log('  ✓ current period tail: logged days not overwritten by tail prediction');
}

function testCurrentPeriodTailDisappearsWhenPeriodEnds() {
  // When logged days equal or exceed the predicted duration, no tail is shown.
  const card = new CardClass();
  card.setConfig({ entity: 'sensor.menstruation' });
  card.hass = makeHassActivePeriod(5, 5); // exactly at duration
  const model = card._buildModel();
  assert.strictEqual(model.currentPeriodTailSet.size, 0, 'no tail when logged days equal duration');
  console.log('  ✓ current period tail: tail disappears when logged days reach duration');
}

function testCurrentPeriodTailNoCbb() {
  // Without current_bleeding_block, no tail is shown.
  const card = new CardClass();
  card.setConfig({ entity: 'sensor.menstruation' });
  card.hass = makeHassActivePeriod(2, 5);
  // Remove current_bleeding_block.
  card._hass.states['sensor.menstruation'].attributes.current_bleeding_block = null;
  const model = card._buildModel();
  assert.strictEqual(model.currentPeriodTailSet.size, 0, 'no tail when current_bleeding_block is absent');
  console.log('  ✓ current period tail: no tail when current_bleeding_block is absent');
}

function testCurrentPeriodTailLegendEntry() {
  // Legend should show the light-red swatch when there are tail days.
  const card = new CardClass();
  card.setConfig({ entity: 'sensor.menstruation', show_predicted_cycles: true });
  card.hass = makeHassActivePeriod(2, 5);
  card._viewDate = new Date(2026, 7, 1, 12, 0, 0, 0);
  card._render();
  const html = card.shadowRoot.innerHTML;
  assert.ok(html.includes('current-period-tail'), 'legend includes current-period-tail swatch when tail days exist');
  console.log('  ✓ current period tail: legend entry shown when tail days exist');
}

function testLearningPhaseBadgesAndLowConfidenceOvulationSuppression() {
  const card = new CardClass();
  card.setConfig({ entity: 'sensor.menstruation', show_predicted_cycles: true, show_ovulation_marker: true });
  const hass = makeHassWithPredictions();
  hass.states['sensor.menstruation'].attributes.learning_phase = true;
  hass.states['sensor.menstruation'].attributes.onboarding_stage_effective = 'early_menarche';
  hass.states['sensor.menstruation'].attributes.prediction_gating = { confidence: 'low' };
  card.hass = hass;
  card._viewDate = new Date(2026, 7, 1, 12, 0, 0, 0);
  card._render();
  const html = card.shadowRoot.innerHTML;
  assert.ok(html.includes('Learning phase'), 'learning phase badge missing');
  assert.ok(html.includes('Low confidence'), 'low confidence badge missing');
  assert.ok(!html.includes('swatch ovulation'), 'ovulation legend should be hidden in low-confidence learning phase');

  const model = card._buildModel();
  const st = card._statusForDay('2026-08-12', model);
  assert.ok(!st.isPredictedOvulation, 'predicted ovulation should be suppressed in low-confidence learning phase');
  console.log('  ✓ learning phase badges render and predicted ovulation is suppressed at low confidence');
}

function testPreMenarcheSuppressesPredictedCycleMarkers() {
  const card = new CardClass();
  card.setConfig({ entity: 'sensor.menstruation', show_predicted_cycles: true, show_ovulation_marker: true });
  const hass = makeHassWithPredictions();
  hass.states['sensor.menstruation'].state = 'pre_menarche';
  hass.states['sensor.menstruation'].attributes.onboarding_stage_effective = 'pre_menarche';
  card.hass = hass;
  card._viewDate = new Date(2026, 7, 1, 12, 0, 0, 0);
  const model = card._buildModel();
  const st = card._statusForDay('2026-08-12', model);
  assert.ok(!st.isPredictedPeriod, 'pre-menarche should suppress predicted period markers');
  assert.ok(!st.isPredictedFertile, 'pre-menarche should suppress predicted fertile markers');
  assert.ok(!st.isPredictedOvulation, 'pre-menarche should suppress predicted ovulation markers');
  console.log('  ✓ pre-menarche suppresses deterministic predicted markers');
}

let failed = 0;
[
  testRegistration,
  testWeekStartOption,
  testCalendarRenderingStates,
  testOvulationMarkerToggle,
  testPredictedCycleRendering,
  testPredictedCyclesToggle,
  testNumPredictedCyclesLimit,
  testPredictedLegendEntry,
  testPredictedLegendHidden,
  testEditorHasPredictedOptions,
  testTranslationFallbackHelpers,
  testNfpLowConfidenceIgnoredInCalendar,
  testRenderStability,
  testAttributeOnlyChangeTriggersRender,
  testForecastExtensionBeyondHorizon,
  testForecastExtensionRespectsCap,
  testForecastExtensionSensorLimitPreserved,
  testForecastExtensionDisabled,
  testPredictionConfidenceFallbackWhenMissing,
  testLearningPhaseBadgesAndLowConfidenceOvulationSuppression,
  testPreMenarcheSuppressesPredictedCycleMarkers,
  testCurrentPeriodTailShowsLightRed,
  testCurrentPeriodTailLoggedDaysNotOverwritten,
  testCurrentPeriodTailDisappearsWhenPeriodEnds,
  testCurrentPeriodTailNoCbb,
  testCurrentPeriodTailLegendEntry,
].forEach((fn) => {
  try {
    fn();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`  ✗ ${fn.name}: ${err.message}`);
    failed += 1;
  }
});

if (failed > 0) {
  // eslint-disable-next-line no-console
  console.error(`\n${failed} test(s) failed.`);
  process.exitCode = 1;
} else {
  // eslint-disable-next-line no-console
  console.log('\nAll tests passed.');
}
