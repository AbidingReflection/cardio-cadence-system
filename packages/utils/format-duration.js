/**
 * Provides shared helpers for formatting durations.
 */

/** Formats seconds as H:MM:SS or M:SS. */
export function formatDurationCompact(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [
      hours,
      String(minutes).padStart(2, "0"),
      String(seconds).padStart(2, "0"),
    ].join(":");
  }

  return [minutes, String(seconds).padStart(2, "0")].join(":");
}

/** Formats seconds as H:MM:SS. */
export function formatDurationFixed(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    hours,
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":");
}

/** Formats milliseconds as H:MM:SS or M:SS. */
export function formatDurationCompactMs(timeMs) {
  return formatDurationCompact(Math.floor(timeMs / 1000));
}

/** Formats milliseconds as H:MM:SS. */
export function formatDurationFixedMs(timeMs) {
  return formatDurationFixed(Math.floor(timeMs / 1000));
}
