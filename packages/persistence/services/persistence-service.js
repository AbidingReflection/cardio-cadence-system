/** Provides application-facing persistence operations for protocol families and versions. */

import { createProtocolFamily } from "../records/protocol-family.js";

import {
    createInitialPlannedProtocolVersion,
    createNextPlannedProtocolVersion,
} from "./planned-protocol-versioning.js";

import { createExecutedProtocol } from "../records/executed-protocol.js";

/** Coordinates protocol-family and planned-version persistence operations. */
export class PersistenceService {
    #protocolFamilyRepository;
    #plannedProtocolVersionRepository;
    #idGenerator;
    #clock;
    #executedProtocolRepository;

    /** Creates a service with repositories and persistence value generators. */
    constructor({
        protocolFamilyRepository,
        plannedProtocolVersionRepository,
        executedProtocolRepository,
        idGenerator,
        clock,
    }) {
        this.#protocolFamilyRepository = protocolFamilyRepository;
        this.#plannedProtocolVersionRepository = plannedProtocolVersionRepository;
        this.#executedProtocolRepository = executedProtocolRepository;
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

    /** Starts and persists an execution for an existing planned protocol version. */
    startExecution({ plannedProtocolVersionId }) {
        const plannedProtocolVersion =
            this.#plannedProtocolVersionRepository.getById(plannedProtocolVersionId);

        if (plannedProtocolVersion === undefined) {
            throw new Error(`PlannedProtocolVersion "${plannedProtocolVersionId}" does not exist.`);
        }

        const startedAtUnixMs = this.#clock();

        const execution = createExecutedProtocol({
            id: this.#idGenerator(),
            plannedProtocolVersionId,
            status: "in-progress",
            startedAtUnixMs,
            lastKnownActiveAtUnixMs: startedAtUnixMs,
            events: [],
        });

        this.#executedProtocolRepository.add(execution);

        return execution;
    }

    /** Appends a timestamped event to an in-progress execution. */
    appendExecutionEvent(executionId, eventInput) {
        const execution = this.#getInProgressExecution(executionId);

        const event = {
            ...eventInput,
            occurredAtUnixMs: this.#clock(),
        };

        const updatedExecution = {
            ...execution,
            events: [...execution.events, event],
        };

        this.#executedProtocolRepository.replace(updatedExecution);

        return updatedExecution;
    }

    /** Updates the last-known activity timestamp for an in-progress execution. */
    updateExecutionActivity(executionId) {
        const execution = this.#getInProgressExecution(executionId);

        const updatedExecution = {
            ...execution,
            lastKnownActiveAtUnixMs: this.#clock(),
        };

        this.#executedProtocolRepository.replace(updatedExecution);

        return updatedExecution;
    }

    /** Completes an in-progress execution. */
    completeExecution(executionId) {
        return this.#finalizeExecution(executionId, {
            status: "completed",
            completionReason: undefined,
            updateLastKnownActive: true,
        });
    }

    /** Ends an in-progress execution early with a reason. */
    endExecutionEarly(executionId, reason) {
        return this.#finalizeExecution(executionId, {
            status: "ended-early",
            completionReason: reason,
            updateLastKnownActive: true,
        });
    }

    /** Marks an in-progress execution as interrupted with a reason. */
    interruptExecution(executionId, reason) {
        return this.#finalizeExecution(executionId, {
            status: "interrupted",
            completionReason: reason,
            updateLastKnownActive: false,
        });
    }

    /** Recovers an in-progress execution and records the recovery event. */
    recoverExecution(executionId) {
        const execution = this.#getInProgressExecution(executionId);
        const recoveredAtUnixMs = this.#clock();

        const recoveryEvent = {
            type: "recovery",
            occurredAtUnixMs: recoveredAtUnixMs,
            lastKnownActiveAtUnixMs: execution.lastKnownActiveAtUnixMs,
        };

        const updatedExecution = {
            ...execution,
            lastKnownActiveAtUnixMs: recoveredAtUnixMs,
            events: [...execution.events, recoveryEvent],
        };

        this.#executedProtocolRepository.replace(updatedExecution);

        return updatedExecution;
    }

    /** Returns an execution by ID. */
    getExecution(id) {
        return this.#executedProtocolRepository.getById(id);
    }

    /** Returns executions for a planned protocol version in start-time order. */
    listExecutionsForPlannedVersion(plannedProtocolVersionId) {
        return this.#executedProtocolRepository.listByPlannedProtocolVersionId(
            plannedProtocolVersionId,
        );
    }

    /** Returns an in-progress execution or throws when it cannot be mutated. */
    #getInProgressExecution(executionId) {
        const execution = this.#executedProtocolRepository.getById(executionId);

        if (execution === undefined) {
            throw new Error(`ExecutedProtocol "${executionId}" does not exist.`);
        }

        if (execution.status !== "in-progress") {
            throw new Error(
                `ExecutedProtocol "${executionId}" must be in-progress to be modified.`,
            );
        }

        return execution;
    }

    /** Finalizes an in-progress execution with the supplied terminal state. */
    #finalizeExecution(executionId, { status, completionReason, updateLastKnownActive }) {
        const execution = this.#getInProgressExecution(executionId);
        const endedAtUnixMs = this.#clock();

        const updatedExecution = {
            ...execution,
            status,
            endedAtUnixMs,
            lastKnownActiveAtUnixMs: updateLastKnownActive
                ? endedAtUnixMs
                : execution.lastKnownActiveAtUnixMs,
            completionReason,
        };

        this.#executedProtocolRepository.replace(updatedExecution);

        return updatedExecution;
    }
}
