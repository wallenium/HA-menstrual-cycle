/**
 * Shared product icon definitions and symptom-logging utilities for all
 * menstrual cards. Originally icon-only (hence the historical filename
 * menstruation-icons.js); renamed to reflect that it now also holds the
 * shared symptom-config/i18n/get_symptom-fetch logic previously duplicated
 * across menstruation-calendar-card.js and menstruation-gauge-card.js.
 */

const ASSET_BASE_URL = '/menstruation_cycle/assets';

const PRODUCT_ASSET_FILENAMES = {
  tampon: 'tampon.svg',
  pad: 'pad.svg',
  cup: 'menstrual_cup.svg',
  liner: 'pantyliner.svg',
  underwear: 'period_panty.svg',
};

const PREGNANCY_ASSET_FILENAMES = {
  1: 'preg_01.svg',
  2: 'preg_02.svg',
  3: 'preg_03.svg',
  4: 'preg_04.svg',
  5: 'preg_05.svg',
  6: 'preg_06.svg',
  7: 'preg_07.svg',
  8: 'preg_08.svg',
  9: 'preg_09.svg',
};

const STATE_ASSET_FILENAMES = {
  period: 'period.svg',
  fertile: 'fertile.svg',
  ovulation: 'ovulation.svg',
  pms: 'pms.svg',
  pre_menarche: 'premenarche.svg',
  menarche: 'premenarche.svg',
  menopause: 'menopause.svg',
  postpartum: 'postpartum.svg',
  neutral: 'neutral.svg',
};

const PRODUCT_KEY_ALIASES = {
  period_underwear: 'underwear',
};

const ICON_SIZES = {
  default: 24,
  small: 14,
  large: 48,
};

const ANIMATION_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

function normalizeProductKey(productName) {
  const key = String(productName || '').toLowerCase();
  return PRODUCT_KEY_ALIASES[key] || key;
}

function resolveSize(size) {
  if (typeof size === 'number' && Number.isFinite(size) && size > 0) {
    return size;
  }

  const key = String(size || 'default').toLowerCase();
  return ICON_SIZES[key] || ICON_SIZES.default;
}

function resolveStrokeWidth(size) {
  const iconSize = resolveSize(size);
  return Math.max(1.2, Math.min(2.2, iconSize / 13));
}

function parsePositiveInt(value) {
  const normalized = parseInt(String(value ?? '').trim(), 10);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return null;
  }
  return normalized;
}

function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildMaskedAssetIcon(src, size = 'default') {
  const iconSize = resolveSize(size);
  return `<span aria-hidden="true" style="display:block;width:${iconSize}px;height:${iconSize}px;flex:0 0 auto;background-color:currentColor;-webkit-mask:url('${src}') center / contain no-repeat;mask:url('${src}') center / contain no-repeat;"></span>`;
}

function buildImageAssetIcon(src, size = 'default') {
  const iconSize = resolveSize(size);
  return `<img aria-hidden="true" alt="" src="${src}" style="display:block;width:${iconSize}px;height:${iconSize}px;flex:0 0 auto;" />`;
}

function buildIconSvg(content, size = 'default', options = {}) {
  const iconSize = resolveSize(size);
  const strokeWidth = resolveStrokeWidth(size);
  const styleTag = options.style ? `<style>${options.style}</style>` : '';
  const svgStyle = options.svgStyle ? ` style="${options.svgStyle}"` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${iconSize}" height="${iconSize}" fill="none" stroke="currentColor" stroke-width="${strokeWidth.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"${svgStyle}>${styleTag}${content}</svg>`;
}

// Converts a pregnancy week number (1–40) to a display month (1–9).
// Always interprets the input as weeks; callers that have a month value should
// use it directly via clampInt rather than passing it here.
function weeksToPregnancyMonth(weeks) {
  const rawValue = parsePositiveInt(weeks);
  if (rawValue === null) {
    return 1;
  }

  return clampInt(Math.ceil(rawValue / 4), 1, 9);
}

function resolvePregnancyInfo(source = {}) {
  const isObjectSource = source !== null && typeof source === 'object';
  const pregnancyData = isObjectSource && source.pregnancy_data && typeof source.pregnancy_data === 'object'
    ? source.pregnancy_data
    : {};
  const weeksValue = parsePositiveInt(
    isObjectSource
      ? (source.weeks_pregnant
        ?? source.pregnancy_week
        ?? source.week
        ?? pregnancyData.weeks_pregnant
        ?? pregnancyData.pregnancy_week
        ?? pregnancyData.week)
      : source,
  );
  const monthValue = parsePositiveInt(
    isObjectSource
      ? (source.pregnancy_month
        ?? source.month
        ?? pregnancyData.pregnancy_month
        ?? pregnancyData.month)
      : null,
  );
  const trimesterValue = parsePositiveInt(
    isObjectSource
      ? (source.pregnancy_trimester
        ?? source.trimester
        ?? pregnancyData.pregnancy_trimester
        ?? pregnancyData.trimester)
      : null,
  );
  const month = monthValue !== null ? clampInt(monthValue, 1, 9) : weeksToPregnancyMonth(weeksValue);
  const week = weeksValue !== null ? clampInt(weeksValue, 1, 40) : clampInt((((month - 1) * 4) + 1), 1, 40);
  const trimester = trimesterValue !== null
    ? clampInt(trimesterValue, 1, 3)
    : clampInt(weeksValue !== null ? Math.ceil(week / 13) : Math.ceil(month / 3), 1, 3);
  const stateKey = isObjectSource ? String(source.state || '').toLowerCase() : '';
  const isPregnant = isObjectSource
    ? Boolean(source.is_pregnant ?? source.isPregnant ?? pregnancyData.is_pregnant ?? pregnancyData.isPregnant) || stateKey === 'pregnant'
    : true;

  return { isPregnant, week, month, trimester };
}

function getPregnancyIcon(monthOrWeeks, size = 'default') {
  const pregnancyInfo = resolvePregnancyInfo(monthOrWeeks);
  const assetFilename = PREGNANCY_ASSET_FILENAMES[pregnancyInfo.month] || PREGNANCY_ASSET_FILENAMES[1];
  const src = `${ASSET_BASE_URL}/pregnancy/${assetFilename}`;
  return buildImageAssetIcon(src, size);
}

function getStateAssetUrl(statusKey) {
  const normalized = String(statusKey || '').toLowerCase();
  const assetFilename = STATE_ASSET_FILENAMES[normalized];
  if (!assetFilename) {
    return '';
  }
  return `${ASSET_BASE_URL}/state/${assetFilename}`;
}

function getStateIcon(statusKey, size = 'default') {
  const src = getStateAssetUrl(statusKey);
  if (!src) {
    return '';
  }
  return buildImageAssetIcon(src, size);
}

function getNeutralStatusIcon(size = 'default') {
  return getStateIcon('neutral', size);
}

function getStatusIcon(statusKey, size = 'default') {
  const normalized = String(statusKey || '').toLowerCase();
  const stateAssetIcon = getStateIcon(normalized, size);
  if (stateAssetIcon) return stateAssetIcon;

  if (normalized === 'pregnant') return getPregnancyIcon(undefined, size);
  return getNeutralStatusIcon(size);
}

function getStatusAnimatedIcon(statusKey, attrs, size = 'default') {
  const normalized = String(statusKey || '').toLowerCase();
  const stateAssetIcon = getStateIcon(normalized, size);
  if (stateAssetIcon) return stateAssetIcon;

  if (normalized === 'pregnant') {
    return getPregnancyIcon(attrs, size);
  }
  return getStatusIcon(normalized, size);
}

function getSvgIcon(productName, size = 'default') {
  const productKey = normalizeProductKey(productName);
  const assetFilename = PRODUCT_ASSET_FILENAMES[productKey];
  if (!assetFilename) {
    return '';
  }

  const src = `${ASSET_BASE_URL}/period/${assetFilename}`;
  return buildMaskedAssetIcon(src, size);
}

function createAnimatedSvgElement(productName, size = 'default') {
  if (typeof document === 'undefined') {
    return null;
  }

  const src = getProductAssetUrl(productName);
  if (!src) {
    return null;
  }

  const ns = 'http://www.w3.org/2000/svg';
  const xlinkNs = 'http://www.w3.org/1999/xlink';
  const iconSize = resolveSize(size);
  const maskId = `pi-asset-mask-${Math.random().toString(36).slice(2, 10)}`;

  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('xmlns', ns);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(iconSize));
  svg.setAttribute('height', String(iconSize));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.dataset.assetSrc = src;
  svg.dataset.fillMask = `url(#${maskId})`;

  const defs = document.createElementNS(ns, 'defs');
  const mask = document.createElementNS(ns, 'mask');
  mask.setAttribute('id', maskId);
  mask.setAttribute('x', '0');
  mask.setAttribute('y', '0');
  mask.setAttribute('width', '24');
  mask.setAttribute('height', '24');
  mask.setAttribute('maskUnits', 'userSpaceOnUse');

  const maskImage = document.createElementNS(ns, 'image');
  maskImage.setAttribute('x', '0');
  maskImage.setAttribute('y', '0');
  maskImage.setAttribute('width', '24');
  maskImage.setAttribute('height', '24');
  maskImage.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  maskImage.setAttribute('href', src);
  maskImage.setAttributeNS(xlinkNs, 'xlink:href', src);
  maskImage.addEventListener('error', () => {
    svg.dispatchEvent(new CustomEvent('product-icon-asset-error', {
      bubbles: false,
      detail: { product: productName, src },
    }));
  }, { once: true });
  mask.appendChild(maskImage);
  defs.appendChild(mask);
  svg.appendChild(defs);

  const baseImage = document.createElementNS(ns, 'image');
  baseImage.setAttribute('x', '0');
  baseImage.setAttribute('y', '0');
  baseImage.setAttribute('width', '24');
  baseImage.setAttribute('height', '24');
  baseImage.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  baseImage.setAttribute('href', src);
  baseImage.setAttributeNS(xlinkNs, 'xlink:href', src);
  baseImage.setAttribute('class', 'anim-product-asset');
  baseImage.setAttribute('opacity', '0.95');
  baseImage.addEventListener('error', () => {
    svg.dispatchEvent(new CustomEvent('product-icon-asset-error', {
      bubbles: false,
      detail: { product: productName, src },
    }));
  }, { once: true });
  svg.appendChild(baseImage);

  return svg;
}

function getPregnancyAssetUrl(month) {
  const clamped = clampInt(parsePositiveInt(month) || 1, 1, 9);
  return `${ASSET_BASE_URL}/pregnancy/${PREGNANCY_ASSET_FILENAMES[clamped]}`;
}

function getProductAssetUrl(productName) {
  const productKey = normalizeProductKey(productName);
  const filename = PRODUCT_ASSET_FILENAMES[productKey];
  if (!filename) return '';
  return `${ASSET_BASE_URL}/period/${filename}`;
}

/**
 * Shared symptom-logging utilities, used by both menstruation-calendar-card.js
 * and menstruation-gauge-card.js — previously each maintained its own,
 * byte-identical copy of this logic (confirmed via diff before extracting),
 * which meant every bugfix here had to be applied twice. Extracted so future
 * fixes only need to happen once.
 */

/** Canonicalizes a raw option value (mostly hygiene-product synonyms) before
 * looking up its translation. */
function normalizeOptionKey(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return '';
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

/**
 * Returns the list of loggable symptom field definitions for a given cycle
 * state, filtered/adjusted for pre-menarche, menopause, and pregnancy
 * contexts. Each entry: { key, icon, multi, options[], ...extras }.
 */
function getSymptomConfig(state, isPregnant = false) {
  const pregnant = isPregnant || String(state || '') === 'pregnant';
  const all = [
    { key: 'bleeding_strength', icon: 'mdi:water-opacity', multi: false, options: ['none', 'light', 'medium', 'heavy', 'very_heavy'] },
    { key: 'clots', icon: 'mdi:water-alert', multi: false, options: ['yes', 'no'] },
    { key: 'clot_size', icon: 'mdi:ruler-square', multi: false, options: ['small', 'medium', 'large'], dependsOn: { key: 'clots', value: 'yes' } },
    { key: 'bleeding_type', icon: 'mdi:waves', multi: false, options: ['continuous', 'intermittent', 'drops'] },
    { key: 'spotting', icon: 'mdi:liquid-spot', multi: false, options: ['red', 'brown'] },
    { key: 'smell', icon: 'mdi:nose', multi: false, options: ['normal', 'inconspicuous', 'unpleasant', 'fishy'] },
    { key: 'discharge', icon: 'mdi:water-outline', multi: false, options: ['reddish', 'brown', 'white', 'clear', 'other'] },
    { key: 'hygiene', icon: 'asset:period/pad.svg', multi: true, options: ['pad', 'liner', 'tampon', 'cup', 'period_underwear'] },
    { key: 'cervical_mucus', icon: 'mdi:water', multi: false, options: ['keinen', 'klebrig', 'cremig', 'fadenziehend', 'untypisch'] },
    { key: 'cervix_position', icon: 'mdi:grid', multi: false, options: ['cervix_high', 'cervix_mid', 'cervix_low'], renderAs: 'cervix-grid' },
    { key: 'cervix_texture', icon: 'mdi:grid', multi: false, options: ['firm', 'soft', 'open'], hiddenInModal: true },
    { key: 'intercourse', icon: 'mdi:heart', multi: false, options: ['protected', 'unprotected'] },
    { key: 'libido', icon: 'mdi:heart-pulse', multi: false, options: ['libido_low', 'normal', 'libido_high'] },
    { key: 'pain', icon: 'mdi:emoticon-sad-outline', multi: true, options: ['mittelschmerz', 'cramps', 'tender_breasts', 'headache', 'migraine', 'lower_back', 'vulva'] },
    { key: 'test', icon: 'mdi:test-tube', multi: true, options: ['positive_ovulation', 'negative_ovulation', 'positive_pregnancy', 'negative_pregnancy'] },
    { key: 'training_intensity', icon: 'mdi:run-fast', multi: false, options: ['training_light', 'training_moderate', 'training_intense'] },
    { key: 'contraception_method', icon: 'mdi:pill', multi: false, options: ['none', 'pill', 'hormonal_iud', 'copper_iud', 'implant', 'patch', 'ring', 'injection', 'condom', 'other'] },
  ];
  if (String(state || '') === 'pre_menarche') {
    const allowed = new Set(['spotting', 'smell', 'discharge', 'hygiene', 'cervical_mucus', 'pain', 'training_intensity']);
    return all.filter((cat) => allowed.has(cat.key));
  }
  if (String(state || '') === 'menopause') {
    const allowed = new Set(['spotting', 'smell', 'discharge', 'hygiene', 'cervical_mucus', 'cervix_position', 'cervix_texture', 'intercourse', 'libido', 'pain', 'test', 'training_intensity', 'contraception_method']);
    return all.filter((cat) => allowed.has(cat.key));
  }
  if (pregnant) {
    return all
      .filter((cat) => (cat.key !== 'bleeding_strength' && cat.key !== 'clots' && cat.key !== 'clot_size' && cat.key !== 'bleeding_type' && cat.key !== 'contraception_method'))
      .map((cat) => {
        if (cat.key === 'hygiene') {
          return { ...cat, options: cat.options.filter((opt) => opt !== 'tampon' && opt !== 'cup') };
        }
        return cat;
      });
  }
  return all;
}

/**
 * Fetches a day's full, uncompacted symptom data via the get_symptom service
 * — reads straight from backend storage rather than the (possibly capped or
 * entirely absent, under heavy tracking history) symptom_history sensor
 * attribute. Uses hass.connection.sendMessagePromise directly rather than
 * hass.callService(), since callService's return_response support doesn't
 * reliably surface the actual response data in every HA frontend version
 * (confirmed: it can come back as just {context, user_id} with no response
 * key at all).
 *
 * Returns { data, error } — data is the response dict (or null if not found
 * or the call failed), error is a short reason string for logging by the
 * caller (or null on success). Never throws.
 */
async function fetchFreshSymptomData(hass, entityId, iso, logPrefix = '[menstruation-cycle]') {
  if (!hass?.connection?.sendMessagePromise) {
    return { data: null, error: 'hass.connection unavailable' };
  }
  try {
    const payload = entityId ? { entity_id: entityId, date: iso } : { date: iso };
    const result = await hass.connection.sendMessagePromise({
      type: 'call_service',
      domain: 'menstruation_cycle',
      service: 'get_symptom',
      service_data: payload,
      return_response: true,
    });
    const response = result?.response;
    if (response && response.found !== false) {
      console.debug(`${logPrefix} get_symptom fetched fresh data for`, iso, response);
      return { data: response, error: null };
    }
    console.debug(`${logPrefix} get_symptom returned no data for`, iso, '— raw result:', result);
    return { data: null, error: null };
  } catch (err) {
    console.warn(`${logPrefix} get_symptom call failed for`, iso, '— falling back to the (possibly capped) symptom_history attribute.', err);
    return { data: null, error: String(err) };
  }
}

/**
 * Renders the correct icon markup for a category's `icon` value, which can
 * be either a standard mdi: name (rendered via <ha-icon>) or a reference to
 * one of the project's own bundled SVG assets, prefixed with "asset:" (e.g.
 * "asset:period/pad.svg" — served via the integration's own HTTP route,
 * since ha-icon only understands mdi: names, not arbitrary SVG files).
 */
function renderCategoryIcon(icon) {
  if (!icon) return '';
  if (icon.startsWith('asset:')) {
    const assetPath = icon.slice('asset:'.length);
    return `<img src="/menstruation_cycle/assets/${assetPath}" alt="" style="width:18px;height:18px;object-fit:contain;" />`;
  }
  return `<ha-icon icon="${icon}"></ha-icon>`;
}

/**
 * HA-15 (M-Cycle_HA-Component-Roadmap.md, 15.09.2026): shared loading/error/
 * empty-state markup, so cards stop hand-rolling their own version of the
 * same three states (inline `.empty` divs, per-section try/catch, a
 * full-width red error box, ...). Deliberately small and unopinionated -
 * each card still owns its own CSS variables/spacing via the returned
 * class names (`mc-state`, `mc-state--loading`/`--error`/`--empty`), this
 * only standardizes the *markup shape* and escaping, not a card's layout.
 *
 * Adoption so far: menstruation-cycle-history-card-row.js. The other 12
 * cards each hand-roll their own version still - full adoption is a
 * separate, larger follow-up (see HA-15 note in the roadmap doc), not
 * something this pass rewrites blindly across files it hasn't fully read.
 */
function escapeHtmlText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderLoadingState(label) {
  const text = label || 'Loading…';
  return `<div class="mc-state mc-state--loading"><span class="mc-state__spinner" aria-hidden="true"></span><span>${escapeHtmlText(text)}</span></div>`;
}

function renderErrorState(message) {
  const text = message || 'Something went wrong.';
  return `<div class="mc-state mc-state--error">⚠️ <span>${escapeHtmlText(text)}</span></div>`;
}

function renderEmptyState(message) {
  const text = message || 'Nothing to show yet.';
  return `<div class="mc-state mc-state--empty">${escapeHtmlText(text)}</div>`;
}

/**
 * CSS for the three functions above, meant to be interpolated once into a
 * card's own `<style>` block (e.g. `${mcStateStyles()}`). Uses the same HA
 * theme custom properties every other card in this project already relies
 * on, and respects prefers-reduced-motion for the loading spinner (HA-17
 * territory, but trivial to also cover here since the spinner is new).
 */
function mcStateStyles() {
  return `
    .mc-state {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px;
      font-size: 0.9rem;
      color: var(--secondary-text-color);
    }
    .mc-state--error { color: var(--error-color, #c0392b); }
    .mc-state--empty { color: var(--mc-text-secondary, var(--secondary-text-color)); }
    .mc-state__spinner {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid var(--divider-color);
      border-top-color: var(--primary-color);
      animation: mc-state-spin 0.8s linear infinite;
      flex: 0 0 auto;
    }
    @media (prefers-reduced-motion: reduce) {
      .mc-state__spinner { animation: none; }
    }
    @keyframes mc-state-spin {
      to { transform: rotate(360deg); }
    }
  `;
}

/**
 * Per-option icon overrides for the symptom-logging categories in
 * getSymptomConfig() above (15.09.2026: "im Kalender/Gauge die vorhandene
 * Logging-UI aufwerten" - icons taken over from the iOS/macOS app's own
 * Assets.xcassets/buttons/ imagesets, same source SVGs, same button_*
 * filenames, now served from this integration's own assets/buttons/).
 *
 * Deliberately NOT every option has an icon here - the app's own icon set
 * has the exact same gaps (no template for cervical_mucus's "untypisch",
 * the two ovulation-test results, catch-all values like "other"/
 * "inconspicuous", or training_intensity at all). A category/option
 * missing from this table just falls back to its existing plain-text
 * button/checkbox label, exactly like the app falls back to a text chip
 * when it has no matching asset for a given case.
 */
const SYMPTOM_OPTION_ICONS = {
  bleeding_strength: {
    none: 'button_flow_none',
    light: 'button_flow_low',
    medium: 'button_flow_medium',
    heavy: 'button_flow_heavy',
    very_heavy: 'button_flow_veryheavy',
  },
  clots: { yes: 'button_clots_yes', no: 'button_clots_no' },
  clot_size: { small: 'button_clots_small', medium: 'button_clots_medium', large: 'button_clots_large' },
  bleeding_type: {
    continuous: 'button_flow_continous',
    intermittent: 'button_flow_incontinous',
    drops: 'button_flow_dripping',
  },
  spotting: { red: 'button_spotting_red', brown: 'button_spotting_brown' },
  smell: { normal: 'button_smell_normal', unpleasant: 'button_smell_stink', fishy: 'button_smell_fishy' },
  discharge: {
    reddish: 'button_spotting_reddish',
    brown: 'button_spotting_brownish',
    white: 'button_spotting_whitish',
    clear: 'button_spotting_transparent',
  },
  hygiene: {
    pad: 'button_hygenic_pad',
    liner: 'button_hygenic_pantyliner',
    tampon: 'button_hygenic_tampon',
    cup: 'button_hygenic_menstrualcup',
    period_underwear: 'button_hygenic_periodpanty',
  },
  cervical_mucus: {
    keinen: 'button_mucus_none',
    klebrig: 'button_mucus_sticky',
    cremig: 'button_mucus_creamy',
    fadenziehend: 'button_mucus_fluid',
  },
  cervix_position: {
    cervix_high: 'button_cervix_high',
    cervix_mid: 'button_cervix_medium',
    cervix_low: 'button_cervix_low',
  },
  cervix_texture: { firm: 'button_cervix_hard', soft: 'button_cervix_soft', open: 'button_cervix_open' },
  intercourse: { protected: 'button_intercource_protected', unprotected: 'button_intercource_unprotected' },
  libido: { libido_low: 'button_libido_low', normal: 'button_libido_medium', libido_high: 'button_libido_high' },
  pain: {
    mittelschmerz: 'button_pain_middlepain',
    cramps: 'button_pain_cramp',
    tender_breasts: 'button_pain_tenderbreast',
    headache: 'button_pain_headache',
    migraine: 'button_pain_migraine',
    lower_back: 'button_pain_backpain',
    vulva: 'button_pain_vulva',
  },
  test: { positive_pregnancy: 'button_test_preg_positive', negative_pregnancy: 'button_test_preg_negative' },
  contraception_method: {
    none: 'button_contraception_none',
    pill: 'button_contraception_pill',
    hormonal_iud: 'button_contraception_iud',
    copper_iud: 'button_contraception_iud',
    implant: 'button_contraception_implant',
    patch: 'button_contraception_patch',
    ring: 'button_contraception_ring',
    injection: 'button_contraception_shot',
    condom: 'button_contraception_condom',
  },
};

/**
 * Icon markup for one option within a symptom category, or '' if this
 * option has no icon (the caller then falls back to its existing
 * plain-text button/checkbox label unchanged). Same asset-serving
 * convention as renderCategoryIcon() above, just one level more specific
 * (a single option's value rather than the whole category) and always an
 * SVG under assets/buttons/ rather than an mdi: icon.
 */
function renderOptionIcon(categoryKey, optionValue) {
  const fileStem = SYMPTOM_OPTION_ICONS[categoryKey]?.[optionValue];
  if (!fileStem) return '';
  return `<img src="/menstruation_cycle/assets/buttons/${fileStem}.svg" alt="" class="sym-opt-icon" />`;
}

const MenstruationFunctions = {
  normalizeOptionKey,
  getSymptomConfig,
  fetchFreshSymptomData,
  renderCategoryIcon,
  renderOptionIcon,
  escapeHtmlText,
  renderLoadingState,
  renderErrorState,
  renderEmptyState,
  mcStateStyles,
};

if (typeof window !== 'undefined') {
  window.MenstruationFunctions = MenstruationFunctions;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports.MenstruationFunctions = MenstruationFunctions;
}

const ProductIcons = {
  getSvgIcon,
  createAnimatedSvgElement,
  getStatusIcon,
  getStatusAnimatedIcon,
  getStateAssetUrl,
  getStateIcon,
  weeksToPregnancyMonth,
  resolvePregnancyInfo,
  getPregnancyIcon,
  getPregnancyAssetUrl,
  getProductAssetUrl,
  getIcon(productKey) {
    return getSvgIcon(productKey);
  },
  getIconWithSize(productKey, size = 24) {
    return getSvgIcon(productKey, size);
  },
  getAllProducts() {
    return Object.keys(PRODUCT_ASSET_FILENAMES);
  },
};

if (typeof window !== 'undefined') {
  window.ProductIcons = ProductIcons;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProductIcons;
}
