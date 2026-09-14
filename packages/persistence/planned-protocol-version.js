import { requireNonEmptyString, requireObject, requireUnixTimestamp } from "./record-validation.js";

/** Creates a validated planned-protocol-version record. */
export function createPlannedProtocolVersion({
    id,
    protocolFamilyId,
    versionNumber,
    parentVersionId,
    createdAtUnixMs,
    protocol,
    dependencies,
    changeSummary,
}) {
    const plannedProtocolVersion = {
        id,
        protocolFamilyId,
        versionNumber,
        parentVersionId,
        createdAtUnixMs,
        protocol,
        dependencies,
        changeSummary,
    };

    validatePlannedProtocolVersion(plannedProtocolVersion);

    return plannedProtocolVersion;
}

/** Validates a planned-protocol-version record. */
export function validatePlannedProtocolVersion(plannedProtocolVersion) {
    requireObject(plannedProtocolVersion, "PlannedProtocolVersion");

    requireNonEmptyString(plannedProtocolVersion.id, "PlannedProtocolVersion id");
    requireNonEmptyString(
        plannedProtocolVersion.protocolFamilyId,
        "PlannedProtocolVersion protocolFamilyId",
    );

    validateVersionNumber(plannedProtocolVersion.versionNumber);

    validateParentVersionId(
        plannedProtocolVersion.versionNumber,
        plannedProtocolVersion.parentVersionId,
    );

    requireUnixTimestamp(
        plannedProtocolVersion.createdAtUnixMs,
        "PlannedProtocolVersion createdAtUnixMs",
    );

    requireObject(plannedProtocolVersion.protocol, "PlannedProtocolVersion protocol");

    validateDependencies(plannedProtocolVersion.dependencies);

    if (
        plannedProtocolVersion.changeSummary !== undefined &&
        typeof plannedProtocolVersion.changeSummary !== "string"
    ) {
        throw new TypeError("PlannedProtocolVersion changeSummary must be a string when supplied.");
    }
}

/** Validates the version number. */
function validateVersionNumber(versionNumber) {
    if (!Number.isInteger(versionNumber) || versionNumber < 1) {
        throw new TypeError("PlannedProtocolVersion versionNumber must be a positive integer.");
    }
}

/** Validates the parent-version relationship implied by the version number. */
function validateParentVersionId(versionNumber, parentVersionId) {
    if (versionNumber === 1) {
        if (parentVersionId !== undefined) {
            throw new TypeError(
                "PlannedProtocolVersion parentVersionId must be omitted for version 1.",
            );
        }

        return;
    }

    requireNonEmptyString(parentVersionId, "PlannedProtocolVersion parentVersionId");
}

/** Validates dependency version references. */
function validateDependencies(dependencies) {
    requireObject(dependencies, "PlannedProtocolVersion dependencies");

    requireNonEmptyString(
        dependencies.activityTypeVersionId,
        "PlannedProtocolVersion dependencies activityTypeVersionId",
    );

    validateOptionalId(
        dependencies.machineProfileVersionId,
        "PlannedProtocolVersion dependencies machineProfileVersionId",
    );

    validateOptionalId(
        dependencies.calibrationProfileVersionId,
        "PlannedProtocolVersion dependencies calibrationProfileVersionId",
    );

    if (
        dependencies.calibrationProfileVersionId !== undefined &&
        dependencies.machineProfileVersionId === undefined
    ) {
        throw new TypeError(
            "PlannedProtocolVersion dependencies machineProfileVersionId is required when calibrationProfileVersionId is supplied.",
        );
    }
}

/** Validates an optional identifier. */
function validateOptionalId(value, label) {
    if (value === undefined) {
        return;
    }

    requireNonEmptyString(value, label);
}
