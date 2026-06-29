"""
MLOps Training Pipeline — Smart Farm AI v3.0
=============================================
Benchmark de 3 algorithmes de détection d'anomalies :
  1. IsolationForest (random ensemble)
  2. LocalOutlierFactor (density-based)
  3. OneClassSVM (kernel-based)

Sélectionne automatiquement le meilleur selon la silhouette score.
Tous les résultats sont loggés dans MLflow avec tags par algorithme.
"""

import os
import json
import argparse
import pandas as pd
import numpy as np
import mlflow
import mlflow.sklearn
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.svm import OneClassSVM
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler
import joblib


def evaluate_algorithm(name: str, clf, X: np.ndarray) -> dict:
    """Train and evaluate an anomaly detector. Returns metrics dict."""
    try:
        if name == "LocalOutlierFactor":
            preds = clf.fit_predict(X)
        else:
            clf.fit(X)
            preds = clf.predict(X)

        n_anomalies = int(np.sum(preds == -1))
        try:
            sil = float(silhouette_score(X, preds))
        except ValueError:
            sil = 0.0

        return {
            "algorithm": name,
            "silhouette_score": round(sil, 4),
            "n_anomalies": n_anomalies,
            "anomaly_rate_pct": round(n_anomalies / len(preds) * 100, 2),
            "success": True,
        }
    except Exception as exc:
        print(f"  [{name}] Erreur : {exc}")
        return {"algorithm": name, "silhouette_score": -1.0, "success": False, "error": str(exc)}


def main(data_path: str, n_estimators: int, contamination: float):
    print("🚀 Début du benchmark MLOps — 3 algorithmes d'anomalie...")

    mlflow.set_tracking_uri(os.getenv("MLFLOW_TRACKING_URI", "sqlite:///mlruns.db"))
    mlflow.set_experiment("Farm_Anomaly_Detection")

    # ── Load data ─────────────────────────────────────────────────────────────
    df = pd.read_csv(data_path)
    print(f"📊 Dataset chargé : {df.shape[0]} lignes × {df.shape[1]} colonnes")

    X = df.select_dtypes(include=[np.number]).fillna(df.mean(numeric_only=True)).values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # ── Define 3 candidates ───────────────────────────────────────────────────
    candidates = [
        ("IsolationForest",
         IsolationForest(n_estimators=n_estimators, contamination=contamination, random_state=42)),
        ("LocalOutlierFactor",
         LocalOutlierFactor(n_neighbors=20, contamination=contamination)),
        ("OneClassSVM",
         OneClassSVM(nu=contamination, kernel="rbf", gamma="scale")),
    ]

    results = []
    models = {}

    # ── Benchmark each algorithm ───────────────────────────────────────────────
    for name, clf in candidates:
        print(f"\n  📐 Entraînement {name}...")
        metrics = evaluate_algorithm(name, clf, X_scaled)

        try:
            with mlflow.start_run(run_name=name, nested=True):
                mlflow.set_tag("algorithm", name)
                mlflow.set_tag("model_type", "anomaly_detection")
                mlflow.log_params({
                    "n_samples": len(X_scaled),
                    "n_features": X_scaled.shape[1],
                    "contamination": contamination,
                    "algorithm": name,
                })
                mlflow.log_metric("silhouette_score", metrics["silhouette_score"])
                if metrics.get("n_anomalies") is not None:
                    mlflow.log_metric("n_anomalies", metrics["n_anomalies"])
                    mlflow.log_metric("anomaly_rate_pct", metrics["anomaly_rate_pct"])

                if metrics["success"] and name != "LocalOutlierFactor":
                    mlflow.sklearn.log_model(clf, name=f"model_{name.lower()}")
        except Exception as e:
            print(f"  [{name}] MLflow logging error : {e}")

        results.append(metrics)
        if metrics["success"] and name != "LocalOutlierFactor":
            models[name] = clf

        print(f"  ✅ {name} — Silhouette: {metrics['silhouette_score']:.4f} | "
              f"Anomalies: {metrics.get('n_anomalies', 'N/A')}")

    # ── Select best model ──────────────────────────────────────────────────────
    successful = [r for r in results if r["success"]]
    if not successful:
        print("❌ Aucun algorithme n'a réussi.")
        return

    best = max(successful, key=lambda r: r["silhouette_score"])
    print(f"\n🏆 Meilleur algorithme : {best['algorithm']} (Silhouette={best['silhouette_score']:.4f})")

    # ── Save best model + scaler ───────────────────────────────────────────────
    os.makedirs("mlops/models", exist_ok=True)
    best_clf = models.get(best["algorithm"])

    if best_clf is None:
        best_clf = IsolationForest(n_estimators=n_estimators, contamination=contamination, random_state=42)
        best_clf.fit(X_scaled)

    joblib.dump(best_clf, "mlops/models/anomaly_detector.pkl")
    joblib.dump(scaler,   "mlops/models/scaler.pkl")
    print("💾 Modèle et scaler sauvegardés dans mlops/models/")

    # ── Write DVC metrics ──────────────────────────────────────────────────────
    metrics_out = {
        "best_algorithm":   best["algorithm"],
        "silhouette_score": best["silhouette_score"],
        "anomaly_rate_pct": best.get("anomaly_rate_pct", 0.0),
    }
    with open("mlops/metrics.json", "w") as f:
        json.dump(metrics_out, f, indent=2)
    print("📊 Métriques sauvegardées dans mlops/metrics.json")

    # ── Log best model globally ────────────────────────────────────────────────
    try:
        with mlflow.start_run(run_name=f"BEST_{best['algorithm']}"):
            mlflow.set_tag("algorithm", best["algorithm"])
            mlflow.set_tag("status", "best_model")
            mlflow.log_params({
                "best_algorithm": best["algorithm"],
                "n_estimators": n_estimators,
                "contamination": contamination,
            })
            mlflow.log_metric("silhouette_score", best["silhouette_score"])
            mlflow.sklearn.log_model(
                sk_model=best_clf,
                name="anomaly_detector",
                registered_model_name="TelemetryAnomalyDetector",
            )
    except Exception as e:
        print(f"MLflow global run logging error: {e}")

    # ── Print comparison table ─────────────────────────────────────────────────
    print("\n" + "="*60)
    print("  BENCHMARK COMPARISON TABLE")
    print("="*60)
    print(f"  {'Algorithm':<25} {'Silhouette':>12} {'Anomalies':>10} {'Rate %':>8}")
    print("-"*60)
    for r in sorted(results, key=lambda x: x["silhouette_score"], reverse=True):
        marker = " ◀ BEST" if r["algorithm"] == best["algorithm"] else ""
        n_anom = str(r.get("n_anomalies", "N/A"))
        rate   = f"{r.get('anomaly_rate_pct', 0):.1f}%" if r.get("anomaly_rate_pct") is not None else "N/A"
        print(f"  {r['algorithm']:<25} {r['silhouette_score']:>12.4f} {n_anom:>10} {rate:>8}{marker}")
    print("="*60)
    print("✅ Pipeline terminé. Résultats disponibles dans MLflow UI : mlflow ui")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Farm AI — Anomaly Detection Benchmark")
    parser.add_argument("--data",          type=str,   default="mlops/data/telemetry_dataset.csv")
    parser.add_argument("--n_estimators",  type=int,   default=150)
    parser.add_argument("--contamination", type=float, default=0.05)
    args = parser.parse_args()

    main(args.data, args.n_estimators, args.contamination)
