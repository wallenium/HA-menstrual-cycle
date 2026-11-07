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
  dashboard_todo_temp: 'Take temperature',
  dashboard_todo_lh: 'LH test',
  dashboard_todo_pill: 'Pill taken',
  dashboard_todo_stock: 'Low stock: {products}',
  dashboard_pill_done: 'Pill logged.',
  dashboard_print: 'Print',
  dashboard_views: 'Views',
  dashboard_view_standard: 'Standard',
  dashboard_view_default_name: 'View {n}',
  dashboard_view_new: 'New view',
  dashboard_view_name: 'Name',
  dashboard_view_delete: 'Delete view',
  dashboard_view_hint: 'Hint',
  dashboard_nav_aria: 'Jump to a section',
  dashboard_nav_overview: 'Overview',
  dashboard_nav_history: 'History',
  dashboard_nav_calendar: 'Calendar',
  dashboard_nav_supplies: 'Supplies',
  dashboard_nav_insights: 'Insights',
  dashboard_today: 'Today',
  dashboard_today_open_count: '{count} open',
  dashboard_today_more: 'More',
  dashboard_todo_stock_show: 'Show',
  doctor_report_title: 'Doctor report',
  opt_pill: 'Pill',
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
  const fiveStarts = Array.from({ length: 6 }, (_, i) => isoMonthsBack(0, -28 * (5 - i)));
  const featPanel = await assignHass(new Panel(), makeHass(makeState({ symptom_history: [], grouped_starts: fiveStarts })));
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
  assert.ok(!openPanel._renderTodayCard(openState(), false).includes('today-count'), 'no count badge when nothing is open');
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
  const pillAttrs = { pill_pack: { in_pause: false, today_taken: false } };
  const card = openPanel._renderTodayCard(openState(pillAttrs), false);
  assert.ok(card.includes('class="card today-card"') && card.includes('data-todo="pill"') && card.includes('data-todo="stock"'), 'one card with a row per open item');
  assert.ok(card.includes('2 open'), 'counts what is open');
  assert.ok(/data-action="period-start"/.test(card), 'the period buttons are part of the card');
  assert.ok(!card.includes('data-action="create-doctor-report"'), 'doctor report only behind "More"');
  assert.ok(card.includes('data-action="toggle-today-more" aria-expanded="false"'), 'More button is closed');
  openPanel._handleClick({ target: new ClickTarget({ action: 'toggle-today-more' }) });
  assert.ok(openPanel._renderTodayCard(openState(pillAttrs), false).includes('data-action="create-doctor-report"'), 'More opens the doctor report');
  assert.ok(openPanel._renderTodayCard(openState(pillAttrs), false).includes('aria-expanded="true"'));
  openPanel._handleClick({ target: new ClickTarget({ action: 'toggle-today-more' }) });
  assert.ok(!openPanel._renderTodayCard(openState(pillAttrs), false).includes('create-doctor-report'), 'and closes it again');
  const takenCard = openPanel._renderTodayCard(openState({ pill_pack: { in_pause: false, today_taken: true } }), false);
  assert.ok(takenCard.includes('today-row done') && !takenCard.includes('data-todo="pill"'), 'taken pill: check mark, no button');
  assert.ok(!openPanel._renderTodayCard(openState({ pill_pack: { in_pause: true, today_taken: false } }), false).includes('opt_pill') && !openPanel._renderTodayCard(openState({ pill_pack: { in_pause: true, today_taken: false } }), false).includes('>Pill<'), 'no pill row on a pause day');
  assert.strictEqual(openPanel._renderTodayCard(openState(pillAttrs), true), '', 'nothing in discreet mode');
  assert.strictEqual(openPanel._renderTodayCard(null, false), '');
  const lhDone = openPanel._renderTodayCard(openState({ ...fertile, symptom_history: [{ date: isoToday, test: ['negative_ovulation'] }] }), false);
  assert.ok(/today-row done" role="group" aria-label="LH/.test(lhDone) || lhDone.includes('today-row done'), 'LH test of today gets a check mark');
  assert.ok(!card.includes('data-action="lh-test"'), 'no LH row outside the fertile window');
  openPanel._prefs.widgetVisibility.inventory_card = false;
  assert.ok(!openPanel._renderTodayCard(openState(), false).includes('data-todo="stock"') && openPanel._renderTodayCard(openState(), false).includes('Low stock'), 'stock row is only text when the inventory widget is hidden');
  openPanel._prefs.widgetVisibility.inventory_card = true;
  openPanel._prefs.discreetMode = false;
  openPanel.render();
  assert.ok(openPanel.shadowRoot.innerHTML.includes('class="card today-card"'), 'card on the page');
  openPanel._editMode = true;
  openPanel.render();
  assert.ok(!openPanel.shadowRoot.innerHTML.includes('class="card today-card"'), 'no card while editing');
  openPanel._editMode = false;
  openPanel._todayMore = false;
  openPanel._handleClick({ target: new ClickTarget({ action: 'create-doctor-report' }) });
  assert.strictEqual(openPanel._todayMore, true, 'making a report opens "More", so the links are in view');
  openPanel._todayMore = false;
  const tempDone = openPanel._renderTodayCard(openState({ symptom_history: [{ date: isoToday, basal_temp: 36.5 }] }), false);
  assert.ok(/today-row done" role="group" aria-label="[^"]*">\s*<span class="today-label">[^<]*<\/span>\s*<input type="text" inputmode="decimal"/.test(tempDone), 'temperature of today gets a check mark');
  const tempOpen = openPanel._renderTodayCard(openState({ symptom_history: [{ date: yesterday, basal_temp: 36.5 }] }), false);
  assert.ok(!/today-row done" role="group" aria-label="[^"]*">\s*<span class="today-label">[^<]*<\/span>\s*<input type="text" inputmode="decimal"/.test(tempOpen), 'not before it is logged');

  // the pill button logs the intake right away
  const calls = [];
  openPanel._hass.callService = async (domain, service, data) => { calls.push([domain, service, data]); };
  openPanel._hass.states[openPanel._selectedEntityId] = openState({ pill_pack: { in_pause: false, today_taken: false } });
  openPanel._handleClick({ target: new ClickTarget({ action: 'todo', todo: 'pill' }) });
  await flushPromises();
  assert.deepStrictEqual(calls[0].slice(0, 2), ['menstruation_cycle', 'add_symptom']);
  assert.strictEqual(calls[0][2].symptom_data.contraception_method, 'pill');
  assert.strictEqual(calls[0][2].date, isoToday);
  assert.strictEqual(openPanel._message, 'Pill logged.');
  // the stock button scrolls to the inventory card, without logging anything
  const jumped = [];
  const fake = { scrollIntoView: (o) => jumped.push(o.behavior) };
  const realQuery1 = openPanel.shadowRoot.querySelector;
  openPanel.shadowRoot.querySelector = (selector) => (selector.includes('inventory-card') ? fake : null);
  openPanel._openTodo('stock');
  assert.deepStrictEqual(jumped, ['smooth']);
  openPanel._prefs.animations = false;
  openPanel._openTodo('stock');
  assert.strictEqual(jumped[1], 'auto', 'no smooth scrolling with animations off');
  openPanel._openTodo('temp');
  assert.strictEqual(jumped.length, 2, 'other keys scroll nowhere');
  openPanel.shadowRoot.querySelector = realQuery1;
  assert.strictEqual(calls.filter((call) => call[1] === 'add_symptom').length, 1, 'only the pill chip logs');

  // sticky header, print button and print stylesheet
  assert.ok(/\.toolbar \{[^}]*position: sticky; top: 0;/.test(source), 'header is sticky');
  assert.ok(source.includes('.page.editing .toolbar { position: static; }'), 'edit mode: the edit bar is the sticky one');
  assert.ok(source.includes('data-action="print"') && source.includes('window.print()'), 'print button');
  const printCss = source.slice(source.indexOf('@media print {'), source.indexOf('.card h2 {\n            margin: 0;'));
  assert.ok(printCss.includes('.toolbar button') && printCss.includes('.today-card') && printCss.includes('.edit-bar') && printCss.includes('break-inside: avoid') && printCss.includes('.mc-modal-backdrop'), 'print hides the controls and keeps cards whole');
  const printButton = new ClickTarget({ action: 'print' });
  let printed = 0;
  global.window.print = () => { printed += 1; };
  featPanel._handleClick({ target: printButton });
  assert.strictEqual(printed, 1, 'print button opens the print dialog');
  delete global.window.print;

  // ---- Compact empty cards, jump bar, phone bar ----
  const emptyPanel = await assignHass(new Panel(), makeHass(makeState({ symptom_history: [], grouped_starts: [] })));
  emptyPanel._prefs.widgetVisibility.cycle_history = true;
  const emptyState = emptyPanel._hass.states[emptyPanel._selectedEntityId];
  let emptyHtml = emptyPanel._renderWidget('cycle_history', emptyState, false);
  assert.ok(/class="card [^"]*is-empty/.test(emptyHtml) && !emptyHtml.includes('widget-collapse'), 'a card with only a note shrinks and has nothing to fold');
  emptyPanel._editMode = true;
  assert.ok(!emptyPanel._renderWidget('cycle_history', emptyState, false).includes('is-empty'), 'edit mode shows every card at its real size');
  emptyPanel._editMode = false;
  const fullHtml = emptyPanel._renderWidget('cycle_history', makeState({ grouped_starts: fiveStarts }), false);
  assert.ok(!fullHtml.includes('is-empty') && fullHtml.includes('widget-collapse'), 'a card with data is a normal card');

  // jump bar: group chips for what is shown; a tap scrolls to the first visible card of the group
  const navPanel = await assignHass(new Panel(), makeHass(makeState({ symptom_history: [], grouped_starts: fiveStarts })));
  assert.strictEqual(navPanel._renderJumpNav(['kpi_strip', 'calendar_card']), '', 'fewer than three groups: no bar');
  const navHtml = navPanel._renderJumpNav(['kpi_strip', 'cycle_history', 'calendar_card', 'inventory_card']);
  assert.ok(navHtml.includes('data-group="overview"') && navHtml.includes('data-group="history"') && navHtml.includes('data-group="calendar"') && navHtml.includes('data-group="supplies"') && !navHtml.includes('data-group="insights"'), 'only groups with a shown card');
  assert.ok(navPanel._renderJumpNav(['week_ahead', 'cycle_history', 'calendar_card', 'inventory_card']).includes('data-group="overview"'), 'the 7-day card alone keeps the overview chip');
  assert.ok(navPanel._renderJumpNav(['history_search', 'week_ahead', 'calendar_card', 'inventory_card']).includes('data-group="history"'), 'history search belongs to the history chip');
  const scrolls = [];
  const realQA = navPanel.shadowRoot.querySelectorAll;
  const mkCard = (id) => ({ dataset: { card: id }, scrollIntoView: (o) => scrolls.push([id, o.block, o.behavior]) });
  navPanel.shadowRoot.querySelectorAll = () => [mkCard('kpi_strip'), mkCard('timer_card'), mkCard('inventory_card'), mkCard('calendar_card')];
  navPanel._handleClick({ target: new ClickTarget({ action: 'jump', group: 'supplies' }) });
  assert.deepStrictEqual(scrolls, [['timer_card', 'start', 'smooth']], 'first card of the group in page order');
  navPanel._prefs.animations = false;
  navPanel._handleClick({ target: new ClickTarget({ action: 'jump', group: 'calendar' }) });
  assert.deepStrictEqual(scrolls[1], ['calendar_card', 'start', 'auto'], 'no smooth scrolling with animations off');
  scrolls.pop();
  navPanel._prefs.animations = true;
  navPanel._handleClick({ target: new ClickTarget({ action: 'jump', group: 'nonsense' }) });
  assert.strictEqual(scrolls.length, 1, 'unknown group does nothing');
  navPanel.shadowRoot.querySelectorAll = realQA;
  navPanel._prefs.widgetVisibility.cycle_history = true;
  navPanel.render();
  const navPage = navPanel.shadowRoot.innerHTML;
  assert.ok(navPage.includes('class="jump-nav"') && navPage.indexOf('class="jump-nav"') < navPage.indexOf('</header>'), 'bar sits inside the sticky header');
  assert.ok(/<article data-card="cycle_history" class="card/.test(navPage), 'cards carry their id for the jump');
  navPanel._editMode = true;
  navPanel.render();
  assert.ok(!navPanel.shadowRoot.innerHTML.includes('class="jump-nav"') && !navPanel.shadowRoot.innerHTML.includes('data-card='), 'no bar while editing');
  navPanel._editMode = false;
  navPanel.render();
  assert.ok(navPanel.shadowRoot.innerHTML.includes('class="mobile-bar"') && navPanel.shadowRoot.innerHTML.includes('class="mobile-bar"><button type="button" data-action="open-quick-log"'), 'phone bar with Log today');
  assert.ok(/@media \(max-width: 700px\) \{[^@]*\.mobile-bar \{\s*display: flex; position: fixed;/.test(source), 'the bar is only shown on narrow screens');
  navPanel._editMode = true;
  navPanel.render();
  assert.ok(!navPanel.shadowRoot.innerHTML.includes('class="mobile-bar"'), 'no phone bar while editing');
  navPanel._editMode = false;

  // ---- Views ----
  const viewPanel = await assignHass(new Panel(), makeHass(makeState({ symptom_history: [], grouped_starts: fiveStarts })));
  viewPanel._prefs.discreetMode = false;
  const click = (action, data = {}) => viewPanel._handleClick({ target: new ClickTarget({ action, ...data }) });
  const storedPrefs = () => JSON.parse(storage.get(viewPanel._storageKey(viewPanel._activeProfile)));
  const names = (prefs) => viewPanel._viewsOf(prefs).map((view) => view.name);
  assert.deepStrictEqual(names(viewPanel._prefs), ['Standard'], 'one implicit view to begin with');
  assert.strictEqual(viewPanel._renderViewSwitch(), '', 'a single view shows no switcher');

  // normalising stored views
  const preset = viewPanel._preset('general');
  const norm = viewPanel._normalizePrefs({
    activeView: 'ghost',
    views: [
      { id: 'a', name: '  Daily  ', layout: { widgetVisibility: { cycle_history: false }, widgetOrder: ['calendar_card', 'nonsense'], widgetSpan: { calendar_card: 8, kpi_strip: 99 }, widgetCollapsed: { calendar_card: true, nonsense: true } } },
      { id: 'a', name: 'Duplicate id' },
      { id: 'bad id!', name: 'Bad id' },
      { id: 'noname', name: '   ' },
      { id: 'b', name: 'x'.repeat(50) },
      { name: 'No id' },
    ],
  }, 'alice', 'general');
  assert.deepStrictEqual(norm.views.map((view) => view.id), ['a', 'b'], 'invalid, nameless and duplicate views are dropped');
  assert.strictEqual(norm.views[0].name, 'Daily', 'names are trimmed');
  assert.strictEqual(norm.views[1].name.length, 30, 'and cut to 30 characters');
  assert.strictEqual(norm.activeView, 'a', 'unknown active view: the first one');
  assert.strictEqual(norm.views[0].layout.widgetVisibility.cycle_history, false);
  assert.strictEqual(norm.views[0].layout.widgetOrder[0], 'calendar_card');
  assert.ok(!norm.views[0].layout.widgetOrder.includes('nonsense') && norm.views[0].layout.widgetOrder.length === viewPanel._normalizePrefs({}, 'alice', 'general').widgetOrder.length, 'order of a view is completed with the missing cards');
  assert.deepStrictEqual(norm.views[0].layout.widgetSpan, { calendar_card: 8 });
  assert.deepStrictEqual(norm.views[0].layout.widgetCollapsed, { calendar_card: true });
  assert.deepStrictEqual(norm.views[1].layout.widgetVisibility, preset.widgetVisibility, 'a view without a layout shows the preset');
  assert.strictEqual(viewPanel._normalizePrefs({ views: Array.from({ length: 20 }, (_, i) => ({ id: `v${i}`, name: `V${i}` })) }, 'alice', 'general').views.length, 8, 'at most eight views');
  assert.deepStrictEqual([viewPanel._normalizePrefs({}, 'alice', 'general').views, viewPanel._normalizePrefs({}, 'alice', 'general').activeView], [[], null], 'no views: none, nothing active');
  assert.strictEqual(viewPanel._normalizePrefs({ views: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], activeView: 'b' }, 'alice', 'general').activeView, 'b');

  // creating views happens in the edit mode and works on the draft
  click('view-add');
  assert.strictEqual(viewPanel._prefs.views.length, 0, 'outside the edit mode nothing is added');
  click('toggle-edit');
  click('view-add');
  assert.deepStrictEqual(names(viewPanel._editDraft), ['Standard', 'View 2'], 'the first new view turns the implicit one into a real one');
  const newId = viewPanel._editDraft.activeView;
  assert.notStrictEqual(newId, 'default');
  assert.deepStrictEqual(viewPanel._editDraft.widgetVisibility, viewPanel._prefs.widgetVisibility, 'a new view starts as a copy of the current one');
  assert.ok(viewPanel.shadowRoot.innerHTML.includes('data-action="view-switch"') && viewPanel.shadowRoot.innerHTML.includes('data-action="view-add"') && viewPanel.shadowRoot.innerHTML.includes('data-pref="viewName"'), 'edit panel offers switching, adding and renaming');
  // change the new view: hide a card, fold another, widen a third
  const hadDonut = viewPanel._editDraft.widgetVisibility.phase_donut;
  click('widget-hide', { widget: 'phase_donut' });
  viewPanel._editDraft.widgetCollapsed.cycle_history = true;
  viewPanel._setWidgetSpan('cycle_history', 9);
  click('view-switch', { view: 'default' });
  assert.strictEqual(viewPanel._editDraft.activeView, 'default');
  assert.strictEqual(viewPanel._editDraft.widgetVisibility.phase_donut, hadDonut, 'the first view did not change');
  assert.ok(!viewPanel._editDraft.widgetCollapsed.cycle_history && viewPanel._widgetSpan('cycle_history') !== 9, 'neither did its folding and widths');
  click('view-switch', { view: newId });
  assert.strictEqual(viewPanel._editDraft.widgetVisibility.phase_donut, false, 'switching back brings the changes of the new view');
  assert.ok(viewPanel._editDraft.widgetCollapsed.cycle_history && viewPanel._widgetSpan('cycle_history') === 9);
  click('view-switch', { view: 'ghost' });
  assert.strictEqual(viewPanel._editDraft.activeView, newId, 'unknown view: nothing happens');

  // rename
  const nameInput = new ClickTarget({ pref: 'viewName', view: newId });
  nameInput.value = '  Doctor visit  ';
  viewPanel._handleChange({ target: nameInput });
  assert.strictEqual(viewPanel._editDraft.views.find((view) => view.id === newId).name, 'Doctor visit', 'rename is trimmed');
  nameInput.value = '   ';
  viewPanel._handleChange({ target: nameInput });
  assert.strictEqual(viewPanel._editDraft.views.find((view) => view.id === newId).name, 'Doctor visit', 'an empty name is ignored');
  nameInput.value = 'y'.repeat(60);
  viewPanel._handleChange({ target: nameInput });
  assert.strictEqual(viewPanel._editDraft.views.find((view) => view.id === newId).name.length, 30);
  nameInput.value = 'Doctor visit';
  viewPanel._handleChange({ target: nameInput });

  // cancel throws everything away, save keeps it
  click('cancel-edit');
  assert.strictEqual(viewPanel._prefs.views.length, 0, 'cancel: no views');
  click('toggle-edit');
  click('view-add');
  const keptId = viewPanel._editDraft.activeView;
  click('widget-hide', { widget: 'phase_donut' });
  click('save-edit');
  assert.strictEqual(viewPanel._prefs.activeView, keptId);
  assert.strictEqual(storedPrefs().views.length, 2, 'views are saved with the prefs');
  assert.strictEqual(storedPrefs().activeView, keptId);
  assert.strictEqual(viewPanel._prefs.widgetVisibility.phase_donut, false, 'the saved layout is the one of the active view');

  // switching outside the edit mode: switcher in the header, layout swaps, choice is saved, opening animation plays again
  viewPanel.render();
  const switchHtml = viewPanel._renderViewSwitch();
  assert.ok(switchHtml.includes('class="view-switch"') && switchHtml.includes(`data-view="${keptId}" aria-pressed="true"`) && switchHtml.includes('data-view="default" aria-pressed="false"'), 'switcher marks the active view');
  assert.ok(/<div class="subnav"><div class="view-switch"/.test(viewPanel.shadowRoot.innerHTML) && viewPanel.shadowRoot.innerHTML.indexOf('class="view-switch"') < viewPanel.shadowRoot.innerHTML.indexOf('</header>'), 'switcher sits in the sticky header');
  assert.ok(!viewPanel.shadowRoot.innerHTML.includes('data-card="phase_donut"'), 'donut hidden in this view');
  viewPanel._enterPlayed = true;
  click('view-switch', { view: 'default' });
  assert.strictEqual(viewPanel._prefs.activeView, 'default');
  assert.strictEqual(storedPrefs().activeView, 'default', 'saved');
  assert.ok(viewPanel.shadowRoot.innerHTML.includes('class="grid mc-enter"'), 'plays the opening animation again');
  assert.ok(viewPanel.shadowRoot.innerHTML.includes('data-card="phase_donut"'), 'donut shown in the first view');
  assert.strictEqual(viewPanel._prefs.widgetVisibility.phase_donut, hadDonut);
  // folding belongs to the view too
  click('widget-collapse', { widget: 'cycle_history' });
  assert.ok(viewPanel._prefs.widgetCollapsed.cycle_history);
  click('view-switch', { view: keptId });
  assert.ok(!viewPanel._prefs.widgetCollapsed.cycle_history, 'folded in one view, open in the other');
  click('view-switch', { view: 'default' });
  assert.ok(viewPanel._prefs.widgetCollapsed.cycle_history, 'and still folded when coming back');

  // reload: what is stored gives the same views
  const reloaded = viewPanel._loadPrefs(viewPanel._activeProfile, 'general');
  assert.deepStrictEqual(reloaded.views.map((view) => view.id), ['default', keptId]);
  assert.strictEqual(reloaded.activeView, 'default');
  assert.ok(reloaded.widgetCollapsed.cycle_history);

  // reset to preset only resets the layout of the current view
  click('toggle-edit');
  click('reset-preset');
  assert.deepStrictEqual(viewPanel._editDraft.views.map((view) => view.id), ['default', keptId], 'views survive the reset (edit mode)');
  assert.strictEqual(viewPanel._editDraft.activeView, 'default');
  assert.ok(!viewPanel._editDraft.widgetCollapsed.cycle_history, 'layout is back to the preset');
  click('cancel-edit');
  click('reset-preset');
  assert.deepStrictEqual(viewPanel._prefs.views.map((view) => view.id), ['default', keptId], 'views survive the reset');
  assert.strictEqual(viewPanel._prefs.activeView, 'default');

  // delete: the active one goes, the next one is loaded; the last view cannot be deleted; a ninth cannot be added
  click('toggle-edit');
  click('view-switch', { view: keptId });
  click('view-delete', { view: keptId });
  assert.deepStrictEqual(viewPanel._editDraft.views.map((view) => view.id), ['default']);
  assert.strictEqual(viewPanel._editDraft.activeView, 'default');
  assert.ok(viewPanel._editDraft.widgetVisibility.phase_donut !== undefined && !viewPanel.shadowRoot.innerHTML.includes('data-action="view-delete"'), 'no delete button for the last view');
  click('view-delete', { view: 'default' });
  assert.strictEqual(viewPanel._editDraft.views.length, 1, 'the last view stays');
  for (let i = 0; i < 12; i += 1) click('view-add');
  assert.strictEqual(viewPanel._editDraft.views.length, 8, 'at most eight views');
  assert.ok(!viewPanel.shadowRoot.innerHTML.includes('data-action="view-add"'), 'no add button at eight');
  assert.strictEqual(viewPanel._addViewIn(viewPanel._editDraft), null);
  // deleting a view that is not active keeps the active layout
  const spare = viewPanel._editDraft.views[3].id;
  const keepActive = viewPanel._editDraft.activeView;
  click('view-delete', { view: spare });
  assert.strictEqual(viewPanel._editDraft.activeView, keepActive);
  assert.strictEqual(viewPanel._editDraft.views.length, 7);
  click('cancel-edit');
  // a view that was changed and then left behind keeps its changes when another view is added
  click('toggle-edit');
  assert.ok(!viewPanel.shadowRoot.innerHTML.includes('class="view-switch"'), 'the switcher in the header is for the normal view, the edit panel has its own');
  click('view-switch', { view: 'default' });
  click('widget-show', { widget: 'phase_donut' });
  click('widget-hide', { widget: 'phase_donut' });
  assert.strictEqual(viewPanel._editDraft.widgetVisibility.phase_donut, false);
  click('view-add');
  click('view-switch', { view: 'default' });
  assert.strictEqual(viewPanel._editDraft.widgetVisibility.phase_donut, false, 'the earlier change of the first view is still there after adding another view');
  const outsideName = new ClickTarget({ pref: 'viewName', view: 'default' });
  outsideName.value = 'Nope';
  click('cancel-edit');
  viewPanel._handleChange({ target: outsideName });
  assert.ok(!viewPanel._prefs.views.some((view) => view.name === 'Nope'), 'renaming only works while editing');

  // the views also work in discreet mode
  viewPanel._prefs.discreetMode = true;
  viewPanel.render();
  assert.ok(viewPanel.shadowRoot.innerHTML.includes('class="view-switch"'));


  const freshPanel = () => { storage.clear(); return assignHass(new Panel(), makeHass(makeState({ symptom_history: [], grouped_starts: fiveStarts }))); };
  // ---- Look: theme and accent colour ----
  const look = await freshPanel();
  look._prefs.discreetMode = false;
  const lookClick = (action, data = {}) => look._handleClick({ target: new ClickTarget({ action, ...data }) });
  const attrs = {};
  look.setAttribute = (k, v) => { attrs[k] = v; };
  look.removeAttribute = (k) => { delete attrs[k]; };
  const cssVars = {};
  look.style = { setProperty: (k, v) => { cssVars[k] = v; }, removeProperty: (k) => { delete cssVars[k]; } };
  assert.deepStrictEqual([look._prefs.theme, look._prefs.accent], ['auto', 'rose'], 'default: like Home Assistant, rose');
  assert.deepStrictEqual([look._normalizePrefs({ theme: 'neon', accent: 'pink' }, 'a', 'general').theme, look._normalizePrefs({ theme: 'neon', accent: 'pink' }, 'a', 'general').accent], ['auto', 'rose'], 'unknown values fall back');
  lookClick('theme-cycle');
  assert.strictEqual(look._prefs.theme, 'light');
  assert.strictEqual(attrs['data-theme'], 'light', 'the panel carries the theme');
  lookClick('theme-cycle');
  assert.strictEqual(attrs['data-theme'], 'dark');
  assert.strictEqual(JSON.parse(storage.get(look._storageKey(look._activeProfile))).theme, 'dark', 'saved');
  lookClick('theme-cycle');
  assert.ok(!('data-theme' in attrs), 'auto removes the attribute again');
  lookClick('accent', { accent: 'sage' });
  assert.strictEqual(look._prefs.accent, 'sage');
  assert.strictEqual(cssVars['--mc-accent'], '#5E8C6A', 'the accent colour reaches the panel');
  lookClick('accent', { accent: 'rose' });
  assert.ok(!('--mc-accent' in cssVars), 'rose is the built-in colour: nothing set');
  lookClick('accent', { accent: 'hotpink' });
  assert.strictEqual(look._prefs.accent, 'rose', 'unknown accent ignored');
  lookClick('toggle-edit');
  assert.ok(look.shadowRoot.innerHTML.includes('data-pref="theme"') && look.shadowRoot.innerHTML.includes('data-action="accent" data-accent="plum"'), 'edit mode offers theme and accent');
  look._handleChange({ target: Object.assign(new ClickTarget({ pref: 'theme' }), { tagName: 'SELECT', value: 'dark' }) });
  assert.strictEqual(look._editDraft.theme, 'dark');
  assert.strictEqual(look._prefs.theme, 'auto', 'the draft is not saved yet');
  assert.strictEqual(attrs['data-theme'], 'dark', 'but it shows at once');
  lookClick('cancel-edit');
  assert.ok(!('data-theme' in attrs), 'cancel puts the look back');
  lookClick('toggle-edit');
  lookClick('reset-preset');
  lookClick('save-edit');
  lookClick('accent', { accent: 'blue' });
  lookClick('toggle-edit');
  lookClick('reset-preset');
  assert.strictEqual(look._editDraft.accent, 'blue', 'reset to the preset keeps the look');
  lookClick('cancel-edit');

  // ---- Views as text ----
  const codes = await freshPanel();
  codes._prefs.discreetMode = false;
  const codeClick = (action, data = {}) => codes._handleClick({ target: new ClickTarget({ action, ...data }) });
  codeClick('toggle-edit');
  codes._editDraft.widgetVisibility.cycle_history = false;
  codes._editDraft.widgetCollapsed.calendar_card = true;
  codeClick('view-export');
  const code = codes._viewCodeText;
  assert.ok(code.startsWith('MCV1:'), 'the code names its format');
  assert.ok(codes.shadowRoot.innerHTML.includes(code), 'and is shown in the field for manual copying');
  codes.shadowRoot.querySelector = (sel) => (sel.includes('viewCode') ? { value: code } : null);
  codeClick('view-import');
  assert.deepStrictEqual(codes._viewsOf(codes._editDraft).map((view) => view.name), ['Standard', 'Standard'], 'import adds a view with the exported name');
  assert.strictEqual(codes._editDraft.widgetVisibility.cycle_history, false, 'and shows it with the exported cards');
  assert.strictEqual(codes._editDraft.widgetCollapsed.calendar_card, true);
  for (const bad of ['', 'hello', 'MCV1:@@@', `MCV1:${Buffer.from('[1]').toString('base64')}`, `MCV1:${Buffer.from('{"l":5}').toString('base64')}`]) {
    assert.strictEqual(codes._importViewCode(codes._editDraft, bad), 'error', `rejects ${bad}`);
  }
  assert.strictEqual(codes._viewsOf(codes._editDraft).length, 2, 'bad codes add nothing');
  assert.strictEqual(codes._importViewCode(codes._editDraft, `XXXXX${Buffer.from(JSON.stringify({ n: 'x', l: {} })).toString('base64')}`), 'error', 'the format prefix is required');
  const evil = `MCV1:${Buffer.from(JSON.stringify({ n: 'x'.repeat(80), l: { widgetVisibility: { nonsense: true, kpi_strip: false }, widgetSpan: { calendar_card: 99 } } })).toString('base64')}`;
  assert.strictEqual(codes._importViewCode(codes._editDraft, evil), 'x'.repeat(30), 'name cut to 30 characters');
  assert.ok(!('nonsense' in codes._editDraft.widgetVisibility), 'unknown cards are dropped');
  assert.strictEqual(codes._editDraft.widgetVisibility.kpi_strip, false, 'known ones are taken over');
  assert.deepStrictEqual(codes._editDraft.widgetSpan, {}, 'invalid widths are dropped');
  while (codes._viewsOf(codes._editDraft).length < 8) codes._addViewIn(codes._editDraft);
  assert.strictEqual(codes._importViewCode(codes._editDraft, code), 'full', 'no ninth view');

  // ---- Swipe and pull ----
  const swipe = await freshPanel();
  swipe._prefs.discreetMode = false;
  swipe._ensureViews(swipe._prefs);
  swipe._addViewIn(swipe._prefs, 'Second');
  swipe._switchViewIn(swipe._prefs, 'default');
  const touch = (x, y) => ({ touches: [{ clientX: x, clientY: y }], changedTouches: [{ clientX: x, clientY: y }], composedPath: () => [] });
  const swipeBy = (dx, dy, path = [], ms = 0) => {
    const start = { ...touch(200, 300), composedPath: () => path };
    swipe._swipeStart(start);
    if (swipe._swipe) swipe._swipe.time -= ms;
    swipe._swipeEnd(touch(200 + dx, 300 + dy));
  };
  const activeName = () => swipe._viewsOf(swipe._prefs).find((view) => view.id === swipe._activeViewId(swipe._prefs)).name;
  assert.strictEqual(activeName(), 'Standard');
  swipeBy(-120, 10);
  assert.strictEqual(activeName(), 'Second', 'swipe left: next view');
  swipeBy(-120, 10);
  assert.strictEqual(activeName(), 'Second', 'no wrapping around');
  swipeBy(120, 10);
  assert.strictEqual(activeName(), 'Standard', 'swipe right: previous view');
  swipeBy(40, 0);
  assert.strictEqual(activeName(), 'Standard', 'too short');
  swipeBy(-120, 90);
  assert.strictEqual(activeName(), 'Standard', 'mostly vertical: no switch');
  swipeBy(-120, 10, [], 2000);
  assert.strictEqual(activeName(), 'Standard', 'a slow drag is no swipe');
  swipeBy(-120, 10, [{ nodeType: 1, tagName: 'INPUT' }]);
  assert.strictEqual(activeName(), 'Standard', 'not while using a field');
  swipeBy(-120, 10, [{ nodeType: 1, tagName: 'DIV', scrollWidth: 900, clientWidth: 300 }]);
  assert.strictEqual(activeName(), 'Second', 'a node that does not scroll sideways does not block (no computed style here)');
  swipeBy(120, 10);
  const months = [];
  const calendar = { nodeType: 1, localName: 'menstruation-calendar-card', _changeMonth: (n) => months.push(n), _render: () => months.push('r') };
  swipeBy(-120, 10, [calendar]);
  swipeBy(120, 10, [calendar]);
  assert.deepStrictEqual(months, [1, 'r', -1, 'r'], 'over the calendar a swipe changes the month, not the view');
  assert.strictEqual(activeName(), 'Standard');
  swipeBy(-120, 10, [{ nodeType: 1, localName: 'menstruation-calendar-card', _modalIso: '2026-07-05', _changeMonth: () => months.push('bad') }]);
  assert.strictEqual(months.length, 4, 'not while the day dialog is open');
  let steps = 0;
  const stepOrig = swipe._goToView.bind(swipe);
  swipe._goToView = (id) => { steps += 1; stepOrig(id); };
  swipe._editMode = true;
  swipeBy(-120, 10);
  swipe._editMode = false;
  swipe._wizard = { step: 1 };
  swipeBy(-120, 10);
  swipe._wizard = null;
  assert.strictEqual(steps, 0, 'not in the edit mode, not while the assistant is open');
  swipeBy(-120, 10);
  swipeBy(120, 10);
  assert.strictEqual(steps, 2, 'but otherwise (the counter works)');
  swipe._fullHistoryCache = { alice: { stamp: 'x' } };
  swipeBy(100, 120);
  assert.deepStrictEqual(swipe._fullHistoryCache, { alice: { stamp: 'x' } }, 'a diagonal pull does not refresh');
  swipe._fullHistoryCache = { alice: { stamp: 'x' } };
  swipeBy(0, 120);
  assert.deepStrictEqual(swipe._fullHistoryCache, {}, 'pulling down at the top loads everything again');
  assert.strictEqual(swipe._message, 'dashboard_refreshed');
  swipe._fullHistoryCache = { alice: { stamp: 'x' } };
  swipe._topY = 1000; // the panel is scrolled down
  swipeBy(0, 120);
  assert.deepStrictEqual(swipe._fullHistoryCache, { alice: { stamp: 'x' } }, 'no refresh when not at the top');

  // ---- Setup assistant ----
  const wiz = await freshPanel();
  const wizClick = (action, data = {}) => wiz._handleClick({ target: new ClickTarget({ action, ...data }) });
  assert.strictEqual(wiz._prefs.onboarded, false, 'no saved settings: not set up yet');
  assert.ok(!wiz.shadowRoot.innerHTML.includes('class="mc-modal wizard"'), 'the assistant waits for the answer of the server');
  assert.strictEqual(wiz._normalizePrefs({ widgetVisibility: {} }, 'a', 'general').onboarded, true, 'existing settings: never shown');
  assert.strictEqual(wiz._normalizePrefs({ onboarded: false }, 'a', 'general').onboarded, false);
  wiz._maybeStartWizard('other');
  assert.strictEqual(wiz._wizard, null, 'only for the shown profile');
  wiz._maybeStartWizard(wiz._activeProfile);
  const wizHtml = () => wiz.shadowRoot.innerHTML;
  assert.ok(wizHtml().includes('class="mc-modal wizard"') && wizHtml().includes('data-pref="theme"') && wizHtml().includes('data-pref="discreetMode"'), 'step 1: look');
  assert.ok(wizHtml().includes('dashboard_wizard_step') || wizHtml().includes('Step'), 'shows the step');
  wizClick('accent', { accent: 'plum' });
  assert.strictEqual(wiz._prefs.accent, 'plum', 'step 1 acts on the saved settings');
  wizClick('wizard-next');
  assert.ok(wizHtml().includes('data-cards="compact"') && wizHtml().includes('data-cards="all"') && !wizHtml().includes('data-pref="theme"'), 'step 2: cards');
  wizClick('wizard-cards', { cards: 'compact' });
  const shownNow = Object.entries(wiz._prefs.widgetVisibility).filter(([, on]) => on).map(([id]) => id).sort();
  assert.deepStrictEqual(shownNow, ['calendar_card', 'kpi_strip', 'phase_timeline', 'pill_card', 'product_usage'], 'compact: a handful of cards');
  wizClick('wizard-cards', { cards: 'all' });
  assert.ok(Object.values(wiz._prefs.widgetVisibility).every(Boolean), 'everything');
  wizClick('wizard-cards', { cards: 'standard' });
  const hiddenIds = (vis) => Object.keys(vis).filter((id) => vis[id] === false).sort();
  assert.deepStrictEqual(hiddenIds(wiz._prefs.widgetVisibility), hiddenIds(wiz._preset('general').widgetVisibility), 'standard: hides what the preset of the mode hides');
  wizClick('wizard-back');
  assert.ok(wizHtml().includes('data-pref="theme"'), 'back to step 1');
  wizClick('wizard-next');
  wizClick('wizard-next');
  assert.ok(wizHtml().includes('data-wizard="view-name"') && wizHtml().includes('data-action="wizard-done"') && !wizHtml().includes('data-action="wizard-next"'), 'step 3: view');
  wizClick('wizard-next');
  assert.ok(wizHtml().includes('data-wizard="view-name"'), 'cannot go past the last step');
  wiz.shadowRoot.querySelector = (sel) => (sel.includes('view-name') ? { value: '  On the go ' } : null);
  wizClick('wizard-done');
  assert.strictEqual(wiz._wizard, null);
  assert.strictEqual(wiz._prefs.onboarded, true);
  assert.deepStrictEqual(wiz._viewsOf(wiz._prefs).map((view) => view.name), ['Standard', 'On the go'], 'the named view exists and the first one stays shown');
  assert.strictEqual(wiz._activeViewId(wiz._prefs), 'default');
  const savedWiz = JSON.parse(storage.get(wiz._storageKey(wiz._activeProfile)));
  assert.strictEqual(savedWiz.onboarded, true, 'saved: does not come back');
  assert.strictEqual(savedWiz.accent, 'plum');
  assert.ok(!wizHtml().includes('class="mc-modal wizard"'));
  wiz._maybeStartWizard(wiz._activeProfile);
  assert.strictEqual(wiz._wizard, null, 'once set up, never again by itself');

  // the assistant starts after the server said there are no settings (and not when there are)
  const withServer = async (prefs) => {
    storage.clear();
    const hass = makeHass(makeState({ symptom_history: [], grouped_starts: fiveStarts }));
    hass.connection = { sendMessagePromise: async (msg) => { if (msg.service === 'get_dashboard_prefs') return { response: { prefs } }; throw new Error('not in this test'); } };
    const panel = await assignHass(new Panel(), hass);
    await new Promise((resolve) => setTimeout(resolve, 30));
    return panel;
  };
  const nothingSaved = await withServer(null);
  assert.ok(nothingSaved._wizard && nothingSaved.shadowRoot.innerHTML.includes('class="mc-modal wizard"'), 'no settings on the server: the assistant opens');
  const savedOnServer = await withServer({ discreetMode: false });
  assert.strictEqual(savedOnServer._wizard, null, 'settings on the server: it stays closed');

  const skip = await freshPanel();
  skip._maybeStartWizard(skip._activeProfile);
  skip._handleClick({ target: new ClickTarget({ action: 'wizard-skip' }) });
  assert.strictEqual(skip._prefs.onboarded, true, 'skip ends the assistant for good');
  assert.deepStrictEqual(skip._viewsOf(skip._prefs).map((view) => view.name), ['Standard'], 'and adds no view');
  skip._handleClick({ target: new ClickTarget({ action: 'toggle-edit' }) });
  assert.ok(skip.shadowRoot.innerHTML.includes('data-action="wizard-start"'), 'edit mode can start it again');
  skip._handleClick({ target: new ClickTarget({ action: 'wizard-start' }) });
  assert.ok(skip.shadowRoot.innerHTML.includes('class="mc-modal wizard"'), 'also from the edit mode');
  skip._handleClick({ target: new ClickTarget({ action: 'wizard-skip' }) });
  assert.ok(skip._editMode, 'edit mode is still on');


  // ---- Pain strength in the card "Today" ----
  const dayAt = (n) => isoMonthsBack(0, n);
  const painState = (attrs = {}, state = 'follicular') => ({ ...makeState({ symptom_history: [], ...attrs }), state });
  const painPanel = await freshPanel();
  const painCalls = [];
  painPanel._hass.callService = async (domain, service, data) => { painCalls.push([domain, service, data]); };
  const painRow = (stateObj, discreet = false) => painPanel._renderPainAction(stateObj, discreet);
  const pressed = (html) => [...html.matchAll(/data-value="(\d+)" aria-pressed="true"/g)].map((m) => Number(m[1]));
  assert.strictEqual(painRow(painState({}, 'follicular')), '', 'nothing logged lately and no period: no row');
  assert.strictEqual((painRow(painState({}, 'period')).match(/data-action="pain-set"/g) || []).length, 11, 'during the period: 0 to 10');
  assert.deepStrictEqual(pressed(painRow(painState({}, 'period'))), [], 'none picked yet');
  assert.ok(painRow(painState({ symptom_history: [{ date: dayAt(-5), pain: ['cramps'] }] })), 'pain logged in the last two weeks: offered');
  assert.ok(painRow(painState({ symptom_history: [{ date: dayAt(-5), pain_intensity: 0 }] })), 'a logged strength counts, also 0');
  assert.strictEqual(painRow(painState({ symptom_history: [{ date: dayAt(-30), pain: ['cramps'] }] })), '', 'pain a month ago: no');
  assert.strictEqual(painRow(painState({ symptom_history: [{ date: dayAt(-3), pain: ['none'] }] })), '', '"none" is no pain');
  const withToday = painRow(painState({ symptom_history: [{ date: dayAt(0), pain_intensity: 6 }] }));
  assert.deepStrictEqual(pressed(withToday), [6], "today's strength is marked");
  assert.ok(withToday.includes('today-row done'), 'and the row shows it is done');
  assert.strictEqual(painRow(painState({}, 'period'), true), '', 'not in discreet mode');
  assert.strictEqual(painRow(painState({}, 'pregnant')), '', 'not while pregnant');
  painPanel._prefs.categoryVisibility.pain = false;
  assert.strictEqual(painRow(painState({}, 'period')), '', 'not when the category Pain is hidden');
  painPanel._prefs.categoryVisibility.pain = true;
  painPanel._hass.states[painPanel._selectedEntityId] = painState({ symptom_history: [{ date: dayAt(-1), pain: ['cramps'] }] });
  await painPanel._savePainIntensity(4);
  const painSave = painCalls.find(([, service]) => service === 'add_symptom');
  assert.deepStrictEqual([painSave[2].date, painSave[2].symptom_data], [isoToday, { pain_intensity: 4 }], 'one tap saves the strength for today');
  assert.strictEqual(painSave[2].profile, 'alice');
  assert.deepStrictEqual(painPanel._quickLogUndo.previous, { pain_intensity: null }, 'undo goes back to nothing');
  painCalls.length = 0;
  painPanel._hass.states[painPanel._selectedEntityId] = painState({ symptom_history: [{ date: dayAt(0), pain_intensity: 4 }] });
  await painPanel._savePainIntensity(4);
  assert.deepStrictEqual(painCalls.find(([, service]) => service === 'add_symptom')[2].symptom_data, { pain_intensity: null }, 'the same number again clears it');
  assert.deepStrictEqual(painPanel._quickLogUndo.previous, { pain_intensity: 4 }, 'and undo brings 4 back');
  painCalls.length = 0;
  await painPanel._savePainIntensity(7);
  assert.deepStrictEqual(painCalls.find(([, service]) => service === 'add_symptom')[2].symptom_data, { pain_intensity: 7 }, 'another number replaces it');
  painCalls.length = 0;
  for (const bad of [11, -1, 2.5, NaN]) await painPanel._savePainIntensity(bad);
  assert.strictEqual(painCalls.length, 0, 'nothing outside 0 to 10 or not whole is sent');
  painPanel._handleClick({ target: new ClickTarget({ action: 'pain-set', value: '3' }) });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.strictEqual(painCalls.find(([, service]) => service === 'add_symptom')[2].symptom_data.pain_intensity, 3, 'the button is wired up');
  const todayHtml = painPanel._renderTodayCard(painState({ symptom_history: [{ date: dayAt(-1), basal_temp: 36.4 }, { date: dayAt(0), pain_intensity: 2 }] }), false);
  assert.ok(todayHtml.indexOf('temp-input') < todayHtml.indexOf('pain-set'), 'the pain row sits under the temperature');

  // ---- Pain & Mood trend with strength ----
  const trendPanel = await freshPanel();
  const trendHtml = (history) => trendPanel._renderPainMoodTrend(painState({ symptom_history: history }));
  const withStrength = trendHtml([{ date: dayAt(-3), pain_intensity: 6 }, { date: dayAt(-2), pain: ['cramps'] }, { date: dayAt(-1), pain_intensity: 2 }]);
  assert.ok(withStrength.includes('<title>6/10</title>') && withStrength.includes('<title>2/10</title>'), 'bars carry the strength');
  assert.ok(withStrength.includes('Pain strength'), 'legend names the strength');
  assert.ok(withStrength.includes('dashboard_pain_unrated'), 'a day with pain types but no strength gets a small marker');
  const heightOf = (html, title) => parseFloat(new RegExp(`height="([\\d.]+)"[^>]*><title>${title}</title>`).exec(html)[1]);
  assert.ok(heightOf(withStrength, '6/10') > heightOf(withStrength, '2/10'), 'stronger pain, taller bar');
  const typesOnly = trendHtml([{ date: dayAt(-3), pain: ['cramps', 'headache'] }, { date: dayAt(-2), pain: ['cramps'] }]);
  assert.ok(!typesOnly.includes('/10') && !typesOnly.includes('dashboard_pain_unrated') && typesOnly.includes('Number of pain types'), 'without any strength: the number of pain types as before');

  // ---- Next 7 days ----
  const weekPanel = await freshPanel();
  const weekItems = (attrs = {}, state = 'follicular') => weekPanel._weekAheadItems(painState(attrs, state)).map((item) => `${item.key}:${item.from}`);
  assert.deepStrictEqual(weekItems(), [], 'nothing known, nothing listed');
  assert.deepStrictEqual(weekItems({ period_forecast: { window_start: dayAt(3), window_end: dayAt(5) } }), [`period:${dayAt(3)}`]);
  assert.deepStrictEqual(weekItems({ period_forecast: { window_start: dayAt(8), window_end: dayAt(10) } }), [], 'beyond the week');
  assert.deepStrictEqual(weekItems({ period_forecast: { window_start: dayAt(-1), window_end: dayAt(1) } }), [`period:${dayAt(-1)}`], 'a window that has begun still counts');
  assert.deepStrictEqual(weekItems({ period_forecast: { window_start: dayAt(-4), window_end: dayAt(-2) } }), [], 'a window that is over does not');
  assert.deepStrictEqual(weekItems({ period_forecast: null, next_predicted_start: dayAt(2) }), [`period:${dayAt(2)}`], 'only the predicted date');
  assert.deepStrictEqual(weekItems({ period_forecast: { window_start: dayAt(3), window_end: dayAt(5) } }, 'period'), [], 'not while the period runs');
  assert.deepStrictEqual(weekItems({ fertility_forecast: { fertile_window_start: dayAt(1), fertile_window_end: dayAt(5), ovulation_estimate: dayAt(4) } }), [`fertile:${dayAt(1)}`, `ovulation:${dayAt(4)}`]);
  assert.deepStrictEqual(weekItems({ pill_pack: { active: 21, pause: 7, position: 19, in_pause: false, new_pack: false } }), [`pill_pause:${dayAt(3)}`], 'pill break in three days, the next pack is too far away');
  assert.deepStrictEqual(weekItems({ pill_pack: { active: 21, pause: 7, position: 26, in_pause: true, new_pack: false } }), [`pill_new:${dayAt(3)}`], 'in the break: the new pack');
  assert.deepStrictEqual(weekItems({ pill_pack: { active: 28, pause: 0, position: 27, in_pause: false, new_pack: false } }), [`pill_new:${dayAt(2)}`], 'no break: only the new pack');
  assert.deepStrictEqual(weekItems({ pill_pack: { active: 21, pause: 7, position: 19, in_pause: false, new_pack: true } }), [], 'no pack started: nothing to say');
  assert.deepStrictEqual(weekItems({ contraception_status: { renewal_due_date: dayAt(5) } }), [`renewal:${dayAt(5)}`]);
  assert.deepStrictEqual(weekItems({ contraception_status: { renewal_due_date: dayAt(-2), renewal_reminder_due: true } }), [`renewal:${dayAt(-2)}`], 'overdue and reminded: listed');
  assert.deepStrictEqual(weekItems({ contraception_status: { renewal_due_date: dayAt(-2) } }), [], 'overdue, not reminded: not');
  assert.deepStrictEqual(weekItems({ contraception_status: { renewal_due_date: dayAt(20), renewal_reminder_due: true } }), [], 'too far');
  assert.deepStrictEqual(weekItems({
    contraception_status: { renewal_due_date: dayAt(6) },
    fertility_forecast: { ovulation_estimate: dayAt(1) },
    period_forecast: { window_start: dayAt(3), window_end: dayAt(4) },
  }), [`ovulation:${dayAt(1)}`, `period:${dayAt(3)}`, `renewal:${dayAt(6)}`], 'sorted by day');
  const weekHtml = weekPanel._renderWeekAhead(painState({ fertility_forecast: { ovulation_estimate: dayAt(0) }, period_forecast: { window_start: dayAt(3), window_end: dayAt(5) } }));
  assert.ok(weekHtml.includes('dashboard_week_ovulation') && weekHtml.includes('dashboard_week_period'), 'each with its label');
  assert.ok(weekHtml.includes('today') && weekHtml.includes('in 3 days'), 'and when, in words');
  assert.ok(weekHtml.includes('–'), 'a window as a range');
  assert.ok(weekPanel._renderWeekAhead(painState({})).includes('dashboard_week_nothing'), 'an empty week says so');
  assert.ok(weekPanel._renderWidget('week_ahead', painState({}), false).includes('is-empty'), 'and shrinks to one line');
  assert.strictEqual(weekPanel._renderWidget('week_ahead', painState({ period_forecast: null, next_predicted_start: dayAt(2) }), true), '', 'nothing in discreet mode');
  assert.strictEqual(weekPanel._renderWidget('week_ahead', painState({ period_forecast: null, next_predicted_start: dayAt(2) }, 'pregnant'), false), '', 'nothing while pregnant');
  assert.ok(weekPanel._renderWidget('week_ahead', painState({ period_forecast: null, next_predicted_start: dayAt(2) }), false).includes('week-period'));
  ['pregnancy', 'menarche', 'menopause', 'postpartum'].forEach((mode) => {
    assert.ok(!weekPanel._widgetIdsForMode(mode, ['week_ahead', 'kpi_strip']).includes('week_ahead'), `no forecast list in ${mode}`);
  });
  assert.ok(weekPanel._widgetIdsForMode('established', ['week_ahead']).includes('week_ahead'), 'shown in the normal mode');
  assert.strictEqual(weekPanel._normalizePrefs(null, 'a', 'general').widgetVisibility.week_ahead, true);
  assert.strictEqual(weekPanel._normalizePrefs(null, 'a', 'young').widgetVisibility.week_ahead, false, 'off for the young profile preset');

  // ---- Search history ----
  const realFunctionsHs = global.window.MenstruationFunctions;
  global.window.MenstruationFunctions = {
    getSymptomConfig: () => [{ key: 'pain' }, { key: 'discharge' }, { key: 'cervix_texture', hiddenInModal: true }],
    normalizeOptionKey: (v) => v,
    renderOptionIcon: () => '',
    renderCategoryIcon: () => '',
    fetchFreshSymptomData: async (hass, entity, date) => ({ data: { date, found: true, pain: ['cramps'], pain_intensity: 5, discharge: '' } }),
  };
  const hsPanel = await freshPanel();
  const hsHistory = [
    { date: dayAt(-1), pain: ['headache', 'cramps'], pain_intensity: 6, basal_temp: 36.5 },
    { date: dayAt(-3), discharge: 'creamy' },
    { date: dayAt(-4), cervix_texture: 'soft' },
    { date: dayAt(-120), pain: ['cramps'] },
    { date: dayAt(-200), pain: ['migraine'] },
    { date: dayAt(2), pain: ['future'] },
    { date: dayAt(-5) },
  ];
  hsPanel._hass.states[hsPanel._selectedEntityId] = painState({ symptom_history: hsHistory });
  const hsState = () => hsPanel._hass.states[hsPanel._selectedEntityId];
  const hsDates = () => hsPanel._historySearchRows(hsState()).map((row) => row.date);
  assert.deepStrictEqual(hsDates(), [dayAt(-1), dayAt(-3)], 'last 90 days, newest first; empty, hidden-in-dialog and future days are left out');
  hsPanel._historySearch.q = 'head';
  assert.deepStrictEqual(hsDates(), [dayAt(-1)], 'text finds an option');
  hsPanel._historySearch.q = 'CREAM';
  assert.deepStrictEqual(hsDates(), [dayAt(-3)], 'case does not matter');
  hsPanel._historySearch.q = 'pain';
  assert.deepStrictEqual(hsDates(), [dayAt(-1)], 'and a category name (here also the strength chip)');
  hsPanel._historySearch.q = '36.5';
  assert.deepStrictEqual(hsDates(), [dayAt(-1)], 'and the temperature');
  hsPanel._historySearch.q = 'zzz';
  assert.deepStrictEqual(hsDates(), []);
  assert.ok(hsPanel._renderHistoryResults(hsState()).includes('dashboard_hs_none'), 'no match says so');
  hsPanel._historySearch.q = '';
  hsPanel._historySearch.category = 'discharge';
  assert.deepStrictEqual(hsDates(), [dayAt(-3)], 'category filter');
  hsPanel._historySearch.category = '';
  hsPanel._historySearch.range = '30';
  assert.deepStrictEqual(hsDates(), [dayAt(-1), dayAt(-3)]);
  hsPanel._historySearch.range = '180';
  assert.deepStrictEqual(hsDates(), [dayAt(-1), dayAt(-3), dayAt(-120)]);
  hsPanel._historySearch.range = 'all';
  assert.deepStrictEqual(hsDates(), [dayAt(-1), dayAt(-3), dayAt(-120), dayAt(-200)]);
  hsPanel._historySearch.range = '90';
  hsPanel._prefs.categoryVisibility.pain = false;
  assert.deepStrictEqual(hsDates(), [dayAt(-1), dayAt(-3)], 'a hidden category adds no chips ...');
  assert.ok(hsPanel._historySearchRows(hsState()).every((row) => row.chips.every((chip) => chip.category !== 'pain')), '... nor the strength');
  hsPanel._prefs.categoryVisibility.pain = true;
  const html1 = hsPanel._renderHistoryResults(hsState());
  assert.ok(html1.includes('data-action="hs-open"') && html1.includes(`data-date="${dayAt(-1)}"`) && html1.includes('dashboard_hs_count'), 'each day is a button');
  assert.ok(html1.toLowerCase().includes('headache, cramps') && html1.includes('dashboard_hs_pain'), 'with its entries');
  // many days: 30 at first, then more
  hsPanel._hass.states[hsPanel._selectedEntityId] = painState({ symptom_history: Array.from({ length: 70 }, (_, i) => ({ date: dayAt(-1 - i), pain: ['cramps'] })) });
  hsPanel._historySearch.range = 'all';
  assert.strictEqual((hsPanel._renderHistoryResults(hsState()).match(/data-action="hs-open"/g) || []).length, 30);
  assert.ok(hsPanel._renderHistoryResults(hsState()).includes('data-action="hs-more"'));
  hsPanel._handleClick({ target: new ClickTarget({ action: 'hs-more' }) });
  assert.strictEqual((hsPanel._renderHistoryResults(hsState()).match(/data-action="hs-open"/g) || []).length, 60, 'show more adds thirty');
  hsPanel._handleClick({ target: new ClickTarget({ action: 'hs-more' }) });
  assert.ok(!hsPanel._renderHistoryResults(hsState()).includes('hs-more'), 'no button when everything is shown');
  // typing only replaces the list
  hsPanel._hass.states[hsPanel._selectedEntityId] = painState({ symptom_history: hsHistory });
  hsPanel._historySearch.range = '90';
  const box = { innerHTML: '' };
  hsPanel.shadowRoot.querySelector = (sel) => (sel.includes('data-hs-results') ? box : null);
  const typed = Object.assign(new HTMLInputElement(), { dataset: { action: 'hs-query' }, value: 'creamy' });
  hsPanel._handleQuickLogSearchInput({ target: typed });
  assert.ok(box.innerHTML.includes(`data-date="${dayAt(-3)}"`) && !box.innerHTML.includes(`data-date="${dayAt(-1)}"`), 'typing filters the list without redrawing the page');
  assert.strictEqual(hsPanel._historySearch.q, 'creamy');
  // selects
  const pick = (action, value) => hsPanel._handleChange({ target: Object.assign(new ClickTarget({ action }), { tagName: 'SELECT', value }) });
  pick('hs-category', 'pain');
  assert.strictEqual(hsPanel._historySearch.category, 'pain');
  pick('hs-range', '30');
  assert.strictEqual(hsPanel._historySearch.range, '30');
  pick('hs-range', 'junk');
  assert.strictEqual(hsPanel._historySearch.range, '90', 'unknown period: back to 90');
  // widget and opening a day
  hsPanel._historySearch.q = '';
  hsPanel._historySearch.category = '';
  const hsWidget = hsPanel._renderWidget('history_search', hsState(), false);
  assert.ok(hsWidget.includes('data-action="hs-query"') && hsWidget.includes('data-hs-results') && hsWidget.includes('data-action="hs-category"') && hsWidget.includes('data-action="hs-range"'), 'widget has field, selects and the list');
  assert.ok(hsWidget.includes('<option value="discharge"'), 'categories to choose from');
  assert.ok(!hsWidget.includes('cervix_texture'), 'not the ones that are not in the dialog');
  assert.strictEqual(hsPanel._renderWidget('history_search', hsState(), true), '', 'nothing in discreet mode');
  hsPanel._handleClick({ target: new ClickTarget({ action: 'hs-open', date: dayAt(-3) }) });
  assert.strictEqual(hsPanel._quickLogOpen, true);
  assert.strictEqual(hsPanel._quickLogDate, dayAt(-3), 'the quick log opens for that day');
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.deepStrictEqual(hsPanel._quickLogSelections, { pain: ['cramps'], pain_intensity: 5 }, 'filled with what is there (no date, no empty values)');
  global.window.MenstruationFunctions = realFunctionsHs;
  assert.strictEqual(hsPanel._normalizePrefs(null, 'a', 'general').widgetVisibility.history_search, true);
  assert.strictEqual(hsPanel._normalizePrefs(null, 'a', 'young').widgetVisibility.history_search, false);

  console.log('All extended dashboard edit mode tests passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
