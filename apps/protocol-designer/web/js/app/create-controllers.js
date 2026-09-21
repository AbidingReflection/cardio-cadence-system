/** Creates Protocol Designer UI controllers. */

import { GraphPaneController } from "../controllers/graph-pane-controller.js";
import { ProtocolGraphController } from "../controllers/protocol-graph-controller.js";

/** Creates graph-related controllers from application elements. */
export function createControllers({ elements }) {
    const graphPaneController = new GraphPaneController([
        {
            id: "cadence",
            pane: elements.graphs.cadence.pane,
            toggleButton: elements.graphs.cadence.toggleButton,
        },
        {
            id: "load",
            pane: elements.graphs.load.pane,
            toggleButton: elements.graphs.load.toggleButton,
        },
        {
            id: "calorie-rate",
            pane: elements.graphs.calorieRate.pane,
            toggleButton: elements.graphs.calorieRate.toggleButton,
        },
        {
            id: "cumulative-calories",
            pane: elements.graphs.cumulativeCalories.pane,
            toggleButton: elements.graphs.cumulativeCalories.toggleButton,
        },
    ]);

    const protocolGraphController = new ProtocolGraphController({
        graphPaneController,
        cadenceContainer: elements.graphs.cadence.container,
        loadContainer: elements.graphs.load.container,
        calorieRateContainer: elements.graphs.calorieRate.container,
        cumulativeCaloriesContainer: elements.graphs.cumulativeCalories.container,
    });

    return {
        graphPaneController,
        protocolGraphController,
    };
}
