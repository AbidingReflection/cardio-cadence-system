/**
 * Graph sampling resolution responsibilities:
 * - Convert graph width and time range into a sampling interval.
 * - Keep sample density bounded independently of workout duration.
 * - Quantize sampling intervals to reduce unnecessary resampling.
 */

const DEFAULT_PIXELS_PER_SAMPLE = 3;
const MIN_SAMPLE_COUNT = 2;

/** Returns a stable sampling interval for a graph time range and width. */
export function getGraphSampleIntervalMs({
    startTimeMs,
    endTimeMs,
    widthPx,
    pixelsPerSample = DEFAULT_PIXELS_PER_SAMPLE,
}) {
    validateInputs(startTimeMs, endTimeMs, widthPx, pixelsPerSample);

    const durationMs = endTimeMs - startTimeMs;
    const targetSampleCount = Math.max(MIN_SAMPLE_COUNT, Math.ceil(widthPx / pixelsPerSample));

    const rawIntervalMs = durationMs / targetSampleCount;

    return quantizeIntervalMs(rawIntervalMs);
}

/** Quantizes an interval to the nearest stable 1-2-5 progression value. */
function quantizeIntervalMs(intervalMs) {
    const magnitude = 10 ** Math.floor(Math.log10(intervalMs));

    const candidates = [1 * magnitude, 2 * magnitude, 5 * magnitude, 10 * magnitude];

    return candidates.reduce((nearest, candidate) => {
        const nearestDistance = Math.abs(intervalMs - nearest);
        const candidateDistance = Math.abs(intervalMs - candidate);

        return candidateDistance < nearestDistance ? candidate : nearest;
    });
}

/** Validates graph sampling resolution inputs. */
function validateInputs(startTimeMs, endTimeMs, widthPx, pixelsPerSample) {
    const values = [startTimeMs, endTimeMs, widthPx, pixelsPerSample];

    if (values.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
        throw new TypeError("Graph sampling resolution values must be finite numbers.");
    }

    if (endTimeMs <= startTimeMs) {
        throw new RangeError("Graph sampling end time must be greater than start time.");
    }

    if (widthPx <= 0) {
        throw new RangeError("Graph sampling width must be greater than zero.");
    }

    if (pixelsPerSample <= 0) {
        throw new RangeError("Graph pixels per sample must be greater than zero.");
    }
}
