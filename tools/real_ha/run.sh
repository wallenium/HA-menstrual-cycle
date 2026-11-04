#!/usr/bin/env bash
# Runs tools/real_ha/test_real_ha.py against a real Home Assistant core.
# Usage: tools/real_ha/run.sh [HA_VERSION [pytest arguments]]      e.g. 2026.3.4 (minimum) or leave empty for the newest;
# without arguments all tests run, e.g. "run.sh 2026.3.4 test_notifications.py -x" runs one file.
# Needs uv (https://docs.astral.sh/uv/); Home Assistant 2026.3+ needs Python 3.14, uv fetches it.
#
# A Home Assistant release newer than the newest pytest-homeassistant-custom-component release has no matching plugin yet
# (pip would pick a 2021 plugin that cannot even start). Then the newest plugin is used anyway, with one import fixed for
# the move of a Home Assistant helper. That is a stopgap: it ends by itself as soon as the plugin catches up.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
version="${1:-}"
shift || true
venv="${TMPDIR:-/tmp}/mcycle-real-ha-${version:-latest}"
[ -d "$venv" ] || uv venv --python 3.14 "$venv"
py="$venv/bin/python"

info="$(python3 "$here/_plugin_info.py" 2>/dev/null || echo '{"pin": "", "deps": []}')"
pin="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["pin"])' "$info")"
newer_than_plugin() {  # true when HA_VERSION is newer than the version the newest plugin is built for
  [ -n "$version" ] && [ -n "$pin" ] && [ "$(printf '%s\n%s\n' "$pin" "$version" | sort -V | tail -1)" = "$version" ] && [ "$version" != "$pin" ]
}

if newer_than_plugin; then
  echo "No pytest-homeassistant-custom-component release for Home Assistant $version yet (newest: $pin); using it with a patch."
  uv pip install --python "$py" "homeassistant==$version"
  uv pip install --python "$py" --no-deps --reinstall-package pytest-homeassistant-custom-component pytest-homeassistant-custom-component
  deps="$(python3 -c 'import json,sys; print(" ".join(json.loads(sys.argv[1])["deps"]))' "$info")"
  # shellcheck disable=SC2086
  uv pip install --python "$py" --upgrade $deps
  "$py" - <<'PY'
import pathlib
import pytest_homeassistant_custom_component as plugin

common = pathlib.Path(plugin.__file__).parent / "common.py"
text = common.read_text()
old = "    SERVICE_SET_LEVEL,\n    _clear_logger_overwrites,\n)"
if old in text:  # the helper moved to homeassistant.components.logger.helpers in 2026.11
    common.write_text(text.replace(old, "    SERVICE_SET_LEVEL,\n)\nfrom homeassistant.components.logger.helpers import _clear_logger_overwrites"))
    print("patched", common)
PY
elif [ -n "$version" ]; then
  uv pip install --python "$py" "homeassistant==$version" pytest-homeassistant-custom-component
else
  uv pip install --python "$py" homeassistant pytest-homeassistant-custom-component
fi
"$py" -c "import homeassistant.const as c; print('Home Assistant', c.__version__)"
cd "$here" && "$py" pytest_launcher.py -q -p no:cacheprovider --show-capture=no --tb=short -rfEx "${@:-.}"
