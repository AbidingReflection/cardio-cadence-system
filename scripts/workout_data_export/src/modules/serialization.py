import json
from pathlib import Path


def build_workout_document(
    start_ms,
    end_ms,
    sample_interval_ms,
    heart_rate_samples,
):
    """Builds the Analyzer-ready workout JSON document."""
    return {
        "workout": {
            "startedAtUnixMs": int(start_ms),
            "endedAtUnixMs": int(end_ms),
            "durationMs": int(end_ms - start_ms),
            "sampleIntervalMs": int(sample_interval_ms),
        },
        "heartRateSamples": heart_rate_samples,
    }


def write_workout_json(document, output_path):
    """Writes a workout document as formatted JSON."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("w", encoding="utf-8") as file:
        json.dump(
            document,
            file,
            indent=2,
        )
        file.write("\n")

    return path
