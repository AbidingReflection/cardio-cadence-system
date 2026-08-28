/**
 * GraphSeriesSampler responsibilities:
 * - Sample a graph series over a requested time range.
 * - Merge uniform sample times with exact series boundaries.
 * - Preserve discontinuities and undefined regions in sampled output.
 * - Keep sampling independent of graph layout and rendering.
 */

/** Samples a graph series into ordered time/value points. */
export class GraphSeriesSampler {
    #series;

    /** Creates a sampler bound to one graph series source. */
    constructor(series) {
        this.#series = series;
    }

    /** Samples the series over a positive half-open time range. */
    sample({ startTimeMs, endTimeMs, sampleIntervalMs }) {
        GraphSeriesSampler.#validateRange(startTimeMs, endTimeMs, sampleIntervalMs);

        const boundaryTimes = this.#getBoundaryTimes(startTimeMs, endTimeMs);

        const candidateTimes = this.#getCandidateTimes(
            startTimeMs,
            endTimeMs,
            sampleIntervalMs,
            boundaryTimes,
        );

        return this.#sampleCandidateTimes(candidateTimes, boundaryTimes, startTimeMs, endTimeMs);
    }

    /** Returns unique internal series boundaries within the requested range. */
    #getBoundaryTimes(startTimeMs, endTimeMs) {
        const boundaries = this.#series.boundariesBetween(startTimeMs, endTimeMs);

        const boundaryTimes = new Set();

        for (const timeMs of boundaries) {
            if (typeof timeMs !== "number" || !Number.isFinite(timeMs)) {
                throw new TypeError("Graph series boundaries must be finite numbers.");
            }

            if (timeMs > startTimeMs && timeMs < endTimeMs) {
                boundaryTimes.add(timeMs);
            }
        }

        return boundaryTimes;
    }

    /** Returns sorted unique endpoint, boundary, and uniform sample times. */
    #getCandidateTimes(startTimeMs, endTimeMs, sampleIntervalMs, boundaryTimes) {
        const candidateTimes = new Set([startTimeMs, endTimeMs, ...boundaryTimes]);

        for (let index = 1; startTimeMs + index * sampleIntervalMs < endTimeMs; index += 1) {
            candidateTimes.add(startTimeMs + index * sampleIntervalMs);
        }

        return [...candidateTimes].sort((a, b) => a - b);
    }

    /** Evaluates candidate times while preserving exact boundary behavior. */
    #sampleCandidateTimes(candidateTimes, boundaryTimes, startTimeMs, endTimeMs) {
        const samples = [];

        for (const timeMs of candidateTimes) {
            if (timeMs === startTimeMs) {
                samples.push({
                    timeMs,
                    value: this.#series.valueAt(timeMs),
                });
                continue;
            }

            if (timeMs === endTimeMs) {
                samples.push({
                    timeMs,
                    value: this.#series.valueBefore(timeMs),
                });
                continue;
            }

            if (boundaryTimes.has(timeMs)) {
                this.#appendBoundarySamples(samples, timeMs);
                continue;
            }

            samples.push({
                timeMs,
                value: this.#series.valueAt(timeMs),
            });
        }

        return samples;
    }

    /** Appends one continuous point or two discontinuous boundary points. */
    #appendBoundarySamples(samples, timeMs) {
        const valueBefore = this.#series.valueBefore(timeMs);
        const valueAt = this.#series.valueAt(timeMs);

        if (valueBefore !== valueAt) {
            samples.push({
                timeMs,
                value: valueBefore,
            });
        }

        samples.push({
            timeMs,
            value: valueAt,
        });
    }

    /** Validates the requested sampling range and interval. */
    static #validateRange(startTimeMs, endTimeMs, sampleIntervalMs) {
        const values = [startTimeMs, endTimeMs, sampleIntervalMs];

        if (values.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
            throw new TypeError("Graph sampling times and interval must be finite numbers.");
        }

        if (endTimeMs <= startTimeMs) {
            throw new RangeError("Graph sampling end time must be greater than start time.");
        }

        if (sampleIntervalMs <= 0) {
            throw new RangeError("Graph sampling interval must be greater than zero.");
        }
    }
}
