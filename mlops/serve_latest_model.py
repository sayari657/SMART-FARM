import mlflow
import pandas as pd

def load_and_infer():
    print("🌐 Simulation du Serving MLflow (Chargement du modèle dynamique)...")
    mlflow.set_tracking_uri("sqlite:///mlruns.db")
    
    model_name = "TelemetryAnomalyDetector"
    # Astuce : on peut charger "Production", "Staging" ou "latest"
    # Nous chargeons la version 'latest'
    try:
        model_uri = f"models:/{model_name}/latest"
        print(f"Chargement du modèle depuis l'URI : {model_uri}")
        model = mlflow.sklearn.load_model(model_uri)
    except Exception as e:
        print(f"Échec du chargement du modèle enregistré MLflow. ({e})")
        return

    # Simulation d'un json stream (données capteur en temps réel)
    new_data = pd.DataFrame([{
        "temperature": 39.5,   # Température anormalement chaude!
        "humidity": 45.0,
        "sound_level": 60.5,
        "hive_weight": 22.0
    }, {
        "temperature": 34.0,   # Nominal
        "humidity": 60.0,
        "sound_level": 40.5,
        "hive_weight": 25.0
    }])
    
    predictions = model.predict(new_data)
    
    print("\n--- RÉSULTATS INFÉRENCE ---")
    for i, pred in enumerate(predictions):
        status = "🔴 ANOMALIE" if pred == -1 else "🟢 NORMAL"
        print(f"Capteur {i+1} : {status} {new_data.iloc[i].to_dict()}")

if __name__ == "__main__":
    load_and_infer()
