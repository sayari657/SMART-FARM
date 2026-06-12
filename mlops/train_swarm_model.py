"""
Entraînement du modèle de prédiction d'essaimage
=================================================
Dataset : « Beehive metrics » (HiveEyes — ruches Würzburg & Schwartau, Allemagne)
          https://www.kaggle.com/datasets/se18m502/bee-hive-metrics
          Fichiers attendus : weight_*.csv, temperature_*.csv (colonnes timestamp, valeur)

Téléchargement :
    pip install kaggle
    kaggle datasets download se18m502/bee-hive-metrics -p mlops/data/bee_hive_metrics --unzip

Méthodologie :
  1. Rééchantillonnage horaire du poids de ruche.
  2. Labellisation automatique des essaimages : chute ≥ 1,0 kg en ≤ 1 h
     suivie d'une non-récupération (proxy standard de la littérature,
     cf. Zacepins et al. 2016, "Remote detection of the swarming of honey
     bee colonies by single-point temperature monitoring").
  3. Features identiques au service runtime (delta_1h, delta_24h, slope_7d,
     brood_dev, month) calculées sur la fenêtre PRÉCÉDANT l'événement.
  4. GradientBoostingClassifier + validation temporelle (TimeSeriesSplit),
     métriques PR-AUC / rappel (classes très déséquilibrées).
  5. Export joblib → ai_assets/anomaly_detection/swarm_model.joblib
     (+ log MLflow si disponible), consommé par bee_swarm_service.

Usage :
    python mlops/train_swarm_model.py
    python mlops/train_swarm_model.py --data-dir mlops/data/bee_hive_metrics
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA = ROOT / "mlops" / "data" / "bee_hive_metrics"
MODEL_OUT = ROOT / "ai_assets" / "anomaly_detection" / "swarm_model.joblib"

SWARM_DROP_KG = 1.0          # chute horaire ≥ 1 kg = candidat essaimage
ALERT_WINDOW_H = 6           # horizon d'alerte : essaimage dans les 6 prochaines heures
BROOD_OPTIMAL_C = 35.0


def load_hive_frames(data_dir: Path) -> list[pd.DataFrame]:
    """Charge chaque ruche : DataFrame indexé heure avec colonnes weight (+brood_temp)."""
    frames = []
    # set() : le glob Windows est insensible à la casse → éviter les doublons
    weight_files = sorted(set(data_dir.glob("*weight*.csv")) | set(data_dir.glob("*Weight*.csv")))
    if not weight_files:
        print(f"[ERREUR] Aucun fichier *weight*.csv dans {data_dir}")
        print("Téléchargez : kaggle datasets download se18m502/bee-hive-metrics "
              f"-p {data_dir} --unzip")
        sys.exit(1)

    for wf in weight_files:
        df = pd.read_csv(wf)
        ts_col = next((c for c in df.columns if "time" in c.lower() or "date" in c.lower()), df.columns[0])
        val_col = next((c for c in df.columns if c != ts_col), df.columns[-1])
        df = df.rename(columns={ts_col: "ts", val_col: "weight"})
        df["ts"] = pd.to_datetime(df["ts"], errors="coerce")
        df = df.dropna(subset=["ts", "weight"]).set_index("ts").sort_index()

        # Normalisation d'unité : Schwartau est en grammes (~50 000),
        # Würzburg en kg (~50) → tout en kg
        if df["weight"].median() > 1000:
            df["weight"] = df["weight"] / 1000.0
            print(f"  {wf.name}: unité grammes détectée → conversion en kg")

        hourly = df[["weight"]].resample("1h").mean().interpolate(limit=3)

        # Température couvain du même site si présente (fichier homonyme)
        tf = Path(str(wf).replace("weight", "temperature").replace("Weight", "Temperature"))
        if tf.exists():
            t = pd.read_csv(tf)
            tts = next((c for c in t.columns if "time" in c.lower() or "date" in c.lower()), t.columns[0])
            tval = next((c for c in t.columns if c != tts), t.columns[-1])
            t = t.rename(columns={tts: "ts", tval: "brood_temp"})
            t["ts"] = pd.to_datetime(t["ts"], errors="coerce")
            t = t.dropna(subset=["ts"]).set_index("ts").sort_index()
            hourly = hourly.join(t[["brood_temp"]].resample("1h").mean(), how="left")
        else:
            hourly["brood_temp"] = np.nan

        hourly = hourly.dropna(subset=["weight"])
        if len(hourly) > 24 * 30:       # ≥ 1 mois de données
            frames.append(hourly)
            print(f"  {wf.name}: {len(hourly)} h, "
                  f"{hourly.index.min():%Y-%m-%d} → {hourly.index.max():%Y-%m-%d}")
    return frames


def build_dataset(frames: list[pd.DataFrame]) -> pd.DataFrame:
    """Features à H, label = essaimage détecté dans [H, H+ALERT_WINDOW_H]."""
    rows = []
    for hive_idx, df in enumerate(frames):
        w = df["weight"]
        delta_1h = w.diff(1)
        delta_24h = w.diff(24)
        slope_7d = (w - w.shift(24 * 7)) / 7.0
        brood_dev = df["brood_temp"].rolling(24, min_periods=4).mean() - BROOD_OPTIMAL_C

        # Événement : chute horaire ≥ 1 kg non récupérée à +24 h
        hourly_drop = w.diff(1)
        recovery = w.shift(-24) - w
        event = (hourly_drop <= -SWARM_DROP_KG) & (recovery.shift(1) <= -0.5)
        # Label : un événement survient dans la fenêtre d'alerte à venir
        label = (
            event.iloc[::-1].rolling(ALERT_WINDOW_H, min_periods=1).max().iloc[::-1]
            .shift(-1).fillna(0).astype(int)
        )

        out = pd.DataFrame({
            "delta_1h": delta_1h,
            "delta_24h": delta_24h,
            "slope_7d": slope_7d,
            "brood_dev": brood_dev.fillna(0.0),
            "month": df.index.month,
            "label": label,
            "hive": hive_idx,
        }).dropna(subset=["delta_1h", "delta_24h", "slope_7d"])
        rows.append(out)

    data = pd.concat(rows, ignore_index=False).sort_index()
    pos = int(data["label"].sum())
    print(f"\nDataset : {len(data)} fenêtres horaires, {pos} essaimages détectés "
          f"({100 * pos / max(len(data), 1):.2f} % positifs)")
    return data


def train(data: pd.DataFrame):
    from sklearn.ensemble import GradientBoostingClassifier
    from sklearn.metrics import average_precision_score, classification_report
    from sklearn.model_selection import TimeSeriesSplit

    feats = ["delta_1h", "delta_24h", "slope_7d", "brood_dev", "month"]
    X, y = data[feats].values, data["label"].values

    tscv = TimeSeriesSplit(n_splits=4)
    pr_aucs = []
    model = None
    for fold, (tr, te) in enumerate(tscv.split(X), 1):
        if y[tr].sum() == 0 or y[te].sum() == 0:
            print(f"  Fold {fold}: ignoré (aucun positif en train ou test)")
            continue
        model = GradientBoostingClassifier(
            n_estimators=200, max_depth=3, learning_rate=0.05,
            subsample=0.8, random_state=42,
        )
        model.fit(X[tr], y[tr])
        proba = model.predict_proba(X[te])[:, 1]
        ap = average_precision_score(y[te], proba)
        pr_aucs.append(ap)
        print(f"  Fold {fold}: PR-AUC = {ap:.3f} "
              f"(train {y[tr].sum()}/{len(tr)} pos, test {y[te].sum()}/{len(te)} pos)")

    print(f"\nPR-AUC moyen (validation temporelle) : {np.mean(pr_aucs):.3f}")

    # Réentraînement final sur tout le jeu
    model = GradientBoostingClassifier(
        n_estimators=200, max_depth=3, learning_rate=0.05,
        subsample=0.8, random_state=42,
    )
    model.fit(X, y)

    pred = (model.predict_proba(X)[:, 1] >= 0.5).astype(int)
    print("\nRapport (in-sample, indicatif) :")
    print(classification_report(y, pred, target_names=["normal", "essaimage"], zero_division=0))

    for name, imp in sorted(zip(feats, model.feature_importances_), key=lambda t: -t[1]):
        print(f"  importance {name:12s} {imp:.3f}")

    return model, float(np.mean(pr_aucs)) if pr_aucs else None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA)
    args = parser.parse_args()

    print(f"Chargement depuis {args.data_dir} …")
    frames = load_hive_frames(args.data_dir)
    data = build_dataset(frames)
    model, pr_auc = train(data)

    MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)
    import joblib
    joblib.dump(model, MODEL_OUT)
    print(f"\nModèle sauvegardé → {MODEL_OUT}")

    # Log MLflow (même tracking que les modèles YOLO du projet)
    try:
        import mlflow
        mlflow.set_experiment("swarm-prediction")
        with mlflow.start_run(run_name="gbdt-hiveeyes"):
            mlflow.log_params({"model": "GradientBoosting", "n_estimators": 200,
                               "max_depth": 3,
                               "label_rule": f"drop>={SWARM_DROP_KG}kg/1h dans {ALERT_WINDOW_H}h"})
            if pr_auc is not None:
                mlflow.log_metric("pr_auc_cv", pr_auc)
            mlflow.log_artifact(str(MODEL_OUT))
        print("Run MLflow loggé (experiment: swarm-prediction)")
    except Exception as exc:
        print(f"MLflow non loggé ({exc}) — modèle joblib disponible quand même")


if __name__ == "__main__":
    main()
