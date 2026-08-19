import {
    getTests,
    runTests,
} from "/packages/js-testing/test-framework.js";

import {
    renderTestSuites,
    renderTestResults,
    renderSummary,
} from "/packages/js-testing/test-renderer.js";


// await import("/packages/js-testing/tests/test-framework.test.js");
await import("/packages/protocol-core/tests/protocol-normalization.test.js");
await import("/packages/protocol-core/tests/protocol-validation.test.js");
await import("./suites/activity-type.test.js");
await import("./suites/machine-profile.test.js");
await import("./suites/app-loading.test.js");
await import("/packages/protocol-core/tests/progression-types.test.js");

renderTestSuites(getTests());

const results = await runTests();

renderTestResults(results);
renderSummary(results);
