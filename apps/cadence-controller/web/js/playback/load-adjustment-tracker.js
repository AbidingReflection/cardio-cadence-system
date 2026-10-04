/**
 * Tracks prescribed load changes that require user acknowledgement.
 */
export class LoadAdjustmentTracker {
  #loadSegmentTimeline;
  #currentTarget;
  #snapshot;

  constructor(loadSegmentTimeline) {
    this.#loadSegmentTimeline = loadSegmentTimeline;
    this.#currentTarget = undefined;

    this.#snapshot = {
      pending: false,
      fromValue: null,
      toValue: null,
      dueTimeMs: null,
      acknowledgedAtTimeMs: null,
    };
  }

  /** Updates adjustment state for the current protocol time. */
  update(timeMs) {
    const segment = this.#loadSegmentTimeline.segmentAt(timeMs);

    if (segment === undefined) {
      return;
    }

    if (segment.value === this.#currentTarget) {
      return;
    }

    const previousTarget =
      this.#currentTarget === undefined ? null : this.#currentTarget;

    this.#currentTarget = segment.value;

    this.#snapshot = {
      pending: true,
      fromValue: previousTarget,
      toValue: segment.value,
      dueTimeMs: segment.startTimeMs,
      acknowledgedAtTimeMs: null,
    };
  }

  /** Acknowledges the currently pending load adjustment. */
  acknowledge(timeMs) {
    if (!this.#snapshot.pending) {
      return;
    }

    this.#snapshot = {
      ...this.#snapshot,
      pending: false,
      acknowledgedAtTimeMs: timeMs,
    };
  }

  /** Returns current load adjustment state. */
  getSnapshot() {
    return {
      ...this.#snapshot,
    };
  }
}
