"""Build a browser fixture from the actual Streamlit iframe, with synthetic tests only."""
import json
from pathlib import Path
from streamlit.testing.v1 import AppTest
root = Path(__file__).resolve().parents[1]
app = AppTest.from_file(str(root / "streamlit_app.py")).run(timeout=60)
if app.exception:
    raise RuntimeError("Streamlit preview failed")
html = app.get("iframe")[0].proto.srcdoc
payload = json.dumps(html).replace("</", "<\\/")
(root / "dist" / "inline-fixture.html").write_text(
    '<!doctype html><html><body><iframe id="preview" sandbox="allow-scripts allow-same-origin allow-downloads allow-forms allow-modals" style="width:430px;height:900px"></iframe><script>document.getElementById("preview").srcdoc='
    + payload + ';</script></body></html>', encoding="utf-8")
print("Prepared Streamlit browser fixture")
