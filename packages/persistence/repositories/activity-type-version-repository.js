/** Stores activity type versions and enforces version lineage rules. */

import { validateActivityTypeVersion } from "../records/activity-type-version.js";

/** Stores immutable activity type versions by version ID. */
export class ActivityTypeVersionRepository {
    #versions = new Map();

    /** Adds an activity type version after validating uniqueness and lineage. */
    add(version) {
        validateActivityTypeVersion(version);

        if (this.#versions.has(version.id)) {
            throw new Error(`ActivityTypeVersion "${version.id}" already exists.`);
        }

        const existingVersion = this.listByActivityTypeId(version.activityTypeId).find(
            (candidate) => candidate.versionNumber === version.versionNumber,
        );

        if (existingVersion !== undefined) {
            throw new Error(
                `ActivityTypeVersion versionNumber ${version.versionNumber} already exists for activityTypeId "${version.activityTypeId}".`,
            );
        }

        this.#validateParent(version);

        this.#versions.set(version.id, structuredClone(version));

        return version;
    }

    /** Returns an activity type version by ID. */
    getById(id) {
        const version = this.#versions.get(id);

        return version === undefined ? undefined : structuredClone(version);
    }

    /** Returns activity type versions for one activity type in version order. */
    listByActivityTypeId(activityTypeId) {
        return [...this.#versions.values()]
            .filter((version) => version.activityTypeId === activityTypeId)
            .sort((left, right) => left.versionNumber - right.versionNumber)
            .map((version) => structuredClone(version));
    }

    /** Deletes an activity type version when no child version references it. */
    delete(id) {
        if (!this.#versions.has(id)) {
            return false;
        }

        const hasChild = [...this.#versions.values()].some(
            (version) => version.parentVersionId === id,
        );

        if (hasChild) {
            throw new Error(
                `ActivityTypeVersion "${id}" cannot be deleted because a child version references it.`,
            );
        }

        this.#versions.delete(id);

        return true;
    }

    /** Returns whether any version belongs to the specified activity type. */
    hasActivityTypeReference(activityTypeId) {
        return [...this.#versions.values()].some(
            (version) => version.activityTypeId === activityTypeId,
        );
    }

    /** Validates the parent relationship for a later activity type version. */
    #validateParent(version) {
        if (version.versionNumber === 1) {
            return;
        }

        const parent = this.#versions.get(version.parentVersionId);

        if (parent === undefined) {
            throw new Error(
                `ActivityTypeVersion parent "${version.parentVersionId}" does not exist.`,
            );
        }

        if (parent.activityTypeId !== version.activityTypeId) {
            throw new Error("ActivityTypeVersion parent must belong to the same activityTypeId.");
        }

        if (parent.versionNumber !== version.versionNumber - 1) {
            throw new Error("ActivityTypeVersion parent must be the immediate predecessor.");
        }
    }
}
