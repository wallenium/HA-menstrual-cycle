(() => {
  const WIDGET_DEFS = [
    { id: 'quick_log', title: 'dashboard_widget_quick_log', sensitive: true },
    { id: 'today_status', title: 'dashboard_widget_today_status', sensitive: false },
    { id: 'upcoming_window', title: 'dashboard_widget_upcoming_window', sensitive: false },
    { id: 'reminders', title: 'dashboard_widget_reminders', sensitive: false },
    { id: 'progress', title: 'dashboard_widget_progress', sensitive: false },
    { id: 'my_info', title: 'dashboard_widget_my_info', sensitive: true },
  ];

  const WIDGET_IDS = WIDGET_DEFS.map((widget) => widget.id);

  const PRESETS = {
    young: {
      discreetMode: true,
      widgetOrder: WIDGET_IDS,
      widgetVisibility: {
        quick_log: true,
        today_status: true,
        upcoming_window: true,
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
      widgetOrder: WIDGET_IDS,
      widgetVisibility: {
        quick_log: true,
        today_status: true,
        upcoming_window: true,
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
    }

    connectedCallback() {
      this.shadowRoot?.addEventListener('click', (event) => this._handleClick(event));
      this.shadowRoot?.addEventListener('change', (event) => this._handleChange(event));
      this.shadowRoot?.addEventListener('submit', (event) => this._handleSubmit(event));
    }

    set hass(hass) {
      this._hass = hass;
      this._lang = this._detectLang();

      // Resolve selected entity: prefer user-saved choice, fall back to first alphabetically
      const userId = this._hass?.user?.id;
      const available = this._getAvailableEntities();
      let stateObj = null;

      if (available.length > 0) {
        const savedEntityId = userId ? this._getSelectedEntity(userId) : null;
        const found = savedEntityId ? available.find((e) => e.entityId === savedEntityId) : null;
        const chosen = found || available[0];
        this._selectedEntityId = chosen.entityId;
        stateObj = this._hass?.states?.[this._selectedEntityId] || null;
      } else {
        this._selectedEntityId = null;
        stateObj = null;
      }

      this._activeProfile = stateObj?.attributes?.profile || 'default';
      this._activeMode = this._resolveMode(stateObj);
      if (!this._prefs || this._prefs.__profile !== this._activeProfile || this._prefs.__mode !== this._activeMode) {
        this._prefs = this._loadPrefs(this._activeProfile, this._activeMode);
      }

      const i18n = window.menstruationCycleI18n;
      if (i18n?.load) {
        i18n.load(this._lang).finally(() => this.render());
      }
      this.render();
    }

    _detectLang() {
      const language = this._hass?.locale?.language || this._hass?.language || navigator.language || 'en';
      return String(language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en';
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
    }

    _findPrimaryState() {
      if (!this._hass?.states) return null;
      const entries = Object.entries(this._hass.states)
        .filter(([entityId, state]) => entityId.startsWith('sensor.') && state?.attributes?.entry_id && state?.attributes?.profile);
      if (!entries.length) return null;
      entries.sort(([a], [b]) => a.localeCompare(b));
      return entries[0][1];
    }

    _getAvailableEntities() {
      return Object.entries(this._hass?.states || {})
        .filter(([entityId, state]) =>
          entityId.startsWith('sensor.') &&
          state?.attributes?.entry_id &&
          state?.attributes?.profile)
        .map(([entityId, state]) => ({
          entityId,
          name: state.attributes?.friendly_name || state.attributes?.profile || entityId,
          profile: state.attributes?.profile,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
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
      this.render();
    }

    _t(key) {
      const dict = window.menstruationCycleI18n?.cache?.[this._lang] || window.menstruationCycleI18n?.cache?.en || {};
      return dict[key] ?? key;
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
      const badges = Array.isArray(stateObj?.attributes?.progress_badges) ? stateObj.attributes.progress_badges : [];
      if (!badges.length) return `<div class="helper">${this._t('progress_empty_state')}</div>`;
      const badgeRows = badges.slice(-4).reverse().map((badge) => `<li>${escapeHtml(badge?.title || badge?.id || this._t('progress_section_title'))}</li>`).join('');
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
      if (widgetId === 'reminders') body = this._renderRemindersCard();
      if (widgetId === 'progress') body = this._renderProgressCard(stateObj);
      if (widgetId === 'my_info') body = this._renderMyInfoCard(stateObj);

      const sensitiveClass = def?.sensitive ? 'sensitive' : '';
      const title = def?.title ? this._t(def.title) : widgetId;
      return `<article class="card ${sensitiveClass}"><h2>${title}</h2>${body}</article>`;
    }

    _renderEntityPicker(availableEntities) {
      if (availableEntities.length <= 1) return '';
      const options = availableEntities
        .map((e) => `<option value="${escapeHtml(e.entityId)}" ${e.entityId === this._selectedEntityId ? 'selected' : ''}>${escapeHtml(e.name)}</option>`)
        .join('');
      return `<select class="entity-picker" aria-label="${this._t('dashboard_entity_picker_aria')}">${options}</select>`;
    }

    render() {
      if (!this.shadowRoot) return;
      const stateObj = this._selectedEntityId ? (this._hass?.states?.[this._selectedEntityId] || null) : null;
      const availableEntities = this._getAvailableEntities();
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
          :host { display: block; height: 100%; color: var(--primary-text-color, #1f2937); }
          .page { padding: 16px; display: grid; gap: 12px; }
          .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
          .toolbar button { border: 1px solid var(--divider-color, #d1d5db); border-radius: 10px; background: var(--card-background-color, #fff); color: inherit; padding: 8px 10px; cursor: pointer; }
          .entity-picker { width: auto; border: 1px solid var(--divider-color, #d1d5db); border-radius: 10px; padding: 6px 10px; background: var(--card-background-color, #fff); color: inherit; cursor: pointer; }
          .grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
          .card { background: var(--card-background-color, #fff); border: 1px solid var(--divider-color, #d1d5db); border-radius: 12px; padding: 12px; display: grid; gap: 8px; }
          .card h2 { margin: 0; font-size: 1rem; }
          .kv { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
          .helper { font-size: .88rem; color: var(--secondary-text-color, #4b5563); }
          .quick-log { display: grid; gap: 8px; }
          select, input, textarea { width: 100%; border: 1px solid var(--divider-color, #d1d5db); border-radius: 8px; padding: 6px; background: var(--card-background-color, #fff); color: inherit; }
          button:focus-visible, select:focus-visible, input:focus-visible, textarea:focus-visible { outline: 2px solid var(--primary-color, #2563eb); outline-offset: 2px; }
          .edit-mode { border: 1px dashed var(--divider-color, #d1d5db); border-radius: 12px; padding: 12px; display: grid; gap: 8px; }
          .edit-row { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
          .edit-buttons { display: flex; gap: 6px; }
          .edit-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
          .edit-actions button { border: 1px solid var(--divider-color, #d1d5db); border-radius: 10px; background: var(--card-background-color, #fff); color: inherit; padding: 8px 12px; cursor: pointer; }
          .empty-state { text-align: center; padding: 24px; }
          .empty-state button { border: 1px solid var(--divider-color, #d1d5db); border-radius: 10px; background: var(--card-background-color, #fff); color: inherit; padding: 8px 12px; cursor: pointer; margin-top: 8px; }
          .message { min-height: 1.2rem; font-size: .9rem; }
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
