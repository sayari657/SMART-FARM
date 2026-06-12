from __future__ import annotations

import shutil
from dataclasses import dataclass
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import pandas as pd
import yaml
from PIL import Image


ROOT = Path(__file__).resolve().parents[3]
SOURCE_ROOT = Path(r"D:\cv data")
REPORT_ROOT = ROOT / "diagramme" / "05_DataScience_Rapport"
MODEL_OUT = REPORT_ROOT / "modeles_cv"
IMAGE_OUT = REPORT_ROOT / "images"


@dataclass(frozen=True)
class ModelSpec:
    key: str
    title: str
    source: Path
    results_image: Path
    diagnostic_image: Path
    files: dict[str, Path]


MODELS = [
    ModelSpec(
        key="01_poulet",
        title="Detection des maladies du poulet",
        source=SOURCE_ROOT / "Model_chicken_YOLOv11",
        results_image=Path("training_curves.png"),
        diagnostic_image=Path("per_class_map.png"),
        files={
            "distribution_classes.png": Path("eda_class_distribution.png"),
            "courbes_entrainement.png": Path("training_curves.png"),
            "performance_par_classe.png": Path("per_class_map.png"),
            "predictions_test.png": Path("test_predictions.png"),
            "comparaison_benchmark.png": Path("benchmark_comparison.png"),
            "resultats_yolo.png": Path("results.png"),
        },
    ),
    ModelSpec(
        key="02_chevre",
        title="Detection des maladies cutanees de la chevre",
        source=SOURCE_ROOT / "Model_goat_YOLOv11",
        results_image=Path("training_curves.png"),
        diagnostic_image=Path("per_class_map.png"),
        files={
            "distribution_classes.png": Path("eda_class_distribution.png"),
            "courbes_entrainement.png": Path("training_curves.png"),
            "performance_par_classe.png": Path("per_class_map.png"),
            "predictions_test.png": Path("test_predictions.png"),
            "comparaison_benchmark.png": Path("benchmark_comparison.png"),
            "resultats_yolo.png": Path("results.png"),
        },
    ),
    ModelSpec(
        key="03_citronnier",
        title="Detection des maladies des feuilles de citronnier",
        source=SOURCE_ROOT / "model lemon-leaf",
        results_image=Path("results.png"),
        diagnostic_image=Path("predictions/confusion_matrix_normalized.png"),
        files={
            "courbes_entrainement.png": Path("results.png"),
            "matrice_confusion.png": Path("predictions/confusion_matrix.png"),
            "matrice_confusion_normalisee.png": Path(
                "predictions/confusion_matrix_normalized.png"
            ),
            "courbe_f1.png": Path("predictions/BoxF1_curve.png"),
            "courbe_precision_rappel.png": Path("predictions/BoxPR_curve.png"),
            "distribution_labels.jpg": Path("predictions/labels.jpg"),
            "validation_annotations.jpg": Path("predictions/val_batch0_labels.jpg"),
            "validation_predictions.jpg": Path("predictions/val_batch0_pred.jpg"),
        },
    ),
    ModelSpec(
        key="04_oranger",
        title="Detection des maladies des feuilles d'oranger",
        source=SOURCE_ROOT / "Model orange-leaf",
        results_image=Path("results.png"),
        diagnostic_image=Path("predictions/confusion_matrix_normalized.png"),
        files={
            "courbes_entrainement.png": Path("results.png"),
            "matrice_confusion.png": Path("predictions/confusion_matrix.png"),
            "matrice_confusion_normalisee.png": Path(
                "predictions/confusion_matrix_normalized.png"
            ),
            "courbe_f1.png": Path("predictions/BoxF1_curve.png"),
            "courbe_precision_rappel.png": Path("predictions/BoxPR_curve.png"),
            "distribution_labels.jpg": Path("predictions/labels.jpg"),
            "validation_annotations.jpg": Path("predictions/val_batch0_labels.jpg"),
            "validation_predictions.jpg": Path("predictions/val_batch0_pred.jpg"),
        },
    ),
    ModelSpec(
        key="05_insectes",
        title="Detection des insectes ravageurs",
        source=SOURCE_ROOT / "insects" / "model insects_final",
        results_image=Path("results.png"),
        diagnostic_image=Path("confusion_matrix_normalized.png"),
        files={
            "courbes_entrainement.png": Path("results.png"),
            "matrice_confusion.png": Path("confusion_matrix.png"),
            "matrice_confusion_normalisee.png": Path(
                "confusion_matrix_normalized.png"
            ),
            "courbe_f1.png": Path("BoxF1_curve.png"),
            "courbe_precision_rappel.png": Path("BoxPR_curve.png"),
            "distribution_labels.jpg": Path("labels.jpg"),
            "validation_annotations.jpg": Path("val_batch0_labels.jpg"),
            "validation_predictions.jpg": Path("val_batch0_pred.jpg"),
        },
    ),
]


def set_style() -> None:
    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "font.size": 10,
            "axes.titlesize": 13,
            "figure.facecolor": "white",
            "axes.facecolor": "white",
            "savefig.facecolor": "white",
        }
    )


def load_model_data(spec: ModelSpec) -> tuple[dict, dict, pd.Series]:
    with (spec.source / "args.yaml").open("r", encoding="utf-8") as handle:
        args = yaml.safe_load(handle)
    with (spec.source / "data.yaml").open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)

    results = pd.read_csv(spec.source / "results.csv")
    results.columns = results.columns.str.strip()
    metric = "metrics/mAP50-95(B)"
    best = results.loc[results[metric].astype(float).idxmax()]
    return args, data, best


def copy_artifacts(spec: ModelSpec) -> None:
    destination = MODEL_OUT / spec.key
    destination.mkdir(parents=True, exist_ok=True)

    for name in ("args.yaml", "data.yaml", "results.csv"):
        shutil.copy2(spec.source / name, destination / name)

    for destination_name, relative_source in spec.files.items():
        source = spec.source / relative_source
        if source.exists():
            shutil.copy2(source, destination / destination_name)


def show_image(ax: plt.Axes, path: Path, title: str) -> None:
    with Image.open(path) as image:
        ax.imshow(image.convert("RGB"))
    ax.set_title(title, fontweight="bold", pad=10)
    ax.axis("off")


def metric_value(best: pd.Series, name: str) -> float:
    return float(best[name])


def generate_model_sheet(spec: ModelSpec, index: int) -> dict[str, object]:
    args, data, best = load_model_data(spec)
    classes = data.get("names", [])
    if isinstance(classes, dict):
        classes = [classes[key] for key in sorted(classes, key=lambda value: int(value))]

    fig = plt.figure(figsize=(16, 10))
    grid = fig.add_gridspec(
        2,
        2,
        height_ratios=[3.2, 1.25],
        left=0.035,
        right=0.975,
        top=0.9,
        bottom=0.06,
        hspace=0.2,
        wspace=0.08,
    )
    fig.suptitle(spec.title, fontsize=20, fontweight="bold", color="#16324F")

    show_image(
        fig.add_subplot(grid[0, 0]),
        spec.source / spec.results_image,
        "Courbes et convergence de l'entrainement",
    )
    show_image(
        fig.add_subplot(grid[0, 1]),
        spec.source / spec.diagnostic_image,
        "Evaluation detaillee du modele",
    )

    info_ax = fig.add_subplot(grid[1, :])
    info_ax.axis("off")
    best_epoch = int(float(best["epoch"]))
    metric_text = (
        f"Meilleure epoque : {best_epoch}\n"
        f"Precision : {metric_value(best, 'metrics/precision(B)'):.3f}\n"
        f"Rappel : {metric_value(best, 'metrics/recall(B)'):.3f}\n"
        f"mAP@0.50 : {metric_value(best, 'metrics/mAP50(B)'):.3f}\n"
        f"mAP@0.50:0.95 : {metric_value(best, 'metrics/mAP50-95(B)'):.3f}"
    )
    parameter_text = (
        f"Architecture : {args.get('model', 'N/A')}\n"
        f"Epoques planifiees : {args.get('epochs', 'N/A')}\n"
        f"Taille d'image : {args.get('imgsz', 'N/A')} px\n"
        f"Batch : {args.get('batch', 'N/A')}\n"
        f"Optimiseur : {args.get('optimizer', 'N/A')}\n"
        f"Learning rate initial : {args.get('lr0', 'N/A')}"
    )
    class_text = f"Classes ({len(classes)})\n" + ", ".join(map(str, classes))

    box_style = {
        "boxstyle": "round,pad=0.65",
        "facecolor": "#F8FAFC",
        "edgecolor": "#CBD5E1",
        "linewidth": 1.4,
    }
    info_ax.text(
        0.01,
        0.5,
        parameter_text,
        va="center",
        fontsize=11,
        bbox=box_style,
        transform=info_ax.transAxes,
    )
    info_ax.text(
        0.35,
        0.5,
        metric_text,
        va="center",
        fontsize=11,
        bbox={
            **box_style,
            "facecolor": "#ECFDF5",
            "edgecolor": "#10B981",
        },
        transform=info_ax.transAxes,
    )
    info_ax.text(
        0.64,
        0.5,
        class_text,
        va="center",
        fontsize=10.5,
        wrap=True,
        bbox={
            **box_style,
            "facecolor": "#EFF6FF",
            "edgecolor": "#3B82F6",
        },
        transform=info_ax.transAxes,
    )

    IMAGE_OUT.mkdir(parents=True, exist_ok=True)
    output_name = f"{index:02d}_fiche_modele_{spec.key.split('_', 1)[1]}"
    fig.savefig(IMAGE_OUT / f"{output_name}.png", dpi=240, bbox_inches="tight")
    plt.close(fig)

    return {
        "Modele": spec.key.split("_", 1)[1].capitalize(),
        "Architecture": args.get("model", "N/A"),
        "Classes": len(classes),
        "Epoques": args.get("epochs", "N/A"),
        "Image": args.get("imgsz", "N/A"),
        "Batch": args.get("batch", "N/A"),
        "Optimiseur": args.get("optimizer", "N/A"),
        "Precision": metric_value(best, "metrics/precision(B)"),
        "Rappel": metric_value(best, "metrics/recall(B)"),
        "mAP50": metric_value(best, "metrics/mAP50(B)"),
        "mAP50-95": metric_value(best, "metrics/mAP50-95(B)"),
    }


def generate_comparison(rows: list[dict[str, object]]) -> None:
    frame = pd.DataFrame(rows)
    MODEL_OUT.mkdir(parents=True, exist_ok=True)
    frame.to_csv(
        MODEL_OUT / "synthese_modeles.csv",
        index=False,
        float_format="%.5f",
        encoding="utf-8",
    )
    labels = frame["Modele"].tolist()

    fig, axes = plt.subplots(1, 2, figsize=(15, 6.8), gridspec_kw={"width_ratios": [1.2, 1]})
    fig.suptitle(
        "Comparaison des modeles YOLOv11 du projet Smart Farm AI",
        fontsize=18,
        fontweight="bold",
        color="#16324F",
    )

    metrics = frame[["Precision", "Rappel", "mAP50", "mAP50-95"]]
    metrics.plot.bar(ax=axes[0], width=0.78, color=["#2563EB", "#0F766E", "#D97706", "#7E22CE"])
    axes[0].set_xticklabels(labels, rotation=20, ha="right")
    axes[0].set_ylim(0, 1)
    axes[0].set_ylabel("Score")
    axes[0].set_title("Meilleures performances observees")
    axes[0].grid(axis="y", color="#E2E8F0")
    axes[0].legend(loc="lower left", ncols=2)

    axes[1].axis("off")
    table_data = frame[
        ["Modele", "Architecture", "Classes", "Epoques", "Image", "Batch", "Optimiseur"]
    ].astype(str)
    table = axes[1].table(
        cellText=table_data.values,
        colLabels=table_data.columns,
        cellLoc="center",
        colLoc="center",
        loc="center",
    )
    table.auto_set_font_size(False)
    table.set_fontsize(9)
    table.scale(1, 1.8)
    for (row, _column), cell in table.get_celld().items():
        cell.set_edgecolor("#CBD5E1")
        if row == 0:
            cell.set_facecolor("#16324F")
            cell.set_text_props(color="white", fontweight="bold")
        elif row % 2 == 0:
            cell.set_facecolor("#F8FAFC")
    axes[1].set_title("Principaux hyperparametres", pad=16)

    fig.tight_layout(rect=[0, 0, 1, 0.92])
    fig.savefig(IMAGE_OUT / "13_comparaison_modeles_yolov11.png", dpi=300, bbox_inches="tight")
    fig.savefig(IMAGE_OUT / "13_comparaison_modeles_yolov11.svg", bbox_inches="tight")
    plt.close(fig)


def main() -> None:
    if not SOURCE_ROOT.exists():
        raise FileNotFoundError(f"Dossier source introuvable : {SOURCE_ROOT}")

    set_style()
    summaries = []
    for index, spec in enumerate(MODELS, start=8):
        copy_artifacts(spec)
        summaries.append(generate_model_sheet(spec, index))
    generate_comparison(summaries)
    print(f"Artefacts copies dans : {MODEL_OUT}")
    print(f"Figures generees dans : {IMAGE_OUT}")


if __name__ == "__main__":
    main()
