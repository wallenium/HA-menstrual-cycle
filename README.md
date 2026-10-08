# HA Menstruation Cycle

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
![Version](https://img.shields.io/badge/version-1.8.0-blue.svg)


HA Menstruation Cycle is a Home Assistant custom integration for tracking cycle history, showing cycle phases, and powering Lovelace dashboards with interactive menstrual-cycle cards.

It combines a Home Assistant integration, per-profile sensors, local data storage, and a frontend card set so households can keep the setup inside Home Assistant instead of spreading data across separate tools. The project supports multiple profiles, visual dashboards, product usage tracking, symptom logging, and export workflows.

## Why use it?

- HACS-ready Home Assistant integration with UI-based setup
- Multiple profiles for shared households
- Interactive cards for cycle entry, calendar views, history, heatmaps, timers, and statistics
- Services for history management, symptom logging, exports, inventory workflows, and automations
- Automatic frontend resource registration when installed through the integration
- Local-first storage inside Home Assistant

## Entities

Each profile creates these entities (`<name>` is the slugified profile name):

| Entity | Purpose |
|--------|---------|
| `sensor.menstruation_<name>` | Main cycle status (period, fertile, PMS, neutral, pregnant, ...) with all cycle data as attributes. Shows a state-based icon unless you set your own icon. |
| `sensor.menstruation_<name>_next_ovulation` | Date of the next predicted ovulation. |
| `sensor.menstruation_<name>_cycle_length` | Length of the last completed cycle in days, with Home Assistant long-term statistics so you can chart it over months. |
| `sensor.menstruation_<name>_products_today` | Period products used today (usage statistics). |
| `sensor.menstruation_<name>_basal_temp` | Basal body temperature, when a temperature sensor is linked. |
| `calendar.menstruation_<name>_cycle` | Predicted period, fertile window and ovulation (plus the routine check-up) as a native calendar. Can be switched off per profile in the options. Three more options (off by default) add the pregnancy due date, contraception dates (renewal due, end of the pill pack, next patch/ring steps) and your logged periods of the last 12 months; these also go into the calendar feed (ICS) and show only at visibility "Full" in the calendar. |
| `image.menstruation_<name>_cycle_phase` | Illustration of the current phase, for picture cards and wall tablets. |
| `todo.menstruation_<name>_hospital_bag` | Editable hospital-bag checklist, only available during a pregnancy. Pre-filled in the Home Assistant language (German, English, Spanish, French, Swedish; English otherwise). |

Entities follow the profile's visibility level: at "Private" nothing is shown, at "Status only" only period events remain in the calendar. Cycle events (state change, period start, pill intake, product usage) also appear as readable entries in the Home Assistant logbook, and repair issues point out things like an old calendar feed (ICS) token an unreachable notify target, or pregnancy mode still being on 14 days after the due date.

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

## Notifications

The integration can notify you itself (**Configure → Notifications**), no automation needed. Switch on **Enable notifications** and pick a notify target such as `mobile_app_myphone`; with no target, a persistent notification in the HA UI is used. All settings are per profile.

| Notification | Sent when | Option | Default |
|---|---|---|---|
| Period reminder | a set number of days before the predicted start | Notify before period starts (+ days ahead) | on, 1 day |
| Fertile window | a set number of days before the window starts | Notify when fertile window starts (+ days ahead) | on, same day |
| Ovulation | a set number of days before the estimated ovulation | Notify when ovulation is estimated (+ days ahead) | off |
| Cycle recap | a new cycle start was logged (length and period duration of the finished cycle, compared with the average, plus pain days) | Recap after each cycle | off |
| Period overdue | the period is 7 days past its predicted start and not logged (only with reliable predictions) | Notify when the period is overdue | off |
| Checkup | 14 days before the next checkup is due, or once if already overdue | Notify before a checkup is due (+ checkup interval, 0 = off) | off, 12 months |
| Log reminder | nothing was logged for today yet | Evening reminder to log (+ time) | off, 20:00 |
| Pill reminder | today's pill is not logged yet, plus an optional follow-up after 1-12 hours | Pill reminder (+ time, follow-up) | off, 09:00 |
| Pill hint | 2 or more days in a row without a logged pill (neutral hint to check the leaflet) | Hint when pill intakes are missing | off |
| Patch / ring | on each step of the usual 28-day rhythm (patch: change on days 7 and 14, remove on day 21, new patch on day 28; ring: remove on day 21, new ring on day 28), sent with the pill reminder time | Pill reminder (also covers patch and ring) | off |
| Pregnancy week | pregnancy mode is on: one short, neutral message per week on the weekday of the pregnancy start (current week and calculated due date), with a trimester note when the 2nd or 3rd trimester begins (no medical advice) | Weekly pregnancy message | off |
| Unusual cycle length | with a new period start: the last three cycles were all shorter than 21 or all longer than 38 days, or the last cycle was 10+ days off your average; one neutral hint to mention it at the next check-up (no diagnosis; a streak is announced once) | Hint for an unusual cycle length | off |
| Pregnancy test timing | 14 days after an ovulation confirmed by your temperature and mucus/cervix logs (for people trying to conceive): one neutral message that a test is meaningful from about now; a rule of thumb, no medical advice; skipped while the fertility notifications are muted for hormonal contraception | Pregnancy test timing hint | off |
| Ovulation test start | 7 days before the expected ovulation (window of 3 days), once per cycle: one neutral message that now is a good time to start ovulation (LH) tests; not sent once a positive LH test or a confirmed ovulation moved the estimate; skipped while the fertility notifications are muted for hormonal contraception | Hint to start ovulation tests | off |
| Basal temperature | At the notification time from the start of the fertile window until 3 days after the expected ovulation, as long as no temperature rise is confirmed: reminds you to measure and log your temperature; only if you logged it on at least 3 of the last 7 days and not yet today | Basal temperature reminder | off |
| Unprotected intercourse | unprotected intercourse was logged for today or one of the last 5 days: one neutral hint to ask a pharmacy or doctor about emergency contraception (no dosing or medical advice; not during pregnancy or menopause) | Hint after unprotected intercourse | off |
| Badges | a new progress badge was unlocked | part of the date reminders | with notifications |

Date reminders, the recap, overdue and checkup notifications are sent at **Notification time** (default 08:00).

- **Pill pack break:** set **Pill break (days per pack)** (for example 7 for a 21+7 pack) so no reminder is sent during the break. It also lets the integration add "order a new pill pack" to the shopping list a few days before the pack ends.
- **Buttons** (mobile app targets only): *Period started*, *Pill taken*, *Started today* (on the patch and ring reminders that start a new pack) and *Remind me in 1 hour*. A snooze survives a Home Assistant restart.
- **Bleeding without a period:** `menstruation_cycle.repair_storage` reports logged bleeding that never became a period; `menstruation_cycle.create_periods_from_bleeding` adds those days (bleeding within 14 days after a period day counts as bleeding outside the period and is not turned into a period). The doctor report lists such bleeding in its own neutral section.
- **Contraception renewal:** the renewal reminder for an IUD, implant or injection counts from the first day the method was logged. After a renewal (or a new patch/ring pack) call `menstruation_cycle.confirm_contraception_renewal` or use the button in the dashboard; the period or the patch/ring rhythm then counts from that day.
- **Hormonal methods:** *No fertility notifications on hormonal contraception* skips the fertile-window and ovulation messages while the current method is hormonal. The sensor state and the dashboard stay unchanged.
- **Partner target:** an optional second notify target that only receives the date reminders (period; fertile window and ovulation only at visibility level "Full"), never health details. Nothing is sent for private profiles.
- **Check your setup:** call the service `menstruation_cycle.send_test_notification` (Developer tools → Actions). If the target does not exist or fails, a repair issue appears under **Settings → Repairs** and disappears again after the next successful delivery.

## Blueprints

Ready-made automations for the common cases. Click **Import** to add one to Home Assistant (or paste the file URL under **Settings → Automations & Scenes → Blueprints → Import Blueprint**).

| Blueprint | What it does | |
|---|---|---|
| Basal temperature reminder | Daily reminder at a fixed time to log the basal body temperature. | [Import](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fwallenium%2FHA-menstrual-cycle%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fmenstruation_cycle%2Fbasal_temp_reminder.yaml) |
| Contraception renewal in calendar | Calendar event ahead of an IUD, implant or injection renewal. | [Import](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fwallenium%2FHA-menstrual-cycle%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fmenstruation_cycle%2Fcontraception_renewal_calendar.yaml) |
| Light during the fertile window | Sets lights to a colour while the fertile window is active. | [Import](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fwallenium%2FHA-menstrual-cycle%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fmenstruation_cycle%2Ffertile_window_light.yaml) |
| Scene on heavy bleeding | Activates a scene when heavy or very heavy bleeding is logged. | [Import](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fwallenium%2FHA-menstrual-cycle%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fmenstruation_cycle%2Fheavy_bleeding_scene.yaml) |
| Weekly household digest | One combined weekly overview across all profiles. | [Import](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fwallenium%2FHA-menstrual-cycle%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fmenstruation_cycle%2Fhousehold_weekly_digest.yaml) |
| Irregularity alert | Notifies when the cycle regularity drops below a threshold. | [Import](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fwallenium%2FHA-menstrual-cycle%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fmenstruation_cycle%2Firregularity_alert.yaml) |
| Notify on period start | Notification the moment a period is confirmed. | [Import](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fwallenium%2FHA-menstrual-cycle%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fmenstruation_cycle%2Fnotify_period_start.yaml) |
| Ovulation confirmed | Notification once the NFP analysis confirms a temperature rise. | [Import](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fwallenium%2FHA-menstrual-cycle%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fmenstruation_cycle%2Fovulation_confirmed.yaml) |
| Period as calendar block | Multi-day calendar event from the actual start to the predicted end. | [Import](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fwallenium%2FHA-menstrual-cycle%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fmenstruation_cycle%2Fperiod_calendar_block.yaml) |
| Pill not taken escalation | Runs your own actions when today's pill is still not logged at a chosen time. | [Import](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fwallenium%2FHA-menstrual-cycle%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fmenstruation_cycle%2Fpill_not_taken_escalation.yaml) |
| Light during PMS | Sets lights to a colour while the PMS phase is active. | [Import](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fwallenium%2FHA-menstrual-cycle%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fmenstruation_cycle%2Fpms_light.yaml) |
| Action on cycle state | Runs any action when a profile enters a chosen state (period, fertile, ...). | [Import](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fwallenium%2FHA-menstrual-cycle%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fmenstruation_cycle%2Fprofile_state_action.yaml) |

For your own automations the integration also fires the events `menstruation_cycle_cycle_start_logged`, `menstruation_cycle_pill_taken` (data: `entry_id`, `profile`, `friendly_name`, `date`; not fired for private profiles), `menstruation_cycle_product_consumed` and `menstruation_cycle_state_changed`.

## Disclaimer summary

This project is a convenience and visualization tool. It is **not** a medical device and must not be used as a reliable standalone method for contraception, conception planning, diagnosis, or safety-critical decisions.

Before using it in a shared household or for sensitive automations:
- treat predictions as approximations
- use automations only with explicit agreement from the affected people
- keep health, privacy, and backup considerations in mind

Read the full disclaimer in [`Disclaimer`](https://github.com/wallenium/HA-menstrual-cycle/wiki/DISCLAIMER).

## Onboarding stages and confidence gating

The integration now supports stage-aware onboarding and forecast confidence gating:

- **pre_menarche** – educational mode before the first period. Deterministic period/ovulation predictions are suppressed.
- **early_menarche** – learning phase after the first period when history is sparse/irregular. Forecasts are shown as broader possible windows with low confidence by default.
- **established_cycle** – standard cycle forecasting. If data quality is still too low, read-only display logic can temporarily downgrade to learning-phase behavior.

### How predictions differ by stage

- **Pre-menarche:** no precise cycle-day claims; emphasis is on neutral tracking/supportive messaging.
- **Early menarche:** low-data users get uncertainty-aware windows (for example “possible period window”) and ovulation-day precision is withheld until data quality thresholds are met.
- **Established cycle:** prior behavior is retained unless confidence gates detect insufficient quality (too few valid cycles, high variability, or too few recent logs).

### Confidence/data-quality gates

High-precision outputs are only shown when all required checks pass:

- minimum valid cycle count
- acceptable cycle variability bounds
- sufficient recent log activity

Otherwise the integration degrades to low-confidence window output and suppresses precise ovulation claims.

### Switching stage later

You can change the onboarding stage at any time in **Settings → Devices & Services → Menstruation Cycle → Configure** (`onboarding_stage` option).

## Young Girls Support

The `custom:menstruation-support-card` provides age-appropriate, practical education and low-anxiety support for pre-/early-menarche users. It has **no effect on forecast logic** — it is a UI-only card.

### Included content modules

| Module | Description |
|--------|-------------|
| 🗓️ School-day helper reminders | Configurable, discreet reminder presets: kit check, drink water, comfort check-in, rest cue |
| 📖 Glossary | Plain-language definitions for *cycle*, *ovulation*, and *spotting*, with optional "learn more" expansion |
| 🔵 Cycle phases graphic | Abstract SVG donut chart of period / follicular / ovulation / luteal phases with legend and ARIA description |
| 🧼 Hygiene how-to cards | Step-by-step guides for washing period underwear and using a period cup (basics) |
| 💛 Reassurance cards | Short "Is this normal?" cards covering irregular timing, flow variation, and spotting, each with a gentle escalation prompt |

### Visibility

- Shown **by default** in `pre_menarche` and `early_menarche` modes.
- Hidden by default in `established_cycle` mode; set the internal `_showInEstablished` flag or use a conditional card to display it when desired.

### Reminder configuration

Reminders are rendered as a settings panel inside the card. Each preset can be toggled on/off and assigned a preferred time. School-day-only reminders are labelled accordingly. Quiet hours can be enabled to suppress reminders between configurable start and end times.

> **Note:** The card renders reminder previews only. To send actual notifications, connect the reminder state to a Home Assistant automation using the notification service of your choice.

### Educational content scope and disclaimers

All content is for **educational purposes only** and must not be used as medical advice. Each content module includes a visible disclaimer. Users are encouraged to follow the instructions provided with their hygiene products and to consult a clinician for medical questions.

### Localization

All user-facing strings in the Young Girls Support card use i18n keys (`ygs_*`). Translations are provided for English (🇬🇧), German (🇩🇪), Swedish (🇸🇪), French (🇫🇷), and Spanish (🇪🇸). To add or improve a translation, edit the corresponding file in `custom_components/menstruation_cycle/www/translations/`.

### Accessibility

- The cycle phases SVG includes `role="img"`, `aria-label`, and a hidden `<desc>` element for screen readers.
- Non-colour-only meaning: every phase has a text label in the legend alongside its colour dot.
- Toggle controls use visible focus styles.
- Reduced-motion: any future animations must respect `prefers-reduced-motion`; the current SVG graphic is static.

## Cycle Dashboard (optional sidebar page)

The integration now includes an optional **Cycle Dashboard** sidebar page for a fast daily workflow.

### Enable / disable

1. Open **Settings → Devices & Services → Menstruation Cycle → Configure**.
2. Enable **Show Cycle Dashboard in sidebar**.
3. (Optional) Set **Prefer Cycle Dashboard as start page** as a preference flag for setups that support default-page behavior.

If the sidebar toggle is disabled, existing cards and views continue to work unchanged.

### Dashboard customization

- Use **Edit dashboard** to:
  - show/hide cards
  - reorder cards (up/down)
  - toggle discreet mode
  - optionally set display name/pronouns for the My Info mini-card
- Preferences are stored per user and profile.

### Mode presets

- **Young mode** (`pre_menarche` / `early_menarche`): simpler default layout with discreet mode enabled.
- **General mode** (`established_cycle`): richer default layout with more insight cards.
- Users can reset back to mode defaults at any time from Edit mode.

### Privacy / discreet behavior

- Discreet mode uses more neutral wording in overview content.
- Sensitive cards can be hidden individually.
- My Info card is optional and can stay hidden.

## Translations

| Language | Status |
|----------|--------|
| 🇬🇧 English | ✅ 100% |
| 🇩🇪 German | ✅ 100% |
| 🇸🇪 Swedish | ✅ Complete – native review welcome |
| 🇫🇷 French | ✅ Complete – native review welcome |
| 🇪🇸 Spanish | ✅ Complete – native review welcome |

Swedish, French and Spanish are fully translated but not yet reviewed by native speakers, so corrections are very welcome. See [Translation Section](https://github.com/wallenium/HA-menstrual-cycle/wiki/Translation-&-l18n) for instructions on how to contribute a translation.

## Contributing and feedback

Feedback, ideas, bug reports, edge cases, and pull requests are welcome. If you want to improve documentation, add cards, refine services, or help with testing, please open an issue or PR.

AI was used to help draft parts of the code and English wording, while the project idea and implementation direction remain human-authored.
