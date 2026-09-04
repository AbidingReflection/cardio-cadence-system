/**
 * Validates canonical protocol data against its activity definition and
 * optional MachineProfile reference.
 */

import { getProgressionDefinition, isProgressionType } from "./progression-types.js";

/** Validates a complete canonical protocol. */
export function validateProtocol(
    protocol,
    activityType,
    machineProfile = undefined,
    calibrationProfile = undefined,
) {
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
    validateCalibrationProfileReference(protocol, machineProfile, calibrationProfile);

    if (!Array.isArray(protocol.phases)) {
        throw new TypeError("Protocol phases must be an array.");
    }

    const phaseIds = new Set();
    const blockIds = new Set();

    for (const phase of protocol.phases) {
        validatePhase(phase, activityType, phaseIds, blockIds);
    }
}

/** Validates a protocol phase. */
function validatePhase(phase, activityType, phaseIds, blockIds) {
    requireObject(phase, "Protocol phase");
    requireNonEmptyString(phase.id, "Protocol phase id");
    requireNonEmptyString(phase.name, "Protocol phase name");

    requireUniqueId(phaseIds, phase.id, "Protocol phase");

    if (!Array.isArray(phase.blocks)) {
        throw new TypeError(`Protocol phase "${phase.id}" blocks must be an array.`);
    }

    for (const block of phase.blocks) {
        validateBlock(block, activityType, blockIds);
    }
}

/** Validates a protocol block. */
function validateBlock(block, activityType, blockIds) {
    requireObject(block, "Protocol block");
    requireNonEmptyString(block.id, "Protocol block id");
    requireNonEmptyString(block.name, "Protocol block name");

    requireUniqueId(blockIds, block.id, "Protocol block");

    requirePositiveFiniteNumber(
        block.durationSeconds,
        `Protocol block "${block.id}" durationSeconds`,
    );

    requireObject(block.variables, `Protocol block "${block.id}" variables`);

    validateBlockVariables(block, activityType);
}

/** Validates that a block defines exactly the ActivityType variable set. */
function validateBlockVariables(block, activityType) {
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

        validateProgression(block.variables[variable.id], variable.id, block.id);
    }
}

/** Validates a canonical variable progression. */
function validateProgression(progression, variableId, blockId) {
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

/** Validates the optional CalibrationProfile relationship. */
function validateCalibrationProfileReference(protocol, machineProfile, calibrationProfile) {
    const hasCalibrationProfileId = Object.hasOwn(protocol, "calibrationProfileId");

    if (!hasCalibrationProfileId) {
        if (calibrationProfile !== undefined) {
            throw new Error(
                "Protocol has no calibrationProfileId, but a CalibrationProfile was supplied.",
            );
        }

        return;
    }

    requireNonEmptyString(protocol.calibrationProfileId, "Protocol calibrationProfileId");

    if (!Object.hasOwn(protocol, "machineProfileId")) {
        throw new Error(
            `Protocol references CalibrationProfile ` +
                `"${protocol.calibrationProfileId}" without a machineProfileId.`,
        );
    }

    if (calibrationProfile === undefined) {
        throw new Error(
            `Protocol references CalibrationProfile ` +
                `"${protocol.calibrationProfileId}", but none was supplied.`,
        );
    }

    if (protocol.calibrationProfileId !== calibrationProfile.id) {
        throw new Error(
            `Protocol references CalibrationProfile ` +
                `"${protocol.calibrationProfileId}", but ` +
                `"${calibrationProfile.id}" was supplied.`,
        );
    }

    if (machineProfile === undefined) {
        throw new Error(`CalibrationProfile "${calibrationProfile.id}" requires a MachineProfile.`);
    }

    if (calibrationProfile.machineProfileId !== machineProfile.id) {
        throw new Error(
            `CalibrationProfile "${calibrationProfile.id}" references ` +
                `MachineProfile "${calibrationProfile.machineProfileId}", but ` +
                `"${machineProfile.id}" was supplied.`,
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
