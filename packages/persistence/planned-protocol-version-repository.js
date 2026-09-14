import { validatePlannedProtocolVersion } from "./planned-protocol-version.js";

export class PlannedProtocolVersionRepository {
    #versionsById = new Map();
    #isReferenced;

    constructor({ isReferenced = () => false } = {}) {
        this.#isReferenced = isReferenced;
    }

    /** Adds a planned protocol version to the repository. */
    add(version) {
        validatePlannedProtocolVersion(version);

        if (this.#versionsById.has(version.id)) {
            throw new Error(`PlannedProtocolVersion id "${version.id}" already exists.`);
        }

        const familyVersions = this.listByFamilyId(version.protocolFamilyId);

        if (
            familyVersions.some(
                (existingVersion) => existingVersion.versionNumber === version.versionNumber,
            )
        ) {
            throw new Error(
                `PlannedProtocolVersion versionNumber ${version.versionNumber} already exists for protocolFamilyId "${version.protocolFamilyId}".`,
            );
        }

        this.#validateParent(version);

        this.#versionsById.set(version.id, version);
    }

    /** Returns a planned protocol version by ID. */
    getById(id) {
        return this.#versionsById.get(id);
    }

    /** Returns all planned protocol versions for a family in version order. */
    listByFamilyId(protocolFamilyId) {
        return [...this.#versionsById.values()]
            .filter((version) => version.protocolFamilyId === protocolFamilyId)
            .sort((a, b) => a.versionNumber - b.versionNumber);
    }

    /** Returns whether any planned version references the protocol family. */
    hasProtocolFamilyReference(protocolFamilyId) {
        return [...this.#versionsById.values()].some(
            (version) => version.protocolFamilyId === protocolFamilyId,
        );
    }

    /** Deletes an unreferenced planned protocol version. */
    delete(id) {
        const version = this.#versionsById.get(id);

        if (version === undefined) {
            return false;
        }

        if (this.#isReferenced(id)) {
            throw new Error(
                `PlannedProtocolVersion "${id}" cannot be deleted because it is referenced.`,
            );
        }

        const hasChildVersion = [...this.#versionsById.values()].some(
            (candidate) => candidate.parentVersionId === id,
        );

        if (hasChildVersion) {
            throw new Error(
                `PlannedProtocolVersion "${id}" cannot be deleted because a later version references it.`,
            );
        }

        this.#versionsById.delete(id);

        return true;
    }

    /** Validates repository-level parent relationships. */
    #validateParent(version) {
        if (version.parentVersionId === undefined) {
            return;
        }

        const parentVersion = this.#versionsById.get(version.parentVersionId);

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
