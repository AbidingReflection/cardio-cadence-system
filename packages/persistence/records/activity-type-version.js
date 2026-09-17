/** Defines and validates immutable activity type version records. */

import { requireNonEmptyString, requireObject, requireUnixTimestamp } from "./record-validation.js";

/** Creates a validated immutable activity-type-version record. */
export function createActivityTypeVersion({
    id,
    activityTypeId,
    versionNumber,
    parentVersionId,
    createdAtUnixMs,
    definition,
}) {
    const activityTypeVersion = {
        id,
        activityTypeId,
        versionNumber,
        parentVersionId,
        createdAtUnixMs,
        definition: structuredClone(definition),
    };

    validateActivityTypeVersion(activityTypeVersion);

    return activityTypeVersion;
}

/** Validates an activity-type-version record. */
export function validateActivityTypeVersion(activityTypeVersion) {
    requireObject(activityTypeVersion, "ActivityTypeVersion");

    requireNonEmptyString(activityTypeVersion.id, "ActivityTypeVersion id");

    requireNonEmptyString(activityTypeVersion.activityTypeId, "ActivityTypeVersion activityTypeId");

    validateVersionNumber(activityTypeVersion.versionNumber);

    validateParentVersionId(activityTypeVersion.versionNumber, activityTypeVersion.parentVersionId);

    requireUnixTimestamp(
        activityTypeVersion.createdAtUnixMs,
        "ActivityTypeVersion createdAtUnixMs",
    );

    requireObject(activityTypeVersion.definition, "ActivityTypeVersion definition");

    validateDefinitionIdentity(activityTypeVersion.activityTypeId, activityTypeVersion.definition);
}

/** Validates the activity type version number. */
function validateVersionNumber(versionNumber) {
    if (!Number.isInteger(versionNumber) || versionNumber < 1) {
        throw new TypeError("ActivityTypeVersion versionNumber must be a positive integer.");
    }
}

/** Validates the parent-version relationship implied by the version number. */
function validateParentVersionId(versionNumber, parentVersionId) {
    if (versionNumber === 1) {
        if (parentVersionId !== undefined) {
            throw new TypeError(
                "ActivityTypeVersion parentVersionId must be omitted for version 1.",
            );
        }

        return;
    }

    requireNonEmptyString(parentVersionId, "ActivityTypeVersion parentVersionId");
}

/** Validates that the stored definition matches the logical activity type identity. */
function validateDefinitionIdentity(activityTypeId, definition) {
    requireNonEmptyString(definition.id, "ActivityTypeVersion definition id");

    if (definition.id !== activityTypeId) {
        throw new TypeError("ActivityTypeVersion definition id must match activityTypeId.");
    }
}
