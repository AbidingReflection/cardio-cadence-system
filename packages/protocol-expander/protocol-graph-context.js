/**
 * ProtocolGraphContext responsibilities:
 * - Expose protocol structure needed by graph presentation.
 * - Keep protocol-specific structure outside generic graph components.
 * - Preserve structural data in the absolute workout time domain.
 */

/** Exposes expanded protocol structure for graph presentation. */
export class ProtocolGraphContext {
    #expander;

    /** Creates graph context backed by an expanded protocol. */
    constructor(expander) {
        this.#expander = expander;
    }

    /** Returns ordered absolute phase ranges. */
    getPhaseRanges() {
        return this.#expander.getPhaseRanges();
    }

    /** Returns ordered absolute block ranges. */
    getBlockRanges() {
        return this.#expander.getBlockRanges();
    }
}
