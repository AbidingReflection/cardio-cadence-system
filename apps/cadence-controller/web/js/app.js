/**
 * Cadence Controller application responsibilities:
 * - Load the canonical protocol bundle.
 * - Compose playback runtime dependencies.
 * - Wire application interactions and rendering.
 */

import { getAppElements } from "./app/app-elements.js";
import { createPlayback } from "./app/create-playback.js";
import { wireInteractions } from "./app/wire-interactions.js";
import { wireRendering } from "./app/wire-rendering.js";

import { createPlaybackEvents } from "./interactions/playback-events.js";
import { ProtocolBundle } from "./loading/protocol-bundle.js";
import { WorkoutNavigationController } from "./controllers/workout-navigation-controller.js";
import { ExecutionRecorder } from "./execution/execution-recorder.js";
import { ExecutionExporter } from "./execution/execution-exporter.js";

const PROTOCOL_BUNDLE_URL = "/data/true-elliptical-108-minute-session.json";

/** Starts the Cadence Controller application. */
async function startApp() {
    const elements = getAppElements();

    const protocolBundle = await ProtocolBundle.load(PROTOCOL_BUNDLE_URL);

    const playback = createPlayback(protocolBundle);
    const executionRecorder = new ExecutionRecorder();

    const executionExporter = new ExecutionExporter({
        protocolBundle,
        executionRecorder,
    });

    const workoutNavigationController = new WorkoutNavigationController({
        cadenceSession: playback.cadenceSession,
        workoutContext: playback.workoutContext,
        executionRecorder,
    });

    const playbackEvents = createPlaybackEvents(
        playback.cadenceSession,
        playback.loadAdjustmentTracker,
        executionRecorder,
    );

    elements.protocolTitle.textContent = protocolBundle.protocol.name;

    wireInteractions(elements, playbackEvents, workoutNavigationController, executionExporter);

    wireRendering(elements, playback, {
        workoutNavigationController,
        executionRecorder,
    });
}

await startApp();

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/cadence-controller/service-worker.js");
}
