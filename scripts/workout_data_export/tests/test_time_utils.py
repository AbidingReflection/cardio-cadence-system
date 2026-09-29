from datetime import datetime, timedelta, timezone

import pytest

from src.modules.time_utils import (
    datetime_to_epoch_ms,
    parse_duration,
    parse_end_datetime,
    resolve_workout_window,
)


def test_parse_duration_accepts_mm_ss():
    assert parse_duration("45:30") == timedelta(minutes=45, seconds=30)


def test_parse_duration_accepts_hh_mm_ss():
    assert parse_duration("1:33:00") == timedelta(hours=1, minutes=33)


@pytest.mark.parametrize(
    "value",
    [
        "",
        "1",
        "1:2:3:4",
        "abc",
        "1:xx",
        "-1:00",
        "1:60",
        "1:00:60",
        "0:00",
    ],
)
def test_parse_duration_rejects_invalid_values(value):
    with pytest.raises(ValueError):
        parse_duration(value)


def test_parse_end_datetime_parses_expected_format():
    result = parse_end_datetime("2026-09-29 9:15pm")

    assert result == datetime(2026, 9, 29, 21, 15)


def test_parse_end_datetime_rejects_invalid_format():
    with pytest.raises(ValueError):
        parse_end_datetime("2026-09-29 21:15")


def test_resolve_workout_window_derives_start_from_duration():
    end_datetime = datetime(2026, 9, 29, 21, 15)
    duration = timedelta(hours=1, minutes=33)

    start_datetime, resolved_end_datetime = resolve_workout_window(
        end_datetime,
        duration,
    )

    assert start_datetime == datetime(2026, 9, 29, 19, 42)
    assert resolved_end_datetime == end_datetime


def test_datetime_to_epoch_ms_returns_integer_milliseconds():
    value = datetime(
        1970,
        1,
        1,
        0,
        0,
        1,
        tzinfo=timezone.utc,
    )

    result = datetime_to_epoch_ms(value)

    assert isinstance(result, int)
    assert result == 1000
