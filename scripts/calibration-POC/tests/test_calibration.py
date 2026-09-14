import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = SCRIPT_DIR.parent
SRC_DIR = PROJECT_DIR / "src"

sys.path.insert(0, str(SRC_DIR))

from calibration_data import (
    load_calibration_data,
    prepare_calibration_data,
    write_calibration_template,
)
from calibration_models import (
    build_product_features,
    fit_least_squares,
)

VARIABLES = [
    "cadence",
    "resistance",
]


class CalibrationDataTests(unittest.TestCase):
    def test_friendly_headers_are_normalized(self):
        data = pd.DataFrame(
            [
                {
                    "Start Minute": 0,
                    "Start Second": 0,
                    "End Minute": 2,
                    "End Second": 30,
                    "Cadence": 60,
                    "Resistance": 10,
                    "Start Calories": 0,
                    "End Calories": 30,
                }
            ]
        )

        prepared = prepare_calibration_data(
            data,
            VARIABLES,
        )

        self.assertIn("start_minute", prepared.columns)
        self.assertIn("end_second", prepared.columns)
        self.assertIn("cadence", prepared.columns)
        self.assertIn("resistance", prepared.columns)

        self.assertEqual(
            prepared.loc[1, "duration_seconds"],
            150,
        )

        self.assertEqual(
            prepared.loc[1, "calorie_delta"],
            30,
        )

    def test_missing_required_column_is_rejected(self):
        data = pd.DataFrame(
            [
                {
                    "Start Minute": 0,
                    "Start Second": 0,
                    "End Minute": 2,
                    "Cadence": 60,
                    "Resistance": 10,
                    "Start Calories": 0,
                    "End Calories": 30,
                }
            ]
        )

        with self.assertRaisesRegex(
            ValueError,
            "end_second",
        ):
            prepare_calibration_data(
                data,
                VARIABLES,
            )

    def test_template_contains_expected_headers(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            template_file = Path(temp_dir) / "calibration-template.ods"

            write_calibration_template(
                template_file,
                VARIABLES,
            )

            data = load_calibration_data(
                template_file,
            )

            self.assertEqual(
                list(data.columns),
                [
                    "Start Minute",
                    "Start Second",
                    "End Minute",
                    "End Second",
                    "Cadence",
                    "Resistance",
                    "Start Calories",
                    "End Calories",
                ],
            )


class CalibrationModelTests(unittest.TestCase):
    def test_product_features_use_selected_variables(self):
        data = pd.DataFrame(
            {
                "strokeRate": [20, 30],
                "dragFactor": [100, 120],
            }
        )

        features = build_product_features(
            data,
            variables=[
                "strokeRate",
                "dragFactor",
            ],
            degree=2,
        )

        expected = np.array(
            [
                [1, 2000, 4_000_000],
                [1, 3600, 12_960_000],
            ],
            dtype=float,
        )

        np.testing.assert_allclose(
            features,
            expected,
        )

    def test_product_polynomial_fit_recovers_known_coefficients(self):
        data = pd.DataFrame(
            {
                "cadence": [1, 1, 1, 1, 1, 1],
                "resistance": [1, 2, 3, 4, 5, 6],
            }
        )

        expected_coefficients = np.array(
            [
                0.5,
                2.0,
                -0.25,
                0.1,
            ],
            dtype=float,
        )

        features = build_product_features(
            data,
            variables=VARIABLES,
            degree=3,
        )

        target = features @ expected_coefficients

        coefficients = fit_least_squares(
            features,
            target,
        )

        np.testing.assert_allclose(
            coefficients,
            expected_coefficients,
            rtol=1e-10,
            atol=1e-12,
        )


if __name__ == "__main__":
    unittest.main()
