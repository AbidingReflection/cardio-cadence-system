/**
 * Provides a lightweight ProtocolModel fake for controller tests, including
 * committed protocol snapshots and mutation call tracking.
 */

/** Creates a lightweight ProtocolModel fake for controller tests. */
export function createProtocolModelFake() {
    const calls = {
        addBlock: [],
        updateBlock: [],
        removeBlock: [],
        removePhase: [],
        moveBlock: [],
        movePhase: [],
    };

    const protocol = {
        phases: [
            {
                id: "phase-1",
                blocks: [{ id: "block-1" }, { id: "block-2" }],
            },
            {
                id: "phase-2",
                blocks: [{ id: "block-3" }],
            },
        ],
    };

    return {
        calls,

        /** Returns a defensive protocol snapshot. */
        getSnapshot() {
            return structuredClone(protocol);
        },

        /** Adds a block and records the mutation. */
        addBlock(phaseId, blockData, index = undefined) {
            calls.addBlock.push({
                phaseId,
                blockData: structuredClone(blockData),
                index,
            });

            return "new-block-id";
        },

        /** Moves a block and records the mutation. */
        moveBlock(blockId, targetPhaseId, targetIndex) {
            calls.moveBlock.push({
                blockId,
                targetPhaseId,
                targetIndex,
            });
        },

        /** Moves a phase and records the mutation. */
        movePhase(phaseId, targetIndex) {
            calls.movePhase.push({
                phaseId,
                targetIndex,
            });
        },

        /** Updates a block and records the mutation. */
        updateBlock(blockId, blockData) {
            calls.updateBlock.push({
                blockId,
                blockData: structuredClone(blockData),
            });
        },

        /** Removes a block and records the mutation. */
        removeBlock(blockId) {
            calls.removeBlock.push(blockId);

            for (const phase of protocol.phases) {
                phase.blocks = phase.blocks.filter((block) => block.id !== blockId);
            }
        },

        /** Removes a phase and records the mutation. */
        removePhase(phaseId) {
            calls.removePhase.push(phaseId);

            protocol.phases = protocol.phases.filter((phase) => phase.id !== phaseId);
        },
    };
}
