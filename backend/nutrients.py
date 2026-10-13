"""The complete app-owned nutrient contract shared with the TypeScript client."""

from __future__ import annotations

import json
import re
from pathlib import Path

NUTRIENT_CATALOG = json.loads(
    (Path(__file__).resolve().parents[1] / "src/data/foodAnalysisNutrients.json").read_text(encoding="utf-8")
)
MASS_FACTORS = {"g": 1_000_000, "mg": 1000, "mcg": 1}
NUTRIENT_BATCHES = tuple(
    (category, definitions[offset:offset + 8])
    for category, definitions in NUTRIENT_CATALOG.items()
    for offset in range(0, len(definitions), 8)
)


def nutrient_prompt(definitions: list[dict]) -> str:
    return (
        "Return only {\"nutrients\":[...]} with one row for EVERY key in this small catalog: "
        + json.dumps(definitions, separators=(",", ":"))
        + ". A row contains ONLY key, amount (number|null), confidence (0..1|null), and note "
        "(brief localized estimation basis or unknown reason, at most 160 characters). Do not return "
        "name, unit, source, macros, percentages or any other fields. Use exactly the catalog's keys "
        "and units for amounts, for the whole portion described in the meal context. "
        "Estimate from the recognized dish, ingredients, portion, preparation and food-composition "
        "knowledge. The context is an uncertain photo estimate, not measured ingredient quantities. "
        "Account for cooking losses and uncertainty about fortification, salt and sauces. "
        "If there is no reasonable basis, amount and confidence MUST be null, never zero. "
        "Never invent measurements, precise confidence, brands, references or a database lookup. "
        "Preserve RAE/DFE/NE/alpha-TE equivalents; do not invent conversions or medical advice."
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
