import { assertDeepEqual, test } from "/packages/js-testing/framework/test-framework.js";

import { LoadAdjustmentTracker } from "../../../playback/load-adjustment-tracker.js";

/** Creates a deterministic load timeline fake from ordered segments. */
function createLoadTimeline(segments) {
    return {
        segmentAt(timeMs) {
            return segments.find(
                (segment) => timeMs >= segment.startTimeMs && timeMs < segment.endTimeMs,
            );
        },
    };
}

test("load-adjustment-tracker", "requires acknowledgement of the initial load", () => {
    const tracker = new LoadAdjustmentTracker(
        createLoadTimeline([
            {
                value: 5,
                startTimeMs: 0,
                endTimeMs: 60_000,
                progress: 0,
            },
        ]),
    );

    tracker.update(0);

    assertDeepEqual(tracker.getSnapshot(), {
        pending: true,
        fromValue: null,
        toValue: 5,
        dueTimeMs: 0,
        acknowledgedAtTimeMs: null,
    });
});

test("load-adjustment-tracker", "acknowledges the pending load adjustment", () => {
    const tracker = new LoadAdjustmentTracker(
        createLoadTimeline([
            {
                value: 5,
                startTimeMs: 0,
                endTimeMs: 60_000,
                progress: 0,
            },
        ]),
    );

    tracker.update(0);
    tracker.acknowledge(4_200);

    assertDeepEqual(tracker.getSnapshot(), {
        pending: false,
        fromValue: null,
        toValue: 5,
        dueTimeMs: 0,
        acknowledgedAtTimeMs: 4_200,
    });
});

test(
    "load-adjustment-tracker",
    "does not recreate an acknowledged adjustment while load remains unchanged",
    () => {
        const tracker = new LoadAdjustmentTracker(
            createLoadTimeline([
                {
                    value: 5,
                    startTimeMs: 0,
                    endTimeMs: 60_000,
                    progress: 0,
                },
            ]),
        );

        tracker.update(0);
        tracker.acknowledge(4_200);
        tracker.update(30_000);

        assertDeepEqual(tracker.getSnapshot(), {
            pending: false,
            fromValue: null,
            toValue: 5,
            dueTimeMs: 0,
            acknowledgedAtTimeMs: 4_200,
        });
    },
);

test(
    "load-adjustment-tracker",
    "creates a new pending adjustment when prescribed load changes",
    () => {
        const tracker = new LoadAdjustmentTracker(
            createLoadTimeline([
                {
                    value: 5,
                    startTimeMs: 0,
                    endTimeMs: 60_000,
                    progress: 0,
                },
                {
                    value: 7,
                    startTimeMs: 60_000,
                    endTimeMs: 120_000,
                    progress: 0,
                },
            ]),
        );

        tracker.update(0);
        tracker.acknowledge(2_000);

        tracker.update(60_000);

        assertDeepEqual(tracker.getSnapshot(), {
            pending: true,
            fromValue: 5,
            toValue: 7,
            dueTimeMs: 60_000,
            acknowledgedAtTimeMs: null,
        });
    },
);

test("load-adjustment-tracker", "uses the segment start time as the adjustment due time", () => {
    const tracker = new LoadAdjustmentTracker(
        createLoadTimeline([
            {
                value: 5,
                startTimeMs: 0,
                endTimeMs: 60_000,
                progress: 0,
            },
            {
                value: 7,
                startTimeMs: 60_000,
                endTimeMs: 120_000,
                progress: 0,
            },
        ]),
    );

    tracker.update(0);
    tracker.acknowledge(2_000);

    tracker.update(63_500);

    assertDeepEqual(tracker.getSnapshot(), {
        pending: true,
        fromValue: 5,
        toValue: 7,
        dueTimeMs: 60_000,
        acknowledgedAtTimeMs: null,
    });
});

test(
    "load-adjustment-tracker",
    "does not reset a pending adjustment during repeated updates",
    () => {
        const tracker = new LoadAdjustmentTracker(
            createLoadTimeline([
                {
                    value: 5,
                    startTimeMs: 0,
                    endTimeMs: 60_000,
                    progress: 0,
                },
                {
                    value: 7,
                    startTimeMs: 60_000,
                    endTimeMs: 120_000,
                    progress: 0,
                },
            ]),
        );

        tracker.update(0);
        tracker.acknowledge(2_000);

        tracker.update(60_000);
        tracker.update(70_000);
        tracker.update(90_000);

        assertDeepEqual(tracker.getSnapshot(), {
            pending: true,
            fromValue: 5,
            toValue: 7,
            dueTimeMs: 60_000,
            acknowledgedAtTimeMs: null,
        });
    },
);

test(
    "load-adjustment-tracker",
    "replaces an unacknowledged adjustment when a newer load becomes prescribed",
    () => {
        const tracker = new LoadAdjustmentTracker(
            createLoadTimeline([
                {
                    value: 5,
                    startTimeMs: 0,
                    endTimeMs: 60_000,
                    progress: 0,
                },
                {
                    value: 7,
                    startTimeMs: 60_000,
                    endTimeMs: 90_000,
                    progress: 0,
                },
                {
                    value: 9,
                    startTimeMs: 90_000,
                    endTimeMs: 120_000,
                    progress: 0,
                },
            ]),
        );

        tracker.update(0);
        tracker.acknowledge(2_000);

        tracker.update(60_000);
        tracker.update(90_000);

        assertDeepEqual(tracker.getSnapshot(), {
            pending: true,
            fromValue: 7,
            toValue: 9,
            dueTimeMs: 90_000,
            acknowledgedAtTimeMs: null,
        });
    },
);

test("load-adjustment-tracker", "ignores acknowledgement when no adjustment is pending", () => {
    const tracker = new LoadAdjustmentTracker(
        createLoadTimeline([
            {
                value: 5,
                startTimeMs: 0,
                endTimeMs: 60_000,
                progress: 0,
            },
        ]),
    );

    tracker.update(0);
    tracker.acknowledge(2_000);
    tracker.acknowledge(5_000);

    assertDeepEqual(tracker.getSnapshot(), {
        pending: false,
        fromValue: null,
        toValue: 5,
        dueTimeMs: 0,
        acknowledgedAtTimeMs: 2_000,
    });
});
