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
    { id: 'quick_log', title: 'dashboard_widget_quick_log', sensitive: true },
    { id: 'today_status', title: 'dashboard_widget_today_status', sensitive: false },
    { id: 'upcoming_window', title: 'dashboard_widget_upcoming_window', sensitive: false },
    { id: 'gauge_card', title: 'dashboard_widget_gauge_card', sensitive: false, wide: true },
    { id: 'calendar_card', title: 'dashboard_widget_calendar_card', sensitive: false, wide: true },
    { id: 'statistics_card', title: 'dashboard_widget_statistics_card', sensitive: false, wide: true },
    { id: 'reminders', title: 'dashboard_widget_reminders', sensitive: false },
    { id: 'progress', title: 'dashboard_widget_progress', sensitive: false },
    { id: 'my_info', title: 'dashboard_widget_my_info', sensitive: true },
  ];

  // Default widget order surfaces graph-first cards near the top
  const WIDGET_IDS_GRAPH_FIRST = [
    'gauge_card',
    'calendar_card',
    'statistics_card',
    'today_status',
    'upcoming_window',
    'quick_log',
    'reminders',
    'progress',
    'my_info',
  ];

  const WIDGET_IDS = WIDGET_DEFS.map((widget) => widget.id);

  const PRESETS = {
    young: {
      discreetMode: true,
      widgetOrder: WIDGET_IDS_GRAPH_FIRST,
      widgetVisibility: {
        quick_log: true,
        today_status: true,
        upcoming_window: true,
        gauge_card: false,
        calendar_card: false,
        statistics_card: false,
        reminders: true,
        progress: false,
        my_info: false,
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
        quick_log: true,
        today_status: true,
        upcoming_window: true,
        gauge_card: true,
        calendar_card: true,
        statistics_card: true,
        reminders: true,
        progress: true,
        my_info: true,
      },
      myInfo: {
        displayName: '',
        pronouns: '',
      },
    },
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
        <div class="kv"><span>${this._t('days_until_menarche')}</span><strong>${escapeHtml(attrs.days_until_next_start ?? this._t('unknown'))}</strong></div>
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
      return `
        <div class="kv"><span>${this._t('friendly_name')}</span><strong>${escapeHtml(displayName)}</strong></div>
        <div class="kv"><span>${this._t('dashboard_pronouns')}</span><strong>${escapeHtml(pronouns)}</strong></div>
        <div class="kv"><span>${this._t('onboarding_stage')}</span><strong>${escapeHtml(this._activeMode)}</strong></div>
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
      if (!customElements.get(tagName)) {
        return `<div class="helper">${this._t('dashboard_component_unavailable')}</div>`;
      }
      const entityId = escapeHtml(this._selectedEntityId);
      return `<${tagName} entity-id="${entityId}"></${tagName}>`;
    }

    _renderCalendarCard(stateObj) {
      if (!this._selectedEntityId) {
        return `<div class="helper">${this._t('dashboard_no_entity_selected')}</div>`;
      }
      const tagName = 'menstruation-calendar-card';
      if (!customElements.get(tagName)) {
        return `<div class="helper">${this._t('dashboard_component_unavailable')}</div>`;
      }
      const entityId = escapeHtml(this._selectedEntityId);
      return `<${tagName} entity-id="${entityId}"></${tagName}>`;
    }

    _renderStatisticsCard(stateObj) {
      if (!this._selectedEntityId) {
        return `<div class="helper">${this._t('dashboard_no_entity_selected')}</div>`;
      }
      const tagName = 'menstruation-statistics-card';
      if (!customElements.get(tagName)) {
        return `<div class="helper">${this._t('dashboard_component_unavailable')}</div>`;
      }
      const entityId = escapeHtml(this._selectedEntityId);
      return `<${tagName} entity-id="${entityId}"></${tagName}>`;
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
      if (discreetMode && widgetId === 'my_info') return '';
      const def = WIDGET_DEFS.find((widget) => widget.id === widgetId);
      let body = '';
      if (widgetId === 'quick_log') body = this._renderQuickLogCard(discreetMode);
      if (widgetId === 'today_status') body = this._renderTodayCard(stateObj, discreetMode);
      if (widgetId === 'upcoming_window') body = this._renderUpcomingCard(stateObj);
      if (widgetId === 'gauge_card') body = this._renderGaugeCard(stateObj);
      if (widgetId === 'calendar_card') body = this._renderCalendarCard(stateObj);
      if (widgetId === 'statistics_card') body = this._renderStatisticsCard(stateObj);
      if (widgetId === 'reminders') body = this._renderRemindersCard();
      if (widgetId === 'progress') body = this._renderProgressCard(stateObj);
      if (widgetId === 'my_info') body = this._renderMyInfoCard(stateObj);

      const sensitiveClass = def?.sensitive ? 'sensitive' : '';
      const wideClass = def?.wide ? 'card--wide' : '';
      const cardClasses = ['card', sensitiveClass, wideClass].filter(Boolean).join(' ');
      const title = def?.title ? this._t(def.title) : widgetId;
      const trendChips = ['gauge_card', 'calendar_card', 'statistics_card'].includes(widgetId) && stateObj
        ? this._renderTrendChips(stateObj)
        : '';
      return `<article class="${cardClasses}"><h2>${title}</h2>${trendChips}${body}</article>`;
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
      const cards = (this._prefs?.widgetOrder || WIDGET_IDS)
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
          :host { display: block; height: 100%; color: var(--primary-text-color, #1f2937); font-family: var(--paper-font-body1_-_font-family, inherit); }
          .page { padding: 16px; display: grid; gap: 16px; }
          .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
          .toolbar h1 { margin: 0; font-size: 1.25rem; font-weight: 600; letter-spacing: -0.01em; }
          .toolbar button {
            border: 1px solid var(--divider-color, #d1d5db);
            border-radius: 10px;
            background: var(--card-background-color, #fff);
            color: inherit;
            padding: 8px 14px;
            cursor: pointer;
            font-size: 0.875rem;
            transition: background 0.15s, border-color 0.15s;
          }
          .toolbar button:hover { background: var(--secondary-background-color, #f3f4f6); border-color: var(--primary-color, #2563eb); }
          .entity-picker {
            width: auto;
            border: 1px solid var(--divider-color, #d1d5db);
            border-radius: 10px;
            padding: 7px 12px;
            background: var(--card-background-color, #fff);
            color: inherit;
            cursor: pointer;
            font-size: 0.875rem;
          }
          .grid {
            display: grid;
            gap: 16px;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          }
          @media (min-width: 640px) {
            .grid { grid-template-columns: repeat(2, 1fr); }
          }
          @media (min-width: 900px) {
            .grid { grid-template-columns: repeat(3, 1fr); }
          }
          .card {
            background: var(--card-background-color, #fff);
            border: 1px solid var(--divider-color, #e5e7eb);
            border-radius: 16px;
            padding: 16px;
            display: grid;
            gap: 10px;
            box-shadow: 0 1px 4px rgba(0,0,0,.06), 0 2px 8px rgba(0,0,0,.04);
            transition: box-shadow 0.15s;
          }
          .card:hover { box-shadow: 0 2px 8px rgba(0,0,0,.10), 0 4px 16px rgba(0,0,0,.06); }
          .card h2 {
            margin: 0;
            font-size: 0.9375rem;
            font-weight: 600;
            color: var(--primary-text-color, #1f2937);
            letter-spacing: -0.005em;
          }
          .card--wide { grid-column: 1 / -1; }
          @media (min-width: 640px) {
            .card--wide { grid-column: span 2; }
          }
          @media (min-width: 900px) {
            .card--wide { grid-column: span 2; }
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
            background: var(--secondary-background-color, #f3f4f6);
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
          @media (max-width: 480px) {
            .page { padding: 10px; gap: 10px; }
            .grid { grid-template-columns: 1fr; gap: 10px; }
            .card--wide { grid-column: 1 / -1; }
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
