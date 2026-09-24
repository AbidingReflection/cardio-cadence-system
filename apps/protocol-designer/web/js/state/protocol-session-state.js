/**
 * Tracks the last known safe protocol baseline for the current editor session.
 */

import { deepEqual } from "/packages/utils/deep-equal.js";

export class ProtocolSessionState {
    #baseline;

    /** Stores a defensive copy of the current safe protocol baseline. */
    setBaseline(protocolSnapshot) {
        this.#baseline = structuredClone(protocolSnapshot);
    }

    /** Clears the current saved protocol baseline. */
    clearBaseline() {
        this.#baseline = undefined;
    }

    /** Returns whether a saved protocol baseline is currently available. */
    hasBaseline() {
        return this.#baseline !== undefined;
    }

    /** Returns whether the supplied protocol differs from the saved baseline. */
    isProtocolDirty(protocolSnapshot) {
        if (this.#baseline === undefined) {
            return true;
        }

        return !deepEqual(protocolSnapshot, this.#baseline);
    }
}
