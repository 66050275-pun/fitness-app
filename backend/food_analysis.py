"""Validate generated nutrition before it is returned to the browser."""

from __future__ import annotations

from typing import Annotated, Literal
import math
import re

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from .maxplus import AnalysisError
from .nutrients import complete_micronutrients

Macro = Annotated[float, Field(strict=True, ge=0, le=2000, allow_inf_nan=False)]
Confidence = Annotated[float, Field(strict=True, ge=0, le=1, allow_inf_nan=False)]
Note = Annotated[str, Field(strict=True, max_length=400)]
Notes = Annotated[list[Note], Field(max_length=30)]


def _numeric(item):
    # Only bare JSON numeric strings: never infer units or convert an unknown value to zero.
    if isinstance(item, str) and len(item) <= 50 and re.fullmatch(r"\d+(?:\.\d+)?(?:[eE][+-]?\d+)?", item.strip()):
        return float(item.strip())
    return item


def _confidence(item):
    value = _numeric(item)
    return value if type(value) in (int, float) and 0 <= value <= 1 and math.isfinite(value) else None


class StrictResult(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")


class CookingFat(StrictResult):
    estimatedGrams: Macro | None = None
    rangeMinGrams: Macro | None = None
    rangeMaxGrams: Macro | None = None
    confidence: Confidence | None = None
    sources: Notes = Field(default_factory=list)
    assumptions: Notes = Field(default_factory=list)

    @model_validator(mode="after")
    def valid_range(self):
        low, high, estimate = self.rangeMinGrams, self.rangeMaxGrams, self.estimatedGrams
        if low is not None and high is not None and low > high:
            raise ValueError("Unordered cooking-fat range")
        if estimate is not None and ((low is not None and estimate < low) or (high is not None and estimate > high)):
            raise ValueError("Cooking-fat estimate outside its range")
        return self


class Nutrient(StrictResult):
    key: Annotated[str, Field(min_length=1, max_length=100)]
    name: Annotated[str, Field(min_length=1, max_length=200)]
    amount: Annotated[float, Field(strict=True, ge=0, le=1_000_000, allow_inf_nan=False)] | None = None
    unit: Literal["mg", "mcg", "g", "IU", "mg_NE", "mcg_DFE", "mcg_RAE", "mg_alpha_TE"]
    confidence: Confidence | None = None
    source: Literal["ai_estimate"] = "ai_estimate"
    note: Annotated[str, Field(max_length=300)] | None = None


class Micronutrients(StrictResult):
    vitamins: Annotated[list[Nutrient], Field(max_length=100)] = Field(default_factory=list)
    minerals: Annotated[list[Nutrient], Field(max_length=100)] = Field(default_factory=list)
    otherNutrients: Annotated[list[Nutrient], Field(max_length=100)] = Field(default_factory=list)


class BatchNutrient(StrictResult):
    key: Annotated[str, Field(min_length=1, max_length=100)]
    amount: Annotated[float, Field(strict=True, ge=0, le=1_000_000, allow_inf_nan=False)] | None = None
    confidence: Confidence | None = None
    note: Annotated[str, Field(max_length=160)] | None = None


class NutrientBatch(StrictResult):
    nutrients: Annotated[list[BatchNutrient], Field(max_length=8)]


def validate_nutrient_batch(value: object, definitions: list[dict]) -> list[dict]:
    """A batch can only contribute its requested keys, never redefine the primary meal."""
    try:
        lookup = {item["key"]: item for item in definitions}
        if not isinstance(value, dict) or not isinstance(value.get("nutrients"), list) or len(value["nutrients"]) > 8:
            raise ValueError("Missing nutrient batch")
        prepared = []
        for row in value["nutrients"]:
            if not isinstance(row, dict) or not isinstance(row.get("key"), str):
                raise ValueError("Invalid nutrient row")
            identity = re.sub(r"[^a-z0-9]", "", row["key"].lower())
            definition = next((item for key, item in lookup.items() if re.sub(r"[^a-z0-9]", "", key) == identity), None)
            if definition is None:
                raise ValueError("Unrequested nutrient")
            amount = _numeric(row.get("amount"))
            unit = row.get("unit", definition["unit"])
            if unit != definition["unit"]:
                from .nutrients import MASS_FACTORS
                if unit not in MASS_FACTORS or definition["unit"] not in MASS_FACTORS:
                    raise ValueError("Incompatible nutrient unit")
                if amount is not None:
                    if type(amount) not in (float, int):
                        raise ValueError("Invalid nutrient amount")
                    amount *= MASS_FACTORS[unit] / MASS_FACTORS[definition["unit"]]
            note = row.get("note")
            # Extra names/source/DV fields do not override app-owned units, attribution or references.
            prepared.append({"key": definition["key"], "amount": amount, "confidence": _confidence(row.get("confidence")),
                             "note": note[:160] if isinstance(note, str) else note})
        rows = NutrientBatch.model_validate({"nutrients": prepared}).model_dump()["nutrients"]
        seen: set[str] = set()
        result = []
        for row in rows:
            key = row["key"]
            if key not in lookup or key in seen:
                raise ValueError("Unexpected or duplicate batch nutrient")
            seen.add(key)
            result.append({**lookup[key], **row, "source": "ai_estimate",
                           "confidence": row["confidence"] if row["amount"] is not None else None})
        return result
    except (ValidationError, ValueError, TypeError):
        raise AnalysisError("response_invalid") from None


class FoodResult(StrictResult):
    foodName: Annotated[str, Field(min_length=1, max_length=200)]
    servingDescription: Annotated[str, Field(min_length=1, max_length=300)]
    servingWeightGrams: Annotated[float, Field(strict=True, ge=0, le=10_000, allow_inf_nan=False)] | None = None
    calories: Annotated[float, Field(strict=True, ge=0, le=20_000, allow_inf_nan=False)] | None = None
    protein: Macro | None = None
    carbs: Macro | None = None
    fat: Macro | None = None
    ingredients: Notes = Field(default_factory=list)
    overallConfidence: Confidence | None = None
    warnings: Notes = Field(default_factory=list)
    cookingFat: CookingFat | None = None
    micronutrients: Micronutrients | None = None

    @model_validator(mode="after")
    def valid_meal(self):
        if not self.foodName.strip() or not self.servingDescription.strip():
            raise ValueError("Missing food or serving")
        cooking = self.cookingFat.estimatedGrams if self.cookingFat else None
        if cooking is not None and (self.fat is None or cooking > self.fat):
            raise ValueError("Cooking fat must be included in total fat")
        return self


def validate_food_result(value: object) -> dict:
    try:
        result = FoodResult.model_validate(value).model_dump()
        # Every supported nutrient has a row. Completion creates unknowns, never numeric estimates.
        result["micronutrients"] = complete_micronutrients(result["micronutrients"])
        return result
    except (ValidationError, ValueError, TypeError):
        raise AnalysisError("response_invalid") from None


def validate_primary_food_result(value: object) -> dict:
    """Ignore unrequested detail/extra fields while retaining strict checks on meal nutrition."""
    if not isinstance(value, dict):
        raise AnalysisError("response_invalid")
    primary = {key: item for key, item in value.items() if key in FoodResult.model_fields and key != "micronutrients"}

    for key in ("servingWeightGrams", "calories", "protein", "carbs", "fat", "overallConfidence"):
        if key in primary:
            primary[key] = _confidence(primary[key]) if key == "overallConfidence" else _numeric(primary[key])
    cooking = primary.get("cookingFat")
    if isinstance(cooking, dict):
        primary["cookingFat"] = {key: _confidence(item) if key == "confidence" else _numeric(item) if key in (
            "estimatedGrams", "rangeMinGrams", "rangeMaxGrams"
        ) else item for key, item in cooking.items() if key in CookingFat.model_fields}
    return validate_food_result(primary)


def validate_recognition_result(value: object) -> dict:
    """Support the choice envelope and older single-meal replies without fabricating an identity."""
    if not isinstance(value, dict):
        raise AnalysisError("response_invalid")
    candidates = value.get("candidates", [value])
    if not isinstance(candidates, list) or not 1 <= len(candidates) <= 3:
        raise AnalysisError("food_not_recognized")
    validated = []
    for candidate in candidates:
        try:
            meal = validate_primary_food_result(candidate)
        except AnalysisError:
            continue
        note = candidate.get("identificationNote", "")
        validated.append({"meal": meal, "reason": note[:200] if isinstance(note, str) else ""})
    if not validated:
        raise AnalysisError("response_invalid")
    question = value.get("question", "")
    requested = value.get("requiresConfirmation", "candidates" in value)
    low_confidence = any(item["meal"]["overallConfidence"] is None or item["meal"]["overallConfidence"] < 0.65
                         for item in validated)
    return {"requiresConfirmation": requested is not False or len(candidates) > 1 or low_confidence,
            "question": question[:300] if isinstance(question, str) else "", "candidates": validated}
