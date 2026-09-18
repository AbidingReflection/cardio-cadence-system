/** Stores executed protocols and enforces references to planned protocol versions. */

import { validateExecutionHistory } from "../records/executed-protocol.js";

/** Repository for executed protocol records. */
export class ExecutedProtocolRepository {
    #executionsById = new Map();
    #plannedProtocolVersionRepository;

    /** Creates a repository backed by the supplied planned protocol version repository. */
    constructor({ plannedProtocolVersionRepository }) {
        this.#plannedProtocolVersionRepository = plannedProtocolVersionRepository;
    }

    /** Adds an executed protocol to the repository. */
    add(executedProtocol) {
        validateExecutionHistory(executedProtocol);

        if (this.#executionsById.has(executedProtocol.id)) {
            throw new Error(`ExecutedProtocol id "${executedProtocol.id}" already exists.`);
        }

        const plannedVersion = this.#plannedProtocolVersionRepository.getById(
            executedProtocol.plannedProtocolVersionId,
        );

        if (plannedVersion === undefined) {
            throw new Error(
                `ExecutedProtocol plannedProtocolVersionId "${executedProtocol.plannedProtocolVersionId}" does not exist.`,
            );
        }

        this.#executionsById.set(executedProtocol.id, executedProtocol);
    }

    /** Returns an executed protocol by ID. */
    getById(id) {
        return this.#executionsById.get(id);
    }

    /** Returns executions for a planned protocol version in start-time order. */
    listByPlannedProtocolVersionId(plannedProtocolVersionId) {
        return [...this.#executionsById.values()]
            .filter((execution) => execution.plannedProtocolVersionId === plannedProtocolVersionId)
            .sort((a, b) => a.startedAtUnixMs - b.startedAtUnixMs);
    }

    /** Returns whether any execution references the planned protocol version. */
    hasPlannedProtocolVersionReference(plannedProtocolVersionId) {
        return [...this.#executionsById.values()].some(
            (execution) => execution.plannedProtocolVersionId === plannedProtocolVersionId,
        );
    }

    /** Replaces an existing executed protocol with a validated updated record. */
    replace(executedProtocol) {
        validateExecutionHistory(executedProtocol);

        if (!this.#executionsById.has(executedProtocol.id)) {
            throw new Error(`ExecutedProtocol id "${executedProtocol.id}" does not exist.`);
        }

        const plannedVersion = this.#plannedProtocolVersionRepository.getById(
            executedProtocol.plannedProtocolVersionId,
        );

        if (plannedVersion === undefined) {
            throw new Error(
                `ExecutedProtocol plannedProtocolVersionId "${executedProtocol.plannedProtocolVersionId}" does not exist.`,
            );
        }

        this.#executionsById.set(executedProtocol.id, executedProtocol);

        return executedProtocol;
    }
}
