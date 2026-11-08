#!/usr/bin/env bash
# Browser check: loads the dashboard panel and all cards in Chromium against data a real Home Assistant produced.
# Usage: tools/real_ha/browser.sh [HA_VERSION] [SCREENSHOT_DIR]
# Needs what run.sh needs, plus Playwright and axe-core: pip install playwright axe-playwright-python && playwright install chromium (PLAYWRIGHT_PYTHON overrides python3).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
version="${1:-}"
bash "$here/run.sh" ${version:+"$version"}
venv="${TMPDIR:-/tmp}/mcycle-real-ha-${version:-latest}"
out="$(mktemp -d)"
(cd "$here" && MCYCLE_FIXTURE_DIR="$out" "$venv/bin/python" "$here/pytest_launcher.py" -q -p no:cacheprovider --show-capture=no --tb=short test_browser_fixtures.py)
"${PLAYWRIGHT_PYTHON:-python3}" "$here/browser_check.py" "$out" ${2:+"$2"}
