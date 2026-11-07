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
  const fakeCheckbox = Object.assign(new ClickTarget({ widgetVisibility: 'progress_badges' }), { checked: false });
  panelToggle._handleChange({ target: fakeCheckbox });
  assert.strictEqual(panelToggle._editDraft.widgetVisibility.progress_badges, false, 'toggle in edit mode updates draft');
  assert.strictEqual(panelToggle._prefs.widgetVisibility.progress_badges, true, 'toggle in edit mode does not affect prefs immediately');

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

  console.log('All extended dashboard edit mode tests passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
