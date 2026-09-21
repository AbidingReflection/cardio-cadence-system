/** Wires Protocol Designer rendering, subscriptions, and focus restoration. */

import {
    restorePhaseNameFocus,
    restoreProtocolFieldFocus,
    restoreProtocolStructuralFocus,
    restoreProtocolToggleFocus,
} from "../interactions/protocol-focus.js";

import { renderProtocolTree } from "../renderers/protocol/protocol-tree-renderer.js";
import { renderTotalsRibbon } from "../renderers/totals-ribbon-renderer.js";

import { calculateProtocolCalories } from "/packages/protocol-expander/protocol-calorie-analysis.js";
import { ProtocolExpander } from "/packages/protocol-expander/protocol-expander.js";

/** Wires rendering and returns focus-context setters for interaction handlers. */
export function wireRendering({
    elements,
    protocolModel,
    editorState,
    graphPaneController,
    protocolGraphController,
}) {
    let pendingFieldFocus;
    let pendingToggleFocus;
    let pendingPhaseNameFocus;
    let pendingStructuralFocus;

    /** Renders protocol-backed graphs from current application state. */
    const renderGraphs = () => {
        const protocol = protocolModel.getSnapshot();
        const editorSnapshot = editorState.getSnapshot();
        const setupContext = protocolModel.getSetupContext();

        protocolGraphController.render(
            protocol,
            {
                selectedPhaseId: editorSnapshot.selectedPhaseId,
                selectedBlockId: editorSnapshot.selectedBlockId,
            },
            setupContext,
        );
    };

    /** Updates graph selection styling without recomputing graph data. */
    const updateGraphSelections = () => {
        const editorSnapshot = editorState.getSnapshot();

        protocolGraphController.updateSelection({
            selectedPhaseId: editorSnapshot.selectedPhaseId,
            selectedBlockId: editorSnapshot.selectedBlockId,
        });
    };

    /** Renders the protocol tree and restores any pending interaction focus. */
    const render = () => {
        const fieldFocusContext = pendingFieldFocus;
        const toggleFocusContext = pendingToggleFocus;
        const phaseNameFocusContext = pendingPhaseNameFocus;
        const structuralFocusContext = pendingStructuralFocus;

        pendingFieldFocus = undefined;
        pendingToggleFocus = undefined;
        pendingPhaseNameFocus = undefined;

        const protocol = protocolModel.getSnapshot();
        const editorSnapshot = editorState.getSnapshot();

        const { activityType, machineProfile, calibrationProfile } =
            protocolModel.getSetupContext();

        elements.protocol.activityTypeName.textContent = activityType.name;
        elements.protocol.machineProfileName.textContent = machineProfile?.name ?? "";

        const expander = new ProtocolExpander(protocol);

        const calories =
            calibrationProfile === undefined
                ? null
                : calculateProtocolCalories(protocol, calibrationProfile);

        renderTotalsRibbon({
            durationMs: expander.durationMs,
            calories,
        });

        renderProtocolTree(
            elements.protocol.tree,
            protocol,
            editorSnapshot,
            activityType,
            machineProfile,
            calibrationProfile,
        );

        const phaseEditActive = editorSnapshot.editMode === "phase";
        const blockEditActive = editorSnapshot.editMode === "block";

        elements.protocol.editPhaseButton.classList.toggle("is-active", phaseEditActive);
        elements.protocol.editBlockButton.classList.toggle("is-active", blockEditActive);

        elements.protocol.editPhaseButton.setAttribute("aria-pressed", String(phaseEditActive));
        elements.protocol.editBlockButton.setAttribute("aria-pressed", String(blockEditActive));

        if (fieldFocusContext !== undefined) {
            restoreProtocolFieldFocus(elements.protocol.tree, fieldFocusContext);

            return;
        }

        if (phaseNameFocusContext !== undefined) {
            restorePhaseNameFocus(elements.protocol.tree, phaseNameFocusContext);

            return;
        }

        if (toggleFocusContext !== undefined) {
            restoreProtocolToggleFocus(elements.protocol.tree, toggleFocusContext);
        }

        if (structuralFocusContext !== undefined) {
            const restored = restoreProtocolStructuralFocus(
                elements.protocol.tree,
                structuralFocusContext,
            );

            if (restored) {
                pendingStructuralFocus = undefined;

                return;
            }
        }
    };

    protocolModel.subscribe(render);
    protocolModel.subscribe(renderGraphs);

    editorState.subscribe(render);
    editorState.subscribe(updateGraphSelections);

    graphPaneController.subscribe(({ expanded }) => {
        if (expanded) {
            renderGraphs();
        }
    });

    render();
    renderGraphs();

    return {
        setPendingFieldFocus(focusContext) {
            pendingFieldFocus = focusContext;
        },

        setPendingToggleFocus(focusContext) {
            pendingToggleFocus = focusContext;
        },

        setPendingPhaseNameFocus(focusContext) {
            pendingPhaseNameFocus = focusContext;
        },

        setPendingStructuralFocus(focusContext) {
            pendingStructuralFocus = focusContext;
        },
    };
}
