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

const render = (lang, week) => {
  const panel = new Panel();
  panel._lang = lang;
  panel._hass = { language: lang };
  global.window.menstruationCycleI18n.cache[lang] = readLang(lang);
  return panel._renderFetalDevelopment({ attributes: { weeks_pregnant: week } });
};

// One size sentence per week, in the card's language, next to the month illustration (the small icon stays).
const en11 = render('en', 11);
assert.ok(en11.includes('Your baby is now about the size of a fig.'), en11);
assert.ok(en11.includes('assets/pregnancy/month_3.svg'), 'detailed month illustration is shown');
assert.ok(en11.includes('preg_03.svg') || en11.includes('<svg') || en11.includes('<img'), 'small icon is still there');
assert.ok(render('de', 8).includes('Dein Baby ist jetzt so groß wie eine Himbeere.'));
for (const lang of ['en', 'de', 'fr', 'es', 'sv']) {
  for (let week = 4; week <= 40; week += 1) {
    const html = render(lang, week);
    assert.ok(!/baby_size_w\d+|dashboard_baby_size_sentence|\{item\}/.test(html), `${lang} week ${week}: ${html}`);
  }
}
console.log('dashboard baby size tests passed');
