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

const INITIAL_PROTOCOL_URL = "/data/protocols/true-elliptical-80-minute-session.json";

/** Initializes the Protocol Designer application. */
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

    if (protocolData.machineProfileId !== undefined && machineProfile === undefined) {
        throw new Error(
            `Protocol MachineProfile "${protocolData.machineProfileId}" was not found.`,
        );
    }

    const calibrationProfile =
        protocolData.calibrationProfileId === undefined
            ? undefined
            : domainData.calibrationProfiles.get(protocolData.calibrationProfileId);

    if (protocolData.calibrationProfileId !== undefined && calibrationProfile === undefined) {
        throw new Error(
            `Protocol CalibrationProfile "${protocolData.calibrationProfileId}" was not found.`,
        );
    }

    const protocolModel = new ProtocolModel(
        protocolData,
        activityType,
        machineProfile,
        calibrationProfile,
    );

    const editorState = new EditorState();
    const elements = getAppElements();

    const { persistenceContext, protocolPersistenceController, protocolOpenController } =
        await createPersistence({
            protocolModel,
            editorState,
        });

    const { graphPaneController, protocolGraphController } = createControllers({
        elements,
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
        setPendingFieldFocus: rendering.setPendingFieldFocus,
        setPendingToggleFocus: rendering.setPendingToggleFocus,
        setPendingPhaseNameFocus: rendering.setPendingPhaseNameFocus,
        setPendingStructuralFocus: rendering.setPendingStructuralFocus,
    });
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
