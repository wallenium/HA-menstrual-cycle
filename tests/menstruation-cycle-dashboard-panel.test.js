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

const baseTranslations = {
  dashboard_toggle_widget_aria: 'Show or hide the content of {widget}',
  dashboard_chart_range: 'Chart period',
  dashboard_range_auto: 'Default',
  dashboard_range_all: 'All',
  months_3: '3 months',
  months_6: '6 months',
  months_12: '12 months',
  dashboard_today_open: 'Open today',
  dashboard_todo_temp: 'Take temperature',
  dashboard_todo_lh: 'LH test',
  dashboard_todo_pill: 'Pill taken',
  dashboard_todo_stock: 'Low stock: {products}',
  dashboard_pill_done: 'Pill logged.',
  dashboard_print: 'Print',
  tampon: 'Tampon',
  pad: 'Pad',
  liner: 'Liner',
  dashboard_page_title: 'Cycle Dashboard',
  dashboard_entity_picker_aria: 'Select profile',
  dashboard_widget_quick_log: 'Quick Log',
  dashboard_widget_today_status: 'Today Status',
  dashboard_widget_upcoming_window: 'Upcoming Window',
  dashboard_widget_reminders: 'Reminders Summary',
  dashboard_widget_progress: 'Progress & Badges',
  dashboard_widget_my_info: 'My Info',
  dashboard_widget_gauge_card: 'Gauge',
  dashboard_widget_calendar_card: 'Calendar',
  dashboard_widget_statistics_card: 'Statistics',
  dashboard_widget_pill_card: 'Pill pack',
  dashboard_pill_card_hidden_hint: 'Hidden outside of edit mode: no pill.',
  dashboard_no_entity_selected: 'No profile selected.',
  dashboard_component_unavailable: 'Card component not loaded.',
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
  progress_section_title: 'Progress',
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
};

const deTranslations = {
  ...baseTranslations,
  dashboard_page_title: 'Zyklus-Dashboard',
  dashboard_widget_quick_log: 'Schnellprotokoll',
};

const createI18nStore = () => ({
  cache: {
    en: { ...baseTranslations },
    de: { ...deTranslations },
  },
  fallback: {
    en: { ...baseTranslations },
  },
  loading: {},
  load: async (language) => {
    const lang = String(language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en';
    return lang === 'de' ? global.window.menstruationCycleI18n.cache.de : global.window.menstruationCycleI18n.cache.en;
  },
});

const documentScripts = [];
const createScript = (src = '') => {
  let currentSrc = src;
  const listeners = {};
  return {
    dataset: {},
    async: false,
    get src() {
      return currentSrc;
    },
    set src(value) {
      currentSrc = value;
    },
    getAttribute: (name) => (name === 'src' ? currentSrc : null),
    addEventListener: (type, handler) => { listeners[type] = handler; },
    removeEventListener: (type, handler) => {
      if (listeners[type] === handler) delete listeners[type];
    },
    dispatch: (type) => listeners[type]?.(),
  };
};

const appendScript = (script) => {
  documentScripts.push(script);
  if (script.src.includes('/menstruation_cycle/menstruation-i18n.js')) {
    setImmediate(() => {
      global.window.menstruationCycleI18n = createI18nStore();
      script.dispatch('load');
    });
  }
  return script;
};

global.document = {
  scripts: documentScripts,
  querySelectorAll: () => documentScripts,
  createElement: () => createScript(),
  head: { appendChild: appendScript },
  body: { appendChild: appendScript },
  documentElement: { appendChild: appendScript },
};

global.window = {
  location: { origin: 'http://localhost' },
  menstruationCycleI18n: createI18nStore(),
};

// eslint-disable-next-line no-eval
eval(source);

const Panel = defined['menstruation-cycle-dashboard-panel'];
const flushPromises = () => new Promise((resolve) => setImmediate(resolve));
const assignHass = async (panel, hass) => {
  panel.hass = hass;
  await flushPromises();
  await flushPromises();
  return panel;
};

class ClickTarget extends HTMLElement {
  constructor(dataset = {}) {
    super();
    this.dataset = dataset;
    this.checked = false;
    this.value = '';
    this.classList = { contains: () => false };
  }

  closest() {
    return this;
  }
}

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

(async () => {
  documentScripts.length = 0;
  documentScripts.push(createScript('/menstruation_cycle/menstruation-cycle-dashboard-panel.js?v=9.9.9'));
  delete global.window.menstruationCycleI18n;

  const loaderPanel = new Panel();
  const pendingLoad = loaderPanel._ensureI18nLoaded();
  assert.strictEqual(pendingLoad, loaderPanel._ensureI18nLoaded(), 'ensureI18nLoaded should reuse the in-flight promise');
  await pendingLoad;
  assert.strictEqual(
    documentScripts.filter((script) => script.src.includes('/menstruation_cycle/menstruation-i18n.js')).length,
    1,
    'should inject the i18n script only once'
  );
  assert.ok(
    documentScripts.some((script) => script.src === '/menstruation_cycle/menstruation-i18n.js?v=9.9.9'),
    'should inject the integration-served i18n script with a cache buster'
  );
  await loaderPanel._loadI18nLanguage('de');
  loaderPanel._lang = 'de';
  assert.strictEqual(loaderPanel._t('dashboard_page_title'), 'Zyklus-Dashboard', 'should use loaded German dashboard translations');

  global.window.menstruationCycleI18n = createI18nStore();
  documentScripts.length = 0;

  const panelGeneral = await assignHass(new Panel(), makeHass(makeState()));
  assert.ok(panelGeneral.shadowRoot.innerHTML.includes('Cycle Dashboard'));
  assert.strictEqual(panelGeneral._prefs.widgetVisibility.progress_badges, true, 'general preset should show the progress & badges card');
  assert.strictEqual(panelGeneral._prefs.discreetMode, false, 'general preset should default to non-discreet');

  const panelYoung = await assignHass(new Panel(), makeHass(makeState({ onboarding_stage_effective: 'early_menarche' })));
  assert.strictEqual(panelYoung._prefs.widgetVisibility.pregnancy_prediction, false, 'young preset should hide the pregnancy prediction by default');
  assert.strictEqual(panelYoung._prefs.discreetMode, true, 'young preset should default to discreet mode');

  const movedId = panelYoung._prefs.widgetOrder[0];
  panelYoung._prefs.widgetVisibility[movedId] = false;
  panelYoung._moveOrderItem('widgetOrder', movedId, 'down');
  panelYoung._savePrefs();

  const panelReload = await assignHass(new Panel(), makeHass(makeState({ onboarding_stage_effective: 'early_menarche' })));
  assert.strictEqual(panelReload._prefs.widgetVisibility[movedId], false, 'widget visibility should persist');
  assert.notStrictEqual(panelReload._prefs.widgetOrder[0], movedId, 'widget order should persist');

  panelReload._prefs.discreetMode = false;
  panelReload.render();
  assert.ok(panelReload.shadowRoot.innerHTML.includes('Turn on discreet mode'), 'normal mode should offer the discreet-mode toggle');
  panelReload._prefs.discreetMode = true;
  panelReload.render();
  assert.ok(panelReload.shadowRoot.innerHTML.includes('Turn off discreet mode'), 'discreet mode should offer turning it off');

  console.log('Cycle dashboard panel tests passed.');

  const panelEdit = await assignHass(new Panel(), { ...makeHass(makeState()), user: { id: 'user-edit-1' } });
  assert.ok(!panelEdit._editMode, 'should not be in edit mode initially');
  assert.ok(panelEdit.shadowRoot.innerHTML.includes('Edit dashboard'), 'header should show Edit dashboard button when not in edit mode');

  panelEdit._handleClick({ target: makeClick('toggle-edit') });
  assert.ok(panelEdit._editMode, 'toggle-edit should enter edit mode');
  assert.ok(panelEdit._editDraft, 'entering edit mode should create a draft');
  assert.ok(!panelEdit.shadowRoot.innerHTML.includes('data-action="toggle-edit"') || panelEdit.shadowRoot.innerHTML.includes('data-action="save-edit"'), 'edit panel should show save button');

  panelEdit._editDraft.widgetVisibility.kpi_strip = false;
  panelEdit._handleClick({ target: makeClick('cancel-edit') });
  assert.ok(!panelEdit._editMode, 'cancel-edit should exit edit mode');
  assert.strictEqual(panelEdit._prefs.widgetVisibility.kpi_strip, true, 'cancel should discard unsaved visibility change');
  assert.strictEqual(panelEdit._editDraft, null, 'cancel should clear draft');

  const panelSave = await assignHass(new Panel(), { ...makeHass(makeState()), user: { id: 'user-save-1' } });
  panelSave._handleClick({ target: makeClick('toggle-edit') });
  panelSave._editDraft.widgetVisibility.statistics_card = false;
  const draftOrder = [...panelSave._editDraft.widgetOrder];
  const temp = draftOrder[0];
  draftOrder[0] = draftOrder[1];
  draftOrder[1] = temp;
  panelSave._editDraft.widgetOrder = draftOrder;
  panelSave._handleClick({ target: makeClick('save-edit') });
  assert.ok(!panelSave._editMode, 'save-edit should exit edit mode');
  assert.strictEqual(panelSave._prefs.widgetVisibility.statistics_card, false, 'save should persist visibility change');
  assert.strictEqual(panelSave._prefs.widgetOrder[0], draftOrder[0], 'save should persist order change');
  assert.ok(panelSave.shadowRoot.innerHTML.includes('Dashboard layout saved.'), 'save should show confirmation message');

  const panelReload2 = await assignHass(new Panel(), { ...makeHass(makeState()), user: { id: 'user-save-1' } });
  assert.strictEqual(panelReload2._prefs.widgetVisibility.statistics_card, false, 'reloaded panel should see persisted visibility');

  const panelReset = await assignHass(new Panel(), { ...makeHass(makeState()), user: { id: 'user-reset-1' } });
  panelReset._handleClick({ target: makeClick('toggle-edit') });
  panelReset._editDraft.widgetVisibility.phase_timeline = false;
  panelReset._handleClick({ target: makeClick('reset-preset') });
  assert.ok(panelReset._editMode, 'reset in edit mode should stay in edit mode');
  assert.strictEqual(panelReset._editDraft.widgetVisibility.phase_timeline, true, 'reset should restore default visibility in draft');

  const panelEmpty = await assignHass(new Panel(), { ...makeHass(makeState()), user: { id: 'user-empty-1' } });
  // Widgets missing from the preset's visibility map (e.g. long_term_trend) default to visible, so hide every known id.
  for (const key of [...Object.keys(panelEmpty._prefs.widgetVisibility), ...panelEmpty._prefs.widgetOrder]) {
    panelEmpty._prefs.widgetVisibility[key] = false;
  }
  panelEmpty.render();
  assert.ok(panelEmpty.shadowRoot.innerHTML.includes('All widgets are hidden.'), 'should show empty state when all widgets hidden');
  assert.ok(panelEmpty.shadowRoot.innerHTML.includes('Open edit mode'), 'empty state should include hint');

  storage.set('menstruation_cycle.dashboard_prefs.user-corrupt.alice', '{not valid json}}}');
  const panelCorrupt = await assignHass(new Panel(), { ...makeHass(makeState()), user: { id: 'user-corrupt' } });
  assert.ok(panelCorrupt._prefs, 'corrupt storage should not crash');
  assert.ok(Array.isArray(panelCorrupt._prefs.widgetOrder), 'corrupt storage should produce valid widgetOrder');

  const badLayout = { widgetOrder: ['unknown_widget', 'statistics_card'], widgetVisibility: {} };
  storage.set('menstruation_cycle.dashboard_prefs.user-bad.alice', JSON.stringify(badLayout));
  const panelBad = await assignHass(new Panel(), { ...makeHass(makeState()), user: { id: 'user-bad' } });
  assert.ok(!panelBad._prefs.widgetOrder.includes('unknown_widget'), 'unknown keys should be removed');
  assert.ok(panelBad._prefs.widgetOrder.includes('kpi_strip'), 'missing known keys should be appended');

  const panelReorder = await assignHass(new Panel(), { ...makeHass(makeState()), user: { id: 'user-reorder-1' } });
  const origFirst = panelReorder._prefs.widgetOrder[0];
  panelReorder._handleClick({ target: makeClick('toggle-edit') });
  panelReorder._moveOrderItem('widgetOrder', origFirst, 'down');
  assert.notStrictEqual(panelReorder._editDraft.widgetOrder[0], origFirst, 'reorder should update draft');
  assert.strictEqual(panelReorder._prefs.widgetOrder[0], origFirst, 'reorder in edit mode should not yet update prefs');

  const panelToggle = await assignHass(new Panel(), { ...makeHass(makeState()), user: { id: 'user-toggle-1' } });
  panelToggle._handleClick({ target: makeClick('toggle-edit') });
  assert.ok(panelToggle.shadowRoot.innerHTML.includes('data-widget-id="progress_badges"'), 'shown on the grid first');
  panelToggle._handleClick({ target: makeClick('widget-hide', 'progress_badges') });
  assert.strictEqual(panelToggle._editDraft.widgetVisibility.progress_badges, false, 'the X hides the widget in the draft');
  assert.strictEqual(panelToggle._prefs.widgetVisibility.progress_badges, true, 'hiding in edit mode does not affect prefs immediately');
  assert.ok(!panelToggle.shadowRoot.innerHTML.includes('data-widget-id="progress_badges"'), 'it leaves the grid at once');
  assert.ok(panelToggle.shadowRoot.innerHTML.includes('data-action="widget-show" data-widget="progress_badges"'), 'and appears in the list of hidden widgets');
  panelToggle._handleClick({ target: makeClick('widget-show', 'progress_badges') });
  assert.strictEqual(panelToggle._editDraft.widgetVisibility.progress_badges, true);
  assert.ok(panelToggle.shadowRoot.innerHTML.includes('data-widget-id="progress_badges"'), 'back on the grid');

  const panelNoState = await assignHass(new Panel(), { locale: { language: 'en' }, user: { id: 'user-ns' }, states: {}, callService: async () => {} });
  assert.ok(panelNoState.shadowRoot.innerHTML.includes('Cycle Dashboard'), 'panel renders even with no sensor state');

  const stableHass = makeHass(makeState());
  const panelStable = await assignHass(new Panel(), stableHass);
  let stableRenderCount = 0;
  panelStable.render = () => { stableRenderCount += 1; };
  await assignHass(panelStable, makeHass(makeState()));
  assert.strictEqual(stableRenderCount, 0, 'unchanged hass updates should not re-render');
  await assignHass(panelStable, makeHass(makeState({ cycle_day: 8 })));
  assert.strictEqual(stableRenderCount, 1, 'relevant attribute changes should trigger re-render');

  const panelLang = new Panel();
  const originalLoadI18nLanguageOnce = panelLang._loadI18nLanguageOnce.bind(panelLang);
  let i18nLoadCount = 0;
  panelLang._loadI18nLanguageOnce = (lang) => {
    i18nLoadCount += 1;
    return originalLoadI18nLanguageOnce(lang);
  };
  const hassDe = { ...makeHass(makeState()), locale: { language: 'de' } };
  await assignHass(panelLang, hassDe);
  await assignHass(panelLang, hassDe);
  assert.strictEqual(i18nLoadCount, 1, 'i18n language load should be memoized per language');

  const selectionUser = 'user-selection-stable';
  storage.set(
    `menstruation_cycle.dashboard_selected_entity.${selectionUser}`,
    JSON.stringify('sensor.menstruation_saved'),
  );
  const panelSelection = await assignHass(new Panel(), {
    locale: { language: 'en' },
    user: { id: selectionUser },
    states: {
      'sensor.menstruation_saved': makeState({ friendly_name: 'Saved profile', profile: 'saved' }),
      'sensor.menstruation_current': makeState({ friendly_name: 'Current profile', profile: 'current' }),
    },
    callService: async () => {},
  });
  panelSelection._handleEntityChange('sensor.menstruation_current');
  await assignHass(panelSelection, {
    locale: { language: 'en' },
    user: { id: selectionUser },
    states: {
      'sensor.menstruation_saved': makeState({ friendly_name: 'Saved profile', profile: 'saved' }),
      'sensor.menstruation_current': makeState({ friendly_name: 'Current profile', profile: 'current' }),
    },
    callService: async () => {},
  });
  assert.strictEqual(panelSelection._selectedEntityId, 'sensor.menstruation_current', 'hass updates should preserve valid user-selected entity');

  const panelEntityFilter = await assignHass(new Panel(), {
    locale: { language: 'en' },
    user: { id: 'user-entity-filter' },
    states: {
      'sensor.menstruation_anna': makeState({ profile: 'anna', friendly_name: 'Anna' }),
      'sensor.menstruation_anna_period_products_today': makeState({ profile: 'anna', friendly_name: 'Anna products' }),
    },
    callService: async () => {},
  });
  const availableEntityIds = panelEntityFilter._getAvailableEntities().map((entity) => entity.entityId);
  assert.deepStrictEqual(availableEntityIds, ['sensor.menstruation_anna'], 'period-products helpers should be excluded from entity picker');
  // Up to five profiles render as a button group, a dropdown (class="entity-picker") only beyond that.
  assert.ok(panelEntityFilter.shadowRoot.innerHTML.includes('data-action="select-entity" data-entity-id="sensor.menstruation_anna"'), 'entity picker should remain visible with one entity');

  // the countdown card is configured with the main sensor (its state picks the mode), not with the timer-state entity
  const timerMount = source.slice(source.indexOf('data-mount="timer-card"'), source.indexOf('data-mount="statistics-card"'));
  assert.ok(timerMount.includes('{ entity: this._selectedEntityId }'), 'timer card must get the profile sensor');
  assert.ok(!timerMount.includes('entity: `menstruation_cycle_timer'), 'timer card must not get the timer-state entity');

  // pill blister widget: only profiles with a pill_pack get it, mounted as the real card without its own heading
  const noPill = panelGeneral._renderWidget('pill_card', panelGeneral._hass.states[panelGeneral._selectedEntityId], false);
  assert.strictEqual(noPill, '', 'no pill_pack, no widget');
  panelGeneral._editMode = true;
  const noPillEdit = panelGeneral._renderWidget('pill_card', panelGeneral._hass.states[panelGeneral._selectedEntityId], false);
  assert.ok(noPillEdit.includes('Hidden outside of edit mode: no pill.'), 'edit mode explains the missing pill widget');
  panelGeneral._editMode = false;
  const pillState = { attributes: { pill_pack: { active: 21, pause: 7, taken: [], position: 1, in_pause: false, today_taken: false, new_pack: true } } };
  const pillHtml = panelGeneral._renderWidget('pill_card', pillState, false);
  assert.ok(pillHtml.includes('data-mount="pill-card"') && pillHtml.includes('Pill pack'), 'pill_pack renders the mount with the widget title');
  const pillMount = source.slice(source.indexOf('data-mount="pill-card"'));
  assert.ok(pillMount.includes("tag: 'menstruation-pill-card'") && pillMount.includes("title: ''"), 'pill card is mounted without a duplicate title');
  assert.ok(source.includes("'menstruation-pill-card': 'menstruation-pill-card.js'"), 'panel loads the pill card script itself');

  // compact status card and small cycle card: two own widgets, off by default, mounted as the real cards, not in discreet mode
  const cycleState = panelGeneral._hass.states[panelGeneral._selectedEntityId];
  assert.strictEqual(panelGeneral._renderWidget('status_card', cycleState, false), '', 'hidden by default');
  panelGeneral._prefs.widgetVisibility.status_card = true;
  panelGeneral._prefs.widgetVisibility.cycle_card = true;
  const statusHtml = panelGeneral._renderWidget('status_card', cycleState, false);
  assert.ok(statusHtml.includes('data-mount="status-card"') && statusHtml.includes('>Status<'), 'status widget mounts the compact status card');
  const cycleCardHtml = panelGeneral._renderWidget('cycle_card', cycleState, false);
  assert.ok(cycleCardHtml.includes('data-mount="cycle-card"') && cycleCardHtml.includes('Cycle &amp; quick log') || cycleCardHtml.includes('Cycle & quick log'), 'cycle widget mounts the small cycle card');
  assert.strictEqual(panelGeneral._renderWidget('status_card', cycleState, true), '', 'not shown in discreet mode');
  assert.strictEqual(panelGeneral._renderWidget('cycle_card', cycleState, true), '', 'not shown in discreet mode');
  assert.ok(source.includes('selector: \'[data-mount="status-card"]\', tag: \'menstruation-cycle-compact-status\''), 'status card tag');
  assert.ok(source.includes('selector: \'[data-mount="cycle-card"]\', tag: \'menstruation-cycle-card\''), 'cycle card tag');
  assert.ok(source.includes("'menstruation-cycle-compact-status': 'menstruation-cycle-compact-status-card.js'") && source.includes("'menstruation-cycle-card': 'menstruation-cycle-card-compact.js'"), 'panel loads both card scripts itself');
  const widgetIds = Array.from(panelGeneral._prefs.widgetOrder);
  assert.ok(widgetIds.includes('status_card') && widgetIds.includes('cycle_card'), 'both are part of the widget order (reorderable)');
  panelGeneral._prefs.widgetVisibility.status_card = false;
  panelGeneral._prefs.widgetVisibility.cycle_card = false;

  // quick log: pain strength 0-10 as a number field, stored as a number, shown again, empty/out of range removes it
  const realFunctions = global.window.MenstruationFunctions;
  global.window.MenstruationFunctions = { getSymptomConfig: () => [], normalizeOptionKey: (v) => v, renderOptionIcon: () => '', renderCategoryIcon: () => '' };
  panelGeneral._quickLogOpen = true;
  panelGeneral._quickLogSelections = {};
  assert.ok(panelGeneral._renderQuickLogModal(cycleState).includes('data-action="quick-log-pain-intensity"'), 'number field in the quick log');
  const strengthInput = new ClickTarget({ action: 'quick-log-pain-intensity' });
  strengthInput.value = '7';
  panelGeneral._handleChange({ target: strengthInput });
  assert.strictEqual(panelGeneral._quickLogSelections.pain_intensity, 7);
  assert.ok(panelGeneral._renderQuickLogModal(cycleState).includes('value="7"'), 'the typed value stays in the field');
  strengthInput.value = '11';
  panelGeneral._handleChange({ target: strengthInput });
  assert.strictEqual(panelGeneral._quickLogSelections.pain_intensity, undefined, 'out of range is dropped');
  strengthInput.value = '0';
  panelGeneral._handleChange({ target: strengthInput });
  assert.strictEqual(panelGeneral._quickLogSelections.pain_intensity, 0, '0 is a real value');
  const hiddenPain = { ...panelGeneral._prefs, categoryVisibility: { pain: false } };
  const before = panelGeneral._prefs;
  panelGeneral._prefs = hiddenPain;
  assert.ok(!panelGeneral._renderQuickLogModal(cycleState).includes('quick-log-pain-intensity'), 'hidden together with the pain category');
  panelGeneral._prefs = before;
  panelGeneral._quickLogOpen = false;
  panelGeneral._quickLogSelections = {};
  global.window.MenstruationFunctions = realFunctions;

  // edit mode on the grid: decorated cards, resize by dragging (snaps to columns), move by dragging, keyboard
  const gridPanel = await assignHass(new Panel(), { ...makeHass(makeState()), user: { id: 'user-grid-1' } });
  assert.ok(!gridPanel.shadowRoot.innerHTML.includes('data-widget-id='), 'no edit decorations outside the edit mode');
  gridPanel._handleClick({ target: makeClick('toggle-edit') });
  const gridHtml = gridPanel.shadowRoot.innerHTML;
  assert.ok(/<article class="card span-\d+[^"]* edit-card" data-widget-id="kpi_strip"/.test(gridHtml), 'cards on the grid are editable');
  assert.ok(gridHtml.includes('class="edit-x" data-action="widget-hide" data-widget="kpi_strip"') && gridHtml.includes('data-resize-handle="true"'), 'X button and resize handle');
  assert.ok(gridHtml.includes('class="edit-bar"') && gridHtml.includes('data-action="save-edit"'), 'toolbar with the buttons stays on top');

  const shownIds = () => gridPanel._shownWidgetIds(gridPanel._hass.states[gridPanel._selectedEntityId]);
  const makeGridCard = (id, rect, grid) => {
    const handle = { };
    const badge = { textContent: '' };
    const card = {
      dataset: { widgetId: id }, className: `card span-${gridPanel._widgetSpan(id)} edit-card`, style: {}, parentElement: grid, handle, badge,
      classList: { added: [], add(c) { this.added.push(c); }, remove(c) { this.added = this.added.filter((x) => x !== c); } },
      getBoundingClientRect: () => rect, setPointerCapture() {}, releasePointerCapture() {},
      querySelector: () => badge,
    };
    return card;
  };
  const press = (card, { resize = false, onX = false, pointerType = 'mouse', onGrip = false, x = 100, y = 100 } = {}) => ({
    pointerId: 1, pointerType, button: 0, clientX: x, clientY: y, preventDefault() {},
    target: { closest: (sel) => ({ '.edit-card': card, '.edit-x': onX ? {} : null, '[data-resize-handle]': resize ? {} : null, '.edit-grip': onGrip ? {} : null }[sel] ?? null) },
  });

  // resize: 12 columns of 100 px (1184 px grid + 16 px gap), the progress card starts at 6 columns
  const resizeId = 'inventory_card';
  const resizeGrid = { getBoundingClientRect: () => ({ width: 1184 }), querySelectorAll: () => [] };
  const resizeCard = makeGridCard(resizeId, { left: 0, top: 0, width: 600, height: 200 }, resizeGrid);
  const spanBefore = gridPanel._widgetSpan(resizeId);
  gridPanel._handleDragPointerDown(press(resizeCard, { resize: true }));
  gridPanel._handleDragPointerMove({ pointerId: 1, clientX: 100 + 100 * 2, clientY: 100, preventDefault() {} });
  assert.ok(resizeCard.className.includes(`span-${Math.min(12, spanBefore + 2)}`), 'the class follows the pointer while dragging');
  assert.strictEqual(resizeCard.badge.textContent, `${Math.min(12, spanBefore + 2)}/12`, 'size badge');
  gridPanel._handleDragPointerMove({ pointerId: 1, clientX: 100 + 160, clientY: 100, preventDefault() {} });
  assert.ok(resizeCard.className.includes(`span-${spanBefore + 2}`), '1.6 columns snap to 2 (rounded, not cut off)');
  gridPanel._handleDragPointerMove({ pointerId: 1, clientX: 100 - 5000, clientY: 100, preventDefault() {} });
  assert.ok(resizeCard.className.includes('span-3'), 'never narrower than 3 columns');
  gridPanel._handleDragPointerMove({ pointerId: 1, clientX: 100 + 5000, clientY: 100, preventDefault() {} });
  assert.ok(resizeCard.className.includes('span-12'), 'never wider than 12 columns');
  gridPanel._handleDragPointerMove({ pointerId: 1, clientX: 100 - 100 * 2, clientY: 100, preventDefault() {} });
  gridPanel._handleDragPointerUp({ pointerId: 1 });
  assert.strictEqual(gridPanel._editDraft.widgetSpan[resizeId], Math.max(3, spanBefore - 2), 'the width is stored in the draft');
  assert.strictEqual(gridPanel._prefs.widgetSpan[resizeId], undefined, 'not in the saved settings before saving');
  assert.ok(new RegExp(`span-${Math.max(3, spanBefore - 2)}[^"]* edit-card" data-widget-id="${resizeId}"`).test(gridPanel.shadowRoot.innerHTML), 'the grid renders the new width');
  // back to the default width removes the entry again
  gridPanel._setWidgetSpan(resizeId, spanBefore);
  assert.strictEqual(gridPanel._editDraft.widgetSpan[resizeId], undefined, 'default width is not stored');
  // a click without moving changes nothing
  gridPanel._handleDragPointerDown(press(resizeCard, { resize: true }));
  gridPanel._handleDragPointerUp({ pointerId: 1 });
  assert.strictEqual(gridPanel._editDraft.widgetSpan[resizeId], undefined, 'a press without movement is not a resize');

  // move: drag the first shown card behind the second one; hidden cards keep their slot
  gridPanel._editDraft.widgetVisibility.timer_card = false;
  const orderBefore = [...gridPanel._editDraft.widgetOrder];
  const slotOfHidden = orderBefore.indexOf('timer_card');
  const ids = shownIds();
  const [a, b] = [ids[0], ids[1]];
  const children = ids.map((id) => makeGridCard(id, { left: 0, top: 0, width: 100, height: 100 }, null));
  const moveGrid = {
    getBoundingClientRect: () => ({ width: 1184 }),
    querySelectorAll: () => children,
    insertBefore(node, ref) {
      const i = children.indexOf(node);
      children.splice(i, 1);
      const j = ref ? children.indexOf(ref) : children.length;
      children.splice(j, 0, node);
    },
  };
  children.forEach((c) => { c.parentElement = moveGrid; });
  moveGrid.parentElement = null;
  children.forEach((c) => { c.parentElement.insertBefore = moveGrid.insertBefore; });
  const dragged = children[0];
  const target = children[1];
  // closest('.edit-card') on the target element returns itself
  target.closest = () => target;
  target.parentElement = { insertBefore: (node, ref) => moveGrid.insertBefore(node, ref) };
  dragged.parentElement = { insertBefore: (node, ref) => moveGrid.insertBefore(node, ref), querySelectorAll: () => children };
  gridPanel.shadowRoot.elementsFromPoint = () => [target];
  gridPanel._handleDragPointerDown(press(dragged));
  gridPanel._handleDragPointerMove({ pointerId: 1, clientX: 500, clientY: 90, preventDefault() {} }); // lower half of the target, further right: behind it
  gridPanel._handleDragPointerUp({ pointerId: 1 });
  const orderAfter = gridPanel._editDraft.widgetOrder;
  assert.ok(orderAfter.indexOf(b) < orderAfter.indexOf(a), 'the dragged card now comes after the second one');
  assert.strictEqual(orderAfter.indexOf('timer_card'), slotOfHidden, 'the hidden widget keeps its slot');
  assert.strictEqual(orderAfter.length, orderBefore.length);
  delete gridPanel.shadowRoot.elementsFromPoint;

  // presses that must not start a gesture
  gridPanel._dragState = null;
  const probe = makeGridCard('kpi_strip', { left: 0, top: 0, width: 10, height: 10 }, resizeGrid);
  gridPanel._handleDragPointerDown(press(probe, { onX: true }));
  assert.strictEqual(gridPanel._dragState, null, 'the X button is a button, not a drag start');
  gridPanel._handleDragPointerDown(press(probe, { pointerType: 'touch' }));
  assert.strictEqual(gridPanel._dragState, null, 'a finger on the card body scrolls the page');
  gridPanel._handleDragPointerDown(press(probe, { pointerType: 'touch', onGrip: true }));
  assert.ok(gridPanel._dragState && gridPanel._dragState.kind === 'card', 'a finger on the grip moves the card');
  gridPanel._handleDragPointerUp({ pointerId: 1 });

  // keyboard on a selected card
  const kbIds = shownIds();
  const kbId = kbIds[2];
  const keyCard = { dataset: { widgetId: kbId }, focus() {} };
  const key = (k, shiftKey = false) => ({ key: k, shiftKey, target: keyCard, preventDefault() {} });
  const keyBefore = shownIds().indexOf(kbId);
  gridPanel._handleEditCardKey(key('ArrowLeft'), keyCard);
  assert.strictEqual(shownIds().indexOf(kbId), keyBefore - 1, 'arrow left moves the card earlier');
  gridPanel._handleEditCardKey(key('ArrowRight'), keyCard);
  assert.strictEqual(shownIds().indexOf(kbId), keyBefore, 'arrow right moves it back');
  const spanKb = gridPanel._widgetSpan(kbId);
  gridPanel._handleEditCardKey(key('ArrowRight', true), keyCard);
  assert.strictEqual(gridPanel._widgetSpan(kbId), Math.min(12, spanKb + 1), 'shift+arrow right widens by one column');
  gridPanel._handleEditCardKey(key('Delete'), keyCard);
  assert.strictEqual(gridPanel._editDraft.widgetVisibility[kbId], false, 'delete hides the card');

  // save keeps order, widths and hidden widgets; a reload sees them; invalid widths are dropped
  gridPanel._handleClick({ target: makeClick('save-edit') });
  assert.strictEqual(gridPanel._prefs.widgetVisibility[kbId], false);
  assert.strictEqual(gridPanel._prefs.widgetOrder.indexOf('timer_card'), slotOfHidden);
  const normalized = gridPanel._normalizePrefs({ widgetSpan: { kpi_strip: 7, phase_donut: 2, basal_temp: 13, pill_card: 4.5, nonsense: 6, support_card: '8' } }, 'alice', 'general');
  assert.deepStrictEqual(normalized.widgetSpan, { kpi_strip: 7 }, 'only whole numbers from 3 to 12 for known widgets survive');
  assert.deepStrictEqual(gridPanel._normalizePrefs({}, 'alice', 'general').widgetSpan, {}, 'old saved settings have no widths');
  assert.ok(gridPanel.shadowRoot.innerHTML.includes('class="grid') && !gridPanel.shadowRoot.innerHTML.includes('data-widget-id='), 'edit decorations are gone after saving');

  // animation: the opening animation plays once per open / profile switch, never on later re-renders
  const animPanel = await assignHass(new Panel(), makeHass(makeState()));
  assert.ok(animPanel.shadowRoot.innerHTML.includes('class="grid mc-enter"'), 'first render with cards animates');
  animPanel.render();
  assert.ok(!animPanel.shadowRoot.innerHTML.includes('mc-enter"'), 'a later re-render must not replay the animation');
  animPanel._enterPlayed = false; // what a profile switch does
  animPanel.render();
  assert.ok(animPanel.shadowRoot.innerHTML.includes('class="grid mc-enter"'), 'plays again after the flag is reset');
  assert.ok(source.includes('this._enterPlayed = false; // play the opening animation again'), 'profile switch resets the flag');
  assert.ok(/prefers-reduced-motion: reduce\) \{\s*\* \{ transition: none !important; animation: none !important;/.test(source), 'reduce motion switches every animation off');

  // dashboard setting "Animations": on by default (also for prefs saved before the setting existed), off removes every animation
  assert.strictEqual(animPanel._prefs.animations, true, 'on by default');
  assert.strictEqual(animPanel._normalizePrefs({ discreetMode: false }, 'alice', 'general').animations, true, 'old saved prefs without the key stay animated');
  assert.strictEqual(animPanel._normalizePrefs({ animations: false }, 'alice', 'general').animations, false, 'the saved choice is kept');
  assert.ok(animPanel.shadowRoot.innerHTML.includes('<main class="page">'));
  const toggle = new ClickTarget();
  toggle.dataset = { pref: 'animations' };
  toggle.checked = false;
  animPanel._handleChange({ target: toggle });
  assert.strictEqual(animPanel._prefs.animations, false, 'switching it off is stored in the prefs');
  animPanel._enterPlayed = false;
  animPanel._message = 'Saved.';
  animPanel._messageShown = null;
  animPanel.render();
  assert.ok(animPanel.shadowRoot.innerHTML.includes('<main class="page no-motion">'), 'page gets the no-motion class');
  assert.ok(!animPanel.shadowRoot.innerHTML.includes('mc-enter"') && !animPanel.shadowRoot.innerHTML.includes('class="message mc-pop"'), 'no opening animation, no message animation');
  global.window.MenstruationFunctions = { getSymptomConfig: () => [], normalizeOptionKey: (v) => v, renderOptionIcon: () => '', renderCategoryIcon: () => '' };
  animPanel._quickLogOpen = true;
  animPanel._quickLogPopped = false;
  assert.ok(!animPanel._renderQuickLogModal(cycleState).includes('mc-pop'), 'no dialog animation');
  animPanel._quickLogOpen = false;
  global.window.MenstruationFunctions = undefined;
  animPanel._message = null;
  toggle.checked = true;
  animPanel._handleChange({ target: toggle });
  assert.strictEqual(animPanel._prefs.animations, true);

  // quick log dialog and message pop in once, not on every tap/re-render
  global.window.MenstruationFunctions = { getSymptomConfig: () => [], normalizeOptionKey: (v) => v, renderOptionIcon: () => '', renderCategoryIcon: () => '' };
  animPanel._quickLogOpen = true;
  assert.ok(animPanel._renderQuickLogModal(cycleState).includes('mc-modal-backdrop mc-pop'), 'dialog animates when it opens');
  assert.ok(!animPanel._renderQuickLogModal(cycleState).includes('mc-pop'), 'but not on the re-render after a tap');
  animPanel._quickLogOpen = false;
  animPanel._renderQuickLogModal(cycleState);
  animPanel._quickLogOpen = true;
  assert.ok(animPanel._renderQuickLogModal(cycleState).includes('mc-pop'), 'opening it again animates again');
  animPanel._quickLogOpen = false;
  global.window.MenstruationFunctions = undefined;
  animPanel._message = 'Saved.';
  animPanel.render();
  assert.ok(animPanel.shadowRoot.innerHTML.includes('class="message mc-pop"'), 'a new message slides in');
  animPanel.render();
  assert.ok(!animPanel.shadowRoot.innerHTML.includes('class="message mc-pop"'), 'the same message does not repeat');
  animPanel._message = null;

  // count-up: whole numbers (and percentages) end on their real value, other texts stay untouched
  const makeCounter = (text) => ({ textContent: text, isConnected: true });
  const counters = [makeCounter('12'), makeCounter('85%'), makeCounter('5d'), makeCounter('0'), makeCounter('—'), { textContent: '9', isConnected: false }];
  const realQuery = animPanel.shadowRoot.querySelectorAll;
  animPanel.shadowRoot.querySelectorAll = () => counters;
  let clock = 0;
  const frames = [];
  global.requestAnimationFrame = (fn) => frames.push(fn);
  global.window.matchMedia = () => ({ matches: false });
  animPanel._countUp();
  assert.strictEqual(frames.length, 1, 'one frame requested');
  const first = frames.shift();
  first(performance.now() + 1);
  assert.ok(Number(counters[0].textContent) < 12, 'starts below the target');
  assert.strictEqual(counters[5].textContent, '9', 'an element replaced by a re-render is left alone');
  while (frames.length) frames.shift()(performance.now() + 1000 + (clock += 1));
  assert.deepStrictEqual(counters.map((c) => c.textContent), ['12', '85%', '5d', '0', '—', '9'], 'ends on the real values; texts like 5d/0/dash and re-rendered (detached) elements untouched');
  global.window.matchMedia = () => ({ matches: true });
  counters[0].textContent = '12';
  animPanel._countUp();
  assert.strictEqual(frames.length, 0, 'reduce motion: no counting');
  animPanel.shadowRoot.querySelectorAll = realQuery;
  delete global.requestAnimationFrame;
  delete global.window.matchMedia;


  // ---- Folding cards, chart period, "open today", sticky header, print view ----
  const isoMonthsBack = (months, extraDays = 0) => {
    const day = new Date();
    day.setMonth(day.getMonth() - months);
    day.setDate(day.getDate() + extraDays);
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  };
  const isoToday = isoMonthsBack(0);
  const featPanel = await assignHass(new Panel(), makeHass(makeState({ symptom_history: [] })));
  featPanel._prefs.widgetVisibility.cycle_history = true;

  // folding: click on the title toggles, is stored per profile, shows in the markup; edit mode never folds
  const featState = featPanel._hass.states[featPanel._selectedEntityId];
  let html = featPanel._renderWidget('cycle_history', featState, false);
  assert.ok(html.includes('data-action="widget-collapse" data-widget="cycle_history"') && html.includes('aria-expanded="true"') && !html.includes('collapsed'), 'open by default');
  featPanel._handleClick({ target: makeClick('widget-collapse', 'cycle_history') });
  assert.strictEqual(featPanel._prefs.widgetCollapsed.cycle_history, true, 'click folds the card');
  html = featPanel._renderWidget('cycle_history', featState, false);
  assert.ok(html.includes('span-6 collapsed') || /class="card [^"]*collapsed/.test(html), 'folded card gets the collapsed class');
  assert.ok(html.includes('aria-expanded="false"'), 'and says so');
  assert.ok(JSON.parse(storage.get(featPanel._storageKey(featPanel._activeProfile))).widgetCollapsed.cycle_history === true, 'the fold state is saved with the prefs');
  featPanel._editMode = true;
  html = featPanel._renderWidget('cycle_history', featState, false);
  assert.ok(!html.includes('collapsed') && !html.includes('widget-collapse'), 'edit mode shows the whole card, title is plain');
  featPanel._editMode = false;
  let prevented = false;
  featPanel._handleKeydown({ key: 'Enter', target: { dataset: { action: 'widget-collapse', widget: 'cycle_history' } }, preventDefault: () => { prevented = true; } });
  assert.ok(prevented && !featPanel._prefs.widgetCollapsed.cycle_history, 'Enter on the title opens it again');
  featPanel._handleKeydown({ key: ' ', target: { dataset: { action: 'widget-collapse', widget: 'cycle_history' } }, preventDefault: () => {} });
  assert.strictEqual(featPanel._prefs.widgetCollapsed.cycle_history, true, 'Space folds it');
  featPanel._handleClick({ target: makeClick('widget-collapse', 'cycle_history') });
  assert.deepStrictEqual(featPanel._normalizePrefs({ widgetCollapsed: { cycle_history: true, nonsense: true, kpi_strip: false, calendar_card: 'yes' } }, 'alice', 'general').widgetCollapsed, { cycle_history: true }, 'only known widgets with true survive');
  assert.ok(/@media screen \{ \.card\.collapsed > :not\(h2\) \{ display: none; \} \}/.test(source), 'folding hides the body on screen only, so the print view has everything');

  // chart period: 'auto' keeps the old windows, a period filters by date, 'all' keeps everything, capped
  const dated = [0, 1, 2, 4, 7, 13].map((months) => ({ date: isoMonthsBack(months, -1) })).reverse();
  assert.strictEqual(featPanel._prefs.chartRange, 'auto');
  assert.strictEqual(featPanel._inChartRange(dated, (d) => d.date, 2).length, 2, 'auto: the last n entries');
  featPanel._prefs.chartRange = '3';
  assert.strictEqual(featPanel._inChartRange(dated, (d) => d.date, 2).length, 3, '3 months: entries from 0, 1 and 2 months back');
  featPanel._prefs.chartRange = '6';
  assert.strictEqual(featPanel._inChartRange(dated, (d) => d.date, 2).length, 4, '6 months');
  featPanel._prefs.chartRange = '12';
  assert.strictEqual(featPanel._inChartRange(dated, (d) => d.date, 2).length, 5, '12 months');
  featPanel._prefs.chartRange = 'all';
  assert.strictEqual(featPanel._inChartRange(dated, (d) => d.date, 2).length, 6, 'all');
  assert.strictEqual(featPanel._inChartRange(Array.from({ length: 500 }, () => ({ date: isoToday })), (d) => d.date, 2).length, 200, 'capped');
  featPanel._prefs.chartRange = '12';
  assert.strictEqual(featPanel._inChartRange(Array.from({ length: 500 }, () => ({ date: isoToday })), (d) => d.date, 2).length, 200, 'capped with a period as well');
  featPanel._prefs.chartRange = 'bogus';
  assert.strictEqual(featPanel._inChartRange(dated, (d) => d.date, 2).length, 2, 'unknown value behaves like auto');
  featPanel._prefs.chartRange = 'auto';

  // the same period reaches the charts: cycle starts every 35 days, 15 months back
  const starts = Array.from({ length: 14 }, (_, i) => isoMonthsBack(0, -35 * (13 - i)));
  featPanel._hass.states[featPanel._selectedEntityId] = makeState({ grouped_starts: starts, symptom_history: [] });
  const trendState = featPanel._hass.states[featPanel._selectedEntityId];
  const pointsIn = (range) => { featPanel._prefs.chartRange = range; return (featPanel._renderLongTermTrendChart(trendState).match(/<circle/g) || []).length; };
  const allPoints = pointsIn('all');
  const threePoints = pointsIn('3');
  assert.ok(allPoints > 4 && threePoints === 0, `long-term trend honours the period (all: ${allPoints} points, 3 months: ${threePoints})`);
  assert.ok(featPanel._renderLongTermTrendChart(trendState).includes('dashboard_not_enough_data') || featPanel._renderLongTermTrendChart(trendState).includes('Not enough'), '3 months has too few cycles for a trend');
  featPanel._prefs.chartRange = '12';
  assert.ok(featPanel._renderCycleHistoryGraph(trendState).includes('<svg') || featPanel._renderCycleHistoryGraph(trendState).includes('cycle-'), 'cycle history still draws with a period');
  featPanel._prefs.chartRange = '3';
  const oldStarts = Array.from({ length: 6 }, (_, i) => isoMonthsBack(8, -35 * (5 - i)));
  const oldState = makeState({ grouped_starts: oldStarts, symptom_history: [] });
  assert.ok(featPanel._renderCycleHistoryGraph(oldState).includes('dashboard_not_enough_data') || featPanel._renderCycleHistoryGraph(oldState).includes('Not enough'), 'no cycle inside the period: a note instead of a broken chart');
  assert.ok(!featPanel._renderCycleHistoryGraph(trendState).includes('NaN') && !featPanel._renderCycleHistoryGraph(trendState).includes('Infinity'), 'a period with less than one cycle does not break the chart');
  featPanel._prefs.chartRange = 'auto';

  // selector in the toolbar saves the choice per profile
  const select = new ClickTarget({ pref: 'chartRange' });
  select.tagName = 'SELECT';
  select.value = '6';
  assert.ok(!/class="[^"]*entity-picker[^"]*" data-pref="chartRange"/.test(featPanel._renderRangePicker()), 'the period selector is not the profile selector');
  select.classList = { contains: (name) => name === 'entity-picker' }; // even if it were styled like one, it must not switch the profile
  featPanel._handleChange({ target: select });
  assert.strictEqual(featPanel._prefs.chartRange, '6');
  assert.strictEqual(JSON.parse(storage.get(featPanel._storageKey(featPanel._activeProfile))).chartRange, '6', 'saved');
  assert.ok(/<option value="6" selected>/.test(featPanel._renderRangePicker()) && featPanel.shadowRoot.innerHTML.includes('data-pref="chartRange"'), 'toolbar shows the chosen period');
  select.value = 'evil';
  featPanel._handleChange({ target: select });
  assert.strictEqual(featPanel._prefs.chartRange, 'auto', 'invalid value falls back');
  assert.strictEqual(featPanel._normalizePrefs({ chartRange: 'x' }, 'alice', 'general').chartRange, 'auto');
  featPanel._editMode = true;
  featPanel.render();
  assert.ok(!featPanel.shadowRoot.innerHTML.includes('data-pref="chartRange"'), 'no selector while editing');
  featPanel._editMode = false;

  // history loaded for the period, and again once the sensor state changed (a logged value)
  const sent = [];
  const connHass = makeHass(makeState({ symptom_history: [] }));
  connHass.states['sensor.menstruation_cycle_alice'].last_updated = 't1';
  connHass.connection = { sendMessagePromise: async (message) => { if (message.service !== 'get_full_history') return {}; sent.push(message.service_data.days); return { response: { symptom_history: [{ date: isoToday, basal_temp: 36.5 }], product_usage: [] } }; } };
  const histPanel = await assignHass(new Panel(), connHass);
  const needHistory = () => histPanel._getFullSymptomHistory(histPanel._hass.states[histPanel._selectedEntityId]);
  needHistory();
  await flushPromises();
  const loaded = sent.length;
  assert.ok(loaded >= 1 && sent.every((days) => days === 180), 'default: 180 days');
  needHistory();
  assert.strictEqual(sent.length, loaded, 'no reload while nothing changed');
  histPanel._prefs.chartRange = '12';
  needHistory();
  await flushPromises();
  assert.strictEqual(sent[sent.length - 1], 366, '12 months loads 366 days');
  histPanel._prefs.chartRange = 'all';
  needHistory();
  await flushPromises();
  assert.strictEqual(sent[sent.length - 1], 730, 'all loads 730 days');
  const sentBefore = sent.length;
  connHass.states['sensor.menstruation_cycle_alice'] = { ...connHass.states['sensor.menstruation_cycle_alice'], last_updated: 't2' };
  histPanel._hass = connHass;
  needHistory();
  await flushPromises();
  assert.strictEqual(sent.length, sentBefore + 1, 'a changed sensor state reloads the history, so a just logged value shows up');

  // "open today": temperature, LH test, pill, low stock; each only when it applies and is still missing
  const openPanel = await assignHass(new Panel(), makeHass(makeState({ symptom_history: [] })));
  const openState = (attrs = {}, state = 'follicular') => ({ ...makeState({ symptom_history: [], ...attrs }), state });
  const keys = (stateObj) => openPanel._todayOpenItems(stateObj).map((item) => item.key);
  assert.deepStrictEqual(keys(openState()), [], 'nothing to do, nothing shown');
  assert.strictEqual(openPanel._renderTodayOpen(openState(), false), '', 'and no empty strip');
  const yesterday = isoMonthsBack(0, -1);
  assert.deepStrictEqual(keys(openState({ symptom_history: [{ date: yesterday, basal_temp: 36.4 }] })), ['temp'], 'temperature logged recently but not today');
  assert.deepStrictEqual(keys(openState({ symptom_history: [{ date: yesterday, basal_temp: 36.4 }, { date: isoToday, basal_temp: 36.5 }] })), [], 'temperature of today is there');
  const fertile = { fertile_window_start: isoMonthsBack(0, -2), fertile_window_end: isoMonthsBack(0, 2) };
  assert.deepStrictEqual(keys(openState(fertile)), ['lh'], 'inside the fertile window without an LH test');
  assert.deepStrictEqual(keys(openState({ ...fertile, symptom_history: [{ date: isoToday, test: ['negative_ovulation'] }] })), [], 'LH test of today is logged');
  assert.deepStrictEqual(keys(openState({ ...fertile, symptom_history: [{ date: isoToday, test: ['pregnancy_negative'] }] })), ['lh'], 'another test does not count');
  assert.deepStrictEqual(keys(openState({ ...fertile }, 'period')), [], 'no LH test during the period');
  assert.deepStrictEqual(keys(openState({ pill_pack: { in_pause: false, today_taken: false } })), ['pill']);
  assert.deepStrictEqual(keys(openState({ pill_pack: { in_pause: false, today_taken: true } })), [], 'pill taken');
  assert.deepStrictEqual(keys(openState({ pill_pack: { in_pause: true, today_taken: false } })), [], 'pause day');
  assert.deepStrictEqual(keys(openState({ pill_pack: { in_pause: false, today_taken: false } }, 'pregnant')), [], 'not for the pregnancy mode');
  openPanel._hass.states['sensor.household_product_stock'] = { state: 'ok', attributes: {
    inventory: { pad: 3, tampon: 6, liner: 0, cup: 0 }, thresholds: { tampon: { critical: 5 } },
    consumption_log: [{ product: 'pad' }, { product: 'tampon' }],
  } };
  const stockItem = openPanel._todayOpenItems(openState())[0];
  assert.ok(stockItem && stockItem.key === 'stock' && stockItem.label.includes('Pad') && !stockItem.label.includes('Tampon') && !stockItem.label.includes('Liner'), 'low means at or below the critical threshold, only for products that are used');
  openPanel._hass.states['sensor.household_product_stock'].attributes.inventory.pad = 5;
  assert.ok(openPanel._todayOpenItems(openState())[0]?.label.includes('Pad'), 'exactly at the threshold counts as low');
  openPanel._hass.states['sensor.household_product_stock'].attributes.inventory.pad = 6;
  assert.deepStrictEqual(keys(openState()), [], 'above the threshold');
  openPanel._hass.states['sensor.household_product_stock'].attributes.inventory.pad = 3;
  const strip = openPanel._renderTodayOpen(openState({ pill_pack: { in_pause: false, today_taken: false } }), false);
  assert.ok(strip.includes('class="today-open"') && strip.includes('data-todo="pill"') && strip.includes('data-todo="stock"'), 'strip with a chip per open item');
  assert.strictEqual(openPanel._renderTodayOpen(openState({ pill_pack: { in_pause: false, today_taken: false } }), true), '', 'not in discreet mode');
  openPanel._editMode = true;
  assert.strictEqual(openPanel._renderTodayOpen(openState({ pill_pack: { in_pause: false, today_taken: false } }), false), '', 'not while editing');
  openPanel._editMode = false;
  openPanel._prefs.widgetVisibility.inventory_card = false;
  assert.ok(openPanel._renderTodayOpen(openState(), false).includes('<span class="todo-chip">') && !openPanel._renderTodayOpen(openState(), false).includes('data-todo="stock"'), 'stock chip is only text when the inventory widget is hidden');
  openPanel._prefs.widgetVisibility.inventory_card = true;

  // the pill chip logs the intake right away
  const calls = [];
  openPanel._hass.callService = async (domain, service, data) => { calls.push([domain, service, data]); };
  openPanel._hass.states[openPanel._selectedEntityId] = openState({ pill_pack: { in_pause: false, today_taken: false } });
  openPanel._handleClick({ target: new ClickTarget({ action: 'todo', todo: 'pill' }) });
  await flushPromises();
  assert.deepStrictEqual(calls[0].slice(0, 2), ['menstruation_cycle', 'add_symptom']);
  assert.strictEqual(calls[0][2].symptom_data.contraception_method, 'pill');
  assert.strictEqual(calls[0][2].date, isoToday);
  assert.strictEqual(openPanel._message, 'Pill logged.');
  // the other chips jump to the row / card (focus + scroll), without logging anything
  const jumped = [];
  const fake = { scrollIntoView: (o) => jumped.push(['scroll', o.behavior]), focus: () => jumped.push(['focus']) };
  const realQuery1 = openPanel.shadowRoot.querySelector;
  openPanel.shadowRoot.querySelector = () => fake;
  openPanel._openTodo('temp');
  openPanel._openTodo('stock');
  assert.deepStrictEqual(jumped, [['scroll', 'smooth'], ['focus'], ['scroll', 'smooth']], 'temperature jumps and focuses, stock only scrolls');
  openPanel._prefs.animations = false;
  jumped.length = 0;
  openPanel._openTodo('lh');
  assert.strictEqual(jumped[0][1], 'auto', 'no smooth scrolling with animations off');
  openPanel.shadowRoot.querySelector = realQuery1;
  assert.strictEqual(calls.filter((call) => call[1] === 'add_symptom').length, 1, 'only the pill chip logs');

  // sticky header, print button and print stylesheet
  assert.ok(/\.toolbar \{[^}]*position: sticky; top: 0;/.test(source), 'header is sticky');
  assert.ok(source.includes('.page.editing .toolbar { position: static; }'), 'edit mode: the edit bar is the sticky one');
  assert.ok(source.includes('data-action="print"') && source.includes('window.print()'), 'print button');
  const printCss = source.slice(source.indexOf('@media print {'), source.indexOf('.card h2 {\n            margin: 0;'));
  assert.ok(printCss.includes('.toolbar button') && printCss.includes('.today-open') && printCss.includes('.edit-bar') && printCss.includes('break-inside: avoid') && printCss.includes('.mc-modal-backdrop'), 'print hides the controls and keeps cards whole');
  const printButton = new ClickTarget({ action: 'print' });
  let printed = 0;
  global.window.print = () => { printed += 1; };
  featPanel._handleClick({ target: printButton });
  assert.strictEqual(printed, 1, 'print button opens the print dialog');
  delete global.window.print;

  console.log('All extended dashboard edit mode tests passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
