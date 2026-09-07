/**
 * Boots the shared browser test page for the application identified by the URL.
 */

/** Starts the test page for the current application route. */
async function main() {
    const appPath = getAppPath(window.location.pathname);
    const runnerUrl = `${appPath}/js/tests/test-runner.js`;

    await import(runnerUrl);
}

/** Returns the application path from a test-page URL. */
function getAppPath(pathname) {
    const normalizedPath = pathname.replace(/\/+$/, "");
    const testSegment = "/tests";

    const testIndex = normalizedPath.indexOf(testSegment);

    if (testIndex === -1) {
        throw new Error(
            `Test page route must contain "/tests": "${pathname}".`
        );
    }

    const suffix = normalizedPath.slice(
        testIndex + testSegment.length
    );

    if (suffix && !/^\/[^/]+$/.test(suffix)) {
        throw new Error(
            `Test page route may contain at most one test target: "${pathname}".`
        );
    }

    return normalizedPath.slice(0, testIndex);
}

main().catch((error) => {
    console.error("Test page initialization failed.", error);
});
