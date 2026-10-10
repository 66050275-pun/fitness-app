"""Build a browser fixture from the actual Streamlit iframe, with synthetic tests only."""
import json
from pathlib import Path
from streamlit.testing.v1 import AppTest
root = Path(__file__).resolve().parents[1]
app = AppTest.from_file(str(root / "streamlit_app.py")).run(timeout=60)
if app.exception:
    raise RuntimeError("Streamlit preview failed")
html = app.get("iframe")[0].proto.srcdoc
# Exercise the same outer viewport policy as the deployed Streamlit host.
host_css = next(element.value for element in app.markdown if 'iframe[title="NutriAI"]' in element.value)
payload = json.dumps(html).replace("</", "<\\/")
(root / "dist" / "inline-fixture.html").write_text(
    '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">'
    + host_css + '<style>html,body{margin:0;width:100%;height:100%;}</style></head><body>'
    + '<iframe id="preview" title="NutriAI" sandbox="allow-scripts allow-same-origin allow-downloads allow-forms allow-modals"></iframe><script>document.getElementById("preview").srcdoc='
    + payload + ';</script></body></html>', encoding="utf-8")
print("Prepared Streamlit browser fixture")
