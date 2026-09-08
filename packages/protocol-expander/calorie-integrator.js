/**
 * Calorie integrator responsibilities:
 * - Integrate a calorie-rate series over an absolute workout time range.
 * - Split integration at all series boundaries.
 * - Use fixed Simpson's rule within each continuous segment.
 */

const SIMPSON_SUBDIVISIONS = 8;
const MILLISECONDS_PER_SECOND = 1000;

/** Integrates a calorie-rate series over an absolute workout time range. */
export function integrateCalorieRate(series, startTimeMs, endTimeMs) {
    const boundaries = series.boundariesBetween(startTimeMs, endTimeMs);

    if (startTimeMs === endTimeMs) {
        return 0;
    }

    const interiorBoundaries = boundaries.filter(
        (boundary) => boundary > startTimeMs && boundary < endTimeMs,
    );

    const segmentBoundaries = [startTimeMs, ...interiorBoundaries, endTimeMs];

    let totalCalories = 0;

    for (let index = 0; index < segmentBoundaries.length - 1; index += 1) {
        totalCalories += integrateSegment(
            series,
            segmentBoundaries[index],
            segmentBoundaries[index + 1],
        );
    }

    return totalCalories;
}

/** Integrates one continuous calorie-rate segment using fixed Simpson's rule. */
function integrateSegment(series, startTimeMs, endTimeMs) {
    const stepMs = (endTimeMs - startTimeMs) / SIMPSON_SUBDIVISIONS;

    let weightedRate = 0;

    for (let index = 0; index <= SIMPSON_SUBDIVISIONS; index += 1) {
        const timeMs = startTimeMs + index * stepMs;

        const rate =
            index === SIMPSON_SUBDIVISIONS ? series.valueBefore(endTimeMs) : series.valueAt(timeMs);

        if (rate === undefined) {
            throw new Error("Cannot integrate calorie rate over a range with undefined values.");
        }

        weightedRate += getSimpsonWeight(index) * rate;
    }

    const stepSeconds = stepMs / MILLISECONDS_PER_SECOND;

    return (stepSeconds / 3) * weightedRate;
}

/** Returns the Simpson's-rule weight for one sample index. */
function getSimpsonWeight(index) {
    if (index === 0 || index === SIMPSON_SUBDIVISIONS) {
        return 1;
    }

    return index % 2 === 0 ? 2 : 4;
}
