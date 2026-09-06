/**
 * Composes delegated protocol-tree interaction modules.
 */

import { wireProtocolBlockEvents } from "./protocol-block-events.js";
import { wireProtocolPhaseEvents } from "./protocol-phase-events.js";
import { wireProtocolStructureEvents } from "./structure/events.js";
import { wireProtocolSelectionEvents } from "./protocol-selection-events.js";

/** Registers all delegated protocol-tree interactions. */
export function wireProtocolTreeEvents({
    protocolTree,
    protocolModel,
    editorState,
    setPendingFieldFocus,
    setPendingToggleFocus,
    setPendingPhaseNameFocus,
    setPendingStructuralFocus,
}) {
    wireProtocolSelectionEvents({
        protocolTree,
        editorState,
    });

    wireProtocolBlockEvents({
        protocolTree,
        protocolModel,
        editorState,
        setPendingFieldFocus,
        setPendingToggleFocus,
    });

    wireProtocolPhaseEvents({
        protocolTree,
        protocolModel,
        editorState,
        setPendingToggleFocus,
        setPendingPhaseNameFocus,
    });

    wireProtocolStructureEvents({
        protocolTree,
        protocolModel,
        editorState,
        setPendingFieldFocus,
        setPendingPhaseNameFocus,
        setPendingStructuralFocus,
    });
}
