"""contract.json (Schnittstelle zur App) muss zum Code passen; add_symptom muss alle Symptomfelder beschreiben."""
import importlib.util
import json
import unittest
from pathlib import Path

import yaml

REPO = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("contract", REPO / "tools" / "contract.py")
contract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contract)


class ContractTest(unittest.TestCase):
    def test_contract_json_is_current(self):
        stored = json.loads((REPO / "contract.json").read_text(encoding="utf-8"))
        self.assertEqual(stored, contract.build(), "python3 tools/contract.py ausfuehren und dann gemeinsames Dokument abgleichen")

    def test_add_symptom_describes_every_symptom_field(self):
        services = yaml.safe_load((contract.ROOT / "services.yaml").read_text(encoding="utf-8"))
        text = services["add_symptom"]["fields"]["symptom_data"]["description"]
        missing = [f for f in contract.build()["symptom_fields"] if f not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
