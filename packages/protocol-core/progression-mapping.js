import { getSteppedTargets } from "./stepped-targets.js";

/** Maps normalized progression position to a target value. */
export class ProgressionMapping {
    #valueEvaluator;
    #valueBeforeEvaluator;
    #boundaryFractions;

    /** Creates an immutable normalized progression mapping. */
    constructor(valueEvaluator, boundaryFractions = [], valueBeforeEvaluator = valueEvaluator) {
        if (typeof valueEvaluator !== "function") {
            throw new TypeError("ProgressionMapping requires a value evaluator function.");
        }

        if (!Array.isArray(boundaryFractions)) {
            throw new TypeError("ProgressionMapping boundaryFractions must be an array.");
        }

        if (typeof valueBeforeEvaluator !== "function") {
            throw new TypeError("ProgressionMapping requires a value-before evaluator function.");
        }

        this.#valueEvaluator = valueEvaluator;
        this.#valueBeforeEvaluator = valueBeforeEvaluator;
        this.#boundaryFractions = [...boundaryFractions];
    }

    /** Returns the target value at a normalized progression fraction. */
    valueAtFraction(fraction) {
        if (typeof fraction !== "number" || !Number.isFinite(fraction)) {
            throw new TypeError("ProgressionMapping fraction must be a finite number.");
        }

        if (fraction < 0 || fraction > 1) {
            return undefined;
        }

        return this.#valueEvaluator(fraction);
    }

    /** Returns the exact target value immediately before a normalized fraction. */
    valueBeforeFraction(fraction) {
        if (typeof fraction !== "number" || !Number.isFinite(fraction)) {
            throw new TypeError("ProgressionMapping fraction must be a finite number.");
        }

        if (fraction <= 0 || fraction > 1) {
            return undefined;
        }

        return this.#valueBeforeEvaluator(fraction);
    }

    /** Returns interior structural boundaries in normalized progression. */
    getBoundaryFractions() {
        return [...this.#boundaryFractions];
    }
}

/** Creates a canonical normalized mapping for an authored progression. */
export function createProgressionMapping(progression) {
    switch (progression.type) {
        case "steady":
            return createSteadyMapping(progression);

        case "linear":
            return createLinearMapping(progression);

        case "stepped":
            return createSteppedMapping(progression);

        default:
            throw new Error(`Unknown progression type "${progression.type}".`);
    }
}

/** Creates a constant progression mapping. */
function createSteadyMapping(progression) {
    const { start } = progression;

    return new ProgressionMapping(() => start);
}

/** Creates a continuous linear progression mapping. */
function createLinearMapping(progression) {
    const { start, end } = progression;
    const difference = end - start;

    return new ProgressionMapping((fraction) => start + difference * fraction);
}

/** Creates a proportionally weighted stepped progression mapping. */
function createSteppedMapping(progression) {
    const targets = getSteppedTargets(progression);
    const weights = getSteppedWeights(progression, targets);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    const boundaryFractions = [];
    let cumulativeWeight = 0;

    for (let index = 0; index < targets.length - 1; index += 1) {
        cumulativeWeight += weights[index];
        boundaryFractions.push(cumulativeWeight / totalWeight);
    }

    return new ProgressionMapping(
        (fraction) => getSteppedValueAtFraction(targets, weights, totalWeight, fraction),
        boundaryFractions,
        (fraction) => getSteppedValueBeforeFraction(targets, weights, totalWeight, fraction),
    );
}

/** Returns the stepped target immediately preceding a normalized fraction. */
function getSteppedValueBeforeFraction(targets, weights, totalWeight, fraction) {
    const position = fraction * totalWeight;
    let cumulativeWeight = 0;

    for (let index = 0; index < targets.length; index += 1) {
        cumulativeWeight += weights[index];

        if (position <= cumulativeWeight) {
            return targets[index];
        }
    }

    return targets[targets.length - 1];
}

/** Returns proportional dwell weights for stepped targets. */
function getSteppedWeights(progression, targets) {
    if (targets.length === 1) {
        return [1];
    }

    const weights = targets.map(() => 1);

    const lastIndex = targets.length - 1;
    const previousTarget = targets[lastIndex - 1];
    const finalTarget = targets[lastIndex];

    const finalDistance = Math.abs(finalTarget - previousTarget);

    if (finalDistance < progression.step) {
        weights[lastIndex] = finalDistance / progression.step;
    }

    return weights;
}

/** Returns the stepped target active at a normalized fraction. */
function getSteppedValueAtFraction(targets, weights, totalWeight, fraction) {
    if (fraction === 1) {
        return targets[targets.length - 1];
    }

    const position = fraction * totalWeight;
    let cumulativeWeight = 0;

    for (let index = 0; index < targets.length; index += 1) {
        cumulativeWeight += weights[index];

        if (position < cumulativeWeight) {
            return targets[index];
        }
    }

    return targets[targets.length - 1];
}
