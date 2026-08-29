/**
 * SvgGraphStructureRenderer responsibilities:
 * - Render protocol structure overlays into an existing SVG element.
 * - Map structural time ranges through an existing graph layout.
 * - Own and replace only its structure-related SVG content.
 * - Keep protocol semantics and structure-selection policy outside SVG rendering.
 */

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/** Renders graph structure overlays into an existing SVG element. */
export class SvgGraphStructureRenderer {
    #svg;
    #rootGroup;

    /** Creates a structure renderer for an existing SVG element. */
    constructor(svgElement) {
        this.#svg = svgElement;
        this.#rootGroup = this.#createRootGroup();
    }

    /** Renders protocol structure for a graph layout. */
    render({ layout, phases = [] }) {
        if (!Array.isArray(phases)) {
            throw new TypeError("SvgGraphStructureRenderer phases must be an array.");
        }

        this.#clearRootGroup();

        const plot = layout.plot;

        for (let index = 0; index < phases.length; index += 1) {
            const phase = phases[index];

            const xStart = layout.xAtTime(phase.startTimeMs);
            const xEnd = layout.xAtTime(phase.endTimeMs);

            this.#rootGroup.append(
                this.#createPhaseRegion(plot, index, xStart, xEnd),
                this.#createPhaseBand(plot, index, xStart, xEnd),
                this.#createPhaseLabel(plot, phase.label, xStart, xEnd),
            );
        }

        for (let index = 1; index < phases.length; index += 1) {
            const boundaryTimeMs = phases[index].startTimeMs;
            const x = layout.xAtTime(boundaryTimeMs);

            this.#rootGroup.append(this.#createPhaseBoundary(plot, x));
        }
    }

    /** Creates the renderer-owned SVG group between axes and series content. */
    #createRootGroup() {
        const group = document.createElementNS(SVG_NAMESPACE, "g");

        group.setAttribute("class", "graph-structure");

        const seriesGroup = this.#svg.querySelector(".graph-renderer");

        if (seriesGroup === null) {
            this.#svg.append(group);
        } else {
            this.#svg.insertBefore(group, seriesGroup);
        }

        return group;
    }

    /** Removes previously rendered structure content. */
    #clearRootGroup() {
        this.#rootGroup.replaceChildren();
    }

    /** Creates one vertical phase boundary across the plot area. */
    #createPhaseBoundary(plot, x) {
        const line = document.createElementNS(SVG_NAMESPACE, "line");

        line.setAttribute("class", "graph-phase-boundary");
        line.setAttribute("x1", String(x));
        line.setAttribute("x2", String(x));
        line.setAttribute("y1", String(plot.top));
        line.setAttribute("y2", String(plot.bottom));

        return line;
    }

    /** Creates one phase-colored background region inside the plot. */
    #createPhaseRegion(plot, index, xStart, xEnd) {
        const rect = document.createElementNS(SVG_NAMESPACE, "rect");

        rect.setAttribute("class", `graph-phase-region graph-phase-region--${index}`);
        rect.setAttribute("x", String(xStart));
        rect.setAttribute("y", String(plot.top));
        rect.setAttribute("width", String(xEnd - xStart));
        rect.setAttribute("height", String(plot.bottom - plot.top));

        return rect;
    }

    /** Creates one phase band above the plot. */
    #createPhaseBand(plot, index, xStart, xEnd) {
        const rect = document.createElementNS(SVG_NAMESPACE, "rect");

        const bandHeight = 20;
        const bandBottom = plot.top - 4;

        rect.setAttribute("class", `graph-phase-band graph-phase-band--${index}`);
        rect.setAttribute("x", String(xStart));
        rect.setAttribute("y", String(bandBottom - bandHeight));
        rect.setAttribute("width", String(xEnd - xStart));
        rect.setAttribute("height", String(bandHeight));

        return rect;
    }

    /** Creates one centered phase label inside its band. */
    #createPhaseLabel(plot, label, xStart, xEnd) {
        const text = document.createElementNS(SVG_NAMESPACE, "text");

        const bandHeight = 20;
        const bandBottom = plot.top - 4;

        text.setAttribute("class", "graph-phase-label");
        text.setAttribute("x", String((xStart + xEnd) / 2));
        text.setAttribute("y", String(bandBottom - bandHeight / 2));
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "middle");
        text.textContent = String(label);

        return text;
    }
}
