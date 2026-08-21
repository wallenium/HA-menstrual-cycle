(() => {
  const PANEL_FALLBACK_EN = {
    save: 'Save',
    saving: 'Saving…',
    cancel: 'Cancel',
    none: 'None',
    unknown: 'Unknown',
    friendly_name: 'Friendly Name',
    onboarding_stage: 'Onboarding stage',
    cycle_day: 'Cycle Day',
    days_until_menarche: 'Days until menarche',
    dashboard_days_until_next: 'Days until next period',
    bleeding_strength: 'Bleeding',
    bleeding_none: 'None',
    bleeding_light: 'Light',
    bleeding_medium: 'Medium',
    bleeding_heavy: 'Heavy',
    pain: 'Pain',
    mood: 'Mood',
    notes: 'Notes',
    opt_cramps: 'Cramps',
    opt_headache: 'Headache',
    opt_lower_back: 'Lower Back',
    period_forecast_window: 'Window',
    period_forecast_confidence: 'Confidence',
    symptom_saved: 'Saved',
    symptom_save_error: 'Save failed',
    progress_empty_state: 'No progress',
    progress_section_title: 'Progress',
    ygs_rem_kit_check: 'Kit',
    ygs_rem_drink_water: 'Water',
    ygs_rem_rest_cue: 'Rest',
    dashboard_page_title: 'Cycle Dashboard',
    dashboard_entity_picker_aria: 'Select profile',
    dashboard_edit_mode: 'Edit dashboard',
    dashboard_done: 'Done',
    dashboard_discreet_mode: 'Discreet mode',
    dashboard_reset_preset: 'Reset to mode preset',
    dashboard_widget_quick_log: 'Quick Log',
    dashboard_widget_today_status: 'Today Status',
    dashboard_widget_upcoming_window: 'Upcoming Window',
    dashboard_widget_gauge_card: 'Gauge',
    dashboard_widget_calendar_card: 'Calendar',
    dashboard_widget_statistics_card: 'Statistics',
    dashboard_widget_cycle_history: 'Cycle History',
    dashboard_widget_pregnancy_prediction: 'Pregnancy Prediction',
    dashboard_not_enough_data: 'Not enough data yet.',
    dashboard_prediction_disclaimer: 'Estimation only — not medical advice.',
    dashboard_cycle_history_avg: 'Average',
    dashboard_cycle_history_length: 'Length (days)',
    dashboard_cycle_history_outlier: 'Outlier',
    dashboard_fertility_window: 'Fertile window',
    dashboard_fertility_ovulation: 'Est. ovulation',
    dashboard_fertility_confidence: 'Confidence',
    dashboard_today: 'Today',
    dashboard_widget_reminders: 'Reminders Summary',
    dashboard_widget_progress: 'Progress & Badges',
    dashboard_widget_my_info: 'My Info',
    dashboard_no_entity_selected: 'No profile selected.',
    dashboard_component_unavailable: 'Card component not loaded.',
    dashboard_label_state: 'State',
    dashboard_neutral_state: 'Current status',
    dashboard_discreet_note: 'Discreet mode note',
    dashboard_quick_log_note: 'Quick log note',
    dashboard_reminders_hint: 'Reminder hint',
    dashboard_not_set: 'Not set',
    dashboard_pronouns: 'Pronouns',
    dashboard_quick_log_no_changes: 'No changes',
    dashboard_saved: 'Dashboard layout saved.',
    dashboard_empty_state: 'All widgets are hidden.',
    dashboard_empty_state_hint: 'Open edit mode to show widgets or reset to defaults.',
    dashboard_widget_order_label: 'Widget order and visibility',
    dashboard_toggle_widget_aria: 'Toggle {widget} widget visibility',
    dashboard_move_up_aria: 'Move {widget} widget up',
    dashboard_move_down_aria: 'Move {widget} widget down',
    dashboard_drag_to_reorder: 'Drag to reorder',
    dashboard_last_updated: 'Last updated',
    dashboard_sensor_unavailable: 'Sensor currently unavailable',
    dashboard_sensor_unavailable_hint: 'The entity currently reports "unavailable" — this can happen briefly after a restart or while the integration is reloading. It usually resolves itself within a few seconds.',
    dashboard_discreet_quick_on_aria: 'Turn on discreet mode',
    dashboard_discreet_quick_off_aria: 'Turn off discreet mode',
    dashboard_next_period: 'Next period',
    dashboard_expected: 'expected',
    dashboard_in_days_prefix: 'in',
    dashboard_days_ago_prefix: 'ago',
    dashboard_ovulation_temp_confirmed: 'Temperature rise confirmed',
    dashboard_ovulation_calendar_based: 'calculated using the calendar method',
    dashboard_cycle_variability: 'Cycle variability',
    dashboard_regularity_high: 'very regular',
    dashboard_regularity_medium: 'regular',
    dashboard_regularity_low: 'irregular',
    dashboard_based_on_cycles: 'based on {n} cycles',
    dashboard_widget_cycle_phase_overview: 'Cycle Phase Overview',
    dashboard_save_aria: 'Save dashboard layout',
    dashboard_cancel_aria: 'Cancel dashboard edits',
    dashboard_reset_aria: 'Reset dashboard to mode defaults',
    dashboard_widget_phase_donut: 'Phase Distribution',
    dashboard_widget_basal_temp: 'Basal Temperature',
    dashboard_widget_symptom_heatmap: 'Symptom Heat Grid',
    dashboard_widget_anomaly_insights: 'Anomaly Insights',
    dashboard_widget_pain_mood_trend: 'Pain & Mood Trend',
    dashboard_widget_year_overview: 'Year Overview',
    dashboard_phase_donut_title: 'Typical phase distribution',
    dashboard_basal_temp_unit: '°C',
    dashboard_basal_temp_no_data: 'No temperature data recorded.',
    dashboard_temperature_rise: 'Temperature rise',
    dashboard_contraception_accuracy_warning: 'Hormonal contraception can suppress ovulation — cycle and fertility predictions are unreliable while active.',
    dashboard_contraception_renewal_due: 'Contraception method may need renewal soon',
    dashboard_log_today: 'Log today',
    dashboard_cancel: 'Cancel',
    dashboard_save: 'Save',
    dashboard_close: 'Close',
    dashboard_quick_log_saved: 'Saved.',
    dashboard_quick_log_failed: 'Could not save.',
    dashboard_quick_log_loading: 'Loading, please try again in a moment…',
    dashboard_widget_chat_assistant: 'Cycle Q&A',
    dashboard_chat_fab_label: 'Cycle Q&A',
    dashboard_chat_medical_disclaimer: 'Not medical advice. For health concerns, please consult a doctor.',
    dashboard_chat_pregnant_today_yes: 'Today likely falls within your estimated fertile window.',
    dashboard_chat_pregnant_today_no: 'Today likely falls outside your estimated fertile window.',
    dashboard_widget_long_term_trend: 'Long-Term Trend',
    dashboard_trend_stable: 'Stable over the tracked period.',
    dashboard_trend_lengthening: 'Trending longer over the tracked period.',
    dashboard_trend_shortening: 'Trending shorter over the tracked period.',
    dashboard_chat_intro: 'Ask a simple question about your cycle. Runs entirely locally, no external AI.',
    dashboard_chat_placeholder: 'Type a question…',
    dashboard_chat_send: 'Ask',
    dashboard_chat_q_next_period: 'When is my next period?',
    dashboard_chat_q_cycle_length: 'How long is my cycle on average?',
    dashboard_chat_q_fertile: 'When is my fertile window?',
    dashboard_chat_q_phase: 'What phase am I in right now?',
    dashboard_chat_no_data: "I don't have enough data for that right now.",
    dashboard_chat_period_today: 'Your period is expected today.',
    dashboard_chat_period_overdue: 'Your period was expected on {date}.',
    dashboard_chat_period_in_days: 'Expected in {days} days, on {date}.',
    dashboard_chat_cycle_length: '{days} days on average.',
    dashboard_chat_fertile_window: 'Expected from {start} to {end}.',
    dashboard_chat_ovulation: 'Expected on {date}.',
    dashboard_chat_current_phase: "You're currently in the {phase} phase.",
    dashboard_chat_fallback: 'I couldn\u2019t match that. Try asking "What can you answer?" for an overview.',
    dashboard_chat_error: 'Something went wrong there. Feel free to try again.',
    dashboard_chat_q_help: 'What else can you answer?',
    dashboard_chat_help: "Here are some things I can help with:\n\n📅 Period: next/last, why late, duration, comparison to last one\n🔄 Cycle: length, cycle day, regularity, shortest/longest\n🌸 Fertility: window, ovulation, temperature curve, mucus/cervix interpretation\n📋 Symptoms: search for headaches, cramps, discharge, spotting, and more\n🤰 Life stages: pregnancy, menopause, postpartum, pre-menarche, contraception\n📖 General: term explanations, informational questions\n\nJust ask away — if something's unclear, I'll say so rather than guess.",
    dashboard_chat_far_future_caveat: '(The further out this is, the less certain this estimate is.)',
    dashboard_chat_period_in_range_yes: 'Yes, your period is expected to fall in that range, starting around {date}.',
    dashboard_chat_period_in_range_no: 'Not based on the current estimate — no period is expected in that range.',
    dashboard_chat_fertility_disclaimer: 'This is only a rough indication based on the estimated fertile window, not a reliable statement about actual risk — and not a substitute for contraception or medical guidance.',
    dashboard_chat_fertility_in_window: 'That day fell within your estimated fertile window.',
    dashboard_chat_fertility_outside_window: 'That day fell outside your estimated fertile window.',
    dashboard_chat_stock_enough: 'Should be enough — current stock: {stock}, typical usage per cycle: about {avg}.',
    dashboard_chat_stock_low: 'Might be tight — stock: {stock}, typical usage per cycle: about {avg}. Might be worth buying more {product}.',
    dashboard_chat_cycle_day: 'Today is cycle day {day}.',
    dashboard_chat_regularity: 'Your cycles are about {pct}% regular.',
    dashboard_chat_period_duration: 'Usually about {days} days.',
    dashboard_chat_last_period: 'Your last period started on {date}.',
    dashboard_chat_nfp_confirmed: 'Yes, confirmed on {date}.',
    dashboard_chat_nfp_not_confirmed: "Not yet — there's no confirmed temperature rise for this cycle so far.",
    dashboard_chat_badges: 'Your recent badges: {list}.',
    dashboard_chat_menopause_confirmed: 'Yes, officially confirmed (12 months without a period).',
    dashboard_chat_menopause_pending: 'Not officially confirmed yet — currently {months} months without a period recorded.',
    dashboard_chat_pregnancy_week: "You're currently in week {week}.",
    dashboard_chat_due_date: 'Due date: {date}.',
    dashboard_chat_contraception_method: 'Currently recorded: {method}.',
    dashboard_chat_contraception_renewal: 'Possible renewal: {date}.',
    dashboard_chat_late_reasons: 'Possible reasons include stress, changes in sleep/weight/exercise, illness, hormonal fluctuations — or pregnancy. Predictions are estimates with a margin of error, not a diagnosis.',
    dashboard_chat_not_actually_late: "Based on the current prediction, your period isn't overdue yet.",
    dashboard_chat_days_overdue: "It's currently {days} days overdue.",
    dashboard_chat_late_see_doctor: 'With a delay this long, it may be worth checking in with a doctor.',
    dashboard_chat_ovulation_today_or_past: 'Ovulation is expected today or has already passed.',
    dashboard_chat_ovulation_in_days: 'Expected in {days} days.',
    dashboard_chat_shortest_cycle: 'Your shortest recorded cycle lasted {days} days.',
    dashboard_chat_longest_cycle: 'Your longest recorded cycle lasted {days} days.',
    dashboard_chat_cycle_about_same: 'About as usual — no notable difference from your average.',
    dashboard_chat_cycle_longer: 'Longer than usual — about {days} days more than average.',
    dashboard_chat_cycle_shorter: 'Shorter than usual — about {days} days less than average.',
    dashboard_chat_postpartum_done: 'The usual postpartum period has already ended.',
    dashboard_chat_postpartum_remaining: 'About {days} days left.',
    dashboard_chat_pregnancy_test_guidance: "A test is usually reliable from the expected start of your period onward, some a few days earlier — check the specific test's package insert for details.",
    dashboard_chat_pregnancy_test_now: 'Your period is already expected — a test would be meaningful now.',
    dashboard_chat_pregnancy_test_wait: "Your period isn't expected for another {days} days — a test likely isn't reliable before then.",
    dashboard_chat_mucus_high: 'Clear, stretchy mucus ("egg-white" type) typically indicates high fertility — it usually appears shortly before ovulation.',
    dashboard_chat_mucus_medium: "Creamy mucus usually indicates moderate, rising fertility — ovulation is getting closer but usually isn't immediately imminent.",
    dashboard_chat_mucus_low: 'Sticky mucus usually indicates lower fertility — typical for the time after your period, before the fertile phase begins.',
    dashboard_chat_mucus_none: 'No noticeable mucus usually indicates low fertility — common right after your period or in the second half of the cycle.',
    dashboard_chat_mucus_caveat: 'Cervical mucus is only one of several NFP observation signs — combined with basal temperature, the assessment is far more reliable than on its own.',
    dashboard_chat_mucus_unclear: "I couldn't clearly match that description. Common categories: none/dry, sticky, creamy, or clear/stretchy (egg-white type).",
    dashboard_chat_symptom_search_none: "I didn't find any entries for that in this time range.",
    dashboard_chat_symptom_search_found: 'Yes, recorded on {count} days: {dates}.',
    dashboard_chat_intercourse_count: '{count} times recorded in this time range.',
    dashboard_chat_intercourse_last: 'Last recorded on {date}.',
    dashboard_chat_menarche_estimate: 'Estimated around {date}.',
    dashboard_chat_menarche_days: 'Expected in about {days} days.',
    dashboard_chat_cervix_high: 'High, soft, and/or open typically indicates high fertility — usually close to ovulation.',
    dashboard_chat_cervix_low: 'Low, firm, and/or closed typically indicates lower fertility.',
    dashboard_chat_cervix_unclear: "I couldn't clearly match that description. Common categories: high/soft/open (more fertile) or low/firm/closed (less fertile).",
    dashboard_chat_bleeding_about_same: 'About as usual — no clear difference from the period before.',
    dashboard_chat_bleeding_stronger: 'Stronger than the period before.',
    dashboard_chat_bleeding_weaker: 'Weaker than the period before.',
    dashboard_chat_discharge_none: 'Nothing unusual recorded in this time range.',
    dashboard_chat_discharge_found: 'Yes, recorded as unusual on {count} days: {dates}. If it persists, it may be worth seeing a doctor.',
    dashboard_chat_anomaly_regular: 'Nothing unusual — your cycle is about {pct}% regular.',
    dashboard_chat_anomaly_irregular: 'Your cycle currently shows lower regularity (about {pct}%) — check the Anomaly Insights card for details.',
    dashboard_chat_ovulation_test_last: 'Last on {date}.',
    dashboard_chat_pms_start: 'Expected around {date} — a rough estimate, not an exact prediction.',
    dashboard_chat_tracking_consistency: 'Recorded on {count} days so far this month.',
    dashboard_chat_correlation_none: "No clear connection has been found for that so far — either there isn't one, or there isn't enough data yet.",
    dashboard_chat_correlation_more: 'Yes — {symptom} occurs about {ratio}x more often in this phase than usual.',
    dashboard_chat_correlation_less: 'More rarely — {symptom} occurs about {ratio}x less often in this phase than usual.',
    dashboard_chat_training_count: '{count} times recorded in this time range.',
    dashboard_chat_spotting_none: "I didn't find any entries for that in this time range.",
    dashboard_chat_spotting_found: 'Yes, recorded on {count} days: {dates}.',
    dashboard_chat_day_lookup_none: "I didn't find an entry for that.",
    dashboard_chat_libido_none: "I didn't find any entries for that in this time range.",
    dashboard_chat_libido_found: 'Yes, recorded on {count} days: {dates}.',
    dashboard_chat_normal_cycle_info: 'A cycle is usually considered typical when it falls between 21 and 35 days, with the period itself lasting 2 to 7 days. Larger swings are normal in the first years after menarche and during perimenopause. If deviations are persistent and significant, it may be worth talking to a doctor.',
    dashboard_chat_pregnant_during_period_info: 'Unlikely, but not impossible — especially with short cycles or irregular ovulation, fertile days and the period can overlap in timing, and sperm can survive for several days.',
    dashboard_chat_day_one_info: 'Yes — the first day of actual bleeding (not spotting) counts as cycle day 1. This app counts it the same way.',
    dashboard_chat_prediction_accuracy_info: "Predictions are based on your past cycle history and get more reliable with more recorded cycles. They're estimates, not guarantees — they can be off, especially with irregular cycles or limited history.",
    dashboard_chat_underwear_wash_yes: 'Looks like it — only {available} clean ones left, threshold is {threshold}.',
    dashboard_chat_underwear_wash_no: 'Not yet needed — {available} clean ones available.',
    dashboard_bbt_last_days_prefix: 'Last',
    dashboard_bbt_subtitle_confirmed: 'Coverline per the 3-over-6 rule (confirmed)',
    dashboard_bbt_subtitle_pending: 'no 3-over-6 confirmation yet',
    dashboard_anomaly_regular: 'Regular cycle',
    dashboard_anomaly_irregular: 'Irregular pattern detected',
    dashboard_anomaly_short_cycle: 'Short cycle',
    dashboard_anomaly_long_cycle: 'Long cycle',
    dashboard_anomaly_consistency: 'Consistency',
    dashboard_pain_no_data: 'No symptom data available.',
    dashboard_year_overview_title: 'Year at a glance',
    severity_info: 'Info',
    severity_alert: 'Alert',
    phase_menstruation: 'Menstruation',
    phase_follicular: 'Follicular',
    phase_luteal: 'Luteal',
    dashboard_widget_fetal_development: 'Fetal Development',
    dashboard_fetal_size_label: 'Size comparison',
    dashboard_menarche_estimate_from: 'Estimate based on',
    dashboard_menarche_estimate_generic: 'Rough estimate — becomes more precise once dated signs are logged',
    dashboard_menarche_estimate_age: 'Very rough estimate based on age — becomes more precise once signs are logged',
    dashboard_age_label: 'Age',
    dashboard_birth_date_hint: 'Add a birth date in the integration settings to show age and improve the pre-menarche estimate.',
    dashboard_high_risk_pregnancy: 'High-risk pregnancy',
    dashboard_high_risk_monitoring: 'Closer monitoring recommended',
    dashboard_high_risk_milestone_note: 'High-risk pregnancies usually involve additional, individually scheduled check-ups beyond the standard ones above — please coordinate with your care provider.',
    pregnancy_risk_notes: 'Notes',
    nfp_analysis: 'NFP',
    temperature_rise_day: 'Temperature rise',
    legend_cervix_peak: 'Cervical mucus peak detected',
    dashboard_calendar_tap_hint: 'Tap a day to mark or remove a period start.',
    dashboard_calendar_fallback_note: '(Full symptom logging — bleeding strength, pain, cervical mucus, and more — loads automatically once available.)',
    dashboard_last_period: 'Last period',
    dashboard_menopause_threshold: '12 months without a period',
    dashboard_days_since_last_period: 'Days since last period',
    dashboard_days_to_confirmed: 'Days until confirmed',
    dashboard_months_tracked: 'Months tracked',
    dashboard_menopause_confirmed: 'Confirmed',
    dashboard_perimenopause: 'Perimenopause',
    dashboard_widget_menopause_timeline: 'Menopause Timeline',
    dashboard_menopause_timeline_note: 'Milestones since your last logged period. Menopause is clinically considered confirmed after 12 months without a period.',
    milestone_last_period: 'Last period',
    milestone_3_months: '3 months',
    milestone_6_months: '6 months',
    milestone_9_months: '9 months',
    milestone_menopause_confirmed: '12 months — confirmed',
    dashboard_widget_symptom_insights: 'Symptom Insights',
    dashboard_symptom_insights_none: 'No strong patterns detected yet.',
    dashboard_symptom_insight_more: '{symptom} is {ratio}x more frequent in the {phase} phase.',
    dashboard_symptom_insight_less: '{symptom} is less common in the {phase} phase ({ratio}x baseline).',
    dashboard_confidence_low: 'Low confidence',
    dashboard_confidence_medium: 'Medium confidence',
    dashboard_ics_subscribe: 'Subscribe to calendar',
    dashboard_ics_hint: '(as an iCal feed, e.g. for Google/Apple Calendar)',
    dashboard_widget_progress_badges: 'Progress',
    dashboard_badge_earned_on: 'Earned on',
    badge_first_entry: 'First entry logged',
    badge_cycles_3: '3 cycles logged',
    badge_cycles_6: '6 cycles logged',
    badge_consistent_logging: 'Consistent logging (30 days)',
    badge_pattern_emerging: 'Pattern emerging',
    badge_cycles_12: '12 cycles logged',
    badge_symptom_variety: 'Explored 5+ symptom categories',
    badge_nfp_confirmed_ovulation: 'NFP-confirmed ovulation',
    badge_insights_unlocked: 'Symptom insights unlocked',
    badge_temperature_tracker: 'Basal temperature tracked (10+ days in a cycle)',
    badge_doctor_report_exported: 'Doctor report exported',
    badge_profile_personalized: 'Profile personalized (birth date + family history)',
    badge_first_sign_logged: 'First body sign logged',
    badge_signs_explored: 'All body signs explored',
    dashboard_pain_frequency: 'Cycles with pain',
    dashboard_most_common: 'most common',
    dashboard_typical_bleeding: 'typical strength',
    dashboard_avg_basal_temp: 'Avg. basal temp.',
    dashboard_widget_product_usage: 'Product Usage',
    dashboard_stock: 'Stock',
    dashboard_today_short: 'Today',
    dashboard_this_cycle: 'This cycle',
    dashboard_avg_short: 'Avg.',
    dashboard_stock_hint: 'Stock from the household inventory (shared across all profiles).',
    dashboard_product_add_one: 'Log {product} (+1)',
    dashboard_product_tap_hint: 'Tap + to log today\u2019s usage with a real count.',
    trimester_label: 'Trimester',
    dashboard_weeks_remaining: '{n} weeks remaining',
    family_menarche_age: 'Family menarche age',
    dashboard_period_day_label: 'Period',
    dashboard_learning_phase: 'Learning phase — predictions are still rough, they get more precise with more logged cycles.',
    dashboard_learning_phase_progress: 'Learning phase — {have} of {need} cycles logged for more reliable predictions.',
    dashboard_calendar_loading: 'Loading…',
    dashboard_card_unavailable: 'Card unavailable — please check that the resource is correctly registered in Home Assistant (HACS redownload, clear browser cache).',
    dashboard_past_fertile_disclaimer: 'Fertile windows outside the current cycle are estimated (calendar method), not measured or guaranteed values.',
    dashboard_year_prev: 'Previous year',
    dashboard_year_next: 'Next year',
    dashboard_days_short: 'd',
    dashboard_menarche_checklist_hint: 'Tap to log a sign. Feeds automatically into the estimate above.',
    remove: 'Remove',
    opt_stage_1: 'Stage 1',
    opt_stage_2: 'Stage 2',
    opt_stage_3: 'Stage 3',
    opt_stage_4: 'Stage 4',
    opt_stage_5: 'Stage 5',
    opt_slight: 'Slight',
    opt_moderate: 'Moderate',
    opt_significant: 'Significant',
    opt_severe: 'Severe',
    opt_strong: 'Strong',
    opt_stable: 'Stable',
    opt_mild_changes: 'Mild changes',
    opt_noticeable_changes: 'Noticeable changes',
    opt_significant_changes: 'Significant changes',
    opt_clear_to_white: 'Clear to white',
    opt_none: 'None',
    pre_menarche_desc_pubic_hair_growth_stage_1: 'No pubic hair visible yet (pre-pubertal).',
    pre_menarche_desc_pubic_hair_growth_stage_2: 'A few sparse, fine, slightly curled hairs, mainly along the labia.',
    pre_menarche_desc_pubic_hair_growth_stage_3: 'Hair becomes darker and coarser, spreading over the pubic mound.',
    pre_menarche_desc_pubic_hair_growth_stage_4: 'Adult-like hair, but not yet reaching the inner thighs.',
    pre_menarche_desc_pubic_hair_growth_stage_5: 'Adult pattern, spreading onto the inner thighs.',
    pre_menarche_desc_breast_development_stage_1: 'No visible breast development yet (pre-pubertal, flat).',
    pre_menarche_desc_breast_development_stage_2: 'Bud stage — a small raised mound, areola starts to widen.',
    pre_menarche_desc_breast_development_stage_3: 'Breast and areola continue enlarging, without a separate contour yet.',
    pre_menarche_desc_breast_development_stage_4: 'Areola and nipple form a second, raised mound above the breast.',
    pre_menarche_desc_breast_development_stage_5: 'Mature stage — areola settles back into the overall breast contour.',
    dashboard_pain_type_singular: 'pain type',
    dashboard_pain_type_plural: 'pain types',
    dashboard_pain_types_count: 'Number of pain types',
    dashboard_widget_inventory_card: 'Product Inventory',
    dashboard_widget_timer_card: 'Timer',
    dashboard_widget_support_card: 'Support & Education',
    dashboard_birth: 'Birth',
    days: 'days',
    dashboard_days_remaining: 'Days remaining',
    dashboard_postpartum_disclaimer: 'Recovery varies a lot from person to person — this window is a rough guide, not a medical prescription.',
    days_postpartum: 'Days postpartum',
    weeks_postpartum: 'Weeks postpartum',
    week: 'Week',
    dashboard_loading: 'Loading…',
    dashboard_onboarding_title: 'Welcome! No data logged yet.',
    dashboard_onboarding_hint: 'Log your first cycle day to see predictions, charts, and insights.',
    dashboard_calendar_day_added: 'Marked',
    dashboard_calendar_day_removed: 'Removed',
    dashboard_week_unit: 'Week',
    dashboard_due_date_short: 'Due',
    trimester_1: '1st Trimester',
    trimester_2: '2nd Trimester',
    trimester_3: '3rd Trimester',
    height_spurt: 'growth spurt',
    breast: 'breast development',
    pubic_hair: 'pubic hair',
    milestone_heartbeat: 'Heartbeat audible',
    milestone_first_trimester_screening: 'First-trimester screening',
    milestone_organ_screening: 'Organ screening',
    milestone_viability: 'Viability threshold',
    milestone_third_trimester: '3rd trimester begins',
    milestone_position_check: 'Position check',
    milestone_due_date: 'Due date',
    menarche_sign_height_spurt: 'Growth spurt',
    menarche_sign_breast: 'Physical changes',
    menarche_sign_pubic_hair: 'Further physical maturity signs',
    menarche_sign_discharge: 'First observed discharge',
    menarche_sign_mood: 'Mood changes',
    menarche_sign_acne: 'Skin changes',
    menarche_sign_body_odor: 'Body odor changes',
    fetal_size_5: 'Poppy seed',
    fetal_skill_5_1: 'Heart begins to form',
    fetal_skill_5_2: 'Neural tube develops',
    fetal_size_7: 'Blueberry',
    fetal_skill_7_1: 'Heartbeat measurable',
    fetal_skill_7_2: 'Arm and leg buds form',
    fetal_size_9: 'Raspberry',
    fetal_skill_9_1: 'Finger and toe buds visible',
    fetal_skill_9_2: 'First movements (not yet felt)',
    fetal_size_11: 'Lime',
    fetal_skill_11_1: 'All major organs formed',
    fetal_skill_11_2: 'Can make a fist',
    fetal_size_13: 'Peach',
    fetal_skill_13_1: 'Reflexes developing',
    fetal_skill_13_2: 'Fingernails begin to grow',
    fetal_size_15: 'Apple',
    fetal_skill_15_1: 'Can frown and grimace',
    fetal_skill_15_2: 'Hears first muffled sounds',
    fetal_size_17: 'Avocado',
    fetal_skill_17_1: 'Practices sucking and swallowing',
    fetal_skill_17_2: 'Skeleton continues to harden',
    fetal_size_19: 'Sweet potato',
    fetal_skill_19_1: 'Movements often first felt',
    fetal_skill_19_2: 'Develops sleep-wake rhythm',
    fetal_size_21: 'Banana',
    fetal_skill_21_1: 'Responds to sounds from outside',
    fetal_skill_21_2: 'Eyelashes and eyebrows visible',
    fetal_size_23: 'Papaya',
    fetal_skill_23_1: 'Facial features clearly recognizable',
    fetal_skill_23_2: 'Practices breathing movements (still without air)',
    fetal_size_25: 'Eggplant',
    fetal_skill_25_1: 'Responds to light',
    fetal_skill_25_2: 'Fat layers begin to form',
    fetal_size_27: 'Cauliflower',
    fetal_skill_27_1: 'Eyes open occasionally',
    fetal_skill_27_2: 'Can have hiccups',
    fetal_size_29: 'Butternut squash',
    fetal_skill_29_1: 'Brain developing rapidly',
    fetal_skill_29_2: 'Responds more strongly to voices',
    fetal_size_31: 'Coconut',
    fetal_skill_31_1: 'Stronger, more coordinated movements',
    fetal_skill_31_2: 'Shows recognizable wake/sleep phases',
    fetal_size_33: 'Pineapple',
    fetal_skill_33_1: 'Bones continue to harden (except skull)',
    fetal_skill_33_2: 'Practices regular breathing',
    fetal_size_35: 'Honeydew melon',
    fetal_skill_35_1: 'Immune system continues to mature',
    fetal_skill_35_2: 'Usually turns head-down',
    fetal_size_37: 'Savoy cabbage',
    fetal_skill_37_1: 'Grasp reflex well developed',
    fetal_skill_37_2: 'Lungs approaching maturity',
    fetal_size_40: 'Pumpkin',
    fetal_skill_40_1: 'Considered full-term ("term" from week 39)',
    fetal_skill_40_2: 'Ready for birth',
    discharge: 'discharge',
    acne: 'skin changes',
  };
  const I18N_SCRIPT_PATH = '/menstruation_cycle/menstruation-i18n.js';
  const I18N_SCRIPT_SELECTOR = 'script[src]';
  let i18nScriptPromise = null;

  const ensureI18nState = () => {
    if (typeof window === 'undefined') {
      return {
        cache: { en: { ...PANEL_FALLBACK_EN } },
        loading: {},
        fallback: { en: { ...PANEL_FALLBACK_EN } },
      };
    }
    const i18n = window.menstruationCycleI18n || (window.menstruationCycleI18n = {});
    i18n.cache = i18n.cache || {};
    i18n.loading = i18n.loading || {};
    i18n.fallback = i18n.fallback || {};
    i18n.fallback.en = { ...PANEL_FALLBACK_EN, ...(i18n.fallback.en || {}) };
    i18n.cache.en = { ...(i18n.fallback.en || {}), ...(i18n.cache.en || {}) };
    return i18n;
  };

  const normalizeLang = (language) => {
    const normalized = String(language || 'en').toLowerCase();
    return normalized.startsWith('de') ? 'de' : 'en';
  };

  const listDocumentScripts = () => {
    if (typeof document === 'undefined') return [];
    if (typeof document.querySelectorAll === 'function') {
      return Array.from(document.querySelectorAll(I18N_SCRIPT_SELECTOR) || []);
    }
    return Array.from(document.scripts || []);
  };

  const matchesScriptPath = (script, scriptPath) => {
    const source = script?.getAttribute?.('src') || script?.src || '';
    return source.includes(scriptPath);
  };

  const extractResourceVersion = () => {
    const scripts = listDocumentScripts();
    for (const script of scripts) {
      const source = script?.getAttribute?.('src') || script?.src || '';
      if (!source.includes('/menstruation_cycle/')) continue;
      try {
        const url = new URL(source, typeof window !== 'undefined' ? window.location?.origin || 'http://localhost' : 'http://localhost');
        const version = url.searchParams.get('v');
        if (version) return version;
      } catch (_error) {
        const match = source.match(/[?&]v=([^&#]+)/);
        if (match?.[1]) return match[1];
      }
    }
    return null;
  };

  const WIDGET_DEFS = [
    { id: 'kpi_strip', title: 'dashboard_widget_today_status', sensitive: false, span: 12 },
    { id: 'phase_timeline', title: 'dashboard_widget_cycle_phase_overview', sensitive: false, span: 12 },
    { id: 'pregnancy_prediction', title: 'dashboard_widget_pregnancy_prediction', sensitive: false, span: 5 },
    { id: 'basal_temp', title: 'dashboard_widget_basal_temp', sensitive: false, span: 7 },
    { id: 'phase_donut', title: 'dashboard_widget_phase_donut', sensitive: false, span: 5 },
    { id: 'cycle_history', title: 'dashboard_widget_cycle_history', sensitive: false, span: 7 },
    { id: 'calendar_card', title: 'dashboard_widget_calendar_card', sensitive: false, span: 12 },
    { id: 'product_usage', title: 'dashboard_widget_product_usage', sensitive: false, span: 12 },
    { id: 'inventory_card', title: 'dashboard_widget_inventory_card', sensitive: false, span: 6 },
    { id: 'timer_card', title: 'dashboard_widget_timer_card', sensitive: false, span: 6 },
    { id: 'statistics_card', title: 'dashboard_widget_statistics_card', sensitive: false, span: 12 },
    { id: 'support_card', title: 'dashboard_widget_support_card', sensitive: false, span: 12 },
    { id: 'long_term_trend', title: 'dashboard_widget_long_term_trend', sensitive: false, span: 12 },
    { id: 'symptom_heatmap', title: 'dashboard_widget_symptom_heatmap', sensitive: false, span: 4 },
    { id: 'anomaly_insights', title: 'dashboard_widget_anomaly_insights', sensitive: false, span: 4 },
    { id: 'symptom_insights', title: 'dashboard_widget_symptom_insights', sensitive: false, span: 4 },
    { id: 'progress_badges', title: 'dashboard_widget_progress_badges', sensitive: false, span: 6 },
    { id: 'pain_mood_trend', title: 'dashboard_widget_pain_mood_trend', sensitive: false, span: 12 },
    { id: 'year_overview', title: 'dashboard_widget_year_overview', sensitive: false, span: 12 },
    { id: 'fetal_development', title: 'dashboard_widget_fetal_development', sensitive: false, span: 12 },
  ];

  // Default widget order matches the approved mockup layout exactly
  const WIDGET_IDS_GRAPH_FIRST = [
    'kpi_strip',
    'phase_timeline',
    'pregnancy_prediction',
    'basal_temp',
    'phase_donut',
    'cycle_history',
    'calendar_card',
    'product_usage',
    'inventory_card',
    'timer_card',
    'statistics_card',
    'support_card',
    'long_term_trend',
    'symptom_heatmap',
    'anomaly_insights',
    'symptom_insights',
    'progress_badges',
    'pain_mood_trend',
    'year_overview',
  ];

  const WIDGET_IDS = WIDGET_DEFS.map((widget) => widget.id);

  const PRESETS = {
    young: {
      discreetMode: true,
      widgetOrder: WIDGET_IDS_GRAPH_FIRST,
      widgetVisibility: {
        kpi_strip: true,
        phase_timeline: true,
        pregnancy_prediction: false,
        cycle_history: false,
        phase_donut: true,
        basal_temp: false,
        calendar_card: false,
        product_usage: true,
        inventory_card: true,
        timer_card: true,
        statistics_card: false,
        // Shown by default in pre-menarche/early-menarche modes, matching the
        // card's own documented default visibility.
        support_card: true,
        symptom_heatmap: false,
        anomaly_insights: false,
        symptom_insights: false,
        progress_badges: true,
        pain_mood_trend: false,
        year_overview: false,
      },
      myInfo: {
        displayName: '',
        pronouns: '',
      },
    },
    general: {
      discreetMode: false,
      widgetOrder: WIDGET_IDS_GRAPH_FIRST,
      widgetVisibility: {
        kpi_strip: true,
        phase_timeline: true,
        pregnancy_prediction: true,
        cycle_history: true,
        phase_donut: true,
        basal_temp: true,
        calendar_card: true,
        product_usage: true,
        inventory_card: true,
        timer_card: true,
        statistics_card: true,
        // Hidden by default in established_cycle mode, matching the card's own
        // documented default visibility — still available via edit mode.
        support_card: false,
        symptom_heatmap: true,
        anomaly_insights: true,
        symptom_insights: true,
        progress_badges: true,
        pain_mood_trend: true,
        year_overview: true,
      },
      myInfo: {
        displayName: '',
        pronouns: '',
      },
    },
  };

  // General pregnancy-education milestones by week — original wording, illustrative only, not medical advice.
  const FETAL_DEVELOPMENT_STAGES = [
    { maxWeek: 5, sizeKey: 'fetal_size_5', skillKeys: ['fetal_skill_5_1', 'fetal_skill_5_2'] },
    { maxWeek: 7, sizeKey: 'fetal_size_7', skillKeys: ['fetal_skill_7_1', 'fetal_skill_7_2'] },
    { maxWeek: 9, sizeKey: 'fetal_size_9', skillKeys: ['fetal_skill_9_1', 'fetal_skill_9_2'] },
    { maxWeek: 11, sizeKey: 'fetal_size_11', skillKeys: ['fetal_skill_11_1', 'fetal_skill_11_2'] },
    { maxWeek: 13, sizeKey: 'fetal_size_13', skillKeys: ['fetal_skill_13_1', 'fetal_skill_13_2'] },
    { maxWeek: 15, sizeKey: 'fetal_size_15', skillKeys: ['fetal_skill_15_1', 'fetal_skill_15_2'] },
    { maxWeek: 17, sizeKey: 'fetal_size_17', skillKeys: ['fetal_skill_17_1', 'fetal_skill_17_2'] },
    { maxWeek: 19, sizeKey: 'fetal_size_19', skillKeys: ['fetal_skill_19_1', 'fetal_skill_19_2'] },
    { maxWeek: 21, sizeKey: 'fetal_size_21', skillKeys: ['fetal_skill_21_1', 'fetal_skill_21_2'] },
    { maxWeek: 23, sizeKey: 'fetal_size_23', skillKeys: ['fetal_skill_23_1', 'fetal_skill_23_2'] },
    { maxWeek: 25, sizeKey: 'fetal_size_25', skillKeys: ['fetal_skill_25_1', 'fetal_skill_25_2'] },
    { maxWeek: 27, sizeKey: 'fetal_size_27', skillKeys: ['fetal_skill_27_1', 'fetal_skill_27_2'] },
    { maxWeek: 29, sizeKey: 'fetal_size_29', skillKeys: ['fetal_skill_29_1', 'fetal_skill_29_2'] },
    { maxWeek: 31, sizeKey: 'fetal_size_31', skillKeys: ['fetal_skill_31_1', 'fetal_skill_31_2'] },
    { maxWeek: 33, sizeKey: 'fetal_size_33', skillKeys: ['fetal_skill_33_1', 'fetal_skill_33_2'] },
    { maxWeek: 35, sizeKey: 'fetal_size_35', skillKeys: ['fetal_skill_35_1', 'fetal_skill_35_2'] },
    { maxWeek: 37, sizeKey: 'fetal_size_37', skillKeys: ['fetal_skill_37_1', 'fetal_skill_37_2'] },
    { maxWeek: 40, sizeKey: 'fetal_size_40', skillKeys: ['fetal_skill_40_1', 'fetal_skill_40_2'] },
  ];

  // Reads a single pre-menarche sign entry in either the legacy plain-string format
  // (just the stage) or the current {stage, logged_at, updated_at} format.
  const _normalizeSignEntry = (raw) => {
    if (raw == null || raw === '' || raw === 'none') return null;
    if (typeof raw === 'object') {
      const stage = raw.stage ?? null;
      if (stage == null || stage === '' || stage === 'none') return null;
      return { stage: String(stage), loggedAt: raw.logged_at || raw.updated_at || null };
    }
    // Legacy: plain string stage, no date available.
    return { stage: String(raw), loggedAt: null };
  };

  // Canonical sign metadata — keys MUST match PRE_MENARCHE_SIGN_OPTIONS in const.py
  // exactly, since these are sent verbatim as the `pre_menarche_sign` service field.
  // Using different keys here (as an earlier version of this file did) means logged
  // data would never be found by any of the reading/estimating code below, and the
  // service call itself would be rejected with "Unknown pre-menarche sign".
  const PRE_MENARCHE_SIGNS = {
    pubic_hair_growth: {
      labelKey: 'pubic_hair', checklistLabelKey: 'menarche_sign_pubic_hair',
      options: ['stage_1', 'stage_2', 'stage_3', 'stage_4', 'stage_5'],
    },
    breast_development: {
      labelKey: 'breast', checklistLabelKey: 'menarche_sign_breast',
      options: ['stage_1', 'stage_2', 'stage_3', 'stage_4', 'stage_5'],
    },
    height_spurt: {
      labelKey: 'height_spurt', checklistLabelKey: 'menarche_sign_height_spurt',
      options: ['none', 'slight', 'moderate', 'significant'],
    },
    mood_changes: {
      labelKey: 'mood', checklistLabelKey: 'menarche_sign_mood',
      options: ['stable', 'mild_changes', 'noticeable_changes', 'significant_changes'],
    },
    acne: {
      labelKey: 'acne', checklistLabelKey: 'menarche_sign_acne',
      options: ['none', 'slight', 'moderate', 'severe'],
    },
    body_odor: {
      labelKey: 'body_odor', checklistLabelKey: 'menarche_sign_body_odor',
      options: ['none', 'slight', 'moderate', 'strong'],
    },
    vaginal_discharge: {
      labelKey: 'discharge', checklistLabelKey: 'menarche_sign_discharge',
      options: ['none', 'clear', 'white', 'clear_to_white'],
    },
  };
  const PRE_MENARCHE_SIGN_KEYS = Object.keys(PRE_MENARCHE_SIGNS);

  // Typical (widely-known, general) lead time from a sign's onset to menarche, used only
  // when we have a real logged_at date for that sign. Ordered by how proximate/reliable
  // the signal is — discharge is the closest predictor, breast/pubic hair the least.
  // These are illustrative averages with wide individual variation, not a diagnosis.
  //
  // vaginal_discharge uses the commonly-cited ~12-18 month window from onset of
  // physiologic discharge (leukorrhea) to menarche, rather than a single point value:
  // - 365 days (12 months, the near end of the range) when corroborated by a second
  //   concurrent late-stage sign (moderate/severe acne logged around the same time) —
  //   multiple concurrent late signs together suggest being further along, not just
  //   discharge in isolation.
  // - 456 days (~15 months, the range's midpoint) otherwise.
  const MENARCHE_OFFSET_DAYS = {
    vaginal_discharge_corroborated: 365,  // ~12 months (lower end of 12-18mo range)
    vaginal_discharge: 456,               // ~15 months (midpoint of 12-18mo range)
    height_spurt: 365,           // ~12 months (growth spurt peak typically precedes menarche by ~1 year)
    breast_development: 640,     // ~21 months (thelarche typically precedes menarche by ~2 years)
    pubic_hair_growth: 610,      // ~20 months
  };
  const MENARCHE_SIGN_PRIORITY = ['vaginal_discharge', 'height_spurt', 'breast_development', 'pubic_hair_growth'];

  /**
   * Builds a dynamic menarche estimate from whichever logged, dated sign is most
   * proximate/reliable. Returns null if no dated signs are available yet.
   */
  const _estimateMenarcheFromSigns = (signs) => {
    for (const key of MENARCHE_SIGN_PRIORITY) {
      const entry = _normalizeSignEntry(signs[key]);
      if (!entry || !entry.loggedAt) continue;
      if (key === 'height_spurt' && !['moderate', 'significant'].includes(entry.stage)) continue;
      const anchor = new Date(entry.loggedAt);
      if (Number.isNaN(anchor.getTime())) continue;

      let offsetDays = MENARCHE_OFFSET_DAYS[key];
      let corroborated = false;
      if (key === 'vaginal_discharge') {
        // A concurrently-logged moderate/severe acne sign is treated as reinforcing
        // the discharge signal — two late-stage signs together point to being
        // further along, so lean toward the nearer end of the 12-18 month range.
        const acneEntry = _normalizeSignEntry(signs.acne);
        if (acneEntry && ['moderate', 'severe'].includes(acneEntry.stage)) {
          offsetDays = MENARCHE_OFFSET_DAYS.vaginal_discharge_corroborated;
          corroborated = true;
        }
      }

      const estimated = new Date(anchor.getTime() + offsetDays * 86400000);
      return { anchorDate: entry.loggedAt, estimatedDate: estimated, sourceSign: key, corroborated };
    }
    return null;
  };

  const _fetalStageForWeek = (week) => {
    const w = Math.max(4, Math.min(40, Math.round(week)));
    return FETAL_DEVELOPMENT_STAGES.find((s) => w <= s.maxWeek) || FETAL_DEVELOPMENT_STAGES[FETAL_DEVELOPMENT_STAGES.length - 1];
  };

  // Maps a pregnancy week (1-40) onto the matching pregnancy month (preg_01.svg = month 1,
  // ... preg_09.svg = month 9), using standard 4-week pregnancy months. Weeks 37-40 stay
  // clamped to month 9 (full term).
  const _pregnancyAssetIndex = (week) => {
    const w = Math.max(1, Math.min(40, week));
    const month = Math.min(9, Math.max(1, Math.ceil(w / 4)));
    return String(month).padStart(2, '0');
  };

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  /**
   * Safe JSON.parse wrapper that never throws to the UI runtime.
   * - Returns `fallback` for null, undefined, or non-string inputs that are not plain objects/arrays.
   * - Returns the input unchanged when it is already an object or array.
   * - Catches parse errors, logs a warning, and returns `fallback`.
   * @param {*} value - The value to parse.
   * @param {*} [fallback=null] - Value returned on failure.
   * @returns {*} Parsed value or fallback.
   */
  const safeJsonParse = (value, fallback = null) => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return fallback;
    try {
      return JSON.parse(value);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[menstruation-cycle] safeJsonParse failed:', err.message);
      return fallback;
    }
  };

  /**
   * Normalize an arbitrary item object to a safe shape with title, url, and description.
   * Prevents crashes when fields such as html_url are missing or the item is null/undefined.
   * @param {*} item
   * @returns {{ title: string, url: string|null, description: string }}
   */
  const _normalizeItem = (item) => ({
    title: String(item?.title ?? item?.id ?? ''),
    url: item?.html_url ?? null,
    description: String(item?.description ?? ''),
  });

  class MenstruationCycleDashboardPanel extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._hass = null;
      this._lang = 'en';
      this._editMode = false;
      this._editDraft = null;
      // Quick "log today" modal state — a lighter-weight alternative to opening
      // the full calendar, using the shared symptom config from
      // menstruation-functions.js (the same one the calendar/gauge cards use).
      this._quickLogOpen = false;
      this._quickLogSelections = {};
      // Local, offline Q&A widget — no external AI, pattern-matches against
      // real cycle data + a small glossary. History kept in memory only (not
      // persisted), reset on page reload.
      this._chatHistory = [];
      // Persistent floating chat button (bottom-right), replacing the old
      // scroll-to-find grid widget — always one tap away instead of buried
      // in the dashboard.
      this._chatFabOpen = false;
      this._prefs = null;
      this._activeProfile = 'default';
      this._activeMode = 'general';
      this._selectedEntityId = null;
      this._message = '';
      this._pending = false;
      this._quickLogScratch = { mood: '', note: '' };
      this._expandedSign = null;
      this._yearOverviewYear = null;
      this._i18nLanguagePromises = {};
      this._lastRenderSig = null;
      this._debugEnabled = this._readDebugFlag();
      this._availableEntities = null;
      this._entitiesPromise = null;
      this._registryLoaded = false;
      // Single-flight scheduler state
      this._updateScheduled = false;
      this._updateRunning = false;
      // Incrementing version bumped on every prefs write, used in render signature
      this._prefsVersion = 0;
      // Tags that never became defined within the timeout in _watchEmbeddedCard(),
      // used to show an honest "not available" message instead of an infinite spinner.
      this._embeddedCardTimedOut = new Set();
      // General-purpose cache for the complete, uncompacted symptom_history +
      // product_usage — fetched via the get_full_history service, which reads
      // straight from the backend's full in-memory data, bypassing the entity
      // attribute size-shedding pipeline entirely (confirmed via logs: under
      // heavy tracking history, symptom_history can be dropped from the sensor's
      // attributes completely, not just capped to the most recent ~30 entries).
      // Keyed by profile so multiple profiles' data doesn't collide.
      this._fullHistoryCache = {};
      this._fullHistoryFetching = new Set();

      // Bound once here (not as inline arrow functions in connectedCallback) so the
      // same function reference is reused across every connectedCallback call. Home
      // Assistant can reconnect this panel element when navigating away and back in
      // the sidebar, firing connectedCallback more than once per session — with a
      // stable reference, addEventListener's built-in dedup (same type + same
      // callback = no-op) prevents listeners from stacking up and firing multiple
      // times per interaction.
      this._boundHandleClick = (event) => this._handleClick(event);
      this._boundHandleChange = (event) => this._handleChange(event);
      this._boundHandleSubmit = (event) => this._handleSubmit(event);
      this._boundHandleChatEnter = () => this._handleChatSend();
      this._boundDragPointerDown = (event) => this._handleDragPointerDown(event);
      this._boundDragPointerMove = (event) => this._handleDragPointerMove(event);
      this._boundDragPointerUp = (event) => this._handleDragPointerUp(event);
    }

    disconnectedCallback() {
      // Clear any in-progress drag so a stuck 'dragging' visual state can't survive
      // into a future reconnect. Event listeners are tied to the shadowRoot (which is
      // destroyed with the element) so they don't need explicit removal here, and the
      // setTimeout-based resource-loading polls are self-terminating.
      this._dragState = null;
    }

    connectedCallback() {
      this.shadowRoot?.addEventListener('click', this._boundHandleClick);
      this.shadowRoot?.addEventListener('change', this._boundHandleChange);
      this.shadowRoot?.addEventListener('submit', this._boundHandleSubmit);
      this.addEventListener('mc-chat-enter', this._boundHandleChatEnter);

      // Widget reordering drag-and-drop (edit mode). Uses Pointer Events rather than
      // the native HTML5 Drag-and-Drop API, since that API has poor/inconsistent
      // touch support — and Home Assistant dashboards are very commonly used on
      // phones/tablets, where a mouse-only reorder gesture would be unusable. Attached
      // once here via delegation (not re-attached per render) since drag state needs
      // to persist across pointermove events without the whole panel re-rendering
      // mid-drag, which would destroy the dragged DOM node.
      this.shadowRoot?.addEventListener('pointerdown', this._boundDragPointerDown);
      this.shadowRoot?.addEventListener('pointermove', this._boundDragPointerMove);
      this.shadowRoot?.addEventListener('pointerup', this._boundDragPointerUp);
      this.shadowRoot?.addEventListener('pointercancel', this._boundDragPointerUp);

      // Several real Lovelace-style cards (calendar, heatmap, support, product
      // inventory, countdown timer, statistics) live in their own script files.
      // As plain Lovelace *resources* they may never actually get requested by the
      // browser in a custom sidebar-panel context (unlike a normal Lovelace view,
      // which auto-loads its configured resources) — so don't just wait for them to
      // maybe show up; actively inject a <script src="..."> for each one ourselves,
      // the same way _ensureI18nLoaded() already does for the i18n script. This
      // guarantees the request happens regardless of how HA treats resources for
      // custom panels.
      const embeddedCardScripts = {
        'menstruation-calendar-card': 'menstruation-calendar-card.js',
        'menstruation-cycle-heatmap-card': 'menstruation-cycle-heatmap-card.js',
        'menstruation-support-card': 'menstruation-support-card.js',
        'menstruation-product-inventory-card': 'menstruation-product-inventory-card.js',
        'menstruation-countdown-timer': 'menstruation-countdown-timer.js',
        'menstruation-statistics-card': 'menstruation-statistics-card.js',
      };
      if (typeof customElements !== 'undefined') {
        Object.entries(embeddedCardScripts).forEach(([tag, fileName]) => {
          if (!customElements.get(tag)) {
            this._ensureCardScriptLoaded(fileName);
            const timeoutMs = 20000;
            let settled = false;
            customElements.whenDefined(tag).then(() => {
              settled = true;
              if (this.isConnected) this.render();
            }).catch(() => {});
            setTimeout(() => {
              if (!settled && !customElements.get(tag)) {
                this._embeddedCardTimedOut.add(tag);
                if (this.isConnected) this.render();
              }
            }, timeoutMs);
          }
        });
      }

      // window.ProductIcons (menstruation-functions.js) gives theme-tinted masked SVG
      // icons instead of our plain <img> fallback, but it's a plain global set by a
      // script tag — no whenDefined() equivalent — so poll briefly instead.
      // window.ProductIcons / window.MenstruationFunctions (both from
      // menstruation-functions.js) are plain globals set by a script tag, not
      // a custom element, so there's no whenDefined() to hook into — but
      // unlike the polling below (which only waits and hopes), actively
      // request the script ourselves first, for the same reason explained
      // above for the embedded cards: a standalone sidebar panel doesn't
      // reliably get Lovelace resources auto-loaded, so nothing else may
      // ever trigger this file to load at all.
      this._ensureCardScriptLoaded('menstruation-functions.js');
      if (typeof window !== 'undefined' && !window.ProductIcons) {
        let attempts = 0;
        const poll = () => {
          attempts += 1;
          if (window.ProductIcons) {
            if (this.isConnected) this.render();
            return;
          }
          if (attempts < 15) setTimeout(poll, 200);
        };
        setTimeout(poll, 200);
      }
    }

    set hass(hass) {
      this._hass = hass;
      this._requestUpdateFromHass();
    }

    /**
     * Lightweight scheduler: coalesces rapid hass ticks into a single _processUpdate() run.
     * Multiple calls while an update is already running are collapsed into one queued run.
     */
    _requestUpdateFromHass() {
      if (this._updateRunning) {
        // An update is in progress — mark that another pass is needed when it finishes.
        if (!this._updateScheduled) {
          this._updateScheduled = true;
          this._debug('update coalesced');
        }
        return;
      }
      if (this._updateScheduled) {
        // Already queued for the next microtask; nothing more to do.
        return;
      }
      this._updateScheduled = true;
      Promise.resolve().then(() => this._drainUpdateQueue());
    }

    _drainUpdateQueue() {
      this._updateScheduled = false;
      this._updateRunning = true;
      let chain = Promise.resolve();
      try {
        chain = this._processUpdate();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[menstruation-cycle] _processUpdate threw synchronously:', err);
      }
      Promise.resolve(chain)
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error('[menstruation-cycle] _processUpdate rejected:', err);
        })
        .finally(() => {
          this._updateRunning = false;
          if (this._updateScheduled) {
            // Another hass tick arrived while we were running — process once more.
            this._drainUpdateQueue();
          }
        });
    }

    async _processUpdate() {
      // 1. Detect language change and ensure i18n is loaded (cached after first load per lang).
      const newLang = this._detectLang();
      if (newLang !== this._lang) {
        this._lang = newLang;
        await this._loadI18nLanguageOnce(newLang).catch(() => null);
      }

      // 2. Trigger entity discovery once per component lifetime.
      if (!this._registryLoaded && !this._entitiesPromise) {
        this._entitiesPromise = this._loadEntitiesFromRegistry()
          .then((entities) => {
            this._availableEntities = entities;
            this._registryLoaded = true;
            this._entitiesPromise = null;
          })
          .catch((err) => {
            // eslint-disable-next-line no-console
            console.warn('[menstruation-cycle] Entity registry load failed, falling back to state scan:', err);
            this._availableEntities = this._getAvailableEntitiesFallback();
            this._registryLoaded = true;
            this._entitiesPromise = null;
          });
        // Wait for the first discovery to finish before proceeding.
        await this._entitiesPromise;
      }

      // 3. Stabilize entity selection (change only if current selection is invalid/missing).
      const available = this._availableEntities || this._getAvailableEntitiesFallback();
      const userId = this._hass?.user?.id;
      if (available.length > 0) {
        const currentStillValid = this._selectedEntityId && available.some((e) => e.entityId === this._selectedEntityId);
        if (!currentStillValid) {
          const savedEntityId = userId ? this._getSelectedEntity(userId) : null;
          const found = savedEntityId ? available.find((e) => e.entityId === savedEntityId) : null;
          const next = (found || available[0]).entityId;
          if (next !== this._selectedEntityId) {
            this._debug('selection changed (invalid -> fallback)', { before: this._selectedEntityId, after: next });
            this._selectedEntityId = next;
          }
        }
      } else if (this._selectedEntityId !== null) {
        this._debug('selection changed (invalid -> fallback)', { before: this._selectedEntityId, after: null });
        this._selectedEntityId = null;
      }

      // 4. Derive profile/mode/prefs from selected entity (no storage writes here).
      const stateObj = this._selectedEntityId ? (this._hass?.states?.[this._selectedEntityId] || null) : null;
      const newProfile = stateObj?.attributes?.profile || 'default';
      const newMode = this._resolveMode(stateObj);
      if (!this._prefs || this._prefs.__profile !== newProfile || this._prefs.__mode !== newMode) {
        this._activeProfile = newProfile;
        this._activeMode = newMode;
        this._prefs = this._loadPrefs(newProfile, newMode);
        this._prefsVersion++;
      }

      // 5. Compute canonical render signature and gate rendering.
      const nextSig = this._buildRenderSig(stateObj);
      if (nextSig === this._lastRenderSig) {
        this._debug('skip render (sig unchanged)');
        return;
      }
      const reason = this._describeSigChange(this._lastRenderSig, nextSig);
      this._debug(`render (sig changed: ${reason})`);
      this._lastRenderSig = nextSig;
      this.render();
    }

    _detectLang() {
      const language = this._hass?.locale?.language || this._hass?.language || navigator.language || 'en';
      return ensureI18nState().normalizeLang?.(language) || normalizeLang(language);
    }

    _getI18n() {
      return ensureI18nState();
    }

    _buildI18nScriptUrl() {
      const resourceVersion = extractResourceVersion();
      return resourceVersion ? `${I18N_SCRIPT_PATH}?v=${encodeURIComponent(resourceVersion)}` : I18N_SCRIPT_PATH;
    }

    _ensureI18nLoaded() {
      const i18n = this._getI18n();
      if (typeof i18n.load === 'function') return Promise.resolve(i18n);
      if (i18nScriptPromise) return i18nScriptPromise;
      if (typeof document === 'undefined') return Promise.resolve(i18n);

      const existingScript = listDocumentScripts().find((script) => matchesScriptPath(script, I18N_SCRIPT_PATH));
      const script = existingScript || document.createElement('script');
      if (!existingScript) {
        script.src = this._buildI18nScriptUrl();
        script.async = true;
        script.dataset.menstruationCycleI18n = 'true';
      }

      i18nScriptPromise = new Promise((resolve) => {
        let timeoutId = null;
        const finalize = () => {
          if (timeoutId) clearTimeout(timeoutId);
          script.removeEventListener?.('load', handleLoad);
          script.removeEventListener?.('error', handleDone);
          resolve(this._getI18n());
        };
        const handleLoad = () => finalize();
        const handleDone = () => finalize();

        if (typeof this._getI18n().load === 'function') {
          finalize();
          return;
        }

        timeoutId = setTimeout(handleDone, 4000);
        script.addEventListener?.('load', handleLoad, { once: true });
        script.addEventListener?.('error', handleDone, { once: true });

        if (!existingScript) {
          (document.head || document.body || document.documentElement)?.appendChild?.(script);
        }
      }).finally(() => {
        const latestI18n = this._getI18n();
        if (typeof latestI18n.load !== 'function') {
          i18nScriptPromise = null;
        }
      });

      return i18nScriptPromise;
    }

    /**
     * Actively injects a <script src="..."> for one of the 6 embedded card files if
     * it isn't already present in the document, instead of passively assuming Home
     * Assistant already loaded it as a Lovelace resource. A custom sidebar panel
     * doesn't get the same automatic resource-loading a normal Lovelace view does,
     * so without this the browser may simply never request these files at all.
     * Deduplicates against concurrent calls and against a script tag already present
     * (e.g. because it *was* auto-loaded as a resource after all).
     */
    _ensureCardScriptLoaded(fileName) {
      if (typeof document === 'undefined') return;
      this._loadedCardScripts = this._loadedCardScripts || new Set();
      if (this._loadedCardScripts.has(fileName)) return;

      const scriptPath = `/menstruation_cycle/${fileName}`;
      const already = listDocumentScripts().some((script) => matchesScriptPath(script, scriptPath));
      if (already) {
        this._loadedCardScripts.add(fileName);
        return;
      }

      this._loadedCardScripts.add(fileName);
      const resourceVersion = extractResourceVersion();
      const script = document.createElement('script');
      script.src = resourceVersion ? `${scriptPath}?v=${encodeURIComponent(resourceVersion)}` : scriptPath;
      script.async = true;
      script.dataset.menstruationCycleCard = fileName;
      (document.head || document.body || document.documentElement)?.appendChild?.(script);
    }

    _loadI18nLanguage(lang) {
      const i18n = this._getI18n();
      if (typeof i18n.load !== 'function') return Promise.resolve(i18n.cache?.[lang] || i18n.cache?.en || {});
      return i18n.load(lang).catch(() => i18n.cache?.[lang] || i18n.cache?.en || {});
    }

    _loadI18nLanguageOnce(lang) {
      if (!lang) return Promise.resolve();
      if (this._i18nLanguagePromises[lang]) return this._i18nLanguagePromises[lang];
      this._i18nLanguagePromises[lang] = this._ensureI18nLoaded()
        .then(() => this._loadI18nLanguage(lang))
        .catch(() => null);
      return this._i18nLanguagePromises[lang];
    }

    _buildSelectedEntitySignature(stateObj) {
      const attrs = stateObj?.attributes || {};
      const relevantAttrs = {
        profile: attrs.profile ?? null,
        entry_id: attrs.entry_id ?? null,
        friendly_name: attrs.friendly_name ?? null,
        onboarding_stage_effective: attrs.onboarding_stage_effective ?? null,
        onboarding_stage: attrs.onboarding_stage ?? null,
        cycle_day: attrs.cycle_day ?? null,
        days_until_next_start: attrs.days_until_next_start ?? null,
        next_predicted_start: attrs.next_predicted_start ?? null,
        period_forecast: attrs.period_forecast ?? null,
        progress_badges: attrs.progress_badges ?? null,
        average_cycle_length: attrs.average_cycle_length ?? null,
        cycle_length_avg: attrs.cycle_length_avg ?? null,
        prediction_gating: attrs.prediction_gating ?? null,
        current_phase: attrs.current_phase ?? null,
        phase_day: attrs.phase_day ?? null,
      };
      const signaturePayload = {
        entityId: this._selectedEntityId || null,
        state: stateObj?.state ?? null,
        attrs: relevantAttrs,
      };
      return JSON.stringify(signaturePayload);
    }

    /**
     * Canonical render signature covering all fields that affect what is rendered.
     * render() is called only when this value changes between scheduler runs.
     */
    _buildRenderSig(stateObj) {
      const attrs = stateObj?.attributes || {};
      const available = this._availableEntities || [];
      return JSON.stringify({
        lang: this._lang,
        selectedEntityId: this._selectedEntityId || null,
        entityState: stateObj?.state ?? null,
        entityAttrs: {
          profile: attrs.profile ?? null,
          entry_id: attrs.entry_id ?? null,
          friendly_name: attrs.friendly_name ?? null,
          onboarding_stage_effective: attrs.onboarding_stage_effective ?? null,
          onboarding_stage: attrs.onboarding_stage ?? null,
          cycle_day: attrs.cycle_day ?? null,
          days_until_next_start: attrs.days_until_next_start ?? null,
          next_predicted_start: attrs.next_predicted_start ?? null,
          period_forecast: attrs.period_forecast ?? null,
          progress_badges: attrs.progress_badges ?? null,
          average_cycle_length: attrs.average_cycle_length ?? null,
          cycle_length_avg: attrs.cycle_length_avg ?? null,
          prediction_gating: attrs.prediction_gating ?? null,
          current_phase: attrs.current_phase ?? null,
          phase_day: attrs.phase_day ?? null,
          grouped_starts: attrs.grouped_starts ?? null,
          fertility_forecast: attrs.fertility_forecast ?? null,
          basal_temperatures: attrs.basal_temperatures ?? attrs.bbt_readings ?? null,
          symptom_history: attrs.symptom_history ?? attrs.symptoms_last_30 ?? null,
        },
        editMode: this._editMode,
        prefsVersion: this._prefsVersion,
        availableCount: available.length,
        availableIds: available.map((e) => e.entityId).join('|'),
      });
    }

    /** Returns a human-readable reason string for why the signature changed. */
    _describeSigChange(prev, next) {
      if (!prev) return 'initial';
      try {
        const a = JSON.parse(prev);
        const b = JSON.parse(next);
        const reasons = [];
        if (a.lang !== b.lang) reasons.push('lang');
        if (a.selectedEntityId !== b.selectedEntityId) reasons.push('selectedEntityId');
        if (a.entityState !== b.entityState) reasons.push('entityState');
        if (JSON.stringify(a.entityAttrs) !== JSON.stringify(b.entityAttrs)) reasons.push('entityAttrs');
        if (a.editMode !== b.editMode) reasons.push('editMode');
        if (a.prefsVersion !== b.prefsVersion) reasons.push('prefsVersion');
        if (a.availableCount !== b.availableCount || a.availableIds !== b.availableIds) reasons.push('availableEntities');
        return reasons.join(',') || 'unknown';
      } catch (_e) {
        return 'parse_error';
      }
    }

    _readDebugFlag() {
      try {
        if (typeof window === 'undefined') return false;
        if (window.MENSTRUATION_CYCLE_DASHBOARD_DEBUG === true) return true;
        return window.localStorage?.getItem('menstruation_cycle.dashboard_debug') === '1';
      } catch (_error) {
        return false;
      }
    }

    _debug(message, payload) {
      if (!this._debugEnabled) return;
      // eslint-disable-next-line no-console
      console.debug('[menstruation-cycle][dashboard]', message, payload);
    }

    _resolveMode(stateObj) {
      const stage = String(
        stateObj?.attributes?.onboarding_stage_effective || stateObj?.attributes?.onboarding_stage || 'established_cycle',
      ).toLowerCase();
      return stage === 'pre_menarche' || stage === 'early_menarche' ? 'young' : 'general';
    }

    _storageKey(profile) {
      const userId = this._hass?.user?.id || 'anon';
      return `menstruation_cycle.dashboard_prefs.${userId}.${profile}`;
    }

    _preset(mode) {
      return JSON.parse(JSON.stringify(PRESETS[mode] || PRESETS.general));
    }

    _normalizePrefs(raw, profile, mode) {
      const preset = this._preset(mode);
      const widgetVisibility = { ...preset.widgetVisibility, ...(raw?.widgetVisibility || {}) };
      const rawOrder = Array.isArray(raw?.widgetOrder) ? raw.widgetOrder.filter((id) => WIDGET_IDS.includes(id)) : [];
      const widgetOrder = [...rawOrder, ...WIDGET_IDS.filter((id) => !rawOrder.includes(id))];
      const discreetMode = typeof raw?.discreetMode === 'boolean' ? raw.discreetMode : preset.discreetMode;
      return {
        __profile: profile,
        __mode: mode,
        discreetMode,
        widgetVisibility,
        widgetOrder,
        myInfo: {
          displayName: String(raw?.myInfo?.displayName || '').trim(),
          pronouns: String(raw?.myInfo?.pronouns || '').trim(),
        },
      };
    }

    _loadPrefs(profile, mode) {
      const preset = this._preset(mode);
      const raw = safeJsonParse(localStorage.getItem(this._storageKey(profile)));
      return this._normalizePrefs(raw, profile, mode);
    }

    _savePrefs() {
      if (!this._prefs) return;
      const { __profile, __mode, ...persisted } = this._prefs;
      localStorage.setItem(this._storageKey(this._activeProfile), JSON.stringify(persisted));
      this._prefsVersion++;
    }

    _findPrimaryState() {
      if (!this._hass?.states) return null;
      const entries = Object.entries(this._hass.states)
        .filter(([entityId, state]) => entityId.startsWith('sensor.') && state?.attributes?.is_primary_profile_sensor === true);
      if (!entries.length) return null;
      entries.sort(([a], [b]) => a.localeCompare(b));
      return entries[0][1];
    }

    _getAvailableEntitiesFallback() {
      const states = this._hass?.states || {};
      const allSensors = Object.entries(states).filter(([id]) => id.startsWith('sensor.'));

      // Primary strategy: explicit marker (best, robust to entity_id renames) —
      // set only on the one sensor per profile meant to represent a selectable
      // person, not on the profile's other sensors (product usage, basal temp,
      // etc.) even though those also carry profile/entry_id attributes.
      let entities = allSensors
        .filter(([, state]) => state?.attributes?.is_primary_profile_sensor === true)
        .map(([entityId, state]) => ({
          entityId,
          name: state.attributes?.friendly_name || state.attributes?.profile || entityId,
          profile: state.attributes?.profile || '',
        }));

      // Fallback for older backend versions without the marker attribute yet:
      // integration markers (entry_id + profile), excluding known non-primary
      // per-profile sensors by entity_id pattern as a best-effort guess.
      if (entities.length === 0) {
        const isKnownSecondarySensor = (id) => id.includes('period_products') || id.includes('products_today') || id.includes('basal_temp');
        entities = allSensors
          .filter(([entityId, state]) =>
            !isKnownSecondarySensor(entityId) &&
            !!state?.attributes?.entry_id &&
            !!state?.attributes?.profile
          )
          .map(([entityId, state]) => ({
            entityId,
            name: state.attributes?.friendly_name || state.attributes?.profile || entityId,
            profile: state.attributes?.profile || '',
          }));
      }

      // Fallback if markers are missing on your setup:
      // keep non-period_products sensors that at least look cycle-related by attributes
      if (entities.length === 0) {
        const isPeriodProducts = (id) => id.includes('period_products') || id.includes('products_today');
        entities = allSensors
          .filter(([entityId, state]) => {
            if (isPeriodProducts(entityId)) return false;
            const a = state?.attributes || {};
            return (
              a.cycle_day !== undefined ||
              a.days_until_next_start !== undefined ||
              a.next_predicted_start !== undefined ||
              a.onboarding_stage !== undefined ||
              a.onboarding_stage_effective !== undefined
            );
          })
          .map(([entityId, state]) => ({
            entityId,
            name: state?.attributes?.friendly_name || entityId,
            profile: state?.attributes?.profile || '',
          }));
      }

      return entities.sort((a, b) => a.name.localeCompare(b.name));
    }

    _getAvailableEntities() {
      return this._availableEntities || this._getAvailableEntitiesFallback();
    }

    async _loadEntitiesFromRegistry() {
      if (!this._hass?.connection) throw new Error('No hass connection');
      const conn = this._hass.connection;

      // Defensive timeout — these WebSocket calls previously had no time
      // limit at all. If either one hangs (no error, just never resolving —
      // e.g. an unresponsive connection), the entire dashboard would be
      // stuck on the loading screen forever with nothing in the console to
      // diagnose, since a hang isn't a rejection. 8s is generous for a
      // normal HA instance while still bounding the worst case.
      const withTimeout = (promise, label) => Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out waiting for ${label}`)), 8000)),
      ]);

      // 1. Get all config entries for this integration
      const configEntries = await withTimeout(conn.sendMessagePromise({ type: 'config_entries/get' }), 'config_entries/get');
      const integrationEntryIds = new Set(
        (Array.isArray(configEntries) ? configEntries : [])
          .filter((entry) => entry.domain === 'menstruation_cycle')
          .map((entry) => entry.entry_id)
      );

      if (integrationEntryIds.size === 0) {
        this._debug('No menstruation_cycle config entries found, using fallback');
        return this._getAvailableEntitiesFallback();
      }

      // 2. Get entity registry and filter to our integration's sensors
      const entityRegistry = await withTimeout(conn.sendMessagePromise({ type: 'config/entity_registry/list' }), 'config/entity_registry/list');
      const registeredEntityIds = new Set(
        (Array.isArray(entityRegistry) ? entityRegistry : [])
          .filter(
            (entry) =>
              entry.config_entry_id &&
              integrationEntryIds.has(entry.config_entry_id) &&
              entry.entity_id.startsWith('sensor.')
          )
          .map((entry) => entry.entity_id)
      );

      // 3. Map to current states — keep only the one sensor per profile marked
      // as the primary/selectable one (the registry entries above don't carry
      // live state attributes, so this marker can only be checked here, not
      // in the registry filter above).
      const states = this._hass?.states || {};
      const buildEntity = (entityId) => {
        const state = states[entityId];
        return {
          entityId,
          name: state?.attributes?.friendly_name || entityId,
          profile: state?.attributes?.profile || '',
        };
      };

      let entities = Array.from(registeredEntityIds)
        .filter((entityId) => entityId in states && states[entityId]?.attributes?.is_primary_profile_sensor === true)
        .map(buildEntity);

      // Safety net for a backend that hasn't been updated yet (doesn't set the
      // marker attribute): fall back to a best-effort name-pattern exclusion
      // rather than leaving the person with zero selectable profiles.
      if (entities.length === 0) {
        const isKnownSecondarySensor = (id) => id.includes('period_products') || id.includes('products_today') || id.includes('basal_temp');
        entities = Array.from(registeredEntityIds)
          .filter((entityId) => entityId in states && !isKnownSecondarySensor(entityId))
          .map(buildEntity);
      }

      entities.sort((a, b) => a.name.localeCompare(b.name));
      this._debug('Registry-discovered entities', entities.map((e) => e.entityId));
      return entities;
    }

    _applyEntitySelection() {
      const available = this._availableEntities || [];
      const userId = this._hass?.user?.id;
      if (available.length > 0) {
        const currentStillValid = this._selectedEntityId && available.some((e) => e.entityId === this._selectedEntityId);
        if (!currentStillValid) {
          const savedEntityId = userId ? this._getSelectedEntity(userId) : null;
          const found = savedEntityId ? available.find((e) => e.entityId === savedEntityId) : null;
          this._selectedEntityId = (found || available[0]).entityId;
        }
      } else {
        this._selectedEntityId = null;
      }
    }

    _selectedEntityKey(userId) {
      return `menstruation_cycle.dashboard_selected_entity.${userId}`;
    }

    _getSelectedEntity(userId) {
      try {
        const saved = localStorage.getItem(this._selectedEntityKey(userId));
        return saved ? JSON.parse(saved) : null;
      } catch (_error) {
        return null;
      }
    }

    _setSelectedEntity(userId, entityId) {
      try {
        localStorage.setItem(this._selectedEntityKey(userId), JSON.stringify(entityId));
      } catch (_error) {
        // localStorage may be unavailable (e.g. Safari private mode)
      }
    }

    _handleEntityChange(entityId) {
      const userId = this._hass?.user?.id;
      if (userId) {
        this._setSelectedEntity(userId, entityId);
      }
      this._selectedEntityId = entityId;
      const stateObj = this._hass?.states?.[entityId] || null;
      this._activeProfile = stateObj?.attributes?.profile || 'default';
      this._activeMode = this._resolveMode(stateObj);
      this._prefs = this._loadPrefs(this._activeProfile, this._activeMode);
      this._prefsVersion++;
      // Force render regardless of sig — entity was explicitly changed by user
      this._lastRenderSig = null;
      this.render();
    }

    _t(key) {
      const i18n = this._getI18n();
      const dict = i18n.cache?.[this._lang] || {};
      const english = i18n.cache?.en || i18n.fallback?.en || PANEL_FALLBACK_EN;
      return dict[key] ?? english[key] ?? key;
    }

    _todayIso() {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // Maps our 5 supported language codes to full locale codes for date formatting.
    _localeCode() {
      const map = { de: 'de-DE', en: 'en-US', fr: 'fr-FR', es: 'es-ES', sv: 'sv-SE' };
      return map[this._lang] || 'en-US';
    }

    /**
     * Formats an ISO date string (YYYY-MM-DD) for display in the person's language
     * (e.g. "16.08.2026" for German, "8/16/2026" for English) instead of showing the
     * raw ISO string. Returns the original value unchanged if it isn't a valid date,
     * so callers can safely pass through already-formatted or placeholder values.
     */
    _formatDate(isoString, options = { day: '2-digit', month: '2-digit', year: 'numeric' }) {
      if (!isoString) return isoString;
      const d = new Date(isoString);
      if (Number.isNaN(d.getTime())) return isoString;
      try {
        return d.toLocaleDateString(this._localeCode(), options);
      } catch (_err) {
        return isoString;
      }
    }

    /**
     * Formats a full ISO datetime (e.g. a state's last_updated/last_changed) as a
     * localized date + time string, used for the "last updated" indicator.
     */
    _formatDateTime(isoString) {
      if (!isoString) return null;
      const d = new Date(isoString);
      if (Number.isNaN(d.getTime())) return null;
      try {
        return d.toLocaleString(this._localeCode(), {
          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
      } catch (_err) {
        return null;
      }
    }

    async _saveQuickLog(form) {
      const stateObj = this._selectedEntityId ? (this._hass?.states?.[this._selectedEntityId] || null) : null;
      if (!this._hass || !stateObj) return;
      const entryId = stateObj.attributes.entry_id;
      const bleeding = String(form.get('bleeding') || '').trim();
      const pain = String(form.get('pain') || '').trim();
      const mood = String(form.get('mood') || '').trim();
      const note = String(form.get('note') || '').trim();

      const symptomData = {};
      if (bleeding) symptomData.bleeding_strength = bleeding;
      if (pain && pain !== 'none') {
        // `pain` is a multi-select field on the backend (add_symptom merges per key,
        // replacing the whole value — not per array item), so sending just this one
        // selection would silently wipe out any other pain types already logged for
        // today via the full calendar card. Merge with what's already there instead.
        const todayIso = this._todayIso();
        const attrsForMerge = stateObj?.attributes || {};
        const todayHistory = Array.isArray(attrsForMerge.symptom_history)
          ? attrsForMerge.symptom_history.find((e) => e?.date === todayIso)
          : null;
        const existingPain = Array.isArray(todayHistory?.pain) ? todayHistory.pain : [];
        symptomData.pain = Array.from(new Set([...existingPain, pain]));
      }

      this._quickLogScratch = { mood, note };
      if (!Object.keys(symptomData).length) {
        this._message = this._t('dashboard_quick_log_no_changes');
        this.render();
        return;
      }

      this._pending = true;
      this.render();
      try {
        await this._hass.callService('menstruation_cycle', 'add_symptom', {
          entry_id: entryId,
          date: this._todayIso(),
          symptom_data: symptomData,
        });
        this._message = this._t('symptom_saved');
      } catch (_error) {
        this._message = this._t('symptom_save_error');
      }
      this._pending = false;
      this.render();
    }

    async _logPreMenarcheSign(signKey, stageValue) {
      if (!this._hass || !this._selectedEntityId) return;
      const stateObj = this._hass.states?.[this._selectedEntityId];
      const attrs = stateObj?.attributes || {};
      try {
        await this._hass.callService('menstruation_cycle', 'add_pre_menarche_sign', {
          entity_id: this._selectedEntityId,
          ...(attrs.profile ? { profile: attrs.profile } : {}),
          pre_menarche_sign: signKey,
          tanner_stage: stageValue,
        });
        this._message = this._t('symptom_saved');
      } catch (_error) {
        this._message = this._t('symptom_save_error');
      }
      this._expandedSign = null;
      try {
        await this._hass.callService('homeassistant', 'update_entity', { entity_id: this._selectedEntityId });
      } catch (_error) {
        // update_entity may be unavailable in some environments — non-fatal.
      }
      this.render();
    }

    async _removePreMenarcheSign(signKey) {
      if (!this._hass || !this._selectedEntityId) return;
      const stateObj = this._hass.states?.[this._selectedEntityId];
      const attrs = stateObj?.attributes || {};
      try {
        await this._hass.callService('menstruation_cycle', 'remove_pre_menarche_sign', {
          entity_id: this._selectedEntityId,
          ...(attrs.profile ? { profile: attrs.profile } : {}),
          pre_menarche_sign: signKey,
        });
        this._message = this._t('symptom_saved');
      } catch (_error) {
        this._message = this._t('symptom_save_error');
      }
      this._expandedSign = null;
      try {
        await this._hass.callService('homeassistant', 'update_entity', { entity_id: this._selectedEntityId });
      } catch (_error) {
        // update_entity may be unavailable in some environments — non-fatal.
      }
      this.render();
    }

    /**
     * Tap-to-log +1 usage for a product, calling the dedicated log_product_usage
     * service with a real quantity — this is the fix for product usage always
     * showing 1: the hygiene checkboxes in the symptom modal can only express
     * "which product types were used" with no quantity, so every checked product
     * was silently counted as exactly 1 regardless of how many were actually used.
     * This button calls the service that DOES support a real quantity, one tap
     * per unit used, giving an accurate running count.
     */
    async _logProductUsage(product) {
      if (!this._hass || !this._selectedEntityId) return;
      const stateObj = this._hass.states?.[this._selectedEntityId];
      const attrs = stateObj?.attributes || {};
      try {
        await this._hass.callService('menstruation_cycle', 'log_product_usage', {
          entity_id: this._selectedEntityId,
          ...(attrs.profile ? { profile: attrs.profile } : {}),
          product,
          action: 'used',
          quantity: 1,
        });
        this._message = this._t('symptom_saved');
      } catch (_error) {
        this._message = this._t('symptom_save_error');
      }
      try {
        await this._hass.callService('homeassistant', 'update_entity', { entity_id: this._selectedEntityId });
      } catch (_error) {
        // update_entity may be unavailable in some environments — non-fatal.
      }
      this.render();
    }

    _handleDragPointerDown(event) {
      const handle = event.target.closest?.('[data-drag-handle]');
      if (!handle) return;
      const row = handle.closest('.edit-row');
      if (!row || !this._editDraft) return;
      this._dragState = { widgetId: row.dataset.widgetId, pointerId: event.pointerId };
      row.setPointerCapture?.(event.pointerId);
      row.classList.add('dragging');
      event.preventDefault();
    }

    _handleDragPointerMove(event) {
      if (!this._dragState || this._dragState.pointerId !== event.pointerId) return;
      const container = this.shadowRoot?.querySelector('.edit-widget-list');
      const dragRow = this.shadowRoot?.querySelector(`.edit-row[data-widget-id="${this._dragState.widgetId}"]`);
      if (!container || !dragRow) return;

      const rows = Array.from(container.querySelectorAll('.edit-row')).filter((r) => r !== dragRow);
      const y = event.clientY;
      for (const row of rows) {
        const rect = row.getBoundingClientRect();
        if (y >= rect.top && y <= rect.bottom) {
          const insertBefore = y < rect.top + rect.height / 2;
          container.insertBefore(dragRow, insertBefore ? row : row.nextSibling);
          break;
        }
      }
      event.preventDefault();
    }

    _handleDragPointerUp(event) {
      if (!this._dragState || this._dragState.pointerId !== event.pointerId) return;
      const container = this.shadowRoot?.querySelector('.edit-widget-list');
      const dragRow = this.shadowRoot?.querySelector(`.edit-row[data-widget-id="${this._dragState.widgetId}"]`);
      dragRow?.classList.remove('dragging');
      dragRow?.releasePointerCapture?.(event.pointerId);
      this._dragState = null;

      if (container && this._editDraft) {
        const newOrder = Array.from(container.querySelectorAll('.edit-row')).map((r) => r.dataset.widgetId);
        this._editDraft.widgetOrder = newOrder;
        this.render();
      }
    }

    /**
     * Renders the quick "log today" modal — a lighter-weight, dashboard-native
     * alternative to opening the full calendar/gauge card just to log a
     * symptom. Uses the shared field config from menstruation-functions.js
     * (window.MenstruationFunctions), the same one both cards use, and the
     * same opt_/cat_ translation keys already used throughout the app.
     */
    /**
     * Renders the local, offline Q&A widget — no external AI involved. Matches
     * the typed question against a small set of patterns covering the cycle
     * data already on this sensor (next period, cycle length, fertile window,
     * current phase) plus a short glossary, entirely client-side.
     */
    /**
     * Long-term cycle-length trend — distinct from the existing "Cycle
     * History" bar chart (which only shows the last ~12 cycles as bars).
     * This uses the *complete* tracked history (grouped_starts, not the
     * "recent_cycles" subset) as a line chart, with a linear-regression
     * trend line overlaid so a genuine multi-year drift is visible at a
     * glance, not just cycle-to-cycle variation.
     */
    _renderLongTermTrendChart(stateObj) {
      const attrs = stateObj?.attributes || {};
      const starts = Array.isArray(attrs.grouped_starts) ? attrs.grouped_starts.slice().sort() : [];
      const points = [];
      for (let i = 1; i < starts.length; i++) {
        const len = Math.round((new Date(starts[i]) - new Date(starts[i - 1])) / 86400000);
        if (len > 10 && len < 80) points.push({ date: starts[i], length: len }); // same outlier filter as anomaly_insights
      }
      // Cap to a sane rendering window (~5 years) even if more history exists.
      const recent = points.slice(-60);

      if (recent.length < 4) {
        return `<div class="helper">${this._t('dashboard_not_enough_data') || 'Noch nicht genug Daten.'}</div>`;
      }

      const W = 620; const H = 240;
      const padL = 42; const padR = 14; const padT = 16; const padB = 34;
      const chartW = W - padL - padR;
      const chartH = H - padT - padB;

      const lens = recent.map((p) => p.length);
      const minV = Math.min(...lens) - 1;
      const maxV = Math.max(...lens) + 1;
      const yRange = maxV - minV || 1;

      const toX = (i) => padL + (i / (recent.length - 1 || 1)) * chartW;
      const toY = (v) => padT + chartH - ((v - minV) / yRange) * chartH;

      // Simple least-squares linear regression for the trend line — clearer
      // directional signal at a glance than a rolling average would be.
      const n = recent.length;
      const sumX = recent.reduce((a, _, i) => a + i, 0);
      const sumY = lens.reduce((a, v) => a + v, 0);
      const sumXY = recent.reduce((a, _, i) => a + i * lens[i], 0);
      const sumX2 = recent.reduce((a, _, i) => a + i * i, 0);
      const denom = n * sumX2 - sumX * sumX;
      const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
      const intercept = (sumY - slope * sumX) / n;
      const trendStart = intercept;
      const trendEnd = intercept + slope * (n - 1);

      const gridSteps = 4;
      const gridLines = Array.from({ length: gridSteps }, (_, i) => minV + (i / (gridSteps - 1)) * yRange).map((v) => {
        const y = Math.round(toY(v));
        return `<line x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}" stroke="var(--divider-color,#e5e7eb)" stroke-width="1"/>
                <text x="6" y="${y + 3}" font-size="9" font-family="IBM Plex Mono, monospace" fill="var(--secondary-text-color,#9ca3af)">${Math.round(v)}</text>`;
      }).join('');

      const lineD = lens.map((v, i) => `${i === 0 ? 'M' : 'L'}${Math.round(toX(i))},${Math.round(toY(v))}`).join(' ');
      const dots = lens.map((v, i) => `<circle cx="${Math.round(toX(i))}" cy="${Math.round(toY(v))}" r="2.2" fill="var(--mc-rose-deep)"/>`).join('');
      const trendD = `M${Math.round(toX(0))},${Math.round(toY(trendStart))} L${Math.round(toX(n - 1))},${Math.round(toY(trendEnd))}`;

      const xLabelCount = Math.min(5, recent.length);
      const xLabelIndices = [...new Set(Array.from({ length: xLabelCount }, (_, i) => Math.round((i / (xLabelCount - 1 || 1)) * (recent.length - 1))))];
      const xLabels = xLabelIndices.map((i) => {
        const anchor = i === 0 ? 'start' : (i === recent.length - 1 ? 'end' : 'middle');
        return `<text x="${Math.round(toX(i))}" y="${H - 10}" text-anchor="${anchor}" font-size="9" font-family="IBM Plex Mono, monospace" fill="var(--secondary-text-color,#9ca3af)">${escapeHtml(this._formatDate(recent[i].date, { month: '2-digit', year: '2-digit' }))}</text>`;
      }).join('');

      const trendDiff = Math.round((trendEnd - trendStart) * 10) / 10;
      const trendLabelKey = Math.abs(trendDiff) < 0.5 ? 'dashboard_trend_stable' : (trendDiff > 0 ? 'dashboard_trend_lengthening' : 'dashboard_trend_shortening');
      const trendLabel = this._t(trendLabelKey) || (Math.abs(trendDiff) < 0.5 ? 'Stabil über den erfassten Zeitraum.' : (trendDiff > 0 ? 'Tendenziell länger werdend über den erfassten Zeitraum.' : 'Tendenziell kürzer werdend über den erfassten Zeitraum.'));

      return `
        <div>
          <p class="helper" style="margin:0 0 8px;font-size:0.72rem;">${escapeHtml(trendLabel)}</p>
          <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${this._t('dashboard_widget_long_term_trend') || 'Langzeit-Trend'}" style="display:block;overflow:visible;">
            ${gridLines}
            <path d="${trendD}" fill="none" stroke="var(--mc-plum)" stroke-width="1.6" stroke-dasharray="6 4"/>
            <path d="${lineD}" fill="none" stroke="var(--mc-rose-deep)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            ${dots}
            ${xLabels}
          </svg>
          <p class="helper" style="margin-top:6px;font-size:0.68rem;">${this._t('dashboard_prediction_disclaimer') || ''}</p>
        </div>`;
    }

    /**
     * Persistent floating chat button (bottom-right) + popup panel — replaces
     * the old scroll-to-find grid widget. The button is always rendered;
     * the panel only when open. Reuses _renderChatWidget() for the actual
     * chat content, so the underlying Q&A logic is untouched — this is
     * purely a presentation change.
     */
    _renderChatFab(stateObj) {
      const isOpen = this._chatFabOpen;
      const fabIcon = isOpen ? 'mdi:close' : 'mdi:chat-question';
      const fabLabel = this._t('dashboard_chat_fab_label') || 'Zyklus-Fragen';

      const panel = isOpen ? `
        <div class="mc-chat-fab-panel" role="dialog" aria-modal="false" aria-label="${escapeHtml(fabLabel)}">
          <div class="mc-chat-fab-header">
            <span>${escapeHtml(fabLabel)}</span>
            <button type="button" data-action="toggle-chat-fab" aria-label="${escapeHtml(this._t('dashboard_close') || 'Schließen')}" class="mc-chat-fab-close">
              <ha-icon icon="mdi:close"></ha-icon>
            </button>
          </div>
          <div class="mc-chat-fab-disclaimer">
            <ha-icon icon="mdi:information-outline"></ha-icon>
            <span>${escapeHtml(this._t('dashboard_chat_medical_disclaimer') || 'Keine medizinische Beratung. Bei gesundheitlichen Fragen wende dich an eine Ärztin oder einen Arzt.')}</span>
          </div>
          <div class="mc-chat-fab-body">
            ${this._renderChatWidget(stateObj)}
          </div>
        </div>` : '';

      return `
        <button type="button" class="mc-chat-fab-button" data-action="toggle-chat-fab" aria-label="${escapeHtml(fabLabel)}" aria-expanded="${isOpen}">
          <ha-icon icon="${fabIcon}"></ha-icon>
        </button>
        ${panel}`;
    }

    _renderChatWidget(stateObj) {
      const history = this._chatHistory.map((entry) => {
        const cls = entry.role === 'user' ? 'chat-bubble chat-bubble--user' : 'chat-bubble chat-bubble--bot';
        return `<div class="${cls}">${escapeHtml(entry.text)}</div>`;
      }).join('');

      const quickQuestions = [
        this._t('dashboard_chat_q_next_period') || 'Wann ist meine nächste Periode?',
        this._t('dashboard_chat_q_cycle_length') || 'Wie lang ist mein Zyklus im Schnitt?',
        this._t('dashboard_chat_q_fertile') || 'Wann ist mein fruchtbares Fenster?',
        this._t('dashboard_chat_q_phase') || 'In welcher Phase bin ich gerade?',
        this._t('dashboard_chat_q_help') || 'Was kannst du noch beantworten?',
      ];
      const chips = quickQuestions.map((q) =>
        `<button type="button" class="mode-btn" data-action="chat-quick" data-question="${escapeHtml(q)}">${escapeHtml(q)}</button>`
      ).join('');

      return `
        <div class="mc-chat">
          <p class="helper" style="margin:0 0 10px;">${escapeHtml(this._t('dashboard_chat_intro') || 'Stell eine einfache Frage zu deinem Zyklus. Läuft komplett lokal, ohne externe KI.')}</p>
          ${history ? `<div class="mc-chat-history">${history}</div>` : ''}
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">${chips}</div>
          <div style="display:flex;gap:8px;">
            <input type="text" id="mc-chat-input" placeholder="${escapeHtml(this._t('dashboard_chat_placeholder') || 'Frage eingeben …')}"
                   style="flex:1;min-width:0;padding:0 14px;height:42px;border-radius:999px;border:1px solid var(--divider-color,#e5e7eb);background:var(--mc-sand);color:inherit;font-size:0.875rem;"
                   onkeydown="if(event.key==='Enter'){event.preventDefault();this.getRootNode().host.dispatchEvent(new CustomEvent('mc-chat-enter'));}" />
            <button type="button" class="mode-btn active" data-action="chat-send" style="height:42px;padding:0 18px;">${escapeHtml(this._t('dashboard_chat_send') || 'Fragen')}</button>
          </div>
        </div>`;
    }

    _handleChatSend(presetQuestion) {
      const inputEl = this.shadowRoot?.getElementById('mc-chat-input');
      const question = (presetQuestion ?? inputEl?.value ?? '').trim();
      if (!question) return;

      try {
        const stateObj = this._selectedEntityId ? (this._hass?.states?.[this._selectedEntityId] || null) : null;
        const answer = this._answerCycleQuestion(question, stateObj);

        this._chatHistory.push({ role: 'user', text: question });
        this._chatHistory.push({ role: 'bot', text: answer });
      } catch (err) {
        // Defensive: an unexpected error anywhere in the above (not just
        // inside an individual intent's test/answer, which are already
        // caught separately) must never permanently freeze the chat — the
        // person should always be able to ask their next question, even if
        // this one hit a bug. Logged so it's still diagnosable.
        console.error('[menstruation-cycle] Chat send failed:', err);
        this._chatHistory.push({ role: 'user', text: question });
        this._chatHistory.push({ role: 'bot', text: this._t('dashboard_chat_error') || 'Da ist etwas schiefgelaufen. Versuch es gerne nochmal.' });
      }

      // Keep the history from growing unbounded across a long session.
      if (this._chatHistory.length > 20) this._chatHistory = this._chatHistory.slice(-20);

      this.render();
      requestAnimationFrame(() => {
        // Re-focus and clear the input, and scroll the history to the
        // newest message — without this, new answers can render below the
        // visible area and look like nothing happened.
        const freshInput = this.shadowRoot?.getElementById('mc-chat-input');
        if (freshInput) { freshInput.value = ''; freshInput.focus(); }
        const historyEl = this.shadowRoot?.querySelector('.mc-chat-history');
        if (historyEl) historyEl.scrollTop = historyEl.scrollHeight;
      });
    }

    /**
     * Local pattern-matching answer engine — no external AI, no network calls.
     * Matches keywords in the question against known intents, then answers
     * using this profile's actual current sensor data. Falls back to a short
     * "I can answer these kinds of things" hint if nothing matches.
     */
    /**
     * Checks whether EVERY group in `groups` has at least one stem present in
     * `text` (as a substring). This is deliberately looser than exact-phrase
     * matching: each group represents one *concept* (e.g. "the person means
     * 'period'"), expressed as several word-stems covering different
     * inflections/synonyms, so "warum sind meine Tage zu spät" and "warum
     * verspäten sich meine Tage" both satisfy the same two-concept rule
     * (period-word + lateness-word) without needing every exact phrasing
     * enumerated up front.
     */
    _matchesConceptGroups(text, groups) {
      return groups.every((stems) => stems.some((stem) => text.includes(stem)));
    }

    /**
     * Resolves a [start, end] ISO date range for "letzte Periode" (most
     * recent past period) or "diesen Zyklus" (current cycle, start to
     * today) — shared by every chat intent that scopes a history search to
     * one of these two periods, so the logic only lives in one place.
     * Returns null if there's no known cycle start to anchor from.
     */
    _resolveChatDateRange(text, attrs) {
      const starts = Array.isArray(attrs.grouped_starts) ? attrs.grouped_starts.slice().sort() : [];
      if (!starts.length) return null;
      const rangeStart = starts[starts.length - 1];
      if (text.includes('letzte periode') || text.includes('letzten periode') || text.includes('last period')) {
        const periodEnd = attrs.period_forecast?.predicted_end;
        const periodStart = attrs.period_forecast?.predicted_start;
        const periodLen = (periodStart && periodEnd)
          ? Math.round((new Date(periodEnd) - new Date(periodStart)) / 86400000) + 1
          : 5;
        const rangeEnd = new Date(new Date(rangeStart).getTime() + (periodLen - 1) * 86400000).toISOString().slice(0, 10);
        return [rangeStart, rangeEnd];
      }
      // Default: "diesen Zyklus" — from the most recent cycle start to today.
      return [rangeStart, this._todayIso()];
    }

    /**
     * Chat intent registry — replaces the old "first matching if-block wins"
     * cascade. Each intent declares HOW MANY independent conditions must all
     * be true to trigger (its `specificity`), and the engine picks the
     * matching intent with the HIGHEST specificity, not the first one found
     * in list order. This means intent *order in this list no longer
     * matters* — a new, more specific question can be added anywhere
     * without needing to work out where in a giant if/else chain it has to
     * go to avoid being shadowed by a broader existing pattern (a mistake
     * made repeatedly while this was still a cascade: "Ovulationstest"
     * being caught by the plain "ovulation" intent, "letzte Periode
     * stärker" being caught by the plain "last period" intent, etc. — all
     * were really just this same structural problem recurring).
     *
     * Each entry: { id, specificity, test(q, attrs) => bool, answer(q, attrs, stateObj) => string }
     * `specificity` = number of independent concept-groups/keywords that
     * must ALL match for this intent to trigger — a rough but effective
     * proxy for "how specific is this question", since it's exactly the
     * property that caused every collision found so far (a broader
     * single-keyword intent beating a narrower multi-keyword one, or vice
     * versa, purely by accident of code position).
     */
    _chatIntents() {
      // Colloquial/slang synonyms for "period" across all 5 supported
      // languages, not just formal terms — matching works on whatever the
      // person actually types, independent of their configured UI language.
      // Deliberately excludes vulgar/crude euphemisms.
      const PERIOD_WORDS = [
        'tag', 'period', 'regel', 'menstruation', 'menses', // existing
        'erdbeerwoche', 'tante rosa', 'rote welle', // German colloquial
        'aunt flo', 'time of the month', 'shark week', 'monthly visitor', 'code red', 'crimson wave', // English colloquial
        'règles', 'ragnagnas', 'lunes', // French
        'regla', // Spanish
        'mens', // Swedish
      ];
      const LATE_WORDS = [
        'spät', 'verspät', 'verzög', 'überfällig', 'ausbleib', 'nicht gekommen', 'fehlt', 'aus', // German
        'late', 'delay', 'overdue', 'missed', // English
        'retard', 'en retard', // French
        'retraso', 'atrasada', // Spanish
        'försenad', // Swedish
      ];
      const WHEN_NEXT_WORDS = [
        'wann', 'nächst', 'kommt', 'beginn', // German
        'when', 'next', 'coming', // English
        'quand', 'prochain', 'arrive', 'vient', // French
        'cuándo', 'próxim', 'viene', // Spanish
        'när', 'nästa', 'kommer', // Swedish
      ];
      const has = (q, ...words) => words.some((w) => q.includes(w));
      const grp = (q, ...groups) => this._matchesConceptGroups(q, groups);

      return [
        {
          id: 'glossary',
          specificity: 1,
          test: (q) => {
            const isDataQuery = has(q, 'length', 'duration', 'average', 'long', 'länge', 'dauer', 'durchschnitt');
            return !isDataQuery && has(q, 'was ist', 'was bedeutet', 'what is', 'what does');
          },
          answer: (q, attrs) => {
            const glossary = {
              cycle: ['zyklus', 'cycle'],
              ovulation: ['eisprung', 'ovulation'],
              spotting: ['zwischenblutung', 'spotting'],
              luteal: ['gelbkörperphase', 'lutealphase', 'luteal'],
              follicular: ['follikelphase', 'follicular'],
              coverline: ['coverline', 'temperaturkurve', '3-über-6', '3 über 6'],
              pms: ['pms', 'prämenstruell'],
            };
            for (const [term, keywords] of Object.entries(glossary)) {
              if (has(q, ...keywords)) {
                const def = this._t(`ygs_gloss_${term}_def`);
                if (def && def !== `ygs_gloss_${term}_def`) return def;
              }
            }
            return null; // no known term matched — falls through to fallback
          },
        },
        {
          id: 'period_in_range',
          specificity: 3,
          test: (q) => !!q.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/) && has(q, 'regel', 'periode', 'tage', 'menses', 'menstruation', 'period'),
          answer: (q, attrs) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const allDateMatches = [...q.matchAll(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/g)];
            const dateMatch = allDateMatches[0];
            let [, day, month, year] = dateMatch;
            if (year.length === 2) year = `20${year}`;
            const rangeStart = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
            if (Number.isNaN(rangeStart.getTime())) return notAvailable;

            let rangeEnd;
            if (allDateMatches.length >= 2) {
              // Explicit end date given ("...bis 22.12.2026") — use it
              // directly instead of a duration count, which would otherwise
              // silently ignore it and only check the single start date.
              let [, day2, month2, year2] = allDateMatches[1];
              if (year2.length === 2) year2 = `20${year2}`;
              rangeEnd = new Date(`${year2}-${month2.padStart(2, '0')}-${day2.padStart(2, '0')}T00:00:00`);
              if (Number.isNaN(rangeEnd.getTime()) || rangeEnd < rangeStart) rangeEnd = rangeStart;
            } else {
              // German word-numbers ("eine Woche", "zwei Tage") are at least
              // as common in conversational phrasing as digits — checked
              // first since a digit-only regex would otherwise silently
              // treat these as "no duration given" (0 days), matching only
              // the single start date instead of the full requested range.
              const germanNumberWords = {
                'ein': 1, 'eine': 1, 'einen': 1, 'zwei': 2, 'drei': 3, 'vier': 4, 'fünf': 5,
                'sechs': 6, 'sieben': 7, 'acht': 8, 'neun': 9, 'zehn': 10,
              };
              const numberPattern = Object.keys(germanNumberWords).join('|');
              const weekWordMatch = q.match(new RegExp(`(${numberPattern}|\\d+)\\s*wochen?`));
              const dayWordMatch = q.match(new RegExp(`(${numberPattern}|\\d+)\\s*tage?`));
              const toNumber = (raw) => (raw in germanNumberWords ? germanNumberWords[raw] : parseInt(raw, 10));
              let durationDays = 0;
              if (weekWordMatch) durationDays = toNumber(weekWordMatch[1]) * 7;
              else if (dayWordMatch) durationDays = toNumber(dayWordMatch[1]);
              rangeEnd = new Date(rangeStart.getTime() + Math.max(0, durationDays - 1) * 86400000);
            }

            const predictedStart = attrs.period_forecast?.predicted_start;
            const predictedEnd = attrs.period_forecast?.predicted_end;
            const avgCycleLen = attrs.average_cycle_length ?? attrs.cycle_length_avg;
            if (!predictedStart || !avgCycleLen) return notAvailable;

            const periodLenDays = predictedEnd
              ? Math.round((new Date(predictedEnd) - new Date(predictedStart)) / 86400000) + 1
              : 5;

            let cursor = new Date(predictedStart);
            let overlapStart = null;
            for (let i = 0; i < 12; i++) {
              const periodEndEstimate = new Date(cursor.getTime() + (periodLenDays - 1) * 86400000);
              if (cursor <= rangeEnd && periodEndEstimate >= rangeStart) {
                overlapStart = cursor;
                break;
              }
              cursor = new Date(cursor.getTime() + avgCycleLen * 86400000);
            }

            const farOut = (rangeStart - new Date(this._todayIso())) / 86400000 > avgCycleLen * 2;
            const caveat = farOut ? ` ${this._t('dashboard_chat_far_future_caveat') || '(Je weiter das in der Zukunft liegt, desto unsicherer ist diese Schätzung.)'}` : '';

            if (overlapStart) {
              const label = this._formatDate(overlapStart.toISOString().slice(0, 10));
              return `${(this._t('dashboard_chat_period_in_range_yes') || 'Ja, vsl. ab {date} wird deine Periode in diesem Zeitraum liegen.').replace('{date}', label)}${caveat}`;
            }
            return `${this._t('dashboard_chat_period_in_range_no') || 'Nach aktueller Schätzung nicht — in diesem Zeitraum wird keine Periode erwartet.'}${caveat}`;
          },
        },
        {
          id: 'ovulation_test',
          specificity: 2,
          test: (q) => has(q, 'ovulationstest', 'lh-test', 'ovulation test') && has(q, 'wann', 'letzte', 'when', 'last'),
          answer: (q, attrs, stateObj) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const history = this._getFullSymptomHistory(stateObj);
            const isNegative = has(q, 'negativ', 'negative');
            const targetValue = isNegative ? 'negative_ovulation' : 'positive_ovulation';
            const matches_ = history.filter((e) => Array.isArray(e.test) && e.test.includes(targetValue)).sort((a, b) => (a.date < b.date ? -1 : 1));
            if (!matches_.length) return notAvailable;
            return (this._t('dashboard_chat_ovulation_test_last') || 'Zuletzt am {date}.').replace('{date}', this._formatDate(matches_[matches_.length - 1].date));
          },
        },
        {
          id: 'symptom_search',
          specificity: 2,
          test: (q) => {
            const symptomKeywordMap = {
              headache: ['kopfschmerz', 'headache'], migraine: ['migräne', 'migraine'], cramps: ['krämpfe', 'krampf', 'cramps'],
              lower_back: ['rückenschmerz', 'back pain', 'lower back'], tender_breasts: ['brüste', 'brustspannen', 'tender breasts'],
              mittelschmerz: ['mittelschmerz'],
            };
            const found = Object.values(symptomKeywordMap).some((kws) => has(q, ...kws));
            return found && has(q, 'hatte ich', 'hab ich', 'wie oft', 'did i have', 'how often');
          },
          answer: (q, attrs, stateObj) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const symptomKeywordMap = {
              headache: ['kopfschmerz', 'headache'], migraine: ['migräne', 'migraine'], cramps: ['krämpfe', 'krampf', 'cramps'],
              lower_back: ['rückenschmerz', 'back pain', 'lower back'], tender_breasts: ['brüste', 'brustspannen', 'tender breasts'],
              mittelschmerz: ['mittelschmerz'],
            };
            let matchedSymptom = null;
            for (const [key, keywords] of Object.entries(symptomKeywordMap)) {
              if (has(q, ...keywords)) { matchedSymptom = key; break; }
            }
            const history = this._getFullSymptomHistory(stateObj);
            const range = this._resolveChatDateRange(q, attrs);
            if (!range) return notAvailable;
            const [rangeStart, rangeEnd] = range;
            const matches_ = history.filter((entry) => {
              if (!entry?.date || entry.date < rangeStart || entry.date > rangeEnd) return false;
              const painList = Array.isArray(entry.pain) ? entry.pain : [];
              return painList.includes(matchedSymptom);
            });
            if (!matches_.length) return this._t('dashboard_chat_symptom_search_none') || 'Dafür hab ich in diesem Zeitraum keine Einträge gefunden.';
            const dates = matches_.map((e) => this._formatDate(e.date)).join(', ');
            return (this._t('dashboard_chat_symptom_search_found') || 'Ja, an {count} Tagen erfasst: {dates}.').replace('{count}', matches_.length).replace('{dates}', dates);
          },
        },
        {
          id: 'intercourse',
          specificity: 2,
          test: (q) => has(q, 'sex', 'geschlechtsverkehr', 'verkehr') && has(q, 'wann', 'wie oft', 'when', 'how often', 'zuletzt', 'last'),
          answer: (q, attrs, stateObj) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const history = this._getFullSymptomHistory(stateObj);
            const loggedDays = history.filter((entry) => entry?.date && entry.intercourse).sort((a, b) => (a.date < b.date ? -1 : 1));
            if (!loggedDays.length) return notAvailable;
            if (has(q, 'wie oft', 'how often')) {
              const range = this._resolveChatDateRange(q, attrs);
              if (!range) return notAvailable;
              const [rangeStart, rangeEnd] = range;
              const inRange = loggedDays.filter((e) => e.date >= rangeStart && e.date <= rangeEnd);
              return (this._t('dashboard_chat_intercourse_count') || '{count} Mal erfasst in diesem Zeitraum.').replace('{count}', inRange.length);
            }
            const lastDate = loggedDays[loggedDays.length - 1].date;
            return (this._t('dashboard_chat_intercourse_last') || 'Zuletzt am {date} erfasst.').replace('{date}', this._formatDate(lastDate));
          },
        },
        {
          id: 'menarche_estimate',
          specificity: 2,
          test: (q) => has(q, 'erste periode', 'erste regel', 'first period'),
          answer: (q, attrs) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const estDate = attrs.estimated_menarche_date ?? attrs.menarche_data?.estimated_date ?? null;
            const daysUntil = attrs.days_until_menarche;
            if (!estDate && (daysUntil === null || daysUntil === undefined)) return notAvailable;
            if (estDate) return (this._t('dashboard_chat_menarche_estimate') || 'Geschätzt um den {date}.').replace('{date}', this._formatDate(estDate));
            return (this._t('dashboard_chat_menarche_days') || 'Voraussichtlich in etwa {days} Tagen.').replace('{days}', daysUntil);
          },
        },
        {
          id: 'bleeding_compare',
          specificity: 2,
          test: (q) => grp(q, PERIOD_WORDS, ['stärker', 'schwächer', 'stronger', 'weaker']),
          answer: (q, attrs, stateObj) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const starts = Array.isArray(attrs.grouped_starts) ? attrs.grouped_starts.slice().sort() : [];
            if (starts.length < 2) return notAvailable;
            const history = this._getFullSymptomHistory(stateObj);
            const strengthMap = { none: 0, light: 1, medium: 2, heavy: 3, very_heavy: 4 };
            const periodEnd = attrs.period_forecast?.predicted_end;
            const periodStart = attrs.period_forecast?.predicted_start;
            const periodLen = (periodStart && periodEnd)
              ? Math.round((new Date(periodEnd) - new Date(periodStart)) / 86400000) + 1
              : 5;
            const peakStrength = (start) => {
              const end = new Date(new Date(start).getTime() + (periodLen - 1) * 86400000).toISOString().slice(0, 10);
              const vals = history
                .filter((e) => e?.date >= start && e.date <= end && e.bleeding_strength in strengthMap)
                .map((e) => strengthMap[e.bleeding_strength]);
              return vals.length ? Math.max(...vals) : null;
            };
            const lastPeak = peakStrength(starts[starts.length - 1]);
            const prevPeak = peakStrength(starts[starts.length - 2]);
            if (lastPeak === null || prevPeak === null) return notAvailable;
            if (lastPeak === prevPeak) return this._t('dashboard_chat_bleeding_about_same') || 'Etwa wie gewohnt — kein deutlicher Unterschied zur Periode davor.';
            if (lastPeak > prevPeak) return this._t('dashboard_chat_bleeding_stronger') || 'Stärker als die Periode davor.';
            return this._t('dashboard_chat_bleeding_weaker') || 'Schwächer als die Periode davor.';
          },
        },
        {
          id: 'why_late',
          specificity: 3,
          test: (q) => grp(q, PERIOD_WORDS, LATE_WORDS) && has(q, 'warum', 'why'),
          answer: (q, attrs) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const predicted = attrs.period_forecast?.predicted_start;
            if (!predicted) return notAvailable;
            const daysOverdue = Math.round((new Date(this._todayIso()) - new Date(predicted)) / 86400000);
            const reasons = this._t('dashboard_chat_late_reasons') || 'Mögliche Gründe sind z. B. Stress, Veränderungen bei Schlaf/Gewicht/Sport, eine Erkrankung, hormonelle Schwankungen — oder auch eine Schwangerschaft. Vorhersagen sind Schätzungen mit einer gewissen Schwankungsbreite, keine Diagnose.';
            if (daysOverdue <= 0) return this._t('dashboard_chat_not_actually_late') || 'Nach aktueller Vorhersage ist deine Periode noch nicht überfällig.';
            const overdueNote = (this._t('dashboard_chat_days_overdue') || 'Sie ist aktuell {days} Tage überfällig.').replace('{days}', daysOverdue);
            const doctorNote = daysOverdue >= 7
              ? ` ${this._t('dashboard_chat_late_see_doctor') || 'Bei einer so langen Verzögerung kann ein Arztbesuch sinnvoll sein.'}`
              : '';
            return `${overdueNote} ${reasons}${doctorNote}`;
          },
        },
        {
          id: 'last_period',
          specificity: 2,
          test: (q) => grp(q, PERIOD_WORDS, ['letzt', 'vorherig', 'last', 'previous']) || has(q, 'wann war meine'),
          answer: (q, attrs) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const starts = Array.isArray(attrs.grouped_starts) ? attrs.grouped_starts.slice().sort() : [];
            if (!starts.length) return notAvailable;
            return (this._t('dashboard_chat_last_period') || 'Deine letzte Periode begann am {date}.').replace('{date}', this._formatDate(starts[starts.length - 1]));
          },
        },
        {
          id: 'next_period',
          specificity: 2,
          test: (q) => grp(q, PERIOD_WORDS, WHEN_NEXT_WORDS) || grp(q, PERIOD_WORDS, LATE_WORDS),
          answer: (q, attrs) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const predicted = attrs.period_forecast?.predicted_start;
            if (!predicted) return notAvailable;
            const days = Math.round((new Date(predicted) - new Date(this._todayIso())) / 86400000);
            const dateLabel = this._formatDate(predicted);
            if (days === 0) return this._t('dashboard_chat_period_today') || 'Deine Periode wird für heute erwartet.';
            if (days < 0) return (this._t('dashboard_chat_period_overdue') || 'Deine Periode wurde für {date} erwartet.').replace('{date}', dateLabel);
            return (this._t('dashboard_chat_period_in_days') || 'Voraussichtlich in {days} Tagen, am {date}.').replace('{days}', days).replace('{date}', dateLabel);
          },
        },
        {
          id: 'shortest_longest_cycle',
          specificity: 2,
          test: (q) => has(q, 'kürzester zyklus', 'längster zyklus', 'shortest cycle', 'longest cycle'),
          answer: (q, attrs) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const recentCycles = Array.isArray(attrs.cycle_statistics?.recent_cycles)
              ? attrs.cycle_statistics.recent_cycles.filter((c) => c && Number.isFinite(c.length))
              : [];
            if (!recentCycles.length) return notAvailable;
            const lens = recentCycles.map((c) => c.length);
            if (has(q, 'kürzester', 'shortest')) {
              return (this._t('dashboard_chat_shortest_cycle') || 'Dein kürzester erfasster Zyklus dauerte {days} Tage.').replace('{days}', Math.min(...lens));
            }
            return (this._t('dashboard_chat_longest_cycle') || 'Dein längster erfasster Zyklus dauerte {days} Tage.').replace('{days}', Math.max(...lens));
          },
        },
        {
          id: 'cycle_compare',
          specificity: 3,
          test: (q) => grp(q, ['zyklus', 'cycle'], ['letzt', 'last']) && has(q, 'länger', 'kürzer', 'longer', 'shorter'),
          answer: (q, attrs) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const recentCycles = Array.isArray(attrs.cycle_statistics?.recent_cycles)
              ? attrs.cycle_statistics.recent_cycles.filter((c) => c && Number.isFinite(c.length))
              : [];
            if (recentCycles.length < 2) return notAvailable;
            const lens = recentCycles.map((c) => c.length);
            const lastLen = lens[lens.length - 1];
            const avgOthers = lens.slice(0, -1).reduce((a, b) => a + b, 0) / (lens.length - 1);
            const diff = Math.round(lastLen - avgOthers);
            if (Math.abs(diff) < 1) return this._t('dashboard_chat_cycle_about_same') || 'Etwa wie gewohnt — kein nennenswerter Unterschied zum Durchschnitt.';
            if (diff > 0) return (this._t('dashboard_chat_cycle_longer') || 'Länger als sonst — etwa {days} Tage mehr als im Durchschnitt.').replace('{days}', diff);
            return (this._t('dashboard_chat_cycle_shorter') || 'Kürzer als sonst — etwa {days} Tage weniger als im Durchschnitt.').replace('{days}', Math.abs(diff));
          },
        },
        {
          id: 'cycle_length',
          specificity: 2,
          test: (q) => grp(q, ['zyklus', 'cycle'], ['läng', 'lang', 'dauer', 'durchschnitt', 'average', 'length']),
          answer: (q, attrs) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const avg = attrs.average_cycle_length ?? attrs.cycle_length_avg;
            if (!avg) return notAvailable;
            return (this._t('dashboard_chat_cycle_length') || 'Im Schnitt {days} Tage.').replace('{days}', Math.round(avg));
          },
        },
        {
          id: 'fertile_window',
          specificity: 1,
          test: (q) => has(q, 'fruchtbar', 'fertile'),
          answer: (q, attrs) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const fw = attrs.fertility_forecast;
            if (!fw?.fertile_window_start) return notAvailable;
            const startLabel = this._formatDate(fw.fertile_window_start);
            const endLabel = this._formatDate(fw.fertile_window_end);
            return (this._t('dashboard_chat_fertile_window') || 'Voraussichtlich von {start} bis {end}.').replace('{start}', startLabel).replace('{end}', endLabel);
          },
        },
        {
          id: 'pregnancy_likelihood',
          specificity: 2,
          test: (q) => has(q, 'ungeschützt', 'ungeschützten', 'unprotected') && has(q, 'schwanger', 'pregnant', 'wahrscheinlichkeit', 'likelihood', 'probability'),
          answer: (q, attrs) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const fw = attrs.fertility_forecast;
            if (!fw?.fertile_window_start) return notAvailable;
            let offsetDays = 0;
            if (has(q, 'vorgestern')) offsetDays = -2;
            else if (has(q, 'gestern')) offsetDays = -1;
            const checkDate = new Date(new Date(this._todayIso()).getTime() + offsetDays * 86400000);
            const checkIso = checkDate.toISOString().slice(0, 10);
            const inWindow = checkIso >= fw.fertile_window_start && checkIso <= fw.fertile_window_end;
            const disclaimer = this._t('dashboard_chat_fertility_disclaimer') || 'Das ist nur eine grobe Einordnung basierend auf dem geschätzten fruchtbaren Fenster, keine verlässliche Aussage zum tatsächlichen Risiko — und kein Ersatz für Verhütung oder eine medizinische Einschätzung.';
            const verdict = inWindow
              ? (this._t('dashboard_chat_fertility_in_window') || 'Der Tag lag in deinem geschätzten fruchtbaren Fenster.')
              : (this._t('dashboard_chat_fertility_outside_window') || 'Der Tag lag außerhalb deines geschätzten fruchtbaren Fensters.');
            return `${verdict} ${disclaimer}`;
          },
        },
        {
          // "Kann ich heute schwanger werden?" — direct present-tense
          // phrasing, distinct from pregnancy_likelihood (needs
          // "ungeschützt" too) and pregnant_during_period_info (needs
          // "während der periode" too), so no collision with either.
          id: 'pregnant_today',
          specificity: 2,
          test: (q) => has(q, 'schwanger', 'pregnant') && has(q, 'heute', 'jetzt', 'today', 'now'),
          answer: (q, attrs) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const fw = attrs.fertility_forecast;
            if (!fw?.fertile_window_start) return notAvailable;
            const todayIso = this._todayIso();
            const inWindow = todayIso >= fw.fertile_window_start && todayIso <= fw.fertile_window_end;
            const disclaimer = this._t('dashboard_chat_fertility_disclaimer') || 'Das ist nur eine grobe Einordnung basierend auf dem geschätzten fruchtbaren Fenster, keine verlässliche Aussage zum tatsächlichen Risiko — und kein Ersatz für Verhütung oder eine medizinische Einschätzung.';
            const verdict = inWindow
              ? (this._t('dashboard_chat_pregnant_today_yes') || 'Heute liegt voraussichtlich in deinem geschätzten fruchtbaren Fenster.')
              : (this._t('dashboard_chat_pregnant_today_no') || 'Heute liegt voraussichtlich außerhalb deines geschätzten fruchtbaren Fensters.');
            return `${verdict} ${disclaimer}`;
          },
        },
        {
          id: 'product_stock',
          specificity: 1,
          test: (q) => has(q, 'reichen', 'nachkaufen', 'genug') || (has(q, 'brauche') && has(q, 'noch')),
          answer: (q, attrs) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const productMap = {
              tampon: ['tampon', 'tampons'], pad: ['binde', 'binden', 'pad', 'pads'],
              liner: ['slipeinlage', 'slipeinlagen', 'liner'], cup: ['menstruationstasse', 'cup'],
              underwear: ['periodenunterwäsche', 'period underwear'],
            };
            let product = null;
            for (const [key, keywords] of Object.entries(productMap)) {
              if (has(q, ...keywords)) { product = key; break; }
            }
            if (!product) return null;
            const stats = attrs.product_usage_stats?.average_per_cycle || {};
            const avgUse = stats[product];
            const inventoryState = this._hass?.states?.['sensor.household_product_stock'];
            const stock = inventoryState?.attributes?.inventory?.[product];
            if (avgUse == null || stock == null) return notAvailable;
            const productLabel = this._t('opt_' + product) !== ('opt_' + product) ? this._t('opt_' + product) : product;
            if (stock >= avgUse) {
              return (this._t('dashboard_chat_stock_enough') || 'Sollte reichen — aktueller Bestand: {stock}, üblicher Verbrauch pro Zyklus: ca. {avg}.')
                .replace('{stock}', stock).replace('{avg}', Math.round(avgUse));
            }
            return (this._t('dashboard_chat_stock_low') || 'Könnte knapp werden — Bestand: {stock}, üblicher Verbrauch pro Zyklus: ca. {avg}. Eventuell {product} nachkaufen.')
              .replace('{stock}', stock).replace('{avg}', Math.round(avgUse)).replace('{product}', productLabel);
          },
        },
        {
          id: 'ovulation_days',
          specificity: 2,
          test: (q) => has(q, 'eisprung', 'ovulation') && has(q, 'wie viele tage', 'in wie vielen tagen', 'how many days'),
          answer: (q, attrs) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const ov = attrs.fertility_forecast?.ovulation_estimate;
            if (!ov) return notAvailable;
            const days = Math.round((new Date(ov) - new Date(this._todayIso())) / 86400000);
            if (days <= 0) return this._t('dashboard_chat_ovulation_today_or_past') || 'Der Eisprung wird für heute erwartet oder liegt bereits zurück.';
            return (this._t('dashboard_chat_ovulation_in_days') || 'Voraussichtlich in {days} Tagen.').replace('{days}', days);
          },
        },
        {
          id: 'nfp_confirmed',
          specificity: 2,
          test: (q) => has(q, 'temperaturkurve bestätigt', 'eisprung bestätigt', 'temperature confirmed', 'ovulation confirmed'),
          answer: (q, attrs) => {
            const nfp = attrs.nfp_analysis;
            if (!nfp) return this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            if (nfp.temperature_rise_detected && nfp.temperature_rise_day) {
              return (this._t('dashboard_chat_nfp_confirmed') || 'Ja, bestätigt am {date}.').replace('{date}', this._formatDate(nfp.temperature_rise_day));
            }
            return this._t('dashboard_chat_nfp_not_confirmed') || 'Noch nicht — es liegt noch keine bestätigte Temperaturkurve für diesen Zyklus vor.';
          },
        },
        {
          id: 'ovulation_date',
          specificity: 1,
          test: (q) => has(q, 'eisprung', 'ovulation'),
          answer: (q, attrs) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const ov = attrs.fertility_forecast?.ovulation_estimate;
            if (!ov) return notAvailable;
            return (this._t('dashboard_chat_ovulation') || 'Voraussichtlich am {date}.').replace('{date}', this._formatDate(ov));
          },
        },
        {
          id: 'current_phase',
          specificity: 1,
          test: (q) => has(q, 'welche phase', 'welcher phase', 'wo stehe ich', 'aktuelle phase', 'what phase'),
          answer: (q, attrs, stateObj) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const phase = attrs.current_phase || stateObj?.state;
            if (!phase) return notAvailable;
            const phaseKeyMap = {
              period: 'phase_menstruation', follicular: 'phase_follicular',
              fertile_window: 'dashboard_fertility_window', ovulation_day: 'dashboard_fertility_ovulation',
              luteal: 'phase_luteal', late_luteal: 'phase_luteal',
            };
            const key = phaseKeyMap[phase] || phase;
            const label = this._t(key);
            return (this._t('dashboard_chat_current_phase') || 'Du bist aktuell in der Phase: {phase}.').replace('{phase}', label !== key ? label : phase);
          },
        },
        {
          id: 'cycle_day',
          specificity: 1,
          test: (q) => has(q, 'welcher zyklustag', 'zyklustag heute', 'which cycle day', 'cycle day today'),
          answer: (q, attrs) => {
            const day = attrs.cycle_day;
            if (day === null || day === undefined) return this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            return (this._t('dashboard_chat_cycle_day') || 'Heute ist Zyklustag {day}.').replace('{day}', day);
          },
        },
        {
          id: 'regularity',
          specificity: 1,
          test: (q) => has(q, 'regelmäßig', 'regularity', 'wie regelmäßig'),
          answer: (q, attrs) => {
            const pct = attrs.cycle_statistics?.cycle_regularity_percent;
            if (pct === null || pct === undefined) return this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            return (this._t('dashboard_chat_regularity') || 'Deine Zyklen sind zu etwa {pct}% regelmäßig.').replace('{pct}', Math.round(pct));
          },
        },
        {
          id: 'period_duration',
          specificity: 2,
          test: (q) => grp(q, PERIOD_WORDS, ['dauer', 'lange', 'length']),
          answer: (q, attrs) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const start = attrs.period_forecast?.predicted_start;
            const end = attrs.period_forecast?.predicted_end;
            if (!start || !end) return notAvailable;
            const days = Math.round((new Date(end) - new Date(start)) / 86400000) + 1;
            return (this._t('dashboard_chat_period_duration') || 'Für gewöhnlich etwa {days} Tage.').replace('{days}', days);
          },
        },
        {
          id: 'badges',
          specificity: 1,
          test: (q) => has(q, 'abzeichen', 'welche abzeichen', 'badges', 'achievements'),
          answer: (q, attrs) => {
            const raw = Array.isArray(attrs.progress_badges) ? attrs.progress_badges : [];
            if (!raw.length) return this._t('progress_empty_state') || 'Noch keine Abzeichen erreicht.';
            const titles = raw.slice(-5).reverse().map((b) => String(b?.title ?? b?.id ?? '')).filter(Boolean);
            return (this._t('dashboard_chat_badges') || 'Deine letzten Abzeichen: {list}.').replace('{list}', titles.join(', '));
          },
        },
        {
          id: 'menopause_status',
          specificity: 1,
          test: (q) => has(q, 'wechseljahre', 'menopause', 'klimakterium'),
          answer: (q, attrs) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const monthsTracked = attrs.menopause_months_tracked;
            const daysSince = attrs.days_since_last_period;
            if (daysSince === null || daysSince === undefined) return notAvailable;
            const isConfirmed = daysSince >= 365;
            if (isConfirmed) return this._t('dashboard_chat_menopause_confirmed') || 'Ja, offiziell bestätigt (12 Monate ohne Periode).';
            const monthsLabel = monthsTracked !== null && monthsTracked !== undefined ? Math.round(monthsTracked) : Math.round(daysSince / 30);
            return (this._t('dashboard_chat_menopause_pending') || 'Noch nicht offiziell bestätigt — aktuell {months} Monate ohne Periode erfasst.').replace('{months}', monthsLabel);
          },
        },
        {
          id: 'pregnancy_week',
          specificity: 1,
          test: (q) => has(q, 'welche woche', 'welcher woche', 'schwangerschaftswoche', 'entbindungstermin', 'pregnancy week', 'due date'),
          answer: (q, attrs) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const weeks = Math.floor(Number(attrs.weeks_pregnant ?? 0) || 0);
            const dueDate = attrs.due_date ?? attrs.pregnancy_data?.due_date;
            if (!weeks && !dueDate) return notAvailable;
            const parts = [];
            if (weeks) parts.push((this._t('dashboard_chat_pregnancy_week') || 'Du bist aktuell in SSW {week}.').replace('{week}', weeks));
            if (dueDate) parts.push((this._t('dashboard_chat_due_date') || 'Entbindungstermin: {date}.').replace('{date}', this._formatDate(dueDate)));
            return parts.join(' ');
          },
        },
        {
          id: 'contraception',
          specificity: 1,
          test: (q) => has(q, 'welche methode', 'welche verhütung', 'verhütungsmethode', 'contraception method') || (has(q, 'wechseln') && has(q, 'verhütung', 'spirale', 'implantat')),
          answer: (q, attrs) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const status = attrs.contraception_status;
            if (!status?.current_method) return notAvailable;
            const key = `opt_${status.current_method}`;
            const methodLabel = this._t(key) !== key ? this._t(key) : status.current_method;
            let answerText = (this._t('dashboard_chat_contraception_method') || 'Aktuell erfasst: {method}.').replace('{method}', methodLabel);
            if (status.renewal_due_date) {
              answerText += ` ${(this._t('dashboard_chat_contraception_renewal') || 'Möglicher Wechsel: {date}.').replace('{date}', this._formatDate(status.renewal_due_date))}`;
            }
            return answerText;
          },
        },
        {
          id: 'postpartum_remaining',
          specificity: 1,
          test: (q) => has(q, 'wochenbett'),
          answer: (q, attrs) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const pp = attrs.postpartum_data && typeof attrs.postpartum_data === 'object' ? attrs.postpartum_data : {};
            const daysSinceBirth = pp.days_since_birth;
            const durationDays = pp.duration_days ?? attrs.postpartum_duration ?? 42;
            if (daysSinceBirth === null || daysSinceBirth === undefined) return notAvailable;
            const remaining = Math.max(0, durationDays - daysSinceBirth);
            if (remaining === 0) return this._t('dashboard_chat_postpartum_done') || 'Der übliche Wochenbett-Zeitraum ist bereits abgeschlossen.';
            return (this._t('dashboard_chat_postpartum_remaining') || 'Noch etwa {days} Tage.').replace('{days}', remaining);
          },
        },
        {
          id: 'pregnancy_test_timing',
          specificity: 1,
          test: (q) => has(q, 'schwangerschaftstest', 'pregnancy test'),
          answer: (q, attrs) => {
            const predicted = attrs.period_forecast?.predicted_start;
            const guidance = this._t('dashboard_chat_pregnancy_test_guidance') || 'Ein Test ist meist ab dem erwarteten Beginn der Periode zuverlässig, manche frühestens ein paar Tage davor — genaueres steht in der Packungsbeilage des jeweiligen Tests.';
            if (!predicted) return guidance;
            const daysUntil = Math.round((new Date(predicted) - new Date(this._todayIso())) / 86400000);
            if (daysUntil <= 0) return `${this._t('dashboard_chat_pregnancy_test_now') || 'Deine Periode wird bereits erwartet — ein Test wäre jetzt aussagekräftig.'} ${guidance}`;
            return `${(this._t('dashboard_chat_pregnancy_test_wait') || 'Deine Periode wird erst in {days} Tagen erwartet — davor ist ein Test meist noch nicht zuverlässig.').replace('{days}', daysUntil)} ${guidance}`;
          },
        },
        {
          id: 'mucus_interpretation',
          specificity: 1,
          test: (q) => has(q, 'schleim', 'zervixschleim', 'mucus', 'cervical mucus'),
          answer: (q) => {
            const mucusLevels = [
              { level: 'high', keywords: ['durchsichtig', 'klar', 'fadenziehend', 'spinnbar', 'eiweiß', 'transparent', 'clear', 'stretchy', 'egg white'] },
              { level: 'medium', keywords: ['cremig', 'creamy', 'milchig'] },
              { level: 'low', keywords: ['klebrig', 'sticky', 'zäh'] },
              { level: 'none', keywords: ['nichts', 'trocken', 'keinen', 'none', 'dry'] },
            ];
            const matched = mucusLevels.find((entry) => has(q, ...entry.keywords));
            if (matched) {
              const key = `dashboard_chat_mucus_${matched.level}`;
              const interpretation = this._t(key) !== key ? this._t(key) : null;
              if (interpretation) {
                const caveat = this._t('dashboard_chat_mucus_caveat') || 'Zervixschleim ist nur eines von mehreren NFP-Beobachtungszeichen — zusammen mit der Basaltemperatur ist die Einschätzung deutlich verlässlicher als für sich allein.';
                return `${interpretation} ${caveat}`;
              }
            }
            return this._t('dashboard_chat_mucus_unclear') || 'Ich konnte die Beschreibung nicht eindeutig zuordnen. Übliche Kategorien: nichts/trocken, klebrig, cremig, oder durchsichtig/fadenziehend (Eiweißschleim).';
          },
        },
        {
          id: 'cervix_interpretation',
          specificity: 1,
          test: (q) => has(q, 'muttermund', 'cervix'),
          answer: (q) => {
            const isHighOrOpen = has(q, 'hoch', 'weich', 'offen', 'high', 'soft', 'open');
            const isLowOrFirm = has(q, 'niedrig', 'tief', 'fest', 'geschlossen', 'low', 'firm', 'closed');
            const caveat = this._t('dashboard_chat_mucus_caveat') || 'Das ist nur eines von mehreren NFP-Beobachtungszeichen — zusammen mit der Basaltemperatur ist die Einschätzung deutlich verlässlicher als für sich allein.';
            if (isHighOrOpen && !isLowOrFirm) {
              return `${this._t('dashboard_chat_cervix_high') || 'Hoch, weich und/oder offen deutet typischerweise auf eine hohe Fruchtbarkeit hin — meist nahe am Eisprung.'} ${caveat}`;
            }
            if (isLowOrFirm && !isHighOrOpen) {
              return `${this._t('dashboard_chat_cervix_low') || 'Niedrig, fest und/oder geschlossen deutet typischerweise auf eine niedrigere Fruchtbarkeit hin.'} ${caveat}`;
            }
            return this._t('dashboard_chat_cervix_unclear') || 'Ich konnte die Beschreibung nicht eindeutig zuordnen. Übliche Kategorien: hoch/weich/offen (fruchtbarer) oder niedrig/fest/geschlossen (weniger fruchtbar).';
          },
        },
        {
          id: 'summary',
          specificity: 1,
          test: (q) => has(q, 'wie sieht mein zyklus', 'zyklus-überblick', 'zyklusüberblick', 'zusammenfassung', 'cycle overview', 'cycle summary'),
          answer: (q, attrs, stateObj) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const day = attrs.cycle_day;
            const phase = attrs.current_phase || stateObj?.state;
            const predicted = attrs.period_forecast?.predicted_start;
            const parts = [];
            if (day !== null && day !== undefined) {
              parts.push((this._t('dashboard_chat_cycle_day') || 'Heute ist Zyklustag {day}.').replace('{day}', day));
            }
            if (phase) {
              const phaseKeyMap = {
                period: 'phase_menstruation', follicular: 'phase_follicular',
                fertile_window: 'dashboard_fertility_window', ovulation_day: 'dashboard_fertility_ovulation',
                luteal: 'phase_luteal', late_luteal: 'phase_luteal',
              };
              const key = phaseKeyMap[phase] || phase;
              const label = this._t(key);
              parts.push((this._t('dashboard_chat_current_phase') || 'Du bist aktuell in der Phase: {phase}.').replace('{phase}', label !== key ? label : phase));
            }
            if (predicted) {
              const days = Math.round((new Date(predicted) - new Date(this._todayIso())) / 86400000);
              if (days >= 0) {
                parts.push((this._t('dashboard_chat_period_in_days') || 'Voraussichtlich in {days} Tagen, am {date}.').replace('{days}', days).replace('{date}', this._formatDate(predicted)));
              }
            }
            if (!parts.length) return notAvailable;
            return parts.join(' ');
          },
        },
        {
          id: 'discharge_search',
          specificity: 2,
          test: (q) => has(q, 'ausfluss', 'discharge') && has(q, 'ungewöhnlich', 'unusual', 'auffällig', 'hatte ich', 'did i have'),
          answer: (q, attrs, stateObj) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const range = this._resolveChatDateRange(q, attrs);
            if (!range) return notAvailable;
            const [rangeStart, rangeEnd] = range;
            const history = this._getFullSymptomHistory(stateObj);
            const matches_ = history.filter((e) => e?.date >= rangeStart && e.date <= rangeEnd && e.discharge === 'other');
            if (!matches_.length) return this._t('dashboard_chat_discharge_none') || 'Nichts Ungewöhnliches in diesem Zeitraum erfasst.';
            const dates = matches_.map((e) => this._formatDate(e.date)).join(', ');
            return (this._t('dashboard_chat_discharge_found') || 'Ja, an {count} Tagen als ungewöhnlich erfasst: {dates}. Bei anhaltenden Auffälligkeiten kann ein Arztbesuch sinnvoll sein.').replace('{count}', matches_.length).replace('{dates}', dates);
          },
        },
        {
          id: 'anomaly_insights',
          specificity: 2,
          test: (q) => has(q, 'auffällig', 'ungewöhnlich', 'anomaly', 'anomalie', 'unusual') && has(q, 'zyklus', 'cycle'),
          answer: (q, attrs) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const cycleStats = attrs.cycle_statistics && typeof attrs.cycle_statistics === 'object' ? attrs.cycle_statistics : null;
            const regularityPercent = cycleStats?.cycle_regularity_percent;
            if (regularityPercent === null || regularityPercent === undefined) return notAvailable;
            if (regularityPercent >= 70) {
              return (this._t('dashboard_chat_anomaly_regular') || 'Nichts Auffälliges — dein Zyklus ist zu etwa {pct}% regelmäßig.').replace('{pct}', Math.round(regularityPercent));
            }
            return (this._t('dashboard_chat_anomaly_irregular') || 'Dein Zyklus zeigt aktuell eine geringere Regelmäßigkeit (etwa {pct}%) — schau dir gerne die Anomalie-Karte für Details an.').replace('{pct}', Math.round(regularityPercent));
          },
        },
        {
          id: 'pms_start',
          specificity: 2,
          test: (q) => has(q, 'pms') && has(q, 'wann', 'beginn', 'when', 'start'),
          answer: (q, attrs) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const predicted = attrs.period_forecast?.predicted_start;
            if (!predicted) return notAvailable;
            const pmsStart = new Date(new Date(predicted).getTime() - 5 * 86400000).toISOString().slice(0, 10);
            return (this._t('dashboard_chat_pms_start') || 'Voraussichtlich ab etwa {date} — eine grobe Schätzung, keine exakte Vorhersage.').replace('{date}', this._formatDate(pmsStart));
          },
        },
        {
          id: 'tracking_consistency',
          specificity: 2,
          test: (q) => has(q, 'wie viele tage') && has(q, 'erfasst', 'geloggt', 'getrackt', 'logged', 'tracked'),
          answer: (q, attrs, stateObj) => {
            const history = this._getFullSymptomHistory(stateObj);
            const now = new Date(this._todayIso());
            const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const count = history.filter((e) => typeof e?.date === 'string' && e.date.startsWith(monthPrefix)).length;
            return (this._t('dashboard_chat_tracking_consistency') || 'Diesen Monat bisher an {count} Tagen erfasst.').replace('{count}', count);
          },
        },
        {
          // "Hab ich vor meiner Periode öfter Kopfschmerzen?" — three
          // independent conditions (symptom-word + phase-reference +
          // frequency-word) deliberately outrank the plainer symptom_search
          // intent (specificity 2), which would otherwise also match on the
          // shared "hab ich"/symptom-word overlap.
          id: 'symptom_correlation',
          specificity: 3,
          test: (q) => {
            const symptomKeywordMap = {
              headache: ['kopfschmerz', 'headache'], migraine: ['migräne', 'migraine'], cramps: ['krämpfe', 'krampf', 'cramps'],
              lower_back: ['rückenschmerz', 'back pain', 'lower back'], tender_breasts: ['brüste', 'brustspannen', 'tender breasts'],
              mittelschmerz: ['mittelschmerz'],
            };
            const hasSymptom = Object.values(symptomKeywordMap).some((kws) => has(q, ...kws));
            const hasPhaseRef = has(q, 'vor meiner periode', 'vor der periode', 'während der periode', 'während meiner periode', 'nach der periode', 'before my period', 'during my period', 'after my period');
            const hasFrequency = has(q, 'öfter', 'häufiger', 'seltener', 'more often', 'less often');
            return hasSymptom && hasPhaseRef && hasFrequency;
          },
          answer: (q, attrs) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const symptomKeywordMap = {
              headache: ['kopfschmerz', 'headache'], migraine: ['migräne', 'migraine'], cramps: ['krämpfe', 'krampf', 'cramps'],
              lower_back: ['rückenschmerz', 'back pain', 'lower back'], tender_breasts: ['brüste', 'brustspannen', 'tender breasts'],
              mittelschmerz: ['mittelschmerz'],
            };
            let matchedSymptom = null;
            for (const [key, keywords] of Object.entries(symptomKeywordMap)) {
              if (has(q, ...keywords)) { matchedSymptom = key; break; }
            }
            const targetPhases = has(q, 'vor meiner periode', 'vor der periode', 'before my period')
              ? ['luteal', 'late_luteal']
              : has(q, 'während der periode', 'während meiner periode', 'during my period')
                ? ['period']
                : ['follicular'];
            const insights = Array.isArray(attrs.symptom_correlation_insights) ? attrs.symptom_correlation_insights : [];
            const match = insights.find((ins) => ins.symptom_key === matchedSymptom && targetPhases.includes(ins.phase));
            if (!match) return this._t('dashboard_chat_correlation_none') || 'Dafür konnte bisher kein deutlicher Zusammenhang festgestellt werden — entweder gibt es keinen, oder es liegen noch nicht genug Daten vor.';
            const symptomLabel = this._t(matchedSymptom) !== matchedSymptom ? this._t(matchedSymptom) : (this._t('opt_' + matchedSymptom) !== ('opt_' + matchedSymptom) ? this._t('opt_' + matchedSymptom) : matchedSymptom);
            const template = match.direction === 'more_frequent'
              ? (this._t('dashboard_chat_correlation_more') || 'Ja — {symptom} tritt in dieser Phase etwa {ratio}x häufiger auf als sonst.')
              : (this._t('dashboard_chat_correlation_less') || 'Eher seltener — {symptom} tritt in dieser Phase etwa {ratio}x seltener auf als sonst.');
            return template.replace('{symptom}', symptomLabel).replace('{ratio}', String(match.ratio));
          },
        },
        {
          id: 'training_search',
          specificity: 2,
          test: (q) => has(q, 'trainiert', 'training', 'sport', 'workout') && has(q, 'wie oft', 'how often'),
          answer: (q, attrs, stateObj) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const range = this._resolveChatDateRange(q, attrs);
            if (!range) return notAvailable;
            const [rangeStart, rangeEnd] = range;
            const history = this._getFullSymptomHistory(stateObj);
            const count = history.filter((e) => e?.date >= rangeStart && e.date <= rangeEnd && e.training_intensity).length;
            return (this._t('dashboard_chat_training_count') || '{count} Mal erfasst in diesem Zeitraum.').replace('{count}', count);
          },
        },
        {
          id: 'spotting_search',
          specificity: 2,
          test: (q) => has(q, 'zwischenblutung', 'spotting') && has(q, 'hatte ich', 'wie oft', 'did i have', 'how often'),
          answer: (q, attrs, stateObj) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const range = this._resolveChatDateRange(q, attrs);
            if (!range) return notAvailable;
            const [rangeStart, rangeEnd] = range;
            const history = this._getFullSymptomHistory(stateObj);
            const matches_ = history.filter((e) => e?.date >= rangeStart && e.date <= rangeEnd && e.spotting);
            if (!matches_.length) return this._t('dashboard_chat_spotting_none') || 'Dafür hab ich in diesem Zeitraum keine Einträge gefunden.';
            const dates = matches_.map((e) => this._formatDate(e.date)).join(', ');
            return (this._t('dashboard_chat_spotting_found') || 'Ja, an {count} Tagen erfasst: {dates}.').replace('{count}', matches_.length).replace('{dates}', dates);
          },
        },
        {
          // "Was hab ich am 15. August erfasst?" — supports both numeric
          // (17.08.2027) and German month-name dates, unlike period_in_range
          // above which only needs the numeric form.
          id: 'day_lookup',
          specificity: 3,
          test: (q) => {
            const numericMatch = q.match(/(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?/);
            const monthNameMatch = q.match(/(\d{1,2})\.?\s*(januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)\s*(\d{4})?/);
            return (!!numericMatch || !!monthNameMatch) && has(q, 'erfasst', 'geloggt', 'logged', 'was hab ich', 'what did i');
          },
          answer: (q, attrs, stateObj) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const monthNames = { januar: 1, februar: 2, märz: 3, april: 4, mai: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12 };
            const now = new Date(this._todayIso());
            let targetDate = null;
            const monthNameMatch = q.match(/(\d{1,2})\.?\s*(januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)\s*(\d{4})?/);
            if (monthNameMatch) {
              const day = parseInt(monthNameMatch[1], 10);
              const month = monthNames[monthNameMatch[2]];
              const year = monthNameMatch[3] || String(now.getFullYear());
              targetDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            } else {
              const numericMatch = q.match(/(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?/);
              const day = parseInt(numericMatch[1], 10);
              const month = parseInt(numericMatch[2], 10);
              const year = numericMatch[3] ? (numericMatch[3].length === 2 ? `20${numericMatch[3]}` : numericMatch[3]) : String(now.getFullYear());
              targetDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
            const history = this._getFullSymptomHistory(stateObj);
            const entry = history.find((e) => e?.date === targetDate);
            if (!entry) return this._t('dashboard_chat_day_lookup_none') || 'Dafür hab ich keinen Eintrag gefunden.';
            const skipKeys = new Set(['date']);
            const parts = Object.entries(entry)
              .filter(([k, v]) => !skipKeys.has(k) && v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))
              .map(([k, v]) => {
                const fieldLabel = this._t('cat_' + k) !== ('cat_' + k) ? this._t('cat_' + k) : k;
                const valueLabel = Array.isArray(v)
                  ? v.map((item) => (this._t('opt_' + item) !== ('opt_' + item) ? this._t('opt_' + item) : item)).join(', ')
                  : (this._t('opt_' + v) !== ('opt_' + v) ? this._t('opt_' + v) : String(v));
                return `${fieldLabel}: ${valueLabel}`;
              });
            if (!parts.length) return this._t('dashboard_chat_day_lookup_none') || 'Dafür hab ich keinen Eintrag gefunden.';
            return `${this._formatDate(targetDate)} — ${parts.join(', ')}`;
          },
        },
        {
          id: 'libido_search',
          specificity: 2,
          test: (q) => has(q, 'lust', 'libido') && has(q, 'wie oft', 'hatte ich', 'how often', 'did i have'),
          answer: (q, attrs, stateObj) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const range = this._resolveChatDateRange(q, attrs);
            if (!range) return notAvailable;
            const [rangeStart, rangeEnd] = range;
            const history = this._getFullSymptomHistory(stateObj);
            const target = has(q, 'wenig', 'low') ? 'libido_low' : 'libido_high';
            const matches_ = history.filter((e) => e?.date >= rangeStart && e.date <= rangeEnd && e.libido === target);
            if (!matches_.length) return this._t('dashboard_chat_libido_none') || 'Dafür hab ich in diesem Zeitraum keine Einträge gefunden.';
            const dates = matches_.map((e) => this._formatDate(e.date)).join(', ');
            return (this._t('dashboard_chat_libido_found') || 'Ja, an {count} Tagen erfasst: {dates}.').replace('{count}', matches_.length).replace('{dates}', dates);
          },
        },
        // --- General educational questions below: static, non-personal
        // content (similar to the glossary) rather than a lookup against
        // this profile's own data. Kept appropriately general/non-diagnostic
        // — "is X normal" is answered with typical reference ranges, never
        // "is it normal *for you*".
        {
          // Extra "normal"/"normale" condition (3 groups total) deliberately
          // outranks the plain cycle_length data intent (specificity 2),
          // which "was ist eine normale Zykluslänge" would otherwise also
          // match (it contains the same zyklus+länge words).
          id: 'normal_cycle_length_info',
          specificity: 3,
          test: (q) => has(q, 'normale zykluslänge', 'normaler zyklus', 'normal cycle length', 'ist eine normale', 'ist das normal', 'ist es normal'),
          answer: () => this._t('dashboard_chat_normal_cycle_info') || 'Ein Zyklus gilt meist als üblich, wenn er zwischen 21 und 35 Tagen liegt, und die Periode selbst 2 bis 7 Tage dauert. In den ersten Jahren nach der Menarche und in der Perimenopause sind größere Schwankungen normal. Bei anhaltenden, deutlichen Abweichungen kann ein Arztgespräch sinnvoll sein.',
        },
        {
          id: 'pregnant_during_period_info',
          specificity: 2,
          test: (q) => has(q, 'schwanger', 'pregnant') && has(q, 'während der periode', 'während meiner periode', 'during my period', 'during period'),
          answer: () => this._t('dashboard_chat_pregnant_during_period_info') || 'Unwahrscheinlich, aber nicht ausgeschlossen — vor allem bei kurzen Zyklen oder unregelmäßigem Eisprung können sich fruchtbare Tage und die Periode zeitlich überschneiden, und Spermien können mehrere Tage überleben.',
        },
        {
          id: 'day_one_definition_info',
          specificity: 2,
          test: (q) => has(q, 'erster tag', 'tag 1', 'day one', 'first day') && has(q, 'zählt', 'count', 'periode', 'period', 'zyklus', 'cycle'),
          answer: () => this._t('dashboard_chat_day_one_info') || 'Ja — der erste Tag mit richtiger Blutung (nicht Schmierblutung) gilt als Tag 1 des Zyklus. So wird es auch in dieser App gezählt.',
        },
        {
          id: 'prediction_accuracy_info',
          specificity: 2,
          test: (q) => has(q, 'wie genau', 'how accurate') && has(q, 'vorhersage', 'prediction'),
          answer: () => this._t('dashboard_chat_prediction_accuracy_info') || 'Die Vorhersagen basieren auf deiner bisherigen Zyklushistorie und werden mit mehr erfassten Zyklen zuverlässiger. Es sind Schätzungen, keine Garantie — besonders bei unregelmäßigen Zyklen oder wenig Historie können sie abweichen.',
        },
        {
          // Data already exposed on sensor.household_product_stock (the same
          // entity product_stock reads from above) — no backend change
          // needed, just wiring it into the chat.
          id: 'underwear_washing',
          specificity: 2,
          test: (q) => has(q, 'unterwäsche', 'underwear') && has(q, 'waschen', 'wash'),
          answer: () => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const inventoryState = this._hass?.states?.['sensor.household_product_stock'];
            const available = inventoryState?.attributes?.underwear_available;
            const threshold = inventoryState?.attributes?.underwear_washing_threshold;
            if (available == null || threshold == null) return notAvailable;
            if (available <= threshold) {
              return (this._t('dashboard_chat_underwear_wash_yes') || 'Sieht so aus — nur noch {available} saubere übrig, Schwelle liegt bei {threshold}.').replace('{available}', available).replace('{threshold}', threshold);
            }
            return (this._t('dashboard_chat_underwear_wash_no') || 'Noch nicht nötig — {available} saubere verfügbar.').replace('{available}', available);
          },
        },
        {
          // Parallel to ovulation_test above — same "test" field, just
          // filtered for the pregnancy-test values instead.
          id: 'pregnancy_test_search',
          specificity: 2,
          test: (q) => has(q, 'schwangerschaftstest', 'pregnancy test') && has(q, 'letzte', 'zuletzt', 'last'),
          answer: (q, attrs, stateObj) => {
            const notAvailable = this._t('dashboard_chat_no_data') || 'Dazu hab ich aktuell nicht genug Daten.';
            const history = this._getFullSymptomHistory(stateObj);
            const isNegative = has(q, 'negativ', 'negative');
            const targetValue = isNegative ? 'negative_pregnancy' : 'positive_pregnancy';
            const matches_ = history.filter((e) => Array.isArray(e.test) && e.test.includes(targetValue)).sort((a, b) => (a.date < b.date ? -1 : 1));
            if (!matches_.length) return notAvailable;
            return (this._t('dashboard_chat_ovulation_test_last') || 'Zuletzt am {date}.').replace('{date}', this._formatDate(matches_[matches_.length - 1].date));
          },
        },
        {
          // Meta-question about the chatbot's own capabilities, not about
          // the cycle itself — high specificity so it reliably wins even
          // though its trigger words are short, since none of the other 48
          // intents use "hilfe"/"was kannst du" as a trigger.
          id: 'help',
          specificity: 3,
          test: (q) => has(q, 'was kannst du', 'welche fragen', 'hilfe', 'help', 'what can you', 'what questions'),
          answer: () => this._t('dashboard_chat_help') || 'Ich kann z. B. zu diesen Themen etwas sagen:\n\n📅 Periode: nächste/letzte, warum spät, Dauer, Vergleich zur letzten\n🔄 Zyklus: Länge, Zyklustag, Regelmäßigkeit, kürzester/längster\n🌸 Fruchtbarkeit: Fenster, Eisprung, Temperaturkurve, Schleim/Muttermund-Deutung\n📋 Symptome: Suche nach Kopfschmerzen, Krämpfen, Ausfluss, Zwischenblutungen u.a.\n🤰 Lebensphasen: Schwangerschaft, Wechseljahre, Wochenbett, Vor-der-Menarche, Verhütung\n📖 Allgemeines: Begriffs-Erklärungen, Aufklärungsfragen\n\nEinfach drauflos fragen — bei unklaren Formulierungen frag ich lieber nochmal nach, statt zu raten.',
        },
      ];
    }

    /**
     * Picks the best-matching chat intent (highest specificity among those
     * that match) and returns its answer, or the fallback if none match or
     * the winning intent's answer function itself declines (returns null —
     * used by e.g. the glossary intent when "was ist X" matched but X isn't
     * a known term).
     */
    _answerCycleQuestion(question, stateObj) {
      const q = question.toLowerCase();
      const attrs = stateObj?.attributes || {};
      const fallback = this._t('dashboard_chat_fallback') || 'Das konnte ich nicht zuordnen. Frag mich z. B. "Was kannst du beantworten?" für eine Übersicht.';

      const candidates = this._chatIntents()
        .filter((intent) => {
          try {
            return !!intent.test(q, attrs);
          } catch (err) {
            console.error('[menstruation-cycle] Chat intent test failed:', intent.id, err);
            return false;
          }
        })
        .sort((a, b) => b.specificity - a.specificity);

      for (const intent of candidates) {
        try {
          const result = intent.answer(q, attrs, stateObj);
          if (result) return result;
          // null/empty return means "matched the trigger but couldn't
          // actually answer" (e.g. glossary term not recognized) — try the
          // next-best candidate instead of giving up immediately.
        } catch (err) {
          console.error('[menstruation-cycle] Chat intent answer failed:', intent.id, err);
        }
      }
      return fallback;
    }


    _renderQuickLogModal(stateObj) {
      if (!this._quickLogOpen) return '';
      const attrs = stateObj?.attributes || {};
      const mode = this._resolveContentMode(stateObj);
      const isPregnant = mode === 'pregnancy';
      const fields = window.MenstruationFunctions ? window.MenstruationFunctions.getSymptomConfig(mode, isPregnant) : [];
      if (!window.MenstruationFunctions) {
        console.warn('[menstruation-cycle-dashboard-panel] window.MenstruationFunctions is not available — the quick-log modal will show no symptom fields. This usually means menstruation-functions.js failed to load or hasn\'t finished loading yet. Check the Network tab for a failed/slow request to that file.');
      }
      const tOption = (val) => {
        if (!window.MenstruationFunctions) return String(val);
        const key = window.MenstruationFunctions.normalizeOptionKey(val);
        const prefixed = this._t(`opt_${key}`);
        return prefixed !== `opt_${key}` ? prefixed : (this._t(key) !== key ? this._t(key) : String(val));
      };
      const tCategory = (key) => {
        const prefixed = this._t(`cat_${key}`);
        return prefixed !== `cat_${key}` ? prefixed : key;
      };

      const rows = fields
        .filter((cat) => !cat.hiddenInModal)
        .filter((cat) => !(cat.key === 'clot_size' && this._quickLogSelections.clots !== 'yes'))
        .map((cat) => {
          const options = (cat.options || []).map((opt) => {
            const isSelected = cat.multi
              ? (Array.isArray(this._quickLogSelections[cat.key]) && this._quickLogSelections[cat.key].includes(opt))
              : this._quickLogSelections[cat.key] === opt;
            const action = cat.multi ? 'quick-log-toggle-multi' : 'quick-log-select';
            return `<button type="button" class="mode-btn${isSelected ? ' active' : ''}" data-action="${action}" data-key="${escapeHtml(cat.key)}" data-val="${escapeHtml(opt)}" aria-pressed="${isSelected}">${escapeHtml(tOption(opt))}</button>`;
          }).join('');
          return `
            <div>
              <div class="stat-label sym-cat-head" style="margin-bottom:6px;">${window.MenstruationFunctions ? window.MenstruationFunctions.renderCategoryIcon(cat.icon) : ''}<span>${escapeHtml(tCategory(cat.key))}</span></div>
              <div style="display:flex;flex-wrap:wrap;gap:6px;">${options}</div>
            </div>`;
        }).join('');

      const rowsOrFallback = window.MenstruationFunctions
        ? rows
        : `<p class="helper" style="grid-column:1/-1;">${escapeHtml(this._t('dashboard_quick_log_loading') || 'Wird geladen, bitte kurz erneut versuchen …')}</p>`;

      return `
        <div class="mc-modal-backdrop" role="presentation">
          <div class="mc-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(this._t('dashboard_log_today') || 'Heute loggen')}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
              <h2 style="margin:0;font-family:var(--mc-font-display);font-size:1.15rem;font-weight:500;">${escapeHtml(this._t('dashboard_log_today') || 'Heute loggen')}</h2>
              <button type="button" data-action="quick-log-close" aria-label="${this._t('dashboard_close') || 'Schließen'}" style="border:none;background:none;font-size:1.3rem;cursor:pointer;line-height:1;color:var(--secondary-text-color);">✕</button>
            </div>
            <p class="helper" style="margin:0 0 14px;">${escapeHtml(this._formatDate(this._todayIso()))}</p>
            <div style="max-height:60vh;overflow-y:auto;padding-right:4px;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:4px 16px;align-content:start;">
              ${rowsOrFallback}
            </div>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid var(--divider-color,#e5e7eb);">
              <button type="button" data-action="quick-log-close">${this._t('dashboard_cancel') || 'Abbrechen'}</button>
              <button type="button" class="mode-btn active" data-action="quick-log-save">${this._t('dashboard_save') || 'Speichern'}</button>
            </div>
          </div>
        </div>`;
    }

    async _handleQuickLogSave() {
      if (!this._selectedEntityId || !this._hass?.callService) {
        this._quickLogOpen = false;
        this.render();
        return;
      }
      const symptomData = {};
      Object.entries(this._quickLogSelections).forEach(([key, val]) => {
        if (val === undefined || val === null) return;
        if (Array.isArray(val)) {
          if (val.length > 0) symptomData[key] = val;
        } else if (val !== '') {
          symptomData[key] = val;
        }
      });
      // clot_size only makes sense when clots=yes — same dependsOn rule the
      // full calendar/gauge modals enforce, kept consistent here.
      if (symptomData.clots !== 'yes') delete symptomData.clot_size;

      this._quickLogOpen = false;
      this._quickLogSelections = {};
      this.render();

      if (Object.keys(symptomData).length === 0) return;

      try {
        await this._hass.callService('menstruation_cycle', 'add_symptom', {
          entity_id: this._selectedEntityId,
          date: this._todayIso(),
          symptom_data: symptomData,
        });
        this._message = this._t('dashboard_quick_log_saved') || 'Gespeichert.';
      } catch (err) {
        console.error('[menstruation-cycle] Quick-log save failed:', err);
        this._message = this._t('dashboard_quick_log_failed') || 'Speichern fehlgeschlagen.';
      }
      this.render();
    }

    _moveWidget(id, direction) {
      const target = this._editMode ? this._editDraft : this._prefs;
      if (!target) return;
      const idx = target.widgetOrder.indexOf(id);
      if (idx < 0) return;
      const next = direction === 'up' ? idx - 1 : idx + 1;
      if (next < 0 || next >= target.widgetOrder.length) return;
      const order = [...target.widgetOrder];
      [order[idx], order[next]] = [order[next], order[idx]];
      target.widgetOrder = order;
      if (!this._editMode) this._savePrefs();
      this.render();
    }

    _handleClick(event) {
      const rawTarget = event.target;
      if (!(rawTarget instanceof HTMLElement)) return;

      // Exact-target check (not closest()) so a click anywhere inside the modal
      // — including inert areas with no data-action of their own, like the
      // title or padding — doesn't bubble-match a stale ancestor action. Only
      // clicking the backdrop itself (outside the modal box) closes it.
      if (rawTarget.classList.contains('mc-modal-backdrop')) {
        this._quickLogOpen = false;
        this._quickLogSelections = {};
        this.render();
        return;
      }

      const target = rawTarget.closest('[data-action]');
      if (!target) return;
      const action = target.dataset.action;
      const widget = target.dataset.widget;

      if (action === 'toggle-chat-fab') {
        this._chatFabOpen = !this._chatFabOpen;
        this.render();
        if (this._chatFabOpen) {
          requestAnimationFrame(() => {
            this.shadowRoot?.getElementById('mc-chat-input')?.focus();
          });
        }
        return;
      }

      if (action === 'open-quick-log') {
        this._quickLogSelections = {};
        this._quickLogOpen = true;
        this.render();
        return;
      }

      if (action === 'quick-log-close') {
        this._quickLogOpen = false;
        this._quickLogSelections = {};
        this.render();
        return;
      }

      if (action === 'quick-log-select') {
        const key = target.dataset.key;
        const val = target.dataset.val;
        if (key && val !== undefined) {
          this._quickLogSelections[key] = this._quickLogSelections[key] === val ? undefined : val;
          this.render();
        }
        return;
      }

      if (action === 'quick-log-toggle-multi') {
        const key = target.dataset.key;
        const val = target.dataset.val;
        if (key && val !== undefined) {
          const current = Array.isArray(this._quickLogSelections[key]) ? this._quickLogSelections[key] : [];
          this._quickLogSelections[key] = current.includes(val)
            ? current.filter((v) => v !== val)
            : [...current, val];
          this.render();
        }
        return;
      }

      if (action === 'quick-log-save') {
        this._handleQuickLogSave();
        return;
      }

      if (action === 'chat-send') {
        this._handleChatSend();
        return;
      }

      if (action === 'chat-quick') {
        const question = target.dataset.question;
        if (question) this._handleChatSend(question);
        return;
      }

      if (action === 'toggle-edit') {
        if (!this._editMode) {
          this._editDraft = JSON.parse(JSON.stringify({ ...this._prefs }));
          this._editMode = true;
        } else {
          this._editDraft = null;
          this._editMode = false;
        }
        this.render();
      } else if (action === 'toggle-discreet-quick') {
        if (this._prefs) {
          this._prefs = { ...this._prefs, discreetMode: !this._prefs.discreetMode };
          this._savePrefs();
          this.render();
        }
      } else if (action === 'select-entity' && target.dataset.entityId) {
        this._handleEntityChange(target.dataset.entityId);
      } else if (action === 'log-product' && target.dataset.product) {
        this._logProductUsage(target.dataset.product);
      } else if (action === 'save-edit') {
        if (this._editDraft) {
          const { __profile, __mode, ...saved } = this._editDraft;
          this._prefs = { ...this._prefs, ...saved };
          this._savePrefs();
          this._message = this._t('dashboard_saved');
        }
        this._editDraft = null;
        this._editMode = false;
        this.render();
      } else if (action === 'cancel-edit') {
        this._editDraft = null;
        this._editMode = false;
        this.render();
      } else if (action === 'widget-up' && widget) {
        this._moveWidget(widget, 'up');
      } else if (action === 'widget-down' && widget) {
        this._moveWidget(widget, 'down');
      } else if (action === 'reset-preset') {
        const reset = this._normalizePrefs(this._preset(this._activeMode), this._activeProfile, this._activeMode);
        if (this._editMode) {
          this._editDraft = reset;
        } else {
          this._prefs = reset;
          this._savePrefs();
        }
        this.render();
      } else if (action === 'toggle-sign-picker' && target.dataset.sign) {
        this._expandedSign = this._expandedSign === target.dataset.sign ? null : target.dataset.sign;
        this.render();
      } else if (action === 'log-sign' && target.dataset.sign && target.dataset.stage) {
        this._logPreMenarcheSign(target.dataset.sign, target.dataset.stage);
      } else if (action === 'remove-sign' && target.dataset.sign) {
        this._removePreMenarcheSign(target.dataset.sign);
      } else if (action === 'year-overview-prev' || action === 'year-overview-next' || action === 'year-overview-today') {
        const current = this._yearOverviewYear || new Date().getFullYear();
        if (action === 'year-overview-prev') this._yearOverviewYear = current - 1;
        else if (action === 'year-overview-next') this._yearOverviewYear = current + 1;
        else this._yearOverviewYear = null;
        this.render();
      }
    }

    _handleChange(event) {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !this._prefs) return;

      if (target.tagName === 'SELECT' && target.classList.contains('entity-picker')) {
        this._handleEntityChange(target.value);
        return;
      }

      const draft = this._editMode ? this._editDraft : this._prefs;
      if (!draft) return;
      if (target instanceof HTMLInputElement && target.dataset.widgetVisibility) {
        draft.widgetVisibility[target.dataset.widgetVisibility] = target.checked;
        if (!this._editMode) this._savePrefs();
        this.render();
      }
      if (target instanceof HTMLInputElement && target.dataset.pref === 'discreetMode') {
        draft.discreetMode = target.checked;
        if (!this._editMode) this._savePrefs();
        this.render();
      }
      if (target instanceof HTMLInputElement && target.dataset.pref === 'displayName') {
        draft.myInfo.displayName = target.value.trim();
        if (!this._editMode) this._savePrefs();
      }
      if (target instanceof HTMLInputElement && target.dataset.pref === 'pronouns') {
        draft.myInfo.pronouns = target.value.trim();
        if (!this._editMode) this._savePrefs();
      }
    }

    _handleSubmit(event) {
      if (!(event.target instanceof HTMLFormElement)) return;
      if (event.target.dataset.form === 'quick-log') {
        event.preventDefault();
        const formData = new FormData(event.target);
        this._saveQuickLog(formData);
      }
    }

    _renderQuickLogCard(discreetMode) {
      return `
        <form class="quick-log" data-form="quick-log">
          <label>${this._t('bleeding_strength')}
            <select name="bleeding">
              <option value="">${this._t('none')}</option>
              <option value="none">${this._t('bleeding_none')}</option>
              <option value="light">${this._t('bleeding_light')}</option>
              <option value="medium">${this._t('bleeding_medium')}</option>
              <option value="heavy">${this._t('bleeding_heavy')}</option>
            </select>
          </label>
          <label>${this._t('pain')}
            <select name="pain">
              <option value="none">${this._t('none')}</option>
              <option value="cramps">${this._t('opt_cramps')}</option>
              <option value="headache">${this._t('opt_headache')}</option>
              <option value="lower_back">${this._t('opt_lower_back')}</option>
            </select>
          </label>
          <label>${this._t('mood')}
            <input name="mood" type="text" value="${escapeHtml(this._quickLogScratch.mood)}" />
          </label>
          <label>${this._t('notes')}
            <textarea name="note" rows="2">${escapeHtml(this._quickLogScratch.note)}</textarea>
          </label>
          <button type="submit" ${this._pending ? 'disabled' : ''}>${this._pending ? this._t('saving') : this._t('save')}</button>
          <div class="helper">${discreetMode ? this._t('dashboard_discreet_note') : this._t('dashboard_quick_log_note')}</div>
        </form>
      `;
    }

    _renderTodayCard(stateObj, discreetMode) {
      const attrs = stateObj?.attributes || {};
      const state = String(stateObj?.state || this._t('unknown'));
      const cycleDay = attrs.cycle_day ?? this._t('unknown');
      return `
        <div class="kv"><span>${this._t('dashboard_label_state')}</span><strong>${escapeHtml(discreetMode ? this._t('dashboard_neutral_state') : state)}</strong></div>
        <div class="kv"><span>${this._t('cycle_day')}</span><strong>${escapeHtml(cycleDay)}</strong></div>
        <div class="kv"><span>${this._t('dashboard_days_until_next')}</span><strong>${escapeHtml(attrs.days_until_next_start ?? attrs.days_until_menarche ?? this._t('unknown'))}</strong></div>
      `;
    }

    _renderUpcomingCard(stateObj) {
      const attrs = stateObj?.attributes || {};
      const forecast = attrs.period_forecast || {};
      const start = forecast.window_start || attrs.next_predicted_start || this._t('unknown');
      const end = forecast.window_end || this._t('unknown');
      const confidence = forecast.confidence || attrs.prediction_gating?.confidence || this._t('unknown');
      return `
        <div class="kv"><span>${this._t('period_forecast_window')}</span><strong>${escapeHtml(start)} → ${escapeHtml(end)}</strong></div>
        <div class="kv"><span>${this._t('period_forecast_confidence')}</span><strong>${escapeHtml(confidence)}</strong></div>
      `;
    }

    _renderRemindersCard() {
      return `
        <div class="helper">${this._t('dashboard_reminders_hint')}</div>
        <ul>
          <li>${this._t('ygs_rem_kit_check')}</li>
          <li>${this._t('ygs_rem_drink_water')}</li>
          <li>${this._t('ygs_rem_rest_cue')}</li>
        </ul>
      `;
    }

    _renderProgressCard(stateObj) {
      const raw = Array.isArray(stateObj?.attributes?.progress_badges) ? stateObj.attributes.progress_badges : [];
      const badges = raw.filter((item) => item && typeof item === 'object').map(_normalizeItem);
      if (!badges.length) return `<div class="helper">${this._t('progress_empty_state')}</div>`;
      const badgeRows = badges.slice(-4).reverse().map((item) => {
        const label = escapeHtml(item.title || this._t('progress_section_title'));
        return item.url
          ? `<li><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${label}</a></li>`
          : `<li>${label}</li>`;
      }).join('');
      return `<ul>${badgeRows}</ul>`;
    }

    _renderMyInfoCard(stateObj) {
      const attrs = stateObj?.attributes || {};
      const displayName = this._prefs?.myInfo?.displayName || attrs.friendly_name || attrs.profile || this._t('unknown');
      const pronouns = this._prefs?.myInfo?.pronouns || this._t('dashboard_not_set');
      const phase = attrs.current_phase ?? stateObj?.state ?? null;
      const stage = String(attrs.onboarding_stage_effective || attrs.onboarding_stage || '').toLowerCase();
      const isMenarche = stage === 'pre_menarche' || stage === 'early_menarche';
      return `
        <div class="kv"><span>${this._t('friendly_name')}</span><strong>${escapeHtml(displayName)}</strong></div>
        <div class="kv"><span>${this._t('dashboard_pronouns')}</span><strong>${escapeHtml(pronouns)}</strong></div>
        ${phase ? `<div class="kv"><span>${this._t('dashboard_label_state')}</span><strong>${escapeHtml(phase)}</strong></div>` : ''}
        ${isMenarche ? `<div class="kv"><span>${this._t('onboarding_stage')}</span><strong>${escapeHtml(stage)}</strong></div>` : ''}
      `;
    }

    _renderTrendChips(stateObj) {
      const attrs = stateObj?.attributes || {};
      const cycleDay = attrs.cycle_day ?? null;
      const cycleLengthAvg = attrs.average_cycle_length ?? attrs.cycle_length_avg ?? null;
      const forecast = attrs.period_forecast || {};
      const confidence = forecast.confidence ?? attrs.prediction_gating?.confidence ?? null;
      const windowStart = forecast.window_start ?? attrs.next_predicted_start ?? null;

      const chips = [];

      if (cycleDay !== null && cycleDay !== undefined) {
        const progress = cycleLengthAvg && Number(cycleLengthAvg) > 0
          ? Math.min(100, Math.round((Number(cycleDay) / Number(cycleLengthAvg)) * 100))
          : null;
        const progressBar = progress !== null
          ? `<span class="trend-chip__bar" style="--p:${progress}%"></span>`
          : '';
        chips.push(`<div class="trend-chip">${this._t('cycle_day')} <strong>${escapeHtml(cycleDay)}</strong>${progressBar}</div>`);
      }

      if (confidence !== null && confidence !== undefined) {
        chips.push(`<div class="trend-chip">${this._t('period_forecast_confidence')} <strong>${escapeHtml(confidence)}</strong></div>`);
      }

      if (windowStart !== null && windowStart !== undefined) {
        chips.push(`<div class="trend-chip">${this._t('period_forecast_window')} <strong>${escapeHtml(windowStart)}</strong></div>`);
      }

      if (!chips.length) return '';
      return `<div class="trend-chips" aria-label="Cycle summary">${chips.join('')}</div>`;
    }

    _renderGaugeCard(stateObj) {
      if (!this._selectedEntityId) {
        return `<div class="helper">${this._t('dashboard_no_entity_selected')}</div>`;
      }
      const tagName = 'menstruation-gauge-card';
      if (typeof customElements !== 'undefined' && customElements.get(tagName)) {
        const entityId = escapeHtml(this._selectedEntityId);
        return `<${tagName} entity-id="${entityId}"></${tagName}>`;
      }
      // Native fallback: render a simple arc gauge using the cycle-day progress
      const attrs = stateObj?.attributes || {};
      const cycleDay = Number(attrs.cycle_day ?? 0) || 0;
      const cycleLength = Number(attrs.average_cycle_length ?? attrs.cycle_length_avg ?? 28) || 28;
      const progress = Math.min(1, Math.max(0, cycleDay / cycleLength));
      const phase = attrs.current_phase ?? stateObj?.state ?? '';

      const R = 54;
      const cx = 70;
      const cy = 70;
      const circumference = Math.PI * R; // half-circle arc length
      const arcOffset = circumference * (1 - progress);
      const phaseColors = {
        menstrual: '#E8637D', follicular: '#7C9885', ovulation: '#3F5A47', luteal: '#6B3654',
      };
      const phaseLower = String(phase).toLowerCase();
      let color = '#C43F5E';
      for (const [key, val] of Object.entries(phaseColors)) {
        if (phaseLower.includes(key)) { color = val; break; }
      }

      return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:4px 0;">
          <svg viewBox="0 0 140 80" width="140" height="80" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <path d="M16,70 A54,54 0 0,1 124,70" fill="none" stroke="var(--divider-color,#e5e7eb)" stroke-width="10" stroke-linecap="round"/>
            <path d="M16,70 A54,54 0 0,1 124,70" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"
              stroke-dasharray="${circumference}" stroke-dashoffset="${Math.round(arcOffset * 10) / 10}" style="transition:stroke-dashoffset 0.4s;"/>
            <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="20" font-weight="700" fill="var(--primary-text-color,#1f2937)">${cycleDay}</text>
            <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="9" fill="var(--secondary-text-color,#6b7280)">${escapeHtml(this._t('cycle_day'))}</text>
          </svg>
          ${phase ? `<div class="helper" style="text-align:center">${escapeHtml(phase)}</div>` : ''}
        </div>
      `;
    }

    // Real bundled product illustrations from assets/period/, served via the same
    // existing HTTP route already used for the pregnancy silhouettes
    // (/menstruation_cycle/assets/{subfolder}/{filename}). Prefers the shared
    // window.ProductIcons helper (menstruation-functions.js, already used by the gauge/
    // calendar cards) since it renders the icon as a CSS mask tinted to currentColor
    // — matches the app's theme/dark-mode automatically, unlike a plain <img> which
    // shows the SVG's own fixed colors.
    _productIconSvg(key) {
      if (typeof window !== 'undefined' && window.ProductIcons?.getIconWithSize) {
        const html = window.ProductIcons.getIconWithSize(key, 22);
        if (html) return html;
      }
      const files = {
        pad: 'pad.svg',
        tampon: 'tampon.svg',
        cup: 'menstrual_cup.svg',
        liner: 'pantyliner.svg',
        underwear: 'period_panty.svg',
      };
      const file = files[key];
      if (!file) return '';
      return `<img src="/menstruation_cycle/assets/period/${file}" width="22" height="22"
                   alt="${escapeHtml(this._t('opt_' + key) !== ('opt_' + key) ? this._t('opt_' + key) : this._t(key))}"
                   style="display:block;" loading="lazy" onerror="this.style.display='none';"/>`;
    }

    _renderProductUsage(stateObj) {
      const attrs = stateObj?.attributes || {};
      const today = attrs.product_usage_today || {};
      const thisCycle = attrs.product_usage_this_cycle || {};
      const stats = attrs.product_usage_stats && typeof attrs.product_usage_stats === 'object' ? attrs.product_usage_stats : {};
      const averagePerCycle = stats.average_per_cycle || {};

      // Household inventory lives on its own, profile-independent entity, set up by
      // the household-inventory feature (fixed entity id, not per selected profile).
      const inventoryState = this._hass?.states?.['sensor.household_product_stock'];
      const inventory = inventoryState?.attributes?.inventory || null;
      const thresholds = inventoryState?.attributes?.thresholds || {};

      const products = ['tampon', 'pad', 'cup', 'liner', 'underwear'];
      const rows = products.map((key) => {
        const label = this._t('opt_' + key) !== ('opt_' + key) ? this._t('opt_' + key) : this._t(key);
        const t = Number(today[key] || 0);
        const c = Number(thisCycle[key] || 0);
        const a = averagePerCycle[key] !== undefined ? Number(averagePerCycle[key]) : null;

        let stockBadge = '';
        if (inventory && key in inventory) {
          const stock = Number(inventory[key] || 0);
          const th = thresholds[key] || {};
          const critical = Number(th.critical ?? 0);
          const warning = Number(th.warning ?? 0);
          let stockColor = 'var(--mc-sage)';
          if (stock <= critical) stockColor = 'var(--mc-rose-deep)';
          else if (stock <= warning) stockColor = 'var(--mc-amber)';
          stockBadge = `<span style="font-family:var(--mc-font-mono);font-size:11px;color:${stockColor};font-weight:600;white-space:nowrap;">${this._t('dashboard_stock') || 'Bestand'}: ${escapeHtml(stock)}</span>`;
        }

        return `
          <div style="display:flex;align-items:center;gap:14px;padding:12px 14px;border-radius:14px;background:var(--mc-sand);border:1px solid var(--divider-color,#e5e7eb);">
            <div style="color:var(--mc-rose-deep);flex:none;">${this._productIconSvg(key)}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:600;">${escapeHtml(label)}</div>
              <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:2px;font-family:var(--mc-font-mono);font-size:10.5px;color:var(--secondary-text-color,#6b7280);">
                <span>${this._t('dashboard_today_short') || 'Heute'}: ${t}</span>
                <span>${this._t('dashboard_this_cycle') || 'Zyklus'}: ${c}</span>
                ${a !== null ? `<span>${this._t('dashboard_avg_short') || 'Ø'}: ${a}</span>` : ''}
              </div>
            </div>
            ${stockBadge}
            <button type="button" data-action="log-product" data-product="${key}"
              aria-label="${(this._t('dashboard_product_add_one') || '{product} erfassen (+1)').replace('{product}', escapeHtml(label))}"
              style="width:28px;height:28px;border-radius:50%;border:1px solid var(--mc-rose-deep);background:var(--mc-rose-tint);font-size:15px;line-height:1;cursor:pointer;color:var(--mc-rose-deep);font-weight:700;flex:none;">+</button>
          </div>`;
      }).join('');

      const inventoryHint = inventory
        ? `<p class="helper" style="margin-top:10px;font-size:0.7rem;">${this._t('dashboard_stock_hint') || 'Bestand aus dem Haushalts-Inventar (gemeinsam für alle Profile).'}</p>`
        : '';
      const tapHint = `<p class="helper" style="margin-top:6px;font-size:0.68rem;">${this._t('dashboard_product_tap_hint') || '+ tippen, um den heutigen Verbrauch mit echter Stückzahl zu erfassen.'}</p>`;

      return `<div style="display:grid;gap:8px;">${rows}</div>${tapHint}${inventoryHint}`;
    }

    // Maps mount-point keys to the custom element tag they wait for, so the
    // placeholder can tell a genuinely-missing resource apart from one still loading.
    _mountKeyToTag(mountKey) {
      const map = {
        'calendar-card': 'menstruation-calendar-card',
        'heatmap-card': 'menstruation-cycle-heatmap-card',
        'support-card': 'menstruation-support-card',
        'inventory-card': 'menstruation-product-inventory-card',
        'timer-card': 'menstruation-countdown-timer',
        'statistics-card': 'menstruation-statistics-card',
      };
      return map[mountKey] || null;
    }

    _renderEmbeddedCardMount(mountKey) {
      const tag = this._mountKeyToTag(mountKey);
      const timedOut = tag && this._embeddedCardTimedOut.has(tag);
      const message = timedOut
        ? (this._t('dashboard_card_unavailable') || 'Karte nicht verfügbar — bitte prüfen, ob die Ressource in Home Assistant korrekt eingebunden ist (HACS neu laden, Browser-Cache leeren).')
        : (this._t('dashboard_calendar_loading') || 'Wird geladen …');
      return `<div class="calendar-card-mount" data-mount="${mountKey}">
        <div class="helper">${message}</div>
      </div>`;
    }

    _renderCalendarCard(stateObj) {
      if (!this._selectedEntityId) {
        return `<div class="helper">${this._t('dashboard_no_entity_selected')}</div>`;
      }
      const tagName = 'menstruation-calendar-card';
      if (typeof customElements !== 'undefined' && customElements.get(tagName)) {
        // Standard Lovelace-style card: needs `.hass` and `.setConfig()` assigned as
        // real JS properties (no HTML-attribute fallback). Rendered as an empty mount
        // point here; the real element is attached via DOM APIs in
        // _mountEmbeddedCards(), which runs after every innerHTML update.
        return this._renderEmbeddedCardMount('calendar-card');
      }
      // Deliberately no separate fallback calendar here. The real
      // menstruation-calendar-card opens a full symptom-logging dialog on tap; an
      // independent fallback grid would need different (and inevitably inconsistent)
      // tap behavior, which risks accidentally toggling a period start. Better to
      // show a clear loading state and let connectedCallback's whenDefined() watcher
      // re-render automatically once the real card's resource finishes loading.
      return `<div class="helper">${this._t('dashboard_calendar_loading') || 'Kalender wird geladen …'}</div>`;
    }

    _renderStatisticsCard(stateObj) {
      const attrs = stateObj?.attributes || {};
      const allStarts = Array.isArray(attrs.grouped_starts) ? attrs.grouped_starts.slice().sort() : [];
      const cycleLengths = [];
      for (let i = 1; i < allStarts.length; i++) {
        const len = Math.round((new Date(allStarts[i]) - new Date(allStarts[i - 1])) / 86400000);
        if (len > 10 && len < 80) cycleLengths.push(len);
      }
      const avgLen = attrs.avg_cycle_length ?? attrs.average_cycle_length ?? attrs.cycle_length_avg ?? null;
      const computedAvg = cycleLengths.length
        ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length * 10) / 10
        : null;
      const avg = avgLen !== null ? Number(avgLen) : computedAvg;
      const minLen = cycleLengths.length ? Math.min(...cycleLengths) : null;
      const maxLen = cycleLengths.length ? Math.max(...cycleLengths) : null;
      const stdDev = cycleLengths.length >= 2
        ? (() => {
            const m = avg;
            const variance = cycleLengths.reduce((a, b) => a + Math.pow(b - m, 2), 0) / cycleLengths.length;
            return Math.round(Math.sqrt(variance) * 10) / 10;
          })()
        : null;

      if (avg === null && cycleLengths.length === 0) {
        return `<div class="helper">${this._t('dashboard_not_enough_data')}</div>`;
      }

      const statItems = [];
      if (avg !== null) statItems.push({ icon: '📊', label: this._t('dashboard_cycle_history_avg'), value: `${avg}d` });
      if (minLen !== null) statItems.push({ icon: '↓', label: 'Min', value: `${minLen}d` });
      if (maxLen !== null) statItems.push({ icon: '↑', label: 'Max', value: `${maxLen}d` });
      if (stdDev !== null) statItems.push({ icon: '±', label: 'Std dev', value: `${stdDev}d` });
      if (cycleLengths.length > 0) statItems.push({ icon: '#', label: 'Cycles', value: String(cycleLengths.length) });

      return `<div class="stats-grid">${statItems.map((item) => `
        <div class="stat-tile">
          <span class="stat-icon" aria-hidden="true">${item.icon}</span>
          <span class="stat-value">${escapeHtml(item.value)}</span>
          <span class="stat-label">${escapeHtml(item.label)}</span>
        </div>
      `).join('')}</div>`;
    }

    _renderCycleHistoryGraph(stateObj) {
      const attrs = stateObj?.attributes || {};
      const allStarts = Array.isArray(attrs.grouped_starts) ? attrs.grouped_starts.slice().sort() : [];
      const cycleLengths = [];
      for (let i = 1; i < allStarts.length; i++) {
        const len = Math.round((new Date(allStarts[i]) - new Date(allStarts[i - 1])) / 86400000);
        if (len > 10 && len < 80) cycleLengths.push({ len, start: allStarts[i - 1] });
      }

      if (cycleLengths.length === 0) {
        return `<div class="helper">${this._t('dashboard_not_enough_data')}</div>`;
      }

      const recent = cycleLengths.slice(-12);
      // Prefer the backend's own cycle_statistics (computed with a wider window and
      // consistent regularity math shared with anomaly detection) over local
      // recomputation. Falls back to local values only if the attribute is missing.
      const cycleStats = attrs.cycle_statistics && typeof attrs.cycle_statistics === 'object' ? attrs.cycle_statistics : null;
      const avgLen = cycleStats?.average_cycle_length ?? attrs.avg_cycle_length ?? attrs.average_cycle_length ?? attrs.cycle_length_avg ?? null;
      const avg = avgLen !== null
        ? Number(avgLen)
        : Math.round(recent.reduce((a, b) => a + b.len, 0) / recent.length * 10) / 10;

      const W = 560;
      const H = 200;
      const padLeft = 36;
      const padRight = 14;
      const padTop = 16;
      const padBottom = 32;
      const chartW = W - padLeft - padRight;
      const chartH = H - padTop - padBottom;

      const allLens = recent.map((c) => c.len);
      const minY = Math.max(0, Math.min(...allLens) - 3);
      const maxY = Math.max(...allLens) + 3;
      const yRange = maxY - minY || 1;

      // Prefer the backend's own cycle_statistics for min/max/regularity/count too,
      // for internal consistency with the average line above.
      const minLen = cycleStats?.min_cycle_length ?? Math.min(...allLens);
      const maxLen = cycleStats?.max_cycle_length ?? Math.max(...allLens);
      const regularityPercent = cycleStats?.cycle_regularity_percent ?? null;
      const cyclesAnalyzed = cycleStats?.cycles_analyzed ?? allLens.length;
      const statStrip = `
        <div class="kpi-strip" style="margin-bottom:10px;">
          <div class="kpi-item"><span class="kpi-icon" aria-hidden="true">↓</span><span class="kpi-value">${minLen}d</span><span class="kpi-label">Min</span></div>
          <div class="kpi-item"><span class="kpi-icon" aria-hidden="true">↑</span><span class="kpi-value">${maxLen}d</span><span class="kpi-label">Max</span></div>
          ${regularityPercent !== null ? `<div class="kpi-item"><span class="kpi-icon" aria-hidden="true">%</span><span class="kpi-value">${regularityPercent}%</span><span class="kpi-label">${this._t('dashboard_anomaly_consistency')}</span></div>` : ''}
          <div class="kpi-item"><span class="kpi-icon" aria-hidden="true">#</span><span class="kpi-value">${cyclesAnalyzed}</span><span class="kpi-label">${this._t('dashboard_widget_cycle_history')}</span></div>
        </div>`;

      const barW = Math.max(4, Math.floor((chartW / recent.length) * 0.56));
      const slotW = chartW / recent.length;

      const avgX1 = padLeft;
      const avgX2 = W - padRight;
      const avgYPos = padTop + chartH - ((avg - minY) / yRange) * chartH;

      // Horizontal gridlines at 3 evenly-spaced, rounded values — matching the
      // mockup's reference gridlines (26/28/30), computed dynamically from the
      // real data range instead of a fixed static example.
      const gridValues = [minY, Math.round((minY + maxY) / 2), maxY];
      const gridLines = gridValues.map((v) => {
        const yPos = padTop + chartH - ((v - minY) / yRange) * chartH;
        return `<line x1="${padLeft}" x2="${W - padRight}" y1="${Math.round(yPos)}" y2="${Math.round(yPos)}" stroke="var(--divider-color,#e5e7eb)" stroke-width="1"/>
                <text x="4" y="${Math.round(yPos + 4)}" font-size="10" font-family="IBM Plex Mono, monospace" fill="var(--secondary-text-color,#9ca3af)">${v}</text>`;
      }).join('');

      const outlierThreshold = 8;
      const bars = recent.map((c, idx) => {
        const slotX = padLeft + idx * slotW;
        const x = slotX + (slotW - barW) / 2;
        const barH2 = Math.max(3, ((c.len - minY) / yRange) * chartH);
        const y = padTop + chartH - barH2;
        const isOutlier = avg !== null && Math.abs(c.len - avg) > outlierThreshold;
        const fill = isOutlier ? 'var(--mc-amber)' : 'var(--mc-sage,#7C9885)';
        const label = String(c.len);
        const cx = slotX + slotW / 2;
        return `<rect x="${Math.round(x)}" y="${Math.round(y)}" width="${Math.round(barW)}" height="${Math.round(barH2)}" fill="${fill}" opacity="0.85" rx="5"/>
                <text x="${Math.round(cx)}" y="${Math.round(y - 6)}" text-anchor="middle" font-size="10" fill="var(--secondary-text-color,#6b7280)">${escapeHtml(label)}</text>
                <text x="${Math.round(cx)}" y="${H - 10}" text-anchor="middle" font-size="9" font-family="IBM Plex Mono, monospace" fill="var(--secondary-text-color,#9ca3af)">Z${idx + 1}</text>`;
      }).join('');

      const avgLine = avg !== null
        ? `<line x1="${avgX1}" y1="${Math.round(avgYPos)}" x2="${avgX2}" y2="${Math.round(avgYPos)}" stroke="var(--mc-plum,#6B3654)" stroke-width="1.5" stroke-dasharray="5 4"/>
           <text x="${avgX2 - 2}" y="${Math.round(avgYPos - 5)}" text-anchor="end" font-size="10" font-family="IBM Plex Mono, monospace" fill="var(--mc-plum,#6B3654)">${this._t('dashboard_cycle_history_avg')}: ${avg}d</text>`
        : '';

      const titleText = `${this._t('dashboard_widget_cycle_history')} — ${this._t('dashboard_cycle_history_length')}`;

      return `
        <div class="cycle-history-wrap" role="img" aria-label="${escapeHtml(titleText)}">
          ${statStrip}
          <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="overflow:visible;display:block;">
            <title>${escapeHtml(titleText)}</title>
            ${gridLines}
            ${bars}
            ${avgLine}
          </svg>
          <div class="cycle-history-legend">
            <span class="legend-dot" style="background:var(--mc-sage,#7C9885)"></span><span>${this._t('dashboard_cycle_history_length')}</span>
            <span class="legend-dot" style="background:var(--mc-amber)"></span><span>${this._t('dashboard_cycle_history_outlier')}</span>
            <span class="legend-dash" style="background:var(--mc-plum,#6B3654)"></span><span>${this._t('dashboard_cycle_history_avg')}</span>
          </div>
        </div>
      `;
    }

    _renderPregnancyPredictionGraph(stateObj) {
      const mode = this._resolveContentMode(stateObj);
      if (mode !== 'cycle') return `<div class="helper">${this._t('dashboard_not_enough_data')}</div>`;

      const attrs = stateObj?.attributes || {};
      const ff = attrs.fertility_forecast && typeof attrs.fertility_forecast === 'object' ? attrs.fertility_forecast : null;
      const cycleDay = Number(attrs.cycle_day ?? 0) || 0;
      const cycleLength = Number(attrs.avg_cycle_length ?? attrs.average_cycle_length ?? attrs.cycle_length_avg ?? 28) || 28;

      if (!ff && !cycleLength) {
        return `<div class="helper">${this._t('dashboard_not_enough_data')}</div>`;
      }

      let ovulationDay = null;
      if (ff?.ovulation_estimate && attrs.cycle_start_date) {
        const diff = Math.round((new Date(ff.ovulation_estimate) - new Date(attrs.cycle_start_date)) / 86400000) + 1;
        if (diff > 0 && diff <= cycleLength) ovulationDay = diff;
      }
      if (ovulationDay === null && attrs.ovulation_day) ovulationDay = Number(attrs.ovulation_day);
      if (ovulationDay === null) ovulationDay = Math.round(cycleLength * 0.536);

      const W = 480, H = 220, padL = 38, padR = 14, padT = 18, padB = 30;
      const chartW = W - padL - padR, chartH = H - padT - padB;
      const sigma = 2.2;

      const points = [];
      for (let d = 1; d <= cycleLength; d++) {
        const gauss = Math.exp(-0.5 * Math.pow((d - ovulationDay) / sigma, 2));
        const prob = Math.round(gauss * 30 * 10) / 10; // peak ~30% at ovulation day
        points.push({ d, prob });
      }
      const maxAxis = 32;
      const x = (d) => padL + (d - 1) / (cycleLength - 1 || 1) * chartW;
      const y = (v) => padT + (maxAxis - v) / maxAxis * chartH;

      const gridLines = [0, 10, 20, 30].map((v) =>
        `<line x1="${padL}" x2="${W - padR}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="var(--divider-color,#e5e7eb)" stroke-width="1"/>
         <text x="4" y="${(y(v) + 3).toFixed(1)}" font-size="9" font-family="IBM Plex Mono, monospace" fill="var(--secondary-text-color,#9ca3af)">${v}%</text>`
      ).join('');

      let areaD = `M${x(1).toFixed(1)},${y(0).toFixed(1)} `;
      points.forEach((p) => { areaD += `L${x(p.d).toFixed(1)},${y(p.prob).toFixed(1)} `; });
      areaD += `L${x(cycleLength).toFixed(1)},${y(0).toFixed(1)} Z`;

      let lineD = `M${x(1).toFixed(1)},${y(points[0].prob).toFixed(1)} `;
      points.forEach((p, i) => { if (i > 0) lineD += `L${x(p.d).toFixed(1)},${y(p.prob).toFixed(1)} `; });

      const todayD = cycleDay > 0 ? Math.min(cycleDay, cycleLength) : null;
      const todayMarker = todayD
        ? (() => {
            const pt = points[todayD - 1];
            return `<line x1="${x(todayD).toFixed(1)}" x2="${x(todayD).toFixed(1)}" y1="${padT}" y2="${H - padB}" stroke="var(--primary-text-color,#2B1B24)" stroke-width="1.2" stroke-dasharray="3 3"/>
                    <circle cx="${x(todayD).toFixed(1)}" cy="${y(pt.prob).toFixed(1)}" r="5" fill="var(--primary-text-color,#2B1B24)"/>
                    <text x="${(x(todayD) + 8).toFixed(1)}" y="${(y(pt.prob) - 8).toFixed(1)}" font-size="11" font-family="IBM Plex Mono, monospace" font-weight="600" fill="var(--primary-text-color,#2B1B24)">${this._t('dashboard_today')}: ~${pt.prob}%</text>`;
          })()
        : '';

      const xLabels = [1, Math.round(cycleLength * 0.25), Math.round(cycleLength * 0.5), Math.round(cycleLength * 0.75), cycleLength]
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .map((d) => `<text x="${x(d).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="9" font-family="IBM Plex Mono, monospace" fill="var(--secondary-text-color,#9ca3af)">${this._t('cycle_day')} ${d}</text>`)
        .join('');

      const confidence = ff?.window_confidence ?? ff?.confidence ?? attrs.prediction_gating?.confidence ?? null;
      const confBadge = confidence
        ? `<span class="pred-badge">${this._t('dashboard_fertility_confidence')}: <strong>${escapeHtml(confidence)}</strong></span>`
        : '';
      const disclaimer = `<p class="helper pred-disclaimer">${this._t('dashboard_prediction_disclaimer')}</p>`;

      const titleText = this._t('dashboard_widget_pregnancy_prediction');

      return `
        <div class="pred-wrap" role="img" aria-label="${escapeHtml(titleText)}">
          <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="overflow:visible;display:block;">
            <title>${escapeHtml(titleText)}</title>
            ${gridLines}
            <path d="${areaD}" fill="var(--mc-rose-deep,#C43F5E)" opacity="0.18"/>
            <path d="${lineD}" fill="none" stroke="var(--mc-rose-deep,#C43F5E)" stroke-width="2.2" stroke-linejoin="round"/>
            ${todayMarker}
            ${xLabels}
          </svg>
          <div class="pred-meta">${confBadge}</div>
          ${disclaimer}
        </div>
      `;
    }

    /* ============ MODE DETECTION ============ */
    _resolveContentMode(stateObj) {
      const attrs = stateObj?.attributes || {};
      const state = stateObj?.state;
      if (attrs.is_pregnant || state === 'pregnant') return 'pregnancy';
      if (attrs.is_postpartum || state === 'postpartum') return 'postpartum';
      if ((attrs.menopause_data || {}).is_menopause || state === 'menopause') return 'menopause';
      const stage = attrs.onboarding_stage_effective || attrs.onboarding_stage;
      if (stage === 'pre_menarche' || state === 'pre_menarche') return 'menarche';
      return 'cycle';
    }

    /* ============ HERO (wheel + kpi tiles), auto-switches by mode ============ */
    _renderHeroWheel(stateObj, discreetMode) {
      const mode = this._resolveContentMode(stateObj);
      if (mode === 'pregnancy') return this._renderPregnancyHero(stateObj, discreetMode);
      if (mode === 'menarche') return this._renderMenarcheHero(stateObj, discreetMode);
      if (mode === 'menopause') return this._renderMenopauseHero(stateObj, discreetMode);
      if (mode === 'postpartum') return this._renderPostpartumHero(stateObj, discreetMode);
      return this._renderCycleHero(stateObj, discreetMode);
    }

    // Small status illustration from assets/state/ (period/fertile/pms/neutral/
    // pregnant/pre_menarche/menarche/menopause), via the shared window.ProductIcons
    // helper. Returns '' if the module isn't loaded yet or the state has no asset —
    // callers should treat this as a nice-to-have, not a required element. Pass attrs
    // for the 'pregnant' state so the icon reflects the real week instead of
    // defaulting to month 1.
    _statusIconHtml(stateKey, size = 32, attrs = null) {
      if (typeof window === 'undefined' || !window.ProductIcons) return '';
      try {
        if (attrs && window.ProductIcons.getStatusAnimatedIcon) {
          return window.ProductIcons.getStatusAnimatedIcon(stateKey, attrs, size) || '';
        }
        return window.ProductIcons.getStatusIcon?.(stateKey, size) || '';
      } catch (_err) {
        return '';
      }
    }

    _renderCycleHero(stateObj, discreetMode) {
      const attrs = stateObj?.attributes || {};
      const cycleDay = Number(attrs.cycle_day ?? 0) || 0;
      const cycleLength = Number(attrs.avg_cycle_length ?? attrs.average_cycle_length ?? attrs.cycle_length_avg ?? 28) || 28;
      const phase = discreetMode ? null : (attrs.current_phase ?? stateObj?.state ?? null);
      const forecast = attrs.period_forecast || {};
      const daysUntil = attrs.days_until_next_start ?? forecast.days_until ?? null;
      const fertility = attrs.fertility_forecast || {};
      const ovulationEst = fertility.ovulation_estimate ?? attrs.ovulation_day ?? null;
      const cycleStats = attrs.cycle_statistics && typeof attrs.cycle_statistics === 'object' ? attrs.cycle_statistics : null;
      const nfpAnalysis = attrs.nfp_analysis && typeof attrs.nfp_analysis === 'object' ? attrs.nfp_analysis : null;

      const cx = 100, cy = 100, r = 82, sw = 15;
      const circumference = 2 * Math.PI * r;
      const phases = [
        { from: 0, to: 0.179, color: '#E8637D' },
        { from: 0.179, to: 0.464, color: '#7C9885' },
        { from: 0.464, to: 0.536, color: '#3F5A47' },
        { from: 0.536, to: 1, color: '#6B3654' },
      ];
      const ringSegs = phases.map((p) => {
        const len = (p.to - p.from) * circumference;
        const gap = circumference - len;
        const offset = -(p.from) * circumference;
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${p.color}" stroke-width="${sw}" stroke-dasharray="${len} ${gap}" stroke-dashoffset="${offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
      }).join('');
      const todayFrac = cycleLength > 0 ? Math.min(1, Math.max(0, (cycleDay - 1) / cycleLength)) : 0;
      const a = todayFrac * 2 * Math.PI - Math.PI / 2;
      const mx = cx + r * Math.cos(a), my = cy + r * Math.sin(a);
      const marker = `<circle cx="${mx}" cy="${my}" r="7" fill="var(--card-background-color,#fff)" stroke="var(--primary-text-color,#2B1B24)" stroke-width="2"/><circle cx="${mx}" cy="${my}" r="2.6" fill="var(--primary-text-color,#2B1B24)"/>`;

      const wheelSvg = `
        <svg viewBox="0 0 200 200" width="100%" style="max-width:280px;height:auto;display:block;" role="img" aria-label="${this._t('cycle_day')} ${escapeHtml(cycleDay)} / ${escapeHtml(cycleLength)}">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--divider-color,#e5e7eb)" stroke-width="${sw}"/>
          ${ringSegs}
          ${marker}
        </svg>`;

      // Status icon lives as a small corner badge on the wheel, not inside the
      // center content — squeezing it in above the day number made the number
      // itself cramped/too small. Shown small by default (still visible at a
      // glance), grows on hover for anyone using a mouse; native title attribute
      // gives a text fallback for touch/screen readers where hover doesn't apply.
      const statusIcon = !discreetMode ? this._statusIconHtml(stateObj?.state, 60) : '';
      const statusBadge = statusIcon
        ? `<div class="hero-status-badge" title="${escapeHtml(phase || stateObj?.state || '')}">${statusIcon}</div>`
        : '';

      const centerHtml = `
        <div class="hero-wheel-center">
          <div class="hw-num">${cycleDay || '—'}</div>
          <div class="hw-sub">${this._t('cycle_day').toUpperCase()} / ${escapeHtml(cycleLength)}</div>
          ${!discreetMode && phase ? `<div class="hw-tag">${escapeHtml(phase)}</div>` : ''}
        </div>`;

      // current_bleeding_block: lifecycle-aware detail for the *active* period
      // (days_elapsed / effective_duration), distinct from the overall cycle_day.
      const bleedingBlock = attrs.current_bleeding_block && typeof attrs.current_bleeding_block === 'object'
        ? attrs.current_bleeding_block : null;
      const periodDayNote = (!discreetMode && bleedingBlock && bleedingBlock.is_active)
        ? `<p class="helper" style="margin-top:10px;font-size:0.72rem;">🩸 ${this._t('dashboard_period_day_label') || 'Periode'}: ${this._t('cycle_day')} ${escapeHtml(bleedingBlock.days_elapsed)} / ${escapeHtml(bleedingBlock.effective_duration)}</p>`
        : '';

      // --- Stat 1 (rose): next period ---
      const windowStart = forecast.window_start ?? attrs.next_predicted_start ?? null;
      const windowEnd = forecast.window_end ?? null;
      const nextPeriodFoot = windowStart
        ? `${this._t('dashboard_expected') || 'erwartet'} ${escapeHtml(this._formatDate(windowStart))}${windowEnd && windowEnd !== windowStart ? ` – ${escapeHtml(this._formatDate(windowEnd))}` : ''}`
        : '';
      const stat1 = `
        <div class="stat mc-rose">
          <div class="stat-label">${this._t('dashboard_next_period') || 'Nächste Periode'}</div>
          <div class="stat-value">${daysUntil !== null && daysUntil !== undefined ? escapeHtml(daysUntil) : '—'} <small>${this._t('days') || 'Tage'}</small></div>
          ${nextPeriodFoot ? `<div class="stat-foot">${nextPeriodFoot}</div>` : ''}
        </div>`;

      // --- Stat 2 (plain): ovulation estimate, phrased relatively ---
      let stat2 = '';
      if (!discreetMode) {
        let ovValue = '—';
        let ovFoot = '';
        if (ovulationEst) {
          const ovDate = new Date(ovulationEst);
          const today = new Date(this._todayIso());
          if (!Number.isNaN(ovDate.getTime())) {
            const diffDays = Math.round((ovDate - today) / 86400000);
            if (diffDays === 0) ovValue = this._t('dashboard_today') || 'Heute';
            else if (diffDays > 0) ovValue = `${this._t('dashboard_in_days_prefix') || 'in'} ${diffDays} <small>${this._t('days') || 'Tage'}</small>`;
            else ovValue = `${this._t('dashboard_days_ago_prefix') || 'vor'} ${Math.abs(diffDays)} <small>${this._t('days') || 'Tage'}</small>`;
          }
          ovFoot = nfpAnalysis?.temperature_rise_detected
            ? (this._t('dashboard_ovulation_temp_confirmed') || 'Temperaturanstieg bestätigt')
            : (this._t('dashboard_ovulation_calendar_based') || 'berechnet nach Kalendermethode');
        }
        stat2 = `
          <div class="stat">
            <div class="stat-label">${this._t('dashboard_fertility_ovulation')}</div>
            <div class="stat-value">${ovValue}</div>
            ${ovFoot ? `<div class="stat-foot">${ovFoot}</div>` : ''}
          </div>`;
      }

      // --- Stat 3 (plum): cycle variability, computed from real recent-cycle
      // lengths (same data source as the cycle-length chart / anomaly card) ---
      let stat3 = '';
      const recentCycles = Array.isArray(cycleStats?.recent_cycles)
        ? cycleStats.recent_cycles.filter((c) => c && c.end && Number.isFinite(c.length))
        : [];
      if (recentCycles.length >= 2) {
        const lens = recentCycles.map((c) => c.length);
        const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
        const variance = lens.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / lens.length;
        const stdDev = Math.round(Math.sqrt(variance) * 10) / 10;
        const regularity = cycleStats?.cycle_regularity_percent;
        let regularityLabel = '';
        if (regularity !== undefined && regularity !== null) {
          regularityLabel = regularity >= 85
            ? (this._t('dashboard_regularity_high') || 'sehr regelmäßig')
            : regularity >= 60
              ? (this._t('dashboard_regularity_medium') || 'regelmäßig')
              : (this._t('dashboard_regularity_low') || 'unregelmäßig');
        }
        stat3 = `
          <div class="stat mc-plum">
            <div class="stat-label">${this._t('dashboard_cycle_variability') || 'Zyklusvariabilität'}</div>
            <div class="stat-value">± ${stdDev} <small>${this._t('days') || 'Tage'}</small></div>
            ${regularityLabel ? `<div class="stat-foot">${regularityLabel}</div>` : ''}
          </div>`;
      }

      // --- Confidence bars ---
      let confidenceBars = '';
      if (!discreetMode) {
        const bars = [];
        if (cycleStats?.cycle_regularity_percent !== undefined && cycleStats?.cycle_regularity_percent !== null) {
          const pct = Math.max(0, Math.min(100, Math.round(cycleStats.cycle_regularity_percent)));
          bars.push(`
            <div class="confidence-row">
              <div class="confidence-label-col">
                <div class="stat-label">${this._t('period_forecast_confidence') || 'Prognose-Konfidenz'}</div>
                <div class="stat-foot">${(this._t('dashboard_based_on_cycles') || 'basiert auf {n} Zyklen').replace('{n}', escapeHtml(cycleStats.cycles_analyzed ?? '—'))}</div>
              </div>
              <div class="confidence-bar"><span style="width:${pct}%;"></span></div>
              <div class="confidence-pct">${pct}%</div>
            </div>`);
        }
        if (nfpAnalysis?.confidence_level) {
          const tierPct = { high: 90, medium: 60, low: 30 }[String(nfpAnalysis.confidence_level).toLowerCase()] ?? 50;
          const levelLabel = this._t('opt_' + nfpAnalysis.confidence_level) !== ('opt_' + nfpAnalysis.confidence_level)
            ? this._t('opt_' + nfpAnalysis.confidence_level) : nfpAnalysis.confidence_level;
          bars.push(`
            <div class="confidence-row">
              <div class="confidence-label-col">
                <div class="stat-label">${this._t('nfp_analysis') || 'NFP-Konfidenz'}</div>
                <div class="stat-foot">${escapeHtml(levelLabel)}</div>
              </div>
              <div class="confidence-bar"><span style="width:${tierPct}%;"></span></div>
              <div class="confidence-pct">${tierPct}%</div>
            </div>`);
        }
        confidenceBars = bars.join('');
      }

      // learning_phase / prediction_gating: the backend explicitly flags when
      // predictions are still low-confidence (too little/irregular data yet) — worth
      // surfacing honestly, with the real numbers, rather than a generic disclaimer.
      const gating = attrs.prediction_gating && typeof attrs.prediction_gating === 'object' ? attrs.prediction_gating : null;
      let learningNote = '';
      if (attrs.learning_phase) {
        if (gating && gating.valid_cycles !== undefined && gating.thresholds?.min_valid_cycles !== undefined) {
          const tmpl = this._t('dashboard_learning_phase_progress') || 'Lernphase — {have} von {need} Zyklen für zuverlässigere Vorhersagen erfasst.';
          const msg = tmpl.replace('{have}', escapeHtml(gating.valid_cycles)).replace('{need}', escapeHtml(gating.thresholds.min_valid_cycles));
          learningNote = `<p class="helper" style="margin-top:4px;font-size:0.7rem;">📘 ${msg}</p>`;
        } else {
          learningNote = `<p class="helper" style="margin-top:4px;font-size:0.7rem;">📘 ${this._t('dashboard_learning_phase') || 'Lernphase — Vorhersagen sind noch grob, werden mit mehr erfassten Zyklen genauer.'}</p>`;
        }
      }

      return `
        <div class="hero-layout" role="region" aria-label="Cycle at a glance">
          <div class="hero-wheel-holder">${wheelSvg}${centerHtml}${statusBadge}</div>
          <div>
            <div class="stat-stack">${stat1}${stat2}${stat3}</div>
            ${confidenceBars}
          </div>
        </div>
        ${periodDayNote}
        ${learningNote}`;
    }

    _renderPregnancyHero(stateObj, discreetMode) {
      const attrs = stateObj?.attributes || {};
      const weeksPregnantRaw = Number(attrs.weeks_pregnant ?? 0) || 0;
      const weeks = Math.floor(weeksPregnantRaw);
      const days = Math.round((weeksPregnantRaw - weeks) * 7);
      const dueDate = attrs.due_date ?? (attrs.pregnancy_data || {}).due_date ?? null;
      let daysUntilDue = null;
      if (dueDate) {
        const due = new Date(dueDate);
        const today = new Date(this._todayIso());
        if (!Number.isNaN(due.getTime())) daysUntilDue = Math.round((due - today) / 86400000);
      }
      const trimester = weeksPregnantRaw < 13 ? 1 : (weeksPregnantRaw < 27 ? 2 : 3);
      const weekUnit = this._t('dashboard_week_unit');
      const isHighRisk = !!(attrs.pregnancy_high_risk ?? (attrs.pregnancy_data || {}).high_risk);
      const riskNotes = attrs.pregnancy_risk_notes ?? (attrs.pregnancy_data || {}).risk_notes ?? null;

      const cx = 100, cy = 100, r = 82, sw = 15;
      const circumference = 2 * Math.PI * r;
      const totalWeeks = 40;
      const trimesters = [
        { from: 0, to: 13, color: '#E8637D' },
        { from: 13, to: 27, color: '#7C9885' },
        { from: 27, to: 40, color: '#6B3654' },
      ];
      const ringSegs = trimesters.map((t) => {
        const len = (t.to - t.from) / totalWeeks * circumference;
        const gap = circumference - len;
        const offset = -(t.from / totalWeeks) * circumference;
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${t.color}" stroke-width="${sw}" stroke-dasharray="${len} ${gap}" stroke-dashoffset="${offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
      }).join('');
      const frac = Math.min(1, Math.max(0, weeksPregnantRaw / totalWeeks));
      const a = frac * 2 * Math.PI - Math.PI / 2;
      const mx = cx + r * Math.cos(a), my = cy + r * Math.sin(a);
      const marker = `<circle cx="${mx}" cy="${my}" r="7" fill="var(--card-background-color,#fff)" stroke="var(--primary-text-color,#2B1B24)" stroke-width="2"/><circle cx="${mx}" cy="${my}" r="2.6" fill="var(--primary-text-color,#2B1B24)"/>`;

      const wheelSvg = `
        <svg viewBox="0 0 200 200" width="100%" style="max-width:280px;height:auto;display:block;" role="img" aria-label="${escapeHtml(weekUnit)} ${escapeHtml(weeks)}+${escapeHtml(days)}">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--divider-color,#e5e7eb)" stroke-width="${sw}"/>
          ${ringSegs}
          ${marker}
        </svg>`;

      // Status icon lives as a small corner badge on the wheel, not inside the
      // center content — matching the cycle hero's fix (squeezing it in above the
      // week number made the number itself cramped/too small).
      const statusIcon = this._statusIconHtml('pregnant', 60, attrs);
      const statusBadge = statusIcon
        ? `<div class="hero-status-badge" title="${escapeHtml(this._t('trimester_' + trimester))}">${statusIcon}</div>`
        : '';

      const centerHtml = `
        <div class="hero-wheel-center">
          <div class="hw-num">${weeks}<span style="font-size:16px;">+${days}</span></div>
          <div class="hw-sub">${escapeHtml(weekUnit)}</div>
          <div class="hw-tag">${this._t('trimester_' + trimester)}</div>
        </div>`;

      // --- Stat 1 (rose): due date ---
      const stat1 = `
        <div class="stat mc-rose">
          <div class="stat-label">${this._t('dashboard_due_date_short') || 'Entbindungstermin'}</div>
          <div class="stat-value">${daysUntilDue !== null ? escapeHtml(daysUntilDue) : '—'} <small>${this._t('days') || 'Tage'}</small></div>
          ${dueDate ? `<div class="stat-foot">${escapeHtml(this._formatDate(dueDate))}</div>` : ''}
        </div>`;

      // --- Stat 2 (plain): trimester ---
      const trimesterWeekRanges = { 1: '1–13', 2: '14–27', 3: '28–40' };
      const stat2 = `
        <div class="stat">
          <div class="stat-label">${this._t('trimester_label') || 'Trimester'}</div>
          <div class="stat-value">${trimester} <small>/ 3</small></div>
          <div class="stat-foot">${this._t('dashboard_week_unit')} ${trimesterWeekRanges[trimester]}</div>
        </div>`;

      // --- Stat 3 (plum, or amber if high-risk) ---
      const stat3 = isHighRisk
        ? `
          <div class="stat" style="background:var(--mc-amber-tint,#FBEEDC);">
            <div class="stat-label" style="color:var(--mc-amber-deep,#8a5a12);">⚠ ${this._t('dashboard_high_risk_pregnancy') || 'Risikoschwangerschaft'}</div>
            <div class="stat-value" style="font-size:16px;color:var(--mc-amber-deep,#8a5a12);">${this._t('dashboard_high_risk_monitoring') || 'Engmaschigere Kontrolle empfohlen'}</div>
          </div>`
        : `
          <div class="stat mc-plum">
            <div class="stat-label">${this._t('dashboard_week_unit')}</div>
            <div class="stat-value">${weeks}<small>+${days}</small></div>
            <div class="stat-foot">${(this._t('dashboard_weeks_remaining') || 'noch {n} Wochen').replace('{n}', Math.max(0, totalWeeks - weeks))}</div>
          </div>`;

      return `
        <div class="hero-layout" role="region" aria-label="Pregnancy at a glance">
          <div class="hero-wheel-holder">${wheelSvg}${centerHtml}${statusBadge}</div>
          <div>
            <div class="stat-stack">${stat1}${stat2}${stat3}</div>
          </div>
        </div>
        ${isHighRisk && riskNotes ? `<p class="helper" style="margin-top:10px;font-size:0.72rem;"><strong>${this._t('pregnancy_risk_notes') || 'Notizen'}:</strong> ${escapeHtml(riskNotes)}</p>` : ''}`;
    }

    _renderMenarcheHero(stateObj, discreetMode) {
      const attrs = stateObj?.attributes || {};
      const preMenData = attrs.pre_menarche_data || {};
      const signs = preMenData.signs && typeof preMenData.signs === 'object' ? preMenData.signs : {};
      const signKeys = PRE_MENARCHE_SIGN_KEYS;
      const observedCount = signKeys.filter((k) => _normalizeSignEntry(signs[k]) !== null).length;

      const dynamic = _estimateMenarcheFromSigns(signs);
      const fallbackEstDate = attrs.estimated_menarche_date ?? (attrs.menarche_data || {}).estimated_date ?? null;
      const fallbackDaysUntil = attrs.days_until_menarche ?? null;
      // Weakest fallback: birth_date + population-typical menarche age (~12), only used
      // when nothing more specific (dated signs, family history) is available.
      let ageBasedEstimate = null;
      if (!dynamic && !fallbackEstDate && attrs.birth_date) {
        const born = new Date(attrs.birth_date);
        if (!Number.isNaN(born.getTime())) {
          const est = new Date(born);
          est.setFullYear(est.getFullYear() + 12);
          ageBasedEstimate = est;
        }
      }

      const today = new Date(this._todayIso());
      let estDateStr; let daysUntil; let pct; let sourceNote;

      if (dynamic) {
        estDateStr = dynamic.estimatedDate.toISOString().slice(0, 10);
        daysUntil = Math.round((dynamic.estimatedDate - today) / 86400000);
        const anchor = new Date(dynamic.anchorDate);
        const totalSpan = dynamic.estimatedDate - anchor;
        const elapsed = today - anchor;
        pct = totalSpan > 0 ? Math.round(Math.min(100, Math.max(0, (elapsed / totalSpan) * 100))) : 100;
        sourceNote = `${this._t('dashboard_menarche_estimate_from') || 'Schätzung basiert auf'}: ${this._t(dynamic.sourceSign) || dynamic.sourceSign}${dynamic.corroborated ? ` + ${this._t('acne') || 'Hautveränderungen'}` : ''}`;
      } else if (fallbackEstDate) {
        estDateStr = fallbackEstDate;
        daysUntil = fallbackDaysUntil;
        pct = Math.round((observedCount / signKeys.length) * 100);
        sourceNote = observedCount > 0
          ? (this._t('dashboard_menarche_estimate_generic') || 'Grobschätzung — Datum wird genauer, sobald Anzeichen mit Datum erfasst sind')
          : '';
      } else if (ageBasedEstimate) {
        estDateStr = ageBasedEstimate.toISOString().slice(0, 10);
        daysUntil = Math.round((ageBasedEstimate - today) / 86400000);
        pct = Math.round((observedCount / signKeys.length) * 100);
        sourceNote = this._t('dashboard_menarche_estimate_age') || 'Sehr grobe Schätzung anhand des Alters — wird genauer, sobald Anzeichen erfasst werden.';
      } else {
        estDateStr = null;
        daysUntil = null;
        pct = Math.round((observedCount / signKeys.length) * 100);
        sourceNote = '';
      }

      const statusIcon = !discreetMode ? this._statusIconHtml('pre_menarche', 32) : '';

      // --- Stat 1 (rose): days until estimated menarche ---
      const stat1 = `
        <div class="stat mc-rose">
          <div class="stat-label">${this._t('days_until_menarche')}</div>
          <div class="stat-value">${daysUntil !== null && daysUntil !== undefined ? escapeHtml(daysUntil) : '—'} <small>${this._t('days') || 'Tage'}</small></div>
          ${estDateStr ? `<div class="stat-foot">${escapeHtml(this._formatDate(estDateStr))}</div>` : ''}
        </div>`;

      // --- Stat 2 (plain): signs progress ---
      const stat2 = `
        <div class="stat">
          <div class="stat-label">${this._t('dashboard_widget_progress')}</div>
          <div class="stat-value">${observedCount}<small>/${signKeys.length}</small></div>
          <div class="stat-foot">${pct}%</div>
        </div>`;

      // --- Stat 3 (plum): age, falling back to family menarche age if the
      // person's own age isn't set, so the 3-tile grid stays balanced ---
      const familyAge = (attrs.menarche_data || {}).family_menarche_age ?? null;
      let stat3 = '';
      if (attrs.age_at_tracking !== null && attrs.age_at_tracking !== undefined) {
        stat3 = `
          <div class="stat mc-plum">
            <div class="stat-label">${this._t('dashboard_age_label') || 'Alter'}</div>
            <div class="stat-value">${escapeHtml(attrs.age_at_tracking)}</div>
          </div>`;
      } else if (familyAge !== null && familyAge !== undefined) {
        stat3 = `
          <div class="stat mc-plum">
            <div class="stat-label">${this._t('family_menarche_age') || 'Menarche-Alter Familie'}</div>
            <div class="stat-value">${escapeHtml(familyAge)}</div>
          </div>`;
      }

      return `
        <div>
          ${statusIcon ? `<div style="text-align:center;margin-bottom:10px;">${statusIcon}</div>` : ''}
          <div class="progress-holder">
            <div class="progress-track" style="position:relative;height:14px;border-radius:999px;background:var(--mc-sand);border:1px solid var(--divider-color,#e5e7eb);">
              <div style="position:absolute;top:0;left:0;bottom:0;width:${pct}%;border-radius:999px;background:linear-gradient(90deg, var(--mc-sage), var(--mc-rose));"></div>
              <div style="position:absolute;top:50%;left:${pct}%;width:14px;height:14px;border-radius:50%;background:var(--card-background-color,#fff);border:2.5px solid var(--primary-text-color,#2B1B24);transform:translate(-50%,-50%);"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:8px;font-family:var(--mc-font-mono);font-size:10px;color:var(--secondary-text-color,#6b7280);">
              <span>${observedCount} / ${signKeys.length} ${this._t('dashboard_widget_progress')}</span>
              <span>${daysUntil !== null && daysUntil !== undefined ? `${escapeHtml(daysUntil)} ${this._t('days_until_menarche')}` : (estDateStr ? escapeHtml(this._formatDate(estDateStr)) : '—')}</span>
            </div>
          </div>
          <div class="stat-stack" style="margin-top:16px;">${stat1}${stat2}${stat3}</div>
          ${attrs.age_at_tracking === null || attrs.age_at_tracking === undefined ? `<p class="helper" style="margin-top:8px;font-size:0.68rem;">${this._t('dashboard_birth_date_hint') || 'Geburtsdatum in den Integrationseinstellungen hinterlegen, um Alter und Vor-der-Menarche-Schätzung zu verbessern.'}</p>` : ''}
          ${sourceNote ? `<p class="helper" style="margin-top:8px;font-size:0.7rem;">${escapeHtml(sourceNote)}</p>` : ''}
          <p class="helper" style="margin-top:2px;font-size:0.68rem;">${this._t('dashboard_prediction_disclaimer')}</p>
        </div>`;
    }

    _renderMenopauseHero(stateObj, discreetMode) {
      const attrs = stateObj?.attributes || {};
      const daysSinceLastPeriod = attrs.days_since_last_period ?? null;
      const monthsTracked = attrs.menopause_months_tracked ?? null;
      // Menopause is clinically confirmed after 12 consecutive months without a period.
      const confirmThresholdDays = 365;
      const pct = daysSinceLastPeriod !== null
        ? Math.round(Math.min(100, Math.max(0, (daysSinceLastPeriod / confirmThresholdDays) * 100)))
        : 0;
      const isConfirmed = daysSinceLastPeriod !== null && daysSinceLastPeriod >= confirmThresholdDays;
      const daysRemaining = daysSinceLastPeriod !== null ? Math.max(0, confirmThresholdDays - daysSinceLastPeriod) : null;

      const statusIcon = !discreetMode ? this._statusIconHtml('menopause', 32) : '';

      const stat1 = `
        <div class="stat mc-rose">
          <div class="stat-label">${this._t('dashboard_days_since_last_period') || 'Tage seit letzter Periode'}</div>
          <div class="stat-value">${daysSinceLastPeriod !== null ? escapeHtml(daysSinceLastPeriod) : '—'} <small>${this._t('days') || 'Tage'}</small></div>
        </div>`;

      const stat2 = daysRemaining !== null && !isConfirmed
        ? `
          <div class="stat">
            <div class="stat-label">${this._t('dashboard_days_to_confirmed') || 'Tage bis bestätigt'}</div>
            <div class="stat-value">${escapeHtml(daysRemaining)} <small>${this._t('days') || 'Tage'}</small></div>
          </div>`
        : `
          <div class="stat">
            <div class="stat-label">${this._t('dashboard_months_tracked') || 'Monate erfasst'}</div>
            <div class="stat-value">${monthsTracked !== null ? escapeHtml(monthsTracked) : '—'}</div>
          </div>`;

      const stat3 = `
        <div class="stat${isConfirmed ? ' mc-plum' : ''}">
          <div class="stat-label">${this._t('dashboard_label_state')}</div>
          <div class="stat-value" style="font-size:20px;">${isConfirmed ? `✓ ${this._t('dashboard_menopause_confirmed') || 'Bestätigt'}` : `◐ ${this._t('dashboard_perimenopause') || 'Perimenopause'}`}</div>
          ${monthsTracked !== null && (daysRemaining === null || isConfirmed) ? `<div class="stat-foot">${escapeHtml(monthsTracked)} ${this._t('dashboard_months_tracked') || 'Monate erfasst'}</div>` : ''}
        </div>`;

      return `
        <div>
          ${statusIcon ? `<div style="text-align:center;margin-bottom:10px;">${statusIcon}</div>` : ''}
          <div class="progress-holder">
            <div class="progress-track" style="position:relative;height:14px;border-radius:999px;background:var(--mc-sand);border:1px solid var(--divider-color,#e5e7eb);">
              <div style="position:absolute;top:0;left:0;bottom:0;width:${pct}%;border-radius:999px;background:linear-gradient(90deg, var(--mc-sage), ${isConfirmed ? 'var(--mc-plum)' : 'var(--mc-rose)'});"></div>
              <div style="position:absolute;top:50%;left:${pct}%;width:14px;height:14px;border-radius:50%;background:var(--card-background-color,#fff);border:2.5px solid var(--primary-text-color,#2B1B24);transform:translate(-50%,-50%);"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:8px;font-family:var(--mc-font-mono);font-size:10px;color:var(--secondary-text-color,#6b7280);">
              <span>${this._t('dashboard_last_period') || 'Letzte Periode'}</span>
              <span>${this._t('dashboard_menopause_threshold') || '12 Monate ohne Periode'}</span>
            </div>
          </div>
          <div class="stat-stack" style="margin-top:16px;">${stat1}${stat2}${stat3}</div>
          <p class="helper" style="margin-top:8px;font-size:0.68rem;">${this._t('dashboard_prediction_disclaimer')}</p>
        </div>`;
    }

    _renderPostpartumHero(stateObj, discreetMode) {
      const attrs = stateObj?.attributes || {};
      const postpartumData = attrs.postpartum_data && typeof attrs.postpartum_data === 'object' ? attrs.postpartum_data : {};
      const daysSinceBirth = postpartumData.days_since_birth ?? null;
      const durationDays = postpartumData.duration_days ?? attrs.postpartum_duration ?? 42;
      const pct = daysSinceBirth !== null
        ? Math.round(Math.min(100, Math.max(0, (daysSinceBirth / durationDays) * 100)))
        : 0;
      const daysRemaining = daysSinceBirth !== null ? Math.max(0, durationDays - daysSinceBirth) : null;
      const weeksSinceBirth = daysSinceBirth !== null ? Math.floor(daysSinceBirth / 7) : null;
      const totalWeeks = Math.round(durationDays / 7);

      const statusIcon = !discreetMode ? this._statusIconHtml('postpartum', 32) : '';

      const stat1 = `
        <div class="stat mc-rose">
          <div class="stat-label">${this._t('days_postpartum') || 'Tage Wochenbett'}</div>
          <div class="stat-value">${daysSinceBirth !== null ? escapeHtml(daysSinceBirth) : '—'} <small>${this._t('days') || 'Tage'}</small></div>
        </div>`;

      const stat2 = daysRemaining !== null
        ? `
          <div class="stat">
            <div class="stat-label">${this._t('dashboard_days_remaining') || 'Tage verbleibend'}</div>
            <div class="stat-value">${escapeHtml(daysRemaining)} <small>${this._t('days') || 'Tage'}</small></div>
          </div>`
        : '';

      const stat3 = weeksSinceBirth !== null
        ? `
          <div class="stat mc-plum">
            <div class="stat-label">${this._t('weeks_postpartum') || 'Wochen Wochenbett'}</div>
            <div class="stat-value">${escapeHtml(weeksSinceBirth)} <small>/ ${totalWeeks}</small></div>
          </div>`
        : '';

      return `
        <div>
          ${statusIcon ? `<div style="text-align:center;margin-bottom:10px;">${statusIcon}</div>` : ''}
          <div class="progress-holder">
            <div class="progress-track" style="position:relative;height:14px;border-radius:999px;background:var(--mc-sand);border:1px solid var(--divider-color,#e5e7eb);">
              <div style="position:absolute;top:0;left:0;bottom:0;width:${pct}%;border-radius:999px;background:linear-gradient(90deg, var(--mc-sage), var(--mc-rose));"></div>
              <div style="position:absolute;top:50%;left:${pct}%;width:14px;height:14px;border-radius:50%;background:var(--card-background-color,#fff);border:2.5px solid var(--primary-text-color,#2B1B24);transform:translate(-50%,-50%);"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:8px;font-family:var(--mc-font-mono);font-size:10px;color:var(--secondary-text-color,#6b7280);">
              <span>${this._t('dashboard_birth') || 'Geburt'}</span>
              <span>${weeksSinceBirth !== null ? `${this._t('week')} ${weeksSinceBirth} / ${totalWeeks}` : `${durationDays} ${this._t('days') || 'Tage'}`}</span>
            </div>
          </div>
          <div class="stat-stack" style="margin-top:16px;">${stat1}${stat2}${stat3}</div>
          <p class="helper" style="margin-top:8px;font-size:0.68rem;">${this._t('dashboard_postpartum_disclaimer') || 'Rückbildung verläuft individuell sehr unterschiedlich — dieser Zeitraum ist eine grobe Orientierung, keine medizinische Vorgabe.'}</p>
        </div>`;
    }

    /* ============ HORIZONTAL PHASE / MILESTONE OVERVIEW, auto-switches by mode ============ */
    _renderPhaseTimeline(stateObj, discreetMode) {
      const mode = this._resolveContentMode(stateObj);
      if (mode === 'pregnancy') return this._renderPregnancyMilestones(stateObj);
      if (mode === 'menarche') return this._renderMenarcheChecklist(stateObj);
      if (mode === 'menopause') return this._renderMenopauseTimeline(stateObj);
      return this._renderCyclePhaseOverview(stateObj, discreetMode);
    }

    _renderMenopauseTimeline(stateObj) {
      const attrs = stateObj?.attributes || {};
      const daysSinceLastPeriod = attrs.days_since_last_period ?? 0;
      const milestones = [
        { days: 0, labelKey: 'milestone_last_period' },
        { days: 90, labelKey: 'milestone_3_months' },
        { days: 180, labelKey: 'milestone_6_months' },
        { days: 270, labelKey: 'milestone_9_months' },
        { days: 365, labelKey: 'milestone_menopause_confirmed' },
      ];
      const items = milestones.map((m) => {
        const state = daysSinceLastPeriod >= m.days ? 'done' : (Math.abs(daysSinceLastPeriod - m.days) < 15 ? 'current' : '');
        return `<div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;min-width:88px;flex:1;">
          <div style="width:12px;height:12px;border-radius:50%;background:${state === 'done' ? 'var(--mc-sage)' : (state === 'current' ? 'var(--mc-rose-deep)' : 'var(--card-background-color,#fff)')};border:2.5px solid ${state === 'current' ? 'var(--mc-rose-deep)' : 'var(--mc-sage)'};${state === 'current' ? 'box-shadow:0 0 0 4px var(--mc-rose-tint);' : ''}"></div>
          <div style="font-size:11px;font-weight:600;">${escapeHtml(this._t(m.labelKey) || m.labelKey)}</div>
        </div>`;
      }).join('<div style="flex:0.4;height:2px;background:var(--divider-color,#e5e7eb);align-self:flex-start;margin-top:6px;"></div>');
      return `<div style="display:flex;align-items:flex-start;overflow-x:auto;padding:8px 2px;gap:2px;">${items}</div>
        <p class="helper" style="margin-top:8px;font-size:0.7rem;">${this._t('dashboard_menopause_timeline_note') || 'Meilensteine seit der letzten erfassten Periode. Menopause gilt klinisch als bestätigt nach 12 Monaten ohne Periode.'}</p>`;
    }

    _renderNfpSummaryLine(stateObj, inline = false) {
      const attrs = stateObj?.attributes || {};
      const nfp = attrs.nfp_analysis;
      if (!nfp || typeof nfp !== 'object' || !nfp.ovulation_detected) return '';
      const parts = [];
      if (nfp.temperature_rise_day) parts.push(`${this._t('temperature_rise_day') || 'Temperaturanstieg'}: ${escapeHtml(nfp.temperature_rise_day)}`);
      if (nfp.temperature_peak_day) parts.push(`${this._t('nfp_temp_peak') || 'Temperaturhöchstwert'}: ${escapeHtml(nfp.temperature_peak_day)}`);
      if (nfp.cervical_mucus_peak || nfp.cervix_peak) parts.push(this._t('legend_cervix_peak') || 'Zervixschleim-Höhepunkt erkannt');
      if (!parts.length) return '';
      if (inline) return `<span style="font-size:0.7rem;">${parts.join(' · ')}</span>`;
      return `<p class="helper" style="margin-top:4px;font-size:0.7rem;">${parts.join(' · ')}</p>`;
    }

    _renderCyclePhaseOverview(stateObj, discreetMode) {
      if (discreetMode) return `<div class="helper">${this._t('dashboard_discreet_note')}</div>`;

      const attrs = stateObj?.attributes || {};
      const cycleDay = Number(attrs.cycle_day ?? 0) || 0;
      const cycleLength = Number(attrs.avg_cycle_length ?? attrs.average_cycle_length ?? attrs.cycle_length_avg ?? 28) || 28;
      const fertility = attrs.fertility_forecast || {};
      let ovulationDay = null;
      if (fertility.ovulation_estimate && attrs.cycle_start_date) {
        const diff = Math.round((new Date(fertility.ovulation_estimate) - new Date(attrs.cycle_start_date)) / 86400000) + 1;
        if (diff > 0 && diff <= cycleLength) ovulationDay = diff;
      }
      if (ovulationDay === null && attrs.ovulation_day) ovulationDay = Number(attrs.ovulation_day);
      if (ovulationDay === null) ovulationDay = Math.round(cycleLength * 0.5);

      const W = 1180, H = 300;
      const padL = 40, padR = 20, padT = 20, padB = 44;
      const bandH = 20, bandGap = 8;
      const plotB = H - padB - bandH - bandGap;
      const plotT = padT;
      const x = (d) => padL + (d - 1) / (cycleLength - 1 || 1) * (W - padL - padR);

      const menstrualEnd = Math.max(2, Math.round(cycleLength * 0.179));
      const follicularEnd = Math.max(menstrualEnd + 1, ovulationDay - 2);
      const ovulationEnd = Math.min(cycleLength - 1, ovulationDay + 1);
      const phases = [
        { from: 1, to: menstrualEnd, label: this._t('phase_menstruation') || 'Menstruation', color: '#E8637D' },
        { from: menstrualEnd, to: follicularEnd, label: this._t('phase_follicular') || 'Follikulär', color: '#7C9885' },
        { from: follicularEnd, to: ovulationEnd, label: 'Eisprung', color: '#3F5A47' },
        { from: ovulationEnd, to: cycleLength + 1, label: this._t('phase_luteal') || 'Luteal', color: '#6B3654' },
      ];

      const bandY = plotB + bandGap;
      const bands = phases.map((p) => {
        const bx = x(p.from), bw = Math.max(2, x(p.to) - x(p.from));
        return `<rect x="${bx.toFixed(1)}" y="${bandY}" width="${bw.toFixed(1)}" height="${bandH}" fill="${p.color}" opacity="0.85" rx="4"/>
                <text x="${(bx + bw / 2).toFixed(1)}" y="${bandY + bandH / 2 + 4}" text-anchor="middle" font-size="10" font-family="Inter, sans-serif" font-weight="600" fill="#FFFDFB">${escapeHtml(p.label)}</text>`;
      }).join('');

      const gridTicks = [1, Math.round(cycleLength * 0.25), Math.round(cycleLength * 0.5), Math.round(cycleLength * 0.75), cycleLength]
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .map((d) => `<line x1="${x(d).toFixed(1)}" x2="${x(d).toFixed(1)}" y1="${plotT}" y2="${plotB}" stroke="var(--divider-color,#e5e7eb)" stroke-width="1"/>
                      <text x="${x(d).toFixed(1)}" y="${H - 20}" text-anchor="middle" font-size="9" font-family="IBM Plex Mono, monospace" fill="var(--secondary-text-color,#9ca3af)">${this._t('cycle_day')} ${d}</text>`)
        .join('');

      // idealized relative curves, scaled to real cycleLength/ovulationDay — not measured biomarkers
      const points = [];
      for (let d = 1; d <= cycleLength; d++) {
        const relToOv = (d - ovulationDay) / cycleLength;
        let endo;
        if (d <= menstrualEnd) endo = 0.08 + (d - 1) * (0.1 / Math.max(1, menstrualEnd - 1));
        else if (d <= ovulationDay) endo = 0.18 + (d - menstrualEnd) * (0.6 / Math.max(1, ovulationDay - menstrualEnd));
        else if (d <= cycleLength - 2) endo = 0.82 - (d - ovulationDay) * 0.005;
        else endo = 0.7 - (d - (cycleLength - 2)) * 0.3;
        endo = Math.max(0.05, Math.min(1, endo));

        let est;
        if (d <= ovulationDay) est = 0.1 + Math.pow(d / ovulationDay, 1.6) * 0.85;
        else if (d <= ovulationDay + 4) est = 1.0 - (d - ovulationDay) * 0.16;
        else est = Math.max(0.15, 0.4 - (d - ovulationDay - 4) * 0.02);
        est = Math.max(0.05, Math.min(1, est));

        let prog;
        if (d <= ovulationDay) prog = 0.04;
        else if (d <= cycleLength - 4) prog = 0.04 + (d - ovulationDay) * (0.92 / Math.max(1, cycleLength - 4 - ovulationDay));
        else prog = Math.max(0.05, 0.9 - (d - (cycleLength - 4)) * 0.2);
        prog = Math.max(0.03, Math.min(1, prog));

        points.push({ d, endo, est, prog });
      }
      const yCurve = (v) => plotT + (1 - v) * (plotB - plotT - 10) + 6;
      const pathFor = (key) => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.d).toFixed(1)},${yCurve(p[key]).toFixed(1)}`).join(' ');
      const areaFor = (key) => `M${x(1).toFixed(1)},${plotB} ${points.map((p) => `L${x(p.d).toFixed(1)},${yCurve(p[key]).toFixed(1)}`).join(' ')} L${x(cycleLength).toFixed(1)},${plotB} Z`;

      const ovLineX = x(ovulationDay).toFixed(1);
      const todayLineX = cycleDay > 0 ? x(Math.min(cycleDay, cycleLength)).toFixed(1) : null;

      const svgContent = `
        ${bands}
        ${gridTicks}
        <path d="${areaFor('endo')}" fill="#6B3654" opacity="0.16"/>
        <path d="${pathFor('endo')}" fill="none" stroke="#6B3654" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="${pathFor('est')}" fill="none" stroke="#E3A23D" stroke-width="2" stroke-dasharray="6 4" stroke-linejoin="round"/>
        <path d="${pathFor('prog')}" fill="none" stroke="#3F5A47" stroke-width="2" stroke-dasharray="6 4" stroke-linejoin="round"/>
        <line x1="${ovLineX}" x2="${ovLineX}" y1="${plotT}" y2="${plotB}" stroke="var(--primary-text-color,#2B1B24)" stroke-width="1.4" stroke-dasharray="3 3"/>
        <circle cx="${ovLineX}" cy="${yCurve(1.0).toFixed(1)}" r="5" fill="var(--primary-text-color,#2B1B24)"/>
        <text x="${ovLineX}" y="${plotT - 6}" text-anchor="middle" font-size="10" font-family="IBM Plex Mono, monospace" fill="var(--primary-text-color,#2B1B24)">LH-Anstieg</text>
        ${todayLineX ? `<line x1="${todayLineX}" x2="${todayLineX}" y1="${plotT}" y2="${bandY + bandH}" stroke="var(--mc-rose-deep,#C43F5E)" stroke-width="1.6"/>
        <text x="${todayLineX}" y="${plotT - 6}" text-anchor="middle" font-size="10" font-family="IBM Plex Mono, monospace" font-weight="600" fill="var(--mc-rose-deep,#C43F5E)">${escapeHtml(this._t('dashboard_today'))}</text>` : ''}
      `;

      const legend = `
        <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-top:10px;font-size:0.75rem;color:var(--secondary-text-color,#6b7280);row-gap:4px;">
          <span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#6B3654;margin-right:5px;vertical-align:middle"></span>Gebärmutterschleimhaut</span>
          <span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#E3A23D;margin-right:5px;vertical-align:middle"></span>Östrogen</span>
          <span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#3F5A47;margin-right:5px;vertical-align:middle"></span>Progesteron</span>
          <span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--primary-text-color,#2B1B24);margin-right:5px;vertical-align:middle"></span>LH-Anstieg (Eisprung)</span>
          <span style="font-size:0.7rem;">Kurvenform ist typisiert (keine gemessenen Hormonwerte), Zeitachse basiert auf deinen echten Zyklusdaten.</span>
          ${this._renderNfpSummaryLine(stateObj, true)}
        </div>
      `;

      const titleText = `Cycle phase overview – day ${cycleDay} of ${cycleLength}`;

      return `
        <div class="phase-overview-wrap" role="img" aria-label="${escapeHtml(titleText)}">
          <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="overflow:visible;display:block;">
            <title>${escapeHtml(titleText)}</title>
            ${svgContent}
          </svg>
          ${legend}
        </div>
      `;
    }

    _renderPregnancyMilestones(stateObj) {
      const attrs = stateObj?.attributes || {};
      const weeksPregnantRaw = Number(attrs.weeks_pregnant ?? 0) || 0;
      const weekUnit = this._t('dashboard_week_unit');
      const milestones = [
        { week: 6, labelKey: 'milestone_heartbeat' },
        { week: 12, labelKey: 'milestone_first_trimester_screening' },
        { week: 20, labelKey: 'milestone_organ_screening' },
        { week: 24, labelKey: 'milestone_viability' },
        { week: 28, labelKey: 'milestone_third_trimester' },
        { week: 36, labelKey: 'milestone_position_check' },
        { week: 40, labelKey: 'milestone_due_date' },
      ];
      const items = milestones.map((m) => {
        const state = weeksPregnantRaw >= m.week ? 'done' : (Math.abs(weeksPregnantRaw - m.week) < 1 ? 'current' : '');
        return `<div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;min-width:88px;flex:1;">
          <div style="width:12px;height:12px;border-radius:50%;background:${state === 'done' ? 'var(--mc-sage)' : (state === 'current' ? 'var(--mc-rose-deep)' : 'var(--card-background-color,#fff)')};border:2.5px solid ${state === 'current' ? 'var(--mc-rose-deep)' : 'var(--mc-sage)'};${state === 'current' ? 'box-shadow:0 0 0 4px var(--mc-rose-tint);' : ''}"></div>
          <div style="font-size:11px;font-weight:600;">${escapeHtml(this._t(m.labelKey))}</div>
          <div style="font-family:var(--mc-font-mono);font-size:10px;color:var(--secondary-text-color,#6b7280);">${escapeHtml(weekUnit)} ${m.week}</div>
        </div>`;
      }).join('<div style="flex:0.4;height:2px;background:var(--divider-color,#e5e7eb);align-self:flex-start;margin-top:6px;"></div>');
      const isHighRisk = !!(attrs.pregnancy_high_risk ?? (attrs.pregnancy_data || {}).high_risk);
      const riskNote = isHighRisk
        ? `<p class="helper" style="margin-top:8px;font-size:0.72rem;">⚠ ${this._t('dashboard_high_risk_milestone_note') || 'Bei Risikoschwangerschaften sind meist engmaschigere, individuell festgelegte Kontrolltermine üblich — zusätzlich zu den Standardterminen oben. Bitte mit der behandelnden Praxis abstimmen.'}</p>`
        : '';
      return `<div style="display:flex;align-items:flex-start;overflow-x:auto;padding:8px 2px;gap:2px;">${items}</div>${riskNote}`;
    }

    _renderFetalDevelopment(stateObj) {
      const attrs = stateObj?.attributes || {};
      const weeksPregnantRaw = Number(attrs.weeks_pregnant ?? 0) || 0;
      if (weeksPregnantRaw < 4) {
        return `<div class="helper">${this._t('dashboard_not_enough_data')}</div>`;
      }
      const week = Math.max(4, Math.min(40, Math.round(weeksPregnantRaw)));
      const stage = _fetalStageForWeek(week);

      const skillItems = stage.skillKeys.map((k) => `
        <div class="anomaly-item info">
          <span class="anomaly-dot"></span>
          <div class="anomaly-body">
            <p class="anomaly-text">${escapeHtml(this._t(k))}</p>
          </div>
        </div>
      `).join('');

      const assetIdx = _pregnancyAssetIndex(week);
      const weekUnit = this._t('dashboard_week_unit');
      const sharedIcon = (typeof window !== 'undefined' && window.ProductIcons?.getPregnancyIcon)
        ? window.ProductIcons.getPregnancyIcon(week, 84)
        : '';
      const illustration = `
        <div style="width:110px;flex:none;display:flex;flex-direction:column;align-items:center;gap:6px;">
          ${sharedIcon || `<img src="/menstruation_cycle/assets/pregnancy/preg_${assetIdx}.svg" width="84" height="172"
               alt="${escapeHtml(weekUnit)} ${week}" style="max-width:100%;height:auto;" loading="lazy"
               onerror="this.style.display='none';"/>`}
        </div>`;

      return `
        <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start;">
          ${illustration}
          <div class="kpi-item mc-rose" style="min-width:150px;">
            <span class="kpi-icon" aria-hidden="true">🌱</span>
            <span class="kpi-value">${escapeHtml(weekUnit)} ${week}</span>
            <span class="kpi-label">${this._t('dashboard_fetal_size_label')}: ${escapeHtml(this._t(stage.sizeKey))}</span>
          </div>
          <div style="flex:1;min-width:220px;display:grid;gap:8px;">${skillItems}</div>
        </div>
        <p class="helper" style="margin-top:10px;font-size:0.7rem;">${this._t('dashboard_prediction_disclaimer')}</p>
      `;
    }

    _renderMenarcheChecklist(stateObj) {
      const attrs = stateObj?.attributes || {};
      const preMenData = attrs.pre_menarche_data || {};
      const signs = preMenData.signs && typeof preMenData.signs === 'object' ? preMenData.signs : {};

      const items = PRE_MENARCHE_SIGN_KEYS.map((signKey) => {
        const meta = PRE_MENARCHE_SIGNS[signKey];
        const entry = _normalizeSignEntry(signs[signKey]);
        const done = entry !== null;
        const detail = done ? `${this._t('opt_' + entry.stage) !== ('opt_' + entry.stage) ? this._t('opt_' + entry.stage) : entry.stage}${entry.loggedAt ? ` · ${escapeHtml(this._formatDate(entry.loggedAt))}` : ''}` : '';
        const isExpanded = this._expandedSign === signKey;

        const optionButtons = meta.options.map((opt) => {
          const optLabel = this._t('opt_' + opt) !== ('opt_' + opt) ? this._t('opt_' + opt) : opt;
          const selected = entry && entry.stage === opt;
          return `<button type="button" class="sym-opt-btn${selected ? ' sym-selected' : ''}" data-action="log-sign" data-sign="${signKey}" data-stage="${opt}" style="padding:6px 12px;border-radius:10px;border:1px solid ${selected ? 'var(--mc-rose-deep)' : 'var(--divider-color,#d1d5db)'};background:${selected ? 'var(--mc-rose-tint)' : 'var(--card-background-color,#fff)'};font-size:12px;cursor:pointer;">${escapeHtml(optLabel)}</button>`;
        }).join('');

        const stageDescriptions = (isExpanded && (signKey === 'pubic_hair_growth' || signKey === 'breast_development'))
          ? `<div style="padding:2px 14px 10px 46px;display:grid;gap:3px;">
              ${meta.options.map((opt) => {
                const descKey = `pre_menarche_desc_${signKey}_${opt}`;
                const desc = this._t(descKey);
                if (desc === descKey) return '';
                const optLabel = this._t('opt_' + opt) !== ('opt_' + opt) ? this._t('opt_' + opt) : opt;
                return `<p style="margin:0;font-size:11px;color:var(--secondary-text-color,#6b7280);"><strong style="color:var(--primary-text-color,inherit);">${escapeHtml(optLabel)}:</strong> ${escapeHtml(desc)}</p>`;
              }).join('')}
            </div>`
          : '';

        const picker = isExpanded ? `
          <div style="display:flex;gap:8px;flex-wrap:wrap;padding:10px 14px 4px 46px;">
            ${optionButtons}
            ${done ? `<button type="button" data-action="remove-sign" data-sign="${signKey}" style="padding:6px 12px;border-radius:10px;border:1px solid var(--divider-color,#d1d5db);background:transparent;font-size:12px;color:var(--secondary-text-color,#6b7280);cursor:pointer;">${this._t('remove') || 'Entfernen'}</button>` : ''}
          </div>
          ${stageDescriptions}` : '';

        return `<div style="border-radius:14px;background:var(--mc-sand);border:1px solid var(--divider-color,#e5e7eb);margin-bottom:8px;overflow:hidden;">
          <div data-action="toggle-sign-picker" data-sign="${signKey}" style="display:flex;align-items:center;gap:12px;padding:10px 14px;cursor:pointer;">
            <div style="width:20px;height:20px;border-radius:6px;flex:none;display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;background:${done ? 'var(--mc-sage)' : 'transparent'};border:${done ? 'none' : '1.5px solid var(--divider-color,#d1d5db)'};">${done ? '✓' : ''}</div>
            <div style="flex:1;font-size:13px;${done ? '' : 'color:var(--secondary-text-color,#6b7280);'}">${escapeHtml(this._t(meta.labelKey))}${done ? ` — ${detail}` : ''}</div>
            <div style="color:var(--secondary-text-color,#6b7280);font-size:11px;transform:rotate(${isExpanded ? '180deg' : '0deg'});transition:transform 0.15s;">▾</div>
          </div>
          ${picker}
        </div>`;
      }).join('');

      return `<div>${items}</div>
        <p class="helper" style="margin-top:4px;font-size:0.68rem;">${this._t('dashboard_menarche_checklist_hint') || 'Antippen, um ein Anzeichen zu erfassen. Fließt automatisch in die Schätzung oben ein.'}</p>`;
    }


    _renderPhaseDonut(stateObj, discreetMode) {
      if (discreetMode) return `<div class="helper">${this._t('dashboard_discreet_note')}</div>`;
      const attrs = stateObj?.attributes || {};
      const cycleDay = Number(attrs.cycle_day ?? 0) || 0;
      const cycleLength = Number(attrs.average_cycle_length ?? attrs.cycle_length_avg ?? 28) || 28;
      const currentPhase = String(attrs.current_phase ?? attrs.state ?? stateObj?.state ?? '').toLowerCase();

      const phases = [
        { id: 'menstrual',  label: 'Men',  days: Math.round(cycleLength * 0.179), color: '#E8637D' },
        { id: 'follicular', label: 'Fol',  days: Math.round(cycleLength * (0.464 - 0.179)), color: '#7C9885' },
        { id: 'ovulation',  label: 'Ov',   days: Math.max(1, Math.round(cycleLength * 0.072)), color: '#3F5A47' },
        { id: 'luteal',     label: 'Lut',  days: Math.round(cycleLength * (1 - 0.536)), color: '#6B3654' },
      ];

      // Normalize so they sum to cycleLength
      const totalDays = phases.reduce((s, p) => s + p.days, 0);
      const scale = cycleLength / (totalDays || cycleLength);
      let cumAngle = -90; // start at top
      const cx = 100; const cy = 100; const R = 80; const innerR = 50;
      const toRad = (deg) => (deg * Math.PI) / 180;

      const matchPhase = (ph) => {
        const p = ph.id;
        if (currentPhase.includes(p)) return true;
        if (p === 'menstrual' && (currentPhase.includes('period') || currentPhase.includes('bleeding'))) return true;
        if (p === 'ovulation' && currentPhase.includes('ovulat')) return true;
        return false;
      };
      const activeIdx = phases.findIndex(matchPhase);

      const slices = phases.map((ph, idx) => {
        const angleDeg = (ph.days * scale / cycleLength) * 360;
        const startAngle = cumAngle;
        cumAngle += angleDeg;
        const endAngle = cumAngle;
        const isActive = idx === activeIdx;

        const x1 = cx + R * Math.cos(toRad(startAngle));
        const y1 = cy + R * Math.sin(toRad(startAngle));
        const x2 = cx + R * Math.cos(toRad(endAngle));
        const y2 = cy + R * Math.sin(toRad(endAngle));
        const xi1 = cx + innerR * Math.cos(toRad(startAngle));
        const yi1 = cy + innerR * Math.sin(toRad(startAngle));
        const xi2 = cx + innerR * Math.cos(toRad(endAngle));
        const yi2 = cy + innerR * Math.sin(toRad(endAngle));
        const largeArc = angleDeg > 180 ? 1 : 0;

        const pathD = `M${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${largeArc},1 ${x2.toFixed(2)},${y2.toFixed(2)} L${xi2.toFixed(2)},${yi2.toFixed(2)} A${innerR},${innerR} 0 ${largeArc},0 ${xi1.toFixed(2)},${yi1.toFixed(2)} Z`;
        const opacity = isActive ? '1' : '0.45';
        const strokeW = isActive ? '2' : '0.5';
        const strokeColor = isActive ? '#fff' : 'none';

        // Label in slice midpoint
        const midAngle = startAngle + angleDeg / 2;
        const labelR = (R + innerR) / 2;
        const lx = cx + labelR * Math.cos(toRad(midAngle));
        const ly = cy + labelR * Math.sin(toRad(midAngle));

        return `<path d="${pathD}" fill="${ph.color}" opacity="${opacity}" stroke="${strokeColor}" stroke-width="${strokeW}"/>
                <text x="${lx.toFixed(1)}" y="${(ly + 5).toFixed(1)}" text-anchor="middle" font-size="13" fill="#fff" font-weight="${isActive ? '700' : '400'}" pointer-events="none">${ph.label}</text>`;
      }).join('');

      // Center day text
      const centerLabel = cycleDay > 0
        ? `<text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="30" font-family="Fraunces, serif" font-weight="500" fill="var(--mc-rose-deep,#C43F5E)">${cycleDay}</text>
           <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="12" font-family="IBM Plex Mono, monospace" fill="var(--secondary-text-color,#6b7280)">${escapeHtml(this._t('cycle_day')).toUpperCase()}</text>`
        : `<text x="${cx}" y="${cy + 6}" text-anchor="middle" font-size="13" fill="var(--secondary-text-color,#6b7280)">—</text>`;

      // Legend below
      const legendItems = phases.map((ph, idx) => {
        const isActive = idx === activeIdx;
        return `<span style="display:inline-flex;align-items:center;gap:5px;font-family:var(--mc-font-mono);font-size:0.78rem;color:${isActive ? ph.color : 'var(--secondary-text-color,#6b7280)'};font-weight:${isActive ? 600 : 400}">
          <span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${ph.color};opacity:${isActive ? 1 : 0.5}"></span>${ph.label} ${ph.days}d
        </span>`;
      }).join('');

      return `
        <div class="phase-donut-wrap" role="img" aria-label="${escapeHtml(this._t('dashboard_phase_donut_title'))}">
          <svg viewBox="0 0 200 200" width="180" height="180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="flex-shrink:0;">
            <title>${escapeHtml(this._t('dashboard_phase_donut_title'))}</title>
            ${slices}
            ${centerLabel}
          </svg>
          <div class="phase-donut-legend">${legendItems}</div>
        </div>
      `;
    }

    /**
     * Fetches the complete, uncompacted symptom_history (+ product_usage) for a
     * profile via the get_full_history service — this reads directly from the
     * backend's full in-memory data, bypassing the entity attribute size-shedding
     * pipeline entirely. Used by every widget that needs more than the ~30 most
     * recent days (basal-temp chart, symptom heatmap, pain/mood trend), so they
     * all share one fetch + one cache instead of each having its own bespoke
     * workaround. Caches per profile; safe to call repeatedly, only fetches once
     * per profile per session unless explicitly invalidated.
     */
    async _fetchFullHistory(entityId, profile) {
      const cacheKey = profile || entityId;
      if (!cacheKey) return;
      if (this._fullHistoryCache[cacheKey] || this._fullHistoryFetching.has(cacheKey)) return;
      if (!this._hass?.connection?.sendMessagePromise) return;
      this._fullHistoryFetching.add(cacheKey);
      try {
        const payload = entityId ? { entity_id: entityId, days: 180 } : { profile, days: 180 };
        const result = await this._hass.connection.sendMessagePromise({
          type: 'call_service',
          domain: 'menstruation_cycle',
          service: 'get_full_history',
          service_data: payload,
          return_response: true,
        });
        const response = result?.response;
        if (response && Array.isArray(response.symptom_history)) {
          this._fullHistoryCache[cacheKey] = response;
          console.debug('[menstruation-cycle] Full history fetched for', cacheKey, `(${response.symptom_history.length} symptom entries)`);
        } else {
          console.warn('[menstruation-cycle] get_full_history returned no usable data for', cacheKey, '— raw result:', result);
          this._fullHistoryCache[cacheKey] = { symptom_history: [], product_usage: [] };
        }
      } catch (err) {
        console.warn('[menstruation-cycle] get_full_history call failed for', cacheKey, err);
        this._fullHistoryCache[cacheKey] = { symptom_history: [], product_usage: [] }; // avoid retry-looping
      } finally {
        this._fullHistoryFetching.delete(cacheKey);
      }
      this.render();
    }

    /**
     * Returns the best available symptom_history for a profile: the full,
     * uncompacted list from _fetchFullHistory's cache if loaded, otherwise the
     * (possibly capped or entirely absent) attrs.symptom_history as an immediate
     * fallback while the full fetch is in flight. Triggers the fetch as a side
     * effect if not yet cached — safe to call from any widget's render path.
     */
    _getFullSymptomHistory(stateObj) {
      const attrs = stateObj?.attributes || {};
      const profile = attrs.profile || null;
      const cached = profile ? this._fullHistoryCache[profile] : null;
      if (cached) return cached.symptom_history;
      if (profile) this._fetchFullHistory(this._selectedEntityId, profile); // fire-and-forget, re-renders on completion
      return Array.isArray(attrs.symptom_history) ? attrs.symptom_history : [];
    }

    _renderBasalTempChart(stateObj) {
      const attrs = stateObj?.attributes || {};
      const history = this._getFullSymptomHistory(stateObj);
      const temps = history
        .filter((entry) => entry && typeof entry === 'object' && entry.date && Number.isFinite(Number(entry.basal_temp)))
        .map((entry) => ({ date: entry.date, temperature: Number(entry.basal_temp) }))
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

      if (temps.length < 2) {
        return `<div class="helper">${this._t('dashboard_basal_temp_no_data')}</div>`;
      }

      const recent = temps.slice(-30);
      const values = recent.map((t) => Number(t.temperature ?? t.value ?? 0));
      const minV = Math.min(...values) - 0.1;
      const maxV = Math.max(...values) + 0.1;
      const yRange = maxV - minV || 0.5;

      // Real 3-over-6 (Roetzer rule) confirmation from the backend's NFP analysis,
      // rather than a crude "average of first 6 + 0.1" approximation — the backend
      // already implements the actual rule (baseline = lowest of preceding 6
      // readings, confirmed when 3+ consecutive readings exceed baseline + 0.2°C,
      // sustained for a following window). Falls back gracefully when no rise has
      // been confirmed yet (not enough data, or genuinely no rise this cycle).
      const nfp = attrs.nfp_analysis && typeof attrs.nfp_analysis === 'object' ? attrs.nfp_analysis : null;
      const riseConfirmed = !!nfp?.temperature_rise_detected;
      const riseDayIso = nfp?.temperature_rise_day || null;
      const coverlineTemp = Number.isFinite(Number(nfp?.coverline_temp)) ? Number(nfp.coverline_temp) : null;
      const riseIdx = riseDayIso ? recent.findIndex((t) => t.date === riseDayIso) : -1;

      const W = 620; const H = 220;
      const padL = 42; const padR = 14; const padT = 16; const padB = 28;
      const chartW = W - padL - padR;
      const chartH = H - padT - padB;

      const toX = (i) => padL + (i / (recent.length - 1 || 1)) * chartW;
      const toY = (v) => padT + chartH - ((v - minV) / yRange) * chartH;

      // Post-rise shaded band, anchored to the actual confirmed rise day (not a
      // fixed/guessed day) — only drawn once the rule has genuinely confirmed a rise.
      const postRiseBand = riseIdx >= 0
        ? `<rect x="${Math.round(toX(riseIdx))}" y="${padT}" width="${Math.round(W - padR - toX(riseIdx))}" height="${chartH}" fill="var(--mc-sage-tint,#E6EDE7)" opacity="0.7"/>`
        : '';

      // Coverline: the real confirmation threshold when the rule has fired;
      // otherwise a lighter-weight visual reference (average of the first 6
      // readings) so the chart isn't bare while still tracking enough data.
      const cover = coverlineTemp !== null
        ? coverlineTemp
        : (() => {
            const base = values.slice(0, Math.min(6, values.length));
            return base.length ? base.reduce((a, b) => a + b, 0) / base.length + 0.1 : null;
          })();
      const coverLine = cover !== null && cover >= minV && cover <= maxV
        ? `<line x1="${padL}" x2="${W - padR}" y1="${Math.round(toY(cover))}" y2="${Math.round(toY(cover))}" stroke="var(--mc-rose-deep)" stroke-width="1.4" stroke-dasharray="5 4"/>`
        : '';

      // Real gridlines (not just axis text) at 4 evenly-spaced temperature levels.
      const gridSteps = 4;
      const gridLines = Array.from({ length: gridSteps }, (_, i) => minV + (i / (gridSteps - 1)) * yRange).map((v) => {
        const y = Math.round(toY(v));
        return `<line x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}" stroke="var(--divider-color,#e5e7eb)" stroke-width="1"/>
                <text x="6" y="${y + 3}" font-size="9" font-family="IBM Plex Mono, monospace" fill="var(--secondary-text-color,#9ca3af)">${v.toFixed(1)}</text>`;
      }).join('');

      const pathD = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${Math.round(toX(i))},${Math.round(toY(v))}`).join(' ');

      // Temperature-jump visualization: the confirmed rise day gets a distinctly
      // larger, differently-colored marker plus a small label, instead of just
      // marking "today" like before — directly showing *where* the biphasic shift
      // was detected, not merely the most recent reading.
      const dots = values.map((v, i) => {
        const x = Math.round(toX(i));
        const y = Math.round(toY(v));
        const isRiseDay = i === riseIdx;
        return `<circle cx="${x}" cy="${y}" r="${isRiseDay ? 5 : 2.2}" fill="${isRiseDay ? 'var(--mc-sage-deep,#3F5A47)' : 'var(--mc-rose-deep)'}" stroke="${isRiseDay ? 'var(--card-background-color,#fff)' : 'none'}" stroke-width="${isRiseDay ? 1.5 : 0}"/>`;
      }).join('');

      const riseLabel = riseIdx >= 0
        ? `<text x="${Math.round(toX(riseIdx))}" y="${Math.round(toY(values[riseIdx])) - 10}" text-anchor="middle" font-size="9" font-weight="600" font-family="IBM Plex Mono, monospace" fill="var(--mc-sage-deep,#3F5A47)">↑ ${escapeHtml(this._t('dashboard_temperature_rise') || 'Temperaturanstieg')}</text>`
        : '';

      // X-axis: 5 evenly-spaced date labels across the visible window, instead of
      // just first/last.
      const labelCount = Math.min(5, recent.length);
      const labelIndices = Array.from({ length: labelCount }, (_, i) =>
        Math.round((i / (labelCount - 1 || 1)) * (recent.length - 1))
      );
      const xLabels = [...new Set(labelIndices)].map((i) => {
        const anchor = i === 0 ? 'start' : (i === recent.length - 1 ? 'end' : 'middle');
        const label = recent[i]?.date ? this._formatDate(recent[i].date, { day: '2-digit', month: '2-digit' }) : '';
        return `<text x="${Math.round(toX(i))}" y="${H - 8}" text-anchor="${anchor}" font-size="9" font-family="IBM Plex Mono, monospace" fill="var(--secondary-text-color,#9ca3af)">${escapeHtml(label)}</text>`;
      }).join('');

      const daysPrefix = `${this._t('dashboard_bbt_last_days_prefix') || 'Letzte'} ${recent.length} ${this._t('days') || 'Tage'}`;
      const subtitle = riseConfirmed
        ? `${daysPrefix} · ${this._t('dashboard_bbt_subtitle_confirmed') || '3-über-6-Regel bestätigt'}`
        : `${daysPrefix} · ${this._t('dashboard_bbt_subtitle_pending') || 'noch keine 3-über-6-Bestätigung'}`;

      return `
        <div class="bbt-wrap" role="img" aria-label="${escapeHtml(this._t('dashboard_widget_basal_temp'))}">
          <p class="helper" style="margin:0 0 8px;font-size:0.72rem;">${escapeHtml(subtitle)}</p>
          <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="display:block;overflow:visible;">
            <title>${escapeHtml(this._t('dashboard_widget_basal_temp'))}</title>
            ${postRiseBand}
            ${gridLines}
            ${coverLine}
            <path d="${pathD}" fill="none" stroke="var(--mc-rose-deep)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            ${dots}
            ${riseLabel}
            ${xLabels}
          </svg>
        </div>
      `;
    }

    _renderSymptomHeatmap(stateObj) {
      if (!this._selectedEntityId) {
        return `<div class="helper">${this._t('dashboard_no_entity_selected')}</div>`;
      }
      const attrs = stateObj?.attributes || {};
      const statHeader = this._renderSymptomStatHeader(attrs);

      const tagName = 'menstruation-cycle-heatmap-card';
      if (typeof customElements !== 'undefined' && customElements.get(tagName)) {
        return `${statHeader}${this._renderEmbeddedCardMount('heatmap-card')}`;
      }
      // Native fallback: simple 4-week × symptom grid
      const symptomHistory = this._getFullSymptomHistory(stateObj);

      if (!symptomHistory || (Array.isArray(symptomHistory) && symptomHistory.length === 0)) {
        return `${statHeader}<div class="helper">${this._t('dashboard_pain_no_data')}</div>`;
      }

      const entries = Array.isArray(symptomHistory) ? symptomHistory.slice(-28) : [];
      if (entries.length === 0) return `${statHeader}<div class="helper">${this._t('dashboard_pain_no_data')}</div>`;

      const symptomKeys = ['bleeding', 'pain', 'mood'];

      const normalize = (v) => {
        if (!v || v === 'none') return 0;
        if (v === 'light' || v === 1) return 1;
        if (v === 'medium' || v === 2) return 2;
        if (v === 'heavy' || v === 3) return 3;
        if (typeof v === 'number') return Math.min(3, Math.round(v));
        return 1;
      };

      const rows = symptomKeys.map((key) => {
        const cells = entries.map((entry) => {
          const val = normalize(entry?.[key] ?? entry?.symptom_data?.[key]);
          const alpha = 0.1 + (val / 3) * 0.55;
          return `<td style="width:14px;height:14px;background:rgba(196,63,94,${alpha});border-radius:4px;border:1px solid var(--card-background-color,#fff);"></td>`;
        }).join('');
        return `<tr><td style="font-size:0.72rem;font-family:var(--mc-font-mono);color:var(--secondary-text-color,#6b7280);padding-right:8px;white-space:nowrap;">${escapeHtml(this._t(key))}</td>${cells}</tr>`;
      }).join('');

      return `${statHeader}<div style="overflow-x:auto;"><table style="border-collapse:separate;border-spacing:2px;"><tbody>${rows}</tbody></table></div>`;
    }

    _renderSymptomStatHeader(attrs) {
      const stats = attrs.symptom_statistics && typeof attrs.symptom_statistics === 'object' ? attrs.symptom_statistics : null;
      if (!stats || !stats.cycles_analyzed) return '';

      const tiles = [];
      if (stats.pain_frequency !== undefined && stats.pain_frequency !== null) {
        tiles.push(`<div class="kpi-item"><span class="kpi-icon" aria-hidden="true">💢</span><span class="kpi-value">${escapeHtml(stats.pain_frequency)}%</span><span class="kpi-label">${this._t('dashboard_pain_frequency') || 'Zyklen mit Schmerzen'}</span></div>`);
      }
      const topPainType = stats.common_pain_types && typeof stats.common_pain_types === 'object'
        ? Object.entries(stats.common_pain_types).sort((a, b) => b[1] - a[1])[0]
        : null;
      if (topPainType) {
        const [key, pct] = topPainType;
        const label = this._t('opt_' + key) !== ('opt_' + key) ? this._t('opt_' + key) : key;
        tiles.push(`<div class="kpi-item"><span class="kpi-icon" aria-hidden="true">🎯</span><span class="kpi-value">${escapeHtml(label)}</span><span class="kpi-label">${pct}% ${this._t('dashboard_most_common') || 'häufigste Art'}</span></div>`);
      }
      if (stats.typical_bleeding_strength) {
        const label = this._t('opt_' + stats.typical_bleeding_strength) !== ('opt_' + stats.typical_bleeding_strength)
          ? this._t('opt_' + stats.typical_bleeding_strength) : stats.typical_bleeding_strength;
        tiles.push(`<div class="kpi-item mc-rose"><span class="kpi-icon" aria-hidden="true">🩸</span><span class="kpi-value">${escapeHtml(label)}</span><span class="kpi-label">${this._t('dashboard_typical_bleeding') || 'typische Stärke'}</span></div>`);
      }
      if (stats.average_basal_temp !== undefined && stats.average_basal_temp !== null) {
        tiles.push(`<div class="kpi-item"><span class="kpi-icon" aria-hidden="true">🌡️</span><span class="kpi-value">${escapeHtml(stats.average_basal_temp)}°C</span><span class="kpi-label">${this._t('dashboard_avg_basal_temp') || 'Ø Basaltemperatur'}</span></div>`);
      }

      if (!tiles.length) return '';
      return `<div class="kpi-strip" style="margin-bottom:10px;">${tiles.join('')}</div>`;
    }

    _renderAnomalyInsights(stateObj) {
      const attrs = stateObj?.attributes || {};
      const allStarts = Array.isArray(attrs.grouped_starts) ? attrs.grouped_starts.slice().sort() : [];
      const cycleLengths = [];
      for (let i = 1; i < allStarts.length; i++) {
        const len = Math.round((new Date(allStarts[i]) - new Date(allStarts[i - 1])) / 86400000);
        if (len > 10 && len < 80) cycleLengths.push(len);
      }

      if (cycleLengths.length < 3) {
        return `<div class="helper">${this._t('dashboard_not_enough_data')}</div>`;
      }

      const recent = cycleLengths.slice(-12);
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const variance = recent.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / recent.length;
      const stdDev = Math.sqrt(variance);

      // Prefer the backend's cycle_statistics.cycle_regularity_percent (±3-day-window
      // based, computed over a wider history window) over a local coefficient-of-
      // variation approximation — same source used in the cycle-length chart now, so
      // both cards agree with each other.
      const cycleStats = attrs.cycle_statistics && typeof attrs.cycle_statistics === 'object' ? attrs.cycle_statistics : null;
      const cv = avg > 0 ? (stdDev / avg) * 100 : 0;
      const regularityPercent = cycleStats?.cycle_regularity_percent ?? Math.round(100 - cv);
      const isRegular = regularityPercent >= 70;
      const threshold = Math.max(5, 1.5 * stdDev);

      const insights = [];
      insights.push({
        severity: isRegular ? 'info' : 'alert',
        tag: isRegular ? this._t('severity_info') : this._t('severity_alert'),
        label: isRegular ? this._t('dashboard_anomaly_regular') : this._t('dashboard_anomaly_irregular'),
      });

      insights.push({
        severity: 'info',
        tag: this._t('severity_info'),
        label: `${this._t('dashboard_anomaly_consistency')}: ${regularityPercent}%`,
      });

      const outliers = recent.filter((l) => Math.abs(l - avg) > threshold);
      outliers.forEach((len) => {
        const isShort = len < avg;
        insights.push({
          severity: 'alert',
          tag: this._t('severity_alert'),
          label: `${isShort ? this._t('dashboard_anomaly_short_cycle') : this._t('dashboard_anomaly_long_cycle')}: ${len}d`,
        });
      });

      return `<div class="anomaly-list">
        ${insights.slice(0, 4).map((ins) => `
          <div class="anomaly-item ${ins.severity}">
            <span class="anomaly-dot" aria-hidden="true"></span>
            <div class="anomaly-body">
              <span class="anomaly-tag">${escapeHtml(ins.tag)}</span>
              <p class="anomaly-text">${escapeHtml(ins.label)}</p>
            </div>
          </div>
        `).join('')}
      </div>`;
    }

    _renderSymptomInsights(stateObj) {
      const attrs = stateObj?.attributes || {};
      const insights = Array.isArray(attrs.symptom_correlation_insights) ? attrs.symptom_correlation_insights : [];
      const reason = attrs.symptom_correlation_insights_reason;

      if (!insights.length) {
        const reasonKey = {
          insufficient_cycle_history: 'dashboard_not_enough_data',
          insufficient_logged_days: 'dashboard_not_enough_data',
          insufficient_phase_coverage: 'dashboard_not_enough_data',
          insufficient_symptom_occurrences: 'dashboard_not_enough_data',
          no_strong_insights: 'dashboard_symptom_insights_none',
          unavailable_for_pregnancy: 'dashboard_not_enough_data',
          unavailable_for_pre_menarche: 'dashboard_not_enough_data',
          unavailable_for_menopause: 'dashboard_not_enough_data',
        }[reason] || 'dashboard_not_enough_data';
        return `<div class="helper">${this._t(reasonKey)}</div>`;
      }

      // Phase keys from the backend (period/follicular/fertile_window/ovulation_day/
      // luteal/late_luteal) map onto our existing phase_* translation keys where
      // possible; symptom_key maps onto existing opt_*/bare symptom translation keys.
      const phaseKeyMap = {
        period: 'phase_menstruation',
        follicular: 'phase_follicular',
        fertile_window: 'dashboard_fertility_window',
        ovulation_day: 'dashboard_fertility_ovulation',
        luteal: 'phase_luteal',
        late_luteal: 'phase_luteal',
      };

      const items = insights.slice(0, 4).map((ins) => {
        const symptomLabel = this._t(ins.symptom_key) !== ins.symptom_key
          ? this._t(ins.symptom_key)
          : (this._t('opt_' + ins.symptom_key) !== ('opt_' + ins.symptom_key) ? this._t('opt_' + ins.symptom_key) : ins.symptom_key);
        const phaseLabel = this._t(phaseKeyMap[ins.phase] || ins.phase);
        const moreFrequent = ins.direction === 'more_frequent';
        const template = moreFrequent
          ? (this._t('dashboard_symptom_insight_more') || '{symptom} ist {ratio}x häufiger in der {phase}-Phase.')
          : (this._t('dashboard_symptom_insight_less') || '{symptom} ist seltener in der {phase}-Phase ({ratio}x Basisrate).');
        const label = template
          .replace('{symptom}', symptomLabel)
          .replace('{ratio}', String(ins.ratio))
          .replace('{phase}', phaseLabel);
        const severity = ins.confidence === 'high' ? 'alert' : 'info';
        const tag = ins.confidence === 'high' ? this._t('severity_alert') : (this._t(`dashboard_confidence_${ins.confidence}`) || ins.confidence);
        return `
          <div class="anomaly-item ${severity}">
            <span class="anomaly-dot" aria-hidden="true"></span>
            <div class="anomaly-body">
              <span class="anomaly-tag">${escapeHtml(tag)}</span>
              <p class="anomaly-text">${escapeHtml(label)}</p>
            </div>
          </div>`;
      }).join('');

      return `<div class="anomaly-list">${items}</div>`;
    }

    _renderProgressBadges(stateObj) {
      const attrs = stateObj?.attributes || {};
      const badges = Array.isArray(attrs.progress_badges) ? attrs.progress_badges : [];
      if (!badges.length) {
        return `<div class="helper">${this._t('dashboard_not_enough_data')}</div>`;
      }

      // Fixed v1 badge set, in a stable, calm display order — matches badges.py.
      const badgeLabels = {
        first_entry: 'badge_first_entry',
        cycles_3_logged: 'badge_cycles_3',
        cycles_6_logged: 'badge_cycles_6',
        cycles_12_logged: 'badge_cycles_12',
        consistent_logging_30d: 'badge_consistent_logging',
        pattern_emerging: 'badge_pattern_emerging',
        symptom_variety: 'badge_symptom_variety',
        nfp_confirmed_ovulation: 'badge_nfp_confirmed_ovulation',
        insights_unlocked: 'badge_insights_unlocked',
        temperature_tracker: 'badge_temperature_tracker',
        doctor_report_exported: 'badge_doctor_report_exported',
        profile_personalized: 'badge_profile_personalized',
        first_sign_logged: 'badge_first_sign_logged',
        signs_explored: 'badge_signs_explored',
      };
      const byKey = {};
      badges.forEach((b) => { if (b && b.key) byKey[b.key] = b; });

      const items = Object.keys(badgeLabels).map((key) => {
        const badge = byKey[key];
        if (!badge) return '';
        const label = this._t(badgeLabels[key]);
        const earned = badge.state === 'earned';
        const inProgress = badge.state === 'in_progress';
        let detail = '';
        if (earned && badge.earned_at) {
          detail = `${this._t('dashboard_badge_earned_on') || 'Erreicht am'} ${escapeHtml(this._formatDate(badge.earned_at))}`;
        } else if (inProgress && badge.progress_target) {
          detail = `${escapeHtml(badge.progress_value)} / ${escapeHtml(badge.progress_target)}`;
        }
        return `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:14px;background:var(--mc-sand);border:1px solid var(--divider-color,#e5e7eb);margin-bottom:8px;">
          <div style="width:20px;height:20px;border-radius:6px;flex:none;display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;background:${earned ? 'var(--mc-sage)' : 'transparent'};border:${earned ? 'none' : '1.5px solid var(--divider-color,#d1d5db)'};">${earned ? '✓' : ''}</div>
          <div style="flex:1;">
            <div style="font-size:13px;${earned ? '' : 'color:var(--secondary-text-color,#6b7280);'}">${escapeHtml(label)}</div>
            ${detail ? `<div style="font-family:var(--mc-font-mono);font-size:10px;color:var(--secondary-text-color,#6b7280);margin-top:2px;">${detail}</div>` : ''}
          </div>
        </div>`;
      }).join('');

      return `<div>${items}</div>`;
    }

    _renderPainMoodTrend(stateObj) {
      const symptomHistory = this._getFullSymptomHistory(stateObj);
      const entries = Array.isArray(symptomHistory) ? symptomHistory.slice(-14) : [];

      if (entries.length < 2) {
        return `<div class="helper">${this._t('dashboard_pain_no_data')}</div>`;
      }

      // Real data model: `pain` is a multi-select array of pain *types* (cramps,
      // headache, migraine, lower_back, mittelschmerz, tender_breasts, vulva) — not
      // a single severity value. Use the count of distinct types logged that day as
      // a severity proxy (more concurrent pain types ≈ a rougher day), rather than
      // trying to match it against 'light'/'medium'/'heavy' values that this field
      // never actually contains.
      const painCount = (entry) => {
        const raw = entry?.pain ?? entry?.symptom_data?.pain;
        if (Array.isArray(raw)) return raw.filter((v) => v && v !== 'none').length;
        if (typeof raw === 'string' && raw && raw !== 'none') return 1; // legacy/singular fallback
        return 0;
      };

      // `mood` has no defined value scale or logging UI anywhere in the app today —
      // it's reserved in the backend's attribute whitelist but nothing currently
      // writes a meaningful value to it. Rather than guessing "good/bad" from English
      // substring matches (meaningless for a German-first app, and fabricated either
      // way), only show it when it's an actual number (future-proof, if a numeric
      // 1-5 scale is ever wired up) or mark presence neutrally when it's some other
      // non-empty value, without pretending to know its meaning.
      const moodValue = (entry) => {
        const raw = entry?.mood ?? entry?.symptom_data?.mood;
        if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, raw);
        if (typeof raw === 'string' && raw.trim() && raw !== 'none') return 'logged';
        return 0;
      };

      const painCounts = entries.map(painCount);
      const maxPain = Math.max(1, ...painCounts);
      const moodValues = entries.map(moodValue);
      const numericMoods = moodValues.filter((v) => typeof v === 'number' && v > 0);
      const maxMood = Math.max(1, ...(numericMoods.length ? numericMoods : [1]));
      const hasMoodData = moodValues.some((v) => v !== 0);

      const W = 400; const H = 70;
      const padL = 8; const padR = 8; const padT = 6; const padB = 18;
      const chartW = W - padL - padR;
      const chartH = H - padT - padB;
      const barW = Math.max(2, Math.floor(chartW / entries.length) - 2);
      const gap = entries.length > 1 ? (chartW - barW * entries.length) / (entries.length - 1) : 0;
      const halfW = Math.max(1, Math.floor(barW / 2));

      const bars = entries.map((entry, idx) => {
        const pain = painCounts[idx];
        const mood = moodValues[idx];
        const x = Math.round(padL + idx * (barW + gap));

        const painFrac = pain > 0 ? pain / maxPain : 0;
        const painH = pain > 0 ? Math.max(2, painFrac * chartH) : 0;
        const painY = padT + chartH - painH;
        const painBar = painH > 0 ? `<rect x="${x}" y="${painY}" width="${halfW}" height="${painH}" fill="#E8637D" opacity="0.8" rx="1"><title>${pain} ${pain === 1 ? this._t('dashboard_pain_type_singular') || 'Schmerzart' : this._t('dashboard_pain_type_plural') || 'Schmerzarten'}</title></rect>` : '';

        let moodBar = '';
        if (typeof mood === 'number' && mood > 0) {
          const moodH = Math.max(2, (mood / maxMood) * chartH);
          const moodY = padT + chartH - moodH;
          moodBar = `<rect x="${x + halfW}" y="${moodY}" width="${barW - halfW}" height="${moodH}" fill="#6B3654" opacity="0.8" rx="1"/>`;
        } else if (mood === 'logged') {
          // Presence-only marker: we know something was logged, not what it means.
          const moodH = 3;
          const moodY = padT + chartH - moodH;
          moodBar = `<rect x="${x + halfW}" y="${moodY}" width="${barW - halfW}" height="${moodH}" fill="#6B3654" opacity="0.4" rx="1"/>`;
        }

        return `${painBar}${moodBar}`;
      }).join('');

      // X-axis: first and last date
      const firstDate = entries[0]?.date ? String(entries[0].date).slice(5) : '';
      const lastDate = entries[entries.length - 1]?.date ? String(entries[entries.length - 1].date).slice(5) : '';
      const xLabels = `<text x="${padL}" y="${H - 2}" font-size="7" font-family="IBM Plex Mono, monospace" fill="var(--secondary-text-color,#9ca3af)">${escapeHtml(firstDate)}</text>
                       <text x="${W - padR}" y="${H - 2}" font-size="7" font-family="IBM Plex Mono, monospace" fill="var(--secondary-text-color,#9ca3af)" text-anchor="end">${escapeHtml(lastDate)}</text>`;

      const legend = `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;font-size:0.7rem;color:var(--secondary-text-color,#6b7280);align-items:center;">
        <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#E8637D;margin-right:4px;vertical-align:middle"></span>${escapeHtml(this._t('dashboard_pain_types_count') || 'Anzahl Schmerzarten')}</span>
        ${hasMoodData ? `<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#6B3654;margin-right:4px;vertical-align:middle"></span>${escapeHtml(this._t('mood'))}</span>` : ''}
      </div>`;

      return `
        <div class="pain-mood-wrap" role="img" aria-label="${escapeHtml(this._t('dashboard_widget_pain_mood_trend'))}">
          <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="display:block;overflow:visible;">
            <title>${escapeHtml(this._t('dashboard_widget_pain_mood_trend'))}</title>
            ${bars}
            ${xLabels}
          </svg>
          ${legend}
        </div>
      `;
    }

    _renderYearOverview(stateObj) {
      const attrs = stateObj?.attributes || {};
      const allStarts = Array.isArray(attrs.grouped_starts) ? attrs.grouped_starts : [];
      const predictedStarts = Array.isArray(attrs.predicted_cycle_starts) ? attrs.predicted_cycle_starts : [];
      const fertility = attrs.fertility_forecast && typeof attrs.fertility_forecast === 'object' ? attrs.fertility_forecast : {};
      const fertileStart = fertility.fertile_window_start ?? attrs.fertile_window_start ?? null;
      const fertileEnd = fertility.fertile_window_end ?? attrs.fertile_window_end ?? null;
      const ovulationDay = fertility.ovulation_estimate ?? attrs.ovulation_day ?? null;

      const today = new Date();
      const selectedYear = this._yearOverviewYear || today.getFullYear();
      const isDe = this._lang === 'de';

      // Show the full period span (start day + following days), not just the start
      // day, using the best available average-duration source: actual measured
      // duration from bleeding-block history, falling back to the learned average,
      // then the configured default, then a generic fallback.
      const avgPeriodDuration = Math.round(
        attrs.cycle_statistics?.average_period_duration
        ?? attrs.period_duration_learned_avg_days
        ?? attrs.period_duration_default_days
        ?? 5
      );
      const periodDays = new Set();
      const predictedPeriodDays = new Set();
      allStarts.forEach((startIso) => {
        const start = new Date(startIso);
        if (Number.isNaN(start.getTime())) return;
        for (let off = 0; off < avgPeriodDuration; off++) {
          periodDays.add(new Date(start.getTime() + off * 86400000).toISOString().slice(0, 10));
        }
      });
      predictedStarts.forEach((startIso) => {
        const start = new Date(startIso);
        if (Number.isNaN(start.getTime())) return;
        for (let off = 0; off < avgPeriodDuration; off++) {
          const iso = new Date(start.getTime() + off * 86400000).toISOString().slice(0, 10);
          if (!periodDays.has(iso)) predictedPeriodDays.add(iso);
        }
      });

      // Fertile windows/ovulation days for cycles other than the current one aren't
      // tracked by the backend (it only computes fertility_forecast live for the
      // current cycle) — so estimate them here for every other known or predicted
      // cycle gap, using the standard ~14-day luteal-phase assumption (next period
      // start minus 14 days), the same convention already used for the current-cycle
      // ring visualization elsewhere on this page. Fertile window = the 5 days
      // leading up to and including ovulation day — sperm can survive several days,
      // so this is the widely-used calendar-method window, not a measured/confirmed
      // value. Combining real past starts with predicted future starts into one
      // sorted sequence lets the same gap-based loop cover both past and future
      // cycles uniformly.
      const estOvulationDays = new Set();
      const estFertileDays = new Set();
      const allKnownStarts = Array.from(new Set([...allStarts, ...predictedStarts])).sort();
      for (let i = 0; i < allKnownStarts.length - 1; i++) {
        const nextStart = new Date(allKnownStarts[i + 1]);
        if (Number.isNaN(nextStart.getTime())) continue;
        const cycleLen = Math.round((nextStart - new Date(allKnownStarts[i])) / 86400000);
        if (cycleLen < 15 || cycleLen > 60) continue; // skip implausible gaps (e.g. missed logging)
        const ovDate = new Date(nextStart.getTime() - 14 * 86400000);
        estOvulationDays.add(ovDate.toISOString().slice(0, 10));
        for (let off = 5; off >= 1; off--) {
          const fDate = new Date(ovDate.getTime() - off * 86400000);
          estFertileDays.add(fDate.toISOString().slice(0, 10));
        }
      }
      const hasEstimatedFertileData = estOvulationDays.size > 0;

      const isInFertileWindow = (isoDate) => {
        if (!fertileStart) return false;
        const d = new Date(isoDate);
        const ws = new Date(fertileStart);
        const we = fertileEnd ? new Date(fertileEnd) : ws;
        return d >= ws && d <= we;
      };

      const months = [];
      for (let mo = 0; mo < 12; mo++) {
        const monthDate = new Date(selectedYear, mo, 1);
        const yr = selectedYear;
        const daysInMonth = new Date(yr, mo + 1, 0).getDate();
        const monthLabel = monthDate.toLocaleDateString(isDe ? 'de-DE' : 'en-US', { month: 'short' });
        const isCurrentMonth = yr === today.getFullYear() && mo === today.getMonth();
        const firstWeekday = new Date(yr, mo, 1).getDay();
        const leadOffset = isDe ? (firstWeekday === 0 ? 6 : firstWeekday - 1) : firstWeekday;

        const dayCells = [];
        for (let i = 0; i < leadOffset; i++) dayCells.push('<div class="year-day-cell"></div>');
        for (let d = 1; d <= daysInMonth; d++) {
          const isoDate = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const isPeriodDay = periodDays.has(isoDate);
          const isPredictedPeriodDay = !isPeriodDay && predictedPeriodDays.has(isoDate);
          const isOvulation = (ovulationDay && isoDate === ovulationDay) || estOvulationDays.has(isoDate);
          const isFertile = !isOvulation && (isInFertileWindow(isoDate) || estFertileDays.has(isoDate));
          const isToday = isCurrentMonth && d === today.getDate();

          let bg = 'var(--divider-color,#e5e7eb)';
          if (isToday) bg = 'var(--mc-plum,#6B3654)';
          else if (isPeriodDay) bg = 'var(--mc-rose-deep)';
          else if (isOvulation) bg = 'var(--mc-sage-deep,#3F5A47)';
          else if (isFertile) bg = 'var(--mc-amber,#E3A23D)';
          else if (isPredictedPeriodDay) bg = 'rgba(232,99,125,0.32)';

          dayCells.push(`<div class="year-day-cell" style="background:${bg};" title="${escapeHtml(this._formatDate(isoDate))}"></div>`);
        }

        months.push(`
          <div class="year-month" ${isCurrentMonth ? 'style="opacity:1"' : 'style="opacity:0.8"'}>
            <div class="year-month-label">${escapeHtml(monthLabel)}</div>
            <div class="year-month-days">${dayCells.join('')}</div>
          </div>
        `);
      }

      const legend = `
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;font-size:0.7rem;color:var(--secondary-text-color,#6b7280);align-items:center;">
          <span><span style="display:inline-block;width:8px;height:8px;border-radius:1px;background:var(--mc-rose-deep);margin-right:4px;vertical-align:middle"></span>${escapeHtml(this._t('dashboard_label_state'))} (Ø ${avgPeriodDuration}${this._t('dashboard_days_short') || 'T'})</span>
          ${predictedStarts.length ? `<span><span style="display:inline-block;width:8px;height:8px;border-radius:1px;background:rgba(232,99,125,0.32);margin-right:4px;vertical-align:middle"></span>${escapeHtml(this._t('period_forecast_window'))}</span>` : ''}
          ${(fertileStart || hasEstimatedFertileData) ? `<span><span style="display:inline-block;width:8px;height:8px;border-radius:1px;background:var(--mc-amber,#E3A23D);margin-right:4px;vertical-align:middle"></span>${escapeHtml(this._t('dashboard_fertility_window'))}</span>` : ''}
          ${(ovulationDay || hasEstimatedFertileData) ? `<span><span style="display:inline-block;width:8px;height:8px;border-radius:1px;background:var(--mc-sage-deep,#3F5A47);margin-right:4px;vertical-align:middle"></span>${escapeHtml(this._t('dashboard_fertility_ovulation'))}</span>` : ''}
          <span><span style="display:inline-block;width:8px;height:8px;border-radius:1px;background:var(--mc-plum,#6B3654);margin-right:4px;vertical-align:middle"></span>${escapeHtml(this._t('dashboard_today'))}</span>
        </div>
        ${hasEstimatedFertileData ? `<p class="helper" style="margin-top:6px;font-size:0.68rem;">${this._t('dashboard_past_fertile_disclaimer') || 'Fruchtbare Fenster außerhalb des aktuellen Zyklus sind geschätzt (Kalendermethode), keine gemessenen oder garantierten Werte.'}</p>` : ''}
        ${this._renderIcsSubscribeLink(attrs)}
      `;

      const yearNav = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <button type="button" data-action="year-overview-prev" aria-label="${this._t('dashboard_year_prev') || 'Vorheriges Jahr'}" style="border:1px solid var(--divider-color,#d1d5db);border-radius:8px;background:var(--card-background-color,#fff);padding:4px 10px;font-size:13px;cursor:pointer;color:var(--primary-text-color,inherit);">‹</button>
          <button type="button" data-action="year-overview-today" style="font-family:var(--mc-font-display);font-size:1rem;font-weight:500;border:none;background:transparent;cursor:pointer;color:var(--primary-text-color,inherit);">${selectedYear}</button>
          <button type="button" data-action="year-overview-next" aria-label="${this._t('dashboard_year_next') || 'Nächstes Jahr'}" style="border:1px solid var(--divider-color,#d1d5db);border-radius:8px;background:var(--card-background-color,#fff);padding:4px 10px;font-size:13px;cursor:pointer;color:var(--primary-text-color,inherit);">›</button>
        </div>
      `;

      return `
        <div class="year-overview-wrap" role="region" aria-label="${escapeHtml(this._t('dashboard_widget_year_overview'))}">
          ${yearNav}
          <div class="year-months-grid">${months.join('')}</div>
          ${legend}
        </div>
      `;
    }

    _renderIcsSubscribeLink(attrs) {
      if (!attrs.ics_url) return '';
      let absoluteUrl;
      try {
        absoluteUrl = new URL(attrs.ics_url, window.location.origin).toString();
      } catch (_err) {
        return '';
      }
      const webcalUrl = absoluteUrl.replace(/^https?:\/\//, 'webcal://');
      return `
        <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          <a href="${escapeHtml(webcalUrl)}" style="font-size:0.72rem;color:var(--mc-rose-deep);text-decoration:none;font-weight:600;">
            📅 ${this._t('dashboard_ics_subscribe') || 'Kalender abonnieren'}
          </a>
          <span style="font-size:0.68rem;color:var(--secondary-text-color,#6b7280);">${this._t('dashboard_ics_hint') || '(als iCal-Feed, z. B. für Google/Apple Kalender)'}</span>
        </div>
      `;
    }

    _renderEditPanel() {
      if (!this._editMode || !this._editDraft) return '';
      const draft = this._editDraft;
      const widgetById = {};
      WIDGET_DEFS.forEach((w) => { widgetById[w.id] = w; });
      // Show widgets in their actual current order, not the fixed definition order —
      // otherwise the up/down (and now drag) reordering wouldn't visibly do anything.
      // Any widget missing from widgetOrder (e.g. newly added since the person's last
      // save) is appended at the end so it's still reachable/toggleable.
      const orderedIds = [
        ...draft.widgetOrder.filter((id) => widgetById[id]),
        ...WIDGET_DEFS.map((w) => w.id).filter((id) => !draft.widgetOrder.includes(id)),
      ];
      const rows = orderedIds.map((widgetId) => {
        const widget = widgetById[widgetId];
        const visible = draft.widgetVisibility[widget.id] !== false;
        const idx = draft.widgetOrder.indexOf(widget.id);
        const widgetLabel = this._t(widget.title);
        return `
          <div class="edit-row" data-widget-id="${widget.id}">
            <span class="edit-drag-handle" data-drag-handle="true" aria-hidden="true" title="${this._t('dashboard_drag_to_reorder') || 'Ziehen zum Sortieren'}">⠿</span>
            <label>
              <input type="checkbox" data-widget-visibility="${widget.id}" ${visible ? 'checked' : ''}
                aria-label="${this._t('dashboard_toggle_widget_aria').replace('{widget}', widgetLabel)}"/>
              ${widgetLabel}
            </label>
            <div class="edit-buttons">
              <button type="button" data-action="widget-up" data-widget="${widget.id}"
                ${idx <= 0 ? 'disabled' : ''}
                aria-label="${this._t('dashboard_move_up_aria').replace('{widget}', widgetLabel)}">↑</button>
              <button type="button" data-action="widget-down" data-widget="${widget.id}"
                ${idx >= draft.widgetOrder.length - 1 ? 'disabled' : ''}
                aria-label="${this._t('dashboard_move_down_aria').replace('{widget}', widgetLabel)}">↓</button>
            </div>
          </div>
        `;
      }).join('');

      return `
        <section class="edit-mode" aria-label="${this._t('dashboard_edit_mode')}">
          <h2>${this._t('dashboard_edit_mode')}</h2>
          <label class="toggle"><input type="checkbox" data-pref="discreetMode" ${draft.discreetMode ? 'checked' : ''}/> ${this._t('dashboard_discreet_mode')}</label>
          <label>${this._t('friendly_name')} <input type="text" data-pref="displayName" value="${escapeHtml(draft.myInfo.displayName)}"/></label>
          <label>${this._t('dashboard_pronouns')} <input type="text" data-pref="pronouns" value="${escapeHtml(draft.myInfo.pronouns)}"/></label>
          <p class="helper">${this._t('dashboard_widget_order_label')}</p>
          <div class="edit-widget-list">${rows}</div>
          <div class="edit-actions">
            <button type="button" data-action="save-edit" aria-label="${this._t('dashboard_save_aria')}">${this._t('save')}</button>
            <button type="button" data-action="cancel-edit" aria-label="${this._t('dashboard_cancel_aria')}">${this._t('cancel')}</button>
            <button type="button" data-action="reset-preset" aria-label="${this._t('dashboard_reset_aria')}">${this._t('dashboard_reset_preset')}</button>
          </div>
        </section>
      `;
    }

    _renderWidget(widgetId, stateObj, discreetMode) {
      if (this._prefs?.widgetVisibility?.[widgetId] === false) return '';
      const def = WIDGET_DEFS.find((widget) => widget.id === widgetId);
      const spanClass = `span-${def?.span || 6}`;
      let body = '';
      if (widgetId === 'kpi_strip') {
        const strip = this._renderHeroWheel(stateObj, discreetMode);
        return `<article class="card ${spanClass} card--hero" aria-label="Cycle at a glance">${strip}</article>`;
      }
      if (widgetId === 'phase_timeline') {
        const timeline = this._renderPhaseTimeline(stateObj, discreetMode);
        const mode = this._resolveContentMode(stateObj);
        const titleKey = mode === 'pregnancy' ? 'dashboard_widget_pregnancy_prediction' : (mode === 'menarche' ? 'dashboard_widget_progress' : (mode === 'menopause' ? 'dashboard_widget_menopause_timeline' : 'dashboard_widget_cycle_phase_overview'));
        return `<article class="card ${spanClass}"><h2>${this._t(titleKey)}</h2>${timeline}</article>`;
      }
      if (widgetId === 'cycle_history') body = this._renderCycleHistoryGraph(stateObj);
      if (widgetId === 'calendar_card') body = this._renderCalendarCard(stateObj);
      if (widgetId === 'product_usage') body = this._renderProductUsage(stateObj);
      if (widgetId === 'inventory_card') body = this._renderEmbeddedCardMount('inventory-card');
      if (widgetId === 'timer_card') body = this._renderEmbeddedCardMount('timer-card');
      if (widgetId === 'statistics_card') body = this._renderEmbeddedCardMount('statistics-card');
      if (widgetId === 'support_card') body = this._renderEmbeddedCardMount('support-card');
      if (widgetId === 'long_term_trend') body = this._renderLongTermTrendChart(stateObj);
      if (widgetId === 'pregnancy_prediction') body = this._renderPregnancyPredictionGraph(stateObj);
      if (widgetId === 'phase_donut') body = this._renderPhaseDonut(stateObj, discreetMode);
      if (widgetId === 'basal_temp') body = this._renderBasalTempChart(stateObj);
      if (widgetId === 'symptom_heatmap') body = this._renderSymptomHeatmap(stateObj);
      if (widgetId === 'anomaly_insights') body = this._renderAnomalyInsights(stateObj);
      if (widgetId === 'symptom_insights') body = this._renderSymptomInsights(stateObj);
      if (widgetId === 'progress_badges') body = this._renderProgressBadges(stateObj);
      if (widgetId === 'pain_mood_trend') body = this._renderPainMoodTrend(stateObj);
      if (widgetId === 'year_overview') body = this._renderYearOverview(stateObj);
      if (widgetId === 'fetal_development') body = this._renderFetalDevelopment(stateObj);

      const sensitiveClass = def?.sensitive ? 'sensitive' : '';
      const cardClasses = ['card', spanClass, sensitiveClass].filter(Boolean).join(' ');
      const title = def?.title ? this._t(def.title) : widgetId;
      return `<article class="${cardClasses}"><h2>${title}</h2>${body}</article>`;
    }

    _renderTodayPill() {
      const today = new Date();
      let formatted;
      try {
        formatted = today.toLocaleDateString(this._localeCode(), { day: 'numeric', month: 'long', year: 'numeric' });
      } catch (_err) {
        formatted = this._formatDate(this._todayIso());
      }
      return `<div class="today-pill">${escapeHtml(formatted)}</div>`;
    }

    _renderLastUpdated(stateObj) {
      if (!stateObj) return '';
      const ts = stateObj.last_updated || stateObj.last_changed;
      const formatted = this._formatDateTime(ts);
      if (!formatted) return '';
      return `<p class="helper" style="margin:2px 0 -10px;font-size:0.7rem;">${this._t('dashboard_last_updated') || 'Zuletzt aktualisiert'}: ${escapeHtml(formatted)}</p>`;
    }

    /**
     * Warns when the current logged contraception method suppresses ovulation
     * (or can) — the whole prediction system (cycle length, fertile window,
     * ovulation, 3-over-6 rule) assumes a natural, unsuppressed cycle, so those
     * predictions are unreliable while such a method is active. Also surfaces a
     * renewal reminder for methods with a known typical validity period (IUD,
     * implant, injection) as they approach their estimated due date.
     *
     * Hidden entirely in discreet mode — current contraception method is itself
     * sensitive personal info, consistent with how other identifying details
     * are suppressed there.
     */
    _renderContraceptionWarning(stateObj, discreetMode) {
      if (discreetMode) return '';
      const status = stateObj?.attributes?.contraception_status;
      if (!status || typeof status !== 'object') return '';

      const parts = [];
      if (status.is_hormonal) {
        parts.push(
          `<p style="margin:0;">⚠ ${escapeHtml(this._t('dashboard_contraception_accuracy_warning') || 'Hormonelle Verhütung kann den Eisprung unterdrücken — Zyklus- und Fruchtbarkeitsvorhersagen sind währenddessen nicht zuverlässig.')}</p>`
        );
      }
      if (status.renewal_reminder_due && status.renewal_due_date) {
        const dueLabel = this._formatDate(status.renewal_due_date);
        parts.push(
          `<p style="margin:${status.is_hormonal ? '4px' : '0'} 0 0;">🔔 ${escapeHtml(this._t('dashboard_contraception_renewal_due') || 'Verhütungsmethode könnte bald einen Wechsel benötigen')} (${escapeHtml(dueLabel)})</p>`
        );
      }
      if (!parts.length) return '';

      return `
        <div class="helper" style="margin:6px 0 0;padding:10px 12px;border-radius:10px;background:var(--mc-amber-tint,#FBEEDC);color:var(--mc-amber-deep,#8a5a12);font-size:0.78rem;">
          ${parts.join('')}
        </div>`;
    }

    _renderEntityPicker(availableEntities) {
      const entities = Array.isArray(availableEntities) ? availableEntities.filter(Boolean) : [];
      if (entities.length === 0) return '';

      if (entities.length <= 5) {
        const buttons = entities.map((entity) => {
          const entityId = String(entity?.entityId ?? '');
          const name = String(entity?.name ?? entityId ?? 'Unknown');
          if (!entityId) return '';
          const active = entityId === this._selectedEntityId;
          return `<button type="button" class="mode-btn${active ? ' active' : ''}" data-action="select-entity" data-entity-id="${escapeHtml(entityId)}" aria-pressed="${active}">${escapeHtml(name)}</button>`;
        }).filter(Boolean).join('');
        return `<div class="mode-switch" role="tablist" aria-label="${this._t('dashboard_entity_picker_aria')}">${buttons}</div>`;
      }

      const options = entities
        .map((entity) => {
          const entityId = String(entity?.entityId ?? '');
          const name = String(entity?.name ?? entityId ?? 'Unknown');
          if (!entityId) return '';
          const selected = entityId === this._selectedEntityId ? 'selected' : '';
          return `<option value="${escapeHtml(entityId)}" ${selected}>${escapeHtml(name)}</option>`;
        })
        .filter(Boolean)
        .join('');
      return `<select class="entity-picker" aria-label="${this._t('dashboard_entity_picker_aria')}">${options}</select>`;
    }

    render() {
      if (!this.shadowRoot) return;
      try {
        this._renderContent();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[menstruation-cycle] Dashboard render error:', err);
        this.shadowRoot.innerHTML = `
          <style>:host { display: block; padding: 16px; }</style>
          <main>
            <h1>Cycle Dashboard</h1>
            <p style="color:var(--error-color,#dc2626)">Dashboard failed to render. Please reload the page.</p>
          </main>
        `;
      }
    }

    _renderUnavailableState(stateObj, availableEntities) {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block; height: 100%;
            color: var(--primary-text-color, #1f2937);
            font-family: 'Inter', var(--paper-font-body1_-_font-family, sans-serif);
          }
          .mc-unavailable-page { padding: 16px; display: grid; gap: 16px; }
          .mc-unavailable-card {
            background: var(--card-background-color, #fff);
            border: 1px solid var(--divider-color, #e5e7eb);
            border-radius: 20px;
            padding: 40px 24px;
            text-align: center;
          }
          .mc-unavailable-icon { font-size: 2rem; margin-bottom: 10px; }
          .mc-unavailable-title { font-family: var(--mc-font-display, serif); font-size: 1.1rem; font-weight: 500; margin: 0 0 8px; }
          .mode-switch { display: flex; gap: 3px; background: var(--mc-sand, #f3ebe7); border: 1px solid var(--divider-color, #e5e7eb); border-radius: 999px; padding: 3px; flex-wrap: wrap; }
          .mode-btn { border: none; background: transparent; cursor: pointer; font-size: 0.78rem; font-weight: 600; color: var(--secondary-text-color, #6b7280); padding: 7px 14px; border-radius: 999px; white-space: nowrap; }
          .mode-btn.active { background: var(--card-background-color, #fff); color: var(--mc-rose-deep, #C43F5E); box-shadow: 0 1px 2px rgba(0,0,0,.08); }
          .entity-picker { border: 1px solid var(--divider-color, #d1d5db); border-radius: 999px; padding: 7px 12px; background: var(--card-background-color, #fff); color: inherit; font-size: 0.875rem; }
        </style>
        <div class="mc-unavailable-page">
          <header class="toolbar" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <h1 style="margin:0;font-size:1.25rem;">${this._t('dashboard_page_title')}</h1>
            ${this._renderEntityPicker(availableEntities)}
          </header>
          <div class="mc-unavailable-card">
            <div class="mc-unavailable-icon" aria-hidden="true">⚠️</div>
            <p class="mc-unavailable-title">${this._t('dashboard_sensor_unavailable') || 'Sensor gerade nicht verfügbar'}</p>
            <p class="helper">${this._t('dashboard_sensor_unavailable_hint') || 'Die Entity meldet aktuell "nicht verfügbar" — das passiert z. B. kurz nach einem Neustart oder während die Integration neu lädt. Meist behebt sich das von selbst innerhalb weniger Sekunden.'}</p>
          </div>
        </div>
      `;
    }

    _renderLoadingState() {
      const skeletonCards = Array.from({ length: 4 }).map((_, i) => `
        <div class="mc-skel-card" style="animation-delay:${i * 80}ms;"></div>
      `).join('');
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block; height: 100%;
            color: var(--primary-text-color, #1f2937);
            font-family: 'Inter', var(--paper-font-body1_-_font-family, sans-serif);
          }
          .mc-loading-page { padding: 16px; display: grid; gap: 16px; }
          .mc-loading-spin {
            display: flex; align-items: center; gap: 10px;
            font-size: 0.875rem; color: var(--secondary-text-color, #6b7280);
          }
          .mc-spinner {
            width: 16px; height: 16px; border-radius: 50%;
            border: 2px solid var(--divider-color, #e5e7eb);
            border-top-color: var(--mc-rose-deep, #C43F5E);
            animation: mc-spin 0.8s linear infinite;
          }
          @keyframes mc-spin { to { transform: rotate(360deg); } }
          .mc-skel-grid {
            display: grid; gap: 16px;
            grid-template-columns: repeat(12, 1fr);
          }
          @media (max-width: 900px) { .mc-skel-grid { grid-template-columns: 1fr; } }
          .mc-skel-card {
            grid-column: span 6;
            height: 140px; border-radius: 20px;
            background: linear-gradient(90deg, var(--divider-color, #e5e7eb) 25%, var(--card-background-color, #f3f4f6) 50%, var(--divider-color, #e5e7eb) 75%);
            background-size: 200% 100%;
            animation: mc-shimmer 1.4s ease-in-out infinite;
          }
          @media (max-width: 900px) { .mc-skel-card { grid-column: span 1; } }
          @keyframes mc-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
          @media (prefers-reduced-motion: reduce) {
            .mc-spinner, .mc-skel-card { animation: none; }
          }
        </style>
        <div class="mc-loading-page">
          <div class="mc-loading-spin"><span class="mc-spinner"></span><span>${this._t('dashboard_loading')}</span></div>
          <div class="mc-skel-grid">${skeletonCards}</div>
        </div>
      `;
    }

    _renderContent() {
      if (!this.shadowRoot) return;
      if (!this._hass) {
        this._renderLoadingState();
        return;
      }
      const stateObj = this._selectedEntityId ? (this._hass?.states?.[this._selectedEntityId] || null) : null;
      const availableEntities = this._availableEntities || this._getAvailableEntitiesFallback();

      if (stateObj && stateObj.state === 'unavailable') {
        this._renderUnavailableState(stateObj, availableEntities);
        return;
      }

      const discreetMode = !!this._prefs?.discreetMode;
      const mode = this._resolveContentMode(stateObj);
      let order = this._prefs?.widgetOrder || WIDGET_IDS;
      if (mode === 'pregnancy') {
        order = order.filter((id) => !['phase_donut', 'cycle_history', 'long_term_trend', 'pregnancy_prediction', 'calendar_card', 'statistics_card'].includes(id));
        if (!order.includes('fetal_development')) {
          const idx = order.indexOf('phase_timeline');
          order = idx >= 0
            ? [...order.slice(0, idx), 'fetal_development', ...order.slice(idx)]
            : [...order, 'fetal_development'];
        }
      } else if (mode === 'menarche') {
        // Before the first period there's no cycle to analyze — hide everything
        // that depends on cycle history, phases, fertility, or temperature data.
        const menarcheHidden = [
          'phase_donut', 'cycle_history', 'long_term_trend', 'pregnancy_prediction', 'basal_temp',
          'calendar_card', 'statistics_card', 'symptom_heatmap', 'anomaly_insights', 'symptom_insights', 'pain_mood_trend', 'year_overview',
          'fetal_development',
        ];
        order = order.filter((id) => !menarcheHidden.includes(id));
      } else if (mode === 'menopause') {
        // No regular cycle to analyze anymore — hide phase/fertility/temperature
        // widgets and cycle-length anomaly detection, but keep general symptom
        // tracking (heatmap, pain/mood, year overview, calendar) since sporadic
        // bleeding and symptoms are still worth logging during perimenopause.
        const menopauseHidden = [
          'phase_donut', 'cycle_history', 'long_term_trend', 'pregnancy_prediction', 'basal_temp',
          'anomaly_insights', 'fetal_development',
        ];
        order = order.filter((id) => !menopauseHidden.includes(id));
      } else if (mode === 'postpartum') {
        // No cycle to predict during the postpartum window — hide the same
        // cycle/fertility-dependent widgets as pregnancy, but keep symptom/product
        // tracking (recovery symptoms, bleeding, product usage are still relevant).
        const postpartumHidden = [
          'phase_donut', 'cycle_history', 'long_term_trend', 'pregnancy_prediction', 'basal_temp',
          'anomaly_insights', 'fetal_development', 'symptom_insights', 'statistics_card',
        ];
        order = order.filter((id) => !postpartumHidden.includes(id));
      } else {
        order = order.filter((id) => id !== 'fetal_development');
      }
      const cards = order
        .map((widgetId) => this._renderWidget(widgetId, stateObj, discreetMode))
        .filter(Boolean);

      const attrsForEmptyCheck = stateObj?.attributes || {};
      const hasAnyHistory = (Array.isArray(attrsForEmptyCheck.history) && attrsForEmptyCheck.history.length > 0)
        || (Array.isArray(attrsForEmptyCheck.grouped_starts) && attrsForEmptyCheck.grouped_starts.length > 0);
      const isFreshProfile = mode === 'cycle' && stateObj && !hasAnyHistory && !attrsForEmptyCheck.cycle_day;

      let cardHtml;
      if (isFreshProfile) {
        cardHtml = `
          <div class="empty-state mc-onboarding" role="status">
            <div class="mc-onboarding-icon" aria-hidden="true">🌱</div>
            <p class="mc-onboarding-title">${this._t('dashboard_onboarding_title') || 'Willkommen! Noch keine Daten erfasst.'}</p>
            <p class="helper">${this._t('dashboard_onboarding_hint') || 'Trage deinen ersten Zyklustag ein, um Vorhersagen, Diagramme und Auswertungen zu sehen.'}</p>
          </div>`;
      } else {
        cardHtml = cards.length
          ? cards.join('')
          : `<div class="empty-state" role="status">
              <p>${this._t('dashboard_empty_state')}</p>
              <p class="helper">${this._t('dashboard_empty_state_hint')}</p>
              <button type="button" data-action="toggle-edit">${this._t('dashboard_edit_mode')}</button>
            </div>`;
      }

      this.shadowRoot.innerHTML = `
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,600;1,9..144,500&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
          :host {
            display: block; height: 100%;
            color: var(--primary-text-color, #1f2937);
            font-family: 'Inter', var(--paper-font-body1_-_font-family, sans-serif);
            /* Base hues stay fixed (brand identity); "-deep" text variants blend toward
               --primary-text-color and "-tint" backgrounds blend toward
               --card-background-color, so both automatically adapt to the active HA
               theme (light or dark) instead of being fixed light-mode pastels. */
            --mc-rose: #E8637D;
            --mc-rose-deep: color-mix(in srgb, #C43F5E 78%, var(--primary-text-color, #000) 22%);
            --mc-rose-tint: color-mix(in srgb, var(--card-background-color, #fff) 84%, #E8637D 16%);
            --mc-plum: color-mix(in srgb, #6B3654 78%, var(--primary-text-color, #000) 22%);
            --mc-plum-tint: color-mix(in srgb, var(--card-background-color, #fff) 88%, #6B3654 12%);
            --mc-sage: #7C9885;
            --mc-sage-deep: color-mix(in srgb, #3F5A47 78%, var(--primary-text-color, #000) 22%);
            --mc-sage-tint: color-mix(in srgb, var(--card-background-color, #fff) 88%, #7C9885 12%);
            --mc-amber: #E3A23D;
            --mc-amber-deep: color-mix(in srgb, #8a5a12 78%, var(--primary-text-color, #000) 22%);
            --mc-amber-tint: color-mix(in srgb, var(--card-background-color, #fff) 88%, #E3A23D 12%);
            --mc-sand: color-mix(in srgb, var(--card-background-color, #fff) 88%, var(--mc-rose) 12%);
            --mc-font-display: 'Fraunces', serif;
            --mc-font-mono: 'IBM Plex Mono', monospace;
          }
          .page { padding: 16px; display: grid; gap: 16px; }
          .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
          .toolbar h1 { margin: 0; font-family: var(--mc-font-display); font-weight: 500; font-size: 1.4rem; letter-spacing: -0.01em; }
          .toolbar button {
            border: 1px solid var(--divider-color, #d1d5db);
            border-radius: 999px;
            background: var(--mc-sand);
            color: inherit;
            padding: 0 16px;
            height: 42px;
            box-sizing: border-box;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 600;
            transition: background 0.15s, border-color 0.15s;
          }
          .toolbar button:hover { background: var(--mc-rose-tint); border-color: var(--mc-rose); }
          .toolbar button ha-icon { --mdc-icon-size: 20px; display: block; }
          .toolbar button.icon-only { width: 42px; padding: 0; }
          .entity-picker {
            width: auto;
            border: 1px solid var(--divider-color, #d1d5db);
            border-radius: 999px;
            padding: 0 12px;
            height: 42px;
            box-sizing: border-box;
            background: var(--mc-sand);
            color: inherit;
            cursor: pointer;
            font-size: 0.875rem;
          }
          .brand { display: flex; align-items: center; gap: 14px; }
          .brand-mark { width: 38px; height: 38px; flex: none; display: block; }
          .header-right { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
          /* Pill-style entity switcher — used instead of the dropdown when there are
             5 or fewer available entities, matching the mockup's mode-switch look. */
          .mode-switch {
            display: flex; gap: 3px;
            background: var(--mc-sand);
            border: 1px solid var(--divider-color, #e5e7eb);
            border-radius: 999px;
            padding: 3px;
            height: 42px;
            box-sizing: border-box;
            flex-wrap: wrap;
            align-items: center;
          }
          .mode-btn {
            border: none; background: transparent; cursor: pointer;
            font-family: 'Inter', sans-serif; font-size: 0.78rem; font-weight: 600;
            color: var(--secondary-text-color, #6b7280);
            padding: 7px 14px;
            border-radius: 999px;
            transition: background .15s ease, color .15s ease;
            white-space: nowrap;
          }
          /* Scoped to .mode-switch specifically — this is the one context
             where .mode-btn sits inside a fixed-height (42px) container and
             needs to fill it exactly. Padding-based sizing here could
             overflow the container depending on font line-height rendering,
             so it's centered via flex instead, which isn't sensitive to
             that. The other four .mode-btn usages (chat suggestions,
             quick-log options, save button) are NOT inside a fixed-height
             parent and rely on the base class's natural padding-based
             sizing above — this override must stay scoped, not applied to
             .mode-btn globally, or those would collapse to near-zero height. */
          .mode-switch .mode-btn {
            line-height: 1;
            padding: 0 14px;
            height: 100%;
            box-sizing: border-box;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
          .mc-chat-fab-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 950;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            border: none;
            background: var(--mc-rose-deep, #C43F5E);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 16px rgba(0,0,0,0.25);
            cursor: pointer;
            transition: transform .15s ease;
          }
          .mc-chat-fab-button:hover { transform: scale(1.05); }
          .mc-chat-fab-button ha-icon { --mdc-icon-size: 26px; }
          .mc-chat-fab-panel {
            position: fixed;
            bottom: 88px;
            right: 20px;
            z-index: 950;
            width: min(400px, calc(100vw - 32px));
            max-height: min(640px, calc(100vh - 120px));
            background: var(--card-background-color, #fff);
            border-radius: 16px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.3);
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .mc-chat-fab-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 16px;
            background: var(--mc-rose-deep, #C43F5E);
            color: #fff;
            font-family: var(--mc-font-display);
            font-weight: 500;
            flex: none;
          }
          .mc-chat-fab-close {
            border: none; background: none; color: #fff;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; padding: 4px; border-radius: 50%;
          }
          .mc-chat-fab-close:hover { background: rgba(255,255,255,0.15); }
          .mc-chat-fab-disclaimer {
            display: flex; align-items: flex-start; gap: 8px;
            padding: 10px 16px;
            background: var(--mc-sand);
            border-bottom: 1px solid var(--divider-color, #e5e7eb);
            font-size: 0.72rem;
            color: var(--secondary-text-color, #6b7280);
            flex: none;
          }
          .mc-chat-fab-disclaimer ha-icon { --mdc-icon-size: 16px; flex: none; margin-top: 1px; }
          .mc-chat-fab-body {
            padding: 14px 16px;
            overflow-y: auto;
            flex: 1;
          }
          .mc-chat-fab-body .mc-chat-history { max-height: none; }
          .sym-cat-head { display: flex; align-items: center; gap: 6px; }
          .sym-cat-head ha-icon { --mdc-icon-size: 18px; color: var(--mc-rose-deep, #C43F5E); flex: none; }
          .sym-cat-head img { flex: none; }
          .mc-chat-history {
            display: flex; flex-direction: column; gap: 8px;
            max-height: 280px; overflow-y: auto;
            margin-bottom: 12px; padding-right: 4px;
          }
          .chat-bubble {
            padding: 9px 14px; border-radius: 14px;
            font-size: 0.85rem; line-height: 1.4;
            max-width: 85%;
          }
          .chat-bubble--user {
            align-self: flex-end;
            background: var(--mc-rose-tint);
            color: var(--primary-text-color, #2B1B24);
            border-bottom-right-radius: 4px;
          }
          .chat-bubble--bot {
            align-self: flex-start;
            background: var(--mc-sand);
            color: var(--primary-text-color, #2B1B24);
            border-bottom-left-radius: 4px;
          }
          .mc-modal-backdrop {
            position: fixed; inset: 0; z-index: 1000;
            background: rgba(0,0,0,0.5);
            display: flex; align-items: center; justify-content: center;
            padding: 16px;
          }
          .mc-modal {
            background: var(--card-background-color, #fff);
            border-radius: 16px;
            padding: 20px;
            max-width: 720px;
            width: 100%;
            max-height: 85vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 12px 40px rgba(0,0,0,0.25);
          }
          .mc-modal button[data-action="quick-log-close"]:not(.mode-btn) {
            border: 1px solid var(--divider-color, #d1d5db);
            border-radius: 999px;
            background: var(--card-background-color, #fff);
            color: inherit;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 0.8rem;
            font-weight: 600;
          }
          .mode-btn.active {
            background: var(--card-background-color, #fff);
            color: var(--mc-rose-deep);
            box-shadow: 0 1px 2px rgba(0,0,0,.08);
          }
          .today-pill {
            font-family: var(--mc-font-mono);
            font-size: 1rem;
            padding: 0 16px;
            height: 42px;
            box-sizing: border-box;
            display: inline-flex;
            align-items: center;
            border-radius: 999px;
            background: var(--mc-sand);
            border: 1px solid var(--divider-color, #e5e7eb);
            color: var(--secondary-text-color, #6b7280);
            white-space: nowrap;
          }
          /* Discreet-mode quick toggle — now a bordered pill matching the other
             header controls' height/color instead of floating borderless. */
          .toolbar button.discreet-toggle {
            display: flex; align-items: center; gap: 9px;
            font-size: 0.8125rem; color: var(--secondary-text-color, #6b7280);
            font-weight: 400;
            background: var(--mc-sand);
            border: 1px solid var(--divider-color, #e5e7eb);
            padding: 0 14px;
            height: 42px;
            box-sizing: border-box;
          }
          .toolbar button.discreet-toggle:hover { background: var(--mc-rose-tint); border-color: var(--mc-rose); }
          .switch {
            width: 34px; height: 20px; border-radius: 999px;
            background: var(--mc-plum-tint); position: relative;
            border: 1px solid var(--divider-color, #e5e7eb);
            flex: none;
          }
          .switch::after {
            content: ''; position: absolute; top: 2px; left: 2px;
            width: 14px; height: 14px; border-radius: 50%;
            background: var(--mc-plum); transition: left .18s ease;
          }
          .switch.on { background: var(--mc-rose-tint); }
          .switch.on::after { left: 16px; background: var(--mc-rose-deep); }
          .grid {
            display: grid;
            gap: 16px;
            grid-template-columns: repeat(12, 1fr);
          }
          @media (max-width: 900px) {
            .grid { grid-template-columns: 1fr; }
          }
          .card {
            background: var(--card-background-color, #fff);
            border: 1px solid var(--divider-color, #e5e7eb);
            border-radius: 20px;
            padding: 26px 26px 22px;
            display: grid;
            gap: 10px;
            box-shadow: 0 1px 2px rgba(43,27,36,.04), 0 8px 24px -14px rgba(43,27,36,.22);
            transition: box-shadow 0.15s;
            grid-column: span 12;
          }
          .card:hover { box-shadow: 0 2px 8px rgba(43,27,36,.08), 0 12px 28px -12px rgba(43,27,36,.16); }
          .card h2 {
            margin: 0;
            font-size: 0.9375rem;
            font-weight: 600;
            color: var(--primary-text-color, #1f2937);
            letter-spacing: -0.005em;
          }
          .span-4 { grid-column: span 4; }
          .span-5 { grid-column: span 5; }
          .span-6 { grid-column: span 6; }
          .span-7 { grid-column: span 7; }
          .span-8 { grid-column: span 8; }
          .span-12 { grid-column: span 12; }
          @media (max-width: 900px) {
            .span-4, .span-5, .span-6, .span-7, .span-8, .span-12 { grid-column: span 1; }
          }
          /* Hero card */
          .card--hero { padding: 26px 26px 22px; }
          .hero-layout { display: grid; grid-template-columns: 280px 1fr; gap: 8px; align-items: center; }
          @media (max-width: 920px) { .hero-layout { grid-template-columns: 1fr; justify-items: center; text-align: center; } }
          .hero-wheel-holder { position: relative; width: 280px; height: 280px; flex: none; }
          @media (max-width: 920px) { .hero-wheel-holder { width: 220px; height: 220px; } }
          .hero-wheel-center {
            position: absolute; inset: 0; display: flex; flex-direction: column;
            align-items: center; justify-content: center; text-align: center;
          }
          .hero-wheel-center .hw-num { font-family: var(--mc-font-display); font-size: 34px; font-weight: 500; line-height: 1; color: var(--mc-rose-deep); }
          .hero-wheel-center .hw-sub { font-family: var(--mc-font-mono); font-size: 10px; letter-spacing: .04em; color: var(--secondary-text-color,#6b7280); margin-top: 3px; }
          .hero-wheel-center .hw-tag { margin-top: 8px; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 999px; background: var(--mc-sage-tint); color: var(--mc-sage-deep); }
          .kpi-strip {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            align-items: stretch;
          }
          .kpi-item {
            display: flex;
            flex-direction: column;
            gap: 3px;
            padding: 12px 14px;
            border-radius: 14px;
            background: var(--mc-sand);
            border: 1px solid var(--divider-color, #e5e7eb);
            min-width: 96px;
            flex: 1 1 96px;
          }
          .kpi-item.mc-rose { background: var(--mc-rose-tint); }
          .kpi-item.mc-plum { background: var(--mc-plum-tint); }
          .kpi-icon { font-size: 1.1rem; line-height: 1; }
          .kpi-value {
            font-family: var(--mc-font-display);
            font-size: 1.5rem;
            font-weight: 500;
            color: var(--primary-text-color, #1f2937);
            line-height: 1.15;
          }
          .kpi-item.mc-rose .kpi-value { color: var(--mc-rose-deep); }
          .kpi-item.mc-plum .kpi-value { color: var(--mc-plum); }
          .kpi-label {
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: .04em;
            color: var(--secondary-text-color, #6b7280);
            line-height: 1.2;
          }
          /* Hero stat tiles (3-up) + confidence bars, matching the original mockup */
          .stat-stack {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }
          @media (max-width: 640px) {
            .stat-stack { grid-template-columns: 1fr; }
          }
          .stat {
            padding: 18px 18px 16px;
            border-radius: 16px;
            background: var(--mc-sand);
          }
          .stat .stat-label {
            font-size: 11.5px; color: var(--secondary-text-color, #6b7280);
            text-transform: uppercase; letter-spacing: .06em;
            margin-bottom: 8px;
          }
          .stat .stat-value {
            font-family: var(--mc-font-display); font-size: 28px; font-weight: 500;
            color: var(--primary-text-color, #1f2937); line-height: 1.1;
          }
          .stat .stat-value small { font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; color: var(--secondary-text-color, #6b7280); }
          .stat .stat-foot { font-size: 12px; color: var(--secondary-text-color, #6b7280); margin-top: 6px; }
          .stat.mc-rose { background: var(--mc-rose-tint); }
          .stat.mc-rose .stat-value { color: var(--mc-rose-deep); }
          .stat.mc-plum { background: var(--mc-plum-tint); }
          .stat.mc-plum .stat-value { color: var(--mc-plum); }
          .confidence-row {
            display: flex; align-items: center; gap: 14px; padding: 10px 4px;
            flex-wrap: wrap;
          }
          .confidence-row .confidence-label-col { flex: 0 0 auto; min-width: 130px; }
          .confidence-row .stat-label { margin-bottom: 1px; }
          .confidence-row .stat-foot { margin-top: 1px; }
          .confidence-bar {
            flex: 1 1 100px; min-width: 60px; height: 6px; border-radius: 999px;
            background: var(--divider-color, #e5e7eb); overflow: hidden;
          }
          .confidence-bar span {
            display: block; height: 100%; border-radius: 999px;
            background: linear-gradient(90deg, var(--mc-sage), var(--mc-sage-deep, #3F5A47));
          }
          .confidence-row .confidence-pct {
            font-family: var(--mc-font-mono); font-size: 0.8rem;
            color: var(--secondary-text-color, #6b7280); flex: 0 0 auto; min-width: 34px; text-align: right;
          }
          /* Status icon badge on the hero wheel — deliberately outside the ring's
             center content (not overlapping the day number/label), small by default,
             growing on hover for anyone using a mouse without needing it enlarged. */
          .hero-status-badge {
            position: absolute; top: 2px; right: 2px;
            width: 30px; height: 30px; border-radius: 50%;
            background: var(--card-background-color, #fff);
            border: 1px solid var(--divider-color, #e5e7eb);
            display: flex; align-items: center; justify-content: center;
            overflow: hidden; cursor: default;
            transition: transform 0.15s ease, width 0.15s ease, height 0.15s ease;
            z-index: 2;
          }
          .hero-status-badge:hover {
            width: 64px; height: 64px; transform: translate(6px, -6px);
            box-shadow: 0 4px 14px rgba(0,0,0,0.18);
          }
          /* Phase timeline / overview */
          .phase-timeline-wrap {
            width: 100%;
            overflow: visible;
            padding: 8px 0 4px;
          }
          .phase-overview-wrap {
            width: 100%;
            overflow-x: auto;
            padding: 8px 0 4px;
          }
          .trend-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 2px;
          }
          .trend-chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 20px;
            background: var(--mc-sand);
            border: 1px solid var(--divider-color, #e5e7eb);
            font-size: 0.8125rem;
            color: var(--secondary-text-color, #4b5563);
            position: relative;
            overflow: hidden;
          }
          .trend-chip strong { color: var(--primary-text-color, #1f2937); font-weight: 600; }
          .trend-chip__bar {
            display: block;
            position: absolute;
            left: 0; top: 0; bottom: 0;
            width: var(--p, 0%);
            background: var(--primary-color, #2563eb);
            opacity: 0.12;
            border-radius: 20px;
            pointer-events: none;
          }
          .kv { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px solid var(--divider-color, #f3f4f6); }
          .kv:last-child { border-bottom: none; }
          .kv span { font-size: 0.875rem; color: var(--secondary-text-color, #4b5563); }
          .kv strong { font-size: 0.875rem; font-weight: 600; }
          .helper { font-size: .85rem; color: var(--secondary-text-color, #6b7280); line-height: 1.5; }
          .quick-log { display: grid; gap: 10px; }
          label { font-size: 0.875rem; color: var(--secondary-text-color, #4b5563); display: grid; gap: 4px; }
          select, input[type="text"], textarea {
            width: 100%;
            box-sizing: border-box;
            border: 1px solid var(--divider-color, #d1d5db);
            border-radius: 8px;
            padding: 7px 10px;
            background: var(--card-background-color, #fff);
            color: var(--primary-text-color, #1f2937);
            font-size: 0.875rem;
            transition: border-color 0.15s;
          }
          select:hover, input[type="text"]:hover, textarea:hover { border-color: var(--primary-color, #2563eb); }
          .quick-log button[type="submit"] {
            border: none;
            border-radius: 10px;
            background: var(--primary-color, #2563eb);
            color: #fff;
            padding: 9px 16px;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 600;
            transition: opacity 0.15s;
          }
          .quick-log button[type="submit"]:disabled { opacity: 0.55; cursor: not-allowed; }
          button:focus-visible, select:focus-visible, input:focus-visible, textarea:focus-visible { outline: 2px solid var(--primary-color, #2563eb); outline-offset: 2px; }
          .edit-mode {
            border: 1px dashed var(--divider-color, #d1d5db);
            border-radius: 16px;
            padding: 16px;
            display: grid;
            gap: 10px;
            background: var(--secondary-background-color, #f9fafb);
          }
          .edit-mode h2 { margin: 0; font-size: 1rem; font-weight: 600; }
          .edit-widget-list { position: relative; }
          .edit-row {
            display: flex; justify-content: space-between; gap: 8px; align-items: center;
            padding: 6px 0; border-bottom: 1px solid var(--divider-color, #f3f4f6);
            background: var(--card-background-color, #fff);
          }
          .edit-row:last-of-type { border-bottom: none; }
          .edit-row label { display: flex; align-items: center; gap: 8px; font-size: 0.875rem; cursor: pointer; flex: 1; min-width: 0; }
          .edit-drag-handle {
            flex: none; cursor: grab; font-size: 16px; line-height: 1;
            color: var(--secondary-text-color, #9ca3af); padding: 4px 6px;
            touch-action: none; user-select: none; -webkit-user-select: none;
          }
          .edit-row.dragging {
            opacity: 0.85; box-shadow: 0 4px 14px rgba(0,0,0,0.15); border-radius: 10px;
            position: relative; z-index: 5; cursor: grabbing;
          }
          .edit-row.dragging .edit-drag-handle { cursor: grabbing; }
          .edit-buttons { display: flex; gap: 6px; }
          .edit-buttons button {
            border: 1px solid var(--divider-color, #d1d5db);
            border-radius: 8px;
            background: var(--card-background-color, #fff);
            color: inherit;
            padding: 4px 10px;
            cursor: pointer;
            font-size: 1rem;
            line-height: 1;
          }
          .edit-buttons button:disabled { opacity: 0.35; cursor: not-allowed; }
          .edit-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px; }
          .edit-actions button {
            border: 1px solid var(--divider-color, #d1d5db);
            border-radius: 10px;
            background: var(--card-background-color, #fff);
            color: inherit;
            padding: 8px 14px;
            cursor: pointer;
            font-size: 0.875rem;
          }
          .edit-actions button:first-child { background: var(--primary-color, #2563eb); color: #fff; border-color: transparent; font-weight: 600; }
          .empty-state { text-align: center; padding: 32px 16px; }
          .empty-state p { margin: 0 0 8px; }
          .mc-onboarding {
            grid-column: 1 / -1;
            background: var(--card-background-color, #fff);
            border: 1px solid var(--divider-color, #e5e7eb);
            border-radius: 20px;
            padding: 48px 24px;
          }
          .mc-onboarding-icon { font-size: 2.5rem; margin-bottom: 12px; }
          .mc-onboarding-title {
            font-family: var(--mc-font-display, serif);
            font-size: 1.25rem; font-weight: 500;
            color: var(--mc-rose-deep, #C43F5E);
            margin: 0 0 8px;
          }
          .empty-state button {
            border: 1px solid var(--divider-color, #d1d5db);
            border-radius: 10px;
            background: var(--card-background-color, #fff);
            color: inherit;
            padding: 9px 16px;
            cursor: pointer;
            margin-top: 8px;
            font-size: 0.875rem;
          }
          .message { min-height: 1.4rem; font-size: .875rem; color: var(--secondary-text-color, #4b5563); }
          ul { margin: 4px 0 0; padding: 0 0 0 18px; }
          ul li { font-size: 0.875rem; padding: 3px 0; }
          /* Statistics card native layout */
          .stats-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }
          .stat-tile {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 3px;
            padding: 12px 14px;
            border-radius: 14px;
            background: var(--mc-sand);
            border: 1px solid var(--divider-color, #e5e7eb);
            min-width: 76px;
            flex: 1 1 76px;
          }
          .stat-icon { font-size: 1rem; line-height: 1; }
          .stat-value { font-family: var(--mc-font-display); font-size: 1.3rem; font-weight: 500; color: var(--mc-rose-deep); }
          .stat-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: .03em; color: var(--secondary-text-color, #6b7280); text-align: center; }
          /* Cycle history graph */
          .cycle-history-wrap { width: 100%; }
          .cycle-history-legend {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 6px;
            font-size: 0.75rem;
            color: var(--secondary-text-color, #6b7280);
          }
          .legend-dot {
            display: inline-block;
            width: 10px; height: 10px;
            border-radius: 50%;
            flex-shrink: 0;
          }
          .legend-dash {
            display: inline-block;
            width: 16px; height: 3px;
            border-radius: 2px;
            flex-shrink: 0;
          }
          /* Pregnancy prediction graph */
          .pred-wrap { width: 100%; }
          .pred-meta {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 6px;
          }
          .pred-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 20px;
            background: var(--secondary-background-color, #f3f4f6);
            border: 1px solid var(--divider-color, #e5e7eb);
            font-size: 0.75rem;
            color: var(--secondary-text-color, #4b5563);
          }
          .pred-disclaimer {
            margin: 6px 0 0;
            font-style: italic;
          }
          /* Phase donut */
          .phase-donut-wrap {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
          }
          .phase-donut-legend {
            display: flex;
            flex-direction: column;
            gap: 6px;
            flex: 0 0 auto;
          }
          /* Basal temperature */
          .bbt-wrap { width: 100%; }
          /* Symptom heatmap fallback */
          /* Anomaly insights */
          .anomaly-list {
            display: grid;
            gap: 10px;
          }
          .anomaly-item {
            display: flex;
            gap: 12px;
            align-items: flex-start;
            padding: 12px 14px;
            border-radius: 14px;
            background: var(--mc-sand);
            border: 1px solid var(--divider-color, #e5e7eb);
          }
          .anomaly-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; flex: none; background: var(--mc-sage); }
          .anomaly-item.alert .anomaly-dot { background: var(--mc-rose-deep); }
          .anomaly-body { flex: 1; }
          .anomaly-tag {
            font-family: var(--mc-font-mono);
            font-size: 10px; text-transform: uppercase; letter-spacing: .06em;
            color: var(--secondary-text-color, #6b7280); display: block; margin-bottom: 3px;
          }
          .anomaly-text { margin: 0; font-size: 0.8125rem; line-height: 1.45; }
          /* Pain & mood trend */
          .pain-mood-wrap { width: 100%; }
          .calendar-card-mount { width: 100%; min-height: 40px; }
          .calendar-card-mount ha-card { box-shadow: none; border: none; background: transparent; }
          /* Year overview */
          .year-overview-wrap { width: 100%; }
          .year-months-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 18px 20px;
          }
          @media (max-width: 700px) {
            .year-months-grid { grid-template-columns: repeat(2, 1fr); }
          }
          @media (max-width: 420px) {
            .year-months-grid { grid-template-columns: 1fr; }
          }
          .year-month {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .year-month-label {
            font-family: var(--mc-font-mono);
            font-size: 0.7rem;
            color: var(--secondary-text-color, #6b7280);
            white-space: nowrap;
          }
          .year-month-days {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 3px;
          }
          .year-day-cell {
            aspect-ratio: 1 / 1;
            border-radius: 3px;
            min-width: 10px;
          }
          @media (max-width: 480px) {
            .page { padding: 10px; gap: 10px; }
            .grid { grid-template-columns: 1fr; gap: 10px; }
            .kpi-strip { gap: 8px; }
            .kpi-item { min-width: 60px; padding: 8px 10px; }
          }
          @media (prefers-reduced-motion: reduce) {
            * { transition: none !important; animation: none !important; }
          }
        </style>
        <main class="page">
          <header class="toolbar">
            <div class="brand">
              <img src="/menstruation_cycle/assets/brands/calendar.svg" class="brand-mark" alt="" width="38" height="38" loading="lazy" onerror="this.style.display='none';"/>
              <h1>${this._t('dashboard_page_title')}</h1>
            </div>
            <div class="header-right">
              ${this._renderEntityPicker(availableEntities)}
              ${this._renderTodayPill()}
              ${!this._editMode ? `
                <button type="button" class="discreet-toggle" data-action="toggle-discreet-quick" role="switch" aria-checked="${discreetMode}" aria-label="${discreetMode ? (this._t('dashboard_discreet_quick_off_aria') || 'Diskreten Modus ausschalten') : (this._t('dashboard_discreet_quick_on_aria') || 'Diskreten Modus einschalten')}">
                  <span>${this._t('dashboard_discreet_mode')}</span>
                  <div class="switch${discreetMode ? ' on' : ''}"></div>
                </button>` : ''}
              ${!this._editMode ? `<button type="button" data-action="open-quick-log" aria-label="${this._t('dashboard_log_today') || 'Heute loggen'}">${this._t('dashboard_log_today') || 'Heute loggen'}</button>` : ''}
              ${!this._editMode ? `<button type="button" class="icon-only" data-action="toggle-edit" aria-label="${this._t('dashboard_edit_mode')}" title="${this._t('dashboard_edit_mode')}"><ha-icon icon="mdi:pencil"></ha-icon></button>` : ''}
            </div>
          </header>
          ${this._renderLastUpdated(stateObj)}
          ${this._renderContraceptionWarning(stateObj, discreetMode)}
          ${this._message ? `<div class="message" aria-live="polite">${escapeHtml(this._message)}</div>` : ''}
          ${this._renderEditPanel()}
          ${this._renderQuickLogModal(stateObj)}
          ${this._renderChatFab(stateObj)}
          <section class="grid" aria-label="${this._t('dashboard_page_title')}">${cardHtml}</section>
        </main>
      `;
      this._mountEmbeddedCards();
    }

    /**
     * Attaches real Lovelace-style child card elements to their mount-point
     * placeholders via DOM APIs. These cards require `.hass` and `.setConfig()` to
     * be assigned as JS properties — they have no HTML-attribute fallback — so they
     * cannot be embedded as innerHTML strings. Runs after every render() since the
     * whole shadow DOM is rebuilt each time.
     */
    _mountEmbeddedCards() {
      if (!this._hass) return;
      const stateObj = this._selectedEntityId ? this._hass.states?.[this._selectedEntityId] : null;
      const profile = stateObj?.attributes?.profile;

      const mounts = [
        {
          selector: '[data-mount="calendar-card"]', tag: 'menstruation-calendar-card',
          config: () => (this._selectedEntityId ? { entity: this._selectedEntityId } : null),
        },
        {
          selector: '[data-mount="heatmap-card"]', tag: 'menstruation-cycle-heatmap-card',
          config: () => (this._selectedEntityId ? { entity: this._selectedEntityId } : null),
        },
        {
          // Entity is now optional-but-used: powers the age-aware reassurance card
          // and the kit-check proximity badge when available, while everything else
          // in this card (glossary, hygiene guides, other reassurance topics) stays
          // general educational content independent of any specific profile's data.
          selector: '[data-mount="support-card"]', tag: 'menstruation-support-card',
          config: () => (this._selectedEntityId ? { entity: this._selectedEntityId } : {}),
        },
        {
          // Household-wide inventory; defaults to the fixed global stock entity, so
          // no per-profile entity is needed here either.
          selector: '[data-mount="inventory-card"]', tag: 'menstruation-product-inventory-card',
          config: () => ({}),
        },
        {
          // The countdown timer is keyed to a *different* entity than the main
          // profile sensor: menstruation_cycle_timer.{profile}, set up by the
          // save_timer_state service.
          selector: '[data-mount="timer-card"]', tag: 'menstruation-countdown-timer',
          config: () => (profile ? { entity: `menstruation_cycle_timer.${profile}` } : null),
        },
        {
          selector: '[data-mount="statistics-card"]', tag: 'menstruation-statistics-card',
          config: () => (this._selectedEntityId ? { entity: this._selectedEntityId } : null),
        },
      ];

      mounts.forEach(({ selector, tag, config }) => {
        const host = this.shadowRoot?.querySelector(selector);
        if (!host || typeof customElements === 'undefined' || !customElements.get(tag)) return;
        const cfg = config();
        if (cfg === null) return;
        try {
          const el = document.createElement(tag);
          el.setConfig(cfg);
          el.hass = this._hass;
          host.innerHTML = '';
          host.appendChild(el);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(`[menstruation-cycle] Failed to mount ${tag}:`, err);
        }
      });
    }
  }

  if (!customElements.get('menstruation-cycle-dashboard-panel')) {
    customElements.define('menstruation-cycle-dashboard-panel', MenstruationCycleDashboardPanel);
  }
})();
