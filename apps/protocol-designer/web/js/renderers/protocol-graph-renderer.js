/**
 * ProtocolGraphRenderer responsibilities:
 * - Compose protocol data through the generic graph pipeline.
 * - Own the SVG used to render one Protocol Designer graph.
 * - Resolve presentation margins from the current graph dimensions.
 * - Apply Protocol Designer value-domain configuration.
 * - Render graph axes, protocol structure, and series presentation.
 * - Rerender automatically when the graph container changes size.
 * - Keep protocol graph orchestration out of app.js and generic graph packages.
 */

import { GraphLayout } from "/packages/graph/graph-layout.js";
import { getGraphSampleIntervalMs } from "/packages/graph/graph-sampling-resolution.js";
import { GraphSeriesSampler } from "/packages/graph/graph-series-sampler.js";
import { getLinearTicks, getTimeTicks } from "/packages/graph/graph-ticks.js";
import { SvgGraphAxesRenderer } from "/packages/graph/svg-graph-axes-renderer.js";
import { SvgGraphRenderer } from "/packages/graph/svg-graph-renderer.js";
import { SvgGraphStructureRenderer } from "/packages/graph/svg-graph-structure-renderer.js";
import { ProtocolExpander } from "/packages/protocol-expander/protocol-expander.js";
import { ProtocolGraphContext } from "/packages/protocol-expander/protocol-graph-context.js";
import { ProtocolVariableSeries } from "/packages/protocol-expander/protocol-variable-series.js";
import { formatDuration } from "/packages/utils/format-duration.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/** Resolves graph margins for the current presentation dimensions. */
function getGraphMargins(widthPx, heightPx) {
    return {
        top: Math.min(44, Math.max(32, heightPx * 0.14)),
        right: Math.min(20, Math.max(8, widthPx * 0.03)),
        bottom: Math.min(56, Math.max(44, heightPx * 0.18)),
        left: Math.min(72, Math.max(56, widthPx * 0.08)),
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
    #axesRenderer;
    #structureRenderer;
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
        this.#axesRenderer = new SvgGraphAxesRenderer(this.#svg);
        this.#structureRenderer = new SvgGraphStructureRenderer(this.#svg);

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

        this.#svg.setAttribute("viewBox", `0 0 ${widthPx} ${heightPx}`);

        if (expander.durationMs <= 0) {
            const layout = this.#createLayout({
                startTimeMs: 0,
                endTimeMs: 1,
                widthPx,
                heightPx,
                margins,
            });

            this.#renderAxes({
                layout,
                xTicks: [],
                yTicks: [],
            });

            this.#structureRenderer.render({
                layout,
                phases: [],
            });

            this.#svgRenderer.render({ points: [] });
            return;
        }

        const graphContext = new ProtocolGraphContext(expander);

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

        const layout = this.#createLayout({
            startTimeMs: 0,
            endTimeMs: expander.durationMs,
            widthPx,
            heightPx,
            margins,
        });

        const points = layout.layoutSamples(samples);

        const xTicks = getTimeTicks({
            startTimeMs: 0,
            endTimeMs: expander.durationMs,
            targetCount: 9,
        });

        const yTicks = getLinearTicks({
            min: this.#valueMin,
            max: this.#valueMax,
            targetCount: 6,
        });

        const phases = this.#getGraphPhases(graphContext);

        this.#renderAxes({
            layout,
            xTicks,
            yTicks,
        });

        this.#structureRenderer.render({
            layout,
            phases,
        });

        this.#svgRenderer.render({ points });
    }

    /** Creates graph layout geometry for the current value domain. */
    #createLayout({ startTimeMs, endTimeMs, widthPx, heightPx, margins }) {
        return new GraphLayout({
            startTimeMs,
            endTimeMs,
            valueMin: this.#valueMin,
            valueMax: this.#valueMax,
            widthPx,
            heightPx,
            padding: margins,
        });
    }

    /** Builds presentation-ready phase structure from protocol phase ranges. */
    #getGraphPhases(graphContext) {
        const phaseRangesById = new Map(
            graphContext.getPhaseRanges().map((range) => [range.id, range]),
        );

        return this.#lastProtocol.phases.map((phase) => {
            const range = phaseRangesById.get(phase.id);

            if (range === undefined) {
                throw new Error(`Protocol graph phase range "${phase.id}" was not found.`);
            }

            return {
                id: phase.id,
                label: phase.name,
                startTimeMs: range.startTimeMs,
                endTimeMs: range.endTimeMs,
            };
        });
    }

    /** Renders axes using the presentation configuration for this graph. */
    #renderAxes({ layout, xTicks, yTicks }) {
        this.#axesRenderer.render({
            layout,
            xTicks,
            yTicks,
            xAxisLabel: "Time",
            yAxisLabel: this.#getYAxisLabel(),
            formatXTick: (timeMs) => formatDuration(Math.round(timeMs / 1000)),
        });
    }

    /** Returns the presentation label for this graph's value axis. */
    #getYAxisLabel() {
        if (this.#unit === null) {
            return this.#label;
        }

        return `${this.#label} (${this.#unit})`;
    }
}
