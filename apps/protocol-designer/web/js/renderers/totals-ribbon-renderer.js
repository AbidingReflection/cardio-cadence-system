/**
 * Totals ribbon renderer responsibilities:
 * - Format protocol totals for display.
 * - Render duration and calibrated calorie estimates.
 * - Represent unavailable calorie estimates without implying a zero value.
 */

/** Renders protocol totals into the totals ribbon. */
export function renderTotalsRibbon({ durationMs, calories }) {
    const durationElement = document.getElementById("protocol-total-duration");
    const caloriesElement = document.getElementById("protocol-total-calories");

    durationElement.textContent = formatDuration(durationMs);
    caloriesElement.textContent = calories === null ? "—" : `${Math.round(calories)} kCal`;
}

/** Formats a millisecond duration as minutes and seconds. */
function formatDuration(durationMs) {
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
