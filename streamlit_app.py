"""Streamlit Community Cloud entry point for the NutriAI web preview."""

from __future__ import annotations

import os
import hashlib
import re
import subprocess
import tempfile
from pathlib import Path

import streamlit as st


ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"

st.set_page_config(
    page_title="NutriAI",
    page_icon="🥗",
    layout="wide",
    initial_sidebar_state="collapsed",
)


def fingerprint(paths: list[Path]) -> str:
    digest = hashlib.sha256()
    for path in sorted(paths):
        if path.is_file():
            digest.update(path.relative_to(ROOT).as_posix().encode())
            digest.update(b"\0")
            digest.update(path.read_bytes())
    return digest.hexdigest()


@st.cache_resource(show_spinner="NutriAI")
def prepare_frontend(source_signature: str, dependency_signature: str) -> str:
    """Rebuild when frontend sources change; reuse dependencies when their lockfile matches."""
    index_file = DIST / "index.html"
    build_stamp = DIST / ".nutriai-build-signature"
    dependency_stamp = ROOT / "node_modules" / ".nutriai-dependency-signature"
    if not index_file.is_file() or not build_stamp.is_file() or build_stamp.read_text() != source_signature:
        npm_env = os.environ.copy()
        npm_env["npm_config_cache"] = str(Path(tempfile.gettempdir()) / "nutriai-npm-cache")
        if not dependency_stamp.is_file() or dependency_stamp.read_text() != dependency_signature:
            subprocess.run(
                ["npm", "ci", "--no-audit", "--no-fund"],
                cwd=ROOT,
                env=npm_env,
                check=True,
            )
            dependency_stamp.write_text(dependency_signature)
        subprocess.run(["npm", "run", "build"], cwd=ROOT, check=True)
        build_stamp.write_text(source_signature)

    if not index_file.is_file():
        raise FileNotFoundError("Vite did not create dist/index.html")

    return str(DIST)


@st.cache_data(show_spinner=False)
def load_frontend_html(frontend_path: str, source_signature: str) -> str:
    """Inline the Vite output so Streamlit does not expect component handshakes."""
    assets = Path(frontend_path) / "assets"
    javascript_files = sorted(assets.glob("*.js"))
    css_files = sorted(assets.glob("*.css"))
    if len(javascript_files) != 1 or len(css_files) != 1:
        raise RuntimeError("Expected one bundled JavaScript file and one CSS file in dist/assets")

    html = (Path(frontend_path) / "index.html").read_text(encoding="utf-8")
    javascript = javascript_files[0].read_text(encoding="utf-8")
    stylesheet = css_files[0].read_text(encoding="utf-8")

    # Prevent a literal closing script tag in the bundle from ending the HTML script element.
    javascript = re.sub(
        r"</script",
        lambda _: "<\\/script",
        javascript,
        flags=re.IGNORECASE,
    )
    html, script_count = re.subn(
        r"<script\b[^>]*\bsrc=[\"'][^\"']+\.js(?:\?[^\"']*)?[\"'][^>]*>\s*</script>",
        lambda _: f'<script type="module">{javascript}</script>',
        html,
        count=1,
        flags=re.IGNORECASE,
    )
    html, stylesheet_count = re.subn(
        r"<link\b[^>]*\bhref=[\"'][^\"']+\.css(?:\?[^\"']*)?[\"'][^>]*>",
        lambda _: f"<style>{stylesheet}</style>",
        html,
        count=1,
        flags=re.IGNORECASE,
    )
    if script_count != 1 or stylesheet_count != 1:
        raise RuntimeError("Could not inline the JavaScript and CSS references in dist/index.html")

    return html


st.markdown(
    """
    <style>
      [data-testid="stHeader"], [data-testid="stToolbar"], footer { display: none !important; }
      html, body, [data-testid="stApp"], [data-testid="stAppViewContainer"],
      [data-testid="stMain"] { height: 100%; overflow: hidden !important; }
      [data-testid="stMainBlockContainer"] { padding: 0 !important; max-width: none !important; }
      [data-testid="stMain"] { padding-top: 0 !important; }
      [data-testid="stVerticalBlock"] { gap: 0 !important; }
      .stElementContainer:has(iframe[title="NutriAI"]) {
        margin: 0 !important; height: 100vh !important; height: 100dvh !important;
      }
      iframe[title="NutriAI"] {
        display: block; width: 100% !important; border: 0 !important;
        height: 100vh !important; height: 100dvh !important;
      }
    </style>
    """,
    unsafe_allow_html=True,
)

try:
    frontend_files = [ROOT / name for name in (
        "package.json", "package-lock.json", "index.html", "tsconfig.json",
        "vite.config.ts", "tailwind.config.js", "postcss.config.js",
    )] + list((ROOT / "src").rglob("*"))
    source_signature = fingerprint(frontend_files)
    dependency_signature = fingerprint([ROOT / "package.json", ROOT / "package-lock.json"])
    frontend_path = prepare_frontend(source_signature, dependency_signature)
    frontend_html = load_frontend_html(frontend_path, source_signature)
except (FileNotFoundError, RuntimeError, subprocess.CalledProcessError) as exc:
    st.error("NutriAI could not prepare its web files. Check the app logs and try again.")
    st.exception(exc)
    st.stop()

st.iframe(frontend_html, height="stretch", alt="NutriAI")
