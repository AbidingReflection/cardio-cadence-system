/**
 * Normalizes protocol data into its canonical committed shape without mutating
 * the source data. Validation is handled separately.
 */

import {
    getProgressionDefinition,
} from "./progression-types.js";


/** Returns a normalized copy of a protocol. */
export function normalizeProtocol(protocol) {
    return {
        ...protocol,
        phases: protocol.phases.map(normalizePhase),
    };
}


/** Returns a normalized copy of a protocol phase. */
function normalizePhase(phase) {
    return {
        ...phase,
        blocks: phase.blocks.map(normalizeBlock),
    };
}


/** Returns a normalized copy of a protocol block. */
function normalizeBlock(block) {
    return {
        ...block,
        variables: normalizeVariables(block.variables),
    };
}


/** Returns a normalized copy of a block variable collection. */
function normalizeVariables(variables) {
    return Object.fromEntries(
        Object.entries(variables).map(
            ([variableId, progression]) => [
                variableId,
                normalizeProgression(progression),
            ]
        )
    );
}


/** Returns a normalized copy of a progression. */
function normalizeProgression(progression) {
    const definition = getProgressionDefinition(progression.type);

    if (definition === undefined) {
        return { ...progression };
    }

    return Object.fromEntries(
        definition.allowedFields
        .filter(field => Object.hasOwn(progression, field))
        .map(field => [
            field,
             progression[field],
        ])
    );
}
