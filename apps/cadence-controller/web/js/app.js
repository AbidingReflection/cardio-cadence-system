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

const PROTOCOL_BUNDLE_URL = "/data/true-elliptical-108-minute-session.json";

/** Starts the Cadence Controller application. */
async function startApp() {
    const elements = getAppElements();

    const protocolBundle = await ProtocolBundle.load(PROTOCOL_BUNDLE_URL);

    const playback = createPlayback(protocolBundle);

    const workoutNavigationController = new WorkoutNavigationController({
        cadenceSession: playback.cadenceSession,
        workoutContext: playback.workoutContext,
    });

    const playbackEvents = createPlaybackEvents(
        playback.cadenceSession,
        playback.loadAdjustmentTracker,
    );

    elements.protocolTitle.textContent = protocolBundle.protocol.name;

    wireInteractions(elements, playbackEvents, workoutNavigationController);

    wireRendering(elements, playback, {
        workoutNavigationController,
    });
}

await startApp();

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/cadence-controller/service-worker.js");
}
