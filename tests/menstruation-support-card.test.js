/**
 * Tests for menstruation-support-card.js
 *
 * Covers:
 *  A) School-day reminders appear and toggles work
 *  B) Glossary card renders terms and definitions
 *  C) Cycle phase graphic renders with labels and accessibility text
 *  D) Hygiene cards render with expected sections and tab switching
 *  E) Reassurance cards render and include escalation note
 *  F) Reminder settings: quiet hours and school-day-only toggle
 *  G) Visibility rules: pre_menarche / early_menarche shown by default
 *  H) Regression: card does not affect unrelated globals
 *
 * Run with: node tests/menstruation-support-card.test.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Minimal DOM / browser stubs
// ---------------------------------------------------------------------------

class FakeShadowRoot {
  constructor() { this._html = ''; }
  set innerHTML(v) { this._html = v; }
  get innerHTML() { return this._html; }
  querySelector(sel) {
    // Very minimal: look for id="#foo" or class=".foo"
    return null;
  }
  querySelectorAll() { return []; }
}

global.window = { customCards: [] };
global.document = undefined;
global.HTMLElement = class HTMLElement {};
const _defined = {};
global.customElements = {
  get: (n) => _defined[n],
  define: (n, cls) => { _defined[n] = cls; },
};
global.fetch = () => Promise.reject(new Error('fetch stub'));

// Load the card
const cardSrc = fs.readFileSync(
  path.join(__dirname, '../custom_components/menstruation_cycle/www/menstruation-support-card.js'),
  'utf8',
);
// eslint-disable-next-line no-eval
eval(cardSrc);

const CardClass = _defined['menstruation-support-card'];
assert.ok(CardClass, 'Card class should be registered as menstruation-support-card');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCard(configOverrides = {}) {
  const shadow = new FakeShadowRoot();
  const el = Object.create(CardClass.prototype);
  el.shadowRoot = shadow;
  el.attachShadow = () => shadow;
  el.addEventListener = () => {};
  el.dispatchEvent = () => {};
  // Stub _attachEventListeners to avoid querySelectorAll side-effects
  el._attachEventListeners = () => {};
  el.setConfig({
    entity: 'sensor.menstruation',
    ...configOverrides,
  });
  return { el, shadow };
}

function buildHass(onboardingStage) {
  return {
    locale: { language: 'en' },
    states: {
      'sensor.menstruation': {
        state: 'pre_menarche',
        attributes: {
          onboarding_stage: onboardingStage,
        },
      },
    },
  };
}

function renderWithHass(el, shadow, onboardingStage) {
  // Provide strings directly (i18n loaded synchronously via fallback)
  el._strings = {};
  el._hass = buildHass(onboardingStage);
  el._render();
  return shadow.innerHTML;
}

// ---------------------------------------------------------------------------
// A) School-day reminders
// ---------------------------------------------------------------------------

{
  const { el, shadow } = makeCard();
  const html = renderWithHass(el, shadow, 'pre_menarche');

  assert.ok(html.includes('ygs-rem-heading'), 'A1: reminder section heading should render');
  assert.ok(html.includes('rem-toggle-input'), 'A2: reminder toggles should render');
  assert.ok(html.includes('data-reminder-id="kit_check"'), 'A3: kit_check reminder should render');
  assert.ok(html.includes('data-reminder-id="drink_water"'), 'A4: drink_water reminder should render');
  assert.ok(html.includes('data-reminder-id="pain_support"'), 'A5: pain_support reminder should render');
  assert.ok(html.includes('data-reminder-id="rest_cue"'), 'A6: rest_cue reminder should render');
  assert.ok(html.includes('ygs_rem_disclaimer'), 'A7: reminder disclaimer key should appear (fallback key)');

  console.log('A) School-day reminders: PASS');
}

// ---------------------------------------------------------------------------
// B) Reminder toggle changes enabled state
// ---------------------------------------------------------------------------

{
  const { el, shadow } = makeCard();
  renderWithHass(el, shadow, 'pre_menarche');

  assert.strictEqual(el._reminderState.kit_check.enabled, false, 'B1: kit_check should start disabled');
  el._reminderState.kit_check.enabled = true;
  el._render();
  assert.ok(shadow.innerHTML.includes('reminder-enabled'), 'B2: enabled reminder should have reminder-enabled class');

  console.log('B) Reminder toggle: PASS');
}

// ---------------------------------------------------------------------------
// C) Reminder settings panel
// ---------------------------------------------------------------------------

{
  const { el, shadow } = makeCard();
  renderWithHass(el, shadow, 'pre_menarche');

  assert.ok(!shadow.innerHTML.includes('<div class="rem-settings-panel"'), 'C1: settings panel hidden by default');

  el._reminderSettingsOpen = true;
  el._render();
  assert.ok(shadow.innerHTML.includes('rem-settings-panel'), 'C2: settings panel shown when open');
  assert.ok(shadow.innerHTML.includes('rem-quiet-enabled'), 'C3: quiet hours toggle in settings');

  // Quiet hours details visible when enabled
  el._quietHoursEnabled = true;
  el._render();
  assert.ok(shadow.innerHTML.includes('ygs-quiet-start'), 'C4: quiet start time visible when quiet hours enabled');

  // School-only badge on school-day reminders
  assert.ok(shadow.innerHTML.includes('rem-school-badge'), 'C5: school-day badge visible in settings');

  console.log('C) Reminder settings panel: PASS');
}

// ---------------------------------------------------------------------------
// D) Glossary card
// ---------------------------------------------------------------------------

{
  const { el, shadow } = makeCard();
  const html = renderWithHass(el, shadow, 'pre_menarche');

  assert.ok(html.includes('ygs-gloss-heading'), 'D1: glossary section heading should render');
  assert.ok(html.includes('data-glossary-term="cycle"'), 'D2: cycle term should render');
  assert.ok(html.includes('data-glossary-term="ovulation"'), 'D3: ovulation term should render');
  assert.ok(html.includes('data-glossary-term="spotting"'), 'D4: spotting term should render');

  // Definition hidden by default
  assert.ok(!html.includes('class="glossary-definition glossary-definition--open"'), 'D5: definitions collapsed by default');

  // Expand a term
  el._glossaryExpanded = { cycle: true };
  el._render();
  assert.ok(shadow.innerHTML.includes('glossary-definition--open'), 'D6: definition shown when expanded');
  assert.ok(shadow.innerHTML.includes('glossary-learn-more'), 'D7: learn-more shown when expanded');

  console.log('D) Glossary card: PASS');
}

// ---------------------------------------------------------------------------
// E) Cycle phases graphic
// ---------------------------------------------------------------------------

{
  const { el, shadow } = makeCard();
  const html = renderWithHass(el, shadow, 'pre_menarche');

  assert.ok(html.includes('ygs-phases-heading'), 'E1: phases section heading should render');
  assert.ok(html.includes('<svg'), 'E2: SVG element should render');
  assert.ok(html.includes('role="img"'), 'E3: SVG should have role="img" for accessibility');
  assert.ok(html.includes('aria-label='), 'E4: SVG should have aria-label');
  assert.ok(html.includes('aria-describedby='), 'E5: SVG should have aria-describedby');
  assert.ok(html.includes('ygs-phases-desc-text'), 'E6: hidden description element should render');
  assert.ok(html.includes('phases-legend'), 'E7: legend should render');
  // Four phase arcs
  assert.ok((html.match(/class="phase-arc"/g) || []).length === 4, 'E8: four phase arcs should render');
  // Non-colour-only: legend has text labels
  assert.ok(html.includes('phases-legend-label'), 'E9: legend labels (non-colour meaning) should render');
  assert.ok(html.includes('ygs_phases_varies'), 'E10: "cycles vary" note should render (fallback key)');

  console.log('E) Cycle phases graphic: PASS');
}

// ---------------------------------------------------------------------------
// F) Hygiene / how-to cards
// ---------------------------------------------------------------------------

{
  const { el, shadow } = makeCard();
  const html = renderWithHass(el, shadow, 'pre_menarche');

  assert.ok(html.includes('ygs-hygiene-heading'), 'F1: hygiene section heading should render');
  assert.ok(html.includes('howto-tabs'), 'F2: tab bar should render');
  assert.ok(html.includes('data-howto-tab="underwear"'), 'F3: underwear tab should render');
  assert.ok(html.includes('data-howto-tab="cup"'), 'F4: cup tab should render');
  // Default tab is underwear
  assert.ok(html.includes('data-howto="underwear"'), 'F5: underwear how-to should render by default');
  // Disclaimer
  assert.ok(html.includes('howto-disclaimer'), 'F6: disclaimer section should render');

  // Switch to cup tab
  el._hygieneTab = 'cup';
  el._render();
  assert.ok(shadow.innerHTML.includes('data-howto="cup"'), 'F7: cup how-to renders on tab switch');
  assert.ok(shadow.innerHTML.includes('howto-caution'), 'F8: caution block renders in cup how-to');

  console.log('F) Hygiene / how-to cards: PASS');
}

// ---------------------------------------------------------------------------
// G) Reassurance cards
// ---------------------------------------------------------------------------

{
  const { el, shadow } = makeCard();
  const html = renderWithHass(el, shadow, 'pre_menarche');

  assert.ok(html.includes('ygs-reassure-heading'), 'G1: reassurance section heading should render');
  assert.ok(html.includes('reassurance-grid'), 'G2: reassurance grid should render');
  // Three topics
  assert.ok(html.includes('ygs_reassure_irregular_timing_title'), 'G3: irregular timing card renders (fallback key)');
  assert.ok(html.includes('ygs_reassure_flow_variation_title'), 'G4: flow variation card renders (fallback key)');
  assert.ok(html.includes('ygs_reassure_spotting_title'), 'G5: spotting card renders (fallback key)');
  // Escalation prompt
  assert.ok(html.includes('reassurance-escalation'), 'G6: escalation prompt should render');
  assert.ok(html.includes('ygs_reassure_escalation'), 'G7: escalation key should render (fallback key)');

  console.log('G) Reassurance cards: PASS');
}

// ---------------------------------------------------------------------------
// H) Visibility rules
// ---------------------------------------------------------------------------

{
  // pre_menarche → visible
  const { el: el1, shadow: s1 } = makeCard();
  renderWithHass(el1, s1, 'pre_menarche');
  assert.ok(s1.innerHTML.includes('ygs-title'), 'H1: card visible in pre_menarche');

  // early_menarche → visible
  const { el: el2, shadow: s2 } = makeCard();
  renderWithHass(el2, s2, 'early_menarche');
  assert.ok(s2.innerHTML.includes('ygs-title'), 'H2: card visible in early_menarche');

  // established_cycle → hidden by default
  const { el: el3, shadow: s3 } = makeCard();
  renderWithHass(el3, s3, 'established_cycle');
  assert.ok(!s3.innerHTML.includes('ygs-title'), 'H3: card hidden in established_cycle by default');

  // established_cycle → visible when _showInEstablished = true
  el3._showInEstablished = true;
  el3._render();
  assert.ok(s3.innerHTML.includes('ygs-title'), 'H4: card visible in established_cycle when override enabled');

  console.log('H) Visibility rules: PASS');
}

// ---------------------------------------------------------------------------
// I) Individual section toggles in config
// ---------------------------------------------------------------------------

{
  const { el, shadow } = makeCard({
    show_reminders: false,
    show_glossary: false,
    show_phases_graphic: true,
    show_hygiene_cards: false,
    show_reassurance_cards: false,
  });
  renderWithHass(el, shadow, 'pre_menarche');

  assert.ok(!shadow.innerHTML.includes('ygs-rem-heading'), 'I1: reminders hidden when show_reminders=false');
  assert.ok(!shadow.innerHTML.includes('ygs-gloss-heading'), 'I2: glossary hidden when show_glossary=false');
  assert.ok(shadow.innerHTML.includes('ygs-phases-heading'), 'I3: phases shown when show_phases_graphic=true');
  assert.ok(!shadow.innerHTML.includes('ygs-hygiene-heading'), 'I4: hygiene hidden when show_hygiene_cards=false');
  assert.ok(!shadow.innerHTML.includes('ygs-reassure-heading'), 'I5: reassurance hidden when show_reassurance_cards=false');

  console.log('I) Section toggle config: PASS');
}

// ---------------------------------------------------------------------------
// J) customCards registration
// ---------------------------------------------------------------------------

{
  assert.ok(
    Array.isArray(window.customCards) && window.customCards.some((c) => c.type === 'menstruation-support-card'),
    'J1: card should register itself in window.customCards',
  );

  console.log('J) customCards registration: PASS');
}

// ---------------------------------------------------------------------------
// K) Regression: no modification to unrelated card globals
// ---------------------------------------------------------------------------

{
  // The i18n singleton is shared, but normalizeLang should still function
  assert.strictEqual(typeof window.menstruationCycleI18n.normalizeLang, 'function', 'K1: i18n normalizeLang still a function');

  console.log('K) Regression (globals): PASS');
}

console.log('\nAll menstruation-support-card tests passed. ✅');
