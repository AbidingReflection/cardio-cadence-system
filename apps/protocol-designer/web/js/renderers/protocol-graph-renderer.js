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
import {
    getLinearTicks,
    getTimeTicks,
    getXAxisTickTargetCount,
    getYAxisTickTargetCount,
} from "/packages/graph/graph-ticks.js";
import { SvgGraphAxesRenderer } from "/packages/graph/svg-graph-axes-renderer.js";
import { SvgGraphRenderer } from "/packages/graph/svg-graph-renderer.js";
import { ProtocolGraphStructureRenderer } from "/packages/graph/protocol-graph-structure-renderer.js";
import { ProtocolExpander } from "/packages/protocol-expander/protocol-expander.js";
import { ProtocolGraphContext } from "/packages/protocol-expander/protocol-graph-context.js";
import { ProtocolVariableSeries } from "/packages/protocol-expander/protocol-variable-series.js";
import { formatDuration } from "/packages/utils/format-duration.js";
import { roundSvgPoints } from "/packages/graph/svg-point-precision.js";
import { getLinearValueDomain } from "/packages/graph/graph-domain.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const SVG_POINT_PRECISION = 1;

const EMPTY_VALUE_DOMAIN = {
    min: 0,
    max: 1,
};

/** Resolves protocol structure sizing for the current graph height. */
function getProtocolStructureMetrics(heightPx) {
    return {
        phaseBandHeight: Math.min(20, Math.max(12, heightPx * 0.08)),
        phaseBandGap: Math.min(4, Math.max(2, heightPx * 0.015)),
    };
}

/** Resolves graph margins for the current presentation dimensions. */
function getGraphMargins(widthPx, heightPx, structureMetrics) {
    const structureTop = structureMetrics.phaseBandHeight + structureMetrics.phaseBandGap;

    return {
        top: Math.max(structureTop, Math.min(44, Math.max(20, heightPx * 0.14))),
        right: Math.min(20, Math.max(8, widthPx * 0.03)),
        bottom: Math.min(56, Math.max(36, heightPx * 0.18)),
        left: Math.min(56, Math.max(44, widthPx * 0.08)),
    };
}

/** Resolves the y-axis title offset for the current graph width. */
function getYAxisTitleOffset(widthPx) {
    return Math.min(40, Math.max(30, widthPx * 0.065));
}

/** Renders one protocol variable through the generic graph pipeline. */
export class ProtocolGraphRenderer {
    #container;
    #svg;
    #svgRenderer;
    #axesRenderer;
    #structureRenderer;
    #lastProtocol;
    #lastSelection = {
        selectedPhaseId: undefined,
        selectedBlockId: undefined,
    };
    #lastConfig;
    #lastStructureState;
    #resizeObserver;
    #widthPx;
    #heightPx;
    #unavailableMessage;

    /** Creates a renderer for one protocol-backed graph container. */
    constructor({ container }) {
        this.#container = container;

        this.#svg = document.createElementNS(SVG_NAMESPACE, "svg");
        this.#svg.classList.add("graph-svg");
        this.#container.replaceChildren(this.#svg);

        this.#svgRenderer = new SvgGraphRenderer(this.#svg);
        this.#axesRenderer = new SvgGraphAxesRenderer(this.#svg);
        this.#structureRenderer = new ProtocolGraphStructureRenderer(this.#svg);

        this.#resizeObserver = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;

            if (width === this.#widthPx && height === this.#heightPx) {
                return;
            }

            this.#widthPx = width;
            this.#heightPx = height;

            this.#renderCurrent();
        });

        this.#resizeObserver.observe(this.#container);
    }

    /** Stores and renders the latest protocol, selection, and graph configuration. */
    render(protocol, { selectedPhaseId = undefined, selectedBlockId = undefined } = {}, config) {
        this.#lastProtocol = protocol;
        this.#lastSelection = {
            selectedPhaseId,
            selectedBlockId,
        };
        this.#lastConfig = config;
        this.#unavailableMessage = undefined;

        this.#renderCurrent();
    }

    /** Updates graph selection styling without rebuilding graph structure. */
    updateSelection({ selectedPhaseId = undefined, selectedBlockId = undefined } = {}) {
        this.#lastSelection = {
            selectedPhaseId,
            selectedBlockId,
        };

        if (this.#lastStructureState === undefined) {
            return;
        }

        this.#structureRenderer.updateSelection({
            selectedPhaseId,
            selectedBlockId,
        });
    }

    /** Rerenders the graph using the container's current dimensions. */
    refreshLayout() {
        const { width, height } = this.#container.getBoundingClientRect();

        this.#widthPx = width;
        this.#heightPx = height;

        this.#renderCurrent();
    }

    /** Stops observing the graph container for size changes. */
    destroy() {
        this.#resizeObserver.disconnect();
    }

    /** Stores and renders a graph unavailable state. */
    renderUnavailable(message, config) {
        this.#lastProtocol = undefined;
        this.#lastSelection = {
            selectedPhaseId: undefined,
            selectedBlockId: undefined,
        };
        this.#lastConfig = config;
        this.#unavailableMessage = message;

        this.#renderCurrent();
    }

    /** Renders the current protocol using the container's current dimensions. */
    #renderCurrent() {
        if (this.#lastConfig === undefined) {
            return;
        }

        const {
            variableId,
            seriesId = variableId,
            createSeries = undefined,
            transformValue = undefined,
            label,
            unit = null,
        } = this.#lastConfig;

        const widthPx = this.#widthPx ?? this.#container.clientWidth;
        const heightPx = this.#heightPx ?? this.#container.clientHeight;

        this.#widthPx = widthPx;
        this.#heightPx = heightPx;

        if (widthPx <= 0 || heightPx <= 0) {
            return;
        }

        const structureMetrics = getProtocolStructureMetrics(heightPx);
        const margins = getGraphMargins(widthPx, heightPx, structureMetrics);
        const plotWidthPx = widthPx - margins.left - margins.right;
        const plotHeightPx = heightPx - margins.top - margins.bottom;

        if (plotWidthPx <= 0 || plotHeightPx <= 0) {
            return;
        }

        this.#svg.querySelector(".graph-empty-state")?.remove();

        this.#svg.setAttribute("viewBox", `0 0 ${widthPx} ${heightPx}`);

        if (this.#unavailableMessage !== undefined) {
            const layout = this.#createLayout({
                startTimeMs: 0,
                endTimeMs: 1,
                widthPx,
                heightPx,
                margins,
                valueMin: EMPTY_VALUE_DOMAIN.min,
                valueMax: EMPTY_VALUE_DOMAIN.max,
            });

            this.#renderAxes({
                layout,
                xTicks: [],
                yTicks: [],
                label,
                unit,
            });

            this.#lastStructureState = {
                layout,
                phases: [],
                blocks: [],
                structureMetrics,
            };

            this.#renderStructure();

            this.#svgRenderer.render({ points: [] });
            this.#renderEmptyState(layout, this.#unavailableMessage);
            return;
        }

        if (this.#lastProtocol === undefined) {
            return;
        }

        const expander = new ProtocolExpander(this.#lastProtocol);

        if (expander.durationMs <= 0) {
            const layout = this.#createLayout({
                startTimeMs: 0,
                endTimeMs: 1,
                widthPx,
                heightPx,
                margins,
                valueMin: EMPTY_VALUE_DOMAIN.min,
                valueMax: EMPTY_VALUE_DOMAIN.max,
            });

            this.#renderAxes({
                layout,
                xTicks: [],
                yTicks: [],
                label,
                unit,
            });

            this.#lastStructureState = {
                layout,
                phases: [],
                blocks: [],
                structureMetrics,
            };

            this.#renderStructure();

            this.#svgRenderer.render({ points: [] });
            this.#renderEmptyState(layout);
            return;
        }

        const graphContext = new ProtocolGraphContext(expander);

        const series =
            createSeries === undefined
                ? new ProtocolVariableSeries(expander, variableId, {
                      id: seriesId,
                      label,
                      unit,
                  })
                : createSeries(expander);

        const sampleIntervalMs = getGraphSampleIntervalMs({
            startTimeMs: 0,
            endTimeMs: expander.durationMs,
            widthPx: plotWidthPx,
        });

        const sampler = new GraphSeriesSampler(series);

        let samples = sampler.sample({
            startTimeMs: 0,
            endTimeMs: expander.durationMs,
            sampleIntervalMs,
        });

        if (transformValue !== undefined) {
            samples = samples.map((sample) => ({
                ...sample,
                value: sample.value === undefined ? undefined : transformValue(sample.value),
            }));
        }

        const valueDomain = getLinearValueDomain(samples.map((sample) => sample.value));

        const layout = this.#createLayout({
            startTimeMs: 0,
            endTimeMs: expander.durationMs,
            widthPx,
            heightPx,
            margins,
            valueMin: valueDomain.min,
            valueMax: valueDomain.max,
        });

        const points = roundSvgPoints(layout.layoutSamples(samples), SVG_POINT_PRECISION);

        const xTicks = getTimeTicks({
            startTimeMs: 0,
            endTimeMs: expander.durationMs,
            targetCount: getXAxisTickTargetCount(layout.plot.width),
        });

        const yTicks = getLinearTicks({
            min: valueDomain.min,
            max: valueDomain.max,
            targetCount: getYAxisTickTargetCount(layout.plot.height),
        });

        const phases = this.#getGraphPhases(graphContext);
        const blocks = graphContext.getBlockRanges();

        this.#renderAxes({
            layout,
            xTicks,
            yTicks,
            label,
            unit,
        });

        this.#lastStructureState = {
            layout,
            phases,
            blocks,
            structureMetrics,
        };

        this.#renderStructure();

        this.#svgRenderer.render({ points });
    }

    /** Renders a centered graph empty-state message. */
    #renderEmptyState(layout, message = "Add a block to preview this protocol") {
        const text = document.createElementNS(SVG_NAMESPACE, "text");

        text.setAttribute("class", "graph-empty-state");
        text.setAttribute("x", String((layout.plot.left + layout.plot.right) / 2));
        text.setAttribute("y", String((layout.plot.top + layout.plot.bottom) / 2));
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "middle");
        text.textContent = message;

        this.#svg.append(text);
    }

    /** Creates graph layout geometry for the current value domain. */
    #createLayout({ startTimeMs, endTimeMs, widthPx, heightPx, margins, valueMin, valueMax }) {
        return new GraphLayout({
            startTimeMs,
            endTimeMs,
            valueMin,
            valueMax,
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
    #renderAxes({ layout, xTicks, yTicks, label, unit }) {
        this.#axesRenderer.render({
            layout,
            xTicks,
            yTicks,
            xAxisLabel: "Time",
            yAxisLabel: this.#getYAxisLabel(label, unit),
            yAxisTitleOffset: getYAxisTitleOffset(layout.plot.width),
            formatXTick: (timeMs) => formatDuration(timeMs / 1000),
        });
    }

    /** Returns the presentation label for this graph's value axis. */
    #getYAxisLabel(label, unit) {
        if (unit === null) {
            return label;
        }

        return `${label} (${unit})`;
    }

    /** Renders protocol structure using the latest layout and selection state. */
    #renderStructure() {
        const { layout, phases, blocks, structureMetrics } = this.#lastStructureState;
        this.#structureRenderer.render({
            layout,
            phases,
            blocks,
            selectedPhaseId: this.#lastSelection.selectedPhaseId,
            selectedBlockId: this.#lastSelection.selectedBlockId,
            phaseBandHeight: structureMetrics.phaseBandHeight,
            phaseBandGap: structureMetrics.phaseBandGap,
        });
    }
}
