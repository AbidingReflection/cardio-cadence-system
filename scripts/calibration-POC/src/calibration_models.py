import numpy as np
import pandas as pd


def build_product_features(
    data: pd.DataFrame,
    variables: list[str],
    degree: int,
) -> np.ndarray:
    """Builds polynomial features from the product of selected variables."""
    product = np.ones(len(data), dtype=float)

    for variable in variables:
        product *= data[variable].to_numpy(dtype=float)

    return np.column_stack([product**power for power in range(degree + 1)])


def build_2d_polynomial_features(
    data: pd.DataFrame,
    variables: list[str],
    degree: int,
) -> np.ndarray:
    """Builds all polynomial terms for two variables through the given degree."""
    if len(variables) != 2:
        raise ValueError("2D polynomial features require exactly two variables.")

    first = data[variables[0]].to_numpy(dtype=float)
    second = data[variables[1]].to_numpy(dtype=float)

    columns = []

    for total_degree in range(degree + 1):
        for first_power in range(total_degree, -1, -1):
            second_power = total_degree - first_power

            columns.append((first**first_power) * (second**second_power))

    return np.column_stack(columns)


def fit_least_squares(
    features: np.ndarray,
    target: np.ndarray,
    weights: np.ndarray | None = None,
) -> np.ndarray:
    """Fits ordinary or weighted least squares coefficients."""
    if weights is None:
        weighted_features = features
        weighted_target = target
    else:
        sqrt_weights = np.sqrt(weights)

        weighted_features = features * sqrt_weights[:, np.newaxis]
        weighted_target = target * sqrt_weights

    coefficients, _, _, _ = np.linalg.lstsq(
        weighted_features,
        weighted_target,
        rcond=None,
    )

    return coefficients


def calculate_metrics(
    observed: np.ndarray,
    predicted: np.ndarray,
) -> dict[str, float]:
    """Calculates prediction-error metrics."""
    residuals = observed - predicted

    mse = np.mean(residuals**2)
    rmse = np.sqrt(mse)
    mae = np.mean(np.abs(residuals))
    max_absolute_error = np.max(np.abs(residuals))

    total_variation = np.sum((observed - np.mean(observed)) ** 2)

    residual_variation = np.sum(residuals**2)

    r_squared = (
        1 - residual_variation / total_variation
        if total_variation > 0
        else float("nan")
    )

    return {
        "rmse": rmse,
        "mae": mae,
        "max_absolute_error": max_absolute_error,
        "r_squared": r_squared,
    }


def leave_one_out_predictions(
    features: np.ndarray,
    target: np.ndarray,
    weights: np.ndarray | None = None,
) -> np.ndarray:
    """Returns leave-one-out predictions for every observation."""
    predictions = np.empty(len(target), dtype=float)

    for test_index in range(len(target)):
        train_mask = np.ones(len(target), dtype=bool)
        train_mask[test_index] = False

        train_weights = None if weights is None else weights[train_mask]

        coefficients = fit_least_squares(
            features[train_mask],
            target[train_mask],
            train_weights,
        )

        predictions[test_index] = features[test_index] @ coefficients

    return predictions


def evaluate_model(
    name: str,
    features: np.ndarray,
    target: np.ndarray,
    weights: np.ndarray | None = None,
) -> dict:
    """Fits and evaluates one candidate calibration model."""
    coefficients = fit_least_squares(
        features,
        target,
        weights,
    )

    fitted = features @ coefficients

    validation_predictions = leave_one_out_predictions(
        features,
        target,
        weights,
    )

    training_metrics = calculate_metrics(
        target,
        fitted,
    )

    validation_metrics = calculate_metrics(
        target,
        validation_predictions,
    )

    return {
        "model": name,
        "weighted": weights is not None,
        "parameters": features.shape[1],
        "train_r_squared": training_metrics["r_squared"],
        "train_rmse": training_metrics["rmse"],
        "train_mae": training_metrics["mae"],
        "train_max_error": training_metrics["max_absolute_error"],
        "loocv_rmse": validation_metrics["rmse"],
        "loocv_mae": validation_metrics["mae"],
        "loocv_max_error": validation_metrics["max_absolute_error"],
        "coefficients": coefficients.tolist(),
    }


def compare_models(
    data: pd.DataFrame,
    variables: list[str],
) -> pd.DataFrame:
    """Compares candidate calibration-rate models."""
    target = data["kcal_per_second"].to_numpy(dtype=float)

    calorie_weights = data["calorie_delta"].to_numpy(dtype=float)

    results = []

    for degree in range(1, 5):
        features = build_product_features(
            data,
            variables,
            degree,
        )

        results.append(
            evaluate_model(
                f"product polynomial degree {degree}",
                features,
                target,
            )
        )

        results.append(
            evaluate_model(
                f"product polynomial degree {degree}",
                features,
                target,
                calorie_weights,
            )
        )

    if len(variables) == 2:
        for degree in range(1, 4):
            features = build_2d_polynomial_features(
                data,
                variables,
                degree,
            )

            results.append(
                evaluate_model(
                    f"2D polynomial degree {degree}",
                    features,
                    target,
                )
            )

            results.append(
                evaluate_model(
                    f"2D polynomial degree {degree}",
                    features,
                    target,
                    calorie_weights,
                )
            )

    comparison = pd.DataFrame(results)

    return comparison.sort_values(
        "loocv_rmse",
        ascending=True,
    ).reset_index(drop=True)


def build_model_diagnostics(
    data: pd.DataFrame,
    features: np.ndarray,
    target: np.ndarray,
    weights: np.ndarray | None = None,
) -> pd.DataFrame:
    """Builds per-observation fit and leave-one-out diagnostics."""
    coefficients = fit_least_squares(
        features,
        target,
        weights,
    )

    fitted = features @ coefficients

    loocv_predictions = leave_one_out_predictions(
        features,
        target,
        weights,
    )

    diagnostics = data.copy()

    diagnostics["observed_kcal_per_second"] = target
    diagnostics["fitted_kcal_per_second"] = fitted
    diagnostics["fitted_residual"] = target - fitted

    diagnostics["fitted_absolute_error"] = np.abs(diagnostics["fitted_residual"])

    diagnostics["fitted_percent_error"] = (
        diagnostics["fitted_absolute_error"]
        / diagnostics["observed_kcal_per_second"]
        * 100
    )

    diagnostics["loocv_kcal_per_second"] = loocv_predictions

    diagnostics["loocv_residual"] = target - loocv_predictions

    diagnostics["loocv_absolute_error"] = np.abs(diagnostics["loocv_residual"])

    diagnostics["loocv_percent_error"] = (
        diagnostics["loocv_absolute_error"]
        / diagnostics["observed_kcal_per_second"]
        * 100
    )

    return diagnostics
