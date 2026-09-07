/**
 * Renders the top-level protocol tree and delegates phase construction to the
 * phase renderer.
 */

import { createPhaseElement, createPhaseInsertionTarget } from "./phase-renderer.js";
import { buildProtocolStatusContext } from "./protocol-status-context.js";

/** Renders the complete protocol tree. */
export function renderProtocolTree(
    container,
    protocolSnapshot,
    editorSnapshot,
    activityType,
    machineProfile,
    calibrationProfile,
) {
    container.replaceChildren();

    const statusContext = buildProtocolStatusContext(
        protocolSnapshot,
        machineProfile,
        calibrationProfile,
    );

    for (let phaseIndex = 0; phaseIndex <= protocolSnapshot.phases.length; phaseIndex += 1) {
        if (editorSnapshot.editMode === "phase") {
            container.append(createPhaseInsertionTarget(phaseIndex));
        }

        if (phaseIndex < protocolSnapshot.phases.length) {
            const phase = protocolSnapshot.phases[phaseIndex];

            container.append(
                createPhaseElement(
                    phase,
                    phaseIndex,
                    editorSnapshot,
                    activityType,
                    machineProfile,
                    calibrationProfile,
                    statusContext,
                ),
            );
        }
    }
}
