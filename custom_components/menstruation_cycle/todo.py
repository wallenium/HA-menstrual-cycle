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
aktiven Schwangerschaft mit DEFAULT_HOSPITAL_BAG_ITEMS (in der HA-Sprache,
de/en/es/fr/sv, sonst Englisch) vorbefuellt; []
bedeutet dagegen "Nutzer hat bewusst alle Eintraege geloescht" und wird NICHT
erneut mit den Default-Eintraegen aufgefuellt).

Mit Stubs getestet (tests/test_entity_platforms.py), aber nicht gegen eine echte
Home-Assistant-Instanz; API-Nutzung
(homeassistant.components.todo: TodoListEntity/TodoItem/TodoItemStatus/
TodoListEntityFeature) aus Trainingswissen, nicht gegen eine installierte
HA-Version verifiziert.
"""

from __future__ import annotations

import logging
import uuid

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

# Seed items per Home Assistant language (de/en/es/fr/sv); anything else falls back to English.
DEFAULT_HOSPITAL_BAG_ITEMS: dict[str, list[str]] = {
    "de": [
        "Mutterpass / Ausweisdokumente",
        "Kliniktasche für die Mutter (bequeme Kleidung, Still-BH, Hygieneartikel)",
        "Kliniktasche fürs Baby (Erstlingsmode, Wickeldecke)",
        "Ladekabel & Powerbank",
        "Snacks & Getränke",
        "Kamera / Handy für Fotos",
        "Geburtsplan (ausgedruckt)",
        "Kontaktliste (Hebamme, Partner:in, Familie)",
        "Autositz / Babyschale für die Heimfahrt",
        "Kulturbeutel & Kosmetik",
    ],
    "en": [
        "Maternity record / ID documents",
        "Hospital bag for mom (comfortable clothes, nursing bra, toiletries)",
        "Hospital bag for baby (first outfit, swaddle blanket)",
        "Charging cable & power bank",
        "Snacks & drinks",
        "Camera / phone for photos",
        "Birth plan (printed)",
        "Contact list (midwife, partner, family)",
        "Car seat / infant carrier for the ride home",
        "Toiletry bag & cosmetics",
    ],
    "es": [
        "Cartilla de embarazo / documentos de identidad",
        "Bolsa del hospital para la madre (ropa cómoda, sujetador de lactancia, artículos de higiene)",
        "Bolsa del hospital para el bebé (primera muda, manta envolvente)",
        "Cable de carga y batería externa",
        "Tentempiés y bebidas",
        "Cámara / móvil para fotos",
        "Plan de parto (impreso)",
        "Lista de contactos (matrona, pareja, familia)",
        "Silla de coche / portabebés para volver a casa",
        "Neceser y cosméticos",
    ],
    "fr": [
        "Carnet de maternité / pièces d'identité",
        "Sac de maternité pour la maman (vêtements confortables, soutien-gorge d'allaitement, affaires de toilette)",
        "Sac de maternité pour bébé (première tenue, couverture d'emmaillotage)",
        "Câble de charge et batterie externe",
        "Collations et boissons",
        "Appareil photo / téléphone pour les photos",
        "Projet de naissance (imprimé)",
        "Liste de contacts (sage-femme, partenaire, famille)",
        "Siège auto / coque pour le retour à la maison",
        "Trousse de toilette et cosmétiques",
    ],
    "sv": [
        "Mödravårdsjournal / id-handlingar",
        "Sjukhusväska till mamman (bekväma kläder, amnings-bh, toalettartiklar)",
        "Sjukhusväska till bebisen (första kläderna, svepfilt)",
        "Laddkabel och powerbank",
        "Snacks och drycker",
        "Kamera / mobil för foton",
        "Förlossningsbrev (utskrivet)",
        "Kontaktlista (barnmorska, partner, familj)",
        "Bilbarnstol / babyskydd för hemfärden",
        "Necessär och kosmetika",
    ],
}


def default_hospital_bag_items(language: str | None) -> list[str]:
    """Seed items for the given HA language (primary subtag, English fallback)."""
    code = str(language or "en").lower().replace("_", "-").split("-")[0]
    return DEFAULT_HOSPITAL_BAG_ITEMS.get(code, DEFAULT_HOSPITAL_BAG_ITEMS["en"])


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
                for summary in default_hospital_bag_items(self.hass.config.language)
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
