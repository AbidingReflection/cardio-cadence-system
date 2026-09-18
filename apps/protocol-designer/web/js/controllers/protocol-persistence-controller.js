/** Coordinates Protocol Designer persistence operations using committed protocol state. */

export class ProtocolPersistenceController {
    #protocolModel;
    #persistenceService;
    #domainVersionSync;

    /** Creates a controller for protocol-model persistence coordination. */
    constructor({ protocolModel, persistenceService, domainVersionSync }) {
        this.#protocolModel = protocolModel;
        this.#persistenceService = persistenceService;
        this.#domainVersionSync = domainVersionSync;
    }

    /** Persists the committed protocol as a new protocol family and initial version. */
    async createPersistedProtocol({ displayName, changeSummary }) {
        const protocol = this.#protocolModel.getSnapshot();
        const dependencies = await this.#resolveDependencies();

        return this.#persistenceService.createProtocolFamilyWithInitialVersion({
            displayName,
            protocol,
            dependencies,
            changeSummary,
        });
    }

    /** Persists the committed protocol as the next version in a protocol family. */
    async saveNextProtocolVersion({ protocolFamilyId, changeSummary }) {
        const protocol = this.#protocolModel.getSnapshot();
        const dependencies = await this.#resolveDependencies();

        return this.#persistenceService.createNextPlannedProtocolVersion({
            protocolFamilyId,
            protocol,
            dependencies,
            changeSummary,
        });
    }

    /** Resolves persisted version IDs for the protocol's current setup context. */
    async #resolveDependencies() {
        const { activityType, machineProfile, calibrationProfile } =
            this.#protocolModel.getSetupContext();

        return this.#domainVersionSync.resolveDependencies({
            activityType,
            machineProfile,
            calibrationProfile,
        });
    }
}
