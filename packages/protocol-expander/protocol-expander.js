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

    /** Returns all absolute phase ranges in workout order. */
    getPhaseRanges() {
        return structuredClone([...this.#phaseRanges.values()]);
    }

    /** Returns the absolute timeline range for a block by ID. */
    getBlockRange(blockId) {
        const range = this.#blockRanges.get(blockId);

        return range === undefined ? undefined : structuredClone(range);
    }

    /** Returns all absolute block ranges in workout order. */
    getBlockRanges() {
        return structuredClone([...this.#blockRanges.values()]);
    }

    /** Returns a variable target at an absolute workout time. */
    valueAt(variableId, timeMs) {
        ProtocolExpander.#validateTime(timeMs);

        const blockEntry = this.#findBlockAtTime(timeMs);

        if (blockEntry === undefined) {
            return undefined;
        }

        const progression = blockEntry.block.variables[variableId];

        if (progression === undefined) {
            return undefined;
        }

        const mapping = createProgressionMapping(progression);
        const fraction = ProtocolExpander.#getProgressionFraction(
            mapping,
            blockEntry.range,
            timeMs,
        );

        return mapping.valueAtFraction(fraction);
    }

    /** Returns a variable target immediately before an absolute workout time. */
    valueBefore(variableId, timeMs) {
        ProtocolExpander.#validateTime(timeMs);

        const blockEntry = this.#findBlockBeforeTime(timeMs);

        if (blockEntry === undefined) {
            return undefined;
        }

        const progression = blockEntry.block.variables[variableId];

        if (progression === undefined) {
            return undefined;
        }

        const mapping = createProgressionMapping(progression);
        const fraction = ProtocolExpander.#getProgressionFraction(
            mapping,
            blockEntry.range,
            timeMs,
        );

        return mapping.valueBeforeFraction(fraction);
    }

    /** Returns structural and progression boundaries within an absolute time range. */
    boundariesBetween(variableId, startTimeMs, endTimeMs) {
        ProtocolExpander.#validateTime(startTimeMs);
        ProtocolExpander.#validateTime(endTimeMs);

        if (startTimeMs > endTimeMs) {
            throw new RangeError(
                "ProtocolExpander startTimeMs must not be greater than endTimeMs.",
            );
        }

        if (startTimeMs === endTimeMs) {
            return [];
        }

        const boundaries = [];

        for (const { block, range } of this.#orderedBlocks) {
            if (range.endTimeMs <= startTimeMs) {
                continue;
            }

            if (range.startTimeMs >= endTimeMs) {
                break;
            }

            const progression = block.variables[variableId];

            if (progression === undefined) {
                continue;
            }

            if (
                range.startTimeMs > 0 &&
                range.startTimeMs >= startTimeMs &&
                range.startTimeMs < endTimeMs
            ) {
                boundaries.push(range.startTimeMs);
            }

            const mapping = createProgressionMapping(progression);
            const blockDurationMs = range.endTimeMs - range.startTimeMs;

            for (const fraction of mapping.getBoundaryFractions()) {
                const boundaryTimeMs = range.startTimeMs + fraction * blockDurationMs;

                if (boundaryTimeMs >= startTimeMs && boundaryTimeMs < endTimeMs) {
                    boundaries.push(boundaryTimeMs);
                }
            }
        }

        return boundaries;
    }

    /** Returns the next structural or progression boundary after an absolute workout time. */
    nextBoundaryAfter(variableId, timeMs) {
        ProtocolExpander.#validateTime(timeMs);

        if (timeMs >= this.#durationMs) {
            return undefined;
        }

        for (const { block, range } of this.#orderedBlocks) {
            if (range.endTimeMs <= timeMs) {
                continue;
            }

            const progression = block.variables[variableId];

            if (progression === undefined) {
                continue;
            }

            if (range.startTimeMs > timeMs && range.startTimeMs > 0) {
                return range.startTimeMs;
            }

            const mapping = createProgressionMapping(progression);
            const blockDurationMs = range.endTimeMs - range.startTimeMs;

            for (const fraction of mapping.getBoundaryFractions()) {
                const boundaryTimeMs = range.startTimeMs + fraction * blockDurationMs;

                if (boundaryTimeMs > timeMs) {
                    return boundaryTimeMs;
                }
            }

            if (range.endTimeMs > timeMs && range.endTimeMs < this.#durationMs) {
                return range.endTimeMs;
            }
        }

        return undefined;
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

    /** Returns the block that owns the time immediately before an absolute workout time. */
    #findBlockBeforeTime(timeMs) {
        if (timeMs <= 0 || timeMs > this.#durationMs) {
            return undefined;
        }

        return this.#orderedBlocks.find(
            ({ range }) => timeMs > range.startTimeMs && timeMs <= range.endTimeMs,
        );
    }

    /** Returns the canonical progression fraction for an absolute block time. */
    static #getProgressionFraction(mapping, range, timeMs) {
        const blockDurationMs = range.endTimeMs - range.startTimeMs;

        for (const boundaryFraction of mapping.getBoundaryFractions()) {
            const boundaryTimeMs = range.startTimeMs + boundaryFraction * blockDurationMs;

            if (timeMs === boundaryTimeMs) {
                return boundaryFraction;
            }
        }

        return (timeMs - range.startTimeMs) / blockDurationMs;
    }

    /** Requires an absolute workout time to be a finite number. */
    static #validateTime(timeMs) {
        if (typeof timeMs !== "number" || !Number.isFinite(timeMs)) {
            throw new TypeError("ProtocolExpander time values must be finite numbers.");
        }
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
