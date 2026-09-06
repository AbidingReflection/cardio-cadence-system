/**
 * Builds block-editor feedback from machine compatibility issues.
 */

import { evaluateBlockMachineCompatibility } from "/packages/protocol-core/machine-compatibility.js";
import {
    getProgressionDefinition,
    isProgressionType,
} from "/packages/protocol-core/progression-types.js";

/** Builds machine compatibility feedback for one block draft. */
export function buildBlockMachineFeedback(draft, machineProfile, activityType) {
    if (machineProfile === undefined) {
        return [];
    }

    const block = createMachineEvaluableBlock(draft, activityType);
    const compatibility = evaluateBlockMachineCompatibility(block, machineProfile);

    return compatibility.issues.map((issue) => createMachineFeedbackItem(issue, activityType));
}

/** Creates a compatibility-safe block projection from transient draft values. */
function createMachineEvaluableBlock(draft, activityType) {
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

/** Converts one machine compatibility issue into block-editor feedback. */
function createMachineFeedbackItem(issue, activityType) {
    const variable = activityType.getVariable(issue.variableId);
    const variableName = variable?.name ?? issue.variableId;

    switch (issue.type) {
        case "unsupported-progression":
            return {
                field: `variables.${issue.variableId}.type`,
                message:
                    `${variableName} ${formatProgressionType(issue.progressionType)} ` +
                    "progression is not supported by this machine.",
            };

        case "target-below-minimum":
            return {
                field: `variables.${issue.variableId}.${issue.field}`,
                message:
                    `${variableName} ${formatField(issue.field)} must be at least ` +
                    `${issue.minimum}.`,
            };

        case "target-above-maximum":
            return {
                field: `variables.${issue.variableId}.${issue.field}`,
                message:
                    `${variableName} ${formatField(issue.field)} must not exceed ` +
                    `${issue.maximum}.`,
            };

        case "increment-mismatch":
            return {
                field: `variables.${issue.variableId}.${issue.field}`,
                message:
                    `${variableName} ${formatField(issue.field)} must align to increments of ` +
                    `${issue.increment} from ${issue.minimum}.`,
            };

        default:
            throw new Error(`Unsupported machine compatibility issue type "${issue.type}".`);
    }
}

/** Parses a finite numeric draft value for compatibility evaluation. */
function parseDraftNumber(value) {
    if (typeof value !== "string" || value.trim() === "") {
        return undefined;
    }

    const number = Number(value.trim());

    return Number.isFinite(number) ? number : undefined;
}

/** Formats a progression type for feedback text. */
function formatProgressionType(type) {
    return type[0].toUpperCase() + type.slice(1);
}

/** Formats a progression target field for feedback text. */
function formatField(field) {
    return field[0].toUpperCase() + field.slice(1);
}
