/**
 * SvgGraphStructureRenderer responsibilities:
 * - Render protocol structure overlays into an existing SVG element.
 * - Map structural time ranges through an existing graph layout.
 * - Own and replace only its structure-related SVG content.
 * - Keep protocol semantics and structure-selection policy outside SVG rendering.
 */

import { roundSvgCoordinate } from "/packages/graph/svg-point-precision.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const SVG_COORDINATE_PRECISION = 2;
const PHASE_BAND_HEIGHT = 20;
const PHASE_BAND_GAP = 4;

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
    render({ layout, phases = [], blocks = [] }) {
        if (!Array.isArray(phases)) {
            throw new TypeError("SvgGraphStructureRenderer phases must be an array.");
        }

        if (!Array.isArray(blocks)) {
            throw new TypeError("SvgGraphStructureRenderer blocks must be an array.");
        }

        this.#clearRootGroup();

        const plot = layout.plot;

        for (let index = 0; index < phases.length; index += 1) {
            const phase = phases[index];

            const xStart = roundSvgCoordinate(
                layout.xAtTime(phase.startTimeMs),
                SVG_COORDINATE_PRECISION,
            );

            const xEnd = roundSvgCoordinate(
                layout.xAtTime(phase.endTimeMs),
                SVG_COORDINATE_PRECISION,
            );

            this.#rootGroup.append(
                this.#createPhaseRegion(plot, index, xStart, xEnd),
                this.#createPhaseBand(plot, index, xStart, xEnd),
                this.#createPhaseLabel(plot, phase.label, xStart, xEnd),
            );
        }

        for (let index = 1; index < blocks.length; index += 1) {
            const boundaryTimeMs = blocks[index].startTimeMs;

            const x = roundSvgCoordinate(layout.xAtTime(boundaryTimeMs), SVG_COORDINATE_PRECISION);

            this.#rootGroup.append(this.#createBlockBoundary(plot, x));
        }

        for (let index = 1; index < phases.length; index += 1) {
            const boundaryTimeMs = phases[index].startTimeMs;

            const x = roundSvgCoordinate(layout.xAtTime(boundaryTimeMs), SVG_COORDINATE_PRECISION);

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
        line.setAttribute("y1", String(roundSvgCoordinate(plot.top, SVG_COORDINATE_PRECISION)));
        line.setAttribute("y2", String(roundSvgCoordinate(plot.bottom, SVG_COORDINATE_PRECISION)));

        return line;
    }

    /** Creates one phase-colored background region inside the plot. */
    #createPhaseRegion(plot, index, xStart, xEnd) {
        const rect = document.createElementNS(SVG_NAMESPACE, "rect");
        const width = roundSvgCoordinate(Math.max(0, xEnd - xStart), SVG_COORDINATE_PRECISION);

        rect.setAttribute("class", `graph-phase-region graph-phase-region--${index}`);
        rect.setAttribute("x", String(xStart));
        rect.setAttribute("y", String(roundSvgCoordinate(plot.top, SVG_COORDINATE_PRECISION)));
        rect.setAttribute("width", String(width));
        rect.setAttribute(
            "height",
            String(
                roundSvgCoordinate(Math.max(0, plot.bottom - plot.top), SVG_COORDINATE_PRECISION),
            ),
        );

        return rect;
    }

    /** Creates one vertical block boundary across the plot area. */
    #createBlockBoundary(plot, x) {
        const line = document.createElementNS(SVG_NAMESPACE, "line");

        line.setAttribute("class", "graph-block-boundary");
        line.setAttribute("x1", String(x));
        line.setAttribute("x2", String(x));
        line.setAttribute("y1", String(roundSvgCoordinate(plot.top, SVG_COORDINATE_PRECISION)));
        line.setAttribute("y2", String(roundSvgCoordinate(plot.bottom, SVG_COORDINATE_PRECISION)));

        return line;
    }

    /** Creates one phase band above the plot. */
    #createPhaseBand(plot, index, xStart, xEnd) {
        const rect = document.createElementNS(SVG_NAMESPACE, "rect");
        const bandBottom = plot.top - PHASE_BAND_GAP;
        const bandTop = bandBottom - PHASE_BAND_HEIGHT;
        const width = roundSvgCoordinate(Math.max(0, xEnd - xStart), SVG_COORDINATE_PRECISION);

        rect.setAttribute("class", `graph-phase-band graph-phase-band--${index}`);
        rect.setAttribute("x", String(xStart));
        rect.setAttribute("y", String(roundSvgCoordinate(bandTop, SVG_COORDINATE_PRECISION)));
        rect.setAttribute("width", String(width));
        rect.setAttribute(
            "height",
            String(roundSvgCoordinate(PHASE_BAND_HEIGHT, SVG_COORDINATE_PRECISION)),
        );

        return rect;
    }

    /** Creates one centered phase label inside its band. */
    #createPhaseLabel(plot, label, xStart, xEnd) {
        const text = document.createElementNS(SVG_NAMESPACE, "text");
        const bandBottom = plot.top - PHASE_BAND_GAP;
        const centerX = roundSvgCoordinate((xStart + xEnd) / 2, SVG_COORDINATE_PRECISION);
        const centerY = roundSvgCoordinate(
            bandBottom - PHASE_BAND_HEIGHT / 2,
            SVG_COORDINATE_PRECISION,
        );

        text.setAttribute("class", "graph-phase-label");
        text.setAttribute("x", String(centerX));
        text.setAttribute("y", String(centerY));
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "middle");
        text.textContent = String(label);

        return text;
    }
}
