import os
import mlflow
import pandas as pd


def load_and_infer():
    print("🌐 Simulation du Serving MLflow (Chargement du modèle dynamique)...")
    mlflow.set_tracking_uri(os.getenv("MLFLOW_TRACKING_URI", "sqlite:///mlruns.db"))

    model_name = "TelemetryAnomalyDetector"
    model = None
    # Prefer Staging (stable) — fall back to latest if no version promoted yet
    for stage in ("Staging", "latest"):
        try:
            model_uri = f"models:/{model_name}/{stage}"
            model = mlflow.sklearn.load_model(model_uri)
            print(f"Modèle chargé depuis : {model_uri}")
            break
        except Exception as e:
            print(f"Stage '{stage}' indisponible : {e}")

    if model is None:
        print("Échec du chargement du modèle MLflow — aucun stage disponible.")
        return

    # Simulation d'un json stream (données capteur en temps réel)
    new_data = pd.DataFrame([
        {"temperature": 39.5, "humidity": 45.0, "sound_level": 60.5, "hive_weight": 22.0},
        {"temperature": 34.0, "humidity": 60.0, "sound_level": 40.5, "hive_weight": 25.0},
    ])

    predictions = model.predict(new_data)

    print("\n--- RÉSULTATS INFÉRENCE ---")
    for i, pred in enumerate(predictions):
        status = "🔴 ANOMALIE" if pred == -1 else "🟢 NORMAL"
        print(f"Capteur {i+1} : {status} {new_data.iloc[i].to_dict()}")


if __name__ == "__main__":
    load_and_infer()
