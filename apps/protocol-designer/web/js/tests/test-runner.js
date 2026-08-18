import {
    getTests,
    runTests,
} from "/packages/js-testing/test-framework.js";

import {
    renderTestSuites,
    renderTestResults,
    renderSummary,
} from "/packages/js-testing/test-renderer.js";


await import("/packages/js-testing/tests/test-framework.test.js");
await import("./suites/activity-type.test.js");
await import("./suites/machine-profile.test.js");

renderTestSuites(getTests());

const results = await runTests();

renderTestResults(results);
renderSummary(results);
