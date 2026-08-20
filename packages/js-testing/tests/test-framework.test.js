import {
    test,
    assert,
    assertEqual,
    assertDeepEqual,
    assertThrows,
} from "../framework/test-framework.js";

test("test-framework", "assert accepts a truthy condition", () => {
    assert(true);
});

test("test-framework", "assert rejects a falsy condition", () => {
    assertThrows(() => assert(false), /Assertion failed/);
});

test("test-framework", "assertEqual accepts strictly equal values", () => {
    assertEqual("cadence", "cadence");
    assertEqual(60, 60);
});

test("test-framework", "assertEqual rejects unequal values", () => {
    assertThrows(() => assertEqual(60, 70), /Expected 70, received 60/);
});

test("test-framework", "assertDeepEqual accepts equivalent objects", () => {
    assertDeepEqual(
        {
            cadence: 60,
            resistance: 8,
        },
        {
            cadence: 60,
            resistance: 8,
        },
    );
});

test("test-framework", "assertDeepEqual rejects different objects", () => {
    assertThrows(
        () =>
            assertDeepEqual(
                {
                    cadence: 60,
                },
                {
                    cadence: 70,
                },
            ),
        /Expected/,
    );
});

test("test-framework", "assertThrows accepts a matching thrown error", () => {
    assertThrows(() => {
        throw new Error("Expected test error.");
    }, /Expected test error/);
});

test("test-framework", "assertThrows rejects a function that does not throw", () => {
    assertThrows(() => {
        assertThrows(() => {});
    }, /Expected function to throw/);
});

test("test-framework", "assertThrows rejects a non-matching error", () => {
    assertThrows(() => {
        assertThrows(() => {
            throw new Error("Actual error.");
        }, /Different error/);
    }, /Expected error matching/);
});

// test("test-framework", "intentional failure demo", () => {
//     assert(false, "Intentional failure to verify FAILED rendering.");
// });

test("test-framework", "deep equality ignores object key order", () => {
    assertDeepEqual(
        {
            id: 1,
            name: "Example",
        },
        {
            name: "Example",
            id: 1,
        },
    );
});

test("test-framework", "deep equality compares nested objects", () => {
    assertDeepEqual(
        {
            outer: {
                a: 1,
                b: 2,
            },
        },
        {
            outer: {
                b: 2,
                a: 1,
            },
        },
    );
});

test("test-framework", "deep equality preserves array order", () => {
    assertThrows(() => {
        assertDeepEqual([1, 2], [2, 1]);
    });
});

test("test-framework", "deep equality failure messages preserve undefined fields", () => {
    assertThrows(() => {
        assertDeepEqual(
            {
                value: undefined,
                extra: undefined,
            },
            {
                value: undefined,
            },
        );
    }, '"extra":undefined');
});

test("test-framework", "assertThrows accepts any thrown error without a matcher", () => {
    assertThrows(() => {
        throw new Error("Anything");
    });
});

test("test-framework", "assertThrows accepts a matching string", () => {
    assertThrows(() => {
        throw new Error("Duration must be greater than zero.");
    }, "greater than zero");
});

test("test-framework", "assertThrows accepts a matching regular expression", () => {
    assertThrows(() => {
        throw new Error("Duration must be greater than zero.");
    }, /greater than zero/);
});

test("test-framework", "assertThrows rejects a non-matching string", () => {
    assertThrows(() => {
        assertThrows(() => {
            throw new Error("Actual message");
        }, "Expected message");
    }, "Expected error matching");
});

test("test-framework", "assertThrows rejects a non-matching regular expression", () => {
    assertThrows(() => {
        assertThrows(() => {
            throw new Error("Actual message");
        }, /Expected message/);
    }, "Expected error matching");
});

test("test-framework", "assertThrows rejects functions that do not throw", () => {
    assertThrows(() => {
        assertThrows(() => {});
    }, "Expected function to throw.");
});
