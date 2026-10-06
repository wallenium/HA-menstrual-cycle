const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const www = path.resolve(__dirname, '..', 'custom_components', 'menstruation_cycle', 'www');
const shipped = fs.readdirSync(path.join(www, 'translations')).map((name) => name.replace('.json', '')).sort();

// No file may map a language to de/en only any more.
for (const name of fs.readdirSync(www).filter((file) => file.endsWith('.js'))) {
  const content = fs.readFileSync(path.join(www, name), 'utf8');
  assert.ok(!/startsWith\(['"]de['"]\)\s*\?\s*['"]de['"]/.test(content), `${name} still maps every language except German to English`);
}

// Run the central loader with a fake browser: translation files exist only for the shipped languages.
function loadI18n(files) {
  const requested = [];
  const window = {};
  const context = vm.createContext({
    window,
    document: { scripts: [] },
    navigator: { language: 'en' },
    URL,
    encodeURIComponent,
    Promise,
    fetch: async (url) => {
      requested.push(url);
      const match = /translations\/([a-z]+)\.json/.exec(url);
      const data = match && files[match[1]];
      return { ok: Boolean(data), json: async () => data };
    },
  });
  const source = fs.readFileSync(path.join(www, 'menstruation-i18n.js'), 'utf8').replace(/import\.meta\.url/g, "'http://ha/menstruation_cycle/menstruation-i18n.js'");
  vm.runInContext(source, context);
  return { i18n: window.menstruationCycleI18n, requested };
}

(async () => {
  const files = Object.fromEntries(shipped.map((lang) => [lang, { marker: lang }]));
  const { i18n, requested } = loadI18n(files);

  // language codes: regions and underscores are dropped, anything odd becomes English
  const cases = { sv: 'sv', 'sv-SE': 'sv', SV: 'sv', de_AT: 'de', 'pt-BR': 'pt', fil: 'fil', '': 'en', null: 'en', '../etc': 'en', x: 'en', 'zh-Hans-CN': 'zh' };
  for (const [input, expected] of Object.entries(cases)) {
    assert.strictEqual(i18n.normalizeLang(input === 'null' ? null : input), expected, `normalizeLang(${JSON.stringify(input)})`);
  }

  // every shipped language is really loaded, not mapped to English
  for (const lang of shipped) {
    const data = await i18n.load(lang);
    assert.strictEqual(data.marker, lang, `${lang}.json was not used for language ${lang}`);
  }

  // a language without a file falls back to English instead of empty texts
  const fallback = await i18n.load('pt');
  assert.strictEqual(fallback.marker, 'en', 'pt without a file should use the English texts');
  assert.ok(requested.some((url) => url.includes('/translations/pt.json')));

  console.log(`i18n language detection: PASS (${shipped.join(', ')})`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
