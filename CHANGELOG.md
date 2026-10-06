# Changelog

## 1.8.0

### Added
- Household overview panel: colored status boxes per cycle phase, member avatars with a hover/tap detail popup (opens downward, larger icons), a 30-day preview timeline, and a household cycle-synchrony metric.
- Logbook integration: product consumption, period start, and cycle-state changes now show up as readable, translated logbook entries (DE/EN/ES/FR/SV) instead of raw state changes.
- New entities: next-ovulation sensor, cycle-phase image entity, calendar entity, diagnostics platform, icon picker.
- Household inventory: low-stock repair issue, summary service, per-area product tracking.
- Cycle-day counter on the dashboard panel, weekly household digest blueprint, ICS calendar reminders, profile duplication.
- Full backup/restore flow with a schema-versioned export.
- Notifications: overdue-period, check-up due and pill-gap reminders, a pill refill to-do, and mobile-app action buttons with snooze (snoozes survive a restart).
- `send_test_notification` service and a repair issue when the configured notify target is unavailable.
- Notification, pill, tracking and life-stage options are grouped into sections in the options form.
- The doctor report is available in German, English, Spanish, French and Swedish (service, statistics card and report texts).
- Service dropdowns (inventory action, body signs, visibility level, import mode, formats) show translated labels instead of raw values.
- Blueprints and README now document the notification and blueprint setup.
- The hospital-bag checklist is pre-filled in the Home Assistant language (German, English, Spanish, French or Swedish; English otherwise). Existing checklists stay unchanged.

### Changed
- Reworked symptom-logging UI: single-line scrollable icon tiles, enlarged icons (matching the iOS app), added breast/digestion/pregnancy-symptom categories.
- Household avatars now get a deterministic per-profile accent color; profiles are grouped by current cycle state.
- 28 services that were only described in English now have names, descriptions and field labels in DE/EN/ES/FR/SV.
- Card texts that fell back to English in German (calendar, statistics, support, history, timer cards) are translated; dashboard texts were completed in ES/FR/SV.
- Cards and dashboard panel now load the translation file of any language that has one (Spanish, French and Swedish were never loaded before); other languages use English.

### Fixed
- Crash in profile label sync (wrong LabelRegistry API).
- "Day of the week" off-by-one bug (#255).
- Stale translation cache in the household summary.
- Backup import robustness (warning on implausibly close cycle-start dates).
- `import_full_backup` did not restore the hospital-bag checklist, although `export_full_backup` wrote it.
- The diagnostics download exposed the partner notify target, the basal-temperature sensor entity and a legacy profile name; they are redacted now.
- Services `compare_current_cycle`, `export_doctor_report`, `get_cycle_predictions`, dashboard-preference, household-summary, profile-visibility and basal-temperature reimport services stayed registered after the last entry was removed.
