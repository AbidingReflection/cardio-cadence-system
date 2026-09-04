/**
 * Validates block-editor draft data and converts it to committed block data.
 */

import {
    getProgressionDefinition,
    isProgressionType,
} from "/packages/protocol-core/progression-types.js";

/** Validates and converts a block draft into committed block data. */
export function validateBlockDraft(draft, activityType) {
    const errors = [];

    const name = validateName(draft.name, errors);
    const durationSeconds = validateDuration(draft.duration, errors);

    const variables = validateVariables(draft.variables, activityType, draft.blockId, errors);

    if (errors.length > 0) {
        return {
            isValid: false,
            blockData: undefined,
            errors,
        };
    }

    return {
        isValid: true,
        blockData: {
            name,
            durationSeconds,
            variables,
        },
        errors: [],
    };
}

/** Validates and normalizes the block name. */
function validateName(value, errors) {
    if (typeof value !== "string" || value.trim() === "") {
        errors.push(createError("name", "Block name is required."));

        return undefined;
    }

    return value.trim();
}

/** Validates and converts the block duration. */
function validateDuration(value, errors) {
    if (typeof value !== "string" || value.trim() === "") {
        errors.push(createError("duration", "Duration is required."));

        return undefined;
    }

    const durationSeconds = parseDuration(value);

    if (durationSeconds === undefined) {
        errors.push(createError("duration", "Duration must use M:SS or H:MM:SS format."));

        return undefined;
    }

    if (durationSeconds <= 0) {
        errors.push(createError("duration", "Duration must be greater than zero."));

        return undefined;
    }

    return durationSeconds;
}

/** Validates and converts all ActivityType variables. */
function validateVariables(draftVariables, activityType, blockId, errors) {
    const variables = {};

    for (const variable of activityType.variables) {
        const draftProgression = draftVariables?.[variable.id];

        if (draftProgression === undefined) {
            errors.push(
                createError(
                    `variables.${variable.id}`,
                    `${variable.name} configuration is required.`,
                    blockId,
                ),
            );

            continue;
        }

        const progression = validateProgression(draftProgression, variable, blockId, errors);

        if (progression !== undefined) {
            variables[variable.id] = progression;
        }
    }

    return variables;
}

/** Validates and converts one variable progression. */
function validateProgression(draftProgression, variable, blockId, errors) {
    const { type } = draftProgression;
    const baseField = `variables.${variable.id}`;

    if (!isProgressionType(type)) {
        errors.push(
            createError(
                `${baseField}.type`,
                `${variable.name} progression type is required.`,
                blockId,
            ),
        );

        return undefined;
    }

    const definition = getProgressionDefinition(type);

    const progression = {
        type,
    };

    let isValid = true;

    if (definition.requiredFields.includes("start")) {
        const start = validateTarget(
            draftProgression.start,
            variable,
            `${baseField}.start`,
            "Start",
            blockId,
            errors,
        );

        if (start === undefined) {
            isValid = false;
        } else {
            progression.start = start;
        }
    }

    if (definition.requiredFields.includes("end")) {
        const end = validateTarget(
            draftProgression.end,
            variable,
            `${baseField}.end`,
            "End",
            blockId,
            errors,
        );

        if (end === undefined) {
            isValid = false;
        } else {
            progression.end = end;
        }
    }

    if (definition.requiredFields.includes("step")) {
        const step = validateStep(draftProgression.step, `${baseField}.step`, blockId, errors);

        if (step === undefined) {
            isValid = false;
        } else {
            progression.step = step;
        }
    }

    return isValid ? progression : undefined;
}

/** Validates and converts a variable target value. */
function validateTarget(value, variable, field, label, blockId, errors) {
    const number = parseNumber(value);

    if (number === undefined) {
        errors.push(
            createError(
                field,
                `${variable.name} ${label.toLowerCase()} is required and must be numeric.`,
                blockId,
            ),
        );

        return undefined;
    }

    return number;
}

/** Validates and converts a stepped progression step size. */
function validateStep(value, field, blockId, errors) {
    const number = parseNumber(value);

    if (number === undefined || number <= 0) {
        errors.push(
            createError(field, "Step size is required and must be a positive number.", blockId),
        );

        return undefined;
    }

    return number;
}

/** Parses a finite numeric form value. */
function parseNumber(value) {
    if (typeof value !== "string" || value.trim() === "") {
        return undefined;
    }

    const number = Number(value.trim());

    return Number.isFinite(number) ? number : undefined;
}

/** Parses M:SS or H:MM:SS duration text into seconds. */
function parseDuration(value) {
    const parts = value.trim().split(":");

    if (parts.length !== 2 && parts.length !== 3) {
        return undefined;
    }

    if (parts.some((part) => !/^\d+$/.test(part))) {
        return undefined;
    }

    const numbers = parts.map(Number);
    const seconds = numbers.at(-1);

    if (seconds >= 60) {
        return undefined;
    }

    if (parts.length === 2) {
        const minutes = numbers[0];

        return minutes * 60 + seconds;
    }

    const [hours, minutes] = numbers;

    if (minutes >= 60) {
        return undefined;
    }

    return hours * 3600 + minutes * 60 + seconds;
}

/** Creates a structured block validation error. */
function createError(field, message, entityId = undefined) {
    return {
        scope: "block",
        entityId,
        field,
        message,
    };
}
