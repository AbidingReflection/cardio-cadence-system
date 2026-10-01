/**
 * Workout context responsibilities:
 * - Resolve the current protocol phase and block at an absolute workout time.
 * - Derive elapsed and remaining times for active protocol structure.
 * - Describe upcoming phase and block transitions for playback presentation.
 */

/** Derives presentation-ready workout structure from a ProtocolExpander timeline. */
export class WorkoutContext {
    #protocolExpander;
    #phaseRanges;
    #blockRanges;
    #phaseNames;
    #blockNames;

    /** Creates workout context from authored protocol data and its ProtocolExpander. */
    constructor(protocol, protocolExpander) {
        this.#protocolExpander = protocolExpander;
        this.#phaseRanges = protocolExpander.getPhaseRanges();
        this.#blockRanges = protocolExpander.getBlockRanges();
        this.#phaseNames = createPhaseNameMap(protocol);
        this.#blockNames = createBlockNameMap(protocol);

        validateStructuralReferences(
            this.#phaseRanges,
            this.#blockRanges,
            this.#phaseNames,
            this.#blockNames,
        );
    }

    /** Returns structural workout context at an absolute protocol time. */
    getSnapshot(timeMs) {
        validateTime(timeMs, this.#protocolExpander.durationMs);

        const context = this.#protocolExpander.contextAt(timeMs);

        return {
            elapsedTimeMs: timeMs,
            remainingTimeMs: this.#protocolExpander.durationMs - timeMs,
            currentPhase: context ? this.#getCurrentPhase(context.phaseId, timeMs) : null,
            currentBlock: context ? this.#getCurrentBlock(context.blockId, timeMs) : null,
            nextPhase: this.#getNextPhase(timeMs),
            nextBlock: this.#getNextBlock(timeMs),
        };
    }

    /** Returns presentation context for the phase active at the requested time. */
    #getCurrentPhase(phaseId, timeMs) {
        const range = this.#phaseRanges.find((range) => range.id === phaseId);

        return createCurrentStructure(phaseId, this.#phaseNames.get(phaseId), range, timeMs);
    }

    /** Returns presentation context for the block active at the requested time. */
    #getCurrentBlock(blockId, timeMs) {
        const range = this.#blockRanges.find((range) => range.id === blockId);

        return createCurrentStructure(blockId, this.#blockNames.get(blockId), range, timeMs);
    }

    /** Returns presentation context for the next phase transition, if present. */
    #getNextPhase(timeMs) {
        const range = this.#phaseRanges.find((range) => range.startTimeMs > timeMs);

        if (!range) {
            return null;
        }

        return createNextStructure(range.id, this.#phaseNames.get(range.id), range, timeMs);
    }

    /** Returns presentation context for the next block transition, if present. */
    #getNextBlock(timeMs) {
        const range = this.#blockRanges.find((range) => range.startTimeMs > timeMs);

        if (!range) {
            return null;
        }

        return createNextStructure(range.id, this.#blockNames.get(range.id), range, timeMs);
    }
}

/** Builds phase display-name lookup data from the authored protocol. */
function createPhaseNameMap(protocol) {
    return new Map(protocol.phases.map((phase) => [phase.id, phase.name]));
}

/** Builds block display-name lookup data from the authored protocol. */
function createBlockNameMap(protocol) {
    return new Map(
        protocol.phases.flatMap((phase) => phase.blocks.map((block) => [block.id, block.name])),
    );
}

/** Creates presentation context for currently active protocol structure. */
function createCurrentStructure(id, name, range, timeMs) {
    return {
        id,
        name,
        startTimeMs: range.startTimeMs,
        endTimeMs: range.endTimeMs,
        elapsedTimeMs: timeMs - range.startTimeMs,
        remainingTimeMs: range.endTimeMs - timeMs,
    };
}

/** Creates presentation context for upcoming protocol structure. */
function createNextStructure(id, name, range, timeMs) {
    return {
        id,
        name,
        startTimeMs: range.startTimeMs,
        endTimeMs: range.endTimeMs,
        timeUntilMs: range.startTimeMs - timeMs,
    };
}

/** Validates that ProtocolExpander structure matches the authored protocol. */
function validateStructuralReferences(phaseRanges, blockRanges, phaseNames, blockNames) {
    for (const range of phaseRanges) {
        if (!phaseNames.has(range.id)) {
            throw new Error(`ProtocolExpander contains unknown phase "${range.id}".`);
        }
    }

    for (const range of blockRanges) {
        if (!blockNames.has(range.id)) {
            throw new Error(`ProtocolExpander contains unknown block "${range.id}".`);
        }
    }
}

/** Validates an absolute workout time within the closed protocol time range. */
function validateTime(timeMs, durationMs) {
    if (!Number.isFinite(timeMs)) {
        throw new TypeError("Workout time must be a finite number.");
    }

    if (timeMs < 0 || timeMs > durationMs) {
        throw new RangeError(`Workout time must be between 0 and ${durationMs} milliseconds.`);
    }
}
