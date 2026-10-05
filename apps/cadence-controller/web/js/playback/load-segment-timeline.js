/**
 * Interprets a protocol variable as contiguous constant-value load segments.
 *
 * Structural/progression boundaries are treated as candidate boundaries.
 * Adjacent intervals with the same load value are merged.
 */
export class LoadSegmentTimeline {
    #durationMs;
    #segments;

    /** Builds an immutable load-segment timeline from a ProtocolExpander. */
    constructor(protocolExpander, variableId) {
        this.#durationMs = protocolExpander.durationMs;

        this.#segments = buildSegments(protocolExpander, variableId);
    }

    /** Returns the load segment containing an absolute protocol time. */
    segmentAt(timeMs) {
        validateTime(timeMs);

        if (timeMs < 0 || timeMs > this.#durationMs || this.#segments.length === 0) {
            return undefined;
        }

        const segment =
            timeMs === this.#durationMs
                ? this.#segments[this.#segments.length - 1]
                : findSegmentAt(this.#segments, timeMs);

        if (segment === undefined) {
            return undefined;
        }

        const durationMs = segment.endTimeMs - segment.startTimeMs;

        const progress =
            timeMs === segment.endTimeMs ? 1 : (timeMs - segment.startTimeMs) / durationMs;

        return {
            value: segment.value,
            startTimeMs: segment.startTimeMs,
            endTimeMs: segment.endTimeMs,
            progress,
        };
    }

    /** Returns current load guidance and the next distinct adjustment. */
    guidanceAt(timeMs) {
        const currentSegment = this.segmentAt(timeMs);

        if (currentSegment === undefined) {
            return undefined;
        }

        const currentIndex = this.#segments.findIndex(
            (segment) => segment.startTimeMs === currentSegment.startTimeMs,
        );

        const nextSegment = this.#segments[currentIndex + 1];

        return {
            currentSegment,
            remainingTimeMs: Math.max(0, currentSegment.endTimeMs - timeMs),
            nextAdjustment:
                nextSegment === undefined
                    ? null
                    : {
                          value: nextSegment.value,
                          dueTimeMs: nextSegment.startTimeMs,
                      },
        };
    }
}

/** Builds merged constant-value load segments for the complete protocol. */
function buildSegments(protocolExpander, variableId) {
    const durationMs = protocolExpander.durationMs;

    if (durationMs === 0) {
        return [];
    }

    const boundaries = protocolExpander.boundariesBetween(variableId, 0, durationMs);

    const intervalBoundaries = [0, ...boundaries, durationMs];

    const segments = [];

    for (let index = 0; index < intervalBoundaries.length - 1; index += 1) {
        const startTimeMs = intervalBoundaries[index];

        const endTimeMs = intervalBoundaries[index + 1];

        if (startTimeMs === endTimeMs) {
            continue;
        }

        const startValue = protocolExpander.valueAt(variableId, startTimeMs);

        const endValue = protocolExpander.valueBefore(variableId, endTimeMs);

        if (startValue === undefined && endValue === undefined) {
            continue;
        }

        if (!Object.is(startValue, endValue)) {
            throw new Error(
                "LoadSegmentTimeline requires constant load values between protocol boundaries.",
            );
        }

        appendSegment(segments, startValue, startTimeMs, endTimeMs);
    }

    return segments.map((segment) => Object.freeze(segment));
}

/** Appends an interval, merging it into the preceding equal-value segment. */
function appendSegment(segments, value, startTimeMs, endTimeMs) {
    const previous = segments[segments.length - 1];

    if (
        previous !== undefined &&
        previous.endTimeMs === startTimeMs &&
        Object.is(previous.value, value)
    ) {
        previous.endTimeMs = endTimeMs;
        return;
    }

    segments.push({
        value,
        startTimeMs,
        endTimeMs,
    });
}

/** Returns the segment containing a start-inclusive/end-exclusive time. */
function findSegmentAt(segments, timeMs) {
    let low = 0;
    let high = segments.length - 1;

    while (low <= high) {
        const middle = Math.floor((low + high) / 2);

        const segment = segments[middle];

        if (timeMs < segment.startTimeMs) {
            high = middle - 1;
            continue;
        }

        if (timeMs >= segment.endTimeMs) {
            low = middle + 1;
            continue;
        }

        return segment;
    }

    return undefined;
}

/** Requires an absolute protocol time to be a finite number. */
function validateTime(timeMs) {
    if (typeof timeMs !== "number" || !Number.isFinite(timeMs)) {
        throw new TypeError("LoadSegmentTimeline time must be a finite number.");
    }
}
