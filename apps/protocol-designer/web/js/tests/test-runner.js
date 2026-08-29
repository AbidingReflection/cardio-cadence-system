import { getTests, runTests } from "/packages/js-testing/framework/test-framework.js";

import {
    renderTestSuites,
    renderTestResults,
    renderSummary,
    renderSuiteSummary,
} from "/packages/js-testing/page/test-renderer.js";

await import("/packages/graph/tests/svg-point-precision.test.js");
await import("/packages/graph/tests/svg-graph-structure-renderer.test.js");
await import("/packages/graph/tests/svg-graph-axes-renderer.test.js");
await import("/packages/graph/tests/graph-ticks.test.js");
await import("./suites/protocol-graph-renderer.test.js");
await import("/packages/graph/tests/svg-graph-renderer.test.js");
await import("/packages/graph/tests/graph-layout.test.js");
await import("/packages/protocol-expander/tests/protocol-graph-context.test.js");
await import("/packages/graph/tests/graph-sampling-resolution.test.js");
await import("/packages/graph/tests/graph-series-sampler.test.js");
await import("/packages/protocol-expander/tests/protocol-variable-series.test.js");
await import("/packages/protocol-core/tests/progression-mapping.test.js");
await import("/packages/protocol-expander/tests/protocol-expander.test.js");
await import("/packages/protocol-core/tests/stepped-targets.test.js");
await import("./suites/protocol-structure-controller.test.js");
await import("./suites/block-editor-controller.test.js");
await import("./suites/block-draft-validation.test.js");
await import("./suites/editor-state.test.js");
await import("/packages/js-testing/tests/test-framework.test.js");
await import("./suites/protocol-model.test.js");
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
renderSuiteSummary(results);
