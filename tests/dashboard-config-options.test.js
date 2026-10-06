'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const componentDir = path.join(__dirname, '../custom_components/menstruation_cycle');
const configFlow = fs.readFileSync(path.join(componentDir, 'config_flow.py'), 'utf8');
const constPy = fs.readFileSync(path.join(componentDir, 'const.py'), 'utf8');
const initPy = fs.readFileSync(path.join(componentDir, '__init__.py'), 'utf8');
const strings = JSON.parse(fs.readFileSync(path.join(componentDir, 'strings.json'), 'utf8'));

// The sidebar dashboard is switched by CONF_DASHBOARD_ENABLED; the legacy CONF_SHOW_CYCLE_DASHBOARD key is only a read fallback.
assert.ok(configFlow.includes('CONF_DASHBOARD_ENABLED'));
assert.ok(configFlow.includes('CONF_SHOW_CYCLE_DASHBOARD'));
assert.ok(initPy.includes('_async_sync_dashboard_sidebar_panel'));
assert.ok(initPy.includes('menstruation-cycle-dashboard-panel.js'));
assert.ok(strings.options.step.init.data.dashboard_enabled);

// Options form sections: every field grouped in _OPTION_SECTIONS must be labelled inside that section, in every language.
const constValues = {};
for (const m of constPy.matchAll(/^(CONF_\w+) = "(\w+)"/gm)) constValues[m[1]] = m[2];

const sectionBlock = /^_OPTION_SECTIONS[^\n]*= \{\n([\s\S]*?)^\}\n/m.exec(configFlow);
assert.ok(sectionBlock, '_OPTION_SECTIONS should exist in config_flow.py');
const sections = {};
for (const m of sectionBlock[1].matchAll(/^    "(\w+)": \(\n([\s\S]*?)^    \),/gm)) {
  sections[m[1]] = [...m[2].matchAll(/(CONF_\w+),/g)].map((c) => c[1]);
}
assert.deepStrictEqual(Object.keys(sections), ['notifications', 'pill', 'tracking', 'life_stages']);

const files = ['strings.json', ...['en', 'de', 'fr', 'es', 'sv'].map((l) => `translations/${l}.json`)];
for (const file of files) {
  const init = JSON.parse(fs.readFileSync(path.join(componentDir, file), 'utf8')).options.step.init;
  for (const [section, names] of Object.entries(sections)) {
    const block = init.sections[section];
    assert.ok(block && block.name && block.description, `${file}: section ${section} needs a name and description`);
    for (const name of names) {
      const key = constValues[name];
      assert.ok(key, `${name} should be defined in const.py`);
      assert.ok(block.data[key], `${file}: ${key} should be labelled in section ${section}`);
      assert.ok(!(key in init.data), `${file}: ${key} should not be labelled twice (section and top level)`);
    }
  }
}

console.log('Dashboard config option tests passed.');
