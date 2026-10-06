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
- Shopping-list entries (products, underwear washing, contraception renewal, pill pack) are written in the Home Assistant language; an entry in another language still counts as a duplicate.
- `icons.json`: every service has its own icon, and the main cycle sensor shows a state-based icon (period, fertile, PMS, pregnancy, ...) unless a custom icon is set for the profile.
- The cycle recap notification now also compares the finished cycle with the average of the cycles before and names the pain days (DE/EN/ES/FR/SV).
- New service `get_last_cycle_summary`: summary of the last completed cycle (length compared with the earlier average, period and pain days, logged days, most frequent symptoms, bleeding-strength distribution) as a service response.
- Dashboard panel: new "Last completed cycle" entry in the cycle insights widget (length vs. average, period days, pain days), based on `get_last_cycle_summary`, with a small bar chart of the latest cycle lengths (`get_last_cycle_summary` now also returns `recent_cycle_lengths`).
- New service `confirm_contraception_renewal` (and a button in the dashboard): restarts the renewal period of an IUD, implant or injection from the given day (default today), or marks the start of a new patch/ring pack.
- Patch and ring: the dashboard shows the next step of the usual 28-day rhythm, and the pill reminder time also reminds on the change days (new-pack days come with a "Started today" button). The sensor attribute `contraception_status` gained `renewal_since` and `rhythm`.
- New option "No fertility notifications on hormonal contraception" (off by default): skips the fertile-window and ovulation notifications while the current method is hormonal.
- New option "Hint after unprotected intercourse" (off by default): one neutral hint to ask a pharmacy or doctor about emergency contraception when unprotected intercourse is logged for today or the last 5 days.
- The doctor report now lists the history of contraception methods (from/until, renewals), and the diaphragm has a label in every language.
- New sensor `sensor.menstruation_<name>_cycle_length`: length of the last completed cycle in days as a measurement with long-term statistics (average of the earlier cycles as attribute; only at visibility "Full").

### Changed
- Reworked symptom-logging UI: single-line scrollable icon tiles, enlarged icons (matching the iOS app), added breast/digestion/pregnancy-symptom categories.
- Household avatars now get a deterministic per-profile accent color; profiles are grouped by current cycle state.
- 28 services that were only described in English now have names, descriptions and field labels in DE/EN/ES/FR/SV.
- Card texts that fell back to English in German (calendar, statistics, support, history, timer cards) are translated; dashboard texts were completed in ES/FR/SV.
- Cards and dashboard panel now load the translation file of any language that has one (Spanish, French and Swedish were never loaded before); other languages use English.

### Fixed
- Several places used the system clock (`date.today()`) instead of Home Assistant's time zone to decide what "today" is (cycle model at the midnight run and on load, calendar, ICS feed, hospital-bag reminder, cycle predictions, date checks in the options form); around midnight they could work with the wrong day. A test now guards against it.
- The basal-temperature import from a linked sensor only ran at midnight and on load, when the sensor still held yesterday's value: that value was stored under the new day and blocked the real morning reading. The import now runs when the sensor updates (and when the option is saved), stores a reading under the day it was taken, and ignores readings older than yesterday.
- The renewal reminder for an IUD, implant or injection counted from the very first log of the method, so re-logging the same method after a renewal (for example every injection) left it overdue forever. A confirmed renewal now restarts the period.
- The shopping-list text for the renewal showed the internal method key (`hormonal_iud`); it now uses the localized name, and items written by older versions still count as duplicates.
- The cycle insights widget showed the raw text `dashboard_cycle_comparison_basis` instead of "based on N cycles" (translation was missing in all languages). A test now checks that every literal key used by the panel is translated.
- hassfest rejected the service descriptions of `export_history` and `export_doctor_report` (the text `<config>` looked like HTML); the same placeholder was also removed from the calendar option text in DE/ES/FR/SV.
- Crash in profile label sync (wrong LabelRegistry API).
- "Day of the week" off-by-one bug (#255).
- Stale translation cache in the household summary.
- Backup import robustness (warning on implausibly close cycle-start dates).
- `import_full_backup` did not restore the hospital-bag checklist, although `export_full_backup` wrote it.
- The diagnostics download exposed the partner notify target, the basal-temperature sensor entity and a legacy profile name; they are redacted now.
- Services `compare_current_cycle`, `export_doctor_report`, `get_cycle_predictions`, dashboard-preference, household-summary, profile-visibility and basal-temperature reimport services stayed registered after the last entry was removed.
