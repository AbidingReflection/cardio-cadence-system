import { ActivityType } from "../models/activity-type.js";
import { CalibrationProfile } from "../models/calibration-profile.js";
import { MachineProfile } from "../models/machine-profile.js";

/** Coordinates opening persisted protocol families into the Protocol Designer. */
export class ProtocolOpenController {
    #protocolModel;
    #editorState;
    #persistenceService;
    #activityTypeVersionRepository;
    #machineProfileVersionRepository;
    #calibrationProfileVersionRepository;

    /** Creates a controller for opening persisted protocol families. */
    constructor({
        protocolModel,
        editorState,
        persistenceService,
        activityTypeVersionRepository,
        machineProfileVersionRepository,
        calibrationProfileVersionRepository,
    }) {
        this.#protocolModel = protocolModel;
        this.#editorState = editorState;
        this.#persistenceService = persistenceService;
        this.#activityTypeVersionRepository = activityTypeVersionRepository;
        this.#machineProfileVersionRepository = machineProfileVersionRepository;
        this.#calibrationProfileVersionRepository = calibrationProfileVersionRepository;
    }

    /** Opens the latest planned protocol version for a protocol family. */
    openProtocolFamily(protocolFamilyId) {
        const protocolFamily = this.#persistenceService.getProtocolFamily(protocolFamilyId);

        if (protocolFamily === undefined) {
            throw new Error(`Protocol family "${protocolFamilyId}" was not found.`);
        }

        const plannedProtocolVersions =
            this.#persistenceService.listPlannedProtocolVersions(protocolFamilyId);

        if (plannedProtocolVersions.length === 0) {
            throw new Error(
                `Protocol family "${protocolFamilyId}" has no planned protocol versions.`,
            );
        }

        const latestVersion = plannedProtocolVersions.reduce((latest, version) =>
            version.versionNumber > latest.versionNumber ? version : latest,
        );

        const activityTypeVersion = this.#activityTypeVersionRepository.getById(
            latestVersion.dependencies.activityTypeVersionId,
        );

        if (activityTypeVersion === undefined) {
            throw new Error(
                `Activity type version "${latestVersion.dependencies.activityTypeVersionId}" was not found.`,
            );
        }

        let machineProfileVersion;

        if (latestVersion.dependencies.machineProfileVersionId !== undefined) {
            machineProfileVersion = this.#machineProfileVersionRepository.getById(
                latestVersion.dependencies.machineProfileVersionId,
            );

            if (machineProfileVersion === undefined) {
                throw new Error(
                    `Machine profile version "${latestVersion.dependencies.machineProfileVersionId}" was not found.`,
                );
            }
        }

        let calibrationProfileVersion;

        if (latestVersion.dependencies.calibrationProfileVersionId !== undefined) {
            calibrationProfileVersion = this.#calibrationProfileVersionRepository.getById(
                latestVersion.dependencies.calibrationProfileVersionId,
            );

            if (calibrationProfileVersion === undefined) {
                throw new Error(
                    `Calibration profile version "${latestVersion.dependencies.calibrationProfileVersionId}" was not found.`,
                );
            }
        }

        const activityType = new ActivityType(activityTypeVersion.definition);

        const machineProfile =
            machineProfileVersion === undefined
                ? undefined
                : new MachineProfile(machineProfileVersion.definition, activityType);

        const calibrationProfile =
            calibrationProfileVersion === undefined
                ? undefined
                : new CalibrationProfile(calibrationProfileVersion.definition, machineProfile);

        this.#protocolModel.replaceProtocol(
            latestVersion.protocol,
            activityType,
            machineProfile,
            calibrationProfile,
        );

        this.#editorState.setProtocolPersistenceIdentity({
            protocolFamilyId,
            plannedProtocolVersionId: latestVersion.id,
        });

        return latestVersion;
    }
}
