import {
    test,
    assertDeepEqual,
    assertThrows,
} from "/packages/js-testing/framework/test-framework.js";

import { getSteppedTargets } from "../stepped-targets.js";

test("stepped-targets", "returns ascending exact stepped targets", () => {
    assertDeepEqual(
        getSteppedTargets({
            start: 40,
            end: 55,
            step: 5,
        }),
        [40, 45, 50, 55],
    );
});

test("stepped-targets", "returns descending exact stepped targets", () => {
    assertDeepEqual(
        getSteppedTargets({
            start: 65,
            end: 40,
            step: 5,
        }),
        [65, 60, 55, 50, 45, 40],
    );
});

test("stepped-targets", "includes a partial ascending final target", () => {
    assertDeepEqual(
        getSteppedTargets({
            start: 40,
            end: 67,
            step: 5,
        }),
        [40, 45, 50, 55, 60, 65, 67],
    );
});

test("stepped-targets", "includes a partial descending final target", () => {
    assertDeepEqual(
        getSteppedTargets({
            start: 67,
            end: 40,
            step: 5,
        }),
        [67, 62, 57, 52, 47, 42, 40],
    );
});

test("stepped-targets", "returns one target for a flat progression", () => {
    assertDeepEqual(
        getSteppedTargets({
            start: 40,
            end: 40,
            step: 5,
        }),
        [40],
    );
});

test("stepped-targets", "uses end directly when step exceeds the total distance", () => {
    assertDeepEqual(
        getSteppedTargets({
            start: 40,
            end: 42,
            step: 5,
        }),
        [40, 42],
    );
});

test("stepped-targets", "rejects non-positive step sizes", () => {
    assertThrows(
        () =>
            getSteppedTargets({
                start: 40,
                end: 55,
                step: 0,
            }),
        /positive finite step/,
    );
});
