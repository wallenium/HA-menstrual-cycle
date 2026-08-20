/**
 * Young Girls Support Card
 *
 * A Home Assistant Lovelace card providing age-appropriate, practical education
 * and low-anxiety support for pre-/early-menarche users.
 *
 * Includes:
 *  - School-day helper reminders (kit check, drink water, pain support, rest cue)
 *  - Educational glossary card (cycle, ovulation, spotting, …)
 *  - Menstrual cycle phases graphic with accessibility text
 *  - Hygiene / how-to cards (period underwear care, period cup basics)
 *  - "Is this normal?" reassurance cards
 *
 * Scope: UI/content only — no forecast-engine changes.
 *
 * DISCLAIMER: Educational content only. Always follow product instructions and
 * clinician advice.
 */

'use strict';

// ---------------------------------------------------------------------------
// i18n helper (mirrors the pattern used by other cards in this project)
// ---------------------------------------------------------------------------

const _ygsI18n = window.menstruationCycleI18n || (window.menstruationCycleI18n = {
  cache: {},
  loading: {},
  fallback: { en: {} },
});

if (typeof _ygsI18n.normalizeLang !== 'function') {
  _ygsI18n.normalizeLang = (language) =>
    String(language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en';
}

// ---------------------------------------------------------------------------
// Onboarding stages that show this card by default
// ---------------------------------------------------------------------------

const YGS_DEFAULT_STAGES = new Set(['pre_menarche', 'early_menarche']);

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

function _ygsEsc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _ygsT(strings, key) {
  return (strings && strings[key]) || key;
}

// ---------------------------------------------------------------------------
// Reminder presets definition (content-only, no alarm API calls)
// ---------------------------------------------------------------------------

const REMINDER_PRESETS = [
  { id: 'kit_check',       icon: '🎒', defaultTime: '07:30', schoolOnly: true },
  { id: 'drink_water',     icon: '💧', defaultTime: '10:00', schoolOnly: true },
  { id: 'pain_support',    icon: '💊', defaultTime: '12:00', schoolOnly: false },
  { id: 'rest_cue',        icon: '🌙', defaultTime: '20:00', schoolOnly: false },
];

// ---------------------------------------------------------------------------
// Cycle phases definition (for graphic)
// ---------------------------------------------------------------------------

const CYCLE_PHASES = [
  { id: 'period',      color: '#e57373', arc: 25 },
  { id: 'follicular',  color: '#ffb74d', arc: 30 },
  { id: 'ovulation',   color: '#81c784', arc: 10 },
  { id: 'luteal',      color: '#64b5f6', arc: 35 },
];

// ---------------------------------------------------------------------------
// Main card class
// ---------------------------------------------------------------------------

class YoungGirlsSupportCard extends HTMLElement {
  static getStubConfig() {
    return {
      type: 'custom:menstruation-support-card',
      entity: 'sensor.menstruation',
      show_reminders: true,
      show_glossary: true,
      show_phases_graphic: true,
      show_hygiene_cards: true,
      show_reassurance_cards: true,
    };
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
    this._render();
  }

  setConfig(config) {
    this._config = {
      show_reminders: true,
      show_glossary: true,
      show_phases_graphic: true,
      show_hygiene_cards: true,
      show_reassurance_cards: true,
      ...config,
    };
    // Reminder state: { [id]: { enabled, time, schoolOnly } }
    this._reminderState = {};
    REMINDER_PRESETS.forEach((r) => {
      this._reminderState[r.id] = {
        enabled: false,
        time: r.defaultTime,
        schoolOnly: r.schoolOnly,
      };
    });
    this._quietHoursEnabled = false;
    this._quietStart = '22:00';
    this._quietEnd = '07:00';
    // Glossary expanded terms
    this._glossaryExpanded = {};
    // Active tab for hygiene section
    this._hygieneTab = 'underwear';
    // Reminder settings panel open
    this._reminderSettingsOpen = false;
    // Established-cycle override
    this._showInEstablished = false;

    if (this.shadowRoot) this._render();
  }

  set hass(hass) {
    const prevAttrs = this._entityAttrs;
    this._hass = hass;
    const entityId = this._config?.entity;
    this._entityAttrs = entityId ? hass?.states?.[entityId]?.attributes || null : null;
    const attrsChanged = JSON.stringify(prevAttrs) !== JSON.stringify(this._entityAttrs);
    this._loadI18n();
    if (attrsChanged && this._strings) this._render();
  }

  _loadI18n() {
    if (!this._hass) return;
    const lang = _ygsI18n.normalizeLang(this._hass.locale?.language || 'en');
    if (_ygsI18n.cache && _ygsI18n.cache[lang]) {
      this._strings = _ygsI18n.cache[lang];
      this._render();
      return;
    }
    if (typeof _ygsI18n.load === 'function') {
      _ygsI18n.load(lang).then((strings) => {
        this._strings = strings;
        this._render();
      }).catch(() => {
        this._strings = {};
        this._render();
      });
    } else {
      this._strings = {};
      this._render();
    }
  }

  _t(key) {
    return _ygsT(this._strings, key);
  }

  // ---- Visibility check --------------------------------------------------

  _isVisible() {
    if (!this._config) return false;
    if (!this._hass) return true; // show in editor preview

    const entity = this._config.entity;
    if (!entity) return true;
    const stateObj = this._hass.states[entity];
    if (!stateObj) return true;

    const stage = stateObj.attributes?.onboarding_stage || '';
    if (YGS_DEFAULT_STAGES.has(stage)) return true;
    if (stage === 'established_cycle') return this._showInEstablished;
    // unknown stage — show by default
    return true;
  }

  // ---- Render ------------------------------------------------------------

  _render() {
    if (!this.shadowRoot) return;

    if (!this._isVisible()) {
      this.shadowRoot.innerHTML = '';
      return;
    }

    const cfg = this._config || {};
    const sections = [];

    // Each section is rendered defensively: if one throws (bad data shape,
    // unexpected attribute value, etc.), only that section is skipped —
    // previously a single failing section would blank the entire card with
    // no visible explanation, since nothing here caught exceptions.
    const safeRender = (label, fn) => {
      try {
        return fn.call(this);
      } catch (err) {
        console.error(`[menstruation-support-card] Section "${label}" failed to render:`, err);
        return `<p class="ygs-section-desc" style="color:var(--error-color,#b91c1c);">⚠ ${label} — render error, see console.</p>`;
      }
    };

    if (cfg.show_reminders !== false) sections.push(safeRender('reminders', this._renderReminders));
    if (cfg.show_glossary !== false) sections.push(safeRender('glossary', this._renderGlossary));
    if (cfg.show_phases_graphic !== false) sections.push(safeRender('phases_graphic', this._renderPhasesGraphic));
    if (cfg.show_hygiene_cards !== false) sections.push(safeRender('hygiene_cards', this._renderHygieneCards));
    if (cfg.show_reassurance_cards !== false) sections.push(safeRender('reassurance_cards', this._renderReassuranceCards));

    this.shadowRoot.innerHTML = `
      ${this._renderStyles()}
      <ha-card>
        <div class="ygs-header">
          <span class="ygs-header-icon" aria-hidden="true">🌸</span>
          <h2 class="ygs-title">${_ygsEsc(this._t('ygs_title'))}</h2>
        </div>
        <div class="ygs-body">
          ${sections.join('')}
        </div>
      </ha-card>
    `;

    this._attachEventListeners();
  }

  // ---- Reminders section -------------------------------------------------

  /**
   * Small "getting close" badge for the kit-check reminder when the menarche
   * estimate is under 60 days away — the reminder itself stays always-available
   * (timing is inherently uncertain, and it's a fine habit at any point during
   * pre-menarche tracking), but this makes it feel more relevantly urgent as the
   * estimate approaches, without changing when the reminder can be toggled on.
   */
  _kitCheckProximityBadge() {
    const days = this._entityAttrs?.days_until_menarche;
    if (days === undefined || days === null || days < 0 || days > 60) return '';
    return ` <span class="ygs-proximity-badge">${_ygsEsc(this._t('ygs_kit_check_proximity'))}</span>`;
  }

  _renderReminders() {
    const state = this._reminderState || {};
    const settingsOpen = this._reminderSettingsOpen;

    const previewRows = REMINDER_PRESETS.map((r) => {
      const s = state[r.id] || {};
      const enabled = !!s.enabled;
      const time = s.time || r.defaultTime;
      const checkId = `ygs-rem-${r.id}`;
      const proximityBadge = r.id === 'kit_check' ? this._kitCheckProximityBadge() : '';
      return `
        <div class="reminder-row ${enabled ? 'reminder-enabled' : ''}">
          <span class="reminder-icon" aria-hidden="true">${r.icon}</span>
          <span class="reminder-label">${_ygsEsc(this._t('ygs_rem_' + r.id))}${proximityBadge}</span>
          <span class="reminder-preview">${_ygsEsc(this._t('ygs_rem_' + r.id + '_text'))}</span>
          <label class="ygs-toggle" aria-label="${_ygsEsc(this._t('ygs_rem_toggle'))} ${_ygsEsc(this._t('ygs_rem_' + r.id))}">
            <input type="checkbox" id="${checkId}" data-reminder-id="${r.id}" class="rem-toggle-input" ${enabled ? 'checked' : ''}>
            <span class="ygs-toggle-slider"></span>
          </label>
        </div>
      `;
    }).join('');

    const settingsPanel = settingsOpen ? `
      <div class="rem-settings-panel" role="region" aria-label="${_ygsEsc(this._t('ygs_rem_settings'))}">
        <div class="rem-settings-row">
          <label class="rem-settings-label">${_ygsEsc(this._t('ygs_rem_quiet_hours'))}</label>
          <label class="ygs-toggle" aria-label="${_ygsEsc(this._t('ygs_rem_quiet_hours'))}">
            <input type="checkbox" id="ygs-quiet-enabled" class="rem-quiet-enabled" ${this._quietHoursEnabled ? 'checked' : ''}>
            <span class="ygs-toggle-slider"></span>
          </label>
        </div>
        ${this._quietHoursEnabled ? `
          <div class="rem-settings-row">
            <label class="rem-settings-label">${_ygsEsc(this._t('ygs_rem_quiet_start'))}</label>
            <input type="time" id="ygs-quiet-start" class="rem-time-input" value="${_ygsEsc(this._quietStart)}">
          </div>
          <div class="rem-settings-row">
            <label class="rem-settings-label">${_ygsEsc(this._t('ygs_rem_quiet_end'))}</label>
            <input type="time" id="ygs-quiet-end" class="rem-time-input" value="${_ygsEsc(this._quietEnd)}">
          </div>
        ` : ''}
        ${REMINDER_PRESETS.map((r) => {
          const s = state[r.id] || {};
          return `
            <div class="rem-settings-row">
              <span class="reminder-icon" aria-hidden="true">${r.icon}</span>
              <label class="rem-settings-label">${_ygsEsc(this._t('ygs_rem_' + r.id))}</label>
              <input type="time" class="rem-time-input" data-time-id="${r.id}" value="${_ygsEsc(s.time || r.defaultTime)}">
              ${r.schoolOnly ? `<span class="rem-school-badge">${_ygsEsc(this._t('ygs_rem_school_only'))}</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    ` : '';

    return `
      <section class="ygs-section" aria-labelledby="ygs-rem-heading">
        <div class="ygs-section-header">
          <h3 id="ygs-rem-heading" class="ygs-section-title">
            <span aria-hidden="true">🗓️</span> ${_ygsEsc(this._t('ygs_reminders_title'))}
          </h3>
          <button class="ygs-icon-btn rem-settings-btn" aria-label="${_ygsEsc(this._t('ygs_rem_settings'))}" aria-expanded="${settingsOpen}">
            ⚙️
          </button>
        </div>
        <p class="ygs-section-desc">${_ygsEsc(this._t('ygs_reminders_desc'))}</p>
        ${previewRows}
        ${settingsPanel}
        <p class="ygs-disclaimer-note">${_ygsEsc(this._t('ygs_rem_disclaimer'))}</p>
      </section>
    `;
  }

  // ---- Glossary section --------------------------------------------------

  _renderGlossary() {
    const terms = ['cycle', 'ovulation', 'spotting', 'follicular', 'luteal', 'coverline', 'pms'];
    const rows = terms.map((term) => {
      const expanded = !!(this._glossaryExpanded && this._glossaryExpanded[term]);
      return `
        <div class="glossary-term">
          <button class="glossary-term-header" aria-expanded="${expanded}" data-glossary-term="${term}">
            <span class="glossary-term-name">${_ygsEsc(this._t('ygs_gloss_' + term))}</span>
            <span class="glossary-chevron" aria-hidden="true">${expanded ? '▲' : '▼'}</span>
          </button>
          <div class="glossary-definition ${expanded ? 'glossary-definition--open' : ''}">
            <p>${_ygsEsc(this._t('ygs_gloss_' + term + '_def'))}</p>
            ${expanded ? `<p class="glossary-learn-more">${_ygsEsc(this._t('ygs_gloss_' + term + '_more'))}</p>` : ''}
          </div>
        </div>
      `;
    }).join('');

    return `
      <section class="ygs-section" aria-labelledby="ygs-gloss-heading">
        <h3 id="ygs-gloss-heading" class="ygs-section-title">
          <span aria-hidden="true">📖</span> ${_ygsEsc(this._t('ygs_glossary_title'))}
        </h3>
        <p class="ygs-section-desc">${_ygsEsc(this._t('ygs_glossary_desc'))}</p>
        <div class="glossary-list" role="list">
          ${rows}
        </div>
        <p class="ygs-disclaimer-note">${_ygsEsc(this._t('ygs_glossary_disclaimer'))}</p>
      </section>
    `;
  }

  // ---- Cycle phases graphic ----------------------------------------------

  _renderPhasesGraphic() {
    // SVG donut chart — abstract, no anatomical imagery
    const cx = 80, cy = 80, r = 60, stroke = 22;
    const circumference = 2 * Math.PI * r;
    let offset = 0;

    const arcs = CYCLE_PHASES.map((phase) => {
      const fraction = phase.arc / 100;
      const dash = fraction * circumference;
      const gap = circumference - dash;
      const rotation = (offset / 100) * 360 - 90; // start from top
      offset += phase.arc;
      return `<circle
        class="phase-arc"
        cx="${cx}" cy="${cy}" r="${r}"
        fill="none"
        stroke="${phase.color}"
        stroke-width="${stroke}"
        stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}"
        transform="rotate(${rotation.toFixed(2)} ${cx} ${cy})"
        role="presentation"
      />`;
    }).join('');

    const labels = CYCLE_PHASES.map((phase, i) => {
      const midAngle = CYCLE_PHASES.slice(0, i).reduce((s, p) => s + p.arc, 0) + phase.arc / 2;
      const rad = (midAngle / 100) * 2 * Math.PI - Math.PI / 2;
      const labelR = r + stroke / 2 + 20;
      const lx = (cx + labelR * Math.cos(rad)).toFixed(1);
      const ly = (cy + labelR * Math.sin(rad)).toFixed(1);
      return `<text x="${lx}" y="${ly}" class="phase-label" text-anchor="middle" dominant-baseline="middle"
        aria-hidden="true">${_ygsEsc(this._t('ygs_phase_' + phase.id))}</text>`;
    }).join('');

    const ariaDesc = CYCLE_PHASES.map(
      (phase) => `${this._t('ygs_phase_' + phase.id)}: ${phase.arc}%`,
    ).join(', ');

    return `
      <section class="ygs-section" aria-labelledby="ygs-phases-heading">
        <h3 id="ygs-phases-heading" class="ygs-section-title">
          <span aria-hidden="true">🔵</span> ${_ygsEsc(this._t('ygs_phases_title'))}
        </h3>
        <p class="ygs-section-desc">${_ygsEsc(this._t('ygs_phases_desc'))}</p>
        <div class="phases-graphic-wrap">
          <svg
            viewBox="0 0 160 160"
            width="200"
            height="200"
            role="img"
            aria-label="${_ygsEsc(this._t('ygs_phases_aria'))}"
            aria-describedby="ygs-phases-desc-text"
            class="phases-svg"
          >
            <title>${_ygsEsc(this._t('ygs_phases_aria'))}</title>
            <desc id="ygs-phases-desc-text">${_ygsEsc(ariaDesc)}</desc>
            ${arcs}
            ${labels}
            <text x="${cx}" y="${cy}" class="phase-center-text" text-anchor="middle" dominant-baseline="middle"
              aria-hidden="true">${_ygsEsc(this._t('ygs_phases_center'))}</text>
          </svg>
          <div class="phases-legend" role="list">
            ${CYCLE_PHASES.map((phase) => `
              <div class="phases-legend-row" role="listitem">
                <span class="phases-legend-dot" style="background:${phase.color}" aria-hidden="true"></span>
                <span class="phases-legend-label">${_ygsEsc(this._t('ygs_phase_' + phase.id))}</span>
                <span class="phases-legend-pct">${phase.arc}%</span>
              </div>
            `).join('')}
          </div>
        </div>
        <p class="phases-varies-note">${_ygsEsc(this._t('ygs_phases_varies'))}</p>
      </section>
    `;
  }

  // ---- Hygiene / how-to cards --------------------------------------------

  _renderHygieneCards() {
    const tab = this._hygieneTab || 'underwear';

    const underwearContent = `
      <div class="howto-card" data-howto="underwear">
        <h4 class="howto-title">${_ygsEsc(this._t('ygs_howto_underwear_title'))}</h4>
        <ol class="howto-steps">
          <li>${_ygsEsc(this._t('ygs_howto_underwear_step1'))}</li>
          <li>${_ygsEsc(this._t('ygs_howto_underwear_step2'))}</li>
          <li>${_ygsEsc(this._t('ygs_howto_underwear_step3'))}</li>
          <li>${_ygsEsc(this._t('ygs_howto_underwear_step4'))}</li>
        </ol>
        <p class="howto-disclaimer">${_ygsEsc(this._t('ygs_howto_disclaimer'))}</p>
      </div>
    `;

    const cupContent = `
      <div class="howto-card" data-howto="cup">
        <h4 class="howto-title">${_ygsEsc(this._t('ygs_howto_cup_title'))}</h4>
        <ol class="howto-steps">
          <li>${_ygsEsc(this._t('ygs_howto_cup_step1'))}</li>
          <li>${_ygsEsc(this._t('ygs_howto_cup_step2'))}</li>
          <li>${_ygsEsc(this._t('ygs_howto_cup_step3'))}</li>
          <li>${_ygsEsc(this._t('ygs_howto_cup_step4'))}</li>
        </ol>
        <div class="howto-caution">
          <span aria-hidden="true">⚠️</span>
          ${_ygsEsc(this._t('ygs_howto_cup_caution'))}
        </div>
        <p class="howto-disclaimer">${_ygsEsc(this._t('ygs_howto_disclaimer'))}</p>
      </div>
    `;

    return `
      <section class="ygs-section" aria-labelledby="ygs-hygiene-heading">
        <h3 id="ygs-hygiene-heading" class="ygs-section-title">
          <span aria-hidden="true">🧼</span> ${_ygsEsc(this._t('ygs_hygiene_title'))}
        </h3>
        <div class="howto-tabs" role="tablist" aria-label="${_ygsEsc(this._t('ygs_hygiene_title'))}">
          <button
            class="howto-tab ${tab === 'underwear' ? 'howto-tab--active' : ''}"
            role="tab"
            aria-selected="${tab === 'underwear'}"
            aria-controls="ygs-howto-panel"
            data-howto-tab="underwear"
          >${_ygsEsc(this._t('ygs_howto_underwear_tab'))}</button>
          <button
            class="howto-tab ${tab === 'cup' ? 'howto-tab--active' : ''}"
            role="tab"
            aria-selected="${tab === 'cup'}"
            aria-controls="ygs-howto-panel"
            data-howto-tab="cup"
          >${_ygsEsc(this._t('ygs_howto_cup_tab'))}</button>
        </div>
        <div id="ygs-howto-panel" role="tabpanel">
          ${tab === 'underwear' ? underwearContent : cupContent}
        </div>
      </section>
    `;
  }

  // ---- Reassurance cards -------------------------------------------------

  _renderReassuranceCards() {
    const topics = ['irregular_timing', 'flow_variation', 'spotting'];

    const cards = topics.map((topic) => `
      <div class="reassurance-card">
        <h4 class="reassurance-topic">${_ygsEsc(this._t('ygs_reassure_' + topic + '_title'))}</h4>
        <p class="reassurance-body">${_ygsEsc(this._t('ygs_reassure_' + topic + '_body'))}</p>
        <p class="reassurance-escalation">
          <span aria-hidden="true">💬</span>
          ${_ygsEsc(this._t('ygs_reassure_escalation'))}
        </p>
      </div>
    `).join('');

    const ageCard = this._renderAgeReassuranceCard();

    return `
      <section class="ygs-section" aria-labelledby="ygs-reassure-heading">
        <h3 id="ygs-reassure-heading" class="ygs-section-title">
          <span aria-hidden="true">💛</span> ${_ygsEsc(this._t('ygs_reassure_title'))}
        </h3>
        <p class="ygs-section-desc">${_ygsEsc(this._t('ygs_reassure_desc'))}</p>
        <div class="reassurance-grid">
          ${ageCard}${cards}
        </div>
        <p class="ygs-disclaimer-note">${_ygsEsc(this._t('ygs_reassure_disclaimer'))}</p>
      </section>
    `;
  }

  /**
   * Age-aware "is this normal for me?" card — only rendered when a real age is
   * available (entity connected + birth_date configured on the profile). Addresses
   * a very common early worry ("am I too early/too late?") with the general typical
   * range, distinct from the other 3 topics which are about cycle *characteristics*
   * rather than age itself. Framed reassuringly either way, with the same
   * talk-to-someone escalation note as the other cards for the one case (no period
   * yet by the upper end of the typical range) where checking in with a doctor is a
   * reasonable, non-alarming next step.
   */
  _renderAgeReassuranceCard() {
    const age = this._entityAttrs?.age_at_tracking;
    if (age === undefined || age === null) return '';

    let bodyKey;
    if (age < 9) bodyKey = 'ygs_reassure_age_early';
    else if (age <= 11) bodyKey = 'ygs_reassure_age_typical_early';
    else if (age <= 13) bodyKey = 'ygs_reassure_age_typical';
    else if (age <= 15) bodyKey = 'ygs_reassure_age_typical_late';
    else bodyKey = 'ygs_reassure_age_late';

    return `
      <div class="reassurance-card">
        <h4 class="reassurance-topic">${_ygsEsc(this._t('ygs_reassure_age_title'))}</h4>
        <p class="reassurance-body">${_ygsEsc(this._t(bodyKey))}</p>
        <p class="reassurance-escalation">
          <span aria-hidden="true">💬</span>
          ${_ygsEsc(this._t('ygs_reassure_escalation'))}
        </p>
      </div>
    `;
  }

  // ---- Event listeners ---------------------------------------------------

  _attachEventListeners() {
    if (!this.shadowRoot) return;
    const root = this.shadowRoot;

    // Reminder toggles
    root.querySelectorAll('.rem-toggle-input').forEach((input) => {
      input.addEventListener('change', (e) => {
        const id = e.target.dataset.reminderId;
        if (id && this._reminderState[id]) {
          this._reminderState[id].enabled = e.target.checked;
          this._render();
        }
      });
    });

    // Reminder settings button
    const settingsBtn = root.querySelector('.rem-settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        this._reminderSettingsOpen = !this._reminderSettingsOpen;
        this._render();
      });
    }

    // Quiet hours toggle
    const quietEnabled = root.querySelector('.rem-quiet-enabled');
    if (quietEnabled) {
      quietEnabled.addEventListener('change', (e) => {
        this._quietHoursEnabled = e.target.checked;
        this._render();
      });
    }

    // Quiet start/end time inputs
    const quietStart = root.querySelector('#ygs-quiet-start');
    if (quietStart) {
      quietStart.addEventListener('change', (e) => { this._quietStart = e.target.value; });
    }
    const quietEnd = root.querySelector('#ygs-quiet-end');
    if (quietEnd) {
      quietEnd.addEventListener('change', (e) => { this._quietEnd = e.target.value; });
    }

    // Per-reminder time inputs
    root.querySelectorAll('.rem-time-input[data-time-id]').forEach((input) => {
      input.addEventListener('change', (e) => {
        const id = e.target.dataset.timeId;
        if (id && this._reminderState[id]) {
          this._reminderState[id].time = e.target.value;
        }
      });
    });

    // Glossary term expand/collapse
    root.querySelectorAll('.glossary-term-header').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const term = e.currentTarget.dataset.glossaryTerm;
        if (term) {
          this._glossaryExpanded[term] = !this._glossaryExpanded[term];
          this._render();
        }
      });
    });

    // Hygiene tab switching
    root.querySelectorAll('.howto-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        const tabId = e.currentTarget.dataset.howtoTab;
        if (tabId) {
          this._hygieneTab = tabId;
          this._render();
        }
      });
    });
  }

  // ---- Styles ------------------------------------------------------------

  _renderStyles() {
    return `<style>
      :host {
        display: block;
        --ygs-accent: var(--primary-color, #e91e63);
        --ygs-surface: var(--card-background-color, #fff);
        --ygs-text: var(--primary-text-color, #212121);
        --ygs-secondary-text: var(--secondary-text-color, #757575);
        --ygs-divider: var(--divider-color, #e0e0e0);
        --ygs-radius: 12px;
      }

      ha-card {
        border-radius: var(--ha-card-border-radius, var(--ygs-radius));
        overflow: hidden;
      }

      .ygs-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 16px 16px 8px;
        background: linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%);
      }

      .ygs-header-icon {
        font-size: 1.5rem;
      }

      .ygs-title {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--ygs-text);
      }

      .ygs-body {
        padding: 0 0 8px;
      }

      /* Sections */
      .ygs-section {
        padding: 16px;
        border-bottom: 1px solid var(--ygs-divider);
      }

      .ygs-section:last-child {
        border-bottom: none;
      }

      .ygs-section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .ygs-section-title {
        margin: 0 0 6px;
        font-size: 1rem;
        font-weight: 600;
        color: var(--ygs-text);
      }

      .ygs-section-desc {
        margin: 0 0 10px;
        font-size: 0.85rem;
        color: var(--ygs-secondary-text);
      }

      .ygs-disclaimer-note {
        margin: 10px 0 0;
        font-size: 0.75rem;
        color: var(--ygs-secondary-text);
        font-style: italic;
      }

      /* Icon button */
      .ygs-icon-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.1rem;
        padding: 4px;
        border-radius: 50%;
        transition: background 0.15s;
      }

      .ygs-icon-btn:hover,
      .ygs-icon-btn:focus {
        background: var(--ygs-divider);
        outline: 2px solid var(--ygs-accent);
      }

      /* Toggle switch */
      .ygs-toggle {
        position: relative;
        display: inline-block;
        width: 38px;
        height: 22px;
        flex-shrink: 0;
      }

      .ygs-toggle input {
        opacity: 0;
        width: 0;
        height: 0;
        position: absolute;
      }

      .ygs-toggle-slider {
        position: absolute;
        cursor: pointer;
        inset: 0;
        background: var(--ygs-divider);
        border-radius: 22px;
        transition: background 0.2s;
      }

      .ygs-toggle-slider::before {
        content: '';
        position: absolute;
        height: 16px;
        width: 16px;
        left: 3px;
        bottom: 3px;
        background: #fff;
        border-radius: 50%;
        transition: transform 0.2s;
      }

      .ygs-toggle input:checked + .ygs-toggle-slider {
        background: var(--ygs-accent);
      }

      .ygs-toggle input:checked + .ygs-toggle-slider::before {
        transform: translateX(16px);
      }

      .ygs-toggle input:focus-visible + .ygs-toggle-slider {
        outline: 2px solid var(--ygs-accent);
        outline-offset: 2px;
      }

      /* Reminders */
      .reminder-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 0;
        border-bottom: 1px solid var(--ygs-divider);
        flex-wrap: wrap;
      }

      .reminder-row:last-of-type {
        border-bottom: none;
      }

      .reminder-icon {
        font-size: 1.2rem;
        width: 24px;
        text-align: center;
      }

      .reminder-label {
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--ygs-text);
        flex: 1;
        min-width: 100px;
      }

      .reminder-preview {
        font-size: 0.78rem;
        color: var(--ygs-secondary-text);
        font-style: italic;
        flex: 2;
        min-width: 120px;
      }

      .reminder-enabled .reminder-label {
        color: var(--ygs-accent);
      }

      .ygs-proximity-badge {
        display: inline-block;
        font-size: 0.65rem;
        font-weight: 600;
        padding: 1px 7px;
        border-radius: 999px;
        background: var(--ygs-accent, #E8637D);
        color: #fff;
        vertical-align: middle;
        margin-left: 4px;
      }

      /* Reminder settings */
      .rem-settings-panel {
        background: var(--secondary-background-color, #f5f5f5);
        border-radius: 8px;
        padding: 10px 12px;
        margin-top: 10px;
      }

      .rem-settings-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px 0;
        flex-wrap: wrap;
      }

      .rem-settings-label {
        font-size: 0.85rem;
        color: var(--ygs-text);
        flex: 1;
        min-width: 100px;
      }

      .rem-time-input {
        border: 1px solid var(--ygs-divider);
        border-radius: 6px;
        padding: 4px 8px;
        font-size: 0.85rem;
        background: var(--ygs-surface);
        color: var(--ygs-text);
      }

      .rem-school-badge {
        font-size: 0.7rem;
        background: #e3f2fd;
        color: #1565c0;
        border-radius: 10px;
        padding: 2px 8px;
      }

      /* Glossary */
      .glossary-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .glossary-term {
        border: 1px solid var(--ygs-divider);
        border-radius: 8px;
        overflow: hidden;
      }

      .glossary-term-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 10px 14px;
        background: none;
        border: none;
        cursor: pointer;
        text-align: left;
        color: var(--ygs-text);
        font-size: 0.9rem;
      }

      .glossary-term-header:focus-visible {
        outline: 2px solid var(--ygs-accent);
        outline-offset: -2px;
      }

      .glossary-term-name {
        font-weight: 600;
      }

      .glossary-chevron {
        font-size: 0.7rem;
        color: var(--ygs-secondary-text);
      }

      .glossary-definition {
        display: none;
        padding: 4px 14px 12px;
        font-size: 0.85rem;
        color: var(--ygs-text);
        line-height: 1.5;
      }

      .glossary-definition--open {
        display: block;
      }

      .glossary-learn-more {
        margin-top: 6px;
        font-size: 0.8rem;
        color: var(--ygs-secondary-text);
      }

      /* Phases graphic */
      .phases-graphic-wrap {
        display: flex;
        align-items: center;
        gap: 20px;
        flex-wrap: wrap;
        justify-content: center;
      }

      .phases-svg {
        flex-shrink: 0;
      }

      @media (prefers-reduced-motion: reduce) {
        .phases-svg * {
          animation: none !important;
          transition: none !important;
        }
      }

      .phase-label {
        font-size: 9px;
        fill: var(--ygs-text, #212121);
        font-weight: 500;
      }

      .phase-center-text {
        font-size: 10px;
        fill: var(--ygs-secondary-text, #757575);
      }

      .phases-legend {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 130px;
      }

      .phases-legend-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .phases-legend-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .phases-legend-label {
        font-size: 0.85rem;
        color: var(--ygs-text);
        flex: 1;
      }

      .phases-legend-pct {
        font-size: 0.78rem;
        color: var(--ygs-secondary-text);
      }

      .phases-varies-note {
        margin: 10px 0 0;
        font-size: 0.78rem;
        color: var(--ygs-secondary-text);
        font-style: italic;
        text-align: center;
      }

      /* Hygiene how-to */
      .howto-tabs {
        display: flex;
        gap: 6px;
        margin-bottom: 12px;
      }

      .howto-tab {
        padding: 6px 16px;
        border: 1px solid var(--ygs-divider);
        border-radius: 20px;
        background: none;
        cursor: pointer;
        font-size: 0.85rem;
        color: var(--ygs-text);
        transition: background 0.15s, color 0.15s;
      }

      .howto-tab:focus-visible {
        outline: 2px solid var(--ygs-accent);
      }

      .howto-tab--active {
        background: var(--ygs-accent);
        color: #fff;
        border-color: var(--ygs-accent);
      }

      .howto-card {
        padding: 4px 0;
      }

      .howto-title {
        margin: 0 0 8px;
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--ygs-text);
      }

      .howto-steps {
        margin: 0 0 10px;
        padding-left: 20px;
        font-size: 0.88rem;
        color: var(--ygs-text);
        line-height: 1.6;
      }

      .howto-caution {
        background: #fff8e1;
        border-left: 4px solid #ffc107;
        border-radius: 4px;
        padding: 8px 12px;
        margin-bottom: 10px;
        font-size: 0.83rem;
        color: #5d4037;
      }

      .howto-disclaimer {
        margin: 6px 0 0;
        font-size: 0.75rem;
        color: var(--ygs-secondary-text);
        font-style: italic;
      }

      /* Reassurance */
      .reassurance-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 10px;
        margin-bottom: 4px;
      }

      .reassurance-card {
        background: var(--secondary-background-color, #f5f5f5);
        border-radius: 10px;
        padding: 12px 14px;
      }

      .reassurance-topic {
        margin: 0 0 6px;
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--ygs-text);
      }

      .reassurance-body {
        margin: 0 0 8px;
        font-size: 0.83rem;
        color: var(--ygs-text);
        line-height: 1.5;
      }

      .reassurance-escalation {
        margin: 0;
        font-size: 0.78rem;
        color: var(--ygs-secondary-text);
        font-style: italic;
        display: flex;
        gap: 4px;
        align-items: flex-start;
      }
    </style>`;
  }
}

customElements.define('menstruation-support-card', YoungGirlsSupportCard);

window.customCards = window.customCards || [];
if (!window.customCards.find((c) => c.type === 'menstruation-support-card')) {
  window.customCards.push({
    type: 'menstruation-support-card',
    name: 'Young Girls Support',
    description: 'Age-appropriate support cards: school reminders, glossary, cycle phases, hygiene guides, and reassurance content.',
    preview: false,
  });
}
