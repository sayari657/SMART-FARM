"""
Smart Farm AI — Expert Data Science Study
=========================================
Complete analysis of the real IoT telemetry dataset (Node A irrigation +
Node B beehive). Produces a Markdown report and figures under mlops/ds_report/.

Pipeline
  1. Load + pivot long-format telemetry → wide per-node time series
  2. Data quality (missing, ranges, duplicates)
  3. Descriptive statistics per metric
  4. Time-series resampling + daily patterns
  5. Correlation analysis (Pearson)
  6. Unsupervised anomaly detection (IsolationForest) — same family as the
     production anomaly model
  7. Domain insights: irrigation thresholds (FAO-56) + hive health

Run:  python mlops/datascience_study.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
CSV = ROOT / "iot" / "iot_telemetry.csv"
OUT = ROOT / "mlops" / "ds_report"
OUT.mkdir(parents=True, exist_ok=True)

# Headless plotting
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

METRIC_MAP = {
    "Humidité Sol": "soil", "Pression": "pressure", "Débit": "flow", "Temp Sol": "soil_temp",
    "Poids Ruche": "hive_weight", "Temp Couvain": "brood_temp",
    "Temp Ext": "ext_temp", "Humidité Ext": "ext_hum",
}
DRY_THRESHOLD, WET_THRESHOLD = 35.0, 65.0   # FAO-56 / firmware irrigation seuils
BROOD_MIN, BROOD_MAX = 32.0, 36.0           # healthy brood band


def load() -> pd.DataFrame:
    if not CSV.exists():
        sys.exit(f"Dataset introuvable: {CSV}")
    df = pd.read_csv(CSV)
    df.columns = [c.strip() for c in df.columns]
    df["Timestamp"] = pd.to_datetime(df["Timestamp"], errors="coerce")
    df["Value"] = pd.to_numeric(df["Value"], errors="coerce")
    df["metric"] = df["Metric"].map(METRIC_MAP).fillna(df["Metric"])
    # Normalise both "Node A (Pompe)" and "NODE_A" → "Node A"
    raw = df["Node"].astype(str).str.upper()
    df["node"] = np.where(raw.str.contains("A"), "Node A",
                 np.where(raw.str.contains("B"), "Node B", df["Node"]))
    return df.dropna(subset=["Timestamp", "Value"])


def pivot_node(df: pd.DataFrame, node: str) -> pd.DataFrame:
    sub = df[df["node"] == node]
    if sub.empty:
        return pd.DataFrame()
    wide = sub.pivot_table(index="Timestamp", columns="metric", values="Value", aggfunc="mean")
    return wide.sort_index()


def section(lines, title):
    lines.append(f"\n## {title}\n")


def main():
    df = load()
    lines = ["# Smart Farm AI — Étude Data Science (IoT Telemetry)\n"]
    lines.append(f"- Enregistrements : **{len(df)}**")
    lines.append(f"- Période : **{df['Timestamp'].min()} → {df['Timestamp'].max()}**")
    lines.append(f"- Nœuds : {sorted(df['node'].unique())}")
    lines.append(f"- Métriques : {sorted(df['metric'].unique())}")

    # ── Data quality ──────────────────────────────────────────────────────────
    section(lines, "1. Qualité des données")
    dup = df.duplicated().sum()
    lines.append(f"- Doublons : {dup}")
    lines.append(f"- Valeurs manquantes (après parse) : {df['Value'].isna().sum()}")
    counts = df.groupby(["node", "metric"]).size().rename("n")
    lines.append("\n```\n" + counts.to_string() + "\n```")

    # ── Descriptive stats ─────────────────────────────────────────────────────
    section(lines, "2. Statistiques descriptives par métrique")
    desc = df.groupby("metric")["Value"].agg(["count", "mean", "std", "min", "median", "max"]).round(2)
    lines.append("\n```\n" + desc.to_string() + "\n```")

    nodeA = pivot_node(df, "Node A")
    nodeB = pivot_node(df, "Node B")

    # ── Time-series figure ────────────────────────────────────────────────────
    section(lines, "3. Séries temporelles")
    if not nodeA.empty and "soil" in nodeA:
        fig, ax = plt.subplots(figsize=(10, 4))
        nodeA["soil"].plot(ax=ax, label="Humidité sol %")
        ax.axhline(DRY_THRESHOLD, color="red", ls="--", lw=1, label=f"Seuil sec {DRY_THRESHOLD}%")
        ax.axhline(WET_THRESHOLD, color="green", ls="--", lw=1, label=f"Seuil humide {WET_THRESHOLD}%")
        ax.set_title("Node A — Humidité du sol vs seuils d'irrigation")
        ax.legend(fontsize=8); fig.tight_layout()
        fig.savefig(OUT / "soil_moisture.png", dpi=110); plt.close(fig)
        lines.append("![soil](soil_moisture.png)")

    # ── Correlation ───────────────────────────────────────────────────────────
    section(lines, "4. Corrélations (Pearson)")
    for name, wide in [("Node A", nodeA), ("Node B", nodeB)]:
        if wide.shape[1] >= 2:
            corr = wide.corr(numeric_only=True).round(2)
            lines.append(f"\n**{name}**\n\n```\n" + corr.to_string() + "\n```")

    # ── Anomaly detection ─────────────────────────────────────────────────────
    section(lines, "5. Détection d'anomalies (IsolationForest)")
    try:
        from sklearn.ensemble import IsolationForest
        for name, wide in [("Node A", nodeA), ("Node B", nodeB)]:
            feats = wide.dropna()
            if len(feats) >= 20:
                iso = IsolationForest(contamination=0.05, random_state=42)
                flags = iso.fit_predict(feats.values)
                n_anom = int((flags == -1).sum())
                lines.append(f"- {name} : **{n_anom}** anomalies / {len(feats)} points "
                             f"({100*n_anom/len(feats):.1f} %)")
            else:
                lines.append(f"- {name} : trop peu de points complets ({len(feats)}) pour l'IsolationForest")
    except ImportError:
        lines.append("- scikit-learn non installé — détection d'anomalies sautée")

    # ── Domain insights ───────────────────────────────────────────────────────
    section(lines, "6. Insights métier")
    if not nodeA.empty and "soil" in nodeA:
        dry = (nodeA["soil"] < DRY_THRESHOLD).mean() * 100
        wet = (nodeA["soil"] > WET_THRESHOLD).mean() * 100
        lines.append(f"- Sol sous le seuil sec ({DRY_THRESHOLD}%) : **{dry:.1f}%** du temps → besoin d'irrigation")
        lines.append(f"- Sol au-dessus du seuil humide ({WET_THRESHOLD}%) : **{wet:.1f}%** du temps")
        if "pump" in nodeA:
            lines.append(f"- Pompe active : {(nodeA['pump'] > 0).mean()*100:.1f}% du temps")
    if not nodeB.empty and "brood_temp" in nodeB:
        bt = nodeB["brood_temp"].dropna()
        if len(bt):
            out_band = ((bt < BROOD_MIN) | (bt > BROOD_MAX)).mean() * 100
            lines.append(f"- Temp. couvain hors plage saine [{BROOD_MIN}-{BROOD_MAX}°C] : **{out_band:.1f}%** du temps")
        if "hive_weight" in nodeB:
            w = nodeB["hive_weight"].dropna()
            if len(w) > 1:
                lines.append(f"- Variation poids ruche : {w.iloc[0]:.1f} → {w.iloc[-1]:.1f} kg "
                             f"(Δ {w.iloc[-1]-w.iloc[0]:+.1f} kg)")

    section(lines, "7. Conclusion")
    lines.append("Le pipeline (EDA → séries temporelles → corrélations → anomalies → "
                 "insights métier FAO-56) montre que les données IoT sont exploitables "
                 "pour piloter l'irrigation par seuils et surveiller la santé du rucher. "
                 "Les anomalies détectées alimentent le modèle de production (IsolationForest) "
                 "et la détection de drift PSI du scheduler.")

    report = OUT / "DATA_SCIENCE_REPORT.md"
    report.write_text("\n".join(lines), encoding="utf-8")
    print(f"[OK] Rapport: {report}")
    print(f"[OK] Figures: {OUT}")
    print(f"[OK] {len(df)} enregistrements analyses, nodes={sorted(df['node'].unique())}")


if __name__ == "__main__":
    main()
