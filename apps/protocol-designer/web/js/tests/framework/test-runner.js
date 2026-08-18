import {
    getTests,
    runTests,
} from "./test-framework.js";

import {
    renderTestSuites,
    renderTestResults,
    renderSummary,
} from "./test-renderer.js";


// await import("./test-framework.test.js");
await import("../suites/activity-type.test.js");
await import("../suites/machine-profile.test.js");

renderTestSuites(getTests());

const results = await runTests();

renderTestResults(results);
renderSummary(results);
