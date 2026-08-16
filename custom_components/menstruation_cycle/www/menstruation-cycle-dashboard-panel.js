(() => {
  const PANEL_FALLBACK_EN = {
    save: 'Save',
    saving: 'Saving…',
    cancel: 'Cancel',
    none: 'None',
    unknown: 'Unknown',
    friendly_name: 'Friendly Name',
    onboarding_stage: 'Onboarding stage',
    cycle_day: 'Cycle Day',
    days_until_menarche: 'Days until menarche',
    dashboard_days_until_next: 'Days until next period',
    bleeding_strength: 'Bleeding',
    bleeding_none: 'None',
    bleeding_light: 'Light',
    bleeding_medium: 'Medium',
    bleeding_heavy: 'Heavy',
    pain: 'Pain',
    mood: 'Mood',
    notes: 'Notes',
    opt_cramps: 'Cramps',
    opt_headache: 'Headache',
    opt_lower_back: 'Lower Back',
    period_forecast_window: 'Window',
    period_forecast_confidence: 'Confidence',
    symptom_saved: 'Saved',
    symptom_save_error: 'Save failed',
    progress_empty_state: 'No progress',
    progress_section_title: 'Progress',
    ygs_rem_kit_check: 'Kit',
    ygs_rem_drink_water: 'Water',
    ygs_rem_rest_cue: 'Rest',
    dashboard_page_title: 'Cycle Dashboard',
    dashboard_entity_picker_aria: 'Select profile',
    dashboard_edit_mode: 'Edit dashboard',
    dashboard_done: 'Done',
    dashboard_discreet_mode: 'Discreet mode',
    dashboard_reset_preset: 'Reset to mode preset',
    dashboard_widget_quick_log: 'Quick Log',
    dashboard_widget_today_status: 'Today Status',
    dashboard_widget_upcoming_window: 'Upcoming Window',
    dashboard_widget_gauge_card: 'Gauge',
    dashboard_widget_calendar_card: 'Calendar',
    dashboard_widget_statistics_card: 'Statistics',
    dashboard_widget_cycle_history: 'Cycle History',
    dashboard_widget_pregnancy_prediction: 'Pregnancy Prediction',
    dashboard_not_enough_data: 'Not enough data yet.',
    dashboard_prediction_disclaimer: 'Estimation only — not medical advice.',
    dashboard_cycle_history_avg: 'Average',
    dashboard_cycle_history_length: 'Length (days)',
    dashboard_cycle_history_outlier: 'Outlier',
    dashboard_fertility_window: 'Fertile window',
    dashboard_fertility_ovulation: 'Est. ovulation',
    dashboard_fertility_confidence: 'Confidence',
    dashboard_today: 'Today',
    dashboard_widget_reminders: 'Reminders Summary',
    dashboard_widget_progress: 'Progress & Badges',
    dashboard_widget_my_info: 'My Info',
    dashboard_no_entity_selected: 'No profile selected.',
    dashboard_component_unavailable: 'Card component not loaded.',
    dashboard_label_state: 'State',
    dashboard_neutral_state: 'Current status',
    dashboard_discreet_note: 'Discreet mode note',
    dashboard_quick_log_note: 'Quick log note',
    dashboard_reminders_hint: 'Reminder hint',
    dashboard_not_set: 'Not set',
    dashboard_pronouns: 'Pronouns',
    dashboard_quick_log_no_changes: 'No changes',
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
    dashboard_widget_phase_donut: 'Phase Distribution',
    dashboard_widget_basal_temp: 'Basal Temperature',
    dashboard_widget_symptom_heatmap: 'Symptom Heat Grid',
    dashboard_widget_anomaly_insights: 'Anomaly Insights',
    dashboard_widget_pain_mood_trend: 'Pain & Mood Trend',
    dashboard_widget_year_overview: 'Year Overview',
    dashboard_phase_donut_title: 'Typical phase distribution',
    dashboard_basal_temp_unit: '°C',
    dashboard_basal_temp_no_data: 'No temperature data recorded.',
    dashboard_anomaly_regular: 'Regular cycle',
    dashboard_anomaly_irregular: 'Irregular pattern detected',
    dashboard_anomaly_short_cycle: 'Short cycle',
    dashboard_anomaly_long_cycle: 'Long cycle',
    dashboard_anomaly_consistency: 'Consistency',
    dashboard_pain_no_data: 'No symptom data available.',
    dashboard_year_overview_title: 'Year at a glance',
    severity_info: 'Info',
    severity_alert: 'Alert',
    phase_menstruation: 'Menstruation',
    phase_follicular: 'Follicular',
    phase_luteal: 'Luteal',
    dashboard_widget_fetal_development: 'Fetal Development',
    dashboard_fetal_size_label: 'Size comparison',
    dashboard_menarche_estimate_from: 'Estimate based on',
    dashboard_menarche_estimate_generic: 'Rough estimate — becomes more precise once dated signs are logged',
    dashboard_menarche_estimate_age: 'Very rough estimate based on age — becomes more precise once signs are logged',
    dashboard_age_label: 'Age',
    dashboard_birth_date_hint: 'Add a birth date in the integration settings to show age and improve the pre-menarche estimate.',
    dashboard_high_risk_pregnancy: 'High-risk pregnancy',
    dashboard_high_risk_monitoring: 'Closer monitoring recommended',
    dashboard_high_risk_milestone_note: 'High-risk pregnancies usually involve additional, individually scheduled check-ups beyond the standard ones above — please coordinate with your care provider.',
    pregnancy_risk_notes: 'Notes',
    nfp_analysis: 'NFP',
    temperature_rise_day: 'Temperature rise',
    legend_cervix_peak: 'Cervical mucus peak detected',
    dashboard_week_unit: 'Week',
    dashboard_due_date_short: 'Due',
    trimester_1: '1st Trimester',
    trimester_2: '2nd Trimester',
    trimester_3: '3rd Trimester',
    height_spurt: 'growth spurt',
    breast: 'breast development',
    pubic_hair: 'pubic hair',
    milestone_heartbeat: 'Heartbeat audible',
    milestone_first_trimester_screening: 'First-trimester screening',
    milestone_organ_screening: 'Organ screening',
    milestone_viability: 'Viability threshold',
    milestone_third_trimester: '3rd trimester begins',
    milestone_position_check: 'Position check',
    milestone_due_date: 'Due date',
    menarche_sign_height_spurt: 'Growth spurt',
    menarche_sign_breast: 'Physical changes',
    menarche_sign_pubic_hair: 'Further physical maturity signs',
    menarche_sign_discharge: 'First observed discharge',
    menarche_sign_mood: 'Mood changes',
    menarche_sign_acne: 'Skin changes',
    menarche_sign_body_odor: 'Body odor changes',
    fetal_size_5: 'Poppy seed',
    fetal_skill_5_1: 'Heart begins to form',
    fetal_skill_5_2: 'Neural tube develops',
    fetal_size_7: 'Blueberry',
    fetal_skill_7_1: 'Heartbeat measurable',
    fetal_skill_7_2: 'Arm and leg buds form',
    fetal_size_9: 'Raspberry',
    fetal_skill_9_1: 'Finger and toe buds visible',
    fetal_skill_9_2: 'First movements (not yet felt)',
    fetal_size_11: 'Lime',
    fetal_skill_11_1: 'All major organs formed',
    fetal_skill_11_2: 'Can make a fist',
    fetal_size_13: 'Peach',
    fetal_skill_13_1: 'Reflexes developing',
    fetal_skill_13_2: 'Fingernails begin to grow',
    fetal_size_15: 'Apple',
    fetal_skill_15_1: 'Can frown and grimace',
    fetal_skill_15_2: 'Hears first muffled sounds',
    fetal_size_17: 'Avocado',
    fetal_skill_17_1: 'Practices sucking and swallowing',
    fetal_skill_17_2: 'Skeleton continues to harden',
    fetal_size_19: 'Sweet potato',
    fetal_skill_19_1: 'Movements often first felt',
    fetal_skill_19_2: 'Develops sleep-wake rhythm',
    fetal_size_21: 'Banana',
    fetal_skill_21_1: 'Responds to sounds from outside',
    fetal_skill_21_2: 'Eyelashes and eyebrows visible',
    fetal_size_23: 'Papaya',
    fetal_skill_23_1: 'Facial features clearly recognizable',
    fetal_skill_23_2: 'Practices breathing movements (still without air)',
    fetal_size_25: 'Eggplant',
    fetal_skill_25_1: 'Responds to light',
    fetal_skill_25_2: 'Fat layers begin to form',
    fetal_size_27: 'Cauliflower',
    fetal_skill_27_1: 'Eyes open occasionally',
    fetal_skill_27_2: 'Can have hiccups',
    fetal_size_29: 'Butternut squash',
    fetal_skill_29_1: 'Brain developing rapidly',
    fetal_skill_29_2: 'Responds more strongly to voices',
    fetal_size_31: 'Coconut',
    fetal_skill_31_1: 'Stronger, more coordinated movements',
    fetal_skill_31_2: 'Shows recognizable wake/sleep phases',
    fetal_size_33: 'Pineapple',
    fetal_skill_33_1: 'Bones continue to harden (except skull)',
    fetal_skill_33_2: 'Practices regular breathing',
    fetal_size_35: 'Honeydew melon',
    fetal_skill_35_1: 'Immune system continues to mature',
    fetal_skill_35_2: 'Usually turns head-down',
    fetal_size_37: 'Savoy cabbage',
    fetal_skill_37_1: 'Grasp reflex well developed',
    fetal_skill_37_2: 'Lungs approaching maturity',
    fetal_size_40: 'Pumpkin',
    fetal_skill_40_1: 'Considered full-term ("term" from week 39)',
    fetal_skill_40_2: 'Ready for birth',
    discharge: 'discharge',
  };
  const I18N_SCRIPT_PATH = '/menstruation_cycle/menstruation-i18n.js';
  const I18N_SCRIPT_SELECTOR = 'script[src]';
  let i18nScriptPromise = null;

  const ensureI18nState = () => {
    if (typeof window === 'undefined') {
      return {
        cache: { en: { ...PANEL_FALLBACK_EN } },
        loading: {},
        fallback: { en: { ...PANEL_FALLBACK_EN } },
      };
    }
    const i18n = window.menstruationCycleI18n || (window.menstruationCycleI18n = {});
    i18n.cache = i18n.cache || {};
    i18n.loading = i18n.loading || {};
    i18n.fallback = i18n.fallback || {};
    i18n.fallback.en = { ...PANEL_FALLBACK_EN, ...(i18n.fallback.en || {}) };
    i18n.cache.en = { ...(i18n.fallback.en || {}), ...(i18n.cache.en || {}) };
    return i18n;
  };

  const normalizeLang = (language) => {
    const normalized = String(language || 'en').toLowerCase();
    return normalized.startsWith('de') ? 'de' : 'en';
  };

  const listDocumentScripts = () => {
    if (typeof document === 'undefined') return [];
    if (typeof document.querySelectorAll === 'function') {
      return Array.from(document.querySelectorAll(I18N_SCRIPT_SELECTOR) || []);
    }
    return Array.from(document.scripts || []);
  };

  const matchesScriptPath = (script, scriptPath) => {
    const source = script?.getAttribute?.('src') || script?.src || '';
    return source.includes(scriptPath);
  };

  const extractResourceVersion = () => {
    const scripts = listDocumentScripts();
    for (const script of scripts) {
      const source = script?.getAttribute?.('src') || script?.src || '';
      if (!source.includes('/menstruation_cycle/')) continue;
      try {
        const url = new URL(source, typeof window !== 'undefined' ? window.location?.origin || 'http://localhost' : 'http://localhost');
        const version = url.searchParams.get('v');
        if (version) return version;
      } catch (_error) {
        const match = source.match(/[?&]v=([^&#]+)/);
        if (match?.[1]) return match[1];
      }
    }
    return null;
  };

  const WIDGET_DEFS = [
    { id: 'kpi_strip', title: 'dashboard_widget_today_status', sensitive: false, span: 12 },
    { id: 'phase_timeline', title: 'dashboard_widget_today_status', sensitive: false, span: 12 },
    { id: 'pregnancy_prediction', title: 'dashboard_widget_pregnancy_prediction', sensitive: false, span: 5 },
    { id: 'basal_temp', title: 'dashboard_widget_basal_temp', sensitive: false, span: 7 },
    { id: 'phase_donut', title: 'dashboard_widget_phase_donut', sensitive: false, span: 5 },
    { id: 'cycle_history', title: 'dashboard_widget_cycle_history', sensitive: false, span: 7 },
    { id: 'calendar_card', title: 'dashboard_widget_calendar_card', sensitive: false, span: 12 },
    { id: 'symptom_heatmap', title: 'dashboard_widget_symptom_heatmap', sensitive: false, span: 6 },
    { id: 'anomaly_insights', title: 'dashboard_widget_anomaly_insights', sensitive: false, span: 6 },
    { id: 'pain_mood_trend', title: 'dashboard_widget_pain_mood_trend', sensitive: false, span: 12 },
    { id: 'year_overview', title: 'dashboard_widget_year_overview', sensitive: false, span: 12 },
    { id: 'fetal_development', title: 'dashboard_widget_fetal_development', sensitive: false, span: 12 },
  ];

  // Default widget order matches the approved mockup layout exactly
  const WIDGET_IDS_GRAPH_FIRST = [
    'kpi_strip',
    'phase_timeline',
    'pregnancy_prediction',
    'basal_temp',
    'phase_donut',
    'cycle_history',
    'calendar_card',
    'symptom_heatmap',
    'anomaly_insights',
    'pain_mood_trend',
    'year_overview',
  ];

  const WIDGET_IDS = WIDGET_DEFS.map((widget) => widget.id);

  const PRESETS = {
    young: {
      discreetMode: true,
      widgetOrder: WIDGET_IDS_GRAPH_FIRST,
      widgetVisibility: {
        kpi_strip: true,
        phase_timeline: true,
        pregnancy_prediction: false,
        cycle_history: false,
        phase_donut: true,
        basal_temp: false,
        calendar_card: false,
        symptom_heatmap: false,
        anomaly_insights: false,
        pain_mood_trend: false,
        year_overview: false,
      },
      myInfo: {
        displayName: '',
        pronouns: '',
      },
    },
    general: {
      discreetMode: false,
      widgetOrder: WIDGET_IDS_GRAPH_FIRST,
      widgetVisibility: {
        kpi_strip: true,
        phase_timeline: true,
        pregnancy_prediction: true,
        cycle_history: true,
        phase_donut: true,
        basal_temp: true,
        calendar_card: true,
        symptom_heatmap: true,
        anomaly_insights: true,
        pain_mood_trend: true,
        year_overview: true,
      },
      myInfo: {
        displayName: '',
        pronouns: '',
      },
    },
  };

  // General pregnancy-education milestones by week — original wording, illustrative only, not medical advice.
  const FETAL_DEVELOPMENT_STAGES = [
    { maxWeek: 5, sizeKey: 'fetal_size_5', skillKeys: ['fetal_skill_5_1', 'fetal_skill_5_2'] },
    { maxWeek: 7, sizeKey: 'fetal_size_7', skillKeys: ['fetal_skill_7_1', 'fetal_skill_7_2'] },
    { maxWeek: 9, sizeKey: 'fetal_size_9', skillKeys: ['fetal_skill_9_1', 'fetal_skill_9_2'] },
    { maxWeek: 11, sizeKey: 'fetal_size_11', skillKeys: ['fetal_skill_11_1', 'fetal_skill_11_2'] },
    { maxWeek: 13, sizeKey: 'fetal_size_13', skillKeys: ['fetal_skill_13_1', 'fetal_skill_13_2'] },
    { maxWeek: 15, sizeKey: 'fetal_size_15', skillKeys: ['fetal_skill_15_1', 'fetal_skill_15_2'] },
    { maxWeek: 17, sizeKey: 'fetal_size_17', skillKeys: ['fetal_skill_17_1', 'fetal_skill_17_2'] },
    { maxWeek: 19, sizeKey: 'fetal_size_19', skillKeys: ['fetal_skill_19_1', 'fetal_skill_19_2'] },
    { maxWeek: 21, sizeKey: 'fetal_size_21', skillKeys: ['fetal_skill_21_1', 'fetal_skill_21_2'] },
    { maxWeek: 23, sizeKey: 'fetal_size_23', skillKeys: ['fetal_skill_23_1', 'fetal_skill_23_2'] },
    { maxWeek: 25, sizeKey: 'fetal_size_25', skillKeys: ['fetal_skill_25_1', 'fetal_skill_25_2'] },
    { maxWeek: 27, sizeKey: 'fetal_size_27', skillKeys: ['fetal_skill_27_1', 'fetal_skill_27_2'] },
    { maxWeek: 29, sizeKey: 'fetal_size_29', skillKeys: ['fetal_skill_29_1', 'fetal_skill_29_2'] },
    { maxWeek: 31, sizeKey: 'fetal_size_31', skillKeys: ['fetal_skill_31_1', 'fetal_skill_31_2'] },
    { maxWeek: 33, sizeKey: 'fetal_size_33', skillKeys: ['fetal_skill_33_1', 'fetal_skill_33_2'] },
    { maxWeek: 35, sizeKey: 'fetal_size_35', skillKeys: ['fetal_skill_35_1', 'fetal_skill_35_2'] },
    { maxWeek: 37, sizeKey: 'fetal_size_37', skillKeys: ['fetal_skill_37_1', 'fetal_skill_37_2'] },
    { maxWeek: 40, sizeKey: 'fetal_size_40', skillKeys: ['fetal_skill_40_1', 'fetal_skill_40_2'] },
  ];

  // Reads a single pre-menarche sign entry in either the legacy plain-string format
  // (just the stage) or the current {stage, logged_at, updated_at} format.
  const _normalizeSignEntry = (raw) => {
    if (raw == null || raw === '' || raw === 'none') return null;
    if (typeof raw === 'object') {
      const stage = raw.stage ?? null;
      if (stage == null || stage === '' || stage === 'none') return null;
      return { stage: String(stage), loggedAt: raw.logged_at || raw.updated_at || null };
    }
    // Legacy: plain string stage, no date available.
    return { stage: String(raw), loggedAt: null };
  };

  // Typical (widely-known, general) lead time from a sign's onset to menarche, used only
  // when we have a real logged_at date for that sign. Ordered by how proximate/reliable
  // the signal is — discharge is the closest predictor, breast/pubic hair the least.
  // These are illustrative averages with wide individual variation, not a diagnosis.
  const MENARCHE_OFFSET_DAYS = {
    discharge: 270,      // ~9 months (typical range ~6-12 months before menarche)
    height_spurt: 365,   // ~12 months (growth spurt peak typically precedes menarche by ~1 year)
    breast: 640,         // ~21 months (thelarche typically precedes menarche by ~2 years)
    pubic_hair: 610,      // ~20 months
  };
  const MENARCHE_SIGN_PRIORITY = ['discharge', 'height_spurt', 'breast', 'pubic_hair'];

  /**
   * Builds a dynamic menarche estimate from whichever logged, dated sign is most
   * proximate/reliable. Returns null if no dated signs are available yet.
   */
  const _estimateMenarcheFromSigns = (signs) => {
    for (const key of MENARCHE_SIGN_PRIORITY) {
      const entry = _normalizeSignEntry(signs[key]);
      if (!entry || !entry.loggedAt) continue;
      if (key === 'height_spurt' && !['moderate', 'significant'].includes(entry.stage)) continue;
      const anchor = new Date(entry.loggedAt);
      if (Number.isNaN(anchor.getTime())) continue;
      const estimated = new Date(anchor.getTime() + MENARCHE_OFFSET_DAYS[key] * 86400000);
      return { anchorDate: entry.loggedAt, estimatedDate: estimated, sourceSign: key };
    }
    return null;
  };

  const _fetalStageForWeek = (week) => {
    const w = Math.max(4, Math.min(40, Math.round(week)));
    return FETAL_DEVELOPMENT_STAGES.find((s) => w <= s.maxWeek) || FETAL_DEVELOPMENT_STAGES[FETAL_DEVELOPMENT_STAGES.length - 1];
  };

  // Maps a pregnancy week (1-40) onto the matching pregnancy month (preg_01.svg = month 1,
  // ... preg_09.svg = month 9), using standard 4-week pregnancy months. Weeks 37-40 stay
  // clamped to month 9 (full term).
  const _pregnancyAssetIndex = (week) => {
    const w = Math.max(1, Math.min(40, week));
    const month = Math.min(9, Math.max(1, Math.ceil(w / 4)));
    return String(month).padStart(2, '0');
  };

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  /**
   * Safe JSON.parse wrapper that never throws to the UI runtime.
   * - Returns `fallback` for null, undefined, or non-string inputs that are not plain objects/arrays.
   * - Returns the input unchanged when it is already an object or array.
   * - Catches parse errors, logs a warning, and returns `fallback`.
   * @param {*} value - The value to parse.
   * @param {*} [fallback=null] - Value returned on failure.
   * @returns {*} Parsed value or fallback.
   */
  const safeJsonParse = (value, fallback = null) => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return fallback;
    try {
      return JSON.parse(value);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[menstruation-cycle] safeJsonParse failed:', err.message);
      return fallback;
    }
  };

  /**
   * Normalize an arbitrary item object to a safe shape with title, url, and description.
   * Prevents crashes when fields such as html_url are missing or the item is null/undefined.
   * @param {*} item
   * @returns {{ title: string, url: string|null, description: string }}
   */
  const _normalizeItem = (item) => ({
    title: String(item?.title ?? item?.id ?? ''),
    url: item?.html_url ?? null,
    description: String(item?.description ?? ''),
  });

  class MenstruationCycleDashboardPanel extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._hass = null;
      this._lang = 'en';
      this._editMode = false;
      this._editDraft = null;
      this._prefs = null;
      this._activeProfile = 'default';
      this._activeMode = 'general';
      this._selectedEntityId = null;
      this._message = '';
      this._pending = false;
      this._quickLogScratch = { mood: '', note: '' };
      this._i18nLanguagePromises = {};
      this._lastRenderSig = null;
      this._debugEnabled = this._readDebugFlag();
      this._availableEntities = null;
      this._entitiesPromise = null;
      this._registryLoaded = false;
      // Single-flight scheduler state
      this._updateScheduled = false;
      this._updateRunning = false;
      // Incrementing version bumped on every prefs write, used in render signature
      this._prefsVersion = 0;
    }

    connectedCallback() {
      this.shadowRoot?.addEventListener('click', (event) => this._handleClick(event));
      this.shadowRoot?.addEventListener('change', (event) => this._handleChange(event));
      this.shadowRoot?.addEventListener('submit', (event) => this._handleSubmit(event));
    }

    set hass(hass) {
      this._hass = hass;
      this._requestUpdateFromHass();
    }

    /**
     * Lightweight scheduler: coalesces rapid hass ticks into a single _processUpdate() run.
     * Multiple calls while an update is already running are collapsed into one queued run.
     */
    _requestUpdateFromHass() {
      if (this._updateRunning) {
        // An update is in progress — mark that another pass is needed when it finishes.
        if (!this._updateScheduled) {
          this._updateScheduled = true;
          this._debug('update coalesced');
        }
        return;
      }
      if (this._updateScheduled) {
        // Already queued for the next microtask; nothing more to do.
        return;
      }
      this._updateScheduled = true;
      Promise.resolve().then(() => this._drainUpdateQueue());
    }

    _drainUpdateQueue() {
      this._updateScheduled = false;
      this._updateRunning = true;
      let chain = Promise.resolve();
      try {
        chain = this._processUpdate();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[menstruation-cycle] _processUpdate threw synchronously:', err);
      }
      Promise.resolve(chain)
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error('[menstruation-cycle] _processUpdate rejected:', err);
        })
        .finally(() => {
          this._updateRunning = false;
          if (this._updateScheduled) {
            // Another hass tick arrived while we were running — process once more.
            this._drainUpdateQueue();
          }
        });
    }

    async _processUpdate() {
      // 1. Detect language change and ensure i18n is loaded (cached after first load per lang).
      const newLang = this._detectLang();
      if (newLang !== this._lang) {
        this._lang = newLang;
        await this._loadI18nLanguageOnce(newLang).catch(() => null);
      }

      // 2. Trigger entity discovery once per component lifetime.
      if (!this._registryLoaded && !this._entitiesPromise) {
        this._entitiesPromise = this._loadEntitiesFromRegistry()
          .then((entities) => {
            this._availableEntities = entities;
            this._registryLoaded = true;
            this._entitiesPromise = null;
          })
          .catch((err) => {
            // eslint-disable-next-line no-console
            console.warn('[menstruation-cycle] Entity registry load failed, falling back to state scan:', err);
            this._availableEntities = this._getAvailableEntitiesFallback();
            this._registryLoaded = true;
            this._entitiesPromise = null;
          });
        // Wait for the first discovery to finish before proceeding.
        await this._entitiesPromise;
      }

      // 3. Stabilize entity selection (change only if current selection is invalid/missing).
      const available = this._availableEntities || this._getAvailableEntitiesFallback();
      const userId = this._hass?.user?.id;
      if (available.length > 0) {
        const currentStillValid = this._selectedEntityId && available.some((e) => e.entityId === this._selectedEntityId);
        if (!currentStillValid) {
          const savedEntityId = userId ? this._getSelectedEntity(userId) : null;
          const found = savedEntityId ? available.find((e) => e.entityId === savedEntityId) : null;
          const next = (found || available[0]).entityId;
          if (next !== this._selectedEntityId) {
            this._debug('selection changed (invalid -> fallback)', { before: this._selectedEntityId, after: next });
            this._selectedEntityId = next;
          }
        }
      } else if (this._selectedEntityId !== null) {
        this._debug('selection changed (invalid -> fallback)', { before: this._selectedEntityId, after: null });
        this._selectedEntityId = null;
      }

      // 4. Derive profile/mode/prefs from selected entity (no storage writes here).
      const stateObj = this._selectedEntityId ? (this._hass?.states?.[this._selectedEntityId] || null) : null;
      const newProfile = stateObj?.attributes?.profile || 'default';
      const newMode = this._resolveMode(stateObj);
      if (!this._prefs || this._prefs.__profile !== newProfile || this._prefs.__mode !== newMode) {
        this._activeProfile = newProfile;
        this._activeMode = newMode;
        this._prefs = this._loadPrefs(newProfile, newMode);
        this._prefsVersion++;
      }

      // 5. Compute canonical render signature and gate rendering.
      const nextSig = this._buildRenderSig(stateObj);
      if (nextSig === this._lastRenderSig) {
        this._debug('skip render (sig unchanged)');
        return;
      }
      const reason = this._describeSigChange(this._lastRenderSig, nextSig);
      this._debug(`render (sig changed: ${reason})`);
      this._lastRenderSig = nextSig;
      this.render();
    }

    _detectLang() {
      const language = this._hass?.locale?.language || this._hass?.language || navigator.language || 'en';
      return ensureI18nState().normalizeLang?.(language) || normalizeLang(language);
    }

    _getI18n() {
      return ensureI18nState();
    }

    _buildI18nScriptUrl() {
      const resourceVersion = extractResourceVersion();
      return resourceVersion ? `${I18N_SCRIPT_PATH}?v=${encodeURIComponent(resourceVersion)}` : I18N_SCRIPT_PATH;
    }

    _ensureI18nLoaded() {
      const i18n = this._getI18n();
      if (typeof i18n.load === 'function') return Promise.resolve(i18n);
      if (i18nScriptPromise) return i18nScriptPromise;
      if (typeof document === 'undefined') return Promise.resolve(i18n);

      const existingScript = listDocumentScripts().find((script) => matchesScriptPath(script, I18N_SCRIPT_PATH));
      const script = existingScript || document.createElement('script');
      if (!existingScript) {
        script.src = this._buildI18nScriptUrl();
        script.async = true;
        script.dataset.menstruationCycleI18n = 'true';
      }

      i18nScriptPromise = new Promise((resolve) => {
        let timeoutId = null;
        const finalize = () => {
          if (timeoutId) clearTimeout(timeoutId);
          script.removeEventListener?.('load', handleLoad);
          script.removeEventListener?.('error', handleDone);
          resolve(this._getI18n());
        };
        const handleLoad = () => finalize();
        const handleDone = () => finalize();

        if (typeof this._getI18n().load === 'function') {
          finalize();
          return;
        }

        timeoutId = setTimeout(handleDone, 4000);
        script.addEventListener?.('load', handleLoad, { once: true });
        script.addEventListener?.('error', handleDone, { once: true });

        if (!existingScript) {
          (document.head || document.body || document.documentElement)?.appendChild?.(script);
        }
      }).finally(() => {
        const latestI18n = this._getI18n();
        if (typeof latestI18n.load !== 'function') {
          i18nScriptPromise = null;
        }
      });

      return i18nScriptPromise;
    }

    _loadI18nLanguage(lang) {
      const i18n = this._getI18n();
      if (typeof i18n.load !== 'function') return Promise.resolve(i18n.cache?.[lang] || i18n.cache?.en || {});
      return i18n.load(lang).catch(() => i18n.cache?.[lang] || i18n.cache?.en || {});
    }

    _loadI18nLanguageOnce(lang) {
      if (!lang) return Promise.resolve();
      if (this._i18nLanguagePromises[lang]) return this._i18nLanguagePromises[lang];
      this._i18nLanguagePromises[lang] = this._ensureI18nLoaded()
        .then(() => this._loadI18nLanguage(lang))
        .catch(() => null);
      return this._i18nLanguagePromises[lang];
    }

    _buildSelectedEntitySignature(stateObj) {
      const attrs = stateObj?.attributes || {};
      const relevantAttrs = {
        profile: attrs.profile ?? null,
        entry_id: attrs.entry_id ?? null,
        friendly_name: attrs.friendly_name ?? null,
        onboarding_stage_effective: attrs.onboarding_stage_effective ?? null,
        onboarding_stage: attrs.onboarding_stage ?? null,
        cycle_day: attrs.cycle_day ?? null,
        days_until_next_start: attrs.days_until_next_start ?? null,
        next_predicted_start: attrs.next_predicted_start ?? null,
        period_forecast: attrs.period_forecast ?? null,
        progress_badges: attrs.progress_badges ?? null,
        average_cycle_length: attrs.average_cycle_length ?? null,
        cycle_length_avg: attrs.cycle_length_avg ?? null,
        prediction_gating: attrs.prediction_gating ?? null,
        current_phase: attrs.current_phase ?? null,
        phase_day: attrs.phase_day ?? null,
      };
      const signaturePayload = {
        entityId: this._selectedEntityId || null,
        state: stateObj?.state ?? null,
        attrs: relevantAttrs,
      };
      return JSON.stringify(signaturePayload);
    }

    /**
     * Canonical render signature covering all fields that affect what is rendered.
     * render() is called only when this value changes between scheduler runs.
     */
    _buildRenderSig(stateObj) {
      const attrs = stateObj?.attributes || {};
      const available = this._availableEntities || [];
      return JSON.stringify({
        lang: this._lang,
        selectedEntityId: this._selectedEntityId || null,
        entityState: stateObj?.state ?? null,
        entityAttrs: {
          profile: attrs.profile ?? null,
          entry_id: attrs.entry_id ?? null,
          friendly_name: attrs.friendly_name ?? null,
          onboarding_stage_effective: attrs.onboarding_stage_effective ?? null,
          onboarding_stage: attrs.onboarding_stage ?? null,
          cycle_day: attrs.cycle_day ?? null,
          days_until_next_start: attrs.days_until_next_start ?? null,
          next_predicted_start: attrs.next_predicted_start ?? null,
          period_forecast: attrs.period_forecast ?? null,
          progress_badges: attrs.progress_badges ?? null,
          average_cycle_length: attrs.average_cycle_length ?? null,
          cycle_length_avg: attrs.cycle_length_avg ?? null,
          prediction_gating: attrs.prediction_gating ?? null,
          current_phase: attrs.current_phase ?? null,
          phase_day: attrs.phase_day ?? null,
          grouped_starts: attrs.grouped_starts ?? null,
          fertility_forecast: attrs.fertility_forecast ?? null,
          basal_temperatures: attrs.basal_temperatures ?? attrs.bbt_readings ?? null,
          symptom_history: attrs.symptom_history ?? attrs.symptoms_last_30 ?? null,
        },
        editMode: this._editMode,
        prefsVersion: this._prefsVersion,
        availableCount: available.length,
        availableIds: available.map((e) => e.entityId).join('|'),
      });
    }

    /** Returns a human-readable reason string for why the signature changed. */
    _describeSigChange(prev, next) {
      if (!prev) return 'initial';
      try {
        const a = JSON.parse(prev);
        const b = JSON.parse(next);
        const reasons = [];
        if (a.lang !== b.lang) reasons.push('lang');
        if (a.selectedEntityId !== b.selectedEntityId) reasons.push('selectedEntityId');
        if (a.entityState !== b.entityState) reasons.push('entityState');
        if (JSON.stringify(a.entityAttrs) !== JSON.stringify(b.entityAttrs)) reasons.push('entityAttrs');
        if (a.editMode !== b.editMode) reasons.push('editMode');
        if (a.prefsVersion !== b.prefsVersion) reasons.push('prefsVersion');
        if (a.availableCount !== b.availableCount || a.availableIds !== b.availableIds) reasons.push('availableEntities');
        return reasons.join(',') || 'unknown';
      } catch (_e) {
        return 'parse_error';
      }
    }

    _readDebugFlag() {
      try {
        if (typeof window === 'undefined') return false;
        if (window.MENSTRUATION_CYCLE_DASHBOARD_DEBUG === true) return true;
        return window.localStorage?.getItem('menstruation_cycle.dashboard_debug') === '1';
      } catch (_error) {
        return false;
      }
    }

    _debug(message, payload) {
      if (!this._debugEnabled) return;
      // eslint-disable-next-line no-console
      console.debug('[menstruation-cycle][dashboard]', message, payload);
    }

    _resolveMode(stateObj) {
      const stage = String(
        stateObj?.attributes?.onboarding_stage_effective || stateObj?.attributes?.onboarding_stage || 'established_cycle',
      ).toLowerCase();
      return stage === 'pre_menarche' || stage === 'early_menarche' ? 'young' : 'general';
    }

    _storageKey(profile) {
      const userId = this._hass?.user?.id || 'anon';
      return `menstruation_cycle.dashboard_prefs.${userId}.${profile}`;
    }

    _preset(mode) {
      return JSON.parse(JSON.stringify(PRESETS[mode] || PRESETS.general));
    }

    _normalizePrefs(raw, profile, mode) {
      const preset = this._preset(mode);
      const widgetVisibility = { ...preset.widgetVisibility, ...(raw?.widgetVisibility || {}) };
      const rawOrder = Array.isArray(raw?.widgetOrder) ? raw.widgetOrder.filter((id) => WIDGET_IDS.includes(id)) : [];
      const widgetOrder = [...rawOrder, ...WIDGET_IDS.filter((id) => !rawOrder.includes(id))];
      const discreetMode = typeof raw?.discreetMode === 'boolean' ? raw.discreetMode : preset.discreetMode;
      return {
        __profile: profile,
        __mode: mode,
        discreetMode,
        widgetVisibility,
        widgetOrder,
        myInfo: {
          displayName: String(raw?.myInfo?.displayName || '').trim(),
          pronouns: String(raw?.myInfo?.pronouns || '').trim(),
        },
      };
    }

    _loadPrefs(profile, mode) {
      const preset = this._preset(mode);
      const raw = safeJsonParse(localStorage.getItem(this._storageKey(profile)));
      return this._normalizePrefs(raw, profile, mode);
    }

    _savePrefs() {
      if (!this._prefs) return;
      const { __profile, __mode, ...persisted } = this._prefs;
      localStorage.setItem(this._storageKey(this._activeProfile), JSON.stringify(persisted));
      this._prefsVersion++;
    }

    _findPrimaryState() {
      if (!this._hass?.states) return null;
      const entries = Object.entries(this._hass.states)
        .filter(([entityId, state]) => entityId.startsWith('sensor.') && state?.attributes?.entry_id && state?.attributes?.profile);
      if (!entries.length) return null;
      entries.sort(([a], [b]) => a.localeCompare(b));
      return entries[0][1];
    }

    _getAvailableEntitiesFallback() {
      const states = this._hass?.states || {};
      const allSensors = Object.entries(states).filter(([id]) => id.startsWith('sensor.'));

      const isPeriodProducts = (id) => id.includes('period_products');

      // Primary strategy: integration markers (best)
      let entities = allSensors
        .filter(([entityId, state]) =>
          !isPeriodProducts(entityId) &&
          !!state?.attributes?.entry_id &&
          !!state?.attributes?.profile
        )
        .map(([entityId, state]) => ({
          entityId,
          name: state.attributes?.friendly_name || state.attributes?.profile || entityId,
          profile: state.attributes?.profile || '',
        }));

      // Fallback if markers are missing on your setup:
      // keep non-period_products sensors that at least look cycle-related by attributes
      if (entities.length === 0) {
        entities = allSensors
          .filter(([entityId, state]) => {
            if (isPeriodProducts(entityId)) return false;
            const a = state?.attributes || {};
            return (
              a.cycle_day !== undefined ||
              a.days_until_next_start !== undefined ||
              a.next_predicted_start !== undefined ||
              a.onboarding_stage !== undefined ||
              a.onboarding_stage_effective !== undefined
            );
          })
          .map(([entityId, state]) => ({
            entityId,
            name: state?.attributes?.friendly_name || entityId,
            profile: state?.attributes?.profile || '',
          }));
      }

      return entities.sort((a, b) => a.name.localeCompare(b.name));
    }

    _getAvailableEntities() {
      return this._availableEntities || this._getAvailableEntitiesFallback();
    }

    async _loadEntitiesFromRegistry() {
      if (!this._hass?.connection) throw new Error('No hass connection');
      const conn = this._hass.connection;

      // 1. Get all config entries for this integration
      const configEntries = await conn.sendMessagePromise({ type: 'config_entries/get' });
      const integrationEntryIds = new Set(
        (Array.isArray(configEntries) ? configEntries : [])
          .filter((entry) => entry.domain === 'menstruation_cycle')
          .map((entry) => entry.entry_id)
      );

      if (integrationEntryIds.size === 0) {
        this._debug('No menstruation_cycle config entries found, using fallback');
        return this._getAvailableEntitiesFallback();
      }

      // 2. Get entity registry and filter to our integration's sensors
      const entityRegistry = await conn.sendMessagePromise({ type: 'config/entity_registry/list' });
      const registeredEntityIds = new Set(
        (Array.isArray(entityRegistry) ? entityRegistry : [])
          .filter(
            (entry) =>
              entry.config_entry_id &&
              integrationEntryIds.has(entry.config_entry_id) &&
              entry.entity_id.startsWith('sensor.') &&
              !entry.entity_id.includes('period_products')
          )
          .map((entry) => entry.entity_id)
      );

      // 3. Map to current states
      const states = this._hass?.states || {};
      const entities = Array.from(registeredEntityIds)
        .filter((entityId) => entityId in states)
        .map((entityId) => {
          const state = states[entityId];
          return {
            entityId,
            name: state?.attributes?.friendly_name || entityId,
            profile: state?.attributes?.profile || '',
          };
        });

      entities.sort((a, b) => a.name.localeCompare(b.name));
      this._debug('Registry-discovered entities', entities.map((e) => e.entityId));
      return entities;
    }

    _applyEntitySelection() {
      const available = this._availableEntities || [];
      const userId = this._hass?.user?.id;
      if (available.length > 0) {
        const currentStillValid = this._selectedEntityId && available.some((e) => e.entityId === this._selectedEntityId);
        if (!currentStillValid) {
          const savedEntityId = userId ? this._getSelectedEntity(userId) : null;
          const found = savedEntityId ? available.find((e) => e.entityId === savedEntityId) : null;
          this._selectedEntityId = (found || available[0]).entityId;
        }
      } else {
        this._selectedEntityId = null;
      }
    }

    _selectedEntityKey(userId) {
      return `menstruation_cycle.dashboard_selected_entity.${userId}`;
    }

    _getSelectedEntity(userId) {
      try {
        const saved = localStorage.getItem(this._selectedEntityKey(userId));
        return saved ? JSON.parse(saved) : null;
      } catch (_error) {
        return null;
      }
    }

    _setSelectedEntity(userId, entityId) {
      try {
        localStorage.setItem(this._selectedEntityKey(userId), JSON.stringify(entityId));
      } catch (_error) {
        // localStorage may be unavailable (e.g. Safari private mode)
      }
    }

    _handleEntityChange(entityId) {
      const userId = this._hass?.user?.id;
      if (userId) {
        this._setSelectedEntity(userId, entityId);
      }
      this._selectedEntityId = entityId;
      const stateObj = this._hass?.states?.[entityId] || null;
      this._activeProfile = stateObj?.attributes?.profile || 'default';
      this._activeMode = this._resolveMode(stateObj);
      this._prefs = this._loadPrefs(this._activeProfile, this._activeMode);
      this._prefsVersion++;
      // Force render regardless of sig — entity was explicitly changed by user
      this._lastRenderSig = null;
      this.render();
    }

    _t(key) {
      const i18n = this._getI18n();
      const dict = i18n.cache?.[this._lang] || {};
      const english = i18n.cache?.en || i18n.fallback?.en || PANEL_FALLBACK_EN;
      return dict[key] ?? english[key] ?? key;
    }

    _todayIso() {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    async _saveQuickLog(form) {
      const stateObj = this._selectedEntityId ? (this._hass?.states?.[this._selectedEntityId] || null) : null;
      if (!this._hass || !stateObj) return;
      const entryId = stateObj.attributes.entry_id;
      const bleeding = String(form.get('bleeding') || '').trim();
      const pain = String(form.get('pain') || '').trim();
      const mood = String(form.get('mood') || '').trim();
      const note = String(form.get('note') || '').trim();

      const symptomData = {};
      if (bleeding) symptomData.bleeding_strength = bleeding;
      if (pain && pain !== 'none') symptomData.pain = [pain];

      this._quickLogScratch = { mood, note };
      if (!Object.keys(symptomData).length) {
        this._message = this._t('dashboard_quick_log_no_changes');
        this.render();
        return;
      }

      this._pending = true;
      this.render();
      try {
        await this._hass.callService('menstruation_cycle', 'add_symptom', {
          entry_id: entryId,
          date: this._todayIso(),
          symptom_data: symptomData,
        });
        this._message = this._t('symptom_saved');
      } catch (_error) {
        this._message = this._t('symptom_save_error');
      }
      this._pending = false;
      this.render();
    }

    _moveWidget(id, direction) {
      const target = this._editMode ? this._editDraft : this._prefs;
      if (!target) return;
      const idx = target.widgetOrder.indexOf(id);
      if (idx < 0) return;
      const next = direction === 'up' ? idx - 1 : idx + 1;
      if (next < 0 || next >= target.widgetOrder.length) return;
      const order = [...target.widgetOrder];
      [order[idx], order[next]] = [order[next], order[idx]];
      target.widgetOrder = order;
      if (!this._editMode) this._savePrefs();
      this.render();
    }

    _handleClick(event) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.dataset.action;
      const widget = target.dataset.widget;

      if (action === 'toggle-edit') {
        if (!this._editMode) {
          this._editDraft = JSON.parse(JSON.stringify({ ...this._prefs }));
          this._editMode = true;
        } else {
          this._editDraft = null;
          this._editMode = false;
        }
        this.render();
      } else if (action === 'save-edit') {
        if (this._editDraft) {
          const { __profile, __mode, ...saved } = this._editDraft;
          this._prefs = { ...this._prefs, ...saved };
          this._savePrefs();
          this._message = this._t('dashboard_saved');
        }
        this._editDraft = null;
        this._editMode = false;
        this.render();
      } else if (action === 'cancel-edit') {
        this._editDraft = null;
        this._editMode = false;
        this.render();
      } else if (action === 'widget-up' && widget) {
        this._moveWidget(widget, 'up');
      } else if (action === 'widget-down' && widget) {
        this._moveWidget(widget, 'down');
      } else if (action === 'reset-preset') {
        const reset = this._normalizePrefs(this._preset(this._activeMode), this._activeProfile, this._activeMode);
        if (this._editMode) {
          this._editDraft = reset;
        } else {
          this._prefs = reset;
          this._savePrefs();
        }
        this.render();
      }
    }

    _handleChange(event) {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !this._prefs) return;

      if (target.tagName === 'SELECT' && target.classList.contains('entity-picker')) {
        this._handleEntityChange(target.value);
        return;
      }

      const draft = this._editMode ? this._editDraft : this._prefs;
      if (!draft) return;
      if (target instanceof HTMLInputElement && target.dataset.widgetVisibility) {
        draft.widgetVisibility[target.dataset.widgetVisibility] = target.checked;
        if (!this._editMode) this._savePrefs();
        this.render();
      }
      if (target instanceof HTMLInputElement && target.dataset.pref === 'discreetMode') {
        draft.discreetMode = target.checked;
        if (!this._editMode) this._savePrefs();
        this.render();
      }
      if (target instanceof HTMLInputElement && target.dataset.pref === 'displayName') {
        draft.myInfo.displayName = target.value.trim();
        if (!this._editMode) this._savePrefs();
      }
      if (target instanceof HTMLInputElement && target.dataset.pref === 'pronouns') {
        draft.myInfo.pronouns = target.value.trim();
        if (!this._editMode) this._savePrefs();
      }
    }

    _handleSubmit(event) {
      if (!(event.target instanceof HTMLFormElement)) return;
      if (event.target.dataset.form === 'quick-log') {
        event.preventDefault();
        const formData = new FormData(event.target);
        this._saveQuickLog(formData);
      }
    }

    _renderQuickLogCard(discreetMode) {
      return `
        <form class="quick-log" data-form="quick-log">
          <label>${this._t('bleeding_strength')}
            <select name="bleeding">
              <option value="">${this._t('none')}</option>
              <option value="none">${this._t('bleeding_none')}</option>
              <option value="light">${this._t('bleeding_light')}</option>
              <option value="medium">${this._t('bleeding_medium')}</option>
              <option value="heavy">${this._t('bleeding_heavy')}</option>
            </select>
          </label>
          <label>${this._t('pain')}
            <select name="pain">
              <option value="none">${this._t('none')}</option>
              <option value="cramps">${this._t('opt_cramps')}</option>
              <option value="headache">${this._t('opt_headache')}</option>
              <option value="lower_back">${this._t('opt_lower_back')}</option>
            </select>
          </label>
          <label>${this._t('mood')}
            <input name="mood" type="text" value="${escapeHtml(this._quickLogScratch.mood)}" />
          </label>
          <label>${this._t('notes')}
            <textarea name="note" rows="2">${escapeHtml(this._quickLogScratch.note)}</textarea>
          </label>
          <button type="submit" ${this._pending ? 'disabled' : ''}>${this._pending ? this._t('saving') : this._t('save')}</button>
          <div class="helper">${discreetMode ? this._t('dashboard_discreet_note') : this._t('dashboard_quick_log_note')}</div>
        </form>
      `;
    }

    _renderTodayCard(stateObj, discreetMode) {
      const attrs = stateObj?.attributes || {};
      const state = String(stateObj?.state || this._t('unknown'));
      const cycleDay = attrs.cycle_day ?? this._t('unknown');
      return `
        <div class="kv"><span>${this._t('dashboard_label_state')}</span><strong>${escapeHtml(discreetMode ? this._t('dashboard_neutral_state') : state)}</strong></div>
        <div class="kv"><span>${this._t('cycle_day')}</span><strong>${escapeHtml(cycleDay)}</strong></div>
        <div class="kv"><span>${this._t('dashboard_days_until_next')}</span><strong>${escapeHtml(attrs.days_until_next_start ?? attrs.days_until_menarche ?? this._t('unknown'))}</strong></div>
      `;
    }

    _renderUpcomingCard(stateObj) {
      const attrs = stateObj?.attributes || {};
      const forecast = attrs.period_forecast || {};
      const start = forecast.window_start || attrs.next_predicted_start || this._t('unknown');
      const end = forecast.window_end || this._t('unknown');
      const confidence = forecast.confidence || attrs.prediction_gating?.confidence || this._t('unknown');
      return `
        <div class="kv"><span>${this._t('period_forecast_window')}</span><strong>${escapeHtml(start)} → ${escapeHtml(end)}</strong></div>
        <div class="kv"><span>${this._t('period_forecast_confidence')}</span><strong>${escapeHtml(confidence)}</strong></div>
      `;
    }

    _renderRemindersCard() {
      return `
        <div class="helper">${this._t('dashboard_reminders_hint')}</div>
        <ul>
          <li>${this._t('ygs_rem_kit_check')}</li>
          <li>${this._t('ygs_rem_drink_water')}</li>
          <li>${this._t('ygs_rem_rest_cue')}</li>
        </ul>
      `;
    }

    _renderProgressCard(stateObj) {
      const raw = Array.isArray(stateObj?.attributes?.progress_badges) ? stateObj.attributes.progress_badges : [];
      const badges = raw.filter((item) => item && typeof item === 'object').map(_normalizeItem);
      if (!badges.length) return `<div class="helper">${this._t('progress_empty_state')}</div>`;
      const badgeRows = badges.slice(-4).reverse().map((item) => {
        const label = escapeHtml(item.title || this._t('progress_section_title'));
        return item.url
          ? `<li><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${label}</a></li>`
          : `<li>${label}</li>`;
      }).join('');
      return `<ul>${badgeRows}</ul>`;
    }

    _renderMyInfoCard(stateObj) {
      const attrs = stateObj?.attributes || {};
      const displayName = this._prefs?.myInfo?.displayName || attrs.friendly_name || attrs.profile || this._t('unknown');
      const pronouns = this._prefs?.myInfo?.pronouns || this._t('dashboard_not_set');
      const phase = attrs.current_phase ?? stateObj?.state ?? null;
      const stage = String(attrs.onboarding_stage_effective || attrs.onboarding_stage || '').toLowerCase();
      const isMenarche = stage === 'pre_menarche' || stage === 'early_menarche';
      return `
        <div class="kv"><span>${this._t('friendly_name')}</span><strong>${escapeHtml(displayName)}</strong></div>
        <div class="kv"><span>${this._t('dashboard_pronouns')}</span><strong>${escapeHtml(pronouns)}</strong></div>
        ${phase ? `<div class="kv"><span>${this._t('dashboard_label_state')}</span><strong>${escapeHtml(phase)}</strong></div>` : ''}
        ${isMenarche ? `<div class="kv"><span>${this._t('onboarding_stage')}</span><strong>${escapeHtml(stage)}</strong></div>` : ''}
      `;
    }

    _renderTrendChips(stateObj) {
      const attrs = stateObj?.attributes || {};
      const cycleDay = attrs.cycle_day ?? null;
      const cycleLengthAvg = attrs.average_cycle_length ?? attrs.cycle_length_avg ?? null;
      const forecast = attrs.period_forecast || {};
      const confidence = forecast.confidence ?? attrs.prediction_gating?.confidence ?? null;
      const windowStart = forecast.window_start ?? attrs.next_predicted_start ?? null;

      const chips = [];

      if (cycleDay !== null && cycleDay !== undefined) {
        const progress = cycleLengthAvg && Number(cycleLengthAvg) > 0
          ? Math.min(100, Math.round((Number(cycleDay) / Number(cycleLengthAvg)) * 100))
          : null;
        const progressBar = progress !== null
          ? `<span class="trend-chip__bar" style="--p:${progress}%"></span>`
          : '';
        chips.push(`<div class="trend-chip">${this._t('cycle_day')} <strong>${escapeHtml(cycleDay)}</strong>${progressBar}</div>`);
      }

      if (confidence !== null && confidence !== undefined) {
        chips.push(`<div class="trend-chip">${this._t('period_forecast_confidence')} <strong>${escapeHtml(confidence)}</strong></div>`);
      }

      if (windowStart !== null && windowStart !== undefined) {
        chips.push(`<div class="trend-chip">${this._t('period_forecast_window')} <strong>${escapeHtml(windowStart)}</strong></div>`);
      }

      if (!chips.length) return '';
      return `<div class="trend-chips" aria-label="Cycle summary">${chips.join('')}</div>`;
    }

    _renderGaugeCard(stateObj) {
      if (!this._selectedEntityId) {
        return `<div class="helper">${this._t('dashboard_no_entity_selected')}</div>`;
      }
      const tagName = 'menstruation-gauge-card';
      if (typeof customElements !== 'undefined' && customElements.get(tagName)) {
        const entityId = escapeHtml(this._selectedEntityId);
        return `<${tagName} entity-id="${entityId}"></${tagName}>`;
      }
      // Native fallback: render a simple arc gauge using the cycle-day progress
      const attrs = stateObj?.attributes || {};
      const cycleDay = Number(attrs.cycle_day ?? 0) || 0;
      const cycleLength = Number(attrs.average_cycle_length ?? attrs.cycle_length_avg ?? 28) || 28;
      const progress = Math.min(1, Math.max(0, cycleDay / cycleLength));
      const phase = attrs.current_phase ?? stateObj?.state ?? '';

      const R = 54;
      const cx = 70;
      const cy = 70;
      const circumference = Math.PI * R; // half-circle arc length
      const arcOffset = circumference * (1 - progress);
      const phaseColors = {
        menstrual: '#E8637D', follicular: '#7C9885', ovulation: '#3F5A47', luteal: '#6B3654',
      };
      const phaseLower = String(phase).toLowerCase();
      let color = '#C43F5E';
      for (const [key, val] of Object.entries(phaseColors)) {
        if (phaseLower.includes(key)) { color = val; break; }
      }

      return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:4px 0;">
          <svg viewBox="0 0 140 80" width="140" height="80" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <path d="M16,70 A54,54 0 0,1 124,70" fill="none" stroke="var(--divider-color,#e5e7eb)" stroke-width="10" stroke-linecap="round"/>
            <path d="M16,70 A54,54 0 0,1 124,70" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"
              stroke-dasharray="${circumference}" stroke-dashoffset="${Math.round(arcOffset * 10) / 10}" style="transition:stroke-dashoffset 0.4s;"/>
            <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="20" font-weight="700" fill="var(--primary-text-color,#1f2937)">${cycleDay}</text>
            <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="9" fill="var(--secondary-text-color,#6b7280)">${escapeHtml(this._t('cycle_day'))}</text>
          </svg>
          ${phase ? `<div class="helper" style="text-align:center">${escapeHtml(phase)}</div>` : ''}
        </div>
      `;
    }

    _renderCalendarCard(stateObj) {
      if (!this._selectedEntityId) {
        return `<div class="helper">${this._t('dashboard_no_entity_selected')}</div>`;
      }
      const tagName = 'menstruation-calendar-card';
      if (typeof customElements !== 'undefined' && customElements.get(tagName)) {
        const entityId = escapeHtml(this._selectedEntityId);
        return `<${tagName} entity-id="${entityId}"></${tagName}>`;
      }
      // Native fallback: mini calendar showing current month with period-start markers
      const attrs = stateObj?.attributes || {};
      const allStarts = Array.isArray(attrs.grouped_starts) ? attrs.grouped_starts : [];
      const forecast = attrs.period_forecast || {};
      const windowStart = forecast.window_start ?? attrs.next_predicted_start ?? null;
      const windowEnd = forecast.window_end ?? null;

      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const todayDate = today.getDate();

      const monthLabel = today.toLocaleDateString(this._lang === 'de' ? 'de-DE' : 'en-US', { month: 'long', year: 'numeric' });

      const startDates = new Set(
        allStarts
          .filter((d) => d && d.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
          .map((d) => parseInt(d.slice(8, 10), 10))
      );

      const inWindow = (day) => {
        if (!windowStart) return false;
        const d = new Date(year, month, day);
        const ws = new Date(windowStart);
        const we = windowEnd ? new Date(windowEnd) : ws;
        return d >= ws && d <= we;
      };

      const dayNames = this._lang === 'de'
        ? ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
        : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
      const headerCells = dayNames.map((d) => `<th style="font-size:0.7rem;color:var(--secondary-text-color,#6b7280);padding:2px 0;text-align:center">${d}</th>`).join('');

      const cells = [];
      // Leading empty cells
      const leadOffset = this._lang === 'de' ? (firstDay === 0 ? 6 : firstDay - 1) : firstDay;
      for (let i = 0; i < leadOffset; i++) cells.push('<td></td>');
      for (let day = 1; day <= daysInMonth; day++) {
        const isToday = day === todayDate;
        const isPeriodStart = startDates.has(day);
        const isPredicted = inWindow(day);
        let bg = 'transparent';
        let border = '';
        if (isToday) { bg = 'var(--primary-color,#2563eb)'; }
        else if (isPeriodStart) { bg = 'var(--mc-rose-deep)'; }
        else if (isPredicted) { bg = 'var(--mc-rose-tint)'; border = 'border:1px dashed var(--mc-rose);'; }
        const color = (isToday || isPeriodStart) ? '#fff' : 'inherit';
        cells.push(`<td style="text-align:center;padding:2px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:${bg};${border}color:${color};font-size:0.75rem;font-weight:${isToday ? 700 : 400}">${day}</span></td>`);
      }

      const rows = [];
      for (let i = 0; i < cells.length; i += 7) {
        rows.push(`<tr>${cells.slice(i, i + 7).join('')}</tr>`);
      }

      const legend = `
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;font-size:0.7rem;color:var(--secondary-text-color,#6b7280);align-items:center;">
          <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--mc-rose-deep);margin-right:4px;vertical-align:middle"></span>${this._t('dashboard_label_state')}</span>
          <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--mc-rose-tint);border:1px dashed var(--mc-rose);margin-right:4px;vertical-align:middle"></span>${this._t('dashboard_fertility_window')}</span>
          <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--primary-color,#2563eb);margin-right:4px;vertical-align:middle"></span>${this._t('dashboard_today')}</span>
        </div>
      `;

      return `
        <div style="overflow-x:auto;">
          <div style="font-size:0.85rem;font-weight:600;margin-bottom:6px;">${escapeHtml(monthLabel)}</div>
          <table style="border-collapse:collapse;width:100%;">
            <thead><tr>${headerCells}</tr></thead>
            <tbody>${rows.join('')}</tbody>
          </table>
          ${legend}
        </div>
      `;
    }

    _renderStatisticsCard(stateObj) {
      const attrs = stateObj?.attributes || {};
      const allStarts = Array.isArray(attrs.grouped_starts) ? attrs.grouped_starts.slice().sort() : [];
      const cycleLengths = [];
      for (let i = 1; i < allStarts.length; i++) {
        const len = Math.round((new Date(allStarts[i]) - new Date(allStarts[i - 1])) / 86400000);
        if (len > 10 && len < 80) cycleLengths.push(len);
      }
      const avgLen = attrs.avg_cycle_length ?? attrs.average_cycle_length ?? attrs.cycle_length_avg ?? null;
      const computedAvg = cycleLengths.length
        ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length * 10) / 10
        : null;
      const avg = avgLen !== null ? Number(avgLen) : computedAvg;
      const minLen = cycleLengths.length ? Math.min(...cycleLengths) : null;
      const maxLen = cycleLengths.length ? Math.max(...cycleLengths) : null;
      const stdDev = cycleLengths.length >= 2
        ? (() => {
            const m = avg;
            const variance = cycleLengths.reduce((a, b) => a + Math.pow(b - m, 2), 0) / cycleLengths.length;
            return Math.round(Math.sqrt(variance) * 10) / 10;
          })()
        : null;

      if (avg === null && cycleLengths.length === 0) {
        return `<div class="helper">${this._t('dashboard_not_enough_data')}</div>`;
      }

      const statItems = [];
      if (avg !== null) statItems.push({ icon: '📊', label: this._t('dashboard_cycle_history_avg'), value: `${avg}d` });
      if (minLen !== null) statItems.push({ icon: '↓', label: 'Min', value: `${minLen}d` });
      if (maxLen !== null) statItems.push({ icon: '↑', label: 'Max', value: `${maxLen}d` });
      if (stdDev !== null) statItems.push({ icon: '±', label: 'Std dev', value: `${stdDev}d` });
      if (cycleLengths.length > 0) statItems.push({ icon: '#', label: 'Cycles', value: String(cycleLengths.length) });

      return `<div class="stats-grid">${statItems.map((item) => `
        <div class="stat-tile">
          <span class="stat-icon" aria-hidden="true">${item.icon}</span>
          <span class="stat-value">${escapeHtml(item.value)}</span>
          <span class="stat-label">${escapeHtml(item.label)}</span>
        </div>
      `).join('')}</div>`;
    }

    _renderCycleHistoryGraph(stateObj) {
      const attrs = stateObj?.attributes || {};
      const allStarts = Array.isArray(attrs.grouped_starts) ? attrs.grouped_starts.slice().sort() : [];
      const cycleLengths = [];
      for (let i = 1; i < allStarts.length; i++) {
        const len = Math.round((new Date(allStarts[i]) - new Date(allStarts[i - 1])) / 86400000);
        if (len > 10 && len < 80) cycleLengths.push({ len, start: allStarts[i - 1] });
      }

      if (cycleLengths.length === 0) {
        return `<div class="helper">${this._t('dashboard_not_enough_data')}</div>`;
      }

      const recent = cycleLengths.slice(-12);
      const avgLen = attrs.avg_cycle_length ?? attrs.average_cycle_length ?? attrs.cycle_length_avg ?? null;
      const avg = avgLen !== null
        ? Number(avgLen)
        : Math.round(recent.reduce((a, b) => a + b.len, 0) / recent.length * 10) / 10;

      const W = 400;
      const H = 90;
      const padLeft = 28;
      const padRight = 8;
      const padTop = 8;
      const padBottom = 24;
      const chartW = W - padLeft - padRight;
      const chartH = H - padTop - padBottom;

      const allLens = recent.map((c) => c.len);
      const minY = Math.max(0, Math.min(...allLens) - 3);
      const maxY = Math.max(...allLens) + 3;
      const yRange = maxY - minY || 1;

      // Merged from the former standalone statistics card: min/max/std.dev/count
      // computed over the same recent-cycles window, shown as a compact stat strip.
      const minLen = Math.min(...allLens);
      const maxLen = Math.max(...allLens);
      const stdDev = allLens.length >= 2
        ? Math.round(Math.sqrt(allLens.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / allLens.length) * 10) / 10
        : null;
      const statStrip = `
        <div class="kpi-strip" style="margin-bottom:10px;">
          <div class="kpi-item"><span class="kpi-icon" aria-hidden="true">↓</span><span class="kpi-value">${minLen}d</span><span class="kpi-label">Min</span></div>
          <div class="kpi-item"><span class="kpi-icon" aria-hidden="true">↑</span><span class="kpi-value">${maxLen}d</span><span class="kpi-label">Max</span></div>
          ${stdDev !== null ? `<div class="kpi-item"><span class="kpi-icon" aria-hidden="true">±</span><span class="kpi-value">${stdDev}d</span><span class="kpi-label">${this._t('dashboard_anomaly_consistency')}</span></div>` : ''}
          <div class="kpi-item"><span class="kpi-icon" aria-hidden="true">#</span><span class="kpi-value">${allLens.length}</span><span class="kpi-label">${this._t('dashboard_widget_cycle_history')}</span></div>
        </div>`;

      const barW = Math.max(2, Math.floor(chartW / recent.length) - 3);
      const gap = (chartW - barW * recent.length) / Math.max(1, recent.length - 1);

      const avgX1 = padLeft;
      const avgX2 = W - padRight;
      const avgYPos = padTop + chartH - ((avg - minY) / yRange) * chartH;

      const outlierThreshold = 8;
      const bars = recent.map((c, idx) => {
        const x = padLeft + idx * (barW + gap);
        const barH2 = Math.max(2, ((c.len - minY) / yRange) * chartH);
        const y = padTop + chartH - barH2;
        const isOutlier = avg !== null && Math.abs(c.len - avg) > outlierThreshold;
        const fill = isOutlier ? 'var(--mc-amber)' : 'var(--mc-rose-deep)';
        const label = String(c.len);
        const cx = x + barW / 2;
        return `<rect x="${Math.round(x)}" y="${Math.round(y)}" width="${barW}" height="${Math.round(barH2)}" fill="${fill}" opacity="0.75" rx="2"/>
                <text x="${Math.round(cx)}" y="${Math.round(y - 3)}" text-anchor="middle" font-size="8" fill="var(--secondary-text-color,#6b7280)">${escapeHtml(label)}</text>`;
      }).join('');

      // Y-axis labels
      const yLabels = [minY, Math.round((minY + maxY) / 2), maxY].map((v) => {
        const yPos = padTop + chartH - ((v - minY) / yRange) * chartH;
        return `<text x="${padLeft - 3}" y="${Math.round(yPos + 3)}" text-anchor="end" font-size="8" font-family="IBM Plex Mono, monospace" fill="var(--secondary-text-color,#9ca3af)">${v}</text>`;
      }).join('');

      // X-axis labels (first and last)
      const xLabels = recent.length >= 2 ? [0, recent.length - 1].map((idx) => {
        const x = padLeft + idx * (barW + gap) + barW / 2;
        const dateStr = recent[idx].start ? recent[idx].start.slice(5) : String(idx + 1);
        const anchor = idx === 0 ? 'start' : 'end';
        return `<text x="${Math.round(x)}" y="${H - 4}" text-anchor="${anchor}" font-size="7" font-family="IBM Plex Mono, monospace" fill="var(--secondary-text-color,#9ca3af)">${escapeHtml(dateStr)}</text>`;
      }).join('') : '';

      const avgLine = avg !== null
        ? `<line x1="${avgX1}" y1="${Math.round(avgYPos)}" x2="${avgX2}" y2="${Math.round(avgYPos)}" stroke="var(--mc-plum,#6B3654)" stroke-width="1.5" stroke-dasharray="4 3"/>
           <text x="${avgX2 + 2}" y="${Math.round(avgYPos + 3)}" font-size="8" font-family="IBM Plex Mono, monospace" fill="var(--mc-plum,#6B3654)">${this._t('dashboard_cycle_history_avg')}</text>`
        : '';

      const titleText = `${this._t('dashboard_widget_cycle_history')} — ${this._t('dashboard_cycle_history_length')}`;

      return `
        <div class="cycle-history-wrap" role="img" aria-label="${escapeHtml(titleText)}">
          ${statStrip}
          <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="overflow:visible;display:block;">
            <title>${escapeHtml(titleText)}</title>
            ${yLabels}
            ${bars}
            ${avgLine}
            ${xLabels}
          </svg>
          <div class="cycle-history-legend">
            <span class="legend-dot" style="background:var(--mc-rose-deep,#C43F5E)"></span><span>${this._t('dashboard_cycle_history_length')}</span>
            <span class="legend-dot" style="background:var(--mc-amber)"></span><span>${this._t('dashboard_cycle_history_outlier')}</span>
            <span class="legend-dash" style="background:var(--mc-plum,#6B3654)"></span><span>${this._t('dashboard_cycle_history_avg')}</span>
          </div>
        </div>
      `;
    }

    _renderPregnancyPredictionGraph(stateObj) {
      const mode = this._resolveMode(stateObj);
      if (mode !== 'cycle') return `<div class="helper">${this._t('dashboard_not_enough_data')}</div>`;

      const attrs = stateObj?.attributes || {};
      const ff = attrs.fertility_forecast && typeof attrs.fertility_forecast === 'object' ? attrs.fertility_forecast : null;
      const cycleDay = Number(attrs.cycle_day ?? 0) || 0;
      const cycleLength = Number(attrs.avg_cycle_length ?? attrs.average_cycle_length ?? attrs.cycle_length_avg ?? 28) || 28;

      if (!ff && !cycleLength) {
        return `<div class="helper">${this._t('dashboard_not_enough_data')}</div>`;
      }

      let ovulationDay = null;
      if (ff?.ovulation_estimate && attrs.cycle_start_date) {
        const diff = Math.round((new Date(ff.ovulation_estimate) - new Date(attrs.cycle_start_date)) / 86400000) + 1;
        if (diff > 0 && diff <= cycleLength) ovulationDay = diff;
      }
      if (ovulationDay === null && attrs.ovulation_day) ovulationDay = Number(attrs.ovulation_day);
      if (ovulationDay === null) ovulationDay = Math.round(cycleLength * 0.536);

      const W = 480, H = 220, padL = 38, padR = 14, padT = 18, padB = 30;
      const chartW = W - padL - padR, chartH = H - padT - padB;
      const sigma = 2.2;

      const points = [];
      for (let d = 1; d <= cycleLength; d++) {
        const gauss = Math.exp(-0.5 * Math.pow((d - ovulationDay) / sigma, 2));
        const prob = Math.round(gauss * 30 * 10) / 10; // peak ~30% at ovulation day
        points.push({ d, prob });
      }
      const maxAxis = 32;
      const x = (d) => padL + (d - 1) / (cycleLength - 1 || 1) * chartW;
      const y = (v) => padT + (maxAxis - v) / maxAxis * chartH;

      const gridLines = [0, 10, 20, 30].map((v) =>
        `<line x1="${padL}" x2="${W - padR}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="var(--divider-color,#e5e7eb)" stroke-width="1"/>
         <text x="4" y="${(y(v) + 3).toFixed(1)}" font-size="9" font-family="IBM Plex Mono, monospace" fill="var(--secondary-text-color,#9ca3af)">${v}%</text>`
      ).join('');

      let areaD = `M${x(1).toFixed(1)},${y(0).toFixed(1)} `;
      points.forEach((p) => { areaD += `L${x(p.d).toFixed(1)},${y(p.prob).toFixed(1)} `; });
      areaD += `L${x(cycleLength).toFixed(1)},${y(0).toFixed(1)} Z`;

      let lineD = `M${x(1).toFixed(1)},${y(points[0].prob).toFixed(1)} `;
      points.forEach((p, i) => { if (i > 0) lineD += `L${x(p.d).toFixed(1)},${y(p.prob).toFixed(1)} `; });

      const todayD = cycleDay > 0 ? Math.min(cycleDay, cycleLength) : null;
      const todayMarker = todayD
        ? (() => {
            const pt = points[todayD - 1];
            return `<line x1="${x(todayD).toFixed(1)}" x2="${x(todayD).toFixed(1)}" y1="${padT}" y2="${H - padB}" stroke="var(--primary-text-color,#2B1B24)" stroke-width="1.2" stroke-dasharray="3 3"/>
                    <circle cx="${x(todayD).toFixed(1)}" cy="${y(pt.prob).toFixed(1)}" r="5" fill="var(--primary-text-color,#2B1B24)"/>
                    <text x="${(x(todayD) + 8).toFixed(1)}" y="${(y(pt.prob) - 8).toFixed(1)}" font-size="11" font-family="IBM Plex Mono, monospace" font-weight="600" fill="var(--primary-text-color,#2B1B24)">${this._t('dashboard_today')}: ~${pt.prob}%</text>`;
          })()
        : '';

      const xLabels = [1, Math.round(cycleLength * 0.25), Math.round(cycleLength * 0.5), Math.round(cycleLength * 0.75), cycleLength]
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .map((d) => `<text x="${x(d).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="9" font-family="IBM Plex Mono, monospace" fill="var(--secondary-text-color,#9ca3af)">${this._t('cycle_day')} ${d}</text>`)
        .join('');

      const confidence = ff?.window_confidence ?? ff?.confidence ?? attrs.prediction_gating?.confidence ?? null;
      const confBadge = confidence
        ? `<span class="pred-badge">${this._t('dashboard_fertility_confidence')}: <strong>${escapeHtml(confidence)}</strong></span>`
        : '';
      const disclaimer = `<p class="helper pred-disclaimer">${this._t('dashboard_prediction_disclaimer')}</p>`;

      const titleText = this._t('dashboard_widget_pregnancy_prediction');

      return `
        <div class="pred-wrap" role="img" aria-label="${escapeHtml(titleText)}">
          <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="overflow:visible;display:block;">
            <title>${escapeHtml(titleText)}</title>
            ${gridLines}
            <path d="${areaD}" fill="var(--mc-rose-deep,#C43F5E)" opacity="0.18"/>
            <path d="${lineD}" fill="none" stroke="var(--mc-rose-deep,#C43F5E)" stroke-width="2.2" stroke-linejoin="round"/>
            ${todayMarker}
            ${xLabels}
          </svg>
          <div class="pred-meta">${confBadge}</div>
          ${disclaimer}
        </div>
      `;
    }

    /* ============ MODE DETECTION ============ */
    _resolveMode(stateObj) {
      const attrs = stateObj?.attributes || {};
      const state = stateObj?.state;
      if (attrs.is_pregnant || state === 'pregnant') return 'pregnancy';
      const stage = attrs.onboarding_stage_effective || attrs.onboarding_stage;
      if (stage === 'pre_menarche' || state === 'pre_menarche') return 'menarche';
      return 'cycle';
    }

    /* ============ HERO (wheel + kpi tiles), auto-switches by mode ============ */
    _renderHeroWheel(stateObj, discreetMode) {
      const mode = this._resolveMode(stateObj);
      if (mode === 'pregnancy') return this._renderPregnancyHero(stateObj, discreetMode);
      if (mode === 'menarche') return this._renderMenarcheHero(stateObj, discreetMode);
      return this._renderCycleHero(stateObj, discreetMode);
    }

    _renderCycleHero(stateObj, discreetMode) {
      const attrs = stateObj?.attributes || {};
      const cycleDay = Number(attrs.cycle_day ?? 0) || 0;
      const cycleLength = Number(attrs.avg_cycle_length ?? attrs.average_cycle_length ?? attrs.cycle_length_avg ?? 28) || 28;
      const phase = discreetMode ? null : (attrs.current_phase ?? stateObj?.state ?? null);
      const forecast = attrs.period_forecast || {};
      const daysUntil = attrs.days_until_next_start ?? forecast.days_until ?? null;
      const fertility = attrs.fertility_forecast || {};
      const ovulationEst = fertility.ovulation_estimate ?? attrs.ovulation_day ?? null;
      const confidence = forecast.window_confidence ?? forecast.confidence ?? attrs.prediction_gating?.confidence ?? null;

      const cx = 100, cy = 100, r = 82, sw = 15;
      const circumference = 2 * Math.PI * r;
      const phases = [
        { from: 0, to: 0.179, color: '#E8637D' },
        { from: 0.179, to: 0.464, color: '#7C9885' },
        { from: 0.464, to: 0.536, color: '#3F5A47' },
        { from: 0.536, to: 1, color: '#6B3654' },
      ];
      const ringSegs = phases.map((p) => {
        const len = (p.to - p.from) * circumference;
        const gap = circumference - len;
        const offset = -(p.from) * circumference;
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${p.color}" stroke-width="${sw}" stroke-dasharray="${len} ${gap}" stroke-dashoffset="${offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
      }).join('');
      const todayFrac = cycleLength > 0 ? Math.min(1, Math.max(0, (cycleDay - 1) / cycleLength)) : 0;
      const a = todayFrac * 2 * Math.PI - Math.PI / 2;
      const mx = cx + r * Math.cos(a), my = cy + r * Math.sin(a);
      const marker = `<circle cx="${mx}" cy="${my}" r="7" fill="var(--card-background-color,#fff)" stroke="var(--primary-text-color,#2B1B24)" stroke-width="2"/><circle cx="${mx}" cy="${my}" r="2.6" fill="var(--primary-text-color,#2B1B24)"/>`;

      const wheelSvg = `
        <svg viewBox="0 0 200 200" width="100%" height="200" style="max-width:200px;display:block;" role="img" aria-label="${this._t('cycle_day')} ${escapeHtml(cycleDay)} / ${escapeHtml(cycleLength)}">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--divider-color,#e5e7eb)" stroke-width="${sw}"/>
          ${ringSegs}
          ${marker}
        </svg>`;

      const centerHtml = `
        <div class="hero-wheel-center">
          <div class="hw-num">${cycleDay || '—'}</div>
          <div class="hw-sub">${this._t('cycle_day').toUpperCase()} / ${escapeHtml(cycleLength)}</div>
          ${!discreetMode && phase ? `<div class="hw-tag">${escapeHtml(phase)}</div>` : ''}
        </div>`;

      const kpis = [];
      kpis.push(`<div class="kpi-item mc-rose"><span class="kpi-icon" aria-hidden="true">⏳</span><span class="kpi-value">${daysUntil !== null && daysUntil !== undefined ? escapeHtml(daysUntil) : '—'}</span><span class="kpi-label">${this._t('dashboard_days_until_next')}</span></div>`);
      if (!discreetMode) {
        kpis.push(`<div class="kpi-item"><span class="kpi-icon" aria-hidden="true">🌱</span><span class="kpi-value">${ovulationEst ? escapeHtml(ovulationEst) : '—'}</span><span class="kpi-label">${this._t('dashboard_fertility_ovulation')}</span></div>`);
      }
      if (confidence !== null && confidence !== undefined) {
        kpis.push(`<div class="kpi-item mc-plum"><span class="kpi-icon" aria-hidden="true">🎯</span><span class="kpi-value">${escapeHtml(confidence)}</span><span class="kpi-label">${this._t('period_forecast_confidence')}</span></div>`);
      }
      // Merged from the former standalone statistics card: NFP (symptothermal) analysis
      const nfpAnalysis = attrs.nfp_analysis || {};
      if (!discreetMode && nfpAnalysis.confidence_level) {
        kpis.push(`<div class="kpi-item"><span class="kpi-icon" aria-hidden="true">🌡️</span><span class="kpi-value">${escapeHtml(nfpAnalysis.confidence_level)}</span><span class="kpi-label">${this._t('nfp_analysis') || 'NFP'}</span></div>`);
      }

      return `
        <div class="hero-layout" role="region" aria-label="Cycle at a glance">
          <div class="hero-wheel-holder">${wheelSvg}${centerHtml}</div>
          <div class="kpi-strip">${kpis.join('')}</div>
        </div>`;
    }

    _renderPregnancyHero(stateObj, discreetMode) {
      const attrs = stateObj?.attributes || {};
      const weeksPregnantRaw = Number(attrs.weeks_pregnant ?? 0) || 0;
      const weeks = Math.floor(weeksPregnantRaw);
      const days = Math.round((weeksPregnantRaw - weeks) * 7);
      const dueDate = attrs.due_date ?? (attrs.pregnancy_data || {}).due_date ?? null;
      let daysUntilDue = null;
      if (dueDate) {
        const due = new Date(dueDate);
        const today = new Date(this._todayIso());
        if (!Number.isNaN(due.getTime())) daysUntilDue = Math.round((due - today) / 86400000);
      }
      const trimester = weeksPregnantRaw < 13 ? 1 : (weeksPregnantRaw < 27 ? 2 : 3);
      const weekUnit = this._t('dashboard_week_unit');
      const isHighRisk = !!(attrs.pregnancy_high_risk ?? (attrs.pregnancy_data || {}).high_risk);
      const riskNotes = attrs.pregnancy_risk_notes ?? (attrs.pregnancy_data || {}).risk_notes ?? null;

      const cx = 100, cy = 100, r = 82, sw = 15;
      const circumference = 2 * Math.PI * r;
      const totalWeeks = 40;
      const trimesters = [
        { from: 0, to: 13, color: '#E8637D' },
        { from: 13, to: 27, color: '#7C9885' },
        { from: 27, to: 40, color: '#6B3654' },
      ];
      const ringSegs = trimesters.map((t) => {
        const len = (t.to - t.from) / totalWeeks * circumference;
        const gap = circumference - len;
        const offset = -(t.from / totalWeeks) * circumference;
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${t.color}" stroke-width="${sw}" stroke-dasharray="${len} ${gap}" stroke-dashoffset="${offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
      }).join('');
      const frac = Math.min(1, Math.max(0, weeksPregnantRaw / totalWeeks));
      const a = frac * 2 * Math.PI - Math.PI / 2;
      const mx = cx + r * Math.cos(a), my = cy + r * Math.sin(a);
      const marker = `<circle cx="${mx}" cy="${my}" r="7" fill="var(--card-background-color,#fff)" stroke="var(--primary-text-color,#2B1B24)" stroke-width="2"/><circle cx="${mx}" cy="${my}" r="2.6" fill="var(--primary-text-color,#2B1B24)"/>`;

      const wheelSvg = `
        <svg viewBox="0 0 200 200" width="100%" height="200" style="max-width:200px;display:block;" role="img" aria-label="${escapeHtml(weekUnit)} ${escapeHtml(weeks)}+${escapeHtml(days)}">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--divider-color,#e5e7eb)" stroke-width="${sw}"/>
          ${ringSegs}
          ${marker}
        </svg>`;

      const centerHtml = `
        <div class="hero-wheel-center">
          <div class="hw-num">${weeks}<span style="font-size:16px;">+${days}</span></div>
          <div class="hw-sub">${escapeHtml(weekUnit)}</div>
          <div class="hw-tag">${this._t('trimester_' + trimester)}</div>
          ${isHighRisk ? `<div class="hw-tag" style="margin-top:5px;background:var(--mc-amber-tint,#FBEEDC);color:#8a5a12;">⚠ ${this._t('dashboard_high_risk_pregnancy') || 'Risikoschwangerschaft'}</div>` : ''}
        </div>`;

      const kpis = [];
      kpis.push(`<div class="kpi-item mc-rose"><span class="kpi-icon" aria-hidden="true">📅</span><span class="kpi-value">${daysUntilDue !== null ? escapeHtml(daysUntilDue) : '—'}</span><span class="kpi-label">${this._t('dashboard_days_until_next')}</span></div>`);
      kpis.push(`<div class="kpi-item"><span class="kpi-icon" aria-hidden="true">🗓️</span><span class="kpi-value">${dueDate ? escapeHtml(dueDate) : '—'}</span><span class="kpi-label">${this._t('dashboard_due_date_short')}</span></div>`);
      if (isHighRisk) {
        kpis.push(`<div class="kpi-item" style="background:var(--mc-amber-tint,#FBEEDC);"><span class="kpi-icon" aria-hidden="true">⚠️</span><span class="kpi-value" style="color:#8a5a12;">${this._t('dashboard_high_risk_pregnancy') || 'Risikoschwangerschaft'}</span><span class="kpi-label">${this._t('dashboard_high_risk_monitoring') || 'Engmaschigere Kontrolle empfohlen'}</span></div>`);
      }

      return `
        <div class="hero-layout" role="region" aria-label="Pregnancy at a glance">
          <div class="hero-wheel-holder">${wheelSvg}${centerHtml}</div>
          <div class="kpi-strip">${kpis.join('')}</div>
        </div>
        ${isHighRisk && riskNotes ? `<p class="helper" style="margin-top:10px;font-size:0.72rem;"><strong>${this._t('pregnancy_risk_notes') || 'Notizen'}:</strong> ${escapeHtml(riskNotes)}</p>` : ''}`;
    }

    _renderMenarcheHero(stateObj, discreetMode) {
      const attrs = stateObj?.attributes || {};
      const preMenData = attrs.pre_menarche_data || {};
      const signs = preMenData.signs && typeof preMenData.signs === 'object' ? preMenData.signs : {};
      const signKeys = ['pubic_hair', 'breast', 'height_spurt', 'mood', 'acne', 'body_odor', 'discharge'];
      const observedCount = signKeys.filter((k) => _normalizeSignEntry(signs[k]) !== null).length;

      const dynamic = _estimateMenarcheFromSigns(signs);
      const fallbackEstDate = attrs.estimated_menarche_date ?? (attrs.menarche_data || {}).estimated_date ?? null;
      const fallbackDaysUntil = attrs.days_until_menarche ?? null;
      // Weakest fallback: birth_date + population-typical menarche age (~12), only used
      // when nothing more specific (dated signs, family history) is available.
      let ageBasedEstimate = null;
      if (!dynamic && !fallbackEstDate && attrs.birth_date) {
        const born = new Date(attrs.birth_date);
        if (!Number.isNaN(born.getTime())) {
          const est = new Date(born);
          est.setFullYear(est.getFullYear() + 12);
          ageBasedEstimate = est;
        }
      }

      const today = new Date(this._todayIso());
      let estDateStr; let daysUntil; let pct; let sourceNote;

      if (dynamic) {
        estDateStr = dynamic.estimatedDate.toISOString().slice(0, 10);
        daysUntil = Math.round((dynamic.estimatedDate - today) / 86400000);
        const anchor = new Date(dynamic.anchorDate);
        const totalSpan = dynamic.estimatedDate - anchor;
        const elapsed = today - anchor;
        pct = totalSpan > 0 ? Math.round(Math.min(100, Math.max(0, (elapsed / totalSpan) * 100))) : 100;
        sourceNote = `${this._t('dashboard_menarche_estimate_from') || 'Schätzung basiert auf'}: ${this._t(dynamic.sourceSign) || dynamic.sourceSign}`;
      } else if (fallbackEstDate) {
        estDateStr = fallbackEstDate;
        daysUntil = fallbackDaysUntil;
        pct = Math.round((observedCount / signKeys.length) * 100);
        sourceNote = observedCount > 0
          ? (this._t('dashboard_menarche_estimate_generic') || 'Grobschätzung — Datum wird genauer, sobald Anzeichen mit Datum erfasst sind')
          : '';
      } else if (ageBasedEstimate) {
        estDateStr = ageBasedEstimate.toISOString().slice(0, 10);
        daysUntil = Math.round((ageBasedEstimate - today) / 86400000);
        pct = Math.round((observedCount / signKeys.length) * 100);
        sourceNote = this._t('dashboard_menarche_estimate_age') || 'Sehr grobe Schätzung anhand des Alters — wird genauer, sobald Anzeichen erfasst werden.';
      } else {
        estDateStr = null;
        daysUntil = null;
        pct = Math.round((observedCount / signKeys.length) * 100);
        sourceNote = '';
      }

      return `
        <div>
          <div class="progress-holder">
            <div class="progress-track" style="position:relative;height:14px;border-radius:999px;background:var(--mc-sand);border:1px solid var(--divider-color,#e5e7eb);">
              <div style="position:absolute;top:0;left:0;bottom:0;width:${pct}%;border-radius:999px;background:linear-gradient(90deg, var(--mc-sage), var(--mc-rose));"></div>
              <div style="position:absolute;top:50%;left:${pct}%;width:14px;height:14px;border-radius:50%;background:var(--card-background-color,#fff);border:2.5px solid var(--primary-text-color,#2B1B24);transform:translate(-50%,-50%);"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:8px;font-family:var(--mc-font-mono);font-size:10px;color:var(--secondary-text-color,#6b7280);">
              <span>${observedCount} / ${signKeys.length} ${this._t('dashboard_widget_progress')}</span>
              <span>${daysUntil !== null && daysUntil !== undefined ? `${escapeHtml(daysUntil)} ${this._t('days_until_menarche')}` : (estDateStr ? escapeHtml(estDateStr) : '—')}</span>
            </div>
          </div>
          <div class="kpi-strip" style="margin-top:14px;">
            <div class="kpi-item mc-rose"><span class="kpi-icon" aria-hidden="true">⏳</span><span class="kpi-value">${daysUntil !== null && daysUntil !== undefined ? escapeHtml(daysUntil) : '—'}</span><span class="kpi-label">${this._t('days_until_menarche')}</span></div>
            <div class="kpi-item"><span class="kpi-icon" aria-hidden="true">🌱</span><span class="kpi-value">${observedCount}/${signKeys.length}</span><span class="kpi-label">${this._t('dashboard_widget_progress')}</span></div>
            ${attrs.age_at_tracking !== null && attrs.age_at_tracking !== undefined ? `<div class="kpi-item"><span class="kpi-icon" aria-hidden="true">🎂</span><span class="kpi-value">${escapeHtml(attrs.age_at_tracking)}</span><span class="kpi-label">${this._t('dashboard_age_label') || 'Alter'}</span></div>` : ''}
          </div>
          ${attrs.age_at_tracking === null || attrs.age_at_tracking === undefined ? `<p class="helper" style="margin-top:8px;font-size:0.68rem;">${this._t('dashboard_birth_date_hint') || 'Geburtsdatum in den Integrationseinstellungen hinterlegen, um Alter und Vor-der-Menarche-Schätzung zu verbessern.'}</p>` : ''}
          ${sourceNote ? `<p class="helper" style="margin-top:8px;font-size:0.7rem;">${escapeHtml(sourceNote)}</p>` : ''}
          <p class="helper" style="margin-top:2px;font-size:0.68rem;">${this._t('dashboard_prediction_disclaimer')}</p>
        </div>`;
    }

    /* ============ HORIZONTAL PHASE / MILESTONE OVERVIEW, auto-switches by mode ============ */
    _renderPhaseTimeline(stateObj, discreetMode) {
      const mode = this._resolveMode(stateObj);
      if (mode === 'pregnancy') return this._renderPregnancyMilestones(stateObj);
      if (mode === 'menarche') return this._renderMenarcheChecklist(stateObj);
      return this._renderCyclePhaseOverview(stateObj, discreetMode);
    }

    _renderNfpSummaryLine(stateObj) {
      const attrs = stateObj?.attributes || {};
      const nfp = attrs.nfp_analysis;
      if (!nfp || typeof nfp !== 'object' || !nfp.ovulation_detected) return '';
      const parts = [];
      if (nfp.temperature_rise_day) parts.push(`${this._t('temperature_rise_day') || 'Temperaturanstieg'}: ${escapeHtml(nfp.temperature_rise_day)}`);
      if (nfp.temperature_peak_day) parts.push(`${this._t('nfp_temp_peak') || 'Temperaturhöchstwert'}: ${escapeHtml(nfp.temperature_peak_day)}`);
      if (nfp.cervical_mucus_peak || nfp.cervix_peak) parts.push(this._t('legend_cervix_peak') || 'Zervixschleim-Höhepunkt erkannt');
      if (!parts.length) return '';
      return `<p class="helper" style="margin-top:4px;font-size:0.7rem;">${parts.join(' · ')}</p>`;
    }

    _renderCyclePhaseOverview(stateObj, discreetMode) {
      if (discreetMode) return `<div class="helper">${this._t('dashboard_discreet_note')}</div>`;

      const attrs = stateObj?.attributes || {};
      const cycleDay = Number(attrs.cycle_day ?? 0) || 0;
      const cycleLength = Number(attrs.avg_cycle_length ?? attrs.average_cycle_length ?? attrs.cycle_length_avg ?? 28) || 28;
      const fertility = attrs.fertility_forecast || {};
      let ovulationDay = null;
      if (fertility.ovulation_estimate && attrs.cycle_start_date) {
        const diff = Math.round((new Date(fertility.ovulation_estimate) - new Date(attrs.cycle_start_date)) / 86400000) + 1;
        if (diff > 0 && diff <= cycleLength) ovulationDay = diff;
      }
      if (ovulationDay === null && attrs.ovulation_day) ovulationDay = Number(attrs.ovulation_day);
      if (ovulationDay === null) ovulationDay = Math.round(cycleLength * 0.5);

      const W = 1180, H = 260;
      const padL = 40, padR = 20, padT = 20, padB = 44;
      const bandH = 20, bandGap = 8;
      const plotB = H - padB - bandH - bandGap;
      const plotT = padT;
      const x = (d) => padL + (d - 1) / (cycleLength - 1 || 1) * (W - padL - padR);

      const menstrualEnd = Math.max(2, Math.round(cycleLength * 0.179));
      const follicularEnd = Math.max(menstrualEnd + 1, ovulationDay - 2);
      const ovulationEnd = Math.min(cycleLength - 1, ovulationDay + 1);
      const phases = [
        { from: 1, to: menstrualEnd, label: this._t('phase_menstruation') || 'Menstruation', color: '#E8637D' },
        { from: menstrualEnd, to: follicularEnd, label: this._t('phase_follicular') || 'Follikulär', color: '#7C9885' },
        { from: follicularEnd, to: ovulationEnd, label: 'Eisprung', color: '#3F5A47' },
        { from: ovulationEnd, to: cycleLength + 1, label: this._t('phase_luteal') || 'Luteal', color: '#6B3654' },
      ];

      const bandY = plotB + bandGap;
      const bands = phases.map((p) => {
        const bx = x(p.from), bw = Math.max(2, x(p.to) - x(p.from));
        return `<rect x="${bx.toFixed(1)}" y="${bandY}" width="${bw.toFixed(1)}" height="${bandH}" fill="${p.color}" opacity="0.85" rx="4"/>
                <text x="${(bx + bw / 2).toFixed(1)}" y="${bandY + bandH / 2 + 4}" text-anchor="middle" font-size="10" font-family="Inter, sans-serif" font-weight="600" fill="#FFFDFB">${escapeHtml(p.label)}</text>`;
      }).join('');

      const gridTicks = [1, Math.round(cycleLength * 0.25), Math.round(cycleLength * 0.5), Math.round(cycleLength * 0.75), cycleLength]
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .map((d) => `<line x1="${x(d).toFixed(1)}" x2="${x(d).toFixed(1)}" y1="${plotT}" y2="${plotB}" stroke="var(--divider-color,#e5e7eb)" stroke-width="1"/>
                      <text x="${x(d).toFixed(1)}" y="${H - 20}" text-anchor="middle" font-size="9" font-family="IBM Plex Mono, monospace" fill="var(--secondary-text-color,#9ca3af)">${this._t('cycle_day')} ${d}</text>`)
        .join('');

      // idealized relative curves, scaled to real cycleLength/ovulationDay — not measured biomarkers
      const points = [];
      for (let d = 1; d <= cycleLength; d++) {
        const relToOv = (d - ovulationDay) / cycleLength;
        let endo;
        if (d <= menstrualEnd) endo = 0.08 + (d - 1) * (0.1 / Math.max(1, menstrualEnd - 1));
        else if (d <= ovulationDay) endo = 0.18 + (d - menstrualEnd) * (0.6 / Math.max(1, ovulationDay - menstrualEnd));
        else if (d <= cycleLength - 2) endo = 0.82 - (d - ovulationDay) * 0.005;
        else endo = 0.7 - (d - (cycleLength - 2)) * 0.3;
        endo = Math.max(0.05, Math.min(1, endo));

        let est;
        if (d <= ovulationDay) est = 0.1 + Math.pow(d / ovulationDay, 1.6) * 0.85;
        else if (d <= ovulationDay + 4) est = 1.0 - (d - ovulationDay) * 0.16;
        else est = Math.max(0.15, 0.4 - (d - ovulationDay - 4) * 0.02);
        est = Math.max(0.05, Math.min(1, est));

        let prog;
        if (d <= ovulationDay) prog = 0.04;
        else if (d <= cycleLength - 4) prog = 0.04 + (d - ovulationDay) * (0.92 / Math.max(1, cycleLength - 4 - ovulationDay));
        else prog = Math.max(0.05, 0.9 - (d - (cycleLength - 4)) * 0.2);
        prog = Math.max(0.03, Math.min(1, prog));

        points.push({ d, endo, est, prog });
      }
      const yCurve = (v) => plotT + (1 - v) * (plotB - plotT - 10) + 6;
      const pathFor = (key) => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.d).toFixed(1)},${yCurve(p[key]).toFixed(1)}`).join(' ');
      const areaFor = (key) => `M${x(1).toFixed(1)},${plotB} ${points.map((p) => `L${x(p.d).toFixed(1)},${yCurve(p[key]).toFixed(1)}`).join(' ')} L${x(cycleLength).toFixed(1)},${plotB} Z`;

      const ovLineX = x(ovulationDay).toFixed(1);
      const todayLineX = cycleDay > 0 ? x(Math.min(cycleDay, cycleLength)).toFixed(1) : null;

      const svgContent = `
        ${bands}
        ${gridTicks}
        <path d="${areaFor('endo')}" fill="#6B3654" opacity="0.16"/>
        <path d="${pathFor('endo')}" fill="none" stroke="#6B3654" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="${pathFor('est')}" fill="none" stroke="#E3A23D" stroke-width="2" stroke-dasharray="6 4" stroke-linejoin="round"/>
        <path d="${pathFor('prog')}" fill="none" stroke="#3F5A47" stroke-width="2" stroke-dasharray="6 4" stroke-linejoin="round"/>
        <line x1="${ovLineX}" x2="${ovLineX}" y1="${plotT}" y2="${plotB}" stroke="var(--primary-text-color,#2B1B24)" stroke-width="1.4" stroke-dasharray="3 3"/>
        <circle cx="${ovLineX}" cy="${yCurve(1.0).toFixed(1)}" r="5" fill="var(--primary-text-color,#2B1B24)"/>
        <text x="${ovLineX}" y="${plotT - 6}" text-anchor="middle" font-size="10" font-family="IBM Plex Mono, monospace" fill="var(--primary-text-color,#2B1B24)">LH-Anstieg</text>
        ${todayLineX ? `<line x1="${todayLineX}" x2="${todayLineX}" y1="${plotT}" y2="${bandY + bandH}" stroke="var(--mc-rose-deep,#C43F5E)" stroke-width="1.6"/>
        <text x="${todayLineX}" y="${plotT - 6}" text-anchor="middle" font-size="10" font-family="IBM Plex Mono, monospace" font-weight="600" fill="var(--mc-rose-deep,#C43F5E)">${escapeHtml(this._t('dashboard_today'))}</text>` : ''}
      `;

      const legend = `
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:10px;font-size:0.75rem;color:var(--secondary-text-color,#6b7280);">
          <span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#6B3654;margin-right:5px;vertical-align:middle"></span>Gebärmutterschleimhaut</span>
          <span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#E3A23D;margin-right:5px;vertical-align:middle"></span>Östrogen</span>
          <span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#3F5A47;margin-right:5px;vertical-align:middle"></span>Progesteron</span>
          <span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--primary-text-color,#2B1B24);margin-right:5px;vertical-align:middle"></span>LH-Anstieg (Eisprung)</span>
        </div>
        <p class="helper" style="margin-top:6px;font-size:0.7rem;">Kurvenform ist typisiert (keine gemessenen Hormonwerte), Zeitachse basiert auf deinen echten Zyklusdaten.</p>
        ${this._renderNfpSummaryLine(stateObj)}
      `;

      const titleText = `Cycle phase overview – day ${cycleDay} of ${cycleLength}`;

      return `
        <div class="phase-overview-wrap" role="img" aria-label="${escapeHtml(titleText)}">
          <svg viewBox="0 0 ${W} ${H}" width="100%" height="260" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="overflow:visible;display:block;">
            <title>${escapeHtml(titleText)}</title>
            ${svgContent}
          </svg>
          ${legend}
        </div>
      `;
    }

    _renderPregnancyMilestones(stateObj) {
      const attrs = stateObj?.attributes || {};
      const weeksPregnantRaw = Number(attrs.weeks_pregnant ?? 0) || 0;
      const weekUnit = this._t('dashboard_week_unit');
      const milestones = [
        { week: 6, labelKey: 'milestone_heartbeat' },
        { week: 12, labelKey: 'milestone_first_trimester_screening' },
        { week: 20, labelKey: 'milestone_organ_screening' },
        { week: 24, labelKey: 'milestone_viability' },
        { week: 28, labelKey: 'milestone_third_trimester' },
        { week: 36, labelKey: 'milestone_position_check' },
        { week: 40, labelKey: 'milestone_due_date' },
      ];
      const items = milestones.map((m) => {
        const state = weeksPregnantRaw >= m.week ? 'done' : (Math.abs(weeksPregnantRaw - m.week) < 1 ? 'current' : '');
        return `<div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;min-width:88px;flex:1;">
          <div style="width:12px;height:12px;border-radius:50%;background:${state === 'done' ? 'var(--mc-sage)' : (state === 'current' ? 'var(--mc-rose-deep)' : 'var(--card-background-color,#fff)')};border:2.5px solid ${state === 'current' ? 'var(--mc-rose-deep)' : 'var(--mc-sage)'};${state === 'current' ? 'box-shadow:0 0 0 4px var(--mc-rose-tint);' : ''}"></div>
          <div style="font-size:11px;font-weight:600;">${escapeHtml(this._t(m.labelKey))}</div>
          <div style="font-family:var(--mc-font-mono);font-size:10px;color:var(--secondary-text-color,#6b7280);">${escapeHtml(weekUnit)} ${m.week}</div>
        </div>`;
      }).join('<div style="flex:0.4;height:2px;background:var(--divider-color,#e5e7eb);align-self:flex-start;margin-top:6px;"></div>');
      const isHighRisk = !!(attrs.pregnancy_high_risk ?? (attrs.pregnancy_data || {}).high_risk);
      const riskNote = isHighRisk
        ? `<p class="helper" style="margin-top:8px;font-size:0.72rem;">⚠ ${this._t('dashboard_high_risk_milestone_note') || 'Bei Risikoschwangerschaften sind meist engmaschigere, individuell festgelegte Kontrolltermine üblich — zusätzlich zu den Standardterminen oben. Bitte mit der behandelnden Praxis abstimmen.'}</p>`
        : '';
      return `<div style="display:flex;align-items:flex-start;overflow-x:auto;padding:8px 2px;gap:2px;">${items}</div>${riskNote}`;
    }

    _renderFetalDevelopment(stateObj) {
      const attrs = stateObj?.attributes || {};
      const weeksPregnantRaw = Number(attrs.weeks_pregnant ?? 0) || 0;
      if (weeksPregnantRaw < 4) {
        return `<div class="helper">${this._t('dashboard_not_enough_data')}</div>`;
      }
      const week = Math.max(4, Math.min(40, Math.round(weeksPregnantRaw)));
      const stage = _fetalStageForWeek(week);

      const skillItems = stage.skillKeys.map((k) => `
        <div class="anomaly-item info">
          <span class="anomaly-dot"></span>
          <div class="anomaly-body">
            <p class="anomaly-text">${escapeHtml(this._t(k))}</p>
          </div>
        </div>
      `).join('');

      const assetIdx = _pregnancyAssetIndex(week);
      const weekUnit = this._t('dashboard_week_unit');
      const illustration = `
        <div style="width:110px;flex:none;display:flex;flex-direction:column;align-items:center;gap:6px;">
          <img src="/menstruation_cycle/assets/pregnancy/preg_${assetIdx}.svg" width="84" height="172"
               alt="${escapeHtml(weekUnit)} ${week}" style="max-width:100%;height:auto;" loading="lazy"
               onerror="this.style.display='none';"/>
        </div>`;

      return `
        <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start;">
          ${illustration}
          <div class="kpi-item mc-rose" style="min-width:150px;">
            <span class="kpi-icon" aria-hidden="true">🌱</span>
            <span class="kpi-value">${escapeHtml(weekUnit)} ${week}</span>
            <span class="kpi-label">${this._t('dashboard_fetal_size_label')}: ${escapeHtml(this._t(stage.sizeKey))}</span>
          </div>
          <div style="flex:1;min-width:220px;display:grid;gap:8px;">${skillItems}</div>
        </div>
        <p class="helper" style="margin-top:10px;font-size:0.7rem;">${this._t('dashboard_prediction_disclaimer')}</p>
      `;
    }

    _renderMenarcheChecklist(stateObj) {
      const attrs = stateObj?.attributes || {};
      const preMenData = attrs.pre_menarche_data || {};
      const signs = preMenData.signs && typeof preMenData.signs === 'object' ? preMenData.signs : {};
      const signDefs = [
        { key: 'height_spurt', labelKey: 'menarche_sign_height_spurt' },
        { key: 'breast', labelKey: 'menarche_sign_breast' },
        { key: 'pubic_hair', labelKey: 'menarche_sign_pubic_hair' },
        { key: 'discharge', labelKey: 'menarche_sign_discharge' },
        { key: 'mood', labelKey: 'menarche_sign_mood' },
        { key: 'acne', labelKey: 'menarche_sign_acne' },
        { key: 'body_odor', labelKey: 'menarche_sign_body_odor' },
      ];
      const items = signDefs.map((s) => {
        const entry = _normalizeSignEntry(signs[s.key]);
        const done = entry !== null;
        const detail = done ? `${escapeHtml(entry.stage)}${entry.loggedAt ? ` · ${escapeHtml(entry.loggedAt)}` : ''}` : '';
        return `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:14px;background:var(--mc-sand);border:1px solid var(--divider-color,#e5e7eb);margin-bottom:8px;">
          <div style="width:20px;height:20px;border-radius:6px;flex:none;display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;background:${done ? 'var(--mc-sage)' : 'transparent'};border:${done ? 'none' : '1.5px solid var(--divider-color,#d1d5db)'};">${done ? '✓' : ''}</div>
          <div style="font-size:13px;${done ? '' : 'color:var(--secondary-text-color,#6b7280);'}">${escapeHtml(this._t(s.labelKey))}${done ? ` — ${detail}` : ''}</div>
        </div>`;
      }).join('');
      return `<div>${items}</div>`;
    }


    _renderPhaseDonut(stateObj, discreetMode) {
      if (discreetMode) return `<div class="helper">${this._t('dashboard_discreet_note')}</div>`;
      const attrs = stateObj?.attributes || {};
      const cycleDay = Number(attrs.cycle_day ?? 0) || 0;
      const cycleLength = Number(attrs.average_cycle_length ?? attrs.cycle_length_avg ?? 28) || 28;
      const currentPhase = String(attrs.current_phase ?? attrs.state ?? stateObj?.state ?? '').toLowerCase();

      const phases = [
        { id: 'menstrual',  label: 'Men',  days: Math.round(cycleLength * 0.179), color: '#E8637D' },
        { id: 'follicular', label: 'Fol',  days: Math.round(cycleLength * (0.464 - 0.179)), color: '#7C9885' },
        { id: 'ovulation',  label: 'Ov',   days: Math.max(1, Math.round(cycleLength * 0.072)), color: '#3F5A47' },
        { id: 'luteal',     label: 'Lut',  days: Math.round(cycleLength * (1 - 0.536)), color: '#6B3654' },
      ];

      // Normalize so they sum to cycleLength
      const totalDays = phases.reduce((s, p) => s + p.days, 0);
      const scale = cycleLength / (totalDays || cycleLength);
      let cumAngle = -90; // start at top
      const cx = 60; const cy = 60; const R = 48; const innerR = 30;
      const toRad = (deg) => (deg * Math.PI) / 180;

      const matchPhase = (ph) => {
        const p = ph.id;
        if (currentPhase.includes(p)) return true;
        if (p === 'menstrual' && (currentPhase.includes('period') || currentPhase.includes('bleeding'))) return true;
        if (p === 'ovulation' && currentPhase.includes('ovulat')) return true;
        return false;
      };
      const activeIdx = phases.findIndex(matchPhase);

      const slices = phases.map((ph, idx) => {
        const angleDeg = (ph.days * scale / cycleLength) * 360;
        const startAngle = cumAngle;
        cumAngle += angleDeg;
        const endAngle = cumAngle;
        const isActive = idx === activeIdx;

        const x1 = cx + R * Math.cos(toRad(startAngle));
        const y1 = cy + R * Math.sin(toRad(startAngle));
        const x2 = cx + R * Math.cos(toRad(endAngle));
        const y2 = cy + R * Math.sin(toRad(endAngle));
        const xi1 = cx + innerR * Math.cos(toRad(startAngle));
        const yi1 = cy + innerR * Math.sin(toRad(startAngle));
        const xi2 = cx + innerR * Math.cos(toRad(endAngle));
        const yi2 = cy + innerR * Math.sin(toRad(endAngle));
        const largeArc = angleDeg > 180 ? 1 : 0;

        const pathD = `M${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${largeArc},1 ${x2.toFixed(2)},${y2.toFixed(2)} L${xi2.toFixed(2)},${yi2.toFixed(2)} A${innerR},${innerR} 0 ${largeArc},0 ${xi1.toFixed(2)},${yi1.toFixed(2)} Z`;
        const opacity = isActive ? '1' : '0.45';
        const strokeW = isActive ? '2' : '0.5';
        const strokeColor = isActive ? '#fff' : 'none';

        // Label in slice midpoint
        const midAngle = startAngle + angleDeg / 2;
        const labelR = (R + innerR) / 2;
        const lx = cx + labelR * Math.cos(toRad(midAngle));
        const ly = cy + labelR * Math.sin(toRad(midAngle));

        return `<path d="${pathD}" fill="${ph.color}" opacity="${opacity}" stroke="${strokeColor}" stroke-width="${strokeW}"/>
                <text x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="middle" font-size="8" fill="#fff" font-weight="${isActive ? '700' : '400'}" pointer-events="none">${ph.label}</text>`;
      }).join('');

      // Center day text
      const centerLabel = cycleDay > 0
        ? `<text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="18" font-family="Fraunces, serif" font-weight="500" fill="var(--mc-rose-deep,#C43F5E)">${cycleDay}</text>
           <text x="${cx}" y="${cy + 10}" text-anchor="middle" font-size="7" font-family="IBM Plex Mono, monospace" fill="var(--secondary-text-color,#6b7280)">${escapeHtml(this._t('cycle_day')).toUpperCase()}</text>`
        : `<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="8" fill="var(--secondary-text-color,#6b7280)">—</text>`;

      // Legend below
      const legendItems = phases.map((ph, idx) => {
        const isActive = idx === activeIdx;
        return `<span style="display:inline-flex;align-items:center;gap:4px;font-family:var(--mc-font-mono);font-size:0.68rem;color:${isActive ? ph.color : 'var(--secondary-text-color,#6b7280)'};font-weight:${isActive ? 600 : 400}">
          <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${ph.color};opacity:${isActive ? 1 : 0.5}"></span>${ph.label} ${ph.days}d
        </span>`;
      }).join('');

      return `
        <div class="phase-donut-wrap" role="img" aria-label="${escapeHtml(this._t('dashboard_phase_donut_title'))}">
          <svg viewBox="0 0 120 120" width="120" height="120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="flex-shrink:0;">
            <title>${escapeHtml(this._t('dashboard_phase_donut_title'))}</title>
            ${slices}
            ${centerLabel}
          </svg>
          <div class="phase-donut-legend">${legendItems}</div>
        </div>
      `;
    }

    _renderBasalTempChart(stateObj) {
      const attrs = stateObj?.attributes || {};
      const rawTemps = attrs.basal_temperatures ?? attrs.bbt_readings ?? null;
      const temps = Array.isArray(rawTemps)
        ? rawTemps.filter((t) => t && (typeof t.temperature === 'number' || typeof t.value === 'number'))
        : [];

      if (temps.length < 2) {
        return `<div class="helper">${this._t('dashboard_basal_temp_no_data')}</div>`;
      }

      const recent = temps.slice(-30);
      const values = recent.map((t) => Number(t.temperature ?? t.value ?? 0));
      const minV = Math.min(...values) - 0.05;
      const maxV = Math.max(...values) + 0.05;
      const yRange = maxV - minV || 0.5;

      const ovulationDay = attrs.fertility_forecast?.ovulation_day
        ? Number(attrs.fertility_forecast.ovulation_day)
        : (attrs.ovulation_day ? Number(attrs.ovulation_day) : null);
      const cycleDay = Number(attrs.cycle_day ?? 0);

      const W = 400; const H = 130;
      const padL = 32; const padR = 8; const padT = 16; const padB = 22;
      const chartW = W - padL - padR;
      const chartH = H - padT - padB;

      const toX = (i) => padL + (i / (recent.length - 1 || 1)) * chartW;
      const toY = (v) => padT + chartH - ((v - minV) / yRange) * chartH;

      const ovIdx = (ovulationDay !== null && ovulationDay > 0 && ovulationDay <= recent.length)
        ? Math.max(0, recent.length - ovulationDay)
        : null;

      // shaded post-ovulation band
      const ovBand = ovIdx !== null
        ? `<rect x="${Math.round(toX(ovIdx))}" y="${padT}" width="${Math.round(W - padR - toX(ovIdx))}" height="${chartH}" fill="var(--mc-sage-tint,#E6EDE7)" opacity="0.7"/>`
        : '';

      // coverline: avg of first 6 readings + 0.1
      const coverBase = values.slice(0, Math.min(6, values.length));
      const cover = coverBase.length ? (coverBase.reduce((a, b) => a + b, 0) / coverBase.length) + 0.1 : null;
      const coverLine = cover !== null && cover >= minV && cover <= maxV
        ? `<line x1="${padL}" x2="${W - padR}" y1="${Math.round(toY(cover))}" y2="${Math.round(toY(cover))}" stroke="var(--mc-rose-deep)" stroke-width="1.3" stroke-dasharray="5 4"/>`
        : '';

      const pathD = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${Math.round(toX(i))},${Math.round(toY(v))}`).join(' ');

      const dots = values.map((v, i) => {
        const x = Math.round(toX(i));
        const y = Math.round(toY(v));
        const isToday = i === values.length - 1;
        return `<circle cx="${x}" cy="${y}" r="${isToday ? 4.5 : 2.2}" fill="${isToday ? 'var(--primary-text-color,#2B1B24)' : 'var(--mc-rose-deep)'}"/>`;
      }).join('');

      const yLabels = [minV, (minV + maxV) / 2, maxV].map((v) => {
        const y = Math.round(toY(v));
        return `<text x="${padL - 3}" y="${y + 3}" text-anchor="end" font-size="8" font-family="IBM Plex Mono, monospace" fill="var(--secondary-text-color,#9ca3af)">${v.toFixed(1)}</text>`;
      }).join('');

      const ovLine = ovIdx !== null
        ? `<line x1="${Math.round(toX(ovIdx))}" y1="${padT}" x2="${Math.round(toX(ovIdx))}" y2="${padT + chartH}" stroke="var(--primary-text-color,#2B1B24)" stroke-width="1.2" stroke-dasharray="3 3"/>
           <text x="${Math.round(toX(ovIdx))}" y="${padT - 4}" text-anchor="middle" font-size="8" font-family="IBM Plex Mono, monospace" fill="var(--primary-text-color,#2B1B24)">${escapeHtml(this._t('dashboard_fertility_ovulation'))}</text>`
        : '';

      const firstDate = recent[0]?.date ? String(recent[0].date).slice(5) : '';
      const lastDate = recent[recent.length - 1]?.date ? String(recent[recent.length - 1].date).slice(5) : '';
      const xLabels = `<text x="${padL}" y="${H - 2}" font-size="7" font-family="IBM Plex Mono, monospace" fill="var(--secondary-text-color,#9ca3af)" text-anchor="start">${escapeHtml(firstDate)}</text>
                       <text x="${W - padR}" y="${H - 2}" font-size="7" font-family="IBM Plex Mono, monospace" fill="var(--secondary-text-color,#9ca3af)" text-anchor="end">${escapeHtml(lastDate)}</text>`;

      return `
        <div class="bbt-wrap" role="img" aria-label="${escapeHtml(this._t('dashboard_widget_basal_temp'))}">
          <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="display:block;overflow:visible;">
            <title>${escapeHtml(this._t('dashboard_widget_basal_temp'))}</title>
            ${ovBand}
            ${yLabels}
            ${coverLine}
            <path d="${pathD}" fill="none" stroke="var(--mc-rose-deep)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            ${dots}
            ${ovLine}
            ${xLabels}
          </svg>
        </div>
      `;
    }

    _renderSymptomHeatmap(stateObj) {
      if (!this._selectedEntityId) {
        return `<div class="helper">${this._t('dashboard_no_entity_selected')}</div>`;
      }
      const tagName = 'menstruation-cycle-heatmap-card';
      if (typeof customElements !== 'undefined' && customElements.get(tagName)) {
        const entityId = escapeHtml(this._selectedEntityId);
        return `<${tagName} entity-id="${entityId}" max_cycles="6"></${tagName}>`;
      }
      // Native fallback: simple 4-week × symptom grid
      const attrs = stateObj?.attributes || {};
      const symptomHistory = attrs.symptom_history ?? attrs.symptoms_last_30 ?? null;

      if (!symptomHistory || (Array.isArray(symptomHistory) && symptomHistory.length === 0)) {
        return `<div class="helper">${this._t('dashboard_pain_no_data')}</div>`;
      }

      const entries = Array.isArray(symptomHistory) ? symptomHistory.slice(-28) : [];
      if (entries.length === 0) return `<div class="helper">${this._t('dashboard_pain_no_data')}</div>`;

      const symptomKeys = ['bleeding', 'pain', 'mood'];

      const normalize = (v) => {
        if (!v || v === 'none') return 0;
        if (v === 'light' || v === 1) return 1;
        if (v === 'medium' || v === 2) return 2;
        if (v === 'heavy' || v === 3) return 3;
        if (typeof v === 'number') return Math.min(3, Math.round(v));
        return 1;
      };

      const rows = symptomKeys.map((key) => {
        const cells = entries.map((entry) => {
          const val = normalize(entry?.[key] ?? entry?.symptom_data?.[key]);
          const alpha = 0.1 + (val / 3) * 0.55;
          return `<td style="width:14px;height:14px;background:rgba(196,63,94,${alpha});border-radius:4px;border:1px solid var(--card-background-color,#fff);"></td>`;
        }).join('');
        return `<tr><td style="font-size:0.72rem;font-family:var(--mc-font-mono);color:var(--secondary-text-color,#6b7280);padding-right:8px;white-space:nowrap;">${escapeHtml(this._t(key))}</td>${cells}</tr>`;
      }).join('');

      return `<div style="overflow-x:auto;"><table style="border-collapse:separate;border-spacing:2px;"><tbody>${rows}</tbody></table></div>`;
    }

    _renderAnomalyInsights(stateObj) {
      const attrs = stateObj?.attributes || {};
      const allStarts = Array.isArray(attrs.grouped_starts) ? attrs.grouped_starts.slice().sort() : [];
      const cycleLengths = [];
      for (let i = 1; i < allStarts.length; i++) {
        const len = Math.round((new Date(allStarts[i]) - new Date(allStarts[i - 1])) / 86400000);
        if (len > 10 && len < 80) cycleLengths.push(len);
      }

      if (cycleLengths.length < 3) {
        return `<div class="helper">${this._t('dashboard_not_enough_data')}</div>`;
      }

      const recent = cycleLengths.slice(-12);
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const variance = recent.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / recent.length;
      const stdDev = Math.sqrt(variance);
      const cv = avg > 0 ? (stdDev / avg) * 100 : 0;

      const isRegular = cv < 10;
      const threshold = Math.max(5, 1.5 * stdDev);

      const insights = [];
      insights.push({
        severity: isRegular ? 'info' : 'alert',
        tag: isRegular ? this._t('severity_info') : this._t('severity_alert'),
        label: isRegular ? this._t('dashboard_anomaly_regular') : this._t('dashboard_anomaly_irregular'),
      });

      insights.push({
        severity: 'info',
        tag: this._t('severity_info'),
        label: `${this._t('dashboard_anomaly_consistency')}: ${Math.round((100 - cv))}%`,
      });

      const outliers = recent.filter((l) => Math.abs(l - avg) > threshold);
      outliers.forEach((len) => {
        const isShort = len < avg;
        insights.push({
          severity: 'alert',
          tag: this._t('severity_alert'),
          label: `${isShort ? this._t('dashboard_anomaly_short_cycle') : this._t('dashboard_anomaly_long_cycle')}: ${len}d`,
        });
      });

      return `<div class="anomaly-list">
        ${insights.slice(0, 4).map((ins) => `
          <div class="anomaly-item ${ins.severity}">
            <span class="anomaly-dot" aria-hidden="true"></span>
            <div class="anomaly-body">
              <span class="anomaly-tag">${escapeHtml(ins.tag)}</span>
              <p class="anomaly-text">${escapeHtml(ins.label)}</p>
            </div>
          </div>
        `).join('')}
      </div>`;
    }

    _renderPainMoodTrend(stateObj) {
      const attrs = stateObj?.attributes || {};
      const symptomHistory = attrs.symptom_history ?? attrs.symptoms_last_30 ?? null;
      const entries = Array.isArray(symptomHistory) ? symptomHistory.slice(-14) : [];

      if (entries.length < 2) {
        return `<div class="helper">${this._t('dashboard_pain_no_data')}</div>`;
      }

      const normPain = (v) => {
        if (!v || v === 'none') return 0;
        if (v === 'light' || v === 1) return 1;
        if (v === 'medium' || v === 2) return 2;
        if (v === 'heavy' || v === 3) return 3;
        if (typeof v === 'number') return Math.min(3, v);
        return 1;
      };

      const normMood = (v) => {
        if (!v) return 0;
        if (typeof v === 'number') return Math.min(3, Math.max(0, v));
        const mv = String(v).toLowerCase();
        if (mv.includes('good') || mv.includes('happy') || mv.includes('gut')) return 3;
        if (mv.includes('ok') || mv.includes('neutral')) return 2;
        if (mv.includes('bad') || mv.includes('sad') || mv.includes('angry')) return 1;
        return 1;
      };

      const W = 400; const H = 70;
      const padL = 8; const padR = 8; const padT = 6; const padB = 18;
      const chartW = W - padL - padR;
      const chartH = H - padT - padB;
      const barW = Math.max(2, Math.floor(chartW / entries.length) - 2);
      const gap = entries.length > 1 ? (chartW - barW * entries.length) / (entries.length - 1) : 0;

      const bars = entries.map((entry, idx) => {
        const painVal = normPain(entry?.pain ?? entry?.symptom_data?.pain ?? entry?.bleeding_strength);
        const moodVal = normMood(entry?.mood ?? entry?.symptom_data?.mood);
        const x = Math.round(padL + idx * (barW + gap));

        const painH = Math.max(1, (painVal / 3) * chartH);
        const painY = padT + chartH - painH;
        const moodH = Math.max(1, (moodVal / 3) * chartH);
        const moodY = padT + chartH - moodH;
        const halfW = Math.max(1, Math.floor(barW / 2));

        return `<rect x="${x}" y="${painY}" width="${halfW}" height="${painH}" fill="#E8637D" opacity="0.8" rx="1"/>
                <rect x="${x + halfW}" y="${moodY}" width="${barW - halfW}" height="${moodH}" fill="#6B3654" opacity="0.8" rx="1"/>`;
      }).join('');

      // X-axis: first and last date
      const firstDate = entries[0]?.date ? String(entries[0].date).slice(5) : '';
      const lastDate = entries[entries.length - 1]?.date ? String(entries[entries.length - 1].date).slice(5) : '';
      const xLabels = `<text x="${padL}" y="${H - 2}" font-size="7" font-family="IBM Plex Mono, monospace" fill="var(--secondary-text-color,#9ca3af)">${escapeHtml(firstDate)}</text>
                       <text x="${W - padR}" y="${H - 2}" font-size="7" font-family="IBM Plex Mono, monospace" fill="var(--secondary-text-color,#9ca3af)" text-anchor="end">${escapeHtml(lastDate)}</text>`;

      const legend = `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;font-size:0.7rem;color:var(--secondary-text-color,#6b7280);align-items:center;">
        <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#E8637D;margin-right:4px;vertical-align:middle"></span>${escapeHtml(this._t('pain'))}</span>
        <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#6B3654;margin-right:4px;vertical-align:middle"></span>${escapeHtml(this._t('mood'))}</span>
      </div>`;

      return `
        <div class="pain-mood-wrap" role="img" aria-label="${escapeHtml(this._t('dashboard_widget_pain_mood_trend'))}">
          <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="display:block;overflow:visible;">
            <title>${escapeHtml(this._t('dashboard_widget_pain_mood_trend'))}</title>
            ${bars}
            ${xLabels}
          </svg>
          ${legend}
        </div>
      `;
    }

    _renderYearOverview(stateObj) {
      const attrs = stateObj?.attributes || {};
      const allStarts = Array.isArray(attrs.grouped_starts) ? attrs.grouped_starts : [];
      const forecast = attrs.period_forecast || {};
      const predictedStart = forecast.window_start ?? attrs.next_predicted_start ?? null;

      const startSet = new Set(allStarts);
      if (predictedStart) startSet.add(predictedStart + '_pred');

      const today = new Date();
      const currentYear = today.getFullYear();
      const startYear = today.getMonth() < 6 ? currentYear - 1 : currentYear;

      const months = [];
      for (let m = 0; m < 12; m++) {
        const monthDate = new Date(startYear, today.getMonth() - 11 + m, 1);
        const yr = monthDate.getFullYear();
        const mo = monthDate.getMonth();
        const daysInMonth = new Date(yr, mo + 1, 0).getDate();
        const monthLabel = monthDate.toLocaleDateString(this._lang === 'de' ? 'de-DE' : 'en-US', { month: 'short' });
        const isCurrentMonth = yr === today.getFullYear() && mo === today.getMonth();

        const days = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const isoDate = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const isPeriodStart = allStarts.includes(isoDate);
          const isPredicted = predictedStart && isoDate === predictedStart;
          const isToday = isCurrentMonth && d === today.getDate();

          let fill = 'var(--divider-color,#e5e7eb)';
          if (isToday) fill = 'var(--mc-plum,#6B3654)';
          else if (isPeriodStart) fill = 'var(--mc-rose-deep)';
          else if (isPredicted) fill = 'rgba(232,99,125,0.32)';

          const sz = 5;
          days.push(`<rect x="${(d - 1) * (sz + 1)}" y="0" width="${sz}" height="${sz}" fill="${fill}" rx="1"/>`);
        }

        months.push(`
          <div class="year-month" ${isCurrentMonth ? 'style="opacity:1"' : 'style="opacity:0.75"'}>
            <div class="year-month-label">${escapeHtml(monthLabel)}</div>
            <svg viewBox="0 0 ${(daysInMonth) * 6} 5" width="${(daysInMonth) * 6}" height="5" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="display:block;">
              ${days.join('')}
            </svg>
          </div>
        `);
      }

      const legend = `
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;font-size:0.7rem;color:var(--secondary-text-color,#6b7280);align-items:center;">
          <span><span style="display:inline-block;width:8px;height:8px;border-radius:1px;background:var(--mc-rose-deep);margin-right:4px;vertical-align:middle"></span>${escapeHtml(this._t('dashboard_label_state'))}</span>
          ${predictedStart ? `<span><span style="display:inline-block;width:8px;height:8px;border-radius:1px;background:rgba(232,99,125,0.32);margin-right:4px;vertical-align:middle"></span>${escapeHtml(this._t('period_forecast_window'))}</span>` : ''}
          <span><span style="display:inline-block;width:8px;height:8px;border-radius:1px;background:var(--mc-plum,#6B3654);margin-right:4px;vertical-align:middle"></span>${escapeHtml(this._t('dashboard_today'))}</span>
        </div>
      `;

      return `
        <div class="year-overview-wrap" role="region" aria-label="${escapeHtml(this._t('dashboard_widget_year_overview'))}">
          <div class="year-months-grid">${months.join('')}</div>
          ${legend}
        </div>
      `;
    }

    _renderEditPanel() {
      if (!this._editMode || !this._editDraft) return '';
      const draft = this._editDraft;
      const rows = WIDGET_DEFS.map((widget) => {
        const visible = draft.widgetVisibility[widget.id] !== false;
        const idx = draft.widgetOrder.indexOf(widget.id);
        const widgetLabel = this._t(widget.title);
        return `
          <div class="edit-row">
            <label>
              <input type="checkbox" data-widget-visibility="${widget.id}" ${visible ? 'checked' : ''}
                aria-label="${this._t('dashboard_toggle_widget_aria').replace('{widget}', widgetLabel)}"/>
              ${widgetLabel}
            </label>
            <div class="edit-buttons">
              <button type="button" data-action="widget-up" data-widget="${widget.id}"
                ${idx <= 0 ? 'disabled' : ''}
                aria-label="${this._t('dashboard_move_up_aria').replace('{widget}', widgetLabel)}">↑</button>
              <button type="button" data-action="widget-down" data-widget="${widget.id}"
                ${idx >= draft.widgetOrder.length - 1 ? 'disabled' : ''}
                aria-label="${this._t('dashboard_move_down_aria').replace('{widget}', widgetLabel)}">↓</button>
            </div>
          </div>
        `;
      }).join('');

      return `
        <section class="edit-mode" aria-label="${this._t('dashboard_edit_mode')}">
          <h2>${this._t('dashboard_edit_mode')}</h2>
          <label class="toggle"><input type="checkbox" data-pref="discreetMode" ${draft.discreetMode ? 'checked' : ''}/> ${this._t('dashboard_discreet_mode')}</label>
          <label>${this._t('friendly_name')} <input type="text" data-pref="displayName" value="${escapeHtml(draft.myInfo.displayName)}"/></label>
          <label>${this._t('dashboard_pronouns')} <input type="text" data-pref="pronouns" value="${escapeHtml(draft.myInfo.pronouns)}"/></label>
          <p class="helper">${this._t('dashboard_widget_order_label')}</p>
          ${rows}
          <div class="edit-actions">
            <button type="button" data-action="save-edit" aria-label="${this._t('dashboard_save_aria')}">${this._t('save')}</button>
            <button type="button" data-action="cancel-edit" aria-label="${this._t('dashboard_cancel_aria')}">${this._t('cancel')}</button>
            <button type="button" data-action="reset-preset" aria-label="${this._t('dashboard_reset_aria')}">${this._t('dashboard_reset_preset')}</button>
          </div>
        </section>
      `;
    }

    _renderWidget(widgetId, stateObj, discreetMode) {
      if (this._prefs?.widgetVisibility?.[widgetId] === false) return '';
      const def = WIDGET_DEFS.find((widget) => widget.id === widgetId);
      const spanClass = `span-${def?.span || 6}`;
      let body = '';
      if (widgetId === 'kpi_strip') {
        const strip = this._renderHeroWheel(stateObj, discreetMode);
        return `<article class="card ${spanClass} card--hero" aria-label="Cycle at a glance">${strip}</article>`;
      }
      if (widgetId === 'phase_timeline') {
        const timeline = this._renderPhaseTimeline(stateObj, discreetMode);
        const mode = this._resolveMode(stateObj);
        const titleKey = mode === 'pregnancy' ? 'dashboard_widget_pregnancy_prediction' : (mode === 'menarche' ? 'dashboard_widget_progress' : 'dashboard_widget_today_status');
        return `<article class="card ${spanClass}"><h2>${this._t(titleKey)}</h2>${timeline}</article>`;
      }
      if (widgetId === 'cycle_history') body = this._renderCycleHistoryGraph(stateObj);
      if (widgetId === 'calendar_card') body = this._renderCalendarCard(stateObj);
      if (widgetId === 'pregnancy_prediction') body = this._renderPregnancyPredictionGraph(stateObj);
      if (widgetId === 'phase_donut') body = this._renderPhaseDonut(stateObj, discreetMode);
      if (widgetId === 'basal_temp') body = this._renderBasalTempChart(stateObj);
      if (widgetId === 'symptom_heatmap') body = this._renderSymptomHeatmap(stateObj);
      if (widgetId === 'anomaly_insights') body = this._renderAnomalyInsights(stateObj);
      if (widgetId === 'pain_mood_trend') body = this._renderPainMoodTrend(stateObj);
      if (widgetId === 'year_overview') body = this._renderYearOverview(stateObj);
      if (widgetId === 'fetal_development') body = this._renderFetalDevelopment(stateObj);

      const sensitiveClass = def?.sensitive ? 'sensitive' : '';
      const cardClasses = ['card', spanClass, sensitiveClass].filter(Boolean).join(' ');
      const title = def?.title ? this._t(def.title) : widgetId;
      return `<article class="${cardClasses}"><h2>${title}</h2>${body}</article>`;
    }

    _renderEntityPicker(availableEntities) {
      const entities = Array.isArray(availableEntities) ? availableEntities.filter(Boolean) : [];
      if (entities.length === 0) return '';
      const options = entities
        .map((entity) => {
          const entityId = String(entity?.entityId ?? '');
          const name = String(entity?.name ?? entityId ?? 'Unknown');
          if (!entityId) return '';
          const selected = entityId === this._selectedEntityId ? 'selected' : '';
          return `<option value="${escapeHtml(entityId)}" ${selected}>${escapeHtml(name)}</option>`;
        })
        .filter(Boolean)
        .join('');
      return `<select class="entity-picker" aria-label="${this._t('dashboard_entity_picker_aria')}">${options}</select>`;
    }

    render() {
      if (!this.shadowRoot) return;
      try {
        this._renderContent();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[menstruation-cycle] Dashboard render error:', err);
        this.shadowRoot.innerHTML = `
          <style>:host { display: block; padding: 16px; }</style>
          <main>
            <h1>Cycle Dashboard</h1>
            <p style="color:var(--error-color,#dc2626)">Dashboard failed to render. Please reload the page.</p>
          </main>
        `;
      }
    }

    _renderContent() {
      if (!this.shadowRoot) return;
      const stateObj = this._selectedEntityId ? (this._hass?.states?.[this._selectedEntityId] || null) : null;
      const availableEntities = this._availableEntities || this._getAvailableEntitiesFallback();
      const discreetMode = !!this._prefs?.discreetMode;
      const mode = this._resolveMode(stateObj);
      let order = this._prefs?.widgetOrder || WIDGET_IDS;
      if (mode === 'pregnancy') {
        order = order.filter((id) => !['phase_donut', 'cycle_history', 'pregnancy_prediction', 'calendar_card'].includes(id));
        if (!order.includes('fetal_development')) {
          const idx = order.indexOf('phase_timeline');
          order = idx >= 0
            ? [...order.slice(0, idx + 1), 'fetal_development', ...order.slice(idx + 1)]
            : [...order, 'fetal_development'];
        }
      } else if (mode === 'menarche') {
        // Before the first period there's no cycle to analyze — hide everything
        // that depends on cycle history, phases, fertility, or temperature data.
        const menarcheHidden = [
          'phase_donut', 'cycle_history', 'pregnancy_prediction', 'basal_temp',
          'calendar_card', 'symptom_heatmap', 'anomaly_insights', 'pain_mood_trend', 'year_overview',
          'fetal_development',
        ];
        order = order.filter((id) => !menarcheHidden.includes(id));
      } else {
        order = order.filter((id) => id !== 'fetal_development');
      }
      const cards = order
        .map((widgetId) => this._renderWidget(widgetId, stateObj, discreetMode))
        .filter(Boolean);
      const cardHtml = cards.length
        ? cards.join('')
        : `<div class="empty-state" role="status">
            <p>${this._t('dashboard_empty_state')}</p>
            <p class="helper">${this._t('dashboard_empty_state_hint')}</p>
            <button type="button" data-action="toggle-edit">${this._t('dashboard_edit_mode')}</button>
          </div>`;

      this.shadowRoot.innerHTML = `
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,600;1,9..144,500&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
          :host {
            display: block; height: 100%;
            color: var(--primary-text-color, #1f2937);
            font-family: 'Inter', var(--paper-font-body1_-_font-family, sans-serif);
            --mc-rose: #E8637D; --mc-rose-deep: #C43F5E; --mc-rose-tint: #FBE1E6;
            --mc-plum: #6B3654; --mc-plum-tint: #EDE0E8;
            --mc-sage: #7C9885; --mc-sage-deep: #3F5A47; --mc-sage-tint: #E6EDE7;
            --mc-amber: #E3A23D; --mc-amber-tint: #FBEEDC;
            --mc-sand: color-mix(in srgb, var(--card-background-color, #fff) 88%, var(--mc-rose) 12%);
            --mc-font-display: 'Fraunces', serif;
            --mc-font-mono: 'IBM Plex Mono', monospace;
          }
          .page { padding: 16px; display: grid; gap: 16px; }
          .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
          .toolbar h1 { margin: 0; font-family: var(--mc-font-display); font-weight: 500; font-size: 1.4rem; letter-spacing: -0.01em; }
          .toolbar button {
            border: 1px solid var(--divider-color, #d1d5db);
            border-radius: 999px;
            background: var(--card-background-color, #fff);
            color: inherit;
            padding: 8px 14px;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 600;
            transition: background 0.15s, border-color 0.15s;
          }
          .toolbar button:hover { background: var(--mc-rose-tint); border-color: var(--mc-rose); }
          .entity-picker {
            width: auto;
            border: 1px solid var(--divider-color, #d1d5db);
            border-radius: 999px;
            padding: 7px 12px;
            background: var(--card-background-color, #fff);
            color: inherit;
            cursor: pointer;
            font-size: 0.875rem;
          }
          .grid {
            display: grid;
            gap: 16px;
            grid-template-columns: repeat(12, 1fr);
          }
          @media (max-width: 900px) {
            .grid { grid-template-columns: 1fr; }
          }
          .card {
            background: var(--card-background-color, #fff);
            border: 1px solid var(--divider-color, #e5e7eb);
            border-radius: 20px;
            padding: 18px 20px;
            display: grid;
            gap: 10px;
            box-shadow: 0 1px 2px rgba(43,27,36,.04), 0 8px 24px -14px rgba(43,27,36,.22);
            transition: box-shadow 0.15s;
            grid-column: span 12;
          }
          .card:hover { box-shadow: 0 2px 8px rgba(43,27,36,.08), 0 12px 28px -12px rgba(43,27,36,.16); }
          .card h2 {
            margin: 0;
            font-size: 0.9375rem;
            font-weight: 600;
            color: var(--primary-text-color, #1f2937);
            letter-spacing: -0.005em;
          }
          .span-4 { grid-column: span 4; }
          .span-5 { grid-column: span 5; }
          .span-6 { grid-column: span 6; }
          .span-7 { grid-column: span 7; }
          .span-8 { grid-column: span 8; }
          .span-12 { grid-column: span 12; }
          @media (max-width: 900px) {
            .span-4, .span-5, .span-6, .span-7, .span-8, .span-12 { grid-column: span 1; }
          }
          /* Hero card */
          .card--hero { padding: 20px 22px; }
          .hero-layout { display: grid; grid-template-columns: 200px 1fr; gap: 18px; align-items: center; }
          @media (max-width: 640px) { .hero-layout { grid-template-columns: 1fr; justify-items: center; } }
          .hero-wheel-holder { position: relative; width: 200px; height: 200px; flex: none; }
          .hero-wheel-center {
            position: absolute; inset: 0; display: flex; flex-direction: column;
            align-items: center; justify-content: center; text-align: center;
          }
          .hero-wheel-center .hw-num { font-family: var(--mc-font-display); font-size: 34px; font-weight: 500; line-height: 1; color: var(--mc-rose-deep); }
          .hero-wheel-center .hw-sub { font-family: var(--mc-font-mono); font-size: 10px; letter-spacing: .04em; color: var(--secondary-text-color,#6b7280); margin-top: 3px; }
          .hero-wheel-center .hw-tag { margin-top: 8px; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 999px; background: var(--mc-sage-tint); color: var(--mc-sage-deep); }
          .kpi-strip {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            align-items: stretch;
          }
          .kpi-item {
            display: flex;
            flex-direction: column;
            gap: 3px;
            padding: 12px 14px;
            border-radius: 14px;
            background: var(--mc-sand);
            border: 1px solid var(--divider-color, #e5e7eb);
            min-width: 96px;
            flex: 1 1 96px;
          }
          .kpi-item.mc-rose { background: var(--mc-rose-tint); }
          .kpi-item.mc-plum { background: var(--mc-plum-tint); }
          .kpi-icon { font-size: 1.1rem; line-height: 1; }
          .kpi-value {
            font-family: var(--mc-font-display);
            font-size: 1.5rem;
            font-weight: 500;
            color: var(--primary-text-color, #1f2937);
            line-height: 1.15;
          }
          .kpi-item.mc-rose .kpi-value { color: var(--mc-rose-deep); }
          .kpi-item.mc-plum .kpi-value { color: var(--mc-plum); }
          .kpi-label {
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: .04em;
            color: var(--secondary-text-color, #6b7280);
            line-height: 1.2;
          }
          /* Phase timeline / overview */
          .phase-timeline-wrap {
            width: 100%;
            overflow: visible;
            padding: 8px 0 4px;
          }
          .phase-overview-wrap {
            width: 100%;
            overflow-x: auto;
            padding: 8px 0 4px;
          }
          .trend-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 2px;
          }
          .trend-chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 20px;
            background: var(--mc-sand);
            border: 1px solid var(--divider-color, #e5e7eb);
            font-size: 0.8125rem;
            color: var(--secondary-text-color, #4b5563);
            position: relative;
            overflow: hidden;
          }
          .trend-chip strong { color: var(--primary-text-color, #1f2937); font-weight: 600; }
          .trend-chip__bar {
            display: block;
            position: absolute;
            left: 0; top: 0; bottom: 0;
            width: var(--p, 0%);
            background: var(--primary-color, #2563eb);
            opacity: 0.12;
            border-radius: 20px;
            pointer-events: none;
          }
          .kv { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px solid var(--divider-color, #f3f4f6); }
          .kv:last-child { border-bottom: none; }
          .kv span { font-size: 0.875rem; color: var(--secondary-text-color, #4b5563); }
          .kv strong { font-size: 0.875rem; font-weight: 600; }
          .helper { font-size: .85rem; color: var(--secondary-text-color, #6b7280); line-height: 1.5; }
          .quick-log { display: grid; gap: 10px; }
          label { font-size: 0.875rem; color: var(--secondary-text-color, #4b5563); display: grid; gap: 4px; }
          select, input[type="text"], textarea {
            width: 100%;
            box-sizing: border-box;
            border: 1px solid var(--divider-color, #d1d5db);
            border-radius: 8px;
            padding: 7px 10px;
            background: var(--card-background-color, #fff);
            color: var(--primary-text-color, #1f2937);
            font-size: 0.875rem;
            transition: border-color 0.15s;
          }
          select:hover, input[type="text"]:hover, textarea:hover { border-color: var(--primary-color, #2563eb); }
          .quick-log button[type="submit"] {
            border: none;
            border-radius: 10px;
            background: var(--primary-color, #2563eb);
            color: #fff;
            padding: 9px 16px;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 600;
            transition: opacity 0.15s;
          }
          .quick-log button[type="submit"]:disabled { opacity: 0.55; cursor: not-allowed; }
          button:focus-visible, select:focus-visible, input:focus-visible, textarea:focus-visible { outline: 2px solid var(--primary-color, #2563eb); outline-offset: 2px; }
          .edit-mode {
            border: 1px dashed var(--divider-color, #d1d5db);
            border-radius: 16px;
            padding: 16px;
            display: grid;
            gap: 10px;
            background: var(--secondary-background-color, #f9fafb);
          }
          .edit-mode h2 { margin: 0; font-size: 1rem; font-weight: 600; }
          .edit-row { display: flex; justify-content: space-between; gap: 8px; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--divider-color, #f3f4f6); }
          .edit-row:last-of-type { border-bottom: none; }
          .edit-row label { display: flex; align-items: center; gap: 8px; font-size: 0.875rem; cursor: pointer; }
          .edit-buttons { display: flex; gap: 6px; }
          .edit-buttons button {
            border: 1px solid var(--divider-color, #d1d5db);
            border-radius: 8px;
            background: var(--card-background-color, #fff);
            color: inherit;
            padding: 4px 10px;
            cursor: pointer;
            font-size: 1rem;
            line-height: 1;
          }
          .edit-buttons button:disabled { opacity: 0.35; cursor: not-allowed; }
          .edit-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px; }
          .edit-actions button {
            border: 1px solid var(--divider-color, #d1d5db);
            border-radius: 10px;
            background: var(--card-background-color, #fff);
            color: inherit;
            padding: 8px 14px;
            cursor: pointer;
            font-size: 0.875rem;
          }
          .edit-actions button:first-child { background: var(--primary-color, #2563eb); color: #fff; border-color: transparent; font-weight: 600; }
          .empty-state { text-align: center; padding: 32px 16px; }
          .empty-state p { margin: 0 0 8px; }
          .empty-state button {
            border: 1px solid var(--divider-color, #d1d5db);
            border-radius: 10px;
            background: var(--card-background-color, #fff);
            color: inherit;
            padding: 9px 16px;
            cursor: pointer;
            margin-top: 8px;
            font-size: 0.875rem;
          }
          .message { min-height: 1.4rem; font-size: .875rem; color: var(--secondary-text-color, #4b5563); }
          ul { margin: 4px 0 0; padding: 0 0 0 18px; }
          ul li { font-size: 0.875rem; padding: 3px 0; }
          /* Statistics card native layout */
          .stats-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }
          .stat-tile {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 3px;
            padding: 12px 14px;
            border-radius: 14px;
            background: var(--mc-sand);
            border: 1px solid var(--divider-color, #e5e7eb);
            min-width: 76px;
            flex: 1 1 76px;
          }
          .stat-icon { font-size: 1rem; line-height: 1; }
          .stat-value { font-family: var(--mc-font-display); font-size: 1.3rem; font-weight: 500; color: var(--mc-rose-deep); }
          .stat-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: .03em; color: var(--secondary-text-color, #6b7280); text-align: center; }
          /* Cycle history graph */
          .cycle-history-wrap { width: 100%; }
          .cycle-history-legend {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 6px;
            font-size: 0.75rem;
            color: var(--secondary-text-color, #6b7280);
          }
          .legend-dot {
            display: inline-block;
            width: 10px; height: 10px;
            border-radius: 50%;
            flex-shrink: 0;
          }
          .legend-dash {
            display: inline-block;
            width: 16px; height: 3px;
            border-radius: 2px;
            flex-shrink: 0;
          }
          /* Pregnancy prediction graph */
          .pred-wrap { width: 100%; }
          .pred-meta {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 6px;
          }
          .pred-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 20px;
            background: var(--secondary-background-color, #f3f4f6);
            border: 1px solid var(--divider-color, #e5e7eb);
            font-size: 0.75rem;
            color: var(--secondary-text-color, #4b5563);
          }
          .pred-disclaimer {
            margin: 6px 0 0;
            font-style: italic;
          }
          /* Phase donut */
          .phase-donut-wrap {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
          }
          .phase-donut-legend {
            display: flex;
            flex-direction: column;
            gap: 4px;
            flex: 1 1 80px;
          }
          /* Basal temperature */
          .bbt-wrap { width: 100%; }
          /* Symptom heatmap fallback */
          /* Anomaly insights */
          .anomaly-list {
            display: grid;
            gap: 10px;
          }
          .anomaly-item {
            display: flex;
            gap: 12px;
            align-items: flex-start;
            padding: 12px 14px;
            border-radius: 14px;
            background: var(--mc-sand);
            border: 1px solid var(--divider-color, #e5e7eb);
          }
          .anomaly-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; flex: none; background: var(--mc-sage); }
          .anomaly-item.alert .anomaly-dot { background: var(--mc-rose-deep); }
          .anomaly-body { flex: 1; }
          .anomaly-tag {
            font-family: var(--mc-font-mono);
            font-size: 10px; text-transform: uppercase; letter-spacing: .06em;
            color: var(--secondary-text-color, #6b7280); display: block; margin-bottom: 3px;
          }
          .anomaly-text { margin: 0; font-size: 0.8125rem; line-height: 1.45; }
          /* Pain & mood trend */
          .pain-mood-wrap { width: 100%; }
          /* Year overview */
          .year-overview-wrap { width: 100%; }
          .year-months-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 8px 12px;
            align-items: flex-start;
          }
          .year-month {
            display: flex;
            flex-direction: column;
            gap: 3px;
            align-items: flex-start;
          }
          .year-month-label {
            font-size: 0.7rem;
            color: var(--secondary-text-color, #6b7280);
            white-space: nowrap;
          }
          @media (max-width: 480px) {
            .page { padding: 10px; gap: 10px; }
            .grid { grid-template-columns: 1fr; gap: 10px; }
            .kpi-strip { gap: 8px; }
            .kpi-item { min-width: 60px; padding: 8px 10px; }
          }
          @media (prefers-reduced-motion: reduce) {
            * { transition: none !important; animation: none !important; }
          }
        </style>
        <main class="page">
          <header class="toolbar">
            <h1>${this._t('dashboard_page_title')}</h1>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              ${this._renderEntityPicker(availableEntities)}
              ${!this._editMode ? `<button type="button" data-action="toggle-edit" aria-label="${this._t('dashboard_edit_mode')}">${this._t('dashboard_edit_mode')}</button>` : ''}
            </div>
          </header>
          <div class="message" aria-live="polite">${escapeHtml(this._message || '')}</div>
          ${this._renderEditPanel()}
          <section class="grid" aria-label="${this._t('dashboard_page_title')}">${cardHtml}</section>
        </main>
      `;
    }
  }

  if (!customElements.get('menstruation-cycle-dashboard-panel')) {
    customElements.define('menstruation-cycle-dashboard-panel', MenstruationCycleDashboardPanel);
  }
})();
