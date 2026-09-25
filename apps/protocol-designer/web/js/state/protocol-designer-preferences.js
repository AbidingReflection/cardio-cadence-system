/**
 * Stores lightweight Protocol Designer preferences across browser sessions.
 */

const LAST_SETUP_KEY = "cardio-cadence-system:protocol-designer:last-setup";
const LAST_PROTOCOL_FAMILY_ID_KEY =
    "cardio-cadence-system:protocol-designer:last-protocol-family-id";

export class ProtocolDesignerPreferences {
    #storage;

    /** Creates Protocol Designer preferences using the supplied browser storage. */
    constructor({ storage = window.localStorage } = {}) {
        this.#storage = storage;
    }

    /** Returns the last-used setup IDs, or undefined when none are available. */
    getLastSetup() {
        const storedValue = this.#storage.getItem(LAST_SETUP_KEY);

        if (storedValue === null) {
            return undefined;
        }

        try {
            return JSON.parse(storedValue);
        } catch {
            return undefined;
        }
    }

    /** Stores the last-used setup IDs. */
    setLastSetup(setup) {
        this.#storage.setItem(LAST_SETUP_KEY, JSON.stringify(setup));
    }

    /** Stores the supplied setup context as the last-used setup IDs. */
    setLastSetupContext({ activityType, machineProfile, calibrationProfile }) {
        this.setLastSetup({
            activityTypeId: activityType.id,
            ...(machineProfile === undefined ? {} : { machineProfileId: machineProfile.id }),
            ...(calibrationProfile === undefined
                ? {}
                : { calibrationProfileId: calibrationProfile.id }),
        });
    }

    /** Clears the stored last-used setup. */
    clearLastSetup() {
        this.#storage.removeItem(LAST_SETUP_KEY);
    }

    /** Returns the last active protocol family ID, or undefined when none is stored. */
    getLastProtocolFamilyId() {
        return this.#storage.getItem(LAST_PROTOCOL_FAMILY_ID_KEY) ?? undefined;
    }

    /** Stores the last active protocol family ID. */
    setLastProtocolFamilyId(protocolFamilyId) {
        this.#storage.setItem(LAST_PROTOCOL_FAMILY_ID_KEY, protocolFamilyId);
    }

    /** Clears the stored last active protocol family ID. */
    clearLastProtocolFamilyId() {
        this.#storage.removeItem(LAST_PROTOCOL_FAMILY_ID_KEY);
    }
}
