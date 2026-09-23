"""Todo platform for menstruation_cycle - Klinik-Tasche/Geburtsplan-Checkliste.

Neue Feature-Idee (23.09.2026, "weitere Ideen die nicht auf der Roadmap
stehen?"): eine vorausgefuellte, editierbare Checkliste (HA's native
todo-Domain) pro Profil, die nur sichtbar/verfuegbar ist, waehrend das Profil
sich in einer aktiven Schwangerschaft befindet (pregnancy_data.is_pregnant).

Architektonisch an calendar.py angelehnt (siehe dortiges HA-Idee-3 aus der
Roadmap): ein Entity pro Profil, device_info-Delegation an
sensor._device_info_for_entry, Live-Aktualisierung ueber den bestehenden
SIGNAL_HISTORY_UPDATED-Dispatcher-Signal statt eines eigenen Polls oder eines
neuen Options-Flow-Toggles - genau wie calendar.py sich ueber denselben Weg
nach jeder Historie-/Symptom-/Optionen-/Schwangerschafts-Aenderung neu
aufbaut.

Die Liste selbst liegt in storage.py's `hospital_bag_items`-Feld (None =
fuer dieses Profil noch nie angelegt -> wird beim ersten Erkennen einer
aktiven Schwangerschaft mit DEFAULT_HOSPITAL_BAG_ITEMS vorbefuellt; []
bedeutet dagegen "Nutzer hat bewusst alle Eintraege geloescht" und wird NICHT
erneut mit den Default-Eintraegen aufgefuellt).

Ungetestet wie der Rest der Integration - kein Zugriff auf eine echte
Home-Assistant-Instanz in dieser Umgebung; API-Nutzung
(homeassistant.components.todo: TodoListEntity/TodoItem/TodoItemStatus/
TodoListEntityFeature) aus Trainingswissen, nicht gegen eine installierte
HA-Version verifiziert.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from homeassistant.components.todo import (
    TodoItem,
    TodoItemStatus,
    TodoListEntity,
    TodoListEntityFeature,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN, SIGNAL_HISTORY_UPDATED, menstruation_object_ids_for_profile
from .sensor import _device_info_for_entry

_LOGGER = logging.getLogger(__name__)

DEFAULT_HOSPITAL_BAG_ITEMS: list[str] = [
    "Mutterpass / Ausweisdokumente",
    "Kliniktasche fuer die Mutter (bequeme Kleidung, Still-BH, Hygieneartikel)",
    "Kliniktasche fuers Baby (Erstlingsmode, Wickeldecke)",
    "Ladekabel & Powerbank",
    "Snacks & Getraenke",
    "Kamera / Handy fuer Fotos",
    "Geburtsplan (ausgedruckt)",
    "Kontaktliste (Hebamme, Partner:in, Familie)",
    "Autositz / Babyschale fuers Nachhause fahren",
    "Kulturbeutel & Kosmetik",
]


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the hospital-bag checklist todo entity for a profile."""
    async_add_entities([MenstruationHospitalBagTodo(hass, entry)], True)


class MenstruationHospitalBagTodo(TodoListEntity):
    """Klinik-Tasche/Geburtsplan-Checkliste, nur waehrend aktiver Schwangerschaft verfuegbar."""

    _attr_has_entity_name = True
    _attr_icon = "mdi:bag-personal"
    _attr_supported_features = (
        TodoListEntityFeature.CREATE_TODO_ITEM
        | TodoListEntityFeature.UPDATE_TODO_ITEM
        | TodoListEntityFeature.DELETE_TODO_ITEM
        | TodoListEntityFeature.MOVE_TODO_ITEM
    )

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self._entry = entry
        runtime = hass.data[DOMAIN][entry.entry_id]
        # _attr_name bewusst hardcoded/unlokalisiert, wie calendar.py's
        # "Cycle calendar" - translations/*.json enthaelt ausschliesslich
        # config/options/services/issues/selector-Keys, keine Entity-Namen.
        self._attr_name = "Hospital bag checklist"
        self._attr_unique_id = f"{entry.entry_id}_hospital_bag"
        self._attr_suggested_object_id = menstruation_object_ids_for_profile(
            runtime.friendly_name
        )["_hospital_bag"]
        self._attr_todo_items: list[TodoItem] = []
        self._attr_available = False

    @property
    def device_info(self):
        return _device_info_for_entry(self.hass, self._entry)

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(
            async_dispatcher_connect(
                self.hass, SIGNAL_HISTORY_UPDATED, self._handle_history_updated
            )
        )
        await self._async_refresh()

    async def _handle_history_updated(self) -> None:
        await self._async_refresh()
        self.async_write_ha_state()

    async def _async_refresh(self) -> None:
        runtime = self.hass.data[DOMAIN][self._entry.entry_id]
        is_pregnant = bool(runtime.pregnancy_data.get("is_pregnant"))
        self._attr_available = is_pregnant
        if not is_pregnant:
            return

        stored = await runtime.storage.async_load_hospital_bag_items()
        if stored is None:
            stored = [
                {
                    "uid": str(uuid.uuid4()),
                    "summary": summary,
                    "status": TodoItemStatus.NEEDS_ACTION.value,
                }
                for summary in DEFAULT_HOSPITAL_BAG_ITEMS
            ]
            await runtime.storage.async_save_hospital_bag_items(stored)

        self._attr_todo_items = [
            TodoItem(
                uid=item["uid"],
                summary=item["summary"],
                status=TodoItemStatus(item.get("status", TodoItemStatus.NEEDS_ACTION.value)),
            )
            for item in stored
        ]

    async def _async_persist(self) -> None:
        runtime = self.hass.data[DOMAIN][self._entry.entry_id]
        await runtime.storage.async_save_hospital_bag_items(
            [
                {"uid": item.uid, "summary": item.summary, "status": item.status.value}
                for item in self._attr_todo_items
            ]
        )

    async def async_create_todo_item(self, item: TodoItem) -> None:
        item.uid = item.uid or str(uuid.uuid4())
        self._attr_todo_items = [*self._attr_todo_items, item]
        await self._async_persist()
        self.async_write_ha_state()

    async def async_update_todo_item(self, item: TodoItem) -> None:
        self._attr_todo_items = [
            item if existing.uid == item.uid else existing
            for existing in self._attr_todo_items
        ]
        await self._async_persist()
        self.async_write_ha_state()

    async def async_delete_todo_items(self, uids: list[str]) -> None:
        self._attr_todo_items = [
            item for item in self._attr_todo_items if item.uid not in uids
        ]
        await self._async_persist()
        self.async_write_ha_state()

    async def async_move_todo_item(self, uid: str, previous_uid: str | None = None) -> None:
        items = list(self._attr_todo_items)
        moving = next((i for i in items if i.uid == uid), None)
        if moving is None:
            return
        items.remove(moving)
        if previous_uid is None:
            items.insert(0, moving)
        else:
            idx = next((i for i, x in enumerate(items) if x.uid == previous_uid), len(items) - 1)
            items.insert(idx + 1, moving)
        self._attr_todo_items = items
        await self._async_persist()
        self.async_write_ha_state()
