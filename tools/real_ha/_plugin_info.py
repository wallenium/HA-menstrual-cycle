"""Prints what the newest pytest-homeassistant-custom-component release is built for: {"pin": HA version, "deps": [names]}.

run.sh asks this to learn whether the requested Home Assistant is newer than any plugin release (see run.sh)."""
import json
import re
import urllib.request

with urllib.request.urlopen("https://pypi.org/pypi/pytest-homeassistant-custom-component/json", timeout=30) as response:
    requires = json.load(response)["info"]["requires_dist"] or []
pin = next((r.split("==")[1].split(";")[0].strip() for r in requires if r.startswith("homeassistant==")), "")
deps = sorted({re.split(r"[=<>!~ ;\[]", r)[0] for r in requires if "extra ==" not in r and not r.startswith("homeassistant")})
print(json.dumps({"pin": pin, "deps": deps}))
