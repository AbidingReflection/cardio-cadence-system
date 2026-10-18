import { ActivityType } from "/packages/protocol-core/models/activity-type.js";
import { MachineProfile } from "/packages/protocol-core/models/machine-profile.js";
import { CalibrationProfile } from "/packages/protocol-core/models/calibration-profile.js";

import { GraphSeriesSampler } from "/packages/graph/graph-series-sampler.js";

import { ProtocolExpander } from "/packages/protocol-expander/protocol-expander.js";
import { CalorieRateSeries } from "/packages/protocol-expander/calorie-rate-series.js";

import { renderWorkoutAnalysisGraph } from "./workout-analysis-graph.js";

const PROTOCOL_URL = "/data/true-elliptical-108-minute-session.json";

const WORKOUT_DATA = [
    {
        id: "2026-10-07",
        label: "Oct 7",
        url: "/data/hr_samples/2026-10-07-workout-hr.json",
    },
    // {
    //     id: "2026-09-10",
    //     label: "Sep 10",
    //     url: "/data/hr_samples/2026-09-10-workout-hr.json",
    // },
    // {
    //     id: "2026-09-11",
    //     label: "Sep 11",
    //     url: "/data/hr_samples/2026-09-11-workout-hr.json",
    // },
    // {
    //     id: "2026-09-14",
    //     label: "Sep 14",
    //     url: "/data/hr_samples/2026-09-14-workout-hr.json",
    // },
    // {
    //     id: "2026-09-15",
    //     label: "Sep 15",
    //     url: "/data/hr_samples/2026-09-15-workout-hr.json",
    // },
];

const SAMPLE_INTERVAL_MS = 5000;

const [protocolBundle, ...workoutDocuments] = await Promise.all([
    fetchJson(PROTOCOL_URL),
    ...WORKOUT_DATA.map(({ url }) => fetchJson(url)),
]);

const activityType = new ActivityType(protocolBundle.activityType);

const machineProfile = new MachineProfile(protocolBundle.machineProfile, activityType);

const calibrationProfile = new CalibrationProfile(
    protocolBundle.calibrationProfile,
    machineProfile,
);

const expander = new ProtocolExpander(protocolBundle.protocol);

const calorieRateSeries = new CalorieRateSeries(expander, calibrationProfile);

const calorieRateSampler = new GraphSeriesSampler(calorieRateSeries);

const calorieRateSamples = calorieRateSampler
    .sample({
        startTimeMs: 0,
        endTimeMs: expander.durationMs,
        sampleIntervalMs: SAMPLE_INTERVAL_MS,
    })
    .map(({ timeMs, value }) => ({
        timeMs,
        value: value * 60,
    }));

const heartRateSeries = WORKOUT_DATA.map(({ id, label }, index) => ({
    id,
    label,
    samples: workoutDocuments[index].heartRateSamples,
}));

const graphContainer = document.querySelector("#analysis-graph");

renderWorkoutAnalysisGraph(graphContainer, {
    calorieRateSamples,
    heartRateSeries,
});

/** Fetches and parses a JSON resource. */
async function fetchJson(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to load ${url}: ${response.status} ${response.statusText}`);
    }

    return response.json();
}
