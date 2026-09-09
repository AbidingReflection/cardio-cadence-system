import re
from pathlib import Path

import pandas as pd

TIME_COLUMNS = [
    "start_minute",
    "start_second",
    "end_minute",
    "end_second",
]

CALORIE_COLUMNS = [
    "start_calories",
    "end_calories",
]


def load_calibration_data(
    path: Path,
    *,
    sheet_name: str = "Data",
) -> pd.DataFrame:
    """Loads raw calibration observations from the workbook."""
    return pd.read_excel(
        path,
        sheet_name=sheet_name,
        engine="odf",
    )


def write_calibration_template(
    path: Path,
    variables: list[str],
    *,
    sheet_name: str = "Data",
) -> None:
    """Writes a blank calibration spreadsheet template."""
    validate_variables(variables)

    columns = get_expected_columns(variables)

    display_columns = [get_display_name(column) for column in columns]

    template = pd.DataFrame(
        columns=display_columns,
    )

    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    template.to_excel(
        path,
        sheet_name=sheet_name,
        index=False,
        engine="odf",
    )


def prepare_calibration_data(
    data: pd.DataFrame,
    variables: list[str],
) -> pd.DataFrame:
    """Creates regression-ready calibration observations."""
    validate_variables(variables)

    result = normalize_calibration_headers(
        data,
        variables,
    )

    validate_calibration_columns(
        result,
        variables,
    )

    numeric_columns = get_expected_columns(
        variables,
    )

    for column in numeric_columns:
        result[column] = pd.to_numeric(
            result[column],
            errors="raise",
        )

    result["start_time_seconds"] = result["start_minute"] * 60 + result["start_second"]

    result["end_time_seconds"] = result["end_minute"] * 60 + result["end_second"]

    result["duration_seconds"] = (
        result["end_time_seconds"] - result["start_time_seconds"]
    )

    result["calorie_delta"] = result["end_calories"] - result["start_calories"]

    if (result["duration_seconds"] <= 0).any():
        bad_rows = result.index[result["duration_seconds"] <= 0].tolist()

        raise ValueError(
            f"Calibration rows must have positive duration. Bad rows: {bad_rows}"
        )

    if (result["calorie_delta"] <= 0).any():
        bad_rows = result.index[result["calorie_delta"] <= 0].tolist()

        raise ValueError(
            f"Calibration rows must have positive calorie deltas. Bad rows: {bad_rows}"
        )

    result["kcal_per_second"] = result["calorie_delta"] / result["duration_seconds"]

    result["seconds_per_kcal"] = result["duration_seconds"] / result["calorie_delta"]

    result["midpoint_time_seconds"] = (
        result["start_time_seconds"] + result["end_time_seconds"]
    ) / 2

    result.index = result.index + 1
    result.index.name = "observation"

    return result


def get_expected_columns(
    variables: list[str],
) -> list[str]:
    """Returns canonical columns expected in calibration observations."""
    return [
        *TIME_COLUMNS,
        *variables,
        *CALORIE_COLUMNS,
    ]


def normalize_calibration_headers(
    data: pd.DataFrame,
    variables: list[str],
) -> pd.DataFrame:
    """Maps human-friendly spreadsheet headers to canonical column names."""
    expected_columns = get_expected_columns(
        variables,
    )

    expected_by_key = {normalize_header(column): column for column in expected_columns}

    rename_map = {}

    for column in data.columns:
        key = normalize_header(
            str(column),
        )

        canonical_column = expected_by_key.get(
            key,
        )

        if canonical_column is not None:
            rename_map[column] = canonical_column

    return data.rename(
        columns=rename_map,
    )


def normalize_header(
    value: str,
) -> str:
    """Returns a normalized key for matching spreadsheet headers."""
    return "".join(character for character in value.casefold() if character.isalnum())


def get_display_name(
    value: str,
) -> str:
    """Converts a canonical column name to a human-friendly label."""
    value = re.sub(
        r"(?<=[a-z0-9])(?=[A-Z])",
        " ",
        value,
    )

    value = value.replace(
        "_",
        " ",
    )

    return value.title()


def validate_variables(
    variables: list[str],
) -> None:
    """Validates canonical calibration variable names."""
    if not variables:
        raise ValueError("At least one calibration variable is required.")

    if len(variables) != len(set(variables)):
        raise ValueError("Calibration variables must be unique.")


def validate_calibration_columns(
    data: pd.DataFrame,
    variables: list[str],
) -> None:
    """Validates columns required for calibration processing."""
    required_columns = get_expected_columns(
        variables,
    )

    missing_columns = [
        column for column in required_columns if column not in data.columns
    ]

    if missing_columns:
        raise ValueError(
            "Calibration spreadsheet is missing required columns: "
            + ", ".join(missing_columns)
        )


def summarize_calibration_data(
    data: pd.DataFrame,
    variables: list[str],
) -> None:
    """Prints basic calibration-dataset diagnostics."""
    print()
    print("Calibration summary")
    print("===================")
    print(f"Observations: {len(data)}")

    for variable in variables:
        print(
            f"{get_display_name(variable)} range: "
            f"{data[variable].min()} to "
            f"{data[variable].max()}"
        )

    print(
        f"Calorie-rate range: "
        f"{data['kcal_per_second'].min():.6f} to "
        f"{data['kcal_per_second'].max():.6f} kcal/s"
    )

    print(
        f"Observation duration range: "
        f"{data['duration_seconds'].min():.1f} to "
        f"{data['duration_seconds'].max():.1f} seconds"
    )

    print(
        f"Calorie delta range: "
        f"{data['calorie_delta'].min()} to "
        f"{data['calorie_delta'].max()} kcal"
    )
