from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import yaml
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch
from PIL import Image
from sklearn.decomposition import PCA
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "diagramme" / "05_DataScience_Rapport" / "images"
BEE_DIR = ROOT / "ai_assets" / "animal_weights" / "bee" / "final_export"
TELEMETRY_CSV = ROOT / "mlops" / "data" / "telemetry_dataset.csv"

COLORS = {
    "navy": "#16324F",
    "blue": "#2563EB",
    "teal": "#0F766E",
    "green": "#059669",
    "amber": "#D97706",
    "orange": "#EA580C",
    "red": "#DC2626",
    "purple": "#7E22CE",
    "slate": "#475569",
    "light": "#F8FAFC",
}


def set_style() -> None:
    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "font.size": 10,
            "axes.titlesize": 12,
            "axes.labelsize": 10,
            "axes.edgecolor": "#CBD5E1",
            "axes.linewidth": 0.8,
            "axes.grid": True,
            "grid.color": "#E2E8F0",
            "grid.linewidth": 0.7,
            "grid.alpha": 0.8,
            "figure.facecolor": "white",
            "axes.facecolor": "white",
            "savefig.facecolor": "white",
        }
    )


def save_figure(fig: plt.Figure, stem: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT / f"{stem}.png", dpi=300, bbox_inches="tight")
    fig.savefig(OUT / f"{stem}.svg", bbox_inches="tight")
    plt.close(fig)


def add_box(
    ax: plt.Axes,
    x: float,
    y: float,
    width: float,
    height: float,
    text: str,
    *,
    facecolor: str,
    edgecolor: str,
    textcolor: str = "#0F172A",
    fontsize: float = 10,
) -> None:
    patch = FancyBboxPatch(
        (x, y),
        width,
        height,
        boxstyle="round,pad=0.012,rounding_size=0.02",
        linewidth=1.5,
        facecolor=facecolor,
        edgecolor=edgecolor,
    )
    ax.add_patch(patch)
    ax.text(
        x + width / 2,
        y + height / 2,
        text,
        ha="center",
        va="center",
        color=textcolor,
        fontsize=fontsize,
        fontweight="semibold",
        wrap=True,
    )


def add_arrow(
    ax: plt.Axes, start: tuple[float, float], end: tuple[float, float], color: str = "#64748B"
) -> None:
    ax.add_patch(
        FancyArrowPatch(
            start,
            end,
            arrowstyle="-|>",
            mutation_scale=14,
            linewidth=1.5,
            color=color,
            connectionstyle="arc3,rad=0.0",
        )
    )


def generate_dataset_structure() -> None:
    with (BEE_DIR / "beedata_kaggle.yaml").open("r", encoding="utf-8") as handle:
        data_cfg = yaml.safe_load(handle)
    with (BEE_DIR / "args.yaml").open("r", encoding="utf-8") as handle:
        train_cfg = yaml.safe_load(handle)

    classes = [data_cfg["names"][idx] for idx in sorted(data_cfg["names"])]

    fig, ax = plt.subplots(figsize=(13.5, 7.6))
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    fig.suptitle(
        "Structure du jeu de données BeeData et configuration d'entraînement",
        fontsize=17,
        fontweight="bold",
        color=COLORS["navy"],
        y=0.98,
    )

    add_box(
        ax,
        0.04,
        0.66,
        0.18,
        0.16,
        "BeeData\nSource Kaggle",
        facecolor="#EFF6FF",
        edgecolor=COLORS["blue"],
        fontsize=12,
    )

    split_positions = [
        ("TRAIN", data_cfg["train"], 0.33, COLORS["green"]),
        ("VALIDATION", data_cfg["val"], 0.55, COLORS["amber"]),
        ("TEST", data_cfg["test"], 0.77, COLORS["purple"]),
    ]
    for label, path, x, color in split_positions:
        add_box(
            ax,
            x,
            0.68,
            0.16,
            0.12,
            f"{label}\n{path}",
            facecolor="#FFFFFF",
            edgecolor=color,
            fontsize=10,
        )
        add_arrow(ax, (0.22, 0.74), (x, 0.74), color)

    ax.text(
        0.5,
        0.57,
        "Taxonomie de détection",
        ha="center",
        fontsize=13,
        fontweight="bold",
        color=COLORS["navy"],
    )

    class_colors = [COLORS["blue"], COLORS["slate"], COLORS["amber"], COLORS["purple"]]
    class_descriptions = [
        "Abeille ouvrière",
        "Mâle reproducteur",
        "Ouvrière avec pollen",
        "Reine de la colonie",
    ]
    for idx, (name, description, color) in enumerate(
        zip(classes, class_descriptions, class_colors)
    ):
        x = 0.08 + idx * 0.23
        add_box(
            ax,
            x,
            0.38,
            0.19,
            0.12,
            f"Classe {idx}: {name}\n{description}",
            facecolor="#FFFFFF",
            edgecolor=color,
            fontsize=9.5,
        )

    config_text = (
        f"Tâche: {str(train_cfg['task']).upper()} (boîtes orientées)\n"
        f"Architecture: {train_cfg['model']}\n"
        f"Résolution: {train_cfg['imgsz']} x {train_cfg['imgsz']} px\n"
        f"Époques: {train_cfg['epochs']} | Batch: {train_cfg['batch']}\n"
        f"Optimiseur: {train_cfg['optimizer']} | AMP: {train_cfg['amp']}"
    )
    add_box(
        ax,
        0.18,
        0.10,
        0.64,
        0.18,
        config_text,
        facecolor="#F0FDFA",
        edgecolor=COLORS["teal"],
        fontsize=11,
    )
    add_arrow(ax, (0.5, 0.38), (0.5, 0.28), COLORS["teal"])

    ax.text(
        0.5,
        0.035,
        "Remarque: les nombres d'images par classe ne sont pas disponibles dans le dépôt local; "
        "aucune distribution n'est donc inventée.",
        ha="center",
        va="center",
        fontsize=8.5,
        color=COLORS["slate"],
        style="italic",
    )
    save_figure(fig, "01_structure_dataset_abeilles")


def generate_prediction_mosaic() -> None:
    prediction_files = sorted((BEE_DIR / "predictions").glob("image*.jpg"))
    fig, axes = plt.subplots(2, 3, figsize=(14, 8.5))
    selected = [prediction_files[i] for i in [1, 2, 4, 5, 8, 9]]

    for idx, (ax, path) in enumerate(zip(axes.flat, selected), start=1):
        image = Image.open(path).convert("RGB")
        ax.imshow(image)
        ax.set_title(f"Exemple d'inférence {idx}", fontsize=10, fontweight="semibold")
        ax.axis("off")

    fig.suptitle(
        "Résultats qualitatifs du modèle YOLO OBB pour les abeilles",
        fontsize=16,
        fontweight="bold",
        color=COLORS["navy"],
        y=0.99,
    )
    fig.text(
        0.5,
        0.01,
        "Les cadres affichés sont des sorties réelles du modèle stockées dans "
        "ai_assets/animal_weights/bee/final_export/predictions.",
        ha="center",
        fontsize=9,
        color=COLORS["slate"],
    )
    fig.tight_layout(rect=(0, 0.04, 1, 0.96))
    save_figure(fig, "02_predictions_qualitatives_abeilles")


def load_bee_results() -> pd.DataFrame:
    results = pd.read_csv(BEE_DIR / "results.csv")
    results.columns = [column.strip() for column in results.columns]
    return results


def generate_training_curves() -> None:
    results = load_bee_results()
    epoch = results["epoch"]
    best_idx = results["metrics/mAP50(B)"].idxmax()
    best_epoch = int(results.loc[best_idx, "epoch"])

    fig, axes = plt.subplots(2, 2, figsize=(13.5, 8.2))

    axes[0, 0].plot(epoch, results["train/box_loss"], label="Train", color=COLORS["blue"])
    axes[0, 0].plot(epoch, results["val/box_loss"], label="Validation", color=COLORS["orange"])
    axes[0, 0].set_title("Perte de localisation (Box Loss)")
    axes[0, 0].set_xlabel("Époque")
    axes[0, 0].set_ylabel("Perte")
    axes[0, 0].legend()

    axes[0, 1].plot(epoch, results["train/cls_loss"], label="Train", color=COLORS["green"])
    axes[0, 1].plot(epoch, results["val/cls_loss"], label="Validation", color=COLORS["red"])
    axes[0, 1].set_title("Perte de classification")
    axes[0, 1].set_xlabel("Époque")
    axes[0, 1].set_ylabel("Perte")
    axes[0, 1].legend()

    axes[1, 0].plot(
        epoch, results["metrics/precision(B)"], label="Précision", color=COLORS["purple"]
    )
    axes[1, 0].plot(
        epoch, results["metrics/recall(B)"], label="Rappel", color=COLORS["teal"]
    )
    axes[1, 0].set_title("Précision et rappel")
    axes[1, 0].set_xlabel("Époque")
    axes[1, 0].set_ylabel("Score")
    axes[1, 0].set_ylim(0, 1)
    axes[1, 0].legend()

    axes[1, 1].plot(
        epoch, results["metrics/mAP50(B)"], label="mAP@50", color=COLORS["blue"]
    )
    axes[1, 1].plot(
        epoch,
        results["metrics/mAP50-95(B)"],
        label="mAP@50-95",
        color=COLORS["amber"],
    )
    axes[1, 1].axvline(
        best_epoch,
        color=COLORS["red"],
        linestyle="--",
        linewidth=1.2,
        label=f"Meilleure époque: {best_epoch}",
    )
    axes[1, 1].set_title("Performance de détection")
    axes[1, 1].set_xlabel("Époque")
    axes[1, 1].set_ylabel("mAP")
    axes[1, 1].set_ylim(0, 1)
    axes[1, 1].legend()

    fig.suptitle(
        "Courbes d'apprentissage du modèle Bee YOLO OBB",
        fontsize=16,
        fontweight="bold",
        color=COLORS["navy"],
    )
    fig.text(
        0.5,
        0.01,
        "120 époques, résolution 768 px, AdamW. Source: final_export/results.csv.",
        ha="center",
        fontsize=9,
        color=COLORS["slate"],
    )
    fig.tight_layout(rect=(0, 0.04, 1, 0.95))
    save_figure(fig, "03_courbes_entrainement_abeilles")


def generate_performance_summary() -> None:
    results = load_bee_results()
    best_idx = results["metrics/mAP50(B)"].idxmax()
    best = results.loc[best_idx]
    final = results.iloc[-1]

    labels = ["Précision", "Rappel", "mAP@50", "mAP@50-95"]
    values = [
        best["metrics/precision(B)"],
        best["metrics/recall(B)"],
        best["metrics/mAP50(B)"],
        best["metrics/mAP50-95(B)"],
    ]

    fig = plt.figure(figsize=(12.5, 6.8))
    grid = fig.add_gridspec(2, 4, height_ratios=[1, 2.4], hspace=0.35)

    cards = [
        ("Meilleure époque", f"{int(best['epoch'])} / {len(results)}"),
        ("Temps total", f"{final['time'] / 60:.1f} min"),
        ("mAP@50 final", f"{final['metrics/mAP50(B)']:.3f}"),
        ("Modèle", "YOLO OBB"),
    ]
    for idx, (label, value) in enumerate(cards):
        ax = fig.add_subplot(grid[0, idx])
        ax.axis("off")
        box = FancyBboxPatch(
            (0.04, 0.12),
            0.92,
            0.76,
            boxstyle="round,pad=0.02,rounding_size=0.04",
            facecolor="#EFF6FF",
            edgecolor=COLORS["blue"],
            linewidth=1.4,
        )
        ax.add_patch(box)
        ax.text(0.5, 0.62, value, ha="center", va="center", fontsize=18, fontweight="bold")
        ax.text(0.5, 0.32, label, ha="center", va="center", fontsize=9, color=COLORS["slate"])

    ax_bar = fig.add_subplot(grid[1, :])
    bars = ax_bar.bar(
        labels,
        values,
        color=[COLORS["purple"], COLORS["teal"], COLORS["blue"], COLORS["amber"]],
        width=0.62,
    )
    ax_bar.set_ylim(0, 1)
    ax_bar.set_ylabel("Score")
    ax_bar.set_title(
        f"Métriques à l'époque {int(best['epoch'])}, sélectionnée par le meilleur mAP@50"
    )
    for bar, value in zip(bars, values):
        ax_bar.text(
            bar.get_x() + bar.get_width() / 2,
            value + 0.025,
            f"{value:.3f}",
            ha="center",
            fontweight="bold",
        )

    fig.suptitle(
        "Synthèse quantitative du modèle de détection d'abeilles",
        fontsize=16,
        fontweight="bold",
        color=COLORS["navy"],
    )
    fig.text(
        0.5,
        0.015,
        "Les valeurs proviennent directement de l'historique d'entraînement YOLO.",
        ha="center",
        fontsize=9,
        color=COLORS["slate"],
    )
    fig.tight_layout(rect=(0, 0.04, 1, 0.94))
    save_figure(fig, "04_synthese_performance_abeilles")


def load_telemetry() -> pd.DataFrame:
    telemetry = pd.read_csv(TELEMETRY_CSV)
    telemetry["timestamp"] = pd.to_datetime(telemetry["timestamp"], errors="coerce")
    numeric = ["temperature", "humidity", "hive_weight", "sound_level"]
    telemetry[numeric] = telemetry[numeric].apply(pd.to_numeric, errors="coerce")
    return telemetry.dropna(subset=["timestamp", *numeric]).sort_values("timestamp")


def generate_telemetry_eda() -> None:
    telemetry = load_telemetry()
    sample = telemetry.head(24 * 14)
    features = ["temperature", "humidity", "hive_weight", "sound_level"]
    labels = ["Température (°C)", "Humidité (%)", "Poids ruche (kg)", "Niveau sonore"]

    fig, axes = plt.subplots(2, 2, figsize=(13.5, 8.3))

    axes[0, 0].plot(sample["timestamp"], sample["temperature"], color=COLORS["red"], linewidth=1.4)
    axes[0, 0].set_title("Température sur les 14 premiers jours")
    axes[0, 0].set_ylabel("°C")
    axes[0, 0].tick_params(axis="x", rotation=25)

    axes[0, 1].plot(sample["timestamp"], sample["hive_weight"], color=COLORS["amber"], linewidth=1.4)
    axes[0, 1].set_title("Poids de la ruche sur les 14 premiers jours")
    axes[0, 1].set_ylabel("kg")
    axes[0, 1].tick_params(axis="x", rotation=25)

    box_data = [telemetry[feature].values for feature in features]
    box = axes[1, 0].boxplot(box_data, patch_artist=True, labels=labels)
    for patch, color in zip(
        box["boxes"], [COLORS["red"], COLORS["blue"], COLORS["amber"], COLORS["purple"]]
    ):
        patch.set_facecolor(color)
        patch.set_alpha(0.65)
    axes[1, 0].set_title("Distribution des variables télémétriques")
    axes[1, 0].tick_params(axis="x", rotation=18)
    axes[1, 0].grid(axis="x", visible=False)

    corr = telemetry[features].corr()
    image = axes[1, 1].imshow(corr, cmap="RdBu_r", vmin=-1, vmax=1)
    axes[1, 1].set_xticks(range(len(features)), labels, rotation=25, ha="right")
    axes[1, 1].set_yticks(range(len(features)), labels)
    axes[1, 1].set_title("Matrice de corrélation")
    axes[1, 1].grid(False)
    for row in range(len(features)):
        for col in range(len(features)):
            axes[1, 1].text(
                col,
                row,
                f"{corr.iloc[row, col]:.2f}",
                ha="center",
                va="center",
                color="white" if abs(corr.iloc[row, col]) > 0.55 else "#0F172A",
                fontweight="bold",
            )
    fig.colorbar(image, ax=axes[1, 1], fraction=0.046, pad=0.04)

    fig.suptitle(
        f"Analyse exploratoire de la télémétrie apicole (n={len(telemetry):,})",
        fontsize=16,
        fontweight="bold",
        color=COLORS["navy"],
    )
    fig.text(
        0.5,
        0.01,
        "Variables: température, humidité, poids de ruche et niveau sonore. "
        "Source: mlops/data/telemetry_dataset.csv.",
        ha="center",
        fontsize=9,
        color=COLORS["slate"],
    )
    fig.tight_layout(rect=(0, 0.04, 1, 0.95))
    save_figure(fig, "05_eda_telemetrie_apicole")


def generate_anomaly_visualization() -> None:
    telemetry = load_telemetry()
    features = ["temperature", "humidity", "hive_weight", "sound_level"]
    x = telemetry[features].values
    scaler = StandardScaler()
    x_scaled = scaler.fit_transform(x)

    model = IsolationForest(
        n_estimators=150,
        contamination=0.05,
        random_state=42,
    )
    prediction = model.fit_predict(x_scaled)
    score = -model.score_samples(x_scaled)
    anomaly_mask = prediction == -1

    pca = PCA(n_components=2, random_state=42)
    embedding = pca.fit_transform(x_scaled)

    normal_mean = np.abs(x_scaled[~anomaly_mask]).mean(axis=0)
    anomaly_mean = np.abs(x_scaled[anomaly_mask]).mean(axis=0)
    contribution = np.maximum(anomaly_mean - normal_mean, 0)
    if contribution.sum() > 0:
        contribution = contribution / contribution.sum()

    fig, axes = plt.subplots(1, 3, figsize=(15, 5.3))

    axes[0].scatter(
        embedding[~anomaly_mask, 0],
        embedding[~anomaly_mask, 1],
        s=12,
        alpha=0.45,
        color=COLORS["blue"],
        label="Normal",
    )
    axes[0].scatter(
        embedding[anomaly_mask, 0],
        embedding[anomaly_mask, 1],
        s=28,
        alpha=0.9,
        color=COLORS["red"],
        label="Anomalie",
        marker="x",
    )
    axes[0].set_title("Projection PCA des observations")
    axes[0].set_xlabel("Composante principale 1")
    axes[0].set_ylabel("Composante principale 2")
    axes[0].legend()

    axes[1].hist(score[~anomaly_mask], bins=35, alpha=0.75, color=COLORS["blue"], label="Normal")
    axes[1].hist(score[anomaly_mask], bins=15, alpha=0.8, color=COLORS["red"], label="Anomalie")
    axes[1].set_title("Distribution du score d'anomalie")
    axes[1].set_xlabel("Score Isolation Forest")
    axes[1].set_ylabel("Nombre d'observations")
    axes[1].legend()

    bars = axes[2].barh(
        ["Température", "Humidité", "Poids ruche", "Niveau sonore"],
        contribution,
        color=[COLORS["red"], COLORS["blue"], COLORS["amber"], COLORS["purple"]],
    )
    axes[2].set_xlim(0, max(0.55, contribution.max() * 1.15))
    axes[2].set_title("Contribution relative aux anomalies")
    axes[2].set_xlabel("Contribution normalisée")
    for bar, value in zip(bars, contribution):
        axes[2].text(
            value + 0.01,
            bar.get_y() + bar.get_height() / 2,
            f"{value:.1%}",
            va="center",
            fontweight="bold",
        )

    anomaly_rate = anomaly_mask.mean()
    fig.suptitle(
        f"Illustration de la détection d'anomalies télémétriques "
        f"(Isolation Forest, taux={anomaly_rate:.1%})",
        fontsize=15,
        fontweight="bold",
        color=COLORS["navy"],
    )
    fig.text(
        0.5,
        0.01,
        "Expérience reproductible sur les 2 000 observations du projet, "
        "avec contamination fixée à 5 %. Cette figure illustre la méthode, "
        "elle ne constitue pas une validation supervisée.",
        ha="center",
        fontsize=8.8,
        color=COLORS["slate"],
    )
    fig.tight_layout(rect=(0, 0.05, 1, 0.93))
    save_figure(fig, "06_detection_anomalies_telemetrie")


def main() -> None:
    set_style()
    generate_dataset_structure()
    generate_prediction_mosaic()
    generate_training_curves()
    generate_performance_summary()
    generate_telemetry_eda()
    generate_anomaly_visualization()
    print(f"Figures générées dans: {OUT}")


if __name__ == "__main__":
    main()
