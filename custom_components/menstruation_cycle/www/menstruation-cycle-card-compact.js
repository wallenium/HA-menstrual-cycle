const _mcCompactCardI18n = window.menstruationCycleI18n || (window.menstruationCycleI18n = {
  cache: {},
  loading: {},
  fallback: { en: {} },
});

if (typeof _mcCompactCardI18n.normalizeLang !== 'function') {
  _mcCompactCardI18n.normalizeLang = (language) => String(language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en';
}

/**
 * weitere Ideen, 22.09.2026: "Symptom-Quick-Log direkt vom Dashboard".
 *
 * Das separate Dashboard-Panel (menstruation-cycle-dashboard-panel.js) hat
 * bereits ein eigenes "Schnellprotokoll"-Widget fuer Blutung/Schmerzen -
 * das ist aber eine grosse, eigene Seite. Hier geht es explizit darum,
 * die 3-4 haeufigsten Schmerz-Symptome direkt auf DIESER kleinen, ohnehin
 * meist dauerhaft sichtbaren Statuskarte antippen zu koennen, ohne das
 * grosse Symptom-Formular (Modal in menstruation-gauge-card.js) oder das
 * Dashboard-Panel zu oeffnen. `pain` ist ein Mehrfachauswahl-Feld
 * (SYMPTOM_MULTI_VALUE_KEYS in sensor.py) - add_symptom mergt zwar den
 * Rest des Tageseintrags automatisch (__init__.py: `existing.update(...)`),
 * ersetzt bei einem Update aber das gesamte `pain`-Array. Deshalb wird der
 * heutige Stand vor dem ersten Tap ueber get_symptom nachgeladen
 * (_fetchQuickLogState) und bei jedem Tap der volle, lokal zusammengefuehrte
 * Satz gesendet - sonst wuerden bereits heute erfasste Schmerz-Eintraege
 * durch einen einzelnen Quick-Log-Tap unbemerkt verloren gehen.
 */
const QUICK_LOG_PAIN_OPTIONS = ["cramps", "headache", "lower_back", "tender_breasts"];

class MenstruationCycleCard extends HTMLElement {
  connectedCallback() {
    this._iconCache = {};
    this._quickLogState = { iso: null, pain: null };
    this._quickLogBusy = false;
    this._quickLogFeedback = null;
    this.innerHTML = `
      <ha-card>
        <div class="card-content">
          <div class="status-badge" id="statusBadge"></div>
          <div class="cycle-info" id="cycleInfo"></div>
          <div class="quick-log" id="quickLog"></div>
        </div>
      </ha-card>
    `;
    this.appendChild(this._getStyles());
    // Ein einziger delegierter Listener auf dem Container statt pro Button -
    // #quickLog wird bei jedem Render komplett neu aufgebaut (siehe
    // _renderQuickLog()), einzeln angehaengte Listener wuerden dabei verloren
    // gehen.
    this.querySelector("#quickLog")?.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-quick-pain]");
      if (!btn || btn.disabled) return;
      this._toggleQuickPain(btn.getAttribute("data-quick-pain"));
    });
    this.render();
  }

  setConfig(config) {
    this.config = config;
    this._iconCache = {};
  }

  set hass(hass) {
    this._hass = hass;
    this._loadTranslations();
    this.render();
  }

  render() {
    if (!this._hass || !this.config?.entity) return;

    const stateObj = this._hass.states[this.config.entity];
    if (!stateObj) {
      // HA-10 (Loading/Error/Empty-Baustein in weiteren Karten uebernehmen,
      // 22.09.2026): vorher liess ein fehlendes Entity die Karte einfach
      // leer/veraltet stehen (stilles `return`, kein Hinweis fuer die
      // Nutzerin) - jetzt wie bei den Schwester-Karten dieser Runde ueber
      // die gemeinsamen Helfer aus menstruation-functions.js. Anders als
      // die anderen Karten hat diese Karte KEIN Shadow-DOM (siehe
      // connectedCallback - direktes this.innerHTML auf dem Custom
      // Element), deshalb direkt in die drei vorhandenen Content-Container
      // statt eines kompletten innerHTML-Ersatzes der ganzen Karte.
      const statusBadge = this.querySelector("#statusBadge");
      const cycleInfo = this.querySelector("#cycleInfo");
      const quickLog = this.querySelector("#quickLog");
      const message = this.config.entity
        ? `${this._t("entity_not_found")}: ${this.config.entity}`
        : this._t("entity_not_found");
      if (statusBadge) {
        statusBadge.innerHTML = window.MenstruationFunctions
          ? window.MenstruationFunctions.renderErrorState(message)
          : message;
      }
      if (cycleInfo) cycleInfo.innerHTML = "";
      if (quickLog) quickLog.innerHTML = "";
      return;
    }

    const attrs = stateObj.attributes || {};
    const status = this._getStatusInfo(stateObj.state, attrs);
    const statusBadge = this.querySelector("#statusBadge");
    const cycleInfo = this.querySelector("#cycleInfo");

    // Parse cycle values
    const cycleLength = parseInt(String(attrs.avg_cycle_length || "28"), 10);
    const nextStart = attrs.next_predicted_start;
    
    // Calculate cycleDay from nextStart date
    let cycleDay = 1;
    
    if (nextStart) {
      try {
        const nextDate = new Date(nextStart);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        nextDate.setHours(0, 0, 0, 0);
        
        const daysUntil = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
        cycleDay = cycleLength - daysUntil;
      } catch (e) {
        const daysUntil = parseInt(String(attrs.days_until_next_start || "0"), 10);
        cycleDay = cycleLength - daysUntil;
      }
    } else {
      const daysUntil = parseInt(String(attrs.days_until_next_start || "0"), 10);
      cycleDay = cycleLength - daysUntil;
    }

    if (statusBadge) {
      statusBadge.style.borderColor = status.color;
      statusBadge.style.background = status.badgeBg;
      statusBadge.style.boxShadow = `0 0 0 3px ${status.badgeGlow}, inset 0 0 0 2px ${status.color}`;
      statusBadge.innerHTML = `
        <span class="status-icon" role="img" aria-hidden="true">${status.icon}</span>
        <span class="status-label">${status.label}</span>
      `;
    }

    if (cycleInfo) {
      cycleInfo.innerHTML = `
        <div class="info-row">
          <span class="info-label">${this._t('cycle_day')}</span>
          <span class="info-value">${cycleDay}/${cycleLength}</span>
        </div>
      `;
    }

    this._renderQuickLog();
  }

  /**
   * Baut die Quick-Log-Buttonreihe neu auf. Wird von jedem render()-Aufruf
   * mit aufgerufen (also potenziell oefter als noetig, bei jedem
   * hass-Update) - diese Karte optimiert Re-Renders bewusst nicht weg (im
   * Unterschied zu menstruation-gauge-card.js), das entspricht dem
   * bisherigen, bewusst schlanken Stil dieser kleinen Karte. Der aktuell
   * angezeigte Feedback-Text (_quickLogFeedback) wird dabei aus dem
   * State neu eingesetzt, damit ein zwischenzeitlicher hass-Tick eine
   * gerade sichtbare "Gespeichert."-Meldung nicht vorzeitig verschwinden
   * laesst.
   */
  _renderQuickLog() {
    const container = this.querySelector("#quickLog");
    if (!container) return;

    const todayIso = new Date().toISOString().slice(0, 10);
    if (this._quickLogState.iso !== todayIso) {
      // Neuer Tag (oder erster Render dieser Karteninstanz) - lokalen
      // Zustand zuruecksetzen und den tatsaechlich gespeicherten Stand
      // frisch laden, statt "still" von leer auszugehen (siehe Kommentar
      // an QUICK_LOG_PAIN_OPTIONS oben).
      this._quickLogState = { iso: todayIso, pain: null };
      this._fetchQuickLogState(todayIso);
    }

    const loaded = this._quickLogState.pain !== null;
    const activeSet = this._quickLogState.pain || new Set();
    const escape = window.MenstruationFunctions?.escapeHtmlText || ((s) => String(s ?? ""));

    const buttons = QUICK_LOG_PAIN_OPTIONS.map((key) => {
      const icon = window.MenstruationFunctions?.renderOptionIcon?.("pain", key) || "";
      const label = this._t(`opt_${key}`);
      const isActive = activeSet.has(key);
      const fallback = icon ? "" : `<span class="quick-log-fallback">${escape(label)}</span>`;
      return `
        <button
          type="button"
          class="quick-log-btn${isActive ? " active" : ""}"
          data-quick-pain="${key}"
          ${loaded ? "" : "disabled"}
          title="${escape(label)}"
          aria-pressed="${isActive ? "true" : "false"}"
          aria-label="${escape(label)}"
        >${icon}${fallback}</button>
      `;
    }).join("");

    const feedback = this._quickLogFeedback;
    container.innerHTML = `
      <div class="quick-log-title">${escape(this._t("quick_log_title"))}</div>
      <div class="quick-log-row">${buttons}</div>
      <div class="quick-log-feedback${feedback ? (feedback.isError ? " error" : " success") : ""}" id="quickLogFeedback" ${feedback ? "" : "hidden"}>${feedback ? escape(feedback.text) : ""}</div>
    `;
  }

  /**
   * Laedt den heutigen `pain`-Stand ueber get_symptom nach (liest die volle,
   * ungekappte Historie - anders als die ggf. auf ~30 Eintraege gekappte
   * symptom_history-Attribut, siehe fetchFreshSymptomData() in
   * menstruation-functions.js). Verworfen, falls sich `iso` inzwischen
   * geaendert hat (z.B. Mitternacht waehrend des Ladens) - die Antwort
   * gehoert dann nicht mehr zum aktuell angezeigten Tag.
   */
  async _fetchQuickLogState(iso) {
    if (!window.MenstruationFunctions?.fetchFreshSymptomData) {
      if (this._quickLogState.iso === iso) {
        this._quickLogState = { iso, pain: new Set() };
        this._renderQuickLog();
      }
      return;
    }
    const { data } = await window.MenstruationFunctions.fetchFreshSymptomData(
      this._hass,
      this.config?.entity,
      iso,
      "[menstruation-cycle-card]"
    );
    if (this._quickLogState.iso !== iso) return;
    const painValue = data?.pain;
    const painSet = new Set(Array.isArray(painValue) ? painValue : (painValue ? [painValue] : []));
    this._quickLogState = { iso, pain: painSet };
    this._renderQuickLog();
  }

  /**
   * Ein Tap auf einen Quick-Log-Button: optimistisch sofort im UI
   * umschalten, dann im Hintergrund speichern (gleiches Prinzip wie der
   * bestehende Symptom-Grid-Handler in menstruation-countdown-timer.js).
   * Schickt immer das komplette, lokal zusammengefuehrte `pain`-Array -
   * siehe Kommentar an QUICK_LOG_PAIN_OPTIONS oben, warum das noetig ist.
   */
  async _toggleQuickPain(key) {
    if (this._quickLogBusy || this._quickLogState.pain === null) return;

    const iso = this._quickLogState.iso;
    const previousSet = new Set(this._quickLogState.pain);
    const nextSet = new Set(previousSet);
    if (nextSet.has(key)) {
      nextSet.delete(key);
    } else {
      nextSet.add(key);
    }

    this._quickLogState = { ...this._quickLogState, pain: nextSet };
    this._quickLogBusy = true;
    this._renderQuickLog();

    try {
      await this._hass.callService("menstruation_cycle", "add_symptom", {
        entity_id: this.config?.entity,
        date: iso,
        symptom_data: { pain: Array.from(nextSet) },
      });
      this._setQuickLogFeedback(this._t("symptom_saved"), false);
    } catch (error) {
      console.error("[menstruation-cycle-card] Quick-Log (pain) konnte nicht gespeichert werden:", error);
      if (this._quickLogState.iso === iso) {
        this._quickLogState = { ...this._quickLogState, pain: previousSet };
      }
      this._setQuickLogFeedback(this._t("symptom_save_error"), true);
      this._renderQuickLog();
    } finally {
      this._quickLogBusy = false;
    }
  }

  _setQuickLogFeedback(text, isError) {
    clearTimeout(this._quickLogFeedbackTimeout);
    this._quickLogFeedback = text ? { text, isError: !!isError } : null;
    const el = this.querySelector("#quickLogFeedback");
    if (el) {
      if (text) {
        el.hidden = false;
        el.textContent = text;
        el.className = `quick-log-feedback${isError ? " error" : " success"}`;
      } else {
        el.hidden = true;
      }
    }
    if (text) {
      this._quickLogFeedbackTimeout = setTimeout(() => { this._setQuickLogFeedback(null); }, isError ? 3000 : 1800);
    }
  }

  _getStatusInfo(state, attrs = {}) {
    if (!this._iconCache) this._iconCache = {};
    const getCachedIcon = (statusKey) => {
      const cacheKey = `${statusKey}-large`;
      if (!(cacheKey in this._iconCache)) {
        this._iconCache[cacheKey] = window.ProductIcons?.getStatusAnimatedIcon?.(statusKey, attrs, 'large')
          || window.ProductIcons?.getStatusIcon?.(statusKey, 'large')
          || '';
      }
      return this._iconCache[cacheKey];
    };

    const statusMap = {
      period: {
        icon: getCachedIcon('period'),
        color: "var(--error-color, #e74c3c)",
        badgeBg: "rgba(231, 76, 60, 0.14)",
        badgeGlow: "rgba(231, 76, 60, 0.30)",
        label: this._t('period'),
      },
      fertile: {
        icon: getCachedIcon('fertile'),
        color: "var(--success-color, #27ae60)",
        badgeBg: "rgba(39, 174, 96, 0.14)",
        badgeGlow: "rgba(39, 174, 96, 0.30)",
        label: this._t('fertile'),
      },
      pms: {
        icon: getCachedIcon('pms'),
        color: "var(--warning-color, #f39c12)",
        badgeBg: "rgba(243, 156, 18, 0.14)",
        badgeGlow: "rgba(243, 156, 18, 0.30)",
        label: this._t('pms'),
      },
      neutral: {
        icon: getCachedIcon('neutral'),
        color: "var(--secondary-text-color, #95a5a6)",
        badgeBg: "rgba(149, 165, 166, 0.14)",
        badgeGlow: "rgba(149, 165, 166, 0.30)",
        label: this._t('neutral'),
      },
    };

    return statusMap[state] || statusMap.neutral;
  }

  _loadTranslations() {
    const lang = this._lang();
    if (_mcCompactCardI18n.cache[lang] || _mcCompactCardI18n.loading[lang]) return;
    if (typeof _mcCompactCardI18n.load !== 'function') return;
    _mcCompactCardI18n.load(lang).then(() => this.render()).catch(() => {});
  }

  _lang() {
    const language = this._hass?.locale?.language || this._hass?.language || 'en';
    return _mcCompactCardI18n.normalizeLang(language);
  }

  _t(key) {
    const loaded = window.menstruationCycleI18n?.cache?.[this._lang()] || {};
    if (loaded[key] !== undefined) return loaded[key];
    const translations = {
      en: {
        cycle_day: "Cycle Day",
        period: "Period",
        fertile: "Fertile",
        pms: "PMS",
        neutral: "Neutral",
        quick_log_title: "Quick Log",
        opt_cramps: "Cramps",
        opt_headache: "Headache",
        opt_lower_back: "Lower Back Pain",
        opt_tender_breasts: "Tender Breasts",
        symptom_saved: "Symptoms saved.",
        symptom_save_error: "Could not save symptoms.",
      },
    };
    const val = translations.en[key];
    return val !== undefined ? val : (translations.en[key] ?? key);
  }

  _getStyles() {
    const style = document.createElement("style");
    style.textContent = `
      /* HA-10 (22.09.2026): gemeinsame mc-state-Klassen fuer renderErrorState, siehe render(). */
      ${window.MenstruationFunctions ? window.MenstruationFunctions.mcStateStyles() : ""}
      :host {
        display: block;
        --mg-card-bg: var(--ha-card-background, var(--card-background-color, #fff));
        --mg-card-border: var(--divider-color, rgba(127, 127, 127, 0.35));
      }

      ha-card {
        height: 100%;
        background: var(--mg-card-bg);
        border: 1px solid var(--mg-card-border);
        border-radius: 16px;
      }

      .card-content {
        padding: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
      }

      .status-badge {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 16px 24px;
        border-radius: 12px;
        border: 3px solid;
        width: 100%;
      }

      .status-icon {
        width: 48px;
        height: 48px;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .status-icon svg {
        width: 100%;
        height: 100%;
        display: block;
      }

      .status-icon img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      }

      .status-label {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--primary-text-color);
        letter-spacing: 0.5px;
      }

      .cycle-info {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        background: var(--ha-card-background);
        border: 1px solid var(--divider-color);
        border-radius: 8px;
      }

      .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.9rem;
      }

      .info-label {
        color: var(--secondary-text-color);
        font-weight: 500;
      }

      .info-value {
        color: var(--primary-text-color);
        font-weight: 600;
      }

      /* weitere Ideen, 22.09.2026: Symptom-Quick-Log direkt vom Dashboard */
      .quick-log {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 10px 12px;
        background: var(--ha-card-background);
        border: 1px solid var(--divider-color);
        border-radius: 8px;
      }

      .quick-log-title {
        font-size: 0.78rem;
        font-weight: 500;
        color: var(--secondary-text-color);
      }

      .quick-log-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .quick-log-btn {
        flex: 1 1 0;
        min-width: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px;
        border-radius: 10px;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color, #fff);
        cursor: pointer;
        transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
      }

      .quick-log-btn:active {
        transform: scale(0.94);
      }

      .quick-log-btn:disabled {
        opacity: 0.5;
        cursor: default;
      }

      .quick-log-btn.active {
        background: color-mix(in srgb, var(--primary-color, #e91e63) 18%, var(--card-background-color, #fff));
        border-color: var(--primary-color, #e91e63);
      }

      .quick-log-btn img,
      .quick-log-btn svg {
        width: 26px;
        height: 26px;
        display: block;
      }

      .quick-log-fallback {
        font-size: 0.72rem;
        color: var(--primary-text-color);
        text-align: center;
        line-height: 1.1;
      }

      .quick-log-feedback {
        font-size: 0.78rem;
        text-align: center;
      }

      .quick-log-feedback.success {
        color: var(--success-color, #27ae60);
      }

      .quick-log-feedback.error {
        color: var(--error-color, #e74c3c);
      }

      /* Dark Mode */
      @media (prefers-color-scheme: dark) {
        .status-badge {
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-text-color, #f5f5f5) 25%, transparent) !important;
        }
      }

      @media (max-width: 300px) {
        .status-badge {
          padding: 12px 16px;
          gap: 4px;
        }

        .status-icon {
          width: 40px;
          height: 40px;
        }

        .status-label {
          font-size: 1rem;
        }

        .cycle-info {
          padding: 8px;
          gap: 6px;
        }

        .info-row {
          font-size: 0.8rem;
        }
      }
    `;
    return style;
  }

  static getConfigElement() {
    return document.createElement("menstruation-cycle-card-editor");
  }

  static getStubConfig() {
    return {
      type: "custom:menstruation-cycle-card",
      entity: "sensor.cycle_status",
    };
  }
}

// Bugfix (15.09.2026, gefunden bei einer UI-Durchsicht): `getConfigElement()`
// oben verwies auf den Tag "menstruation-cycle-card-editor", der nirgends
// registriert war - die visuelle Konfiguration öffnete sich dadurch als
// leeres, nicht funktionsfähiges Element, Nutzer mussten die Karte per Hand
// in YAML konfigurieren. Minimaler Editor nach demselben schlanken Muster
// wie `MenstruationCycleCompactStatusEditor` (dieselbe Datei-Familie) - die
// Karte hat nur ein einziges Konfigurationsfeld (`entity`), ein voller
// Entity-Picker mit Suche wäre hier Überbau.
class MenstruationCycleCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _t(key) {
    const lang = String(this._hass?.locale?.language || this._hass?.language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en';
    const loaded = window.menstruationCycleI18n?.cache?.[lang] || {};
    if (loaded[key] !== undefined) return loaded[key];
    const i18n = { en: { entity: 'Entity' } };
    return i18n.en[key] ?? key;
  }

  _emit(nextConfig) {
    this._config = { ...nextConfig };
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }

  _render() {
    if (!this._config) return;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });

    this.shadowRoot.innerHTML = `
      <style>
        .wrap { display: grid; gap: 10px; padding: 4px 0; }
        .row { display: grid; gap: 4px; }
        label { font-size: 12px; font-weight: 600; color: var(--secondary-text-color); }
        input[type='text'] {
          width: 100%;
          box-sizing: border-box;
          padding: 8px 10px;
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
        }
      </style>
      <div class="wrap">
        <div class="row">
          <label for="entity">${this._t('entity')}</label>
          <input id="entity" type="text" value="${String(this._config.entity || '')}" placeholder="sensor.menstruation" />
        </div>
      </div>
    `;

    this.shadowRoot.getElementById('entity')?.addEventListener('change', (ev) => {
      const value = String(ev.target?.value || '').trim();
      this._emit({ ...this._config, entity: value });
    });
  }
}

if (!customElements.get('menstruation-cycle-card-editor')) {
  customElements.define('menstruation-cycle-card-editor', MenstruationCycleCardEditor);
}

customElements.define("menstruation-cycle-card", MenstruationCycleCard);

// Bugfix (15.09.2026): Diese Karte fehlte bislang komplett in
// `window.customCards` - im "Karte hinzufügen"-Dialog von Lovelace war sie
// dadurch nicht auffindbar, nur per Hand eingetipptem YAML-Typ nutzbar,
// anders als alle anderen Karten dieser Integration.
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'menstruation-cycle-card',
  name: 'Menstruation Cycle Status',
  description: 'Compact status badge with cycle day indicator',
});
