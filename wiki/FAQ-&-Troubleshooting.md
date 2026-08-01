# FAQ & Troubleshooting

## FAQ

### How do I add another person's profile?
Add the integration again or add another profile through the existing integration flow, then place separate cards that point to that profile's sensor entity.

### Can I import my history from another app?
Yes. Convert your historical start dates into `YYYY-MM-DD` values and use `menstruation_cycle.set_cycle_history`.

### How do I back up my data?
Use `menstruation_cycle.export_history` for cycle history exports and `menstruation_cycle.export_doctor_report` when you want an HTML summary. Keep normal Home Assistant backups as well.

### How do I delete all data?
Use `menstruation_cycle.erase_all_history` with an explicit `entity_id` and `erase_all: true`.

### Does the integration support multiple profiles?
Yes. Multi-profile use is one of the main design goals. Target automations and cards with the correct `entity_id`.

### HACS or manual installation?
HACS is easier because it handles updates and automatic resource registration. Manual installation works, but you must copy the component and register every frontend resource yourself.

### Where is data stored?
Cycle history and related data are stored locally in Home Assistant storage via the integration's storage helpers.

### Can I use this for contraception or conception planning?
No. Predictions are approximations and the project is not a medical device.

### Can I log product usage and symptoms?
Yes. Use the countdown timer, statistics flows, or call `menstruation_cycle.log_product_usage` and `menstruation_cycle.add_symptom` directly.

### What about pregnancy, menarche, or menopause states?
The integration includes dedicated services and sensor handling for those lifecycle modes.

## Troubleshooting

### Why are my cards not showing?
Usually one of these is true:
- the JS resource is missing
- the browser is using a stale cached bundle
- the card type is wrong

Check the resource list in [Installation](Installation.md), then reload the browser cache.

### I get `Custom element doesn't exist`.
Verify the card type exactly:
- `custom:menstruation-cycle-card`
- `custom:menstruation-cycle-compact-status`
- `custom:menstruation-calendar-card`
- `custom:menstruation-cycle-history-card-row`
- `custom:menstruation-cycle-heatmap-card`
- `custom:menstruation-countdown-timer`
- `custom:menstruation-product-inventory-card`
- `custom:menstruation-statistics-card`

### Services are not found.
Restart Home Assistant and confirm the integration loaded successfully. Services are registered by the backend, so frontend reloads alone are not enough.

### The sensor is not updating.
Add the daily refresh automation for `menstruation_cycle.refresh_cycle_model`. Without it, date-based values do not automatically roll forward once per day.

### Browser cache issues after an update.
Try this order:
1. Hard refresh the page
2. Close and reopen the tab
3. Clear browser or app cache
4. Re-check dashboard resources

### Manual installation partly works, but some cards fail.
One or more resource URLs were probably skipped. Register all 9 card resources, not just the main card.

### My dashboard still references the old gauge name.
The legacy `custom:menstruation-gauge-card` name still exists for compatibility, but new setups should use `custom:menstruation-cycle-card`.

### Why does export create files locally instead of downloading immediately?
Exports are written to `<config>/menstruation_cycle_exports/` so they remain available inside your Home Assistant environment.

### How do I sync multi-profile automations correctly?
Write one automation per profile when the behavior differs, or use a shared automation that targets all profiles by leaving the refresh service unscoped.

### Is performance a concern with many cards?
Usually no for normal households, but very dense dashboards render faster if you split daily views and analytics views across separate dashboards.

### The statistics card looks empty.
It becomes more useful after history and product usage data exist. Log a few cycles or hygiene events first.

### The inventory card does not match our household stock.
Initialize it with `menstruation_cycle.manage_household_inventory`, then set thresholds and update quantities.

### Can I recover erased data?
Not reliably through the integration. Treat erasure as destructive and keep backups.

### Does this work with the HA Companion app?
Yes, but app cache behavior can lag behind browser behavior after frontend updates, so clearing the app cache may be necessary.

## Safe-use reminders

- Use the project for visibility and support, not medical certainty.
- Get explicit agreement before using shared notifications or automations.
- Keep backups if the stored data matters to you.
