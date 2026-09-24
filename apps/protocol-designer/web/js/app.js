/**
 * Application entry point that composes Protocol Designer data, state,
 * persistence, controllers, rendering, and interactions.
 */

import { createControllers } from "./app/create-controllers.js";
import { getAppElements } from "./app/app-elements.js";
import { createPersistence } from "./app/create-persistence.js";
import { wireInteractions } from "./app/wire-interactions.js";
import { wireRendering } from "./app/wire-rendering.js";

import { loadDomainData } from "./domain-data.js";

import { ProtocolModel } from "./models/protocol-model.js";

import { loadGraphSvgs } from "./renderers/graph-svg-loader.js";

import { EditorState } from "./state/editor-state.js";
import { ProtocolSessionState } from "./state/protocol-session-state.js";
import { ProtocolUnsavedChanges } from "./state/protocol-unsaved-changes.js";

const DEFAULT_ACTIVITY_TYPE_ID = "elliptical";
const DEFAULT_MACHINE_PROFILE_ID = "true-elliptical-aquatic-center";
// const DEFAULT_CALIBRATION_PROFILE_ID = "...";

/** Initializes the Protocol Designer application. */
async function main() {
    const domainData = await loadDomainData();

    await loadGraphSvgs();

    const { activityType, machineProfile, calibrationProfile } = getDefaultSetupContext(domainData);

    const protocolData = createEmptyProtocolData({
        activityType,
        machineProfile,
    });

    if (machineProfile !== undefined) {
        protocolData.machineProfileId = machineProfile.id;
    }

    if (calibrationProfile !== undefined) {
        protocolData.calibrationProfileId = calibrationProfile.id;
    }

    const protocolModel = new ProtocolModel(
        protocolData,
        activityType,
        machineProfile,
        calibrationProfile,
    );

    const editorState = new EditorState();

    const protocolSessionState = new ProtocolSessionState();
    protocolSessionState.setBaseline(protocolModel.getSnapshot());

    const protocolUnsavedChanges = new ProtocolUnsavedChanges({
        protocolModel,
        editorState,
        protocolSessionState,
    });

    const elements = getAppElements();

    const { persistenceContext, protocolPersistenceController, protocolOpenController } =
        await createPersistence({
            protocolModel,
            editorState,
            protocolSessionState,
        });

    const { graphPaneController, protocolGraphController, protocolNewController } =
        createControllers({
            elements,
            protocolModel,
            editorState,
            protocolSessionState,
        });

    const rendering = wireRendering({
        elements,
        protocolModel,
        editorState,
        graphPaneController,
        protocolGraphController,
    });

    wireInteractions({
        elements,
        protocolModel,
        editorState,
        domainData,
        persistenceContext,
        protocolPersistenceController,
        protocolOpenController,
        protocolNewController,
        protocolUnsavedChanges,
        setPendingFieldFocus: rendering.setPendingFieldFocus,
        setPendingToggleFocus: rendering.setPendingToggleFocus,
        setPendingPhaseNameFocus: rendering.setPendingPhaseNameFocus,
        setPendingStructuralFocus: rendering.setPendingStructuralFocus,
    });
}

main().catch((error) => {
    console.error("Protocol Designer initialization failed.", error);
});

/** Resolves the temporary default setup used for a fresh startup session. */
function getDefaultSetupContext(domainData) {
    const activityType = domainData.activityTypes.get(DEFAULT_ACTIVITY_TYPE_ID);

    if (activityType === undefined) {
        throw new Error(`Default ActivityType "${DEFAULT_ACTIVITY_TYPE_ID}" was not found.`);
    }

    const machineProfile =
        DEFAULT_MACHINE_PROFILE_ID === undefined
            ? undefined
            : domainData.machineProfiles.get(DEFAULT_MACHINE_PROFILE_ID);

    if (DEFAULT_MACHINE_PROFILE_ID !== undefined && machineProfile === undefined) {
        throw new Error(`Default MachineProfile "${DEFAULT_MACHINE_PROFILE_ID}" was not found.`);
    }

    return {
        activityType,
        machineProfile,
        calibrationProfile: undefined,
    };
}

/** Creates an empty protocol for the supplied setup context. */
function createEmptyProtocolData({ activityType, machineProfile }) {
    const protocol = {
        activityTypeId: activityType.id,
        phases: [],
    };

    if (machineProfile !== undefined) {
        protocol.machineProfileId = machineProfile.id;
    }

    return protocol;
}
