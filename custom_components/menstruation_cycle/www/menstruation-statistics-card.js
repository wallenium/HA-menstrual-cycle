/**
 * Menstrual Statistics Card
 * Displays cycle statistics, hygiene statistics and a doctor report.
 *
 * Hygiene tab logic is fully inlined here — no separate shared module required.
 */

// ---------------------------------------------------------------------------
// Hygiene tab – inlined constants and helpers
// (formerly menstruation-product-stats-shared.js)
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG = {
  tampon_price: 0.12,
  pad_price: 0.10,
  cup_price: 30,
  tampon_co2_g: 1.5,
  pad_co2_g: 2.5,
  cup_co2_g: 18,
  co2_source_url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10148749/',
  underwear_total_owned: 12,
  target_wash_days: 7,
};

const HYGIENE_TRANSLATIONS = {
  de: {
    title: 'Produktverbrauch',
    usage_section: 'Verbrauch',
    planning_section: 'Planung',
    sustainability_section: 'Nachhaltigkeit',
    timeline_section: 'Letzte 30 Tage',
    tampons_per_cycle: 'Tampons / Periode',
    pads_per_cycle: 'Binden / Periode',
    cup_empties_per_day: 'Cup-Leerungen / Tag',
    liners_per_cycle: 'Slipeinlagen / Periode',
    underwear_per_cycle: 'Periodenunterwäsche / Periode',
    planning_days: 'Planungstage',
    days: 'Tage',
    last_cycle: 'Letzte Periode',
    last_cycles: '{count} Zyklen',
    last_30_days: 'Letzte 30 Tage',
    no_usage_last_30_days: 'In den letzten 30 Tagen wurden keine Produkte geloggt.',
    wash_every_x_days: 'Wasche alle X Tage',
    buy_x_more_underwear: 'Kaufe X mehr Slips',
    based_on_daily_usage: 'bei ~{value} pro Tag',
    for_wash_goal: 'für alle {days} Tage Waschrhythmus',
    add_to_shopping_list: 'Zur Einkaufsliste',
    cup_cost_savings: 'Cup Kostenersparnis',
    cup_co2_savings: 'Cup CO2-Ersparnis',
    annual_projection: 'Jahres-Prognose',
    source: 'Quelle',
    tampon: 'Tampon',
    pad: 'Binde',
    cup: 'Cup',
    cup_empty: 'Cup geleert',
    liner: 'Slipeinlage',
    underwear: 'Periodenunterwäsche',
  },
  en: {
    title: 'Product usage',
    usage_section: 'Usage',
    planning_section: 'Planning',
    sustainability_section: 'Sustainability',
    timeline_section: 'Last 30 days',
    tampons_per_cycle: 'Tampons / period',
    pads_per_cycle: 'Pads / period',
    cup_empties_per_day: 'Cup empties / day',
    liners_per_cycle: 'Liners / period',
    underwear_per_cycle: 'Period underwear / period',
    planning_days: 'Planning days',
    days: 'days',
    last_cycle: 'Last period',
    last_cycles: '{count} cycles',
    last_30_days: 'Last 30 days',
    no_usage_last_30_days: 'No products were logged in the last 30 days.',
    wash_every_x_days: 'Wash every X days',
    buy_x_more_underwear: 'Buy X more underwear',
    based_on_daily_usage: 'based on ~{value}/day',
    for_wash_goal: 'for a {days}-day wash routine',
    add_to_shopping_list: 'Add to shopping list',
    cup_cost_savings: 'Cup cost savings',
    cup_co2_savings: 'Cup CO2 savings',
    annual_projection: 'Annual projection',
    source: 'Source',
    tampon: 'Tampon',
    pad: 'Pad',
    cup: 'Cup',
    cup_empty: 'Cup emptied',
    liner: 'Liner',
    underwear: 'Period underwear',
  },
};

function mergeConfig(config) {
  return { ...DEFAULT_CONFIG, ...(config || {}) };
}

function getLang(hass) {
  const language = String(hass?.locale?.language || hass?.language || 'en').toLowerCase();
  return language.startsWith('de') ? 'de' : 'en';
}

function translate(hass, key, placeholders = {}) {
  const lang = getLang(hass);
  const dict = HYGIENE_TRANSLATIONS[lang] || HYGIENE_TRANSLATIONS.en;
  const value = dict[key] ?? HYGIENE_TRANSLATIONS.en[key] ?? key;
  if (typeof value !== 'string') return String(value);
  return Object.entries(placeholders).reduce(
    (s, [k, v]) => s.replace(`{${k}}`, v ?? 0),
    value
  );
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeClassName(value) {
  const sanitized = String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
  return sanitized || 'unknown';
}

function normalizeQuantity(value) {
  let parsed = null;
  if (typeof value === 'number') {
    parsed = value;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) {
      const match = trimmed.match(/[-+]?\d+(?:[.,]\d+)?/);
      if (match) parsed = Number(match[0].replace(',', '.'));
    }
  }
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.max(1, Math.floor(parsed));
}

function normalizeProductKey(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return null;
  const normalized = raw.replace(/-/g, '_');
  return {
    tampon: 'tampon',
    tampons: 'tampon',
    pad: 'pad',
    pads: 'pad',
    binde: 'pad',
    binden: 'pad',
    cup: 'cup',
    cups: 'cup',
    menstrual_cup: 'cup',
    'menstrual cup': 'cup',
    liner: 'liner',
    liners: 'liner',
    pantyliner: 'liner',
    pantyliners: 'liner',
    slipeinlage: 'liner',
    slipeinlagen: 'liner',
    underwear: 'underwear',
    period_underwear: 'underwear',
    'period underwear': 'underwear',
    period_panties: 'underwear',
    'period panties': 'underwear',
    period_panty: 'underwear',
    'period panty': 'underwear',
    periodenunterwaesche: 'underwear',
    'periodenunterwäsche': 'underwear',
  }[normalized] || {
    'period underwear': 'underwear',
    'period panties': 'underwear',
    'period panty': 'underwear',
    'menstrual cup': 'cup',
  }[raw] || raw;
}

function normalizeDateKey(value) {
  if (value === null || value === undefined || value === '') return null;
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (
      parsed.getUTCFullYear() === Number(year)
      && parsed.getUTCMonth() + 1 === Number(month)
      && parsed.getUTCDate() === Number(day)
    ) {
      return `${year}-${month}-${day}`;
    }
  }

  const numeric = Number(raw);
  if (Number.isFinite(numeric) && Number.isInteger(numeric)) {
    const timestamp = Math.abs(numeric) >= 1_000_000_000_000 ? numeric : numeric * 1000;
    const parsed = new Date(timestamp);
    if (!Number.isNaN(parsed.getTime())) {
      return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
    }
  }

  return null;
}

function dateKeyToOrdinal(value) {
  const match = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  return Math.floor(Date.UTC(Number(year), Number(month) - 1, Number(day)) / 86400000);
}

function todayOrdinal() {
  const now = new Date();
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
}

function formatNumber(value) {
  return Number(value || 0).toFixed(1).replace(/\.0$/, '');
}

function dateLocale(hass) {
  const locale = hass?.locale?.language || hass?.language;
  if (!locale) return getLang(hass);
  try {
    return Intl.getCanonicalLocales(locale)[0] || getLang(hass);
  } catch (_error) {
    return getLang(hass);
  }
}

function formatDate(hass, value) {
  const dateKey = normalizeDateKey(value);
  if (!dateKey) return value;
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), 12);
  try {
    return new Intl.DateTimeFormat(dateLocale(hass), { month: 'short', day: 'numeric' }).format(date);
  } catch (_error) {
    return value;
  }
}

function getSvgIcon(product) {
  return window.ProductIcons?.getSvgIcon(product) || '';
}

function getUsageData(attrs) {
  return {
    timeline: Array.isArray(attrs?.product_usage_timeline)
      ? attrs.product_usage_timeline
      : (Array.isArray(attrs?.product_usage) ? attrs.product_usage : []),
    thisCycle: attrs?.product_usage_this_cycle && typeof attrs.product_usage_this_cycle === 'object'
      ? attrs.product_usage_this_cycle
      : {},
    statsSource: attrs?.product_usage_stats && typeof attrs.product_usage_stats === 'object'
      ? attrs.product_usage_stats
      : {},
  };
}

function calculateStats(productUsageThisCycle, productUsageStats, daysUntilNextStart) {
  const statsData = productUsageStats?.stats || productUsageStats || {};
  const averagePerCycle = statsData.average_per_cycle || {};
  const cyclesConsidered = Number(statsData.cycles_considered || 0);
  const getCycleValue = (averageKey, currentKey) => {
    const averageValue = Number(averagePerCycle[averageKey]);
    if (cyclesConsidered > 0 || averageValue > 0) return Number.isFinite(averageValue) ? averageValue : 0;
    return Number(productUsageThisCycle?.[currentKey] || 0);
  };

  return {
    cyclesConsidered: Math.max(0, cyclesConsidered),
    tamponsPerCycle: getCycleValue('tampon', 'tampon'),
    padsPerCycle: getCycleValue('pad', 'pad'),
    cupEmptiesPerDay: Number(averagePerCycle.cup ?? averagePerCycle.cup_empties ?? productUsageThisCycle?.cup ?? 0),
    linersPerCycle: getCycleValue('liner', 'liner'),
    underwearPerCycle: getCycleValue('underwear', 'underwear'),
    planningDays: Math.max(0, Number(daysUntilNextStart || 0)),
  };
}

function calculateAverageDailyUsage(productUsage, product) {
  const entries = (Array.isArray(productUsage) ? productUsage : [])
    .map((entry) => ({
      ...entry,
      product: normalizeProductKey(entry?.product),
      date: normalizeDateKey(entry?.date ?? entry?.created_at ?? entry?.logged_at ?? entry?.timestamp),
      quantity: normalizeQuantity(entry?.quantity),
    }))
    .filter((entry) => entry.product === product && entry.date);

  if (!entries.length) return 0;
  const sortedDates = entries.map((entry) => entry.date).sort();
  const start = new Date(`${sortedDates[0]}T00:00:00Z`).getTime();
  const end = new Date(`${sortedDates[sortedDates.length - 1]}T00:00:00Z`).getTime();
  const daySpan = Math.max(1, Math.floor((end - start) / 86400000) + 1);
  const total = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  return total / daySpan;
}

function calculateUnderwearWashPlan(config, averageDailyUsage) {
  const totalOwned = Math.max(1, Number(config?.underwear_total_owned ?? DEFAULT_CONFIG.underwear_total_owned));
  const targetWashDays = Math.max(1, Number(config?.target_wash_days ?? DEFAULT_CONFIG.target_wash_days));
  if (averageDailyUsage <= 0) return { washEveryDays: 0, washEveryDaysText: '—', buyMore: 0, targetWashDays };
  const washEveryDays = totalOwned / averageDailyUsage;
  const buyMore = Math.max(0, Math.ceil((averageDailyUsage * targetWashDays) - totalOwned));
  return {
    washEveryDays,
    washEveryDaysText: formatNumber(washEveryDays),
    buyMore,
    targetWashDays,
  };
}

function calculateCupSavings(config, productUsage) {
  const entries = Array.isArray(productUsage) ? productUsage : [];
  const cupUseTotal = entries
    .filter((entry) => normalizeProductKey(entry?.product) === 'cup')
    .reduce((sum, entry) => sum + normalizeQuantity(entry?.quantity), 0);
  const cupUsesPerDay = cupUseTotal / 30;
  const annualCupUses = cupUsesPerDay * 365;

  const tamponPrice = Math.max(0, Number(config?.tampon_price ?? DEFAULT_CONFIG.tampon_price));
  const padPrice = Math.max(0, Number(config?.pad_price ?? DEFAULT_CONFIG.pad_price));
  const cupPrice = Math.max(0, Number(config?.cup_price ?? DEFAULT_CONFIG.cup_price));
  const disposableAvgPrice = (tamponPrice + padPrice) / 2;

  const tamponCo2 = Math.max(0, Number(config?.tampon_co2_g ?? DEFAULT_CONFIG.tampon_co2_g));
  const padCo2 = Math.max(0, Number(config?.pad_co2_g ?? DEFAULT_CONFIG.pad_co2_g));
  const cupCo2 = Math.max(0, Number(config?.cup_co2_g ?? DEFAULT_CONFIG.cup_co2_g));
  const disposableAvgCo2 = (tamponCo2 + padCo2) / 2;

  return {
    annualCupUses,
    costSavingsEur: (annualCupUses * disposableAvgPrice) - cupPrice,
    co2SavingsKg: ((annualCupUses * disposableAvgCo2) - cupCo2) / 1000,
  };
}

function productLabel(hass, entry) {
  const product = normalizeProductKey(entry?.product) || entry?.product;
  if (product === 'cup' && entry?.action === 'emptied') return translate(hass, 'cup_empty');
  return {
    tampon: translate(hass, 'tampon'),
    pad: translate(hass, 'pad'),
    cup: translate(hass, 'cup'),
    liner: translate(hass, 'liner'),
    underwear: translate(hass, 'underwear'),
  }[product] || product;
}

function buildMetrics(config, attrs) {
  const mergedConfig = mergeConfig(config);
  const { timeline, thisCycle, statsSource } = getUsageData(attrs);
  const stats = calculateStats(thisCycle, statsSource, attrs?.days_until_next_start);
  const averageDailyUnderwearUsage = calculateAverageDailyUsage(timeline, 'underwear');
  const washPlan = calculateUnderwearWashPlan(mergedConfig, averageDailyUnderwearUsage);
  const cupSavings = calculateCupSavings(mergedConfig, timeline);
  return { mergedConfig, timeline, stats, averageDailyUnderwearUsage, washPlan, cupSavings };
}

function renderMetricBox(metric) {
  return `
    <div class="mgp-stat-box mgp-tone-${escapeClassName(metric.tone || 'neutral')}">
      <div class="mgp-stat-label">${escapeHtml(metric.label)}</div>
      <div class="mgp-stat-value">${metric.value}</div>
      ${metric.detail ? `<div class="mgp-stat-detail">${metric.detail}</div>` : ''}
      ${metric.button ? `<button class="mgp-action-btn" data-action="${escapeHtml(metric.button.action)}" data-quantity="${escapeHtml(String(metric.button.quantity))}">${escapeHtml(metric.button.label)}</button>` : ''}
    </div>`;
}

function renderMetricSection(section) {
  return `
    <div class="mgp-section">
      <div class="mgp-section-header"><span class="mgp-section-icon">${section.icon}</span><span>${escapeHtml(section.title)}</span></div>
      ${section.meta ? `<div class="mgp-section-meta">${section.meta}</div>` : ''}
      <div class="mgp-stat-grid">${section.items.map(renderMetricBox).join('')}</div>
    </div>`;
}

function renderTimeline(hass, productUsage) {
  const usageByDate = new Map();
  const currentDay = todayOrdinal();

  for (const entry of Array.isArray(productUsage) ? productUsage : []) {
    const dateKey = normalizeDateKey(entry?.date ?? entry?.created_at ?? entry?.logged_at ?? entry?.timestamp);
    const productKey = normalizeProductKey(entry?.product);
    if (!dateKey || !productKey) continue;
    const entryOrdinal = dateKeyToOrdinal(dateKey);
    if (entryOrdinal === null) continue;
    const diffDays = currentDay - entryOrdinal;
    if (diffDays < 0 || diffDays >= 30) continue;

    if (!usageByDate.has(dateKey)) usageByDate.set(dateKey, []);
    usageByDate.get(dateKey).push({
      ...entry,
      date: dateKey,
      product: productKey,
      quantity: normalizeQuantity(entry?.quantity),
    });
  }

  const dates = Array.from(usageByDate.keys()).sort().reverse();
  if (!dates.length) return `<div class="mgp-empty-state">${escapeHtml(translate(hass, 'no_usage_last_30_days'))}</div>`;

  return `
    <div class="mgp-timeline-list">
      ${dates.map((dateKey) => `
        <div class="mgp-timeline-row">
          <div class="mgp-timeline-date">${escapeHtml(formatDate(hass, dateKey))}</div>
          <div class="mgp-timeline-items">
            ${usageByDate.get(dateKey).map((entry) => `
              <span class="mgp-chip ${escapeClassName(entry.product)}">
                ${getSvgIcon(entry.product)} × ${normalizeQuantity(entry.quantity)}
              </span>`).join('')}
          </div>
        </div>`).join('')}
    </div>`;
}

function renderHygieneContent(hass, config, attrs) {
  const t = (key, placeholders) => translate(hass, key, placeholders);
  const data = buildMetrics(config, attrs);
  const sections = [
    {
      title: t('usage_section'),
      icon: '🧴',
      meta: escapeHtml(t('last_cycles', { count: data.stats.cyclesConsidered })),
      items: [
        { tone: 'tampon', label: t('tampons_per_cycle'), value: escapeHtml(formatNumber(data.stats.tamponsPerCycle)), detail: escapeHtml(t('last_cycles', { count: data.stats.cyclesConsidered })) },
        { tone: 'pad', label: t('pads_per_cycle'), value: escapeHtml(formatNumber(data.stats.padsPerCycle)), detail: escapeHtml(t('last_cycles', { count: data.stats.cyclesConsidered })) },
        { tone: 'cup', label: t('cup_empties_per_day'), value: escapeHtml(formatNumber(data.stats.cupEmptiesPerDay)), detail: escapeHtml(t('last_cycle')) },
        { tone: 'liner', label: t('liners_per_cycle'), value: escapeHtml(formatNumber(data.stats.linersPerCycle)), detail: escapeHtml(t('last_cycles', { count: data.stats.cyclesConsidered })) },
        { tone: 'underwear', label: t('underwear_per_cycle'), value: escapeHtml(formatNumber(data.stats.underwearPerCycle)), detail: escapeHtml(t('last_cycles', { count: data.stats.cyclesConsidered })) },
      ],
    },
    {
      title: t('planning_section'),
      icon: '🧺',
      meta: escapeHtml(t('days')),
      items: [
        { tone: 'neutral', label: t('planning_days'), value: escapeHtml(String(data.stats.planningDays)), detail: escapeHtml(t('days')) },
        { tone: 'success', label: t('wash_every_x_days'), value: escapeHtml(data.washPlan.washEveryDaysText), detail: escapeHtml(t('based_on_daily_usage', { value: formatNumber(data.averageDailyUnderwearUsage) })) },
        {
          tone: 'underwear',
          label: t('buy_x_more_underwear'),
          value: escapeHtml(String(data.washPlan.buyMore)),
          detail: escapeHtml(t('for_wash_goal', { days: data.washPlan.targetWashDays })),
          button: data.washPlan.buyMore > 0
            ? { action: 'add-underwear-shopping', quantity: data.washPlan.buyMore, label: t('add_to_shopping_list') }
            : null,
        },
      ],
    },
    {
      title: t('sustainability_section'),
      icon: '♻️',
      meta: escapeHtml(t('annual_projection')),
      items: [
        { tone: 'cup', label: t('cup_cost_savings'), value: escapeHtml(`€${formatNumber(data.cupSavings.costSavingsEur)}`), detail: escapeHtml(t('annual_projection')) },
        {
          tone: 'cup',
          label: t('cup_co2_savings'),
          value: escapeHtml(`${formatNumber(data.cupSavings.co2SavingsKg)} kg`),
          detail: `${escapeHtml(t('annual_projection'))}${data.mergedConfig.co2_source_url ? ` · <a href="${escapeHtml(data.mergedConfig.co2_source_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t('source'))}</a>` : ''}`,
        },
      ],
    },
  ];

  return `
    ${sections.map(renderMetricSection).join('')}
    <div class="mgp-section mgp-section-timeline">
      <div class="mgp-section-header"><span class="mgp-section-icon">🗓️</span><span>${escapeHtml(t('timeline_section'))}</span></div>
      ${renderTimeline(hass, data.timeline)}
    </div>`;
}

function getHygieneStyles(options = {}) {
  const embedded = !!options.embedded;
  return `
    ${embedded ? '' : `
    :host {
      display: block;
      --mgp-card-bg: var(--ha-card-background, var(--card-background-color, #fff));
    }
    ha-card {
      background: var(--mgp-card-bg);
      color: var(--primary-text-color, #1f2937);
    }
    .mgp-header {
      padding: 16px 16px 0;
    }
    .mgp-title {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 600;
    }
    .mgp-subtitle {
      margin: 4px 0 0;
      color: var(--secondary-text-color, #6b7280);
      font-size: 0.9rem;
    }
    .mgp-content {
      padding: 8px 16px 16px;
    }`}
    .mgp-section {
      margin-bottom: 16px;
    }
    .mgp-section:last-child {
      margin-bottom: 0;
    }
    .mgp-section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 8px;
      color: var(--primary-text-color, #1f2937);
    }
    .mgp-section-icon {
      font-size: 15px;
    }
    .mgp-section-meta {
      font-size: 11px;
      color: var(--secondary-text-color, #6b7280);
      margin-bottom: 8px;
    }
    .mgp-stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(116px, 1fr));
      gap: 8px;
    }
    .mgp-stat-box {
      background: var(--secondary-background-color, #f5f5f5);
      border-radius: 10px;
      padding: 10px 12px;
      border: 1px solid var(--divider-color, rgba(128, 128, 128, 0.25));
      min-height: 84px;
      box-sizing: border-box;
    }
    .mgp-stat-label {
      color: var(--secondary-text-color, #6b7280);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      line-height: 1.3;
    }
    .mgp-stat-value {
      margin-top: 6px;
      font-size: 1.28rem;
      line-height: 1.2;
      font-weight: 700;
      color: var(--primary-text-color, #1f2937);
    }
    .mgp-stat-detail {
      margin-top: 4px;
      color: var(--secondary-text-color, #6b7280);
      font-size: 11px;
      line-height: 1.35;
    }
    .mgp-action-btn {
      margin-top: 8px;
      width: 100%;
      min-height: 34px;
      border: 1px solid var(--divider-color, rgba(128, 128, 128, 0.35));
      border-radius: 8px;
      padding: 6px 10px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #1f2937);
      cursor: pointer;
      font: inherit;
    }
    .mgp-empty-state {
      color: var(--secondary-text-color, #6b7280);
      font-size: 12px;
      padding: 6px 0;
    }
    .mgp-timeline-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .mgp-timeline-row {
      display: grid;
      grid-template-columns: 86px 1fr;
      gap: 10px;
      align-items: start;
    }
    .mgp-timeline-date {
      color: var(--secondary-text-color, #6b7280);
      font-size: 0.8rem;
      padding-top: 4px;
    }
    .mgp-timeline-items {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .mgp-chip {
      border-radius: 999px;
      padding: 4px 8px;
      font-size: 0.8rem;
      font-weight: 600;
      border: 1px solid transparent;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .mgp-chip svg,
    .mgp-chip img {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      object-fit: contain;
      display: block;
    }
    .mgp-tone-tampon,
    .mgp-chip.tampon {
      background: color-mix(in srgb, var(--error-color, #e74c3c) 10%, transparent);
      border-color: color-mix(in srgb, var(--error-color, #e74c3c) 22%, transparent);
    }
    .mgp-tone-pad,
    .mgp-chip.pad {
      background: color-mix(in srgb, var(--warning-color, #f39c12) 12%, transparent);
      border-color: color-mix(in srgb, var(--warning-color, #f39c12) 24%, transparent);
    }
    .mgp-tone-cup,
    .mgp-chip.cup {
      background: color-mix(in srgb, #8e44ad 12%, transparent);
      border-color: color-mix(in srgb, #8e44ad 24%, transparent);
    }
    .mgp-tone-liner,
    .mgp-tone-underwear,
    .mgp-chip.liner,
    .mgp-chip.underwear {
      background: color-mix(in srgb, #3498db 10%, transparent);
      border-color: color-mix(in srgb, #3498db 22%, transparent);
    }
    .mgp-tone-success {
      background: color-mix(in srgb, var(--success-color, #27ae60) 10%, transparent);
      border-color: color-mix(in srgb, var(--success-color, #27ae60) 22%, transparent);
    }
    .mgp-tone-neutral {
      background: color-mix(in srgb, var(--primary-color, #c0392b) 6%, transparent);
      border-color: color-mix(in srgb, var(--primary-color, #c0392b) 16%, transparent);
    }
    @media (max-width: 480px) {
      .mgp-stat-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .mgp-stat-box {
        min-height: 76px;
        padding: 8px 10px;
      }
      .mgp-timeline-row {
        grid-template-columns: 74px 1fr;
      }
    }`;
}

// ---------------------------------------------------------------------------
// MenstruationStatisticsCard – card class
// ---------------------------------------------------------------------------

const _mcStatisticsCardI18n = window.menstruationCycleI18n || (window.menstruationCycleI18n = {
  cache: {},
  loading: {},
  fallback: { en: {} },
});

if (typeof _mcStatisticsCardI18n.normalizeLang !== 'function') {
  _mcStatisticsCardI18n.normalizeLang = (language) => String(language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en';
}




class MenstruationStatisticsCard extends HTMLElement {
  static getStubConfig() {
    return {
      type: 'custom:menstruation-statistics-card',
      entity: '',
      title: '',
      days_back: 180,
      language: 'auto',
      ...DEFAULT_CONFIG,
    };
  }

  static getConfigElement() {
    return document.createElement('menstruation-statistics-card-editor');
  }

  setConfig(config) {
    if (!config || (!config.entity && !config.entry_id)) {
      throw new Error('entity or entry_id is required');
    }
    this._config = {
      title: '',
      days_back: 180,
      language: 'auto',
      ...DEFAULT_CONFIG,
      ...config,
    };
    this._tab = this._tab || 'stats';
    this._settingsOpen = this._settingsOpen || false;
    this._exportStatus = null;
    this._lastRenderKey = null;
    this._patientName = '';
    this._patientBirthdate = '';
    this._exportLanguage = null;
    this._daysBack = parseInt(this._config.days_back, 10) || 180;
    if (!this._planningRangeStart || !this._planningRangeEnd) {
      const today = new Date();
      const end = new Date(today.getTime() + (9 * 86400000));
      this._planningRangeStart = today.toISOString().slice(0, 10);
      this._planningRangeEnd = end.toISOString().slice(0, 10);
    }
    this._ensureRoot();
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._loadTranslations();
    this._render();
  }

  getCardSize() { return 6; }

  _ensureRoot() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
  }

  _loadTranslations() {
    const lang = this._lang();
    if (_mcStatisticsCardI18n.cache[lang] || _mcStatisticsCardI18n.loading[lang]) return;
    if (typeof _mcStatisticsCardI18n.load !== 'function') return;
    _mcStatisticsCardI18n.load(lang).then(() => this._render()).catch(() => {});
  }

  _lang() {
    const cfg = String(this._config?.language || 'auto').toLowerCase();
    if (cfg !== 'auto') return _mcStatisticsCardI18n.normalizeLang(cfg);
    const locale = this._hass?.locale?.language || this._hass?.language || 'en';
    return _mcStatisticsCardI18n.normalizeLang(locale);
  }

  _t(key) {
    const loaded = window.menstruationCycleI18n?.cache?.[this._lang()] || {};
    if (typeof loaded[key] === 'string') return loaded[key];
    const i18n = {
      en: {
        title: 'Statistics',
        period: 'Period',
        tab_hygiene: 'Hygiene',
        nfp_method_nfp: 'NFP',
        doctor_report_title: 'Doctor Report',
        filter: 'Filter',
        filter_aria: 'Open statistics filters',
        no_data: 'No data available',
        entity_not_found: 'Entity not found',
        cycle_length: 'Cycle Length',
        bleeding_duration: 'Bleeding Duration',
        bleeding_strength: 'Bleeding Strength',
        regularity: 'Regularity',
        top_symptoms: 'Top Symptoms',
        pain_trend: 'Pain Days Trend',
        avg: 'Avg',
        min: 'Min',
        max: 'Max',
        std_dev: 'Std Dev',
        days: 'days',
        cycles_analyzed: 'Cycles analyzed',
        very_regular: 'Very regular',
        regular: 'Regular',
        irregular: 'Irregular',
        bleeding_none: 'None',
        bleeding_light: 'Light',
        bleeding_medium: 'Medium',
        bleeding_heavy: 'Heavy',
        bleeding_very_heavy: 'Very heavy',
        period: 'Period',
        months_3: '3 months',
        months_6: '6 months',
        months_12: '12 months',
        custom: 'Custom',
        doctor_report_title: 'Doctor Report',
        doctor_report_desc: 'Generates a professional HTML report for doctor appointments. Saves the file to the Home Assistant export directory.',
        patient_name: 'Patient name (optional)',
        patient_birthdate: 'Date of birth (optional, YYYY-MM-DD)',
        export_language: 'Report language',
        export_btn: 'Export HTML for Doctor',
        export_ok: '✅ Report exported!',
        export_err: '❌ Export failed',
        exporting: '⏳ Exporting…',
        print_btn: 'Print page / Save as PDF',
        settings_title: 'Settings',
        days_back_label: 'Days back',
        cycle_start: 'Cycle start',
        pain_days: 'Pain days',
        avg_pain_days: 'Avg pain days/cycle',
        of: 'of',
        last_n_days: 'Last {n} days',
        no_symptom_data: 'No symptom data',
        no_cycle_data: 'No cycle data',
        nfp_title: 'NFP Analysis (Symptothermal Method)',
        nfp_no_data: 'No NFP data available. Log basal temperatures to enable NFP analysis.',
        nfp_confidence: 'Confidence',
        nfp_confidence_high: 'High',
        nfp_confidence_medium: 'Medium',
        nfp_confidence_low: 'Low',
        nfp_temp_rise: 'Temperature Rise Day',
        nfp_temp_peak: 'Temperature Peak Day',
        nfp_mucus_peak: 'Cervical Mucus Peak',
        nfp_cervix_peak: 'Cervix Position Peak',
        nfp_ovulation: 'Estimated Ovulation',
        nfp_fertile_window: 'Fertile Window',
        nfp_score: 'NFP Score',
        nfp_method: 'Method',
        nfp_method_nfp: 'NFP',
        nfp_method_standard: 'Standard',
        nfp_temp_chart: 'Basal Temperature Curve',
        nfp_baseline: 'Baseline',
        nfp_threshold: 'Threshold (+0.2°C)',
        day: 'Day',
        nfp_temp_unit: '°C',
        nfp_not_detected: 'Not detected',
        nfp_day_label: 'Day {n}',
        cycle_day: 'Cycle Day',
        nfp_temperature: 'Temperature (°C)',
        correlations_title: 'Symptom Correlations',
        correlations_subtitle: 'Patterns from last 3–6 cycles',
        correlations_no_data: 'Not enough data for correlation analysis (need ≥ 3 cycles).',
        nfp_confidence_high: 'High',
        nfp_confidence_medium: 'Medium',
        nfp_confidence_low: 'Low',
        phase_menstruation: 'menstruation',
        phase_follicular: 'follicular',
        phase_ovulation: 'ovulation',
        phase_luteal: 'luteal',
        anomalies_title: 'Alerts & Insights',
        anomalies_no_data: 'Not enough data for anomaly detection (need ≥ 3 cycles).',
        anomaly_cycle_short: 'Current cycle is shorter than average',
        anomaly_cycle_long: 'Current cycle is longer than average',
        anomaly_bleed_short: 'Bleeding duration unusually short',
        anomaly_bleed_long: 'Bleeding duration unusually long',
        anomaly_bleed_heavy: 'Unusually heavy period',
        anomaly_bleed_light: 'Unusually light period',
        anomaly_pain_high: 'More pain days than usual',
        anomaly_pain_low: 'Fewer pain days than usual',
        anomaly_pain_increasing: 'Pain days increasing over time',
        anomaly_pain_decreasing: 'Pain days decreasing over time',
        status_current: 'Current',
        anomaly_average: 'Average',
        days_unit: 'days',
        anomaly_consult: 'Consider discussing with your doctor.',
        anomaly_note: 'Keep monitoring your cycle.',
        severity_info: 'Info',
        warning: 'Warning',
        severity_alert: 'Alert',
        nfp_pregnancy_likelihood: 'Conception likelihood this cycle',
        nfp_likelihood_high: 'Higher',
        nfp_likelihood_elevated: 'Moderate',
        nfp_likelihood_low: 'Lower',
        nfp_likelihood_unknown: 'Estimate unavailable',
        nfp_likelihood_reason_positive_test: 'A logged positive pregnancy test strongly outweighs the cycle estimate.',
        nfp_likelihood_reason_negative_test: 'A later negative pregnancy test lowers the current-cycle conception estimate.',
        nfp_likelihood_reason_fertile_unprotected: 'Fertile-window and ovulation signals align with logged unprotected intercourse.',
        nfp_likelihood_reason_protected_window: 'Fertile-window signals are present, but logged intercourse was protected.',
        nfp_likelihood_reason_post_ovulation: 'Current-cycle data is mainly post-ovulation, with little logged fertile-window exposure.',
        nfp_likelihood_reason_fertile_signals: 'Cycle history, symptoms, and NFP signals suggest some conception potential this cycle.',
        nfp_likelihood_reason_insufficient_data: 'There is not enough current-cycle data for a reliable conception estimate.',
        nfp_likelihood_disclaimer: 'Estimated from cycle history, symptoms, and NFP signals; not medical advice.',
        planning_title: 'Cycle Planning (Estimates)',
        planning_disclaimer: 'These are statistical estimates, not medical advice.',
        planning_range_title: 'Date Range Forecast',
        planning_range_start: 'Start date',
        planning_range_end: 'End date',
        planning_range_invalid: 'Please select a valid date range (start ≤ end).',
        planning_range_period: 'Period in selected range',
        planning_range_fertility: 'Fertility/ovulation in selected range',
        planning_range_likely: 'Likely',
        planning_range_possible: 'Possible',
        planning_range_unlikely: 'Unlikely',
        planning_range_low_confidence: 'Low confidence due to high cycle variability.',
        period_forecast_title: 'Next Period',
        period_forecast_window: 'Expected window',
        period_forecast_confidence: 'Confidence',
        period_forecast_std: 'Cycle variability',
        period_forecast_confidence_high: 'High (very regular)',
        period_forecast_confidence_medium: 'Medium (somewhat regular)',
        period_forecast_confidence_low: 'Low (irregular cycle)',
        period_forecast_no_data: 'Not enough cycle history for a forecast.',
        fertility_forecast_title: 'Conception Planning',
        fertility_forecast_ovulation: 'Est. ovulation',
        fertility_forecast_window: 'Fertile window',
        fertility_forecast_best_days: 'Best days for conception',
        fertility_forecast_source_nfp: 'NFP (measured)',
        fertility_forecast_source_estimated: 'Estimated',
        fertility_forecast_no_data: 'Not enough data for a fertility forecast.',
      },
    };
    const lang = this._lang();
    const dict = i18n[lang] || i18n.en;
    const val = dict[key];
    return val !== undefined ? val : (i18n.en[key] ?? key);
  }

  _getAttrs() {
    if (!this._hass || !this._config) return null;
    const entityId = this._config.entity;
    if (!entityId) return null;
    const stateObj = this._hass.states[entityId];
    if (!stateObj) return null;
    return stateObj.attributes || {};
  }

  _filterOptions() {
    return [
      { value: 90, label: this._t('months_3') },
      { value: 180, label: this._t('months_6') },
      { value: 365, label: this._t('months_12') },
    ];
  }

  _currentFilterLabel() {
    const selected = this._filterOptions().find((option) => option.value === this._daysBack);
    return selected ? selected.label : this._t('custom');
  }

  _computeStats(attrs) {
    if (!attrs) return null;
    const today = new Date();
    const cutoffMs = today.getTime() - this._daysBack * 86400000;
    const cutoffIso = new Date(cutoffMs).toISOString().slice(0, 10);

    const rawHistory = Array.isArray(attrs.history) ? attrs.history : [];
    const history = rawHistory.filter(d => d >= cutoffIso).sort();

    const rawStarts = Array.isArray(attrs.grouped_starts) ? attrs.grouped_starts : [];
    const starts = rawStarts.filter(d => d >= cutoffIso);

    const cycleStats = attrs.cycle_statistics || {};
    const symptomStats = attrs.symptom_statistics || {};
    const bleedingBlocks = Array.isArray(attrs.bleeding_blocks) ? attrs.bleeding_blocks : [];

    const allStarts = rawStarts.filter(d => typeof d === 'string');
    const cycleLengths = [];
    for (let i = 1; i < allStarts.length; i++) {
      const s0 = new Date(allStarts[i - 1]);
      const s1 = new Date(allStarts[i]);
      if (s0 < new Date(cutoffIso)) continue;
      const len = Math.round((s1 - s0) / 86400000);
      if (len > 10 && len < 80) cycleLengths.push(len);
    }

    const avg = cycleLengths.length
      ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length * 10) / 10
      : null;
    const minLen = cycleLengths.length ? Math.min(...cycleLengths) : null;
    const maxLen = cycleLengths.length ? Math.max(...cycleLengths) : null;
    const stdDev = cycleLengths.length >= 2
      ? (() => {
          const m = avg;
          const variance = cycleLengths.reduce((a, b) => a + Math.pow(b - m, 2), 0) / cycleLengths.length;
          return Math.round(Math.sqrt(variance) * 10) / 10;
        })()
      : 0;

    let regularity = null;
    if (stdDev !== null && cycleLengths.length >= 2) {
      regularity = stdDev <= 2 ? 'very_regular' : stdDev <= 5 ? 'regular' : 'irregular';
    }

    const durations = bleedingBlocks
      .filter(b => b && b.start >= cutoffIso)
      .map(b => {
        if (b.length) return b.length;
        if (b.start && b.end) {
          return Math.round((new Date(b.end) - new Date(b.start)) / 86400000) + 1;
        }
        return null;
      })
      .filter(d => d !== null && d > 0);

    const avgBleed = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length * 10) / 10
      : null;
    const minBleed = durations.length ? Math.min(...durations) : null;
    const maxBleed = durations.length ? Math.max(...durations) : null;

    const symptomHistory = Array.isArray(attrs.symptom_history) ? attrs.symptom_history : [];
    const recentSymptoms = symptomHistory.filter(s => s.date >= cutoffIso);

    const bsCount = {};
    for (const s of recentSymptoms) {
      const bs = s.bleeding_strength;
      if (bs) bsCount[bs] = (bsCount[bs] || 0) + 1;
    }
    const bsTotal = Object.values(bsCount).reduce((a, b) => a + b, 0);
    const bsDist = bsTotal > 0
      ? Object.entries(bsCount).map(([k, v]) => ({ key: k, pct: Math.round(v / bsTotal * 100) })).sort((a, b) => b.pct - a.pct)
      : [];

    const symCount = {};
    const numCycles = Math.max(1, cycleLengths.length);
    for (const s of recentSymptoms) {
      const pain = Array.isArray(s.pain) ? s.pain : (s.pain ? [s.pain] : []);
      for (const p of pain) symCount[`pain:${p}`] = (symCount[`pain:${p}`] || 0) + 1;
      for (const key of ['spotting', 'discharge', 'intercourse', 'cervical_mucus']) {
        if (s[key]) symCount[`${key}:${s[key]}`] = (symCount[`${key}:${s[key]}`] || 0) + 1;
      }
    }
    const topSymptoms = Object.entries(symCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => ({ key: k, count: v, pct: Math.round(v / numCycles * 100) }));

    const cycleStarts = rawStarts.filter(d => d >= cutoffIso);
    const painTrend = cycleStarts.map((startIso, idx) => {
      const endIso = cycleStarts[idx + 1]
        ? (() => { const d = new Date(cycleStarts[idx + 1]); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })()
        : today.toISOString().slice(0, 10);
      const painDays = recentSymptoms.filter(s => s.date >= startIso && s.date <= endIso && (s.pain && (Array.isArray(s.pain) ? s.pain.length > 0 : true))).length;
      return { cycleStart: startIso, painDays };
    });

    const correlations = this._computeSymptomCorrelations(attrs, {
      rawStarts, cycleLengths, cutoffIso, symptomHistory: recentSymptoms,
    });
    const anomalies = this._computeAnomalies(attrs, {
      cycleLengths, avg, stdDev, avgBleed, minBleed, maxBleed, durations, bsDist, painTrend,
    });

    return {
      history,
      starts,
      cycleStats,
      symptomStats,
      cycleLengths,
      avg,
      minLen,
      maxLen,
      stdDev,
      regularity,
      avgBleed,
      minBleed,
      maxBleed,
      bsDist,
      topSymptoms,
      painTrend,
      cyclesAnalyzed: cycleLengths.length,
      correlations,
      anomalies,
    };
  }

  _computeSymptomCorrelations(attrs, { rawStarts, cutoffIso, symptomHistory }) {
    // Need at least 3 complete cycles
    const allStarts = (Array.isArray(rawStarts) ? rawStarts : []).slice().sort();
    const recentStarts = allStarts.filter(d => d >= cutoffIso);
    if (recentStarts.length < 3) return null;

    // Use up to last 6 cycles
    const cycleStartsForCorr = recentStarts.slice(-6);
    const totalCycles = cycleStartsForCorr.length;

    // Build cycle windows: [cycleStart, cycleEnd)
    const cycleWindows = cycleStartsForCorr.map((startIso, idx) => {
      const nextStart = cycleStartsForCorr[idx + 1];
      const endIso = nextStart
        ? (() => { const d = new Date(nextStart); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); })()
        : new Date().toISOString().slice(0, 10);
      return { startIso, endIso };
    });

    // Classify a cycle day into a phase
    const getPhase = (cycleDay, cycleLen) => {
      const len = cycleLen || 28;
      if (cycleDay <= 5) return 'menstruation';
      if (cycleDay <= Math.round(len * 0.43)) return 'follicular';
      if (cycleDay <= Math.round(len * 0.57)) return 'ovulation';
      return 'luteal';
    };

    // Symptom occurrence tracker: { symptomKey: { phase: Set<cycleIdx>, days: [] } }
    const symData = {};

    const trackSym = (key, cycleIdx, phase, cycleDay) => {
      if (!symData[key]) symData[key] = { phases: {}, cycles: new Set(), days: [] };
      symData[key].cycles.add(cycleIdx);
      symData[key].days.push(cycleDay);
      if (!symData[key].phases[phase]) symData[key].phases[phase] = new Set();
      symData[key].phases[phase].add(cycleIdx);
    };

    symptomHistory.forEach(s => {
      // Find which cycle window this symptom date falls into
      const date = s.date;
      if (!date) return;
      for (let ci = 0; ci < cycleWindows.length; ci++) {
        const { startIso, endIso } = cycleWindows[ci];
        if (date >= startIso && date <= endIso) {
          const d0 = new Date(startIso + 'T12:00:00Z');
          const d1 = new Date(date + 'T12:00:00Z');
          const cycleDay = Math.round((d1 - d0) / 86400000) + 1;
          // Estimate cycle length from next window
          const nextStart = cycleStartsForCorr[ci + 1];
          const cycleLen = nextStart
            ? Math.round((new Date(nextStart) - new Date(startIso)) / 86400000)
            : 28;
          const phase = getPhase(cycleDay, cycleLen);

          const pains = Array.isArray(s.pain) ? s.pain : (s.pain ? [s.pain] : []);
          for (const p of pains) trackSym(`pain:${p}`, ci, phase, cycleDay);
          if (s.cervical_mucus) trackSym(`cervical_mucus:${s.cervical_mucus}`, ci, phase, cycleDay);
          if (s.spotting) trackSym(`spotting:${s.spotting}`, ci, phase, cycleDay);
          break;
        }
      }
    });

    // Build correlation entries
    const results = [];
    for (const [key, data] of Object.entries(symData)) {
      const occurrencePct = Math.round((data.cycles.size / totalCycles) * 100);
      if (occurrencePct < 20) continue; // Only show symptoms occurring in ≥20% of cycles

      // Find dominant phase
      let dominantPhase = null;
      let dominantPhasePct = 0;
      for (const [phase, cycleSet] of Object.entries(data.phases)) {
        const phasePct = Math.round((cycleSet.size / totalCycles) * 100);
        if (phasePct > dominantPhasePct) {
          dominantPhasePct = phasePct;
          dominantPhase = phase;
        }
      }

      // Day range
      const sortedDays = data.days.slice().sort((a, b) => a - b);
      const dayMin = sortedDays[0];
      const dayMax = sortedDays[sortedDays.length - 1];

      // Correlation strength
      const strength = occurrencePct >= 70 ? 'high' : occurrencePct >= 45 ? 'medium' : 'low';

      results.push({ key, occurrencePct, dominantPhase, dominantPhasePct, dayMin, dayMax, strength });
    }

    // Sort by occurrence descending, take top 8
    results.sort((a, b) => b.occurrencePct - a.occurrencePct);
    return { items: results.slice(0, 8), totalCycles };
  }

  _computeAnomalies(attrs, { cycleLengths, avg, stdDev, avgBleed, durations, bsDist, painTrend }) {
    if (!cycleLengths || cycleLengths.length < 3) return null;

    const anomalies = [];

    // --- Cycle length anomaly (current vs historical) ---
    const allStarts = Array.isArray(attrs.grouped_starts) ? attrs.grouped_starts.slice().sort() : [];
    if (allStarts.length >= 2) {
      const lastStart = allStarts[allStarts.length - 1];
      const prevStart = allStarts[allStarts.length - 2];
      const currentLen = Math.round((new Date(lastStart) - new Date(prevStart)) / 86400000);
      if (currentLen > 10 && currentLen < 80 && avg !== null && stdDev !== null && stdDev > 0) {
        const diff = currentLen - avg;
        const absDiff = Math.abs(diff);
        if (absDiff >= 5) {
          const direction = diff < 0 ? 'anomaly_cycle_short' : 'anomaly_cycle_long';
          const severity = absDiff >= 10 ? 'alert' : 'warning';
          anomalies.push({
            type: 'cycle_length',
            severity,
            messageKey: direction,
            current: currentLen,
            average: avg,
            unit: 'days',
          });
        }
      }
    }

    // --- Bleeding duration anomaly ---
    if (durations && durations.length >= 3 && avgBleed !== null) {
      const lastBleed = durations[durations.length - 1];
      const bleedDiff = lastBleed - avgBleed;
      const absBleedDiff = Math.abs(bleedDiff);
      if (absBleedDiff >= 2) {
        const direction = bleedDiff < 0 ? 'anomaly_bleed_short' : 'anomaly_bleed_long';
        const severity = absBleedDiff >= 4 ? 'alert' : 'warning';
        anomalies.push({
          type: 'bleed_duration',
          severity,
          messageKey: direction,
          current: lastBleed,
          average: avgBleed,
          unit: 'days',
        });
      }
    }

    // --- Bleeding strength anomaly ---
    if (bsDist && bsDist.length > 0) {
      const heavyEntry = bsDist.find(b => b.key === 'heavy' || b.key === 'very_heavy');
      const lightEntry = bsDist.find(b => b.key === 'light');
      // Historical comparison: if heavy ≥70% flag as unusual heavy; if light ≥80% flag as light
      if (heavyEntry && heavyEntry.pct >= 70) {
        anomalies.push({
          type: 'bleed_strength',
          severity: 'info',
          messageKey: 'anomaly_bleed_heavy',
          current: `${heavyEntry.pct}%`,
          average: null,
          unit: null,
        });
      } else if (lightEntry && lightEntry.pct >= 80) {
        anomalies.push({
          type: 'bleed_strength',
          severity: 'info',
          messageKey: 'anomaly_bleed_light',
          current: `${lightEntry.pct}%`,
          average: null,
          unit: null,
        });
      }
    }

    // --- Pain days anomaly ---
    if (painTrend && painTrend.length >= 3) {
      const painCounts = painTrend.map(p => p.painDays);
      const avgPain = painCounts.reduce((a, b) => a + b, 0) / painCounts.length;
      const lastPain = painCounts[painCounts.length - 1];
      const painDiff = lastPain - avgPain;
      const absPainDiff = Math.abs(painDiff);
      if (absPainDiff >= 2) {
        const direction = painDiff > 0 ? 'anomaly_pain_high' : 'anomaly_pain_low';
        anomalies.push({
          type: 'pain_count',
          severity: 'info',
          messageKey: direction,
          current: lastPain,
          average: Math.round(avgPain * 10) / 10,
          unit: 'days',
        });
      }

      // Pain trend direction (last 4 cycles)
      const recentPain = painCounts.slice(-4);
      if (recentPain.length >= 3) {
        let increases = 0;
        let decreases = 0;
        for (let i = 1; i < recentPain.length; i++) {
          if (recentPain[i] > recentPain[i - 1]) increases++;
          else if (recentPain[i] < recentPain[i - 1]) decreases++;
        }
        const trendLen = recentPain.length - 1;
        if (increases === trendLen) {
          anomalies.push({ type: 'pain_trend', severity: 'info', messageKey: 'anomaly_pain_increasing', current: null, average: null, unit: null });
        } else if (decreases === trendLen) {
          anomalies.push({ type: 'pain_trend', severity: 'info', messageKey: 'anomaly_pain_decreasing', current: null, average: null, unit: null });
        }
      }
    }

    return anomalies;
  }

  _symLabel(key) {
    const lang = this._lang();
    const labels = {
      'pain:cramps': { de: 'Krämpfe', en: 'Cramps' },
      'pain:mittelschmerz': { de: 'Mittelschmerz', en: 'Mittelschmerz' },
      'pain:tender_breasts': { de: 'Brustspannen', en: 'Tender breasts' },
      'pain:headache': { de: 'Kopfschmerzen', en: 'Headache' },
      'pain:migraine': { de: 'Migräne', en: 'Migraine' },
      'pain:lower_back': { de: 'Rückenschmerzen', en: 'Lower back pain' },
      'pain:vulva': { de: 'Vulvaschmerzen', en: 'Vulva pain' },
      'spotting:red': { de: 'Schmierblutung (rot)', en: 'Spotting (red)' },
      'spotting:brown': { de: 'Schmierblutung (braun)', en: 'Spotting (brown)' },
      'hygiene:tampon': { de: 'Tampon', en: 'Tampon' },
      'hygiene:pad': { de: 'Binde', en: 'Pad' },
      'hygiene:cup': { de: 'Menstruationstasse', en: 'Cup' },
      'hygiene:liner': { de: 'Slipeinlage', en: 'Liner' },
      'hygiene:period_underwear': { de: 'Periodenunterwäsche', en: 'Period underwear' },
      'intercourse:protected': { de: 'Geschützter GV', en: 'Protected intercourse' },
      'intercourse:unprotected': { de: 'Ungeschützter GV', en: 'Unprotected intercourse' },
      'cervical_mucus:keinen': { de: 'Kein Schleim', en: 'No mucus' },
      'cervical_mucus:klebrig': { de: 'Klebrig', en: 'Sticky' },
      'cervical_mucus:cremig': { de: 'Cremig', en: 'Creamy' },
      'cervical_mucus:fadenziehend': { de: 'Fadenziehend', en: 'Stretchy' },
    };
    const entry = labels[key];
    if (entry) return entry[lang] || entry.en || key;
    return key.replace(/[:_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  _bsLabel(key) {
    const lang = this._lang();
    const map = {
      none: { de: 'Keine', en: 'None' },
      keine: { de: 'Keine', en: 'None' },
      light: { de: 'Leicht', en: 'Light' },
      medium: { de: 'Normal', en: 'Medium' },
      heavy: { de: 'Stark', en: 'Heavy' },
      very_heavy: { de: 'Sehr stark', en: 'Very heavy' },
    };
    const entry = map[key];
    if (entry) return entry[lang] || entry.en || key;
    return key;
  }

  _renderStatsBars(items, labelFn) {
    if (!items || !items.length) return `<div class="no-data">${this._t('no_data')}</div>`;
    return items.map(item => `
      <div class="bar-row">
        <span class="bar-label">${this._escHtml(labelFn(item.key || item))}</span>
        <div class="bar-outer">
          <div class="bar-fill" style="width:${Math.min(item.pct, 100)}%"></div>
        </div>
        <span class="bar-pct">${item.pct}%</span>
      </div>`).join('');
  }

  _renderPainSparkline(painTrend) {
    if (!painTrend || !painTrend.length) return `<div class="no-data">${this._t('no_data')}</div>`;
    const maxPain = Math.max(...painTrend.map(p => p.painDays), 1);
    const w = 240, h = 60, pad = 4;
    const pts = painTrend.map((p, i) => {
      const x = pad + (i / Math.max(painTrend.length - 1, 1)) * (w - 2 * pad);
      const y = h - pad - (p.painDays / maxPain) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const avgPain = Math.round(painTrend.reduce((a, b) => a + b.painDays, 0) / painTrend.length * 10) / 10;
    return `
      <svg viewBox="0 0 ${w} ${h}" style="width:100%;max-width:${w}px;height:${h}px;overflow:visible">
        <polyline points="${pts}" fill="none" stroke="var(--mg-accent,#c0392b)" stroke-width="2" stroke-linejoin="round"/>
        ${painTrend.map((p, i) => {
          const x = pad + (i / Math.max(painTrend.length - 1, 1)) * (w - 2 * pad);
          const y = h - pad - (p.painDays / maxPain) * (h - 2 * pad);
          return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="var(--mg-accent,#c0392b)"><title>${p.cycleStart}: ${p.painDays} ${this._t('pain_days')}</title></circle>`;
        }).join('')}
      </svg>
      <div class="sparkline-legend">${this._t('avg_pain_days')}: <strong>${avgPain}</strong></div>`;
  }

  _renderAnomalies(anomalies) {
    const t = (k) => this._t(k);
    const esc = (s) => this._escHtml(String(s));
    if (!anomalies) {
      return `<div class="anomaly-no-data">${esc(t('anomalies_no_data'))}</div>`;
    }
    if (anomalies.length === 0) return '';

    const severityIcon = { alert: '🚨', warning: '⚠️', info: 'ℹ️' };
    const cards = anomalies.map(a => {
      const icon = severityIcon[a.severity] || 'ℹ️';
      let detail = '';
      if (a.current !== null && a.average !== null) {
        detail = `<span class="anomaly-detail">${esc(t('status_current'))}: <strong>${esc(a.current)}${a.unit ? ' ' + esc(t('days_unit')) : ''}</strong> &middot; ${esc(t('anomaly_average'))}: <strong>${esc(a.average)}${a.unit ? ' ' + esc(t('days_unit')) : ''}</strong></span>`;
      }
      const suggestion = a.severity === 'alert' || a.severity === 'warning'
        ? `<span class="anomaly-suggestion">${esc(t('anomaly_consult'))}</span>`
        : `<span class="anomaly-suggestion">${esc(t('anomaly_note'))}</span>`;
      return `<div class="anomaly-card anomaly-${esc(a.severity)}">
        <span class="anomaly-icon">${icon}</span>
        <div class="anomaly-body">
          <span class="anomaly-msg">${esc(t(a.messageKey))}</span>
          ${detail}
          ${suggestion}
        </div>
      </div>`;
    }).join('');
    return cards;
  }

  _renderCorrelations(correlations) {
    const t = (k) => this._t(k);
    const esc = (s) => this._escHtml(String(s));
    if (!correlations) {
      return `<div class="no-data">${esc(t('correlations_no_data'))}</div>`;
    }
    if (!correlations.items || correlations.items.length === 0) {
      return `<div class="no-data">${esc(t('correlations_no_data'))}</div>`;
    }
    return correlations.items.map(c => {
      const phaseLabel = c.dominantPhase ? esc(t(`phase_${c.dominantPhase}`)) : '';
      const dayRange = c.dayMin != null && c.dayMax != null
        ? (c.dayMin === c.dayMax ? `${t('day')} ${c.dayMin}` : `${t('day')}s ${c.dayMin}–${c.dayMax}`)
        : '';
      return `<div class="corr-card corr-${esc(c.strength)}">
        <div class="corr-sym">${esc(this._symLabel(c.key))}</div>
        <div class="corr-pct">${c.occurrencePct}%</div>
        ${phaseLabel ? `<div class="corr-phase">${phaseLabel}${dayRange ? ` &middot; ${esc(dayRange)}` : ''}</div>` : ''}
        <div class="corr-strength-badge">${esc(t(`correlation_${c.strength}`))}</div>
      </div>`;
    }).join('');
  }

  _renderStatsTab(stats, attrs) {
    if (!stats) return `<div class="no-data">${this._t('no_cycle_data')}</div>`;
    const t = (k) => this._t(k);
    const esc = (s) => this._escHtml(String(s));

    const hasCycle = stats.cycleLengths.length > 0;
    const cycleHtml = hasCycle ? `
      <div class="stat-grid">
        <div class="stat-box"><div class="stat-val">${stats.avg}</div><div class="stat-key">${t('avg')} (${t('days')})</div></div>
        <div class="stat-box"><div class="stat-val">${stats.minLen}</div><div class="stat-key">${t('min')}</div></div>
        <div class="stat-box"><div class="stat-val">${stats.maxLen}</div><div class="stat-key">${t('max')}</div></div>
        <div class="stat-box"><div class="stat-val">±${stats.stdDev}</div><div class="stat-key">${t('std_dev')}</div></div>
      </div>` : `<div class="no-data">${t('no_cycle_data')}</div>`;

    const regularity = stats.regularity ? `<div class="regularity-badge reg-${esc(stats.regularity)}">${esc(t(stats.regularity))}</div>` : '';

    const bleedHtml = stats.avgBleed !== null ? `
      <div class="stat-grid">
        <div class="stat-box"><div class="stat-val">${stats.avgBleed}</div><div class="stat-key">${t('avg')} (${t('days')})</div></div>
        <div class="stat-box"><div class="stat-val">${stats.minBleed}</div><div class="stat-key">${t('min')}</div></div>
        <div class="stat-box"><div class="stat-val">${stats.maxBleed}</div><div class="stat-key">${t('max')}</div></div>
      </div>` : `<div class="no-data">${t('no_data')}</div>`;

    const bsHtml = this._renderStatsBars(stats.bsDist, (k) => this._bsLabel(k));
    const symHtml = this._renderStatsBars(stats.topSymptoms, (k) => this._symLabel(k));
    const painHtml = this._renderPainSparkline(stats.painTrend);

    return `
      <div class="section">
        <div class="section-header">
          <span class="section-icon">📅</span>
          <span>${esc(t('cycle_length'))}</span>
          ${regularity}
        </div>
        <div class="section-meta">${t('cycles_analyzed')}: <strong>${stats.cyclesAnalyzed}</strong> &middot; ${t('of')} ${esc(String(this._daysBack))} ${t('days')}</div>
        ${cycleHtml}
      </div>
      <div class="section">
        <div class="section-header"><span class="section-icon">🩸</span><span>${esc(t('bleeding_duration'))}</span></div>
        ${bleedHtml}
      </div>
      <div class="section">
        <div class="section-header"><span class="section-icon">💧</span><span>${esc(t('bleeding_strength'))}</span></div>
        ${bsHtml}
      </div>
      <div class="section">
        <div class="section-header"><span class="section-icon">🏥</span><span>${esc(t('top_symptoms'))}</span></div>
        ${symHtml}
      </div>
      <div class="section">
        <div class="section-header"><span class="section-icon">😣</span><span>${esc(t('pain_trend'))}</span></div>
        ${painHtml}
      </div>
      ${stats.anomalies && stats.anomalies.length > 0 ? `
      <div class="section">
        <div class="section-header"><span class="section-icon">🔔</span><span>${esc(t('anomalies_title'))}</span></div>
        <div class="anomaly-list">${this._renderAnomalies(stats.anomalies)}</div>
      </div>` : ''}
      <div class="section">
        <div class="section-header"><span class="section-icon">🔗</span><span>${esc(t('correlations_title'))}</span></div>
        ${stats.correlations ? `<div class="section-meta">${esc(t('correlations_subtitle'))}</div>` : ''}
        <div class="corr-list">${this._renderCorrelations(stats.correlations)}</div>
      </div>
      ${this._renderPlanningSection(attrs)}`;
  }

  /**
   * Render the cycle planning section with period forecast and fertility forecast.
   * Shows estimates derived from historical cycle data and NFP analysis.
   *
   * @param {object} attrs  Sensor state attributes.
   * @returns {string}  HTML string for the planning section.
   */
  _renderPlanningSection(attrs) {
    const t = (k) => this._t(k);
    const esc = (s) => this._escHtml(String(s));

    const pf = attrs && attrs.period_forecast;
    const ff = attrs && attrs.fertility_forecast;

    if (!pf && !ff) return '';

    const confClass = (c) => c === 'high' ? 'nfp-conf-high' : c === 'medium' ? 'nfp-conf-medium' : 'nfp-conf-low';
    const confLabel = (c) => c === 'high' ? t('period_forecast_confidence_high')
      : c === 'medium' ? t('period_forecast_confidence_medium')
      : t('period_forecast_confidence_low');

    let periodHtml = '';
    if (pf) {
      periodHtml = `
        <div class="nfp-info-row nfp-info-highlight">
          <span class="nfp-info-icon">🩸</span>
          <span class="nfp-info-label">${esc(t('period_forecast_window'))}</span>
          <span class="nfp-info-value">${esc(pf.predicted_start)} – ${esc(pf.predicted_end)}</span>
        </div>
        <div class="nfp-info-row">
          <span class="nfp-info-icon">📊</span>
          <span class="nfp-info-label">${esc(t('period_forecast_confidence'))}</span>
          <span class="nfp-info-value nfp-likelihood-badge ${confClass(pf.confidence)}">${esc(confLabel(pf.confidence))}</span>
        </div>
        <div class="nfp-info-row">
          <span class="nfp-info-icon">📐</span>
          <span class="nfp-info-label">${esc(t('period_forecast_std'))}</span>
          <span class="nfp-info-value">±${esc(String(pf.cycle_std_days))} ${esc(t('days'))}</span>
        </div>`;
    } else {
      periodHtml = `<p class="no-data">${esc(t('period_forecast_no_data'))}</p>`;
    }

    let fertilityHtml = '';
    if (ff) {
      const sourceLabel = ff.source === 'nfp' ? t('fertility_forecast_source_nfp') : t('fertility_forecast_source_estimated');
      fertilityHtml = `
        <div class="nfp-info-row nfp-info-highlight">
          <span class="nfp-info-icon">🎯</span>
          <span class="nfp-info-label">${esc(t('fertility_forecast_ovulation'))}</span>
          <span class="nfp-info-value">${esc(ff.ovulation_estimate)} <span class="nfp-confidence-badge ${confClass(ff.confidence)}">${esc(sourceLabel)}</span></span>
        </div>
        <div class="nfp-info-row">
          <span class="nfp-info-icon">📅</span>
          <span class="nfp-info-label">${esc(t('fertility_forecast_window'))}</span>
          <span class="nfp-info-value">${esc(ff.fertile_window_start)} – ${esc(ff.fertile_window_end)}</span>
        </div>
        <div class="nfp-info-row">
          <span class="nfp-info-icon">💚</span>
          <span class="nfp-info-label">${esc(t('fertility_forecast_best_days'))}</span>
          <span class="nfp-info-value">${esc(ff.best_days_start)} – ${esc(ff.best_days_end)}</span>
        </div>`;
    } else {
      fertilityHtml = `<p class="no-data">${esc(t('fertility_forecast_no_data'))}</p>`;
    }

    const rangeStart = this._planningRangeStart || '';
    const rangeEnd = this._planningRangeEnd || '';
    const rangeForecast = this._computeDateRangeForecast(pf, ff, rangeStart, rangeEnd);
    let rangeHtml = '';
    if (!rangeForecast) {
      rangeHtml = `<p class="no-data">${esc(t('planning_range_invalid'))}</p>`;
    } else {
      const periodBadgeClass = `nfp-likelihood-badge ${confClass(rangeForecast.period.level)}`;
      const fertilityBadgeClass = `nfp-likelihood-badge ${confClass(rangeForecast.fertility.level)}`;
      const periodHint = rangeForecast.period.lowConfidence ? `<div class="planning-range-hint">${esc(t('planning_range_low_confidence'))}</div>` : '';
      rangeHtml = `
        <div class="nfp-info-row nfp-info-highlight">
          <span class="nfp-info-icon">🧭</span>
          <span class="nfp-info-label">${esc(t('planning_range_period'))}</span>
          <span class="nfp-info-value"><span class="${periodBadgeClass}">${esc(t(`planning_range_${rangeForecast.period.label}`))}</span> ${esc(rangeForecast.period.percent)}%</span>
        </div>
        ${periodHint}
        <div class="nfp-info-row nfp-info-highlight">
          <span class="nfp-info-icon">🌱</span>
          <span class="nfp-info-label">${esc(t('planning_range_fertility'))}</span>
          <span class="nfp-info-value"><span class="${fertilityBadgeClass}">${esc(t(`planning_range_${rangeForecast.fertility.label}`))}</span> ${esc(rangeForecast.fertility.percent)}%</span>
        </div>`;
    }

    return `
      <div class="section planning-section">
        <div class="section-header">
          <span class="section-icon">🗓️</span>
          <span>${esc(t('planning_title'))}</span>
        </div>
        <div class="nfp-info-box">
          <div class="planning-subsection-title">${esc(t('period_forecast_title'))}</div>
          ${periodHtml}
          <div class="planning-subsection-title" style="margin-top:8px;">${esc(t('fertility_forecast_title'))}</div>
          ${fertilityHtml}
          <div class="planning-subsection-title" style="margin-top:8px;">${esc(t('planning_range_title'))}</div>
          <div class="planning-range-inputs">
            <label>${esc(t('planning_range_start'))}<input type="date" id="planning-range-start" value="${esc(rangeStart)}" /></label>
            <label>${esc(t('planning_range_end'))}<input type="date" id="planning-range-end" value="${esc(rangeEnd)}" /></label>
          </div>
          ${rangeHtml}
        </div>
        <p class="nfp-likelihood-disclaimer">${esc(t('planning_disclaimer'))}</p>
      </div>`;
  }

  _scoreToLikelihood(score) {
    if (score >= 0.67) return { label: 'likely', level: 'high' };
    if (score >= 0.34) return { label: 'possible', level: 'medium' };
    return { label: 'unlikely', level: 'low' };
  }

  _estimateOverlap(rangeStartIso, rangeEndIso, eventStartIso, eventEndIso, uncertaintyDays, confidenceWeight) {
    const rangeStart = new Date(`${rangeStartIso}T12:00:00Z`);
    const rangeEnd = new Date(`${rangeEndIso}T12:00:00Z`);
    const eventStart = new Date(`${eventStartIso}T12:00:00Z`);
    const eventEnd = new Date(`${eventEndIso}T12:00:00Z`);
    if ([rangeStart, rangeEnd, eventStart, eventEnd].some((d) => Number.isNaN(d.getTime()))) return 0;
    const uncertaintyMs = Math.max(0, Number(uncertaintyDays || 0)) * 86400000;
    const expandedStart = new Date(eventStart.getTime() - uncertaintyMs);
    const expandedEnd = new Date(eventEnd.getTime() + uncertaintyMs);
    const overlapStart = new Date(Math.max(rangeStart.getTime(), expandedStart.getTime()));
    const overlapEnd = new Date(Math.min(rangeEnd.getTime(), expandedEnd.getTime()));
    if (overlapStart.getTime() > overlapEnd.getTime()) return 0;
    const overlapDays = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1;
    const expandedDays = Math.max(1, Math.floor((expandedEnd.getTime() - expandedStart.getTime()) / 86400000) + 1);
    const rangeDays = Math.max(1, Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1);
    const eventCoverage = overlapDays / expandedDays;
    const rangeCoverage = overlapDays / rangeDays;
    const score = ((eventCoverage * 0.7) + (rangeCoverage * 0.3)) * Math.max(0, Math.min(1, Number(confidenceWeight || 0)));
    return Math.max(0, Math.min(1, score));
  }

  _computeDateRangeForecast(periodForecast, fertilityForecast, rangeStartIso, rangeEndIso) {
    if (!rangeStartIso || !rangeEndIso || rangeStartIso > rangeEndIso) return null;

    const periodConfidence = (periodForecast && periodForecast.confidence) || 'low';
    const periodStd = Math.max(1, Math.min(14, Math.round(Number(periodForecast && periodForecast.cycle_std_days) || 3)));
    const periodWeight = periodConfidence === 'high' ? 1 : periodConfidence === 'medium' ? 0.85 : 0.65;
    let periodScore = 0;
    if (periodForecast && periodForecast.predicted_start && periodForecast.predicted_end) {
      periodScore = this._estimateOverlap(
        rangeStartIso,
        rangeEndIso,
        periodForecast.predicted_start,
        periodForecast.predicted_end,
        periodStd,
        periodWeight,
      );
    }

    const fertilityConfidence = (fertilityForecast && fertilityForecast.confidence) || 'low';
    const fertilitySource = (fertilityForecast && fertilityForecast.source) || 'estimated';
    const fertilityWeightBase = fertilityConfidence === 'high' ? 1 : fertilityConfidence === 'medium' ? 0.85 : 0.6;
    const fertilityWeight = fertilitySource === 'nfp' ? fertilityWeightBase : fertilityWeightBase * 0.9;
    const fertilityUncertainty = (fertilityConfidence === 'high' ? 1 : fertilityConfidence === 'medium' ? 2 : 4) + (fertilitySource === 'nfp' ? 0 : 1);
    let fertilityScore = 0;
    if (
      fertilityForecast
      && fertilityForecast.fertile_window_start
      && fertilityForecast.fertile_window_end
      && fertilityForecast.ovulation_estimate
    ) {
      const windowScore = this._estimateOverlap(
        rangeStartIso,
        rangeEndIso,
        fertilityForecast.fertile_window_start,
        fertilityForecast.fertile_window_end,
        fertilityUncertainty,
        fertilityWeight,
      );
      const ovulationScore = this._estimateOverlap(
        rangeStartIso,
        rangeEndIso,
        fertilityForecast.ovulation_estimate,
        fertilityForecast.ovulation_estimate,
        fertilityUncertainty,
        fertilityWeight,
      );
      fertilityScore = (windowScore * 0.7) + (ovulationScore * 0.3);
      if (
        fertilityForecast.best_days_start
        && fertilityForecast.best_days_end
        && !(fertilityForecast.best_days_end < rangeStartIso || fertilityForecast.best_days_start > rangeEndIso)
      ) {
        fertilityScore = Math.min(1, fertilityScore + 0.1);
      }
    }

    const periodLik = this._scoreToLikelihood(periodScore);
    const fertilityLik = this._scoreToLikelihood(fertilityScore);

    return {
      period: {
        ...periodLik,
        percent: Math.round(periodScore * 100),
        lowConfidence: periodConfidence === 'low' || periodStd > 5,
      },
      fertility: {
        ...fertilityLik,
        percent: Math.round(fertilityScore * 100),
      },
    };
  }

  _renderHygieneTab(attrs) {
    return `<div class="hygiene-tab">${renderHygieneContent(this._hass, this._config, attrs || {})}</div>`;
  }

  /**
   * Derive a pregnancy-likelihood level from NFP analysis data.
   *
   * Returns one of: 'high' | 'elevated' | 'low' | 'unknown'
   *
   * Conservative rules (not a medical diagnosis):
   *  - 'high'     : today falls within the fertile window AND confidence is high/medium
   *  - 'elevated' : today is within 1 day of the fertile window OR confidence is low but fertile window exists
   *  - 'low'      : temperature rise confirmed with high/medium confidence (post-ovulatory phase)
   *  - 'unknown'  : insufficient NFP data to determine likelihood
   *
   * @param {object|null} nfp  The nfp_analysis attribute object from the sensor.
   * @param {string|null} [todayIso]  ISO date string for "today"; defaults to current date.
   * @returns {'high'|'elevated'|'low'|'unknown'}
   */
  _nfpPregnancyLikelihood(nfp, todayIso) {
    if (!nfp || typeof nfp !== 'object') return 'unknown';

    const todayStr = todayIso || new Date().toISOString().slice(0, 10);
    const today = new Date(todayStr + 'T12:00:00Z');
    if (isNaN(today.getTime())) return 'unknown';

    const confidence = nfp.confidence_level || 'low';
    const tempRiseConfirmed = !!(nfp.details && nfp.details.temperature_rise_confirmed) || !!nfp.temperature_rise_detected;

    const fwStart = nfp.fertile_window && nfp.fertile_window.start;
    const fwEnd = nfp.fertile_window && nfp.fertile_window.end;

    if (fwStart && fwEnd) {
      const start = new Date(fwStart + 'T12:00:00Z');
      const end = new Date(fwEnd + 'T12:00:00Z');
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const inWindow = today >= start && today <= end;
        const nearWindow = today >= new Date(start.getTime() - 86400000) && today <= new Date(end.getTime() + 86400000);

        if (inWindow && (confidence === 'high' || confidence === 'medium')) return 'high';
        if (nearWindow) return 'elevated';
      }
    }

    // Post-ovulatory phase: temperature rise confirmed and confidence is reliable
    if (tempRiseConfirmed && (confidence === 'high' || confidence === 'medium')) return 'low';

    return 'unknown';
  }

  _nfpConceptionEstimate(nfp, todayIso) {
    if (nfp && typeof nfp === 'object' && nfp.conception_likelihood && typeof nfp.conception_likelihood === 'object') {
      const estimate = nfp.conception_likelihood;
      const probability = Number(estimate.probability);
      return {
        level: typeof estimate.level === 'string' ? estimate.level : 'unknown',
        probability: Number.isFinite(probability) ? Math.max(0, Math.min(100, Math.round(probability))) : null,
        confidence: typeof estimate.confidence === 'string' ? estimate.confidence : 'low',
        reason_key: typeof estimate.reason_key === 'string' ? estimate.reason_key : 'insufficient_data',
      };
    }

    const level = this._nfpPregnancyLikelihood(nfp, todayIso);
    return {
      level,
      probability: null,
      confidence: (nfp && nfp.confidence_level) || 'low',
      reason_key: level === 'low' ? 'post_ovulation' : level === 'unknown' ? 'insufficient_data' : 'fertile_signals',
    };
  }

  _hasNfpData(attrs) {
    const nfp = attrs && attrs.nfp_analysis;
    if (!nfp || typeof nfp !== 'object') return false;
    // Has NFP data if any meaningful NFP indicator is present
    return !!(
      nfp.temperature_rise_day
      || nfp.cervical_mucus_peak
      || nfp.cervix_peak
      || nfp.ovulation_day
      || nfp.conception_likelihood
    );
  }

  _renderNfpTab(attrs) {
    const t = (k) => this._t(k);
    const esc = (s) => this._escHtml(s);
    const nfp = attrs && attrs.nfp_analysis;

    if (!this._hasNfpData(attrs)) {
      return `<div class="section">
        <div class="section-header"><span class="section-icon"><img src="/menstruation_cycle/assets/state/nfp.svg" alt="NFP" class="section-icon-img" /></span><span>${esc(t('nfp_title'))}</span></div>
        <p class="no-data">${esc(t('nfp_no_data'))}</p>
      </div>`;
    }

    const confidence = nfp.confidence_level || 'low';
    const confidenceLabel = confidence === 'high' ? t('nfp_confidence_high')
      : confidence === 'medium' ? t('nfp_confidence_medium')
      : t('nfp_confidence_low');
    const confidenceClass = confidence === 'high' ? 'nfp-conf-high'
      : confidence === 'medium' ? 'nfp-conf-medium'
      : 'nfp-conf-low';
    const score = nfp.nfp_symptom_score != null ? Math.round(nfp.nfp_symptom_score * 100) : 0;

    // Determine cycle start for day numbers
    const cycleStart = attrs.cycle_start_date || null;
    const toDayNum = (iso) => {
      if (!iso || !cycleStart) return null;
      const d0 = new Date(cycleStart + 'T12:00:00Z');
      const d1 = new Date(iso + 'T12:00:00Z');
      if (isNaN(d0) || isNaN(d1)) return null;
      return Math.round((d1 - d0) / 86400000) + 1;
    };

    const dayLabel = (iso) => {
      if (!iso) return esc(t('nfp_not_detected'));
      const num = toDayNum(iso);
      return num != null ? esc(t('nfp_day_label').replace('{n}', num)) + ` (${esc(iso)})` : esc(iso);
    };

    const ovDay = nfp.ovulation_day;
    const fwStart = nfp.fertile_window && nfp.fertile_window.start;
    const fwEnd = nfp.fertile_window && nfp.fertile_window.end;
    const fertileText = (fwStart && fwEnd)
      ? `${esc(fwStart)} – ${esc(fwEnd)}`
      : esc(t('nfp_not_detected'));

    const methodLabel = (nfp.ovulation_detected && confidence !== 'low')
      ? `<img src="/menstruation_cycle/assets/state/nfp.svg" alt="NFP Method" class="method-icon" />${esc(t('nfp_method_nfp'))}`
      : `<img src="/menstruation_cycle/assets/state/hybrid.svg" alt="Standard Method" class="method-icon" />${esc(t('nfp_method_standard'))}`;

    // Build temperature chart from symptom history
    const chartHtml = this._renderNfpTempChart(attrs, nfp);

    const conceptionEstimate = this._nfpConceptionEstimate(nfp);
    const likelihoodLevel = conceptionEstimate.level;
    const likelihoodLabel = likelihoodLevel === 'high' ? t('nfp_likelihood_high')
      : likelihoodLevel === 'elevated' ? t('nfp_likelihood_elevated')
      : likelihoodLevel === 'low' ? t('nfp_likelihood_low')
      : t('nfp_likelihood_unknown');
    const likelihoodClass = likelihoodLevel === 'high' ? 'nfp-likelihood-high'
      : likelihoodLevel === 'elevated' ? 'nfp-likelihood-elevated'
      : likelihoodLevel === 'low' ? 'nfp-likelihood-low'
      : 'nfp-likelihood-unknown';
    const likelihoodValue = conceptionEstimate.probability != null
      ? `${conceptionEstimate.probability}% – ${likelihoodLabel}`
      : likelihoodLabel;
    const reasonMap = {
      positive_test: t('nfp_likelihood_reason_positive_test'),
      negative_test: t('nfp_likelihood_reason_negative_test'),
      fertile_unprotected: t('nfp_likelihood_reason_fertile_unprotected'),
      protected_window: t('nfp_likelihood_reason_protected_window'),
      post_ovulation: t('nfp_likelihood_reason_post_ovulation'),
      fertile_signals: t('nfp_likelihood_reason_fertile_signals'),
      insufficient_data: t('nfp_likelihood_reason_insufficient_data'),
    };
    const likelihoodReason = reasonMap[conceptionEstimate.reason_key] || reasonMap.insufficient_data;

    return `
      <div class="section">
        <div class="section-header">
          <span class="section-icon"><img src="/menstruation_cycle/assets/state/nfp.svg" alt="NFP" class="section-icon-img" /></span>
          <span>${esc(t('nfp_title'))}</span>
          <span class="nfp-confidence-badge ${confidenceClass}">${esc(confidenceLabel)}</span>
        </div>
        <div class="nfp-info-box">
          <div class="nfp-info-row">
            <span class="nfp-info-icon"><img src="/menstruation_cycle/assets/state/nfp.svg" alt="NFP" class="nfp-info-icon-img" /></span>
            <span class="nfp-info-label">${esc(t('nfp_temp_rise'))}</span>
            <span class="nfp-info-value">${dayLabel(nfp.temperature_rise_day)}</span>
          </div>
          <div class="nfp-info-row">
            <span class="nfp-info-icon">🌡️</span>
            <span class="nfp-info-label">${esc(t('nfp_temp_peak'))}</span>
            <span class="nfp-info-value">${dayLabel(nfp.temperature_peak_day)}</span>
          </div>
          <div class="nfp-info-row">
            <span class="nfp-info-icon">💧</span>
            <span class="nfp-info-label">${esc(t('nfp_mucus_peak'))}</span>
            <span class="nfp-info-value">${dayLabel(nfp.cervical_mucus_peak)}</span>
          </div>
          <div class="nfp-info-row">
            <span class="nfp-info-icon">📍</span>
            <span class="nfp-info-label">${esc(t('nfp_cervix_peak'))}</span>
            <span class="nfp-info-value">${dayLabel(nfp.cervix_peak)}</span>
          </div>
          <div class="nfp-info-row nfp-info-highlight">
            <span class="nfp-info-icon">🎯</span>
            <span class="nfp-info-label">${esc(t('nfp_ovulation'))}</span>
            <span class="nfp-info-value">${dayLabel(ovDay)}</span>
          </div>
          <div class="nfp-info-row">
            <span class="nfp-info-icon">📅</span>
            <span class="nfp-info-label">${esc(t('nfp_fertile_window'))}</span>
            <span class="nfp-info-value">${fertileText}</span>
          </div>
          <div class="nfp-info-row nfp-info-highlight nfp-pregnancy-likelihood">
            <span class="nfp-info-icon">🤰</span>
            <span class="nfp-info-label">${esc(t('nfp_pregnancy_likelihood'))}</span>
            <span class="nfp-info-value nfp-likelihood-badge ${likelihoodClass}">${esc(likelihoodValue)}</span>
          </div>
          <p class="nfp-likelihood-explainer">${esc(likelihoodReason)}</p>
          <p class="nfp-likelihood-disclaimer">${esc(t('nfp_likelihood_disclaimer'))}</p>
          <div class="nfp-info-row">
            <span class="nfp-info-icon">🔢</span>
            <span class="nfp-info-label">${esc(t('nfp_score'))}</span>
            <span class="nfp-info-value">${score}%</span>
          </div>
          <div class="nfp-info-row">
            <span class="nfp-info-icon">🔬</span>
            <span class="nfp-info-label">${esc(t('nfp_method'))}</span>
            <span class="nfp-info-value">${methodLabel}</span>
          </div>
        </div>
      </div>
      ${chartHtml}`;
  }

  _renderNfpTempChart(attrs, nfp) {
    const t = (k) => this._t(k);
    const esc = (s) => this._escHtml(s);
    const cycleStart = attrs && attrs.cycle_start_date;
    const symptomHistory = Array.isArray(attrs && attrs.symptom_history) ? attrs.symptom_history : [];

    // Filter temp entries from cycle start onwards
    const tempEntries = symptomHistory
      .filter(e => e && e.basal_temp != null && cycleStart && e.date >= cycleStart)
      .map(e => {
        const temp = parseFloat(e.basal_temp);
        if (isNaN(temp)) return null;
        const d0 = new Date(cycleStart + 'T12:00:00Z');
        const d1 = new Date(e.date + 'T12:00:00Z');
        const cycleDay = Math.round((d1 - d0) / 86400000) + 1;
        return { day: cycleDay, temp, date: e.date };
      })
      .filter(e => e !== null && e.day >= 1)
      .sort((a, b) => a.day - b.day);

    if (tempEntries.length < 2) {
      return '';
    }

    // Chart dimensions
    const W = 320;
    const H = 160;
    const padL = 36;
    const padR = 12;
    const padT = 12;
    const padB = 28;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const temps = tempEntries.map(e => e.temp);
    const days = tempEntries.map(e => e.day);
    const minTemp = Math.min(...temps) - 0.1;
    const maxTemp = Math.max(...temps) + 0.1;
    const maxDay = Math.max(...days, 1);

    const xScale = (day) => padL + ((day - 1) / Math.max(maxDay - 1, 1)) * chartW;
    const yScale = (temp) => padT + chartH - ((temp - minTemp) / (maxTemp - minTemp)) * chartH;

    // Baseline = min of first 6 measurements
    const baseline = temps.length >= 6 ? Math.min(...temps.slice(0, 6)) : Math.min(...temps);
    const threshold = baseline + 0.2;

    // Fertile window shading
    let fertileShade = '';
    if (nfp && nfp.fertile_window && nfp.fertile_window.start && nfp.fertile_window.end && cycleStart) {
      const d0 = new Date(cycleStart + 'T12:00:00Z');
      const fwS = new Date(nfp.fertile_window.start + 'T12:00:00Z');
      const fwE = new Date(nfp.fertile_window.end + 'T12:00:00Z');
      const fwStartDay = Math.round((fwS - d0) / 86400000) + 1;
      const fwEndDay = Math.round((fwE - d0) / 86400000) + 1;
      const x1 = xScale(fwStartDay);
      const x2 = xScale(fwEndDay);
      if (x2 > x1) {
        fertileShade = `<rect x="${x1.toFixed(1)}" y="${padT}" width="${(x2 - x1).toFixed(1)}" height="${chartH}" fill="rgba(250,200,50,0.18)" />`;
      }
    }

    // Reference lines
    const baselineY = yScale(baseline).toFixed(1);
    const thresholdY = yScale(threshold).toFixed(1);
    const refLines = `
      <line x1="${padL}" y1="${baselineY}" x2="${W - padR}" y2="${baselineY}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4,3" />
      <line x1="${padL}" y1="${thresholdY}" x2="${W - padR}" y2="${thresholdY}" stroke="#f59e0b" stroke-width="1" stroke-dasharray="4,3" />`;

    // Temperature line path
    const points = tempEntries.map(e => `${xScale(e.day).toFixed(1)},${yScale(e.temp).toFixed(1)}`).join(' ');
    const polyline = `<polyline points="${points}" fill="none" stroke="var(--primary-color, #c0392b)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`;

    // Dots
    const dots = tempEntries.map(e =>
      `<circle cx="${xScale(e.day).toFixed(1)}" cy="${yScale(e.temp).toFixed(1)}" r="3" fill="var(--primary-color, #c0392b)" />`
    ).join('');

    // Ovulation marker
    let ovMarker = '';
    if (nfp && nfp.ovulation_day && cycleStart) {
      const d0 = new Date(cycleStart + 'T12:00:00Z');
      const ovD = new Date(nfp.ovulation_day + 'T12:00:00Z');
      const ovDay = Math.round((ovD - d0) / 86400000) + 1;
      const ox = xScale(ovDay);
      ovMarker = `<line x1="${ox.toFixed(1)}" y1="${padT}" x2="${ox.toFixed(1)}" y2="${(padT + chartH).toFixed(1)}" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="3,2" />
        <text x="${ox.toFixed(1)}" y="${padT - 2}" text-anchor="middle" font-size="9" fill="#16a34a">🎯</text>`;
    }

    // Mucus peak marker
    let mucusMarker = '';
    if (nfp && nfp.cervical_mucus_peak && cycleStart) {
      const d0 = new Date(cycleStart + 'T12:00:00Z');
      const mD = new Date(nfp.cervical_mucus_peak + 'T12:00:00Z');
      const mDay = Math.round((mD - d0) / 86400000) + 1;
      const mx = xScale(mDay);
      mucusMarker = `<text x="${mx.toFixed(1)}" y="${(padT + chartH + 12).toFixed(1)}" text-anchor="middle" font-size="10">💧</text>`;
    }

    // Cervix peak marker
    let cervixMarker = '';
    if (nfp && nfp.cervix_peak && cycleStart) {
      const d0 = new Date(cycleStart + 'T12:00:00Z');
      const cD = new Date(nfp.cervix_peak + 'T12:00:00Z');
      const cDay = Math.round((cD - d0) / 86400000) + 1;
      const cx = xScale(cDay);
      cervixMarker = `<text x="${cx.toFixed(1)}" y="${(padT + chartH + 22).toFixed(1)}" text-anchor="middle" font-size="10">📍</text>`;
    }

    // Y-axis labels
    const yTicks = [];
    const tempRange = maxTemp - minTemp;
    const step = tempRange > 0.8 ? 0.5 : 0.2;
    let tickTemp = Math.ceil(minTemp / step) * step;
    while (tickTemp <= maxTemp + 0.01) {
      yTicks.push(tickTemp);
      tickTemp = Math.round((tickTemp + step) * 100) / 100;
    }
    const yLabels = yTicks.map(temp =>
      `<text x="${(padL - 4).toFixed(0)}" y="${(yScale(temp) + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#888">${temp.toFixed(1)}</text>`
    ).join('');

    // X-axis labels (every ~5 days)
    const xStep = Math.max(1, Math.round(maxDay / 7));
    const xLabels = [];
    for (let d = 1; d <= maxDay; d += xStep) {
      xLabels.push(`<text x="${xScale(d).toFixed(1)}" y="${(padT + chartH + 10).toFixed(1)}" text-anchor="middle" font-size="8" fill="#888">${d}</text>`);
    }

    // Legend
    const legendY = H - 4;
    const legend = `
      <line x1="${padL}" y1="${legendY}" x2="${padL + 14}" y2="${legendY}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4,3" />
      <text x="${padL + 16}" y="${legendY + 3}" font-size="8" fill="#94a3b8">${esc(t('nfp_baseline'))}</text>
      <line x1="${padL + 70}" y1="${legendY}" x2="${padL + 84}" y2="${legendY}" stroke="#f59e0b" stroke-width="1" stroke-dasharray="4,3" />
      <text x="${padL + 86}" y="${legendY + 3}" font-size="8" fill="#f59e0b">${esc(t('nfp_threshold'))}</text>`;

    const svg = `<svg width="100%" viewBox="0 0 ${W} ${H}" class="nfp-temp-chart" aria-label="${esc(t('nfp_temp_chart'))}">
      ${fertileShade}
      ${refLines}
      ${polyline}
      ${dots}
      ${ovMarker}
      ${mucusMarker}
      ${cervixMarker}
      ${yLabels}
      ${xLabels.join('')}
      ${legend}
    </svg>`;

    return `<div class="section">
      <div class="section-header"><span class="section-icon">🌡️</span><span>${esc(t('nfp_temp_chart'))}</span></div>
      <div class="nfp-chart-wrap">${svg}</div>
      <div class="nfp-chart-axis-label">${esc(t('cycle_day'))}</div>
    </div>`;
  }

  _renderDoctorTab() {
    const t = (k) => this._t(k);
    const exportLang = this._exportLanguage || this._lang();
    const btnLabel = this._exportStatus === 'loading' ? t('exporting')
      : this._exportStatus === 'ok' ? t('export_ok')
      : this._exportStatus === 'err' ? t('export_err')
      : t('export_btn');
    const btnDisabled = this._exportStatus === 'loading' ? 'disabled' : '';

    return `
      <div class="section">
        <div class="section-header"><span class="section-icon">🏥</span><span>${this._escHtml(t('doctor_report_title'))}</span></div>
        <p class="description">${this._escHtml(t('doctor_report_desc'))}</p>
        <div class="form-field">
          <label>${this._escHtml(t('patient_name'))}</label>
          <input type="text" id="patient-name" value="${this._escHtml(this._patientName)}" placeholder="${this._escHtml(t('patient_name'))}" />
        </div>
        <div class="form-field">
          <label>${this._escHtml(t('patient_birthdate'))}</label>
          <input type="text" id="patient-birthdate" value="${this._escHtml(this._patientBirthdate)}" placeholder="YYYY-MM-DD" pattern="\\d{4}-\\d{2}-\\d{2}" />
        </div>
        <div class="form-field">
          <label>${this._escHtml(t('export_language'))}</label>
          <select id="export-lang">
            <option value="de" ${exportLang === 'de' ? 'selected' : ''}>Deutsch</option>
            <option value="en" ${exportLang === 'en' ? 'selected' : ''}>English</option>
          </select>
        </div>
        <button class="export-btn" id="export-btn" ${btnDisabled}>${this._escHtml(btnLabel)}</button>
        ${this._exportStatus === 'ok' ? '<p class="export-hint">📁 Die Datei wurde im HA-Export-Verzeichnis gespeichert.<br>Öffnen Sie sie im Browser und wählen Sie <em>Drucken → Als PDF speichern</em>.</p>' : ''}
      </div>`;
  }

  _renderFilterMenu() {
    return `
      <div class="filter-popover ${this._settingsOpen ? 'open' : ''}">
        <div class="section-header compact"><span class="section-icon">⚙️</span><span>${this._escHtml(this._t('days_back_label'))}</span></div>
        <div class="days-buttons compact">
          ${this._filterOptions().map(o => `<button class="days-btn ${this._daysBack === o.value ? 'active' : ''}" data-days="${o.value}">${this._escHtml(o.label)}</button>`).join('')}
        </div>
      </div>`;
  }

  _escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  _buildRenderKey() {
    const entityId = this._config?.entity;
    const stateObj = entityId ? this._hass?.states?.[entityId] : null;
    return [
      stateObj?.state || '',
      stateObj?.last_changed || '',
      this._tab,
      this._daysBack,
      this._settingsOpen ? 1 : 0,
      this._planningRangeStart || '',
      this._planningRangeEnd || '',
      this._lang(),
      this._config?.title || '',
      this._config?.entity || '',
      this._exportStatus || '',
    ].join('|');
  }

  _render() {
    if (!this._hass || !this._config) return;
    this._ensureRoot();

    // Skip full DOM replacement when nothing visible has changed — prevents
    // date-range inputs from losing focus on unrelated hass state pushes.
    const renderKey = this._buildRenderKey();
    if (renderKey === this._lastRenderKey) return;
    this._lastRenderKey = renderKey;

    const entityId = this._config.entity;
    const stateObj = entityId ? this._hass.states[entityId] : null;
    if (entityId && !stateObj) {
      this.shadowRoot.innerHTML = `<ha-card><div class="empty">${this._escHtml(this._t('entity_not_found'))}: ${this._escHtml(entityId)}</div></ha-card>`;
      return;
    }

    const attrs = stateObj ? (stateObj.attributes || {}) : {};
    const stats = this._computeStats(attrs);
    const title = this._config.title || this._t('title');
    const tab = this._tab;
    const t = (k) => this._t(k);
    const productStyles = getHygieneStyles({ embedded: true });

    let tabContent = '';
    if (tab === 'stats') tabContent = this._renderStatsTab(stats, attrs);
    else if (tab === 'hygiene') tabContent = this._renderHygieneTab(attrs);
    else if (tab === 'nfp') tabContent = this._renderNfpTab(attrs);
    else if (tab === 'doctor') tabContent = this._renderDoctorTab();

    const hasNfp = this._hasNfpData(attrs);

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { padding: 12px 16px 16px; }
        .card-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--primary-text-color); }
        .toolbar-wrap { position: relative; margin-bottom: 12px; }
        .tab-toolbar { display: flex; align-items: flex-end; gap: 8px; }
        .tabs { flex: 1; display: flex; gap: 4px; border-bottom: 2px solid var(--divider-color, #ddd); padding-bottom: 0; }
        .tab-btn { flex: 1; padding: 8px 4px; border: none; background: none; cursor: pointer; font-size: 12px; font-weight: 500; color: var(--secondary-text-color, #888); border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
        .tab-btn.active { color: var(--primary-color, #c0392b); border-bottom-color: var(--primary-color, #c0392b); }
        .tab-btn:hover:not(.active) { color: var(--primary-text-color); }
        .filter-toggle { flex: 0 0 auto; width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--divider-color, #ddd); background: var(--card-background-color, #fff); color: var(--primary-text-color); cursor: pointer; }
        .filter-toggle .filter-glyph { font-size: 16px; line-height: 1; display: inline-block; }
        .filter-popover { display: none; margin-top: 8px; border: 1px solid var(--divider-color, #ddd); border-radius: 12px; padding: 10px; background: var(--ha-card-background, var(--card-background-color, #fff)); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12); }
        .filter-popover.open { display: block; }
        .section { margin-bottom: 20px; }
        .section-header { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 14px; margin-bottom: 8px; color: var(--primary-text-color); }
        .section-header.compact { margin-bottom: 10px; }
        .section-icon { font-size: 16px; }
        .section-icon-img { width: 16px; height: 16px; display: inline-block; vertical-align: middle; }
        .method-icon { width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 4px; }
        .section-meta { font-size: 11px; color: var(--secondary-text-color, #888); margin-bottom: 8px; }
        .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(82px, 1fr)); gap: 8px; }
        .stat-box { background: var(--secondary-background-color, #f5f5f5); border-radius: 8px; padding: 8px; text-align: center; border: 1px solid var(--divider-color, rgba(128, 128, 128, 0.18)); }
        .stat-val { font-size: 18px; font-weight: 700; color: var(--primary-color, #c0392b); }
        .stat-key { font-size: 10px; color: var(--secondary-text-color, #888); margin-top: 2px; }
        .regularity-badge { padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-left: auto; }
        .reg-very_regular { background: color-mix(in srgb, var(--success-color, #27ae60) 16%, transparent); color: var(--success-color, #27ae60); }
        .reg-regular { background: color-mix(in srgb, var(--warning-color, #f39c12) 16%, transparent); color: var(--warning-color, #f39c12); }
        .reg-irregular { background: color-mix(in srgb, var(--error-color, #e74c3c) 14%, transparent); color: var(--error-color, #e74c3c); }
        .bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .bar-label { flex: 0 0 120px; font-size: 12px; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .bar-outer { flex: 1; height: 10px; background: var(--secondary-background-color, #f0f0f0); border-radius: 5px; overflow: hidden; }
        .bar-fill { height: 100%; background: var(--primary-color, #c0392b); border-radius: 5px; transition: width 0.4s; }
        .bar-pct { flex: 0 0 36px; font-size: 11px; color: var(--secondary-text-color, #888); text-align: right; }
        .sparkline-legend { font-size: 11px; color: var(--secondary-text-color, #888); margin-top: 4px; }
        .no-data { color: var(--secondary-text-color, #888); font-size: 12px; padding: 8px 0; }
        .description { font-size: 12px; color: var(--secondary-text-color, #888); margin-bottom: 12px; line-height: 1.5; }
        .form-field { margin-bottom: 12px; }
        .form-field label { display: block; font-size: 12px; color: var(--secondary-text-color, #888); margin-bottom: 4px; }
        .form-field input, .form-field select { width: 100%; padding: 8px; border: 1px solid var(--divider-color, #ddd); border-radius: 6px; font-size: 13px; background: var(--card-background-color, #fff); color: var(--primary-text-color); }
        .export-btn { width: 100%; padding: 10px; border: none; border-radius: 8px; background: var(--primary-color, #c0392b); color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
        .export-btn:hover { opacity: 0.85; }
        .export-btn:disabled { opacity: 0.5; cursor: default; }
        .export-hint { font-size: 11px; color: var(--secondary-text-color, #888); margin-top: 8px; line-height: 1.5; }
        .days-buttons { display: flex; gap: 8px; }
        .days-buttons.compact { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
        .days-btn { min-height: 34px; padding: 8px; border: 1px solid var(--divider-color, #ddd); border-radius: 8px; background: var(--secondary-background-color, #f5f5f5); cursor: pointer; font-size: 12px; color: var(--primary-text-color); }
        .days-btn.active { background: var(--primary-color, #c0392b); color: #fff; border-color: var(--primary-color, #c0392b); }
        .empty { padding: 20px; text-align: center; color: var(--secondary-text-color, #888); }
        .hygiene-tab { min-height: 0; }
        .nfp-confidence-badge { margin-left: auto; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
        .nfp-conf-high { background: color-mix(in srgb, var(--success-color, #27ae60) 16%, transparent); color: var(--success-color, #27ae60); }
        .nfp-conf-medium { background: color-mix(in srgb, var(--warning-color, #f39c12) 16%, transparent); color: var(--warning-color, #f39c12); }
        .nfp-conf-low { background: color-mix(in srgb, var(--secondary-text-color, #888) 14%, transparent); color: var(--secondary-text-color, #888); }
        .nfp-likelihood-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
        .nfp-likelihood-high { background: color-mix(in srgb, var(--error-color, #ef4444) 16%, transparent); color: var(--error-color, #ef4444); }
        .nfp-likelihood-elevated { background: color-mix(in srgb, var(--warning-color, #f59e0b) 16%, transparent); color: var(--warning-color, #f59e0b); }
        .nfp-likelihood-low { background: color-mix(in srgb, var(--success-color, #27ae60) 16%, transparent); color: var(--success-color, #27ae60); }
        .nfp-likelihood-unknown { background: color-mix(in srgb, var(--secondary-text-color, #888) 14%, transparent); color: var(--secondary-text-color, #888); }
        .nfp-likelihood-disclaimer { font-size: 10px; color: var(--secondary-text-color, #888); font-style: italic; margin: 2px 0 6px 24px; padding: 0; }
        .nfp-info-box { background: var(--secondary-background-color, #f5f5f5); border-radius: 10px; padding: 10px 12px; border: 1px solid var(--divider-color, rgba(128,128,128,0.18)); }
        .nfp-info-row { display: flex; align-items: baseline; gap: 6px; padding: 4px 0; border-bottom: 1px solid var(--divider-color, rgba(128,128,128,0.1)); font-size: 12px; }
        .nfp-info-row:last-child { border-bottom: none; }
        .nfp-info-row.nfp-info-highlight { font-weight: 600; color: var(--success-color, #16a34a); }
        .nfp-info-icon { flex: 0 0 18px; }
        .nfp-info-icon-img { width: 16px; height: 16px; display: inline-block; vertical-align: middle; }
        .nfp-info-label { flex: 0 0 140px; color: var(--secondary-text-color, #888); }
        .nfp-info-value { flex: 1; color: var(--primary-text-color); }
        .planning-range-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 6px 0 4px; }
        .planning-range-inputs label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--secondary-text-color, #888); }
        .planning-range-inputs input { padding: 6px 8px; border-radius: 8px; border: 1px solid var(--divider-color, #ddd); background: var(--card-background-color, #fff); color: var(--primary-text-color); font-size: 12px; }
        .planning-range-hint { margin: 2px 0 6px 24px; font-size: 10px; color: var(--secondary-text-color, #888); font-style: italic; }
        .nfp-chart-wrap { width: 100%; overflow: hidden; }
        .nfp-temp-chart { display: block; width: 100%; }
        .nfp-chart-axis-label { text-align: center; font-size: 10px; color: var(--secondary-text-color, #888); margin-top: 2px; }
        .anomaly-list { display: flex; flex-direction: column; gap: 8px; }
        .anomaly-card { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 10px; border-left: 4px solid; font-size: 12px; }
        .anomaly-info { background: color-mix(in srgb, #3b82f6 10%, transparent); border-color: #3b82f6; }
        .anomaly-warning { background: color-mix(in srgb, var(--warning-color, #f59e0b) 12%, transparent); border-color: var(--warning-color, #f59e0b); }
        .anomaly-alert { background: color-mix(in srgb, var(--error-color, #ef4444) 12%, transparent); border-color: var(--error-color, #ef4444); }
        .anomaly-icon { font-size: 16px; flex: 0 0 auto; margin-top: 1px; }
        .anomaly-body { display: flex; flex-direction: column; gap: 3px; }
        .anomaly-msg { font-weight: 600; color: var(--primary-text-color); }
        .anomaly-detail { color: var(--secondary-text-color, #888); font-size: 11px; }
        .anomaly-suggestion { color: var(--secondary-text-color, #888); font-size: 11px; font-style: italic; }
        .anomaly-no-data { color: var(--secondary-text-color, #888); font-size: 12px; padding: 8px 0; }
        .corr-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
        .corr-card { background: var(--secondary-background-color, #f5f5f5); border-radius: 10px; padding: 10px; border-left: 3px solid; display: flex; flex-direction: column; gap: 4px; }
        .corr-high { border-color: var(--success-color, #27ae60); }
        .corr-medium { border-color: var(--warning-color, #f59e0b); }
        .corr-low { border-color: var(--divider-color, #aaa); }
        .corr-sym { font-weight: 600; font-size: 12px; color: var(--primary-text-color); }
        .corr-pct { font-size: 20px; font-weight: 700; color: var(--primary-color, #c0392b); line-height: 1; }
        .corr-phase { font-size: 11px; color: var(--secondary-text-color, #888); }
        .corr-strength-badge { font-size: 10px; font-weight: 600; margin-top: 2px; color: var(--secondary-text-color, #888); text-transform: uppercase; letter-spacing: 0.5px; }
        ${productStyles}
        @media (max-width: 480px) {
          ha-card { padding: 12px; }
          .tab-toolbar { align-items: stretch; }
          .tabs { gap: 2px; }
          .tab-btn { font-size: 11px; }
          .bar-label { flex-basis: 96px; }
          .days-buttons.compact { grid-template-columns: 1fr; }
          .nfp-info-label { flex-basis: 110px; }
          .planning-range-inputs { grid-template-columns: 1fr; }
        }
      </style>
      <ha-card>
        ${title ? `<div class="card-title">${this._escHtml(title)}</div>` : ''}
        <div class="toolbar-wrap">
          <div class="tab-toolbar">
            <div class="tabs">
              <button class="tab-btn ${tab === 'stats' ? 'active' : ''}" data-tab="stats">${this._escHtml(t('period'))}</button>
              <button class="tab-btn ${tab === 'hygiene' ? 'active' : ''}" data-tab="hygiene">${this._escHtml(t('tab_hygiene'))}</button>
              ${hasNfp ? `<button class="tab-btn ${tab === 'nfp' ? 'active' : ''}" data-tab="nfp">${this._escHtml(t('nfp_method_nfp'))}</button>` : ''}
              <button class="tab-btn ${tab === 'doctor' ? 'active' : ''}" data-tab="doctor">${this._escHtml(t('doctor_report_title'))}</button>
            </div>
            <button class="filter-toggle" id="statistics-filter-toggle" title="${this._escHtml(`${t('filter')}: ${this._currentFilterLabel()}`)}" aria-label="${this._escHtml(t('filter_aria'))}"><span class="filter-glyph">⚙</span></button>
          </div>
          ${this._renderFilterMenu()}
        </div>
        <div class="tab-content">${tabContent}</div>
      </ha-card>`;

    this._attachListeners();
  }

  _attachListeners() {
    const root = this.shadowRoot;
    if (!root) return;

    root.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const nextTab = btn.dataset.tab;
        if (!nextTab || nextTab === this._tab) return;
        this._tab = nextTab;
        this._settingsOpen = false;
        this._exportStatus = null;
        this._render();
      });
    });

    const toggle = root.getElementById('statistics-filter-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        this._settingsOpen = !this._settingsOpen;
        this._render();
      });
    }

    root.querySelectorAll('.days-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const nextDays = parseInt(btn.dataset.days, 10);
        if (Number.isNaN(nextDays)) return;
        const changed = nextDays !== this._daysBack;
        this._daysBack = nextDays;
        this._settingsOpen = false;
        if (changed || this._settingsOpen) {
          this._render();
        } else {
          this._render();
        }
      });
    });

    root.querySelectorAll('button[data-action="add-underwear-shopping"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!this._hass) return;
        const quantity = Math.max(1, Number(btn.dataset.quantity || 1));
        await this._hass.callService('menstruation_cycle', 'manage_household_inventory', {
          inventory_action: 'add_to_shopping_list',
          product: 'underwear',
          quantity,
        });
      });
    });

    const nameInput = root.getElementById('patient-name');
    if (nameInput) {
      nameInput.addEventListener('input', e => { this._patientName = e.target.value; });
    }
    const bdInput = root.getElementById('patient-birthdate');
    if (bdInput) {
      bdInput.addEventListener('input', e => { this._patientBirthdate = e.target.value; });
    }
    const langSelect = root.getElementById('export-lang');
    if (langSelect) {
      langSelect.addEventListener('change', e => { this._exportLanguage = e.target.value; });
    }
    const planningRangeStart = root.getElementById('planning-range-start');
    if (planningRangeStart) {
      planningRangeStart.addEventListener('input', (e) => {
        this._planningRangeStart = e.target.value;
        this._render();
      });
    }
    const planningRangeEnd = root.getElementById('planning-range-end');
    if (planningRangeEnd) {
      planningRangeEnd.addEventListener('input', (e) => {
        this._planningRangeEnd = e.target.value;
        this._render();
      });
    }

    const exportBtn = root.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        if (this._exportStatus === 'loading') return;
        this._exportStatus = 'loading';
        this._render();
        try {
          const serviceData = {
            days_back: this._daysBack,
            language: this._exportLanguage || this._lang(),
          };
          if (this._config.entity) serviceData.entity_id = this._config.entity;
          if (this._config.entry_id) serviceData.entry_id = this._config.entry_id;
          if (this._config.profile) serviceData.profile = this._config.profile;
          const name = (root.getElementById('patient-name') || { value: this._patientName }).value.trim();
          const bd = (root.getElementById('patient-birthdate') || { value: this._patientBirthdate }).value.trim();
          const lang = (root.getElementById('export-lang') || { value: this._exportLanguage || this._lang() }).value;
          if (name) serviceData.patient_name = name;
          if (bd) serviceData.patient_birthdate = bd;
          serviceData.language = lang;

          await this._hass.callService('menstruation_cycle', 'export_doctor_report', serviceData);
          this._exportStatus = 'ok';
        } catch (err) {
          console.error('export_doctor_report failed', err);
          this._exportStatus = 'err';
        }
        this._render();
      });
    }
  }
}

/**
 * Menstrual Statistics Card Editor
 * Config UI for the Menstrual Statistics Card.
 */
class MenstruationStatisticsCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
  }

  get _schema() {
    return [
      { name: 'entity', required: false, label: 'Entity (sensor)', type: 'entity', domain: 'sensor' },
      { name: 'title', required: false, label: 'Card Title', type: 'text' },
      { name: 'days_back', required: false, label: 'Default days back (30–730)', type: 'number', min: 30, max: 730 },
      { name: 'language', required: false, label: 'Language (auto / de / en)', type: 'select', options: ['auto', 'de', 'en'] },
    ];
  }

  _fireEvent(detail) {
    this.dispatchEvent(new CustomEvent('config-changed', { detail, bubbles: true, composed: true }));
  }

  _render() {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    const cfg = this._config || {};

    const entityOptions = this._hass
      ? Object.keys(this._hass.states)
          .filter(eid => eid.startsWith('sensor.'))
          .sort()
          .map(eid => `<option value="${eid}" ${cfg.entity === eid ? 'selected' : ''}>${eid}</option>`)
          .join('')
      : '';

    this.shadowRoot.innerHTML = `
      <style>
        .field { margin-bottom: 12px; }
        label { display: block; font-size: 12px; color: #666; margin-bottom: 4px; }
        select, input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; }
      </style>
      <div>
        <div class="field">
          <label>Entity (sensor)</label>
          <select id="entity">
            <option value="">-- select entity --</option>
            ${entityOptions}
          </select>
        </div>
        <div class="field">
          <label>Card Title</label>
          <input type="text" id="title" value="${this._esc(cfg.title || '')}" placeholder="Statistiken" />
        </div>
        <div class="field">
          <label>Default days back (30–730)</label>
          <input type="number" id="days_back" value="${this._esc(String(cfg.days_back || 180))}" min="30" max="730" />
        </div>
        <div class="field">
          <label>Language</label>
          <select id="language">
            <option value="auto" ${(cfg.language || 'auto') === 'auto' ? 'selected' : ''}>Auto</option>
            <option value="de" ${cfg.language === 'de' ? 'selected' : ''}>Deutsch (DE)</option>
            <option value="en" ${cfg.language === 'en' ? 'selected' : ''}>English (EN)</option>
          </select>
        </div>
      </div>`;

    this.shadowRoot.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('change', () => this._onChange());
      el.addEventListener('input', () => this._onChange());
    });
  }

  _onChange() {
    const root = this.shadowRoot;
    if (!root) return;
    const cfg = {
      ...this._config,
      entity: root.getElementById('entity')?.value || '',
      title: root.getElementById('title')?.value || '',
      days_back: parseInt(root.getElementById('days_back')?.value || '180', 10),
      language: root.getElementById('language')?.value || 'auto',
    };
    this._config = cfg;
    this._fireEvent({ config: cfg });
  }

  _esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

customElements.define('menstruation-statistics-card-editor', MenstruationStatisticsCardEditor);

customElements.define('menstruation-statistics-card', MenstruationStatisticsCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'menstruation-statistics-card',
  name: 'Menstruation Statistics Card',
  description: 'Displays menstrual cycle statistics and generates a doctor report.',
  preview: false,
  documentationURL: 'https://github.com/wallenium/HA-menstrual-cycle',
});

// Expose hygiene helpers for testing (no external dependency on shared module)
MenstruationStatisticsCard._hygieneHelpers = {
  DEFAULT_CONFIG,
  HYGIENE_TRANSLATIONS,
  mergeConfig,
  getLang,
  translate,
  escapeHtml,
  escapeClassName,
  normalizeQuantity,
  normalizeProductKey,
  normalizeDateKey,
  dateKeyToOrdinal,
  todayOrdinal,
  formatNumber,
  dateLocale,
  formatDate,
  getSvgIcon,
  getUsageData,
  calculateStats,
  calculateAverageDailyUsage,
  calculateUnderwearWashPlan,
  calculateCupSavings,
  productLabel,
  buildMetrics,
  renderTimeline,
  getHygieneStyles,
  renderHygieneContent,
};
