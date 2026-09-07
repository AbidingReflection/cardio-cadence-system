/**
 * Builds block-editor feedback from calibration applicability issues.
 */

import { evaluateBlockCalibrationApplicability } from "/packages/protocol-core/calibration-applicability.js";
import {
    getProgressionDefinition,
    isProgressionType,
} from "/packages/protocol-core/progression-types.js";

/** Builds calibration applicability feedback for one block draft. */
export function buildBlockCalibrationFeedback(draft, calibrationProfile, activityType) {
    if (calibrationProfile === undefined) {
        return [];
    }

    const block = createCalibrationEvaluableBlock(draft, activityType);
    const applicability = evaluateBlockCalibrationApplicability(block, calibrationProfile);

    return applicability.issues.map((issue) => createCalibrationFeedbackItem(issue, activityType));
}

/** Creates an applicability-safe block projection from transient draft values. */
function createCalibrationEvaluableBlock(draft, activityType) {
    const variables = {};

    for (const variable of activityType.variables) {
        const draftProgression = draft.variables[variable.id];

        if (draftProgression === undefined || !isProgressionType(draftProgression.type)) {
            continue;
        }

        const definition = getProgressionDefinition(draftProgression.type);

        const progression = {
            type: draftProgression.type,
        };

        if (definition.requiredFields.includes("start")) {
            const start = parseDraftNumber(draftProgression.start);

            if (start !== undefined) {
                progression.start = start;
            }
        }

        if (definition.requiredFields.includes("end")) {
            const end = parseDraftNumber(draftProgression.end);

            if (end !== undefined) {
                progression.end = end;
            }
        }

        variables[variable.id] = progression;
    }

    return {
        id: draft.blockId,
        variables,
    };
}

/** Converts one calibration applicability issue into block-editor feedback. */
function createCalibrationFeedbackItem(issue, activityType) {
    const variable = activityType.getVariable(issue.variableId);
    const variableName = variable?.name ?? issue.variableId;

    switch (issue.type) {
        case "target-below-calibration-domain":
            return {
                field: `variables.${issue.variableId}.${issue.field}`,
                message:
                    `${variableName} ${formatField(issue.field)} is below the calibrated ` +
                    `minimum of ${issue.minimum}.`,
            };

        case "target-above-calibration-domain":
            return {
                field: `variables.${issue.variableId}.${issue.field}`,
                message:
                    `${variableName} ${formatField(issue.field)} exceeds the calibrated ` +
                    `maximum of ${issue.maximum}.`,
            };

        default:
            throw new Error(`Unsupported calibration applicability issue type "${issue.type}".`);
    }
}

/** Parses a finite numeric draft value for calibration evaluation. */
function parseDraftNumber(value) {
    if (typeof value !== "string" || value.trim() === "") {
        return undefined;
    }

    const number = Number(value.trim());

    return Number.isFinite(number) ? number : undefined;
}

/** Formats a progression target field for feedback text. */
function formatField(field) {
    return field[0].toUpperCase() + field.slice(1);
}
