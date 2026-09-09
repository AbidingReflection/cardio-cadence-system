from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd


def write_diagnostic_plots(
    diagnostics: pd.DataFrame,
    variables: list[str],
    output_dir: Path,
) -> None:
    """Writes exploratory diagnostic plots for a fitted calibration model."""
    output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    if len(variables) > 1:
        product = np.ones(
            len(diagnostics),
            dtype=float,
        )

        for variable in variables:
            product *= diagnostics[variable].to_numpy(
                dtype=float,
            )

        plot_residuals(
            diagnostics,
            x_values=product,
            x_label=" × ".join(variables),
            output_file=output_dir / "residual-vs-product.png",
        )

    for variable in variables:
        plot_residuals(
            diagnostics,
            x_values=diagnostics[variable],
            x_label=variable,
            output_file=output_dir / f"residual-vs-{variable}.png",
        )


def plot_residuals(
    diagnostics: pd.DataFrame,
    *,
    x_values,
    x_label: str,
    output_file: Path,
) -> None:
    """Plots fitted residuals against one calibration input."""
    fig, ax = plt.subplots()

    ax.scatter(
        x_values,
        diagnostics["fitted_residual"],
    )

    ax.axhline(0)

    ax.set_xlabel(x_label)
    ax.set_ylabel("Observed - fitted kcal / second")
    ax.set_title(f"Residual vs {x_label}")

    fig.tight_layout()
    fig.savefig(
        output_file,
        dpi=160,
    )

    plt.close(fig)
