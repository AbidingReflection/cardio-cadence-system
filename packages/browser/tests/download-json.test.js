import {
    assertDeepEqual,
    assertEqual,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { downloadJson } from "../download-json.js";

/** Creates browser API fakes for JSON download tests. */
function createHarness() {
    const createdBlobs = [];
    const revokedUrls = [];
    const clickedDownloads = [];

    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const originalCreateElement = document.createElement.bind(document);

    URL.createObjectURL = (blob) => {
        createdBlobs.push(blob);
        return "blob:test-url";
    };

    URL.revokeObjectURL = (url) => {
        revokedUrls.push(url);
    };

    document.createElement = (tagName) => {
        const element = originalCreateElement(tagName);

        if (tagName === "a") {
            element.click = () => {
                clickedDownloads.push({
                    href: element.href,
                    download: element.download,
                });
            };
        }

        return element;
    };

    return {
        createdBlobs,
        revokedUrls,
        clickedDownloads,

        /** Restores replaced browser APIs. */
        restore() {
            URL.createObjectURL = originalCreateObjectURL;
            URL.revokeObjectURL = originalRevokeObjectURL;
            document.createElement = originalCreateElement;
        },
    };
}

test("download-json", "downloads formatted JSON data", async () => {
    const harness = createHarness();

    try {
        downloadJson(
            {
                id: "test-data",
                values: [1, 2, 3],
            },
            "test.json",
        );

        assertEqual(harness.createdBlobs.length, 1);

        const blob = harness.createdBlobs[0];

        assertEqual(blob.type, "application/json");

        assertDeepEqual(JSON.parse(await blob.text()), {
            id: "test-data",
            values: [1, 2, 3],
        });
    } finally {
        harness.restore();
    }
});

test("download-json", "uses the supplied download filename", () => {
    const harness = createHarness();

    try {
        downloadJson({ id: "test-data" }, "custom-name.json");

        assertEqual(harness.clickedDownloads.length, 1);
        assertEqual(harness.clickedDownloads[0].href, "blob:test-url");
        assertEqual(harness.clickedDownloads[0].download, "custom-name.json");
    } finally {
        harness.restore();
    }
});

test("download-json", "revokes the object URL after download", () => {
    const harness = createHarness();

    try {
        downloadJson({ id: "test-data" }, "test.json");

        assertDeepEqual(harness.revokedUrls, ["blob:test-url"]);
    } finally {
        harness.restore();
    }
});
