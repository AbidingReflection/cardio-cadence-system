/** Provides async application-facing access to the durable protocol library. */

import { createProtocolFamily } from "../records/protocol-family.js";

import {
    createInitialPlannedProtocolVersion,
    createNextPlannedProtocolVersion,
} from "./planned-protocol-versioning.js";

/** Coordinates protocol-family and planned-version persistence operations. */
export class LibraryPersistence {
    #protocolFamilyRepository;
    #plannedProtocolVersionRepository;
    #idGenerator;
    #clock;

    /** Creates library persistence backed by the supplied repositories and generators. */
    constructor({
        protocolFamilyRepository,
        plannedProtocolVersionRepository,
        idGenerator,
        clock,
    }) {
        this.#protocolFamilyRepository = protocolFamilyRepository;
        this.#plannedProtocolVersionRepository = plannedProtocolVersionRepository;
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
}
