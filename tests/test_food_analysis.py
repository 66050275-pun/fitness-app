"""Offline regression checks for the complete Maxplus nutrition contract."""

import unittest
from unittest.mock import AsyncMock, patch

from backend.food_analysis import validate_food_result
from backend.maxplus import AnalysisError, analyze_food_photo
from backend.nutrients import NUTRIENT_CATALOG


class NutrientContractTests(unittest.TestCase):
    def test_missing_rows_are_unknown_and_all_40_are_present(self):
        result = validate_food_result({"foodName": "Meal", "servingDescription": "One plate"})
        rows = [row for values in result["micronutrients"].values() for row in values]
        self.assertEqual(len(rows), 40)
        self.assertTrue(all(row["amount"] is None and row["confidence"] is None for row in rows))

    def test_alias_mass_units_note_and_zero_survive(self):
        result = validate_food_result({"foodName": "Meal", "servingDescription": "One plate", "micronutrients": {
            "vitamins": [{"key": "vitaminC", "name": "Vitamin C", "amount": .02, "unit": "g", "confidence": .5, "note": "Vegetables"}],
            "minerals": [{"key": "calcium", "name": "Calcium", "amount": 0, "unit": "mg"}]}})
        c = next(row for row in result["micronutrients"]["vitamins"] if row["key"] == "vitamin_c")
        self.assertEqual((c["amount"], c["unit"], c["note"]), (20, "mg", "Vegetables"))
        self.assertEqual(result["micronutrients"]["minerals"][0]["amount"], 0)

    def test_duplicate_keys_wrong_group_units_and_nonfinite_values_are_rejected(self):
        row = {"key": "vitamin_c", "name": "C", "amount": 10, "unit": "mg"}
        for profile in ({"vitamins": [row, row]}, {"minerals": [row]},
                        {"vitamins": [{**row, "unit": "IU"}]}, {"vitamins": [{**row, "amount": float("nan")}]},
                        {"vitamins": [{**row, "note": "x" * 301}]}):
            with self.subTest(profile=profile):
                with self.assertRaises(AnalysisError):
                    validate_food_result({"foodName": "Meal", "servingDescription": "One plate", "micronutrients": profile})


class PromptTests(unittest.IsolatedAsyncioTestCase):
    async def test_provider_prompt_requests_every_supported_nutrient_in_selected_language(self):
        fake = AsyncMock(return_value={"choices": [{"message": {"content": '{"foodName":"Meal","servingDescription":"One plate"}'}}]})
        with patch("backend.maxplus._request_json", fake):
            await analyze_food_photo("offline-test-key", "vision-model", b"offline-photo", "th")
        payload = fake.call_args.args[3]
        prompt = payload["messages"][1]["content"][0]["text"]
        for definitions in NUTRIENT_CATALOG.values():
            for row in definitions:
                self.assertIn(row["key"], prompt)
                self.assertIn(row["unit"], prompt)
        self.assertIn("Thai", prompt)
        self.assertIn("amount and confidence MUST be null", prompt)
        self.assertGreaterEqual(payload["max_tokens"], 6500)


if __name__ == "__main__":
    unittest.main()
