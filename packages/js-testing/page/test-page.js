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

    if (!normalizedPath.endsWith("/tests")) {
        throw new Error(
            `Test page route must end with "/tests": "${pathname}".`
        );
    }

    return normalizedPath.slice(0, -"/tests".length);
}


main().catch(error => {
    console.error("Test page initialization failed.", error);
});
