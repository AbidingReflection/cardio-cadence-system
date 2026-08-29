/**
 * SvgGraphAxesRenderer responsibilities:
 * - Render graph axes and grid presentation into an existing SVG element.
 * - Map semantic tick values through an existing graph layout.
 * - Own and replace only its axis-related SVG content.
 * - Keep tick generation and graph-domain policy outside SVG rendering.
 */

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/** Renders graph axes, grid lines, and tick labels into an existing SVG element. */
export class SvgGraphAxesRenderer {
    #svg;
    #rootGroup;

    /** Creates an axis renderer for an existing SVG element. */
    constructor(svgElement) {
        this.#svg = svgElement;
        this.#rootGroup = this.#createRootGroup();
    }

    /** Renders y-axis ticks and horizontal grid lines for a graph layout. */
    render({ layout, yTicks, formatYTick = String }) {
        if (!Array.isArray(yTicks)) {
            throw new TypeError("SvgGraphAxesRenderer yTicks must be an array.");
        }

        if (typeof formatYTick !== "function") {
            throw new TypeError("SvgGraphAxesRenderer formatYTick must be a function.");
        }

        this.#clearRootGroup();

        const plot = layout.plot;

        this.#rootGroup.append(this.#createYAxisLine(plot), this.#createXAxisLine(plot));

        for (const value of yTicks) {
            const y = layout.yAtValue(value);

            this.#rootGroup.append(
                this.#createHorizontalGridLine(plot, y),
                this.#createYTickMark(plot, y),
                this.#createYTickLabel(plot, y, formatYTick(value)),
            );
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
}
