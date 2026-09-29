import numpy as np


def resample_heart_rate(
    timestamps_ms,
    heart_rates,
    start_ms,
    end_ms,
    sample_interval_ms,
):
    """Resamples heart rate onto a regular elapsed-workout timeline."""
    _validate_inputs(
        timestamps_ms,
        heart_rates,
        start_ms,
        end_ms,
        sample_interval_ms,
    )

    sample_times_ms = np.arange(
        start_ms,
        end_ms + 1,
        sample_interval_ms,
        dtype=np.int64,
    )

    if sample_times_ms[-1] != end_ms:
        sample_times_ms = np.append(sample_times_ms, end_ms)

    interpolated = np.interp(
        sample_times_ms,
        timestamps_ms,
        heart_rates,
    )

    return [
        {
            "timeMs": int(timestamp_ms - start_ms),
            "value": float(heart_rate),
        }
        for timestamp_ms, heart_rate in zip(
            sample_times_ms,
            interpolated,
        )
    ]


def _validate_inputs(
    timestamps_ms,
    heart_rates,
    start_ms,
    end_ms,
    sample_interval_ms,
):
    """Validates heart-rate resampling inputs."""
    if len(timestamps_ms) == 0:
        raise ValueError("At least one heart-rate timestamp is required.")

    if len(timestamps_ms) != len(heart_rates):
        raise ValueError(
            "Heart-rate timestamps and values must have the same length."
        )

    if start_ms >= end_ms:
        raise ValueError("Workout start must be before workout end.")

    if sample_interval_ms <= 0:
        raise ValueError("Sample interval must be greater than zero.")

    if np.any(np.diff(timestamps_ms) <= 0):
        raise ValueError(
            "Heart-rate timestamps must be strictly increasing."
        )

    if timestamps_ms[0] > start_ms:
        raise ValueError(
            "Heart-rate data must include or precede the workout start."
        )

    if timestamps_ms[-1] < end_ms:
        raise ValueError(
            "Heart-rate data must include or follow the workout end."
        )
