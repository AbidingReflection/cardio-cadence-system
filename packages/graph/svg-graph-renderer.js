/**
 * SvgGraphRenderer responsibilities:
 * - Render laid-out graph series geometry into an existing SVG element.
 * - Split drawable runs across undefined samples.
 * - Preserve exact discontinuities represented by duplicate coordinates.
 * - Replace only renderer-owned SVG content on rerender.
 */

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/** Renders laid-out graph series geometry into SVG paths. */
export class SvgGraphRenderer {
    #svg;
    #rootGroup;

    /** Creates an SVG graph renderer for an existing SVG element. */
    constructor(svgElement) {
        this.#svg = svgElement;
        this.#rootGroup = this.#createRootGroup();
    }

    /** Renders laid-out graph points into renderer-owned SVG content. */
    render({ points, className = "graph-series__line" }) {
        if (!Array.isArray(points)) {
            throw new TypeError("SVG graph renderer points must be an array.");
        }

        if (typeof className !== "string") {
            throw new TypeError("SVG graph renderer className must be a string.");
        }

        this.#clearRootGroup();

        const runs = this.#splitDrawableRuns(points);

        for (const run of runs) {
            this.#rootGroup.append(this.#createSeriesPath(run, className));
        }
    }

    /** Creates the renderer-owned SVG group. */
    #createRootGroup() {
        const group = document.createElementNS(SVG_NAMESPACE, "g");

        group.setAttribute("class", "graph-renderer");
        this.#svg.append(group);

        return group;
    }

    /** Removes previously rendered graph content. */
    #clearRootGroup() {
        this.#rootGroup.replaceChildren();
    }

    /** Splits points into drawable runs separated by undefined values. */
    #splitDrawableRuns(points) {
        const runs = [];
        let currentRun = [];

        for (const point of points) {
            if (point.y === undefined) {
                if (currentRun.length > 0) {
                    runs.push(currentRun);
                    currentRun = [];
                }

                continue;
            }

            currentRun.push(point);
        }

        if (currentRun.length > 0) {
            runs.push(currentRun);
        }

        return runs;
    }

    /** Creates one SVG path for a drawable point run. */
    #createSeriesPath(points, className) {
        const path = document.createElementNS(SVG_NAMESPACE, "path");

        path.setAttribute("class", className);
        path.setAttribute("d", SvgGraphRenderer.#buildPathData(points));

        return path;
    }

    /** Builds SVG path data for one ordered drawable point run. */
    static #buildPathData(points) {
        return points
            .map(({ x, y }, index) => {
                const command = index === 0 ? "M" : "L";

                return `${command} ${x} ${y}`;
            })
            .join(" ");
    }
}
