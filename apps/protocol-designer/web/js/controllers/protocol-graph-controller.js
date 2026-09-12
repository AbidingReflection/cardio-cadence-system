import { ProtocolGraphRenderer } from "../renderers/protocol-graph-renderer.js";
import { resolveProtocolGraphConfigs } from "../renderers/protocol-graph-config.js";

import { CalorieRateSeries } from "/packages/protocol-expander/calorie-rate-series.js";
import { calculateProtocolCalories } from "/packages/protocol-expander/protocol-calorie-analysis.js";
import { CumulativeCalorieSeries } from "/packages/protocol-expander/cumulative-calorie-series.js";

/** Coordinates Protocol Designer graph rendering and pane state. */
export class ProtocolGraphController {
    #graphPaneController;
    #primaryGraphRenderer;
    #loadGraphRenderer;
    #calorieRateGraphRenderer;
    #cumulativeCaloriesGraphRenderer;

    constructor({
        graphPaneController,
        cadenceContainer,
        loadContainer,
        calorieRateContainer,
        cumulativeCaloriesContainer,
    }) {
        this.#graphPaneController = graphPaneController;

        this.#primaryGraphRenderer = new ProtocolGraphRenderer({
            container: cadenceContainer,
        });

        this.#loadGraphRenderer = new ProtocolGraphRenderer({
            container: loadContainer,
        });

        this.#calorieRateGraphRenderer = new ProtocolGraphRenderer({
            container: calorieRateContainer,
        });

        this.#cumulativeCaloriesGraphRenderer = new ProtocolGraphRenderer({
            container: cumulativeCaloriesContainer,
        });
    }

    /** Updates graph selection styling without recomputing graph data. */
    updateSelection(selection) {
        if (this.#graphPaneController.isExpanded("cadence")) {
            this.#primaryGraphRenderer.updateSelection(selection);
        }

        if (this.#graphPaneController.isExpanded("load")) {
            this.#loadGraphRenderer.updateSelection(selection);
        }

        if (this.#graphPaneController.isExpanded("calorie-rate")) {
            this.#calorieRateGraphRenderer.updateSelection(selection);
        }

        if (this.#graphPaneController.isExpanded("cumulative-calories")) {
            this.#cumulativeCaloriesGraphRenderer.updateSelection(selection);
        }
    }

    /** Renders protocol-backed graphs from committed protocol, selection, and setup context. */
    render(protocol, selection, { activityType, machineProfile, calibrationProfile }) {
        const graphConfigs = resolveProtocolGraphConfigs(activityType, machineProfile);

        if (this.#graphPaneController.isExpanded("cadence")) {
            this.#primaryGraphRenderer.render(protocol, selection, graphConfigs.primary);
        }

        if (this.#graphPaneController.isExpanded("load")) {
            this.#loadGraphRenderer.render(protocol, selection, graphConfigs.load);
        }

        const hasCalibration = calibrationProfile !== undefined;

        if (this.#graphPaneController.isExpanded("calorie-rate")) {
            if (!hasCalibration) {
                this.#calorieRateGraphRenderer.renderUnavailable(
                    "Select a calibration profile to preview calorie rate",
                    {
                        label: "Calorie Rate",
                        unit: "kcal/min",
                        valueMin: 0,
                        valueMax: 30,
                    },
                );
            } else {
                this.#calorieRateGraphRenderer.render(protocol, selection, {
                    createSeries: (expander) => new CalorieRateSeries(expander, calibrationProfile),
                    transformValue: (value) => value * 60,
                    label: "Calorie Rate",
                    unit: "kcal/min",
                    valueMin: 0,
                    valueMax: 30,
                });
            }
        }

        if (this.#graphPaneController.isExpanded("cumulative-calories")) {
            if (!hasCalibration) {
                this.#cumulativeCaloriesGraphRenderer.renderUnavailable(
                    "Select a calibration profile to preview cumulative calories",
                    {
                        label: "Cumulative Calories",
                        unit: "kcal",
                        valueMin: 0,
                        valueMax: 1,
                    },
                );
            } else {
                const totalCalories = calculateProtocolCalories(protocol, calibrationProfile);

                this.#cumulativeCaloriesGraphRenderer.render(protocol, selection, {
                    createSeries: (expander) =>
                        new CumulativeCalorieSeries(expander, calibrationProfile),
                    label: "Cumulative Calories",
                    unit: "kcal",
                    valueMin: 0,
                    valueMax: totalCalories,
                });
            }
        }
    }
}
