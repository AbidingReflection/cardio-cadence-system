import { validatePlannedProtocolVersion } from "./planned-protocol-version.js";

/** Creates an in-memory planned-protocol-version repository. */
export function createPlannedProtocolVersionRepository() {
    const versionsById = new Map();

    return {
        add,
        getById,
        listByFamilyId,
    };

    /** Adds a planned protocol version to the repository. */
    function add(version) {
        validatePlannedProtocolVersion(version);

        if (versionsById.has(version.id)) {
            throw new Error(`PlannedProtocolVersion id "${version.id}" already exists.`);
        }

        const familyVersions = listByFamilyId(version.protocolFamilyId);

        if (
            familyVersions.some(
                (existingVersion) => existingVersion.versionNumber === version.versionNumber,
            )
        ) {
            throw new Error(
                `PlannedProtocolVersion versionNumber ${version.versionNumber} already exists for protocolFamilyId "${version.protocolFamilyId}".`,
            );
        }

        validateParent(version);

        versionsById.set(version.id, version);
    }

    /** Returns a planned protocol version by ID. */
    function getById(id) {
        return versionsById.get(id);
    }

    /** Returns all planned protocol versions for a family in version order. */
    function listByFamilyId(protocolFamilyId) {
        return [...versionsById.values()]
            .filter((version) => version.protocolFamilyId === protocolFamilyId)
            .sort((a, b) => a.versionNumber - b.versionNumber);
    }

    /** Validates repository-level parent relationships. */
    function validateParent(version) {
        if (version.parentVersionId === undefined) {
            return;
        }

        const parentVersion = versionsById.get(version.parentVersionId);

        if (parentVersion === undefined) {
            throw new Error(
                `PlannedProtocolVersion parentVersionId "${version.parentVersionId}" does not exist.`,
            );
        }

        if (parentVersion.versionNumber !== version.versionNumber - 1) {
            throw new Error(
                `PlannedProtocolVersion parentVersionId must reference version ${version.versionNumber - 1}.`,
            );
        }

        if (parentVersion.protocolFamilyId !== version.protocolFamilyId) {
            throw new Error(
                `PlannedProtocolVersion parent protocolFamilyId must match "${version.protocolFamilyId}".`,
            );
        }
    }
}
