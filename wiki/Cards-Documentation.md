# Cards & Configuration

This page documents every frontend resource in the integration, including the shared helper module. Card examples assume a profile sensor such as `sensor.anna`.

## Card Selection Guide

### Good standalone choices
- `custom:menstruation-cycle-card` for daily interaction
- `custom:menstruation-cycle-compact-status` for quick status display
- `custom:menstruation-calendar-card` for month planning
- `custom:menstruation-cycle-history-card-row` for recent trends
- `custom:menstruation-cycle-heatmap-card` for long-term pattern review
- `custom:menstruation-countdown-timer` for product reminders
- `custom:menstruation-product-inventory-card` for shared stock management
- `custom:menstruation-statistics-card` for analytics and hygiene review

### Recommended combinations
- **Daily dashboard:** main card + compact status + countdown timer
- **Planning dashboard:** calendar + history row + main card
- **Analytics dashboard:** heatmap + statistics + history row
- **Household dashboard:** inventory card + countdown timer + statistics card

## Dashboard layout patterns

| Layout | Recommended cards |
| --- | --- |
| Phone | compact status, countdown timer, calendar |
| Tablet | main card, calendar, statistics |
| Desktop | main card, history row, heatmap, statistics, inventory |

## Theme examples

`theme_mode: auto`, `light`, and `dark` are available on the main card.

<img width="494" height="779" alt="Light theme example" src="https://github.com/user-attachments/assets/1ab5a772-8bcb-4936-aacf-fe19266a6a31" />
<img width="494" height="779" alt="Dark theme example" src="https://github.com/user-attachments/assets/850b9750-fd2f-48fc-80b7-90cd182b4fe0" />

---

## 1. Main interactive card

**File:** `menstruation-cycle-card.js`  
**Card type:** `custom:menstruation-cycle-card`

Daily-use card for cycle status, editing, calendar navigation, and profile-specific interaction.

```yaml
type: custom:menstruation-cycle-card
entity: sensor.anna
friendly_name: Anna
title: Cycle of Anna
period_duration_days: learnt
show_editor: true
theme_mode: auto
show_fertile_period: true
show_predicted_cycles: true
num_predicted_cycles: 6
calendar_edit_enabled: true
```

| Option | Purpose |
| --- | --- |
| `entity` or `entry_id` | Target profile |
| `friendly_name` | Display label override |
| `title` | Card title |
| `period_duration_days` | Number `1..14` or `learnt` |
| `show_editor` | Show inline editor controls |
| `theme_mode` | `auto`, `light`, or `dark` |
| `show_fertile_period` | Show fertile markers |
| `show_predicted_cycles` | Show forecast overlays |
| `num_predicted_cycles` | Limit future predictions |
| `calendar_edit_enabled` | Allow calendar-based edits |

**Use cases:** daily input, editing history, primary dashboard card  
**Recommended companions:** compact status, calendar, countdown timer

## 2. Compact cycle card resource

**File:** `menstruation-cycle-card-compact.js`  
**Card type:** `custom:menstruation-cycle-card`

Compact resource variant for tighter dashboard layouts.

```yaml
type: custom:menstruation-cycle-card
entity: sensor.anna
title: Anna (Compact)
show_editor: false
show_fertile_period: true
```

| Option | Purpose |
| --- | --- |
| `entity` or `entry_id` | Target profile |
| `title` | Card title |
| `show_editor` | Usually disabled in compact layouts |
| `show_fertile_period` | Keep phase context visible |

**Use cases:** sidebars, narrow tablet columns, mobile dashboards  
**Recommended companions:** main card, compact status

## 3. Compact status card

**File:** `menstruation-cycle-compact-status-card.js`  
**Card type:** `custom:menstruation-cycle-compact-status`

Minimal phase and day indicator for glanceable status.

```yaml
type: custom:menstruation-cycle-compact-status
entity: sensor.anna
title: Status
show_title: false
```

| Option | Purpose |
| --- | --- |
| `entity` or `entry_id` | Target profile |
| `title` | Optional title |
| `show_title` | Show or hide the label |

**Use cases:** header rows, overview pages, phone dashboards  
**Recommended companions:** main card, countdown timer

## 4. History row card

**File:** `menstruation-cycle-history-card-row.js`  
**Card type:** `custom:menstruation-cycle-history-card-row`

Timeline-style overview for historical periods, predicted cycles, and special states.

```yaml
type: custom:menstruation-cycle-history-card-row
entity: sensor.anna
title: Cycle History
max_rows: 12
show_fertile_window: true
show_pregnancy_status: true
show_menarche_status: true
show_predicted_cycles: true
num_predicted_cycles: 6
```

| Option | Purpose |
| --- | --- |
| `entity` or `entry_id` | Target profile |
| `title` | Card title |
| `max_rows` | Maximum timeline rows |
| `show_fertile_window` | Show fertile window segments |
| `show_pregnancy_status` | Include pregnancy state hints |
| `show_menarche_status` | Include pre-menarche/menarche states |
| `show_predicted_cycles` | Include forecast rows |
| `num_predicted_cycles` | Limit predicted rows |

**Use cases:** reviewing trends, comparing recent cycles  
**Recommended companions:** calendar, heatmap, statistics

## 5. Heatmap card

**File:** `menstruation-cycle-heatmap-card.js`  
**Card type:** `custom:menstruation-cycle-heatmap-card`

Long-term heatmap for pattern review across many cycles. Prepared for additional symptom overlays.

```yaml
type: custom:menstruation-cycle-heatmap-card
entity: sensor.anna
title: Cycle Heatmap
max_cycles: 18
period_duration_days: 5
show_fertile_period: true
show_predicted_cycles: true
num_predicted_cycles: 6
cycle_alignment: bottom
symptom_entities:
  - entity: sensor.anna_pms_nausea
    name: Nausea
    icon: mdi:emoticon-sick-outline
```

| Option | Purpose |
| --- | --- |
| `entity` or `entry_id` | Target profile |
| `title` | Card title |
| `max_cycles` | Number of cycles to render |
| `period_duration_days` | Period marker length |
| `show_fertile_period` | Show fertile overlays |
| `show_predicted_cycles` | Show forecasts |
| `num_predicted_cycles` | Limit future cycles |
| `cycle_alignment` | `top` or `bottom` alignment |
| `symptom_entities` | Experimental overlay inputs |

**Use cases:** spotting recurring timing patterns  
**Recommended companions:** history row, statistics

## 6. Calendar card

**File:** `menstruation-calendar-card.js`  
**Card type:** `custom:menstruation-calendar-card`

Month view with period, fertile window, ovulation, and cycle-day details.

```yaml
type: custom:menstruation-calendar-card
entity: sensor.anna
title: Cycle Calendar
show_fertile_period: true
show_ovulation_marker: true
show_cycle_day_numbers: false
week_start: monday
show_predicted_cycles: true
num_predicted_cycles: 6
```

| Option | Purpose |
| --- | --- |
| `entity` or `entry_id` | Target profile |
| `title` | Card title |
| `show_fertile_period` | Show fertile range |
| `show_ovulation_marker` | Show ovulation marker |
| `show_cycle_day_numbers` | Display cycle day labels |
| `week_start` | `monday` or `sunday` |
| `show_predicted_cycles` | Show predicted future states |
| `num_predicted_cycles` | Limit forecast count |

**Use cases:** month planning, reviewing dates, shared household visibility  
**Recommended companions:** main card, history row

## 7. Countdown timer card

**File:** `menstruation-countdown-timer.js`  
**Card type:** `custom:menstruation-countdown-timer`

Product replacement timer with direct `menstruation_cycle.log_product_usage` integration.

```yaml
type: custom:menstruation-countdown-timer
entity: sensor.anna
tampon_duration: 4
pad_duration: 4
cup_duration: 7
underwear_duration: 6
liner_duration: 8
```

| Option | Purpose |
| --- | --- |
| `entity` or `entry_id` | Target profile |
| `tampon_duration` | Hours before reminder |
| `pad_duration` | Hours before reminder |
| `cup_duration` | Hours before reminder |
| `underwear_duration` | Hours before reminder |
| `liner_duration` | Hours before reminder |

**Use cases:** active-period reminders and one-tap logging  
**Recommended companions:** statistics, inventory card

## 8. Product inventory card

**File:** `menstruation-product-inventory-card.js`  
**Card type:** `custom:menstruation-product-inventory-card`

Shared household stock overview with consume, refill, threshold, and shopping-list workflows.

```yaml
type: custom:menstruation-product-inventory-card
inventory_entity: sensor.household_product_stock
title: Household inventory
member: ""
visible_products:
  - tampon
  - pad
  - cup
  - liner
  - underwear
```

| Option | Purpose |
| --- | --- |
| `inventory_entity` | Household inventory sensor |
| `title` | Card title |
| `member` | Filter/member label for manual actions |
| `visible_products` | Which product tiles to show |
| `product_order` | Optional explicit ordering |
| `thresholds` | Optional warning/critical settings |
| `underwear_total_owned` | Total owned pieces |
| `underwear_washing_threshold` | Washing alert threshold |

**Use cases:** shared households, supply planning, shopping reminders  
**Recommended companions:** countdown timer, statistics card

## 9. Statistics card

**File:** `menstruation-statistics-card.js`  
**Card type:** `custom:menstruation-statistics-card`

Statistics, hygiene usage review, and doctor-report export entry point.

```yaml
type: custom:menstruation-statistics-card
entity: sensor.anna
title: Statistics
```

| Option | Purpose |
| --- | --- |
| `entity` or `entry_id` | Target profile |
| `title` | Card title |

**Use cases:** planning, usage review, report preparation  
**Recommended companions:** heatmap, countdown timer, inventory card

### Product usage data surfaced to cards

When product logging is active, the profile sensor exposes usage-related attributes that several cards reuse:

- `product_usage_today`
- `product_usage_this_cycle`
- `product_usage_stats`
- `product_usage_timeline`

These attributes power the hygiene-focused parts of the statistics and timer workflows.

## 10. Shared icons helper

**File:** `menstruation-icons.js`  
**Card type:** none - shared helper asset

This module provides shared icon assets and helpers used by multiple cards for state, product, and pregnancy icons.

| Item | Purpose |
| --- | --- |
| Shared SVG/icon mapping | Reused across frontend cards |
| Asset base URL handling | Keeps icon loading consistent |
| Product/state icon lookup | Standardizes visuals |

**Use cases:** loaded indirectly by frontend cards  
**Recommended companions:** all card resources

## Example dashboard stack

```yaml
type: vertical-stack
cards:
  - type: custom:menstruation-cycle-card
    entity: sensor.anna
    title: Cycle Overview
    show_editor: true
    show_fertile_period: true
    calendar_edit_enabled: true
  - type: custom:menstruation-countdown-timer
    entity: sensor.anna
    tampon_duration: 4
    pad_duration: 4
    cup_duration: 7
    underwear_duration: 6
    liner_duration: 8
  - type: custom:menstruation-statistics-card
    entity: sensor.anna
    title: Statistics
```
