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
  // Profile switcher: one round avatar with a chevron badge (like the macOS app); the list opens on tap, also for a single profile.
  {
    const html = () => panelEntityFilter.shadowRoot.innerHTML;
    assert.ok(/<button type="button" class="profile-avatar" data-action="profile-menu-toggle" aria-haspopup="menu" aria-expanded="false"/.test(html()), 'avatar button with menu semantics, closed');
    assert.ok(html().includes('profile-chevron') && !html().includes('class="profile-menu"'), 'chevron badge, no list while closed');
    panelEntityFilter._handleClick({ target: new ClickTarget({ action: 'profile-menu-toggle' }) });
    assert.ok(html().includes('aria-expanded="true"') && html().includes('class="profile-menu" role="menu"'), 'tap opens the list');
    assert.ok(html().includes('data-action="select-entity" data-entity-id="sensor.menstruation_anna"') && /role="menuitemradio" aria-checked="true"/.test(html()), 'the profile is listed and marked as current');
    panelEntityFilter._handleKeydown({ key: 'Escape', target: new ClickTarget(), preventDefault() {} });
    assert.ok(!html().includes('class="profile-menu"') && panelEntityFilter._profileMenuOpen === false, 'Escape closes the list');
    panelEntityFilter._handleClick({ target: new ClickTarget({ action: 'profile-menu-toggle' }) });
    const outside = new ClickTarget();
    outside.closest = () => null;
    panelEntityFilter._handleClick({ target: outside });
    assert.ok(!html().includes('class="profile-menu"'), 'a tap elsewhere closes the list');
    panelEntityFilter._handleClick({ target: new ClickTarget({ action: 'profile-menu-toggle' }) });
    panelEntityFilter._handleClick({ target: new ClickTarget({ action: 'select-entity', entityId: 'sensor.menstruation_anna' }) });
    assert.ok(panelEntityFilter._profileMenuOpen === false && !html().includes('class="profile-menu"'), 'picking a profile closes the list');
    assert.ok(/class="profile-avatar"/.test(html()) && !html().includes('class="entity-picker"'), 'no pills or dropdown any more');
  }

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

  // exports behind "More": wall calendar from the service, history as CSV built in the browser
  openPanel._todayMore = true;
  const exportCard = openPanel._renderTodayCard(openState(pillAttrs), false);
  assert.ok(exportCard.includes('data-action="create-wall-calendar"') && exportCard.includes('data-action="wall-calendar-year"') && exportCard.includes('data-action="download-history-csv"'), 'More has the wall calendar and the CSV');
  assert.ok(!openPanel._renderTodayCard(openState(pillAttrs), true).includes('create-wall-calendar'), 'no exports in discreet mode');
  openPanel._todayMore = false;
  const wallSent = [];
  openPanel._hass.connection = { sendMessagePromise: async (message) => { if (message.service === 'export_wall_calendar') wallSent.push(message); return { response: { html: '<html></html>', filename: 'wall_calendar_x_2025.html' } }; } };
  openPanel._handleChange({ target: Object.assign(new ClickTarget({ action: 'wall-calendar-year' }), { value: '2025' }) });
  await openPanel._createWallCalendar();
  assert.strictEqual(wallSent.length, 1);
  assert.deepStrictEqual([wallSent[0].service, wallSent[0].service_data.year, wallSent[0].service_data.entity_id, wallSent[0].return_response], ['export_wall_calendar', 2025, openPanel._selectedEntityId, true]);
  assert.ok(['de', 'en', 'es', 'fr', 'sv'].includes(wallSent[0].service_data.language));
  assert.strictEqual(openPanel._wallCalendar.name, 'wall_calendar_x_2025.html');
  openPanel._todayMore = true;
  assert.ok(openPanel._renderTodayCard(openState(pillAttrs), false).includes('wall_calendar_x_2025.html'), 'the result links appear');
  openPanel._todayMore = false;
  openPanel._handleChange({ target: Object.assign(new ClickTarget({ action: 'wall-calendar-year' }), { value: 'abc' }) });
  assert.strictEqual(openPanel._wallYear, new Date().getFullYear(), 'a wrong year falls back to this year');
  openPanel._hass.connection = { sendMessagePromise: async () => { throw new Error('boom'); } };
  await openPanel._createWallCalendar();
  assert.strictEqual(openPanel._wallCalendar, null);
  assert.strictEqual(openPanel._message, 'dashboard_wall_calendar_error', 'a failure shows the note');
  openPanel._hass.connection = { sendMessagePromise: async () => ({ response: {} }) };
  await openPanel._createWallCalendar();
  assert.strictEqual(openPanel._wallCalendar, null, 'no html, no link');
  openPanel._hass.connection = { sendMessagePromise: async () => ({ response: { html: '' } }) };
  await openPanel._createWallCalendar();
  assert.strictEqual(openPanel._wallCalendar, null, 'an empty page is no calendar');
  openPanel._handleChange({ target: Object.assign(new ClickTarget({ action: 'wall-calendar-year' }), { value: '1999' }) });
  assert.strictEqual(openPanel._wallYear, new Date().getFullYear(), 'a year that is far off falls back to this year');
  openPanel._message = '';
  delete openPanel._hass.connection;
  const csv = openPanel._historyCsv(openState({ profile: null, symptom_history: [
    { date: '2026-01-03', pain: ['cramps', 'headache'], pain_intensity: 3, note: 'a, "b"' },
    { date: '2026-01-02', note: '=1+1', basal_temp: -0.5 },
    { date: '2026-01-04', symptom_data: { mood: 'ok' }, spotting: null, hygiene: [] },
  ] }));
  assert.strictEqual(csv.split('\n')[0], 'date,basal_temp,mood,note,pain,pain_intensity', 'one column per logged field, sorted');
  assert.deepStrictEqual(csv.split('\n').slice(1), ["2026-01-02,-0.5,,'=1+1,,", '2026-01-03,,,"a, ""b""","cramps;headache",3', '2026-01-04,,ok,,,'], 'oldest first, quoted, formulas defused, lists joined, empty fields left out');
  assert.strictEqual(openPanel._historyCsv(openState({ profile: null, symptom_history: [] })), 'date', 'no days: only the header');
  openPanel._todayMore = true;
  assert.ok(/data-action="download-history-csv" disabled/.test(openPanel._renderTodayCard(openState({ profile: null, symptom_history: [] }), false)), 'nothing logged: the CSV button is off');
  assert.ok(!/data-action="download-history-csv" disabled/.test(openPanel._renderTodayCard(openState({ profile: null, symptom_history: [{ date: '2026-01-02', pain_intensity: 2 }] }), false)), 'something logged: on');
  openPanel._todayMore = false;
  const linkStub = { click() { this.clicked = true; } };
  const realCreate = document.createElement;
  const realUrl = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  document.createElement = (tag) => (tag === 'a' ? linkStub : realCreate.call(document, tag));
  URL.createObjectURL = () => 'blob:csv';
  URL.revokeObjectURL = () => {};
  openPanel._hass.states[openPanel._selectedEntityId] = openState({ profile: null, symptom_history: [{ date: '2026-01-02', pain_intensity: 2 }] });
  openPanel._handleClick({ target: new ClickTarget({ action: 'download-history-csv' }) });
  document.createElement = realCreate;
  URL.createObjectURL = realUrl.create;
  URL.revokeObjectURL = realUrl.revoke;
  assert.ok(linkStub.clicked && linkStub.href === 'blob:csv' && /^cycle_history_\d{4}-\d{2}-\d{2}\.csv$/.test(linkStub.download), 'the click downloads a dated CSV');

  // "Like yesterday" in the card Today: only what describes the day, one tap, undo clears the same fields
  const copyHistory = [{ date: yesterday, pain: ['cramps'], pain_intensity: 4, contraception_method: 'pill', test: ['positive_ovulation'], basal_temp: 36.5, intercourse: 'unprotected', medication: ['iron'], note: 'x', symptom_data: { mood: 'tired' } }];
  const copyState = (extra = {}) => openState({ profile: null, symptom_history: copyHistory, ...extra });
  assert.deepStrictEqual(openPanel._copyYesterdayData(copyState()), { pain: ['cramps'], pain_intensity: 4, mood: 'tired' }, 'only entries that describe the day; pill, LH, temperature, intercourse, medication and note stay out');
  openPanel._todayMore = false;
  assert.ok(openPanel._renderTodayCard(copyState(), false).includes('data-action="copy-yesterday"'), 'the row is on the card');
  assert.ok(!openPanel._renderTodayCard(copyState(), true).includes('copy-yesterday'), 'not in discreet mode');
  assert.ok(!openPanel._renderTodayCard(copyState({ symptom_history: [{ date: yesterday, contraception_method: 'pill' }] }), false).includes('copy-yesterday'), 'nothing to copy but the pill: no row');
  assert.strictEqual(openPanel._copyYesterdayData(copyState({ symptom_history: [...copyHistory, { date: isoToday, mood: 'ok' }] })), null, 'something of that kind is already logged today');
  assert.deepStrictEqual(openPanel._copyYesterdayData(copyState({ symptom_history: [...copyHistory, { date: isoToday, basal_temp: 36.4, contraception_method: 'pill' }] })), { pain: ['cramps'], pain_intensity: 4, mood: 'tired' }, 'a temperature or pill today does not block it');
  openPanel._prefs.categoryVisibility = { ...openPanel._prefs.categoryVisibility, pain: false };
  assert.ok(!('pain' in openPanel._copyYesterdayData(copyState())), 'a hidden category is not copied');
  openPanel._prefs.categoryVisibility.pain = true;
  const copyCalls = [];
  openPanel._hass.callService = async (domain, service, data) => { copyCalls.push([domain, service, data]); };
  openPanel._hass.states[openPanel._selectedEntityId] = copyState();
  openPanel._handleClick({ target: new ClickTarget({ action: 'copy-yesterday' }) });
  await flushPromises();
  assert.deepStrictEqual(copyCalls[0].slice(0, 2), ['menstruation_cycle', 'add_symptom']);
  assert.deepStrictEqual([copyCalls[0][2].date, copyCalls[0][2].entity_id], [isoToday, openPanel._selectedEntityId]);
  assert.deepStrictEqual(copyCalls[0][2].symptom_data, { pain: ['cramps'], pain_intensity: 4, mood: 'tired' });
  assert.strictEqual(openPanel._message, 'dashboard_copy_yesterday_done');
  assert.deepStrictEqual(openPanel._quickLogUndo.previous, { pain: null, pain_intensity: null, mood: null }, 'undo clears exactly the copied fields');
  await openPanel._handleQuickLogUndo();
  assert.deepStrictEqual(copyCalls[1][2].symptom_data, { pain: null, pain_intensity: null, mood: null });
  assert.strictEqual(openPanel._copyYesterdayData(copyState({ symptom_history: [{ date: yesterday, pain: [], mood: '', spotting: null }] })), null, 'empty values are not entries');
  openPanel._fullHistoryCache = { ...openPanel._fullHistoryCache, alice: { symptom_history: copyHistory, stamp: null, days: 99999 } };
  openPanel._hass.states[openPanel._selectedEntityId] = copyState({ profile: 'alice' });
  await openPanel._copyYesterday();
  assert.strictEqual(copyCalls.at(-1)[2].profile, 'alice', 'the profile goes along');
  openPanel._hass.states[openPanel._selectedEntityId] = copyState();
  openPanel._hass.callService = async () => { throw new Error('offline'); };
  openPanel._quickLogUndo = null;
  await openPanel._copyYesterday();
  assert.strictEqual(openPanel._message, 'offline');
  assert.strictEqual(openPanel._quickLogUndo, null, 'a failed save has nothing to undo');
  openPanel._hass.states[openPanel._selectedEntityId] = copyState({ symptom_history: [] });
  const callsBefore = copyCalls.length;
  openPanel._hass.callService = async (...args) => { copyCalls.push(args); };
  await openPanel._copyYesterday();
  assert.strictEqual(copyCalls.length, callsBefore, 'nothing to copy: no call');
  clearTimeout(openPanel._quickLogUndoTimer);

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
  const jumpTo = (group) => { const sel = new ClickTarget({ action: 'jump-select' }); sel.tagName = 'SELECT'; sel.value = group; navPanel._handleChange({ target: sel }); return sel; };
  assert.strictEqual(jumpTo('supplies').value, '', 'the list springs back to its caption');
  assert.ok(navHtml.includes('<select data-action="jump-select"') && navHtml.includes('chip-caret'), 'compact dropdown with caret instead of a row of chips');
  assert.deepStrictEqual(scrolls, [['timer_card', 'start', 'smooth']], 'first card of the group in page order');
  navPanel._prefs.animations = false;
  jumpTo('calendar');
  assert.deepStrictEqual(scrolls[1], ['calendar_card', 'start', 'auto'], 'no smooth scrolling with animations off');
  scrolls.pop();
  navPanel._prefs.animations = true;
  jumpTo('nonsense');
  jumpTo('');
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
  assert.ok(/class="icon-only log-icon" data-action="open-quick-log"/.test(navPanel.shadowRoot.innerHTML) && navPanel.shadowRoot.innerHTML.includes('class="mc-log-fab" data-action="open-quick-log"'), 'compact plus in the header and a round plus on phones');
  assert.ok(/@media \(max-width: 700px\) \{[^@]*\.toolbar button\.log-icon \{ display: none; \}\s*\.mc-log-fab \{ display: flex;/.test(source), 'the round plus replaces the header one on narrow screens only');
  assert.ok(/<label class="chip-select range-chip"[^>]*>.*<select class="range-picker" data-pref="chartRange"/.test(navPanel.shadowRoot.innerHTML) && !navPanel.shadowRoot.innerHTML.includes('class="today-pill"'), 'date and chart period are one chip');
  navPanel._editMode = true;
  navPanel.render();
  assert.ok(!navPanel.shadowRoot.innerHTML.includes('class="mc-log-fab"') && !navPanel.shadowRoot.innerHTML.includes('class="icon-only log-icon"'), 'no log button while editing');
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
  assert.ok(withStrength.includes('· 6/10"') && withStrength.includes('· 2/10"'), 'bars carry the strength');
  assert.ok(withStrength.includes('Pain strength'), 'legend names the strength');
  assert.ok(withStrength.includes('dashboard_pain_unrated'), 'a day with pain types but no strength gets a small marker');
  const heightOf = (html, title) => parseFloat(new RegExp(`height="([\\d.]+)"[^>]*· ${title}"`).exec(html)[1]);
  assert.ok(heightOf(withStrength, '6/10') > heightOf(withStrength, '2/10'), 'stronger pain, taller bar');
  const typesOnly = trendHtml([{ date: dayAt(-3), pain: ['cramps', 'headache'] }, { date: dayAt(-2), pain: ['cramps'] }]);
  assert.ok(!typesOnly.includes('/10') && !typesOnly.includes('dashboard_pain_unrated') && typesOnly.includes('Number of pain types'), 'without any strength: the number of pain types as before');

  // ---- one tooltip for all charts ----
  const tipPanel = await freshPanel();
  const tipRoot = { children: [], querySelector(sel) { return sel === '.mc-tip' ? this.children[0] || null : null; }, appendChild(el) { this.children = [el]; } };
  {
    const makeTip = () => { const el = { className: '', style: {}, attrs: {}, textContent: '', setAttribute(k, v) { this.attrs[k] = v; }, remove() { tipRoot.children = []; } }; return el; };
    global.document.createElement = (tag) => (tag === 'div' ? makeTip() : null);
    tipPanel.shadowRoot.querySelector = tipRoot.querySelector.bind(tipRoot);
    tipPanel.shadowRoot.appendChild = tipRoot.appendChild.bind(tipRoot);
    global.window.innerWidth = 400;
    const bar = (top, left) => { const el = { closest: () => el, dataset: { tip: 'Nov 1, 2026 · 6/10' }, getBoundingClientRect: () => ({ top, bottom: top + 10, left, width: 6 }) }; return el; };
    tipPanel._handleTip({ type: 'pointerover', target: bar(200, 100) });
    assert.strictEqual(tipRoot.children[0].textContent, 'Nov 1, 2026 · 6/10', 'hovering shows the text');
    assert.strictEqual(tipRoot.children[0].style.top, '192px', 'above the point');
    tipPanel._handleTip({ type: 'pointerover', target: bar(10, 3) });
    assert.strictEqual(tipRoot.children[0].style.top, '28px', 'below it when there is no room above');
    assert.strictEqual(tipRoot.children[0].style.left, '90px', 'kept inside the screen');
    tipPanel._handleTip({ type: 'pointerout', pointerType: 'touch', target: bar(10, 3) });
    assert.strictEqual(tipRoot.children.length, 1, 'a tap keeps the tip when the finger lifts');
    tipPanel._handleTip({ type: 'pointerdown', target: { closest: () => null } });
    assert.strictEqual(tipRoot.children.length, 0, 'tapping elsewhere hides it');
    tipPanel._handleTip({ type: 'pointerover', target: bar(200, 100) });
    tipPanel._handleTip({ type: 'pointerout', pointerType: 'mouse', target: bar(200, 100) });
    assert.strictEqual(tipRoot.children.length, 0, 'the mouse leaving hides it');
  }
  assert.ok(tipPanel._renderCycleHistoryGraph(painState({ grouped_starts: [dayAt(-93), dayAt(-65), dayAt(-37), dayAt(-9)] })).includes(' data-tip="'), 'cycle length bars have a tip');
  assert.ok(!/<title>[^<]*<\/title><\/rect>/.test(withStrength), 'no second native tooltip next to ours');

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

  // ---- This cycle day before / Week in review ----
  const realFunctionsCd = global.window.MenstruationFunctions;
  global.window.MenstruationFunctions = {
    getSymptomConfig: () => [{ key: 'pain' }, { key: 'cervix_texture', hiddenInModal: true }],
    normalizeOptionKey: (v) => v,
    renderOptionIcon: () => '',
    renderCategoryIcon: () => '',
    fetchFreshSymptomData: async () => ({ data: null }),
  };
  const cdPanel = await freshPanel();
  const cdHistory = [
    { date: dayAt(-28), pain: ['cramps'] },
    { date: dayAt(-56), pain: ['cramps'], pain_intensity: 4, basal_temp: 36.5 },
    { date: dayAt(-1), pain_intensity: 2 },
    { date: dayAt(0), pain_intensity: 6, pain: ['cramps'], basal_temp: 36.7 },
    { date: dayAt(-2), pain: ['cramps', 'headache'] },
    { date: dayAt(-8), pain: ['migraine'] },
  ];
  const cdState = (attrs = {}, state = 'luteal') => painState({ cycle_day: 10, grouped_starts: [dayAt(-93), dayAt(-65), dayAt(-37), dayAt(-9)], symptom_history: cdHistory, ...attrs }, state);
  cdPanel._hass.states[cdPanel._selectedEntityId] = cdState();
  const cdRows = cdPanel._cycleDayEarlierRows(cdState());
  assert.deepStrictEqual(cdRows.map((row) => row.date), [dayAt(-28), dayAt(-56), dayAt(-84)], 'same cycle day in each earlier cycle, newest cycle first');
  assert.deepStrictEqual(cdRows.map((row) => row.chips.length), [1, 3, 0], 'what was logged then (pain type; type, strength and temperature; nothing)');
  assert.strictEqual(cdPanel._cycleDayEarlierRows(cdState({ cycle_day: 25, grouped_starts: [dayAt(-93), dayAt(-65), dayAt(-45), dayAt(-9)] })).length, 2, 'an earlier cycle shorter than that many days is skipped');
  assert.deepStrictEqual(cdPanel._cycleDayEarlierRows(cdState({ cycle_day: 0 })), [], 'no cycle day, no rows');
  assert.deepStrictEqual(cdPanel._cycleDayEarlierRows(cdState({ grouped_starts: [dayAt(-9)] })), [], 'no earlier cycle, no rows');
  const cdHtml = cdPanel._renderCycleDayEarlier(cdState());
  assert.strictEqual((cdHtml.match(/class="cde-row"/g) || []).length, 3);
  assert.strictEqual((cdHtml.match(/class="cde-none"/g) || []).length, 1, 'a cycle with nothing says so');
  assert.ok(cdHtml.includes('dashboard_cde_common'), 'a value that came back in two cycles is named in one sentence');
  const cdOnce = cdPanel._renderCycleDayEarlier(cdState({ symptom_history: [cdHistory[0]] }));
  assert.ok(cdOnce.includes('dashboard_cde_title') && !cdOnce.includes('dashboard_cde_common'), 'a single hit is no pattern');
  assert.ok(cdPanel._renderCycleDayEarlier(cdState({ cycle_day: 0 })).includes('dashboard_cde_empty'));
  assert.ok(cdPanel._renderCycleDayEarlier(cdState({ symptom_history: [] })).includes('dashboard_cde_none') && !cdPanel._renderCycleDayEarlier(cdState({ symptom_history: [] })).includes('cde-row'), 'earlier cycles but nothing logged: one line instead of a list of nothing');
  assert.ok(cdPanel._renderWidget('cycle_day_earlier', cdState({ symptom_history: [] }), false).includes('is-empty'), 'and the card shrinks');
  assert.strictEqual(cdPanel._renderWidget('cycle_day_earlier', cdState(), true), '', 'nothing in discreet mode');
  assert.strictEqual(cdPanel._renderWidget('cycle_day_earlier', cdState({}, 'pregnant'), false), '', 'nothing while pregnant');
  assert.ok(cdPanel._renderWidget('cycle_day_earlier', cdState(), false).includes('cde-list'));
  ['pregnancy', 'menarche', 'menopause', 'postpartum'].forEach((mode) => {
    assert.ok(!cdPanel._widgetIdsForMode(mode, ['cycle_day_earlier', 'kpi_strip']).includes('cycle_day_earlier'), `no cycle comparison in ${mode}`);
  });
  assert.strictEqual(cdPanel._normalizePrefs(null, 'a', 'general').widgetVisibility.cycle_day_earlier, true);
  assert.strictEqual(cdPanel._normalizePrefs(null, 'a', 'young').widgetVisibility.cycle_day_earlier, false);
  assert.ok(cdPanel._renderJumpNav(['cycle_day_earlier', 'week_ahead', 'calendar_card', 'inventory_card']).includes('data-group="history"'), 'part of the history chip');

  const wrData = cdPanel._weekReviewData(cdState());
  assert.strictEqual(wrData.loggedDays, 3, 'three of the last seven days have entries (the eighth day back does not count)');
  assert.deepStrictEqual(wrData.strengths, [2, 6]);
  assert.deepStrictEqual(wrData.common[0], ['Pain: Cramps', 2], 'the most frequent value, with its category; strength and temperature are no "values"');
  assert.ok(!wrData.common.some(([text]) => /36\.|\/10/.test(text)));
  const wrHtml = cdPanel._renderWeekReview(cdState());
  assert.strictEqual((wrHtml.match(/class="wr-day on"/g) || []).length, 3);
  assert.strictEqual((wrHtml.match(/class="wr-day"/g) || []).length, 4);
  assert.ok(wrHtml.includes('dashboard_wr_pain_value') && wrHtml.includes('dashboard_wr_common'));
  assert.ok(!cdPanel._renderWeekReview(cdState({ symptom_history: [{ date: dayAt(-1), pain: ['cramps'] }] })).includes('dashboard_wr_pain_value'), 'no strength logged: no strength line');
  assert.ok(cdPanel._renderWeekReview(cdState({ symptom_history: [] })).includes('dashboard_wr_none'));
  assert.ok(cdPanel._renderWidget('week_review', cdState({ symptom_history: [] }), false).includes('is-empty'), 'an empty week shrinks to one line');
  assert.strictEqual(cdPanel._renderWidget('week_review', cdState(), true), '', 'nothing in discreet mode');
  assert.ok(cdPanel._widgetIdsForMode('pregnancy', ['week_review']).includes('week_review'), 'logging goes on in every mode');
  assert.strictEqual(cdPanel._normalizePrefs(null, 'a', 'general').widgetVisibility.week_review, true);
  assert.strictEqual(cdPanel._normalizePrefs(null, 'a', 'young').widgetVisibility.week_review, false);
  assert.ok(cdPanel._renderJumpNav(['week_review', 'cycle_history', 'calendar_card', 'inventory_card']).includes('data-group="overview"'));
  // compare two cycles
  const ccCycles = cdPanel._compareCycles(cdState());
  assert.deepStrictEqual(ccCycles.map((c) => [c.start, c.length, c.running]), [[dayAt(-9), 10, true], [dayAt(-37), 28, false], [dayAt(-65), 28, false], [dayAt(-93), 28, false]], 'newest first, the running one counts up to today');
  cdPanel._compare = { a: '', b: '' };
  const ccHtml = cdPanel._renderCycleCompare(cdState());
  assert.ok(ccHtml.includes('data-action="cc-a"') && ccHtml.includes('data-action="cc-b"'));
  assert.ok(ccHtml.includes('dashboard_cc_length_running') && ccHtml.includes('<td>28</td>'), 'default: running cycle against the one before');
  assert.strictEqual((ccHtml.match(/<option value="\d{4}-/g) || []).length, 8, 'both selects list all four cycles');
  assert.strictEqual((ccHtml.match(/<option value="\d{4}-[^>]* selected>/g) || []).length, 2);
  assert.ok(ccHtml.includes(`value="${dayAt(-9)}" selected`) && ccHtml.includes(`value="${dayAt(-37)}" selected`));
  cdPanel._compare = { a: dayAt(-93), b: dayAt(-65) };
  const ccPicked = cdPanel._renderCycleCompare(cdState());
  assert.ok(ccPicked.includes(`value="${dayAt(-93)}" selected`) && ccPicked.includes(`value="${dayAt(-65)}" selected`) && !ccPicked.includes('dashboard_cc_length_running'), 'own choice is kept');
  cdPanel._compare = { a: dayAt(-37), b: '' };
  assert.ok(cdPanel._renderCycleCompare(cdState()).includes(`value="${dayAt(-9)}" selected`), 'the second side avoids the cycle that is already picked on the first');
  cdPanel._compare = { a: '1999-01-01', b: dayAt(-9) };
  assert.ok(cdPanel._renderCycleCompare(cdState()).includes(`value="${dayAt(-9)}" selected`), 'a start date that is gone falls back to the default');
  const ccPick = (action, value) => cdPanel._handleChange({ target: Object.assign(new ClickTarget({ action }), { tagName: 'SELECT', value }) });
  ccPick('cc-a', dayAt(-65));
  ccPick('cc-b', dayAt(-93));
  assert.deepStrictEqual(cdPanel._compare, { a: dayAt(-65), b: dayAt(-93) }, 'the two selects set their own side');
  cdPanel._compare = { a: '', b: '' };
  const ccEarlier = cdPanel._renderCycleCompare(cdState({ symptom_history: [{ date: dayAt(-30), pain: ['cramps'], pain_intensity: 4 }, { date: dayAt(-31), pain: ['cramps'], pain_intensity: 6 }, { date: dayAt(-3), pain: ['headache'] }] }));
  assert.ok(ccEarlier.includes('dashboard_wr_pain_value') && ccEarlier.includes('Pain: Cramps (2×)'), 'pain and most frequent values of the cycle that was picked');
  assert.ok(ccEarlier.includes('dashboard_cc_logged_value') && ccEarlier.includes('–'), 'a cycle without strength shows a dash');
  assert.ok(cdPanel._renderCycleCompare(cdState({ grouped_starts: [dayAt(-9)] })).includes('Not enough data yet.'), 'one cycle is nothing to compare');
  assert.strictEqual(cdPanel._renderCycleCompare(cdState({}, 'pregnant')), '');
  assert.strictEqual(cdPanel._renderWidget('cycle_compare', cdState(), true), '', 'nothing in discreet mode');
  assert.ok(cdPanel._renderWidget('cycle_compare', cdState(), false).includes('cc-table'));
  assert.ok(/class="card[^"]*sensitive/.test(cdPanel._renderWidget('cycle_compare', cdState(), false)), 'blurred with the other personal cards');
  cdPanel._prefs.categoryVisibility = { ...cdPanel._prefs.categoryVisibility, pain: false };
  assert.ok(!cdPanel._renderCycleCompare(cdState({ symptom_history: [{ date: dayAt(-30), pain_intensity: 4 }] })).includes('dashboard_wr_pain_value'), 'a hidden pain category shows no strength');
  cdPanel._prefs.categoryVisibility.pain = true;
  ['pregnancy', 'menarche', 'menopause', 'postpartum'].forEach((mode) => assert.ok(!cdPanel._widgetIdsForMode(mode, ['cycle_compare', 'kpi_strip']).includes('cycle_compare'), `no comparison in ${mode}`));
  assert.strictEqual(cdPanel._normalizePrefs(null, 'a', 'general').widgetVisibility.cycle_compare, true);
  assert.strictEqual(cdPanel._normalizePrefs(null, 'a', 'young').widgetVisibility.cycle_compare, false);
  assert.ok(cdPanel._renderJumpNav(['cycle_compare', 'week_ahead', 'calendar_card', 'inventory_card']).includes('data-group="history"'));
  // the forecast check: predicted against real period start, from get_last_cycle_summary
  const pcProfile = cdState().attributes.profile || cdPanel._activeProfile || 'default';
  const pcSet = (accuracy) => { cdPanel._lastCycleCache = { [pcProfile]: accuracy === undefined ? null : { prediction_accuracy: accuracy } }; };
  pcSet(undefined);
  assert.ok(cdPanel._renderPredictionCheck(cdState()).includes('dashboard_pc_none'), 'no summary yet: a note');
  pcSet({ cycles: 3, mean_abs_error_days: 2, within_2_days: 2, errors: [{ actual: dayAt(-65), predicted: dayAt(-64), diff: -1 }, { actual: dayAt(-37), predicted: dayAt(-42), diff: 5 }, { actual: dayAt(-9), predicted: dayAt(-9), diff: 0 }] });
  const pcHtml = cdPanel._renderPredictionCheck(cdState());
  assert.strictEqual((pcHtml.match(/class="pc-row"/g) || []).length, 3);
  assert.strictEqual((pcHtml.match(/pc-bar ok/g) || []).length, 2, 'two cycles were within 2 days');
  assert.ok(pcHtml.indexOf('dashboard_pc_early') > pcHtml.indexOf('dashboard_pc_late') && pcHtml.indexOf('dashboard_pc_late') > pcHtml.indexOf('dashboard_pc_on_time'), 'newest cycle first');
  assert.ok(pcHtml.includes('right: 50%; width: 7%;') && pcHtml.includes('left: 50%; width: 36%;'), 'early to the left, late to the right, scaled to 7 days');
  pcSet({ cycles: 2, mean_abs_error_days: 2.5, within_2_days: 1, errors: [{ actual: dayAt(-37), diff: 3 }, { actual: dayAt(-9), diff: -2 }] });
  const pcEdge = cdPanel._renderPredictionCheck(cdState());
  assert.strictEqual((pcEdge.match(/pc-bar ok/g) || []).length, 1, 'two days off counts as close, three does not');
  const realT = cdPanel._t;
  cdPanel._t = (key) => (key === 'dashboard_pc_summary' ? '{mean}|{within}|{cycles}' : realT.call(cdPanel, key));
  assert.ok(cdPanel._renderPredictionCheck(cdState()).includes('2.5|1|2'), 'the summary line carries mean, close cycles and cycles');
  cdPanel._t = realT;
  pcSet({ cycles: 1, mean_abs_error_days: 12, within_2_days: 0, errors: [{ actual: dayAt(-9), predicted: dayAt(-21), diff: 12 }, { actual: dayAt(-30), diff: null }, { predicted: dayAt(-30), diff: 1 }] });
  const pcWide = cdPanel._renderPredictionCheck(cdState());
  assert.ok(pcWide.includes('left: 50%; width: 50%;') && (pcWide.match(/class="pc-row"/g) || []).length === 1, 'a big miss fills half the track; rows without data are left out');
  pcSet({ cycles: 0, errors: [{ diff: 'x' }] });
  assert.ok(cdPanel._renderPredictionCheck(cdState()).includes('dashboard_pc_none'), 'nothing usable: the note');
  pcSet({ cycles: 1, mean_abs_error_days: 1, within_2_days: 1, errors: [{ actual: dayAt(-9), diff: 1 }] });
  assert.ok(cdPanel._renderWidget('prediction_check', cdState(), false).includes('pc-list'), 'the widget is registered');
  assert.strictEqual(cdPanel._renderWidget('prediction_check', cdState(), true), '', 'nothing in discreet mode');
  assert.ok(/class="card[^"]*sensitive/.test(cdPanel._renderWidget('prediction_check', cdState(), false)), 'blurred with the other personal cards');
  ['pregnancy', 'menarche', 'menopause', 'postpartum'].forEach((mode) => assert.ok(!cdPanel._widgetIdsForMode(mode, ['prediction_check', 'kpi_strip']).includes('prediction_check'), `no forecast check in ${mode}`));
  assert.strictEqual(cdPanel._normalizePrefs(null, 'a', 'general').widgetVisibility.prediction_check, true);
  assert.strictEqual(cdPanel._normalizePrefs(null, 'a', 'young').widgetVisibility.prediction_check, false);
  assert.ok(cdPanel._renderJumpNav(['prediction_check', 'week_ahead', 'calendar_card', 'inventory_card']).includes('data-group="history"'), 'part of the history group');
  cdPanel._lastCycleCache = {};
  // the curve of the two cycles and the remembered choice
  cdPanel._compare = { a: '', b: '', metric: '' };
  cdPanel._compareProfile = cdPanel._activeProfile;
  assert.ok(cdPanel._renderCycleCompare(cdState()).includes('dashboard_cc_chart_none'), 'one value in two cycles is no curve');
  cdPanel._compare = { a: dayAt(-9), b: dayAt(-65), metric: '' };
  const curve = cdPanel._renderCycleCompare(cdState());
  assert.ok(curve.includes('class="cc-chart"') && curve.includes('data-action="cc-metric"'));
  assert.strictEqual((curve.match(/r="2\.6"/g) || []).length, 2, 'one dot per logged temperature');
  assert.ok(curve.includes('36.7 °C') && curve.includes('36.5 °C'), 'values in the tooltips');
  assert.ok(/data-tip="[^"]*"/.test(curve) && curve.includes('stroke-dasharray="6 4"'), 'the second cycle is dashed as well as coloured');
  cdPanel._compare.metric = 'pain';
  const painCurve = cdPanel._renderCycleCompare(cdState());
  assert.ok(['2/10', '6/10', '4/10'].every((text) => painCurve.includes(text)) && !painCurve.includes('36.7 °C'), 'the pain strength curve');
  assert.ok(painCurve.includes('<option value="pain" selected>'));
  const tipDay = (iso) => new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${iso}T12:00:00`));
  const ownPain = cdPanel._renderCycleCompare(cdState({ symptom_history: [{ date: dayAt(-9), pain_intensity: 3 }, { date: dayAt(-8), pain_intensity: 'x' }, { date: dayAt(-65), pain_intensity: 5 }] }));
  assert.ok(ownPain.includes(`${tipDay(dayAt(-9))} · dashboard_cc_day · 3/10`), 'the tip names the date of the dot');
  assert.ok(!ownPain.includes('NaN') && (ownPain.match(/r="2\.6"/g) || []).length === 2, 'a value that is not a number is left out');
  assert.ok(ownPain.includes('>0</text>') && ownPain.includes('>10</text>'), 'the pain axis always runs from 0 to 10');
  // mean of all cycles and the first positive LH test
  const tempOn = (offset, day, value) => ({ date: dayAt(offset + day - 1), basal_temp: value });
  const meanHistory = [tempOn(-9, 3, 36.0), tempOn(-9, 4, 36.0), tempOn(-9, 5, 36.0), tempOn(-65, 3, 37.0), tempOn(-65, 4, 37.0), tempOn(-37, 3, 36.5), tempOn(-37, 4, 36.5), tempOn(-37, 2, 36.0), tempOn(-65, 2, 37.0)];
  cdPanel._compare = { a: dayAt(-9), b: dayAt(-65), metric: 'temp' };
  const meanHtml = cdPanel._renderCycleCompare(cdState({ symptom_history: meanHistory }));
  const meanPath = (meanHtml.match(/<path d="([^"]*)" fill="none" stroke="var\(--secondary-text-color,#9ca3af\)"/) || [])[1] || '';
  assert.strictEqual((meanPath.match(/[ML]/g) || []).length, 3, 'only days with a value in two cycles: day 5 is left out');
  const meanXs = [...meanPath.matchAll(/[ML](\d+),/g)].map((m) => Number(m[1]));
  assert.deepStrictEqual(meanXs, [...meanXs].sort((x, y) => x - y), 'drawn from the first day to the last');
  assert.ok((meanPath.match(/,83/g) || []).length === 3, `the mean of 36.0, 36.5 and 37.0 sits in the middle: ${meanPath}`);
  assert.ok(meanHtml.includes('dashboard_cc_average'), 'the legend names the mean');
  assert.ok(!cdPanel._renderCycleCompare(cdState({ symptom_history: [tempOn(-9, 3, 36.0), tempOn(-65, 3, 37.0), tempOn(-37, 3, 36.5)] })).includes('dashboard_cc_average'), 'one day is no line');
  assert.ok(!cdPanel._renderCycleCompare(cdState({ grouped_starts: [dayAt(-37), dayAt(-9)], symptom_history: meanHistory })).includes('dashboard_cc_average'), 'two cycles: the mean would only repeat them');
  const lhHistory = [...meanHistory, { date: dayAt(-4), test: ['positive_ovulation'] }, { date: dayAt(-2), test: ['positive_ovulation'] }, { date: dayAt(-60), test: ['negative_ovulation'] }];
  const lhHtml = cdPanel._renderCycleCompare(cdState({ symptom_history: lhHistory }));
  assert.strictEqual((lhHtml.match(/>LH<\/text>/g) || []).length, 1, 'one mark: the first positive test of the cycle that has one; a negative test is no mark');
  assert.ok(lhHtml.includes(`${tipDay(dayAt(-4))} · dashboard_cc_day · dashboard_cc_lh`), 'the tip names the day of the first positive test');
  assert.ok(lhHtml.includes('<line x1="133"'), 'cycle day 6 of 28 on the axis');
  cdPanel._compare = { a: dayAt(-9), b: dayAt(-65), metric: 'pain' };
  cdPanel._prefs.categoryVisibility = { ...cdPanel._prefs.categoryVisibility, pain: false };
  const noPain = cdPanel._renderCycleCompare(cdState());
  assert.ok(!noPain.includes('value="pain"') && noPain.includes('36.7 °C'), 'a hidden pain category offers no pain curve, even if it was chosen before');
  cdPanel._prefs.categoryVisibility.pain = true;
  assert.ok(cdPanel._renderCycleCompare(cdState({ symptom_history: [{ date: dayAt(-3), pain: ['cramps'] }] })).includes('dashboard_cc_chart_none'), 'nothing measured: a note');
  // only cycles with values, bleeding days under the curve, and reading one day
  assert.strictEqual(cdPanel._compareRead({ basal_temp: '36.4' }, 'temp'), 36.4);
  assert.strictEqual(cdPanel._compareRead({ symptom_data: { basal_temp: 36.1 } }, 'temp'), 36.1, 'the nested form counts too');
  assert.strictEqual(cdPanel._compareRead({ basal_temp: '' }, 'temp'), null);
  assert.strictEqual(cdPanel._compareRead({ basal_temp: 'x' }, 'temp'), null);
  assert.strictEqual(cdPanel._compareRead({ basal_temp: 36.5 }, 'pain'), null, 'a temperature is no pain strength');
  assert.strictEqual(cdPanel._compareRead({ pain_intensity: 0 }, 'pain'), 0, 'zero is a value');
  assert.strictEqual(cdPanel._compareRead({ symptom_data: { pain_intensity: 7 } }, 'pain'), 7);
  assert.strictEqual(cdPanel._compareRead({ pain_intensity: 2.5 }, 'pain'), null);
  assert.strictEqual(cdPanel._compareRead(undefined, 'temp'), null);
  const offeredStarts = (html) => [...((html.match(/<select data-action="cc-a"[^>]*>(.*?)<\/select>/) || [])[1] || '').matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]);
  cdPanel._compare = { a: '', b: '', metric: 'temp', valuesOnly: false };
  assert.strictEqual(offeredStarts(cdPanel._renderCycleCompare(cdState())).length, 4, 'all cycles by default');
  assert.ok(!cdPanel._renderCycleCompare(cdState()).includes(' checked'), 'switch is off');
  cdPanel._compare.valuesOnly = true;
  const onlyTemp = cdPanel._renderCycleCompare(cdState());
  assert.deepStrictEqual(offeredStarts(onlyTemp).sort(), [dayAt(-65), dayAt(-9)].sort(), 'only the cycles with a temperature');
  assert.ok(onlyTemp.includes('data-action="cc-values-only" checked'), 'switch is on');
  cdPanel._compare.metric = 'pain';
  assert.deepStrictEqual(offeredStarts(cdPanel._renderCycleCompare(cdState())).sort(), [dayAt(-65), dayAt(-9)].sort(), 'the filter follows the chosen curve');
  assert.deepStrictEqual(offeredStarts(cdPanel._renderCycleCompare(cdState({ symptom_history: [{ date: dayAt(-10), pain_intensity: 1 }, { date: dayAt(-5), pain_intensity: 2 }, { date: dayAt(-60), basal_temp: 36.5 }, { date: dayAt(-90), basal_temp: 36.4 }] }))).sort(), [dayAt(-37), dayAt(-9)].sort(), 'pain values sit in other cycles than temperatures: the filter looks at the chosen curve');
  assert.strictEqual(offeredStarts(cdPanel._renderCycleCompare(cdState({ symptom_history: [{ date: dayAt(-10), pain_intensity: 1 }] }))).length, 4, 'one cycle with values is nothing to compare: all cycles stay');
  cdPanel._compare = { a: dayAt(-93), b: dayAt(-37), metric: 'temp', valuesOnly: true };
  assert.ok(cdPanel._renderCycleCompare(cdState()).includes(`value="${dayAt(-65)}" selected`), 'a cycle that the filter hides is replaced by one with values');
  // the switch is stored and read back
  const onlySaved = [];
  const onlySetItem = localStorage.setItem;
  localStorage.setItem = (key, value) => onlySaved.push([key, value]);
  const onlyBox = (checked) => cdPanel._handleChange({ target: Object.assign(new ClickTarget({ action: 'cc-values-only' }), { checked }) });
  cdPanel._compare = { a: '', b: '', metric: 'temp', valuesOnly: false };
  onlyBox(true);
  assert.strictEqual(cdPanel._compare.valuesOnly, true);
  assert.strictEqual(JSON.parse(onlySaved.at(-1)[1]).valuesOnly, true, 'stored per profile');
  onlyBox(false);
  assert.strictEqual(cdPanel._compare.valuesOnly, false);
  assert.strictEqual(JSON.parse(onlySaved.at(-1)[1]).valuesOnly, false);
  onlyBox(true);
  const onlyGet = localStorage.getItem;
  localStorage.getItem = (key) => (key === `menstruation_cycle_compare.${cdPanel._activeProfile}` ? onlySaved.at(-1)[1] : null);
  cdPanel._compare = { a: '', b: '', metric: '', valuesOnly: false };
  cdPanel._compareProfile = null;
  cdPanel._renderCycleCompare(cdState());
  assert.strictEqual(cdPanel._compare.valuesOnly, true, 'a new session starts with the switch as it was');
  localStorage.getItem = () => JSON.stringify({ valuesOnly: 'yes', a: 5, b: 'not a day', metric: 'x' });
  cdPanel._compareProfile = null;
  cdPanel._renderCycleCompare(cdState());
  assert.deepStrictEqual(cdPanel._compare, { a: '', b: '', metric: '', valuesOnly: false }, 'only checked values are taken over: a real true, a date, a known curve');
  localStorage.getItem = () => JSON.stringify({ a: '2026-10-02', metric: 'pain' });
  cdPanel._compareProfile = null;
  cdPanel._renderCycleCompare(cdState());
  assert.deepStrictEqual([cdPanel._compare.a, cdPanel._compare.metric], ['2026-10-02', 'pain'], 'valid values are kept');
  localStorage.getItem = onlyGet;
  localStorage.setItem = onlySetItem;
  // bleeding days as strips under the curve
  cdPanel._compare = { a: dayAt(-9), b: dayAt(-65), metric: 'temp', valuesOnly: false };
  const noStrips = cdPanel._renderCycleCompare(cdState());
  assert.ok(noStrips.includes('viewBox="0 0 560 180"') && !noStrips.includes('height="4" fill') && !noStrips.includes('dashboard_cc_bleeding_days'), 'no bleeding data: no strips, no legend entry, normal height');
  const stripped = cdPanel._renderCycleCompare(cdState({ bleeding_blocks: [[dayAt(-9), dayAt(-8), dayAt(-7)], [dayAt(-65), dayAt(-64)], [dayAt(-200)], [null, 5]] }));
  assert.ok(stripped.includes('viewBox="0 0 560 194"') && stripped.includes('height="194"'), 'room for the strips');
  assert.strictEqual((stripped.match(/y="181" width="[\d.]+" height="4"/g) || []).length, 3, 'three days of the first cycle');
  assert.strictEqual((stripped.match(/y="187" width="[\d.]+" height="4"/g) || []).length, 2, 'two days of the second cycle, a row lower');
  assert.strictEqual((stripped.match(/height="4" fill/g) || []).length, 6, '5 strips and the legend key: a block outside both cycles and junk values draw nothing');
  assert.ok(stripped.includes('dashboard_cc_bleeding_days'), 'the legend names the strips');
  const stripXs = [...stripped.matchAll(/<rect x="([\d.]+)" y="181"/g)].map((m) => Number(m[1]));
  assert.ok(stripXs[0] < stripXs[1] && stripXs[1] < stripXs[2], 'one strip per cycle day, left to right');
  assert.ok(stripXs[0] < 38 && stripXs[1] > 38, 'a strip is centred on its cycle day: day 1 starts left of the axis (x 38)');
  const outside = cdPanel._renderCycleCompare(cdState({ bleeding_blocks: [[dayAt(-200)]] }));
  assert.ok(outside.includes('viewBox="0 0 560 180"'), 'no day inside the cycles: no extra height');
  cdPanel._compare = { a: dayAt(-9), b: dayAt(-65), metric: 'pain' };
  const saved = [];
  const realSetItem = localStorage.setItem;
  localStorage.setItem = (key, value) => saved.push([key, value]);
  ccPick('cc-metric', 'temp');
  ccPick('cc-b', dayAt(-37));
  assert.deepStrictEqual(JSON.parse(saved.at(-1)[1]), { a: dayAt(-9), b: dayAt(-37), metric: 'temp' }, 'the choice is stored per profile');
  assert.strictEqual(saved.at(-1)[0], `menstruation_cycle_compare.${cdPanel._activeProfile}`, 'one entry per profile');
  const storeBefore = localStorage.getItem;
  localStorage.getItem = (key) => (key === `menstruation_cycle_compare.${cdPanel._activeProfile}` ? saved.at(-1)[1] : null);
  cdPanel._compare = { a: '', b: '', metric: '' };
  cdPanel._compareProfile = null;
  cdPanel._renderCycleCompare(cdState());
  assert.deepStrictEqual(cdPanel._compare, { a: dayAt(-9), b: dayAt(-37), metric: 'temp', valuesOnly: false }, 'a new session starts with the last choice');
  localStorage.getItem = () => { throw new Error('blocked'); };
  cdPanel._compareProfile = null;
  assert.doesNotThrow(() => cdPanel._renderCycleCompare(cdState()), 'blocked storage does not break the card');
  localStorage.setItem = () => { throw new Error('blocked'); };
  assert.doesNotThrow(() => ccPick('cc-metric', 'temp'));
  localStorage.getItem = storeBefore;
  localStorage.setItem = realSetItem;
  cdPanel._compare = { a: '', b: '', metric: '' };
  // sharing: share sheet where there is one, clipboard otherwise, a cancelled sheet is no error
  assert.ok(wrHtml.includes('data-action="week-share"') && !cdPanel._renderWeekReview(cdState({ symptom_history: [] })).includes('week-share'), 'no button for an empty week');
  const realNavigator = global.navigator;
  const setNavigator = (value) => Object.defineProperty(global, 'navigator', { value, configurable: true });
  let shared = null;
  setNavigator({ language: 'en', share: async (data) => { shared = data; } });
  await cdPanel._shareWeekReview();
  assert.ok(shared.text.startsWith('dashboard_widget_week_review\ndashboard_wr_days: '), 'title, then one line per row');
  assert.strictEqual(shared.text.split('\n').length, 4, 'title, days, strength, most often');
  let copied = null;
  setNavigator({ language: 'en', clipboard: { writeText: async (text) => { copied = text; } } });
  await cdPanel._shareWeekReview();
  assert.strictEqual(copied, shared.text, 'same text on the clipboard');
  assert.strictEqual(cdPanel._message, 'dashboard_wr_copied');
  cdPanel._message = '';
  setNavigator({ language: 'en', share: async () => { const err = new Error('x'); err.name = 'AbortError'; throw err; } });
  await cdPanel._shareWeekReview();
  assert.strictEqual(cdPanel._message, '', 'cancelling the share sheet says nothing');
  setNavigator({ language: 'en', clipboard: { writeText: async () => { throw new Error('denied'); } } });
  await cdPanel._shareWeekReview();
  assert.strictEqual(cdPanel._message, 'dashboard_wr_copy_failed');
  setNavigator(realNavigator);

  // ---- Teen design: pre/early menarche or under 16 ----
  const teenPanel = await freshPanel();
  const teenOf = (attributes) => teenPanel._resolveMode({ attributes });
  assert.strictEqual(teenOf({ age_at_tracking: 12 }), 'young', 'under 16: the young profile');
  assert.strictEqual(teenOf({ age_at_tracking: 0 }), 'young');
  assert.strictEqual(teenOf({ age_at_tracking: 15 }), 'young');
  assert.strictEqual(teenOf({ age_at_tracking: 16 }), 'general', '16 is not under 16');
  assert.strictEqual(teenOf({ age_at_tracking: null }), 'general', 'no age: no teen design (null is not 0)');
  assert.strictEqual(teenOf({}), 'general');
  assert.strictEqual(teenOf({ age_at_tracking: '12' }), 'general', 'only a real number counts');
  assert.strictEqual(teenOf({ age_at_tracking: -1 }), 'general');
  assert.strictEqual(teenOf({ onboarding_stage: 'early_menarche', age_at_tracking: 30 }), 'young', 'the menarche phase counts at any age');
  assert.strictEqual(teenOf({ onboarding_stage: 'pre_menarche' }), 'young');
  assert.strictEqual(teenPanel._normalizePrefs(null, 'a', 'young').widgetVisibility.calendar_card, true, 'the calendar is one of the few cards');
  const teenAttrs = {};
  teenPanel.setAttribute = (k, v) => { teenAttrs[k] = v; };
  teenPanel.removeAttribute = (k) => { delete teenAttrs[k]; };
  teenPanel.style = { setProperty() {}, removeProperty() {} };
  teenPanel._activeMode = 'young';
  teenPanel._applyLook(teenPanel._look());
  assert.ok('data-teen' in teenAttrs, 'the panel carries the teen design');
  teenPanel._activeMode = 'general';
  teenPanel._applyLook(teenPanel._look());
  assert.ok(!('data-teen' in teenAttrs), 'and loses it again');
  const teenRealT = teenPanel._t;
  teenPanel._t = (key) => (key === 'dashboard_teen_title_calendar_card' ? 'My calendar' : key === 'dashboard_toggle_widget_aria' ? 'Toggle {widget}' : teenRealT.call(teenPanel, key));
  const headTeen = (id) => { teenPanel._activeMode = 'young'; return teenPanel._widgetHeading(id, 'Normal title', false); };
  const calendarHead = headTeen('calendar_card');
  assert.ok(calendarHead.includes('class="sticker" aria-hidden="true">📅</span>'), 'a sticker in front, hidden from screen readers');
  assert.ok(calendarHead.includes('</span>My calendar</h2>') && !calendarHead.includes('Normal title'), 'the friendlier title replaces the normal one');
  assert.ok(calendarHead.includes('aria-label="Toggle My calendar"') && !/aria-label="[^"]*📅/.test(calendarHead), 'the label has the title but not the sticker');
  const plainHead = headTeen('anomaly_insights');
  assert.ok(!plainHead.includes('sticker') && plainHead.includes('Normal title'), 'no sticker and no new title for the other cards');
  teenPanel._activeMode = 'general';
  const adultHead = teenPanel._widgetHeading('calendar_card', 'Normal title', false);
  assert.ok(!adultHead.includes('sticker') && adultHead.includes('Normal title'), 'adults see nothing of it');
  teenPanel._editMode = true;
  teenPanel._activeMode = 'young';
  assert.strictEqual(teenPanel._widgetHeading('calendar_card', 'Normal title', false), '<h2>Normal title</h2>', 'the edit mode keeps the real names');
  teenPanel._editMode = false;
  teenPanel._t = teenRealT;

  // ---- View templates and the gallery of hidden cards ----
  const tp = await freshPanel();
  const tpClick = (action, data = {}) => tp._handleClick({ target: new ClickTarget({ action, ...data }) });
  tpClick('view-template', { template: 'travel' });
  assert.strictEqual(tp._prefs.views.length, 0, 'outside the edit mode nothing is added');
  tpClick('toggle-edit');
  ['doctor', 'travel', 'minimal'].forEach((key) => assert.ok(tp.shadowRoot.innerHTML.includes(`data-action="view-template" data-template="${key}"`), `template ${key} is offered`));
  tpClick('view-template', { template: 'travel' });
  const tpIds = ['kpi_strip', 'week_ahead', 'inventory_card', 'pill_card', 'timer_card'];
  assert.strictEqual(tp._editDraft.views.length, 2, 'a new view next to the standard one');
  assert.strictEqual(tp._editDraft.views[1].name, 'dashboard_tpl_travel', 'named after the template');
  assert.strictEqual(tp._editDraft.activeView, tp._editDraft.views[1].id, 'and shown right away');
  assert.deepStrictEqual(Object.keys(tp._editDraft.widgetVisibility).filter((id) => tp._editDraft.widgetVisibility[id]).sort(), [...tpIds].sort(), 'only the cards of the template are shown');
  assert.deepStrictEqual(tp._editDraft.widgetOrder.slice(0, 5), tpIds, 'in the order of the template');
  assert.strictEqual(new Set(tp._editDraft.widgetOrder).size, tp._editDraft.widgetOrder.length, 'no card twice');
  assert.ok(tp._editDraft.widgetOrder.includes('statistics_card'), 'the hidden ones are still in the order, for later');
  tpClick('view-switch', { view: 'default' });
  assert.strictEqual(tp._editDraft.widgetVisibility.statistics_card, true, 'the first view is untouched');
  assert.strictEqual(tp._addTemplateView(tp._editDraft, 'nonsense'), null);
  const tpCount = tp._editDraft.views.length;
  tpClick('view-template', { template: 'doctor' });
  tpClick('view-template', { template: 'minimal' });
  assert.strictEqual(tp._editDraft.views.length, tpCount + 2);
  assert.strictEqual(tp._editDraft.widgetVisibility.calendar_card, true);
  assert.strictEqual(tp._editDraft.widgetVisibility.week_ahead, false, 'minimal shows two cards');
  for (let i = 0; i < 10; i += 1) tpClick('view-template', { template: 'minimal' });
  assert.strictEqual(tp._editDraft.views.length, 8, 'at most eight views');
  assert.ok(!tp.shadowRoot.innerHTML.includes('data-action="view-template"'), 'no templates offered at eight');
  assert.deepStrictEqual(tp._normalizePrefs(JSON.parse(JSON.stringify(tp._editDraft)), 'a', 'general').views.map((view) => view.name), tp._editDraft.views.map((view) => view.name), 'templates survive saving');
  tpClick('cancel-edit');

  tpClick('toggle-edit');
  tpClick('widget-hide', { widget: 'kpi_strip' });
  tpClick('widget-hide', { widget: 'week_ahead' });
  const galleryHtml = tp.shadowRoot.innerHTML;
  assert.ok(galleryHtml.includes('gallery-tile" data-action="widget-show" data-widget="kpi_strip"') && galleryHtml.includes('data-widget="week_ahead"'), 'hidden cards are tiles');
  assert.ok(galleryHtml.includes('dashboard_widget_desc_kpi_strip') && galleryHtml.includes('dashboard_widget_desc_week_ahead'), 'with a line of explanation');
  const tile = (id) => galleryHtml.split('<button').find((part) => part.includes(`data-widget="${id}"`) && part.includes('gallery-tile'));
  assert.ok(tile('kpi_strip').includes('<circle cx="24"') && tile('week_ahead').includes('<rect x="15" y="6"'), 'and a picture fitting the kind of card');
  tpClick('widget-show', { widget: 'kpi_strip' });
  assert.ok(!tp.shadowRoot.innerHTML.includes('data-action="widget-show" data-widget="kpi_strip"'), 'a tap brings the card back');
  const enJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../custom_components/menstruation_cycle/www/translations/en.json'), 'utf8'));
  const defIds = [...fs.readFileSync(path.join(__dirname, '../custom_components/menstruation_cycle/www/menstruation-cycle-dashboard-panel.js'), 'utf8').matchAll(/\{ id: '([a-z_]+)', title: 'dashboard_widget_/g)].map((m) => m[1]);
  assert.ok(defIds.length >= 28);
  assert.deepStrictEqual(defIds.filter((id) => !enJson[`dashboard_widget_desc_${id}`]), [], 'every card has an explanation');
  tpClick('cancel-edit');

  // ---- Connection and loading banner ----
  const bp = await freshPanel();
  const bpState = () => painState({ profile: 'alice', cycle_day: 3 });
  bp._hass.states[bp._selectedEntityId] = bpState();
  assert.strictEqual(bp._renderStatusBanner(bpState()), '', 'nothing wrong: no banner');
  bp._hass.connected = false;
  assert.ok(bp._renderStatusBanner(bpState()).includes('role="alert"') && bp._renderStatusBanner(bpState()).includes('dashboard_offline'), 'no connection is announced');
  bp._hass.connected = true;
  let bpFail = true;
  const bpCalls = [];
  bp._hass.connection = { sendMessagePromise: async (msg) => { bpCalls.push(msg.service); if (bpFail) throw new Error('boom'); return { response: { symptom_history: [], product_usage: [] } }; } };
  await bp._fetchFullHistory(bp._selectedEntityId, 'alice', 's1');
  assert.ok(bp._historyErrors.has('alice'), 'a failed load is remembered');
  const failedBanner = bp._renderStatusBanner(bpState());
  assert.ok(failedBanner.includes('dashboard_history_failed') && failedBanner.includes('data-action="retry-history"'), 'and offered to try again');
  assert.ok(bp.shadowRoot.innerHTML.includes('class="status-banner"'), 'the banner is part of the page');
  bpCalls.length = 0;
  bp._handleClick({ target: new ClickTarget({ action: 'retry-history' }) });
  assert.ok(!bp._historyErrors.has('alice') && !bp._fullHistoryCache.alice, 'the retry forgets the failure');
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.ok(bpCalls.includes('get_full_history'), 'and loads again');
  assert.ok(bp._historyErrors.has('alice'), 'which fails again while the problem stays');
  bpFail = false;
  bp._handleClick({ target: new ClickTarget({ action: 'retry-history' }) });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.ok(!bp._historyErrors.has('alice') && bp._fullHistoryCache.alice, 'a successful load clears the banner');
  bp._historyErrors.add('alice');
  await bp._fetchFullHistory(bp._selectedEntityId, 'alice', 'newer-state');
  assert.ok(!bp._historyErrors.has('alice'), 'a later successful load (state changed) clears an old failure too');
  const realSend = bp._hass.connection.sendMessagePromise;
  bp._hass.connection.sendMessagePromise = async () => ({ response: {} });
  await bp._fetchFullHistory(bp._selectedEntityId, 'alice', 'newest-state');
  assert.ok(bp._historyErrors.has('alice'), 'an answer without a history counts as a failure as well');
  bp._hass.connection.sendMessagePromise = realSend;
  bp._refreshNow();
  assert.strictEqual(bp._historyErrors.size, 0, 'pull to refresh starts clean');
  bp._fullHistoryFetching.add('alice');
  const busyHtml = bp._renderWidget('pain_mood_trend', bpState(), false);
  assert.ok(busyHtml.includes('is-syncing') && busyHtml.includes('aria-busy="true"'), 'cards that read the history are marked while it loads');
  assert.ok(!bp._renderWidget('cycle_history', bpState(), false).includes('is-syncing'), 'the others are not');
  bp._fullHistoryFetching.delete('alice');
  bp._fullHistoryCache.alice = { symptom_history: [], product_usage: [], stamp: bpState().last_updated ?? null, days: bp._historyDays() };
  assert.ok(!bp._renderWidget('pain_mood_trend', bpState(), false).includes('aria-busy'), 'and not after it is loaded');

  // ---- Keyboard in the setup assistant ----
  const wz = await freshPanel();
  wz._handleClick({ target: new ClickTarget({ action: 'wizard-start' }) });
  assert.ok(wz._wizard, 'the assistant is open');
  const wzFocus = [];
  const wzFirst = { focus: () => wzFocus.push('first') };
  const wzLast = { focus: () => wzFocus.push('last') };
  const wzRealQuery = wz.shadowRoot.querySelector;
  const wzSelectors = [];
  wz.shadowRoot.querySelector = (sel) => { wzSelectors.push(sel); return { querySelectorAll: () => [wzFirst, wzLast] }; };
  wz.shadowRoot.activeElement = wzLast;
  const wzTab = { key: 'Tab', shiftKey: false, target: { dataset: {} }, preventDefault: () => {} };
  wz._handleKeydown(wzTab);
  assert.deepStrictEqual(wzFocus, ['first'], 'Tab on the last control goes round to the first');
  assert.ok(wzSelectors.some((sel) => sel.includes('wizard-backdrop')), 'the assistant is the dialog that traps the focus');
  wz.shadowRoot.querySelector = wzRealQuery;
  let wzPrevented = false;
  wz._handleKeydown({ key: 'Escape', target: { dataset: {} }, preventDefault: () => { wzPrevented = true; } });
  assert.ok(wzPrevented && wz._wizard === null, 'Escape leaves the assistant like "Skip"');
  assert.strictEqual(wz._prefs.onboarded, true, 'and it does not start again');
  global.window.MenstruationFunctions = realFunctionsCd;
  assert.strictEqual(hsPanel._normalizePrefs(null, 'a', 'general').widgetVisibility.history_search, true);
  assert.strictEqual(hsPanel._normalizePrefs(null, 'a', 'young').widgetVisibility.history_search, false);

  // ---- Round 7: frequent options as chips, loading bar, scroll position ----
  {
    const realFns = global.window.MenstruationFunctions;
    global.window.MenstruationFunctions = {
      getSymptomConfig: () => [
        { key: 'pain', multi: true, options: ['cramps', 'headache', 'back', 'o4', 'o5', 'o6', 'o7', 'o8'] },
        { key: 'mood', options: ['good', 'bad'] },
        { key: 'contraception_method', options: ['pill'] },
      ],
      normalizeOptionKey: (v) => v, renderOptionIcon: () => '', renderCategoryIcon: () => '',
    };
    const daysBack = (n) => { const d = new Date(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}T12:00:00`); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    const hist = [];
    for (let i = 1; i <= 4; i += 1) hist.push({ date: daysBack(i), pain: ['headache'] });
    for (let i = 5; i <= 6; i += 1) hist.push({ date: daysBack(i), pain: ['cramps'] }); // only twice: not frequent
    for (let i = 7; i <= 9; i += 1) hist.push({ date: daysBack(i), mood: 'good' }); // single-select field, exactly 3
    for (let i = 10; i <= 14; i += 1) hist.push({ date: daysBack(i), contraception_method: 'pill' }); // never offered
    for (let i = 100; i <= 105; i += 1) hist.push({ date: daysBack(i), mood: 'bad' }); // older than 90 days
    const fqState = { ...makeState({ symptom_history: hist, grouped_starts: fiveStarts }), state: 'follicular' };
    const fq = await freshPanel();
    fq._quickLogOpen = true;
    fq._quickLogSelections = {};
    const found = fq._frequentOptions(fqState, global.window.MenstruationFunctions.getSymptomConfig()).map((i) => `${i.cat.key}:${i.opt}`);
    assert.deepStrictEqual(found, ['pain:headache', 'mood:good'], 'most often first; under 3 times, the pill and older than 90 days are left out');
    const fqHtml = fq._renderQuickLogModal(fqState);
    assert.ok(fqHtml.includes('sym-frequent') && /sym-frequent[\s\S]*?data-action="quick-log-toggle-multi" data-key="pain" data-val="headache"/.test(fqHtml), 'chips sit on top of the dialog');
    assert.ok(/sym-frequent[\s\S]*?data-action="quick-log-select" data-key="mood" data-val="good"/.test(fqHtml), 'single-select options keep their own action');
    fq._quickLogCategorySearch = 'mood';
    assert.ok(!fq._renderQuickLogModal(fqState).includes('sym-frequent'), 'no chips while searching');
    fq._quickLogCategorySearch = '';
    fq._handleClick({ target: new ClickTarget({ action: 'quick-log-toggle-multi', key: 'pain', val: 'headache' }) });
    assert.deepStrictEqual(fq._quickLogSelections.pain, ['headache'], 'a tap on the chip selects it');
    assert.ok(/sym-frequent[\s\S]*?sym-selected" data-action="quick-log-toggle-multi" data-key="pain" data-val="headache" aria-pressed="true"/.test(fq._renderQuickLogModal(fqState)), 'and the chip shows it');
    const many = [];
    ['cramps', 'headache', 'back', 'o4', 'o5', 'o6', 'o7', 'o8'].forEach((opt) => { for (let i = 1; i <= 3; i += 1) many.push({ date: daysBack(i), pain: [opt] }); });
    assert.strictEqual(fq._frequentOptions({ ...fqState, attributes: { ...fqState.attributes, symptom_history: many } }, global.window.MenstruationFunctions.getSymptomConfig()).length, 6, 'at most six chips');
    global.window.MenstruationFunctions = realFns;

    // loading bar
    const lb = await freshPanel();
    const lbState = lb._hass.states[lb._selectedEntityId];
    assert.strictEqual(lb._renderLoadBar(lbState), '', 'nothing while idle');
    lb._fullHistoryFetching.add(lb._historyKey(lbState));
    assert.ok(/role="progressbar" aria-busy="true"/.test(lb._renderLoadBar(lbState)), 'a bar while the history loads');
    lb._editMode = true;
    assert.strictEqual(lb._renderLoadBar(lbState), '', 'not in the edit mode');
    lb._editMode = false;
    lb._hass.connected = false;
    assert.strictEqual(lb._renderLoadBar(lbState), '', 'not without a connection (the notice says so)');
    lb._hass.connected = true;
    lb._fullHistoryFetching.clear();

    // scroll position per profile and view
    const sp = await freshPanel();
    const timers = [];
    const realST = global.setTimeout;
    global.setTimeout = (fn, ms) => { timers.push([fn, ms]); return timers.length; };
    const scrolls = [];
    let pageHeight = 1000;
    global.window.scrollTo = (x, y) => { scrolls.push(y); global.window.scrollY = Math.min(y, pageHeight); };
    const runTimers = (ms) => timers.splice(0).filter(([, t]) => t === ms).forEach(([fn]) => fn());
    sp.shadowRoot.querySelector = () => ({});
    global.window.scrollY = 600;
    sp._rememberScroll();
    runTimers(300);
    const slot = sp._scrollSlot();
    assert.strictEqual(Number(storage.get(sp._scrollKey(slot))), 600, 'position saved for profile+view');
    global.window.scrollY = 20;
    sp._rememberScroll();
    runTimers(300);
    assert.ok(!storage.has(sp._scrollKey(slot)), 'near the top: nothing to remember');
    global.window.scrollY = 600;
    sp._rememberScroll();
    runTimers(300);
    sp._editMode = true;
    global.window.scrollY = 900;
    sp._rememberScroll();
    runTimers(300);
    assert.strictEqual(Number(storage.get(sp._scrollKey(slot))), 600, 'edit mode does not overwrite it');
    sp._editMode = false;

    const savedScroll = storage.get(sp._scrollKey(slot));
    const sp2 = await freshPanel(); // new page load (freshPanel empties the storage, so put the memory back)
    storage.set(sp._scrollKey(slot), savedScroll);
    sp2.shadowRoot.querySelector = () => ({});
    sp2._scrollSlotDone = null;
    pageHeight = 100; // cards still loading: the page is short
    global.window.scrollY = 0;
    scrolls.length = 0;
    sp2._restoreScroll();
    assert.deepStrictEqual(scrolls, [600], 'goes back to the remembered position');
    assert.strictEqual(sp2._scrollRestoring, true, 'not remembered while restoring');
    pageHeight = 1000; // cards arrived
    runTimers(500);
    assert.deepStrictEqual(scrolls, [600, 600], 'tries again when the page was too short');
    assert.strictEqual(global.window.scrollY, 600);
    assert.strictEqual(sp2._scrollRestoring, false, 'done once it is there');
    scrolls.length = 0;
    sp2._restoreScroll();
    assert.deepStrictEqual(scrolls, [], 'only once per profile and view');
    // user scrolls on their own while the page was short: no second attempt
    sp2._scrollSlotDone = null;
    pageHeight = 100;
    sp2._restoreScroll();
    global.window.scrollY = 50;
    pageHeight = 1000;
    scrolls.length = 0;
    runTimers(500);
    assert.deepStrictEqual(scrolls, [], 'the page is not pulled away from a user who scrolled');
    assert.strictEqual(sp2._scrollRestoring, false);
    // another view without a memory starts at the top; the very first load without memory does nothing
    storage.delete(sp._scrollKey(slot));
    sp2._scrollSlotDone = 'other|view';
    scrolls.length = 0;
    sp2._restoreScroll();
    assert.deepStrictEqual(scrolls, [0], 'switching to a view without memory scrolls to the top');
    assert.notStrictEqual(sp2._scrollKey(slot), sp2._scrollKey('other|view'), 'each profile and view has its own entry');
    storage.set(sp2._scrollKey(sp2._scrollSlot()), 'abc');
    sp2._scrollSlotDone = 'other|view';
    scrolls.length = 0;
    sp2._restoreScroll();
    assert.deepStrictEqual(scrolls, [0], 'a stored value that is no number counts as no memory');
    // restoring in progress: the scroll events it causes are not remembered
    storage.set(sp._scrollKey(slot), savedScroll);
    sp2._scrollRestoring = true;
    global.window.scrollY = 123;
    sp2._rememberScroll();
    sp2._scrollRestoring = false; // the restore finishes after the timer was set: the timer must still check
    sp2._scrollRestoring = true;
    runTimers(300);
    assert.strictEqual(storage.get(sp._scrollKey(slot)), savedScroll, 'nothing is written while restoring');
    sp2._scrollRestoring = false;
    // edit mode: the page is not moved
    sp2._editMode = true;
    sp2._scrollSlotDone = null;
    scrolls.length = 0;
    sp2._restoreScroll();
    assert.deepStrictEqual(scrolls, [], 'no restoring in the edit mode');
    sp2._editMode = false;
    const sp3 = await freshPanel();
    sp3.shadowRoot.querySelector = () => ({});
    sp3._scrollSlotDone = null;
    scrolls.length = 0;
    sp3._restoreScroll();
    assert.deepStrictEqual(scrolls, [], 'first load without memory: leave the scroll position alone');
    global.setTimeout = realST;
    delete global.window.scrollTo;
    delete global.window.scrollY;
  }

  console.log('All extended dashboard edit mode tests passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
