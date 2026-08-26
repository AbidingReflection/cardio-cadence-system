/** Returns the canonical target sequence for a stepped progression. */
export function getSteppedTargets(progression) {
    const { start, end, step } = progression;

    if (
        typeof start !== "number" ||
        !Number.isFinite(start) ||
        typeof end !== "number" ||
        !Number.isFinite(end) ||
        typeof step !== "number" ||
        !Number.isFinite(step) ||
        step <= 0
    ) {
        throw new TypeError(
            "Stepped progression requires finite start/end values and a positive finite step.",
        );
    }

    if (start === end) {
        return [start];
    }

    const direction = end > start ? 1 : -1;
    const distance = Math.abs(end - start);
    const fullStepCount = Math.floor(distance / step);
    const targets = [start];

    for (let index = 1; index <= fullStepCount; index += 1) {
        const target = start + direction * step * index;

        if (direction > 0 ? target >= end : target <= end) {
            break;
        }

        targets.push(target);
    }

    targets.push(end);

    return targets;
}
