import {
    assert,
    assertEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { SignalBank } from "../../../components/signal-bank.js";

/** Creates a host element for SignalBank tests. */
function createContainer() {
    return document.createElement("div");
}

/** Creates a representative signal definition set. */
function createSignals() {
    return [
        {
            id: "left",
            label: "LEFT",
        },
        {
            id: "right",
            label: "RIGHT",
        },
    ];
}

test("signal-bank", "creates the signal bank structure", () => {
    const container = createContainer();

    new SignalBank(container, createSignals());

    const bank = container.querySelector(".signal-bank");

    assert(bank instanceof HTMLElement);
    assertEqual(container.querySelectorAll(".signal-bank__signal").length, 2);
});

test("signal-bank", "renders signal ids and labels", () => {
    const container = createContainer();

    new SignalBank(container, createSignals());

    const signals = container.querySelectorAll(".signal-bank__signal");

    assertEqual(signals[0].dataset.signalId, "left");
    assertEqual(signals[0].querySelector(".signal-bank__label").textContent, "LEFT");

    assertEqual(signals[1].dataset.signalId, "right");
    assertEqual(signals[1].querySelector(".signal-bank__label").textContent, "RIGHT");
});

test("signal-bank", "starts with no active signal", () => {
    const container = createContainer();

    new SignalBank(container, createSignals());

    const signals = container.querySelectorAll(".signal-bank__signal");

    assertEqual(signals[0].dataset.active, "false");
    assertEqual(signals[1].dataset.active, "false");
});

test("signal-bank", "activates one signal at a time", () => {
    const container = createContainer();
    const bank = new SignalBank(container, createSignals());

    const left = container.querySelector('[data-signal-id="left"]');

    const right = container.querySelector('[data-signal-id="right"]');

    bank.setActiveSignal("left");

    assertEqual(left.dataset.active, "true");
    assertEqual(right.dataset.active, "false");

    bank.setActiveSignal("right");

    assertEqual(left.dataset.active, "false");
    assertEqual(right.dataset.active, "true");
});

test("signal-bank", "clears the active signal", () => {
    const container = createContainer();
    const bank = new SignalBank(container, createSignals());

    const signals = container.querySelectorAll(".signal-bank__signal");

    bank.setActiveSignal("left");
    bank.setActiveSignal(null);

    assertEqual(signals[0].dataset.active, "false");
    assertEqual(signals[1].dataset.active, "false");
});

test("signal-bank", "rejects an unknown active signal", () => {
    const bank = new SignalBank(createContainer(), createSignals());

    assertThrows(() => bank.setActiveSignal("missing-signal"));
});

test("signal-bank", "updates signal text", () => {
    const container = createContainer();
    const bank = new SignalBank(container, createSignals());

    bank.setSignalText("left", "LEAD LEFT");

    assertEqual(
        container.querySelector('[data-signal-id="left"]').querySelector(".signal-bank__label")
            .textContent,
        "LEAD LEFT",
    );
});

test("signal-bank", "rejects text updates for unknown signals", () => {
    const bank = new SignalBank(createContainer(), createSignals());

    assertThrows(() => bank.setSignalText("missing-signal", "Missing"));
});

test("signal-bank", "supports arbitrary signal counts", () => {
    const container = createContainer();

    new SignalBank(container, [
        {
            id: "legs-extended",
            label: "LEGS FULLY EXTENDED",
        },
        {
            id: "back-extended",
            label: "BACK EXTENDED",
        },
        {
            id: "arms-pull",
            label: "ARMS PULL",
        },
    ]);

    assertEqual(container.querySelectorAll(".signal-bank__signal").length, 3);
});

test("signal-bank", "rejects duplicate signal ids", () => {
    assertThrows(
        () =>
            new SignalBank(createContainer(), [
                {
                    id: "left",
                    label: "LEFT",
                },
                {
                    id: "left",
                    label: "OTHER LEFT",
                },
            ]),
    );
});

test("signal-bank", "rejects invalid signal definitions", () => {
    assertThrows(
        () =>
            new SignalBank(createContainer(), [
                {
                    id: "",
                    label: "LEFT",
                },
            ]),
    );

    assertThrows(
        () =>
            new SignalBank(createContainer(), [
                {
                    id: "left",
                    label: 123,
                },
            ]),
    );
});

test("signal-bank", "updates visual state", () => {
    const container = createContainer();
    const bank = new SignalBank(container, createSignals());

    bank.setState("warning");

    assertEqual(container.querySelector(".signal-bank").dataset.state, "warning");

    bank.setState("active");

    assertEqual(container.querySelector(".signal-bank").dataset.state, "active");
});

test("signal-bank", "reuses signal elements during active updates", () => {
    const container = createContainer();
    const bank = new SignalBank(container, createSignals());

    const leftBefore = container.querySelector('[data-signal-id="left"]');

    const rightBefore = container.querySelector('[data-signal-id="right"]');

    bank.setActiveSignal("left");
    bank.setActiveSignal("right");
    bank.setActiveSignal("left");

    assertEqual(container.querySelector('[data-signal-id="left"]'), leftBefore);

    assertEqual(container.querySelector('[data-signal-id="right"]'), rightBefore);
});

test("signal-bank", "reuses label elements during text updates", () => {
    const container = createContainer();
    const bank = new SignalBank(container, createSignals());

    const labelBefore = container
        .querySelector('[data-signal-id="left"]')
        .querySelector(".signal-bank__label");

    bank.setSignalText("left", "FIRST");
    bank.setSignalText("left", "SECOND");
    bank.setSignalText("left", "THIRD");

    const labelAfter = container
        .querySelector('[data-signal-id="left"]')
        .querySelector(".signal-bank__label");

    assertEqual(labelAfter, labelBefore);
});

test("signal-bank", "removes its rendered content on destroy", () => {
    const container = createContainer();
    const bank = new SignalBank(container, createSignals());

    bank.destroy();

    assertEqual(container.querySelector(".signal-bank"), null);
});
