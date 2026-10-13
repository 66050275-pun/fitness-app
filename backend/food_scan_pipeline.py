"""One photo recognition plus small sequential text-only nutrient requests."""

from __future__ import annotations

import asyncio
from collections.abc import Callable

from .food_analysis import validate_primary_food_result, validate_nutrient_batch
from .maxplus import AnalysisError, analyze_food_photo, analyze_nutrient_batch
from .nutrients import NUTRIENT_BATCHES, complete_micronutrients

TOTAL_BATCHES = len(NUTRIENT_BATCHES)
MAX_ANALYSIS_SECONDS = 210
STOP_BATCH_ERRORS = {
    "key_invalid", "key_rejected", "billing_required", "model_required", "configuration_invalid",
    "model_or_image_rejected", "provider_redirect", "provider_rate_limit", "provider_unavailable",
    "provider_timeout", "provider_error",
}


async def analyze_food_in_batches(key: str, model: str, photo: bytes, language: str, base_url: str | None = None,
                                  on_progress: Callable[[dict], None] | None = None) -> dict:
    """A failed detailed batch leaves its values unknown; a failed primary meal aborts the scan."""
    def progress(percent: int, stage: str, handled: int = 0):
        if on_progress is not None:
            on_progress({"percent": percent, "stage": stage, "completedBatches": handled, "totalBatches": TOTAL_BATCHES})

    meal: dict | None = None
    handled = 0
    incomplete = False
    profile = {"vitamins": [], "minerals": [], "otherNutrients": []}

    async def run_batches():
        nonlocal meal, handled, incomplete
        progress(15, "meal")
        raw = await asyncio.wait_for(analyze_food_photo(key, model, photo, language, base_url), 45)
        meal = validate_primary_food_result(raw)
        # Detailed estimates use this fixed validated portion and never alter its primary totals.
        progress(30, "nutrients")
        for category, definitions in NUTRIENT_BATCHES:
            try:
                result = await asyncio.wait_for(analyze_nutrient_batch(key, model, meal, definitions, language, base_url), 25)
                profile[category].extend(validate_nutrient_batch(result, definitions))
            except asyncio.TimeoutError:
                incomplete = True
                handled += 1
                progress(30 + handled * 10, "nutrients", handled)
                break
            except AnalysisError as error:
                incomplete = True
                handled += 1
                progress(30 + handled * 10, "nutrients", handled)
                if error.code in STOP_BATCH_ERRORS:
                    break
                continue
            handled += 1
            progress(30 + handled * 10, "nutrients", handled)

    try:
        await asyncio.wait_for(run_batches(), MAX_ANALYSIS_SECONDS)
    except asyncio.TimeoutError:
        if meal is None:
            raise AnalysisError("provider_timeout") from None
        incomplete = True

    if meal is None:
        raise AnalysisError("response_invalid")
    progress(95, "combining", handled)
    meal["micronutrients"] = complete_micronutrients(profile)
    if incomplete or handled < TOTAL_BATCHES:
        warning = ("วิเคราะห์สารอาหารรองบางชุดไม่สำเร็จ ค่าที่ไม่มีข้อมูลยังไม่ทราบค่า โปรดตรวจสอบยอดอาหารก่อนบันทึก"
                   if language == "th" else
                   "Some detailed nutrient batches could not be analyzed. Unavailable values remain unknown; review the meal totals before saving.")
        meal["warnings"] = meal["warnings"][:29] + [warning]
    return meal
