import os
import sqlite3
import pandas as pd
import json


def build_dataset(db_path, output_csv, feedback_csv=None):
    """Extrait la télémétrie et les corrections ML de la BDD pour l'entraînement."""
    print(f"📦 Extraction des données de {db_path}...")

    if not os.path.exists(db_path):
        # Fallback : mock dataset si pas de DB
        print("DB non trouvée, génération d'un mock dataset...")
        import numpy as np
        data = {
            'temperature':  np.random.normal(35, 2, 1000),
            'humidity':     np.random.normal(60, 5, 1000),
            'sound_level':  np.random.normal(45, 3, 1000),
            'hive_weight':  np.random.normal(25, 1, 1000),
        }
        df = pd.DataFrame(data)
    else:
        conn = sqlite3.connect(db_path)
        cur  = conn.cursor()
        cur.execute("SELECT metrics FROM telemetry_records LIMIT 2000")
        rows = cur.fetchall()
        parsed_data = []
        for row in rows:
            try:
                parsed_data.append(json.loads(row[0]))
            except Exception:
                pass
        df = pd.DataFrame(parsed_data)

        # Export des corrections ML — utilisées pour analyser la dérive et
        # préparer un futur pipeline de fine-tuning supervisé des modèles YOLO
        if feedback_csv:
            try:
                df_fb = pd.read_sql_query(
                    """SELECT original_label, corrected_label, category, timestamp
                       FROM ml_feedback WHERE used_for_training = 1""",
                    conn,
                )
                os.makedirs(os.path.dirname(feedback_csv), exist_ok=True)
                df_fb.to_csv(feedback_csv, index=False)
                print(f"✅ Feedback exporté : {len(df_fb)} corrections dans {feedback_csv}")
            except Exception as e:
                print(f"⚠️  Feedback export skipped: {e}")
                # Créer un CSV vide pour que DVC ne plante pas
                if feedback_csv:
                    os.makedirs(os.path.dirname(feedback_csv), exist_ok=True)
                    pd.DataFrame(columns=["original_label", "corrected_label", "category", "timestamp"]).to_csv(
                        feedback_csv, index=False
                    )

        conn.close()

    # Nettoyage et complétion des features basiques (abeilles)
    features = ['temperature', 'humidity', 'sound_level', 'hive_weight']
    for f in features:
        if f not in df.columns:
            df[f] = 0.0

    df = df[features].dropna()

    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    df.to_csv(output_csv, index=False)
    print(f"✅ Dataset construit : {df.shape[0]} lignes enregistrées dans {output_csv}")


if __name__ == "__main__":
    build_dataset(
        db_path="backend/smart_farm.db",
        output_csv="mlops/data/telemetry_dataset.csv",
        feedback_csv="mlops/data/feedback_labels.csv",
    )
