/**
 * Calorie integrator responsibilities:
 * - Integrate a calorie-rate series over an absolute workout time range.
 * - Convert millisecond-domain integration into calories.
 */

import { integrateSeries } from "./numerical-integrator.js";

const MILLISECONDS_PER_SECOND = 1000;

/** Integrates a calorie-rate series over an absolute workout time range. */
export function integrateCalorieRate(series, startTimeMs, endTimeMs) {
    return integrateSeries(series, startTimeMs, endTimeMs) / MILLISECONDS_PER_SECOND;
}
