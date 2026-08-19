import {
    normalizeProtocol,
} from "/packages/protocol-core/protocol-normalization.js";

import {
    validateProtocol,
} from "/packages/protocol-core/protocol-validation.js";


export class ProtocolModel {
    #protocol;
    #activityType;
    #machineProfile;


    /** Constructs a ProtocolModel from committed protocol data. */
    constructor(protocol, activityType, machineProfile = undefined) {
        const normalizedProtocol = normalizeProtocol(protocol);

        validateProtocol(
            normalizedProtocol,
            activityType,
            machineProfile
        );

        this.#protocol = structuredClone(normalizedProtocol);
        this.#activityType = activityType;
        this.#machineProfile = machineProfile;
    }


    /** Returns a defensive snapshot of the committed protocol state. */
    getSnapshot() {
        return structuredClone(this.#protocol);
    }

    /** Adds a new empty phase and returns its generated ID. */
    addPhase(name = "New Phase") {
        const nextProtocol = structuredClone(this.#protocol);

        const phase = {
            id: crypto.randomUUID(),
            name,
            blocks: [],
        };

        nextProtocol.phases.push(phase);

        const normalizedProtocol = normalizeProtocol(nextProtocol);

        validateProtocol(
            normalizedProtocol,
            this.#activityType,
            this.#machineProfile
        );

        this.#protocol = structuredClone(normalizedProtocol);

        return phase.id;
    }

    /** Removes a phase by ID. */
    removePhase(phaseId) {
        const nextProtocol = structuredClone(this.#protocol);

        const phaseIndex = nextProtocol.phases.findIndex(
            phase => phase.id === phaseId
        );

        if (phaseIndex === -1) {
            throw new Error(
                `Protocol phase "${phaseId}" does not exist.`
            );
        }

        nextProtocol.phases.splice(phaseIndex, 1);

        const normalizedProtocol = normalizeProtocol(nextProtocol);

        validateProtocol(
            normalizedProtocol,
            this.#activityType,
            this.#machineProfile
        );

        this.#protocol = structuredClone(normalizedProtocol);
    }

    /** Updates editable fields on a phase by ID. */
    updatePhase(phaseId, updates) {
        const nextProtocol = structuredClone(this.#protocol);

        const phase = nextProtocol.phases.find(
            candidate => candidate.id === phaseId
        );

        if (phase === undefined) {
            throw new Error(
                `Protocol phase "${phaseId}" does not exist.`
            );
        }

        if (Object.hasOwn(updates, "name")) {
            phase.name = updates.name;
        }

        const normalizedProtocol = normalizeProtocol(nextProtocol);

        validateProtocol(
            normalizedProtocol,
            this.#activityType,
            this.#machineProfile
        );

        this.#protocol = structuredClone(normalizedProtocol);
    }

    /** Adds a block to a phase and returns its generated ID. */
    addBlock(phaseId, blockData) {
        const nextProtocol = structuredClone(this.#protocol);

        const phase = nextProtocol.phases.find(
            candidate => candidate.id === phaseId
        );

        if (phase === undefined) {
            throw new Error(
                `Protocol phase "${phaseId}" does not exist.`
            );
        }

        const block = {
            ...blockData,
            id: crypto.randomUUID(),
        };

        phase.blocks.push(block);

        const normalizedProtocol = normalizeProtocol(nextProtocol);

        validateProtocol(
            normalizedProtocol,
            this.#activityType,
            this.#machineProfile
        );

        this.#protocol = structuredClone(normalizedProtocol);

        return block.id;
    }

    /** Removes a block by ID. */
    removeBlock(blockId) {
        const nextProtocol = structuredClone(this.#protocol);

        let blockIndex = -1;
        let targetPhase;

        for (const phase of nextProtocol.phases) {
            blockIndex = phase.blocks.findIndex(
                block => block.id === blockId
            );

            if (blockIndex !== -1) {
                targetPhase = phase;
                break;
            }
        }

        if (targetPhase === undefined) {
            throw new Error(
                `Protocol block "${blockId}" does not exist.`
            );
        }

        targetPhase.blocks.splice(blockIndex, 1);

        const normalizedProtocol = normalizeProtocol(nextProtocol);

        validateProtocol(
            normalizedProtocol,
            this.#activityType,
            this.#machineProfile
        );

        this.#protocol = structuredClone(normalizedProtocol);
    }

    /** Updates editable fields on a block by ID. */
    updateBlock(blockId, updates) {
        const nextProtocol = structuredClone(this.#protocol);

        let targetBlock;

        for (const phase of nextProtocol.phases) {
            targetBlock = phase.blocks.find(
                block => block.id === blockId
            );

            if (targetBlock !== undefined) {
                break;
            }
        }

        if (targetBlock === undefined) {
            throw new Error(
                `Protocol block "${blockId}" does not exist.`
            );
        }

        if (Object.hasOwn(updates, "name")) {
            targetBlock.name = updates.name;
        }

        if (Object.hasOwn(updates, "durationSeconds")) {
            targetBlock.durationSeconds = updates.durationSeconds;
        }

        if (Object.hasOwn(updates, "variables")) {
            targetBlock.variables = structuredClone(updates.variables);
        }

        const normalizedProtocol = normalizeProtocol(nextProtocol);

        validateProtocol(
            normalizedProtocol,
            this.#activityType,
            this.#machineProfile
        );

        this.#protocol = structuredClone(normalizedProtocol);
    }
}
