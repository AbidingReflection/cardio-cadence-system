import argparse
import json
import sys
from datetime import UTC, datetime
from pathlib import Path

import pandas as pd
from calibration_data import (
    load_calibration_data,
    prepare_calibration_data,
    summarize_calibration_data,
    write_calibration_template,
)
from calibration_diagnostics import write_diagnostic_plots
from calibration_models import (
    build_model_diagnostics,
    build_product_features,
    fit_least_squares,
)
from calibration_plots import write_calibration_fit_plot

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = SCRIPT_DIR.parent

DEFAULT_OUTPUT_DIR = PROJECT_DIR / "output"
DEFAULT_CALIBRATION_DIR = DEFAULT_OUTPUT_DIR / "calibrations"
DEFAULT_PLOT_DIR = DEFAULT_OUTPUT_DIR / "plots"
DEFAULT_TEMPLATE_FILE = PROJECT_DIR / "data" / "calibration-template.ods"

MODEL_DEGREE = 3
OUTPUT_UNIT = "kcalPerSecond"


def parse_args() -> argparse.Namespace:
    """Parses command-line arguments."""
    parser = argparse.ArgumentParser(
        description=(
            "Generate a Cardio Cadence calibration profile from "
            "steady-state machine observations."
        ),
        epilog=(
            "Examples:\n"
            "  ./run.sh \\\n"
            "      --create-template \\\n"
            "      --variables cadence resistance\n"
            "\n"
            "  ./run.sh \\\n"
            "      --input data/calibration.ods \\\n"
            "      --variables cadence resistance\n"
            "\n"
            "  ./run.sh \\\n"
            "      --input data/calibration.ods \\\n"
            "      --variables cadence resistance \\\n"
            "      --id true-elliptical-aquatic-center-default \\\n"
            '      --name "True Elliptical - Aquatic Center Calibration" \\\n'
            "      --machine-profile-id true-elliptical-aquatic-center\n"
            "\n"
            "  ./run.sh \\\n"
            "      --input data/calibration.ods \\\n"
            "      --variables cadence resistance \\\n"
            "      --diagnostics"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument(
        "--input",
        type=Path,
        metavar="FILE",
        help="Calibration spreadsheet to process.",
    )

    parser.add_argument(
        "--variables",
        required=True,
        nargs="+",
        metavar="VARIABLE",
        help=(
            "Canonical protocol variables used by the calibration model "
            "(for example: cadence resistance)."
        ),
    )

    parser.add_argument(
        "--create-template",
        action="store_true",
        help="Create a blank calibration spreadsheet template and exit.",
    )

    parser.add_argument(
        "--template-file",
        type=Path,
        default=DEFAULT_TEMPLATE_FILE,
        metavar="FILE",
        help=(f"Output file for --create-template (default: {DEFAULT_TEMPLATE_FILE})."),
    )

    parser.add_argument(
        "--sheet",
        default="Data",
        metavar="NAME",
        help='Spreadsheet sheet containing observations (default: "Data").',
    )

    parser.add_argument(
        "--id",
        default="",
        metavar="ID",
        help="Calibration profile ID.",
    )

    parser.add_argument(
        "--name",
        default="",
        metavar="NAME",
        help="Calibration profile display name.",
    )

    parser.add_argument(
        "--machine-profile-id",
        default="",
        metavar="ID",
        help="MachineProfile ID associated with the calibration.",
    )

    parser.add_argument(
        "--calibration-dir",
        type=Path,
        default=DEFAULT_CALIBRATION_DIR,
        metavar="DIR",
        help=(
            "Directory for generated calibration profiles "
            f"(default: {DEFAULT_CALIBRATION_DIR})."
        ),
    )

    parser.add_argument(
        "--plot-dir",
        type=Path,
        default=DEFAULT_PLOT_DIR,
        metavar="DIR",
        help=f"Directory for generated plots (default: {DEFAULT_PLOT_DIR}).",
    )

    parser.add_argument(
        "--diagnostics",
        action="store_true",
        help="Generate exploratory residual plots.",
    )

    if len(sys.argv) == 1:
        parser.print_help()
        parser.exit()

    args = parser.parse_args()

    if not args.create_template and args.input is None:
        parser.error("--input is required unless --create-template is used")

    return args


def create_timestamp() -> str:
    """Returns a sortable UTC timestamp for generated artifact names."""
    return datetime.now(UTC).strftime("%Y%m%d-%H%M%S")


def build_calibration_profile(
    calibration_data: pd.DataFrame,
    variables: list[str],
    coefficients,
    *,
    calibration_id: str,
    name: str,
    machine_profile_id: str,
) -> dict:
    """Builds a calibration-profile payload from fitted calibration data."""
    domain = {
        variable: {
            "min": get_json_number(calibration_data[variable].min()),
            "max": get_json_number(calibration_data[variable].max()),
        }
        for variable in variables
    }

    return {
        "id": calibration_id,
        "name": name,
        "machineProfileId": machine_profile_id,
        "context": {},
        "domain": domain,
        "model": {
            "type": "polynomial",
            "input": {
                "type": "product",
                "variables": variables,
            },
            "coefficients": coefficients.tolist(),
            "outputUnit": OUTPUT_UNIT,
        },
    }


def get_json_number(value) -> int | float:
    """Returns an integer when possible, otherwise a float."""
    value = float(value)

    if value.is_integer():
        return int(value)

    return value


def main() -> None:
    args = parse_args()

    variables = args.variables

    if args.create_template:
        template_file = args.template_file.expanduser().resolve()

        write_calibration_template(
            template_file,
            variables,
            sheet_name=args.sheet,
        )

        print()
        print("Calibration template created")
        print("============================")
        print(template_file)

        return

    input_file = args.input.expanduser().resolve()
    calibration_dir = args.calibration_dir.expanduser().resolve()
    plot_dir = args.plot_dir.expanduser().resolve()

    if not input_file.is_file():
        raise FileNotFoundError(f"Calibration input file does not exist: {input_file}")

    raw_data = load_calibration_data(
        input_file,
        sheet_name=args.sheet,
    )

    calibration_data = prepare_calibration_data(
        raw_data,
        variables,
    )

    target = calibration_data["kcal_per_second"].to_numpy(
        dtype=float,
    )

    features = build_product_features(
        calibration_data,
        variables=variables,
        degree=MODEL_DEGREE,
    )

    coefficients = fit_least_squares(
        features,
        target,
    )

    fitted_rates = features @ coefficients

    calibration_profile = build_calibration_profile(
        calibration_data,
        variables,
        coefficients,
        calibration_id=args.id,
        name=args.name,
        machine_profile_id=args.machine_profile_id,
    )

    timestamp = create_timestamp()

    profile_file = calibration_dir / f"{timestamp}-calibration-profile.json"

    plot_file = plot_dir / f"{timestamp}-calibration-fit.png"

    calibration_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    plot_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    with profile_file.open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            calibration_profile,
            file,
            indent=4,
        )
        file.write("\n")

    write_calibration_fit_plot(
        calibration_data,
        variables,
        fitted_rates,
        plot_file,
    )

    diagnostics_dir = None

    if args.diagnostics:
        diagnostics = build_model_diagnostics(
            calibration_data,
            features,
            target,
        )

        diagnostics_dir = plot_dir / f"{timestamp}-diagnostics"

        write_diagnostic_plots(
            diagnostics,
            variables,
            diagnostics_dir,
        )

    pd.set_option("display.max_columns", None)
    pd.set_option("display.width", 160)
    pd.set_option("display.precision", 8)

    summarize_calibration_data(
        calibration_data,
        variables,
    )

    print()
    print("Calibration model")
    print("=================")
    print("Type: polynomial")
    print(f"Input: {' × '.join(variables)}")
    print(f"Degree: {MODEL_DEGREE}")
    print(f"Output: {OUTPUT_UNIT}")

    print()
    print("Coefficients")
    print("============")

    for index, coefficient in enumerate(coefficients):
        print(f"c{index} = {coefficient:.15g}")

    print()
    print("Generated artifacts")
    print("===================")
    print(profile_file)
    print(plot_file)

    if diagnostics_dir is not None:
        print(diagnostics_dir)


if __name__ == "__main__":
    main()
