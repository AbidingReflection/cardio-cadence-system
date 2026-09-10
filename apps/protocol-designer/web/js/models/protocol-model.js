import { normalizeProtocol } from "/packages/protocol-core/protocol-normalization.js";

import { validateProtocol } from "/packages/protocol-core/protocol-validation.js";

export class ProtocolModel {
    #protocol;
    #activityType;
    #machineProfile;
    #calibrationProfile;
    #listeners = new Set();

    /** Constructs a ProtocolModel from committed protocol data. */
    constructor(
        protocol,
        activityType,
        machineProfile = undefined,
        calibrationProfile = undefined,
    ) {
        const normalizedProtocol = normalizeProtocol(protocol);

        validateProtocol(normalizedProtocol, activityType, machineProfile, calibrationProfile);

        this.#protocol = structuredClone(normalizedProtocol);
        this.#activityType = activityType;
        this.#machineProfile = machineProfile;
        this.#calibrationProfile = calibrationProfile;
    }

    /** Returns a defensive snapshot of the committed protocol state. */
    getSnapshot() {
        return structuredClone(this.#protocol);
    }

    /** Returns the resolved domain context currently associated with the protocol. */
    getSetupContext() {
        return {
            activityType: this.#activityType,
            machineProfile: this.#machineProfile,
            calibrationProfile: this.#calibrationProfile,
        };
    }

    /** Atomically updates the protocol's domain setup and resolved references. */
    updateSetup({
        activityType,
        machineProfile = undefined,
        calibrationProfile = undefined,
        resetStructure = false,
    }) {
        const activityTypeChanged = activityType.id !== this.#activityType.id;
        const hasStructure = this.#protocol.phases.length > 0;

        if (activityTypeChanged && hasStructure && !resetStructure) {
            throw new Error(
                "Changing ActivityType requires resetting the existing protocol structure.",
            );
        }

        const nextProtocol = structuredClone(this.#protocol);

        nextProtocol.activityTypeId = activityType.id;

        if (machineProfile === undefined) {
            delete nextProtocol.machineProfileId;
        } else {
            nextProtocol.machineProfileId = machineProfile.id;
        }

        if (calibrationProfile === undefined) {
            delete nextProtocol.calibrationProfileId;
        } else {
            nextProtocol.calibrationProfileId = calibrationProfile.id;
        }

        if (activityTypeChanged && resetStructure) {
            nextProtocol.phases = [];
        }

        const normalizedProtocol = normalizeProtocol(nextProtocol);

        validateProtocol(normalizedProtocol, activityType, machineProfile, calibrationProfile);

        this.#protocol = structuredClone(normalizedProtocol);
        this.#activityType = activityType;
        this.#machineProfile = machineProfile;
        this.#calibrationProfile = calibrationProfile;

        this.#emit();
    }

    /** Adds a new empty phase and returns its generated ID. */
    addPhase(name = "New Phase", index = undefined) {
        const nextProtocol = structuredClone(this.#protocol);

        const insertionIndex = getInsertionIndex(index, nextProtocol.phases.length, "phase");

        const phase = {
            id: crypto.randomUUID(),
            name,
            blocks: [],
        };

        nextProtocol.phases.splice(insertionIndex, 0, phase);

        const normalizedProtocol = normalizeProtocol(nextProtocol);

        this.#validateCurrentProtocol(normalizedProtocol);

        this.#protocol = structuredClone(normalizedProtocol);

        this.#emit();

        return phase.id;
    }

    /** Moves a phase to its final zero-based index. */
    movePhase(phaseId, targetIndex) {
        const phaseIndex = this.#protocol.phases.findIndex((phase) => phase.id === phaseId);

        if (phaseIndex === -1) {
            throw new Error(`Unknown phase ID: "${phaseId}".`);
        }

        const moveIndex = getMoveIndex(targetIndex, this.#protocol.phases.length, "Phase");

        if (phaseIndex === moveIndex) {
            return;
        }

        const nextProtocol = structuredClone(this.#protocol);

        const [phase] = nextProtocol.phases.splice(phaseIndex, 1);

        nextProtocol.phases.splice(moveIndex, 0, phase);

        const normalizedProtocol = normalizeProtocol(nextProtocol);

        this.#validateCurrentProtocol(normalizedProtocol);

        this.#protocol = structuredClone(normalizedProtocol);
        this.#emit();
    }

    /** Removes a phase by ID. */
    removePhase(phaseId) {
        const nextProtocol = structuredClone(this.#protocol);

        const phaseIndex = nextProtocol.phases.findIndex((phase) => phase.id === phaseId);

        if (phaseIndex === -1) {
            throw new Error(`Protocol phase "${phaseId}" does not exist.`);
        }

        nextProtocol.phases.splice(phaseIndex, 1);

        const normalizedProtocol = normalizeProtocol(nextProtocol);

        this.#validateCurrentProtocol(normalizedProtocol);

        this.#protocol = structuredClone(normalizedProtocol);
        this.#emit();
    }

    /** Updates editable fields on a phase by ID. */
    updatePhase(phaseId, updates) {
        const nextProtocol = structuredClone(this.#protocol);

        const phase = nextProtocol.phases.find((candidate) => candidate.id === phaseId);

        if (phase === undefined) {
            throw new Error(`Protocol phase "${phaseId}" does not exist.`);
        }

        if (Object.hasOwn(updates, "name")) {
            phase.name = updates.name;
        }

        const normalizedProtocol = normalizeProtocol(nextProtocol);

        this.#validateCurrentProtocol(normalizedProtocol);

        this.#protocol = structuredClone(normalizedProtocol);
        this.#emit();
    }

    /** Adds a block to a phase and returns its generated ID. */
    addBlock(phaseId, blockData, index = undefined) {
        const nextProtocol = structuredClone(this.#protocol);

        const phase = nextProtocol.phases.find((candidate) => candidate.id === phaseId);

        if (phase === undefined) {
            throw new Error(`Protocol phase "${phaseId}" does not exist.`);
        }

        const insertionIndex = getInsertionIndex(index, phase.blocks.length, "block");

        const block = {
            ...blockData,
            id: crypto.randomUUID(),
        };

        phase.blocks.splice(insertionIndex, 0, block);

        const normalizedProtocol = normalizeProtocol(nextProtocol);

        this.#validateCurrentProtocol(normalizedProtocol);

        this.#protocol = structuredClone(normalizedProtocol);

        this.#emit();

        return block.id;
    }

    /** Moves a block to its final zero-based index in the target phase. */
    moveBlock(blockId, targetPhaseId, targetIndex) {
        const sourcePhase = this.#protocol.phases.find((candidate) =>
            candidate.blocks.some((block) => block.id === blockId),
        );

        if (sourcePhase === undefined) {
            throw new Error(`Unknown block ID: "${blockId}".`);
        }

        const targetPhase = this.#protocol.phases.find(
            (candidate) => candidate.id === targetPhaseId,
        );

        if (targetPhase === undefined) {
            throw new Error(`Unknown target phase ID: "${targetPhaseId}".`);
        }

        const sourceIndex = sourcePhase.blocks.findIndex((block) => block.id === blockId);

        const samePhase = sourcePhase.id === targetPhase.id;

        const moveIndex = samePhase
            ? getMoveIndex(targetIndex, targetPhase.blocks.length, "Block")
            : getInsertionIndex(targetIndex, targetPhase.blocks.length, "Block");

        if (samePhase && sourceIndex === moveIndex) {
            return;
        }

        const nextProtocol = structuredClone(this.#protocol);

        const nextSourcePhase = nextProtocol.phases.find(
            (candidate) => candidate.id === sourcePhase.id,
        );

        const nextTargetPhase = nextProtocol.phases.find(
            (candidate) => candidate.id === targetPhase.id,
        );

        const [block] = nextSourcePhase.blocks.splice(sourceIndex, 1);

        nextTargetPhase.blocks.splice(moveIndex, 0, block);

        const normalizedProtocol = normalizeProtocol(nextProtocol);

        this.#validateCurrentProtocol(normalizedProtocol);

        this.#protocol = structuredClone(normalizedProtocol);
        this.#emit();
    }

    /** Removes a block by ID. */
    removeBlock(blockId) {
        const nextProtocol = structuredClone(this.#protocol);

        let blockIndex = -1;
        let targetPhase;

        for (const phase of nextProtocol.phases) {
            blockIndex = phase.blocks.findIndex((block) => block.id === blockId);

            if (blockIndex !== -1) {
                targetPhase = phase;
                break;
            }
        }

        if (targetPhase === undefined) {
            throw new Error(`Protocol block "${blockId}" does not exist.`);
        }

        targetPhase.blocks.splice(blockIndex, 1);

        const normalizedProtocol = normalizeProtocol(nextProtocol);

        this.#validateCurrentProtocol(normalizedProtocol);

        this.#protocol = structuredClone(normalizedProtocol);
        this.#emit();
    }

    /** Updates editable fields on a block by ID. */
    updateBlock(blockId, updates) {
        const nextProtocol = structuredClone(this.#protocol);

        let targetBlock;

        for (const phase of nextProtocol.phases) {
            targetBlock = phase.blocks.find((block) => block.id === blockId);

            if (targetBlock !== undefined) {
                break;
            }
        }

        if (targetBlock === undefined) {
            throw new Error(`Protocol block "${blockId}" does not exist.`);
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

        this.#validateCurrentProtocol(normalizedProtocol);

        this.#protocol = structuredClone(normalizedProtocol);
        this.#emit();
    }

    /** Subscribes to protocol changes and returns an unsubscribe function. */
    subscribe(listener) {
        this.#listeners.add(listener);

        return () => {
            this.#listeners.delete(listener);
        };
    }

    /** Validates protocol data against the model's current setup context. */
    #validateCurrentProtocol(protocol) {
        validateProtocol(
            protocol,
            this.#activityType,
            this.#machineProfile,
            this.#calibrationProfile,
        );
    }

    /** Notifies all subscribers with the current protocol snapshot. */
    #emit() {
        const snapshot = this.getSnapshot();

        for (const listener of this.#listeners) {
            listener(snapshot);
        }
    }
}

/** Returns a validated insertion index, defaulting to append. */
function getInsertionIndex(index, length, entityName) {
    if (index === undefined) {
        return length;
    }

    if (!Number.isInteger(index) || index < 0 || index > length) {
        throw new Error(
            `${entityName} insertion index must be an integer ` + `between 0 and ${length}.`,
        );
    }

    return index;
}

/** Returns a validated final move index. */
function getMoveIndex(index, length, entityName) {
    if (!Number.isInteger(index)) {
        throw new Error(`${entityName} move index must be an integer.`);
    }

    if (index < 0 || index >= length) {
        throw new Error(`${entityName} move index is out of range.`);
    }

    return index;
}
