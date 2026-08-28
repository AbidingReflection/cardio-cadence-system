/**
 * GraphLayout responsibilities:
 * - Own graph domains, dimensions, and padding.
 * - Derive the drawable plot rectangle.
 * - Map time and values into pixel-space coordinates.
 * - Project sampled points and time ranges without clamping.
 */

/** Maps graph-domain data into pixel-space geometry. */
export class GraphLayout {
    #startTimeMs;
    #endTimeMs;
    #valueMin;
    #valueMax;
    #widthPx;
    #heightPx;
    #padding;
    #plot;

    /** Creates graph layout for one time/value domain and drawing area. */
    constructor({ startTimeMs, endTimeMs, valueMin, valueMax, widthPx, heightPx, padding = {} }) {
        const resolvedPadding = {
            top: padding.top ?? 0,
            right: padding.right ?? 0,
            bottom: padding.bottom ?? 0,
            left: padding.left ?? 0,
        };

        GraphLayout.#validateInputs({
            startTimeMs,
            endTimeMs,
            valueMin,
            valueMax,
            widthPx,
            heightPx,
            padding: resolvedPadding,
        });

        this.#startTimeMs = startTimeMs;
        this.#endTimeMs = endTimeMs;
        this.#valueMin = valueMin;
        this.#valueMax = valueMax;
        this.#widthPx = widthPx;
        this.#heightPx = heightPx;
        this.#padding = resolvedPadding;

        this.#plot = {
            left: resolvedPadding.left,
            right: widthPx - resolvedPadding.right,
            top: resolvedPadding.top,
            bottom: heightPx - resolvedPadding.bottom,
            width: widthPx - resolvedPadding.left - resolvedPadding.right,
            height: heightPx - resolvedPadding.top - resolvedPadding.bottom,
        };
    }

    /** Returns the derived drawable plot rectangle. */
    get plot() {
        return { ...this.#plot };
    }

    /** Maps an absolute workout time to an x coordinate without clamping. */
    xAtTime(timeMs) {
        GraphLayout.#validateFiniteNumber(timeMs, "Graph time");

        const fraction = (timeMs - this.#startTimeMs) / (this.#endTimeMs - this.#startTimeMs);

        return this.#plot.left + fraction * this.#plot.width;
    }

    /** Maps a graph value to a y coordinate without clamping. */
    yAtValue(value) {
        GraphLayout.#validateFiniteNumber(value, "Graph value");

        const fraction = (value - this.#valueMin) / (this.#valueMax - this.#valueMin);

        return this.#plot.bottom - fraction * this.#plot.height;
    }

    /** Projects sampled time/value points into pixel-space coordinates. */
    layoutSamples(samples) {
        if (!Array.isArray(samples)) {
            throw new TypeError("Graph samples must be an array.");
        }

        return samples.map(({ timeMs, value }) => ({
            timeMs,
            value,
            x: this.xAtTime(timeMs),
            y: value === undefined ? undefined : this.yAtValue(value),
        }));
    }

    /** Projects absolute time ranges into horizontal pixel-space ranges. */
    layoutRanges(ranges) {
        if (!Array.isArray(ranges)) {
            throw new TypeError("Graph ranges must be an array.");
        }

        return ranges.map((range) => ({
            ...range,
            xStart: this.xAtTime(range.startTimeMs),
            xEnd: this.xAtTime(range.endTimeMs),
        }));
    }

    /** Validates graph layout construction inputs. */
    static #validateInputs({
        startTimeMs,
        endTimeMs,
        valueMin,
        valueMax,
        widthPx,
        heightPx,
        padding,
    }) {
        const values = [
            startTimeMs,
            endTimeMs,
            valueMin,
            valueMax,
            widthPx,
            heightPx,
            padding.top,
            padding.right,
            padding.bottom,
            padding.left,
        ];

        if (values.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
            throw new TypeError("Graph layout values must be finite numbers.");
        }

        if (endTimeMs <= startTimeMs) {
            throw new RangeError("Graph layout end time must be greater than start time.");
        }

        if (valueMax <= valueMin) {
            throw new RangeError("Graph layout value maximum must be greater than minimum.");
        }

        if (widthPx <= 0 || heightPx <= 0) {
            throw new RangeError("Graph layout dimensions must be greater than zero.");
        }

        if (padding.top < 0 || padding.right < 0 || padding.bottom < 0 || padding.left < 0) {
            throw new RangeError("Graph layout padding must not be negative.");
        }

        if (padding.left + padding.right >= widthPx) {
            throw new RangeError("Graph horizontal padding must leave positive plot width.");
        }

        if (padding.top + padding.bottom >= heightPx) {
            throw new RangeError("Graph vertical padding must leave positive plot height.");
        }
    }

    /** Validates a finite numeric coordinate input. */
    static #validateFiniteNumber(value, label) {
        if (typeof value !== "number" || !Number.isFinite(value)) {
            throw new TypeError(`${label} must be a finite number.`);
        }
    }
}
