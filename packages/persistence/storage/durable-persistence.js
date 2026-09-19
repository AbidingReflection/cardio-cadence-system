/** Coordinates durable persistence snapshots with the in-memory persistence context. */

import { createPersistenceSnapshot, hydratePersistenceSnapshot } from "./persistence-snapshot.js";

/** Coordinates durable storage for one persistence context. */
export class DurablePersistence {
    #store;
    #persistenceContext;

    /** Creates a durable persistence coordinator. */
    constructor({ store, persistenceContext }) {
        this.#store = store;
        this.#persistenceContext = persistenceContext;
    }

    /** Hydrates the persistence context from durable storage when a snapshot exists. */
    async hydrate() {
        const snapshot = await this.#store.load();

        if (snapshot === undefined) {
            return;
        }

        hydratePersistenceSnapshot(snapshot, {
            protocolFamilyRepository: this.#persistenceContext.protocolFamilies,
            plannedProtocolVersionRepository: this.#persistenceContext.plannedProtocolVersions,
            executedProtocolRepository: this.#persistenceContext.executedProtocols,
            activityTypeVersionRepository: this.#persistenceContext.activityTypeVersions,
            machineProfileVersionRepository: this.#persistenceContext.machineProfileVersions,
            calibrationProfileVersionRepository:
                this.#persistenceContext.calibrationProfileVersions,
        });
    }

    /** Commits the current persistence context state to durable storage. */
    async commit() {
        const snapshot = createPersistenceSnapshot({
            protocolFamilyRepository: this.#persistenceContext.protocolFamilies,
            plannedProtocolVersionRepository: this.#persistenceContext.plannedProtocolVersions,
            executedProtocolRepository: this.#persistenceContext.executedProtocols,
            activityTypeVersionRepository: this.#persistenceContext.activityTypeVersions,
            machineProfileVersionRepository: this.#persistenceContext.machineProfileVersions,
            calibrationProfileVersionRepository:
                this.#persistenceContext.calibrationProfileVersions,
        });

        await this.#store.save(snapshot);
    }
}
