/** Defines and validates immutable calibration profile version records. */

import { requireNonEmptyString, requireObject, requireUnixTimestamp } from "./record-validation.js";

/** Creates a validated immutable calibration-profile-version record. */
export function createCalibrationProfileVersion({
    id,
    calibrationProfileId,
    versionNumber,
    parentVersionId,
    createdAtUnixMs,
    machineProfileVersionId,
    machineProfileId,
    definition,
}) {
    const calibrationProfileVersion = {
        id,
        calibrationProfileId,
        versionNumber,
        parentVersionId,
        createdAtUnixMs,
        machineProfileVersionId,
        machineProfileId,
        definition: structuredClone(definition),
    };

    validateCalibrationProfileVersion(calibrationProfileVersion);

    return calibrationProfileVersion;
}

/** Validates a calibration-profile-version record. */
export function validateCalibrationProfileVersion(calibrationProfileVersion) {
    requireObject(calibrationProfileVersion, "CalibrationProfileVersion");

    requireNonEmptyString(calibrationProfileVersion.id, "CalibrationProfileVersion id");

    requireNonEmptyString(
        calibrationProfileVersion.calibrationProfileId,
        "CalibrationProfileVersion calibrationProfileId",
    );

    validateVersionNumber(calibrationProfileVersion.versionNumber);

    validateParentVersionId(
        calibrationProfileVersion.versionNumber,
        calibrationProfileVersion.parentVersionId,
    );

    requireUnixTimestamp(
        calibrationProfileVersion.createdAtUnixMs,
        "CalibrationProfileVersion createdAtUnixMs",
    );

    requireNonEmptyString(
        calibrationProfileVersion.machineProfileVersionId,
        "CalibrationProfileVersion machineProfileVersionId",
    );

    requireNonEmptyString(
        calibrationProfileVersion.machineProfileId,
        "CalibrationProfileVersion machineProfileId",
    );

    requireObject(calibrationProfileVersion.definition, "CalibrationProfileVersion definition");

    validateDefinitionIdentity(calibrationProfileVersion);
}

/** Validates the calibration profile version number. */
function validateVersionNumber(versionNumber) {
    if (!Number.isInteger(versionNumber) || versionNumber < 1) {
        throw new TypeError("CalibrationProfileVersion versionNumber must be a positive integer.");
    }
}

/** Validates the parent-version relationship implied by the version number. */
function validateParentVersionId(versionNumber, parentVersionId) {
    if (versionNumber === 1) {
        if (parentVersionId !== undefined) {
            throw new TypeError(
                "CalibrationProfileVersion parentVersionId must be omitted for version 1.",
            );
        }

        return;
    }

    requireNonEmptyString(parentVersionId, "CalibrationProfileVersion parentVersionId");
}

/** Validates that the stored definition matches the record's logical identities. */
function validateDefinitionIdentity(calibrationProfileVersion) {
    const { definition } = calibrationProfileVersion;

    requireNonEmptyString(definition.id, "CalibrationProfileVersion definition id");

    if (definition.id !== calibrationProfileVersion.calibrationProfileId) {
        throw new TypeError(
            "CalibrationProfileVersion definition id must match calibrationProfileId.",
        );
    }

    requireNonEmptyString(
        definition.machineProfileId,
        "CalibrationProfileVersion definition machineProfileId",
    );

    if (definition.machineProfileId !== calibrationProfileVersion.machineProfileId) {
        throw new TypeError(
            "CalibrationProfileVersion definition machineProfileId must match machineProfileId.",
        );
    }
}
