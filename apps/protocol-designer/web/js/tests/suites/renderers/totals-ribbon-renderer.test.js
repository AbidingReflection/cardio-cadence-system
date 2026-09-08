import { assertEqual, test } from "/packages/js-testing/framework/test-framework.js";

import { renderTotalsRibbon } from "../../../renderers/totals-ribbon-renderer.js";

/** Creates the DOM elements required by the totals-ribbon renderer. */
function createTotalsRibbonElements() {
    const durationElement = document.createElement("span");
    durationElement.id = "protocol-total-duration";

    const caloriesElement = document.createElement("span");
    caloriesElement.id = "protocol-total-calories";

    document.body.append(durationElement, caloriesElement);

    return {
        durationElement,
        caloriesElement,
    };
}

/** Removes totals-ribbon test elements from the document. */
function removeTotalsRibbonElements() {
    document.getElementById("protocol-total-duration")?.remove();
    document.getElementById("protocol-total-calories")?.remove();
}

test("totals-ribbon-renderer", "renders protocol duration", () => {
    removeTotalsRibbonElements();

    const { durationElement } = createTotalsRibbonElements();

    renderTotalsRibbon({
        durationMs: 754000,
        calories: null,
    });

    assertEqual(durationElement.textContent, "12:34");

    removeTotalsRibbonElements();
});

test("totals-ribbon-renderer", "renders rounded calorie estimate", () => {
    removeTotalsRibbonElements();

    const { caloriesElement } = createTotalsRibbonElements();

    renderTotalsRibbon({
        durationMs: 0,
        calories: 412.6,
    });

    assertEqual(caloriesElement.textContent, "413 kCal");

    removeTotalsRibbonElements();
});

test("totals-ribbon-renderer", "renders unavailable calorie estimate as an em dash", () => {
    removeTotalsRibbonElements();

    const { caloriesElement } = createTotalsRibbonElements();

    renderTotalsRibbon({
        durationMs: 0,
        calories: null,
    });

    assertEqual(caloriesElement.textContent, "—");

    removeTotalsRibbonElements();
});

test("totals-ribbon-renderer", "pads duration seconds", () => {
    removeTotalsRibbonElements();

    const { durationElement } = createTotalsRibbonElements();

    renderTotalsRibbon({
        durationMs: 65000,
        calories: null,
    });

    assertEqual(durationElement.textContent, "01:05");

    removeTotalsRibbonElements();
});

test("totals-ribbon-renderer", "preserves durations longer than one hour as total minutes", () => {
    removeTotalsRibbonElements();

    const { durationElement } = createTotalsRibbonElements();

    renderTotalsRibbon({
        durationMs: 4500000,
        calories: null,
    });

    assertEqual(durationElement.textContent, "75:00");

    removeTotalsRibbonElements();
});
