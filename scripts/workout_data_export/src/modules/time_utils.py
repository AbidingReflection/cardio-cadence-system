from datetime import datetime, timedelta


DATETIME_FORMAT = "%Y-%m-%d %I:%M%p"


def parse_duration(duration_str):
    """Parses MM:SS or HH:MM:SS into a timedelta."""
    parts = duration_str.split(":")

    if len(parts) == 2:
        hours = 0
        minutes, seconds = parts
    elif len(parts) == 3:
        hours, minutes, seconds = parts
    else:
        raise ValueError("Duration must be MM:SS or HH:MM:SS.")

    try:
        hours = int(hours)
        minutes = int(minutes)
        seconds = int(seconds)
    except ValueError as exc:
        raise ValueError("Duration components must be integers.") from exc

    if hours < 0 or minutes < 0 or seconds < 0:
        raise ValueError("Duration components must not be negative.")

    if minutes >= 60 or seconds >= 60:
        raise ValueError("Minutes and seconds must be less than 60.")

    duration = timedelta(
        hours=hours,
        minutes=minutes,
        seconds=seconds,
    )

    if duration.total_seconds() <= 0:
        raise ValueError("Duration must be greater than zero.")

    return duration


def parse_end_datetime(value):
    """Parses the workout end datetime."""
    return datetime.strptime(value, DATETIME_FORMAT)


def datetime_to_epoch_ms(value):
    """Converts a datetime to Unix epoch milliseconds."""
    return int(value.timestamp() * 1000)


def resolve_workout_window(end_datetime, duration):
    """Returns workout start/end datetimes from end time and duration."""
    return end_datetime - duration, end_datetime
