import {
    createPlannedProtocolVersion,
    validatePlannedProtocolVersion,
} from "./planned-protocol-version.js";

/** Creates the first planned protocol version in a protocol family. */
export function createInitialPlannedProtocolVersion({
    id,
    protocolFamilyId,
    createdAtUnixMs,
    protocol,
    dependencies,
    changeSummary,
}) {
    return createPlannedProtocolVersion({
        id,
        protocolFamilyId,
        versionNumber: 1,
        parentVersionId: undefined,
        createdAtUnixMs,
        protocol,
        dependencies,
        changeSummary,
    });
}

/** Creates the next planned protocol version from an existing parent version. */
export function createNextPlannedProtocolVersion({
    id,
    parentVersion,
    createdAtUnixMs,
    protocol,
    dependencies,
    changeSummary,
}) {
    validatePlannedProtocolVersion(parentVersion);

    return createPlannedProtocolVersion({
        id,
        protocolFamilyId: parentVersion.protocolFamilyId,
        versionNumber: parentVersion.versionNumber + 1,
        parentVersionId: parentVersion.id,
        createdAtUnixMs,
        protocol,
        dependencies,
        changeSummary,
    });
}
