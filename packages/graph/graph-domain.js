/**
 * Graph domain responsibilities:
 * - Derive numeric graph value domains from observed series values.
 * - Add visual padding so observed values do not sit on plot boundaries.
 * - Produce a non-zero domain for constant-valued series.
 */

const DOMAIN_PADDING_RATIO = 0.05;
const CONSTANT_DOMAIN_HALF_RANGE = 0.5;

/** Returns a padded linear value domain for observed graph values. */
export function getLinearValueDomain(values) {
    if (!Array.isArray(values)) {
        throw new TypeError("Graph value domain values must be an array.");
    }

    const definedValues = values.filter((value) => value !== undefined);

    if (definedValues.length === 0) {
        throw new RangeError("Graph value domain requires at least one defined value.");
    }

    for (const value of definedValues) {
        if (typeof value !== "number" || !Number.isFinite(value)) {
            throw new TypeError("Graph value domain values must be finite numbers or undefined.");
        }
    }

    const observedMin = Math.min(...definedValues);
    const observedMax = Math.max(...definedValues);

    if (observedMin === observedMax) {
        return {
            min: observedMin - CONSTANT_DOMAIN_HALF_RANGE,
            max: observedMax + CONSTANT_DOMAIN_HALF_RANGE,
        };
    }

    const observedRange = observedMax - observedMin;
    const padding = observedRange * DOMAIN_PADDING_RATIO;

    return {
        min: observedMin - padding,
        max: observedMax + padding,
    };
}
