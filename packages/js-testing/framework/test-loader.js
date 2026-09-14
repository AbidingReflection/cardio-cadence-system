/** Loads test modules and returns any module-load failures. */
export async function loadTestModules(moduleUrls) {
    const failures = [];

    for (const moduleUrl of moduleUrls) {
        try {
            await import(moduleUrl);
        } catch (error) {
            failures.push({
                suite: getSuiteName(moduleUrl),
                name: "loads test module",
                status: "FAILED",
                message: error instanceof Error ? error.message : String(error),
                type: "MODULE_LOAD",
            });
        }
    }

    return failures;
}

/** Returns the suite name represented by a test-module URL. */
function getSuiteName(moduleUrl) {
    const filename = moduleUrl.split("/").pop();

    return filename.replace(/\.test\.js$/, "");
}
