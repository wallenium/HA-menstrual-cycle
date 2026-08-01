# HA Menstruation Cycle - Documentation Hub

## What is this?

HA Menstruation Cycle is a Home Assistant custom integration with local storage, sensors, services, and Lovelace cards for cycle tracking, visualization, and household support workflows.

It is designed for people who want menstrual-cycle data to stay inside Home Assistant while still getting practical dashboards, reminders, exports, symptom logging, and multi-profile support.

### Highlights

- HACS-ready integration with UI setup
- Multiple profiles in one Home Assistant instance
- Interactive and compact dashboard cards
- Cycle history, predictions, statistics, and heatmap views
- Product usage logging and household inventory workflows
- Export and automation support

## Quick Start

1. Open HACS and add: `git: /wallenium/HA-menstrual-cycle`
2. Search for **menstruation cycle** and install the integration
3. Add a user profile with a friendly name
4. Restart Home Assistant
5. Add card: `custom:menstruation-cycle-card`
6. Add the daily refresh automation from [`/examples/daily_recalculate_days_until_next_start.yaml`](../examples/daily_recalculate_days_until_next_start.yaml)

## Documentation Pages

- [Installation Guide](Installation.md)
- [Cards & Configuration](Cards-Documentation.md)
- [Services & Automations](Services-&-Automations.md)
- [FAQ & Troubleshooting](FAQ-&-Troubleshooting.md)
- [Developer Guide](Developer-Guide.md)

## Repository Structure

```text
HA-menstrual-cycle/
├── .github
│   ├── hacs.yml
│   └── hassfest.yml
├── hacs.json
├── README.md
├── DISCLAIMER.md
├── examples
│   └── daily_recalculate_days_until_next_start.yaml
└── custom_components/
    └── menstruation_cycle/
        ├── __init__.py
        ├── config_flow.py
        ├── const.py
        ├── manifest.json
        ├── model.py
        ├── sensor.py
        ├── services.yaml
        ├── storage.py
        ├── strings.json
        ├── translations/
        │   ├── de.json
        │   └── en.json
        └── www/
            ├── menstruation-cycle-card.js
            ├── menstruation-cycle-card-compact.js
            ├── menstruation-cycle-compact-status-card.js
            ├── menstruation-cycle-history-card-row.js
            ├── menstruation-cycle-heatmap-card.js
            ├── menstruation-calendar-card.js
            ├── menstruation-countdown-timer.js
            ├── menstruation-product-inventory-card.js
            ├── menstruation-statistics-card.js
            └── menstruation-icons.js
```

## Why This Structure?

### `custom_components/menstruation_cycle/manifest.json`
- Required by Home Assistant so the integration domain can load.
- Without `manifest.json`, initialization fails.

### `hacs.json`
- Required for proper HACS detection as a custom integration.
- Without it, HACS cannot reliably classify the repository.

### `__init__.py`, `sensor.py`, `config_flow.py`
- `__init__.py` registers services and static card resources.
- `sensor.py` exposes states and attributes used by cards and automations.
- `config_flow.py` enables UI setup so manual YAML integration setup is not required.

### `storage.py`
- Persists history and settings in `.storage`.
- Without persistent storage, entered data is lost on restart.

### `model.py`
- Keeps cycle calculation logic separated from Home Assistant framework code.
- Improves maintainability and traceability.

### `www/*.js`
- Lovelace cards are JavaScript resources.
- The integration serves these files under `/menstruation_cycle/...`.

### `services.yaml`
- Documents services in the Home Assistant UI.
- Without it, services still work but are harder to discover.
