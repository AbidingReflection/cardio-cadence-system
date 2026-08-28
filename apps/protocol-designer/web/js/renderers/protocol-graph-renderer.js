/**
 * ProtocolGraphRenderer responsibilities:
 * - Compose protocol data through the generic graph pipeline.
 * - Own the SVG used to render one Protocol Designer graph.
 * - Apply Protocol Designer graph dimensions, padding, and value-domain configuration.
 * - Keep protocol graph orchestration out of app.js and generic graph packages.
 */

import { GraphLayout } from "/packages/graph/graph-layout.js";
import { getGraphSampleIntervalMs } from "/packages/graph/graph-sampling-resolution.js";
import { GraphSeriesSampler } from "/packages/graph/graph-series-sampler.js";
import { SvgGraphRenderer } from "/packages/graph/svg-graph-renderer.js";
import { ProtocolExpander } from "/packages/protocol-expander/protocol-expander.js";
import { ProtocolVariableSeries } from "/packages/protocol-expander/protocol-variable-series.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const DEFAULT_PADDING = {
    top: 40,
    right: 60,
    bottom: 50,
    left: 60,
};

/** Renders one protocol variable through the generic graph pipeline. */
export class ProtocolGraphRenderer {
    #container;
    #variableId;
    #seriesId;
    #label;
    #unit;
    #valueMin;
    #valueMax;
    #padding;
    #svg;
    #svgRenderer;

    /** Creates a renderer for one protocol-backed graph series. */
    constructor({
        container,
        variableId,
        seriesId = variableId,
        label,
        unit = null,
        valueMin,
        valueMax,
        padding = DEFAULT_PADDING,
    }) {
        this.#container = container;
        this.#variableId = variableId;
        this.#seriesId = seriesId;
        this.#label = label;
        this.#unit = unit;
        this.#valueMin = valueMin;
        this.#valueMax = valueMax;
        this.#padding = { ...padding };

        this.#svg = document.createElementNS(SVG_NAMESPACE, "svg");
        this.#container.replaceChildren(this.#svg);

        this.#svgRenderer = new SvgGraphRenderer(this.#svg);
    }

    /** Renders a protocol snapshot using the container's current dimensions. */
    render(protocol) {
        const widthPx = this.#container.clientWidth;
        const heightPx = this.#container.clientHeight;

        if (widthPx <= 0 || heightPx <= 0) {
            return;
        }

        const expander = new ProtocolExpander(protocol);

        if (expander.durationMs <= 0) {
            this.#svg.setAttribute("viewBox", `0 0 ${widthPx} ${heightPx}`);
            this.#svgRenderer.render({ points: [] });
            return;
        }

        const series = new ProtocolVariableSeries(expander, this.#variableId, {
            id: this.#seriesId,
            label: this.#label,
            unit: this.#unit,
        });

        const plotWidthPx = widthPx - this.#padding.left - this.#padding.right;

        if (plotWidthPx <= 0) {
            return;
        }

        const sampleIntervalMs = getGraphSampleIntervalMs({
            startTimeMs: 0,
            endTimeMs: expander.durationMs,
            widthPx: plotWidthPx,
        });

        const sampler = new GraphSeriesSampler(series);

        const samples = sampler.sample({
            startTimeMs: 0,
            endTimeMs: expander.durationMs,
            sampleIntervalMs,
        });

        const layout = new GraphLayout({
            startTimeMs: 0,
            endTimeMs: expander.durationMs,
            valueMin: this.#valueMin,
            valueMax: this.#valueMax,
            widthPx,
            heightPx,
            padding: this.#padding,
        });

        const points = layout.layoutSamples(samples);

        this.#svg.setAttribute("viewBox", `0 0 ${widthPx} ${heightPx}`);
        this.#svgRenderer.render({ points });
    }
}
