/**
 * Pill blister card: a 28-day blister (taken pills filled, pause days gray) built from the `pill_pack`
 * attribute of the cycle sensor. Tap today's pill to log it (menstruation_cycle.add_symptom, contraception_method pill).
 * Card config: entity (the cycle sensor), title (optional).
 */
const _mcPillI18n = window.menstruationCycleI18n || (window.menstruationCycleI18n = { cache: {}, loading: {}, fallback: { en: {} } });
if (typeof _mcPillI18n.normalizeLang !== 'function') {
  _mcPillI18n.normalizeLang = (language) => String(language || 'en').toLowerCase().split(/[-_]/)[0].replace(/^(?![a-z]{2,3}$).*/, 'en');
}

const MC_PILL_FALLBACK_EN = {
  pill_card_title: 'Pill pack',
  pill_card_day: 'Day {day} of {active}',
  pill_card_break: 'Pack break: day {day} of {pause}',
  pill_card_taken_today: "Today's pill is taken.",
  pill_card_tap: "Tap today's pill to log it.",
  pill_card_new_pack: 'The next pill starts a new pack.',
  pill_card_no_pill: 'No pill pack to show. Log "pill" as the contraception method to see your blister.',
  pill_card_state_taken: 'taken',
  pill_card_state_today: 'due today',
  pill_card_state_missed: 'not logged',
  pill_card_state_pause: 'pause',
  pill_card_state_upcoming: 'upcoming',
  entity_not_found: 'Entity not found',
};

class MenstruationPillCard extends HTMLElement {
  static getStubConfig() {
    return { type: 'custom:menstruation-pill-card', entity: 'sensor.menstruation' };
  }

  setConfig(config) {
    if (!config || !config.entity) throw new Error('entity is required');
    this._config = { ...config };
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.addEventListener('click', (ev) => this._onClick(ev));
    }
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    const lang = this._lang();
    if (!_mcPillI18n.cache[lang] && !_mcPillI18n.loading[lang] && typeof _mcPillI18n.load === 'function') {
      _mcPillI18n.load(lang).then(() => this._render()).catch(() => {});
    }
    const signature = JSON.stringify(hass?.states?.[this._config?.entity]?.attributes?.pill_pack ?? null) + lang;
    if (signature === this._signature) return;
    this._signature = signature;
    this._render();
  }

  getCardSize() {
    return 4;
  }

  _lang() {
    return _mcPillI18n.normalizeLang(this._hass?.locale?.language || this._hass?.language || 'en');
  }

  _t(key, values = {}) {
    const loaded = window.menstruationCycleI18n?.cache?.[this._lang()] || {};
    let text = loaded[key] ?? MC_PILL_FALLBACK_EN[key] ?? key;
    for (const [name, value] of Object.entries(values)) text = text.replace(`{${name}}`, String(value));
    return text;
  }

  _esc(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Cell state from the pill_pack attribute: taken | today | missed | pause | upcoming
  _cellState(pack, day) {
    if (pack.taken.includes(day)) return 'taken';
    if (day > pack.active) return 'pause';
    if (day === pack.position && !pack.in_pause && !pack.today_taken) return 'today';
    if (day < pack.position) return 'missed';
    return 'upcoming';
  }

  _render() {
    if (!this._config || !this.shadowRoot) return;
    const stateObj = this._hass?.states?.[this._config.entity];
    const pack = stateObj?.attributes?.pill_pack;
    let body;
    if (!this._hass || !stateObj) {
      body = `<div class="note">${this._t('entity_not_found')}</div>`;
    } else if (!pack || !Array.isArray(pack.taken)) {
      body = `<div class="note">${this._t('pill_card_no_pill')}</div>`;
    } else {
      const total = pack.active + pack.pause;
      const cells = [];
      for (let day = 1; day <= total; day += 1) {
        const state = this._cellState(pack, day);
        const label = `${day}: ${this._t(`pill_card_state_${state}`)}`;
        const here = day === pack.position && !pack.new_pack ? ' here' : '';
        cells.push(state === 'today'
          ? `<button class="cell today" data-action="take" aria-label="${this._esc(label)}">${day}</button>`
          : `<div class="cell ${state}${here}" role="img" aria-label="${this._esc(label)}">${day}</div>`);
      }
      let status;
      if (pack.in_pause) status = this._t('pill_card_break', { day: pack.position - pack.active, pause: pack.pause });
      else if (pack.new_pack) status = this._t('pill_card_new_pack');
      else status = `${this._t('pill_card_day', { day: pack.position, active: pack.active })}. ${this._t(pack.today_taken ? 'pill_card_taken_today' : 'pill_card_tap')}`;
      body = `<div class="blister">${cells.join('')}</div><div class="status">${this._esc(status)}</div>`;
    }
    // title: '' hides the heading (the dashboard panel renders its own).
    const title = this._config.title ?? this._t('pill_card_title');
    this.shadowRoot.innerHTML = `
      <style>
        ha-card { padding: 16px; }
        .title { font-size: 1.1rem; font-weight: 600; margin-bottom: 12px; color: var(--primary-text-color); }
        .blister { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; max-width: 320px; }
        .cell { aspect-ratio: 1; border-radius: 50%; display: flex; align-items: center; justify-content: center;
                font-size: 0.72rem; border: 2px solid var(--divider-color, #ccc); color: var(--secondary-text-color);
                background: transparent; padding: 0; box-sizing: border-box; }
        .cell.taken { background: var(--primary-color, #9b59b6); border-color: var(--primary-color, #9b59b6); color: #fff; }
        .cell.pause { background: var(--disabled-color, #bdbdbd); border-style: dashed; opacity: 0.5; }
        .cell.missed { border-color: var(--warning-color, #f39c12); }
        .cell.today { border-color: var(--primary-color, #9b59b6); color: var(--primary-text-color); font-weight: 700;
                      cursor: pointer; box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color, #9b59b6) 30%, transparent); }
        .cell.here { box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color, #9b59b6) 30%, transparent); }
        .status, .note { margin-top: 12px; font-size: 0.85rem; color: var(--secondary-text-color); }
      </style>
      <ha-card>
        ${title ? `<div class="title">${this._esc(title)}</div>` : ''}
        ${body}
      </ha-card>`;
  }

  _onClick(ev) {
    if (!ev.target?.closest?.('[data-action="take"]') || this._busy || !this._hass) return;
    this._busy = true;
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    Promise.resolve(this._hass.callService('menstruation_cycle', 'add_symptom', {
      entity_id: this._config.entity,
      date,
      symptom_data: { contraception_method: 'pill' },
    })).catch(() => {}).finally(() => { this._busy = false; });
  }
}

if (!customElements.get('menstruation-pill-card')) {
  customElements.define('menstruation-pill-card', MenstruationPillCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'menstruation-pill-card',
  name: 'Menstruation Pill Pack',
  description: 'Pill blister: taken pills, pause days, tap today\'s pill to log it',
});
