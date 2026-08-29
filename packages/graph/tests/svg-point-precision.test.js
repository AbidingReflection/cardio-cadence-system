import { assertEqual, assertThrows, test } from "../../js-testing/framework/test-framework.js";

import { roundSvgPoints, roundSvgCoordinate } from "../svg-point-precision.js";

test("svg-point-precision", "rounds point coordinates to requested precision", () => {
    const result = roundSvgPoints(
        [
            { x: 12.3456, y: 98.7654 },
            { x: 50.1234, y: 25.9876 },
        ],
        2,
    );

    assertEqual(result[0].x, 12.35);
    assertEqual(result[0].y, 98.77);
    assertEqual(result[1].x, 50.12);
    assertEqual(result[1].y, 25.99);
});

test("svg-point-precision", "supports zero decimal precision", () => {
    const result = roundSvgPoints([{ x: 12.6, y: 98.4 }], 0);

    assertEqual(result[0].x, 13);
    assertEqual(result[0].y, 98);
});

test("svg-point-precision", "preserves undefined points", () => {
    const result = roundSvgPoints(
        [{ x: 12.345, y: 67.891 }, undefined, { x: 10.555, y: 20.444 }],
        2,
    );

    assertEqual(result[1], undefined);
});

test("svg-point-precision", "does not mutate input points", () => {
    const point = { x: 12.345, y: 67.891 };
    const points = [point];

    const result = roundSvgPoints(points, 2);

    assertEqual(point.x, 12.345);
    assertEqual(point.y, 67.891);
    assertEqual(result[0] === point, false);
});

test("svg-point-precision", "preserves additional point properties", () => {
    const result = roundSvgPoints(
        [
            {
                x: 12.345,
                y: 67.891,
                value: 42,
            },
        ],
        2,
    );

    assertEqual(result[0].value, 42);
});

test("svg-point-precision", "rejects non-array points", () => {
    assertThrows(() => roundSvgPoints(null, 2), /points must be an array/);
});

test("svg-point-precision", "rejects negative precision", () => {
    assertThrows(() => roundSvgPoints([], -1), /non-negative integer/);
});

test("svg-point-precision", "rejects fractional precision", () => {
    assertThrows(() => roundSvgPoints([], 1.5), /non-negative integer/);
});

test("svg-point-precision", "rejects non-finite coordinates", () => {
    assertThrows(
        () => roundSvgPoints([{ x: Infinity, y: 10 }], 2),
        /coordinate must be a finite number/,
    );
});

test("svg-point-precision", "rounds one SVG coordinate", () => {
    assertEqual(roundSvgCoordinate(12.3456, 2), 12.35);
});

test("svg-point-precision", "rejects invalid coordinate precision", () => {
    assertThrows(() => roundSvgCoordinate(12.3456, -1), /non-negative integer/);
});

test("svg-point-precision", "rejects non-finite SVG coordinates", () => {
    assertThrows(() => roundSvgCoordinate(Infinity, 2), /finite number/);
});
