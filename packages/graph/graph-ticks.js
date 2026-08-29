/**
 * Graph tick responsibilities:
 * - Generate stable human-readable tick values for numeric graph domains.
 * - Choose readable intervals independently of SVG rendering and layout geometry.
 * - Keep tick generation reusable across graph axes and grid presentation.
 */

const NICE_INTERVAL_MULTIPLIERS = [1, 2, 5, 10];

/** Returns readable evenly spaced ticks within a numeric domain. */
export function getLinearTicks({ min, max, targetCount }) {
    validateInputs(min, max, targetCount);

    const rawInterval = (max - min) / (targetCount - 1);
    const interval = getNiceInterval(rawInterval);

    const firstIndex = Math.ceil(min / interval);
    const lastIndex = Math.floor(max / interval);

    const ticks = [];

    for (let index = firstIndex; index <= lastIndex; index += 1) {
        ticks.push(normalizeTick(index * interval, interval));
    }

    return ticks;
}

/** Returns the nearest readable 1-2-5 interval for a positive raw interval. */
function getNiceInterval(rawInterval) {
    const magnitude = 10 ** Math.floor(Math.log10(rawInterval));
    const normalizedInterval = rawInterval / magnitude;

    let nearestMultiplier = NICE_INTERVAL_MULTIPLIERS[0];
    let nearestDistance = Math.abs(normalizedInterval - nearestMultiplier);

    for (const multiplier of NICE_INTERVAL_MULTIPLIERS.slice(1)) {
        const distance = Math.abs(normalizedInterval - multiplier);

        if (distance < nearestDistance) {
            nearestMultiplier = multiplier;
            nearestDistance = distance;
        }
    }

    return nearestMultiplier * magnitude;
}

/** Removes insignificant floating-point noise from a generated tick value. */
function normalizeTick(value, interval) {
    const decimalPlaces = Math.max(0, -Math.floor(Math.log10(interval)) + 1);

    return Number(value.toFixed(decimalPlaces));
}

/** Validates a numeric tick-generation request. */
function validateInputs(min, max, targetCount) {
    if (
        typeof min !== "number" ||
        !Number.isFinite(min) ||
        typeof max !== "number" ||
        !Number.isFinite(max)
    ) {
        throw new TypeError("Graph tick domain values must be finite numbers.");
    }

    if (max <= min) {
        throw new RangeError("Graph tick maximum must be greater than minimum.");
    }

    if (typeof targetCount !== "number" || !Number.isInteger(targetCount) || targetCount < 2) {
        throw new RangeError("Graph tick targetCount must be an integer of at least 2.");
    }
}
