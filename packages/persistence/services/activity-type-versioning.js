/** Creates activity type versions while preserving logical identity and lineage. */

import { createActivityTypeVersion } from "../records/activity-type-version.js";

/** Creates the first version for an activity type definition. */
export function createInitialActivityTypeVersion({ id, createdAtUnixMs, definition }) {
    return createActivityTypeVersion({
        id,
        activityTypeId: definition.id,
        versionNumber: 1,
        parentVersionId: undefined,
        createdAtUnixMs,
        definition,
    });
}

/** Creates the next activity type version from an explicit parent version. */
export function createNextActivityTypeVersion({ id, parentVersion, createdAtUnixMs, definition }) {
    return createActivityTypeVersion({
        id,
        activityTypeId: parentVersion.activityTypeId,
        versionNumber: parentVersion.versionNumber + 1,
        parentVersionId: parentVersion.id,
        createdAtUnixMs,
        definition,
    });
}
