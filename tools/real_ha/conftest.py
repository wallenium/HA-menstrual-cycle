"""Makes the repository's custom_components folder visible to the Home Assistant test plugin."""
import os
import shutil
from pathlib import Path

import pytest

pytest_plugins = "pytest_homeassistant_custom_component"
REPO = Path(__file__).resolve().parents[2]


@pytest.fixture(autouse=True)
def _load_component(request):
    # recorder_mock insists on being set up before hass; autouse fixtures that need hass would otherwise come first
    if "recorder_mock" in request.fixturenames:
        request.getfixturevalue("recorder_mock")
    request.getfixturevalue("enable_custom_integrations")
    import custom_components

    # MCYCLE_COMPONENT_DIR points at another custom_components folder (the upgrade test runs an older release this way)
    path = os.environ.get("MCYCLE_COMPONENT_DIR") or str(REPO / "custom_components")
    if path not in list(custom_components.__path__):
        custom_components.__path__.append(path)
    yield


@pytest.fixture(autouse=True)
def _clean_exports():
    # the plugin's config folder is shared between runs; exports written by one test must not leak into the next
    from pytest_homeassistant_custom_component import testing_config

    target = Path(testing_config.__file__).parent / "menstruation_cycle_exports"
    shutil.rmtree(target, ignore_errors=True)
    yield
    shutil.rmtree(target, ignore_errors=True)


@pytest.fixture(autouse=True)
async def _unload_entries(request):
    # a profile must unload cleanly; otherwise its timers outlive the test (seen as "Lingering timer" now and then)
    yield
    if "hass" not in request.fixturenames:
        return
    hass = request.getfixturevalue("hass")
    for entry in hass.config_entries.async_entries():
        if entry.state.recoverable:
            assert await hass.config_entries.async_unload(entry.entry_id), f"{entry.title} did not unload"
    await hass.async_block_till_done()
