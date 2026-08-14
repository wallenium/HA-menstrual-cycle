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
        cancel: 'Cancel',
        dashboard_saved: 'Dashboard layout saved.',
        dashboard_empty_state: 'All widgets are hidden.',
        dashboard_empty_state_hint: 'Open edit mode to show widgets or reset to defaults.',
        dashboard_widget_order_label: 'Widget order and visibility',
        dashboard_toggle_widget_aria: 'Toggle {widget} widget visibility',
        dashboard_move_up_aria: 'Move {widget} widget up',
        dashboard_move_down_aria: 'Move {widget} widget down',
        dashboard_save_aria: 'Save dashboard layout',
        dashboard_cancel_aria: 'Cancel dashboard edits',
        dashboard_reset_aria: 'Reset dashboard to mode defaults',
      },
    },
    load: async () => {},
  },
};

// eslint-disable-next-line no-eval
eval(source);

const Panel = defined['menstruation-cycle-dashboard-panel'];

// Helper: create a click/change target that passes instanceof HTMLElement
class ClickTarget extends HTMLElement {
  constructor(dataset = {}) {
    super();
    this.dataset = dataset;
    this.checked = false;
    this.value = '';
  }
}
// Allow ClickTarget instances to pass HTMLInputElement checks too
global.HTMLInputElement = ClickTarget;
const makeClick = (action, widget) => new ClickTarget({ action, ...(widget ? { widget } : {}) });
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

// --- Edit mode: enter/leave ---
const panelEdit = new Panel();
panelEdit.hass = { ...makeHass(makeState()), user: { id: 'user-edit-1' } };
assert.ok(!panelEdit._editMode, 'should not be in edit mode initially');
assert.ok(panelEdit.shadowRoot.innerHTML.includes('Edit dashboard'), 'header should show Edit dashboard button when not in edit mode');

panelEdit._handleClick({ target: makeClick('toggle-edit') });
assert.ok(panelEdit._editMode, 'toggle-edit should enter edit mode');
assert.ok(panelEdit._editDraft, 'entering edit mode should create a draft');
assert.ok(!panelEdit.shadowRoot.innerHTML.includes('data-action="toggle-edit"') || panelEdit.shadowRoot.innerHTML.includes('data-action="save-edit"'), 'edit panel should show save button');

// --- Cancel discards unsaved edits ---
panelEdit._editDraft.widgetVisibility.quick_log = false;
panelEdit._handleClick({ target: makeClick('cancel-edit') });
assert.ok(!panelEdit._editMode, 'cancel-edit should exit edit mode');
assert.strictEqual(panelEdit._prefs.widgetVisibility.quick_log, true, 'cancel should discard unsaved visibility change');
assert.strictEqual(panelEdit._editDraft, null, 'cancel should clear draft');

// --- Save persists edits ---
const panelSave = new Panel();
panelSave.hass = { ...makeHass(makeState()), user: { id: 'user-save-1' } };
panelSave._handleClick({ target: makeClick('toggle-edit') });
panelSave._editDraft.widgetVisibility.reminders = false;
const draftOrder = [...panelSave._editDraft.widgetOrder];
const temp = draftOrder[0];
draftOrder[0] = draftOrder[1];
draftOrder[1] = temp;
panelSave._editDraft.widgetOrder = draftOrder;
panelSave._handleClick({ target: makeClick('save-edit') });
assert.ok(!panelSave._editMode, 'save-edit should exit edit mode');
assert.strictEqual(panelSave._prefs.widgetVisibility.reminders, false, 'save should persist visibility change');
assert.strictEqual(panelSave._prefs.widgetOrder[0], draftOrder[0], 'save should persist order change');
assert.ok(panelSave.shadowRoot.innerHTML.includes('Dashboard layout saved.'), 'save should show confirmation message');

// --- Saved layout reloads correctly ---
const panelReload2 = new Panel();
panelReload2.hass = { ...makeHass(makeState()), user: { id: 'user-save-1' } };
assert.strictEqual(panelReload2._prefs.widgetVisibility.reminders, false, 'reloaded panel should see persisted visibility');

// --- Reset in edit mode restores preset without saving ---
const panelReset = new Panel();
panelReset.hass = { ...makeHass(makeState()), user: { id: 'user-reset-1' } };
panelReset._handleClick({ target: makeClick('toggle-edit') });
panelReset._editDraft.widgetVisibility.today_status = false;
panelReset._handleClick({ target: makeClick('reset-preset') });
assert.ok(panelReset._editMode, 'reset in edit mode should stay in edit mode');
assert.strictEqual(panelReset._editDraft.widgetVisibility.today_status, true, 'reset should restore default visibility in draft');

// --- Empty state when all widgets hidden ---
const panelEmpty = new Panel();
panelEmpty.hass = { ...makeHass(makeState()), user: { id: 'user-empty-1' } };
for (const key of Object.keys(panelEmpty._prefs.widgetVisibility)) {
  panelEmpty._prefs.widgetVisibility[key] = false;
}
panelEmpty.render();
assert.ok(panelEmpty.shadowRoot.innerHTML.includes('All widgets are hidden.'), 'should show empty state when all widgets hidden');
assert.ok(panelEmpty.shadowRoot.innerHTML.includes('Open edit mode'), 'empty state should include hint');

// --- Corrupt/partial layout is sanitized ---
storage.set('menstruation_cycle.dashboard_prefs.user-corrupt.alice', '{not valid json}}}');
const panelCorrupt = new Panel();
panelCorrupt.hass = { ...makeHass(makeState()), user: { id: 'user-corrupt' } };
assert.ok(panelCorrupt._prefs, 'corrupt storage should not crash');
assert.ok(Array.isArray(panelCorrupt._prefs.widgetOrder), 'corrupt storage should produce valid widgetOrder');

// --- Unknown widget keys ignored, missing appended ---
const badLayout = { widgetOrder: ['unknown_widget', 'today_status'], widgetVisibility: {} };
storage.set('menstruation_cycle.dashboard_prefs.user-bad.alice', JSON.stringify(badLayout));
const panelBad = new Panel();
panelBad.hass = { ...makeHass(makeState()), user: { id: 'user-bad' } };
assert.ok(!panelBad._prefs.widgetOrder.includes('unknown_widget'), 'unknown keys should be removed');
assert.ok(panelBad._prefs.widgetOrder.includes('quick_log'), 'missing known keys should be appended');

// --- Reorder in edit mode updates draft, not prefs ---
const panelReorder = new Panel();
panelReorder.hass = { ...makeHass(makeState()), user: { id: 'user-reorder-1' } };
const origFirst = panelReorder._prefs.widgetOrder[0];
panelReorder._handleClick({ target: makeClick('toggle-edit') });
panelReorder._moveWidget(origFirst, 'down');
assert.notStrictEqual(panelReorder._editDraft.widgetOrder[0], origFirst, 'reorder should update draft');
assert.strictEqual(panelReorder._prefs.widgetOrder[0], origFirst, 'reorder in edit mode should not yet update prefs');

// --- Toggle visibility in edit mode updates draft preview ---
const panelToggle = new Panel();
panelToggle.hass = { ...makeHass(makeState()), user: { id: 'user-toggle-1' } };
panelToggle._handleClick({ target: makeClick('toggle-edit') });
const fakeCheckbox = Object.assign(new ClickTarget({ widgetVisibility: 'progress' }), { checked: false });
panelToggle._handleChange({ target: fakeCheckbox });
assert.strictEqual(panelToggle._editDraft.widgetVisibility.progress, false, 'toggle in edit mode updates draft');
assert.strictEqual(panelToggle._prefs.widgetVisibility.progress, true, 'toggle in edit mode does not affect prefs immediately');

// --- Non-dashboard (no prefs) path unaffected ---
const panelNoState = new Panel();
panelNoState.hass = { locale: { language: 'en' }, user: { id: 'user-ns' }, states: {}, callService: async () => {} };
assert.ok(panelNoState.shadowRoot.innerHTML.includes('Cycle Dashboard'), 'panel renders even with no sensor state');

console.log('All extended dashboard edit mode tests passed.');
