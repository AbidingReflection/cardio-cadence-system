/**
 * Creates reusable inline SVG status icons for shared application UI.
 */

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const STATUS_ICON_VIEWBOX = "0 0 24 24";

/** Creates a warning status icon. */
export function createWarningIcon() {
    const svg = createStatusSvg("status-icon status-icon--warning");

    const triangle = document.createElementNS(SVG_NAMESPACE, "path");
    triangle.setAttribute(
        "d",
        [
            "M10.27 3.65",
            "a2 2 0 0 1 3.46 0",
            "l8.05 13.95",
            "a2 2 0 0 1 -1.73 3",
            "H3.95",
            "a2 2 0 0 1 -1.73 -3",
            "Z",
        ].join(" "),
    );
    triangle.setAttribute("fill", "#facc15");
    triangle.setAttribute("stroke", "#b45309");
    triangle.setAttribute("stroke-width", "1.5");
    triangle.setAttribute("stroke-linejoin", "round");

    const stem = document.createElementNS(SVG_NAMESPACE, "path");
    stem.setAttribute("d", "M12 8v6");
    stem.setAttribute("stroke", "#1f2937");
    stem.setAttribute("stroke-width", "2");
    stem.setAttribute("stroke-linecap", "round");

    const dot = document.createElementNS(SVG_NAMESPACE, "circle");
    dot.setAttribute("cx", "12");
    dot.setAttribute("cy", "17.25");
    dot.setAttribute("r", "1.15");
    dot.setAttribute("fill", "#1f2937");

    svg.append(triangle, stem, dot);

    return svg;
}

/** Creates an error status icon. */
export function createErrorIcon() {
    const svg = createStatusSvg("status-icon status-icon--error");

    const circle = document.createElementNS(SVG_NAMESPACE, "circle");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "12");
    circle.setAttribute("r", "9.25");
    circle.setAttribute("fill", "#ef4444");
    circle.setAttribute("stroke", "#b91c1c");
    circle.setAttribute("stroke-width", "1.5");

    const x = document.createElementNS(SVG_NAMESPACE, "path");
    x.setAttribute("d", ["M8.5 8.5 15.5 15.5", "M15.5 8.5 8.5 15.5"].join(" "));
    x.setAttribute("fill", "none");
    x.setAttribute("stroke", "#ffffff");
    x.setAttribute("stroke-width", "2.25");
    x.setAttribute("stroke-linecap", "round");

    svg.append(circle, x);

    return svg;
}

/** Creates the shared SVG shell for a status icon. */
function createStatusSvg(className) {
    const svg = document.createElementNS(SVG_NAMESPACE, "svg");

    svg.setAttribute("viewBox", STATUS_ICON_VIEWBOX);
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add(...className.split(" "));

    return svg;
}
