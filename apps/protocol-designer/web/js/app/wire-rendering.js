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

    /** Renders protocol-backed summary values from committed protocol state. */
    const renderProtocolSummary = () => {
        const protocol = protocolModel.getSnapshot();

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
    };

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

    /** Updates protocol-tree selection styling without rebuilding the tree. */
    const updateProtocolTreeSelection = (editorSnapshot) => {
        const tree = elements.protocol.tree;

        const selectedPhase = tree.querySelector(".phase-card--selected");
        const selectedBlock = tree.querySelector(".block-card--selected");

        if (selectedPhase !== null) {
            selectedPhase.classList.remove("phase-card--selected");
            selectedPhase.setAttribute("aria-selected", "false");
        }

        if (selectedBlock !== null) {
            selectedBlock.classList.remove("block-card--selected");
            selectedBlock.setAttribute("aria-selected", "false");
        }

        if (editorSnapshot.selectedPhaseId !== undefined) {
            const phaseElement = tree.querySelector(
                `[data-phase-id="${CSS.escape(editorSnapshot.selectedPhaseId)}"]`,
            );

            if (phaseElement !== null) {
                phaseElement.classList.add("phase-card--selected");
                phaseElement.setAttribute("aria-selected", "true");
            }

            return;
        }

        if (editorSnapshot.selectedBlockId !== undefined) {
            const blockElement = tree.querySelector(
                `[data-block-id="${CSS.escape(editorSnapshot.selectedBlockId)}"]`,
            );

            if (blockElement !== null) {
                blockElement.classList.add("block-card--selected");
                blockElement.setAttribute("aria-selected", "true");
            }
        }
    };

    /** Renders the protocol tree and restores any pending interaction focus. */
    const renderProtocolTreeView = () => {
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

    protocolModel.subscribe(renderProtocolSummary);
    protocolModel.subscribe(renderProtocolTreeView);
    protocolModel.subscribe(renderGraphs);

    editorState.subscribe((editorSnapshot, changeType) => {
        if (changeType === "selection") {
            updateProtocolTreeSelection(editorSnapshot);
            return;
        }

        renderProtocolTreeView();
    });

    editorState.subscribe(updateGraphSelections);

    graphPaneController.subscribe(({ expanded }) => {
        if (expanded) {
            renderGraphs();
        }
    });

    const printMedia = window.matchMedia("print");

    printMedia.addEventListener("change", () => {
        protocolGraphController.refreshLayout();
    });

    window.addEventListener("afterprint", () => {
        protocolGraphController.refreshLayout();
    });

    renderProtocolSummary();
    renderProtocolTreeView();
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
