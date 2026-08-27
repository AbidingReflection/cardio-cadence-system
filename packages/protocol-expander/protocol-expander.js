import { createProgressionMapping } from "../protocol-core/progression-mapping.js";

/** Interprets a valid authored protocol on an absolute millisecond timeline. */
export class ProtocolExpander {
    #protocol;
    #durationMs;
    #phaseRanges;
    #blockRanges;
    #orderedBlocks;

    /** Creates an immutable time-domain interpretation of a valid protocol. */
    constructor(protocol) {
        this.#protocol = structuredClone(protocol);

        const { durationMs, phaseRanges, blockRanges, orderedBlocks } =
            ProtocolExpander.#buildStructuralTimeline(this.#protocol);

        this.#durationMs = durationMs;
        this.#phaseRanges = phaseRanges;
        this.#blockRanges = blockRanges;
        this.#orderedBlocks = orderedBlocks;
    }

    /** Returns the total protocol duration in milliseconds. */
    get durationMs() {
        return this.#durationMs;
    }

    /** Returns the absolute timeline range for a phase by ID. */
    getPhaseRange(phaseId) {
        const range = this.#phaseRanges.get(phaseId);

        return range === undefined ? undefined : structuredClone(range);
    }

    /** Returns the absolute timeline range for a block by ID. */
    getBlockRange(blockId) {
        const range = this.#blockRanges.get(blockId);

        return range === undefined ? undefined : structuredClone(range);
    }

    /** Returns a variable target at an absolute workout time. */
    valueAt(variableId, timeMs) {
        if (typeof timeMs !== "number" || !Number.isFinite(timeMs)) {
            throw new TypeError("ProtocolExpander timeMs must be a finite number.");
        }

        const blockEntry = this.#findBlockAtTime(timeMs);

        if (blockEntry === undefined) {
            return undefined;
        }

        const progression = blockEntry.block.variables[variableId];

        if (progression === undefined) {
            return undefined;
        }

        const { startTimeMs, endTimeMs } = blockEntry.range;

        const fraction = (timeMs - startTimeMs) / (endTimeMs - startTimeMs);

        const mapping = createProgressionMapping(progression);

        return mapping.valueAtFraction(fraction);
    }

    /** Returns the block that owns an absolute workout time. */
    #findBlockAtTime(timeMs) {
        if (timeMs < 0 || timeMs >= this.#durationMs) {
            return undefined;
        }

        return this.#orderedBlocks.find(
            ({ range }) => timeMs >= range.startTimeMs && timeMs < range.endTimeMs,
        );
    }

    /** Builds absolute phase and block timing for a protocol. */
    static #buildStructuralTimeline(protocol) {
        const phaseRanges = new Map();
        const blockRanges = new Map();
        const orderedBlocks = [];

        let currentTimeMs = 0;

        for (const phase of protocol.phases) {
            const phaseStartTimeMs = currentTimeMs;

            for (const block of phase.blocks) {
                const startTimeMs = currentTimeMs;
                const endTimeMs = startTimeMs + block.durationSeconds * 1000;

                const blockRange = {
                    id: block.id,
                    phaseId: phase.id,
                    startTimeMs,
                    endTimeMs,
                };

                blockRanges.set(block.id, blockRange);

                orderedBlocks.push({
                    block,
                    range: blockRange,
                });

                currentTimeMs = endTimeMs;
            }

            phaseRanges.set(phase.id, {
                id: phase.id,
                startTimeMs: phaseStartTimeMs,
                endTimeMs: currentTimeMs,
            });
        }

        return {
            durationMs: currentTimeMs,
            phaseRanges,
            blockRanges,
            orderedBlocks,
        };
    }
}
