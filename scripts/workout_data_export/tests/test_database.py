import sqlite3

import numpy as np
import pytest

from src.modules.database import fetch_hr_data


def create_test_database(tmp_path, rows):
    """Creates a minimal Gadgetbridge-style HR database."""
    db_path = tmp_path / "heart-rate.db"

    connection = sqlite3.connect(db_path)

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            CREATE TABLE GENERIC_HEART_RATE_SAMPLE (
                TIMESTAMP INTEGER NOT NULL,
                HEART_RATE INTEGER NOT NULL
            )
            """
        )

        cursor.executemany(
            """
            INSERT INTO GENERIC_HEART_RATE_SAMPLE (
                TIMESTAMP,
                HEART_RATE
            )
            VALUES (?, ?)
            """,
            rows,
        )

        connection.commit()
    finally:
        connection.close()

    return db_path


def test_fetch_hr_data_includes_samples_spanning_requested_window(tmp_path):
    db_path = create_test_database(
        tmp_path,
        [
            (1_000, 80),
            (4_000, 90),
            (7_000, 100),
            (10_000, 110),
            (13_000, 120),
        ],
    )

    timestamps_ms, heart_rates = fetch_hr_data(
        db_path,
        start_ms=5_000,
        end_ms=11_000,
    )

    np.testing.assert_array_equal(
        timestamps_ms,
        np.array(
            [4_000, 7_000, 10_000, 13_000],
            dtype=np.int64,
        ),
    )

    np.testing.assert_array_equal(
        heart_rates,
        np.array(
            [90.0, 100.0, 110.0, 120.0],
            dtype=np.float64,
        ),
    )


def test_fetch_hr_data_uses_exact_boundary_samples_without_duplicates(tmp_path):
    db_path = create_test_database(
        tmp_path,
        [
            (1_000, 80),
            (5_000, 90),
            (8_000, 100),
            (11_000, 110),
            (15_000, 120),
        ],
    )

    timestamps_ms, heart_rates = fetch_hr_data(
        db_path,
        start_ms=5_000,
        end_ms=11_000,
    )

    np.testing.assert_array_equal(
        timestamps_ms,
        np.array(
            [5_000, 8_000, 11_000],
            dtype=np.int64,
        ),
    )

    np.testing.assert_array_equal(
        heart_rates,
        np.array(
            [90.0, 100.0, 110.0],
            dtype=np.float64,
        ),
    )


def test_fetch_hr_data_returns_samples_in_timestamp_order(tmp_path):
    db_path = create_test_database(
        tmp_path,
        [
            (10_000, 110),
            (1_000, 80),
            (13_000, 120),
            (7_000, 100),
            (4_000, 90),
        ],
    )

    timestamps_ms, _ = fetch_hr_data(
        db_path,
        start_ms=5_000,
        end_ms=11_000,
    )

    np.testing.assert_array_equal(
        timestamps_ms,
        np.array(
            [4_000, 7_000, 10_000, 13_000],
            dtype=np.int64,
        ),
    )


def test_fetch_hr_data_raises_when_database_contains_no_hr_data(tmp_path):
    db_path = create_test_database(
        tmp_path,
        [],
    )

    with pytest.raises(
        RuntimeError,
        match="No heart-rate data found in requested range",
    ):
        fetch_hr_data(
            db_path,
            start_ms=5_000,
            end_ms=11_000,
        )
