/**
 * Cadence phase responsibilities:
 * - Integrate protocol cadence into accumulated workout cycles.
 * - Resolve normalized cadence-cycle phase at an absolute workout time.
 * - Locate future cycle boundaries without depending on progression types.
 */

import { integrateSeries } from "/packages/protocol-expander/numerical-integrator.js";

const MILLISECONDS_PER_MINUTE = 60000;
const CYCLE_EPSILON = 1e-10;
const TIME_TOLERANCE_MS = 0.01;

/** Interprets protocol cadence as accumulated cycle phase over workout time. */
export class CadencePhase {
    #protocolExpander;
    #cadenceVariableId;
    #series;

    /** Creates cadence phase timing from a ProtocolExpander cadence variable. */
    constructor(protocolExpander, cadenceVariableId) {
        this.#protocolExpander = protocolExpander;
        this.#cadenceVariableId = cadenceVariableId;
        this.#series = createCadenceSeries(protocolExpander, cadenceVariableId);
    }

    /** Returns the number of cadence cycles accumulated over a workout time range. */
    cyclesBetween(startTimeMs, endTimeMs) {
        const integratedCadence = integrateSeries(this.#series, startTimeMs, endTimeMs);

        return integratedCadence / MILLISECONDS_PER_MINUTE;
    }

    /** Returns the total cadence cycles accumulated from workout start. */
    cyclesAt(timeMs) {
        validateTime(timeMs, this.#protocolExpander.durationMs);

        return this.cyclesBetween(0, timeMs);
    }

    /** Returns normalized cadence-cycle phase within the range [0, 1). */
    phaseAt(timeMs) {
        const cycles = this.cyclesAt(timeMs);
        const phase = cycles - Math.floor(cycles);

        return normalizePhase(phase);
    }

    /** Returns the first cadence cycle boundary strictly after a workout time. */
    nextCycleBoundaryAfter(timeMs) {
        validateTime(timeMs, this.#protocolExpander.durationMs);

        if (timeMs === this.#protocolExpander.durationMs) {
            return undefined;
        }

        const phase = this.phaseAt(timeMs);
        const cyclesNeeded = phase === 0 ? 1 : 1 - phase;

        const availableCycles = this.cyclesBetween(timeMs, this.#protocolExpander.durationMs);

        if (availableCycles + CYCLE_EPSILON < cyclesNeeded) {
            return undefined;
        }

        return this.#findTimeForCycleAdvance(
            timeMs,
            this.#protocolExpander.durationMs,
            cyclesNeeded,
        );
    }

    /** Locates the workout time that accumulates a requested cycle advance. */
    #findTimeForCycleAdvance(startTimeMs, endTimeMs, targetCycles) {
        let lowTimeMs = startTimeMs;
        let highTimeMs = endTimeMs;

        while (highTimeMs - lowTimeMs > TIME_TOLERANCE_MS) {
            const middleTimeMs = (lowTimeMs + highTimeMs) / 2;
            const cycles = this.cyclesBetween(startTimeMs, middleTimeMs);

            if (cycles < targetCycles) {
                lowTimeMs = middleTimeMs;
            } else {
                highTimeMs = middleTimeMs;
            }
        }

        return (lowTimeMs + highTimeMs) / 2;
    }
}

/** Adapts one ProtocolExpander variable to the numeric-series integration contract. */
function createCadenceSeries(protocolExpander, cadenceVariableId) {
    return {
        valueAt(timeMs) {
            return protocolExpander.valueAt(cadenceVariableId, timeMs);
        },

        valueBefore(timeMs) {
            return protocolExpander.valueBefore(cadenceVariableId, timeMs);
        },

        boundariesBetween(startTimeMs, endTimeMs) {
            return protocolExpander.boundariesBetween(cadenceVariableId, startTimeMs, endTimeMs);
        },
    };
}

/** Normalizes insignificant numerical noise at cadence-cycle boundaries. */
function normalizePhase(phase) {
    if (Math.abs(phase) < CYCLE_EPSILON || Math.abs(1 - phase) < CYCLE_EPSILON) {
        return 0;
    }

    return phase;
}

/** Validates an absolute workout time within the closed protocol time range. */
function validateTime(timeMs, durationMs) {
    if (!Number.isFinite(timeMs)) {
        throw new TypeError("Cadence phase time must be a finite number.");
    }

    if (timeMs < 0 || timeMs > durationMs) {
        throw new RangeError(
            `Cadence phase time must be between 0 and ${durationMs} milliseconds.`,
        );
    }
}
