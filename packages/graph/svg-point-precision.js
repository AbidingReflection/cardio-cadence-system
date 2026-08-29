/**
 * SVG point precision utilities:
 * - Round rendered SVG coordinates without changing graph-domain calculations.
 * - Preserve point ordering and undefined-value semantics.
 * - Return new point objects without mutating caller-owned data.
 */

/** Returns one SVG coordinate rounded to the requested decimal precision. */
export function roundSvgCoordinate(value, precision) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new TypeError("SVG coordinate must be a finite number.");
    }

    if (!Number.isInteger(precision) || precision < 0) {
        throw new TypeError("SVG coordinate precision must be a non-negative integer.");
    }

    const factor = 10 ** precision;

    return Math.round(value * factor) / factor;
}

/** Returns SVG points rounded to the requested decimal precision. */
export function roundSvgPoints(points, precision) {
    if (!Array.isArray(points)) {
        throw new TypeError("SVG points must be an array.");
    }

    if (!Number.isInteger(precision) || precision < 0) {
        throw new TypeError("SVG point precision must be a non-negative integer.");
    }

    return points.map((point) => {
        if (point === undefined) {
            return undefined;
        }

        return {
            ...point,
            x: roundSvgCoordinate(point.x, precision),
            y: roundSvgCoordinate(point.y, precision),
        };
    });
}
