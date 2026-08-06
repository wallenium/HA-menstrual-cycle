# HA Menstruation Cycle

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
![Version](https://img.shields.io/badge/version-1.5.4-blue.svg)


HA Menstruation Cycle is a Home Assistant custom integration for tracking cycle history, showing cycle phases, and powering Lovelace dashboards with interactive menstrual-cycle cards.

It combines a Home Assistant integration, per-profile sensors, local data storage, and a frontend card set so households can keep the setup inside Home Assistant instead of spreading data across separate tools. The project supports multiple profiles, visual dashboards, product usage tracking, symptom logging, and export workflows.

## Why use it?

- HACS-ready Home Assistant integration with UI-based setup
- Multiple profiles for shared households
- Interactive cards for cycle entry, calendar views, history, heatmaps, timers, and statistics
- Services for history management, symptom logging, exports, inventory workflows, and automations
- Automatic frontend resource registration when installed through the integration
- Local-first storage inside Home Assistant

## Quick Start

1. Open HACS and add the custom repository `git: /wallenium/HA-menstrual-cycle`.
2. Install **Menstruation Cycle**, then add the integration under **Settings → Devices & Services**.
3. Create a profile with a friendly name, restart Home Assistant, and add `custom:menstruation-gauge-card` to a dashboard.
4. Optional but recommended: import or recreate the daily refresh automation from [`/examples/daily_recalculate_days_until_next_start.yaml`](./examples/daily_recalculate_days_until_next_start.yaml).

For manual installation, extra cards, service examples, and troubleshooting, use the wiki pages below.

### Migration note

`custom:menstruation-cycle-card` has been removed. Update existing Lovelace YAML dashboards to use `custom:menstruation-gauge-card` instead.

## Screenshot

<img width="1016" height="431" alt="HA Menstruation Cycle dashboard" src="https://github.com/user-attachments/assets/6c516de7-4b1e-4c1c-aa3d-2e9d753a8987" />

## 📚 Full documentation

**Start here:** [Documentation Hub](https://github.com/wallenium/HA-menstrual-cycle/wiki)

Detailed guides:
- [Installation](https://github.com/wallenium/HA-menstrual-cycle/wiki/Installation)
- [Cards & Configuration](https://github.com/wallenium/HA-menstrual-cycle/wiki/Cards-Documentation)
- [Services & Automations](https://github.com/wallenium/HA-menstrual-cycle/wiki/Services-&-Automations)
- [FAQ & Troubleshooting](https://github.com/wallenium/HA-menstrual-cycle/wiki/FAQ-&-Troubleshooting)
- [Developer Guide](https://github.com/wallenium/HA-menstrual-cycle/wiki/Developer-Guide)

## Disclaimer summary

This project is a convenience and visualization tool. It is **not** a medical device and must not be used as a reliable standalone method for contraception, conception planning, diagnosis, or safety-critical decisions.

Before using it in a shared household or for sensitive automations:
- treat predictions as approximations
- use automations only with explicit agreement from the affected people
- keep health, privacy, and backup considerations in mind

Read the full disclaimer in [`Disclaimer`](https://github.com/wallenium/HA-menstrual-cycle/wiki/DISCLAIMER).

## Translations

| Language | Status |
|----------|--------|
| 🇬🇧 English | ✅ 100% |
| 🇩🇪 German | ✅ 100% |
| 🇸🇪 Swedish | ✅ 100% |
| 🇫🇷 French | 🟡 96% – Seeking volunteers |
| 🇪🇸 Spanish | 🟡 95% – Seeking volunteers |

Template files for Swedish, French, and Spanish are already in place. See [Translation Section](https://github.com/wallenium/HA-menstrual-cycle/wiki/Translation-&-l18n) for instructions on how to contribute a translation.

## Contributing and feedback

Feedback, ideas, bug reports, edge cases, and pull requests are welcome. If you want to improve documentation, add cards, refine services, or help with testing, please open an issue or PR.

AI was used to help draft parts of the code and English wording, while the project idea and implementation direction remain human-authored.
