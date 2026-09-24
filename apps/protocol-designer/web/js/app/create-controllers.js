/** Creates Protocol Designer UI controllers. */

import { GraphPaneController } from "../controllers/graph-pane-controller.js";
import { ProtocolGraphController } from "../controllers/protocol-graph-controller.js";
import { ProtocolNewController } from "../controllers/protocol-new-controller.js";

/** Creates Protocol Designer controllers from application dependencies. */
export function createControllers({ elements, protocolModel, editorState, protocolSessionState }) {
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

    const protocolNewController = new ProtocolNewController({
        protocolModel,
        editorState,
        protocolSessionState,
    });

    return {
        graphPaneController,
        protocolGraphController,
        protocolNewController,
    };
}
