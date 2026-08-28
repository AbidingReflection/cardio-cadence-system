/**
 * ProtocolVariableSeries responsibilities:
 * - Expose one protocol variable through the graph-series contract.
 * - Delegate time-domain queries to ProtocolExpander.
 * - Own immutable graph-series metadata.
 */

/** Exposes one protocol variable as a graphable time series. */
export class ProtocolVariableSeries {
    #expander;
    #variableId;
    #id;
    #label;
    #unit;

    /** Creates a graphable series backed by one protocol variable. */
    constructor(expander, variableId, { id, label, unit = null }) {
        this.#expander = expander;
        this.#variableId = variableId;
        this.#id = id;
        this.#label = label;
        this.#unit = unit;
    }

    /** Returns the series identifier. */
    get id() {
        return this.#id;
    }

    /** Returns the series display label. */
    get label() {
        return this.#label;
    }

    /** Returns the series display unit. */
    get unit() {
        return this.#unit;
    }

    /** Returns the series value at an absolute workout time. */
    valueAt(timeMs) {
        return this.#expander.valueAt(this.#variableId, timeMs);
    }

    /** Returns the exact series value immediately before an absolute workout time. */
    valueBefore(timeMs) {
        return this.#expander.valueBefore(this.#variableId, timeMs);
    }

    /** Returns series boundaries within an absolute workout time range. */
    boundariesBetween(startTimeMs, endTimeMs) {
        return this.#expander.boundariesBetween(this.#variableId, startTimeMs, endTimeMs);
    }
}
