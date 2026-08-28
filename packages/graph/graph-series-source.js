/**
 * Graph series sources expose a scalar value over workout time.
 *
 * Required properties:
 * - id
 * - label
 * - unit
 *
 * Required methods:
 * - valueAt(timeMs)
 * - valueBefore(timeMs)
 * - boundariesBetween(startTimeMs, endTimeMs)
 */
