/**
 * Application entry point that composes domain data, models, editor state,
 * rendering, focus restoration, and protocol-tree interactions.
 */

import { loadDomainData } from "./domain-data.js";
import { ProtocolModel } from "./models/protocol-model.js";
import { EditorState } from "./state/editor-state.js";
import { renderProtocolTree } from "./renderers/protocol-tree-renderer.js";

import {
    restoreProtocolFieldFocus,
    restoreProtocolToggleFocus,
    restorePhaseNameFocus,
} from "./interactions/protocol-focus.js";

import { wireProtocolTreeEvents } from "./interactions/protocol-tree-events.js";

const INITIAL_PROTOCOL_URL = "/data/protocols/true-elliptical-75-minute-session.json";

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

    const editorState = new EditorState();

    const protocolTree = document.querySelector("#protocol-tree");
    const addPhaseButton = document.querySelector("#add-phase-button");
    const addBlockButton = document.querySelector("#add-block-button");

    if (
        protocolTree === null ||
        addPhaseButton === null ||
        addBlockButton === null
    ) {
        throw new Error(
            "Required protocol editor controls were not found.",
        );
    }

    let pendingFieldFocus;
    let pendingToggleFocus;
    let pendingPhaseNameFocus;

    /** Renders the protocol tree and restores any pending interaction focus. */
    const render = () => {
        const fieldFocusContext = pendingFieldFocus;
        const toggleFocusContext = pendingToggleFocus;
        const phaseNameFocusContext = pendingPhaseNameFocus;

        pendingFieldFocus = undefined;
        pendingToggleFocus = undefined;
        pendingPhaseNameFocus = undefined;

        const editorSnapshot = editorState.getSnapshot();

        renderProtocolTree(
            protocolTree,
            protocolModel.getSnapshot(),
                           editorSnapshot,
                           activityType,
        );

        const phaseInsertionActive =
        editorSnapshot.insertionMode === "phase";

        const blockInsertionActive =
        editorSnapshot.insertionMode === "block";

        addPhaseButton.classList.toggle(
            "is-active",
            phaseInsertionActive,
        );

        addBlockButton.classList.toggle(
            "is-active",
            blockInsertionActive,
        );

        addPhaseButton.setAttribute(
            "aria-pressed",
            String(phaseInsertionActive),
        );

        addBlockButton.setAttribute(
            "aria-pressed",
            String(blockInsertionActive),
        );

        if (fieldFocusContext !== undefined) {
            restoreProtocolFieldFocus(
                protocolTree,
                fieldFocusContext,
            );

            return;
        }

        if (phaseNameFocusContext !== undefined) {
            restorePhaseNameFocus(
                protocolTree,
                phaseNameFocusContext,
            );

            return;
        }

        if (toggleFocusContext !== undefined) {
            restoreProtocolToggleFocus(
                protocolTree,
                toggleFocusContext,
            );
        }
    };

    protocolModel.subscribe(render);
    editorState.subscribe(render);

    wireProtocolTreeEvents({
        protocolTree,
        protocolModel,
        editorState,
        activityType,
        machineProfile,

        setPendingFieldFocus: (focusContext) => {
            pendingFieldFocus = focusContext;
        },

        setPendingToggleFocus: (focusContext) => {
            pendingToggleFocus = focusContext;
        },

        setPendingPhaseNameFocus: (focusContext) => {
            pendingPhaseNameFocus = focusContext;
        },
    });

    /** Toggles phase insertion mode. */
    addPhaseButton.addEventListener("click", () => {
        const { insertionMode } = editorState.getSnapshot();

        if (insertionMode === "phase") {
            editorState.clearInsertionMode();
            return;
        }

        editorState.setInsertionMode("phase");
    });

    /** Toggles block insertion mode. */
    addBlockButton.addEventListener("click", () => {
        const { insertionMode } = editorState.getSnapshot();

        if (insertionMode === "block") {
            editorState.clearInsertionMode();
            return;
        }

        editorState.setInsertionMode("block");
    });

    render();
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
