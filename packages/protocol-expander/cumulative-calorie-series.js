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
    #expander;
    #rateSeries;

    /** Creates a cumulative-calorie series backed by a protocol expander and calibration profile. */
    constructor(expander, calibrationProfile) {
        this.#expander = expander;
        this.#rateSeries = new CalorieRateSeries(expander, calibrationProfile);
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

        return integrateCalorieRate(this.#rateSeries, 0, timeMs);
    }

    /** Returns cumulative calories immediately before an absolute workout time. */
    valueBefore(timeMs) {
        this.#validateTime(timeMs);

        if (timeMs <= 0 || timeMs > this.#expander.durationMs) {
            return undefined;
        }

        return integrateCalorieRate(this.#rateSeries, 0, timeMs);
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
}
