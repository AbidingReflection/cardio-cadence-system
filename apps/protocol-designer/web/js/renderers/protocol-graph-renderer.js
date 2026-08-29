/**
 * ProtocolGraphRenderer responsibilities:
 * - Compose protocol data through the generic graph pipeline.
 * - Own the SVG used to render one Protocol Designer graph.
 * - Resolve presentation margins from the current graph dimensions.
 * - Apply Protocol Designer value-domain configuration.
 * - Rerender automatically when the graph container changes size.
 * - Keep protocol graph orchestration out of app.js and generic graph packages.
 */

import { GraphLayout } from "/packages/graph/graph-layout.js";
import { getGraphSampleIntervalMs } from "/packages/graph/graph-sampling-resolution.js";
import { GraphSeriesSampler } from "/packages/graph/graph-series-sampler.js";
import { SvgGraphRenderer } from "/packages/graph/svg-graph-renderer.js";
import { ProtocolExpander } from "/packages/protocol-expander/protocol-expander.js";
import { ProtocolVariableSeries } from "/packages/protocol-expander/protocol-variable-series.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/** Resolves graph margins for the current presentation dimensions. */
function getGraphMargins(widthPx, heightPx) {
    return {
        top: Math.min(20, Math.max(8, heightPx * 0.08)),
        left: Math.min(20, Math.max(8, widthPx * 0.03)),
        right: Math.min(20, Math.max(8, widthPx * 0.03)),
        bottom: Math.min(20, Math.max(8, heightPx * 0.08)),
    };
}

/** Renders one protocol variable through the generic graph pipeline. */
export class ProtocolGraphRenderer {
    #container;
    #variableId;
    #seriesId;
    #label;
    #unit;
    #valueMin;
    #valueMax;
    #svg;
    #svgRenderer;
    #lastProtocol;
    #resizeObserver;

    /** Creates a renderer for one protocol-backed graph series. */
    constructor({
        container,
        variableId,
        seriesId = variableId,
        label,
        unit = null,
        valueMin,
        valueMax,
    }) {
        this.#container = container;
        this.#variableId = variableId;
        this.#seriesId = seriesId;
        this.#label = label;
        this.#unit = unit;
        this.#valueMin = valueMin;
        this.#valueMax = valueMax;

        this.#svg = document.createElementNS(SVG_NAMESPACE, "svg");
        this.#container.replaceChildren(this.#svg);

        this.#svgRenderer = new SvgGraphRenderer(this.#svg);

        this.#resizeObserver = new ResizeObserver(() => {
            this.#renderCurrent();
        });

        this.#resizeObserver.observe(this.#container);
    }

    /** Stores and renders the latest protocol snapshot. */
    render(protocol) {
        this.#lastProtocol = protocol;
        this.#renderCurrent();
    }

    /** Stops observing the graph container for size changes. */
    destroy() {
        this.#resizeObserver.disconnect();
    }

    /** Renders the current protocol using the container's current dimensions. */
    #renderCurrent() {
        if (this.#lastProtocol === undefined) {
            return;
        }

        const widthPx = this.#container.clientWidth;
        const heightPx = this.#container.clientHeight;

        if (widthPx <= 0 || heightPx <= 0) {
            return;
        }

        const margins = getGraphMargins(widthPx, heightPx);

        const plotWidthPx = widthPx - margins.left - margins.right;
        const plotHeightPx = heightPx - margins.top - margins.bottom;

        if (plotWidthPx <= 0 || plotHeightPx <= 0) {
            return;
        }

        const expander = new ProtocolExpander(this.#lastProtocol);

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
            padding: margins,
        });

        const points = layout.layoutSamples(samples);

        this.#svg.setAttribute("viewBox", `0 0 ${widthPx} ${heightPx}`);
        this.#svgRenderer.render({ points });
    }
}
