const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const VIEW_BOX_SIZE = 100;
const CENTER = VIEW_BOX_SIZE / 2;

const TRACK_RADIUS = 43;

// Must match .progression-circle__track stroke-width.
const TRACK_STROKE_WIDTH = 5;
const BACKGROUND_RADIUS = TRACK_RADIUS - TRACK_STROKE_WIDTH / 2;

const MARKER_RADIUS = TRACK_STROKE_WIDTH / 2;

const NOTCH_INNER_RADIUS = 39;
const NOTCH_OUTER_RADIUS = 47;

/** Renders a reusable circular progression instrument. */
export class ProgressionCircle {
    #container;
    #svg;
    #progress;
    #notches;
    #targets;
    #marker;
    #valueText;
    #labelText;

    #markerPosition;
    #progressValue;
    #valueTextValue;
    #labelTextValue;
    #stateValue;

    /** Creates a persistent SVG progression circle inside the supplied container. */
    constructor(container) {
        this.#container = container;

        this.#svg = createSvgElement("svg", {
            class: "progression-circle",
            viewBox: "0 0 100 100",
            preserveAspectRatio: "xMidYMid meet",
        });

        const background = createSvgElement("circle", {
            class: "progression-circle__background",
            cx: CENTER,
            cy: CENTER,
            r: BACKGROUND_RADIUS,
        });

        const track = createSvgElement("circle", {
            class: "progression-circle__track",
            cx: CENTER,
            cy: CENTER,
            r: TRACK_RADIUS,
        });

        this.#progress = createSvgElement("circle", {
            class: "progression-circle__progress",
            cx: CENTER,
            cy: CENTER,
            r: TRACK_RADIUS,
            pathLength: 1,
            "stroke-dasharray": 1,
            "stroke-dashoffset": 1,
            visibility: "hidden",
            transform: `rotate(-90 ${CENTER} ${CENTER})`,
        });

        this.#notches = createSvgElement("g", {
            class: "progression-circle__notches",
        });

        this.#targets = createSvgElement("g", {
            class: "progression-circle__targets",
        });

        this.#marker = createSvgElement("g", {
            class: "progression-circle__marker",
            transform: `rotate(0 ${CENTER} ${CENTER})`,
        });

        const markerDot = createSvgElement("circle", {
            class: "progression-circle__marker-dot",
            cx: CENTER,
            cy: CENTER - TRACK_RADIUS,
            r: MARKER_RADIUS,
        });

        this.#marker.append(markerDot);

        this.#valueText = createSvgElement("text", {
            class: "progression-circle__value",
            x: CENTER,
            y: 48,
            "text-anchor": "middle",
        });

        this.#labelText = createSvgElement("text", {
            class: "progression-circle__label",
            x: CENTER,
            y: 65,
            "text-anchor": "middle",
        });

        this.#svg.append(
            background,
            track,
            this.#progress,
            this.#notches,
            this.#targets,
            this.#marker,
            this.#valueText,
            this.#labelText,
        );

        this.#container.append(this.#svg);
    }

    /** Moves the marker to a normalized clockwise position around the circle. */
    setMarkerPosition(position) {
        validateCircularPosition(position, "ProgressionCircle marker position");

        if (position === this.#markerPosition) {
            return;
        }

        this.#markerPosition = position;

        this.#marker.setAttribute("transform", `rotate(${position * 360} ${CENTER} ${CENTER})`);
    }

    /** Sets normalized completion progress from zero through one. */
    setProgress(progress) {
        validateProgress(progress);

        if (progress === this.#progressValue) {
            return;
        }

        this.#progressValue = progress;

        this.#progress.setAttribute("stroke-dashoffset", String(1 - progress));

        this.#progress.setAttribute("visibility", progress === 0 ? "hidden" : "visible");
    }

    /** Replaces the circle's structural notch definitions. */
    setNotches(notches) {
        if (!Array.isArray(notches)) {
            throw new TypeError("ProgressionCircle notches must be an array.");
        }

        const fragment = document.createDocumentFragment();

        for (const notch of notches) {
            validateNotch(notch);

            const notchElement = createSvgElement("line", {
                class: "progression-circle__notch",
                x1: CENTER,
                y1: CENTER - NOTCH_OUTER_RADIUS,
                x2: CENTER,
                y2: CENTER - NOTCH_INNER_RADIUS,
                transform: `rotate(${notch.position * 360} ${CENTER} ${CENTER})`,
            });

            notchElement.dataset.notchId = notch.id;

            fragment.append(notchElement);
        }

        this.#notches.replaceChildren(fragment);
    }

    /** Replaces the circle's target marker definitions. */
    setTargets(targets) {
        if (!Array.isArray(targets)) {
            throw new TypeError("ProgressionCircle targets must be an array.");
        }

        const fragment = document.createDocumentFragment();

        for (const target of targets) {
            validateTarget(target);

            const targetElement = createSvgElement("circle", {
                class: "progression-circle__target",
                cx: CENTER,
                cy: CENTER - TRACK_RADIUS,
                r: MARKER_RADIUS,
                transform: `rotate(${target.position * 360} ${CENTER} ${CENTER})`,
            });

            targetElement.dataset.targetId = target.id;

            fragment.append(targetElement);
        }

        this.#targets.replaceChildren(fragment);
    }

    /** Updates the primary interior value text. */
    setValueText(text) {
        const value = String(text);

        if (value === this.#valueTextValue) {
            return;
        }

        this.#valueTextValue = value;
        this.#valueText.textContent = value;
    }

    /** Updates the secondary interior label text. */
    setLabelText(text) {
        const value = String(text);

        if (value === this.#labelTextValue) {
            return;
        }

        this.#labelTextValue = value;
        this.#labelText.textContent = value;
    }

    /** Updates the visual state exposed to component CSS. */
    setState(state) {
        const value = String(state);

        if (value === this.#stateValue) {
            return;
        }

        this.#stateValue = value;
        this.#svg.dataset.state = value;
    }

    /** Removes this component's SVG from its container. */
    destroy() {
        this.#svg.remove();
    }
}

/** Creates one SVG element and applies the supplied attributes. */
function createSvgElement(tagName, attributes = {}) {
    const element = document.createElementNS(SVG_NAMESPACE, tagName);

    for (const [name, value] of Object.entries(attributes)) {
        element.setAttribute(name, String(value));
    }

    return element;
}

/** Validates a normalized circular position in the half-open interval [0, 1). */
function validateCircularPosition(position, label) {
    if (
        typeof position !== "number" ||
        !Number.isFinite(position) ||
        position < 0 ||
        position >= 1
    ) {
        throw new RangeError(`${label} must be a finite number in [0, 1).`);
    }
}

/** Validates normalized completion progress in the closed interval [0, 1]. */
function validateProgress(progress) {
    if (
        typeof progress !== "number" ||
        !Number.isFinite(progress) ||
        progress < 0 ||
        progress > 1
    ) {
        throw new RangeError("ProgressionCircle progress must be a finite number in [0, 1].");
    }
}

/** Validates one structural notch definition. */
function validateNotch(notch) {
    if (notch === null || typeof notch !== "object" || Array.isArray(notch)) {
        throw new TypeError("ProgressionCircle notch must be an object.");
    }

    if (typeof notch.id !== "string" || notch.id.length === 0) {
        throw new TypeError("ProgressionCircle notch id must be a non-empty string.");
    }

    validateCircularPosition(notch.position, `ProgressionCircle notch "${notch.id}" position`);
}

/** Validates one target marker definition. */
function validateTarget(target) {
    if (target === null || typeof target !== "object" || Array.isArray(target)) {
        throw new TypeError("ProgressionCircle target must be an object.");
    }

    if (typeof target.id !== "string" || target.id.length === 0) {
        throw new TypeError("ProgressionCircle target id must be a non-empty string.");
    }

    validateCircularPosition(target.position, `ProgressionCircle target "${target.id}" position`);
}
