const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const files = [
  'custom_components/menstruation_cycle/www/menstruation-gauge-card.js',
  'custom_components/menstruation_cycle/www/menstruation-calendar-card.js',
  'custom_components/menstruation_cycle/www/menstruation-countdown-timer.js',
  'custom_components/menstruation_cycle/www/menstruation-cycle-heatmap-card.js',
  'custom_components/menstruation_cycle/www/menstruation-cycle-compact-status-card.js',
  'custom_components/menstruation_cycle/www/menstruation-statistics-card.js',
  'custom_components/menstruation_cycle/www/menstruation-cycle-card-compact.js',
  'custom_components/menstruation_cycle/www/menstruation-product-inventory-card.js',
  'custom_components/menstruation_cycle/www/menstruation-cycle-history-card-row.js',
];
const centralI18nFile = 'custom_components/menstruation_cycle/www/menstruation-i18n.js';

for (const relativeFile of files) {
  const absoluteFile = path.join(repoRoot, relativeFile);
  const content = fs.readFileSync(absoluteFile, 'utf8');

  assert.ok(
    content.includes('window.menstruationCycleI18n'),
    `${relativeFile} does not use shared window.menstruationCycleI18n state`
  );

  assert.ok(
    content.includes('.load(lang,'),
    `${relativeFile} does not call shared i18n load(lang, baseUrl)`
  );

  assert.ok(
    content.includes('window.menstruationCycleI18n?.cache?.'),
    `${relativeFile} does not read translations from shared cache`
  );

  assert.ok(
    !/if\s*\(typeof\s+_mc\w*I18n\.load\s*!==\s*['"]function['"]\)\s*\{/.test(content),
    `${relativeFile} still defines a per-card i18n load implementation`
  );

  assert.ok(
    !content.includes('./translations/${lang}.json'),
    `${relativeFile} still contains duplicated relative translation URL fallback logic`
  );

  assert.ok(
    !content.includes('/hacsfiles/menstruation-cycle-card/translations/'),
    `${relativeFile} still contains duplicated hacsfiles translation URL fallback logic`
  );
}

const centralContent = fs.readFileSync(path.join(repoRoot, centralI18nFile), 'utf8');
assert.ok(
  centralContent.includes('window.menstruationCycleI18n'),
  'Central i18n file does not initialize window.menstruationCycleI18n'
);
assert.ok(
  centralContent.includes('./translations/${lang}.json'),
  'Central i18n file does not load translations from expected relative path'
);
assert.ok(
  centralContent.includes('/hacsfiles/menstruation-cycle-card/translations/'),
  'Central i18n file does not contain hacsfiles translation fallback URL'
);

console.log('All i18n translation path tests passed.');
