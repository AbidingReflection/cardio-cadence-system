/** Creates and hydrates Protocol Designer persistence dependencies. */

import { ProtocolOpenController } from "../controllers/protocol-open-controller.js";
import { ProtocolPersistenceController } from "../controllers/protocol-persistence-controller.js";

import { PersistenceContext } from "/packages/persistence/persistence-context.js";
import { DurablePersistence } from "/packages/persistence/storage/durable-persistence.js";
import { IndexedDbStore } from "/packages/persistence/storage/indexed-db-store.js";

/** Creates hydrated persistence services and Protocol Designer persistence controllers. */
export async function createPersistence({ protocolModel, editorState }) {
    const persistenceContext = new PersistenceContext();

    const durablePersistence = new DurablePersistence({
        store: new IndexedDbStore(),
        persistenceContext,
    });

    await durablePersistence.hydrate();

    const protocolPersistenceController = new ProtocolPersistenceController({
        protocolModel,
        editorState,
        persistenceService: persistenceContext.service,
        domainVersionSync: persistenceContext.domainVersionSync,
        durablePersistence,
    });

    const protocolOpenController = new ProtocolOpenController({
        protocolModel,
        editorState,
        persistenceService: persistenceContext.service,
        activityTypeVersionRepository: persistenceContext.activityTypeVersions,
        machineProfileVersionRepository: persistenceContext.machineProfileVersions,
        calibrationProfileVersionRepository: persistenceContext.calibrationProfileVersions,
    });

    return {
        persistenceContext,
        durablePersistence,
        protocolPersistenceController,
        protocolOpenController,
    };
}
