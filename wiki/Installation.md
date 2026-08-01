# Installation

This guide covers HACS installation, manual installation, resource registration, cache clearing, restarts, and the most common first-run problems.

## Install with HACS

### Step 1 - Add the repository
1. Open **HACS**.
2. Add a custom repository: `git: /wallenium/HA-menstrual-cycle`.
3. Category: **Integration**.

### Step 2 - Install the integration
1. Search for **Menstruation Cycle**.
2. Install it.
3. Restart Home Assistant when prompted.

### Step 3 - Add the integration in Home Assistant
1. Open **Settings → Devices & Services**.
2. Click **Add Integration**.
3. Search for **Menstruation Cycle**.
4. Create the first profile with a friendly name and icon.

### Step 4 - Add a dashboard card
After the restart, the integration registers its card resources automatically. Add a manual card with:

```yaml
type: custom:menstruation-cycle-card
entity: sensor.anna
title: Cycle Overview
show_editor: true
show_fertile_period: true
calendar_edit_enabled: true
```

### Step 5 - Add the daily refresh automation
Import or recreate [`/examples/daily_recalculate_days_until_next_start.yaml`](../examples/daily_recalculate_days_until_next_start.yaml) so date-based values such as `days_until_next_start` stay current.

```yaml
alias: Menstruation Cycle - Daily Recalculate days_until_next_start
trigger:
  - platform: time
    at: "00:00:05"
action:
  - service: menstruation_cycle.refresh_cycle_model
    data: {}
```

## Manual installation (without HACS)

1. Copy `/home/runner/work/HA-menstrual-cycle/HA-menstrual-cycle/custom_components/menstruation_cycle` to your Home Assistant config directory as `/config/custom_components/menstruation_cycle`.
2. Restart Home Assistant.
3. Open **Settings → Dashboards → Resources** and register these JavaScript module resources:

| Resource | Type |
| --- | --- |
| `/menstruation_cycle/menstruation-cycle-card.js` | JavaScript module |
| `/menstruation_cycle/menstruation-cycle-card-compact.js` | JavaScript module |
| `/menstruation_cycle/menstruation-cycle-compact-status-card.js` | JavaScript module |
| `/menstruation_cycle/menstruation-cycle-history-card-row.js` | JavaScript module |
| `/menstruation_cycle/menstruation-cycle-heatmap-card.js` | JavaScript module |
| `/menstruation_cycle/menstruation-calendar-card.js` | JavaScript module |
| `/menstruation_cycle/menstruation-countdown-timer.js` | JavaScript module |
| `/menstruation_cycle/menstruation-product-inventory-card.js` | JavaScript module |
| `/menstruation_cycle/menstruation-statistics-card.js` | JavaScript module |

Optional shared helper resource if you want to load it explicitly:

| Optional helper | Type |
| --- | --- |
| `/menstruation_cycle/menstruation-icons.js` | JavaScript module |

4. Add the integration under **Settings → Devices & Services**.
5. Add one profile per tracked person.
6. Add cards to your dashboard.

## Screenshots and visual references

### Main dashboard example
<img width="1016" height="431" alt="HA Menstruation Cycle dashboard" src="https://github.com/user-attachments/assets/6c516de7-4b1e-4c1c-aa3d-2e9d753a8987" />

### Heatmap example
<img width="1000" height="592" alt="Heatmap example" src="https://github.com/user-attachments/assets/9b5759bd-f343-4640-b7cb-f79e4c6b0847" />

### Theme examples
<img width="494" height="779" alt="Light theme example" src="https://github.com/user-attachments/assets/1ab5a772-8bcb-4936-aacf-fe19266a6a31" />
<img width="494" height="779" alt="Dark theme example" src="https://github.com/user-attachments/assets/850b9750-fd2f-48fc-80b7-90cd182b4fe0" />

## Restart procedures

Use a full Home Assistant restart after:
- installing the integration
- copying files manually into `custom_components`
- updating card files manually
- changing dashboard resources

A browser-only refresh is not enough for backend changes.

## Browser cache clearing tips

If cards still show an old frontend after an upgrade:
- refresh the page with cache bypass once
- fully close and reopen the Home Assistant tab
- clear the app or browser cache if you use the HA Companion app
- confirm that the old resource URL is not still registered in dashboard resources

## Common setup issues and solutions

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Integration not listed in HACS | Custom repo not added correctly | Re-add `git: /wallenium/HA-menstrual-cycle` as an Integration repository |
| Cards do not appear | Missing resource registration or stale cache | Restart HA, verify resources, then clear browser cache |
| `Custom element doesn't exist` | Wrong card type or missing JS resource | Confirm the exact `custom:` type and resource URL |
| Services are missing | Integration not loaded yet | Restart HA and verify the integration is configured |
| Sensor stays unavailable | Profile setup incomplete or entity renamed | Reopen the integration and check the created sensor entity IDs |
| Manual install works partly but not fully | Some resources were skipped | Register all 9 card resources listed above |
| Old card still used after update | Browser cached prior JS bundle | Force reload or clear cache |

## First-run checklist

- [ ] Integration installed
- [ ] Home Assistant restarted
- [ ] Profile created
- [ ] Sensor entity confirmed
- [ ] Daily refresh automation added
- [ ] At least one dashboard card added
- [ ] Cache cleared if the frontend looks outdated
