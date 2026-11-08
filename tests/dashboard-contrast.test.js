'use strict';
// Contrast of the accent colours (WCAG AA, 4.5:1) in the light and the dark look, computed from the values in the panel source:
// accent text on the card, accent text on the tinted background, and white text on the accent fill.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../custom_components/menstruation_cycle/www/menstruation-cycle-dashboard-panel.js'), 'utf8');
const hex = (h) => { const full = h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h; return [1, 3, 5].map((i) => parseInt(full.slice(i, i + 2), 16)); };
const mix = (a, share, b) => a.map((v, i) => (v * share) / 100 + (b[i] * (100 - share)) / 100);
const lum = (c) => {
  const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

const accents = Object.fromEntries([...src.match(/const ACCENTS = \{([^}]*)\}/)[1].matchAll(/(\w+): '(#[0-9A-Fa-f]{6})'/g)].map((m) => [m[1], hex(m[2])]));
assert.strictEqual(Object.keys(accents).length, 6, 'six accent colours');
const share = (re, what) => { const m = src.match(re); assert.ok(m, `${what} not found in the panel`); return Number(m[1]); };
const deepShare = share(/--mc-accent-deep', `color-mix\(in srgb, \$\{accent\} (\d+)%, #000\)`/, 'accent-deep');
const textShare = share(/--mc-rose-deep: color-mix\(in srgb, var\(--mc-accent-deep, #C43F5E\) (\d+)%/, 'rose-deep');
const solidShare = share(/--mc-accent-solid: color-mix\(in srgb, var\(--mc-accent, #E8637D\) (\d+)%, #000\)/, 'accent-solid');
const tintShare = share(/--mc-rose-tint: color-mix\(in srgb, var\(--card-background-color, #fff\) (\d+)%, var\(--mc-accent/, 'rose-tint');
const themeBlock = (name) => src.match(new RegExp(`:host\\(\\[data-theme="${name}"\\]\\) \\{[^}]*\\}`))[0];
const themes = Object.fromEntries(['light', 'dark'].map((name) => {
  const block = themeBlock(name);
  return [name, { card: hex(block.match(/--card-background-color: (#[0-9a-fA-F]{3,6})/)[1]), text: hex(block.match(/--primary-text-color: (#[0-9a-fA-F]{3,6})/)[1]) }];
}));

const failures = [];
for (const [themeName, theme] of Object.entries(themes)) {
  for (const [accentName, accent] of Object.entries(accents)) {
    const deep = mix(accent, deepShare, [0, 0, 0]);
    const text = mix(deep, textShare, theme.text);
    const tint = mix(theme.card, tintShare, accent);
    const solid = mix(accent, solidShare, [0, 0, 0]);
    const checks = { 'accent text on the card': ratio(text, theme.card), 'accent text on the tint': ratio(text, tint), 'white on the accent fill': ratio([255, 255, 255], solid) };
    for (const [what, value] of Object.entries(checks)) if (value < 4.5) failures.push(`${themeName}/${accentName}: ${what} ${value.toFixed(2)}:1`);
  }
}
assert.deepStrictEqual(failures, [], `contrast below 4.5:1:\n${failures.join('\n')}`);

// Teen design: the cards are tinted with four pastel colours; text, secondary text and the accent text must stay readable on them,
// for the default teen accent and for every accent the user can pick, and white on the teen "New!" tag.
const teenAccent = hex(src.match(/:host\(\[data-teen\]\) \{ --mc-accent: (#[0-9A-Fa-f]{6});/)[1]);
const teenColours = [...src.matchAll(/:host\(\[data-teen\]\) \.grid > \.card(?::nth-child\(4n\+\d\))? \{ --teen-c: (#[0-9A-Fa-f]{6}); \}/g)].map((m) => hex(m[1]));
assert.strictEqual(teenColours.length, 4, 'four pastel card colours');
const teenCardShare = share(/:host\(\[data-teen\]\) \.card \{[^}]*background: color-mix\(in srgb, var\(--card-background-color, #fff\) (\d+)%, var\(--teen-c/, 'teen card tint');
const teenDarkShare = share(/:host\(\[data-theme="dark"\]\[data-teen\]\) \.card \{ background: color-mix\(in srgb, var\(--card-background-color, #fff\) (\d+)%, var\(--teen-c/, 'teen card tint on dark');
assert.ok(/@media \(prefers-color-scheme: dark\) \{ :host\(\[data-teen\]:not\(\[data-theme="light"\]\)\) \.card \{ background: color-mix\(in srgb, var\(--card-background-color, #fff\) 94%/.test(src) && teenDarkShare === 94, 'the paler tint also applies when the theme is not set and the system is dark');
const secondary = { light: hex(themeBlock('light').match(/--secondary-text-color: (#[0-9a-fA-F]{3,6})/)[1]), dark: hex(themeBlock('dark').match(/--secondary-text-color: (#[0-9a-fA-F]{3,6})/)[1]) };
const teenFailures = [];
for (const [themeName, theme] of Object.entries(themes)) {
  for (const [accentName, accent] of Object.entries({ 'teen default': teenAccent, ...accents })) {
    const text = mix(mix(accent, deepShare, [0, 0, 0]), textShare, theme.text);
    const solid = mix(accent, solidShare, [0, 0, 0]);
    if (ratio([255, 255, 255], solid) < 4.5) teenFailures.push(`${themeName}/${accentName}: white on the "New!" tag ${ratio([255, 255, 255], solid).toFixed(2)}:1`);
    teenColours.forEach((colour, i) => {
      const bg = mix(theme.card, themeName === 'dark' ? teenDarkShare : teenCardShare, colour);
      const checks = { 'text': ratio(theme.text, bg), 'secondary text': ratio(secondary[themeName], bg), 'accent text': ratio(text, bg) };
      for (const [what, value] of Object.entries(checks)) if (value < 4.5) teenFailures.push(`${themeName}/${accentName}/card ${i + 1}: ${what} ${value.toFixed(2)}:1`);
    });
  }
}
assert.deepStrictEqual(teenFailures, [], `teen design contrast below 4.5:1:\n${teenFailures.join('\n')}`);

// no white text on the plain accent text colour any more (it is for text on the card, not for fills)
assert.ok(!/background:\s*var\(--mc-rose-deep[^;]*;[^}]*color:\s*#fff/.test(src), 'white text belongs on --mc-accent-solid');
console.log('dashboard-contrast: ok');
