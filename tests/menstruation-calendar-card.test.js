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

// The card normalizes option keys through window.MenstruationFunctions (shared module), so load it first.
// eslint-disable-next-line no-eval
eval(fs.readFileSync(
  path.join(__dirname, '../custom_components/menstruation_cycle/www/menstruation-functions.js'),
  'utf8',
));

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

function testBleedingOutsideThePeriod() {
  const hass = makeHass();
  hass.states['sensor.menstruation'].attributes.symptom_history = [
    { date: '2026-07-03', bleeding_strength: 'heavy' }, // a period day itself
    { date: '2026-07-08', bleeding_strength: 'Light' }, // 5 days after: outside the period
    { date: '2026-07-09', bleeding_strength: 'none' },
    { date: '2026-07-17', bleeding_strength: 'medium' }, // exactly 14 days after the last period day: still outside
    { date: '2026-07-18', bleeding_strength: 'medium' }, // 15 days: a missing period start, not marked
    { date: '2026-07-20', pain: ['cramps'] }, // no bleeding
  ];
  const card = new CardClass();
  card.setConfig({ entity: 'sensor.menstruation' });
  card.hass = hass;
  card._viewDate = new Date(2026, 6, 1, 12, 0, 0, 0);
  const model = card._buildModel();
  assert.deepStrictEqual(model.intermenstrualByDate, { '2026-07-08': 'light', '2026-07-17': 'medium' });
  // flat entries (the stored shape) now count as logged symptoms: dot on every day with an entry
  assert.strictEqual(model.symptomByDate['2026-07-20'].pain[0], 'cramps');
  assert.strictEqual('date' in model.symptomByDate['2026-07-20'], false);
  const html = card._calendarGrid(model, 'en');
  assert.strictEqual((html.match(/class="im-mark"/g) || []).length, 2, 'marker on both days');
  assert.strictEqual((html.match(/is-intermenstrual/g) || []).length, 2);
  assert.strictEqual((html.match(/class="sym-dot"/g) || []).length, 6, 'one dot per day with an entry');
  assert.ok(html.includes('Bleeding outside the period'), 'tooltip names it');
  // nothing marked without a period day before it
  hass.states['sensor.menstruation'].attributes.history = [];
  card.hass = { ...hass };
  assert.deepStrictEqual(card._buildModel().intermenstrualByDate, {});
  console.log('  ✓ marks bleeding outside the period (14-day rule) and reads flat symptom entries');
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

function testLutealForecastMarker() {
  const render = (nfp) => {
    const card = new CardClass();
    card.setConfig({ entity: 'sensor.menstruation' });
    const hass = makeHass();
    if (nfp !== undefined) hass.states['sensor.menstruation'].attributes.nfp_analysis = nfp;
    card.hass = hass;
    card._viewDate = new Date(2026, 6, 1, 12, 0, 0, 0);
    return card._calendarGrid(card._buildModel(), 'en');
  };
  const html = render({ luteal_forecast: { predicted_start: '2026-07-20', luteal_days: 14, difference_days: 2 } });
  assert.strictEqual((html.match(/is-luteal-forecast/g) || []).length, 1, 'exactly one day is marked');
  assert.strictEqual((html.match(/class="luteal-mark"/g) || []).length, 1, 'one mark is rendered');
  const cell = html.split('<button').find((part) => part.includes('data-iso="2026-07-20"'));
  assert.ok(cell.includes('is-luteal-forecast') && cell.includes('luteal-mark'), 'the predicted day carries the marker');
  assert.ok(cell.includes('Period expected from temperature'), 'tooltip explains the marker');
  // month without the date, missing forecast, forecast without date: nothing
  assert.ok(!render({ luteal_forecast: { predicted_start: '2026-08-20' } }).includes('luteal-mark'));
  assert.ok(!render().includes('luteal-mark'));
  assert.ok(!render({ luteal_forecast: {} }).includes('luteal-mark'));
  assert.ok(!render({ luteal_forecast: { predicted_start: 'nonsense' } }).includes('luteal-mark'));
  console.log('  ✓ marks the period date expected from the luteal phase');
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

function testDayDialogGrowsFromTheDayAndShrinksBack() {
  const card = new CardClass();
  card.attachShadow({ mode: 'open' });
  const calls = [];
  const mk = (rect) => ({
    getBoundingClientRect: () => rect,
    getAnimations: () => [],
    animate(frames) {
      calls.push(frames);
      return { finished: { then: (done) => done() } }; // finishes at once
    },
    classList: { add(c) { this.last = c; }, remove() {} },
  });
  const dialog = mk({ left: 100, top: 100, width: 200, height: 400 });
  const cell = mk({ left: 20, top: 40, width: 40, height: 40 });
  const backdrop = mk({ left: 0, top: 0, width: 400, height: 600 });
  const overlay = mk({});
  card.shadowRoot.querySelector = (sel) => (sel === '.sym-dialog' ? dialog : sel === '.sym-backdrop' ? backdrop : sel.startsWith('[data-iso') ? cell : null);
  card.shadowRoot.getElementById = () => overlay;
  card._render = () => {};
  card._modalIso = '2026-07-05';

  card._growDialog(false);
  const open = calls.find((frames) => frames[0].transform);
  assert.ok(open[0].transform.includes('scale(0.2, 0.1)'), 'starts at the size of the tapped day');
  assert.strictEqual(open[1].transform, 'none', 'ends at full size');

  calls.length = 0;
  card._closeModal();
  const shrink = calls.find((frames) => frames[0].transform);
  assert.strictEqual(shrink[0].transform, 'none', 'close plays the movement backwards');
  assert.ok(shrink[1].transform.includes('scale'), 'and ends small, at the day');
  assert.strictEqual(card._modalIso, null, 'closed once the animation is done');

  card._modalIso = '2026-07-05';
  card._setModalCollapsed(true);
  assert.strictEqual(overlay.classList.last, 'sym-collapsed', 'scrolled away: shrunk, not closed');
  assert.strictEqual(card._modalIso, '2026-07-05', 'what was typed is kept');
}

function testSeveralDaysPickFirstAndLastDay() {
  const card = new CardClass();
  card.setConfig({ entity: 'sensor.menstruation' });
  card._hass = makeHass();
  card._render = () => {};
  const opened = [];
  card._openSymptomModalForDay = (iso) => opened.push(iso);
  card._activateDay('2020-03-10');
  assert.deepStrictEqual(opened, ['2020-03-10'], 'normally a tap opens that day');
  card._rangeMode = true;
  card._activateDay('2020-03-12');
  assert.strictEqual(card._rangeStart, '2020-03-12', 'the first tap only marks the start');
  assert.strictEqual(card._modalRange, null);
  card._activateDay('2020-03-10');
  assert.deepStrictEqual(card._modalRange.days, ['2020-03-10', '2020-03-11', '2020-03-12'], 'the second tap picks the range, in either direction');
  assert.strictEqual(card._modalIso, '2020-03-10');
  assert.strictEqual(card._rangeStart, null);
  assert.strictEqual(opened.length, 1, 'no single day dialog in this mode');
  card._modalRange = null; card._modalIso = null;
  card._activateDay('2020-01-01');
  card._activateDay('2020-03-01');
  assert.strictEqual(card._modalRange.days.length, 31, 'at most 31 days');
  assert.strictEqual(card._modalRange.to, '2020-01-31');
  card._modalRange = null; card._modalIso = null; card._rangeStart = null;
  card._activateDay('2999-01-01');
  assert.strictEqual(card._rangeStart, null, 'a day in the future cannot start a range');
  card._activateDay('2020-03-05');
  card._activateDay('2020-03-05');
  assert.deepStrictEqual(card._modalRange.days, ['2020-03-05'], 'the same day twice is a range of one');
}

function testSeveralDaysDialog() {
  const render = (range, state = 'ok') => {
    const card = new CardClass();
    card.setConfig({ entity: 'sensor.menstruation' });
    const hass = makeHass();
    hass.states['sensor.menstruation'].state = state;
    card._hass = hass;
    card._modalRange = range;
    return card._renderSymptomModal('2020-03-10', card._buildModel());
  };
  const single = render(null);
  assert.ok(single.includes('id="sym-basal-temp"') && !single.includes('sym-range-period'), 'the single day dialog is unchanged');
  const range = render({ from: '2020-03-10', to: '2020-03-12', days: ['2020-03-10', '2020-03-11', '2020-03-12'] });
  assert.ok(range.includes('Edit days') && range.includes('(3)'), 'names the days');
  assert.ok(range.includes('Applies to all 3 days'), 'says what happens');
  assert.ok(range.includes('id="sym-range-period"'), 'offers to enter them as period days');
  assert.ok(range.includes('class="sym-range-period"'), 'as a plain checkbox, not an option tile');
  assert.ok(!range.includes('id="sym-basal-temp"'), 'one temperature for many days makes no sense');
  assert.ok(!range.includes('data-cat="_period"'), 'no single day period toggle');
  assert.ok(!render({ from: '2020-03-10', to: '2020-03-12', days: ['2020-03-10'] }, 'pre_menarche').includes('sym-range-period'), 'no period days before the first period');
}

async function testSeveralDaysSave() {
  const run = async ({ period, selected }) => {
    const card = new CardClass();
    card.setConfig({ entity: 'sensor.menstruation' });
    const hass = makeHass();
    const calls = [];
    hass.callService = async (domain, service, data) => { calls.push([service, data.date, data.symptom_data]); };
    card._hass = hass;
    card.shadowRoot.getElementById = (id) => (id === 'sym-range-period' ? { checked: period } : null);
    card.shadowRoot.querySelector = (sel) => (selected && sel === '.sym-opt-btn.sym-selected[data-cat="bleeding_strength"]' ? { getAttribute: () => 'light' } : null);
    card._render = () => {};
    card._modalRange = { from: '2020-03-10', to: '2020-03-11', days: ['2020-03-10', '2020-03-11'] };
    card._modalIso = '2020-03-10';
    card._rangeMode = true;
    await card._handleModalSave();
    assert.strictEqual(card._modalRange, null);
    assert.strictEqual(card._modalIso, null);
    assert.strictEqual(card._rangeMode, false, 'back to the normal mode');
    return calls.filter((call) => call[0] !== 'update_entity');
  };
  const both = await run({ period: true, selected: true });
  assert.deepStrictEqual(both.filter((call) => call[0] === 'add_cycle_start').map((call) => call[1]), ['2020-03-10', '2020-03-11'], 'every day becomes a period day');
  assert.deepStrictEqual(both.filter((call) => call[0] === 'add_symptom').map((call) => [call[1], call[2]]), [['2020-03-10', { bleeding_strength: 'light' }], ['2020-03-11', { bleeding_strength: 'light' }]], 'and gets the same entries');
  const onlyEntries = await run({ period: false, selected: true });
  assert.ok(!onlyEntries.some((call) => call[0] === 'add_cycle_start'), 'no period days unless asked');
  assert.strictEqual(onlyEntries.length, 2);
  const nothing = await run({ period: false, selected: false });
  assert.deepStrictEqual(nothing, [], 'empty fields change nothing');
}

function testSeveralDaysMarkersAndRenderKey() {
  const card = new CardClass();
  card.setConfig({ entity: 'sensor.menstruation' });
  card._hass = makeHass();
  card._viewDate = new Date(2026, 6, 15);
  const before = card._buildRenderKey();
  card._rangeMode = true;
  assert.notStrictEqual(card._buildRenderKey(), before, 'switching the mode redraws');
  card._rangeStart = '2026-07-14';
  card._lastRenderKey = null;
  card._render();
  const html = card.shadowRoot.innerHTML;
  assert.ok(html.includes('data-action="range-toggle"') && html.includes('aria-pressed="true"'), 'the switch shows it is on');
  assert.ok(html.includes('Now tap the last day.'), 'and what to do next');
  card._modalRange = { from: '2026-07-14', to: '2026-07-15', days: ['2026-07-14', '2026-07-15'] };
  card._lastRenderKey = null;
  card._render();
  assert.ok(!card.shadowRoot.innerHTML.includes('Now tap the last day.') && !card.shadowRoot.innerHTML.includes('Tap the first day.'), 'no hint behind the open dialog');
  card._modalRange = null;
  const marked = html.split('<button').slice(1).filter((part) => part.includes('range-edge'));
  assert.strictEqual(marked.length, 1, 'exactly the first day is marked');
  assert.ok(marked[0].includes('data-iso="2026-07-14"'));
  const key = card._buildRenderKey();
  card._rangeStart = null;
  assert.notStrictEqual(card._buildRenderKey(), key, 'picking the start redraws');
}

function testDialogListenersAreAttachedOnce() {
  const card = new CardClass();
  card.setConfig({ entity: 'sensor.menstruation' });
  card._hass = makeHass();
  const added = [];
  card.shadowRoot.addEventListener = (type) => added.push(type);
  for (let month = 0; month < 4; month += 1) {
    card._viewDate = new Date(2026, month, 15);
    card._render();
  }
  assert.strictEqual(added.filter((type) => type === 'click').length, 1, 'one click listener on the shadow root, however often the card is redrawn (else a save would run several times)');
  assert.strictEqual(added.filter((type) => type === 'keydown').length, 1, 'and one keyboard listener for the dialog');
}

function testDayDialogIsAnAccessibleDialog() {
  const card = new CardClass();
  card.setConfig({ entity: 'sensor.menstruation' });
  card._hass = makeHass();
  const html = card._renderSymptomModal('2026-07-14', card._buildModel());
  assert.ok(/<div class="sym-dialog"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-label="Edit Day: /.test(html), 'a dialog with a name');
  assert.ok(html.includes('tabindex="-1"'), 'which can take the focus');
  assert.ok(/class="sym-close" aria-label="Close"/.test(html), 'the close button has a real name');
  const key = (init) => { let prevented = false; return { key: init.key, shiftKey: !!init.shiftKey, preventDefault: () => { prevented = true; }, get prevented() { return prevented; } }; };
  const handlers = {};
  card.shadowRoot.addEventListener = (type, fn) => { handlers[type] = fn; };
  const focused = [];
  const first = { focus: () => focused.push('first') };
  const last = { focus: () => focused.push('last') };
  card.shadowRoot.querySelectorAll = (sel) => (sel.includes('.sym-dialog') ? [first, last] : []);
  card.shadowRoot.activeElement = last;
  card._lastRenderKey = null;
  card._modalIso = '2026-07-14';
  card._render();
  let closed = 0;
  card._closeModal = () => { closed += 1; };
  const esc = key({ key: 'Escape' });
  handlers.keydown(esc);
  assert.ok(closed === 1 && esc.prevented, 'Escape closes the dialog');
  const tab = key({ key: 'Tab' });
  handlers.keydown(tab);
  assert.deepStrictEqual(focused, ['first'], 'Tab on the last control goes to the first (focus stays in the dialog)');
  card.shadowRoot.activeElement = first;
  handlers.keydown(key({ key: 'Tab', shiftKey: true }));
  assert.deepStrictEqual(focused, ['first', 'last'], 'and Shift+Tab on the first goes to the last');
  card._modalIso = null;
  const other = key({ key: 'Escape' });
  handlers.keydown(other);
  assert.strictEqual(closed, 1, 'Escape does nothing while no dialog is open');
}

let failed = 0;

function testBasalTempFieldFollowsProfileUnit() {
  const render = (unit) => {
    const card = new CardClass();
    card.setConfig({ entity: 'sensor.menstruation' });
    const hass = makeHass();
    if (unit) hass.states['sensor.menstruation'].attributes.temperature_unit = unit;
    card._hass = hass;
    const iso = '2026-07-14';
    card._symptomOverrides = { [iso]: { basal_temp: 36.6 } };
    const model = card._buildModel();
    return card._renderSymptomModal(iso, model, card._palette?.(model.state));
  };
  const c = render('celsius');
  assert.ok(c.includes('(°C)') && c.includes('value="36.6"') && c.includes('min="35" max="42"') && c.includes('placeholder="36.5"'), 'celsius form');
  assert.ok(render(undefined).includes('value="36.6"'), 'missing attribute falls back to celsius');
  const f = render('fahrenheit');
  assert.ok(f.includes('(°F)') && !f.includes('(°C)'), 'fahrenheit label');
  assert.ok(f.includes('value="97.9"'), '36.6 C prefills as 97.9 F');
  assert.ok(f.includes('min="95" max="107.6"') && f.includes('placeholder="97.7"'), 'fahrenheit range and placeholder');
}

function pendingTimers() {
  const timers = [];
  const realSet = global.setTimeout;
  const realClear = global.clearTimeout;
  global.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
  global.clearTimeout = () => {};
  return { timers, restore: () => { global.setTimeout = realSet; global.clearTimeout = realClear; } };
}

async function testDeleteDayWithUndo() {
  const fake = pendingTimers();
  const realFns = window.MenstruationFunctions;
  const realConfirm = window.confirm;
  try {
    const card = new CardClass();
    card.setConfig({ entity: 'sensor.menstruation' });
    const hass = makeHass();
    const calls = [];
    hass.callService = async (domain, service, data) => { calls.push([service, data]); };
    card._hass = hass;
    const iso = '2026-07-14';
    const stored = { date: iso, bleeding_strength: 'light', pain: ['cramps'], basal_temp: 36.6, mood: 'tired', note: '', found: true, cervical_mucus: null };
    window.MenstruationFunctions = { ...realFns, fetchFreshSymptomData: async () => ({ data: stored }) };
    card._symptomOverrides = { [iso]: stored };

    // the button: only for a single day that has entries
    const model = card._buildModel();
    assert.ok(card._renderSymptomModal(iso, model).includes('class="btn ghost sym-delete">Delete all entries of this day'), 'a day with entries offers deleting');
    card._symptomOverrides = {};
    assert.ok(!card._renderSymptomModal('2026-07-20', model).includes('sym-delete'), 'an empty day does not');
    card._modalRange = { from: iso, to: iso, days: [iso] };
    assert.ok(!card._renderSymptomModal(iso, model).includes('sym-delete'), 'nor the several-days dialog');
    card._modalIso = iso;
    window.confirm = () => true;
    await card._handleDayDelete();
    assert.strictEqual(calls.filter(([service]) => service === 'remove_symptom').length, 0, 'with several days picked nothing is deleted');
    card._modalRange = null;
    card._symptomOverrides = { [iso]: stored };

    // declined: nothing happens, the dialog stays
    card._modalIso = iso;
    window.confirm = () => false;
    await card._handleDayDelete();
    assert.strictEqual(calls.filter(([service]) => service === 'remove_symptom').length, 0);
    assert.strictEqual(card._modalIso, iso, 'dialog stays open');

    // a failing service keeps the dialog and offers no undo
    window.confirm = () => true;
    hass.callService = async (domain, service) => { if (service === 'remove_symptom') throw new Error('boom'); };
    const quiet = console.error; console.error = () => {};
    await card._handleDayDelete();
    console.error = quiet;
    assert.ok(card._modalIso === iso && !card._undo, 'on an error the dialog stays and nothing can be undone');
    hass.callService = async (domain, service, data) => { calls.push([service, data]); };

    // delete: remove_symptom for the day, dialog closed, toast with Undo
    await card._handleDayDelete();
    const removal = calls.find(([service]) => service === 'remove_symptom');
    assert.deepStrictEqual(removal[1], { date: iso, entry_id: 'entry-1', profile: 'default', entity_id: 'sensor.menstruation' }, 'the call names the day and the profile');
    assert.ok(card._modalIso === null && card._undo.iso === iso && !(iso in card._symptomOverrides), 'closed, remembered for undo, cached copy dropped');
    assert.ok(/class="cal-toast"[^>]*>.*Entries of July 14 deleted\..*class="cal-undo">Undo/.test(card.shadowRoot.innerHTML), card.shadowRoot.innerHTML.slice(-900));
    assert.ok(fake.timers.some((t) => t.ms === 10000), 'the toast goes away after ten seconds');
    fake.timers.find((t) => t.ms === 10000).fn();
    assert.ok(!card._undo && !card.shadowRoot.innerHTML.includes('class="cal-toast"'), 'gone again');

    // undo: every stored value comes back (no date/found/empty values), the toast says so
    card._undo = { iso, data: stored };
    calls.length = 0;
    await card._undoDelete();
    const restore = calls.find(([service]) => service === 'add_symptom');
    assert.deepStrictEqual(restore[1].symptom_data, { bleeding_strength: 'light', pain: ['cramps'], basal_temp: 36.6, mood: 'tired' });
    assert.strictEqual(restore[1].date, iso);
    assert.ok(card._undo === null && card.shadowRoot.innerHTML.includes('Restored.') && !card.shadowRoot.innerHTML.includes('class="cal-undo"'), 'done, no second undo');
    // Fahrenheit profiles get the temperature in their unit again
    hass.states['sensor.menstruation'].attributes.temperature_unit = 'fahrenheit';
    card._undo = { iso, data: stored };
    calls.length = 0;
    await card._undoDelete();
    assert.strictEqual(calls[0][1].symptom_data.basal_temp, 97.9);
    hass.states['sensor.menstruation'].attributes.temperature_unit = 'celsius';

    // one rejected field must not cost the others
    hass.callService = async (domain, service, data) => {
      calls.push([service, data]);
      if (service === 'add_symptom' && ('mood' in data.symptom_data)) throw new Error('unknown field');
    };
    card._undo = { iso, data: stored };
    calls.length = 0;
    await card._undoDelete();
    const written = calls.filter(([service, data]) => service === 'add_symptom' && Object.keys(data.symptom_data).length === 1).map(([, data]) => Object.keys(data.symptom_data)[0]);
    assert.deepStrictEqual(written, ['bleeding_strength', 'pain', 'basal_temp', 'mood'], 'then field by field');
    assert.ok(card.shadowRoot.innerHTML.includes('Could not restore everything.'), 'and the note says something was lost');

    // wiring: the click handler reaches both actions, the delete button only inside the dialog
    const handlers = {};
    card.shadowRoot.addEventListener = (type, fn) => { handlers[type] = fn; };
    card._modalBound = false;
    card._lastRenderKey = null;
    card._render();
    let deleted = 0; let undone = 0;
    card._handleDayDelete = () => { deleted += 1; };
    card._undoDelete = () => { undone += 1; };
    const click = (selector) => handlers.click({ target: { closest: (sel) => (sel === selector ? {} : null) } });
    click('.cal-undo');
    assert.strictEqual(undone, 1, 'Undo works without an open dialog');
    click('.sym-delete');
    assert.strictEqual(deleted, 0, 'the delete button does nothing when no dialog is open');
    card._modalIso = iso;
    click('.sym-delete');
    assert.strictEqual(deleted, 1);
  } finally {
    window.MenstruationFunctions = realFns;
    window.confirm = realConfirm;
    fake.restore();
  }
}

function testPainStrengthInTheMonthGrid() {
  const card = new CardClass();
  card.setConfig({ entity: 'sensor.menstruation' });
  const hass = makeHass();
  hass.states['sensor.menstruation'].attributes.symptom_history = [
    { date: '2026-07-14', pain_intensity: 7 },
    { date: '2026-07-15', pain_intensity: 5 },
    { date: '2026-07-16', pain_intensity: 1 },
    { date: '2026-07-12', pain_intensity: 4 },
    { date: '2026-07-13', pain_intensity: 3 },
    { date: '2026-07-17', pain_intensity: 0 },
    { date: '2026-07-18', pain_intensity: 11 },
    { date: '2026-07-19', pain_intensity: 2.5 },
    { date: '2026-07-20', pain_intensity: '7' },
  ];
  card._hass = hass;
  card._viewDate = new Date(2026, 6, 15);
  const grid = card._calendarGrid(card._buildModel(), 'en');
  const cell = (iso) => grid.split('data-iso="').slice(1).find((part) => part.startsWith(`${iso}"`)) || '';
  assert.ok(/pain-bar pain-high" style="width:calc\(\(100% - 14px\) \* 0\.7\)"/.test(cell('2026-07-14')), 'strong pain: long dark bar');
  assert.ok(/pain-bar pain-mid" style="width:calc\(\(100% - 14px\) \* 0\.5\)"/.test(cell('2026-07-15')), 'medium');
  assert.ok(/pain-bar pain-low" style="width:calc\(\(100% - 14px\) \* 0\.1\)"/.test(cell('2026-07-16')), 'weak: short pale bar');
  assert.ok(cell('2026-07-12').includes('pain-mid') && cell('2026-07-13').includes('pain-low'), '4 is medium, 3 is weak');
  assert.ok(cell('2026-07-14').includes('Pain 7/10') && /aria-label="14\. [^"]*Pain 7\/10"/.test(cell('2026-07-14')), 'the number is in the tooltip and the screen reader label (the bar alone would be colour only)');
  ['2026-07-17', '2026-07-18', '2026-07-19', '2026-07-20', '2026-07-21'].forEach((iso) => assert.ok(!cell(iso).includes('pain-bar'), `${iso}: 0, out of range, not whole, text and no entry show no bar`));
  const page = card._render && (card._lastRenderKey = null, card._render(), card.shadowRoot.innerHTML);
  assert.ok(page.includes('swatch pain-bar-swatch') && page.includes('Pain strength'), 'legend entry when a bar is shown');
  hass.states['sensor.menstruation'].attributes.symptom_history = [{ date: '2026-07-14', bleeding_strength: 'light' }];
  card._lastRenderKey = null;
  card._render();
  assert.ok(!card.shadowRoot.innerHTML.includes('class="legend-item"><span class="swatch pain-bar-swatch"'), 'no legend entry without any pain strength');
}

[
  testDeleteDayWithUndo,
  testPainStrengthInTheMonthGrid,
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
  testBleedingOutsideThePeriod,
  testLutealForecastMarker,
  testBasalTempFieldFollowsProfileUnit,
  testDayDialogGrowsFromTheDayAndShrinksBack,
  testSeveralDaysPickFirstAndLastDay,
  testSeveralDaysDialog,
  testSeveralDaysSave,
  testSeveralDaysMarkersAndRenderKey,
  testDialogListenersAreAttachedOnce,
  testDayDialogIsAnAccessibleDialog,
].reduce((chain, fn) => chain.then(async () => {
  try {
    await fn();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`  ✗ ${fn.name}: ${err.message}`);
    failed += 1;
  }
}), Promise.resolve()).then(() => {
if (failed > 0) {
  // eslint-disable-next-line no-console
  console.error(`\n${failed} test(s) failed.`);
  process.exitCode = 1;
} else {
  // eslint-disable-next-line no-console
  console.log('\nAll tests passed.');
}
});
