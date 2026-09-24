/** Stores persistence snapshots durably in IndexedDB. */

const DATABASE_VERSION = 1;
const OBJECT_STORE_NAME = "persistence";
const SNAPSHOT_KEY = "snapshot";

/** Durable IndexedDB-backed store for persistence snapshots. */
export class IndexedDbStore {
    #databaseName;

    /** Creates an IndexedDB store for the specified database name. */
    constructor({ databaseName = "cardio-cadence-system" } = {}) {
        this.#databaseName = databaseName;
    }

    /** Loads the persisted snapshot, or undefined when none exists. */
    async load() {
        const database = await this.#openDatabase();

        try {
            return await new Promise((resolve, reject) => {
                const transaction = database.transaction(OBJECT_STORE_NAME, "readonly");
                const objectStore = transaction.objectStore(OBJECT_STORE_NAME);
                const request = objectStore.get(SNAPSHOT_KEY);

                let snapshot;

                request.onsuccess = () => {
                    snapshot = request.result;
                };

                request.onerror = () => reject(request.error);

                transaction.oncomplete = () => resolve(snapshot);
                transaction.onerror = () => reject(transaction.error);
                transaction.onabort = () => reject(transaction.error);
            });
        } finally {
            database.close();
        }
    }

    /** Saves the complete persistence snapshot. */
    async save(snapshot) {
        const database = await this.#openDatabase();

        try {
            await new Promise((resolve, reject) => {
                const transaction = database.transaction(OBJECT_STORE_NAME, "readwrite");
                const objectStore = transaction.objectStore(OBJECT_STORE_NAME);

                objectStore.put(snapshot, SNAPSHOT_KEY);

                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
                transaction.onabort = () => reject(transaction.error);
            });
        } finally {
            database.close();
        }
    }

    /** Opens the IndexedDB database and creates required storage when needed. */
    #openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.#databaseName, DATABASE_VERSION);

            request.onupgradeneeded = () => {
                const database = request.result;

                if (!database.objectStoreNames.contains(OBJECT_STORE_NAME)) {
                    database.createObjectStore(OBJECT_STORE_NAME);
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}
