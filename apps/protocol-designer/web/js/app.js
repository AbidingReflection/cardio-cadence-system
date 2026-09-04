/**
 * Application entry point that composes domain data, models, editor state,
 * rendering, focus restoration, and protocol-tree interactions.
 */

import { loadDomainData } from "./domain-data.js";
import { ProtocolModel } from "./models/protocol-model.js";
import { EditorState } from "./state/editor-state.js";
import { loadGraphSvgs } from "./renderers/graph-svg-loader.js";
import { ProtocolGraphRenderer } from "./renderers/protocol-graph-renderer.js";
import { renderProtocolTree } from "./renderers/protocol/protocol-tree-renderer.js";

import {
    restoreProtocolFieldFocus,
    restoreProtocolStructuralFocus,
    restoreProtocolToggleFocus,
    restorePhaseNameFocus,
} from "./interactions/protocol-focus.js";

import { wireProtocolTreeEvents } from "./interactions/protocol-tree-events.js";

import {
    toggleProtocolManageMode,
    wireProtocolManageKeyboardEvents,
} from "./interactions/protocol-manage-keyboard-events.js";

import { wireProtocolSetupEvents } from "./interactions/protocol-setup-events.js";

const INITIAL_PROTOCOL_URL = "/data/protocols/true-elliptical-80-minute-session.json";

/**
 * Initializes application data, state, rendering, subscriptions, and
 * protocol-tree interactions.
 */
async function main() {
    const domainData = await loadDomainData();
    const protocolData = await loadProtocolData(INITIAL_PROTOCOL_URL);
    const activityType = domainData.activityTypes.get(protocolData.activityTypeId);

    if (activityType === undefined) {
        throw new Error(`Protocol ActivityType "${protocolData.activityTypeId}" was not found.`);
    }

    const machineProfile =
        protocolData.machineProfileId === undefined
            ? undefined
            : domainData.machineProfiles.get(protocolData.machineProfileId);

    if (protocolData.machineProfileId !== undefined && machineProfile === undefined) {
        throw new Error(
            `Protocol MachineProfile "${protocolData.machineProfileId}" was not found.`,
        );
    }

    const protocolModel = new ProtocolModel(protocolData, activityType, machineProfile);

    window.protocolModel = protocolModel;
    await loadGraphSvgs();

    const editorState = new EditorState();

    const protocolPane = document.querySelector(".protocol-pane");
    const protocolTree = document.querySelector("#protocol-tree");
    const editPhaseButton = document.querySelector("#manage-phases-button");
    const editBlockButton = document.querySelector("#manage-blocks-button");
    const cadenceGraph = document.querySelector("#cadence-graph");
    const loadGraph = document.querySelector("#load-graph");
    const protocolSetupButton = document.querySelector("#protocol-setup-button");
    const protocolSetupDialog = document.querySelector("#protocol-setup-dialog");
    const protocolSetupCloseButton = document.querySelector("#protocol-setup-close-button");
    const protocolSetupCancelButton = document.querySelector("#protocol-setup-cancel-button");

    if (
        protocolPane === null ||
        protocolTree === null ||
        editPhaseButton === null ||
        editBlockButton === null ||
        cadenceGraph === null ||
        loadGraph === null ||
        protocolSetupButton === null ||
        protocolSetupDialog === null ||
        protocolSetupCloseButton === null ||
        protocolSetupCancelButton === null
    ) {
        throw new Error("Required Protocol Designer elements were not found.");
    }

    const cadenceGraphRenderer = new ProtocolGraphRenderer({
        container: cadenceGraph,
        variableId: "cadence",
        label: "Cadence",
        unit: "RPM",
        valueMin: 30,
        valueMax: 80,
    });

    const loadGraphRenderer = new ProtocolGraphRenderer({
        container: loadGraph,
        variableId: "resistance",
        label: "Resistance",
        unit: "Level",
        valueMin: 0,
        valueMax: 20,
    });

    /** Renders protocol-backed graphs from committed protocol and editor selection state. */
    const renderGraphs = () => {
        const protocol = protocolModel.getSnapshot();
        const editorSnapshot = editorState.getSnapshot();

        const selection = {
            selectedPhaseId: editorSnapshot.selectedPhaseId,
            selectedBlockId: editorSnapshot.selectedBlockId,
        };

        cadenceGraphRenderer.render(protocol, selection);
        loadGraphRenderer.render(protocol, selection);
    };

    let pendingFieldFocus;
    let pendingToggleFocus;
    let pendingPhaseNameFocus;
    let pendingStructuralFocus;

    /** Renders the protocol tree and restores any pending interaction focus. */
    const render = () => {
        const fieldFocusContext = pendingFieldFocus;
        const toggleFocusContext = pendingToggleFocus;
        const phaseNameFocusContext = pendingPhaseNameFocus;
        const structuralFocusContext = pendingStructuralFocus;

        pendingFieldFocus = undefined;
        pendingToggleFocus = undefined;
        pendingPhaseNameFocus = undefined;

        const editorSnapshot = editorState.getSnapshot();

        renderProtocolTree(
            protocolTree,
            protocolModel.getSnapshot(),
            editorSnapshot,
            activityType,
            machineProfile,
        );

        const phaseEditActive = editorSnapshot.editMode === "phase";

        const blockEditActive = editorSnapshot.editMode === "block";

        editPhaseButton.classList.toggle("is-active", phaseEditActive);

        editBlockButton.classList.toggle("is-active", blockEditActive);

        editPhaseButton.setAttribute("aria-pressed", String(phaseEditActive));

        editBlockButton.setAttribute("aria-pressed", String(blockEditActive));

        if (fieldFocusContext !== undefined) {
            restoreProtocolFieldFocus(protocolTree, fieldFocusContext);

            return;
        }

        if (phaseNameFocusContext !== undefined) {
            restorePhaseNameFocus(protocolTree, phaseNameFocusContext);

            return;
        }

        if (toggleFocusContext !== undefined) {
            restoreProtocolToggleFocus(protocolTree, toggleFocusContext);
        }

        if (structuralFocusContext !== undefined) {
            const restored = restoreProtocolStructuralFocus(protocolTree, structuralFocusContext);

            if (restored) {
                pendingStructuralFocus = undefined;

                return;
            }
        }
    };

    protocolModel.subscribe(render);
    protocolModel.subscribe(renderGraphs);
    editorState.subscribe(render);
    editorState.subscribe(renderGraphs);

    wireProtocolTreeEvents({
        protocolTree,
        protocolModel,
        editorState,
        activityType,

        setPendingFieldFocus: (focusContext) => {
            pendingFieldFocus = focusContext;
        },

        setPendingToggleFocus: (focusContext) => {
            pendingToggleFocus = focusContext;
        },

        setPendingPhaseNameFocus: (focusContext) => {
            pendingPhaseNameFocus = focusContext;
        },

        setPendingStructuralFocus: (focusContext) => {
            pendingStructuralFocus = focusContext;
        },
    });

    wireProtocolManageKeyboardEvents({
        protocolPane,
        protocolTree,
        protocolModel,
        editorState,
    });

    wireProtocolSetupEvents({
        setupButton: protocolSetupButton,
        setupDialog: protocolSetupDialog,
        closeButton: protocolSetupCloseButton,
        cancelButton: protocolSetupCancelButton,
    });

    /** Toggles phase structural edit mode. */
    editPhaseButton.addEventListener("click", () => {
        toggleProtocolManageMode(editorState, "phase");
        protocolTree.focus();
    });

    /** Toggles block structural edit mode. */
    editBlockButton.addEventListener("click", () => {
        toggleProtocolManageMode(editorState, "block");
        protocolTree.focus();
    });

    render();
    renderGraphs();
}

/** Loads and returns protocol data from the specified JSON resource. */
async function loadProtocolData(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Failed to load protocol "${url}": ` + `${response.status} ${response.statusText}.`,
        );
    }

    const data = await response.json();

    if (data === null || typeof data !== "object" || data.protocol === undefined) {
        throw new Error(`Protocol file "${url}" must contain a protocol object.`);
    }

    return data.protocol;
}

main().catch((error) => {
    console.error("Protocol Designer initialization failed.", error);
});
