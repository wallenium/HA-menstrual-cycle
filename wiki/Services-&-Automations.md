# Services & Automations

All services live in the `menstruation_cycle.*` domain. In most cases you should target a profile with `entity_id`. Many services also accept `profile` or `entry_id`.

## Service reference

| Service | What it does | Key parameters |
| --- | --- | --- |
| `menstruation_cycle.add_cycle_start` | Add one confirmed bleeding day | `date` |
| `menstruation_cycle.remove_cycle_start` | Remove one confirmed bleeding day | `date` |
| `menstruation_cycle.set_cycle_history` | Replace the full recorded history | `dates[]` |
| `menstruation_cycle.set_period_duration` | Set forecasted period duration | `days` |
| `menstruation_cycle.erase_all_history` | Destructive wipe of history | `entity_id`, `erase_all: true` |
| `menstruation_cycle.export_history` | Export history to `csv` or `txt` | `format`, `filename` |
| `menstruation_cycle.refresh_cycle_model` | Recalculate date-based values | optional target |
| `menstruation_cycle.log_product_usage` | Log tampon/pad/cup/liner/underwear usage | `product`, `action`, `quantity`, `date` |
| `menstruation_cycle.manage_household_inventory` | Manage shared stock | `inventory_action`, `product`, `quantity` |
| `menstruation_cycle.add_symptom` | Add or merge symptom data | `date`, `symptom_data` |
| `menstruation_cycle.remove_symptom` | Remove symptom data for one date | `date` |
| `menstruation_cycle.get_symptom` | Read symptom data for one date | `date` |
| `menstruation_cycle.set_pregnancy_mode` | Enable or disable pregnancy mode | `is_pregnant`, `pregnancy_start_date` |
| `menstruation_cycle.update_pregnancy_date` | Update the pregnancy start/LMP date | `pregnancy_start_date` |
| `menstruation_cycle.set_menarche_mode` | Enable pre-menarche tracking or confirm menarche | `is_menarche`, `estimated_menarche_date`, `family_menarche_age` |
| `menstruation_cycle.update_menarche_date` | Record the actual menarche date | `date` |
| `menstruation_cycle.log_first_period` | Record menarche and first period together | `date` |
| `menstruation_cycle.get_menarche_info` | Read menarche tracking data | optional target |
| `menstruation_cycle.add_pre_menarche_sign` | Add a puberty body sign | `pre_menarche_sign`, `tanner_stage` |
| `menstruation_cycle.remove_pre_menarche_sign` | Remove a puberty body sign | `pre_menarche_sign` |
| `menstruation_cycle.set_menopause_mode` | Enable or disable menopause mode | `is_menopause`, `menopause_start_date` |
| `menstruation_cycle.update_menopause_date` | Update menopause start date | `menopause_start_date` |
| `menstruation_cycle.save_timer_state` | Persist countdown timer state | `remaining_seconds`, `total_seconds`, `is_running`, `saved_at` |
| `menstruation_cycle.export_doctor_report` | Generate an HTML report for clinical review | `days_back`, `patient_name`, `patient_birthdate`, `language` |

## Common service examples

### Add one cycle start
```yaml
service: menstruation_cycle.add_cycle_start
data:
  entity_id: sensor.anna
  date: "2026-03-01"
```

### Replace the full history
```yaml
service: menstruation_cycle.set_cycle_history
data:
  entity_id: sensor.anna
  dates:
    - "2026-01-14"
    - "2026-02-14"
    - "2026-03-16"
```

### Change period duration
```yaml
service: menstruation_cycle.set_period_duration
data:
  entity_id: sensor.anna
  days: 5
```

### Export a backup
```yaml
service: menstruation_cycle.export_history
data:
  entity_id: sensor.anna
  format: csv
  filename: cycle_backup
```

Files are written to `<config>/menstruation_cycle_exports/`.

### Delete all history safely
```yaml
service: menstruation_cycle.erase_all_history
data:
  entity_id: sensor.anna
  erase_all: true
```

### Log product usage
```yaml
service: menstruation_cycle.log_product_usage
data:
  entity_id: sensor.anna
  product: tampon
  action: used
  quantity: 1
```

### Manage household stock
```yaml
service: menstruation_cycle.manage_household_inventory
data:
  inventory_action: add
  product: pad
  quantity: 24
```

### Add symptom data
```yaml
service: menstruation_cycle.add_symptom
data:
  entity_id: sensor.anna
  date: "2026-03-15"
  symptom_data:
    bleeding_strength: medium
    pain:
      - cramps
      - lower_back
    hygiene:
      - pad
```

### Enable pregnancy mode
```yaml
service: menstruation_cycle.set_pregnancy_mode
data:
  entity_id: sensor.anna
  is_pregnant: true
  pregnancy_start_date: "2026-01-15"
```

### Export doctor report
```yaml
service: menstruation_cycle.export_doctor_report
data:
  entity_id: sensor.anna
  days_back: 180
  patient_name: Anna Müller
  patient_birthdate: "1995-06-15"
  language: en
```

## Automation examples

### 1. Daily cycle recalculation
```yaml
alias: Menstruation Cycle - Daily Refresh
trigger:
  - platform: time
    at: "00:00:05"
action:
  - service: menstruation_cycle.refresh_cycle_model
```

### 2. PMS reminder automation
```yaml
alias: PMS Reminder
trigger:
  - platform: state
    entity_id: sensor.anna
    to: pms
action:
  - service: notify.mobile_app_phone
    data:
      message: "PMS phase started - prep supplies or routines if needed."
```

### 3. Product usage logging shortcut
```yaml
alias: Log Pad Usage
trigger:
  - platform: event
    event_type: mobile_app_notification_action
    event_data:
      action: log_pad_usage
action:
  - service: menstruation_cycle.log_product_usage
    data:
      entity_id: sensor.anna
      product: pad
      action: used
      quantity: 1
```

### 4. History import workflow
```yaml
alias: Import Past History
trigger:
  - platform: homeassistant
    event: start
action:
  - service: menstruation_cycle.set_cycle_history
    data:
      entity_id: sensor.anna
      dates:
        - "2026-01-14"
        - "2026-02-14"
```

### 5. Backup export on the first of the month
```yaml
alias: Monthly Cycle Backup
trigger:
  - platform: time
    at: "02:00:00"
condition:
  - condition: template
    value_template: "{{ now().day == 1 }}"
action:
  - service: menstruation_cycle.export_history
    data:
      entity_id: sensor.anna
      format: csv
      filename: monthly_cycle_backup
```

### 6. Data erasure workflow with manual confirmation
```yaml
alias: Confirm Cycle Data Erasure
trigger:
  - platform: event
    event_type: erase_cycle_history_requested
action:
  - service: menstruation_cycle.erase_all_history
    data:
      entity_id: sensor.anna
      erase_all: true
```

### 7. Multi-profile refresh
```yaml
alias: Refresh All Cycle Profiles
trigger:
  - platform: time
    at: "00:15:00"
action:
  - service: menstruation_cycle.refresh_cycle_model
    data: {}
```

### 8. Conditional automation based on cycle state
```yaml
alias: Quiet Morning Routine During Period
trigger:
  - platform: state
    entity_id: sensor.anna
    to: period
action:
  - service: scene.turn_on
    target:
      entity_id: scene.quiet_morning
```

### 9. Household inventory shopping reminder
```yaml
alias: Low Period Product Stock
trigger:
  - platform: time_pattern
    hours: "/12"
condition:
  - condition: template
    value_template: >-
      {{ (state_attr('sensor.household_product_stock', 'inventory') or {}).get('pad', 0) | int(0) < 10 }}
action:
  - service: notify.mobile_app_phone
    data:
      message: "Pads are running low."
```

### 10. Assistive climate routine
```yaml
alias: PMS Comfort Climate
trigger:
  - platform: state
    entity_id: sensor.anna
    to: pms
action:
  - service: climate.set_temperature
    target:
      entity_id: climate.bedroom
    data:
      temperature: 22
```

### 11. Medication or hydration reminder
```yaml
alias: Cycle-Aware Reminder
trigger:
  - platform: state
    entity_id: sensor.anna
    to: period
action:
  - service: notify.mobile_app_phone
    data:
      message: "Remember hydration, rest, or your agreed routine."
```

### 12. Pre-menarche tracking support
```yaml
alias: Record Pre-Menarche Sign
trigger:
  - platform: event
    event_type: puberty_sign_logged
action:
  - service: menstruation_cycle.add_pre_menarche_sign
    data:
      entity_id: sensor.anna
      pre_menarche_sign: breast_development
      tanner_stage: stage_2
```

## Notes and guardrails

- Use automations as assistive support, not as a medical decision engine.
- Prefer `entity_id` targeting in multi-profile setups.
- Reserve destructive services for manual or clearly confirmed flows.
- Export files locally and back them up if the data matters to you.
