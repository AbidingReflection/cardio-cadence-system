import { assertEqual, test } from "../../js-testing/framework/test-framework.js";

import { integrateCalorieRate } from "../calorie-integrator.js";

/** Creates a minimal calorie-rate series fixture. */
function createSeries(valueAt) {
    return {
        valueAt,
        valueBefore: valueAt,
        boundariesBetween() {
            return [];
        },
    };
}

test("calorie-integrator", "converts integrated calorie rate into calories", () => {
    const series = createSeries(() => 2);

    const calories = integrateCalorieRate(series, 0, 10000);

    assertEqual(calories, 20);
});

test("calorie-integrator", "returns zero for an empty range", () => {
    const series = createSeries(() => 2);

    assertEqual(integrateCalorieRate(series, 5000, 5000), 0);
});
