'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(__dirname, '../custom_components/menstruation_cycle/www/menstruation-cycle-dashboard-panel.js'),
  'utf8',
);

const storage = new Map();
const localStorage = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
};

class FakeElement {
  constructor() {
    this.dataset = {};
  }
}

global.HTMLElement = class HTMLElement {
  attachShadow() {
    this.shadowRoot = {
      innerHTML: '',
      addEventListener: () => {},
      querySelector: () => null,
      querySelectorAll: () => [],
    };
    return this.shadowRoot;
  }
};

global.HTMLInputElement = FakeElement;
global.HTMLFormElement = FakeElement;
Object.defineProperty(global, 'navigator', {
  value: { language: 'en' },
  configurable: true,
});
global.localStorage = localStorage;

const defined = {};
global.customElements = {
  define: (name, cls) => { defined[name] = cls; },
  get: (name) => defined[name],
};

const readLang = (code) => JSON.parse(fs.readFileSync(
  path.join(__dirname, `../custom_components/menstruation_cycle/www/translations/${code}.json`),
  'utf8',
));
const translations = readLang('en');

global.window = {
  location: { origin: 'http://localhost' },
  menstruationCycleI18n: { cache: { en: translations }, fallback: { en: translations }, loading: {} },
};
global.document = { scripts: [], querySelectorAll: () => [], createElement: () => ({}), head: {}, body: {}, documentElement: {} };

// eslint-disable-next-line no-eval
eval(source);

const Panel = defined['menstruation-cycle-dashboard-panel'];


const signs = {
  breast_development: { stage: 'stage_2', logged_at: '2026-02-10', updated_at: '2026-06-01' },
  pubic_hair_growth: { stage: 'stage_2', logged_at: '2026-05-20' },
  height_spurt: { stage: 'slight', logged_at: '2026-09-20' },
  acne: { stage: 'none', logged_at: '2026-07-01' },      // "none" is not a sign
  body_odor: 'slight',                                     // legacy entry without a date
};

const make = (lang) => {
  const panel = new Panel();
  panel._lang = lang;
  panel._hass = { language: lang };
  panel._todayIso = () => '2026-10-04';
  window.menstruationCycleI18n.cache[lang] = readLang(lang);
  return panel;
};

let html = make('en')._renderMenarcheTimeline(signs);
// oldest first, only dated signs with a stage, the open end for the first period last
const order = [...html.matchAll(/<strong>([^<]+)<\/strong>/g)].map((m) => m[1]);
assert.deepStrictEqual(order, ['Physical changes', 'Further physical maturity signs', 'Growth spurt', 'First period'], html);
assert.ok(html.includes('7 months ago') && html.includes('4 months ago') && html.includes('less than a month ago'), html);
assert.ok(html.includes('dev-open'), 'the first period stays open');
assert.ok(html.includes('about two years after the breasts start to develop'), 'breast note shown once breast development is logged');
assert.ok(html.includes('Every body develops at its own pace'));
assert.ok(!/\d{4}-\d{2}-\d{2}.*first period/i.test(html), 'no predicted date');

// without breast development there is no breast note; the singular month; no dated sign -> nothing at all
html = make('en')._renderMenarcheTimeline({ height_spurt: { stage: 'slight', logged_at: '2026-09-04' } });
assert.ok(!html.includes('two years') && html.includes('1 month ago'), html);
assert.strictEqual(make('en')._renderMenarcheTimeline({ breast_development: 'stage_2' }), '');
assert.strictEqual(make('en')._renderMenarcheTimeline({}), '');

// it is part of the checklist, after it
const panel = make('en');
const full = panel._renderMenarcheChecklist({ attributes: { pre_menarche_data: { signs } } });
assert.ok(full.indexOf('data-action="toggle-sign-picker"') < full.indexOf('dev-timeline'), 'timeline follows the checklist');

// all languages: every text exists, no raw key or placeholder is shown
for (const lang of ['en', 'de', 'fr', 'es', 'sv']) {
  const out = make(lang)._renderMenarcheTimeline(signs);
  assert.ok(!/dashboard_dev_|\{n\}/.test(out), `${lang}: ${out}`);
}
assert.ok(make('de')._renderMenarcheTimeline(signs).includes('vor 7 Monaten'));
console.log('dashboard development timeline tests passed');
