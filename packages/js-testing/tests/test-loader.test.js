import {
    assert,
    assertDeepEqual,
    assertEqual,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { loadTestModules } from "/packages/js-testing/framework/test-loader.js";

test("test-loader", "loads a successful test module without failures", async () => {
    delete globalThis.__testLoaderSuccessfulModuleLoaded;

    const failures = await loadTestModules([
        "/packages/js-testing/tests/fixtures/successful-module.js",
    ]);

    assertEqual(failures.length, 0);
    assert(globalThis.__testLoaderSuccessfulModuleLoaded);
});

test("test-loader", "returns a module-load failure when a module throws", async () => {
    const failures = await loadTestModules([
        "/packages/js-testing/tests/fixtures/failing-module.js",
    ]);

    assertEqual(failures.length, 1);

    assertDeepEqual(failures[0], {
        suite: "failing-module.js",
        name: "loads test module",
        status: "FAILED",
        message: "Intentional module load failure.",
        type: "MODULE_LOAD",
    });
});

test("test-loader", "continues loading modules after a failure", async () => {
    delete globalThis.__testLoaderLaterModuleLoaded;

    const failures = await loadTestModules([
        "/packages/js-testing/tests/fixtures/failing-module.js",
        "/packages/js-testing/tests/fixtures/later-module.js",
    ]);

    assertEqual(failures.length, 1);
    assert(globalThis.__testLoaderLaterModuleLoaded);
});
