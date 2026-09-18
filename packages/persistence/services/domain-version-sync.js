/** Synchronizes current domain definitions with persisted immutable version records. */

import { deepEqual } from "/packages/utils/deep-equal.js";

/** Resolves exact persisted domain-version dependencies for current domain objects. */
export class DomainVersionSync {
    #libraryPersistence;

    /** Creates a domain-version synchronization service. */
    constructor({ libraryPersistence }) {
        this.#libraryPersistence = libraryPersistence;
    }

    /** Resolves or creates persisted versions for the supplied domain dependency chain. */
    async resolveDependencies({
        activityType,
        machineProfile = undefined,
        calibrationProfile = undefined,
    }) {
        const activityTypeVersion = await this.#resolveActivityTypeVersion(activityType);

        const machineProfileVersion =
            machineProfile === undefined
                ? undefined
                : await this.#resolveMachineProfileVersion(machineProfile, activityTypeVersion.id);

        const calibrationProfileVersion =
            calibrationProfile === undefined
                ? undefined
                : await this.#resolveCalibrationProfileVersion(
                      calibrationProfile,
                      machineProfileVersion.id,
                  );

        return {
            activityTypeVersionId: activityTypeVersion.id,
            machineProfileVersionId: machineProfileVersion?.id,
            calibrationProfileVersionId: calibrationProfileVersion?.id,
        };
    }

    /** Resolves or creates the exact persisted version for an activity type. */
    async #resolveActivityTypeVersion(activityType) {
        const definition = activityType.getDefinition();

        const versions = await this.#libraryPersistence.listActivityTypeVersions(activityType.id);

        const matchingVersion = versions.find((version) =>
            deepEqual(version.definition, definition),
        );

        if (matchingVersion !== undefined) {
            return matchingVersion;
        }

        if (versions.length === 0) {
            return this.#libraryPersistence.createInitialActivityTypeVersion({
                definition,
            });
        }

        const parentVersion = versions.at(-1);

        return this.#libraryPersistence.createNextActivityTypeVersion({
            parentVersionId: parentVersion.id,
            definition,
        });
    }

    /** Resolves or creates the exact persisted version for a machine profile. */
    async #resolveMachineProfileVersion(machineProfile, activityTypeVersionId) {
        const definition = machineProfile.getDefinition();

        const versions = await this.#libraryPersistence.listMachineProfileVersions(
            machineProfile.id,
        );

        const matchingVersion = versions.find(
            (version) =>
                version.activityTypeVersionId === activityTypeVersionId &&
                deepEqual(version.definition, definition),
        );

        if (matchingVersion !== undefined) {
            return matchingVersion;
        }

        if (versions.length === 0) {
            return this.#libraryPersistence.createInitialMachineProfileVersion({
                activityTypeVersionId,
                definition,
            });
        }

        const parentVersion = versions.at(-1);

        return this.#libraryPersistence.createNextMachineProfileVersion({
            parentVersionId: parentVersion.id,
            activityTypeVersionId,
            definition,
        });
    }

    /** Resolves or creates the exact persisted version for a calibration profile. */
    async #resolveCalibrationProfileVersion(calibrationProfile, machineProfileVersionId) {
        const definition = calibrationProfile.getDefinition();

        const versions = await this.#libraryPersistence.listCalibrationProfileVersions(
            calibrationProfile.id,
        );

        const matchingVersion = versions.find(
            (version) =>
                version.machineProfileVersionId === machineProfileVersionId &&
                deepEqual(version.definition, definition),
        );

        if (matchingVersion !== undefined) {
            return matchingVersion;
        }

        if (versions.length === 0) {
            return this.#libraryPersistence.createInitialCalibrationProfileVersion({
                machineProfileVersionId,
                definition,
            });
        }

        const parentVersion = versions.at(-1);

        return this.#libraryPersistence.createNextCalibrationProfileVersion({
            parentVersionId: parentVersion.id,
            machineProfileVersionId,
            definition,
        });
    }
}
