"""Streamlit Community Cloud entry point for the NutriAI web preview."""

from __future__ import annotations

import os
import subprocess
import tempfile
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components


ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"

st.set_page_config(
    page_title="NutriAI",
    page_icon="🥗",
    layout="wide",
    initial_sidebar_state="collapsed",
)


@st.cache_resource(show_spinner="Preparing the NutriAI mobile preview…")
def prepare_frontend() -> str:
    """Install and build the Vite app once when Streamlit starts."""
    index_file = DIST / "index.html"
    if not index_file.is_file():
        npm_env = os.environ.copy()
        npm_env["npm_config_cache"] = str(Path(tempfile.gettempdir()) / "nutriai-npm-cache")
        subprocess.run(
            ["npm", "ci", "--no-audit", "--no-fund"],
            cwd=ROOT,
            env=npm_env,
            check=True,
        )
        subprocess.run(["npm", "run", "build"], cwd=ROOT, check=True)

    if not index_file.is_file():
        raise FileNotFoundError("Vite did not create dist/index.html")

    return str(DIST)


st.markdown(
    """
    <style>
      [data-testid="stHeader"], [data-testid="stToolbar"], footer { display: none !important; }
      [data-testid="stMainBlockContainer"] { padding: 0 !important; max-width: none !important; }
      [data-testid="stMain"] { padding-top: 0 !important; }
      iframe { display: block; width: 100% !important; border: 0 !important; }
    </style>
    """,
    unsafe_allow_html=True,
)

try:
    frontend_path = prepare_frontend()
except (FileNotFoundError, subprocess.CalledProcessError) as exc:
    st.error("NutriAI could not prepare its web files. Check the app logs and try again.")
    st.exception(exc)
    st.stop()

nutriai = components.declare_component("nutriai_web_preview", path=frontend_path)
nutriai(key="nutriai-web-preview", height=900, scrolling=True)
