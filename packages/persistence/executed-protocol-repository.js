import { validateExecutionHistory } from "./executed-protocol.js";

/** Creates an in-memory executed-protocol repository. */
export function createExecutedProtocolRepository({ plannedProtocolVersionRepository }) {
    const executionsById = new Map();

    return {
        add,
        getById,
        listByPlannedProtocolVersionId,
    };

    /** Adds an executed protocol to the repository. */
    function add(executedProtocol) {
        validateExecutionHistory(executedProtocol);

        if (executionsById.has(executedProtocol.id)) {
            throw new Error(`ExecutedProtocol id "${executedProtocol.id}" already exists.`);
        }

        const plannedVersion = plannedProtocolVersionRepository.getById(
            executedProtocol.plannedProtocolVersionId,
        );

        if (plannedVersion === undefined) {
            throw new Error(
                `ExecutedProtocol plannedProtocolVersionId "${executedProtocol.plannedProtocolVersionId}" does not exist.`,
            );
        }

        executionsById.set(executedProtocol.id, executedProtocol);
    }

    /** Returns an executed protocol by ID. */
    function getById(id) {
        return executionsById.get(id);
    }

    /** Returns executions for a planned protocol version in start-time order. */
    function listByPlannedProtocolVersionId(plannedProtocolVersionId) {
        return [...executionsById.values()]
            .filter((execution) => execution.plannedProtocolVersionId === plannedProtocolVersionId)
            .sort((a, b) => a.startedAtUnixMs - b.startedAtUnixMs);
    }
}
