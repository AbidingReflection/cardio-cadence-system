import { getTests, runTests } from "/packages/js-testing/framework/test-framework.js";
import { loadTestModules } from "/packages/js-testing/framework/test-loader.js";

import {
    renderTestSuites,
    renderTestResults,
    renderSummary,
    renderSuiteSummary,
} from "/packages/js-testing/page/test-renderer.js";

const manifestUrl = getManifestUrl(window.location.pathname);

const response = await fetch(manifestUrl, {
    cache: "no-store",
});

if (!response.ok) {
    throw new Error(`Failed to load test manifest: ${response.status} ${response.statusText}`);
}

const manifest = await response.json();

if (!Array.isArray(manifest.modules)) {
    throw new Error(`Test manifest must contain a "modules" array: "${manifestUrl}".`);
}

const loadFailures = await loadTestModules(manifest.modules);
for (const failure of loadFailures) {
    console.error(`FAIL: ${failure.suite} - module load`, failure.message);
}

const tests = getTests();

renderTestSuites([...tests, ...loadFailures]);

const results = [...loadFailures, ...(await runTests())];

renderTestResults(results);
renderSummary(results);
renderSuiteSummary(results);

function getSuiteName(moduleUrl) {
    const filename = moduleUrl.split("/").pop();

    return filename.replace(/\.test\.js$/, "");
}

/** Returns the manifest URL corresponding to the current test-page route. */
function getManifestUrl(pathname) {
    const normalizedPath = pathname.replace(/\/+$/, "");

    return `${normalizedPath}/manifest.json`;
}
