(() => {
  const fallbackEn = {
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    today: 'Today',
    period: 'Period',
    fertile: 'Fertile',
    ovulation: 'Ovulation',
    pms: 'PMS',
    neutral: 'Neutral',
    cycle_day: 'Cycle Day',
    no_data: 'No data',
  };

  const i18n = window.menstruationCycleI18n || (window.menstruationCycleI18n = {
    cache: {},
    loading: {},
    fallback: { en: fallbackEn },
  });

  i18n.cache = i18n.cache || {};
  i18n.loading = i18n.loading || {};
  i18n.fallback = i18n.fallback || { en: fallbackEn };
  i18n.fallback.en = { ...fallbackEn, ...(i18n.fallback.en || {}) };

  i18n.normalizeLang = i18n.normalizeLang || ((language) => {
    const normalized = String(language || 'en').toLowerCase();
    return normalized.startsWith('de') ? 'de' : 'en';
  });

  i18n.detectLang = i18n.detectLang || ((language) => i18n.normalizeLang(language || navigator.language || 'en'));

  if (!i18n.baseUrl && typeof document !== 'undefined') {
    const scripts = Array.from(document.scripts || []);
    i18n.baseUrl = scripts.find((script) => script?.src?.includes('menstruation-i18n.js'))?.src;
  }

  const buildUrls = (lang, baseUrl) => {
    const urls = [];
    if (baseUrl) urls.push(new URL(`./translations/${lang}.json`, baseUrl).href);
    if (i18n.baseUrl) urls.push(new URL(`./translations/${lang}.json`, i18n.baseUrl).href);
    urls.push(`./translations/${lang}.json`);
    urls.push(`/hacsfiles/menstruation-cycle-card/translations/${lang}.json`);
    return [...new Set(urls)];
  };

  i18n.load = i18n.load || ((language, baseUrl) => {
    const lang = i18n.normalizeLang(language);
    if (i18n.cache[lang]) return Promise.resolve(i18n.cache[lang]);
    if (i18n.loading[lang]) return i18n.loading[lang];

    i18n.loading[lang] = (async () => {
      for (const url of buildUrls(lang, baseUrl)) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const data = await response.json();
          i18n.cache[lang] = lang === 'en' ? { ...(i18n.fallback?.en || {}), ...data } : (data || {});
          return i18n.cache[lang];
        } catch (error) {
          // try next url
        }
      }

      i18n.cache[lang] = lang === 'en' ? { ...(i18n.fallback?.en || {}) } : {};
      return i18n.cache[lang];
    })().finally(() => {
      delete i18n.loading[lang];
    });

    return i18n.loading[lang];
  });

  i18n.load(i18n.detectLang()).catch(() => {
    const lang = i18n.detectLang();
    if (!i18n.cache[lang]) i18n.cache[lang] = lang === 'en' ? { ...(i18n.fallback?.en || {}) } : {};
  });
})();
