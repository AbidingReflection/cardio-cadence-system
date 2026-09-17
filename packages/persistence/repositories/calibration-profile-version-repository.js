/** Stores calibration profile versions and enforces version lineage rules. */

import { validateCalibrationProfileVersion } from "../records/calibration-profile-version.js";

/** Stores immutable calibration profile versions by version ID. */
export class CalibrationProfileVersionRepository {
    #versions = new Map();

    /** Adds a calibration profile version after validating uniqueness and lineage. */
    add(version) {
        validateCalibrationProfileVersion(version);

        if (this.#versions.has(version.id)) {
            throw new Error(`CalibrationProfileVersion "${version.id}" already exists.`);
        }

        const existingVersion = this.listByCalibrationProfileId(version.calibrationProfileId).find(
            (candidate) => candidate.versionNumber === version.versionNumber,
        );

        if (existingVersion !== undefined) {
            throw new Error(
                `CalibrationProfileVersion versionNumber ${version.versionNumber} already exists for calibrationProfileId "${version.calibrationProfileId}".`,
            );
        }

        this.#validateParent(version);

        this.#versions.set(version.id, structuredClone(version));

        return version;
    }

    /** Returns a calibration profile version by ID. */
    getById(id) {
        const version = this.#versions.get(id);

        return version === undefined ? undefined : structuredClone(version);
    }

    /** Returns calibration profile versions for one profile in version order. */
    listByCalibrationProfileId(calibrationProfileId) {
        return [...this.#versions.values()]
            .filter((version) => version.calibrationProfileId === calibrationProfileId)
            .sort((left, right) => left.versionNumber - right.versionNumber)
            .map((version) => structuredClone(version));
    }

    /** Deletes a calibration profile version when no child version references it. */
    delete(id) {
        if (!this.#versions.has(id)) {
            return false;
        }

        const hasChild = [...this.#versions.values()].some(
            (version) => version.parentVersionId === id,
        );

        if (hasChild) {
            throw new Error(
                `CalibrationProfileVersion "${id}" cannot be deleted because a child version references it.`,
            );
        }

        this.#versions.delete(id);

        return true;
    }

    /** Returns whether any version belongs to the specified calibration profile. */
    hasCalibrationProfileReference(calibrationProfileId) {
        return [...this.#versions.values()].some(
            (version) => version.calibrationProfileId === calibrationProfileId,
        );
    }

    /** Validates the parent relationship for a later calibration profile version. */
    #validateParent(version) {
        if (version.versionNumber === 1) {
            return;
        }

        const parent = this.#versions.get(version.parentVersionId);

        if (parent === undefined) {
            throw new Error(
                `CalibrationProfileVersion parent "${version.parentVersionId}" does not exist.`,
            );
        }

        if (parent.calibrationProfileId !== version.calibrationProfileId) {
            throw new Error(
                "CalibrationProfileVersion parent must belong to the same calibrationProfileId.",
            );
        }

        if (parent.versionNumber !== version.versionNumber - 1) {
            throw new Error("CalibrationProfileVersion parent must be the immediate predecessor.");
        }
    }
}
