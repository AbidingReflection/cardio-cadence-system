/** Stores protocol families and protects referenced families from deletion. */

import { validateProtocolFamily } from "../records/protocol-family.js";

/** Repository for protocol family records and mutable family metadata. */
export class ProtocolFamilyRepository {
    #familiesById = new Map();
    #isReferenced;

    /** Creates a repository with an optional external reference check. */
    constructor({ isReferenced = () => false } = {}) {
        this.#isReferenced = isReferenced;
    }

    /** Adds a protocol family to the repository. */
    add(protocolFamily) {
        validateProtocolFamily(protocolFamily);

        if (this.#familiesById.has(protocolFamily.id)) {
            throw new Error(`ProtocolFamily id "${protocolFamily.id}" already exists.`);
        }

        this.#familiesById.set(protocolFamily.id, protocolFamily);
    }

    /** Returns a protocol family by ID. */
    getById(id) {
        return this.#familiesById.get(id);
    }

    /** Returns protocol families in deterministic order. */
    list() {
        return [...this.#familiesById.values()].sort((a, b) => {
            const createdAtDifference = a.createdAtUnixMs - b.createdAtUnixMs;

            if (createdAtDifference !== 0) {
                return createdAtDifference;
            }

            return a.id.localeCompare(b.id);
        });
    }

    /** Updates mutable protocol-family metadata. */
    update(id, changes) {
        const existingFamily = this.#familiesById.get(id);

        if (existingFamily === undefined) {
            return undefined;
        }

        this.#validateUpdate(changes);

        const updatedFamily = {
            ...existingFamily,
            ...changes,
        };

        validateProtocolFamily(updatedFamily);

        this.#familiesById.set(id, updatedFamily);

        return updatedFamily;
    }

    /** Deletes an unreferenced protocol family. */
    delete(id) {
        if (!this.#familiesById.has(id)) {
            return false;
        }

        if (this.#isReferenced(id)) {
            throw new Error(`ProtocolFamily "${id}" cannot be deleted because it is referenced.`);
        }

        this.#familiesById.delete(id);

        return true;
    }

    /** Validates a protocol-family metadata update. */
    #validateUpdate(changes) {
        if (changes === null || typeof changes !== "object" || Array.isArray(changes)) {
            throw new TypeError("ProtocolFamily update must be an object.");
        }

        if (Object.hasOwn(changes, "id")) {
            throw new TypeError("ProtocolFamily id cannot be updated.");
        }

        if (Object.hasOwn(changes, "createdAtUnixMs")) {
            throw new TypeError("ProtocolFamily createdAtUnixMs cannot be updated.");
        }

        for (const key of Object.keys(changes)) {
            if (key !== "displayName" && key !== "archived") {
                throw new TypeError(`ProtocolFamily field "${key}" cannot be updated.`);
            }
        }
    }
}
