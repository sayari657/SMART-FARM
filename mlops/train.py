import os
import argparse
import pandas as pd
import mlflow
import mlflow.sklearn
from sklearn.ensemble import IsolationForest
from sklearn.metrics import silhouette_score
import joblib

def main(data_path, n_estimators, contamination):
    print("🚀 Début de l'entraînement MLflow...")
    
    # MLflow Setup
    mlflow.set_tracking_uri("sqlite:///mlruns.db")
    mlflow.set_experiment("Farm_Anomaly_Detection")

    with mlflow.start_run():
        # 1. Log les hyperparamètres
        mlflow.log_params({
            "n_estimators": n_estimators,
            "contamination": contamination,
            "data_source": data_path
        })
        
        # 2. Chargement des données
        df = pd.read_csv(data_path)
        print(f"📊 Dataset chargé : {df.shape}")
        
        # 3. Entraînement du modèle (Détection d'anomalies non-supervisée)
        clf = IsolationForest(
            n_estimators=n_estimators,
            contamination=contamination,
            random_state=42
        )
        clf.fit(df)
        
        # Generation de prédictions sur les traning data pour évaluation basique
        preds = clf.predict(df)
        
        # 4. Evaluation Factice - Métriques d'anomalie
        # La silhouette met en évidence la séparation des inliers/outliers
        # On évite le crash si contamination est très faible
        try:
            score = silhouette_score(df, preds)
        except ValueError:
            score = 0.0
            
        print(f"📈 Métrique obtenue (Silhouette) : {score:.3f}")
        mlflow.log_metric("silhouette_score", score)
        
        # 5. Enregistrement du Modèle dans Model Registry
        # On sauvegarde le modèle
        mlflow.sklearn.log_model(
            sk_model=clf,
            artifact_path="anomaly_detector",
            registered_model_name="TelemetryAnomalyDetector"
        )
        
        # Export également pour DVC Dépôt
        os.makedirs("mlops/models", exist_ok=True)
        joblib.dump(clf, "mlops/models/anomaly_detector.pkl")
        
        print("✅ Fin de l'entraînement et modèle enregistré sur MLflow.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=str, default="mlops/data/telemetry_dataset.csv")
    parser.add_argument("--n_estimators", type=int, default=100)
    parser.add_argument("--contamination", type=float, default=0.05)
    args = parser.parse_args()
    
    main(args.data, args.n_estimators, args.contamination)
