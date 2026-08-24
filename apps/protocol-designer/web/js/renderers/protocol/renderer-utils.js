/**
 * Provides shared presentation helpers used across protocol renderer modules.
 */

/** Formats seconds as H:MM:SS or M:SS. */
export function formatDuration(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return [hours, String(minutes).padStart(2, "0"), String(seconds).padStart(2, "0")].join(
            ":",
        );
    }

    return [minutes, String(seconds).padStart(2, "0")].join(":");
}
