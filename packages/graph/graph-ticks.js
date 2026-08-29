/**
 * Graph tick responsibilities:
 * - Generate stable human-readable tick values for numeric and time domains.
 * - Choose readable intervals independently of SVG rendering and layout geometry.
 * - Keep tick generation reusable across graph axes and grid presentation.
 */

const NICE_INTERVAL_MULTIPLIERS = [1, 2, 5, 10];

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;

const TIME_INTERVALS_MS = [
    1 * SECOND_MS,
    2 * SECOND_MS,
    5 * SECOND_MS,
    10 * SECOND_MS,
    15 * SECOND_MS,
    30 * SECOND_MS,

    1 * MINUTE_MS,
    2 * MINUTE_MS,
    5 * MINUTE_MS,
    10 * MINUTE_MS,
    15 * MINUTE_MS,
    30 * MINUTE_MS,

    1 * HOUR_MS,
    2 * HOUR_MS,
    3 * HOUR_MS,
    6 * HOUR_MS,
    12 * HOUR_MS,
];

/** Returns readable evenly spaced ticks within a numeric domain. */
export function getLinearTicks({ min, max, targetCount }) {
    validateDomain(min, max);
    validateTargetCount(targetCount);

    const rawInterval = (max - min) / (targetCount - 1);
    const interval = getNiceInterval(rawInterval);

    return getAlignedTicks(min, max, interval);
}

/** Returns readable elapsed-time ticks within an absolute millisecond domain. */
export function getTimeTicks({ startTimeMs, endTimeMs, targetCount }) {
    validateDomain(startTimeMs, endTimeMs);
    validateTargetCount(targetCount);

    const rawInterval = (endTimeMs - startTimeMs) / (targetCount - 1);
    const intervalMs = getNearestTimeInterval(rawInterval);

    return getAlignedTicks(startTimeMs, endTimeMs, intervalMs);
}

/** Returns aligned ticks within a closed numeric domain. */
function getAlignedTicks(min, max, interval) {
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

/** Returns the nearest human-readable elapsed-time interval. */
function getNearestTimeInterval(rawIntervalMs) {
    let nearestInterval = TIME_INTERVALS_MS[0];
    let nearestDistance = Math.abs(rawIntervalMs - nearestInterval);

    for (const intervalMs of TIME_INTERVALS_MS.slice(1)) {
        const distance = Math.abs(rawIntervalMs - intervalMs);

        if (distance < nearestDistance) {
            nearestInterval = intervalMs;
            nearestDistance = distance;
        }
    }

    return nearestInterval;
}

/** Removes insignificant floating-point noise from a generated tick value. */
function normalizeTick(value, interval) {
    const decimalPlaces = Math.max(0, -Math.floor(Math.log10(interval)) + 1);

    return Number(value.toFixed(decimalPlaces));
}

/** Validates an increasing finite numeric domain. */
function validateDomain(min, max) {
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
}

/** Validates the requested approximate number of ticks. */
function validateTargetCount(targetCount) {
    if (typeof targetCount !== "number" || !Number.isInteger(targetCount) || targetCount < 2) {
        throw new RangeError("Graph tick targetCount must be an integer of at least 2.");
    }
}
