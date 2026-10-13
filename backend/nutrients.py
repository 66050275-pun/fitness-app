"""The complete app-owned nutrient contract shared with the TypeScript client."""

from __future__ import annotations

import json
import re
from pathlib import Path

NUTRIENT_CATALOG = json.loads(
    (Path(__file__).resolve().parents[1] / "src/data/foodAnalysisNutrients.json").read_text(encoding="utf-8")
)
MASS_FACTORS = {"g": 1_000_000, "mg": 1000, "mcg": 1}


def nutrient_prompt() -> str:
    return (
        "micronutrients MUST be an object with vitamins, minerals and otherNutrients arrays. "
        "Include EVERY entry in this catalog exactly once in its listed array; keys and units are exact: "
        + json.dumps(NUTRIENT_CATALOG, separators=(",", ":"))
        + ". Each entry has key, name, amount (number|null), unit, confidence (0..1|null), "
        "source (always ai_estimate), note (brief localized estimation basis or reason for unknown, max 300 characters). "
        "Names and notes may be localized. Amounts are for the entire pictured portion, "
        "not per 100 g. Estimate from recognized ingredients, likely quantities, preparation and established "
        "food-composition knowledge. Account for cooking losses and uncertainty about fortification, salt, "
        "oil and sauces. Supply an estimate only when you have a reasonable basis; otherwise amount and "
        "confidence MUST be null. Never replace missing evidence with zero, never invent laboratory precision, "
        "references, brands or a food-database lookup. Zero requires evidence. Do not compute daily-value "
        "percentages (the app does that). Preserve nutrient-specific equivalents (RAE, DFE, NE, alpha-TE); "
        "never convert arbitrary IU or chemically different forms without evidence. Explain major portion "
        "and nutrient assumptions in warnings. Micronutrients are estimates, not measured or verified values."
    )


def complete_micronutrients(profile: dict | None) -> dict:
    """Canonicalize supplied rows; omitted nutrients stay explicitly unknown."""
    result: dict = {}
    for category, definitions in NUTRIENT_CATALOG.items():
        lookup = {re.sub(r"[^a-z0-9]", "", item["key"]): item for item in definitions}
        supplied: dict = {}
        for row in (profile or {}).get(category, []):
            definition = lookup.get(re.sub(r"[^a-z0-9]", "", row["key"].lower()))
            if definition is None or definition["key"] in supplied:
                raise ValueError("Unrecognized or duplicate nutrient")
            amount, unit = row["amount"], row["unit"]
            target_unit = definition["unit"]
            if unit != target_unit:
                if unit not in MASS_FACTORS or target_unit not in MASS_FACTORS:
                    raise ValueError("Incompatible nutrient units")
                if amount is not None:
                    amount *= MASS_FACTORS[unit] / MASS_FACTORS[target_unit]
            if amount is not None and not 0 <= amount <= 1_000_000:
                raise ValueError("Nutrient outside bounds")
            supplied[definition["key"]] = {
                **row, "key": definition["key"], "unit": target_unit, "amount": amount,
                "confidence": row["confidence"] if amount is not None else None,
                "source": "ai_estimate",
            }
        result[category] = [supplied.get(item["key"], {
            **item, "amount": None, "confidence": None, "source": "ai_estimate"
        }) for item in definitions]
    return result
