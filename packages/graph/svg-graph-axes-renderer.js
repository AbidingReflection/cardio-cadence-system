/**
 * SvgGraphAxesRenderer responsibilities:
 * - Render graph axes and grid presentation into an existing SVG element.
 * - Map semantic tick values through an existing graph layout.
 * - Own and replace only its axis-related SVG content.
 * - Keep tick generation and graph-domain policy outside SVG rendering.
 */

import { roundSvgCoordinate } from "/packages/graph/svg-point-precision.js";

const SVG_COORDINATE_PRECISION = 2;

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/** Renders graph axes, grid lines, tick labels, and axis titles into an existing SVG element. */
export class SvgGraphAxesRenderer {
    #svg;
    #rootGroup;

    /** Creates an axis renderer for an existing SVG element. */
    constructor(svgElement) {
        this.#svg = svgElement;
        this.#rootGroup = this.#createRootGroup();
    }

    /** Renders graph axes, ticks, labels, titles, and horizontal grid lines. */
    render({
        layout,
        xTicks = [],
        yTicks,
        xAxisLabel = null,
        yAxisLabel = null,
        formatXTick = String,
        formatYTick = String,
        rightYAxis = null,
    }) {
        if (!Array.isArray(xTicks)) {
            throw new TypeError("SvgGraphAxesRenderer xTicks must be an array.");
        }

        if (!Array.isArray(yTicks)) {
            throw new TypeError("SvgGraphAxesRenderer yTicks must be an array.");
        }

        if (typeof formatXTick !== "function") {
            throw new TypeError("SvgGraphAxesRenderer formatXTick must be a function.");
        }

        if (typeof formatYTick !== "function") {
            throw new TypeError("SvgGraphAxesRenderer formatYTick must be a function.");
        }

        if (xAxisLabel !== null && typeof xAxisLabel !== "string") {
            throw new TypeError("SvgGraphAxesRenderer xAxisLabel must be a string or null.");
        }

        if (yAxisLabel !== null && typeof yAxisLabel !== "string") {
            throw new TypeError("SvgGraphAxesRenderer yAxisLabel must be a string or null.");
        }

        if (rightYAxis !== null) {
            if (!Array.isArray(rightYAxis.ticks)) {
                throw new TypeError("SvgGraphAxesRenderer rightYAxis ticks must be an array.");
            }

            if (
                rightYAxis.formatTick !== undefined &&
                typeof rightYAxis.formatTick !== "function"
            ) {
                throw new TypeError(
                    "SvgGraphAxesRenderer rightYAxis formatTick must be a function.",
                );
            }

            if (
                rightYAxis.label !== undefined &&
                rightYAxis.label !== null &&
                typeof rightYAxis.label !== "string"
            ) {
                throw new TypeError(
                    "SvgGraphAxesRenderer rightYAxis label must be a string or null.",
                );
            }
        }

        this.#clearRootGroup();

        const plot = layout.plot;

        this.#rootGroup.append(this.#createYAxisLine(plot), this.#createXAxisLine(plot));

        if (xAxisLabel !== null) {
            this.#rootGroup.append(this.#createXAxisTitle(plot, xAxisLabel));
        }

        if (yAxisLabel !== null) {
            this.#rootGroup.append(this.#createYAxisTitle(plot, yAxisLabel));
        }

        for (const timeMs of xTicks) {
            const x = roundSvgCoordinate(layout.xAtTime(timeMs), SVG_COORDINATE_PRECISION);

            this.#rootGroup.append(
                this.#createXTickMark(plot, x),
                this.#createXTickLabel(plot, x, formatXTick(timeMs)),
            );
        }

        for (const value of yTicks) {
            const y = roundSvgCoordinate(layout.yAtValue(value), SVG_COORDINATE_PRECISION);

            this.#rootGroup.append(
                this.#createHorizontalGridLine(plot, y),
                this.#createYTickMark(plot, y),
                this.#createYTickLabel(plot, y, formatYTick(value)),
            );
        }

        if (rightYAxis !== null) {
            const rightLayout = rightYAxis.layout;
            const rightPlot = rightLayout.plot;
            const formatRightTick = rightYAxis.formatTick ?? String;

            this.#rootGroup.append(this.#createRightYAxisLine(rightPlot));

            if (rightYAxis.label !== undefined && rightYAxis.label !== null) {
                this.#rootGroup.append(this.#createRightYAxisTitle(rightPlot, rightYAxis.label));
            }

            for (const value of rightYAxis.ticks) {
                const y = roundSvgCoordinate(rightLayout.yAtValue(value), SVG_COORDINATE_PRECISION);

                this.#rootGroup.append(
                    this.#createRightYTickMark(rightPlot, y),
                    this.#createRightYTickLabel(rightPlot, y, formatRightTick(value)),
                );
            }
        }
    }

    /** Creates the vertical y-axis baseline at the left plot edge. */
    #createYAxisLine(plot) {
        const line = document.createElementNS(SVG_NAMESPACE, "line");

        line.setAttribute("class", "graph-axis__line graph-axis__line--y");
        line.setAttribute("x1", String(plot.left));
        line.setAttribute("x2", String(plot.left));
        line.setAttribute("y1", String(plot.top));
        line.setAttribute("y2", String(plot.bottom));

        return line;
    }

    /** Creates the horizontal x-axis baseline at the bottom plot edge. */
    #createXAxisLine(plot) {
        const line = document.createElementNS(SVG_NAMESPACE, "line");

        line.setAttribute("class", "graph-axis__line graph-axis__line--x");
        line.setAttribute("x1", String(plot.left));
        line.setAttribute("x2", String(plot.right));
        line.setAttribute("y1", String(plot.bottom));
        line.setAttribute("y2", String(plot.bottom));

        return line;
    }

    /** Creates the centered x-axis title beneath the plot. */
    #createXAxisTitle(plot, label) {
        const text = document.createElementNS(SVG_NAMESPACE, "text");

        text.setAttribute("class", "graph-axis__title graph-axis__title--x");
        text.setAttribute("x", String((plot.left + plot.right) / 2));
        text.setAttribute("y", String(plot.bottom + 30));
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "hanging");
        text.textContent = String(label);

        return text;
    }

    /** Creates the rotated y-axis title beside the plot. */
    #createYAxisTitle(plot, label) {
        const text = document.createElementNS(SVG_NAMESPACE, "text");

        const x = plot.left - 36;
        const y = (plot.top + plot.bottom) / 2;

        text.setAttribute("class", "graph-axis__title graph-axis__title--y");
        text.setAttribute("x", String(x));
        text.setAttribute("y", String(y));
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "middle");
        text.setAttribute("transform", `rotate(-90 ${x} ${y})`);
        text.textContent = String(label);

        return text;
    }

    /** Creates the renderer-owned SVG group. */
    #createRootGroup() {
        const group = document.createElementNS(SVG_NAMESPACE, "g");

        group.setAttribute("class", "graph-axes");
        this.#svg.prepend(group);

        return group;
    }

    /** Removes previously rendered axis content. */
    #clearRootGroup() {
        this.#rootGroup.replaceChildren();
    }

    /** Creates one horizontal grid line across the plot area. */
    #createHorizontalGridLine(plot, y) {
        const line = document.createElementNS(SVG_NAMESPACE, "line");

        line.setAttribute("class", "graph-grid__line graph-grid__line--horizontal");
        line.setAttribute("x1", String(plot.left));
        line.setAttribute("x2", String(plot.right));
        line.setAttribute("y1", String(y));
        line.setAttribute("y2", String(y));

        return line;
    }

    /** Creates one x-axis tick mark at the bottom edge of the plot. */
    #createXTickMark(plot, x) {
        const line = document.createElementNS(SVG_NAMESPACE, "line");

        line.setAttribute("class", "graph-axis__tick graph-axis__tick--x");
        line.setAttribute("x1", String(x));
        line.setAttribute("x2", String(x));
        line.setAttribute("y1", String(plot.bottom));
        line.setAttribute("y2", String(plot.bottom + 4));

        return line;
    }

    /** Creates one x-axis tick label beneath the plot. */
    #createXTickLabel(plot, x, label) {
        const text = document.createElementNS(SVG_NAMESPACE, "text");

        text.setAttribute("class", "graph-axis__label graph-axis__label--x");
        text.setAttribute("x", String(x));
        text.setAttribute("y", String(plot.bottom + 8));
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "hanging");
        text.textContent = String(label);

        return text;
    }

    /** Creates one y-axis tick mark at the left edge of the plot. */
    #createYTickMark(plot, y) {
        const line = document.createElementNS(SVG_NAMESPACE, "line");

        line.setAttribute("class", "graph-axis__tick graph-axis__tick--y");
        line.setAttribute("x1", String(plot.left - 4));
        line.setAttribute("x2", String(plot.left));
        line.setAttribute("y1", String(y));
        line.setAttribute("y2", String(y));

        return line;
    }

    /** Creates one y-axis tick label beside the plot. */
    #createYTickLabel(plot, y, label) {
        const text = document.createElementNS(SVG_NAMESPACE, "text");

        text.setAttribute("class", "graph-axis__label graph-axis__label--y");
        text.setAttribute("x", String(plot.left - 8));
        text.setAttribute("y", String(y));
        text.setAttribute("text-anchor", "end");
        text.setAttribute("dominant-baseline", "middle");
        text.textContent = String(label);

        return text;
    }

    /** Creates the vertical y-axis baseline at the right plot edge. */
    #createRightYAxisLine(plot) {
        const line = document.createElementNS(SVG_NAMESPACE, "line");

        line.setAttribute("class", "graph-axis__line graph-axis__line--y");
        line.setAttribute("x1", String(plot.right));
        line.setAttribute("x2", String(plot.right));
        line.setAttribute("y1", String(plot.top));
        line.setAttribute("y2", String(plot.bottom));

        return line;
    }

    /** Creates the rotated y-axis title beside the right plot edge. */
    #createRightYAxisTitle(plot, label) {
        const text = document.createElementNS(SVG_NAMESPACE, "text");

        const x = plot.right + 36;
        const y = (plot.top + plot.bottom) / 2;

        text.setAttribute("class", "graph-axis__title graph-axis__title--y");
        text.setAttribute("x", String(x));
        text.setAttribute("y", String(y));
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "middle");
        text.setAttribute("transform", `rotate(90 ${x} ${y})`);
        text.textContent = String(label);

        return text;
    }

    /** Creates one y-axis tick mark at the right plot edge. */
    #createRightYTickMark(plot, y) {
        const line = document.createElementNS(SVG_NAMESPACE, "line");

        line.setAttribute("class", "graph-axis__tick graph-axis__tick--y");
        line.setAttribute("x1", String(plot.right));
        line.setAttribute("x2", String(plot.right + 4));
        line.setAttribute("y1", String(y));
        line.setAttribute("y2", String(y));

        return line;
    }

    /** Creates one y-axis tick label beside the right plot edge. */
    #createRightYTickLabel(plot, y, label) {
        const text = document.createElementNS(SVG_NAMESPACE, "text");

        text.setAttribute("class", "graph-axis__label graph-axis__label--y");
        text.setAttribute("x", String(plot.right + 8));
        text.setAttribute("y", String(y));
        text.setAttribute("text-anchor", "start");
        text.setAttribute("dominant-baseline", "middle");
        text.textContent = String(label);

        return text;
    }
}
