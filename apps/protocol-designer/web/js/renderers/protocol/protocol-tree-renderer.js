/**
 * Renders the top-level protocol tree and delegates phase construction to the
 * phase renderer.
 */

import { createPhaseElement, createPhaseInsertionTarget } from "./phase-renderer.js";

/** Renders the complete protocol tree. */
export function renderProtocolTree(container, protocolSnapshot, editorSnapshot, activityType) {
    container.replaceChildren();

    for (let phaseIndex = 0; phaseIndex <= protocolSnapshot.phases.length; phaseIndex += 1) {
        if (editorSnapshot.editMode === "phase") {
            container.append(createPhaseInsertionTarget(phaseIndex));
        }

        if (phaseIndex < protocolSnapshot.phases.length) {
            const phase = protocolSnapshot.phases[phaseIndex];

            container.append(createPhaseElement(phase, phaseIndex, editorSnapshot, activityType));
        }
    }
}
