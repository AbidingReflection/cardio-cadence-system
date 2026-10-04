import {
  assertDeepEqual,
  assertEqual,
  assertThrows,
  test,
} from "/packages/js-testing/framework/test-framework.js";

import { LoadSegmentTimeline } from "../../../playback/load-segment-timeline.js";

/** Creates a small ProtocolExpander-compatible fake. */
function createExpander({ durationMs, boundaries = [], valueAt, valueBefore }) {
  return {
    durationMs,

    boundariesBetween(variableId, startTimeMs, endTimeMs) {
      return boundaries.filter(
        (boundary) => boundary >= startTimeMs && boundary < endTimeMs,
      );
    },

    valueAt(variableId, timeMs) {
      return valueAt(timeMs);
    },

    valueBefore(variableId, timeMs) {
      return valueBefore(timeMs);
    },
  };
}

/** Creates an expander for piecewise-constant load intervals. */
function createPiecewiseExpander(intervals, boundaries) {
  const durationMs = intervals[intervals.length - 1].endTimeMs;

  return createExpander({
    durationMs,
    boundaries,

    valueAt(timeMs) {
      const interval = intervals.find(
        ({ startTimeMs, endTimeMs }) =>
          timeMs >= startTimeMs && timeMs < endTimeMs,
      );

      return interval?.value;
    },

    valueBefore(timeMs) {
      const interval = intervals.find(
        ({ startTimeMs, endTimeMs }) =>
          timeMs > startTimeMs && timeMs <= endTimeMs,
      );

      return interval?.value;
    },
  });
}

test("load-segment-timeline", "returns one segment for a steady load", () => {
  const expander = createPiecewiseExpander(
    [
      {
        startTimeMs: 0,
        endTimeMs: 10_000,
        value: 8,
      },
    ],
    [],
  );

  const timeline = new LoadSegmentTimeline(expander, "resistance");

  assertDeepEqual(timeline.segmentAt(0), {
    value: 8,
    startTimeMs: 0,
    endTimeMs: 10_000,
    progress: 0,
  });

  assertDeepEqual(timeline.segmentAt(5_000), {
    value: 8,
    startTimeMs: 0,
    endTimeMs: 10_000,
    progress: 0.5,
  });
});

test("load-segment-timeline", "creates a new segment when load changes", () => {
  const expander = createPiecewiseExpander(
    [
      {
        startTimeMs: 0,
        endTimeMs: 5_000,
        value: 8,
      },
      {
        startTimeMs: 5_000,
        endTimeMs: 10_000,
        value: 10,
      },
    ],
    [5_000],
  );

  const timeline = new LoadSegmentTimeline(expander, "resistance");

  assertDeepEqual(timeline.segmentAt(2_500), {
    value: 8,
    startTimeMs: 0,
    endTimeMs: 5_000,
    progress: 0.5,
  });

  assertDeepEqual(timeline.segmentAt(5_000), {
    value: 10,
    startTimeMs: 5_000,
    endTimeMs: 10_000,
    progress: 0,
  });
});

test(
  "load-segment-timeline",
  "merges a structural boundary when load does not change",
  () => {
    const expander = createPiecewiseExpander(
      [
        {
          startTimeMs: 0,
          endTimeMs: 5_000,
          value: 8,
        },
        {
          startTimeMs: 5_000,
          endTimeMs: 10_000,
          value: 8,
        },
      ],
      [5_000],
    );

    const timeline = new LoadSegmentTimeline(expander, "resistance");

    assertDeepEqual(timeline.segmentAt(7_500), {
      value: 8,
      startTimeMs: 0,
      endTimeMs: 10_000,
      progress: 0.75,
    });
  },
);

test(
  "load-segment-timeline",
  "merges multiple adjacent equal-load intervals",
  () => {
    const expander = createPiecewiseExpander(
      [
        {
          startTimeMs: 0,
          endTimeMs: 3_000,
          value: 7,
        },
        {
          startTimeMs: 3_000,
          endTimeMs: 6_000,
          value: 7,
        },
        {
          startTimeMs: 6_000,
          endTimeMs: 9_000,
          value: 7,
        },
      ],
      [3_000, 6_000],
    );

    const timeline = new LoadSegmentTimeline(expander, "resistance");

    assertDeepEqual(timeline.segmentAt(6_750), {
      value: 7,
      startTimeMs: 0,
      endTimeMs: 9_000,
      progress: 0.75,
    });
  },
);

test("load-segment-timeline", "resolves stepped load segments", () => {
  const expander = createPiecewiseExpander(
    [
      {
        startTimeMs: 0,
        endTimeMs: 2_500,
        value: 2,
      },
      {
        startTimeMs: 2_500,
        endTimeMs: 5_000,
        value: 4,
      },
      {
        startTimeMs: 5_000,
        endTimeMs: 7_500,
        value: 6,
      },
      {
        startTimeMs: 7_500,
        endTimeMs: 10_000,
        value: 8,
      },
    ],
    [2_500, 5_000, 7_500],
  );

  const timeline = new LoadSegmentTimeline(expander, "resistance");

  assertDeepEqual(timeline.segmentAt(6_000), {
    value: 6,
    startTimeMs: 5_000,
    endTimeMs: 7_500,
    progress: 0.4,
  });
});

test(
  "load-segment-timeline",
  "returns final segment completion at protocol end",
  () => {
    const expander = createPiecewiseExpander(
      [
        {
          startTimeMs: 0,
          endTimeMs: 5_000,
          value: 8,
        },
        {
          startTimeMs: 5_000,
          endTimeMs: 10_000,
          value: 10,
        },
      ],
      [5_000],
    );

    const timeline = new LoadSegmentTimeline(expander, "resistance");

    assertDeepEqual(timeline.segmentAt(10_000), {
      value: 10,
      startTimeMs: 5_000,
      endTimeMs: 10_000,
      progress: 1,
    });
  },
);

test(
  "load-segment-timeline",
  "returns undefined outside the protocol timeline",
  () => {
    const expander = createPiecewiseExpander(
      [
        {
          startTimeMs: 0,
          endTimeMs: 10_000,
          value: 8,
        },
      ],
      [],
    );

    const timeline = new LoadSegmentTimeline(expander, "resistance");

    assertEqual(timeline.segmentAt(-1), undefined);

    assertEqual(timeline.segmentAt(10_001), undefined);
  },
);

test(
  "load-segment-timeline",
  "returns undefined when the load variable has no value",
  () => {
    const expander = createExpander({
      durationMs: 10_000,
      boundaries: [],

      valueAt() {
        return undefined;
      },

      valueBefore() {
        return undefined;
      },
    });

    const timeline = new LoadSegmentTimeline(expander, "resistance");

    assertEqual(timeline.segmentAt(0), undefined);

    assertEqual(timeline.segmentAt(5_000), undefined);

    assertEqual(timeline.segmentAt(10_000), undefined);
  },
);

test(
  "load-segment-timeline",
  "rejects a continuously changing load interval",
  () => {
    const expander = createExpander({
      durationMs: 10_000,
      boundaries: [],

      valueAt(timeMs) {
        return timeMs / 1_000;
      },

      valueBefore(timeMs) {
        return timeMs / 1_000;
      },
    });

    assertThrows(() => new LoadSegmentTimeline(expander, "resistance"));
  },
);

test("load-segment-timeline", "rejects invalid lookup times", () => {
  const expander = createPiecewiseExpander(
    [
      {
        startTimeMs: 0,
        endTimeMs: 10_000,
        value: 8,
      },
    ],
    [],
  );

  const timeline = new LoadSegmentTimeline(expander, "resistance");

  assertThrows(() => timeline.segmentAt(NaN));

  assertThrows(() => timeline.segmentAt(Infinity));

  assertThrows(() => timeline.segmentAt("5000"));
});
