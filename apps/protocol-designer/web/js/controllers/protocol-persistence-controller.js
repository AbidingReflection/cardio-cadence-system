/** Coordinates Protocol Designer persistence operations using committed protocol state. */

export class ProtocolPersistenceController {
    #protocolModel;
    #editorState;
    #persistenceService;
    #domainVersionSync;

    /** Creates a controller for protocol-model persistence coordination. */
    constructor({ protocolModel, editorState, persistenceService, domainVersionSync }) {
        this.#protocolModel = protocolModel;
        this.#editorState = editorState;
        this.#persistenceService = persistenceService;
        this.#domainVersionSync = domainVersionSync;
    }

    /** Persists the committed protocol as a new protocol family and initial version. */
    async createPersistedProtocol({ displayName, changeSummary }) {
        const protocol = this.#protocolModel.getSnapshot();
        const dependencies = await this.#resolveDependencies();

        const result = this.#persistenceService.createProtocolFamilyWithInitialVersion({
            displayName,
            protocol,
            dependencies,
            changeSummary,
        });

        this.#editorState.setProtocolPersistenceIdentity({
            protocolFamilyId: result.protocolFamily.id,
            plannedProtocolVersionId: result.plannedProtocolVersion.id,
        });

        return result;
    }

    /** Persists the committed protocol as the next version in the current protocol family. */
    async saveNextProtocolVersion({ changeSummary } = {}) {
        const { protocolFamilyId } = this.#editorState.getSnapshot();

        if (protocolFamilyId === undefined) {
            throw new Error(
                "Cannot save a next protocol version without an active protocol family.",
            );
        }

        const protocol = this.#protocolModel.getSnapshot();
        const dependencies = await this.#resolveDependencies();

        const plannedProtocolVersion = this.#persistenceService.createNextPlannedProtocolVersion({
            protocolFamilyId,
            protocol,
            dependencies,
            changeSummary,
        });

        this.#editorState.setProtocolPersistenceIdentity({
            protocolFamilyId,
            plannedProtocolVersionId: plannedProtocolVersion.id,
        });

        return plannedProtocolVersion;
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

    /** Persists the current protocol, creating a family or next version as needed. */
    async saveProtocol({ displayName, changeSummary }) {
        const { protocolFamilyId } = this.#editorState.getSnapshot();

        if (protocolFamilyId === undefined) {
            return this.createPersistedProtocol({
                displayName,
                changeSummary,
            });
        }

        return this.saveNextProtocolVersion({
            changeSummary,
        });
    }
}
