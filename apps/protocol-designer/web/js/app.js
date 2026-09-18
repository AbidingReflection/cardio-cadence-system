/**
 * Application entry point that composes domain data, models, editor state,
 * rendering, focus restoration, and protocol-tree interactions.
 */

import { GraphPaneController } from "./controllers/graph-pane-controller.js";
import { ProtocolGraphController } from "./controllers/protocol-graph-controller.js";

import { loadDomainData } from "./domain-data.js";

import {
    restorePhaseNameFocus,
    restoreProtocolFieldFocus,
    restoreProtocolStructuralFocus,
    restoreProtocolToggleFocus,
} from "./interactions/protocol-focus.js";
import {
    toggleProtocolManageMode,
    wireProtocolManageKeyboardEvents,
} from "./interactions/protocol-manage-keyboard-events.js";
import { wireProtocolSetupEvents } from "./interactions/protocol-setup-events.js";
import { wireProtocolTreeEvents } from "./interactions/protocol-tree-events.js";

import { ProtocolModel } from "./models/protocol-model.js";

import { loadGraphSvgs } from "./renderers/graph-svg-loader.js";
import { renderProtocolTree } from "./renderers/protocol/protocol-tree-renderer.js";
import { renderTotalsRibbon } from "./renderers/totals-ribbon-renderer.js";

import { EditorState } from "./state/editor-state.js";

import { calculateProtocolCalories } from "/packages/protocol-expander/protocol-calorie-analysis.js";
import { ProtocolExpander } from "/packages/protocol-expander/protocol-expander.js";

import { ProtocolPersistenceController } from "./controllers/protocol-persistence-controller.js";
import { PersistenceContext } from "/packages/persistence/persistence-context.js";

const INITIAL_PROTOCOL_URL = "/data/protocols/true-elliptical-80-minute-session.json";

/**
 * Initializes application data, state, rendering, subscriptions, and
 * protocol-tree interactions.
 */
async function main() {
    const domainData = await loadDomainData();
    const protocolData = await loadProtocolData(INITIAL_PROTOCOL_URL);

    await loadGraphSvgs();

    const activityType = domainData.activityTypes.get(protocolData.activityTypeId);
    if (activityType === undefined) {
        throw new Error(`Protocol ActivityType "${protocolData.activityTypeId}" was not found.`);
    }

    const machineProfile =
        protocolData.machineProfileId === undefined
            ? undefined
            : domainData.machineProfiles.get(protocolData.machineProfileId);

    const calibrationProfile =
        protocolData.calibrationProfileId === undefined
            ? undefined
            : domainData.calibrationProfiles.get(protocolData.calibrationProfileId);

    if (protocolData.calibrationProfileId !== undefined && calibrationProfile === undefined) {
        throw new Error(
            `Protocol CalibrationProfile "${protocolData.calibrationProfileId}" was not found.`,
        );
    }

    if (protocolData.machineProfileId !== undefined && machineProfile === undefined) {
        throw new Error(
            `Protocol MachineProfile "${protocolData.machineProfileId}" was not found.`,
        );
    }

    const protocolModel = new ProtocolModel(
        protocolData,
        activityType,
        machineProfile,
        calibrationProfile,
    );

    const persistenceContext = new PersistenceContext();

    const protocolPersistenceController = new ProtocolPersistenceController({
        protocolModel,
        persistenceService: persistenceContext.service,
    });

    const editorState = new EditorState();

    window.protocolModel = protocolModel;

    // Protocol tree and management controls
    const protocolPane = requireElement(".protocol-pane");
    const protocolTree = requireElement("#protocol-tree");
    const editPhaseButton = requireElement("#manage-phases-button");
    const editBlockButton = requireElement("#manage-blocks-button");

    const protocolActivityTypeName = requireElement("#protocol-activity-type-name");
    const protocolMachineProfileName = requireElement("#protocol-machine-profile-name");

    // Graph containers
    const cadenceGraph = requireElement("#cadence-graph");
    const loadGraph = requireElement("#load-graph");
    const calorieRateGraph = requireElement("#calorie-rate-graph");
    const cumulativeCaloriesGraph = requireElement("#cumulative-calories-graph");

    // Graph panes
    const cadenceGraphPane = requireElement(".graph-pane--cadence");
    const loadGraphPane = requireElement(".graph-pane--load");
    const calorieRateGraphPane = requireElement(".graph-pane--calorie-rate");
    const cumulativeCaloriesGraphPane = requireElement(".graph-pane--cumulative-calories");

    // Graph pane toggles
    const cadenceGraphToggle = requireElement('[data-graph-toggle="cadence"]');
    const loadGraphToggle = requireElement('[data-graph-toggle="load"]');
    const calorieRateGraphToggle = requireElement('[data-graph-toggle="calorie-rate"]');
    const cumulativeCaloriesGraphToggle = requireElement(
        '[data-graph-toggle="cumulative-calories"]',
    );

    // Protocol setup dialog
    const protocolSetupButton = requireElement("#protocol-setup-button");
    const protocolSetupDialog = requireElement("#protocol-setup-dialog");
    const protocolSetupCloseButton = requireElement("#protocol-setup-close-button");
    const protocolSetupCancelButton = requireElement("#protocol-setup-cancel-button");
    const protocolSetupApplyButton = requireElement("#protocol-setup-apply-button");
    const protocolSetupActivityTypeSelect = requireElement("#protocol-setup-activity-type");
    const protocolSetupMachineProfileSelect = requireElement("#protocol-setup-machine-profile");
    const protocolSetupCalibrationProfileSelect = requireElement(
        "#protocol-setup-calibration-profile",
    );

    const graphPaneController = new GraphPaneController([
        {
            id: "cadence",
            pane: cadenceGraphPane,
            toggleButton: cadenceGraphToggle,
        },
        {
            id: "load",
            pane: loadGraphPane,
            toggleButton: loadGraphToggle,
        },
        {
            id: "calorie-rate",
            pane: calorieRateGraphPane,
            toggleButton: calorieRateGraphToggle,
        },
        {
            id: "cumulative-calories",
            pane: cumulativeCaloriesGraphPane,
            toggleButton: cumulativeCaloriesGraphToggle,
        },
    ]);

    const protocolGraphController = new ProtocolGraphController({
        graphPaneController,
        cadenceContainer: cadenceGraph,
        loadContainer: loadGraph,
        calorieRateContainer: calorieRateGraph,
        cumulativeCaloriesContainer: cumulativeCaloriesGraph,
    });

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

        const protocol = protocolModel.getSnapshot();
        const editorSnapshot = editorState.getSnapshot();

        const {
            activityType: currentActivityType,
            machineProfile: currentMachineProfile,
            calibrationProfile: currentCalibrationProfile,
        } = protocolModel.getSetupContext();

        protocolActivityTypeName.textContent = currentActivityType.name;
        protocolMachineProfileName.textContent = currentMachineProfile?.name ?? "";

        const expander = new ProtocolExpander(protocol);

        const calories =
            currentCalibrationProfile === undefined
                ? null
                : calculateProtocolCalories(protocol, currentCalibrationProfile);

        renderTotalsRibbon({
            durationMs: expander.durationMs,
            calories,
        });

        renderProtocolTree(
            protocolTree,
            protocol,
            editorSnapshot,
            currentActivityType,
            currentMachineProfile,
            currentCalibrationProfile,
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
    editorState.subscribe(updateGraphSelections);

    graphPaneController.subscribe(({ expanded }) => {
        if (expanded) {
            renderGraphs();
        }
    });

    wireProtocolTreeEvents({
        protocolTree,
        protocolModel,
        editorState,

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
        applyButton: protocolSetupApplyButton,
        activityTypeSelect: protocolSetupActivityTypeSelect,
        machineProfileSelect: protocolSetupMachineProfileSelect,
        calibrationProfileSelect: protocolSetupCalibrationProfileSelect,
        domainData,
        protocolModel,
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

/** Returns a required element or throws when it cannot be found. */
function requireElement(selector, root = document) {
    const element = root.querySelector(selector);

    if (element === null) {
        throw new Error(`Required element "${selector}" was not found.`);
    }

    return element;
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
