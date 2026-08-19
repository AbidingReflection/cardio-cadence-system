import {
    normalizeProtocol,
} from "/packages/protocol-core/protocol-normalization.js";

import {
    validateProtocol,
} from "/packages/protocol-core/protocol-validation.js";


export class ProtocolModel {
    #protocol;


    /** Constructs a ProtocolModel from committed protocol data. */
    constructor(protocol, activityType, machineProfile = undefined) {
        const normalizedProtocol = normalizeProtocol(protocol);

        validateProtocol(
            normalizedProtocol,
            activityType,
            machineProfile
        );

        this.#protocol = structuredClone(normalizedProtocol);
    }


    /** Returns a defensive snapshot of the committed protocol state. */
    getSnapshot() {
        return structuredClone(this.#protocol);
    }
}
