import { calorieRateSamples, heartRateSamples } from "./sample-data.js";
import { renderWorkoutAnalysisGraph } from "./workout-analysis-graph.js";

const graphContainer = document.querySelector("#analysis-graph");

renderWorkoutAnalysisGraph(graphContainer, calorieRateSamples, heartRateSamples);
