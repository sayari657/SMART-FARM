"""
Figures SHAP pour le mémoire — explicabilité du modèle d'essaimage
===================================================================
Utilise le modèle GradientBoosting entraîné (swarm_model.joblib) et le
dataset HiveEyes réel pour produire :

  1. shap_summary_swarm.png   — beeswarm global (importance + direction)
  2. shap_waterfall_swarm.png — décomposition d'une prédiction à haut risque
  3. shap_bar_swarm.png       — importance moyenne |SHAP| par feature

Sortie : mlops/ds_report/shap/  (300 dpi, prêtes pour LaTeX)

Usage : python mlops/generate_shap_figures.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import shap

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "mlops"))

from train_swarm_model import DEFAULT_DATA, build_dataset, load_hive_frames  # noqa: E402

MODEL = ROOT / "ai_assets" / "anomaly_detection" / "swarm_model.joblib"
OUT = ROOT / "mlops" / "ds_report" / "shap"
FEATS = ["delta_1h", "delta_24h", "slope_7d", "brood_dev", "month"]
FEAT_LABELS = ["Δ poids 1 h (kg)", "Δ poids 24 h (kg)", "Pente 7 j (kg/j)",
               "Écart T° couvain (°C)", "Mois"]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    model = joblib.load(MODEL)
    print("Modèle chargé :", MODEL.name)

    frames = load_hive_frames(DEFAULT_DATA)
    data = build_dataset(frames)
    X = data[FEATS].values
    y = data["label"].values

    # Échantillon stratifié : tous les positifs + 2 000 négatifs
    pos_idx = np.where(y == 1)[0]
    neg_idx = np.random.RandomState(42).choice(np.where(y == 0)[0], 2000, replace=False)
    sample = np.concatenate([pos_idx, neg_idx])
    Xs = X[sample]

    explainer = shap.TreeExplainer(model)
    sv = explainer.shap_values(Xs)
    print(f"SHAP calculé sur {len(Xs)} fenêtres ({len(pos_idx)} essaimages)")

    # 1) Beeswarm global
    plt.figure(figsize=(8, 4.5))
    shap.summary_plot(sv, Xs, feature_names=FEAT_LABELS, show=False)
    plt.title("Explicabilité SHAP — modèle de prédiction d'essaimage (HiveEyes)", fontsize=11)
    plt.tight_layout()
    plt.savefig(OUT / "shap_summary_swarm.png", dpi=300, bbox_inches="tight")
    plt.close()

    # 2) Waterfall sur la fenêtre positive au score le plus élevé
    proba = model.predict_proba(Xs)[:, 1]
    pos_in_sample = np.arange(len(pos_idx))           # positifs en tête de l'échantillon
    top = pos_in_sample[np.argmax(proba[pos_in_sample])]
    expl = shap.Explanation(
        values=sv[top], base_values=float(np.ravel(explainer.expected_value)[0]),
        data=Xs[top], feature_names=FEAT_LABELS,
    )
    plt.figure(figsize=(8, 4.5))
    shap.plots.waterfall(expl, show=False)
    plt.title(f"Décomposition d'une alerte essaimage (p = {proba[top]:.2f})", fontsize=11)
    plt.tight_layout()
    plt.savefig(OUT / "shap_waterfall_swarm.png", dpi=300, bbox_inches="tight")
    plt.close()

    # 3) Importance moyenne |SHAP|
    plt.figure(figsize=(7, 3.5))
    shap.summary_plot(sv, Xs, feature_names=FEAT_LABELS, plot_type="bar", show=False)
    plt.title("Importance moyenne |SHAP| par variable", fontsize=11)
    plt.tight_layout()
    plt.savefig(OUT / "shap_bar_swarm.png", dpi=300, bbox_inches="tight")
    plt.close()

    print("Figures générées dans", OUT)
    for f in sorted(OUT.glob("*.png")):
        print("  -", f.name)


if __name__ == "__main__":
    main()
