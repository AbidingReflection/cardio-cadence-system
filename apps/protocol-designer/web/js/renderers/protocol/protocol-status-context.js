/**
 * Builds renderer-friendly protocol status summaries from domain evaluations.
 */

import { evaluateProtocolMachineCompatibility } from "/packages/protocol-core/machine-compatibility.js";

/** Builds protocol status summaries for phases and blocks. */
export function buildProtocolStatusContext(protocol, machineProfile = undefined) {
    const phaseStatusById = new Map();
    const blockStatusById = new Map();

    const compatibility = evaluateProtocolMachineCompatibility(protocol, machineProfile);

    for (const issue of compatibility.issues) {
        addPhaseError(phaseStatusById, issue.phaseId);
        addBlockError(blockStatusById, issue.blockId);
    }

    return {
        phaseStatusById,
        blockStatusById,
    };
}

/** Adds one machine compatibility error to a phase status summary. */
function addPhaseError(phaseStatusById, phaseId) {
    const status = getOrCreatePhaseStatus(phaseStatusById, phaseId);

    status.errorCount += 1;
}

/** Adds one machine compatibility error to a block status summary. */
function addBlockError(blockStatusById, blockId) {
    const status = getOrCreateBlockStatus(blockStatusById, blockId);

    status.errorCount += 1;
    status.severity = "error";
}

/** Returns an existing phase status or creates an empty one. */
function getOrCreatePhaseStatus(phaseStatusById, phaseId) {
    let status = phaseStatusById.get(phaseId);

    if (status !== undefined) {
        return status;
    }

    status = {
        errorCount: 0,
        warningCount: 0,
    };

    phaseStatusById.set(phaseId, status);

    return status;
}

/** Returns an existing block status or creates an empty one. */
function getOrCreateBlockStatus(blockStatusById, blockId) {
    let status = blockStatusById.get(blockId);

    if (status !== undefined) {
        return status;
    }

    status = {
        severity: undefined,
        errorCount: 0,
        warningCount: 0,
    };

    blockStatusById.set(blockId, status);

    return status;
}
