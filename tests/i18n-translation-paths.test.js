const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const files = [
  'custom_components/menstruation_cycle/www/menstruation-cycle-card.js',
  'custom_components/menstruation_cycle/www/menstruation-calendar-card.js',
  'custom_components/menstruation_cycle/www/menstruation-countdown-timer.js',
  'custom_components/menstruation_cycle/www/menstruation-cycle-heatmap-card.js',
  'custom_components/menstruation_cycle/www/menstruation-cycle-compact-status-card.js',
  'custom_components/menstruation_cycle/www/menstruation-statistics-card.js',
  'custom_components/menstruation_cycle/www/menstruation-cycle-card-compact.js',
  'custom_components/menstruation_cycle/www/menstruation-product-inventory-card.js',
  'custom_components/menstruation_cycle/www/menstruation-cycle-history-card-row.js',
];

for (const relativeFile of files) {
  const absoluteFile = path.join(repoRoot, relativeFile);
  const content = fs.readFileSync(absoluteFile, 'utf8');

  assert.ok(
    !content.includes('/menstruation_cycle/translations/${lang}.json'),
    `${relativeFile} still contains legacy /menstruation_cycle translation path`
  );

  assert.ok(
    content.includes('./translations/${lang}.json'),
    `${relativeFile} does not contain expected relative translation path`
  );
}

console.log('All i18n translation path tests passed.');
