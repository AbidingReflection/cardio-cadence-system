/**
 * Evaluates valid canonical protocol data against optional MachineProfile
 * capabilities without affecting protocol validity.
 */

/** Returns machine compatibility information for an entire protocol. */
export function evaluateProtocolMachineCompatibility(protocol, machineProfile = undefined) {
    if (machineProfile === undefined) {
        return createResult([]);
    }

    const issues = [];

    for (const phase of protocol.phases) {
        for (const block of phase.blocks) {
            const blockResult = evaluateBlockMachineCompatibility(block, machineProfile);

            for (const issue of blockResult.issues) {
                issues.push({
                    ...issue,
                    phaseId: phase.id,
                });
            }
        }
    }

    return createResult(issues);
}

/** Returns machine compatibility information for one protocol block. */
export function evaluateBlockMachineCompatibility(block, machineProfile = undefined) {
    if (machineProfile === undefined) {
        return createResult([]);
    }

    const issues = [];

    for (const [variableId, progression] of Object.entries(block.variables)) {
        const machineVariable = machineProfile.getVariable(variableId);

        evaluateProgression(progression, machineVariable, block.id, variableId, issues);
    }

    return createResult(issues);
}

/** Adds machine compatibility issues for one variable progression. */
function evaluateProgression(progression, machineVariable, blockId, variableId, issues) {
    if (!machineVariable.progressionTypes.includes(progression.type)) {
        issues.push({
            type: "unsupported-progression",
            blockId,
            variableId,
            progressionType: progression.type,
        });
    }

    if (Object.hasOwn(progression, "start")) {
        evaluateTarget(progression.start, machineVariable, blockId, variableId, "start", issues);
    }

    if (Object.hasOwn(progression, "end")) {
        evaluateTarget(progression.end, machineVariable, blockId, variableId, "end", issues);
    }
}

/** Adds machine compatibility issues for one progression target. */
function evaluateTarget(value, machineVariable, blockId, variableId, field, issues) {
    if (machineVariable.min !== undefined && value < machineVariable.min) {
        issues.push({
            type: "target-below-minimum",
            blockId,
            variableId,
            field,
            value,
            minimum: machineVariable.min,
        });
    }

    if (machineVariable.max !== undefined && value > machineVariable.max) {
        issues.push({
            type: "target-above-maximum",
            blockId,
            variableId,
            field,
            value,
            maximum: machineVariable.max,
        });
    }

    if (machineVariable.increment === undefined) {
        return;
    }

    const minimum = machineVariable.min ?? 0;

    if (!isIncrementAligned(value, machineVariable.increment, minimum)) {
        issues.push({
            type: "increment-mismatch",
            blockId,
            variableId,
            field,
            value,
            increment: machineVariable.increment,
            minimum,
        });
    }
}

/** Returns whether a target lies on a machine variable's increment grid. */
function isIncrementAligned(value, increment, minimum = 0) {
    const steps = (value - minimum) / increment;
    const nearestStep = Math.round(steps);

    return Math.abs(steps - nearestStep) < 1e-9;
}

/** Creates a compatibility result from collected issues. */
function createResult(issues) {
    return {
        isCompatible: issues.length === 0,
        issues,
    };
}
