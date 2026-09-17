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

  // Nachtrag (17.09.2026, Übersetzungs-Cache-Bug): _serve_translation_file
  // in __init__.py liefert www/translations/*.json mit
  // "Cache-Control: ...immutable" aber OHNE ?v=-Query aus - anders als die
  // CARD_FILES-Ressourcen-URLs (per _build_card_resource_url()/
  // RESOURCE_VERSION versioniert) blieben Übersetzungsänderungen dadurch
  // bis zu 24h im Browser-Cache hängen, unabhängig von einem
  // manifest.json-Versions-Bump. Fix: dieselbe Version, mit der DIESES
  // Skript selbst als Lovelace-Ressource geladen wurde (?v=<Version>, von
  // _build_card_resource_url() angehängt - dieses Skript steht in
  // CARD_FILES), wird jetzt zusätzlich an die Übersetzungs-URL angehängt.
  // Ändert sich die Manifest-Version, ändert sich automatisch auch diese
  // URL, und der "immutable"-Cache wird umgangen - der Server selbst
  // braucht dafür KEINE Änderung, aiohttp matcht Routen ohne Query-String.
  //
  // import.meta.url statt der obigen document.scripts-Erkennung: dieses
  // Skript wird als Lovelace-Ressource vom Typ "module" geladen
  // (CARD_RESOURCE_TYPE in __init__.py) - ES-Module tauchen laut Kommentar
  // oben ohnehin nicht in document.scripts auf, weshalb `i18n.baseUrl` in
  // der Praxis meist leer blieb. `import.meta.url` liefert dagegen
  // zuverlässig die tatsächlich geladene URL inkl. Query-String.
  let ownResourceVersion = '';
  try {
    ownResourceVersion = new URL(import.meta.url).searchParams.get('v') || '';
  } catch (error) {
    // import.meta nicht verfügbar (z. B. beim Laden außerhalb eines
    // ES-Moduls) - ownResourceVersion bleibt leer, buildUrls() hängt dann
    // einfach keine Version an (Rückfall auf das alte Verhalten).
  }

  const buildUrls = (lang, baseUrl) => {
    const urls = [];
    const versionSuffix = ownResourceVersion ? `?v=${encodeURIComponent(ownResourceVersion)}` : '';
    // Prefer the stable, correct Home Assistant resource paths first.
    // Cards are loaded as ES modules and do not appear in document.scripts,
    // so script-relative baseUrl detection is unreliable as a primary source.
    urls.push(`/menstruation_cycle/translations/${lang}.json${versionSuffix}`);
    urls.push(`/hacsfiles/menstruation-cycle-card/translations/${lang}.json${versionSuffix}`);
    // Script-relative paths as fallbacks for custom or legacy setups.
    if (baseUrl) urls.push(new URL(`./translations/${lang}.json`, baseUrl).href);
    if (i18n.baseUrl) urls.push(new URL(`./translations/${lang}.json`, i18n.baseUrl).href);
    urls.push(`./translations/${lang}.json`);
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
