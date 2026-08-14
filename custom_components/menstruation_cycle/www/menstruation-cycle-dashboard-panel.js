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

  class MenstruationCycleDashboardPanel extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._hass = null;
      this._lang = 'en';
      this._editMode = false;
      this._prefs = null;
      this._activeProfile = 'default';
      this._activeMode = 'general';
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
      const stateObj = this._findPrimaryState();
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
      try {
        const raw = JSON.parse(localStorage.getItem(this._storageKey(profile)) || 'null');
        return this._normalizePrefs(raw, profile, mode);
      } catch (_error) {
        return this._normalizePrefs(preset, profile, mode);
      }
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
      const stateObj = this._findPrimaryState();
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
      const idx = this._prefs.widgetOrder.indexOf(id);
      if (idx < 0) return;
      const next = direction === 'up' ? idx - 1 : idx + 1;
      if (next < 0 || next >= this._prefs.widgetOrder.length) return;
      const order = [...this._prefs.widgetOrder];
      [order[idx], order[next]] = [order[next], order[idx]];
      this._prefs.widgetOrder = order;
      this._savePrefs();
      this.render();
    }

    _handleClick(event) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.dataset.action;
      const widget = target.dataset.widget;

      if (action === 'toggle-edit') {
        this._editMode = !this._editMode;
        this.render();
      } else if (action === 'widget-up' && widget) {
        this._moveWidget(widget, 'up');
      } else if (action === 'widget-down' && widget) {
        this._moveWidget(widget, 'down');
      } else if (action === 'reset-preset') {
        this._prefs = this._normalizePrefs(this._preset(this._activeMode), this._activeProfile, this._activeMode);
        this._savePrefs();
        this.render();
      }
    }

    _handleChange(event) {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !this._prefs) return;
      if (target instanceof HTMLInputElement && target.dataset.widgetVisibility) {
        this._prefs.widgetVisibility[target.dataset.widgetVisibility] = target.checked;
        this._savePrefs();
        this.render();
      }
      if (target instanceof HTMLInputElement && target.dataset.pref === 'discreetMode') {
        this._prefs.discreetMode = target.checked;
        this._savePrefs();
        this.render();
      }
      if (target instanceof HTMLInputElement && target.dataset.pref === 'displayName') {
        this._prefs.myInfo.displayName = target.value.trim();
        this._savePrefs();
      }
      if (target instanceof HTMLInputElement && target.dataset.pref === 'pronouns') {
        this._prefs.myInfo.pronouns = target.value.trim();
        this._savePrefs();
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
      if (!this._editMode || !this._prefs) return '';
      const rows = WIDGET_DEFS.map((widget) => {
        const visible = this._prefs.widgetVisibility[widget.id] !== false;
        const idx = this._prefs.widgetOrder.indexOf(widget.id);
        return `
          <div class="edit-row">
            <label><input type="checkbox" data-widget-visibility="${widget.id}" ${visible ? 'checked' : ''}/> ${this._t(widget.title)}</label>
            <div class="edit-buttons">
              <button type="button" data-action="widget-up" data-widget="${widget.id}" ${idx <= 0 ? 'disabled' : ''}>↑</button>
              <button type="button" data-action="widget-down" data-widget="${widget.id}" ${idx >= this._prefs.widgetOrder.length - 1 ? 'disabled' : ''}>↓</button>
            </div>
          </div>
        `;
      }).join('');

      return `
        <section class="edit-mode" aria-label="${this._t('dashboard_edit_mode')}">
          <h2>${this._t('dashboard_edit_mode')}</h2>
          <label class="toggle"><input type="checkbox" data-pref="discreetMode" ${this._prefs.discreetMode ? 'checked' : ''}/> ${this._t('dashboard_discreet_mode')}</label>
          <label>${this._t('friendly_name')} <input type="text" data-pref="displayName" value="${escapeHtml(this._prefs.myInfo.displayName)}"/></label>
          <label>${this._t('dashboard_pronouns')} <input type="text" data-pref="pronouns" value="${escapeHtml(this._prefs.myInfo.pronouns)}"/></label>
          ${rows}
          <button type="button" data-action="reset-preset">${this._t('dashboard_reset_preset')}</button>
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

    render() {
      if (!this.shadowRoot) return;
      const stateObj = this._findPrimaryState();
      const discreetMode = !!this._prefs?.discreetMode;
      const cardHtml = (this._prefs?.widgetOrder || WIDGET_IDS)
        .map((widgetId) => this._renderWidget(widgetId, stateObj, discreetMode))
        .join('');

      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; height: 100%; color: var(--primary-text-color, #1f2937); }
          .page { padding: 16px; display: grid; gap: 12px; }
          .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
          .toolbar button { border: 1px solid var(--divider-color, #d1d5db); border-radius: 10px; background: var(--card-background-color, #fff); color: inherit; padding: 8px 10px; cursor: pointer; }
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
          .message { min-height: 1.2rem; font-size: .9rem; }
          @media (prefers-reduced-motion: reduce) {
            * { transition: none !important; animation: none !important; }
          }
        </style>
        <main class="page">
          <header class="toolbar">
            <h1>${this._t('dashboard_page_title')}</h1>
            <button type="button" data-action="toggle-edit">${this._editMode ? this._t('dashboard_done') : this._t('dashboard_edit_mode')}</button>
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
