"""Schnittstelle zur macOS/iOS-App: Services und Symptomfelder, aus dem Code gelesen.

`python3 tools/contract.py` schreibt contract.json neu; tests/test_contract.py schlägt fehl,
wenn die Datei nicht mehr zum Code passt. Gegenstück: Projektdokument
gemeinsam/M-Cycle_Schnittstelle-HA-App.md (von Hand gepflegt, nach jeder Änderung hier abgleichen).
Nicht enthalten: Sensor-Attribute (kein sauber lesbarer Ort im Code)."""
import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
ROOT = REPO / "custom_components" / "menstruation_cycle"


def service_names() -> list[str]:
    # no PyYAML: the CI runs the plain unittest runner without extra packages; services sit at column 0
    return re.findall(r"^([a-z_]+):\s*$", (ROOT / "services.yaml").read_text(encoding="utf-8"), re.M)


def build() -> dict:
    services = service_names()
    const = (ROOT / "const.py").read_text(encoding="utf-8")
    symptoms = re.findall(r'^SYMPTOM_[A-Z_]+ = "([a-z_]+)"', const, re.M)
    return {
        "component_version": json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["version"],
        "services": sorted(services),
        "symptom_fields": sorted(symptoms),
    }


if __name__ == "__main__":
    (REPO / "contract.json").write_text(json.dumps(build(), indent=2) + "\n", encoding="utf-8")
