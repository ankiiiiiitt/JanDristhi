#!/usr/bin/env python3
"""
Road Condition ML Model Training Pipeline
=========================================
Trains and evaluates machine learning models on the official Ontario Pavement Condition Dataset
(Ministry of Transportation Ontario, Canada).

Best Practices Applied:
- Strict featurization ordering: split train/test BEFORE fitting encoders/scalers.
- Multi-model comparison (Ridge, Random Forest, Gradient Boosting).
- Comprehensive evaluation metrics: MAE, RMSE, R^2.
- Clear data provenance: explicitly tagged as foreign reference data (Ontario, Canada),
  never misrepresented as actual Chandigarh road data.
"""

import json
import logging
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score
import joblib

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("jandrishti.ml.train")


def train_and_evaluate():
    data_path = Path("data/external/ontario_pavement_condition_2023.csv")
    if not data_path.exists():
        raise FileNotFoundError(f"Dataset not found at {data_path}")

    logger.info(f"Loading Ontario Pavement Condition dataset from {data_path}...")
    df = pd.read_csv(data_path)
    df.columns = df.columns.str.strip()

    # 1. Cleaning & Feature Engineering
    logger.info(f"Initial raw rows: {len(df)}")
    # Drop rows without critical metrics
    df = df.dropna(subset=["PCI", "DMI", "IRI"]).copy()

    # Calculate segment length
    df["Segment_Length_KM"] = (df["TO_Distance"] - df["FROM_Distance"]).abs().round(3)
    df["Segment_Length_KM"] = df["Segment_Length_KM"].clip(lower=0.05, upper=50.0)

    # Standardize categorical features
    df["Pave_Type"] = df["Pave_Type"].fillna("AC").str.strip().str.upper()
    df["FUNC_CLASS"] = df["FUNC_CLASS"].fillna("ART").str.strip().str.upper()

    # Feature definitions
    num_features = ["DMI", "IRI", "Segment_Length_KM"]
    cat_features = ["Pave_Type", "FUNC_CLASS"]
    feature_cols = num_features + cat_features
    target_col = "PCI"

    X = df[feature_cols]
    y = df[target_col]

    logger.info(f"Features: {feature_cols}")
    logger.info(f"Cleaned dataset shape: {X.shape}")

    # 2. Strict Featurization Ordering: Train/Test Split BEFORE Preprocessing
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )
    logger.info(f"Train split size: {len(X_train)} | Unseen Test split size: {len(X_test)}")

    # Preprocessor definition
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), num_features),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_features),
        ]
    )

    # 3. Model Candidates
    models = {
        "Ridge_Regression": Ridge(alpha=1.0),
        "Random_Forest": RandomForestRegressor(n_estimators=120, max_depth=12, random_state=42),
        "Gradient_Boosting": GradientBoostingRegressor(n_estimators=140, learning_rate=0.08, max_depth=4, random_state=42)
    }

    eval_results = {}
    fitted_pipelines = {}

    for name, model in models.items():
        logger.info(f"Training candidate model: {name}...")
        pipeline = Pipeline(steps=[
            ("preprocessor", preprocessor),
            ("regressor", model)
        ])

        # Fit on training set only
        pipeline.fit(X_train, y_train)
        fitted_pipelines[name] = pipeline

        # Evaluate on unseen test set
        y_pred = pipeline.predict(X_test)
        mae = float(mean_absolute_error(y_test, y_pred))
        rmse = float(root_mean_squared_error(y_test, y_pred))
        r2 = float(r2_score(y_test, y_pred))

        eval_results[name] = {
            "MAE": round(mae, 3),
            "RMSE": round(rmse, 3),
            "R2_Score": round(r2, 4)
        }
        logger.info(f"[{name}] Test MAE: {mae:.3f} | RMSE: {rmse:.3f} | R2: {r2:.4f}")

    # 4. Select the Best Model
    best_name = max(eval_results, key=lambda k: eval_results[k]["R2_Score"])
    best_pipeline = fitted_pipelines[best_name]
    best_metrics = eval_results[best_name]
    logger.info(f"Selected best model: {best_name} with R^2 = {best_metrics['R2_Score']}")

    # 5. Persist Model and Metadata
    model_dir = Path("ai-engine/models")
    model_dir.mkdir(parents=True, exist_ok=True)
    model_save_path = model_dir / "road_condition_model.joblib"
    meta_save_path = model_dir / "model_metadata.json"

    joblib.dump(best_pipeline, model_save_path)
    logger.info(f"Saved best model pipeline to: {model_save_path}")

    metadata = {
        "model_name": best_name,
        "framework": "scikit-learn",
        "task": "Pavement Condition Index (PCI) Prediction",
        "target": "PCI (0 - 100)",
        "features": {
            "numerical": num_features,
            "categorical": cat_features
        },
        "evaluation_metrics_unseen_test": best_metrics,
        "all_models_evaluated": eval_results,
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "data_provenance": {
            "source_dataset": "Ontario Provincial Highway Pavement Condition (2023)",
            "publisher": "Ministry of Transportation, Ontario (Canada)",
            "source_url": "https://data.ontario.ca/dataset/pavement-condition-for-provincial-highways",
            "is_chandigarh_local_data": False,
            "regional_context": "Foreign reference benchmark dataset (Ontario, Canada)",
            "usage": "Transfer learning prior & engineering regression baseline for road condition index"
        }
    }

    with open(meta_save_path, "w") as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"Saved model metadata to: {meta_save_path}")
    print("\n" + "=" * 60)
    print("TRAINING & EVALUATION COMPLETE")
    print(f"Selected Best Model: {best_name}")
    print(f"Test MAE:  {best_metrics['MAE']}")
    print(f"Test RMSE: {best_metrics['RMSE']}")
    print(f"Test R^2:  {best_metrics['R2_Score']}")
    print("=" * 60)


if __name__ == "__main__":
    train_and_evaluate()
