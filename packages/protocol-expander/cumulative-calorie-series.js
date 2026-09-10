/**
 * CumulativeCalorieSeries responsibilities:
 * - Expose accumulated calibrated calories as a derived protocol time series.
 * - Integrate calorie rate from workout start to requested workout times.
 * - Preserve calorie-rate boundaries so graph sampling captures slope changes.
 */

import { CalorieRateSeries } from "./calorie-rate-series.js";
import { integrateCalorieRate } from "./calorie-integrator.js";

/** Exposes cumulative calibrated calories as a protocol time series. */
export class CumulativeCalorieSeries {
    #cache;
    #furthestTimeMs;
    #furthestCalories;
    #expander;
    #rateSeries;

    /** Creates a cumulative-calorie series backed by a protocol expander and calibration profile. */
    constructor(expander, calibrationProfile) {
        this.#expander = expander;
        this.#rateSeries = new CalorieRateSeries(expander, calibrationProfile);

        this.#cache = new Map([[0, 0]]);
        this.#furthestTimeMs = 0;
        this.#furthestCalories = 0;
    }

    /** Returns the series identifier. */
    get id() {
        return "cumulative-calories";
    }

    /** Returns the series display label. */
    get label() {
        return "Cumulative Calories";
    }

    /** Returns the series display unit. */
    get unit() {
        return "kcal";
    }

    /** Returns cumulative calories at an absolute workout time. */
    valueAt(timeMs) {
        this.#validateTime(timeMs);

        if (timeMs < 0 || timeMs >= this.#expander.durationMs) {
            return undefined;
        }

        return this.#getCumulativeCalories(timeMs);
    }

    /** Returns cumulative calories immediately before an absolute workout time. */
    valueBefore(timeMs) {
        this.#validateTime(timeMs);

        if (timeMs <= 0 || timeMs > this.#expander.durationMs) {
            return undefined;
        }

        return this.#getCumulativeCalories(timeMs);
    }

    /** Returns all calorie-rate boundaries within an absolute workout time range. */
    boundariesBetween(startTimeMs, endTimeMs) {
        return this.#rateSeries.boundariesBetween(startTimeMs, endTimeMs);
    }

    /** Validates one absolute workout time. */
    #validateTime(timeMs) {
        if (!Number.isFinite(timeMs)) {
            throw new TypeError("Time must be a finite number.");
        }
    }

    /** Returns cumulative calories at a valid workout time, reusing cached progress when possible. */
    #getCumulativeCalories(timeMs) {
        if (this.#cache.has(timeMs)) {
            return this.#cache.get(timeMs);
        }

        let calories;

        if (timeMs > this.#furthestTimeMs) {
            calories =
                this.#furthestCalories +
                integrateCalorieRate(this.#rateSeries, this.#furthestTimeMs, timeMs);

            this.#furthestTimeMs = timeMs;
            this.#furthestCalories = calories;
        } else {
            calories = integrateCalorieRate(this.#rateSeries, 0, timeMs);
        }

        this.#cache.set(timeMs, calories);

        return calories;
    }
}
