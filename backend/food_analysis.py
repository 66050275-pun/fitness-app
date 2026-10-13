"""Validate generated nutrition before it is returned to the browser."""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from .maxplus import AnalysisError
from .nutrients import complete_micronutrients

Macro = Annotated[float, Field(strict=True, ge=0, le=2000, allow_inf_nan=False)]
Confidence = Annotated[float, Field(strict=True, ge=0, le=1, allow_inf_nan=False)]
Note = Annotated[str, Field(strict=True, max_length=400)]
Notes = Annotated[list[Note], Field(max_length=30)]


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
