import { validateExecutionHistory } from "./executed-protocol.js";

export class ExecutedProtocolRepository {
    #executionsById = new Map();
    #plannedProtocolVersionRepository;

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
}
