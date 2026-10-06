"""Every registered service must be removed on the last unload and be described in services.yaml (source check)."""

from __future__ import annotations

import ast
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "menstruation_cycle"
INIT = (ROOT / "__init__.py").read_text(encoding="utf-8")


def _registered() -> set[str]:
    return set(re.findall(r"async_register\(\s*DOMAIN,\s*(SERVICE_\w+)", INIT))


def _removed_on_unload() -> set[str]:
    for node in ast.walk(ast.parse(INIT)):
        if isinstance(node, ast.For) and isinstance(node.iter, ast.Tuple) and any(
            "async_remove" in ast.dump(sub) for sub in ast.walk(node)
        ):
            return {elt.id for elt in node.iter.elts}
    raise AssertionError("service removal loop not found")


def _consts() -> dict[str, str]:
    tree = ast.parse((ROOT / "const.py").read_text(encoding="utf-8"))
    return {
        n.targets[0].id: n.value.value
        for n in tree.body
        if isinstance(n, ast.Assign) and isinstance(n.targets[0], ast.Name) and isinstance(n.value, ast.Constant)
    }


class ServiceConsistencyTests(unittest.TestCase):
    def test_registrations_are_found(self) -> None:
        self.assertGreater(len(_registered()), 30)

    def test_every_registered_service_is_removed_on_last_unload(self) -> None:
        self.assertEqual(sorted(_registered() - _removed_on_unload()), [])

    def test_unload_list_has_no_unregistered_service(self) -> None:
        self.assertEqual(sorted(_removed_on_unload() - _registered()), [])

    def test_every_registered_service_is_described_in_services_yaml(self) -> None:
        consts = _consts()
        yaml_text = (ROOT / "services.yaml").read_text(encoding="utf-8")
        described = set(re.findall(r"^([a-z_]+):\s*$", yaml_text, flags=re.M))
        self.assertEqual(sorted(consts[name] for name in _registered() if consts[name] not in described), [])


if __name__ == "__main__":
    unittest.main()
