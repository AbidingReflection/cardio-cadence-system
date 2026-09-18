/** Coordinates Protocol Designer persistence operations using committed protocol state. */

export class ProtocolPersistenceController {
    #protocolModel;
    #persistenceService;

    /** Creates a controller for protocol-model persistence coordination. */
    constructor({ protocolModel, persistenceService }) {
        this.#protocolModel = protocolModel;
        this.#persistenceService = persistenceService;
    }

    /** Persists the committed protocol as a new protocol family and initial version. */
    createPersistedProtocol({ displayName, dependencies, changeSummary }) {
        const protocol = this.#protocolModel.getSnapshot();

        return this.#persistenceService.createProtocolFamilyWithInitialVersion({
            displayName,
            protocol,
            dependencies,
            changeSummary,
        });
    }

    /** Persists the committed protocol as the next version in a protocol family. */
    saveNextProtocolVersion({ protocolFamilyId, dependencies, changeSummary }) {
        const protocol = this.#protocolModel.getSnapshot();

        return this.#persistenceService.createNextPlannedProtocolVersion({
            protocolFamilyId,
            protocol,
            dependencies,
            changeSummary,
        });
    }
}
