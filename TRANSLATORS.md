# Translation Guide

Thank you for helping translate HA Menstruation Cycle! This guide explains how to contribute a translation for Swedish (sv), French (fr), Spanish (es), or any other language.

## Translation status

| Language | Frontend (`www/translations/`) | Backend (`translations/`) | Status |
|----------|-------------------------------|--------------------------|--------|
| 🇬🇧 English | ✅ `en.json` | ✅ `en.json` | 100% |
| 🇩🇪 German | ✅ `de.json` | ✅ `de.json` | 100% |
| 🇸🇪 Swedish | 🟡 `sv.json` (template) | 🟡 `sv.json` (template) | 0% – Volunteers welcome! |
| 🇫🇷 French | 🟡 `fr.json` (template) | 🟡 `fr.json` (template) | 0% – Volunteers welcome! |
| 🇪🇸 Spanish | 🟡 `es.json` (template) | 🟡 `es.json` (template) | 0% – Volunteers welcome! |

## How to translate

### Step 1 – Fork and clone the repository

```bash
git clone https://github.com/<your-username>/HA-menstrual-cycle.git
cd HA-menstrual-cycle
git checkout -b translation/sv   # or fr / es / your-language
```

### Step 2 – Edit the template files

There are two sets of files to translate:

**Card UI strings (most important for end users):**

```
custom_components/menstruation_cycle/www/translations/sv.json
```

This file contains ~428 keys used in the Lovelace dashboard cards. It is already populated with English text as a reference. Replace each English value with the translated text.

**Backend strings (config flow, options, services):**

```
custom_components/menstruation_cycle/translations/sv.json
```

This file contains the strings shown in the Home Assistant UI when setting up or configuring the integration. It has fewer keys (~40) and is lower priority if you want to start small.

### Step 3 – Replace English values with your language

Open the file in any text editor. Each line looks like:

```json
"save": "Save",
```

Replace the value on the right side with your translation:

```json
"save": "Spara",
```

Leave the **key** (left side) unchanged. Only change the **value** (right side, inside the second pair of quotes).

### Step 4 – Keep placeholders intact

Some strings contain placeholders that are replaced at runtime. **Do not translate or remove these.**

| Placeholder | Meaning | Example |
|-------------|---------|---------|
| `{n}` | A number | `"Last {n} days"` |
| `{count}` | A count value | `"{count} cycles"` |
| `{value}` | A calculated value | `"based on ~{value}/day"` |
| `{days}` | A number of days | `"for a {days}-day wash routine"` |

Correct:

```json
"last_n_days": "Senaste {n} dagarna",
"last_cycles": "{count} cykler"
```

Incorrect (placeholder removed):

```json
"last_n_days": "Senaste dagarna",
"last_cycles": "cykler"
```

### Step 5 – Validate your JSON

Make sure the file is valid JSON before submitting. You can use any of these methods:

```bash
# Python (built-in)
python3 -c "import json; json.load(open('custom_components/menstruation_cycle/www/translations/sv.json')); print('OK')"

# Node.js
node -e "require('./custom_components/menstruation_cycle/www/translations/sv.json'); console.log('OK')"

# Online validator
# https://jsonlint.com/
```

Common mistakes to avoid:
- Trailing commas after the last key in an object
- Unescaped quotes inside strings (use `\"` if a translation needs a literal quote)
- Accidentally deleting a key or a brace

### Step 6 – Test locally

To see your translation in Home Assistant:

1. Copy your translated `sv.json` (or `fr.json` / `es.json`) into the running Home Assistant instance:
   ```
   custom_components/menstruation_cycle/www/translations/sv.json
   ```
2. Set your Home Assistant language to the matching locale (e.g. `sv` for Swedish) under **Profile → Language**.
3. Clear your browser cache and reload the dashboard.
4. The cards should now display your translated strings.

For backend strings, restart Home Assistant after copying the file to `translations/sv.json`.

### Step 7 – Open a pull request

1. Commit your changes:
   ```bash
   git add custom_components/menstruation_cycle/www/translations/sv.json
   git add custom_components/menstruation_cycle/translations/sv.json   # if applicable
   git commit -m "feat(i18n): add Swedish (sv) translation"
   git push origin translation/sv
   ```
2. Open a pull request against the `main` branch on GitHub.
3. In the PR description, mention which language you translated and approximately what percentage is complete.

## Key groups explained

The `www/translations/*.json` file is divided into logical groups. You can focus on the most visible ones first:

| Key prefix / group | What it controls | Priority |
|--------------------|-----------------|----------|
| `card_name`, `card_description` | Card titles | High |
| `save`, `cancel`, `close`, `yes`, `no`, … | Common UI actions | High |
| `pregnancy`, `period`, `fertile`, `ovulation`, `pms`, … | Phase labels | High |
| `opt_*` | Symptom option labels (e.g. `opt_light`, `opt_cramps`) | High |
| `cat_*` | Symptom category labels (e.g. `cat_pain`, `cat_mood`) | High |
| `tab_*` | Statistics tab names | Medium |
| `nfp_*` | NFP analysis strings | Medium |
| `col_*` | Table column headers | Medium |
| `doctor_report_*`, `export_*` | Doctor report UI | Low |
| `last_n_days`, `last_cycles`, … | Template strings with `{n}` / `{count}` | High (keep placeholders!) |

## Adding a new language not yet listed

If you want to add a language other than sv, fr, or es:

1. Copy `www/translations/en.json` to `www/translations/<code>.json` (use the two-letter ISO 639-1 code).
2. Copy `translations/en.json` to `translations/<code>.json`.
3. Follow the steps above to translate both files.
4. Add the new language to the table at the top of this file.

## Questions

If you are unsure about context, terminology, or how a string is used in the UI, open an issue or ask in the pull request. Screenshots or videos showing the string in context are always helpful.
