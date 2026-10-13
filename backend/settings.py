"""Server-only Maxplus settings and a small public capability description."""

from __future__ import annotations

from dataclasses import dataclass, field
import hashlib
import json
import os
from typing import Any, Mapping

from .maxplus import AnalysisError, normalize_base_url, normalize_key, normalize_model


@dataclass(frozen=True)
class AnalysisSettings:
    api_key: str = field(repr=False)
    model: str
    base_url: str
    access_code: str = field(repr=False)
    daily_limit: int
    error: str | None = None
    notice_en: str = "Your food photo passes through NutriAI's server to Maxplus and its model service. NutriAI does not save the photo. Provider processing and retention follow their own policies."
    notice_th: str = "รูปอาหารจะผ่านเซิร์ฟเวอร์ NutriAI ไปยัง Maxplus และบริการโมเดล แอปไม่บันทึกรูป ส่วนการประมวลผลและการเก็บข้อมูลของผู้ให้บริการเป็นไปตามนโยบายของผู้ให้บริการนั้น"

    def public_config(self) -> dict:
        public = {"ready": self.error is None, "provider": "Maxplus", "model": self.model if self.error is None else None,
                  "analysisProtocol": "food-choices-v3",
                  "accessCodeRequired": bool(self.access_code), "error": self.error,
                  "notice": {"en": self.notice_en, "th": self.notice_th}}
        # Version only public metadata. Never hash/return the provider key or access code.
        public["version"] = hashlib.sha256(json.dumps(public, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:24]
        return public


def load_settings(secrets: Mapping[str, Any] | None = None) -> AnalysisSettings:
    def value(name: str, default: str = "") -> str:
        try:
            item = secrets[name] if secrets is not None and name in secrets else os.environ.get(name, default)
        except (KeyError, FileNotFoundError):
            item = os.environ.get(name, default)
        return item.strip() if isinstance(item, str) else str(item)

    key = value("MAXPLUS_API_KEY")
    model = value("MAXPLUS_MODEL")
    base = value("MAXPLUS_BASE_URL")
    access = value("MAXPLUS_ACCESS_CODE")
    error = None
    try:
        base = normalize_base_url(base)
        if not key or key == "replace-with-your-maxplus-key":
            error = "service_not_configured"
        else:
            key = normalize_key(key)
        if not model or model == "replace-with-an-image-capable-model-id":
            error = "service_not_configured"
        else:
            model = normalize_model(model)
        if access and (len(access) < 16 or len(access) > 256 or any(ord(c) < 32 for c in access)):
            error = "configuration_invalid"
    except AnalysisError:
        error = "configuration_invalid"
    limit = value("MAXPLUS_DAILY_SCAN_LIMIT", "20")
    if not limit.isdecimal() or not 1 <= int(limit) <= 1000:
        error = "configuration_invalid"
        limit = "20"
    notice_en = value("MAXPLUS_PHOTO_NOTICE_EN")
    notice_th = value("MAXPLUS_PHOTO_NOTICE_TH")
    options: dict[str, Any] = {}
    if notice_en or notice_th:
        if not notice_en or not notice_th or max(len(notice_en), len(notice_th)) > 5000:
            error = "configuration_invalid"
        else:
            options = {"notice_en": notice_en, "notice_th": notice_th}
    # A misplaced secret must not become a public model label or notice.
    public_text = (model, notice_en, notice_th)
    if any(secret and any(secret in text for text in public_text) for secret in (key, access)):
        error = "configuration_invalid"
        options = {}
    if key and key in base:
        error = "configuration_invalid"
    return AnalysisSettings(api_key=key, model=model, base_url=base, access_code=access,
                            daily_limit=int(limit), error=error, **options)
