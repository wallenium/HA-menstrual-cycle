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

global.window = {
  menstruationCycleI18n: {
    cache: {
      en: {
        dashboard_page_title: 'Cycle Dashboard',
        dashboard_widget_quick_log: 'Quick Log',
        dashboard_widget_today_status: 'Today Status',
        dashboard_widget_upcoming_window: 'Upcoming Window',
        dashboard_widget_reminders: 'Reminders Summary',
        dashboard_widget_progress: 'Progress & Badges',
        dashboard_widget_my_info: 'My Info',
        dashboard_edit_mode: 'Edit dashboard',
        dashboard_done: 'Done',
        dashboard_discreet_mode: 'Discreet mode',
        dashboard_reset_preset: 'Reset to mode preset',
        dashboard_label_state: 'State',
        dashboard_neutral_state: 'Current status',
        dashboard_discreet_note: 'Discreet mode note',
        dashboard_quick_log_note: 'Quick log note',
        dashboard_reminders_hint: 'Reminder hint',
        dashboard_not_set: 'Not set',
        dashboard_pronouns: 'Pronouns',
        dashboard_quick_log_no_changes: 'No changes',
        period_forecast_window: 'Window',
        period_forecast_confidence: 'Confidence',
        symptom_saved: 'Saved',
        symptom_save_error: 'Save failed',
        save: 'Save',
        saving: 'Saving',
        none: 'None',
        bleeding_strength: 'Bleeding',
        bleeding_none: 'None',
        bleeding_light: 'Light',
        bleeding_medium: 'Medium',
        bleeding_heavy: 'Heavy',
        pain: 'Pain',
        opt_cramps: 'Cramps',
        opt_headache: 'Headache',
        opt_lower_back: 'Lower Back',
        mood: 'Mood',
        notes: 'Notes',
        cycle_day: 'Cycle Day',
        days_until_menarche: 'Days until',
        unknown: 'Unknown',
        ygs_rem_kit_check: 'Kit',
        ygs_rem_drink_water: 'Water',
        ygs_rem_rest_cue: 'Rest',
        progress_empty_state: 'No progress',
        friendly_name: 'Friendly Name',
        onboarding_stage: 'Onboarding stage',
      },
    },
    load: async () => {},
  },
};

// eslint-disable-next-line no-eval
eval(source);

const Panel = defined['menstruation-cycle-dashboard-panel'];
assert.ok(Panel, 'panel should be registered');

const makeState = (overrides = {}) => ({
  state: 'period',
  attributes: {
    profile: 'alice',
    entry_id: 'entry-1',
    friendly_name: 'Alice',
    cycle_day: 4,
    onboarding_stage_effective: 'established_cycle',
    period_forecast: { window_start: '2026-08-20', window_end: '2026-08-24', confidence: 'medium' },
    progress_badges: [{ id: 'first', title: 'First Entry' }],
    ...overrides,
  },
});

const makeHass = (stateObj) => ({
  locale: { language: 'en' },
  user: { id: 'user-1' },
  states: {
    'sensor.menstruation_cycle_alice': stateObj,
  },
  callService: async () => {},
});

const panelGeneral = new Panel();
panelGeneral.hass = makeHass(makeState());
assert.ok(panelGeneral.shadowRoot.innerHTML.includes('Cycle Dashboard'));
assert.strictEqual(panelGeneral._prefs.widgetVisibility.progress, true, 'general preset should show progress card');
assert.strictEqual(panelGeneral._prefs.discreetMode, false, 'general preset should default to non-discreet');

const panelYoung = new Panel();
panelYoung.hass = makeHass(makeState({ onboarding_stage_effective: 'early_menarche' }));
assert.strictEqual(panelYoung._prefs.widgetVisibility.progress, false, 'young preset should hide progress card by default');
assert.strictEqual(panelYoung._prefs.discreetMode, true, 'young preset should default to discreet mode');

panelYoung._prefs.widgetVisibility.quick_log = false;
panelYoung._moveWidget('quick_log', 'down');
panelYoung._savePrefs();

const panelReload = new Panel();
panelReload.hass = makeHass(makeState({ onboarding_stage_effective: 'early_menarche' }));
assert.strictEqual(panelReload._prefs.widgetVisibility.quick_log, false, 'widget visibility should persist');
assert.notStrictEqual(panelReload._prefs.widgetOrder[0], 'quick_log', 'widget order should persist');

panelReload._prefs.discreetMode = true;
panelReload.render();
assert.ok(panelReload.shadowRoot.innerHTML.includes('Current status'), 'discreet mode should use neutral status labels');

console.log('Cycle dashboard panel tests passed.');
