# Developer Guide

## Architecture overview

The integration follows a straightforward data flow:

`const.py` → `model.py` → `sensor.py` → Lovelace cards

- `const.py` centralizes domain names, storage keys, service constants, and shared attribute names.
- `model.py` holds the cycle calculation logic and normalized model generation.
- `sensor.py` exposes Home Assistant sensor state and attributes for dashboards and automations.
- `__init__.py` wires the integration together, registers services, serves frontend resources, and handles setup/teardown.
- `www/*.js` renders the frontend cards based on the sensor attributes.

## File structure and why each file exists

| Path | Purpose |
| --- | --- |
| `custom_components/menstruation_cycle/__init__.py` | Integration setup, service registration, resource registration |
| `custom_components/menstruation_cycle/config_flow.py` | UI-based setup flow |
| `custom_components/menstruation_cycle/const.py` | Shared constants and public contract keys |
| `custom_components/menstruation_cycle/model.py` | Domain logic for cycle calculations |
| `custom_components/menstruation_cycle/sensor.py` | Sensor entity implementation |
| `custom_components/menstruation_cycle/storage.py` | Persistent storage and normalization |
| `custom_components/menstruation_cycle/services.yaml` | Service descriptions for Home Assistant UI |
| `custom_components/menstruation_cycle/statistics.py` | Analytics helpers and doctor-report generation |
| `custom_components/menstruation_cycle/www/*.js` | Lovelace custom cards and shared assets |
| `tests/*.js`, `tests/*.py` | Lightweight frontend and backend regression tests |

## Key concepts

### DOMAIN
`DOMAIN = "menstruation_cycle"` is the integration namespace used for:
- config-entry storage in `hass.data`
- service names such as `menstruation_cycle.refresh_cycle_model`
- HTTP paths like `/menstruation_cycle/...`
- dispatcher signals and resource registration keys

### STORAGE_KEY and persistence
`STORAGE_KEY = "menstruation_cycle.history"` is used by `storage.py` for persisted profile data. Stored blocks include:
- `history`
- `period_duration_days`
- `symptom_history`
- `product_usage`
- `pregnancy_data`
- `menarche_data`
- `pre_menarche_data`
- `menopause_data`
- `noncycle_data`
- `cycle_length_override`

### Legacy storage key support
`STORAGE_KEY_LEGACY = "menstruation_gauge.history"` allows migration from the older domain naming. `MenstruationStorage.async_load()` checks the current store first, then the legacy store.

### Services registration
`__init__.py` registers the domain services. Service definitions live in `services.yaml`, but the actual behavior and validation live in Python.

### Lovelace resource serving
`__init__.py` builds versioned resource URLs from `manifest.json` and registers the JS bundles as Lovelace module resources. This keeps HACS installs easier and reduces manual resource setup.

## Why this structure matters

- `manifest.json` is required so Home Assistant can load the integration at all.
- `hacs.json` makes the repository discoverable and correctly classified in HACS.
- `__init__.py`, `sensor.py`, and `config_flow.py` separate setup, entity exposure, and UI configuration.
- `storage.py` keeps history and related data persistent across restarts.
- `model.py` isolates domain calculations from Home Assistant-specific code.
- `www/*.js` contains the Lovelace resources served under `/menstruation_cycle/...`.
- `services.yaml` documents backend services in the Home Assistant service UI.

## Contributing guidelines

- Keep changes focused and small.
- Preserve backward compatibility where practical, especially for legacy card names and stored data.
- Update README or wiki pages when user-facing behavior changes.
- Prefer extending existing patterns instead of introducing parallel implementations.

## Code style expectations

- Follow existing Python and JavaScript style in nearby files.
- Reuse constants from `const.py` instead of repeating raw strings.
- Keep UI labels and service names aligned with translations and `services.yaml`.
- Avoid changing unrelated formatting while working on a narrow fix.

## How to add a new card

1. Add the new JS file under `custom_components/menstruation_cycle/www/`.
2. Register the custom element and `window.customCards` metadata.
3. Add the resource to the Lovelace resource tuple in `__init__.py`.
4. Add or update tests in `/tests` for rendering or config behavior.
5. Document the card in [`Cards-Documentation.md`](Cards-Documentation.md).

## How to add a new service

1. Define the service constant in `const.py`.
2. Add the service schema and handler in `__init__.py`.
3. Document it in `services.yaml` so it appears correctly in Home Assistant UI.
4. Add backend tests when the logic is non-trivial.
5. Add usage docs in [`Services-&-Automations.md`](Services-&-Automations.md).

## Testing approach

Current tests are lightweight and close to the changed surface:
- JavaScript card tests can be run directly with `node tests/<file>.test.js`
- Backend behavior is covered by targeted Python tests in `/tests`
- For docs-only changes, validate markdown structure, links, and affected examples manually

## Common pitfalls

- Forgetting to register a new frontend resource in `__init__.py`
- Breaking compatibility with the older `menstruation_gauge` naming where migration support still matters
- Updating frontend config options without updating editor UI or docs
- Assuming cache refresh is enough when a backend restart is required
- Adding new service behavior without reflecting it in `services.yaml`

## Future roadmap ideas

- richer symptom overlays in the heatmap
- more clinical export/reporting options
- broader household planning workflows
- additional frontend editors and visualizations
- expanded regression coverage for newer service areas
