"""Tests for the entity platforms todo.py, logbook.py, calendar.py and image.py (Home Assistant replaced by small stubs)."""

from __future__ import annotations

import ast
import asyncio
import enum
import importlib.util
import re
import sys
import tempfile
import types
import unittest
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
COMPONENT_ROOT = ROOT / "custom_components" / "menstruation_cycle"
_PKG = "tstest_platforms"
LANGS = ("de", "en", "es", "fr", "sv")

_PATCHER = None
const = todo = logbook = calendar = image = None


class _Entity:
    """Stand-in for the Home Assistant entity base classes."""

    def async_on_remove(self, func) -> None:
        self.__dict__.setdefault("_removers", []).append(func)

    def async_write_ha_state(self) -> None:
        self.__dict__["writes"] = self.__dict__.get("writes", 0) + 1

    def async_schedule_update_ha_state(self, force=False) -> None:
        self.__dict__["scheduled"] = self.__dict__.get("scheduled", 0) + 1


class _ImageEntity(_Entity):
    def __init__(self, hass=None) -> None:
        self.hass = hass


class TodoItemStatus(str, enum.Enum):
    NEEDS_ACTION = "needs_action"
    COMPLETED = "completed"


@dataclass
class TodoItem:
    summary: str | None = None
    uid: str | None = None
    status: TodoItemStatus | None = None


@dataclass
class CalendarEvent:
    start: object
    end: object
    summary: str
    description: str | None = None
    uid: str | None = None


NOW = datetime.now(timezone.utc)
CONNECTS: list[tuple] = []


def _module(name: str, **attrs) -> types.ModuleType:
    module = types.ModuleType(name)
    module.__path__ = []
    for key, value in attrs.items():
        setattr(module, key, value)
    return module


def _stubs() -> dict[str, types.ModuleType]:
    def connect(hass, signal, callback):
        CONNECTS.append((signal, callback))
        return lambda: None

    dt = _module(
        "homeassistant.util.dt",
        now=lambda: NOW,
        utcnow=lambda: NOW,
        start_of_local_day=lambda d: datetime.combine(d, time.min, tzinfo=timezone.utc),
    )
    util = _module("homeassistant.util", dt=dt, slugify=lambda text: re.sub(r"\W+", "_", str(text).lower()).strip("_"))
    helpers = _module("homeassistant.helpers")
    components = _module("homeassistant.components")
    stubs = {
        "homeassistant": _module("homeassistant", components=components, helpers=helpers, util=util),
        "homeassistant.components": components,
        "homeassistant.components.logbook": _module(
            "homeassistant.components.logbook",
            LOGBOOK_ENTRY_CONTEXT_ID="context_id",
            LOGBOOK_ENTRY_ENTITY_ID="entity_id",
            LOGBOOK_ENTRY_MESSAGE="message",
            LOGBOOK_ENTRY_NAME="name",
            LazyEventPartialState=object,
        ),
        "homeassistant.components.calendar": _module(
            "homeassistant.components.calendar", CalendarEntity=_Entity, CalendarEvent=CalendarEvent
        ),
        "homeassistant.components.image": _module("homeassistant.components.image", ImageEntity=_ImageEntity),
        "homeassistant.components.todo": _module(
            "homeassistant.components.todo",
            TodoItem=TodoItem,
            TodoItemStatus=TodoItemStatus,
            TodoListEntity=_Entity,
            TodoListEntityFeature=SimpleNamespace(
                CREATE_TODO_ITEM=1, UPDATE_TODO_ITEM=2, DELETE_TODO_ITEM=4, MOVE_TODO_ITEM=8
            ),
        ),
        "homeassistant.config_entries": _module("homeassistant.config_entries", ConfigEntry=object),
        "homeassistant.core": _module("homeassistant.core", HomeAssistant=object, callback=lambda func: func),
        "homeassistant.helpers": helpers,
        "homeassistant.helpers.dispatcher": _module("homeassistant.helpers.dispatcher", async_dispatcher_connect=connect),
        "homeassistant.helpers.entity_platform": _module(
            "homeassistant.helpers.entity_platform", AddEntitiesCallback=object
        ),
        "homeassistant.helpers.event": _module(
            "homeassistant.helpers.event",
            async_track_time_change=lambda hass, action, **kw: CONNECTS.append(("time", action)) or (lambda: None),
        ),
        "homeassistant.util": util,
        "homeassistant.util.dt": dt,
    }
    return stubs


def _load(name: str, file_name: str) -> types.ModuleType:
    spec = importlib.util.spec_from_file_location(f"{_PKG}.{name}", COMPONENT_ROOT / file_name)
    module = importlib.util.module_from_spec(spec)
    sys.modules[f"{_PKG}.{name}"] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def setUpModule() -> None:
    global _PATCHER, const, todo, logbook, calendar, image
    _PATCHER = patch.dict(sys.modules, _stubs())
    _PATCHER.start()
    package = types.ModuleType(_PKG)
    package.__path__ = [str(COMPONENT_ROOT)]
    sys.modules[_PKG] = package
    sys.modules[f"{_PKG}.sensor"] = _module(f"{_PKG}.sensor", _device_info_for_entry=lambda hass, entry: {"id": entry.entry_id})
    const = _load("const", "const.py")
    _load("model", "model.py")
    _load("ical", "ical.py")
    todo = _load("todo", "todo.py")
    logbook = _load("logbook", "logbook.py")
    calendar = _load("calendar", "calendar.py")
    image = _load("image", "image.py")


def tearDownModule() -> None:
    _PATCHER.stop()


def run(coro):
    return asyncio.run(coro)


class _Storage:
    def __init__(self, items=None) -> None:
        self.items = items
        self.saves: list[list[dict]] = []
        self.loads = 0

    async def async_load_hospital_bag_items(self):
        self.loads += 1
        return None if self.items is None else [dict(i) for i in self.items]

    async def async_save_hospital_bag_items(self, items) -> None:
        self.items = [dict(i) for i in items]
        self.saves.append(self.items)


def _runtime(**overrides):
    values = dict(
        friendly_name="Sarah",
        history=[],
        period_duration_days=5,
        symptom_history=[],
        pregnancy_data={},
        menarche_data={},
        pre_menarche_data={},
        menopause_data={},
        noncycle_data={},
        cycle_length_override=None,
        visibility_level="full",
        storage=_Storage(),
    )
    values.update(overrides)
    return SimpleNamespace(**values)


def _hass(runtime, language="en", entry_id="e1"):
    async def executor(func, *args):
        return func(*args)

    return SimpleNamespace(
        data={const.DOMAIN: {entry_id: runtime}},
        config=SimpleNamespace(language=language),
        async_add_executor_job=executor,
    )


def _entry(**options):
    return SimpleNamespace(entry_id="e1", options=options)


# --------------------------------------------------------------------------------------- todo


class HospitalBagDefaultsTests(unittest.TestCase):
    def test_every_language_has_the_same_clean_list(self) -> None:
        defaults = todo.DEFAULT_HOSPITAL_BAG_ITEMS
        self.assertEqual(set(defaults), set(LANGS))
        self.assertEqual(set(defaults), set(const.DOCTOR_REPORT_LANGUAGES))
        count = len(defaults["en"])
        for lang, items in defaults.items():
            self.assertEqual(len(items), count, lang)
            self.assertEqual(len(set(items)), count, f"{lang}: duplicate item")
            for item in items:
                self.assertTrue(item.strip(), lang)
                self.assertLessEqual(len(item), 200, f"{lang}: {item!r} is longer than storage accepts")

    def test_language_resolution(self) -> None:
        pick = todo.default_hospital_bag_items
        cases = {"de": "de", "DE": "de", "de-AT": "de", "fr_CA": "fr", "sv": "sv", "es": "es", "en-GB": "en",
                 "pt-BR": "en", "": "en", None: "en"}
        for language, expected in cases.items():
            self.assertEqual(pick(language), todo.DEFAULT_HOSPITAL_BAG_ITEMS[expected], language)


class HospitalBagTodoTests(unittest.TestCase):
    def _entity(self, *, pregnant=True, stored=None, language="en"):
        runtime = _runtime(pregnancy_data={"is_pregnant": pregnant}, storage=_Storage(stored))
        entity = todo.MenstruationHospitalBagTodo(_hass(runtime, language), _entry())
        return entity, runtime

    def test_identity_and_start_state(self) -> None:
        entity, _ = self._entity()
        self.assertEqual(entity._attr_unique_id, "e1_hospital_bag")
        self.assertFalse(entity._attr_available)
        self.assertEqual(entity._attr_todo_items, [])
        self.assertEqual(entity.device_info, {"id": "e1"})

    def test_added_to_hass_subscribes_to_history_updates_and_loads(self) -> None:
        CONNECTS.clear()
        entity, runtime = self._entity()
        run(entity.async_added_to_hass())
        self.assertEqual([signal for signal, _ in CONNECTS], [const.SIGNAL_HISTORY_UPDATED])
        self.assertEqual(len(entity.__dict__["_removers"]), 1)
        self.assertTrue(entity._attr_available)

    def test_seeds_defaults_in_the_ha_language_and_saves_them(self) -> None:
        for language in LANGS:
            entity, runtime = self._entity(language=language)
            run(entity._async_refresh())
            summaries = [item.summary for item in entity._attr_todo_items]
            self.assertEqual(summaries, todo.DEFAULT_HOSPITAL_BAG_ITEMS[language], language)
            self.assertTrue(all(item.status == TodoItemStatus.NEEDS_ACTION for item in entity._attr_todo_items))
            uids = [item.uid for item in entity._attr_todo_items]
            self.assertEqual(len(set(uids)), len(uids))
            self.assertEqual(len(runtime.storage.saves), 1)
            self.assertEqual([i["summary"] for i in runtime.storage.items], summaries)

    def test_unknown_language_seeds_english(self) -> None:
        entity, _ = self._entity(language="pt-BR")
        run(entity._async_refresh())
        self.assertEqual([i.summary for i in entity._attr_todo_items], todo.DEFAULT_HOSPITAL_BAG_ITEMS["en"])

    def test_existing_list_is_not_reseeded_or_translated(self) -> None:
        stored = [{"uid": "a", "summary": "Mutterpass", "status": "completed"}]
        entity, runtime = self._entity(stored=stored, language="en")
        run(entity._async_refresh())
        self.assertEqual([(i.uid, i.summary, i.status) for i in entity._attr_todo_items],
                         [("a", "Mutterpass", TodoItemStatus.COMPLETED)])
        self.assertEqual(runtime.storage.saves, [])

    def test_deliberately_emptied_list_stays_empty(self) -> None:
        entity, runtime = self._entity(stored=[])
        run(entity._async_refresh())
        self.assertEqual(entity._attr_todo_items, [])
        self.assertEqual(runtime.storage.saves, [])

    def test_only_available_while_pregnant_and_storage_untouched_otherwise(self) -> None:
        entity, runtime = self._entity(pregnant=False)
        run(entity._async_refresh())
        self.assertFalse(entity._attr_available)
        self.assertEqual((runtime.storage.loads, runtime.storage.saves), (0, []))
        runtime.pregnancy_data["is_pregnant"] = True
        run(entity._handle_history_updated())
        self.assertTrue(entity._attr_available)
        self.assertEqual(len(entity._attr_todo_items), len(todo.DEFAULT_HOSPITAL_BAG_ITEMS["en"]))
        self.assertEqual(entity.__dict__["writes"], 1)
        runtime.pregnancy_data["is_pregnant"] = False
        run(entity._handle_history_updated())
        self.assertFalse(entity._attr_available)

    def _loaded(self):
        entity, runtime = self._entity(stored=[
            {"uid": "a", "summary": "A", "status": "needs_action"},
            {"uid": "b", "summary": "B", "status": "needs_action"},
            {"uid": "c", "summary": "C", "status": "needs_action"},
        ])
        run(entity._async_refresh())
        return entity, runtime

    def _saved_order(self, runtime):
        return [item["uid"] for item in runtime.storage.items]

    def test_create_assigns_uid_persists_and_writes_state(self) -> None:
        entity, runtime = self._loaded()
        run(entity.async_create_todo_item(TodoItem(summary="D", status=TodoItemStatus.NEEDS_ACTION)))
        created = entity._attr_todo_items[-1]
        self.assertTrue(created.uid)
        self.assertEqual(self._saved_order(runtime), ["a", "b", "c", created.uid])
        self.assertEqual(entity.__dict__["writes"], 1)

    def test_create_keeps_a_given_uid(self) -> None:
        entity, _ = self._loaded()
        run(entity.async_create_todo_item(TodoItem(summary="D", uid="given", status=TodoItemStatus.NEEDS_ACTION)))
        self.assertEqual(entity._attr_todo_items[-1].uid, "given")

    def test_update_changes_only_the_matching_item_and_persists(self) -> None:
        entity, runtime = self._loaded()
        run(entity.async_update_todo_item(TodoItem(uid="b", summary="B2", status=TodoItemStatus.COMPLETED)))
        self.assertEqual([(i["uid"], i["summary"], i["status"]) for i in runtime.storage.items],
                         [("a", "A", "needs_action"), ("b", "B2", "completed"), ("c", "C", "needs_action")])

    def test_delete_removes_several_and_persists(self) -> None:
        entity, runtime = self._loaded()
        run(entity.async_delete_todo_items(["a", "c", "unknown"]))
        self.assertEqual(self._saved_order(runtime), ["b"])
        run(entity.async_delete_todo_items(["b"]))
        self.assertEqual(runtime.storage.items, [])
        # an emptied list must stay empty after the next refresh (None = never seeded, [] = deliberately empty)
        run(entity._handle_history_updated())
        self.assertEqual(entity._attr_todo_items, [])

    def test_move(self) -> None:
        cases = [("c", None, "cab"), ("a", "b", "bac"), ("a", "c", "bca"), ("c", "a", "acb"), ("a", "missing", "bca")]
        for uid, previous, expected in cases:
            entity, runtime = self._loaded()
            run(entity.async_move_todo_item(uid, previous))
            self.assertEqual("".join(self._saved_order(runtime)), expected, (uid, previous))

    def test_move_of_unknown_item_changes_and_saves_nothing(self) -> None:
        entity, runtime = self._loaded()
        run(entity.async_move_todo_item("zzz", "a"))
        self.assertEqual(runtime.storage.saves, [])
        self.assertEqual([i.uid for i in entity._attr_todo_items], ["a", "b", "c"])


# ----------------------------------------------------------------------------------- logbook


def _describers(language):
    hass = SimpleNamespace(config=SimpleNamespace(language=language))
    found = {}
    logbook.async_describe_events(hass, lambda domain, event, func: found.__setitem__(event, (domain, func)))
    return found


def _event(**data):
    return SimpleNamespace(data=data, context_id="ctx")


class LogbookTests(unittest.TestCase):
    def test_all_four_events_are_registered_for_the_domain(self) -> None:
        found = _describers("en")
        self.assertEqual(
            set(found),
            {const.EVENT_PRODUCT_CONSUMED, const.EVENT_STATE_CHANGED, const.EVENT_CYCLE_START_LOGGED, const.EVENT_PILL_TAKEN},
        )
        self.assertEqual({domain for domain, _ in found.values()}, {const.DOMAIN})

    def test_languages_have_identical_structure_and_placeholders(self) -> None:
        strings = logbook._LOGBOOK_STRINGS
        self.assertEqual(set(strings), set(LANGS))
        fields = lambda text: set(re.findall(r"\{(\w+)\}", text))
        for lang in LANGS:
            self.assertEqual(set(strings[lang]), set(strings["en"]), lang)
            self.assertEqual(set(strings[lang]["products"]), set(strings["en"]["products"]), lang)
            self.assertEqual(set(strings[lang]["states"]), set(strings["en"]["states"]), lang)
            for key, value in strings["en"].items():
                if isinstance(value, str):
                    self.assertEqual(fields(strings[lang][key]), fields(value), f"{lang}.{key}")
                    self.assertTrue(strings[lang][key].strip())

    def test_every_cycle_state_and_product_has_a_label(self) -> None:
        states = {v for k, v in vars(const).items() if re.fullmatch(r"STATE_[A-Z_]+", k) and v != const.STATE_PRIVATE}
        init_source = (COMPONENT_ROOT / "__init__.py").read_text(encoding="utf-8")
        products = ast.literal_eval(re.search(r"^VALID_PRODUCT_USAGE_PRODUCTS = (\{.*?\})$", init_source, re.M).group(1))
        for lang in LANGS:
            entry = logbook._LOGBOOK_STRINGS[lang]
            self.assertEqual(states - set(entry["states"]), set(), lang)
            self.assertEqual(products - set(entry["products"]), set(), lang)

    def test_messages_are_written_in_the_ha_language(self) -> None:
        expected = {
            "de": ("hat 2x Tampons verwendet", "Zyklusstatus wechselte zu Periode",
                   "Periodenbeginn für 2026-10-01 erfasst", "Pille für 2026-10-01 genommen"),
            "en": ("used 2x tampons", "cycle status changed to period",
                   "logged period start on 2026-10-01", "took the pill on 2026-10-01"),
            "es": ("usó 2x tampones", "el estado del ciclo cambió a menstruación",
                   "registró el inicio del período el 2026-10-01", "tomó la píldora el 2026-10-01"),
            "fr": ("a utilisé 2x tampons", "le statut du cycle est passé à règles",
                   "a enregistré le début des règles le 2026-10-01", "a pris la pilule le 2026-10-01"),
            "sv": ("använde 2x tamponger", "cykelstatus ändrades till mens",
                   "loggade mensstart den 2026-10-01", "tog p-pillret den 2026-10-01"),
        }
        for lang, (consumed, changed, start, pill) in expected.items():
            found = _describers(lang)
            messages = [
                found[const.EVENT_PRODUCT_CONSUMED][1](_event(product="tampon", quantity=2, member="Sarah"))["message"],
                found[const.EVENT_STATE_CHANGED][1](_event(new_state="period", friendly_name="Sarah"))["message"],
                found[const.EVENT_CYCLE_START_LOGGED][1](_event(date="2026-10-01", friendly_name="Sarah"))["message"],
                found[const.EVENT_PILL_TAKEN][1](_event(date="2026-10-01", friendly_name="Sarah"))["message"],
            ]
            self.assertEqual(messages, [consumed, changed, start, pill], lang)

    def test_regional_or_unknown_language_codes(self) -> None:
        def message(language):
            return _describers(language)[const.EVENT_PILL_TAKEN][1](_event(date="d"))["message"]

        self.assertEqual(message("de-AT"), "Pille für d genommen")
        self.assertEqual(message("SV"), "tog p-pillret den d")
        self.assertEqual(message("ja"), "took the pill on d")
        self.assertEqual(message(None), "took the pill on d")

    def test_consumption_entry_details(self) -> None:
        describe = _describers("en")[const.EVENT_PRODUCT_CONSUMED][1]
        entry = describe(_event(product="cup", quantity=1, member="Sarah", area_name="Bathroom"))
        self.assertEqual(entry["message"], "used 1x the menstrual cup in Bathroom")
        self.assertEqual(entry["name"], "Sarah")
        self.assertEqual(entry["entity_id"], "sensor.household_product_stock")
        self.assertEqual(entry["context_id"], "ctx")
        # no area -> shorter text; missing member/quantity/unknown product -> safe fallbacks
        entry = describe(_event(product="menstrual_pad"))
        self.assertEqual(entry["message"], "used 1x menstrual pad")
        self.assertEqual(entry["name"], "unknown")
        self.assertEqual(describe(_event())["message"], "used 1x an item")

    def test_state_change_entry_details(self) -> None:
        describe = _describers("en")[const.EVENT_STATE_CHANGED][1]
        entry = describe(_event(new_state="pre_menarche", friendly_name="Mia", entity_id="sensor.mia"))
        self.assertEqual(entry["message"], "cycle status changed to pre-menarche tracking")
        self.assertEqual((entry["name"], entry["entity_id"]), ("Mia", "sensor.mia"))
        self.assertEqual(describe(_event(new_state="brand_new"))["message"], "cycle status changed to brand new")
        self.assertEqual(describe(_event())["message"], "cycle status changed to an unknown state")

    def test_cycle_start_and_pill_fall_back_when_data_is_missing(self) -> None:
        found = _describers("en")
        self.assertEqual(found[const.EVENT_CYCLE_START_LOGGED][1](_event())["message"], "logged period start on ?")
        self.assertEqual(found[const.EVENT_PILL_TAKEN][1](_event())["name"], "unknown")


# ---------------------------------------------------------------------------------- calendar


def _windows():
    return {
        "period_windows": [{"start": "2026-10-10", "end": "2026-10-14"}, {"start": "bad", "end": "2026-11-01"}, {}],
        "fertility_windows": [
            {"fertile_start": "2026-10-20", "fertile_end": "2026-10-25", "ovulation": "2026-10-24"},
            {"fertile_start": "2026-11-17", "fertile_end": None, "ovulation": "2026-11-21"},
        ],
    }


class CalendarEventBuildTests(unittest.TestCase):
    def _summaries(self, **kwargs):
        return [e.summary for e in calendar._build_events(_windows(), "en", **kwargs)]

    def test_full_visibility_builds_period_fertile_and_ovulation_and_skips_broken_windows(self) -> None:
        events = calendar._build_events(_windows(), "en")
        self.assertEqual([e.summary for e in events], ["Period (predicted)", "Fertile window (predicted)", "Ovulation (predicted)"])
        period = events[0]
        self.assertEqual((period.start, period.end), (date(2026, 10, 10), date(2026, 10, 15)))  # end is exclusive
        self.assertEqual(period.uid, "period-2026-10-10")
        self.assertEqual(period.description, "Source: predicted")
        self.assertEqual(events[1].end, date(2026, 10, 26))
        self.assertEqual(events[2].start, date(2026, 10, 24))

    def test_events_are_sorted_by_start(self) -> None:
        starts = [e.start for e in calendar._build_events(_windows(), "en")]
        self.assertEqual(starts, sorted(starts))

    def test_status_only_keeps_period_only_and_private_nothing(self) -> None:
        self.assertEqual(self._summaries(visibility_level="status_only", checkup_due=date(2026, 12, 1)), ["Period (predicted)"])
        self.assertEqual(self._summaries(visibility_level="private", checkup_due=date(2026, 12, 1)), [])

    def test_checkup_event_only_at_full_visibility(self) -> None:
        due = date(2026, 12, 1)
        events = calendar._build_events({}, "en", checkup_due=due)
        self.assertEqual([(e.summary, e.start, e.end, e.uid) for e in events],
                         [("Routine checkup due", due, date(2026, 12, 2), "checkup-2026-12-01")])
        self.assertEqual(calendar._build_events({}, "en", "status_only", due), [])

    def test_titles_follow_the_language(self) -> None:
        self.assertEqual(calendar._build_events(_windows(), "de")[0].summary, "Periode (vorhergesagt)")
        self.assertEqual(calendar._build_events(_windows(), "zz")[0].summary, "Period (predicted)")

    def test_none_windows_are_fine(self) -> None:
        self.assertEqual(calendar._build_events(None, "en"), [])


class CalendarOverlapTests(unittest.TestCase):
    def test_overlap_is_half_open(self) -> None:
        event = CalendarEvent(date(2026, 10, 10), date(2026, 10, 12), "x")  # 10th and 11th
        day = lambda d: datetime(2026, 10, d, tzinfo=timezone.utc)
        self.assertTrue(calendar._overlaps(event, day(11), day(13)))
        self.assertTrue(calendar._overlaps(event, day(1), day(11)))
        self.assertFalse(calendar._overlaps(event, day(12), day(14)))  # starts on the exclusive end
        self.assertFalse(calendar._overlaps(event, day(1), day(10)))  # ends where the event begins
        self.assertTrue(calendar._overlaps(event, date(2026, 10, 11), date(2026, 10, 12)))  # plain dates

    def test_end_of_day_conversion(self) -> None:
        self.assertEqual(calendar._event_end_as_datetime(CalendarEvent(date(2026, 1, 1), date(2026, 1, 2), "x")),
                         datetime(2026, 1, 2, tzinfo=timezone.utc))
        end = datetime(2026, 1, 2, 5, tzinfo=timezone.utc)
        self.assertIs(calendar._event_end_as_datetime(CalendarEvent(end, end, "x")), end)


class CalendarEntityTests(unittest.TestCase):
    def _entity(self, *, language="en", visibility="full", options=None, history=None):
        runtime = _runtime(visibility_level=visibility, history=history if history is not None else _history())
        entity = calendar.MenstruationCycleCalendar(_hass(runtime, language), _entry(**(options or {})))
        return entity

    def test_identity(self) -> None:
        entity = self._entity()
        self.assertEqual(entity._attr_unique_id, "e1_cycle_calendar")
        self.assertTrue(entity._attr_available)
        self.assertEqual(entity.device_info, {"id": "e1"})

    def test_refresh_builds_future_events_from_the_real_cycle_model(self) -> None:
        entity = self._entity()
        run(entity._async_refresh_events())
        summaries = {e.summary for e in entity._events}
        self.assertEqual(summaries, {"Period (predicted)", "Fertile window (predicted)", "Ovulation (predicted)"})
        self.assertTrue(entity._attr_available)
        self.assertEqual([e.start for e in entity._events], sorted(e.start for e in entity._events))

    def test_refresh_respects_visibility_and_language(self) -> None:
        entity = self._entity(visibility="status_only", language="de")
        run(entity._async_refresh_events())
        self.assertEqual({e.summary for e in entity._events}, {"Periode (vorhergesagt)"})
        entity = self._entity(visibility="private")
        run(entity._async_refresh_events())
        self.assertEqual(entity._events, [])

    def test_disabled_calendar_is_unavailable_and_empty_then_comes_back(self) -> None:
        entity = self._entity(options={const.CONF_CALENDAR_ENABLED: False})
        run(entity._async_refresh_events())
        self.assertFalse(entity._attr_available)
        self.assertEqual(entity._events, [])
        entity._entry.options[const.CONF_CALENDAR_ENABLED] = True
        run(entity._handle_history_updated())
        self.assertTrue(entity._attr_available)
        self.assertTrue(entity._events)
        self.assertEqual(entity.__dict__["writes"], 1)

    def test_checkup_due_shows_up_from_the_symptom_history(self) -> None:
        entity = self._entity(options={const.CONF_CHECKUP_INTERVAL_MONTHS: 6})
        self.assertIsNone(calendar.next_checkup_due([], 6))
        with patch.object(calendar, "next_checkup_due", return_value=date.today() + timedelta(days=30)):
            run(entity._async_refresh_events())
        self.assertIn("Routine checkup due", {e.summary for e in entity._events})

    def test_added_to_hass_subscribes_and_refreshes(self) -> None:
        CONNECTS.clear()
        entity = self._entity()
        run(entity.async_added_to_hass())
        self.assertEqual([signal for signal, _ in CONNECTS], [const.SIGNAL_HISTORY_UPDATED])
        self.assertTrue(entity._events)

    def test_next_event_and_range_query(self) -> None:
        entity = self._entity()
        entity._events = [
            CalendarEvent(NOW.date() - timedelta(days=9), NOW.date() - timedelta(days=5), "past"),
            CalendarEvent(NOW.date() + timedelta(days=3), NOW.date() + timedelta(days=6), "soon"),
            CalendarEvent(NOW.date() + timedelta(days=30), NOW.date() + timedelta(days=33), "later"),
        ]
        self.assertEqual(entity.event.summary, "soon")
        window_start, window_end = NOW + timedelta(days=25), NOW + timedelta(days=40)
        result = run(entity.async_get_events(entity.hass, window_start, window_end))
        self.assertEqual([e.summary for e in result], ["later"])
        entity._events = entity._events[:1]
        self.assertIsNone(entity.event)

    def test_setup_entry_adds_one_entity(self) -> None:
        added = []
        run(calendar.async_setup_entry(_hass(_runtime()), _entry(), lambda entities, update=False: added.append((entities, update))))
        self.assertEqual(len(added[0][0]), 1)
        self.assertTrue(added[0][1])


def _history():
    start = date.today() - timedelta(days=100)
    return [(start + timedelta(days=28 * i)).isoformat() for i in range(4)]


# ------------------------------------------------------------------------------------- image


class ImageEntityTests(unittest.TestCase):
    def _entity(self, **runtime_overrides):
        runtime = _runtime(**runtime_overrides)
        return image.MenstruationCyclePhaseImage(_hass(runtime), _entry()), runtime

    def _asset(self, entity, state, weeks=None):
        path = entity._resolve_asset_path(SimpleNamespace(state=state, weeks_pregnant=weeks))
        return None if path is None else "/".join(path.parts[-2:])

    def test_state_mapping_matches_the_frontend(self) -> None:
        source = (COMPONENT_ROOT / "www" / "menstruation-functions.js").read_text(encoding="utf-8")
        block = re.search(r"const STATE_ASSET_FILENAMES = \{(.*?)\};", source, re.S).group(1)
        js = dict(re.findall(r"(\w+):\s*'([\w.]+)'", block))
        self.assertEqual(image._STATE_ASSET_FILENAMES, js)

    def test_every_mapped_illustration_exists(self) -> None:
        for filename in set(image._STATE_ASSET_FILENAMES.values()) | {"neutral.svg"}:
            self.assertTrue((image._ASSETS_DIR / "state" / filename).is_file(), filename)
        for month in range(1, 10):
            self.assertTrue((image._ASSETS_DIR / "pregnancy" / f"preg_{month:02d}.svg").is_file(), month)

    def test_state_selection(self) -> None:
        entity, _ = self._entity()
        for state, filename in image._STATE_ASSET_FILENAMES.items():
            self.assertEqual(self._asset(entity, state), f"state/{filename}")
        self.assertEqual(self._asset(entity, "something_new"), "state/neutral.svg")

    def test_pregnancy_month_from_weeks(self) -> None:
        entity, _ = self._entity()
        cases = {None: 1, 0: 1, 1: 1, 4: 1, 5: 2, 8: 2, 9: 3, 36: 9, 37: 9, 40: 9, 60: 9}
        for weeks, month in cases.items():
            self.assertEqual(self._asset(entity, "pregnant", weeks), f"pregnancy/preg_{month:02d}.svg", weeks)

    def test_missing_asset_file_makes_the_entity_unavailable(self) -> None:
        entity, _ = self._entity()
        with patch.object(image, "_ASSETS_DIR", Path("/nonexistent")):
            self.assertIsNone(self._asset(entity, "period"))

    def test_update_sets_asset_availability_and_timestamp_only_on_change(self) -> None:
        entity, _ = self._entity()
        model = SimpleNamespace(state="period", weeks_pregnant=None)
        with patch.object(image, "build_cycle_model", return_value=model):
            run(entity.async_update())
            first = entity._attr_image_last_updated
            self.assertTrue(entity._attr_available)
            self.assertTrue(str(entity._asset_path).endswith("state/period.svg"))
            run(entity.async_update())
            self.assertIs(entity._attr_image_last_updated, first)
            model.state = "fertile"
            run(entity.async_update())
            self.assertTrue(str(entity._asset_path).endswith("state/fertile.svg"))

    def test_private_profile_shows_nothing(self) -> None:
        entity, _ = self._entity(visibility_level="private")
        entity._asset_path = Path("x")
        with patch.object(image, "build_cycle_model", side_effect=AssertionError("must not compute")):
            run(entity.async_update())
        self.assertFalse(entity._attr_available)
        self.assertIsNone(entity._asset_path)
        self.assertIsNone(run(entity.async_image()))

    def test_image_bytes_are_the_resolved_file(self) -> None:
        entity, _ = self._entity()
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "state").mkdir()
            (Path(tmp) / "state" / "neutral.svg").write_bytes(b"<svg/>")
            with patch.object(image, "_ASSETS_DIR", Path(tmp)), patch.object(
                image, "build_cycle_model", return_value=SimpleNamespace(state="neutral", weeks_pregnant=None)
            ):
                run(entity.async_update())
            self.assertEqual(run(entity.async_image()), b"<svg/>")
        self.assertEqual(entity._attr_content_type, "image/svg+xml")

    def test_added_to_hass_registers_update_signal_and_daily_refresh(self) -> None:
        CONNECTS.clear()
        entity, _ = self._entity()
        run(entity.async_added_to_hass())
        self.assertEqual([signal for signal, _ in CONNECTS], [const.SIGNAL_HISTORY_UPDATED, "time"])
        self.assertEqual(entity.__dict__["scheduled"], 1)
        run(entity._handle_runtime_update())
        run(entity._handle_daily_refresh(None))
        self.assertEqual(entity.__dict__["scheduled"], 3)

    def test_setup_entry_adds_one_entity(self) -> None:
        added = []
        run(image.async_setup_entry(_hass(_runtime()), _entry(), lambda entities, update=False: added.append(entities)))
        self.assertEqual(len(added[0]), 1)


if __name__ == "__main__":
    unittest.main()
