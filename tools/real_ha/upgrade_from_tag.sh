#!/usr/bin/env bash
# Upgrade test: the released version TAG creates data in a real Home Assistant, the current code must read it unchanged.
# Usage: tools/real_ha/upgrade_from_tag.sh [TAG] [HA_VERSION]
# TAG defaults to the newest tag before the current commit (needs a git checkout with tags; in CI: fetch-depth 0).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
tag="${1:-}"
version="${2:-}"
if [ -z "$tag" ]; then
  current="$(git -C "$repo" describe --exact-match --tags HEAD 2>/dev/null || echo __none__)"
  tag="$(git -C "$repo" tag --merged HEAD --sort=-v:refname | grep -vx "$current" | head -1)"
fi
[ -n "$tag" ] || { echo "no tag to upgrade from" >&2; exit 1; }
venv="${TMPDIR:-/tmp}/mcycle-real-ha-${version:-latest}"
[ -x "$venv/bin/python" ] || bash "$here/run.sh" ${version:+"$version"} >/dev/null
work="$(mktemp -d)"
git -C "$repo" archive "$tag" custom_components | tar -x -C "$work"
echo "Upgrade test: $tag -> current code"
run() { (cd "$here" && MCYCLE_DUMP="$work/dump.json" "$@" "$venv/bin/python" "$here/pytest_launcher.py" -q -p no:cacheprovider --show-capture=no --tb=short test_upgrade_from_tag.py); }
run env MCYCLE_PHASE=old MCYCLE_COMPONENT_DIR="$work/custom_components"
run env MCYCLE_PHASE=new
