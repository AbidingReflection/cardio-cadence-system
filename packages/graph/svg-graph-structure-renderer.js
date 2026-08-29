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
    render({ layout, phaseRanges = [] }) {
        if (!Array.isArray(phaseRanges)) {
            throw new TypeError("SvgGraphStructureRenderer phaseRanges must be an array.");
        }

        this.#clearRootGroup();

        const plot = layout.plot;

        for (let index = 1; index < phaseRanges.length; index += 1) {
            const boundaryTimeMs = phaseRanges[index].startTimeMs;
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
}
