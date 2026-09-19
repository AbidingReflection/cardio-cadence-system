/** Stores machine profile versions and enforces version lineage rules. */

import { validateMachineProfileVersion } from "../records/machine-profile-version.js";

/** Stores immutable machine profile versions by version ID. */
export class MachineProfileVersionRepository {
    #versions = new Map();

    /** Adds a machine profile version after validating uniqueness and lineage. */
    add(version) {
        validateMachineProfileVersion(version);

        if (this.#versions.has(version.id)) {
            throw new Error(`MachineProfileVersion "${version.id}" already exists.`);
        }

        const existingVersion = this.listByMachineProfileId(version.machineProfileId).find(
            (candidate) => candidate.versionNumber === version.versionNumber,
        );

        if (existingVersion !== undefined) {
            throw new Error(
                `MachineProfileVersion versionNumber ${version.versionNumber} already exists for machineProfileId "${version.machineProfileId}".`,
            );
        }

        this.#validateParent(version);

        this.#versions.set(version.id, structuredClone(version));

        return version;
    }

    /** Returns a machine profile version by ID. */
    getById(id) {
        const version = this.#versions.get(id);

        return version === undefined ? undefined : structuredClone(version);
    }

    /** Returns all machine profile versions in deterministic order. */
    listAll() {
        return [...this.#versions.values()].sort(
            (a, b) =>
                a.machineProfileId.localeCompare(b.machineProfileId) ||
                a.versionNumber - b.versionNumber ||
                a.id.localeCompare(b.id),
        );
    }

    /** Returns machine profile versions for one machine profile in version order. */
    listByMachineProfileId(machineProfileId) {
        return [...this.#versions.values()]
            .filter((version) => version.machineProfileId === machineProfileId)
            .sort((left, right) => left.versionNumber - right.versionNumber)
            .map((version) => structuredClone(version));
    }

    /** Deletes a machine profile version when no child version references it. */
    delete(id) {
        if (!this.#versions.has(id)) {
            return false;
        }

        const hasChild = [...this.#versions.values()].some(
            (version) => version.parentVersionId === id,
        );

        if (hasChild) {
            throw new Error(
                `MachineProfileVersion "${id}" cannot be deleted because a child version references it.`,
            );
        }

        this.#versions.delete(id);

        return true;
    }

    /** Returns whether any version belongs to the specified machine profile. */
    hasMachineProfileReference(machineProfileId) {
        return [...this.#versions.values()].some(
            (version) => version.machineProfileId === machineProfileId,
        );
    }

    /** Validates the parent relationship for a later machine profile version. */
    #validateParent(version) {
        if (version.versionNumber === 1) {
            return;
        }

        const parent = this.#versions.get(version.parentVersionId);

        if (parent === undefined) {
            throw new Error(
                `MachineProfileVersion parent "${version.parentVersionId}" does not exist.`,
            );
        }

        if (parent.machineProfileId !== version.machineProfileId) {
            throw new Error(
                "MachineProfileVersion parent must belong to the same machineProfileId.",
            );
        }

        if (parent.versionNumber !== version.versionNumber - 1) {
            throw new Error("MachineProfileVersion parent must be the immediate predecessor.");
        }
    }
}
