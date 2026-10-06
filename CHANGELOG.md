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
- Blueprints and README now document the notification and blueprint setup.

### Changed
- Reworked symptom-logging UI: single-line scrollable icon tiles, enlarged icons (matching the iOS app), added breast/digestion/pregnancy-symptom categories.
- Household avatars now get a deterministic per-profile accent color; profiles are grouped by current cycle state.

### Fixed
- Crash in profile label sync (wrong LabelRegistry API).
- "Day of the week" off-by-one bug (#255).
- Stale translation cache in the household summary.
- Backup import robustness (warning on implausibly close cycle-start dates).
- `import_full_backup` did not restore the hospital-bag checklist, although `export_full_backup` wrote it.
- Services `compare_current_cycle`, `export_doctor_report`, `get_cycle_predictions`, dashboard-preference, household-summary, profile-visibility and basal-temperature reimport services stayed registered after the last entry was removed.
