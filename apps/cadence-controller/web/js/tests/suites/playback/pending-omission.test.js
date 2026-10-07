import {
    assertDeepEqual,
    assertEqual,
    test,
    assertThrows,
} from "/packages/js-testing/framework/test-framework.js";

import { getPendingOmissionRange } from "../../../playback/pending-omission.js";

test("pending-omission", "returns no range without a pending action", () => {
    assertEqual(getPendingOmissionRange(null, 120_000), null);
});

test("pending-omission", "returns skipped interval for pending phase skip", () => {
    assertDeepEqual(
        getPendingOmissionRange(
            {
                action: "skip-phase",
                triggerTimeMs: 40_000,
                destinationTimeMs: 70_000,
            },
            120_000,
        ),
        {
            startTimeMs: 40_000,
            endTimeMs: 70_000,
        },
    );
});

test("pending-omission", "returns remaining protocol interval for pending workout end", () => {
    assertDeepEqual(
        getPendingOmissionRange(
            {
                action: "end-workout",
                triggerTimeMs: 40_000,
            },
            120_000,
        ),
        {
            startTimeMs: 40_000,
            endTimeMs: 120_000,
        },
    );
});

test("pending-omission", "rejects unsupported pending action", () => {
    assertThrows(() =>
        getPendingOmissionRange(
            {
                action: "teleport",
                triggerTimeMs: 40_000,
            },
            120_000,
        ),
    );
});
