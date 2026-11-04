"""Starts pytest with Home Assistant imported first (some plugins import httpx before it, which Home Assistant 2026.11 forbids)."""
import sys

import homeassistant  # noqa: F401  (must come before any plugin import)
import pytest

sys.exit(pytest.main(sys.argv[1:]))
