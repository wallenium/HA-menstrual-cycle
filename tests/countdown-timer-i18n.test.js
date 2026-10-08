/**
 * The countdown/timer card must take every visible text from the translation files, and no card may
 * carry German literals outside the explicit multi-language data below.
 *
 * Run with: node tests/countdown-timer-i18n.test.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const www = path.join(__dirname, '../custom_components/menstruation_cycle/www');
const LANGS = ['de', 'en', 'es', 'fr', 'sv'];
const translations = Object.fromEntries(
  LANGS.map((lang) => [lang, JSON.parse(fs.readFileSync(path.join(www, 'translations', `${lang}.json`), 'utf8'))]),
);

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
}

// --- Guard: no German literals in the cards --------------------------------------------------------------------

// The dashboard panel keeps German in its own chat/FAQ keyword lists and `de: {` blocks.
const GUARD_SKIP = new Set(['menstruation-cycle-dashboard-panel.js']);
// Multi-language data that legitimately contains German: product aliases and inline `de` label maps.
const ALLOWED_LINE = [
  /^'periodenunterwäsche': 'underwear',$/,
  /\bde: '[^']*',\s*en: '/,
  /^(underwear_per_cycle|for_wash_goal|underwear): '/,
  /^entity: 'Entität',$/,
];

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ''))
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ''))
    .split('\n')
    .map((line) => line.replace(/(^|[^:"'`\\])\/\/.*/, '$1'));
}

test('cards carry no German literals outside the allowed multi-language data', () => {
  const offenders = [];
  for (const file of fs.readdirSync(www).filter((f) => f.endsWith('.js') && !GUARD_SKIP.has(f))) {
    stripComments(fs.readFileSync(path.join(www, file), 'utf8')).forEach((line, index) => {
      const text = line.trim();
      if (/[äöüÄÖÜß]/.test(text) && !ALLOWED_LINE.some((rule) => rule.test(text))) {
        offenders.push(`${file}:${index + 1}: ${text.slice(0, 100)}`);
      }
    });
  }
  assert.deepStrictEqual(offenders, [], `Move these texts into www/translations/*.json:\n${offenders.join('\n')}`);
});

test('the countdown card does not even hide German in plain words', () => {
  const source = stripComments(fs.readFileSync(path.join(www, 'menstruation-countdown-timer.js'), 'utf8')).join('\n');
  for (const word of ['Bereit', 'Pausiert', 'Zurück', 'Wähle', 'Woche ', 'Arzttermin', 'Gering', 'Moderat', 'Menstruations-Countdown', 'Wechsel erforderlich']) {
    assert.ok(!source.includes(word), `German word "${word}" in the countdown card`);
  }
});

// --- Behavior: the card renders in the viewer's language -------------------------------------------------------

class FakeEl {
  constructor() {
    this.innerHTML = '';
    this.textContent = '';
    this.classList = { add() {}, remove() {} };
  }

  querySelectorAll() {
    return [];
  }
}

global.HTMLElement = class {};
global.customElements = { define: () => {} };
global.requestAnimationFrame = () => 1;
global.cancelAnimationFrame = () => {};
global.document = {};
global.window = { customCards: [], setTimeout, menstruationCycleI18n: { cache: {}, loading: {}, fallback: { en: {} } } };

const src = fs.readFileSync(path.join(www, 'menstruation-countdown-timer.js'), 'utf8');
// eslint-disable-next-line no-eval
eval(`${src}\n;global.__Timer = MenstruationCountdownTimer;`);

function cardFor(lang) {
  window.menstruationCycleI18n.cache[lang] = translations[lang];
  const card = new global.__Timer();
  card._hass = { locale: { language: lang } };
  const els = {};
  card.querySelector = (selector) => (els[selector] = els[selector] || new FakeEl());
  card.els = els;
  return card;
}

// [selector, render call, translation keys that must show up in that element]
const SECTIONS = [
  ['#milestoneList', (c) => c.renderPregnancyMilestones(1), ['ct_ms_heartbeat', 'ct_ms_first_ultrasound', 'ct_ms_sex_determination']],
  ['#milestoneList', (c) => c.renderPregnancyMilestones(3), ['ct_ms_baby_position', 'ct_ms_birth_near', 'ct_ms_last_checkup']],
  ['#trimesterChecklist', (c) => c.renderTrimesterChecklist(2), ['ct_cl_dentist', 'ct_cl_check_weight', 'ct_cl_exercises']],
  ['#symptomGrid', (c) => c.renderSymptomTracker('pregnancy'), ['opt_nausea', 'opt_back_pain', 'opt_preg_swelling']],
  ['#symptomGrid', (c) => c.renderSymptomTracker('menopause'), ['cat_hot_flashes', 'ct_sym_night_sweats', 'opt_preg_mood_swings']],
  ['#recoveryItems', (c) => c.renderRecoveryItems(5), ['ct_rec_wound_healing', 'ct_rec_sex_ok', 'week']],
  ['#bleedingGrid', (c) => c.renderBleedingMonitor(), ['bleeding_light', 'bleeding_medium', 'bleeding_heavy']],
  ['#postpartumChecklist', (c) => c.renderPostpartumChecklist(1), ['ct_pp_doctor', 'ct_pp_course', 'ct_pp_emotional']],
  ['#menopauseSymptoms', (c) => c.renderMenopauseSymptoms(), ['ct_sym_irritability', 'opt_vaginal_dryness', 'ct_weight_gain']],
  ['#moodGrid', (c) => c.renderMoodTracker(), ['ct_mood_happy', 'ct_mood_anxious']],
  ['#wellnessTips', (c) => c.renderWellnessTips(), ['ct_tip_relax', 'ct_tip_support']],
];

for (const lang of LANGS) {
  test(`${lang}: every list of the card is rendered from the translation file`, () => {
    for (const [selector, render, keys] of SECTIONS) {
      const card = cardFor(lang);
      render(card);
      const html = card.els[selector].innerHTML;
      assert.ok(!html.includes('undefined'), `${lang} ${selector}: "undefined" in ${html}`);
      for (const key of keys) {
        assert.ok(html.includes(translations[lang][key]), `${lang} ${selector} should contain "${translations[lang][key]}" (${key})`);
      }
    }
  });
}

test('no German leaks into the other languages', () => {
  const card = cardFor('en');
  card.renderPregnancyMilestones(1);
  card.renderWellnessTips();
  card.renderRecoveryItems(5);
  const html = Object.values(card.els).map((el) => el.innerHTML).join('');
  assert.ok(!/[äöüß]|Herzschlag|Woche|Yoga & /.test(html), html);
});

test('timer status labels follow the language', () => {
  const sv = cardFor('sv');
  const labelOf = (card) => card.els['#timerLabel'].textContent;
  sv.timerState.isRunning = true;
  sv.updateDisplay();
  assert.strictEqual(labelOf(sv), translations.sv.ct_status_running);
  sv.timerState.isRunning = false;
  sv.timerState.remainingSeconds = 120;
  sv.updateDisplay();
  assert.strictEqual(labelOf(sv), translations.sv.ct_status_paused);
  sv.timerState.remainingSeconds = 0;
  sv.updateDisplay();
  assert.strictEqual(labelOf(sv), translations.sv.ct_status_ready);
});

test('timer completion notifies in the viewer language and still plays the alert and resets', () => {
  const card = cardFor('es');
  const sent = [];
  global.Notification = class {
    constructor(title, options) {
      sent.push([title, options.body]);
    }
  };
  global.Notification.permission = 'granted';
  let alerted = 0;
  card.updateButtonStates = () => {};
  card.playAlert = () => {
    alerted += 1;
  };
  card.timerState.reminderEnabled = true;
  const timeouts = [];
  window.setTimeout = (fn, ms) => timeouts.push([fn, ms]);
  card.timerComplete();
  assert.strictEqual(card.els['#timerLabel'].textContent, translations.es.ct_status_done);
  assert.deepStrictEqual(sent, [[translations.es.card_title, translations.es.ct_notification_body]]);
  assert.strictEqual(alerted, 1, 'the alert must not be skipped after the notification');
  assert.strictEqual(timeouts.length, 1, 'the automatic reset must still be scheduled');
  delete global.Notification;
  card.timerComplete();
  assert.strictEqual(alerted, 2, 'no Notification API (iOS Safari) must not break the completion');
});

console.log(`All ${passed} countdown timer i18n test(s) passed.`);
