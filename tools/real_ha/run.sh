#!/usr/bin/env bash
# Runs tools/real_ha/test_real_ha.py against a real Home Assistant core.
# Usage: tools/real_ha/run.sh [HA_VERSION]      e.g. 2026.3.4 (minimum) or leave empty for the newest.
# Needs uv (https://docs.astral.sh/uv/); Home Assistant 2026.3+ needs Python 3.14, uv fetches it.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
version="${1:-}"
venv="${TMPDIR:-/tmp}/mcycle-real-ha-${version:-latest}"
[ -d "$venv" ] || uv venv --python 3.14 "$venv"
if [ -n "$version" ]; then
  uv pip install --python "$venv/bin/python" "homeassistant==$version" pytest-homeassistant-custom-component
else
  uv pip install --python "$venv/bin/python" homeassistant pytest-homeassistant-custom-component
fi
"$venv/bin/python" -c "import homeassistant.const as c; print('Home Assistant', c.__version__)"
cd "$here" && "$venv/bin/python" -m pytest -q -p no:cacheprovider --show-capture=no --tb=short -rfEx .
