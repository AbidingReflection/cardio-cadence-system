/** Creates calibration profile versions while preserving logical identity and lineage. */

import { createCalibrationProfileVersion } from "../records/calibration-profile-version.js";

/** Creates the first version for a calibration profile definition. */
export function createInitialCalibrationProfileVersion({
    id,
    createdAtUnixMs,
    machineProfileVersionId,
    machineProfileId,
    definition,
}) {
    return createCalibrationProfileVersion({
        id,
        calibrationProfileId: definition.id,
        versionNumber: 1,
        parentVersionId: undefined,
        createdAtUnixMs,
        machineProfileVersionId,
        machineProfileId,
        definition,
    });
}

/** Creates the next calibration profile version from an explicit parent version. */
export function createNextCalibrationProfileVersion({
    id,
    parentVersion,
    createdAtUnixMs,
    machineProfileVersionId,
    machineProfileId,
    definition,
}) {
    if (machineProfileId !== parentVersion.machineProfileId) {
        throw new TypeError(
            "CalibrationProfileVersion machineProfileId must match the parent machineProfileId.",
        );
    }

    return createCalibrationProfileVersion({
        id,
        calibrationProfileId: parentVersion.calibrationProfileId,
        versionNumber: parentVersion.versionNumber + 1,
        parentVersionId: parentVersion.id,
        createdAtUnixMs,
        machineProfileVersionId,
        machineProfileId,
        definition,
    });
}
