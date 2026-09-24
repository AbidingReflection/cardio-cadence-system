/**
 * Builds Protocol Open row models from persisted protocol records.
 */

/** Builds a Protocol Open row model from one protocol family and its planned versions. */
export function buildProtocolOpenRowModel({
    protocolFamily,
    plannedVersions,
    getActivityTypeVersion,
}) {
    if (plannedVersions.length === 0) {
        throw new Error(`Protocol family "${protocolFamily.id}" has no planned protocol versions.`);
    }

    const latestVersion = plannedVersions.reduce((latest, version) =>
        version.versionNumber > latest.versionNumber ? version : latest,
    );

    const activityTypeVersionId = latestVersion.dependencies.activityTypeVersionId;
    const activityTypeVersion = getActivityTypeVersion(activityTypeVersionId);

    if (activityTypeVersion === undefined) {
        throw new Error(`Activity type version "${activityTypeVersionId}" was not found.`);
    }

    return {
        protocolFamilyId: protocolFamily.id,
        displayName: protocolFamily.displayName,
        activityName: activityTypeVersion.definition.name,
        phaseCount: latestVersion.protocol.phases.length,
        blockCount: getProtocolBlockCount(latestVersion.protocol),
        durationSeconds: getProtocolDurationSeconds(latestVersion.protocol),
        versionNumber: latestVersion.versionNumber,
        updatedAtUnixMs: latestVersion.createdAtUnixMs,
    };
}

/** Builds Protocol Open row models for the supplied protocol families. */
export function buildProtocolOpenRows({
    protocolFamilies,
    getPlannedVersions,
    getActivityTypeVersion,
}) {
    return protocolFamilies.map((protocolFamily) =>
        buildProtocolOpenRowModel({
            protocolFamily,
            plannedVersions: getPlannedVersions(protocolFamily.id),
            getActivityTypeVersion,
        }),
    );
}

/** Returns the total duration of all blocks in a protocol. */
function getProtocolDurationSeconds(protocol) {
    return protocol.phases.reduce(
        (protocolTotal, phase) =>
            protocolTotal +
            phase.blocks.reduce((phaseTotal, block) => phaseTotal + block.durationSeconds, 0),
        0,
    );
}

/** Sorts Protocol Open rows without mutating the input array. */
export function sortProtocolOpenRows(rows, { key, direction }) {
    const supportedKeys = new Set([
        "displayName",
        "activityName",
        "phaseCount",
        "blockCount",
        "durationSeconds",
        "versionNumber",
        "updatedAtUnixMs",
    ]);

    if (!supportedKeys.has(key)) {
        throw new Error(`Unsupported Protocol Open sort key "${key}".`);
    }

    if (direction !== "asc" && direction !== "desc") {
        throw new Error(`Unsupported Protocol Open sort direction "${direction}".`);
    }

    const directionMultiplier = direction === "asc" ? 1 : -1;

    return [...rows].sort((left, right) => {
        const leftValue = left[key];
        const rightValue = right[key];

        const comparison =
            typeof leftValue === "string"
                ? leftValue.localeCompare(rightValue)
                : leftValue - rightValue;

        return comparison * directionMultiplier;
    });
}

/** Returns the total number of blocks in a protocol. */
function getProtocolBlockCount(protocol) {
    return protocol.phases.reduce((total, phase) => total + phase.blocks.length, 0);
}
