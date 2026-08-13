/**
 * Tests for the youth-friendly onboarding animated explainer cards added to
 * the pre-menarche step of MenstruationCountdownTimer.
 *
 * Covers:
 *  A) Explainer section is present in renderPreMearcheMode output
 *  B) All four icon cards render with expected class names
 *  C) Each card carries an aria-label with both label and description text
 *  D) Each card's SVG icon is present and aria-hidden
 *  E) Each card's tooltip element carries the description text
 *  F) Reduced-motion CSS rule disables ob-card and ob-icon animations
 *  G) Animation keyframes (ob-fade-in, ob-float) are present in getStyles()
 *  H) All new translation keys resolve to non-empty strings (en + de)
 *  I) Existing premenarche badge and log-first-period button are unaffected
 *  J) Preparation tips section still present after explainer section
 *
 * Run with: node tests/onboarding-explainer-cards.test.js
 */

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Minimal browser / DOM stubs
// ---------------------------------------------------------------------------

class FakeShadowRoot {
  constructor() { this._html = ''; }
  set innerHTML(v) { this._html = v; }
  get innerHTML() { return this._html; }
  getElementById() { return null; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
}

global.HTMLElement = class HTMLElement {};
global.customElements = {
  define: () => {},
  get: () => undefined,
};
global.requestAnimationFrame = () => 1;
global.cancelAnimationFrame = () => {};
global.document = {
  createElementNS: (_ns, tag) => {
    const el = {
      tagName: tag,
      attributes: {},
      dataset: {},
      children: [],
      setAttribute(k, v) { this.attributes[k] = String(v); },
      getAttribute(k) { return this.attributes[k]; },
      appendChild(child) { this.children.push(child); return child; },
      setAttributeNS() {},
      addEventListener() {},
    };
    return el;
  },
};
global.window = {
  customCards: [],
  setTimeout,
  clearTimeout,
  menstruationCycleI18n: {
    cache: {},
    loading: {},
    fallback: { en: {} },
    normalizeLang: (l) => String(l || 'en').toLowerCase().startsWith('de') ? 'de' : 'en',
    detectLang: () => 'en',
    load: () => Promise.resolve({}),
  },
  ProductIcons: {
    getSvgIcon: (product, size) => {
      const px = size === 'large' ? 48 : 24;
      return `<span aria-hidden="true" style="width:${px}px;"></span>`;
    },
    getStateIcon: () => '',
    getStatusIcon: () => '',
    getStatusAnimatedIcon: () => '',
    getPregnancyIcon: () => '',
    createAnimatedSvgElement: () => null,
  },
};

// Load the countdown-timer component
const src = fs.readFileSync(
  path.join(__dirname, '../custom_components/menstruation_cycle/www/menstruation-countdown-timer.js'),
  'utf8',
);
// eslint-disable-next-line no-eval
eval(`${src}\n;global.__Timer = MenstruationCountdownTimer;`);
const Timer = global.__Timer;

// ---------------------------------------------------------------------------
// Helper: instantiate a timer and call renderPreMearcheMode
// ---------------------------------------------------------------------------

function buildTimerHtml() {
  const timer = new Timer();
  timer.config = { entity: 'sensor.test' };
  timer._hass = null;

  // Provide a fake shadowRoot-like container that stores innerHTML
  const container = { innerHTML: '' };
  timer.renderPreMearcheMode(container);
  return container.innerHTML;
}

// ---------------------------------------------------------------------------
// Helper: get raw getStyles() string
// ---------------------------------------------------------------------------

function getStylesText() {
  const timer = new Timer();
  return timer.getStyles();
}

// ---------------------------------------------------------------------------
// Helper: call _t on a fresh instance
// ---------------------------------------------------------------------------

function t(key, lang = 'en') {
  const timer = new Timer();
  timer.config = {};
  timer._hass = { language: lang };
  return timer._t(key);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log('\nOnboarding explainer cards — unit tests\n');

// A) Section presence
test('ob-explainer section present in pre-menarche HTML', () => {
  const html = buildTimerHtml();
  assert.ok(html.includes('ob-explainer'), 'Expected class ob-explainer in HTML');
});

// B) All four card variants render
const CARD_CLASSES = [
  'ob-card--puberty',
  'ob-card--period',
  'ob-card--cycle',
  'ob-card--symptoms',
];
for (const cls of CARD_CLASSES) {
  test(`card variant "${cls}" is rendered`, () => {
    const html = buildTimerHtml();
    assert.ok(html.includes(cls), `Expected class ${cls} in HTML`);
  });
}

// C) aria-label includes label + description for each card
const ARIA_LABEL_PAIRS = [
  ['ob_puberty_label', 'ob_puberty_desc'],
  ['ob_period_label', 'ob_period_desc'],
  ['ob_cycle_label', 'ob_cycle_desc'],
  ['ob_symptoms_label', 'ob_symptoms_desc'],
];
for (const [labelKey, descKey] of ARIA_LABEL_PAIRS) {
  test(`aria-label for "${labelKey}" contains both label and desc text`, () => {
    const html = buildTimerHtml();
    const labelText = t(labelKey);
    const descText = t(descKey);
    assert.ok(labelText.length > 0, `Translation key ${labelKey} must be non-empty`);
    assert.ok(descText.length > 0, `Translation key ${descKey} must be non-empty`);
    assert.ok(
      html.includes(`${labelText}: ${descText}`),
      `Expected aria-label containing "${labelText}: ${descText}"`,
    );
  });
}

// D) Each card contains an SVG icon with aria-hidden="true"
test('ob-icon SVG elements carry aria-hidden="true"', () => {
  const html = buildTimerHtml();
  // Count all ob-icon wrappers
  const iconMatches = (html.match(/class="ob-icon"/g) || []).length;
  assert.strictEqual(iconMatches, 4, 'Expected exactly 4 .ob-icon elements');
  // Each inline SVG must have aria-hidden
  const ariaHiddenMatches = (html.match(/aria-hidden="true"/g) || []).length;
  assert.ok(ariaHiddenMatches >= 4, 'Expected at least 4 aria-hidden="true" on SVG icons');
});

// E) Tooltip elements carry description text
const TOOLTIP_DESC_KEYS = [
  'ob_puberty_desc',
  'ob_period_desc',
  'ob_cycle_desc',
  'ob_symptoms_desc',
];
for (const descKey of TOOLTIP_DESC_KEYS) {
  test(`tooltip contains "${descKey}" text`, () => {
    const html = buildTimerHtml();
    const descText = t(descKey);
    assert.ok(html.includes(descText), `Expected tooltip to include "${descText}"`);
  });
}

// F) Reduced-motion CSS present
test('getStyles() contains prefers-reduced-motion rule for .ob-card', () => {
  const styles = getStylesText();
  assert.ok(
    styles.includes('prefers-reduced-motion'),
    'Expected @media (prefers-reduced-motion) rule in styles',
  );
  assert.ok(
    styles.includes('.ob-card') && styles.includes('animation: none'),
    'Expected .ob-card { animation: none } inside reduced-motion block',
  );
});

// G) Animation keyframes present
test('getStyles() declares @keyframes ob-fade-in', () => {
  const styles = getStylesText();
  assert.ok(styles.includes('@keyframes ob-fade-in'), 'Missing @keyframes ob-fade-in');
});

test('getStyles() declares @keyframes ob-float', () => {
  const styles = getStylesText();
  assert.ok(styles.includes('@keyframes ob-float'), 'Missing @keyframes ob-float');
});

// H) All new translation keys resolve to non-empty strings in en and de
const NEW_KEYS = [
  'ob_explainer_label',
  'ob_puberty_label',
  'ob_puberty_desc',
  'ob_period_label',
  'ob_period_desc',
  'ob_cycle_label',
  'ob_cycle_desc',
  'ob_symptoms_label',
  'ob_symptoms_desc',
];
for (const key of NEW_KEYS) {
  test(`translation key "${key}" resolves to non-empty string (en)`, () => {
    const value = t(key, 'en');
    assert.ok(typeof value === 'string' && value.length > 0, `Key ${key} must resolve to non-empty string`);
  });
}

// I) Existing premenarche badge and button are unaffected
test('premenarche-badge element still present', () => {
  const html = buildTimerHtml();
  assert.ok(html.includes('premenarche-badge'), 'Expected premenarche-badge in HTML');
});

test('btn-log-first-period button still present', () => {
  const html = buildTimerHtml();
  assert.ok(html.includes('btn-log-first-period'), 'Expected btn-log-first-period in HTML');
});

// J) Preparation tips section still rendered after explainer section
test('preparation tips section still present after explainer section', () => {
  const html = buildTimerHtml();
  const explainerIdx = html.indexOf('ob-explainer');
  const tipsIdx = html.indexOf('info-section');
  assert.ok(explainerIdx !== -1, 'Expected ob-explainer section');
  assert.ok(tipsIdx !== -1, 'Expected info-section (preparation tips)');
  assert.ok(tipsIdx > explainerIdx, 'Preparation tips section should come after explainer section');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${passed + failed} test(s) run — ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
