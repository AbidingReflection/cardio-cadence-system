import {
  assertEqual,
  assertThrows,
  test,
} from "/packages/js-testing/framework/test-framework.js";

import { getAppElements } from "../../../app/app-elements.js";

/** Creates a complete Cadence Controller application root for DOM tests. */
function createAppRoot() {
  const root = document.createElement("div");

  root.innerHTML = `
    <h1 id="protocol-title"></h1>

    <div id="playback-state"></div>
    <div id="countdown"></div>
    <div id="elapsed-time"></div>
    <div id="remaining-time"></div>
    <div id="phase-remaining-time"></div>

    <div id="current-phase"></div>
    <div id="current-block"></div>
    <div id="next-phase"></div>
    <div id="next-block"></div>

    <div id="cadence-visualizer"></div>
    <div id="load-visualizer"></div>
    <div id="workout-progress"></div>
    <div id="phase-progress"></div>

    <button id="start-button"></button>
    <button id="pause-button"></button>
    <button id="resume-button"></button>
    <button id="stop-button"></button>
    `;

  return root;
}

test(
  "app-elements",
  "resolves the complete application element contract",
  () => {
    const root = createAppRoot();

    const elements = getAppElements(root);

    assertEqual(elements.protocolTitle, root.querySelector("#protocol-title"));

    assertEqual(elements.playbackState, root.querySelector("#playback-state"));

    assertEqual(elements.countdown, root.querySelector("#countdown"));

    assertEqual(elements.elapsedTime, root.querySelector("#elapsed-time"));

    assertEqual(elements.remainingTime, root.querySelector("#remaining-time"));

    assertEqual(
      elements.phaseRemainingTime,
      root.querySelector("#phase-remaining-time"),
    );

    assertEqual(elements.currentPhase, root.querySelector("#current-phase"));

    assertEqual(elements.currentBlock, root.querySelector("#current-block"));

    assertEqual(elements.nextPhase, root.querySelector("#next-phase"));

    assertEqual(elements.nextBlock, root.querySelector("#next-block"));

    assertEqual(
      elements.cadenceVisualizer,
      root.querySelector("#cadence-visualizer"),
    );

    assertEqual(
      elements.loadVisualizer,
      root.querySelector("#load-visualizer"),
    );

    assertEqual(
      elements.workoutProgress,
      root.querySelector("#workout-progress"),
    );

    assertEqual(elements.startButton, root.querySelector("#start-button"));

    assertEqual(elements.pauseButton, root.querySelector("#pause-button"));

    assertEqual(elements.resumeButton, root.querySelector("#resume-button"));

    assertEqual(elements.stopButton, root.querySelector("#stop-button"));
  },
);

test(
  "app-elements",
  "throws when a required application element is missing",
  () => {
    const root = createAppRoot();

    root.querySelector("#current-block").remove();

    assertThrows(() => getAppElements(root), /#current-block/);
  },
);
