from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd


def write_calibration_fit_plot(
    calibration_data: pd.DataFrame,
    variables: list[str],
    fitted_rates,
    output_file: Path,
) -> None:
    """Writes the observed-versus-fitted calibration-rate plot."""
    product = np.ones(len(calibration_data), dtype=float)

    for variable in variables:
        product *= calibration_data[variable].to_numpy(dtype=float)

    plot_data = calibration_data.copy()
    plot_data["model_input_product"] = product
    plot_data["fitted_kcal_per_second"] = fitted_rates

    ordered = plot_data.sort_values("model_input_product")

    fig, ax = plt.subplots()

    ax.scatter(
        ordered["model_input_product"],
        ordered["kcal_per_second"],
        label="Observed",
    )

    ax.plot(
        ordered["model_input_product"],
        ordered["fitted_kcal_per_second"],
        label="Fitted",
    )

    ax.set_xlabel(" × ".join(variables))
    ax.set_ylabel("kcal / second")
    ax.set_title("Calibration fit")
    ax.legend()

    fig.tight_layout()
    fig.savefig(output_file, dpi=160)
    plt.close(fig)
