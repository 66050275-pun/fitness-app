"""Offline regression checks for the complete Maxplus nutrition contract."""

import unittest
import json
from unittest.mock import AsyncMock, patch

from backend.food_analysis import validate_food_result
from backend.maxplus import AnalysisError
from backend.food_scan_pipeline import analyze_food_in_batches
from backend.nutrients import NUTRIENT_BATCHES


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
        responses = [{"foodName": "Meal", "servingDescription": "One plate"}]
        responses += [{"nutrients": [{"key": row["key"], "amount": None} for row in definitions]}
                      for _, definitions in NUTRIENT_BATCHES]
        fake = AsyncMock(side_effect=[{"choices": [{"message": {"content": json.dumps(result)}}]} for result in responses])
        with patch("backend.maxplus._request_json", fake):
            result = await analyze_food_in_batches("offline-test-key", "vision-model", b"offline-photo", "th")
        self.assertEqual(len(fake.call_args_list), 7)
        primary = fake.call_args_list[0].args[3]
        self.assertEqual(primary["max_tokens"], 2500)
        self.assertEqual(primary["messages"][1]["content"][1]["type"], "image_url")
        for index, (_, definitions) in enumerate(NUTRIENT_BATCHES):
            payload = fake.call_args_list[index + 1].args[3]
            prompt = payload["messages"][1]["content"]
            self.assertIsInstance(prompt, str)
            self.assertLessEqual(len(definitions), 8)
            self.assertEqual(payload["max_tokens"], 1400)
            for row in definitions:
                self.assertIn(row["key"], prompt)
                self.assertIn(row["unit"], prompt)
            self.assertIn("Thai", prompt)
            self.assertIn("amount and confidence MUST be null", prompt)
        self.assertEqual(sum(len(rows) for rows in result["micronutrients"].values()), 40)


if __name__ == "__main__":
    unittest.main()
