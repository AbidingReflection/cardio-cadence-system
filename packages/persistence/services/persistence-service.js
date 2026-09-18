/** Provides application-facing persistence operations for protocol families and versions. */

import { createProtocolFamily } from "../records/protocol-family.js";

import {
    createInitialPlannedProtocolVersion,
    createNextPlannedProtocolVersion,
} from "./planned-protocol-versioning.js";

/** Coordinates protocol-family and planned-version persistence operations. */
export class PersistenceService {
    #protocolFamilyRepository;
    #plannedProtocolVersionRepository;
    #idGenerator;
    #clock;

    /** Creates a service with repositories and persistence value generators. */
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

    /** Creates a protocol family with its initial planned version. */
    createProtocolFamilyWithInitialVersion({ displayName, protocol, dependencies, changeSummary }) {
        const protocolFamily = createProtocolFamily({
            id: this.#idGenerator(),
            createdAtUnixMs: this.#clock(),
            displayName,
        });

        const plannedProtocolVersion = createInitialPlannedProtocolVersion({
            id: this.#idGenerator(),
            protocolFamilyId: protocolFamily.id,
            createdAtUnixMs: this.#clock(),
            protocol,
            dependencies,
            changeSummary,
        });

        this.#protocolFamilyRepository.add(protocolFamily);

        try {
            this.#plannedProtocolVersionRepository.add(plannedProtocolVersion);
        } catch (error) {
            this.#protocolFamilyRepository.delete(protocolFamily.id);
            throw error;
        }

        return {
            protocolFamily,
            plannedProtocolVersion,
        };
    }

    /** Creates the next planned version from the latest version in a family. */
    createNextPlannedProtocolVersion({ protocolFamilyId, protocol, dependencies, changeSummary }) {
        const protocolFamily = this.#protocolFamilyRepository.getById(protocolFamilyId);

        if (protocolFamily === undefined) {
            throw new Error(`ProtocolFamily "${protocolFamilyId}" does not exist.`);
        }

        const versions = this.#plannedProtocolVersionRepository.listByFamilyId(protocolFamilyId);

        const parentVersion = versions.at(-1);

        if (parentVersion === undefined) {
            throw new Error(
                `ProtocolFamily "${protocolFamilyId}" has no planned protocol versions.`,
            );
        }

        const plannedProtocolVersion = createNextPlannedProtocolVersion({
            id: this.#idGenerator(),
            parentVersion,
            createdAtUnixMs: this.#clock(),
            protocol,
            dependencies,
            changeSummary,
        });

        this.#plannedProtocolVersionRepository.add(plannedProtocolVersion);

        return plannedProtocolVersion;
    }

    /** Returns a protocol family by ID. */
    getProtocolFamily(id) {
        return this.#protocolFamilyRepository.getById(id);
    }

    /** Returns protocol families, excluding archived families by default. */
    listProtocolFamilies({ includeArchived = false } = {}) {
        const families = this.#protocolFamilyRepository.list();

        if (includeArchived) {
            return families;
        }

        return families.filter((family) => !family.archived);
    }

    /** Returns a planned protocol version by ID. */
    getPlannedProtocolVersion(id) {
        return this.#plannedProtocolVersionRepository.getById(id);
    }

    /** Returns planned protocol versions for a family in version order. */
    listPlannedProtocolVersions(protocolFamilyId) {
        return this.#plannedProtocolVersionRepository.listByFamilyId(protocolFamilyId);
    }

    /** Renames a protocol family. */
    renameProtocolFamily(id, displayName) {
        return this.#protocolFamilyRepository.update(id, {
            displayName,
        });
    }

    /** Archives a protocol family. */
    archiveProtocolFamily(id) {
        return this.#protocolFamilyRepository.update(id, {
            archived: true,
        });
    }

    /** Restores an archived protocol family. */
    restoreProtocolFamily(id) {
        return this.#protocolFamilyRepository.update(id, {
            archived: false,
        });
    }
}
