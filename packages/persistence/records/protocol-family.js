/** Defines and validates protocol family records. */

import { requireNonEmptyString, requireObject, requireUnixTimestamp } from "./record-validation.js";

/** Creates a validated protocol-family record. */
export function createProtocolFamily({ id, createdAtUnixMs, displayName, archived = false }) {
    const protocolFamily = {
        id,
        createdAtUnixMs,
        displayName,
        archived,
    };

    validateProtocolFamily(protocolFamily);

    return protocolFamily;
}

/** Validates a protocol-family record. */
export function validateProtocolFamily(protocolFamily) {
    requireObject(protocolFamily, "ProtocolFamily");
    requireNonEmptyString(protocolFamily.id, "ProtocolFamily id");
    requireUnixTimestamp(protocolFamily.createdAtUnixMs, "ProtocolFamily createdAtUnixMs");
    requireNonEmptyString(protocolFamily.displayName, "ProtocolFamily displayName");

    if (typeof protocolFamily.archived !== "boolean") {
        throw new TypeError("ProtocolFamily archived must be a boolean.");
    }
}
