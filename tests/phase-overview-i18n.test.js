'use strict';
// The phase overview chart (hormone curves) was hard-coded German in every language: its labels now come from translations.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const www = path.join(__dirname, '../custom_components/menstruation_cycle/www');
const panel = fs.readFileSync(path.join(www, 'menstruation-cycle-dashboard-panel.js'), 'utf8');
const keys = ['endometrium', 'estrogen', 'progesterone', 'lh_surge', 'lh_surge_ovulation', 'curve_note'].map((k) => `dashboard_po_${k}`);

for (const german of ['Gebärmutterschleimhaut', 'Östrogen', 'Progesteron<', '>LH-Anstieg', 'Kurvenform ist typisiert']) {
  assert.ok(!panel.includes(german), `hard-coded German text left in the panel: ${german}`);
}
for (const lang of ['en', 'de', 'es', 'fr', 'sv']) {
  const t = JSON.parse(fs.readFileSync(path.join(www, 'translations', `${lang}.json`), 'utf8'));
  for (const key of keys) {
    assert.ok(typeof t[key] === 'string' && t[key].length > 2, `${lang}: ${key} missing`);
    assert.ok(panel.includes(`'${key}'`), `${key} is not used by the panel`);
  }
}
assert.notStrictEqual(JSON.parse(fs.readFileSync(path.join(www, 'translations', 'en.json'), 'utf8')).dashboard_po_estrogen, 'Östrogen');
console.log('phase-overview-i18n: ok');
