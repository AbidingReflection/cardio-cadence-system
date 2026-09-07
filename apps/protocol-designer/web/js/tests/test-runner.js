import { getTests, runTests } from "/packages/js-testing/framework/test-framework.js";

import {
    renderTestSuites,
    renderTestResults,
    renderSummary,
    renderSuiteSummary,
} from "/packages/js-testing/page/test-renderer.js";


await loadTestModules();

renderTestSuites(getTests());

const results = await runTests();

renderTestResults(results);
renderSummary(results);
renderSuiteSummary(results);


/** Loads all test modules configured for the current test-page route. */
async function loadTestModules() {
    const manifestUrl = getManifestUrl(window.location.pathname);

    const response = await fetch(manifestUrl, {
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(
            `Failed to load test manifest: ${response.status} ${response.statusText}`
        );
    }

    const manifest = await response.json();

    if (!Array.isArray(manifest.modules)) {
        throw new Error(
            `Test manifest must contain a "modules" array: "${manifestUrl}".`
        );
    }

    for (const moduleUrl of manifest.modules) {
        await import(moduleUrl);
    }
}


/** Returns the manifest URL corresponding to the current test-page route. */
function getManifestUrl(pathname) {
    const normalizedPath = pathname.replace(/\/+$/, "");

    return `${normalizedPath}/manifest.json`;
}
