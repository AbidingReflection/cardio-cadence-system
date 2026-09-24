/** Coordinates Protocol Designer persistence operations using committed protocol state. */

export class ProtocolPersistenceController {
    #protocolModel;
    #editorState;
    #protocolSessionState;
    #persistenceService;
    #domainVersionSync;
    #durablePersistence;

    /** Creates a controller for protocol-model persistence coordination. */
    constructor({
        protocolModel,
        editorState,
        protocolSessionState,
        persistenceService,
        domainVersionSync,
        durablePersistence,
    }) {
        this.#protocolModel = protocolModel;
        this.#editorState = editorState;
        this.#protocolSessionState = protocolSessionState;
        this.#persistenceService = persistenceService;
        this.#domainVersionSync = domainVersionSync;
        this.#durablePersistence = durablePersistence;
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

        await this.#durablePersistence.commit();

        this.#editorState.setProtocolPersistenceIdentity({
            protocolFamilyId: result.protocolFamily.id,
            plannedProtocolVersionId: result.plannedProtocolVersion.id,
        });

        this.#protocolSessionState.setBaseline(protocol);

        return result;
    }

    /** Persists the committed protocol as the next version when committed content has changed. */
    async saveNextProtocolVersion({ changeSummary } = {}) {
        const { protocolFamilyId } = this.#editorState.getSnapshot();

        if (protocolFamilyId === undefined) {
            throw new Error(
                "Cannot save a next protocol version without an active protocol family.",
            );
        }

        const protocol = this.#protocolModel.getSnapshot();

        if (!this.#protocolSessionState.isProtocolDirty(protocol)) {
            return undefined;
        }

        const dependencies = await this.#resolveDependencies();

        const plannedProtocolVersion = this.#persistenceService.createNextPlannedProtocolVersion({
            protocolFamilyId,
            protocol,
            dependencies,
            changeSummary,
        });

        await this.#durablePersistence.commit();

        this.#editorState.setProtocolPersistenceIdentity({
            protocolFamilyId,
            plannedProtocolVersionId: plannedProtocolVersion.id,
        });

        this.#protocolSessionState.setBaseline(protocol);

        return plannedProtocolVersion;
    }

    /** Renames the current persisted protocol without creating a new version. */
    async renameProtocol({ displayName }) {
        const { protocolFamilyId } = this.#editorState.getSnapshot();

        if (protocolFamilyId === undefined) {
            throw new Error("Cannot rename a protocol without an active protocol family.");
        }

        const protocolFamily = this.#persistenceService.renameProtocolFamily(
            protocolFamilyId,
            displayName,
        );

        await this.#durablePersistence.commit();

        return protocolFamily;
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
