/**
 * Validates canonical protocol data against its activity and machine definitions.
 */

import { getProgressionDefinition, isProgressionType } from "./progression-types.js";

/** Validates a complete canonical protocol. */
export function validateProtocol(protocol, activityType, machineProfile = undefined) {
    requireObject(protocol, "Protocol");
    validateActivityType(activityType);

    requireNonEmptyString(protocol.activityTypeId, "Protocol activityTypeId");

    if (protocol.activityTypeId !== activityType.id) {
        throw new Error(
            `Protocol references ActivityType "${protocol.activityTypeId}", ` +
                `but "${activityType.id}" was supplied.`,
        );
    }

    validateMachineProfileReference(protocol, activityType, machineProfile);

    if (!Array.isArray(protocol.phases)) {
        throw new TypeError("Protocol phases must be an array.");
    }

    const phaseIds = new Set();
    const blockIds = new Set();

    for (const phase of protocol.phases) {
        validatePhase(phase, activityType, machineProfile, phaseIds, blockIds);
    }
}

/** Validates a protocol phase. */
function validatePhase(phase, activityType, machineProfile, phaseIds, blockIds) {
    requireObject(phase, "Protocol phase");
    requireNonEmptyString(phase.id, "Protocol phase id");
    requireNonEmptyString(phase.name, "Protocol phase name");

    requireUniqueId(phaseIds, phase.id, "Protocol phase");

    if (!Array.isArray(phase.blocks)) {
        throw new TypeError(`Protocol phase "${phase.id}" blocks must be an array.`);
    }

    for (const block of phase.blocks) {
        validateBlock(block, activityType, machineProfile, blockIds);
    }
}

/** Validates a protocol block. */
function validateBlock(block, activityType, machineProfile, blockIds) {
    requireObject(block, "Protocol block");
    requireNonEmptyString(block.id, "Protocol block id");
    requireNonEmptyString(block.name, "Protocol block name");

    requireUniqueId(blockIds, block.id, "Protocol block");

    requirePositiveFiniteNumber(
        block.durationSeconds,
        `Protocol block "${block.id}" durationSeconds`,
    );

    requireObject(block.variables, `Protocol block "${block.id}" variables`);

    validateBlockVariables(block, activityType, machineProfile);
}

/** Validates that a block defines exactly the ActivityType variable set. */
function validateBlockVariables(block, activityType, machineProfile) {
    const activityVariables = activityType.variables;
    const expectedIds = new Set(activityVariables.map((variable) => variable.id));

    const actualIds = Object.keys(block.variables);

    for (const variableId of actualIds) {
        if (!expectedIds.has(variableId)) {
            throw new Error(
                `Protocol block "${block.id}" contains unknown variable ` + `"${variableId}".`,
            );
        }
    }

    for (const variable of activityVariables) {
        if (!Object.hasOwn(block.variables, variable.id)) {
            throw new Error(
                `Protocol block "${block.id}" is missing variable ` + `"${variable.id}".`,
            );
        }

        const machineVariable = machineProfile?.getVariable(variable.id);

        validateProgression(block.variables[variable.id], variable.id, block.id, machineVariable);
    }
}

/** Validates a progression and any applicable machine constraints. */
function validateProgression(progression, variableId, blockId, machineVariable) {
    const description = `Protocol block "${blockId}" variable "${variableId}" progression`;

    requireObject(progression, description);
    requireNonEmptyString(progression.type, `${description} type`);

    if (!isProgressionType(progression.type)) {
        throw new Error(`${description} has unknown type "${progression.type}".`);
    }

    const definition = getProgressionDefinition(progression.type);

    for (const field of definition.requiredFields) {
        if (!Object.hasOwn(progression, field)) {
            throw new Error(`${description} is missing required field "${field}".`);
        }
    }

    requireFiniteNumber(progression.start, `${description} start`);

    if (Object.hasOwn(progression, "end")) {
        requireFiniteNumber(progression.end, `${description} end`);
    }

    if (Object.hasOwn(progression, "step")) {
        requirePositiveFiniteNumber(progression.step, `${description} step`);
    }

    if (machineVariable !== undefined) {
        validateMachineTarget(progression.start, machineVariable, `${description} start`);

        if (Object.hasOwn(progression, "end")) {
            validateMachineTarget(progression.end, machineVariable, `${description} end`);
        }
    }
}

/** Validates a progression target against machine bounds and increments. */
function validateMachineTarget(value, machineVariable, description) {
    if (machineVariable.min !== undefined && value < machineVariable.min) {
        throw new Error(`${description} must be at least ${machineVariable.min}.`);
    }

    if (machineVariable.max !== undefined && value > machineVariable.max) {
        throw new Error(`${description} must be at most ${machineVariable.max}.`);
    }

    if (
        machineVariable.increment !== undefined &&
        !isIncrementAligned(value, machineVariable.increment, machineVariable.min)
    ) {
        throw new Error(
            `${description} must align to increment ` + `${machineVariable.increment}.`,
        );
    }
}

/** Returns whether a value aligns to a machine increment. */
function isIncrementAligned(value, increment, minimum = 0) {
    const steps = (value - minimum) / increment;
    const nearestStep = Math.round(steps);

    return Math.abs(steps - nearestStep) < 1e-9;
}

/** Validates the optional MachineProfile relationship. */
function validateMachineProfileReference(protocol, activityType, machineProfile) {
    const hasMachineProfileId = Object.hasOwn(protocol, "machineProfileId");

    if (!hasMachineProfileId) {
        if (machineProfile !== undefined) {
            throw new Error("Protocol has no machineProfileId, but a MachineProfile was supplied.");
        }

        return;
    }

    requireNonEmptyString(protocol.machineProfileId, "Protocol machineProfileId");

    if (machineProfile === undefined) {
        throw new Error(
            `Protocol references MachineProfile ` +
                `"${protocol.machineProfileId}", but none was supplied.`,
        );
    }

    if (protocol.machineProfileId !== machineProfile.id) {
        throw new Error(
            `Protocol references MachineProfile ` +
                `"${protocol.machineProfileId}", but ` +
                `"${machineProfile.id}" was supplied.`,
        );
    }

    if (machineProfile.activityTypeId !== activityType.id) {
        throw new Error(
            `MachineProfile "${machineProfile.id}" is not compatible ` +
                `with ActivityType "${activityType.id}".`,
        );
    }
}

/** Validates the minimal ActivityType interface required by the validator. */
function validateActivityType(activityType) {
    requireObject(activityType, "ActivityType");
    requireNonEmptyString(activityType.id, "ActivityType id");

    if (!Array.isArray(activityType.variables)) {
        throw new TypeError("ActivityType variables must be an array.");
    }
}

/** Requires an ID to be unique within a collection. */
function requireUniqueId(ids, id, description) {
    if (ids.has(id)) {
        throw new Error(`${description} IDs must be unique. Duplicate ID: "${id}".`);
    }

    ids.add(id);
}

/** Requires a value to be a non-array object. */
function requireObject(value, description) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new TypeError(`${description} must be an object.`);
    }
}

/** Requires a value to be a non-empty string. */
function requireNonEmptyString(value, description) {
    if (typeof value !== "string" || value.trim() === "") {
        throw new TypeError(`${description} must be a non-empty string.`);
    }
}

/** Requires a value to be a finite number. */
function requireFiniteNumber(value, description) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new TypeError(`${description} must be a finite number.`);
    }
}

/** Requires a value to be a positive finite number. */
function requirePositiveFiniteNumber(value, description) {
    requireFiniteNumber(value, description);

    if (value <= 0) {
        throw new RangeError(`${description} must be greater than zero.`);
    }
}
