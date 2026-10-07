/**
 * Application entry point that composes Protocol Designer data, state,
 * persistence, controllers, rendering, and interactions.
 */

import { createControllers } from "./app/create-controllers.js";
import { getAppElements } from "./app/app-elements.js";
import { createPersistence } from "./app/create-persistence.js";
import { resolveStartupSetup } from "./app/resolve-startup-setup.js";
import { wireInteractions } from "./app/wire-interactions.js";
import { wireRendering } from "./app/wire-rendering.js";

import { loadDomainData } from "./domain-data.js";

import { ProtocolModel } from "./models/protocol-model.js";

import { loadGraphSvgs } from "./renderers/graph-svg-loader.js";

import { EditorState } from "./state/editor-state.js";
import { ProtocolDesignerPreferences } from "./state/protocol-designer-preferences.js";
import { ProtocolSessionState } from "./state/protocol-session-state.js";
import { ProtocolUnsavedChanges } from "./state/protocol-unsaved-changes.js";

const DEFAULT_ACTIVITY_TYPE_ID = "elliptical";
const DEFAULT_MACHINE_PROFILE_ID = "true-elliptical-aquatic-center";

/** Initializes the Protocol Designer application. */
async function main() {
    const domainData = await loadDomainData();

    await loadGraphSvgs();

    const preferences = new ProtocolDesignerPreferences();

    const setupContext = resolveStartupSetup({
        domainData,
        preferences,
        defaultActivityTypeId: DEFAULT_ACTIVITY_TYPE_ID,
        defaultMachineProfileId: DEFAULT_MACHINE_PROFILE_ID,
    });

    preferences.setLastSetupContext(setupContext);

    const { activityType, machineProfile, calibrationProfile } = setupContext;

    const protocolData = createEmptyProtocolData({
        activityType,
        machineProfile,
        calibrationProfile,
    });

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
            preferences,
        });

    const lastProtocolFamilyId = preferences.getLastProtocolFamilyId();

    if (lastProtocolFamilyId !== undefined) {
        try {
            protocolOpenController.openProtocolFamily(lastProtocolFamilyId);
        } catch {
            preferences.clearLastProtocolFamilyId();
        }
    }

    const {
        graphPaneController,
        protocolGraphController,
        protocolNewController,
        protocolImportController,
    } = createControllers({
        elements,
        protocolModel,
        editorState,
        protocolSessionState,
        preferences,
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
        preferences,
        persistenceContext,
        protocolPersistenceController,
        protocolOpenController,
        protocolNewController,
        protocolImportController,
        protocolUnsavedChanges,
        setPendingFieldFocus: rendering.setPendingFieldFocus,
        setPendingToggleFocus: rendering.setPendingToggleFocus,
        setPendingPhaseNameFocus: rendering.setPendingPhaseNameFocus,
        setPendingStructuralFocus: rendering.setPendingStructuralFocus,
    });
}

/** Creates an empty protocol for the supplied setup context. */
function createEmptyProtocolData({ activityType, machineProfile, calibrationProfile }) {
    const protocol = {
        activityTypeId: activityType.id,
        phases: [],
    };

    if (machineProfile !== undefined) {
        protocol.machineProfileId = machineProfile.id;
    }

    if (calibrationProfile !== undefined) {
        protocol.calibrationProfileId = calibrationProfile.id;
    }

    return protocol;
}

main().catch((error) => {
    console.error("Protocol Designer initialization failed.", error);
});
