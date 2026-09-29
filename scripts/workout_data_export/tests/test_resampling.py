import numpy as np
import pytest

from src.modules.resampling import resample_heart_rate


def test_resample_heart_rate_interpolates_regular_samples():
    timestamps_ms = np.array(
        [1_000, 6_000, 11_000],
        dtype=np.int64,
    )

    heart_rates = np.array(
        [100.0, 110.0, 120.0],
        dtype=np.float64,
    )

    result = resample_heart_rate(
        timestamps_ms,
        heart_rates,
        start_ms=1_000,
        end_ms=11_000,
        sample_interval_ms=5_000,
    )

    assert result == [
        {
            "timeMs": 0,
            "value": 100.0,
        },
        {
            "timeMs": 5_000,
            "value": 110.0,
        },
        {
            "timeMs": 10_000,
            "value": 120.0,
        },
    ]


def test_resample_heart_rate_linearly_interpolates_between_observations():
    timestamps_ms = np.array(
        [1_000, 11_000],
        dtype=np.int64,
    )

    heart_rates = np.array(
        [100.0, 120.0],
        dtype=np.float64,
    )

    result = resample_heart_rate(
        timestamps_ms,
        heart_rates,
        start_ms=1_000,
        end_ms=11_000,
        sample_interval_ms=5_000,
    )

    assert result == [
        {
            "timeMs": 0,
            "value": 100.0,
        },
        {
            "timeMs": 5_000,
            "value": 110.0,
        },
        {
            "timeMs": 10_000,
            "value": 120.0,
        },
    ]


def test_resample_heart_rate_includes_exact_workout_end():
    timestamps_ms = np.array(
        [0, 12_000],
        dtype=np.int64,
    )

    heart_rates = np.array(
        [100.0, 124.0],
        dtype=np.float64,
    )

    result = resample_heart_rate(
        timestamps_ms,
        heart_rates,
        start_ms=0,
        end_ms=12_000,
        sample_interval_ms=5_000,
    )

    assert result[-1] == {
        "timeMs": 12_000,
        "value": 124.0,
    }


def test_resample_heart_rate_converts_absolute_time_to_elapsed_time():
    timestamps_ms = np.array(
        [100_000, 105_000],
        dtype=np.int64,
    )

    heart_rates = np.array(
        [90.0, 95.0],
        dtype=np.float64,
    )

    result = resample_heart_rate(
        timestamps_ms,
        heart_rates,
        start_ms=100_000,
        end_ms=105_000,
        sample_interval_ms=5_000,
    )

    assert result == [
        {
            "timeMs": 0,
            "value": 90.0,
        },
        {
            "timeMs": 5_000,
            "value": 95.0,
        },
    ]


def test_resample_heart_rate_rejects_empty_input():
    with pytest.raises(ValueError, match="At least one heart-rate timestamp"):
        resample_heart_rate(
            np.array([], dtype=np.int64),
            np.array([], dtype=np.float64),
            start_ms=0,
            end_ms=10_000,
            sample_interval_ms=5_000,
        )


def test_resample_heart_rate_rejects_mismatched_lengths():
    with pytest.raises(ValueError, match="same length"):
        resample_heart_rate(
            np.array([0, 5_000], dtype=np.int64),
            np.array([100.0], dtype=np.float64),
            start_ms=0,
            end_ms=5_000,
            sample_interval_ms=5_000,
        )


def test_resample_heart_rate_rejects_invalid_workout_range():
    with pytest.raises(ValueError, match="Workout start must be before"):
        resample_heart_rate(
            np.array([0, 5_000], dtype=np.int64),
            np.array([100.0, 110.0], dtype=np.float64),
            start_ms=5_000,
            end_ms=5_000,
            sample_interval_ms=5_000,
        )


def test_resample_heart_rate_rejects_nonpositive_sample_interval():
    with pytest.raises(ValueError, match="greater than zero"):
        resample_heart_rate(
            np.array([0, 5_000], dtype=np.int64),
            np.array([100.0, 110.0], dtype=np.float64),
            start_ms=0,
            end_ms=5_000,
            sample_interval_ms=0,
        )


def test_resample_heart_rate_rejects_nonincreasing_timestamps():
    with pytest.raises(ValueError, match="strictly increasing"):
        resample_heart_rate(
            np.array([0, 5_000, 5_000], dtype=np.int64),
            np.array([100.0, 110.0, 115.0], dtype=np.float64),
            start_ms=0,
            end_ms=5_000,
            sample_interval_ms=5_000,
        )


def test_resample_heart_rate_requires_data_covering_workout_start():
    with pytest.raises(ValueError, match="include or precede the workout start"):
        resample_heart_rate(
            np.array([1_000, 5_000], dtype=np.int64),
            np.array([100.0, 110.0], dtype=np.float64),
            start_ms=0,
            end_ms=5_000,
            sample_interval_ms=5_000,
        )


def test_resample_heart_rate_requires_data_covering_workout_end():
    with pytest.raises(ValueError, match="include or follow the workout end"):
        resample_heart_rate(
            np.array([0, 4_000], dtype=np.int64),
            np.array([100.0, 110.0], dtype=np.float64),
            start_ms=0,
            end_ms=5_000,
            sample_interval_ms=5_000,
        )
