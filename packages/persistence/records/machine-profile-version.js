/** Defines and validates immutable machine profile version records. */

import { requireNonEmptyString, requireObject, requireUnixTimestamp } from "./record-validation.js";

/** Creates a validated immutable machine-profile-version record. */
export function createMachineProfileVersion({
    id,
    machineProfileId,
    versionNumber,
    parentVersionId,
    createdAtUnixMs,
    activityTypeVersionId,
    activityTypeId,
    definition,
}) {
    const machineProfileVersion = {
        id,
        machineProfileId,
        versionNumber,
        parentVersionId,
        createdAtUnixMs,
        activityTypeVersionId,
        activityTypeId,
        definition: structuredClone(definition),
    };

    validateMachineProfileVersion(machineProfileVersion);

    return machineProfileVersion;
}

/** Validates a machine-profile-version record. */
export function validateMachineProfileVersion(machineProfileVersion) {
    requireObject(machineProfileVersion, "MachineProfileVersion");

    requireNonEmptyString(machineProfileVersion.id, "MachineProfileVersion id");

    requireNonEmptyString(
        machineProfileVersion.machineProfileId,
        "MachineProfileVersion machineProfileId",
    );

    validateVersionNumber(machineProfileVersion.versionNumber);

    validateParentVersionId(
        machineProfileVersion.versionNumber,
        machineProfileVersion.parentVersionId,
    );

    requireUnixTimestamp(
        machineProfileVersion.createdAtUnixMs,
        "MachineProfileVersion createdAtUnixMs",
    );

    requireNonEmptyString(
        machineProfileVersion.activityTypeVersionId,
        "MachineProfileVersion activityTypeVersionId",
    );

    requireNonEmptyString(
        machineProfileVersion.activityTypeId,
        "MachineProfileVersion activityTypeId",
    );

    requireObject(machineProfileVersion.definition, "MachineProfileVersion definition");

    validateDefinitionIdentity(machineProfileVersion);
}

/** Validates the machine profile version number. */
function validateVersionNumber(versionNumber) {
    if (!Number.isInteger(versionNumber) || versionNumber < 1) {
        throw new TypeError("MachineProfileVersion versionNumber must be a positive integer.");
    }
}

/** Validates the parent-version relationship implied by the version number. */
function validateParentVersionId(versionNumber, parentVersionId) {
    if (versionNumber === 1) {
        if (parentVersionId !== undefined) {
            throw new TypeError(
                "MachineProfileVersion parentVersionId must be omitted for version 1.",
            );
        }

        return;
    }

    requireNonEmptyString(parentVersionId, "MachineProfileVersion parentVersionId");
}

/** Validates that the stored definition matches the record's logical identities. */
function validateDefinitionIdentity(machineProfileVersion) {
    const { definition } = machineProfileVersion;

    requireNonEmptyString(definition.id, "MachineProfileVersion definition id");

    if (definition.id !== machineProfileVersion.machineProfileId) {
        throw new TypeError("MachineProfileVersion definition id must match machineProfileId.");
    }

    requireNonEmptyString(
        definition.activityTypeId,
        "MachineProfileVersion definition activityTypeId",
    );

    if (definition.activityTypeId !== machineProfileVersion.activityTypeId) {
        throw new TypeError(
            "MachineProfileVersion definition activityTypeId must match activityTypeId.",
        );
    }
}
