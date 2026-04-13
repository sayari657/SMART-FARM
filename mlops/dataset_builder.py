import os
import sqlite3
import pandas as pd
import json

def build_dataset(db_path, output_csv):
    """Extrait la télémétrie de la BDD et construit un dataset pour l'entraînement ML."""
    print(f"📦 Extraction des données de {db_path}...")
    
    if not os.path.exists(db_path):
        # Fallback pour générer un mock complet si pas de DB
        print("DB non trouvée, génération d'un mock dataset...")
        import numpy as np
        data = {
            'temperature': np.random.normal(35, 2, 1000),
            'humidity': np.random.normal(60, 5, 1000),
            'sound_level': np.random.normal(45, 3, 1000),
            'hive_weight': np.random.normal(25, 1, 1000),
        }
        df = pd.DataFrame(data)
    else:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT metrics FROM telemetry_records LIMIT 2000")
        rows = cur.fetchall()
        parsed_data = []
        for row in rows:
            try:
                parsed_data.append(json.loads(row[0]))
            except:
                pass
        df = pd.DataFrame(parsed_data)
        conn.close()
    
    # Nettoyage et complétion des features basiques (abeilles)
    features = ['temperature', 'humidity', 'sound_level', 'hive_weight']
    for f in features:
        if f not in df.columns:
            df[f] = 0.0
            
    df = df[features].dropna()
    
    # Création du dossier mlops/data s'il n'existe pas
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    df.to_csv(output_csv, index=False)
    print(f"✅ Dataset construit : {df.shape[0]} lignes enregistrées dans {output_csv}")

if __name__ == "__main__":
    build_dataset(db_path="backend/smart_farm.db", output_csv="mlops/data/telemetry_dataset.csv")
