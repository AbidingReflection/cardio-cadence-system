import { getTests, runTests } from "/packages/js-testing/framework/test-framework.js";

import {
    renderTestSuites,
    renderTestResults,
    renderSummary,
    renderSuiteSummary,
} from "/packages/js-testing/page/test-renderer.js";

await import("./suites/renderers/block-calibration-feedback.test.js");
await import("/packages/protocol-core/tests/calibration-applicability.test.js");
await import("./suites/renderers/block-machine-feedback.test.js");
await import("./suites/renderers/protocol-status-context.test.js");
await import("/packages/ui/tests/status-icons.test.js");
await import("./suites/interactions/protocol-structure-events.test.js");
await import("./suites/interactions/protocol-structure-keyboard-events.test.js");

/* Protocol Designer — loading */
await import("./suites/loading/app-loading.test.js");

/* Protocol Designer — models */
await import("./suites/models/activity-type.test.js");
await import("./suites/models/calibration-profile.test.js");
await import("./suites/models/machine-profile.test.js");
await import("./suites/models/protocol-model.test.js");

/* Protocol Designer — state */
await import("./suites/state/editor-state.test.js");

/* Protocol Designer — editor */
await import("./suites/editor/block-draft-validation.test.js");
await import("./suites/editor/block-editor-controller.test.js");

/* Protocol Designer — interactions */
await import("./suites/interactions/protocol-manage-keyboard-events.test.js");
await import("./suites/interactions/protocol-selection-events.test.js");
await import("./suites/interactions/protocol-setup-events.test.js");
await import("./suites/interactions/protocol-structure-keyboard-events.test.js");

/* Protocol Designer — controllers */
await import("./suites/controllers/protocol-structure-controller.test.js");

/* Protocol Designer — renderers */
await import("./suites/renderers/protocol-graph-renderer.test.js");
await import("./suites/renderers/protocol-structure-renderers.test.js");

/* Shared — protocol core */
await import("/packages/protocol-core/tests/machine-compatibility.test.js");
await import("/packages/protocol-core/tests/progression-mapping.test.js");
await import("/packages/protocol-core/tests/progression-types.test.js");
await import("/packages/protocol-core/tests/protocol-normalization.test.js");
await import("/packages/protocol-core/tests/protocol-validation.test.js");
await import("/packages/protocol-core/tests/stepped-targets.test.js");

/* Shared — protocol expander */
await import("/packages/protocol-expander/tests/protocol-expander.test.js");
await import("/packages/protocol-expander/tests/protocol-graph-context.test.js");
await import("/packages/protocol-expander/tests/protocol-variable-series.test.js");

/* Shared — graph */
await import("/packages/graph/tests/graph-layout.test.js");
await import("/packages/graph/tests/graph-sampling-resolution.test.js");
await import("/packages/graph/tests/graph-series-sampler.test.js");
await import("/packages/graph/tests/graph-ticks.test.js");
await import("/packages/graph/tests/svg-graph-axes-renderer.test.js");
await import("/packages/graph/tests/svg-graph-renderer.test.js");
await import("/packages/graph/tests/svg-graph-structure-renderer.test.js");
await import("/packages/graph/tests/svg-point-precision.test.js");

/* Shared — test framework */
await import("/packages/js-testing/tests/test-framework.test.js");

renderTestSuites(getTests());

const results = await runTests();

renderTestResults(results);
renderSummary(results);
renderSuiteSummary(results);
