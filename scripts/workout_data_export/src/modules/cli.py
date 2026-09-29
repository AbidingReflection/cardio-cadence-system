import argparse


def parse_args():
    """Parses workout-data export CLI arguments."""
    parser = argparse.ArgumentParser(
        description="Export heart-rate data from SQLite as Analyzer-ready JSON."
    )

    parser.add_argument(
        "--db",
        required=True,
        help="Path to the source SQLite database.",
    )

    parser.add_argument(
        "--end",
        required=True,
        help='Workout end datetime, e.g. "2026-09-29 9:15pm".',
    )

    parser.add_argument(
        "--duration",
        required=True,
        help="Workout duration as MM:SS or HH:MM:SS.",
    )

    parser.add_argument(
        "--sample-seconds",
        type=float,
        default=5,
        help="Heart-rate sampling interval in seconds. Default: 5.",
    )

    parser.add_argument(
        "--output",
        required=True,
        help="Path for the generated JSON file.",
    )

    args = parser.parse_args()

    if args.sample_seconds <= 0:
        parser.error("--sample-seconds must be greater than zero.")

    return args
