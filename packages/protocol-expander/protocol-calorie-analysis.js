/**
 * Protocol calorie analysis responsibilities:
 * - Calculate total calibrated calories for a complete protocol.
 * - Compose protocol expansion, calorie-rate evaluation, and integration.
 */

import { CalorieRateSeries } from "./calorie-rate-series.js";
import { integrateCalorieRate } from "./calorie-integrator.js";
import { ProtocolExpander } from "./protocol-expander.js";

/** Calculates total calibrated calories for a complete protocol. */
export function calculateProtocolCalories(protocol, calibrationProfile) {
    const expander = new ProtocolExpander(protocol);
    const series = new CalorieRateSeries(expander, calibrationProfile);

    return integrateCalorieRate(series, 0, expander.durationMs);
}
