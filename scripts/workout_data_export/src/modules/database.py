import sqlite3

import numpy as np


def fetch_hr_data(db_path, start_ms, end_ms):
    """Fetches HR samples spanning a requested epoch-ms window."""
    connection = sqlite3.connect(db_path)

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT TIMESTAMP, HEART_RATE
            FROM GENERIC_HEART_RATE_SAMPLE
            WHERE TIMESTAMP = (
                SELECT MAX(TIMESTAMP)
                FROM GENERIC_HEART_RATE_SAMPLE
                WHERE TIMESTAMP <= ?
            )

            UNION

            SELECT TIMESTAMP, HEART_RATE
            FROM GENERIC_HEART_RATE_SAMPLE
            WHERE TIMESTAMP BETWEEN ? AND ?

            UNION

            SELECT TIMESTAMP, HEART_RATE
            FROM GENERIC_HEART_RATE_SAMPLE
            WHERE TIMESTAMP = (
                SELECT MIN(TIMESTAMP)
                FROM GENERIC_HEART_RATE_SAMPLE
                WHERE TIMESTAMP >= ?
            )

            ORDER BY TIMESTAMP
            """,
            (
                start_ms,
                start_ms,
                end_ms,
                end_ms,
            ),
        )

        rows = cursor.fetchall()
    finally:
        connection.close()

    if not rows:
        raise RuntimeError("No heart-rate data found in requested range.")

    timestamps_ms = np.array(
        [row[0] for row in rows],
        dtype=np.int64,
    )

    heart_rates = np.array(
        [row[1] for row in rows],
        dtype=np.float64,
    )

    return timestamps_ms, heart_rates
