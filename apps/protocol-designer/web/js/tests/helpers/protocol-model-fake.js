/**
 * Provides a lightweight ProtocolModel fake for controller tests, including
 * committed protocol snapshots and mutation call tracking.
 */

/** Creates a lightweight ProtocolModel fake for controller tests. */
export function createProtocolModelFake() {
    const calls = {
        addBlock: [],
        updateBlock: [],
    };

    const protocol = {
        phases: [
            {
                id: "phase-1",
                blocks: [
                    { id: "block-1" },
                    { id: "block-2" },
                ],
            },
            {
                id: "phase-2",
                blocks: [
                    { id: "block-3" },
                ],
            },
        ],
    };

    return {
        calls,

        getSnapshot() {
            return structuredClone(protocol);
        },

        addBlock(phaseId, blockData) {
            calls.addBlock.push({
                phaseId,
                blockData: structuredClone(blockData),
            });

            return "new-block-id";
        },

        updateBlock(blockId, blockData) {
            calls.updateBlock.push({
                blockId,
                blockData: structuredClone(blockData),
            });
        },
    };
}
