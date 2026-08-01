# HA Menstruation Cycle

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

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
3. Create a profile with a friendly name, restart Home Assistant, and add `custom:menstruation-cycle-card` to a dashboard.
4. Optional but recommended: import or recreate the daily refresh automation from [`/examples/daily_recalculate_days_until_next_start.yaml`](./examples/daily_recalculate_days_until_next_start.yaml).

For manual installation, extra cards, service examples, and troubleshooting, use the wiki pages below.

## Screenshot

<img width="1016" height="431" alt="HA Menstruation Cycle dashboard" src="https://github.com/user-attachments/assets/6c516de7-4b1e-4c1c-aa3d-2e9d753a8987" />

## 📚 Full documentation

**Start here:** [Documentation Hub](./wiki/Home.md)

Detailed guides:
- [Installation](./wiki/Installation.md)
- [Cards & Configuration](./wiki/Cards-Documentation.md)
- [Services & Automations](./wiki/Services-&-Automations.md)
- [FAQ & Troubleshooting](./wiki/FAQ-&-Troubleshooting.md)
- [Developer Guide](./wiki/Developer-Guide.md)

## Disclaimer summary

This project is a convenience and visualization tool. It is **not** a medical device and must not be used as a reliable standalone method for contraception, conception planning, diagnosis, or safety-critical decisions.

Before using it in a shared household or for sensitive automations:
- treat predictions as approximations
- use automations only with explicit agreement from the affected people
- keep health, privacy, and backup considerations in mind

Read the full disclaimer in [`/DISCLAIMER.md`](./DISCLAIMER.md).

## Contributing and feedback

Feedback, ideas, bug reports, edge cases, and pull requests are welcome. If you want to improve documentation, add cards, refine services, or help with testing, please open an issue or PR.

AI was used to help draft parts of the code and English wording, while the project idea and implementation direction remain human-authored.
