const _mcCompactCardI18n = window.menstruationCycleI18n || (window.menstruationCycleI18n = {
  cache: {},
  loading: {},
  fallback: { en: {} },
});

if (typeof _mcCompactCardI18n.normalizeLang !== 'function') {
  _mcCompactCardI18n.normalizeLang = (language) => String(language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en';
}




class MenstruationCycleCard extends HTMLElement {
  connectedCallback() {
    this._iconCache = {};
    this.innerHTML = `
      <ha-card>
        <div class="card-content">
          <div class="status-badge" id="statusBadge"></div>
          <div class="cycle-info" id="cycleInfo"></div>
        </div>
      </ha-card>
    `;
    this.appendChild(this._getStyles());
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
    if (!stateObj) return;

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
      },
    };
    const val = translations.en[key];
    return val !== undefined ? val : (translations.en[key] ?? key);
  }

  _getStyles() {
    const style = document.createElement("style");
    style.textContent = `
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
