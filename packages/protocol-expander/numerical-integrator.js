/**
 * Numerical integrator responsibilities:
 * - Integrate a numeric series over an absolute millisecond time range.
 * - Split integration at all series boundaries.
 * - Use fixed Simpson's rule within each continuous segment.
 */

const SIMPSON_SUBDIVISIONS = 8;

/** Integrates a numeric series over an absolute millisecond time range. */
export function integrateSeries(series, startTimeMs, endTimeMs) {
    const boundaries = series.boundariesBetween(startTimeMs, endTimeMs);

    if (startTimeMs === endTimeMs) {
        return 0;
    }

    const interiorBoundaries = boundaries.filter(
        (boundary) => boundary > startTimeMs && boundary < endTimeMs,
    );

    const segmentBoundaries = [startTimeMs, ...interiorBoundaries, endTimeMs];

    let total = 0;

    for (let index = 0; index < segmentBoundaries.length - 1; index += 1) {
        total += integrateSegment(series, segmentBoundaries[index], segmentBoundaries[index + 1]);
    }

    return total;
}

/** Integrates one continuous numeric segment using fixed Simpson's rule. */
function integrateSegment(series, startTimeMs, endTimeMs) {
    const stepMs = (endTimeMs - startTimeMs) / SIMPSON_SUBDIVISIONS;

    let weightedValue = 0;

    for (let index = 0; index <= SIMPSON_SUBDIVISIONS; index += 1) {
        const timeMs = startTimeMs + index * stepMs;

        const value =
            index === SIMPSON_SUBDIVISIONS ? series.valueBefore(endTimeMs) : series.valueAt(timeMs);

        if (value === undefined) {
            throw new Error("Cannot integrate a series over a range with undefined values.");
        }

        weightedValue += getSimpsonWeight(index) * value;
    }

    return (stepMs / 3) * weightedValue;
}

/** Returns the Simpson's-rule weight for one sample index. */
function getSimpsonWeight(index) {
    if (index === 0 || index === SIMPSON_SUBDIVISIONS) {
        return 1;
    }

    return index % 2 === 0 ? 2 : 4;
}
