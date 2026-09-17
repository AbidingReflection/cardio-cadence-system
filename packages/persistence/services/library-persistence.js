/** Provides async application-facing access to the durable protocol library. */

import { createExecutedProtocol } from "../records/executed-protocol.js";
import { createProtocolFamily } from "../records/protocol-family.js";

import {
    createInitialPlannedProtocolVersion,
    createNextPlannedProtocolVersion,
} from "./planned-protocol-versioning.js";

import {
    createInitialActivityTypeVersion,
    createNextActivityTypeVersion,
} from "./activity-type-versioning.js";

import {
    createInitialMachineProfileVersion,
    createNextMachineProfileVersion,
} from "./machine-profile-versioning.js";

import {
    createInitialCalibrationProfileVersion,
    createNextCalibrationProfileVersion,
} from "./calibration-profile-versioning.js";

/** Coordinates protocol-family, planned-version, and execution persistence operations. */
export class LibraryPersistence {
    #protocolFamilyRepository;
    #plannedProtocolVersionRepository;
    #executedProtocolRepository;
    #idGenerator;
    #clock;
    #activityTypeVersionRepository;
    #machineProfileVersionRepository;
    #calibrationProfileVersionRepository;

    /** Creates library persistence backed by the supplied repositories and generators. */
    constructor({
        protocolFamilyRepository,
        plannedProtocolVersionRepository,
        executedProtocolRepository,
        activityTypeVersionRepository,
        machineProfileVersionRepository,
        calibrationProfileVersionRepository,
        idGenerator,
        clock,
    }) {
        this.#protocolFamilyRepository = protocolFamilyRepository;
        this.#plannedProtocolVersionRepository = plannedProtocolVersionRepository;
        this.#executedProtocolRepository = executedProtocolRepository;
        this.#activityTypeVersionRepository = activityTypeVersionRepository;
        this.#machineProfileVersionRepository = machineProfileVersionRepository;
        this.#calibrationProfileVersionRepository = calibrationProfileVersionRepository;
        this.#idGenerator = idGenerator;
        this.#clock = clock;
    }

    /** Creates and persists a protocol family. */
    async createProtocolFamily({ displayName, archived = false }) {
        const protocolFamily = createProtocolFamily({
            id: this.#idGenerator(),
            createdAtUnixMs: this.#clock(),
            displayName,
            archived,
        });

        this.#protocolFamilyRepository.add(protocolFamily);

        return protocolFamily;
    }

    /** Updates mutable protocol-family metadata. */
    async updateProtocolFamily(id, changes) {
        return this.#protocolFamilyRepository.update(id, changes);
    }

    /** Returns a protocol family by ID. */
    async getProtocolFamily(id) {
        return this.#protocolFamilyRepository.getById(id);
    }

    /** Returns protocol families in deterministic order. */
    async listProtocolFamilies() {
        return this.#protocolFamilyRepository.list();
    }

    /** Creates and persists the first planned version for a protocol family. */
    async createInitialPlannedProtocolVersion({
        protocolFamilyId,
        protocol,
        dependencies,
        changeSummary,
    }) {
        const protocolFamily = this.#protocolFamilyRepository.getById(protocolFamilyId);

        if (protocolFamily === undefined) {
            throw new Error(`ProtocolFamily "${protocolFamilyId}" does not exist.`);
        }

        const version = createInitialPlannedProtocolVersion({
            id: this.#idGenerator(),
            protocolFamilyId,
            createdAtUnixMs: this.#clock(),
            protocol,
            dependencies,
            changeSummary,
        });

        this.#plannedProtocolVersionRepository.add(version);

        return version;
    }

    /** Creates and persists the next planned version from an explicit parent. */
    async createNextPlannedProtocolVersion({
        parentVersionId,
        protocol,
        dependencies,
        changeSummary,
    }) {
        const parentVersion = this.#plannedProtocolVersionRepository.getById(parentVersionId);

        if (parentVersion === undefined) {
            throw new Error(`Parent PlannedProtocolVersion "${parentVersionId}" does not exist.`);
        }

        const version = createNextPlannedProtocolVersion({
            id: this.#idGenerator(),
            parentVersion,
            createdAtUnixMs: this.#clock(),
            protocol,
            dependencies,
            changeSummary,
        });

        this.#plannedProtocolVersionRepository.add(version);

        return version;
    }

    /** Returns a planned protocol version by ID. */
    async getPlannedProtocolVersion(id) {
        return this.#plannedProtocolVersionRepository.getById(id);
    }

    /** Returns planned protocol versions for a family in version order. */
    async listPlannedProtocolVersions(protocolFamilyId) {
        return this.#plannedProtocolVersionRepository.listByFamilyId(protocolFamilyId);
    }

    /** Creates and persists an executed protocol for an existing planned version. */
    async createExecutedProtocol({
        plannedProtocolVersionId,
        status,
        startedAtUnixMs,
        events,
        lastKnownActiveAtUnixMs,
        endedAtUnixMs,
    }) {
        const plannedVersion =
            this.#plannedProtocolVersionRepository.getById(plannedProtocolVersionId);

        if (plannedVersion === undefined) {
            throw new Error(`PlannedProtocolVersion "${plannedProtocolVersionId}" does not exist.`);
        }

        const executedProtocol = createExecutedProtocol({
            id: this.#idGenerator(),
            plannedProtocolVersionId,
            status,
            startedAtUnixMs,
            events,
            lastKnownActiveAtUnixMs,
            endedAtUnixMs,
        });

        this.#executedProtocolRepository.add(executedProtocol);

        return executedProtocol;
    }

    /** Returns an executed protocol by ID. */
    async getExecutedProtocol(id) {
        return this.#executedProtocolRepository.getById(id);
    }

    /** Returns executed protocols for a planned protocol version. */
    async listExecutedProtocols(plannedProtocolVersionId) {
        return this.#executedProtocolRepository.listByPlannedProtocolVersionId(
            plannedProtocolVersionId,
        );
    }

    /** Creates and persists the first version for an activity type definition. */
    async createInitialActivityTypeVersion({ definition }) {
        const version = createInitialActivityTypeVersion({
            id: this.#idGenerator(),
            createdAtUnixMs: this.#clock(),
            definition,
        });

        this.#activityTypeVersionRepository.add(version);

        return version;
    }

    /** Creates and persists the next activity type version from an explicit parent. */
    async createNextActivityTypeVersion({ parentVersionId, definition }) {
        const parentVersion = this.#activityTypeVersionRepository.getById(parentVersionId);

        if (parentVersion === undefined) {
            throw new Error(`Parent ActivityTypeVersion "${parentVersionId}" does not exist.`);
        }

        const version = createNextActivityTypeVersion({
            id: this.#idGenerator(),
            parentVersion,
            createdAtUnixMs: this.#clock(),
            definition,
        });

        this.#activityTypeVersionRepository.add(version);

        return version;
    }

    /** Returns an activity type version by ID. */
    async getActivityTypeVersion(id) {
        return this.#activityTypeVersionRepository.getById(id);
    }

    /** Returns activity type versions for one activity type in version order. */
    async listActivityTypeVersions(activityTypeId) {
        return this.#activityTypeVersionRepository.listByActivityTypeId(activityTypeId);
    }

    /** Creates and persists the first version for a machine profile definition. */
    async createInitialMachineProfileVersion({ activityTypeVersionId, definition }) {
        const activityTypeVersion =
            this.#activityTypeVersionRepository.getById(activityTypeVersionId);

        if (activityTypeVersion === undefined) {
            throw new Error(`ActivityTypeVersion "${activityTypeVersionId}" does not exist.`);
        }

        const version = createInitialMachineProfileVersion({
            id: this.#idGenerator(),
            createdAtUnixMs: this.#clock(),
            activityTypeVersionId,
            activityTypeId: activityTypeVersion.activityTypeId,
            definition,
        });

        this.#machineProfileVersionRepository.add(version);

        return version;
    }

    /** Creates and persists the next machine profile version from an explicit parent. */
    async createNextMachineProfileVersion({ parentVersionId, activityTypeVersionId, definition }) {
        const parentVersion = this.#machineProfileVersionRepository.getById(parentVersionId);

        if (parentVersion === undefined) {
            throw new Error(`Parent MachineProfileVersion "${parentVersionId}" does not exist.`);
        }

        const activityTypeVersion =
            this.#activityTypeVersionRepository.getById(activityTypeVersionId);

        if (activityTypeVersion === undefined) {
            throw new Error(`ActivityTypeVersion "${activityTypeVersionId}" does not exist.`);
        }

        const version = createNextMachineProfileVersion({
            id: this.#idGenerator(),
            parentVersion,
            createdAtUnixMs: this.#clock(),
            activityTypeVersionId,
            activityTypeId: activityTypeVersion.activityTypeId,
            definition,
        });

        this.#machineProfileVersionRepository.add(version);

        return version;
    }

    /** Returns a machine profile version by ID. */
    async getMachineProfileVersion(id) {
        return this.#machineProfileVersionRepository.getById(id);
    }

    /** Returns machine profile versions for one machine profile in version order. */
    async listMachineProfileVersions(machineProfileId) {
        return this.#machineProfileVersionRepository.listByMachineProfileId(machineProfileId);
    }

    /** Creates and persists the first version for a calibration profile definition. */
    async createInitialCalibrationProfileVersion({ machineProfileVersionId, definition }) {
        const machineProfileVersion =
            this.#machineProfileVersionRepository.getById(machineProfileVersionId);

        if (machineProfileVersion === undefined) {
            throw new Error(`MachineProfileVersion "${machineProfileVersionId}" does not exist.`);
        }

        const version = createInitialCalibrationProfileVersion({
            id: this.#idGenerator(),
            createdAtUnixMs: this.#clock(),
            machineProfileVersionId,
            machineProfileId: machineProfileVersion.machineProfileId,
            definition,
        });

        this.#calibrationProfileVersionRepository.add(version);

        return version;
    }

    /** Creates and persists the next calibration profile version from an explicit parent. */
    async createNextCalibrationProfileVersion({
        parentVersionId,
        machineProfileVersionId,
        definition,
    }) {
        const parentVersion = this.#calibrationProfileVersionRepository.getById(parentVersionId);

        if (parentVersion === undefined) {
            throw new Error(
                `Parent CalibrationProfileVersion "${parentVersionId}" does not exist.`,
            );
        }

        const machineProfileVersion =
            this.#machineProfileVersionRepository.getById(machineProfileVersionId);

        if (machineProfileVersion === undefined) {
            throw new Error(`MachineProfileVersion "${machineProfileVersionId}" does not exist.`);
        }

        const version = createNextCalibrationProfileVersion({
            id: this.#idGenerator(),
            parentVersion,
            createdAtUnixMs: this.#clock(),
            machineProfileVersionId,
            machineProfileId: machineProfileVersion.machineProfileId,
            definition,
        });

        this.#calibrationProfileVersionRepository.add(version);

        return version;
    }

    /** Returns a calibration profile version by ID. */
    async getCalibrationProfileVersion(id) {
        return this.#calibrationProfileVersionRepository.getById(id);
    }

    /** Returns calibration profile versions for one profile in version order. */
    async listCalibrationProfileVersions(calibrationProfileId) {
        return this.#calibrationProfileVersionRepository.listByCalibrationProfileId(
            calibrationProfileId,
        );
    }
}
