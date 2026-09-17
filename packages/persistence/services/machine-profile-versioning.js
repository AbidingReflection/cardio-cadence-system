/** Creates machine profile versions while preserving logical identity and lineage. */

import { createMachineProfileVersion } from "../records/machine-profile-version.js";

/** Creates the first version for a machine profile definition. */
export function createInitialMachineProfileVersion({
    id,
    createdAtUnixMs,
    activityTypeVersionId,
    activityTypeId,
    definition,
}) {
    return createMachineProfileVersion({
        id,
        machineProfileId: definition.id,
        versionNumber: 1,
        parentVersionId: undefined,
        createdAtUnixMs,
        activityTypeVersionId,
        activityTypeId,
        definition,
    });
}

/** Creates the next machine profile version from an explicit parent version. */
export function createNextMachineProfileVersion({
    id,
    parentVersion,
    createdAtUnixMs,
    activityTypeVersionId,
    activityTypeId,
    definition,
}) {
    if (activityTypeId !== parentVersion.activityTypeId) {
        throw new TypeError(
            "MachineProfileVersion activityTypeId must match the parent activityTypeId.",
        );
    }

    return createMachineProfileVersion({
        id,
        machineProfileId: parentVersion.machineProfileId,
        versionNumber: parentVersion.versionNumber + 1,
        parentVersionId: parentVersion.id,
        createdAtUnixMs,
        activityTypeVersionId,
        activityTypeId,
        definition,
    });
}
