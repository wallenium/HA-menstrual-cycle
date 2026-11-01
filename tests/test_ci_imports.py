"""The CI runs these tests with only aiohttp installed (.github/workflows/hacstest.yml); no other package may be imported.

A missing import fails on GitHub only, so catch it here. Home Assistant is stubbed by the tests themselves."""
import ast
import sys
import unittest
from pathlib import Path

TESTS = Path(__file__).resolve().parent
# aiohttp: installed by the workflow; mctest: package the test builds itself (test_ics_feed.py)
ALLOWED = set(sys.stdlib_module_names) | {p.stem for p in TESTS.glob("*.py")} | {"aiohttp", "mctest"}


def _top_level_imports(tree):
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                yield alias.name.split(".")[0], node
        elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
            yield node.module.split(".")[0], node


class CiImportsTest(unittest.TestCase):
    def test_tests_import_only_what_the_ci_installs(self):
        offenders = []
        for path in sorted(TESTS.glob("*.py")):
            for module, node in _top_level_imports(ast.parse(path.read_text(encoding="utf-8"))):
                if module not in ALLOWED:
                    offenders.append(f"{path.name}:{node.lineno} imports '{module}'")
        self.assertEqual(offenders, [], "not installed in the CI: add it to the workflow or drop the import")


if __name__ == "__main__":
    unittest.main()
