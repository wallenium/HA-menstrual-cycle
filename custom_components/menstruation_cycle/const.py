"""Constants for the menstruation gauge integration."""

from __future__ import annotations

DOMAIN = "menstruation_cycle"
PLATFORMS = ["sensor"]

STORAGE_VERSION = 1
STORAGE_KEY = "menstruation_cycle.history"
STORAGE_KEY_LEGACY = "menstruation_gauge.history"

CONF_NAME = "name"
CONF_PROFILE = "profile"
CONF_FRIENDLY_NAME = "friendly_name"
CONF_ICON = "icon"
CONF_PERIOD_DURATION_DAYS = "period_duration_days"
CONF_BIRTH_DATE = "birth_date"
CONF_PREGNANCY_ENABLED = "pregnancy_enabled"
CONF_PREGNANCY_START_DATE = "pregnancy_start_date"
CONF_PREGNANCY_HIGH_RISK = "pregnancy_high_risk"
CONF_PREGNANCY_RISK_NOTES = "pregnancy_risk_notes"
CONF_POSTPARTUM_ENABLED = "postpartum_enabled"
CONF_POSTPARTUM_START_DATE = "postpartum_start_date"
CONF_POSTPARTUM_DURATION_DAYS = "postpartum_duration_days"
CONF_PRE_MENARCHE_ENABLED = "pre_menarche_enabled"
CONF_ESTIMATED_MENARCHE_DATE = "estimated_menarche_date"
CONF_FAMILY_MENARCHE_AGE = "family_menarche_age"
CONF_MENOPAUSE_ENABLED = "menopause_enabled"
CONF_MENOPAUSE_START_DATE = "menopause_start_date"
CONF_CYCLE_LENGTH_OVERRIDE = "cycle_length_override"
CONF_NUM_PREDICTIONS = "num_predictions"
CONF_NFP_ANALYSIS_MODE = "nfp_analysis_mode"
CONF_ONBOARDING_STAGE = "onboarding_stage"
CONF_SHOW_CYCLE_DASHBOARD = "show_cycle_dashboard"
CONF_CYCLE_DASHBOARD_DEFAULT_PAGE = "cycle_dashboard_default_page"
CONF_DASHBOARD_DISCREET_MODE = "dashboard_discreet_mode"
CONF_DASHBOARD_WIDGETS = "dashboard_widgets"

# New canonical dashboard option keys (preferred; old keys kept for backward compat)
CONF_DASHBOARD_ENABLED = "dashboard_enabled"
CONF_NOTIFICATIONS_ENABLED = "notifications_enabled"
CONF_NOTIFY_SERVICE = "notify_service"
DEFAULT_NOTIFICATIONS_ENABLED = False
CONF_DASHBOARD_DEFAULT_LANDING = "dashboard_default_landing"

# Default widget visibility keys and their defaults (all enabled by default)
DASHBOARD_WIDGET_KEYS: list[str] = [
    "quick_log",
    "today_status",
    "upcoming_window",
    "reminders",
    "progress",
]

DEFAULT_DASHBOARD_ENABLED: bool = False
DEFAULT_DASHBOARD_DISCREET_MODE: bool = True
DEFAULT_DASHBOARD_DEFAULT_LANDING: bool = False
DEFAULT_DASHBOARD_WIDGETS: dict[str, bool] = {key: True for key in DASHBOARD_WIDGET_KEYS}

ONBOARDING_STAGE_PRE_MENARCHE = "pre_menarche"
ONBOARDING_STAGE_EARLY_MENARCHE = "early_menarche"
ONBOARDING_STAGE_ESTABLISHED_CYCLE = "established_cycle"
ONBOARDING_STAGES = [
    ONBOARDING_STAGE_PRE_MENARCHE,
    ONBOARDING_STAGE_EARLY_MENARCHE,
    ONBOARDING_STAGE_ESTABLISHED_CYCLE,
]
DEFAULT_ONBOARDING_STAGE = ONBOARDING_STAGE_ESTABLISHED_CYCLE

DEFAULT_NAME = "Menstruation"
DEFAULT_PERIOD_DURATION_DAYS = 5
DEFAULT_CYCLE_LENGTH = 28
DEFAULT_NUM_PREDICTIONS = 6
MAX_NUM_PREDICTIONS = 12
CYCLE_LENGTH_OVERRIDE_MIN = 20
CYCLE_LENGTH_OVERRIDE_MAX = 38
DEFAULT_NFP_ANALYSIS_MODE = "hybrid"
NFP_ANALYSIS_MODES = ["hybrid", "strict"]

ATTR_HISTORY = "history"
ATTR_SYMPTOM_HISTORY = "symptom_history"
ATTR_PRODUCT_USAGE = "product_usage"
ATTR_GROUPED_STARTS = "grouped_starts"
ATTR_BLEEDING_BLOCKS = "bleeding_blocks"
ATTR_NEXT_PREDICTED_START = "next_predicted_start"
ATTR_PREDICTED_CYCLE_STARTS = "predicted_cycle_starts"
ATTR_AVG_CYCLE_LENGTH = "avg_cycle_length"
ATTR_FERTILE_WINDOW_START = "fertile_window_start"
ATTR_FERTILE_WINDOW_END = "fertile_window_end"
ATTR_OVULATION_DAY = "ovulation_day"
ATTR_DAYS_UNTIL_NEXT_START = "days_until_next_start"
ATTR_PERIOD_DURATION_DAYS = "period_duration_days"
ATTR_IS_PREGNANT = "is_pregnant"
ATTR_PREGNANCY_START_DATE = "pregnancy_start_date"
ATTR_WEEKS_PREGNANT = "weeks_pregnant"
ATTR_DUE_DATE = "due_date"
ATTR_PREGNANCY_DATA = "pregnancy_data"
ATTR_PREGNANCY_HIGH_RISK = "pregnancy_high_risk"
ATTR_PREGNANCY_RISK_NOTES = "pregnancy_risk_notes"
ATTR_BIRTH_DATE = "birth_date"
ATTR_AWAITING_MENARCHE = "awaiting_menarche"
ATTR_ESTIMATED_MENARCHE_DATE = "estimated_menarche_date"
ATTR_DAYS_UNTIL_MENARCHE = "days_until_menarche"
ATTR_MENARCHE_ESTIMATE_SOURCE = "menarche_estimate_source"
ATTR_MENARCHE_ESTIMATE_SIGN = "menarche_estimate_sign"
ATTR_MENARCHE_ESTIMATE_CORROBORATED = "menarche_estimate_corroborated"
ATTR_MENARCHE_ESTIMATE_ANCHOR_DATE = "menarche_estimate_anchor_date"
ATTR_AGE_AT_TRACKING = "age_at_tracking"
ATTR_FAMILY_MENARCHE_AGE = "family_menarche_age"
ATTR_PRE_MENARCHE_DATA = "pre_menarche_data"
ATTR_MENOPAUSE_DATA = "menopause_data"
ATTR_IS_POSTPARTUM = "is_postpartum"
ATTR_POSTPARTUM_DATA = "postpartum_data"
ATTR_POSTPARTUM_DURATION = "postpartum_duration"
ATTR_NFP_ANALYSIS = "nfp_analysis"
ATTR_PERIOD_FORECAST = "period_forecast"
ATTR_FERTILITY_FORECAST = "fertility_forecast"
ATTR_PREDICTION_DAY_CONFIDENCE = "prediction_day_confidence"
ATTR_ONBOARDING_STAGE = "onboarding_stage"
ATTR_ONBOARDING_STAGE_EFFECTIVE = "onboarding_stage_effective"
ATTR_LEARNING_PHASE = "learning_phase"
ATTR_PREDICTION_GATING = "prediction_gating"

SERVICE_ADD_CYCLE_START = "add_cycle_start"
SERVICE_REMOVE_CYCLE_START = "remove_cycle_start"
SERVICE_SET_CYCLE_HISTORY = "set_cycle_history"
SERVICE_SET_PERIOD_DURATION = "set_period_duration"
SERVICE_ERASE_ALL_HISTORY = "erase_all_history"
SERVICE_EXPORT_HISTORY = "export_history"
SERVICE_REFRESH_CYCLE_MODEL = "refresh_cycle_model"
SERVICE_LOG_PRODUCT_USAGE = "log_product_usage"
SERVICE_REIMPORT_BASAL_TEMP_STATS = "reimport_basal_temp_statistics"
SERVICE_MANAGE_HOUSEHOLD_INVENTORY = "manage_household_inventory"
SERVICE_ADD_SYMPTOM = "add_symptom"
SERVICE_REMOVE_SYMPTOM = "remove_symptom"
SERVICE_GET_SYMPTOM = "get_symptom"
SERVICE_GET_FULL_HISTORY = "get_full_history"
SERVICE_GET_CYCLE_PREDICTIONS = "get_cycle_predictions"
SERVICE_SET_PREGNANCY_MODE = "set_pregnancy_mode"
SERVICE_UPDATE_PREGNANCY_DATE = "update_pregnancy_date"
SERVICE_SET_MENARCHE_MODE = "set_menarche_mode"
SERVICE_UPDATE_MENARCHE_DATE = "update_menarche_date"
SERVICE_LOG_FIRST_PERIOD = "log_first_period"
SERVICE_GET_MENARCHE_INFO = "get_menarche_info"
SERVICE_ADD_PRE_MENARCHE_SIGN = "add_pre_menarche_sign"
SERVICE_REMOVE_PRE_MENARCHE_SIGN = "remove_pre_menarche_sign"
SERVICE_SET_MENOPAUSE_MODE = "set_menopause_mode"
SERVICE_UPDATE_MENOPAUSE_DATE = "update_menopause_date"
SERVICE_SAVE_TIMER_STATE = "save_timer_state"
SERVICE_EXPORT_DOCTOR_REPORT = "export_doctor_report"

SERVICE_FIELD_DATE = "date"
SERVICE_FIELD_DATES = "dates"
SERVICE_FIELD_DAYS = "days"
SERVICE_FIELD_ERASE_ALL = "erase_all"
SERVICE_FIELD_FORMAT = "format"
SERVICE_FIELD_FILENAME = "filename"
SERVICE_FIELD_PROFILE = "profile"
SERVICE_FIELD_ENTRY_ID = "entry_id"
SERVICE_FIELD_ENTITY_ID = "entity_id"
SERVICE_FIELD_SYMPTOM_DATA = "symptom_data"
SERVICE_FIELD_PRODUCT = "product"
SERVICE_FIELD_QUANTITY = "quantity"
SERVICE_FIELD_ACTION = "action"
SERVICE_FIELD_IS_PREGNANT = "is_pregnant"
SERVICE_FIELD_PREGNANCY_START_DATE = "pregnancy_start_date"
SERVICE_FIELD_ESTIMATED_MENARCHE_DATE = "estimated_menarche_date"
SERVICE_FIELD_FAMILY_MENARCHE_AGE = "family_menarche_age"
SERVICE_FIELD_PRE_MENARCHE_SIGN = "pre_menarche_sign"
SERVICE_FIELD_TANNER_STAGE = "tanner_stage"
SERVICE_FIELD_IS_MENOPAUSE = "is_menopause"
SERVICE_FIELD_MENOPAUSE_START_DATE = "menopause_start_date"
SERVICE_FIELD_INVENTORY_ACTION = "inventory_action"
SERVICE_FIELD_WARNING_THRESHOLD = "warning_threshold"
SERVICE_FIELD_CRITICAL_THRESHOLD = "critical_threshold"
SERVICE_FIELD_MEMBER = "member"
SERVICE_FIELD_DAYS_BACK = "days_back"
SERVICE_FIELD_FUTURE_CYCLES = "future_cycles"
SERVICE_FIELD_PATIENT_NAME = "patient_name"
SERVICE_FIELD_PATIENT_BIRTHDATE = "patient_birthdate"
SERVICE_FIELD_LANGUAGE = "language"
SERVICE_FIELD_INCLUDE_CHARTS = "include_charts"

SIGNAL_HISTORY_UPDATED = "menstruation_cycle_history_updated"

# ICS / iCalendar feed
ATTR_ICS_URL = "ics_url"
ICS_TOKEN_KEY = "ics_token"
ICS_HORIZON_MONTHS_DEFAULT = 12
ICS_HORIZON_MONTHS_MAX = 24

STATE_PERIOD = "period"
STATE_FERTILE = "fertile"
STATE_PMS = "pms"
STATE_NEUTRAL = "neutral"
STATE_PREGNANT = "pregnant"
STATE_PRE_MENARCHE = "pre_menarche"
STATE_MENARCHE = "menarche"
STATE_MENOPAUSE = "menopause"
STATE_POSTPARTUM = "postpartum"

# Symptom field definitions
SYMPTOM_BLEEDING_STRENGTH = "bleeding_strength"
SYMPTOM_SPOTTING = "spotting"
SYMPTOM_DISCHARGE = "discharge"
SYMPTOM_INTERCOURSE = "intercourse"
SYMPTOM_PAIN = "pain"
SYMPTOM_BASAL_TEMP = "basal_temp"
SYMPTOM_HYGIENE = "hygiene"
SYMPTOM_TEST = "test"
SYMPTOM_CERVICAL_MUCUS = "cervical_mucus"
SYMPTOM_SMELL = "smell"
SYMPTOM_CLOTS = "clots"
SYMPTOM_CLOT_SIZE = "clot_size"
SYMPTOM_BLEEDING_TYPE = "bleeding_type"
SYMPTOM_CERVIX_POSITION = "cervix_position"
SYMPTOM_CERVIX_TEXTURE = "cervix_texture"
SYMPTOM_LIBIDO = "libido"
SYMPTOM_TRAINING_INTENSITY = "training_intensity"
SYMPTOM_PREGNANCY = "pregnancy_symptoms"
SYMPTOM_CONTRACEPTION_METHOD = "contraception_method"

# Contraception methods and their properties. "none" means explicitly no
# contraception logged (distinct from never having logged anything at all).
CONTRACEPTION_METHOD_NONE = "none"
CONTRACEPTION_METHOD_PILL = "pill"
CONTRACEPTION_METHOD_HORMONAL_IUD = "hormonal_iud"
CONTRACEPTION_METHOD_COPPER_IUD = "copper_iud"
CONTRACEPTION_METHOD_IMPLANT = "implant"
CONTRACEPTION_METHOD_PATCH = "patch"
CONTRACEPTION_METHOD_RING = "ring"
CONTRACEPTION_METHOD_INJECTION = "injection"
CONTRACEPTION_METHOD_CONDOM = "condom"
CONTRACEPTION_METHOD_OTHER = "other"

CONTRACEPTION_METHODS = [
    CONTRACEPTION_METHOD_NONE,
    CONTRACEPTION_METHOD_PILL,
    CONTRACEPTION_METHOD_HORMONAL_IUD,
    CONTRACEPTION_METHOD_COPPER_IUD,
    CONTRACEPTION_METHOD_IMPLANT,
    CONTRACEPTION_METHOD_PATCH,
    CONTRACEPTION_METHOD_RING,
    CONTRACEPTION_METHOD_INJECTION,
    CONTRACEPTION_METHOD_CONDOM,
    CONTRACEPTION_METHOD_OTHER,
]

# Hormonal methods suppress ovulation (or can), making cycle/fertility
# predictions built on the assumption of a natural cycle unreliable — the
# dashboard shows an accuracy warning while one of these is the current method.
CONTRACEPTION_HORMONAL_METHODS = frozenset({
    CONTRACEPTION_METHOD_PILL,
    CONTRACEPTION_METHOD_HORMONAL_IUD,
    CONTRACEPTION_METHOD_IMPLANT,
    CONTRACEPTION_METHOD_PATCH,
    CONTRACEPTION_METHOD_RING,
    CONTRACEPTION_METHOD_INJECTION,
})

# Methods with a fixed typical validity period, for the renewal reminder.
# Approximate, product/brand-dependent midpoint values — not medical advice,
# just a "you may want to check with your provider soon" nudge. Deliberately
# excludes pill/patch/ring/condom, which don't have a multi-month/year
# "replace this" concept in the same sense.
CONTRACEPTION_RENEWAL_MONTHS: dict[str, int] = {
    CONTRACEPTION_METHOD_HORMONAL_IUD: 60,   # ~5 years typical (varies 3-8 by product)
    CONTRACEPTION_METHOD_COPPER_IUD: 120,     # ~10 years typical (varies 5-10 by product)
    CONTRACEPTION_METHOD_IMPLANT: 36,         # 3 years
    CONTRACEPTION_METHOD_INJECTION: 3,        # 3 months
}
CONTRACEPTION_RENEWAL_REMINDER_LEAD_DAYS = 30

# Symptom options for reference (used in UI)
SYMPTOM_OPTIONS = {
    SYMPTOM_BLEEDING_STRENGTH: ["none", "light", "medium", "heavy", "very_heavy"],
    SYMPTOM_SPOTTING: ["red", "brown"],
    SYMPTOM_DISCHARGE: ["reddish", "brown", "white", "clear", "other"],
    SYMPTOM_INTERCOURSE: ["protected", "unprotected"],
    SYMPTOM_PAIN: ["mittelschmerz", "cramps", "tender_breasts", "headache", "migraine", "lower_back", "vulva"],
    SYMPTOM_HYGIENE: ["pad", "liner", "tampon", "cup", "period_underwear"],
    SYMPTOM_TEST: ["positive_ovulation", "negative_ovulation", "positive_pregnancy", "negative_pregnancy"],
    SYMPTOM_CERVICAL_MUCUS: ["keinen", "klebrig", "cremig", "fadenziehend", "untypisch"],
    SYMPTOM_SMELL: ["normal", "inconspicuous", "unpleasant", "fishy"],
    SYMPTOM_CLOTS: ["yes", "no"],
    SYMPTOM_CLOT_SIZE: ["small", "medium", "large"],
    SYMPTOM_BLEEDING_TYPE: ["continuous", "intermittent", "drops"],
    SYMPTOM_CERVIX_POSITION: ["cervix_high", "cervix_mid", "cervix_low"],
    SYMPTOM_CERVIX_TEXTURE: ["firm", "soft", "open"],
    SYMPTOM_LIBIDO: ["libido_low", "normal", "libido_high"],
    SYMPTOM_TRAINING_INTENSITY: ["training_light", "training_moderate", "training_intense"],
    SYMPTOM_PREGNANCY: ["nausea", "fatigue", "heartburn", "swelling", "headache", "back_pain"],
    SYMPTOM_CONTRACEPTION_METHOD: CONTRACEPTION_METHODS,
}

# Pre-Menarche Body Signs - Tanner Stages
PRE_MENARCHE_SIGN_PUBIC_HAIR = "pubic_hair_growth"
PRE_MENARCHE_SIGN_BREAST = "breast_development"
PRE_MENARCHE_SIGN_HEIGHT_SPURT = "height_spurt"
PRE_MENARCHE_SIGN_MOOD = "mood_changes"
PRE_MENARCHE_SIGN_ACNE = "acne"
PRE_MENARCHE_SIGN_BODY_ODOR = "body_odor"
PRE_MENARCHE_SIGN_DISCHARGE = "vaginal_discharge"

# Tanner Stages (1-5) - Medical Standard
TANNER_STAGE_1 = "stage_1"      # Pre-puberty / Vorpupertät
TANNER_STAGE_2 = "stage_2"      # Early puberty / Frühe Pubertät
TANNER_STAGE_3 = "stage_3"      # Mid puberty / Mittlere Pubertät
TANNER_STAGE_4 = "stage_4"      # Late puberty / Späte Pubertät
TANNER_STAGE_5 = "stage_5"      # Adult / Erwachsenenalter

# Pre-Menarche Sign Options
PRE_MENARCHE_SIGN_OPTIONS = {
    PRE_MENARCHE_SIGN_PUBIC_HAIR: [TANNER_STAGE_1, TANNER_STAGE_2, TANNER_STAGE_3, TANNER_STAGE_4, TANNER_STAGE_5],
    PRE_MENARCHE_SIGN_BREAST: [TANNER_STAGE_1, TANNER_STAGE_2, TANNER_STAGE_3, TANNER_STAGE_4, TANNER_STAGE_5],
    PRE_MENARCHE_SIGN_HEIGHT_SPURT: ["none", "slight", "moderate", "significant"],
    PRE_MENARCHE_SIGN_MOOD: ["stable", "mild_changes", "noticeable_changes", "significant_changes"],
    PRE_MENARCHE_SIGN_ACNE: ["none", "slight", "moderate", "severe"],
    PRE_MENARCHE_SIGN_BODY_ODOR: ["none", "slight", "moderate", "strong"],
    PRE_MENARCHE_SIGN_DISCHARGE: ["none", "clear", "white", "clear_to_white"],
}

# Default age ranges for menarche (varies by population)
DEFAULT_MENARCHE_AGE_MIN = 9
DEFAULT_MENARCHE_AGE_MAX = 16
DEFAULT_MENARCHE_AGE_TYPICAL = 12.5

# Maps each sensor's stable unique_id suffix to a function computing its
# "menstruation_"-prefixed suggested entity object_id from a profile's
# friendly_name. Shared between sensor.py (new entities) and repairs.py (the
# rename repair flow for existing entities) so both always agree on the target
# naming scheme — if they ever drifted apart, the repair flow could rename an
# entity to something that doesn't match what a fresh entity would get.
def menstruation_object_ids_for_profile(friendly_name: str) -> dict[str, str]:
    """Return {unique_id_suffix: suggested_object_id} for this integration's
    sensors, given a profile's friendly_name. Import homeassistant.util.slugify
    at the call site (kept out of const.py to avoid pulling in HA helpers here)."""
    from homeassistant.util import slugify

    slug = slugify(friendly_name)
    return {
        "_menstruation": f"menstruation_{slug}",
        "_period_products_today": f"menstruation_{slug}_products_today",
        "_basal_temp": f"menstruation_{slug}_basal_temp",
    }
