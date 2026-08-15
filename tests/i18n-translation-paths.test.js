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
const dashboardPanelFile = 'custom_components/menstruation_cycle/www/menstruation-cycle-dashboard-panel.js';
const dashboardKeys = [
  'dashboard_page_title',
  'dashboard_entity_picker_aria',
  'dashboard_widget_quick_log',
  'dashboard_widget_today_status',
  'dashboard_widget_upcoming_window',
  'dashboard_widget_gauge_card',
  'dashboard_widget_calendar_card',
  'dashboard_widget_statistics_card',
  'dashboard_widget_reminders',
  'dashboard_widget_progress',
  'dashboard_widget_my_info',
  'dashboard_no_entity_selected',
  'dashboard_component_unavailable',
  'dashboard_edit_mode',
  'dashboard_done',
  'dashboard_discreet_mode',
  'dashboard_reset_preset',
  'dashboard_label_state',
  'dashboard_neutral_state',
  'dashboard_discreet_note',
  'dashboard_quick_log_note',
  'dashboard_reminders_hint',
  'dashboard_not_set',
  'dashboard_pronouns',
  'dashboard_quick_log_no_changes',
  'dashboard_saved',
  'dashboard_empty_state',
  'dashboard_empty_state_hint',
  'dashboard_widget_order_label',
  'dashboard_toggle_widget_aria',
  'dashboard_move_up_aria',
  'dashboard_move_down_aria',
  'dashboard_save_aria',
  'dashboard_cancel_aria',
  'dashboard_reset_aria',
];

for (const relativeFile of files) {
  const absoluteFile = path.join(repoRoot, relativeFile);
  const content = fs.readFileSync(absoluteFile, 'utf8');

  assert.ok(
    content.includes('window.menstruationCycleI18n'),
    `${relativeFile} does not use shared window.menstruationCycleI18n state`
  );

  assert.ok(
    content.includes('.load(lang)'),
    `${relativeFile} does not call shared i18n load(lang)`
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

const dashboardContent = fs.readFileSync(path.join(repoRoot, dashboardPanelFile), 'utf8');
assert.ok(
  dashboardContent.includes('_ensureI18nLoaded()'),
  'Dashboard panel does not define the i18n bootstrap helper'
);
assert.ok(
  dashboardContent.includes('_loadI18nLanguage(lang)'),
  'Dashboard panel does not define the language load helper'
);
assert.ok(
  dashboardContent.includes('/menstruation_cycle/menstruation-i18n.js'),
  'Dashboard panel does not inject the integration-served i18n script path'
);
assert.ok(
  !dashboardContent.includes('/local/'),
  'Dashboard panel still references /local/ assets'
);

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
assert.ok(
  centralContent.includes('/menstruation_cycle/translations/'),
  'Central i18n file does not contain the correct HA domain translation path'
);

// Verify the stable HA path is tried before script-relative paths (the primary fix).
const stableDomainPathIdx = centralContent.indexOf('/menstruation_cycle/translations/');
const scriptRelativePathIdx = centralContent.indexOf('./translations/${lang}.json');
assert.ok(
  stableDomainPathIdx < scriptRelativePathIdx,
  'Central i18n file does not prefer the stable HA domain translation path before script-relative paths'
);

// Verify the stable HA path is tried before the hacsfiles fallback.
const hacsfilesPathIdx = centralContent.indexOf('/hacsfiles/menstruation-cycle-card/translations/');
assert.ok(
  stableDomainPathIdx < hacsfilesPathIdx,
  'Central i18n file does not try the stable HA domain path before the hacsfiles fallback'
);

for (const lang of ['en', 'de']) {
  const translations = JSON.parse(
    fs.readFileSync(path.join(repoRoot, `custom_components/menstruation_cycle/www/translations/${lang}.json`), 'utf8')
  );
  for (const key of dashboardKeys) {
    assert.ok(translations[key], `${lang}.json is missing dashboard translation key ${key}`);
  }
}

console.log('All i18n translation path tests passed.');
