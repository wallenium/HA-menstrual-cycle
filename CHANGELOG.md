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
- New repair issue "Pregnancy mode is still active after the due date": appears 14 days after the calculated due date while pregnancy mode is still on and points to `set_pregnancy_mode` / `update_pregnancy_date` (DE/EN/ES/FR/SV).
- New options "Calendar: pregnancy due date" and "Calendar: contraception dates" (both off by default): add the due date, or the renewal date (IUD, implant, injection), the end of the pill pack and the next patch/ring steps, to the calendar entity (visibility "Full" only) and the ICS feed.
- New option "Weekly pregnancy message" (off by default): one neutral message per week on the weekday of the pregnancy start, plus a note at the start of the 2nd and 3rd trimester.
- New sensor `sensor.menstruation_<name>_cycle_length`: length of the last completed cycle in days as a measurement with long-term statistics (average of the earlier cycles as attribute; only at visibility "Full").
- Dashboard panel: "Period started" / "Period ended" buttons (today, yesterday or two days ago) next to the quick-log tiles.
- New repair finding in `repair_storage` / the storage repair: "bleeding without a period" (logged bleeding that never became a period) and the new service `create_periods_from_bleeding`, which adds those days with the same 14-day rule as logging bleeding (returns the added dates).
- New option "Calendar: logged periods" (off by default): your logged periods of the last 12 months appear as multi-day events in the calendar entity (visibility "Full") and in the ICS feed, not only the predictions.
- Doctor report: new section "Bleeding outside the period" (date and strength, no assessment) for bleeding logged within 14 days after a period day; `compute_statistics` returns `intermenstrual_bleeding` and `intermenstrual_bleeding_days`. Only shown when there is such bleeding.
- Calendar card (and the calendar in the dashboard): days with bleeding outside the period (within 14 days after a period day) get a small red ring and a tooltip; no judgement.
- Doctor report: new "Cycle overview" table with one row per analysed cycle (newest first): start, length (the running cycle shows "ongoing"), period days, pain days and days with bleeding outside the period; `compute_statistics` returns it as `cycle_table`.
- Doctor report: the luteal phase (first raised basal temperature until the next period, completed cycles only, 5-25 days) as average/min/max when the temperature rise was confirmed; `compute_statistics` returns `luteal_phase_avg/_min/_max/_cycles`.
- Prediction accuracy looking back: for the last 6 completed cycles the next-period prediction is rebuilt from the data known at the time and compared with the real start (mean miss in days, cycles within 2 days). Shown in the doctor report, in the dashboard's cycle insights and in `get_last_cycle_summary` (`prediction_accuracy`).
- New option "Hint for an unusual cycle length" (off by default, notifications): one neutral hint (no diagnosis) with a new period start when the last three cycles were all shorter than 21 or all longer than 38 days, or the last cycle was 10 or more days off the average of the earlier ones. A streak is announced once, not with every further cycle.

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
- The repair dialogs of the three fixable issues (rename entities, rotate calendar token, migrate old integration) opened empty after clicking "Fix" because the form texts (`fix_flow`) were missing in all languages; they are added now, and the rename list is shown as a bullet list. For these issues the text now lives only in the fix form (hassfest does not allow both `description` and `fix_flow`). Tests check that every fixable issue has its form text and that the flow supplies its placeholders.
- The statistics, gauge and calendar cards read `symptom_history` and `product_usage_timeline` only from the sensor attributes, which are dropped when a profile has a lot of data (the heatmap and the dashboard panel already reloaded them). The cards now fetch the lists with `get_full_history` when the attribute is missing, so the symptom distribution, the past symptom dots and the product timeline stay filled.
- The harmless Lovelace-helper import message in the debug log no longer prints a traceback.
- Logging a bleeding strength as a symptom (the only way in the dashboard panel) only continued a running period and never started a new one, so a bleeding without a logged period start stayed without a period. It now starts a period when no period day was recorded in the 14 days before and the profile is not pregnant; bleeding closer to the last period still counts as intermenstrual.
- The countdown/product timer card in the dashboard panel stayed empty ("IDLE") because the panel passed no entity to it; it now gets the selected profile's main cycle sensor.
- The calendar card read the symptom entries as nested objects although they are stored flat, so the dot for days with logged symptoms never appeared (and the edit dialog's fallback was empty); both shapes are accepted now.
- Crash in profile label sync (wrong LabelRegistry API).
- "Day of the week" off-by-one bug (#255).
- Stale translation cache in the household summary.
- Backup import robustness (warning on implausibly close cycle-start dates).
- `import_full_backup` did not restore the hospital-bag checklist, although `export_full_backup` wrote it.
- The diagnostics download exposed the partner notify target, the basal-temperature sensor entity and a legacy profile name; they are redacted now.
- Services `compare_current_cycle`, `export_doctor_report`, `get_cycle_predictions`, dashboard-preference, household-summary, profile-visibility and basal-temperature reimport services stayed registered after the last entry was removed.
