import { GraphLayout } from "/packages/graph/graph-layout.js";
import {
    getLinearTicks,
    getTimeTicks,
    getXAxisTickTargetCount,
    getYAxisTickTargetCount,
} from "/packages/graph/graph-ticks.js";
import { SvgGraphAxesRenderer } from "/packages/graph/svg-graph-axes-renderer.js";
import { SvgGraphRenderer } from "/packages/graph/svg-graph-renderer.js";

import { roundSvgPoints } from "/packages/graph/svg-point-precision.js";

const SVG_POINT_PRECISION = 2;
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/** Renders planned calorie rate against one or more heart-rate responses. */
export function renderWorkoutAnalysisGraph(container, { calorieRateSamples, heartRateSeries }) {
    const widthPx = container.clientWidth;
    const heightPx = container.clientHeight;

    const startTimeMs = 0;

    const endTimeMs = Math.max(
        calorieRateSamples.at(-1)?.timeMs ?? 0,
        ...heartRateSeries.map(({ samples }) => samples.at(-1)?.timeMs ?? 0),
    );

    const calorieRateMin = 0;
    const calorieRateMax = 30;

    const heartRateMin = 60;
    const heartRateMax = 180;

    const padding = {
        top: 24,
        right: 64,
        bottom: 48,
        left: 64,
    };

    const svg = document.createElementNS(SVG_NAMESPACE, "svg");
    svg.classList.add("graph-svg");
    svg.setAttribute("viewBox", `0 0 ${widthPx} ${heightPx}`);

    container.replaceChildren(svg);

    const calorieLayout = new GraphLayout({
        startTimeMs,
        endTimeMs,
        valueMin: calorieRateMin,
        valueMax: calorieRateMax,
        widthPx,
        heightPx,
        padding,
    });

    const heartRateLayout = new GraphLayout({
        startTimeMs,
        endTimeMs,
        valueMin: heartRateMin,
        valueMax: heartRateMax,
        widthPx,
        heightPx,
        padding,
    });

    const xTicks = getTimeTicks({
        startTimeMs,
        endTimeMs,
        targetCount: getXAxisTickTargetCount(calorieLayout.plot.width),
    });

    const calorieRateTicks = getLinearTicks({
        min: calorieRateMin,
        max: calorieRateMax,
        targetCount: getYAxisTickTargetCount(calorieLayout.plot.height),
    });

    const heartRateTicks = getLinearTicks({
        min: heartRateMin,
        max: heartRateMax,
        targetCount: getYAxisTickTargetCount(heartRateLayout.plot.height),
    });

    const axesRenderer = new SvgGraphAxesRenderer(svg);

    axesRenderer.render({
        layout: calorieLayout,
        xTicks,
        yTicks: calorieRateTicks,
        xAxisLabel: "Time",
        yAxisLabel: "Calorie Rate (kcal/min)",
        formatXTick: (timeMs) => `${Math.round(timeMs / 60_000)}m`,
        formatYTick: String,
        rightYAxis: {
            layout: heartRateLayout,
            ticks: heartRateTicks,
            label: "Heart Rate (bpm)",
            formatTick: String,
        },
    });

    const calorieRatePoints = roundSvgPoints(
        calorieRateSamples.map(({ timeMs, value }) => ({
            x: calorieLayout.xAtTime(timeMs),
            y: calorieLayout.yAtValue(value),
        })),
        SVG_POINT_PRECISION,
    );

    heartRateSeries.forEach(({ id, samples }, index) => {
        const points = roundSvgPoints(
            samples.map(({ timeMs, value }) => ({
                x: heartRateLayout.xAtTime(timeMs),
                y: heartRateLayout.yAtValue(value),
            })),
            SVG_POINT_PRECISION,
        );

        const renderer = new SvgGraphRenderer(svg);

        renderer.render({
            points,
            className: [
                "graph-series__line",
                "graph-series__line--heart-rate",
                `graph-series__line--heart-rate-${index + 1}`,
                `graph-series__line--workout-${id}`,
            ].join(" "),
        });
    });

    const calorieRateRenderer = new SvgGraphRenderer(svg);

    calorieRateRenderer.render({
        points: calorieRatePoints,
        className: "graph-series__line graph-series__line--calorie-rate",
    });
}
