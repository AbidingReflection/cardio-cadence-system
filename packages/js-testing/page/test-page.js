/**
 * Boots the shared browser test page.
 */

import { initializeSuiteSummarySorting } from "./suite-summary-sort.js";

/** Starts the shared test page. */
async function main() {
    initializeSuiteSummarySorting();

    await import("./test-runner.js");
}

main().catch((error) => {
    console.error("Test page initialization failed.", error);
});
