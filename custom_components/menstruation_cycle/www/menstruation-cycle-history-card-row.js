const _mcHistoryCardI18n = { cache: {}, loading: {} };

class MenstruationCycleHistoryCardRow extends HTMLElement {
  static getConfigElement() {
    return document.createElement('menstruation-cycle-history-card-row-editor');
  }

  static getStubConfig() {
    return {
      type: 'custom:menstruation-cycle-history-card-row',
      entity: 'sensor.menstruation',
      entry_id: '',
      title: 'Zyklus History',
      max_rows: 12,
      show_fertile_window: true,
      show_pregnancy_status: true,
      show_menarche_status: true,
      show_predicted_cycles: true,
      num_predicted_cycles: 6,
    };
  }

  setConfig(config) {
    if (!config || (!config.entity && !config.entry_id)) {
      throw new Error('entity or entry_id is required');
    }
    this._config = {
      max_rows: 12,
      show_fertile_window: true,
      show_pregnancy_status: true,
      show_menarche_status: true,
      show_predicted_cycles: true,
      num_predicted_cycles: 6,
      ...config,
    };
    this._ensureRoot();
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._loadTranslations();
    this._render();
  }

  getCardSize() {
    return 4;
  }

  _ensureRoot() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
  }

  _loadTranslations() {
    const lang = this._lang();
    if (lang in _mcHistoryCardI18n.cache || _mcHistoryCardI18n.loading[lang]) return;
    _mcHistoryCardI18n.loading[lang] = true;
    fetch(`./translations/${lang}.json`)
      .then((r) => r.ok ? r.json() : {})
      .then((data) => { _mcHistoryCardI18n.cache[lang] = data; delete _mcHistoryCardI18n.loading[lang]; this._render(); })
      .catch(() => { _mcHistoryCardI18n.cache[lang] = {}; delete _mcHistoryCardI18n.loading[lang]; });
  }

  _lang() {
    const language = String(this._hass?.locale?.language || 'en').toLowerCase();
    return language.startsWith('de') ? 'de' : 'en';
  }

  _t(key) {
    const loaded = _mcHistoryCardI18n.cache[this._lang()] || {};
    if (loaded[key] !== undefined) return loaded[key];
    const i18n = {
      en: {
        entity_not_found: 'Entity not found',
        unknown: 'unknown',
        title: 'Cycle History',
        cycle: 'Cycle',
        start_date: 'Start Date',
        end_date: 'End Date',
        length: 'Length',
        days: 'Days',
        status: 'Status',
        fertile_window: 'Fertile (dynamically calculated)',
        ovulation: 'Ovulation (dynamically calculated)',
        pregnant: 'Pregnant',
        pre_menarche: 'Pre-Menarche',
        menarche: 'Menarche',
        actual_period: 'Actual Period',
        predicted: 'Predicted',
        current_cycle: 'Current Cycle',
        previous_cycles: 'Previous Cycles',
      },
    };
    const val = i18n.en[key];
    return val !== undefined ? val : (i18n.en[key] ?? key);
  }

  _resolveEntityId() {
    const states = this._hass?.states || {};
    const configuredEntity = String(this._config?.entity || '').trim();
    if (configuredEntity && states[configuredEntity]) return configuredEntity;

    const targetEntryId = String(this._config?.entry_id || '').trim();
    if (targetEntryId) {
      const match = Object.keys(states).find((entityId) => {
        const st = states[entityId];
        return st?.attributes?.entry_id === targetEntryId;
      });
      if (match) return match;
    }

    return configuredEntity || null;
  }

  _normalizeISO(value) {
    const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  _parseISO(iso) {
    const normalized = this._normalizeISO(iso);
    if (!normalized) return null;
    const [year, month, day] = normalized.split('-').map((part) => Number(part));
    const date = new Date(year, month - 1, day, 12, 0, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  _dayDiff(aIso, bIso) {
    const a = this._parseISO(aIso);
    const b = this._parseISO(bIso);
    if (!a || !b) return 0;
    return Math.round((a.getTime() - b.getTime()) / 86400000);
  }

  _toLocalDateLabel(iso) {
    const dt = this._parseISO(iso);
    if (!dt) return iso || '';
    const language = this._hass?.locale?.language || 'de-DE';
    return new Intl.DateTimeFormat(language, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(dt);
  }

  _buildCycles(groupedStarts, predictedCycleStarts) {
    const starts = Array.from(new Set((groupedStarts || []).map((iso) => this._normalizeISO(iso)).filter(Boolean))).sort();
    if (starts.length < 1) return [];

    const cycles = [];
    for (let index = 0; index < starts.length - 1; index += 1) {
      const start = starts[index];
      const end = starts[index + 1];
      const length = this._dayDiff(end, start);
      if (length > 0 && length <= 80) {
        cycles.push({ start, end, length, predicted: false });
      }
    }

    const normalizedPredictedStarts = Array.from(
      new Set((predictedCycleStarts || []).map((iso) => this._normalizeISO(iso)).filter(Boolean)),
    ).sort();
    let lastStart = starts[starts.length - 1];
    normalizedPredictedStarts.forEach((predictedStart) => {
      if (predictedStart && lastStart) {
        const predictedLength = this._dayDiff(predictedStart, lastStart);
        if (predictedLength > 0 && predictedLength <= 80) {
          cycles.push({ start: lastStart, end: predictedStart, length: predictedLength, predicted: true });
          lastStart = predictedStart;
        }
      }
    });

    return cycles.reverse();
  }

  _render() {
    this._ensureRoot();
    if (!this._config || !this.shadowRoot) return;

    const entityId = this._resolveEntityId();
    const stateObj = entityId ? this._hass?.states?.[entityId] : undefined;
    
    if (!stateObj) {
      this.shadowRoot.innerHTML = '<ha-card><div class="pad">Entity not found</div></ha-card>';
      return;
    }

    const attrs = stateObj.attributes || {};
    const groupedStartsAttr = Array.isArray(attrs.grouped_starts) ? attrs.grouped_starts : [];
    const showPredictedCycles = this._config.show_predicted_cycles !== false;
    const maxPredictedCycles = Math.max(1, Math.min(12, Number(this._config.num_predicted_cycles || 6)));
    const predictedStarts = Array.isArray(attrs.predicted_cycle_starts) ? attrs.predicted_cycle_starts : [];
    const normalizedNextPredicted = this._normalizeISO(attrs.next_predicted_start || null);
    const predictedCycleStarts = showPredictedCycles
      ? predictedStarts.slice(0, maxPredictedCycles)
      : [];
    if (showPredictedCycles && predictedCycleStarts.length === 0 && normalizedNextPredicted) {
      predictedCycleStarts.push(normalizedNextPredicted);
    }
    const cycles = this._buildCycles(groupedStartsAttr, predictedCycleStarts);
    const maxRows = Math.max(1, Number(this._config.max_rows || 12));
    const visibleCycles = cycles.slice(0, maxRows);

    let tableRows = '';
    if (visibleCycles.length > 0) {
      visibleCycles.forEach((cycle, index) => {
        const isCurrentCycle = index === 0 && cycle.predicted;
        const cycleLabel = isCurrentCycle ? this._t('current_cycle') : `${this._t('cycle')} ${visibleCycles.length - index}`;
        const startLabel = this._toLocalDateLabel(cycle.start);
        const endLabel = this._toLocalDateLabel(cycle.end);
        const statusClass = cycle.predicted ? 'predicted' : 'completed';
        const statusLabel = cycle.predicted ? this._t('predicted') : this._t('actual_period');
        tableRows += `<tr class="cycle-row ${statusClass}"><td class="cell-label">${cycleLabel}</td><td class="cell-date">${startLabel}</td><td class="cell-date">${endLabel}</td><td class="cell-length">${cycle.length} ${this._t('days')}</td><td class="cell-status"><span class="status-label">${statusLabel}</span></td></tr>`;
      });
    }

    const html = `<style>
      :host {
        display: block;
        --mg-card-bg: var(--ha-card-background, var(--card-background-color, #fff));
        --mg-text-secondary: var(--secondary-text-color, #6b7280);
        --mg-border: var(--divider-color, rgba(127, 127, 127, 0.35));
      }
      ha-card { padding: 12px; background: var(--mg-card-bg); }
      .title { font-weight: 600; margin: 0 0 12px; color: var(--primary-text-color); }
      .table-wrap { overflow-x: auto; }
      table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
      thead { background: color-mix(in srgb, var(--mg-text-secondary) 10%, transparent); color: var(--mg-text-secondary); }
      th { padding: 8px 6px; text-align: left; font-weight: 600; border-bottom: 1px solid var(--mg-border); font-size: 0.75rem; }
      .cycle-row { border-bottom: 1px solid var(--mg-border); transition: background-color 120ms ease; }
      .cycle-row:hover { background: color-mix(in srgb, var(--mg-text-secondary) 8%, transparent); }
      .cycle-row.predicted { opacity: 0.7; font-style: italic; }
      td { padding: 10px 6px; color: var(--primary-text-color); }
      .cell-label { font-weight: 500; min-width: 80px; }
      .cell-date { min-width: 70px; color: var(--mg-text-secondary); font-size: 0.85rem; }
      .cell-length { text-align: center; font-weight: 500; min-width: 50px; }
      .cell-status { text-align: right; min-width: 80px; }
      .status-label { display: inline-block; padding: 2px 8px; border-radius: 12px; background: color-mix(in srgb, var(--mg-text-secondary) 14%, transparent); font-size: 0.75rem; font-weight: 500; color: var(--mg-text-secondary); border: 1px solid var(--mg-border); }
      @media (prefers-color-scheme: dark) {
        .cycle-row:hover { background: color-mix(in srgb, var(--mg-text-secondary) 16%, transparent); }
      }
      @media (max-width: 600px) { table { font-size: 0.8rem; } th, td { padding: 6px 4px; } }
    </style>
    <ha-card>
      <div class="title">${this._config.title || this._t('title')}</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>${this._t('cycle')}</th>
              <th>${this._t('start_date')}</th>
              <th>${this._t('end_date')}</th>
              <th>${this._t('length')}</th>
              <th>${this._t('status')}</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="5">No cycles available</td></tr>'}
          </tbody>
        </table>
      </div>
    </ha-card>`;

    this.shadowRoot.innerHTML = html;
  }
}

class MenstruationCycleHistoryCardRowEditor extends HTMLElement {
  setConfig(config) {
    this._config = {
      max_rows: 12,
      show_fertile_window: true,
      ...config,
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._loadTranslations();
    if (this.shadowRoot?.activeElement) return;
    this._render();
  }

  _loadTranslations() {
    const lang = this._lang();
    if (lang in _mcHistoryCardI18n.cache || _mcHistoryCardI18n.loading[lang]) return;
    _mcHistoryCardI18n.loading[lang] = true;
    fetch(`./translations/${lang}.json`)
      .then((r) => r.ok ? r.json() : {})
      .then((data) => { _mcHistoryCardI18n.cache[lang] = data; delete _mcHistoryCardI18n.loading[lang]; this._render(); })
      .catch(() => { _mcHistoryCardI18n.cache[lang] = {}; delete _mcHistoryCardI18n.loading[lang]; });
  }

  _lang() {
    const language = String(this._hass?.locale?.language || 'en').toLowerCase();
    return language.startsWith('de') ? 'de' : 'en';
  }

  _t(key) {
    const loaded = _mcHistoryCardI18n.cache[this._lang()] || {};
    if (loaded[key] !== undefined) return loaded[key];
    const i18n = {
      en: {
        entity: 'Entity',
        entry_id: 'Entry ID (optional)',
        display: 'Display',
        title: 'Title',
        max_rows: 'Max Rows',
        features: 'Features',
        show_fertile_window: 'Show fertile window',
        preview: 'Preview',
        preview_note: 'Preview uses sample data.',
        fallback_note: 'HA entity picker unavailable, fallback dropdown active.',
        sensor_search: 'Search sensor…',
        no_sensors: 'No sensors found.',
        col_cycle: 'Cycle',
        col_start: 'Start',
        col_end: 'End',
        col_length: 'Length',
        col_status: 'Status',
        status_actual: 'Past',
        status_current: 'Current',
        status_predicted: 'Predicted',
        days: 'd',
      },
    };
    return (i18n[this._lang()]?.[key]) ?? (i18n.en[key] ?? key);
  }

  _emit(nextConfig) {
    this._config = { ...nextConfig };
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }

  _entityOptions() {
    const states = this._hass?.states || {};
    return Object.keys(states)
      .filter((id) => id.startsWith('sensor.'))
      .sort()
      .map((id) => ({
        entity_id: id,
        label: String(states[id]?.attributes?.friendly_name || states[id]?.attributes?.name || id),
      }));
  }

  _entityOptionsHtml(options, selected) {
    return options.map((row) => {
      const sel = row.entity_id === selected ? 'selected' : '';
      return `<option value="${row.entity_id}" ${sel}>${this._escapeHtml(row.label)} (${row.entity_id})</option>`;
    }).join('');
  }

  _escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  _buildPreview() {
    const maxRows = Math.min(Number(this._config.max_rows) || 12, 5);
    const showFertile = this._config.show_fertile_window !== false;

    const today = new Date();
    const rows = [];
    for (let i = maxRows - 1; i >= 0; i--) {
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - (i + 1) * 28);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 27);
      const isLast = i === 0;
      const status = isLast ? this._t('status_current') : this._t('status_actual');
      const startStr = startDate.toISOString().slice(0, 10);
      const endStr = isLast ? '—' : endDate.toISOString().slice(0, 10);
      rows.push({ idx: maxRows - i, startStr, endStr, length: 28, status, isCurrent: isLast });
    }

    const fertileCell = showFertile
      ? `<td style="font-size:10px;color:#16a34a;">8-19</td>`
      : '';
    const fertileHeader = showFertile
      ? `<th style="padding:4px 6px;border-bottom:1px solid var(--divider-color);">${this._t('show_fertile_window')}</th>`
      : '';

    const tableRows = rows.map((r) => `
      <tr style="background:${r.isCurrent ? 'rgba(var(--rgb-primary-color,33,150,243),0.08)' : 'transparent'}">
        <td style="padding:3px 6px;font-size:11px;">C${r.idx}</td>
        <td style="padding:3px 6px;font-size:11px;">${r.startStr}</td>
        <td style="padding:3px 6px;font-size:11px;">${r.endStr}</td>
        <td style="padding:3px 6px;font-size:11px;">${r.length} ${this._t('days')}</td>
        <td style="padding:3px 6px;font-size:11px;">${r.status}</td>
        ${showFertile ? fertileCell : ''}
      </tr>
    `).join('');

    return `
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr style="border-bottom:2px solid var(--divider-color);">
              <th style="padding:4px 6px;text-align:left;font-size:11px;">${this._t('col_cycle')}</th>
              <th style="padding:4px 6px;text-align:left;font-size:11px;">${this._t('col_start')}</th>
              <th style="padding:4px 6px;text-align:left;font-size:11px;">${this._t('col_end')}</th>
              <th style="padding:4px 6px;text-align:left;font-size:11px;">${this._t('col_length')}</th>
              <th style="padding:4px 6px;text-align:left;font-size:11px;">${this._t('col_status')}</th>
              ${fertileHeader}
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
      <div style="font-size:10px;color:var(--secondary-text-color);margin-top:6px;">${this._t('preview_note')}</div>
    `;
  }

  _render() {
    if (!this._config) return;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });

    const entities = this._entityOptions();
    const selectedEntity = String(this._config.entity || '');
    const entryId = String(this._config.entry_id || '');
    const maxRows = Number(this._config.max_rows) || 12;
    const showFertile = this._config.show_fertile_window !== false;

    const hasHaSelector = Boolean(customElements.get('ha-selector'));
    const hasHaEntityPicker = Boolean(customElements.get('ha-entity-picker'));

    const entityPickerHtml = hasHaSelector
      ? '<ha-selector id="entity_selector"></ha-selector>'
      : hasHaEntityPicker
      ? '<ha-entity-picker id="entity_picker"></ha-entity-picker>'
      : `<div class="entity-fallback">
           <input id="entity_search" type="text" placeholder="${this._t('sensor_search')}">
           <select id="entity_select" size="5">${this._entityOptionsHtml(entities, selectedEntity)}</select>
           <div class="fallback-note">${this._t('fallback_note')}</div>
         </div>`;

    this.shadowRoot.innerHTML = `
      <style>
        .wrap { display: grid; gap: 14px; padding: 2px 0; }
        .section-title { font-size: 12px; font-weight: 700; color: var(--secondary-text-color); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
        .row { display: grid; gap: 4px; }
        label { font-size: 12px; font-weight: 600; color: var(--secondary-text-color); }
        input[type='text'], select {
          width: 100%;
          box-sizing: border-box;
          padding: 8px 10px;
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-size: 14px;
        }
        .check { display: flex; gap: 8px; align-items: center; color: var(--primary-text-color); font-size: 13px; }
        .check input[type='checkbox'] { width: auto; min-width: 0; margin: 0; }
        .slider-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; }
        input[type='range'] { width: 100%; }
        .slider-val { font-size: 13px; font-weight: 600; color: var(--primary-text-color); min-width: 28px; text-align: right; }
        .fallback-note { font-size: 11px; color: var(--secondary-text-color); opacity: 0.85; }
        .entity-fallback { display: grid; gap: 6px; }
        .preview-box { border: 1px solid var(--divider-color); border-radius: 8px; padding: 10px; background: var(--card-background-color); overflow-x: auto; }
        ha-selector, ha-entity-picker { width: 100%; display: block; }
      </style>
      <div class="wrap">
        <div>
          <div class="section-title">${this._t('entity')}</div>
          <div class="row">
            ${entityPickerHtml}
          </div>
          <div class="row" style="margin-top:8px;">
            <label for="entry_id">${this._t('entry_id')}</label>
            <input id="entry_id" type="text" value="${this._escapeHtml(entryId)}" placeholder="">
          </div>
        </div>

        <div>
          <div class="section-title">${this._t('display')}</div>
          <div class="row">
            <label for="title">${this._t('title')}</label>
            <input id="title" type="text" value="${this._escapeHtml(this._config.title || '')}" placeholder="Zyklus History">
          </div>
          <div class="row" style="margin-top:8px;">
            <label>${this._t('max_rows')} (1-24)</label>
            <div class="slider-row">
              <input id="max_rows" type="range" min="1" max="24" value="${maxRows}">
              <span class="slider-val" id="max_rows_val">${maxRows}</span>
            </div>
          </div>
        </div>

        <div>
          <div class="section-title">${this._t('features')}</div>
          <label class="check">
            <input id="show_fertile_window" type="checkbox" ${showFertile ? 'checked' : ''}>
            <span>${this._t('show_fertile_window')}</span>
          </label>
        </div>

        <div>
          <div class="section-title">${this._t('preview')}</div>
          <div class="preview-box">${this._buildPreview()}</div>
        </div>
      </div>
    `;

    // ── Entity picker wiring ──────────────────────────────────────────────
    const applyEntity = (value) => {
      const v = String(value || '').trim();
      if (!v) return;
      const next = { ...this._config, entity: v };
      delete next.entry_id;
      this._emit(next);
    };

    const entitySelector = this.shadowRoot.getElementById('entity_selector');
    if (entitySelector) {
      entitySelector.hass = this._hass;
      entitySelector.selector = { entity: { domain: 'sensor' } };
      entitySelector.value = selectedEntity;
      entitySelector.addEventListener('value-changed', (ev) => applyEntity(ev?.detail?.value));
      entitySelector.addEventListener('change', (ev) => applyEntity(ev?.detail?.value));
    }

    const entityPicker = this.shadowRoot.getElementById('entity_picker');
    if (entityPicker) {
      entityPicker.hass = this._hass;
      entityPicker.value = selectedEntity;
      entityPicker.includeDomains = ['sensor'];
      entityPicker.allowCustomEntity = false;
      entityPicker.addEventListener('value-changed', (ev) => applyEntity(ev?.detail?.value));
      entityPicker.addEventListener('change', (ev) => applyEntity(ev?.detail?.value));
    }

    const entitySelect = this.shadowRoot.getElementById('entity_select');
    const entitySearch = this.shadowRoot.getElementById('entity_search');
    if (entitySelect) {
      entitySelect.addEventListener('change', (ev) => applyEntity(ev?.target?.value));
      entitySearch?.addEventListener('input', (ev) => {
        const needle = String(ev?.target?.value || '').trim().toLowerCase();
        const filtered = needle
          ? entities.filter((r) => `${r.label} ${r.entity_id}`.toLowerCase().includes(needle))
          : entities;
        entitySelect.innerHTML = this._entityOptionsHtml(filtered, selectedEntity);
      });
      entitySearch?.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); applyEntity(entitySelect?.value); }
      });
    }

    // ── Entry ID ─────────────────────────────────────────────────────────
    this.shadowRoot.getElementById('entry_id')?.addEventListener('change', (ev) => {
      const v = String(ev.target?.value || '').trim();
      this._emit({ ...this._config, entry_id: v });
    });

    // ── Title ─────────────────────────────────────────────────────────────
    this.shadowRoot.getElementById('title')?.addEventListener('change', (ev) => {
      this._emit({ ...this._config, title: String(ev.target?.value || '') });
    });

    // ── Max rows slider ───────────────────────────────────────────────────
    const maxRowsInput = this.shadowRoot.getElementById('max_rows');
    const maxRowsVal = this.shadowRoot.getElementById('max_rows_val');
    maxRowsInput?.addEventListener('input', (ev) => {
      const v = Number(ev.target?.value);
      if (maxRowsVal) maxRowsVal.textContent = v;
    });
    maxRowsInput?.addEventListener('change', (ev) => {
      this._emit({ ...this._config, max_rows: Number(ev.target?.value) });
    });

    // ── Show fertile window ───────────────────────────────────────────────
    this.shadowRoot.getElementById('show_fertile_window')?.addEventListener('change', (ev) => {
      this._emit({ ...this._config, show_fertile_window: Boolean(ev.target?.checked) });
    });
  }
}

if (!customElements.get('menstruation-cycle-history-card-row-editor')) {
  customElements.define('menstruation-cycle-history-card-row-editor', MenstruationCycleHistoryCardRowEditor);
}

if (!customElements.get('menstruation-cycle-history-card-row')) {
  customElements.define('menstruation-cycle-history-card-row', MenstruationCycleHistoryCardRow);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'menstruation-cycle-history-card-row',
  name: 'Menstruation Cycle History (Table)',
  description: 'Menstrual cycle history in table format',
});
