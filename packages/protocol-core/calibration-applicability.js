/**
 * Evaluates valid canonical protocol data against an optional CalibrationProfile
 * domain without affecting protocol validity.
 */

/** Returns calibration applicability information for an entire protocol. */
export function evaluateProtocolCalibrationApplicability(protocol, calibrationProfile = undefined) {
    if (calibrationProfile === undefined) {
        return createResult([]);
    }

    const issues = [];

    for (const phase of protocol.phases) {
        for (const block of phase.blocks) {
            const blockResult = evaluateBlockCalibrationApplicability(block, calibrationProfile);

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

/** Returns calibration applicability information for one protocol block. */
export function evaluateBlockCalibrationApplicability(block, calibrationProfile = undefined) {
    if (calibrationProfile === undefined) {
        return createResult([]);
    }

    const issues = [];
    const domain = calibrationProfile.domain;

    for (const [variableId, progression] of Object.entries(block.variables)) {
        const range = domain[variableId];

        if (range === undefined) {
            continue;
        }

        if (Object.hasOwn(progression, "start")) {
            evaluateTarget(progression.start, range, block.id, variableId, "start", issues);
        }

        if (Object.hasOwn(progression, "end")) {
            evaluateTarget(progression.end, range, block.id, variableId, "end", issues);
        }
    }

    return createResult(issues);
}

/** Adds calibration-domain issues for one progression target. */
function evaluateTarget(value, range, blockId, variableId, field, issues) {
    if (value < range.min) {
        issues.push({
            type: "target-below-calibration-domain",
            blockId,
            variableId,
            field,
            value,
            minimum: range.min,
        });
    }

    if (value > range.max) {
        issues.push({
            type: "target-above-calibration-domain",
            blockId,
            variableId,
            field,
            value,
            maximum: range.max,
        });
    }
}

/** Creates an applicability result from collected issues. */
function createResult(issues) {
    return {
        isApplicable: issues.length === 0,
        issues,
    };
}
