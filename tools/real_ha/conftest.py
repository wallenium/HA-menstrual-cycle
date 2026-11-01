"""Makes the repository's custom_components folder visible to the Home Assistant test plugin."""
import shutil
from pathlib import Path

import pytest

pytest_plugins = "pytest_homeassistant_custom_component"
REPO = Path(__file__).resolve().parents[2]


@pytest.fixture(autouse=True)
def _load_component(enable_custom_integrations):
    import custom_components

    path = str(REPO / "custom_components")
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
