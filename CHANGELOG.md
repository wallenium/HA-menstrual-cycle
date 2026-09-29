# Changelog

## 1.8.0

### Added
- Household overview panel: colored status boxes per cycle phase, member avatars with a hover/tap detail popup (opens downward, larger icons), a 30-day preview timeline, and a household cycle-synchrony metric.
- Logbook integration: product consumption, period start, and cycle-state changes now show up as readable, translated logbook entries (DE/EN/ES/FR/SV) instead of raw state changes.
- New entities: next-ovulation sensor, cycle-phase image entity, calendar entity, diagnostics platform, icon picker.
- Household inventory: low-stock repair issue, summary service, per-area product tracking.
- Cycle-day counter on the dashboard panel, weekly household digest blueprint, ICS calendar reminders, profile duplication.
- Full backup/restore flow with a schema-versioned export.

### Changed
- Reworked symptom-logging UI: single-line scrollable icon tiles, enlarged icons (matching the iOS app), added breast/digestion/pregnancy-symptom categories.
- Household avatars now get a deterministic per-profile accent color; profiles are grouped by current cycle state.

### Fixed
- Crash in profile label sync (wrong LabelRegistry API).
- "Day of the week" off-by-one bug (#255).
- Stale translation cache in the household summary.
- Backup import robustness (warning on implausibly close cycle-start dates).
