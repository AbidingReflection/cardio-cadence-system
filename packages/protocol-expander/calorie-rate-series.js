/**
 * CalorieRateSeries responsibilities:
 * - Expose calibrated calorie rate as a derived protocol time series.
 * - Resolve required calibration inputs through ProtocolExpander.
 * - Delegate calibration mathematics to evaluateCalibration().
 */

import { evaluateCalibration } from "../protocol-core/calibration-evaluator.js";

/** Exposes calibrated calorie rate as a protocol time series. */
export class CalorieRateSeries {
    #expander;
    #calibrationProfile;
    #variableIds;

    /** Creates a calorie-rate series backed by a protocol expander and calibration profile. */
    constructor(expander, calibrationProfile) {
        if (calibrationProfile.model.outputUnit !== "kcalPerSecond") {
            throw new Error('CalorieRateSeries requires calibration output unit "kcalPerSecond".');
        }

        this.#expander = expander;
        this.#calibrationProfile = calibrationProfile;
        this.#variableIds = calibrationProfile.model.input.variables;
    }

    /** Returns the series identifier. */
    get id() {
        return "calorie-rate";
    }

    /** Returns the series display label. */
    get label() {
        return "Calorie Rate";
    }

    /** Returns the series display unit. */
    get unit() {
        return "kcalPerSecond";
    }

    /** Returns calibrated calorie rate at an absolute workout time. */
    valueAt(timeMs) {
        const values = {};

        for (const variableId of this.#variableIds) {
            const value = this.#expander.valueAt(variableId, timeMs);

            if (value === undefined) {
                return undefined;
            }

            values[variableId] = value;
        }

        return evaluateCalibration(this.#calibrationProfile, values);
    }

    /** Returns calibrated calorie rate immediately before an absolute workout time. */
    valueBefore(timeMs) {
        const values = {};

        for (const variableId of this.#variableIds) {
            const value = this.#expander.valueBefore(variableId, timeMs);

            if (value === undefined) {
                return undefined;
            }

            values[variableId] = value;
        }

        return evaluateCalibration(this.#calibrationProfile, values);
    }

    /** Returns all calibration-input boundaries within an absolute workout time range. */
    boundariesBetween(startTimeMs, endTimeMs) {
        const boundaries = new Set();

        for (const variableId of this.#variableIds) {
            for (const boundary of this.#expander.boundariesBetween(
                variableId,
                startTimeMs,
                endTimeMs,
            )) {
                boundaries.add(boundary);
            }
        }

        return [...boundaries].sort((left, right) => left - right);
    }
}
