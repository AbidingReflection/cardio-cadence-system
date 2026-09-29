#!/usr/bin/env python3

from modules.cli import parse_args
from modules.database import fetch_hr_data
from modules.resampling import resample_heart_rate
from modules.serialization import build_workout_document, write_workout_json
from modules.time_utils import (
    datetime_to_epoch_ms,
    parse_duration,
    parse_end_datetime,
    resolve_workout_window,
)


def main():
    """Exports one workout's heart-rate data as Analyzer-ready JSON."""
    args = parse_args()

    end_datetime = parse_end_datetime(args.end)
    duration = parse_duration(args.duration)

    start_datetime, end_datetime = resolve_workout_window(
        end_datetime,
        duration,
    )

    start_ms = datetime_to_epoch_ms(start_datetime)
    end_ms = datetime_to_epoch_ms(end_datetime)

    timestamps_ms, heart_rates = fetch_hr_data(
        args.db,
        start_ms,
        end_ms,
    )

    sample_interval_ms = round(args.sample_seconds * 1000)

    heart_rate_samples = resample_heart_rate(
        timestamps_ms,
        heart_rates,
        start_ms,
        end_ms,
        sample_interval_ms,
    )

    document = build_workout_document(
        start_ms,
        end_ms,
        sample_interval_ms,
        heart_rate_samples,
    )

    output_path = write_workout_json(
        document,
        args.output,
    )

    print(f"Exported workout data to: {output_path}")


if __name__ == "__main__":
    main()
