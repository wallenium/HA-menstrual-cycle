const _mcCycleCardI18n = window.menstruationCycleI18n || (window.menstruationCycleI18n = {
  cache: {},
  loading: {},
  fallback: { en: {} },
});

if (typeof _mcCycleCardI18n.normalizeLang !== 'function') {
  _mcCycleCardI18n.normalizeLang = (language) => String(language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en';
}



class MenstruationGaugeCard extends HTMLElement {
  static getStubConfig() {
    return {
      type: 'custom:menstruation-gauge-card',
      entity: 'sensor.menstruation',
      entry_id: '',
      friendly_name: '',
      theme_mode: 'auto',
      title: 'Cycle Gauge',
      show_fertile_period: true,
      show_predicted_cycles: true,
      num_predicted_cycles: 6,
      calendar_edit_enabled: true,
      period_duration_days: 5
    };
  }

  static getConfigElement() {
    return document.createElement('menstruation-gauge-card-editor');
  }

  setConfig(config) {
    if (!config || (!config.entity && !config.entry_id)) {
      throw new Error('entity or entry_id is required');
    }
    this._config = {
      show_editor: true,
      show_fertile_period: true,
      show_predicted_cycles: true,
      num_predicted_cycles: 6,
      calendar_edit_enabled: true,
      period_duration_days: 5,
      ...config
    };
    this._viewDate = new Date();
    this._editorOpen = false;
    this._lastRenderKey = null;
    this._iconCache = {};
    this._gaugeRotation = 0;
    this._timelineMonth = null;
    this._timelineMonthInitialized = false;
    this._timelineWindowRevision = 0;
    this._timelineHasCenteredOnce = false;
    this._pendingTimelineState = null;
    this._timelineScrollHandler = null;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._loadTranslations();
    // Don't re-render while the symptom modal or first period modal is open to preserve user input.
    if (this._modalIso || this._pmModalOpen) return;
    this._render();
  }

  connectedCallback() {
    if (typeof ResizeObserver !== 'undefined' && !this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(() => {
        const newWidth = this.getBoundingClientRect()?.width || 0;
        if (newWidth !== this._lastCardWidth) {
          this._lastCardWidth = newWidth;
          if (this._config && this._hass) this._render();
        }
      });
      this._resizeObserver.observe(this);
    }
    // setConfig()/hass may run before the element is attached to the DOM (common with
    // masonry/sections/tab layouts), in which case the first _render() measured a width
    // of 0 and the timeline never got centered. Force a re-render now that we're actually
    // connected and laid out, so both the gauge sizing and timeline centering self-heal.
    if (this._config && this._hass) {
      this._lastCardWidth = 0;
      this._render();
    }
  }

  disconnectedCallback() {
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    if (this._timelineScrollTimer) clearTimeout(this._timelineScrollTimer);
    this._timelineScrollTimer = null;
    this._timelineStripEl = null;
  }

  getCardSize() {
    return 4;
  }

  _ensureRoot() {
    if (this.shadowRoot) return;
    this.attachShadow({ mode: 'open' });
  }

  _loadTranslations() {
    const lang = this._lang();
    if (_mcCycleCardI18n.cache[lang] || _mcCycleCardI18n.loading[lang]) return;
    if (typeof _mcCycleCardI18n.load !== 'function') return;
    _mcCycleCardI18n.load(lang).then(() => this._render()).catch(() => {});
  }

  _lang() {
    const language = this._hass?.locale?.language || this._hass?.language || 'en';
    return _mcCycleCardI18n.normalizeLang(language);
  }

  _t(key) {
    const loaded = window.menstruationCycleI18n?.cache?.[this._lang()] || {};
    if (loaded[key] !== undefined) return loaded[key];
    const i18n = {
      en: {
        card_name: 'Menstruation Gauge Card',
        card_description: 'A card to visualize menstruation cycle, fertile window, ovulation, and related symptoms.',
        days_unit: 'days',
        days_unknown: '-- days',
        days_until_menarche: 'Days until menarche',
        menarche_expected_in: 'Menarche expected in {days} days',
        menarche_overdue: 'Menarche {days} days overdue',
        pregnancy: 'Pregnancy',
        week: 'Week',
        month: 'Month',
        trimester: 'Trimester',
        // Modal UI
        modal_edit_day: 'Edit Day',
        period: 'Period',
        period_start: 'Period Start',
        log_today: 'Log Today',
        today: 'Today',
        save: 'Save',
        cancel: 'Cancel',
        basal_temp_label: 'Basal Temperature (°C)',
        // Symptom category labels
        bleeding_strength: 'Bleeding Strength',
        spotting: 'Spotting',
        discharge: 'Discharge',
        tt_intercourse: 'Intercourse',
        pain: 'Pain',
        tab_hygiene: 'Hygiene',
        cat_test: 'Test',
        cervical_mucus: 'Cervical Mucus',
        cat_smell: 'Smell',
        cat_clots: 'Clots',
        cat_clot_size: 'Clot Size',
        cat_bleeding_type: 'Bleeding Type',
        cat_cervix_position: 'Cervix Position',
        cat_cervix_texture: 'Cervix Texture',
        cat_libido: 'Libido',
        cat_training_intensity: 'Training Intensity',
        pregnancy: 'Pregnancy',
        // Symptom option labels
        opt_light: 'Light',
        nfp_confidence_medium: 'Medium',
        bleeding_heavy: 'Heavy',
        opt_very_heavy: 'Very Heavy',
        bleeding_none: 'None',
        opt_red: 'Red',
        opt_brown: 'Brown',
        opt_reddish: 'Reddish',
        opt_white: 'White',
        opt_clear: 'Clear',
        opt_other: 'Other',
        opt_protected: 'Protected',
        opt_unprotected: 'Unprotected',
        opt_mittelschmerz: 'Mittelschmerz',
        opt_cramps: 'Cramps',
        opt_tender_breasts: 'Tender Breasts',
        opt_headache: 'Headache',
        opt_migraine: 'Migraine',
        opt_lower_back: 'Lower Back Pain',
        opt_vulva: 'Vulva Pain',
        pad_duration: 'Pad',
        liner_duration: 'Liner',
        tampon_duration: 'Tampon',
        opt_cup: 'Cup',
        underwear_duration: 'Period Underwear',
        opt_positive_ovulation: 'LH Positive',
        opt_negative_ovulation: 'LH Negative',
        opt_positive_pregnancy: 'Pregnancy +',
        opt_negative_pregnancy: 'Pregnancy -',
        opt_keinen: 'None',
        opt_klebrig: 'Sticky',
        opt_cremig: 'Creamy',
        opt_fadenziehend: 'Stretchy',
        opt_untypisch: 'Atypical',
        opt_normal: 'Normal',
        opt_inconspicuous: 'Inconspicuous',
        opt_unpleasant: 'Unpleasant',
        opt_fishy: 'Fishy',
        yes: 'Yes',
        no: 'No',
        opt_small: 'Small',
        opt_large: 'Large',
        opt_continuous: 'Continuous',
        opt_intermittent: 'Intermittent',
        opt_drops: 'Drops',
        opt_cervix_high: 'High',
        opt_cervix_mid: 'Mid',
        opt_cervix_low: 'Low',
        opt_firm: 'Firm',
        opt_soft: 'Soft',
        opt_open: 'Open',
        nfp_confidence_low: 'Low',
        opt_libido_high: 'High',
        opt_libido_low: 'Low',
        bleeding_light: 'Light',
        opt_training_moderate: 'Moderate',
        opt_training_intense: 'Intense',
        // Pregnancy symptom options
        opt_nausea: 'Nausea',
        opt_fatigue: 'Fatigue',
        opt_heartburn: 'Heartburn',
        opt_preg_swelling: 'Swelling',
        opt_back_pain: 'Back Pain',
        opt_nausea: 'Nausea',
        opt_preg_fatigue: 'Fatigue',
        opt_heartburn: 'Heartburn',
        opt_preg_swelling: 'Swelling',
        opt_preg_mood_swings: 'Mood Swings',
        opt_preg_frequent_urination: 'Frequent Urination',
        opt_preg_braxton_hicks: 'Braxton Hicks',
        opt_preg_back_pain: 'Back Pain',
        // First Period (Pre-Menarche) flow
        log_first_period: 'Log First Period',
        log_first_period_symptoms: 'First Period - Log Symptoms',
        first_period_description: 'Select your symptoms for today and confirm the start of your first period.',
        leave_pre_menarche_title: 'Do you want to leave Pre-Menarche mode?',
        leave_pre_menarche_message: 'Your first period will be logged for today and cycle tracking mode will be activated.',
        welcome_period_title: 'Welcome to your period! 🎉',
        welcome_period_cycle_tracking: 'Cycle tracking starts now',
        welcome_period_features: 'New features: cycle prediction, statistics, ...',
        welcome_period_contraception: 'You are now fertile - think about contraception if needed!',
        welcome_period_return: 'You can always return to Pre-Menarche mode in Settings',
        spotting: 'Spotting',
        discharge: 'Discharge',
        pain: 'Pain',
        yes: 'Yes',
        no: 'No',
        continue: 'Continue',
      },
    };
    const val = i18n.en[key];
    return val !== undefined ? val : (i18n.en[key] ?? key);
  }

  _tCategory(key) {
    const prefixedKey = `cat_${key}`;
    const prefixedLabel = this._t(prefixedKey);
    return prefixedLabel !== prefixedKey ? prefixedLabel : this._t(key);
  }

  _tOption(key) {
    const normalizedKey = window.MenstruationFunctions ? window.MenstruationFunctions.normalizeOptionKey(key) : String(key ?? '').trim().toLowerCase();
    const prefixedKey = `opt_${normalizedKey}`;
    const prefixedLabel = this._t(prefixedKey);
    return prefixedLabel !== prefixedKey ? prefixedLabel : this._t(normalizedKey);
  }

  _normalizeISO(value) {
    const m = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s].*)/);
    if (!m) return null;
    return `${m[1]}-${m[2]}-${m[3]}`;
  }

  _parseISO(iso) {
    const n = this._normalizeISO(iso);
    if (!n) return null;
    const [y, m, d] = n.split('-').map((x) => Number(x));
    const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  _isoFromDate(dt) {
    if (!(dt instanceof Date) || Number.isNaN(dt.getTime())) return '';
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  _dayDiff(aIso, bIso) {
    const a = this._parseISO(aIso);
    const b = this._parseISO(bIso);
    if (!a || !b) return 0;
    return Math.round((a.getTime() - b.getTime()) / 86400000);
  }

  _addDaysToISO(iso, days) {
    const d = this._parseISO(iso);
    if (!d) return null;
    return this._isoFromDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, 12, 0, 0, 0));
  }

  // Returns the current date. Extracted so tests can override it with a fixed date.
  _todayDate() { return new Date(); }

  // ⚠️ Kept intentionally duplicated, not shared: this same formula also
  // exists in Python as model.estimate_fertile_window_for_cycle(), exposed
  // via the get_cycle_predictions service for external clients, and in
  // menstruation-calendar-card.js's _windowForCycleStart(). All three must
  // stay in sync — if you change the offset/clamping logic here, make the
  // same change everywhere else too, or the different views/APIs will start
  // disagreeing with each other.
  _fertileWindowForCycle(cycleStart, nextCycleStart, avgCycleLength) {
    if (!cycleStart) return null;
    let cycleLen;
    if (nextCycleStart) {
      const len = this._dayDiff(nextCycleStart, cycleStart);
      cycleLen = (len >= 20 && len <= 60) ? len : avgCycleLength;
    } else {
      cycleLen = avgCycleLength;
    }
    const cl = Math.max(20, Math.min(60, Math.round(cycleLen) || 28));
    // Calculate ovulation and fertile window relative to cycle start
    // ovulation = day floor(cl/2) from cycle start (0-indexed)
    const ovulationOffset = Math.floor(cl / 2) - 1;
    // fertile window = 5 days before through 1 day after ovulation (~6-7 days total)
    const fertileStartOffset = ovulationOffset - 5;
    const fertileEndOffset = ovulationOffset + 1;
    return {
      fertileStart: this._addDaysToISO(cycleStart, fertileStartOffset),
      fertileEnd: this._addDaysToISO(cycleStart, fertileEndOffset),
      ovulationDay: this._addDaysToISO(cycleStart, ovulationOffset),
    };
  }

  _monthDays(dt) {
    return new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
  }

  _resolvePeriodDuration(attrs) {
    const sensorEffective = Number(attrs?.period_duration_days);
    const sensorLearned = Number(attrs?.period_duration_learned_avg_days);
    const sensorDefault = Number(attrs?.period_duration_default_days);
    const cfgRaw = this._config?.period_duration_days;
    const cfgText = String(cfgRaw ?? '').trim().toLowerCase();

    if (cfgText === 'learnt' || cfgText === 'learned') {
      if (Number.isFinite(sensorLearned)) return Math.max(1, Math.min(14, Math.round(sensorLearned)));
      if (Number.isFinite(sensorEffective)) return Math.max(1, Math.min(14, Math.round(sensorEffective)));
      if (Number.isFinite(sensorDefault)) return Math.max(1, Math.min(14, Math.round(sensorDefault)));
      return 5;
    }

    const cfgNum = Number(cfgRaw);
    if (Number.isFinite(cfgNum)) return Math.max(1, Math.min(14, Math.round(cfgNum)));
    if (Number.isFinite(sensorEffective)) return Math.max(1, Math.min(14, Math.round(sensorEffective)));
    if (Number.isFinite(sensorDefault)) return Math.max(1, Math.min(14, Math.round(sensorDefault)));
    return 5;
  }

  _resolvePregnancyInfo(source = {}) {
    const sharedResolver = window.ProductIcons?.resolvePregnancyInfo;
    if (typeof sharedResolver === 'function') {
      return sharedResolver(source);
    }

    const parsePositiveInt = (value) => {
      const normalized = parseInt(String(value ?? '').trim(), 10);
      return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
    };
    const clampInt = (value, min, max) => Math.max(min, Math.min(max, value));
    const pregnancyData = source && typeof source === 'object' && source.pregnancy_data && typeof source.pregnancy_data === 'object'
      ? source.pregnancy_data
      : {};
    const weeksValue = parsePositiveInt(
      source?.weeks_pregnant
      ?? source?.pregnancy_week
      ?? source?.week
      ?? pregnancyData.weeks_pregnant
      ?? pregnancyData.pregnancy_week
      ?? pregnancyData.week,
    );
    const monthValue = parsePositiveInt(
      source?.pregnancy_month
      ?? source?.month
      ?? pregnancyData.pregnancy_month
      ?? pregnancyData.month,
    );
    const trimesterValue = parsePositiveInt(
      source?.pregnancy_trimester
      ?? source?.trimester
      ?? pregnancyData.pregnancy_trimester
      ?? pregnancyData.trimester,
    );
    const month = monthValue !== null
      ? clampInt(monthValue, 1, 9)
      : clampInt(Math.ceil((weeksValue || 1) / 4), 1, 9);
    const week = weeksValue !== null
      ? clampInt(weeksValue, 1, 40)
      : clampInt((((month - 1) * 4) + 1), 1, 40);
    const trimester = trimesterValue !== null
      ? clampInt(trimesterValue, 1, 3)
      : clampInt(weeksValue !== null ? Math.ceil(week / 13) : Math.ceil(month / 3), 1, 3);
    const isPregnant = Boolean(source?.is_pregnant ?? source?.isPregnant ?? pregnancyData.is_pregnant ?? pregnancyData.isPregnant)
      || String(source?.state || '').toLowerCase() === 'pregnant';

    return { isPregnant, week, month, trimester };
  }

  _buildModel() {
    const entityId = this._resolveEntityId();
    const stateObj = entityId ? this._hass?.states?.[entityId] : undefined;
    const attrs = stateObj?.attributes || {};
    const pregnancyInfo = this._resolvePregnancyInfo({ state: stateObj?.state, ...attrs });
    const historyRaw = JSON.stringify(attrs.history);
    if (historyRaw !== this._lastHistoryRaw) {
      this._lastHistoryRaw = historyRaw;
      this._normalizedHistory = Array.isArray(attrs.history) ? attrs.history.map((x) => this._normalizeISO(x)).filter(Boolean) : [];
    }
    const history = this._normalizedHistory || [];
    const confirmedSet = new Set(history);
    const periodDuration = this._resolvePeriodDuration(attrs);
    const predictedStartsAttr = Array.isArray(attrs.predicted_cycle_starts)
      ? attrs.predicted_cycle_starts
      : [];
    const predicted = this._normalizeISO(attrs.next_predicted_start);
    const predictedStarts = Array.from(
      new Set(
        predictedStartsAttr
          .map((iso) => this._normalizeISO(iso))
          .filter(Boolean),
      ),
    ).sort();
    if (!predictedStarts.length && predicted) predictedStarts.push(predicted);
    const fertileStart = this._normalizeISO(attrs.fertile_window_start);
    const fertileEnd = this._normalizeISO(attrs.fertile_window_end);
    const ovulationDay = this._normalizeISO(attrs.ovulation_day);
    const menarcheData = attrs.menarche_data || {};
    const normalizedEstimatedDate = this._normalizeISO(menarcheData?.estimated_date);
    const estimatedDate = this._parseISO(normalizedEstimatedDate) || new Date(menarcheData?.estimated_date || '');
    const todayNoon = this._parseISO(this._isoFromDate(new Date()));
    const daysUntilMenarche = String(stateObj?.state || '') === 'pre_menarche' && estimatedDate instanceof Date && !Number.isNaN(estimatedDate.getTime())
      ? Math.ceil((estimatedDate.getTime() - todayNoon.getTime()) / 86400000)
      : null;

    // Build a date-keyed symptom lookup
    const symptomHistoryRaw = JSON.stringify(attrs.symptom_history);
    const symptomDataTodayRaw = JSON.stringify(attrs.symptom_data_today);
    if (symptomHistoryRaw !== this._lastSymptomHistoryRaw || symptomDataTodayRaw !== this._lastSymptomDataTodayRaw) {
      this._lastSymptomHistoryRaw = symptomHistoryRaw;
      this._lastSymptomDataTodayRaw = symptomDataTodayRaw;
      const symptomByDateBuilt = {};
      const symptomHistory = Array.isArray(attrs.symptom_history) ? attrs.symptom_history : [];
      if (symptomHistory.length) {
        symptomHistory.forEach((entry) => {
          const d = this._normalizeISO(entry?.date);
          if (d) symptomByDateBuilt[d] = entry;
        });
      } else if (attrs.symptom_data_today && typeof attrs.symptom_data_today === 'object') {
        const todayIso = this._isoFromDate(new Date());
        symptomByDateBuilt[todayIso] = { date: todayIso, ...attrs.symptom_data_today };
      }
      this._normalizedSymptomByDate = symptomByDateBuilt;
    }
    const symptomByDate = this._normalizedSymptomByDate || {};
    const currentBleedingBlock = attrs.current_bleeding_block && typeof attrs.current_bleeding_block === 'object'
      ? attrs.current_bleeding_block
      : null;

    const viewDate = this._viewDate || new Date();

    // Gather grouped_starts and cycle length info for dynamic fertile/ovulation calculation
    const groupedStarts = Array.isArray(attrs.grouped_starts)
      ? attrs.grouped_starts.map((s) => this._normalizeISO(s)).filter(Boolean).sort()
      : [];
    const cycleStarts = Array.from(new Set([...groupedStarts, ...predictedStarts])).sort();
    const rawAvgCycle = Number(attrs.avg_cycle_length);
    const rawOverride = Number(attrs.cycle_length_override);
    const effectiveAvgCycle = (rawOverride >= 20 && rawOverride <= 38)
      ? rawOverride
      : (rawAvgCycle >= 20 && rawAvgCycle <= 38 ? rawAvgCycle : 28);

    // Compute effective fertile window and ovulation for the viewed month's cycle
    // (used as model properties for cache keys and non-series consumers)
    let effectiveFertileStart = fertileStart;
    let effectiveFertileEnd = fertileEnd;
    let effectiveOvulationDay = ovulationDay;

    // NFP data has priority: only use standard cycle-length calculation when no good NFP data is present
    const nfpAnalysisAttrs = (attrs.nfp_analysis && typeof attrs.nfp_analysis === 'object') ? attrs.nfp_analysis : null;
    const hasNfpData = nfpAnalysisAttrs
      && nfpAnalysisAttrs.fertile_window
      && nfpAnalysisAttrs.confidence_level !== 'low';
    // Only use sensor attribute fallback (which may carry NFP-derived values) when NFP quality is
    // acceptable or there is no NFP data at all.  Low-confidence NFP should not leak into the gauge.
    const shouldUseSensorFallback = !nfpAnalysisAttrs || nfpAnalysisAttrs.confidence_level !== 'low';

    if (!hasNfpData && cycleStarts.length > 0) {
      const viewLastDayDt = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0, 12);
      const viewLastIso = this._isoFromDate(viewLastDayDt);
      const viewCycleStartIso = cycleStarts.filter((d) => d <= viewLastIso).pop() || null;
      if (viewCycleStartIso) {
        const viewCycleIdx = cycleStarts.indexOf(viewCycleStartIso);
        const viewNextCycleIso = cycleStarts[viewCycleIdx + 1] || null;
        const fw = this._fertileWindowForCycle(viewCycleStartIso, viewNextCycleIso, effectiveAvgCycle);
        if (fw) {
          effectiveFertileStart = fw.fertileStart;
          effectiveFertileEnd = fw.fertileEnd;
          effectiveOvulationDay = fw.ovulationDay;
        }
      }
    }

    const daysInMonth = this._monthDays(viewDate);

    const series = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dt = new Date(viewDate.getFullYear(), viewDate.getMonth(), day, 12, 0, 0, 0);
      const iso = this._isoFromDate(dt);

      let dayFertile = false;
      let dayOvulation = false;

      if (!hasNfpData && cycleStarts.length > 0) {
        // Find which cycle this day belongs to (latest cycle start on or before this date)
        let cycleStartForDay = null;
        let nextCycleStartForDay = null;
        for (let i = cycleStarts.length - 1; i >= 0; i--) {
          if (cycleStarts[i] <= iso) {
            cycleStartForDay = cycleStarts[i];
            nextCycleStartForDay = cycleStarts[i + 1] || null;
            break;
          }
        }
        if (cycleStartForDay) {
          const fw = this._fertileWindowForCycle(cycleStartForDay, nextCycleStartForDay, effectiveAvgCycle);
          if (fw) {
            dayFertile = fw.fertileStart && fw.fertileEnd
              ? (this._dayDiff(iso, fw.fertileStart) >= 0 && this._dayDiff(fw.fertileEnd, iso) >= 0)
              : false;
            dayOvulation = fw.ovulationDay ? iso === fw.ovulationDay : false;
          }
        }
        // Fallback: if grouped_starts computation didn't mark this day, use sensor attributes directly.
        // This handles the case where the current cycle start is not yet in grouped_starts.
        // Only do so when sensor attributes are trustworthy (no low-confidence NFP).
        if (!dayOvulation && ovulationDay && iso === ovulationDay && shouldUseSensorFallback) {
          dayOvulation = true;
        }
        if (!dayFertile && shouldUseSensorFallback && fertileStart && fertileEnd
            && this._dayDiff(iso, fertileStart) >= 0 && this._dayDiff(fertileEnd, iso) >= 0) {
          dayFertile = true;
        }
      } else {
        // Fallback to sensor attributes (no grouped_starts yet).
        // But only if NFP is good quality or missing – low-confidence NFP must not set the gauge.
        if (shouldUseSensorFallback) {
          dayFertile = fertileStart && fertileEnd
            ? (this._dayDiff(iso, fertileStart) >= 0 && this._dayDiff(fertileEnd, iso) >= 0)
            : false;
          dayOvulation = ovulationDay ? iso === ovulationDay : false;
        }
      }

      // Special handling for day 1: if the fertile window or ovulation extends from the previous
      // month into day 1 of this month, ensure it is marked even when the regular per-day
      // calculation missed it (e.g. cycle-length based computation or NFP constraints).
      if (day === 1 && !dayFertile && fertileStart && fertileEnd
          && this._dayDiff(iso, fertileStart) > 0 // fertileStart is strictly before day 1
          && this._dayDiff(fertileEnd, iso) >= 0) { // fertileEnd is on or after day 1
        dayFertile = true;
      }
      if (day === 1 && !dayOvulation && ovulationDay && iso === ovulationDay) {
        dayOvulation = true;
      }

      series.push({
        day,
        iso,
        confirmed: confirmedSet.has(iso),
        fertile: dayFertile,
        ovulation: dayOvulation,
      });
    }

    // Build 60-day window series centered on today (30 days past + today + 29 days future)
    // This series is always today-centric and is used by the gauge for the 60-day view.
    const today60 = this._todayDate();
    const todayIso60 = this._isoFromDate(today60);
    const series60 = [];
    for (let dayIdx = 0; dayIdx < 60; dayIdx++) {
      const dt60 = new Date(today60.getFullYear(), today60.getMonth(), today60.getDate() - 30 + dayIdx, 12, 0, 0, 0);
      const iso60 = this._isoFromDate(dt60);
      const day60 = dayIdx + 1;

      let dayFertile60 = false;
      let dayOvulation60 = false;

      if (!hasNfpData && cycleStarts.length > 0) {
        let cycleStartForDay60 = null;
        let nextCycleStartForDay60 = null;
        for (let i = cycleStarts.length - 1; i >= 0; i--) {
          if (cycleStarts[i] <= iso60) {
            cycleStartForDay60 = cycleStarts[i];
            nextCycleStartForDay60 = cycleStarts[i + 1] || null;
            break;
          }
        }
        if (cycleStartForDay60) {
          const fw60 = this._fertileWindowForCycle(cycleStartForDay60, nextCycleStartForDay60, effectiveAvgCycle);
          if (fw60) {
            dayFertile60 = fw60.fertileStart && fw60.fertileEnd
              ? (this._dayDiff(iso60, fw60.fertileStart) >= 0 && this._dayDiff(fw60.fertileEnd, iso60) >= 0)
              : false;
            dayOvulation60 = fw60.ovulationDay ? iso60 === fw60.ovulationDay : false;
          }
        }
        if (!dayOvulation60 && ovulationDay && iso60 === ovulationDay && shouldUseSensorFallback) {
          dayOvulation60 = true;
        }
        if (!dayFertile60 && shouldUseSensorFallback && fertileStart && fertileEnd
            && this._dayDiff(iso60, fertileStart) >= 0 && this._dayDiff(fertileEnd, iso60) >= 0) {
          dayFertile60 = true;
        }
      } else {
        if (shouldUseSensorFallback) {
          dayFertile60 = fertileStart && fertileEnd
            ? (this._dayDiff(iso60, fertileStart) >= 0 && this._dayDiff(fertileEnd, iso60) >= 0)
            : false;
          dayOvulation60 = ovulationDay ? iso60 === ovulationDay : false;
        }
      }

      series60.push({
        day: day60,
        iso: iso60,
        confirmed: confirmedSet.has(iso60),
        fertile: dayFertile60,
        ovulation: dayOvulation60,
        isToday: iso60 === todayIso60,
        isMonthStart: dt60.getDate() === 1,
      });
    }
    const windowStartIso = series60[0]?.iso || '';
    const windowEndIso = series60[59]?.iso || '';

    return {
      entityId,
      stateObj,
      state: String(stateObj?.state || 'neutral'),
      history,
      confirmedSet,
      predicted,
      predictedStarts,
      periodDuration,
      fertileStart: effectiveFertileStart,
      fertileEnd: effectiveFertileEnd,
      ovulationDay: effectiveOvulationDay,
      menarcheData,
      daysUntilMenarche,
      pregnancyInfo,
      symptomByDate,
      currentBleedingBlock,
      daysInMonth,
      series,
      series60,
      windowStartIso,
      windowEndIso,
      todayIso: todayIso60,
      cycleStarts,
      effectiveAvgCycle,
      hasNfpData,
      shouldUseSensorFallback,
      nfpAnalysis: (attrs.nfp_analysis && typeof attrs.nfp_analysis === 'object') ? attrs.nfp_analysis : null,
    };
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

  _symptomConfig(state, isPregnant = false) {
    // Delegates to the shared implementation in menstruation-functions.js —
    // this and menstruation-calendar-card.js previously each maintained their
    // own byte-identical copy of this config.
    if (window.MenstruationFunctions) return window.MenstruationFunctions.getSymptomConfig(state, isPregnant);
    console.warn('[menstruation-gauge-card] window.MenstruationFunctions is not available — symptom fields will be empty except basal_temp. This usually means menstruation-functions.js failed to load or hasn\'t finished loading yet. Check the Network tab for a failed/slow request to that file.');
    return [];
  }

  _stateBg(state) {
    if (state === 'period') return 'linear-gradient(135deg, rgba(252,231,243,.97), rgba(255,241,246,.95))';
    if (state === 'fertile') return 'linear-gradient(135deg, rgba(254,252,232,.97), rgba(255,255,255,.95))';
    if (state === 'pms') return 'linear-gradient(135deg, rgba(255,241,246,.96), rgba(255,250,252,.94))';
    return 'linear-gradient(135deg, rgba(255,255,255,.98), rgba(255,255,255,.95))';
  }

  _resolveThemeMode() {
    const mode = String(this._config?.theme_mode || 'auto').toLowerCase();
    if (mode === 'dark' || mode === 'light') return mode;
    return this._hass?.themes?.darkMode ? 'dark' : 'light';
  }

  _palette(state) {
    const dark = this._resolveThemeMode() === 'dark';
    if (!dark) {
      return {
        cardBg: this._stateBg(state),
        cardColor: 'var(--primary-text-color, #4a044e)',
        border: 'var(--divider-color, rgba(190,24,93,.20))',
        shadow: '0 8px 20px rgba(131,24,67,.10)',
        monthText: 'var(--secondary-text-color, rgba(131,24,67,.72))',
        dayLabel: 'var(--secondary-text-color, rgba(131,24,67,.68))',
        tick: 'rgba(190,24,93,.22)',
        confirmed: 'var(--error-color, #be123c)',
        fertile: 'var(--warning-color, #facc15)',
        ovulation: 'var(--success-color, #16a34a)',
        markerStroke: '#ffe4e6',
        hand: 'var(--error-color, #be123c)',
        ring: 'rgba(190,24,93,.16)',
        confirmedInset: 'rgba(190,24,93,.20)',
        countdownBg: 'color-mix(in srgb, var(--ha-card-background, var(--card-background-color, #fff)) 72%, white)',
        countdownColor: 'var(--primary-text-color, #831843)',
        buttonBg: 'var(--ha-card-background, var(--card-background-color, #fff))',
        buttonColor: 'var(--primary-text-color, #831843)',
        buttonBorder: 'var(--divider-color, rgba(190,24,93,.25))',
        dayBg: 'var(--ha-card-background, var(--card-background-color, #fff))',
        dayColor: 'var(--primary-text-color, #6b1b4a)',
        dayBorder: 'var(--divider-color, rgba(190,24,93,.16))',
        dayToday: 'rgba(190,24,93,.35)',
      };
    }

    const bg = state === 'period'
      ? 'linear-gradient(135deg, rgba(52,16,31,.98), rgba(27,11,20,.98))'
      : state === 'fertile'
        ? 'linear-gradient(135deg, rgba(43,41,18,.98), rgba(20,20,16,.98))'
        : state === 'pms'
          ? 'linear-gradient(135deg, rgba(44,19,34,.98), rgba(20,14,21,.98))'
          : 'linear-gradient(135deg, rgba(26,19,27,.98), rgba(17,15,20,.98))';

    return {
      cardBg: bg,
      cardColor: 'var(--primary-text-color, #f8d9e9)',
      border: 'var(--divider-color, rgba(251,113,133,.34))',
      shadow: '0 10px 24px rgba(0,0,0,.34)',
      monthText: 'var(--secondary-text-color, rgba(251,214,232,.82))',
      dayLabel: 'var(--secondary-text-color, rgba(251,214,232,.78))',
      tick: 'rgba(251,113,133,.42)',
      confirmed: 'var(--error-color, #fb7185)',
      fertile: 'var(--warning-color, #fde047)',
      ovulation: 'var(--success-color, #4ade80)',
      markerStroke: '#2f1f29',
      hand: 'var(--error-color, #fb7185)',
      ring: 'rgba(251,113,133,.32)',
      confirmedInset: 'rgba(251,113,133,.36)',
      countdownBg: 'rgba(32,20,29,.72)',
      countdownColor: 'var(--primary-text-color, #ffd4e6)',
      buttonBg: 'rgba(41,27,36,.95)',
      buttonColor: 'var(--primary-text-color, #ffd4e6)',
      buttonBorder: 'var(--divider-color, rgba(251,113,133,.45))',
      dayBg: 'rgba(41,27,36,.95)',
      dayColor: 'var(--primary-text-color, #f9d8e9)',
      dayBorder: 'var(--divider-color, rgba(251,113,133,.30))',
      dayToday: 'rgba(251,113,133,.66)',
    };
  }

  _polar(cx, cy, r, deg) {
    const a = deg * Math.PI / 180;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  }

  _arcPath(cx, cy, r, startDeg, endDeg) {
    const s = this._polar(cx, cy, r, startDeg);
    const e = this._polar(cx, cy, r, endDeg);
    const span = ((endDeg - startDeg) % 360 + 360) % 360;
    const largeArc = span > 180 ? 1 : 0;
    return `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 ${largeArc} 1 ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;
  }

  _confirmedRanges(series) {
    const days = (series || []).filter((step) => step.confirmed).map((step) => step.day).sort((a, b) => a - b);
    if (!days.length) return [];
    const ranges = [];
    let start = days[0];
    let prev = days[0];
    for (let i = 1; i < days.length; i += 1) {
      const day = days[i];
      if (day === prev + 1) {
        prev = day;
        continue;
      }
      ranges.push({ start, end: prev });
      start = day;
      prev = day;
    }
    ranges.push({ start, end: prev });
    return ranges;
  }

  _validSeries60(series60) {
    return Array.isArray(series60)
      && series60.length === 60
      && series60.every((step) => {
        if (!step || typeof step !== 'object') return false;
        return Boolean(this._parseISO(step.iso));
      });
  }

  _extendCycleStarts(cycleStarts, targetEndIso, effectiveAvgCycle) {
    const normalized = Array.from(new Set(
      (Array.isArray(cycleStarts) ? cycleStarts : [])
        .map((iso) => this._normalizeISO(iso))
        .filter(Boolean),
    )).sort();
    if (!normalized.length) return normalized;
    const avgCycle = Number.isFinite(Number(effectiveAvgCycle)) && Number(effectiveAvgCycle) > 0
      ? Math.round(Number(effectiveAvgCycle))
      : 28;
    const safeTargetEnd = this._normalizeISO(targetEndIso);
    if (!safeTargetEnd) return normalized;

    const seen = new Set(normalized);
    let lastIso = normalized[normalized.length - 1];
    let safety = 0;
    while (lastIso && this._dayDiff(safeTargetEnd, lastIso) > 0 && safety < 48) {
      const nextIso = this._addDaysToISO(lastIso, avgCycle);
      if (!nextIso || seen.has(nextIso)) break;
      seen.add(nextIso);
      normalized.push(nextIso);
      lastIso = nextIso;
      safety += 1;
    }
    return normalized.sort();
  }

  _timelineMarkerSets(model, months) {
    const confirmedSet = model.confirmedSet instanceof Set
      ? model.confirmedSet
      : new Set((Array.isArray(model.history) ? model.history : []).map((iso) => this._normalizeISO(iso)).filter(Boolean));
    const predictedSet = new Set();
    const fertileSet = new Set();
    const ovulationSet = new Set();
    const cycleStartsBase = Array.isArray(model.cycleStarts) ? model.cycleStarts : [];
    const predictedStartsBase = Array.isArray(model.predictedStarts)
      ? model.predictedStarts.map((iso) => this._normalizeISO(iso)).filter(Boolean)
      : [];
    const effectiveAvgCycle = Number.isFinite(Number(model.effectiveAvgCycle))
      ? Number(model.effectiveAvgCycle)
      : 28;
    const shouldUseSensorFallback = model.shouldUseSensorFallback !== false;
    const showPredictedCycles = this._config?.show_predicted_cycles !== false;
    const maxPredictedCycles = Math.max(1, Math.min(12, Number(this._config?.num_predicted_cycles || 6)));
    const safePeriodDuration = Number.isFinite(Number(model.periodDuration))
      ? Math.max(1, Math.min(14, Math.round(Number(model.periodDuration))))
      : 5;
    const firstMonth = months[0]?.monthDate;
    const lastMonth = months[months.length - 1]?.monthDate;
    if (!firstMonth || !lastMonth) {
      return { confirmedSet, predictedSet, fertileSet, ovulationSet };
    }

    const visibleStartIso = this._isoFromDate(new Date(firstMonth.getFullYear(), firstMonth.getMonth(), 1, 12, 0, 0, 0));
    const visibleEndIso = this._isoFromDate(new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 12, 0, 0, 0));
    if (!visibleStartIso || !visibleEndIso) {
      return { confirmedSet, predictedSet, fertileSet, ovulationSet };
    }

    const todayDt = this._parseISO(model.todayIso)
      || this._todayDate?.()
      || new Date();
    const safeToday = todayDt instanceof Date && !Number.isNaN(todayDt.getTime())
      ? new Date(todayDt.getFullYear(), todayDt.getMonth(), todayDt.getDate(), 12, 0, 0, 0)
      : new Date();
    const futureHorizonDays = Math.max(maxPredictedCycles * effectiveAvgCycle, 180);
    const forecastEndDt = new Date(
      safeToday.getFullYear(),
      safeToday.getMonth(),
      safeToday.getDate() + futureHorizonDays,
      12,
      0,
      0,
      0,
    );
    const visibleEndDt = this._parseISO(visibleEndIso) || forecastEndDt;
    const cycleStarts = this._extendCycleStarts(
      cycleStartsBase.length ? cycleStartsBase : predictedStartsBase,
      this._isoFromDate(visibleEndDt > forecastEndDt ? visibleEndDt : forecastEndDt),
      effectiveAvgCycle,
    );

    if (showPredictedCycles) {
      predictedStartsBase.slice(0, maxPredictedCycles).forEach((cycleStartIso) => {
        if (!cycleStartIso) return;
        for (let offset = 0; offset < safePeriodDuration; offset++) {
          const predIso = this._addDaysToISO(cycleStartIso, offset);
          if (!predIso || predIso < visibleStartIso || predIso > visibleEndIso) continue;
          if (!confirmedSet.has(predIso)) predictedSet.add(predIso);
        }
      });
    }

    cycleStarts.forEach((cycleStartIso, index) => {
      const nextCycleStartIso = cycleStarts[index + 1] || null;
      const fw = this._fertileWindowForCycle(cycleStartIso, nextCycleStartIso, effectiveAvgCycle);
      if (!fw) return;
      if (fw.ovulationDay && fw.ovulationDay >= visibleStartIso && fw.ovulationDay <= visibleEndIso) {
        ovulationSet.add(fw.ovulationDay);
      }
      if (fw.fertileStart && fw.fertileEnd) {
        for (
          let iso = fw.fertileStart;
          iso && this._dayDiff(fw.fertileEnd, iso) >= 0;
          iso = this._addDaysToISO(iso, 1)
        ) {
          if (iso >= visibleStartIso && iso <= visibleEndIso) fertileSet.add(iso);
        }
      }
    });

    if (shouldUseSensorFallback) {
      if (model.fertileStart && model.fertileEnd) {
        for (
          let iso = model.fertileStart;
          iso && this._dayDiff(model.fertileEnd, iso) >= 0;
          iso = this._addDaysToISO(iso, 1)
        ) {
          if (iso >= visibleStartIso && iso <= visibleEndIso) fertileSet.add(iso);
        }
      }
      if (model.ovulationDay && model.ovulationDay >= visibleStartIso && model.ovulationDay <= visibleEndIso) {
        ovulationSet.add(model.ovulationDay);
      }
    }

    return { confirmedSet, predictedSet, fertileSet, ovulationSet };
  }

  _bleedingBlocks(history) {
    const days = Array.from(new Set((history || []).map((value) => this._normalizeISO(value)).filter(Boolean))).sort();
    if (!days.length) return [];
    const blocks = [];
    let current = [days[0]];
    for (let i = 1; i < days.length; i += 1) {
      if (this._dayDiff(days[i], days[i - 1]) <= 2) {
        current.push(days[i]);
        continue;
      }
      blocks.push({ start: current[0], end: current[current.length - 1], days: current });
      current = [days[i]];
    }
    blocks.push({ start: current[0], end: current[current.length - 1], days: current });
    return blocks;
  }

  _periodModalContext(iso, model) {
    const safeDuration = Number.isFinite(Number(model?.periodDuration))
      ? Math.max(1, Math.min(14, Math.round(Number(model.periodDuration))))
      : 5;
    const blocks = this._bleedingBlocks(model?.history);
    for (let i = blocks.length - 1; i >= 0; i -= 1) {
      const block = blocks[i];
      const daysFromStart = this._dayDiff(iso, block.start);
      if (daysFromStart < 0 || daysFromStart >= safeDuration) continue;
      return {
        showPeriodToggle: iso === block.start,
        continuationBlock: iso === block.start ? null : block,
      };
    }
    return {
      showPeriodToggle: true,
      continuationBlock: null,
    };
  }

  _daysToAutoConfirm(iso, model, continuationBlock) {
    if (!continuationBlock || model.confirmedSet.has(iso)) return [];
    const gapFromBlockEnd = this._dayDiff(iso, continuationBlock.end);
    if (gapFromBlockEnd <= 0) return [iso];
    const days = [];
    const endDate = this._parseISO(continuationBlock.end);
    if (!endDate) return [iso];
    for (let offset = 1; offset <= gapFromBlockEnd; offset += 1) {
      const next = new Date(endDate);
      next.setDate(endDate.getDate() + offset);
      const nextIso = this._isoFromDate(next);
      if (nextIso && !model.confirmedSet.has(nextIso)) days.push(nextIso);
    }
    return days;
  }

  _renderGauge(model, palette) {
    const cx = 210;
    const cy = 210;
    const rInner = 126;
    const baseTick = 4.2;
    const extraBar = 26;
    const safePeriodDuration = Number.isFinite(Number(model.periodDuration))
      ? Math.max(1, Math.min(14, Math.round(Number(model.periodDuration))))
      : 5;
    const showFertile = this._config?.show_fertile_period !== false;
    const showPredictedCycles = this._config?.show_predicted_cycles !== false;
    const maxPredictedCycles = Math.max(1, Math.min(12, Number(this._config?.num_predicted_cycles || 6)));

    // --- 60-day view (when series60 is present in model) ---
    if (this._validSeries60(model.series60)) {
      const total = 60;
      const spanDeg = 300; // 300° span: day 1 at ~7 o'clock, today at 12, day 60 at ~5 o'clock
      const startAngle60 = -90 - (30 / total) * spanDeg; // = -240°; puts today (day 31) at -90° (top)
      const degPerDay = spanDeg / total; // 5°/day
      const edgeOff = 0.4; // degree inset for bar edges
      const locale = this._hass?.locale?.language || 'de';
      const rotation = this._gaugeRotation || 0;

      // Helper: start angle of day d (1-indexed) in the 60-day arc
      const dayStartAngle = (d) => startAngle60 + ((d - 1) / total) * spanDeg;
      // Helper: center angle of day d
      const dayCenterAngle = (d) => startAngle60 + ((d - 0.5) / total) * spanDeg;

      // Tick marks (one per day) — only within the visible 300° arc
      const baseTicks = model.series60.map((_, i) => {
        const angle = dayStartAngle(i + 1);
        //if (angle <= startAngle60 || angle >= startAngle60 + spanDeg) return '';
        return `<g transform="translate(${cx} ${cy}) rotate(${angle})"><rect x="-1.3" y="-${Math.round(rInner + baseTick)}" width="2.6" height="${Math.round(baseTick)}" rx="1.2" fill="${palette.tick}"></rect></g>`;
      }).join('');

      // Day labels: show day-of-month at month starts and every 5th calendar day
      const dayLabels = model.series60.map((step) => {
        const dayOfMonth = Number(step.iso.slice(8));
        if (!step.isMonthStart && dayOfMonth % 5 !== 0) return '';
        const angle = dayCenterAngle(step.day);
        const pos = this._polar(cx, cy, 178, angle);
        return `<text x="${Math.round(pos.x)}" y="${Math.round(pos.y)}" fill="${palette.dayLabel}" font-size="10" text-anchor="middle" dominant-baseline="middle">${dayOfMonth}</text>`;
      }).join('');

      // Month separators: dezent gray lines + short month name at each month start
      const monthSeparators = model.series60.map((step) => {
        if (!step.isMonthStart) return '';
        const angle = dayStartAngle(step.day);
        const pInner = this._polar(cx, cy, rInner - 6, angle);
        const pOuter = this._polar(cx, cy, rInner + extraBar + 10, angle);
        const pLabel = this._polar(cx, cy, rInner + extraBar + 22, angle);
        const dt = this._parseISO(step.iso);
        const mName = dt ? new Intl.DateTimeFormat(locale, { month: 'short' }).format(dt) : step.iso.slice(5, 7);
        return `<line x1="${Math.round(pInner.x)}" y1="${Math.round(pInner.y)}" x2="${Math.round(pOuter.x)}" y2="${Math.round(pOuter.y)}" stroke="${palette.tick}" stroke-width="1.2" opacity="0.6"></line><text x="${Math.round(pLabel.x)}" y="${Math.round(pLabel.y)}" fill="${palette.dayLabel}" font-size="9" text-anchor="middle" dominant-baseline="middle" opacity="0.75">${mName}</text>`;
      }).join('');

      // Confirmed ranges and bars
      const confirmedRanges60 = this._confirmedRanges(model.series60);

      const periodWindowBars = confirmedRanges60.map((range) => {
        const windowEnd = Math.min(total, range.start + safePeriodDuration - 1);
        const sa = dayStartAngle(range.start) + edgeOff;
        const ea = dayStartAngle(windowEnd + 1) - edgeOff;
        if (sa >= ea) return '';
        const dPath = this._arcPath(cx, cy, rInner + extraBar * 0.74, sa, ea);
        return `<path d="${dPath}" fill="none" stroke="${palette.confirmed}" stroke-width="9" stroke-linecap="round" stroke-opacity="0.24"></path>`;
      }).join('');

      const confirmedBars = confirmedRanges60.map((range) => {
        const sa = dayStartAngle(range.start) + edgeOff;
        const ea = dayStartAngle(range.end + 1) - edgeOff;
        if (sa >= ea) return '';
        const dPath = this._arcPath(cx, cy, rInner + extraBar * 0.74, sa, ea);
        return `<path d="${dPath}" fill="none" stroke="${palette.confirmed}" stroke-width="9" stroke-linecap="round" stroke-opacity="0.78"></path>`;
      }).join('');

      const fertileBars = model.series60.map((step) => {
        if (!showFertile || !step.fertile) return '';
        const sa = dayStartAngle(step.day) + edgeOff;
        const ea = dayStartAngle(step.day + 1) - edgeOff;
        const dPath = this._arcPath(cx, cy, rInner + extraBar * 0.46, sa, ea);
        return `<path d="${dPath}" fill="none" stroke="${palette.fertile}" stroke-width="6" stroke-linecap="round" stroke-opacity=".62"></path>`;
      }).join('');

      let ovulationMarkers = '';
      if (showFertile) {
        const ovSteps = model.series60.filter((s) => s.ovulation);
        ovSteps.forEach((step) => {
          const angle = dayCenterAngle(step.day);
          const pos = this._polar(cx, cy, rInner + extraBar * 0.46, angle);
          ovulationMarkers += `<circle cx="${Math.round(pos.x)}" cy="${Math.round(pos.y)}" r="5" fill="${palette.ovulation}" stroke="${palette.markerStroke}" stroke-width="1.5" opacity="0.90"></circle>`;
        });
        // Fallback: ovulationDay on model (not yet in series60)
        if (!ovSteps.length && model.ovulationDay) {
          const ovIso = this._normalizeISO(model.ovulationDay);
          if (ovIso && ovIso >= (model.windowStartIso || '') && ovIso <= (model.windowEndIso || '')) {
            const ovStep = model.series60.find((s) => s.iso === ovIso);
            if (ovStep) {
              const angle = dayCenterAngle(ovStep.day);
              const pos = this._polar(cx, cy, rInner + extraBar * 0.46, angle);
              ovulationMarkers += `<circle cx="${Math.round(pos.x)}" cy="${Math.round(pos.y)}" r="5" fill="${palette.ovulation}" stroke="${palette.markerStroke}" stroke-width="1.5" opacity="0.90"></circle>`;
            }
          }
        }
      }

      // NFP method label
      let nfpMethodLabel = '';
      if (showFertile && model.ovulationDay) {
        const nfp = model.nfpAnalysis;
        const usingNfp = nfp && nfp.ovulation_detected && nfp.confidence_level !== 'low';
        const labelText = usingNfp ? 'NFP' : 'Standard';
        nfpMethodLabel = `<text x="${cx}" y="${cy + 84}" text-anchor="middle" font-size="10" fill="${usingNfp ? 'var(--success-color, #16a34a)' : 'var(--secondary-text-color, #888)'}" opacity="0.85">${labelText}</text>`;
      }

      // Predicted bars and markers (filtered to 60-day window)
      let predictedMarker = '';
      let predictedBars = '';
      if (showPredictedCycles) {
        const wStart = model.windowStartIso || '';
        const wEnd = model.windowEndIso || '';
        (model.predictedStarts || []).slice(0, maxPredictedCycles).forEach((isoRaw, predictedIndex) => {
          const predIso = this._normalizeISO(isoRaw);
          if (!predIso || predIso < wStart || predIso > wEnd) return;
          const predStep = model.series60.find((s) => s.iso === predIso);
          if (!predStep) return;
          const pDay = predStep.day;
          const marker = (offset, fill, radius) => {
            const d = pDay + offset;
            if (d < 1 || d > total) return '';
            const angle = dayCenterAngle(d);
            const pos = this._polar(cx, cy, rInner + extraBar + 3, angle);
            return `<circle cx="${Math.round(pos.x)}" cy="${Math.round(pos.y)}" r="${radius}" fill="${fill}" stroke="${palette.markerStroke}" stroke-width="2"></circle>`;
          };
          predictedMarker += `${marker(-1, '#fb7185', '4.6')}${marker(0, palette.confirmed, '5.5')}${marker(1, '#fb7185', '4.6')}`;
          Array.from({ length: safePeriodDuration }).forEach((_, idx) => {
            const d = pDay + idx;
            if (d < 1 || d > total) return;
            const sa = dayStartAngle(d) + edgeOff * 0.75;
            const ea = dayStartAngle(d + 1) - edgeOff * 0.75;
            if (sa >= ea) return;
            const dPath = this._arcPath(cx, cy, rInner + extraBar * 0.74, sa, ea);
            const alpha = idx === 0 ? Math.max(0.22, 0.60 - (predictedIndex * 0.08)) : Math.max(0.16, 0.38 - (predictedIndex * 0.05));
            const sw = idx === 0 ? 8.6 : 7.2;
            predictedBars += `<path d="${dPath}" fill="none" stroke="${palette.confirmed}" stroke-width="${sw}" stroke-linecap="round" stroke-opacity="${alpha.toFixed(1)}"></path>`;
          });
        });
      }

      // Triangle marker at 12 o'clock (fixed, outside rotating group) — indicates today's position
      const triTipY = cy - rInner - extraBar + 4;  // pointing into the arc
      const triBaseY = cy - rInner - extraBar - 4; // wide base, clearly below month text
      const triW = 7;
      const triangleMarker = `<polygon points="${cx},${Math.round(triTipY)} ${cx - triW},${Math.round(triBaseY)} ${cx + triW},${Math.round(triBaseY)}" fill="${palette.hand}" opacity="0.9"></polygon>`;

      // Month label (static, shows today's context)
      const modelToday = this._parseISO(model.todayIso);
      const uiToday = this._todayDate?.();
      const todayForLabel = modelToday
        || (uiToday instanceof Date && !Number.isNaN(uiToday.getTime()) ? uiToday : new Date());
      const monthLabel60 = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(todayForLabel);

      return `
        <svg class="gauge" viewBox="0 0 420 420" width="100%" height="100%" role="img" aria-label="Menstruation gauge 60 days">
          <g class="gauge-content" style="transform-origin: ${cx}px ${cy}px; transform: rotate(${rotation}deg);">
            ${baseTicks}
            ${fertileBars}
            ${periodWindowBars}
            ${confirmedBars}
            ${ovulationMarkers}
            ${predictedBars}
            ${predictedMarker}
            <circle cx="${cx}" cy="${cy}" r="106" fill="none" stroke="${palette.ring}" stroke-width="1"></circle>
          </g>
          ${dayLabels}
          ${monthSeparators}
          ${nfpMethodLabel}
          <text x="${cx}" y="44" class="month">${monthLabel60}</text>
          ${triangleMarker}
        </svg>
      `;
    }

    // --- Legacy monthly view (fallback for backward-compat when series60 absent) ---
    const total = model.daysInMonth || 30;
    const gaugeWidth = Number(this._lastCardWidth || 0);
    let labelStep = 1;
    if (gaugeWidth > 0 && gaugeWidth < 320) labelStep = 5;
    else if (gaugeWidth > 0 && gaugeWidth < 380) labelStep = 3;
    else if (gaugeWidth > 0 && gaugeWidth < 480) labelStep = 2;
    const now = new Date();
    const todayIso = model?.todayIso || this._isoFromDate(new Date());
    let todayDate = null;
    try {
      todayDate = this._parseISO(todayIso);
    } catch (_error) {
      todayDate = null;
    }
    const dayNow = todayDate ? todayDate.getDate() : now.getDate();
    const handAngle = -90 + ((((dayNow - 1) + now.getHours() / 24) / total) * 360);
    const isCurrentViewMonth = this._viewDate.getMonth() === (todayDate?.getMonth() ?? now.getMonth())
      && this._viewDate.getFullYear() === (todayDate?.getFullYear() ?? now.getFullYear());

    const baseTicks = model.series.map((_, i) => {
      const angle = -90 + ((i / total) * 360);
      return `<g transform="translate(${cx} ${cy}) rotate(${angle})"><rect x="-1.3" y="-${Math.round(rInner + baseTick)}" width="2.6" height="${Math.round(baseTick)}" rx="1.2" fill="${palette.tick}"></rect></g>`;
    }).join('');

    const dayLabels = model.series.map((step, i) => {
      const isFirst = step.day === 1;
      const isLast = step.day === total;
      if (!isFirst && !isLast && (step.day % labelStep !== 0)) return '';
      const angle = -90 + ((((i + 0.5) / total) * 360));
      const pos = this._polar(cx, cy, 178, angle);
      return `<text x="${Math.round(pos.x)}" y="${Math.round(pos.y)}" fill="${palette.dayLabel}" font-size="10" text-anchor="middle" dominant-baseline="middle">${step.day}</text>`;
    }).join('');

    const confirmedRanges = this._confirmedRanges(model.series);

    const currentMonthPeriodWindowBars = isCurrentViewMonth
      ? confirmedRanges.map((range) => {
        const windowEnd = Math.min(total, range.start + safePeriodDuration - 1);
        const startAngle = -90 + ((((range.start - 1) + 0.08) / total) * 360);
        const endAngle = -90 + ((((windowEnd) - 0.08) / total) * 360);
        const dPath = this._arcPath(cx, cy, rInner + extraBar * 0.74, startAngle, endAngle);
        return `<path d="${dPath}" fill="none" stroke="${palette.confirmed}" stroke-width="9" stroke-linecap="round" stroke-opacity="0.24"></path>`;
      }).join('')
      : '';

    const confirmedBars = confirmedRanges.map((range) => {
      const startAngle = -90 + ((((range.start - 1) + 0.08) / total) * 360);
      const endAngle = -90 + ((((range.end) - 0.08) / total) * 360);
      const dPath = this._arcPath(cx, cy, rInner + extraBar * 0.74, startAngle, endAngle);
      return `<path d="${dPath}" fill="none" stroke="${palette.confirmed}" stroke-width="9" stroke-linecap="round" stroke-opacity="0.78"></path>`;
    }).join('');

    const fertileBars = model.series.map((step) => {
      if (!showFertile) return '';
      if (!step.fertile) return '';
      const day = step.day;
      const startAngle = -90 + ((((day - 1) + 0.08) / total) * 360);
      const endAngle = -90 + ((((day - 0.08) / total) * 360));
      const dPath = this._arcPath(cx, cy, rInner + extraBar * 0.46, startAngle, endAngle);
      return `<path d="${dPath}" fill="none" stroke="${palette.fertile}" stroke-width="6" stroke-linecap="round" stroke-opacity=".62"></path>`;
    }).join('');

    let ovulationMarkers = '';
    if (showFertile) {
      const ovulationSteps = model.series.filter((s) => s.ovulation);
      ovulationSteps.forEach((step) => {
        if (step.day >= 1 && step.day <= total) {
          const angle = -90 + ((((step.day - 1) + 0.5) / total) * 360);
          const pos = this._polar(cx, cy, rInner + extraBar * 0.46, angle);
          ovulationMarkers += `<circle cx="${Math.round(pos.x)}" cy="${Math.round(pos.y)}" r="5" fill="${palette.ovulation}" stroke="${palette.markerStroke}" stroke-width="1.5" opacity="0.90"></circle>`;
        }
      });
      if (!ovulationSteps.length && model.ovulationDay) {
        const ovIso = this._normalizeISO(model.ovulationDay);
        if (ovIso) {
          const [ovYear, ovMonth, ovDay] = ovIso.split('-').map((x) => Number(x));
          if (ovYear === this._viewDate.getFullYear() && (ovMonth - 1) === this._viewDate.getMonth()) {
            if (ovDay >= 1 && ovDay <= total) {
              const angle = -90 + ((((ovDay - 1) + 0.5) / total) * 360);
              const pos = this._polar(cx, cy, rInner + extraBar * 0.46, angle);
              ovulationMarkers += `<circle cx="${Math.round(pos.x)}" cy="${Math.round(pos.y)}" r="5" fill="${palette.ovulation}" stroke="${palette.markerStroke}" stroke-width="1.5" opacity="0.90"></circle>`;
            }
          }
        }
      }
    }

    // NFP method label: show whether NFP or standard ovulation is used
    let nfpMethodLabel = '';
    if (showFertile && model.ovulationDay) {
      const nfp = model.nfpAnalysis;
      const usingNfp = nfp && nfp.ovulation_detected && nfp.confidence_level !== 'low';
      const labelText = usingNfp ? 'NFP' : 'Standard';
      nfpMethodLabel = `<text x="${cx}" y="${cy + 84}" text-anchor="middle" font-size="10" fill="${usingNfp ? 'var(--success-color, #16a34a)' : 'var(--secondary-text-color, #888)'}" opacity="0.85">${labelText}</text>`;
    }

    let predictedMarker = '';
    let predictedBars = '';
    const predictedInView = showPredictedCycles
      ? (model.predictedStarts || [])
        .slice(0, maxPredictedCycles)
        .map((iso) => this._parseISO(iso))
        .filter((dt) => dt
          && dt.getFullYear() === this._viewDate.getFullYear()
          && dt.getMonth() === this._viewDate.getMonth())
      : [];
    predictedInView.forEach((predictedDt, predictedIndex) => {
      const pDay = predictedDt.getDate();
      const marker = (offset, fill, radius) => {
        const d = pDay + offset;
        if (d < 1 || d > total) return '';
        const angle = -90 + ((((d - 1) + 0.5) / total) * 360);
        const pos = this._polar(cx, cy, rInner + extraBar + 3, angle);
        return `<circle cx="${Math.round(pos.x)}" cy="${Math.round(pos.y)}" r="${radius}" fill="${fill}" stroke="${palette.markerStroke}" stroke-width="2"></circle>`;
      };
      predictedMarker += `${marker(-1, '#fb7185', '4.6')}${marker(0, palette.confirmed, '5.5')}${marker(1, '#fb7185', '4.6')}`;
      predictedBars += Array.from({ length: safePeriodDuration }).map((_, idx) => {
        const dt = new Date(predictedDt);
        dt.setDate(dt.getDate() + idx);
        if (dt.getMonth() !== this._viewDate.getMonth() || dt.getFullYear() !== this._viewDate.getFullYear()) return '';
        const day = dt.getDate();
        const startAngle = -90 + ((((day - 1) + 0.06) / total) * 360);
        const endAngle = -90 + ((((day - 0.06) / total) * 360));
        const dPath = this._arcPath(cx, cy, rInner + extraBar * 0.74, startAngle, endAngle);
        const alpha = idx === 0 ? Math.max(0.22, 0.60 - (predictedIndex * 0.08)) : Math.max(0.16, 0.38 - (predictedIndex * 0.05));
        const sw = idx === 0 ? 8.6 : 7.2;
        return `<path d="${dPath}" fill="none" stroke="${palette.confirmed}" stroke-width="${sw}" stroke-linecap="round" stroke-opacity="${alpha.toFixed(1)}"></path>`;
      }).join('');
    });

    const handA = this._polar(cx, cy, rInner - 2, handAngle);
    const handB = this._polar(cx, cy, rInner + extraBar - 2, handAngle);
    const monthLabel = new Intl.DateTimeFormat(this._hass?.locale?.language || 'de', { month: 'long' }).format(this._viewDate);

    return `
      <svg class="gauge" viewBox="0 0 420 420" width="100%" height="100%" role="img" aria-label="Menstruation gauge">
        <text x="${cx}" y="44" class="month">${monthLabel}</text>
        ${dayLabels}
        ${baseTicks}
        ${fertileBars}
        ${ovulationMarkers}
        ${nfpMethodLabel}
        ${currentMonthPeriodWindowBars}
        ${confirmedBars}
        ${predictedBars}
        ${predictedMarker}
        ${isCurrentViewMonth ? `<line x1="${Math.round(handA.x)}" y1="${Math.round(handA.y)}" x2="${Math.round(handB.x)}" y2="${Math.round(handB.y)}" stroke="${palette.hand}" stroke-width="1.9" stroke-linecap="round"></line>` : ''}
        <circle cx="${cx}" cy="${cy}" r="106" fill="none" stroke="${palette.ring}" stroke-width="1"></circle>
      </svg>
    `;
  }

  _renderCenterContent(model, palette, canEdit, isOverdueSoon, countdown) {
    if (!model.pregnancyInfo?.isPregnant) {
      if (!this._iconCache) this._iconCache = {};
      const statusIconCacheKey = `status-${model.state}-64`;
      if (!(statusIconCacheKey in this._iconCache)) {
        this._iconCache[statusIconCacheKey] = window.ProductIcons?.getStatusIcon?.(model.state, 64) || '';
      }
      const statusIconMarkup = this._iconCache[statusIconCacheKey];
      return `
        <button type="button" class="center-panel ${isOverdueSoon ? 'overdue-soon' : ''} ${canEdit ? '' : 'passive'}" data-action="toggle-editor">
          ${statusIconMarkup ? `<div class="center-icon" aria-hidden="true">${statusIconMarkup}</div>` : ''}
          <div class="center-days">${countdown}</div>
        </button>
      `;
    }

    const pregnancyInfo = model.pregnancyInfo;
    if (!this._iconCache) this._iconCache = {};
    const pregIconCacheKey = `pregnant-m${pregnancyInfo.month}-56`;
    if (!(pregIconCacheKey in this._iconCache)) {
      this._iconCache[pregIconCacheKey] = window.ProductIcons?.getPregnancyIcon?.(pregnancyInfo, 56)
        || window.ProductIcons?.getStatusAnimatedIcon?.('pregnant', pregnancyInfo, 56)
        || '';
    }
    const iconMarkup = this._iconCache[pregIconCacheKey];
    const secondaryParts = [`${this._t('month')} ${pregnancyInfo.month}`];
    if (Number.isFinite(Number(pregnancyInfo.trimester))) {
      secondaryParts.push(`${this._t('trimester')} ${pregnancyInfo.trimester}`);
    }

    return `
      <button type="button" class="center-panel pregnancy-panel ${canEdit ? '' : 'passive'}" data-action="toggle-editor">
        <div class="center-icon" aria-hidden="true">${iconMarkup}</div>
        <div class="center-primary">${this._t('week')} ${pregnancyInfo.week}</div>
        <div class="center-secondary">${secondaryParts.join(' · ')}</div>
      </button>
    `;
  }

  _currentTimelineMonthStart() {
    const base = this._todayDate?.() || new Date();
    const safeBase = base instanceof Date && !Number.isNaN(base.getTime()) ? base : new Date();
    return new Date(safeBase.getFullYear(), safeBase.getMonth(), 1, 12, 0, 0, 0);
  }

  _timelineBaseMonth() {
    const base = this._timelineMonth || this._currentTimelineMonthStart();
    return new Date(base.getFullYear(), base.getMonth(), 1, 12, 0, 0, 0);
  }

  _timelineAnchorMonthStartIso() {
    return this._isoFromDate(this._timelineBaseMonth());
  }

  _timelineStripMonths() {
    const baseMonth = this._timelineBaseMonth();
    return Array.from({ length: 13 }).map((_, index) => {
      const offset = index - 6;
      const monthDate = new Date(baseMonth.getFullYear(), baseMonth.getMonth() + offset, 1, 12, 0, 0, 0);
      return {
        monthDate,
        monthIso: this._isoFromDate(monthDate).slice(0, 7),
        isAnchor: offset === 0,
      };
    });
  }

  _renderTimeline(model, palette, locale) {
    const months = this._timelineStripMonths();
    const todayIso = model.todayIso || this._isoFromDate(new Date());
    const windowStart = model.windowStartIso || '';
    const windowEnd = model.windowEndIso || '';
    const markerSets = this._timelineMarkerSets(model, months);
    const confirmedSet = markerSets.confirmedSet;
    const predictedSet = markerSets.predictedSet;
    const fertileSet = markerSets.fertileSet;
    const ovulationSet = markerSets.ovulationSet;

    const dows = this._weekdayLabels(locale);

    const renderMonth = ({ monthDate, monthIso, isAnchor }) => {
      const monthDt = monthDate;
      const y = monthDt.getFullYear();
      const m = monthDt.getMonth();
      const dayCount = new Date(y, m + 1, 0).getDate();
      const firstDowMon0 = (new Date(y, m, 1, 12).getDay() + 6) % 7;
      const totalCells = Math.ceil((firstDowMon0 + dayCount) / 7) * 7;
      const monthName = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(monthDt);

      const dowHtml = dows.map((d) => `<div class="tl-dow">${d}</div>`).join('');
      let cellsHtml = '';
      for (let i = 0; i < totalCells; i++) {
        const dayNum = i - firstDowMon0 + 1;
        if (dayNum < 1 || dayNum > dayCount) {
          cellsHtml += '<div class="tl-day tl-empty"></div>';
          continue;
        }
        const iso = this._isoFromDate(new Date(y, m, dayNum, 12, 0, 0, 0));
        const isToday = iso === todayIso;
        const inWindow = iso >= windowStart && iso <= windowEnd;
        const isPeriod = confirmedSet.has(iso);
        const isPredicted = !isPeriod && predictedSet.has(iso);
        const isFertile = fertileSet.has(iso);
        const isOvulation = ovulationSet.has(iso);
        const classes = [
          'tl-day',
          isToday ? 'tl-today' : '',
          inWindow ? 'tl-in-window' : 'tl-out-window',
          isPeriod ? 'tl-period' : '',
          isPredicted ? 'tl-predicted' : '',
          isFertile && !isPeriod ? 'tl-fertile' : '',
          isOvulation ? 'tl-ovulation' : '',
        ].filter(Boolean).join(' ');
        cellsHtml += `<button type="button" class="${classes}" data-timeline-iso="${iso}" title="${iso}">${dayNum}</button>`;
      }

      return `
        <div class="tl-month-col ${isAnchor ? 'is-anchor' : ''}" data-timeline-month="${monthIso}" data-timeline-month-start="${this._isoFromDate(monthDt)}">
          <div class="tl-month-name">${monthName}</div>
          <div class="tl-dow-row">${dowHtml}</div>
          <div class="tl-days-grid">${cellsHtml}</div>
        </div>
      `;
    };

    return `
      <div class="timeline">
        <div class="tl-strip-shell">
          <button type="button" class="tl-overlay-nav tl-overlay-prev" data-tl-nav="left" aria-label="Previous months">‹</button>
          <div class="tl-strip" data-timeline-strip>
            ${months.map(renderMonth).join('')}
          </div>
          <button type="button" class="tl-overlay-nav tl-overlay-next" data-tl-nav="right" aria-label="Next months">›</button>
        </div>
      </div>
    `;
  }

  _timelineStripAnchorEl(strip) {
    const monthEls = Array.from(strip?.querySelectorAll?.('.tl-month-col') || []);
    if (!monthEls.length) return null;
    const stripCenter = strip.scrollLeft + (strip.clientWidth / 2);
    let best = null;
    let bestDiff = Infinity;
    monthEls.forEach((monthEl) => {
      const monthCenter = monthEl.offsetLeft + (monthEl.offsetWidth / 2);
      const diff = Math.abs(monthCenter - stripCenter);
      if (diff < bestDiff) {
        best = monthEl;
        bestDiff = diff;
      }
    });
    return best;
  }

  _captureTimelineState() {
    const strip = this.shadowRoot?.querySelector?.('[data-timeline-strip]');
    if (!strip || !this._timelineHasCenteredOnce) return null;
    const anchor = this._timelineStripAnchorEl(strip) || strip.querySelector?.('.tl-month-col.is-anchor');
    const scrollLeft = Number.isFinite(strip.scrollLeft) ? strip.scrollLeft : null;
    if (!anchor && scrollLeft === null) return null;
    return {
      scrollLeft,
      anchorMonthStart: anchor?.getAttribute?.('data-timeline-month-start') || '',
      anchorOffset: anchor && scrollLeft !== null ? (scrollLeft - anchor.offsetLeft) : null,
    };
  }

  _restoreTimelineState() {
    const strip = this.shadowRoot?.querySelector?.('[data-timeline-strip]');
    const state = this._pendingTimelineState;
    if (!strip || !state) return false;
    let targetLeft = null;
    if (state.anchorMonthStart) {
      const anchor = strip.querySelector?.(`[data-timeline-month-start="${state.anchorMonthStart}"]`);
      if (anchor) {
        const offset = Number.isFinite(state.anchorOffset) ? state.anchorOffset : 0;
        targetLeft = anchor.offsetLeft + offset;
      }
    }
    if (targetLeft === null && Number.isFinite(state.scrollLeft)) {
      targetLeft = state.scrollLeft;
    }
    this._pendingTimelineState = null;
    if (!Number.isFinite(targetLeft)) return false;
    if (typeof strip.scrollTo === 'function') {
      strip.scrollTo({ left: Math.max(0, targetLeft), behavior: 'auto' });
    } else {
      strip.scrollLeft = Math.max(0, targetLeft);
    }
    this._syncTimelineMonthFromScroll();
    this._updateTimelineNavState();
    return true;
  }

  _updateTimelineNavState() {
    const root = this.shadowRoot;
    const strip = root?.querySelector?.('[data-timeline-strip]');
    if (!strip) return;
    const prevBtn = root?.querySelector?.('[data-tl-nav="left"]') || root?.querySelector?.('[data-tl-overlay-nav="prev"]');
    const nextBtn = root?.querySelector?.('[data-tl-nav="right"]') || root?.querySelector?.('[data-tl-overlay-nav="next"]');
    const canLeft = strip.scrollLeft > 1;
    const canRight = (strip.scrollWidth - strip.clientWidth - strip.scrollLeft) > 1;
    [
      [prevBtn, canLeft],
      [nextBtn, canRight],
    ].forEach(([btn, canScroll]) => {
      if (!btn) return;
      btn.disabled = !canScroll;
      btn.setAttribute('aria-hidden', canScroll ? 'false' : 'true');
      btn.classList.toggle('is-active', canScroll);
      btn.classList.toggle('is-disabled', !canScroll);
    });
    if (prevBtn) {
      prevBtn.style.left = '8px';
      prevBtn.style.right = 'auto';
      prevBtn.style.top = '50%';
      prevBtn.style.transform = 'translateY(-50%)';
    }
    if (nextBtn) {
      nextBtn.style.left = 'auto';
      nextBtn.style.right = '8px';
      nextBtn.style.top = '50%';
      nextBtn.style.transform = 'translateY(-50%)';
    }
  }

  _scheduleTimelineNavStateUpdates() {
    this._updateTimelineNavState();
    if (typeof requestAnimationFrame !== 'function') return;
    requestAnimationFrame(() => {
      this._updateTimelineNavState();
      requestAnimationFrame(() => this._updateTimelineNavState());
    });
  }

  _syncTimelineMonthFromScroll() {
    const strip = this.shadowRoot?.querySelector?.('[data-timeline-strip]');
    if (!strip) return;
    const monthEls = Array.from(strip.querySelectorAll('.tl-month-col'));
    if (!monthEls.length) return;
    const best = this._timelineStripAnchorEl(strip);
    if (!best) return;
    monthEls.forEach((monthEl) => monthEl.classList.toggle('is-anchor', monthEl === best));
    const monthStart = this._parseISO(best.getAttribute('data-timeline-month-start'));
    if (monthStart) {
      const prevMonth = this._timelineMonth;
      const newMonth = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1, 12, 0, 0, 0);
      const monthChanged = !prevMonth
        || prevMonth.getFullYear() !== newMonth.getFullYear()
        || prevMonth.getMonth() !== newMonth.getMonth();
      this._timelineMonth = newMonth;
      // Re-render when the visible month changes so the 13-month window shifts and
      // historical fertile/ovulation markers become available without a hass push.
      if (monthChanged && this._config && this._hass && !this._modalIso && !this._pmModalOpen) {
        const allMonths = this._timelineStripMonths();
        const firstMonthDate = allMonths[0].monthDate;
        const lastMonthDate = allMonths[allMonths.length - 1].monthDate;
        const distToFirst = (newMonth.getFullYear() - firstMonthDate.getFullYear()) * 12
          + (newMonth.getMonth() - firstMonthDate.getMonth());
        const distToLast = (lastMonthDate.getFullYear() - newMonth.getFullYear()) * 12
          + (lastMonthDate.getMonth() - newMonth.getMonth());
        if (distToFirst <= 2 || distToLast <= 2) {
          this._timelineWindowRevision += 1;
          this._render();
        }
      }
    }
    this._updateTimelineNavState();
  }

  _centerTimelineStrip(behavior = 'auto') {
    const strip = this.shadowRoot?.querySelector?.('[data-timeline-strip]');
    const anchor = strip?.querySelector?.('.tl-month-col.is-anchor');
    if (!strip || !anchor) return;
    const targetLeft = Math.max(0, anchor.offsetLeft - Math.max(0, (strip.clientWidth - anchor.offsetWidth) / 2));
    if (typeof strip.scrollTo === 'function') {
      strip.scrollTo({ left: targetLeft, behavior });
    } else {
      strip.scrollLeft = targetLeft;
    }
    this._updateTimelineNavState();
  }

  _focusTimelineOnTodayMonth() {
    const strip = this.shadowRoot?.querySelector?.('[data-timeline-strip]');
    const monthEls = Array.from(strip?.querySelectorAll?.('.tl-month-col') || []);
    if (!strip || !monthEls.length) return false;
    const baseMonth = this._timelineBaseMonth();
    const monthStartIso = this._timelineAnchorMonthStartIso();
    if (!monthStartIso) return false;
    const target = strip.querySelector?.(`[data-timeline-month-start="${monthStartIso}"]`);
    if (!target) return false;
    monthEls.forEach((monthEl) => monthEl.classList.toggle('is-anchor', monthEl === target));
    this._timelineMonth = new Date(baseMonth.getFullYear(), baseMonth.getMonth(), 1, 12, 0, 0, 0);
    const targetLeft = Math.max(0, target.offsetLeft - Math.max(0, (strip.clientWidth - target.offsetWidth) / 2));
    if (typeof strip.scrollTo === 'function') {
      strip.scrollTo({ left: targetLeft, behavior: 'auto' });
    } else {
      strip.scrollLeft = targetLeft;
    }
    this._updateTimelineNavState();
    return true;
  }

  _scrollTimelineStrip(direction) {
    const strip = this.shadowRoot?.querySelector?.('[data-timeline-strip]');
    const firstMonth = strip?.querySelector?.('.tl-month-col');
    if (!strip || !firstMonth) return;
    const styles = typeof getComputedStyle === 'function' ? getComputedStyle(strip) : null;
    const gap = parseFloat(styles?.gap || styles?.columnGap || '0') || 0;
    const delta = (firstMonth.offsetWidth + gap) * (direction < 0 ? -1 : 1);
    if (typeof strip.scrollBy === 'function') {
      strip.scrollBy({ left: delta, behavior: 'smooth' });
    } else {
      strip.scrollLeft += delta;
    }
    this._updateTimelineNavState();
    if (this._timelineScrollTimer) clearTimeout(this._timelineScrollTimer);
    this._timelineScrollTimer = setTimeout(() => this._syncTimelineMonthFromScroll(), 220);
  }

  _setupTimelineStrip() {
    const strip = this.shadowRoot?.querySelector?.('[data-timeline-strip]');
    if (!strip) return;
    if (this._timelineStripEl !== strip) {
      this._timelineStripEl = strip;
      if (!this._timelineScrollHandler) {
        this._timelineScrollHandler = () => {
          this._updateTimelineNavState();
          if (this._timelineScrollTimer) clearTimeout(this._timelineScrollTimer);
          this._timelineScrollTimer = setTimeout(() => this._syncTimelineMonthFromScroll(), 140);
        };
      }
      strip.addEventListener('scroll', this._timelineScrollHandler, { passive: true });
    }
    const restored = this._restoreTimelineState();
    if (!restored && !this._timelineHasCenteredOnce && strip.clientWidth > 0) {
      const _scrollToAnchor = () => {
        const focused = this._focusTimelineOnTodayMonth();
        if (!focused) this._centerTimelineStrip('auto');
      };
      _scrollToAnchor();
      requestAnimationFrame(() => {
        _scrollToAnchor();
        requestAnimationFrame(() => {
          _scrollToAnchor();
          this._timelineHasCenteredOnce = true;
          this._syncTimelineMonthFromScroll?.();
          this._updateTimelineNavState?.();
        });
      });
    } else {
      this._updateTimelineNavState?.();
    }

    this._scheduleTimelineNavStateUpdates();
  }

  _calendarGrid(model, locale) {
    const y = this._viewDate.getFullYear();
    const m = this._viewDate.getMonth();
    const first = new Date(y, m, 1, 12, 0, 0, 0);
    const count = new Date(y, m + 1, 0).getDate();
    const firstDowMon0 = (first.getDay() + 6) % 7;
    const totalCells = Math.ceil((firstDowMon0 + count) / 7) * 7;
    const dows = this._weekdayLabels(locale || this._hass?.locale?.language || 'de');

    const items = [];
    dows.forEach((d) => items.push(`<div class="dow">${d}</div>`));

    for (let i = 0; i < totalCells; i++) {
      const day = i - firstDowMon0 + 1;
      const valid = day >= 1 && day <= count;
      if (!valid) {
        items.push('<button class="day other" type="button" disabled></button>');
        continue;
      }
      const iso = this._isoFromDate(new Date(y, m, day, 12, 0, 0, 0));
      const active = model.confirmedSet.has(iso);
      const today = iso === model.todayIso;
      const hasSymptoms = !!model.symptomByDate?.[iso];
      items.push(`<button class="day ${active ? 'active' : ''} ${today ? 'today' : ''} ${hasSymptoms ? 'has-symptoms' : ''}" type="button" data-iso="${iso}">${day}</button>`);
    }
    return items.join('');
  }

  _weekdayLabels(locale) {
    const monday = new Date(Date.UTC(2026, 0, 5)); // Monday
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      const label = formatter.format(d).replace('.', '').trim();
      return label.charAt(0).toUpperCase() + label.slice(1);
    });
  }

  async _toggleCycleStart(iso) {
    if (this._config?.calendar_edit_enabled === false) return;
    const model = this._buildModel();
    if (model.pregnancyInfo?.isPregnant) return;
    const service = model.confirmedSet.has(iso) ? 'remove_cycle_start' : 'add_cycle_start';
    const profile = model.stateObj?.attributes?.profile;
    const entityId = model.entityId || this._config?.entity || '';
    const entryId = model.stateObj?.attributes?.entry_id || this._config?.entry_id || '';
    const attempts = [];
    attempts.push({ date: iso, ...(entityId ? { entity_id: entityId } : {}), ...(profile ? { profile } : {}), ...(entryId ? { entry_id: entryId } : {}) });
    attempts.push({ date: iso, ...(entityId ? { entity_id: entityId } : {}), ...(profile ? { profile } : {}) });
    attempts.push({ date: iso, ...(profile ? { profile } : {}), ...(entryId ? { entry_id: entryId } : {}) });
    attempts.push({ date: iso, ...(profile ? { profile } : {}) });
    attempts.push({ date: iso });

    let lastError = null;
    for (const payload of attempts) {
      try {
        // Try new service domain first (new installations), fall back to old (existing installations)
        try {
          await this._hass.callService('menstruation_cycle', service, payload);
        } catch (_) {
          await this._hass.callService('menstruation_cycle', service, payload);
        }
        return;
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Service call failed');
  }

  async _refreshSensorEntity(entityId) {
    const eid = String(entityId || '').trim();
    if (!eid) return;
    try {
      await this._hass.callService('homeassistant', 'update_entity', { entity_id: eid });
    } catch (_) {
      // Ignore environments where update_entity is unavailable.
    }
  }

  /**
   * Fetches this day's data directly via get_symptom (reads the full,
   * uncapped stored history) before opening the modal, instead of relying
   * only on the symptom_history sensor attribute, which is capped to the
   * most recent ~30 entries. Same fix as menstruation-calendar-card.js —
   * this card has its own separate, duplicate modal implementation, so the
   * fix has to be applied here independently too.
   */
  async _openSymptomModalForDay(iso) {
    await this._refreshSymptomOverrideForDay(iso);
    this._modalIso = iso;
    this._render();
  }

  async _refreshSymptomOverrideForDay(iso) {
    this._symptomOverrides = this._symptomOverrides || {};
    const entityId = this._resolveEntityId();
    if (!entityId) {
      console.warn('[menstruation-gauge-card] Could not resolve an entity_id for this card — get_symptom call skipped, modal will use the (possibly capped) symptom_history attribute for', iso);
    }
    if (!window.MenstruationFunctions) return;
    const { data } = await window.MenstruationFunctions.fetchFreshSymptomData(this._hass, entityId, iso, '[menstruation-gauge-card]');
    if (data) this._symptomOverrides[iso] = data;
  }

  _renderSymptomModal(iso, model, palette) {
    const dt = this._parseISO(iso);
    const locale = this._hass?.locale?.language || 'de';
    const dateLabel = dt
      ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(dt)
      : iso;

    const isPeriodDay = model.confirmedSet.has(iso);
    const existing = this._symptomOverrides?.[iso] || model.symptomByDate?.[iso] || {};
    const isPreMenarche = model.state === 'pre_menarche';
    const isPregnant = Boolean(model.pregnancyInfo?.isPregnant);
    const periodModalContext = this._periodModalContext(iso, model);
    const symptomConfig = this._symptomConfig(model.state, isPregnant);

    const categoryRows = symptomConfig.map((cat) => {
      if (cat.hiddenInModal) {
        return '';
      }
      const catLabel = this._tCategory(cat.key);
      if (cat.renderAs === 'cervix-grid') {
        const positionValue = existing.cervix_position || '';
        const textureValue = existing.cervix_texture || '';
        const positionButtons = cat.options.map((opt) => {
          const sel = positionValue === opt ? ' sym-selected' : '';
          return `<button type="button" class="sym-opt-btn${sel}" data-cat="cervix_position" data-val="${opt}">${this._tOption(opt)}</button>`;
        }).join('');
        const textureConfig = symptomConfig.find((entry) => entry.key === 'cervix_texture');
        const textureButtons = (textureConfig?.options || []).map((opt) => {
          const sel = textureValue === opt ? ' sym-selected' : '';
          return `<button type="button" class="sym-opt-btn${sel}" data-cat="cervix_texture" data-val="${opt}">${this._tOption(opt)}</button>`;
        }).join('');
        return `
          <div class="sym-row">
            <div class="sym-cat-head">${window.MenstruationFunctions ? window.MenstruationFunctions.renderCategoryIcon(cat.icon) : `<ha-icon icon="${cat.icon}"></ha-icon>`}<span>${catLabel}</span></div>
            <div class="sym-cervix-grid">
              <div class="sym-cervix-col">
                <div class="sym-cervix-title">${this._t('cat_cervix_position')}</div>
                <div class="sym-options sym-cervix-opts">${positionButtons}</div>
              </div>
              <div class="sym-cervix-col">
                <div class="sym-cervix-title">${this._t('cat_cervix_texture')}</div>
                <div class="sym-options sym-cervix-opts">${textureButtons}</div>
              </div>
            </div>
          </div>
        `;
      }
      if (cat.multi) {
        const currentValues = Array.isArray(existing[cat.key]) ? existing[cat.key] : [];
        const checkboxes = cat.options.map((opt) => {
          const checked = currentValues.includes(opt) ? 'checked' : '';
          return `<label class="sym-opt-label"><input type="checkbox" class="sym-multi" name="${cat.key}" value="${opt}" ${checked}><span>${this._tOption(opt)}</span></label>`;
        }).join('');
        return `<div class="sym-row"><div class="sym-cat-head">${window.MenstruationFunctions ? window.MenstruationFunctions.renderCategoryIcon(cat.icon) : `<ha-icon icon="${cat.icon}"></ha-icon>`}<span>${catLabel}</span></div><div class="sym-options sym-multi-opts">${checkboxes}</div></div>`;
      }
      const currentValue = existing[cat.key] || '';
      const buttons = cat.options.map((opt) => {
        const sel = currentValue === opt ? ' sym-selected' : '';
        return `<button type="button" class="sym-opt-btn${sel}" data-cat="${cat.key}" data-val="${opt}">${this._tOption(opt)}</button>`;
      }).join('');
      const hiddenClass = cat.dependsOn && existing[cat.dependsOn.key] !== cat.dependsOn.value ? ' sym-hidden' : '';
      return `<div class="sym-row${hiddenClass}" data-sym-row="${cat.key}"><div class="sym-cat-head">${window.MenstruationFunctions ? window.MenstruationFunctions.renderCategoryIcon(cat.icon) : `<ha-icon icon="${cat.icon}"></ha-icon>`}<span>${catLabel}</span></div><div class="sym-options sym-single-opts">${buttons}</div></div>`;
    }).join('');

    const basalTemp = existing.basal_temp != null ? existing.basal_temp : '';
    const saveLabel = this._periodSaveLabel(iso, model);

    return `
      <div class="sym-overlay" id="sym-modal">
        <div class="sym-backdrop"></div>
        <div class="sym-dialog" style="border-color:${palette.border};background:${palette.cardBg};color:${palette.cardColor}">
          <div class="sym-header">
            <span>${this._t('modal_edit_day')}: ${dateLabel}</span>
            <button type="button" class="sym-close" aria-label="close">✕</button>
          </div>
          <div class="sym-body">
            ${isPreMenarche || isPregnant || !periodModalContext.showPeriodToggle ? '' : `
            <div class="sym-row">
              <div class="sym-cat-head"><ha-icon icon="mdi:calendar-heart"></ha-icon><span>${this._t('period_start')}</span></div>
              <div class="sym-options sym-single-opts">
                <button type="button" class="sym-opt-btn${isPeriodDay ? ' sym-selected' : ''}" data-cat="_period" data-val="yes">✔</button>
                <button type="button" class="sym-opt-btn${!isPeriodDay ? ' sym-selected' : ''}" data-cat="_period" data-val="no">✗</button>
              </div>
            </div>`}
            ${categoryRows}
            <div class="sym-row">
              <div class="sym-cat-head"><ha-icon icon="mdi:thermometer"></ha-icon><span>${this._t('basal_temp_label')}</span></div>
              <input id="sym-basal-temp" type="number" step="0.1" min="35" max="42" value="${basalTemp}" class="sym-temp-input" placeholder="36.5">
            </div>
          </div>
          <div class="sym-footer">
            <button type="button" class="btn sym-save">${saveLabel}</button>
            <button type="button" class="btn sym-cancel">${this._t('cancel')}</button>
          </div>
        </div>
      </div>
    `;
  }

  _periodSaveLabel(iso, model) {
    return this._t('save');
  }

  async _handleModalSave() {
    const iso = this._modalIso;
    if (!iso) return;

    const root = this.shadowRoot;
    const model = this._buildModel();
    const entityId = model.entityId || this._config?.entity || '';
    const entryId = model.stateObj?.attributes?.entry_id || this._config?.entry_id || '';
    const profile = model.stateObj?.attributes?.profile;

    // Determine period toggle state from modal
    const periodModalContext = this._periodModalContext(iso, model);
    const allowPeriodToggle = !model.pregnancyInfo?.isPregnant && model.state !== 'pre_menarche' && periodModalContext.showPeriodToggle;
    const periodYesBtn = root.querySelector('.sym-opt-btn[data-cat="_period"][data-val="yes"]');
    const wantsPeriod = allowPeriodToggle
      ? (periodYesBtn?.classList.contains('sym-selected') ?? model.confirmedSet.has(iso))
      : model.confirmedSet.has(iso);
    const hasPeriod = model.confirmedSet.has(iso);

    // Collect symptom data from modal inputs
    const symptomData = {};
    this._symptomConfig(model.state, model.pregnancyInfo?.isPregnant).forEach((cat) => {
      if (cat.hiddenInModal) {
        return;
      }
      if (cat.multi) {
        const checked = Array.from(root.querySelectorAll(`.sym-multi[name="${cat.key}"]:checked`)).map((el) => el.value);
        if (checked.length > 0) symptomData[cat.key] = checked;
      } else {
        const selected = root.querySelector(`.sym-opt-btn.sym-selected[data-cat="${cat.key}"]`);
        if (selected) symptomData[cat.key] = selected.getAttribute('data-val');
      }
    });
    if (symptomData.clots !== 'yes') {
      delete symptomData.clot_size;
    }
    const rawTemp = root.getElementById('sym-basal-temp')?.value;
    const basalTemp = parseFloat(rawTemp);
    if (!Number.isNaN(basalTemp) && rawTemp !== '') symptomData.basal_temp = basalTemp;
    const autoConfirmDays = symptomData.bleeding_strength && symptomData.bleeding_strength !== 'none'
      ? this._daysToAutoConfirm(iso, model, periodModalContext.continuationBlock)
      : [];

    this._modalIso = null;
    this._pendingTimelineState = this._captureTimelineState();

    // Toggle period start if state changed
    if (allowPeriodToggle && wantsPeriod !== hasPeriod) {
      try {
        await this._toggleCycleStart(iso);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('menstruation-cycle-card: failed to toggle period', err);
      }
    }

    if (!allowPeriodToggle && autoConfirmDays.length > 0) {
      try {
        for (const dayIso of autoConfirmDays) {
          // eslint-disable-next-line no-await-in-loop
          await this._toggleCycleStart(dayIso);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('menstruation-cycle-card: failed to auto-confirm period day', err);
      }
    }

    // Save symptom data if any fields are set
    if (Object.keys(symptomData).length > 0) {
      try {
        const payload = {
          date: iso,
          symptom_data: symptomData,
          ...(entityId ? { entity_id: entityId } : {}),
          ...(entryId ? { entry_id: entryId } : {}),
          ...(profile ? { profile } : {}),
        };
        try {
          await this._hass.callService('menstruation_cycle', 'add_symptom', payload);
        } catch (_) {
          await this._hass.callService('menstruation_cycle', 'add_symptom', payload);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('menstruation-cycle-card: failed to save symptoms', err);
      }
    }

    await this._refreshSensorEntity(entityId);
    this._render();
  }

  _removeFirstPeriodModal() {
    this.shadowRoot?.querySelector('#pm-first-period-modal')?.remove();
    this._pmModalOpen = false;
  }

  _handleLogFirstPeriod() {
    this._removeFirstPeriodModal();
    this._pendingFirstPeriodSymptoms = null;
    this._pmModalOpen = true;

    const overlay = document.createElement('div');
    overlay.id = 'pm-first-period-modal';
    overlay.className = 'pm-overlay';
    overlay.innerHTML = `
      <div class="pm-modal" role="dialog" aria-modal="true">
        <div class="pm-modal-header">
          <span class="pm-modal-emoji">🩸</span>
          <h3>${this._t('log_first_period_symptoms')}</h3>
        </div>
        <div class="pm-modal-body">
          <p class="pm-modal-description">${this._t('first_period_description')}</p>
          <div class="pm-symptom-grid">
            <label class="pm-symptom-btn">
              <input type="checkbox" name="pm-symptom" value="spotting" />
              <span>🩸 ${this._t('spotting')}</span>
            </label>
            <label class="pm-symptom-btn">
              <input type="checkbox" name="pm-symptom" value="discharge" />
              <span>💧 ${this._t('discharge')}</span>
            </label>
            <label class="pm-symptom-btn">
              <input type="checkbox" name="pm-symptom" value="pain" />
              <span>😣 ${this._t('pain')}</span>
            </label>
          </div>
        </div>
        <div class="pm-modal-actions">
          <button type="button" class="btn pm-btn-secondary" data-action="pm-cancel-symptoms">${this._t('cancel')}</button>
          <button type="button" class="btn pm-btn-primary" data-action="pm-confirm-symptoms">${this._t('continue')}</button>
        </div>
      </div>
    `;
    this.shadowRoot?.appendChild(overlay);
  }

  _collectFirstPeriodSymptoms() {
    const root = this.shadowRoot;
    if (!root) return {};
    const symptomData = {};
    if (root.querySelector('input[name="pm-symptom"][value="spotting"]:checked')) {
      symptomData.spotting = 'red';
    }
    if (root.querySelector('input[name="pm-symptom"][value="discharge"]:checked')) {
      symptomData.discharge = 'other';
    }
    if (root.querySelector('input[name="pm-symptom"][value="pain"]:checked')) {
      symptomData.pain = ['cramps'];
    }
    return symptomData;
  }

  _showLeavePreMenarcheDialog() {
    this._pendingFirstPeriodSymptoms = this._collectFirstPeriodSymptoms();
    this._removeFirstPeriodModal();
    this._pmModalOpen = true;

    const overlay = document.createElement('div');
    overlay.id = 'pm-first-period-modal';
    overlay.className = 'pm-overlay';
    overlay.innerHTML = `
      <div class="pm-modal" role="dialog" aria-modal="true">
        <div class="pm-modal-header">
          <span class="pm-modal-emoji">🌸</span>
          <h3>${this._t('leave_pre_menarche_title')}</h3>
        </div>
        <div class="pm-modal-body">
          <p class="pm-modal-description">${this._t('leave_pre_menarche_message')}</p>
        </div>
        <div class="pm-modal-actions">
          <button type="button" class="btn pm-btn-secondary" data-action="pm-cancel-leave">${this._t('no')}</button>
          <button type="button" class="btn pm-btn-primary" data-action="pm-confirm-leave">${this._t('yes')}</button>
        </div>
      </div>
    `;
    this.shadowRoot?.appendChild(overlay);
  }

  async _doLogFirstPeriod() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const model = this._buildModel();
      const entityId = model.entityId || this._config?.entity || '';
      const profile = model.stateObj?.attributes?.profile || '';
      const entryId = model.stateObj?.attributes?.entry_id || this._config?.entry_id || '';
      const serviceBase = {
        ...(entityId ? { entity_id: entityId } : {}),
        ...(profile ? { profile } : {}),
        ...(entryId ? { entry_id: entryId } : {}),
      };

      // Log any selected symptoms (include bleeding_strength: light for first period)
      const symptoms = this._pendingFirstPeriodSymptoms || {};
      const addSymptomPayload = {
        ...serviceBase,
        date: today,
        symptom_data: { bleeding_strength: 'light', ...symptoms },
      };
      try {
        await this._hass.callService('menstruation_cycle', 'add_symptom', addSymptomPayload);
      } catch (_) {
        await this._hass.callService('menstruation_cycle', 'add_symptom', addSymptomPayload);
      }

      // Atomically record menarche date and add cycle start (transitions from pre_menarche to normal)
      const logFirstPeriodPayload = { ...serviceBase, date: today };
      try {
        await this._hass.callService('menstruation_cycle', 'log_first_period', logFirstPeriodPayload);
      } catch (_) {
        await this._hass.callService('menstruation_cycle', 'log_first_period', logFirstPeriodPayload);
      }

      this._pendingFirstPeriodSymptoms = null;
      this._showWelcomePeriodPopup();
    } catch (error) {
      console.error('menstruation-cycle-card: error logging first period', error);
      this._removeFirstPeriodModal();
    }
  }

  _showWelcomePeriodPopup() {
    this._removeFirstPeriodModal();
    this._pmModalOpen = true;

    const overlay = document.createElement('div');
    overlay.id = 'pm-first-period-modal';
    overlay.className = 'pm-overlay';
    overlay.innerHTML = `
      <div class="pm-modal pm-modal-welcome" role="dialog" aria-modal="true">
        <div class="pm-modal-header">
          <span class="pm-modal-emoji">🎉</span>
          <h3>${this._t('welcome_period_title')}</h3>
        </div>
        <div class="pm-modal-body">
          <ul class="pm-info-list">
            <li>📊 ${this._t('welcome_period_cycle_tracking')}</li>
            <li>✨ ${this._t('welcome_period_features')}</li>
            <li>🌸 ${this._t('welcome_period_contraception')}</li>
            <li>↩️ ${this._t('welcome_period_return')}</li>
          </ul>
        </div>
        <div class="pm-modal-actions pm-modal-actions-center">
          <button type="button" class="btn pm-btn-primary pm-btn-ok" data-action="pm-welcome-ok">OK</button>
        </div>
      </div>
    `;
    this.shadowRoot?.appendChild(overlay);
  }

  _attachHandlers() {
    if (this._handlersAttached) return;
    this._handlersAttached = true;

    // Single delegated click listener on shadowRoot — survives innerHTML replacements
    this.shadowRoot.addEventListener('click', (ev) => {
      // Today button: reset gauge rotation to today at top
      if (ev.target?.closest('[data-action="gauge-today"]')) {
        this._gaugeRotation = 0;
        const gaugeContent = this.shadowRoot?.querySelector('.gauge-content');
        if (gaugeContent) {
          gaugeContent.style.transition = 'transform 0.8s ease-in-out';
          gaugeContent.style.transform = 'rotate(0deg)';
          setTimeout(() => { if (gaugeContent) gaugeContent.style.transition = ''; }, 820);
        }
        return;
      }
      // Timeline strip overlay navigation
      if (ev.target?.closest('[data-tl-nav="left"], [data-tl-overlay-nav="prev"]')) {
        this._scrollTimelineStrip(-1);
        return;
      }
      if (ev.target?.closest('[data-tl-nav="right"], [data-tl-overlay-nav="next"]')) {
        this._scrollTimelineStrip(1);
        return;
      }
      // Timeline day click: rotate gauge so clicked day is at top
      const tlDay = ev.target?.closest('[data-timeline-iso]');
      if (tlDay) {
        const iso = tlDay.getAttribute('data-timeline-iso');
        if (iso) {
          const todayIso = this._isoFromDate(new Date());
          const diffDays = this._dayDiff(iso, todayIso);
          const dayIn60 = 31 + diffDays; // day 31 = today, range 1-60
          if (dayIn60 >= 1 && dayIn60 <= 60) {
            const spanDeg = 300;
            const startAngle60 = -90 - (30 / 60) * spanDeg; // -240
            const dayAngle = startAngle60 + ((dayIn60 - 1) / 60) * spanDeg;
            const targetRotation = -(dayAngle + 90);
            this._gaugeRotation = targetRotation;
            const gaugeContent = this.shadowRoot?.querySelector('.gauge-content');
            if (gaugeContent) {
              gaugeContent.style.transition = 'transform 0.8s ease-in-out';
              gaugeContent.style.transform = `rotate(${targetRotation}deg)`;
              setTimeout(() => { if (gaugeContent) gaugeContent.style.transition = ''; }, 820);
            }
          }
        }
        return;
      }
      // Navigation: previous month (calendar)
      if (ev.target?.closest('[data-nav="prev"]')) {
        this._viewDate = new Date(this._viewDate.getFullYear(), this._viewDate.getMonth() - 1, 1);
        this._render();
        return;
      }
      // Navigation: next month (calendar)
      if (ev.target?.closest('[data-nav="next"]')) {
        this._viewDate = new Date(this._viewDate.getFullYear(), this._viewDate.getMonth() + 1, 1);
        this._render();
        return;
      }
      // Toggle editor button
      if (this._config?.calendar_edit_enabled !== false && ev.target?.closest('[data-action="toggle-editor"]')) {
        this._editorOpen = !this._editorOpen;
        this._render();
        return;
      }
      // Calendar day cell — open symptom modal
      if (this._config?.calendar_edit_enabled !== false) {
        const dayBtn = ev.target?.closest?.('.day[data-iso]');
        if (dayBtn) {
          ev.stopPropagation();
          ev.preventDefault();
          const iso = dayBtn.getAttribute('data-iso');
          if (iso) {
            this._openSymptomModalForDay(iso);
          }
          return;
        }
      }
      // Modal: close on backdrop / close / cancel
      if (ev.target?.closest('.sym-backdrop') || ev.target?.closest('.sym-close') || ev.target?.closest('.sym-cancel')) {
        this._modalIso = null;
        this._render();
        return;
      }
      // Modal: save
      if (ev.target?.closest('.sym-save')) {
        this._handleModalSave();
        return;
      }
      // Modal: single-select symptom option buttons (event delegation)
      const optBtn = ev.target?.closest('.sym-opt-btn[data-cat]');
      if (optBtn) {
        const cat = optBtn.getAttribute('data-cat');
        const modal = this.shadowRoot.getElementById('sym-modal');
        modal?.querySelectorAll(`.sym-opt-btn[data-cat="${cat}"]`).forEach((b) => b.classList.remove('sym-selected'));
        optBtn.classList.add('sym-selected');
        if (cat === 'clots') {
          const showSize = optBtn.getAttribute('data-val') === 'yes';
          const clotSizeRow = modal?.querySelector('[data-sym-row="clot_size"]');
          if (clotSizeRow) {
            clotSizeRow.classList.toggle('sym-hidden', !showSize);
          }
          if (!showSize) {
            modal?.querySelectorAll('.sym-opt-btn[data-cat="clot_size"]').forEach((b) => b.classList.remove('sym-selected'));
          }
        }
      }
      // First period (pre-menarche) flow buttons
      const pmAction = ev.target?.closest('[data-action]')?.getAttribute('data-action');
      if (pmAction === 'log-first-period') {
        this._handleLogFirstPeriod();
        return;
      }
      if (pmAction === 'pm-confirm-symptoms') {
        this._showLeavePreMenarcheDialog();
        return;
      }
      if (pmAction === 'pm-cancel-symptoms') {
        this._removeFirstPeriodModal();
        return;
      }
      if (pmAction === 'pm-confirm-leave') {
        this._doLogFirstPeriod();
        return;
      }
      if (pmAction === 'pm-cancel-leave') {
        this._handleLogFirstPeriod();
        return;
      }
      if (pmAction === 'pm-welcome-ok') {
        this._removeFirstPeriodModal();
        this._render();
        return;
      }
    });
  }

  _buildRenderKey(model, countdown, isOverdueSoon, canEdit, cardTitle, friendlyName) {
    return [
      model.state,
      model.pregnancyInfo?.isPregnant ? 1 : 0,
      model.pregnancyInfo?.week,
      model.pregnancyInfo?.month,
      model.pregnancyInfo?.trimester,
      countdown,
      model.predicted || '',
      (model.predictedStarts || []).join(','),
      model.daysUntilMenarche,
      isOverdueSoon ? 1 : 0,
      this._editorOpen ? 1 : 0,
      this._viewDate?.getFullYear(),
      this._viewDate?.getMonth(),
      this._lastCardWidth,
      this._lang(),
      [...model.confirmedSet].sort().join(','),
      model.fertileStart || '',
      model.fertileEnd || '',
      model.ovulationDay || '',
      this._modalIso || '',
      canEdit ? 1 : 0,
      this._config?.show_predicted_cycles !== false ? 1 : 0,
      Math.max(1, Math.min(12, Number(this._config?.num_predicted_cycles || 6))),
      this._resolveThemeMode(),
      cardTitle,
      friendlyName,
      Object.keys(model.symptomByDate || {}).sort().join(','),
      this._timelineWindowRevision,
    ].join('|');
  }

  _render() {
    this._ensureRoot();
    if (!this._config || !this._hass) return;

    if (!this._timelineMonthInitialized) {
      const t = this._todayDate?.() || new Date();
      this._timelineMonth = new Date(t.getFullYear(), t.getMonth(), 1, 12, 0, 0, 0);
      this._timelineMonthInitialized = true;
    }

    const model = this._buildModel();
    const palette = this._palette(model.state);
    // Use width from ResizeObserver; fall back to a direct measurement only if not yet available.
    if (!this._lastCardWidth) {
      this._lastCardWidth = this.getBoundingClientRect()?.width || 0;
    }
    const locale = this._hass?.locale?.language || 'de';
    const monthYear = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(this._viewDate);
    const cardTitle = String(this._config.title || '').trim();
    const friendlyName = String(this._config.friendly_name || model.stateObj?.attributes?.friendly_name || '').trim();
    const canEdit = this._config?.calendar_edit_enabled !== false;
    const daysUntil = Number(model.stateObj?.attributes?.days_until_next_start);
    const isPreMenarche = model.state === 'pre_menarche' && model.menarcheData?.estimated_date;
    const isOverdueSoon = !isPreMenarche && Number.isFinite(daysUntil) && daysUntil <= -3;
    const countdown = isPreMenarche && Number.isFinite(model.daysUntilMenarche)
      ? (model.daysUntilMenarche >= 0
        ? this._t('menarche_expected_in').replace('{days}', String(model.daysUntilMenarche))
        : this._t('menarche_overdue').replace('{days}', String(Math.abs(model.daysUntilMenarche))))
      : (Number.isFinite(daysUntil)
        ? `${daysUntil} ${this._t('days_unit')}`
        : this._t('days_unknown'));

    // Skip full DOM replacement when nothing visible has changed — prevents
    // the pregnancy SVG mask from being torn down and re-applied on every
    // unrelated hass state push (which caused the preg_02.svg flicker).
    const renderKey = this._buildRenderKey(model, countdown, isOverdueSoon, canEdit, cardTitle, friendlyName);
    if (renderKey === this._lastRenderKey) {
      this._attachHandlers();
      this._setupTimelineStrip();
      return;
    }
    this._pendingTimelineState = this._captureTimelineState();
    this._lastRenderKey = renderKey;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; position: relative; }
        .root-wrap { position: relative; }
        ha-card {
          border-radius: 16px;
          border: 1px solid ${palette.border};
          background: ${palette.cardBg};
          color: ${palette.cardColor};
          box-shadow: ${palette.shadow};
          padding: 10px;
          overflow: hidden;
        }
        .wrap { display: grid; gap: 10px; min-width: 0; }
        .head { display: grid; gap: 2px; }
        .friendly { font-size: .78rem; font-weight: 600; color: ${palette.monthText}; text-align: left; }
        .title-label { font-size: .95rem; font-weight: 700; color: ${palette.cardColor}; text-align: left; }
        .gauge-wrap { position: relative; max-width: 420px; width: 100%; aspect-ratio: 1/1; margin: 0 auto; }
        .gauge { width: 100%; height: 100%; display: block; }
        .month { font-size: 12px; fill: ${palette.monthText}; font-weight: 700; letter-spacing: .02em; text-anchor: middle; dominant-baseline: middle; }
        .center { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; padding: 52px; box-sizing: border-box; }
        .countdown { pointer-events: auto; border-radius: 999px; border: 1px solid ${palette.buttonBorder}; padding: 4px 10px; background: ${palette.countdownBg}; cursor: pointer; font-size: 1.05rem; font-weight: 700; color: ${palette.countdownColor}; }
        .countdown.overdue-soon { border-style: dashed; border-width: 2px; }
        .countdown.passive { cursor: default; pointer-events: none; opacity: .92; }
        .center-panel {
          pointer-events: auto;
          background: transparent;
          border: none;
          box-shadow: none;
          padding: 0;
          max-width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          text-align: center;
          cursor: pointer;
          color: ${palette.countdownColor};
        }
        .center-panel.passive { cursor: default; pointer-events: none; opacity: .92; }
        .center-panel.overdue-soon { border: 2px dashed ${palette.buttonBorder}; border-radius: 12px; padding: 6px 10px; }
        .center .pregnancy-panel { border: none; outline: none; background: none; box-shadow: none; padding: 4px 0; min-width: unset; border-radius: 0; -webkit-appearance: none; appearance: none; }
        .center-icon { width: 56px; height: 56px; display: inline-flex; align-items: center; justify-content: center; }
        .center-icon svg { width: 56px; height: 56px; display: block; }
        .center-icon img { width: 100%; height: 100%; object-fit: contain; display: block; }
        .center-days { font-size: 1.05rem; font-weight: 700; line-height: 1.3; }
        .center-primary { font-size: 1rem; font-weight: 700; line-height: 1.2; }
        .center-secondary { font-size: .76rem; line-height: 1.25; opacity: .84; }
        /* Today button in gauge-wrap top-right */
        .today-btn { position: absolute; top: 8px; right: 8px; z-index: 10; border: 1px solid ${palette.buttonBorder}; border-radius: 8px; background: ${palette.buttonBg}; color: ${palette.buttonColor}; padding: 3px 8px; cursor: pointer; font-size: .72rem; font-weight: 600; opacity: .85; pointer-events: auto; }
        .today-btn:hover { opacity: 1; }
        .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .title { font-weight: 700; }
        .nav { display: inline-flex; gap: 6px; }
        .btn { border: 1px solid ${palette.buttonBorder}; border-radius: 8px; background: ${palette.buttonBg}; color: ${palette.buttonColor}; padding: 4px 8px; cursor: pointer; }
        .btn[disabled] { cursor: default; opacity: .55; }
        .editor { display: ${this._editorOpen ? 'grid' : 'none'}; gap: 8px; }
        .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
        .dow { text-align: center; font-size: 12px; opacity: .75; }
        .day { min-height: 32px; border: 1px solid ${palette.dayBorder}; border-radius: 8px; background: ${palette.dayBg}; color: ${palette.dayColor}; cursor: pointer; user-select: none; -webkit-user-select: none; }
        .day.active { background: ${palette.confirmed}; color: #fff; border-color: ${palette.confirmed}; }
        .day.today { outline: 2px solid ${palette.dayToday}; }
        .day.other { opacity: .3; }
        .day.has-symptoms { box-shadow: 0 0 0 2px ${palette.fertile} inset; }
        .day.active.has-symptoms { box-shadow: 0 0 0 2px ${palette.fertile} inset, 0 0 0 4px ${palette.confirmedInset} inset; }
        /* 60-day timeline */
        .timeline { border-top: 1px solid ${palette.border}; padding-top: 8px; width: 100%; max-width: 100%; box-sizing: border-box; overflow: hidden; min-width: 0; }
        .tl-strip-shell { position: relative; margin: 0 -10px; padding: 0 10px; width: 100%; max-width: 100%; box-sizing: border-box; min-width: 0; overflow: hidden; }
        .tl-strip {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          overflow-y: hidden;
          max-width: 100%;
          min-width: 0;
          overscroll-behavior-x: contain;
          scroll-snap-type: x proximity;
          scroll-behavior: smooth;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding: 2px 18px 8px;
          mask-image: linear-gradient(to right, transparent 0, #000 18px, #000 calc(100% - 18px), transparent 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0, #000 18px, #000 calc(100% - 18px), transparent 100%);
        }
        .tl-strip::-webkit-scrollbar { display: none; }
        .tl-month-col {
          flex: 0 0 clamp(180px, calc((100% - 84px) / 3), 240px);
          display: flex;
          flex-direction: column;
          gap: 2px;
          scroll-snap-align: center;
          scroll-snap-stop: always;
          transition: transform 160ms ease, opacity 160ms ease;
        }
        .tl-month-col.is-anchor { transform: translateY(-1px); }
        .tl-month-name { font-size: .72rem; font-weight: 700; color: ${palette.monthText}; text-align: center; padding-bottom: 2px; }
        .tl-dow-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; }
        .tl-dow { font-size: .6rem; text-align: center; opacity: .65; }
        .tl-days-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; }
        .tl-day { min-height: 12px; min-width: 12px; border: none; border-radius: 3px; background: transparent; color: ${palette.dayColor}; cursor: pointer; font-size: .65rem; text-align: center; padding: 0; line-height: 12px; display: block; }
        .tl-empty { background: transparent; cursor: default; pointer-events: none; }
        .tl-out-window { opacity: .35; }
        .tl-in-window { opacity: .85; }
        .tl-today { background: #3b82f6; color: #fff; border-radius: 50%; font-weight: 700; }
        .tl-period { background: ${palette.confirmed}; color: #fff; border-radius: 3px; }
        .tl-predicted:not(.tl-period) { background: ${palette.confirmed}; color: #fff; border-radius: 3px; opacity: .42; }
        .tl-fertile:not(.tl-period) { background: ${palette.fertile}; color: #000; border-radius: 3px; opacity: .85; }
        .tl-ovulation { outline: 2px solid ${palette.ovulation}; outline-offset: -2px; }
        .tl-overlay-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 44px;
          height: 72px;
          border: none;
          border-radius: 999px;
          background: ${palette.buttonBg};
          color: ${palette.buttonColor};
          font-size: 2rem;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          pointer-events: none;
          box-shadow: 0 8px 20px rgba(0,0,0,.18);
          transition: opacity 160ms ease, transform 160ms ease;
          z-index: 2;
        }
        .tl-overlay-prev { left: 8px; right: auto; }
        .tl-overlay-next { left: auto !important; right: 8px !important; }
        .tl-overlay-nav.is-active { opacity: .82; pointer-events: auto; }
        .tl-overlay-nav.is-disabled { opacity: 0; pointer-events: none; }
        .tl-strip-shell:hover .tl-overlay-nav.is-active,
        .tl-overlay-nav.is-active:focus-visible { opacity: .96; pointer-events: auto; }
        .tl-overlay-nav:hover { transform: translateY(-50%) scale(1.04); }
        @media (hover: none) {
          .tl-overlay-nav { display: none; }
        }
        /* Symptom modal */
        .sym-overlay { position: absolute; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; border-radius: 16px; overflow: hidden; }
        .sym-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.55); }
        .sym-dialog { position: relative; z-index: 1; border-radius: 12px; border: 1px solid; padding: 0; width: 92%; max-width: 360px; max-height: 85%; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 12px 32px rgba(0,0,0,.32); }
        .sym-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px 10px; font-weight: 700; font-size: .92rem; border-bottom: 1px solid rgba(128,128,128,.2); }
        .sym-close { background: transparent; border: none; cursor: pointer; font-size: 1rem; color: inherit; opacity: .7; padding: 2px 6px; }
        .sym-close:hover { opacity: 1; }
        .sym-body { overflow-y: auto; padding: 10px 14px; display: grid; gap: 10px; }
        .sym-footer { display: flex; gap: 8px; padding: 10px 14px; border-top: 1px solid rgba(128,128,128,.2); justify-content: flex-end; }
        .sym-row { display: grid; gap: 6px; }
        .sym-cat-head { display: flex; align-items: center; gap: 6px; font-size: .82rem; font-weight: 600; opacity: .85; }
        .sym-cat-head ha-icon { --mdc-icon-size: 16px; }
        .sym-options { display: flex; flex-wrap: wrap; gap: 5px; }
        .sym-hidden { display: none; }
        .sym-cervix-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
        .sym-cervix-col { display: grid; gap: 4px; }
        .sym-cervix-title { font-size: .72rem; opacity: .75; }
        .sym-cervix-opts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .sym-opt-btn { border: 1px solid rgba(128,128,128,.35); border-radius: 6px; padding: 4px 9px; cursor: pointer; font-size: .8rem; background: transparent; color: inherit; transition: background 120ms, border-color 120ms; }
        .sym-opt-btn:hover { border-color: rgba(190,18,60,.45); }
        .sym-opt-btn.sym-selected { background: ${palette.confirmed}; color: #fff; border-color: ${palette.confirmed}; }
        .sym-opt-label { display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: .82rem; }
        .sym-opt-label input[type="checkbox"] { accent-color: ${palette.confirmed}; }
        .sym-temp-input { padding: 5px 8px; border-radius: 6px; border: 1px solid rgba(128,128,128,.35); background: transparent; color: inherit; font-size: .88rem; width: 100px; }
        .sym-disabled { opacity: .62; }
        /* Pre-Menarche first period flow */
        .btn-log-first-period { display: block; width: 100%; padding: 10px 16px; font-size: .95rem; font-weight: 600; cursor: pointer; border-radius: 10px; border: 2px solid ${palette.confirmed}; background: ${palette.confirmed}; color: #fff; }
        .btn-log-first-period:hover { opacity: .88; }
        .pm-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; padding: 16px; }
        .pm-modal { background: ${palette.cardBg}; color: ${palette.cardColor}; border-radius: 16px; padding: 24px; max-width: 400px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); display: flex; flex-direction: column; gap: 16px; }
        .pm-modal-header { display: flex; align-items: center; gap: 12px; }
        .pm-modal-emoji { font-size: 2rem; line-height: 1; flex-shrink: 0; }
        .pm-modal-header h3 { margin: 0; font-size: 1.05rem; font-weight: 700; }
        .pm-modal-body { color: ${palette.cardColor}; }
        .pm-modal-description { margin: 0 0 12px 0; font-size: 0.95rem; opacity: .8; line-height: 1.5; }
        .pm-symptom-grid { display: flex; flex-direction: column; gap: 8px; }
        .pm-symptom-btn { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 1px solid ${palette.border}; border-radius: 8px; cursor: pointer; font-size: 0.95rem; color: ${palette.cardColor}; transition: border-color 0.15s ease, background 0.15s ease; }
        .pm-symptom-btn:hover { border-color: ${palette.confirmed}; background: rgba(${palette.confirmed},0.1); }
        .pm-symptom-btn input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; flex-shrink: 0; }
        .pm-info-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
        .pm-info-list li { padding: 10px 14px; background: rgba(39,174,96,0.12); border: 1px solid rgba(39,174,96,0.3); border-radius: 8px; font-size: 0.9rem; line-height: 1.4; }
        .pm-modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
        .pm-modal-actions-center { justify-content: center; }
        .pm-btn-primary { background: ${palette.confirmed}; color: #fff; padding: 10px 24px; flex: none; border-color: ${palette.confirmed}; font-weight: 600; }
        .pm-btn-primary:hover { opacity: .88; }
        .pm-btn-secondary { background: #95a5a6; color: #fff; padding: 10px 20px; flex: none; border-color: #95a5a6; }
        .pm-btn-secondary:hover { background: #7f8c8d; border-color: #7f8c8d; }
        .pm-btn-ok { min-width: 100px; }
        @media (max-width: 420px) {
          .center { padding: 64px; }
          .center-panel { min-width: 124px; padding: 10px 12px; }
          .center .pregnancy-panel { padding: 4px 0; min-width: unset; border-radius: 0; }
          .center-icon { width: 44px; height: 44px; }
          .center-icon svg { width: 44px; height: 44px; }
          .center-icon img { width: 100%; height: 100%; object-fit: contain; display: block; }
          .center-primary { font-size: .92rem; }
          .center-secondary { font-size: .72rem; }
        }
      </style>
      <div class="root-wrap">
        <ha-card>
          <div class="wrap">
            ${(friendlyName || cardTitle) ? `
            <div class="head">
              ${friendlyName ? `<div class="friendly">${friendlyName}</div>` : ''}
              ${cardTitle ? `<div class="title-label">${cardTitle}</div>` : ''}
            </div>` : ''}
            <div class="gauge-wrap">
              ${this._renderGauge(model, palette)}
              <button type="button" class="today-btn" data-action="gauge-today" title="${this._t('today')}">${this._t('today')}</button>
              <div class="center">${this._renderCenterContent(model, palette, canEdit, isOverdueSoon, countdown)}</div>
            </div>
            ${model.state === 'pre_menarche' ? `
            <div style="padding: 0 4px;">
              <button type="button" class="btn btn-log-first-period" data-action="log-first-period">
                🩸 ${this._t('log_first_period')}
              </button>
            </div>` : ''}
            ${this._renderTimeline(model, palette, locale)}
            ${this._config.show_editor && canEdit ? `
            <div class="editor">
              <div class="toolbar">
                <div class="title">${monthYear}</div>
                <div class="nav">
                  <button type="button" class="btn" data-nav="prev">◀</button>
                  <button type="button" class="btn" data-nav="next">▶</button>
                </div>
              </div>
              <div class="grid">${this._calendarGrid(model, locale)}</div>
            </div>` : ''}
          </div>
        </ha-card>
        ${this._modalIso ? this._renderSymptomModal(this._modalIso, model, palette) : ''}
      </div>
    `;

    this._attachHandlers();
    this._setupTimelineStrip();
  }
}

class MenstruationGaugeCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._handlersAttached = false;
    this._onEditorChange = null;
    this._onEditorClick = null;
    this._onEditorInput = null;
    this._onEditorKeydown = null;
    this._editorEntities = [];
  }

  setConfig(config) {
    this._config = {
      theme_mode: 'auto',
      show_fertile_period: true,
      show_predicted_cycles: true,
      num_predicted_cycles: 6,
      calendar_edit_enabled: true,
      period_duration_days: 5,
      ...config
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._loadTranslations();
    // Avoid stealing focus while user is typing in the editor.
    if (this.shadowRoot?.activeElement) return;
    this._render();
  }

  disconnectedCallback() {
    this._detachHandlers();
  }

  _loadTranslations() {
    const lang = this._lang();
    if (_mcCycleCardI18n.cache[lang] || _mcCycleCardI18n.loading[lang]) return;
    if (typeof _mcCycleCardI18n.load !== 'function') return;
    _mcCycleCardI18n.load(lang).then(() => this._render()).catch(() => {});
  }

  _lang() {
    const language = this._hass?.locale?.language || this._hass?.language || 'en';
    return _mcCycleCardI18n.normalizeLang(language);
  }

  _t(key) {
    const loaded = window.menstruationCycleI18n?.cache?.[this._lang()] || {};
    if (loaded[key] !== undefined) return loaded[key];
    const i18n = {
      en: {
        entity: 'Entity',
        fallback_note: 'HA entity picker unavailable, fallback dropdown active.',
        sensor_search: 'Search sensor...',
        friendly_name: 'Friendly Name (Gauge)',
        use_sensor_name: 'From sensor',
        title: 'Title',
        period_duration: 'Period Duration (number 1-14 or "learnt", empty = sensor value)',
        period_placeholder: 'e.g. 5 or "learnt"',
        theme: 'Theme',
        theme_auto: 'auto',
        theme_light: 'light',
        theme_dark: 'dark',
        show_fertile_period: 'Show fertile period',
        show_predicted: 'Show predicted cycles',
        num_predicted: 'Number of predicted cycles (1-12)',
        calendar_edit: 'Allow new entries through calendar',
      },
    };
    const val = i18n.en[key];
    return val !== undefined ? val : (i18n.en[key] ?? key);
  }

  _sensorLabelFromEntity(entityId) {
    const normalized = String(entityId || '').trim();
    if (!normalized) return '';
    const attrs = this._hass?.states?.[normalized]?.attributes || {};
    return String(attrs.friendly_name || attrs.name || normalized);
  }

  _entityOptions() {
    const states = this._hass?.states || {};
    return Object.keys(states)
      .filter((entityId) => entityId.startsWith('sensor.'))
      .sort()
      .map((entityId) => ({
        entity_id: entityId,
        label: String(states[entityId]?.attributes?.friendly_name || states[entityId]?.attributes?.name || entityId),
      }));
  }

  _entityOptionsHtml(options, selectedEntity) {
    return (options || []).map((row) => {
      const selected = row.entity_id === selectedEntity ? 'selected' : '';
      return `<option value="${row.entity_id}" ${selected}>${row.label} (${row.entity_id})</option>`;
    }).join('');
  }

  _emit(nextConfig) {
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: nextConfig },
      bubbles: true,
      composed: true
    }));
  }

  _handleInput(key, value) {
    const next = { ...this._config, [key]: value };
    this._emit(next);
  }

  _applySelectedEntity(valueRaw) {
    const value = String(valueRaw || '').trim();
    if (!value) return;
    const next = { ...this._config, entity: value };
    delete next.entry_id;
    if (!String(next.friendly_name || '').trim()) next.friendly_name = this._sensorLabelFromEntity(value);
    this._emit(next);
  }

  _handlePeriodDurationChange(valueRaw) {
    const raw = String(valueRaw || '').trim();
    if (!raw) {
      const next = { ...this._config };
      delete next.period_duration_days;
      this._emit(next);
      return;
    }
    const lowered = raw.toLowerCase();
    if (lowered === 'learnt' || lowered === 'learned') {
      this._handleInput('period_duration_days', 'learnt');
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.max(1, Math.min(14, Math.round(parsed)));
    this._handleInput('period_duration_days', clamped);
  }

  _handleEntitySearchInput(valueRaw) {
    const entitySelect = this.shadowRoot?.getElementById('entity_select');
    if (!entitySelect) return;
    const needle = String(valueRaw || '').trim().toLowerCase();
    const filtered = needle
      ? this._editorEntities.filter((row) => `${row.label} ${row.entity_id}`.toLowerCase().includes(needle))
      : this._editorEntities;
    entitySelect.innerHTML = this._entityOptionsHtml(filtered, String(this._config.entity || ''));
    if (!entitySelect.value && filtered.length) entitySelect.value = filtered[0].entity_id;
  }

  _attachHandlers() {
    if (this._handlersAttached || !this.shadowRoot) return;
    this._handlersAttached = true;

    this._onEditorChange = (ev) => {
      const target = ev.target;
      if (!target?.id) return;
      if (target.id === 'entity_selector' || target.id === 'entity_picker') {
        this._applySelectedEntity(ev?.detail?.value ?? target.value);
        return;
      }
      if (target.id === 'entity_select') {
        this._applySelectedEntity(target.value);
        return;
      }
      if (target.id === 'friendly_name') return this._handleInput('friendly_name', target.value);
      if (target.id === 'period_duration_days') return this._handlePeriodDurationChange(target.value);
      if (target.id === 'title') return this._handleInput('title', target.value);
      if (target.id === 'theme_mode') return this._handleInput('theme_mode', target.value);
      if (target.id === 'show_fertile_period') return this._handleInput('show_fertile_period', !!target.checked);
      if (target.id === 'show_predicted_cycles') return this._handleInput('show_predicted_cycles', !!target.checked);
      if (target.id === 'num_predicted_cycles') {
        const parsed = Number(target.value);
        if (!Number.isFinite(parsed)) return;
        return this._handleInput('num_predicted_cycles', Math.max(1, Math.min(12, Math.round(parsed))));
      }
      if (target.id === 'calendar_edit_enabled') return this._handleInput('calendar_edit_enabled', !!target.checked);
    };

    this._onEditorClick = (ev) => {
      if (!ev.target?.closest('#use_sensor_name')) return;
      const entitySelector = this.shadowRoot.getElementById('entity_selector');
      const entityPicker = this.shadowRoot.getElementById('entity_picker');
      const entitySelect = this.shadowRoot.getElementById('entity_select');
      const selected = entitySelector?.value || entityPicker?.value || entitySelect?.value || String(this._config.entity || '');
      const fromSensor = this._sensorLabelFromEntity(selected);
      this._emit({ ...this._config, friendly_name: fromSensor || '' });
    };

    this._onEditorInput = (ev) => {
      if (ev.target?.id === 'entity_search') {
        this._handleEntitySearchInput(ev.target.value);
      }
    };

    this._onEditorKeydown = (ev) => {
      if (ev.target?.id !== 'entity_search' || ev.key !== 'Enter') return;
      ev.preventDefault();
      const entitySelect = this.shadowRoot?.getElementById('entity_select');
      this._applySelectedEntity(entitySelect?.value);
    };

    this.shadowRoot.addEventListener('change', this._onEditorChange);
    this.shadowRoot.addEventListener('value-changed', this._onEditorChange);
    this.shadowRoot.addEventListener('click', this._onEditorClick);
    this.shadowRoot.addEventListener('input', this._onEditorInput);
    this.shadowRoot.addEventListener('keydown', this._onEditorKeydown);
  }

  _detachHandlers() {
    if (!this.shadowRoot || !this._handlersAttached) return;
    this.shadowRoot.removeEventListener('change', this._onEditorChange);
    this.shadowRoot.removeEventListener('value-changed', this._onEditorChange);
    this.shadowRoot.removeEventListener('click', this._onEditorClick);
    this.shadowRoot.removeEventListener('input', this._onEditorInput);
    this.shadowRoot.removeEventListener('keydown', this._onEditorKeydown);
    this._onEditorChange = null;
    this._onEditorClick = null;
    this._onEditorInput = null;
    this._onEditorKeydown = null;
    this._handlersAttached = false;
  }

  _render() {
    if (!this._config) return;
    const entities = this._entityOptions();
    this._editorEntities = entities;
    const selectedEntity = String(this._config.entity || '');
    const hasHaSelector = Boolean(customElements.get('ha-selector'));
    const hasHaEntityPicker = Boolean(customElements.get('ha-entity-picker'));
    const options = this._entityOptionsHtml(entities, selectedEntity);

    this.shadowRoot.innerHTML = `
      <style>
        .wrap { display: grid; gap: 10px; padding: 2px 0; }
        .row { display: grid; gap: 4px; }
        .inline { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; }
        .entity { display: grid; gap: 6px; }
        .entity-fallback { display: grid; gap: 6px; }
        label { font-size: 12px; font-weight: 600; color: var(--secondary-text-color); }
        input, select, button, ha-entity-picker, ha-selector { width: 100%; box-sizing: border-box; }
        input, select, button {
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          color: var(--primary-text-color);
        }
        button { width: auto; cursor: pointer; }
        .check { display: flex; gap: 8px; align-items: center; justify-content: flex-start; text-align: left; }
        .check input[type="checkbox"] { width: auto; min-width: 0; margin: 0; }
        .fallback-note { font-size: 11px; color: var(--secondary-text-color); opacity: .85; }
      </style>
      <div class="wrap">
        <div class="row">
          <label>${this._t('entity')}</label>
          <div class="entity">
          ${hasHaSelector
            ? '<ha-selector id="entity_selector"></ha-selector>'
            : hasHaEntityPicker
            ? '<ha-entity-picker id="entity_picker"></ha-entity-picker>'
            : `<div class="entity-fallback"><input id="entity_search" type="text" placeholder="${this._t('sensor_search')}"><select id="entity_select" size="8">${options}</select><div class="fallback-note">${this._t('fallback_note')}</div></div>`}
          </div>
        </div>
        <div class="row">
          <label>${this._t('friendly_name')}</label>
          <div class="inline">
            <input id="friendly_name" value="${this._config.friendly_name || ''}" placeholder="Anna">
            <button id="use_sensor_name" type="button">${this._t('use_sensor_name')}</button>
          </div>
        </div>
        <div class="row">
          <label>${this._t('title')}</label>
          <input id="title" value="${this._config.title || ''}" placeholder="Cycle Gauge">
        </div>
        <div class="row">
          <label>${this._t('period_duration')}</label>
          <input id="period_duration_days" type="text" value="${String(this._config.period_duration_days ?? '')}" placeholder='${this._t('period_placeholder')}'>
        </div>
        <div class="row">
          <label>${this._t('theme')}</label>
          <select id="theme_mode">
            <option value="auto" ${this._config.theme_mode === 'auto' ? 'selected' : ''}>${this._t('theme_auto')}</option>
            <option value="light" ${this._config.theme_mode === 'light' ? 'selected' : ''}>${this._t('theme_light')}</option>
            <option value="dark" ${this._config.theme_mode === 'dark' ? 'selected' : ''}>${this._t('theme_dark')}</option>
          </select>
        </div>
        <label class="check"><input type="checkbox" id="show_fertile_period" ${this._config.show_fertile_period !== false ? 'checked' : ''}> ${this._t('show_fertile_period')}</label>
        <label class="check"><input type="checkbox" id="show_predicted_cycles" ${this._config.show_predicted_cycles !== false ? 'checked' : ''}> ${this._t('show_predicted')}</label>
        <div class="row">
          <label>${this._t('num_predicted')}</label>
          <input id="num_predicted_cycles" type="number" min="1" max="12" value="${Math.max(1, Math.min(12, Number(this._config.num_predicted_cycles || 6)))}">
        </div>
        <label class="check"><input type="checkbox" id="calendar_edit_enabled" ${this._config.calendar_edit_enabled !== false ? 'checked' : ''}> ${this._t('calendar_edit')}</label>
      </div>
    `;

    const entitySelector = this.shadowRoot.getElementById('entity_selector');
    const entityPicker = this.shadowRoot.getElementById('entity_picker');

    if (entitySelector) {
      entitySelector.hass = this._hass;
      entitySelector.selector = { entity: { domain: 'sensor' } };
      entitySelector.value = String(this._config.entity || '');
    }
    if (entityPicker) {
      entityPicker.hass = this._hass;
      entityPicker.value = String(this._config.entity || '');
      entityPicker.includeDomains = ['sensor'];
      entityPicker.allowCustomEntity = false;
    }
    this._attachHandlers();
  }
}
if (!customElements.get('menstruation-gauge-card')) {
  customElements.define('menstruation-gauge-card', MenstruationGaugeCard);
}
if (!customElements.get('menstruation-gauge-card-editor')) {
  customElements.define('menstruation-gauge-card-editor', MenstruationGaugeCardEditor);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'menstruation-gauge-card',
  name: 'Menstruation Gauge Card',
  description: 'A card to visualize menstruation cycle, fertile window, ovulation, and related symptoms.',
});
