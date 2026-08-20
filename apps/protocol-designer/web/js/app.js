/**
 * Application entry point that coordinates startup and wires together data,
 * models, state, and UI components.
 */

import { loadDomainData } from "./domain-data.js";
import { ProtocolModel } from "./models/protocol-model.js";
import { EditorState } from "./state/editor-state.js";
import {
    renderProtocolTree,
} from "./renderers/protocol-tree-renderer.js";

import {
    requestCollapseBlock,
    startBlockEdit,
} from "./controllers/block-editor-controller.js";

const INITIAL_PROTOCOL_URL = "/data/protocols/true-elliptical-75-minute-session.json";

/**
 * Coordinates application startup by wiring data sources, models, state,
 * and UI components.
 */
async function main() {
    const domainData = await loadDomainData();
    const protocolData =
    await loadProtocolData(
        INITIAL_PROTOCOL_URL
    );

    console.log(
        "Loaded protocol data:",
        protocolData
    );

    const activityType =
    domainData.activityTypes.get(
        protocolData.activityTypeId
    );

    if (activityType === undefined) {
        throw new Error(
            `Protocol ActivityType "${protocolData.activityTypeId}" was not found.`
        );
    }

    const machineProfile =
    protocolData.machineProfileId === undefined
        ? undefined
        : domainData.machineProfiles.get(
            protocolData.machineProfileId
    );

    if (
        protocolData.machineProfileId !== undefined &&
        machineProfile === undefined
    ) {
        throw new Error(
            `Protocol MachineProfile "${protocolData.machineProfileId}" was not found.`
        );
    }

    const protocolModel =
    new ProtocolModel(
        protocolData,
        activityType,
        machineProfile
    );

    const editorState =
    new EditorState();

    const protocolTree = document.querySelector("#protocol-tree");

    if (protocolTree === null) {
        throw new Error(
            'Required element "#protocol-tree" was not found.'
        );
    }

    const render = () => {
        renderProtocolTree(
            protocolTree,
            protocolModel.getSnapshot(),
            editorState.getSnapshot(),
            activityType
        );
    };

    protocolModel.subscribe(render);
    editorState.subscribe(render);

    protocolTree.addEventListener(
        "click",
        event => {
            const expandBlockToggle =
            event.target.closest(
                '[data-action="expand-block"]'
            );

            if (expandBlockToggle !== null) {
                const blockElement =
                expandBlockToggle.closest(
                    "[data-block-id]"
                );

                if (blockElement === null) {
                    throw new Error(
                        "Block toggle is missing its block container."
                    );
                }

                const blockId =
                blockElement.dataset.blockId;

                startBlockEdit(
                    protocolModel,
                    editorState,
                    blockId
                );

                return;
            }

            const collapseBlockToggle =
            event.target.closest(
                '[data-action="collapse-block"]'
            );

            if (collapseBlockToggle !== null) {
                requestCollapseBlock(
                    editorState
                );

                return;
            }

            const phaseToggle =
            event.target.closest(
                '[data-action="toggle-phase"]'
            );

            if (phaseToggle === null) {
                return;
            }

            const phaseElement =
            phaseToggle.closest(
                "[data-phase-id]"
            );

            if (phaseElement === null) {
                throw new Error(
                    "Phase toggle is missing its phase container."
                );
            }

            const phaseId =
            phaseElement.dataset.phaseId;

            editorState.togglePhase(phaseId);
        }
    );

    protocolTree.addEventListener(
        "change",
        (event) => {
            const field =
            event.target.closest(
                "[data-field]"
            );

            if (field === null) {
                return;
            }

            updateBlockDraftField(
                editorState,
                field.dataset.field,
                field.value
            );
        }
    );

    render();
}


/** Loads protocol JSON from the specified URL. */
async function loadProtocolData(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Failed to load protocol "${url}": ` +
            `${response.status} ${response.statusText}.`
        );
    }

    const data = await response.json();

    if (
        data === null ||
        typeof data !== "object" ||
        data.protocol === undefined
    ) {
        throw new Error(
            `Protocol file "${url}" must contain a protocol object.`
        );
    }

    return data.protocol;
}

/** Updates one field in the active block draft. */
function updateBlockDraftField(
    editorState,
    fieldPath,
    value
) {
    const editorSnapshot =
    editorState.getSnapshot();

    const draft =
    editorSnapshot.activeBlockDraft;

    if (draft === undefined) {
        throw new Error(
            "Cannot update a block field without an active draft."
        );
    }

    if (
        fieldPath === "name" ||
        fieldPath === "duration"
    ) {
        editorState.updateBlockDraft({
            [fieldPath]: value,
        });

        return;
    }

    const parts =
    fieldPath.split(".");

    if (
        parts.length !== 3 ||
        parts[0] !== "variables"
    ) {
        throw new Error(
            `Unsupported block draft field: "${fieldPath}".`
        );
    }

    const variableId = parts[1];
    const variableField = parts[2];

    const progression =
    draft.variables?.[variableId];

    if (progression === undefined) {
        throw new Error(
            `Block draft has no variable "${variableId}".`
        );
    }

    editorState.updateBlockDraft({
        variables: {
            ...draft.variables,

            [variableId]: {
                ...progression,
                [variableField]: value,
            },
        },
    });
}


main().catch(error => {
    console.error(
        "Protocol Designer initialization failed.",
        error
    );
});
