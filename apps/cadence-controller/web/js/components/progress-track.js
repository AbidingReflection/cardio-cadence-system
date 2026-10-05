const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const VIEW_BOX_WIDTH = 100;
const VIEW_BOX_HEIGHT = 30;

const TRACK_START_X = 5;
const TRACK_END_X = 95;
const TRACK_LENGTH = TRACK_END_X - TRACK_START_X;
const TRACK_Y = 15;

const TICK_TOP_Y = 11;
const TICK_BOTTOM_Y = 19;

const MARKER_TOP_Y = 12;
const MARKER_BOTTOM_Y = 18;

/** Renders a reusable linear progression instrument. */
export class ProgressTrack {
    #root;
    #svg;
    #progress;
    #ticks;
    #tickLabels;
    #marker;
    #markerText;

    /** Creates a persistent progress track inside the supplied container. */
    constructor(container) {
        this.#root = document.createElement("div");
        this.#root.className = "progress-track";

        this.#svg = createSvgElement("svg", {
            class: "progress-track__svg",
            viewBox: `0 0 ${VIEW_BOX_WIDTH} ${VIEW_BOX_HEIGHT}`,
            preserveAspectRatio: "none",
        });

        const track = createSvgElement("line", {
            class: "progress-track__track",
            x1: TRACK_START_X,
            y1: TRACK_Y,
            x2: TRACK_END_X,
            y2: TRACK_Y,
        });

        this.#progress = createSvgElement("line", {
            class: "progress-track__progress",
            x1: TRACK_START_X,
            y1: TRACK_Y,
            x2: TRACK_START_X,
            y2: TRACK_Y,
        });

        this.#ticks = createSvgElement("g", {
            class: "progress-track__ticks",
        });

        this.#marker = createSvgElement("g", {
            class: "progress-track__marker",
            transform: `translate(${TRACK_START_X} 0)`,
        });

        const markerLine = createSvgElement("line", {
            class: "progress-track__marker-line",
            x1: 0,
            y1: MARKER_TOP_Y,
            x2: 0,
            y2: MARKER_BOTTOM_Y,
        });

        this.#marker.append(markerLine);

        this.#markerText = document.createElement("span");
        this.#markerText.className = "progress-track__marker-text";
        this.#markerText.style.left = `${TRACK_START_X}%`;

        this.#tickLabels = document.createElement("div");
        this.#tickLabels.className = "progress-track__tick-labels";

        this.#svg.append(track, this.#progress, this.#ticks, this.#marker);

        this.#root.append(this.#svg, this.#markerText, this.#tickLabels);

        container.append(this.#root);
    }

    /** Moves the marker to a normalized horizontal position. */
    setMarkerPosition(position) {
        validateNormalizedPosition(position, "ProgressTrack marker position");

        const x = positionToX(position);

        this.#marker.setAttribute("transform", `translate(${x} 0)`);

        this.#markerText.style.left = `${x}%`;
    }

    /** Sets normalized completion progress from zero through one. */
    setProgress(progress) {
        validateNormalizedPosition(progress, "ProgressTrack progress");

        this.#progress.setAttribute("x2", String(positionToX(progress)));
    }

    /** Updates the text displayed with the current marker. */
    setMarkerText(text) {
        this.#markerText.textContent = String(text);
    }

    /** Replaces the track's structural tick definitions. */
    setTicks(ticks) {
        if (!Array.isArray(ticks)) {
            throw new TypeError("ProgressTrack ticks must be an array.");
        }

        const tickFragment = document.createDocumentFragment();
        const labelFragment = document.createDocumentFragment();

        for (const tick of ticks) {
            validateTick(tick);

            const x = positionToX(tick.position);

            const tickElement = createSvgElement("g", {
                class: "progress-track__tick",
                transform: `translate(${x} 0)`,
            });

            tickElement.dataset.tickId = tick.id;

            const tickLine = createSvgElement("line", {
                class: "progress-track__tick-line",
                x1: 0,
                y1: TICK_TOP_Y,
                x2: 0,
                y2: TICK_BOTTOM_Y,
            });

            tickElement.append(tickLine);
            tickFragment.append(tickElement);

            if (tick.label !== undefined) {
                const label = document.createElement("span");

                label.className = "progress-track__tick-label";
                label.dataset.tickId = tick.id;
                label.textContent = String(tick.label);
                label.style.left = `${x}%`;

                labelFragment.append(label);
            }
        }

        this.#ticks.replaceChildren(tickFragment);
        this.#tickLabels.replaceChildren(labelFragment);
    }

    /** Updates the visual state exposed to component CSS. */
    setState(state) {
        this.#root.dataset.state = String(state);
    }

    /** Removes this component's rendered content from its container. */
    destroy() {
        this.#root.remove();
    }
}

/** Converts a normalized track position into SVG x coordinates. */
function positionToX(position) {
    return TRACK_START_X + position * TRACK_LENGTH;
}

/** Creates one SVG element and applies the supplied attributes. */
function createSvgElement(tagName, attributes = {}) {
    const element = document.createElementNS(SVG_NAMESPACE, tagName);

    for (const [name, value] of Object.entries(attributes)) {
        element.setAttribute(name, String(value));
    }

    return element;
}

/** Validates a normalized linear position in the closed interval [0, 1]. */
function validateNormalizedPosition(position, label) {
    if (
        typeof position !== "number" ||
        !Number.isFinite(position) ||
        position < 0 ||
        position > 1
    ) {
        throw new RangeError(`${label} must be a finite number in [0, 1].`);
    }
}

/** Validates one structural tick definition. */
function validateTick(tick) {
    if (tick === null || typeof tick !== "object" || Array.isArray(tick)) {
        throw new TypeError("ProgressTrack tick must be an object.");
    }

    if (typeof tick.id !== "string" || tick.id.length === 0) {
        throw new TypeError("ProgressTrack tick id must be a non-empty string.");
    }

    validateNormalizedPosition(tick.position, `ProgressTrack tick "${tick.id}" position`);
}
