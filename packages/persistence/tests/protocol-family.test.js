import {
    test,
    assertDeepEqual,
    assertThrows,
} from "/packages/js-testing/framework/test-framework.js";

import { createProtocolFamily, validateProtocolFamily } from "../records/protocol-family.js";

test("protocol-family", "creates a valid protocol family", () => {
    const family = createProtocolFamily({
        id: "family-1",
        createdAtUnixMs: 1_789_360_000_000,
        displayName: "Threshold Intervals",
    });

    assertDeepEqual(family, {
        id: "family-1",
        createdAtUnixMs: 1_789_360_000_000,
        displayName: "Threshold Intervals",
        archived: false,
    });
});

test("protocol-family", "accepts an archived protocol family", () => {
    validateProtocolFamily({
        id: "family-1",
        createdAtUnixMs: 1_789_360_000_000,
        displayName: "Threshold Intervals",
        archived: true,
    });
});

test("protocol-family", "rejects a missing protocol family ID", () => {
    assertThrows(
        () =>
            validateProtocolFamily({
                id: "",
                createdAtUnixMs: 1_789_360_000_000,
                displayName: "Threshold Intervals",
                archived: false,
            }),
        /id/,
    );
});

test("protocol-family", "rejects an invalid creation timestamp", () => {
    assertThrows(
        () =>
            validateProtocolFamily({
                id: "family-1",
                createdAtUnixMs: NaN,
                displayName: "Threshold Intervals",
                archived: false,
            }),
        /createdAtUnixMs/,
    );
});

test("protocol-family", "rejects a blank display name", () => {
    assertThrows(
        () =>
            validateProtocolFamily({
                id: "family-1",
                createdAtUnixMs: 1_789_360_000_000,
                displayName: "   ",
                archived: false,
            }),
        /displayName/,
    );
});

test("protocol-family", "rejects a non-boolean archived value", () => {
    assertThrows(
        () =>
            validateProtocolFamily({
                id: "family-1",
                createdAtUnixMs: 1_789_360_000_000,
                displayName: "Threshold Intervals",
                archived: "false",
            }),
        /archived/,
    );
});
