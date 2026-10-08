import { formatDurationCompactMs } from "/packages/utils/format-duration.js";

import { ProgressionCircle } from "../components/progression-circle.js";
import { LoadGuidanceController } from "../controllers/load-guidance-controller.js";

/** Initializes the persistent load-guidance visualizer scene. */
export function initializeLoadVisualizer(container, label) {
    const statusContainer = document.createElement("div");
    statusContainer.className = "load-visualizer__status";

    const remainingContainer = document.createElement("div");
    remainingContainer.className = "load-visualizer__remaining";

    const remainingLabelElement = document.createElement("span");
    remainingLabelElement.className = "load-visualizer__remaining-label";
    remainingLabelElement.textContent = "CHANGE IN";

    const remainingValueElement = document.createElement("span");
    remainingValueElement.className = "load-visualizer__remaining-value";

    remainingContainer.append(remainingLabelElement, remainingValueElement);

    const nextContainer = document.createElement("div");
    nextContainer.className = "load-visualizer__next";

    const nextLabelElement = document.createElement("span");
    nextLabelElement.className = "load-visualizer__next-label";
    nextLabelElement.textContent = "NEXT VALUE";

    const nextValueElement = document.createElement("span");
    nextValueElement.className = "load-visualizer__next-value";

    nextContainer.append(nextLabelElement, nextValueElement);

    statusContainer.append(remainingContainer, nextContainer);

    const circleContainer = document.createElement("div");
    circleContainer.className = "load-visualizer__circle";

    container.replaceChildren(statusContainer, circleContainer);

    const progressionCircle = new ProgressionCircle(circleContainer);

    progressionCircle.setLabelText(label);

    progressionCircle.setTargets([
        {
            id: "segment-end",
            position: 0,
        },
    ]);

    const controller = new LoadGuidanceController(progressionCircle);

    return {
        container,
        controller,
        progressionCircle,
        statusContainer,
        remainingValueElement,
        nextValueElement,
    };
}

/** Renders resolved load-segment guidance into the persistent visualizer. */
export function renderLoadVisualizer(
    visualizer,
    { value, progress, remainingTimeMs, nextValue, adjustmentPending = false },
) {
    visualizer.controller.render({
        progress,
        valueText: String(value),
    });

    if (nextValue === null) {
        setTextContent(visualizer.remainingValueElement, "—");
        setTextContent(visualizer.nextValueElement, "N/A");
    } else {
        setTextContent(visualizer.remainingValueElement, formatDurationCompactMs(remainingTimeMs));

        setTextContent(visualizer.nextValueElement, String(nextValue));
    }

    setDataValue(visualizer.container, "adjustmentPending", String(adjustmentPending));
}

/** Updates text content only when its rendered value has changed. */
function setTextContent(element, value) {
    const text = String(value);

    if (element.textContent !== text) {
        element.textContent = text;
    }
}

/** Updates one dataset value only when its rendered value has changed. */
function setDataValue(element, key, value) {
    if (element.dataset[key] !== value) {
        element.dataset[key] = value;
    }
}
