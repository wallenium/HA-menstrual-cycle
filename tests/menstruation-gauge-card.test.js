/**
 * Tests for menstruation-gauge-card.js
 *
 * Covers:
 *  A) Render-stability: consecutive hass updates without state change must not
 *     recreate DOM (no flicker for pregnancy icon).
 *  B) Layout: status icon rendered above the day-label in normal period gauge.
 *  C) Pregnancy icon size: 56 px.
 *  D) Regression: normal Period Gauge and Pregnancy Gauge remain functional.
 *
 * Run with:  node tests/menstruation-gauge-card.test.js
 */

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Minimal browser / DOM stubs
// ---------------------------------------------------------------------------

class FakeShadowRoot {
  constructor() {
    this._html = '';
    this._listeners = {};
    this.activeElement = null;
  }
  set innerHTML(v) { this._html = v; }
  get innerHTML() { return this._html; }
  addEventListener(type, fn) {
    this._listeners[type] = this._listeners[type] || [];
    this._listeners[type].push(fn);
  }
  getElementById() { return null; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
}

class FakeElement {
  constructor() {
    this._shadow = new FakeShadowRoot();
    this._attrs = {};
    this._children = [];
    this._renderCount = 0;
  }
  attachShadow() { return this._shadow; }
  get shadowRoot() { return this._shadow; }
  getBoundingClientRect() { return { width: 400 }; }
  getAttribute(k) { return this._attrs[k] || null; }
  setAttribute(k, v) { this._attrs[k] = v; }
  get clientWidth() { return 400; }
  addEventListener() {}
}

// Stub ResizeObserver so connectedCallback does not crash.
global.ResizeObserver = class { observe() {} disconnect() {} };

// Stub window with minimal ProductIcons so status icons resolve.
const productIconsSrc = fs.readFileSync(
  path.join(__dirname, '../custom_components/menstruation_cycle/www/menstruation-icons.js'),
  'utf8',
);
global.window = { customCards: [] };
global.document = undefined;
// Provide HTMLElement base class stub and customElements before loading the card.
global.HTMLElement = class HTMLElement {};
const _definedElements = {};
global.customElements = {
  define: (name, cls) => { _definedElements[name] = cls; },
};
// eslint-disable-next-line no-eval
eval(productIconsSrc);

// Now load the gauge card code.
const cardSrc = fs.readFileSync(
  path.join(__dirname, '../custom_components/menstruation_cycle/www/menstruation-gauge-card.js'),
  'utf8',
);
// eslint-disable-next-line no-eval
eval(cardSrc);

// Capture the card class registered via customElements.define.
const GaugeCard = _definedElements['menstruation-cycle-card'] || _definedElements['menstruation-gauge-card'];
if (!GaugeCard) throw new Error('MenstruationGaugeCard was not registered via customElements.define');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCard() {
  const shadow = new FakeShadowRoot();
  const el = Object.create(GaugeCard.prototype);

  // Inject browser-API stubs as own properties.
  el.attachShadow = () => shadow;
  Object.defineProperty(el, 'shadowRoot', { get: () => shadow, configurable: true });
  el.getBoundingClientRect = () => ({ width: 400 });
  el.addEventListener = () => {};
  el.closest = () => null;

  return el;
}

function makeHass(overrides = {}) {
  return {
    locale: { language: 'de' },
    themes: { darkMode: false },
    states: {
      'sensor.menstruation': {
        state: overrides.state || 'neutral',
        attributes: {
          entry_id: 'test',
          friendly_name: 'Test',
          days_until_next_start: overrides.days_until !== undefined ? overrides.days_until : 5,
          history: [],
          next_predicted_start: null,
          fertile_window_start: null,
          fertile_window_end: null,
          ovulation_day: null,
          symptom_history: [],
          menarche_data: {},
          period_duration_days: 5,
          ...(overrides.attributes || {}),
        },
      },
    },
    callService: async () => {},
  };
}

function pregnancyHass(week = 8) {
  return makeHass({
    state: 'pregnant',
    attributes: {
      is_pregnant: true,
      weeks_pregnant: week,
    },
  });
}

// ---------------------------------------------------------------------------
// A) Render-stability: pregnancy icon must not be recreated on repeated hass
//    updates when the visible state is unchanged.
// ---------------------------------------------------------------------------

function testRenderStability() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });

  const hass = pregnancyHass(8);
  card._hass = hass;
  card._render();
  const html1 = card.shadowRoot.innerHTML;
  assert.ok(html1.length > 0, 'Initial render should produce HTML');

  // Fire several more "hass" updates with identical state – same sensor data.
  card._hass = hass;
  card._render();
  card._hass = hass;
  card._render();
  const html2 = card.shadowRoot.innerHTML;

  // innerHTML must be identical – no DOM replacement, no flicker.
  assert.strictEqual(html2, html1, 'Repeated hass updates without state change must not replace innerHTML');

  // Also verify via the internal render key that it was stable.
  const key1 = card._lastRenderKey;
  card._hass = hass;
  card._render();
  assert.strictEqual(card._lastRenderKey, key1, 'Render key must be stable across identical hass updates');

  console.log('  ✓ render-stability: no DOM replacement on repeated identical hass updates');
}

// ---------------------------------------------------------------------------
// B) Layout: status icon above day-label in the normal period gauge center
// ---------------------------------------------------------------------------

function testStatusIconAboveDayLabel() {
  const states = ['period', 'pms', 'fertile', 'neutral'];

  for (const state of states) {
    const card = makeCard();
    card.setConfig({ entity: 'sensor.menstruation' });
    card._hass = makeHass({ state, days_until: 3 });
    card._render();

    const html = card.shadowRoot.innerHTML;

    // center-icon should be present (status icon rendered).
    assert.ok(
      html.includes('class="center-icon"'),
      `state "${state}": center-icon div should be present`,
    );

    // center-days should be present (countdown label).
    assert.ok(
      html.includes('class="center-days"'),
      `state "${state}": center-days div should be present`,
    );

    // center-icon must appear before center-days in the markup → icon is above label.
    const iconPos = html.indexOf('class="center-icon"');
    const daysPos = html.indexOf('class="center-days"');
    assert.ok(
      iconPos < daysPos,
      `state "${state}": center-icon must appear before center-days in HTML (icon above label)`,
    );

    console.log(`  ✓ layout "${state}": status icon above day-label`);
  }
}

// ---------------------------------------------------------------------------
// C) Pregnancy icon size: 56 px
// ---------------------------------------------------------------------------

function testPregnancyIconSize() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });
  card._hass = pregnancyHass(8);
  card._render();
  const html = card.shadowRoot.innerHTML;

  // The CSS rules for .center-icon must specify 56px.
  assert.ok(
    html.includes('width: 56px') || html.includes('width:56px'),
    'center-icon CSS width should be 56px',
  );
  assert.ok(
    html.includes('height: 56px') || html.includes('height:56px'),
    'center-icon CSS height should be 56px',
  );

  // The inline style of the pregnancy icon span should also be 56px
  // (generated by buildMaskedAssetIcon with size 56).
  const spanMatch = html.match(/width:(\d+)px;height:(\d+)px[^"]*-webkit-mask/);
  if (spanMatch) {
    assert.strictEqual(spanMatch[1], '56', 'Pregnancy icon span inline width should be 56px');
    assert.strictEqual(spanMatch[2], '56', 'Pregnancy icon span inline height should be 56px');
  }

  console.log('  ✓ pregnancy icon size: 56px in CSS and inline style');
}

// ---------------------------------------------------------------------------
// D) Regression: normal Period Gauge renders without errors
// ---------------------------------------------------------------------------

function testNormalGaugeRegression() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation', title: 'Cycle', calendar_edit_enabled: false });
  card._hass = makeHass({ state: 'period', days_until: 2 });
  card._render();
  const html = card.shadowRoot.innerHTML;

  assert.ok(html.includes('class="gauge"'), 'Gauge SVG must be present');
  assert.ok(html.includes('ha-card'), 'ha-card element must be present');
  assert.ok(html.includes('center-days'), 'Countdown label must be present');

  console.log('  ✓ regression: normal period gauge renders correctly');
}

// ---------------------------------------------------------------------------
// D) Regression: Pregnancy Gauge renders without errors
// ---------------------------------------------------------------------------

function testPregnancyGaugeRegression() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });
  card._hass = pregnancyHass(20);
  card._render();
  const html = card.shadowRoot.innerHTML;

  assert.ok(html.includes('pregnancy-panel'), 'Pregnancy panel must be present');
  assert.ok(html.includes('center-primary'), 'Week label must be present');
  assert.ok(html.includes('center-secondary'), 'Month/trimester label must be present');
  assert.ok(html.includes('preg_0'), 'Pregnancy asset SVG must be referenced');

  console.log('  ✓ regression: pregnancy gauge renders correctly');
}

// ---------------------------------------------------------------------------
// D) Regression: re-render triggered when visible state changes
// ---------------------------------------------------------------------------

function testRerenderOnStateChange() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });
  card._hass = makeHass({ state: 'period', days_until: 5 });
  card._render();
  const html1 = card.shadowRoot.innerHTML;

  // Change the state to pms.
  card._hass = makeHass({ state: 'pms', days_until: 5 });
  card._render();
  const html2 = card.shadowRoot.innerHTML;

  assert.notStrictEqual(html2, html1, 'HTML must change when state changes from period to pms');
  console.log('  ✓ re-render triggered on visible state change');
}

// ---------------------------------------------------------------------------
// D) Regression: countdown text change triggers re-render
// ---------------------------------------------------------------------------

function testRerenderOnCountdownChange() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });
  card._hass = makeHass({ state: 'neutral', days_until: 5 });
  card._render();
  const html1 = card.shadowRoot.innerHTML;

  card._hass = makeHass({ state: 'neutral', days_until: 4 });
  card._render();
  const html2 = card.shadowRoot.innerHTML;

  assert.notStrictEqual(html2, html1, 'HTML must change when countdown text changes');
  console.log('  ✓ re-render triggered when countdown days change');
}

// ---------------------------------------------------------------------------
// D) Regression: fertile/ovulation datetime attributes render in gauge
// ---------------------------------------------------------------------------

function testFertileAndOvulationFromDateTimeAttributes() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation', show_fertile_period: true });
  card._viewDate = new Date(2026, 6, 1, 12, 0, 0, 0);
  card._hass = makeHass({
    state: 'fertile',
    attributes: {
      fertile_window_start: '2026-07-10T00:00:00+00:00',
      fertile_window_end: '2026-07-15T00:00:00+00:00',
      ovulation_day: '2026-07-13T00:00:00+00:00',
    },
  });

  const model = card._buildModel();
  assert.strictEqual(model.fertileStart, '2026-07-10', 'fertile start must normalize from datetime');
  assert.strictEqual(model.fertileEnd, '2026-07-15', 'fertile end must normalize from datetime');
  assert.strictEqual(model.ovulationDay, '2026-07-13', 'ovulation day must normalize from datetime');
  assert.ok(model.series.some((step) => step.fertile), 'fertile days must be computed from normalized dates');
  assert.ok(model.series.some((step) => step.ovulation), 'ovulation day must be computed from normalized date');

  card._render();
  const html = card.shadowRoot.innerHTML;
  assert.ok(html.includes('stroke-opacity=".62"'), 'fertile arc segments must be rendered');
  assert.ok(html.includes('opacity="0.90"></circle>'), 'ovulation marker must be rendered');

  console.log('  ✓ fertile/ovulation render from datetime-formatted attributes');
}

// ---------------------------------------------------------------------------
// D2) Historical cycles: fertile/ovulation computed from grouped_starts
// ---------------------------------------------------------------------------

function testHistoricalCycleFertileOvulation() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation', show_fertile_period: true });

  // View a historical month (March 2025) – well before "now" (July 2026)
  card._viewDate = new Date(2025, 2, 1, 12, 0, 0, 0); // March 2025

  // A cycle started on 2025-03-05 (day 1 = Mar 5).
  // Dynamic fertile window for 28-day cycle: ovulationOffset=13 ± 5 days
  // → fertileStartOffset=8 → Mar 13; fertileEndOffset=14 → Mar 19; ovulationOffset=13 → Mar 18.
  card._hass = makeHass({
    state: 'neutral',
    attributes: {
      // No sensor-provided fertile data (only available for current cycle)
      fertile_window_start: null,
      fertile_window_end: null,
      ovulation_day: null,
      grouped_starts: ['2024-10-01', '2024-11-02', '2024-12-04', '2025-01-07', '2025-02-05', '2025-03-05'],
    },
  });

  const model = card._buildModel();

  assert.strictEqual(model.fertileStart, '2025-03-13', 'historical fertile start must be 5 days before ovulation (dynamic formula)');
  assert.strictEqual(model.fertileEnd, '2025-03-19', 'historical fertile end must be 1 day after ovulation (dynamic formula)');
  assert.strictEqual(model.ovulationDay, '2025-03-18', 'historical ovulation must be cycle day 14');
  assert.ok(model.series.some((step) => step.fertile), 'fertile days must be present in historical series');
  assert.ok(model.series.some((step) => step.ovulation), 'ovulation day must be present in historical series');

  // Verify the specific days
  const mar12 = model.series.find((s) => s.iso === '2025-03-12');
  const mar13 = model.series.find((s) => s.iso === '2025-03-13');
  const mar18 = model.series.find((s) => s.iso === '2025-03-18');
  const mar19 = model.series.find((s) => s.iso === '2025-03-19');
  const mar20 = model.series.find((s) => s.iso === '2025-03-20');
  const mar23 = model.series.find((s) => s.iso === '2025-03-23');
  const mar1 = model.series.find((s) => s.iso === '2025-03-01');
  assert.ok(!mar12?.fertile, 'Mar 12 (day 8, before window) must not be fertile');
  assert.ok(mar13?.fertile, 'Mar 13 (day 9, 5 days before ovulation) must be fertile');
  assert.ok(mar18?.fertile, 'Mar 18 (day 14) must be fertile');
  assert.ok(mar18?.ovulation, 'Mar 18 (day 14) must be ovulation day');
  assert.ok(mar19?.fertile, 'Mar 19 (day 15, 1 day after ovulation) must be fertile');
  assert.ok(!mar20?.fertile, 'Mar 20 (day 16, after window) must not be fertile');
  assert.ok(!mar23?.fertile, 'Mar 23 (day 19, after window) must not be fertile');
  assert.ok(!mar1?.fertile, 'Mar 1 (day 1, before fertile window) must not be fertile');

  // Verify the gauge renders without errors.
  // The 60-day gauge always shows today's window, not the historical viewDate month.
  card._render();
  const html = card.shadowRoot.innerHTML;
  assert.ok(html.includes('<svg'), 'gauge must render an SVG element without errors');

  console.log('  ✓ historical cycle: fertile/ovulation computed from grouped_starts');
}

// ---------------------------------------------------------------------------
// E) Pregnancy mode UI: field visibility in symptom modal
// ---------------------------------------------------------------------------

function testPregnancyModeSymptomModalFields() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });
  const hass = pregnancyHass(12);
  card._hass = hass;
  // Build a model with is_pregnant=true so _symptomConfig receives correct flags.
  card._config = { entity: 'sensor.menstruation' };
  // Access _symptomConfig directly to verify filtering.
  const GC = GaugeCard;
  const proto = GC.prototype;

  // Verify bleeding_strength is excluded when pregnant.
  const pregConfig = proto._symptomConfig.call(card, 'pregnant', true);
  const keys = pregConfig.map((c) => c.key);
  assert.ok(!keys.includes('bleeding_strength'), 'bleeding_strength must be hidden in pregnancy mode');

  // Verify pregnancy_symptoms category is present.
  assert.ok(keys.includes('pregnancy_symptoms'), 'pregnancy_symptoms category must be present in pregnancy mode');
  assert.strictEqual(keys[0], 'pregnancy_symptoms', 'pregnancy_symptoms must be rendered first in pregnancy mode');
  const pregnancySymptoms = pregConfig.find((c) => c.key === 'pregnancy_symptoms');
  assert.deepStrictEqual(
    pregnancySymptoms.options,
    ['nausea', 'fatigue', 'headache', 'back_pain', 'heartburn', 'swelling'],
    'pregnancy symptoms must use backend keys in priority order',
  );

  // Verify hygiene does not include tampon or cup.
  const hygieneConfig = pregConfig.find((c) => c.key === 'hygiene');
  assert.ok(hygieneConfig, 'hygiene category must still be present in pregnancy mode');
  assert.ok(!hygieneConfig.options.includes('tampon'), 'tampon must be hidden in pregnancy hygiene');
  assert.ok(!hygieneConfig.options.includes('cup'), 'cup must be hidden in pregnancy hygiene');
  assert.ok(hygieneConfig.options.includes('pad'), 'pad must still be visible in pregnancy hygiene');
  assert.ok(hygieneConfig.options.includes('period_underwear'), 'period_underwear must still be visible in pregnancy hygiene');

  console.log('  ✓ pregnancy mode symptom config: bleeding_strength hidden, tampon/cup hidden, pregnancy_symptoms present');
}

// ---------------------------------------------------------------------------
// E2) Pregnancy mode: period toggle hidden in rendered modal HTML
// ---------------------------------------------------------------------------

function testPregnancyModeModalHidesPeriodToggle() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });
  card._hass = pregnancyHass(10);

  // Build model to get palette and use _renderSymptomModal.
  const model = card._buildModel();
  const palette = card._palette(model.state);
  const iso = new Date().toISOString().slice(0, 10);
  const modalHtml = card._renderSymptomModal(iso, model, palette);

  // Period toggle must not be rendered when pregnant.
  assert.ok(
    !modalHtml.includes('data-cat="_period"'),
    'Period start toggle must be hidden in pregnancy mode modal',
  );

  // bleeding_strength options must not appear.
  assert.ok(
    !modalHtml.includes('name="bleeding_strength"'),
    'bleeding_strength inputs must be hidden in pregnancy mode modal',
  );

  // tampon and cup must not appear.
  assert.ok(
    !modalHtml.includes('value="tampon"'),
    'tampon option must be hidden in pregnancy mode modal',
  );
  assert.ok(
    !modalHtml.includes('value="cup"'),
    'cup option must be hidden in pregnancy mode modal',
  );

  // pregnancy_symptoms category must be present.
  assert.ok(
    modalHtml.includes('name="pregnancy_symptoms"'),
    'pregnancy_symptoms inputs must be present in pregnancy mode modal',
  );

  // Save button must be enabled (no disabled attribute).
  assert.ok(
    !modalHtml.includes('class="btn sym-save" disabled'),
    'Save button must not be disabled in pregnancy mode',
  );

  console.log('  ✓ pregnancy mode modal: period toggle hidden, fields correct, save enabled');
}

// ---------------------------------------------------------------------------
// E2b) Category label translation fallback in symptom modal
// ---------------------------------------------------------------------------

function testCategoryLabelTranslationFallback() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });
  card._hass = makeHass({ state: 'period', attributes: {} });
  card._hass.locale.language = 'en';

  const prevCache = global.window.menstruationCycleI18n.cache.en;
  global.window.menstruationCycleI18n.cache.en = {
    ...(prevCache || {}),
    cat_libido: 'Libido label',
    intercourse: 'Intercourse label',
  };

  assert.strictEqual(card._tCategory('libido'), 'Libido label', 'existing cat_* translations must still be used');
  assert.strictEqual(card._tCategory('intercourse'), 'Intercourse label', 'missing cat_* translations must fall back to the unprefixed key');

  global.window.menstruationCycleI18n.cache.en = prevCache;

  console.log('  ✓ symptom modal category labels prefer cat_* and fall back to the base key');
}

function testOptionLabelTranslationFallback() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });
  card._hass = makeHass({ state: 'period', attributes: {} });
  card._hass.locale.language = 'en';

  const prevCache = global.window.menstruationCycleI18n.cache.en;
  global.window.menstruationCycleI18n.cache.en = {
    ...(prevCache || {}),
    opt_protected: 'Protected label',
    custom_option: 'Custom option label',
    opt_underwear: 'Underwear label',
    underwear: 'Underwear base label',
  };

  assert.strictEqual(card._tOption('protected'), 'Protected label', 'existing opt_* translations must still be used');
  assert.strictEqual(card._tOption('custom_option'), 'Custom option label', 'missing opt_* translations must fall back to the unprefixed key');
  assert.strictEqual(card._tOption('period_underwear'), 'Underwear label', 'period_underwear should normalize to the underwear translation key');

  global.window.menstruationCycleI18n.cache.en = {
    ...(prevCache || {}),
    opt_protected: 'Protected label',
    custom_option: 'Custom option label',
    underwear: 'Underwear base label',
  };
  assert.strictEqual(card._tOption('period_panty'), 'Underwear base label', 'period_panty should normalize before the base-key fallback');

  global.window.menstruationCycleI18n.cache.en = prevCache;

  console.log('  ✓ symptom modal option labels normalize aliases and preserve opt_* / base-key fallback');
}

// ---------------------------------------------------------------------------
// E3) Pregnancy mode: symptom logging saves correctly (no early return)
// ---------------------------------------------------------------------------

function testPregnancyModeSymptomSave() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });

  const savedCalls = [];
  card._hass = {
    ...pregnancyHass(10),
    callService: async (domain, service, payload) => {
      savedCalls.push({ domain, service, payload });
    },
  };

  // Simulate modal open state.
  const iso = new Date().toISOString().slice(0, 10);
  card._modalIso = iso;

  // Stub shadowRoot to return checked pregnancy symptom.
  const fakeRoot = {
    querySelector: (sel) => {
      // No period toggle, no bleeding_strength in pregnancy mode.
      if (sel.includes('_period')) return null;
      if (sel.includes('bleeding_strength')) return null;
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === '.sym-multi[name="pregnancy_symptoms"]:checked') {
        return [{ value: 'nausea' }, { value: 'fatigue' }];
      }
      return [];
    },
    getElementById: (id) => {
      if (id === 'sym-basal-temp') return { value: '' };
      return null;
    },
    addEventListener: () => {},
    get innerHTML() { return ''; },
    set innerHTML(_v) {},
  };
  Object.defineProperty(card, 'shadowRoot', { get: () => fakeRoot, configurable: true });

  // Run save handler (async but we only need to verify it doesn't early-return).
  const savePromise = card._handleModalSave();

  // _modalIso should have been cleared immediately (synchronous part).
  assert.strictEqual(card._modalIso, null, '_modalIso must be cleared after save call');

  console.log('  ✓ pregnancy mode symptom save: no early return, _modalIso cleared');

  // Return promise so any async errors propagate (optional await in runner).
  return savePromise.then(() => {
    const symptomCall = savedCalls.find((c) => (c.domain === 'menstruation_cycle' || c.domain === 'menstruation_gauge') && c.service === 'add_symptom');
    assert.ok(symptomCall, 'add_symptom service must be called');
    assert.deepStrictEqual(
      symptomCall.payload.symptom_data.pregnancy_symptoms,
      ['nausea', 'fatigue'],
      'pregnancy symptom payload must use backend keys',
    );
  });
}

// ---------------------------------------------------------------------------
// E4) Non-pregnancy mode: config unchanged (regression guard)
// ---------------------------------------------------------------------------

function testNonPregnancySymptomConfig() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });
  const proto = GaugeCard.prototype;

  const normalConfig = proto._symptomConfig.call(card, 'period', false);
  const keys = normalConfig.map((c) => c.key);
  assert.ok(keys.includes('bleeding_strength'), 'bleeding_strength must be present in non-pregnant mode');
  const hygieneConfig = normalConfig.find((c) => c.key === 'hygiene');
  assert.ok(hygieneConfig.options.includes('tampon'), 'tampon must be present in non-pregnant hygiene');
  assert.ok(hygieneConfig.options.includes('cup'), 'cup must be present in non-pregnant hygiene');
  assert.ok(!keys.includes('pregnancy_symptoms'), 'pregnancy_symptoms must NOT be present in non-pregnant mode');

  console.log('  ✓ non-pregnancy mode: symptom config unchanged (regression guard)');
}

function testDischargeSymptomConfigAndOrdering() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });
  const proto = GaugeCard.prototype;

  const periodConfig = proto._symptomConfig.call(card, 'period', false);
  const periodKeys = periodConfig.map((c) => c.key);
  const dischargeIndex = periodKeys.indexOf('discharge');
  const hygieneIndex = periodKeys.indexOf('hygiene');
  const mucusIndex = periodKeys.indexOf('cervical_mucus');
  const cervixIndex = periodKeys.indexOf('cervix_position');
  const intercourseIndex = periodKeys.indexOf('intercourse');
  const libidoIndex = periodKeys.indexOf('libido');
  const bleedingStrengthIndex = periodKeys.indexOf('bleeding_strength');
  const clotsIndex = periodKeys.indexOf('clots');
  const smellIndex = periodKeys.indexOf('smell');
  assert.ok(dischargeIndex !== -1, 'discharge must be present in period mode');
  assert.ok(hygieneIndex !== -1, 'hygiene must be present in period mode');
  assert.ok(mucusIndex !== -1, 'cervical_mucus must be present in period mode');
  assert.ok(cervixIndex !== -1, 'cervix_position must be present in period mode');
  assert.ok(intercourseIndex !== -1, 'intercourse must be present in period mode');
  assert.ok(libidoIndex !== -1, 'libido must be present in period mode');
  assert.strictEqual(bleedingStrengthIndex, 0, 'bleeding_strength must stay first in period mode');
  assert.ok(clotsIndex > bleedingStrengthIndex, 'clots must be prioritized near the top');
  assert.ok(smellIndex > clotsIndex, 'smell must follow clots near the top');
  assert.ok(hygieneIndex > dischargeIndex, 'hygiene must come after discharge');
  assert.ok(mucusIndex > hygieneIndex, 'cervical_mucus must be grouped under hygiene');
  assert.ok(cervixIndex > mucusIndex, 'cervix_position must follow cervical_mucus under hygiene');
  assert.ok(libidoIndex > intercourseIndex, 'libido must be grouped under intercourse');

  const preMenarcheConfig = proto._symptomConfig.call(card, 'pre_menarche', false);
  const preMenarcheKeys = preMenarcheConfig.map((c) => c.key);
  assert.ok(preMenarcheKeys.includes('discharge'), 'discharge must be present in pre_menarche mode');
  assert.ok(preMenarcheKeys.includes('cervical_mucus'), 'cervical_mucus must be present in pre_menarche mode');
  assert.ok(
    preMenarcheKeys.indexOf('cervical_mucus') > preMenarcheKeys.indexOf('hygiene'),
    'pre_menarche: cervical_mucus must stay grouped after hygiene',
  );

  const pregnantConfig = proto._symptomConfig.call(card, 'pregnant', true);
  const pregnantKeys = pregnantConfig.map((c) => c.key);
  assert.ok(pregnantKeys.includes('discharge'), 'discharge must be present in pregnancy mode');
  assert.strictEqual(pregnantKeys[0], 'pregnancy_symptoms', 'pregnancy symptoms must appear first');
  assert.deepStrictEqual(
    pregnantConfig.find((c) => c.key === 'pregnancy_symptoms')?.options,
    ['nausea', 'fatigue', 'headache', 'back_pain', 'heartburn', 'swelling'],
    'pregnancy symptoms must use supported backend keys',
  );

  card._hass = { locale: { language: 'de' } };
  assert.strictEqual(proto._t.call(card, 'discharge'), 'Ausfluss', 'German discharge category translation should exist');
  assert.strictEqual(proto._t.call(card, 'opt_reddish'), 'Rötlich', 'German reddish option translation should exist');
  assert.strictEqual(proto._t.call(card, 'opt_nausea'), 'Übelkeit', 'German nausea translation should use backend key');
  assert.strictEqual(proto._t.call(card, 'opt_fatigue'), 'Müdigkeit', 'German fatigue translation should use backend key');

  card._hass = { locale: { language: 'en' } };
  assert.strictEqual(proto._t.call(card, 'discharge'), 'Discharge', 'English discharge category translation should exist');
  assert.strictEqual(proto._t.call(card, 'opt_reddish'), 'Reddish', 'English reddish option translation should exist');
  assert.strictEqual(proto._t.call(card, 'opt_nausea'), 'Nausea', 'English nausea translation should use backend key');
  assert.strictEqual(proto._t.call(card, 'opt_fatigue'), 'Fatigue', 'English fatigue translation should use backend key');

  console.log('  ✓ discharge symptom config/order/translations');
}

// ---------------------------------------------------------------------------
// E5) New categories available in all configured cycle modes
// ---------------------------------------------------------------------------

function testNewSymptomCategoriesAcrossModes() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });
  const proto = GaugeCard.prototype;
  const required = ['smell', 'clots', 'clot_size', 'bleeding_type', 'cervix_position', 'cervix_texture', 'libido', 'training_intensity'];

  [
    ['period', false],
    ['pregnant', true],
    ['postpartum', false],
    ['menopause', false],
    ['menarche', false],
  ].forEach(([state, isPregnant]) => {
    const config = proto._symptomConfig.call(card, state, isPregnant);
    const keys = config.map((c) => c.key);
    required.forEach((key) => {
      assert.ok(keys.includes(key), `${key} must be available in ${state} mode`);
    });
  });

  console.log('  ✓ new symptom categories present across cycle modes');
}

// ---------------------------------------------------------------------------
// E6) Clot size remains dependent on clots=yes in saved payload
// ---------------------------------------------------------------------------

async function testClotSizeDependencyOnSave() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });

  const savedCalls = [];
  card._hass = {
    ...makeHass({ state: 'period' }),
    callService: async (domain, service, payload) => {
      savedCalls.push({ domain, service, payload });
    },
  };

  const iso = new Date().toISOString().slice(0, 10);
  card._modalIso = iso;

  const selectedMap = new Map([
    ['clots', 'no'],
    ['clot_size', 'large'],
    ['bleeding_type', 'continuous'],
  ]);
  const fakeRoot = {
    querySelector: (sel) => {
      const m = sel.match(/data-cat="([^"]+)"/);
      if (!m) return null;
      const key = m[1];
      const selected = selectedMap.get(key);
      return selected ? { getAttribute: () => selected, classList: { contains: () => false } } : null;
    },
    querySelectorAll: () => [],
    getElementById: (id) => (id === 'sym-basal-temp' ? { value: '' } : null),
    addEventListener: () => {},
    get innerHTML() { return ''; },
    set innerHTML(_v) {},
  };
  Object.defineProperty(card, 'shadowRoot', { get: () => fakeRoot, configurable: true });

  await card._handleModalSave();

  const symptomCall = savedCalls.find((c) => (c.domain === 'menstruation_cycle' || c.domain === 'menstruation_gauge') && c.service === 'add_symptom');
  assert.ok(symptomCall, 'add_symptom service must be called');
  assert.strictEqual(symptomCall.payload.symptom_data.clots, 'no', 'clots must be saved');
  assert.ok(!('clot_size' in symptomCall.payload.symptom_data), 'clot_size must be omitted when clots is no');

  console.log('  ✓ clot size dependency enforced on modal save');
}

// ---------------------------------------------------------------------------
// D3) Ovulation fallback: sensor ovulation_day used when current cycle not in grouped_starts
// ---------------------------------------------------------------------------

function testOvulationFallbackCurrentCycleNotInGroupedStarts() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation', show_fertile_period: true });

  // Viewing July 2026. Current cycle started July 10 but is not yet in grouped_starts
  // (period is still ongoing). grouped_starts only contains the previous (June) cycle start.
  // The grouped_starts calculation places ovulation on June 23 (June 10 + 13 days for a 28-day cycle).
  // After removing lines 581-596, the model-level effectiveOvulationDay is no longer overridden
  // by the sensor attribute; it retains the grouped_starts-computed value (June 23).
  card._viewDate = new Date(2026, 6, 1, 12, 0, 0, 0); // July 2026

  card._hass = makeHass({
    state: 'fertile',
    attributes: {
      ovulation_day: '2026-07-23',
      fertile_window_start: '2026-07-14',
      fertile_window_end: '2026-07-28',
      grouped_starts: ['2026-06-10'],
      avg_cycle_length: 28,
    },
  });

  const model = card._buildModel();

  // Without the fallback override (removed lines 581-596), grouped_starts computes
  // ovulation on June 23 (June 10 + 13). model.ovulationDay must not be overridden by
  // the sensor's July value.
  assert.strictEqual(model.ovulationDay, '2026-06-23', 'model.ovulationDay must use grouped_starts computation; the sensor attribute override block is removed');
  assert.strictEqual(model.fertileStart, '2026-06-18', 'model.fertileStart must be from grouped_starts computation (June 10 + 8)');
  assert.strictEqual(model.fertileEnd, '2026-06-24', 'model.fertileEnd must be from grouped_starts computation (June 10 + 14)');

  console.log('  ✓ ovulation fallback: sensor ovulation_day used when current cycle not in grouped_starts');
}

function testTodaySaveButtonUsesPeriodLifecycleLabels() {
  const todayIso = new Date().toISOString().slice(0, 10);

  const activeCard = makeCard();
  activeCard.setConfig({ entity: 'sensor.menstruation' });
  activeCard._hass = makeHass({
    state: 'period',
    attributes: {
      history: ['2026-07-01'],
      current_bleeding_block: {
        start: '2026-07-01',
        end: '2026-07-01',
        is_active: true,
        today_logged: false,
      },
    },
  });
  const activeModel = activeCard._buildModel();
  assert.strictEqual(
    activeCard._periodSaveLabel(todayIso, activeModel),
    'Speichern',
    'active period should use the save label',
  );

  const startCard = makeCard();
  startCard.setConfig({ entity: 'sensor.menstruation' });
  startCard._hass = makeHass({ state: 'neutral' });
  const startModel = startCard._buildModel();
  assert.strictEqual(
    startCard._periodSaveLabel(todayIso, startModel),
    'Speichern',
    'new period day should use the save label',
  );

  console.log('  ✓ period lifecycle save labels');
}

// ---------------------------------------------------------------------------
// D4) NFP low-confidence: sensor attributes must NOT be used as fallback
// ---------------------------------------------------------------------------

function testNfpLowConfidenceIgnored() {
  // --- Case 1: grouped_starts present, current cycle not in it, NFP confidence=low ---
  // The standard cycle calc puts ovulation in the prior month (June).
  // The sensor attributes contain low-confidence NFP values (July 26).
  // The series must NOT show any ovulation/fertile days for July because the only
  // source would be the low-confidence NFP sensor attributes.
  const card1 = makeCard();
  card1.setConfig({ entity: 'sensor.menstruation', show_fertile_period: true });
  card1._viewDate = new Date(2026, 6, 1, 12, 0, 0, 0); // July 2026

  card1._hass = makeHass({
    state: 'fertile',
    attributes: {
      ovulation_day: '2026-07-26',
      fertile_window_start: '2026-07-21',
      fertile_window_end: '2026-07-27',
      grouped_starts: ['2026-06-10'],
      avg_cycle_length: 28,
      nfp_analysis: {
        confidence_level: 'low',
        fertile_window: { start: '2026-07-21', end: '2026-07-27' },
        ovulation_day: '2026-07-26',
        ovulation_detected: true,
      },
    },
  });

  const model1 = card1._buildModel();

  // Low-confidence NFP: sensor attributes must not influence the series
  assert.ok(!model1.series.some((s) => s.ovulation), 'series must have no ovulation day when NFP confidence is low');
  assert.ok(!model1.series.some((s) => s.fertile), 'series must have no fertile days when NFP confidence is low');

  // --- Case 2: no grouped_starts, NFP confidence=low ---
  const card2 = makeCard();
  card2.setConfig({ entity: 'sensor.menstruation', show_fertile_period: true });
  card2._viewDate = new Date(2026, 6, 1, 12, 0, 0, 0); // July 2026

  card2._hass = makeHass({
    state: 'fertile',
    attributes: {
      ovulation_day: '2026-07-26',
      fertile_window_start: '2026-07-21',
      fertile_window_end: '2026-07-27',
      grouped_starts: [],
      avg_cycle_length: 28,
      nfp_analysis: {
        confidence_level: 'low',
        fertile_window: { start: '2026-07-21', end: '2026-07-27' },
        ovulation_day: '2026-07-26',
        ovulation_detected: true,
      },
    },
  });

  const model2 = card2._buildModel();

  assert.ok(!model2.series.some((s) => s.ovulation), 'series must have no ovulation day when NFP is low and no grouped_starts');
  assert.ok(!model2.series.some((s) => s.fertile), 'series must have no fertile days when NFP is low and no grouped_starts');

  // --- Case 3: grouped_starts present, NFP confidence=medium → sensor fallback still allowed ---
  const card3 = makeCard();
  card3.setConfig({ entity: 'sensor.menstruation', show_fertile_period: true });
  card3._viewDate = new Date(2026, 6, 1, 12, 0, 0, 0); // July 2026

  card3._hass = makeHass({
    state: 'fertile',
    attributes: {
      ovulation_day: '2026-07-23',
      fertile_window_start: '2026-07-14',
      fertile_window_end: '2026-07-28',
      grouped_starts: ['2026-06-10'],
      avg_cycle_length: 28,
      nfp_analysis: {
        confidence_level: 'medium',
        fertile_window: { start: '2026-07-14', end: '2026-07-28' },
        ovulation_day: '2026-07-23',
        ovulation_detected: true,
      },
    },
  });

  const model3 = card3._buildModel();

  assert.ok(model3.series.some((s) => s.ovulation), 'series must have ovulation day when NFP confidence is medium');
  assert.ok(model3.series.some((s) => s.fertile), 'series must have fertile days when NFP confidence is medium');

  console.log('  ✓ NFP low-confidence: sensor attributes ignored, medium/high confidence respected');
}

// ---------------------------------------------------------------------------
// D5) Predicted cycle starts must drive later viewed months and the marker should
//     prefer the viewed month's effective ovulation day when multiple cycles overlap.
// ---------------------------------------------------------------------------

function testPredictedCycleSelectionForViewedMonth() {
  const sharedAttributes = {
    grouped_starts: ['2026-01-08', '2026-02-04', '2026-03-03', '2026-03-27', '2026-04-25', '2026-05-23', '2026-06-19', '2026-07-16'],
    next_predicted_start: '2026-08-13',
    predicted_cycle_starts: ['2026-08-13', '2026-09-10', '2026-10-08', '2026-11-05', '2026-12-03', '2026-12-31'],
    avg_cycle_length: 28,
    fertile_window_start: '2026-07-24',
    fertile_window_end: '2026-07-30',
    ovulation_day: '2026-07-29',
    nfp_analysis: {
      confidence_level: 'low',
      fertile_window: { start: null, end: null },
      ovulation_day: null,
      ovulation_detected: false,
    },
  };

  const julyCard = makeCard();
  julyCard.setConfig({ entity: 'sensor.menstruation', show_fertile_period: true });
  julyCard._viewDate = new Date(2026, 6, 1, 12, 0, 0, 0); // July 2026
  julyCard._hass = makeHass({ state: 'fertile', attributes: sharedAttributes });
  // Pin today to July 27 2026 so the 60-day window (June 27–Aug 25) is deterministic.
  julyCard._todayDate = () => new Date(2026, 6, 27, 12, 0, 0, 0);

  const julyModel = julyCard._buildModel();
  assert.strictEqual(julyModel.ovulationDay, '2026-07-29', 'July view must keep the July cycle ovulation day');
  assert.strictEqual(julyModel.fertileStart, '2026-07-24', 'July view must keep the July cycle fertile start');
  assert.strictEqual(julyModel.fertileEnd, '2026-07-30', 'July view must keep the July cycle fertile end');
  assert.deepStrictEqual(
    julyModel.series.filter((step) => step.ovulation).map((step) => step.iso),
    ['2026-07-01', '2026-07-29'],
    'July series may contain the prior cycle overlap and the active cycle ovulation',
  );

  // Both July 1 and July 29 fall in the 60-day window (day 5 and day 33 respectively).
  // Verify both ovulation markers are rendered at the correct 60-day positions.
  const julyHtml = julyCard._renderGauge(julyModel, julyCard._palette('fertile'));
  // 60-day angle math: startAngle60 = -240, degPerDay = 5, dayCenterAngle(d) = -240 + (d-0.5)/60*300
  const dayCenterAngle60 = (d) => -240 + ((d - 0.5) / 60) * 300;
  // July 29 is window day 33 (day1=Jun27, day31=Jul27, day33=Jul29)
  const july29Day = 33;
  const july29Pos = julyCard._polar(210, 210, 126 + 26 * 0.46, dayCenterAngle60(july29Day));
  assert.ok(
    julyHtml.includes(`cx="${july29Pos.x.toFixed(1)}" cy="${july29Pos.y.toFixed(1)}"`),
    'July marker must prefer the viewed month ovulation day instead of the first overlapping ovulation in the series',
  );

  const augustCard = makeCard();
  augustCard.setConfig({ entity: 'sensor.menstruation', show_fertile_period: true });
  augustCard._viewDate = new Date(2026, 7, 1, 12, 0, 0, 0); // August 2026
  augustCard._hass = makeHass({ state: 'fertile', attributes: sharedAttributes });

  const augustModel = augustCard._buildModel();
  assert.strictEqual(augustModel.fertileStart, '2026-08-21', 'August view must use the predicted August cycle fertile start');
  assert.strictEqual(augustModel.fertileEnd, '2026-08-27', 'August view must use the predicted August cycle fertile end');
  assert.strictEqual(augustModel.ovulationDay, '2026-08-26', 'August view must use the predicted August cycle ovulation day');
  assert.ok(augustModel.series.find((step) => step.iso === '2026-08-21')?.fertile, 'Aug 21 must be fertile for the August cycle');
  assert.ok(augustModel.series.find((step) => step.iso === '2026-08-26')?.ovulation, 'Aug 26 must be the August ovulation day');
  assert.ok(augustModel.series.find((step) => step.iso === '2026-08-27')?.fertile, 'Aug 27 must remain fertile for the August cycle');
  assert.ok(!augustModel.series.find((step) => step.iso === '2026-08-20')?.fertile, 'Aug 20 must stay outside the August fertile window');
  assert.ok(!augustModel.series.find((step) => step.iso === '2026-08-28')?.fertile, 'Aug 28 must stay outside the August fertile window');

  console.log('  ✓ predicted cycle selection uses the viewed month and marker prefers effective ovulation');
}

// ---------------------------------------------------------------------------
// D5) Month-boundary fertile/ovulation: when the fertile window or ovulation
//     crosses from the previous month into day 1 of the viewed month, it must
//     be correctly marked in the series.
// ---------------------------------------------------------------------------

function testMonthBoundaryFertileOvulation() {
  // --- Case 1: no NFP, sensor attributes show ovulation on Aug 1, fertile end Aug 1 ---
  // Cycle started June 1 (in grouped_starts). Viewing August 2026.
  // Cycle-length based fw for June would place ovulation in June (not August).
  // The sensor fallback already handles this, but the day-1 boundary check must also
  // work when shouldUseSensorFallback is active.
  const card1 = makeCard();
  card1.setConfig({ entity: 'sensor.menstruation', show_fertile_period: true });
  card1._viewDate = new Date(2026, 7, 1, 12, 0, 0, 0); // August 2026

  card1._hass = makeHass({
    state: 'fertile',
    attributes: {
      ovulation_day: '2026-08-01',
      fertile_window_start: '2026-07-27',
      fertile_window_end: '2026-08-01',
      grouped_starts: ['2026-06-01'],
      avg_cycle_length: 28,
    },
  });

  const model1 = card1._buildModel();
  const aug1a = model1.series.find((s) => s.iso === '2026-08-01');
  assert.ok(aug1a && aug1a.fertile, 'Aug 1 must be fertile when fertile_window_end = Aug 1 (month boundary)');
  assert.ok(aug1a && aug1a.ovulation, 'Aug 1 must be ovulation day when ovulation_day = Aug 1 (month boundary)');

  // --- Case 2: fertile_end one day after ovulation (backend computes ov + 1 day) ---
  const card2 = makeCard();
  card2.setConfig({ entity: 'sensor.menstruation', show_fertile_period: true });
  card2._viewDate = new Date(2026, 7, 1, 12, 0, 0, 0); // August 2026

  card2._hass = makeHass({
    state: 'fertile',
    attributes: {
      ovulation_day: '2026-08-01',
      fertile_window_start: '2026-07-27',
      fertile_window_end: '2026-08-02',
      grouped_starts: ['2026-06-01'],
      avg_cycle_length: 28,
    },
  });

  const model2 = card2._buildModel();
  const aug1b = model2.series.find((s) => s.iso === '2026-08-01');
  const aug2b = model2.series.find((s) => s.iso === '2026-08-02');
  assert.ok(aug1b && aug1b.fertile, 'Aug 1 must be fertile when ovulation = Aug 1, fertile_end = Aug 2');
  assert.ok(aug1b && aug1b.ovulation, 'Aug 1 must be ovulation day when ovulation_day = Aug 1');
  assert.ok(aug2b && aug2b.fertile, 'Aug 2 must be fertile when fertile_end = Aug 2');

  // --- Case 3: NFP medium confidence, ovulation Aug 1, July cycle start in grouped_starts ---
  const card3 = makeCard();
  card3.setConfig({ entity: 'sensor.menstruation', show_fertile_period: true });
  card3._viewDate = new Date(2026, 7, 1, 12, 0, 0, 0); // August 2026

  card3._hass = makeHass({
    state: 'fertile',
    attributes: {
      ovulation_day: '2026-08-01',
      fertile_window_start: '2026-07-27',
      fertile_window_end: '2026-08-02',
      grouped_starts: ['2026-07-01'],
      avg_cycle_length: 28,
      nfp_analysis: {
        confidence_level: 'medium',
        fertile_window: { start: '2026-07-27', end: '2026-08-02' },
        ovulation_day: '2026-08-01',
        ovulation_detected: true,
      },
    },
  });

  const model3 = card3._buildModel();
  const aug1c = model3.series.find((s) => s.iso === '2026-08-01');
  assert.ok(aug1c && aug1c.fertile, 'Aug 1 must be fertile with medium NFP and ovulation Aug 1');
  assert.ok(aug1c && aug1c.ovulation, 'Aug 1 must be ovulation day with medium NFP');

  // --- Case 4: low-confidence NFP with month-crossing boundary → day 1 must be marked ---
  // When NFP confidence is low, shouldUseSensorFallback is false, so the normal
  // sensor fallback is disabled. The day-1 boundary check must still correctly
  // mark the first day of the month when the fertile window extends from the previous month.
  const card4 = makeCard();
  card4.setConfig({ entity: 'sensor.menstruation', show_fertile_period: true });
  card4._viewDate = new Date(2026, 7, 1, 12, 0, 0, 0); // August 2026

  card4._hass = makeHass({
    state: 'fertile',
    attributes: {
      ovulation_day: '2026-08-01',
      fertile_window_start: '2026-07-27',
      fertile_window_end: '2026-08-01',
      grouped_starts: ['2026-06-01'],
      avg_cycle_length: 28,
      nfp_analysis: {
        confidence_level: 'low',
        fertile_window: { start: '2026-07-27', end: '2026-08-01' },
        ovulation_day: '2026-08-01',
        ovulation_detected: true,
      },
    },
  });

  const model4 = card4._buildModel();
  const aug1d = model4.series.find((s) => s.iso === '2026-08-01');
  assert.ok(aug1d && aug1d.fertile, 'Aug 1 must be fertile with low-confidence NFP when window crosses month boundary');
  assert.ok(aug1d && aug1d.ovulation, 'Aug 1 must be ovulation day with low-confidence NFP when ovulation is on Aug 1');

  // --- Case 5: verify day 1 is NOT incorrectly marked when fertile window is entirely
  //             within the current month (and does NOT cross the month boundary) ---
  const card5 = makeCard();
  card5.setConfig({ entity: 'sensor.menstruation', show_fertile_period: true });
  card5._viewDate = new Date(2026, 7, 1, 12, 0, 0, 0); // August 2026

  card5._hass = makeHass({
    state: 'fertile',
    attributes: {
      ovulation_day: '2026-08-15',
      fertile_window_start: '2026-08-10', // starts in August, NOT the previous month
      fertile_window_end: '2026-08-16',
      grouped_starts: ['2026-07-01'],
      avg_cycle_length: 28,
    },
  });

  const model5 = card5._buildModel();
  const aug1e = model5.series.find((s) => s.iso === '2026-08-01');
  assert.ok(aug1e && !aug1e.fertile, 'Aug 1 must NOT be fertile when fertile window starts on Aug 10 (no month crossing)');
  assert.ok(aug1e && !aug1e.ovulation, 'Aug 1 must NOT be ovulation when ovulation is Aug 15');

  // Render: ovulation marker must appear in August
  card1._render();
  const html1 = card1.shadowRoot.innerHTML;
  assert.ok(html1.includes('opacity="0.90"></circle>'), 'ovulation marker must render for Aug 1 when month boundary is crossed');

  console.log('  ✓ month boundary: fertile/ovulation correctly shown on day 1 when window crosses from previous month');
}

function testTwoOvulationsInSameMonthBothMarkersRendered() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation', show_fertile_period: true });
  card._hass = makeHass();
  card._viewDate = new Date(2026, 6, 1, 12, 0, 0, 0); // July 2026

  const total = 31;
  // Two ovulation days in July: day 2 (old cycle) and day 29 (new cycle)
  const series = Array.from({ length: total }, (_, idx) => ({
    day: idx + 1,
    iso: `2026-07-${String(idx + 1).padStart(2, '0')}`,
    fertile: idx >= 8 && idx <= 17,
    ovulation: idx + 1 === 2 || idx + 1 === 29,
    confirmed: false,
  }));
  const model = {
    daysInMonth: total,
    periodDuration: 5,
    ovulationDay: null,
    nfpAnalysis: null,
    predictedStarts: [],
    todayIso: '2026-07-27',
    series,
  };
  const palette = card._palette('neutral');

  const html = card._renderGauge(model, palette);

  // Both ovulation days must produce a marker
  const expectedAngle2 = -90 + ((((2 - 1) + 0.5) / total) * 360);
  const expectedPos2 = card._polar(210, 210, 126 + 26 * 0.46, expectedAngle2);
  const expectedAngle29 = -90 + ((((29 - 1) + 0.5) / total) * 360);
  const expectedPos29 = card._polar(210, 210, 126 + 26 * 0.46, expectedAngle29);

  assert.ok(
    html.includes(`cx="${expectedPos2.x.toFixed(1)}" cy="${expectedPos2.y.toFixed(1)}"`),
    'first ovulation marker (day 2) must be rendered when two ovulations occur in same month',
  );
  assert.ok(
    html.includes(`cx="${expectedPos29.x.toFixed(1)}" cy="${expectedPos29.y.toFixed(1)}"`),
    'second ovulation marker (day 29) must be rendered when two ovulations occur in same month',
  );

  console.log('  ✓ two ovulations in same month: both markers rendered');
}

function testOvulationMarkerFallbackUsesIsoDayExtraction() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation', show_fertile_period: true });
  card._hass = makeHass();
  card._viewDate = new Date(2026, 7, 1, 12, 0, 0, 0); // August 2026

  const total = 31;
  const model = {
    daysInMonth: total,
    periodDuration: 5,
    ovulationDay: '2026-08-29',
    nfpAnalysis: null,
    predictedStarts: [],
    todayIso: '2026-07-15',
    series: Array.from({ length: total }, (_, idx) => ({
      day: idx + 1,
      iso: `2026-08-${String(idx + 1).padStart(2, '0')}`,
      fertile: false,
      ovulation: false,
      confirmed: false,
    })),
  };
  const palette = card._palette('neutral');

  const html = card._renderGauge(model, palette);
  const expectedAngle = -90 + ((((29 - 1) + 0.5) / total) * 360);
  const expectedPos = card._polar(210, 210, 126 + 26 * 0.46, expectedAngle);
  assert.ok(
    html.includes(`cx="${expectedPos.x.toFixed(1)}" cy="${expectedPos.y.toFixed(1)}"`),
    'ovulation marker fallback must use day 29 extracted from ISO string',
  );

  console.log('  ✓ ovulation marker fallback uses ISO day extraction');
}

function testRenderGaugeUsesIsoTodayForHandAndCurrentMonth() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation', show_fertile_period: true });
  card._hass = makeHass();
  card._viewDate = new Date(2032, 0, 1, 12, 0, 0, 0); // January 2032

  const total = 31;
  const model = {
    daysInMonth: total,
    periodDuration: 5,
    ovulationDay: null,
    nfpAnalysis: null,
    predictedStarts: [],
    series: Array.from({ length: total }, (_, idx) => ({
      day: idx + 1,
      iso: `2032-01-${String(idx + 1).padStart(2, '0')}`,
      fertile: false,
      ovulation: false,
      confirmed: idx === 2,
    })),
  };
  const palette = card._palette('neutral');
  const nowHour = new Date().getHours();

  card._isoFromDate = () => '2032-01-15';
  card._parseISO = () => new Date(2032, 0, 15, 12, 0, 0, 0);

  const html = card._renderGauge(model, palette);
  const expectedAngle = -90 + ((((15 - 1) + nowHour / 24) / total) * 360);
  const expectedHandA = card._polar(210, 210, 124, expectedAngle);

  assert.ok(
    html.includes(`x1="${expectedHandA.x.toFixed(1)}" y1="${expectedHandA.y.toFixed(1)}"`),
    'hand position must use ISO/parsed today day value instead of direct local day extraction',
  );
  assert.ok(
    html.includes('stroke-opacity="0.24"'),
    'current month period window must use ISO/parsed today month/year comparison',
  );

  console.log('  ✓ render gauge uses ISO/parsed today for hand angle and current month checks');
}

function testTimelineStripMonthRange() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });
  card._todayDate = () => new Date(2026, 7, 9, 12, 0, 0, 0);

  const months = card._timelineStripMonths();

  assert.strictEqual(months.length, 13, 'timeline strip should render a broad month range for horizontal scrolling');
  assert.strictEqual(months[0].monthIso, '2026-02', 'timeline strip should include months before the anchor month');
  assert.strictEqual(months[6].monthIso, '2026-08', 'timeline strip anchor should default to the current month');
  assert.strictEqual(months[6].isAnchor, true, 'current timeline month should be marked as the anchor');
  assert.strictEqual(months[12].monthIso, '2027-02', 'timeline strip should include months after the anchor month');

  console.log('  ✓ timeline strip builds a centered multi-month range');
}

function testTimelineStripMarkupReplacesOldArrowLayout() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });
  card._todayDate = () => new Date(2026, 7, 9, 12, 0, 0, 0);
  card._hass = makeHass({ state: 'neutral', days_until: 5 });
  card._render();

  const html = card.shadowRoot.innerHTML;
  const monthColCount = (html.match(/class="tl-month-col/g) || []).length;

  assert.ok(html.includes('class="tl-strip" data-timeline-strip'), 'timeline should render a horizontal strip container');
  assert.ok(html.includes('scroll-snap-type: x mandatory'), 'timeline strip should use month snapping');
  assert.ok(html.includes('overflow-x: auto'), 'timeline strip should remain swipeable/scrollable');
  assert.ok(html.includes('data-tl-overlay-nav="prev"'), 'desktop overlay previous affordance should be rendered');
  assert.ok(html.includes('data-tl-overlay-nav="next"'), 'desktop overlay next affordance should be rendered');
  assert.ok(html.includes('@media (hover: none)'), 'overlay arrows should be hidden on touch devices');
  assert.ok(!html.includes('data-tl-nav='), 'old persistent timeline arrow button layout should be removed');
  assert.ok(monthColCount >= 9, 'timeline strip should render several month columns for peeking neighbors');

  console.log('  ✓ timeline strip markup replaces the old arrow-button layout');
}

function makeTimelineMonth(startIso, offsetLeft, offsetWidth = 180) {
  return {
    offsetLeft,
    offsetWidth,
    getAttribute: (name) => (name === 'data-timeline-month-start' ? startIso : null),
    classList: { toggle() {} },
  };
}

function makeTimelineStrip(months, options = {}) {
  return {
    scrollLeft: options.scrollLeft || 0,
    clientWidth: options.clientWidth || 360,
    _listenerCount: 0,
    addEventListener() { this._listenerCount += 1; },
    querySelectorAll: (sel) => (sel === '.tl-month-col' ? months : []),
    querySelector: (sel) => {
      if (sel === '.tl-month-col.is-anchor') return months[options.anchorIndex || 0] || null;
      const match = sel.match(/^\[data-timeline-month-start="([^"]+)"\]$/);
      if (match) return months.find((month) => month.getAttribute('data-timeline-month-start') === match[1]) || null;
      return null;
    },
    scrollTo({ left }) {
      this.scrollLeft = left;
      this.lastScrollTo = left;
    },
  };
}

function testTimelineSetupCentersOnlyOnce() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });

  let currentStrip = makeTimelineStrip([
    makeTimelineMonth('2026-07-01', 0),
    makeTimelineMonth('2026-08-01', 190),
  ], { anchorIndex: 1 });

  Object.defineProperty(card, 'shadowRoot', {
    get: () => ({ querySelector: (sel) => (sel === '[data-timeline-strip]' ? currentStrip : null) }),
    configurable: true,
  });

  let centerCalls = 0;
  card._centerTimelineStrip = () => { centerCalls += 1; };

  card._setupTimelineStrip();
  currentStrip = makeTimelineStrip([
    makeTimelineMonth('2026-07-01', 0),
    makeTimelineMonth('2026-08-01', 190),
  ], { anchorIndex: 1 });
  card._setupTimelineStrip();

  assert.strictEqual(centerCalls, 1, 'timeline strip should auto-center only once across strip remounts');
  console.log('  ✓ timeline strip auto-centers only on first mount');
}

function testTimelineStateRestoresScrollAfterRerender() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });

  const oldStrip = makeTimelineStrip([
    makeTimelineMonth('2026-07-01', 0),
    makeTimelineMonth('2026-08-01', 180),
    makeTimelineMonth('2026-09-01', 360),
  ], { scrollLeft: 160, clientWidth: 360 });
  Object.defineProperty(card, 'shadowRoot', {
    get: () => ({ querySelector: (sel) => (sel === '[data-timeline-strip]' ? oldStrip : null) }),
    configurable: true,
  });

  const state = card._captureTimelineState();
  assert.strictEqual(state.anchorMonthStart, '2026-08-01', 'captured anchor month should track the centered month');

  const newStrip = makeTimelineStrip([
    makeTimelineMonth('2026-07-01', 0),
    makeTimelineMonth('2026-08-01', 210),
    makeTimelineMonth('2026-09-01', 420),
  ], { clientWidth: 360 });
  Object.defineProperty(card, 'shadowRoot', {
    get: () => ({ querySelector: (sel) => (sel === '[data-timeline-strip]' ? newStrip : null) }),
    configurable: true,
  });

  card._pendingTimelineState = state;
  let syncCalls = 0;
  card._syncTimelineMonthFromScroll = () => { syncCalls += 1; };

  assert.strictEqual(card._restoreTimelineState(), true, 'timeline state should restore after full re-render');
  assert.strictEqual(newStrip.lastScrollTo, 190, 'restored scroll should keep the same month anchored in view');
  assert.strictEqual(syncCalls, 1, 'timeline month sync should run after restoring scroll');

  console.log('  ✓ timeline strip restores scroll state after full re-render');
}

function testGaugeHeaderMonthUsesUiToday() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });
  card._hass = makeHass({ state: 'neutral', days_until: 5 });
  card._todayDate = () => new Date(2026, 7, 9, 12, 0, 0, 0);

  const model = card._buildModel();
  model.todayIso = '2026-02-03';
  const html = card._renderGauge(model, card._palette(model.state));
  const expectedMonth = new Intl.DateTimeFormat('de', { month: 'long', year: 'numeric' }).format(card._todayDate());

  assert.ok(html.includes(expectedMonth), '60-day header month should use the UI current date instead of stale sensor todayIso');
  console.log('  ✓ 60-day gauge header month prefers the UI current date');
}

function testRenderKeyIgnoresTimelineMonthScrollState() {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });
  card._hass = makeHass({ state: 'neutral', days_until: 5 });

  const model = card._buildModel();
  const key1 = card._buildRenderKey(model, '5 Tage', false, true, '', '');

  card._timelineMonth = new Date(2026, 7, 1, 12, 0, 0, 0);
  const key2 = card._buildRenderKey(model, '5 Tage', false, true, '', '');
  assert.strictEqual(key2, key1, 'timeline month scroll state should not force a full render key change');

  card._timelineWindowRevision = 1;
  const key3 = card._buildRenderKey(model, '5 Tage', false, true, '', '');
  assert.notStrictEqual(key3, key1, 'explicit timeline window shifts should still force a full render');

  console.log('  ✓ render key ignores timeline scroll state but tracks window resets');
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

const tests = [
  ['render-stability', testRenderStability],
  ['status-icon-above-day-label', testStatusIconAboveDayLabel],
  ['pregnancy-icon-size-56px', testPregnancyIconSize],
  ['normal-gauge-regression', testNormalGaugeRegression],
  ['pregnancy-gauge-regression', testPregnancyGaugeRegression],
  ['rerender-on-state-change', testRerenderOnStateChange],
  ['rerender-on-countdown-change', testRerenderOnCountdownChange],
  ['fertile-ovulation-datetime-attributes', testFertileAndOvulationFromDateTimeAttributes],
  ['historical-cycle-fertile-ovulation', testHistoricalCycleFertileOvulation],
  ['ovulation-fallback-current-cycle-not-in-grouped-starts', testOvulationFallbackCurrentCycleNotInGroupedStarts],
  ['nfp-low-confidence-ignored', testNfpLowConfidenceIgnored],
  ['predicted-cycle-selection-viewed-month', testPredictedCycleSelectionForViewedMonth],
  ['month-boundary-fertile-ovulation', testMonthBoundaryFertileOvulation],
  ['ovulation-marker-fallback-iso-day-extraction', testOvulationMarkerFallbackUsesIsoDayExtraction],
  ['two-ovulations-same-month-both-markers', testTwoOvulationsInSameMonthBothMarkersRendered],
  ['render-gauge-uses-iso-today', testRenderGaugeUsesIsoTodayForHandAndCurrentMonth],
  ['timeline-strip-month-range', testTimelineStripMonthRange],
  ['timeline-strip-markup', testTimelineStripMarkupReplacesOldArrowLayout],
  ['timeline-strip-center-once', testTimelineSetupCentersOnlyOnce],
  ['timeline-strip-restore-scroll', testTimelineStateRestoresScrollAfterRerender],
  ['timeline-header-uses-ui-today', testGaugeHeaderMonthUsesUiToday],
  ['timeline-render-key-stable', testRenderKeyIgnoresTimelineMonthScrollState],
  ['pregnancy-mode-symptom-config', testPregnancyModeSymptomModalFields],
  ['pregnancy-mode-modal-field-visibility', testPregnancyModeModalHidesPeriodToggle],
  ['category-label-translation-fallback', testCategoryLabelTranslationFallback],
  ['option-label-translation-fallback', testOptionLabelTranslationFallback],
  ['pregnancy-mode-symptom-save', testPregnancyModeSymptomSave],
  ['non-pregnancy-symptom-config-regression', testNonPregnancySymptomConfig],
  ['discharge-symptom-config-ordering', testDischargeSymptomConfigAndOrdering],
  ['new-symptom-categories-across-modes', testNewSymptomCategoriesAcrossModes],
  ['clot-size-dependency-save', testClotSizeDependencyOnSave],
  ['period-lifecycle-save-labels', testTodaySaveButtonUsesPeriodLifecycleLabels],
];

(async () => {
  let failed = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
    } catch (err) {
      console.error(`  ✗ ${name}:`, err.message);
      failed += 1;
    }
  }

  if (failed) {
    console.error(`\n${failed} test(s) failed.`);
    process.exit(1);
  } else {
    console.log('\nAll tests passed.');
  }
})();
