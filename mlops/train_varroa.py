"""
Entraînement YOLOv8 détection santé abeilles (varroa, pollen, reine…)
======================================================================
Dataset : « Honey Bee Annotated Images » (BeeImage, ~5 100 images annotées)
          https://www.kaggle.com/datasets/jenny18/honey-bee-annotated-images

Téléchargement :
    pip install kaggle
    kaggle datasets download jenny18/honey-bee-annotated-images -p mlops/data/bee_health --unzip

Ce dataset est étiqueté par IMAGE (CSV bee_data.csv : health, pollen, …)
→ entraînement en CLASSIFICATION (yolov8n-cls) sur la colonne `health` :
  healthy / varroa mites / ant problems / hive being robbed / missing queen.

Le modèle complète le pipeline CV abeille existant (détection YOLO bee) en
ajoutant le diagnostic sanitaire de la colonie. Export →
ai_assets/animal_weights/bee/bee_health_cls/best.pt + log MLflow.

Usage :
    python mlops/train_varroa.py
    python mlops/train_varroa.py --epochs 25 --imgsz 128
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA = ROOT / "mlops" / "data" / "bee_health"
EXPORT_DIR = ROOT / "ai_assets" / "animal_weights" / "bee" / "bee_health_cls"


def build_imagefolder(data_dir: Path) -> Path:
    """Convertit bee_data.csv + bee_imgs/ en arborescence train/val par classe."""
    import pandas as pd

    csv_path = next(iter(data_dir.rglob("bee_data.csv")), None)
    img_dir = next((p for p in data_dir.rglob("bee_imgs") if p.is_dir()), None)
    if img_dir is not None:
        nested = img_dir / "bee_imgs"
        if nested.is_dir():
            img_dir = nested
    if csv_path is None or img_dir is None:
        print(f"[ERREUR] bee_data.csv ou bee_imgs/ introuvable sous {data_dir}")
        print("Téléchargez : kaggle datasets download jenny18/honey-bee-annotated-images "
              f"-p {data_dir} --unzip")
        sys.exit(1)

    df = pd.read_csv(csv_path)
    df["health"] = df["health"].str.strip().str.lower().str.replace(r"[^a-z0-9]+", "_", regex=True)
    out = data_dir / "_split"
    if (out / "train").exists():
        print(f"Split existant réutilisé : {out}")
        return out

    df = df.sample(frac=1.0, random_state=42).reset_index(drop=True)
    n_val_per_class = {}
    counts = df["health"].value_counts().to_dict()
    print("Distribution des classes :")
    for cls, n in counts.items():
        n_val_per_class[cls] = max(1, int(n * 0.1))
        print(f"  {cls}: {n}")

    placed = {cls: 0 for cls in counts}
    for _, row in df.iterrows():
        src = img_dir / row["file"]
        if not src.exists():
            continue
        cls = row["health"]
        split = "val" if placed[cls] < n_val_per_class[cls] else "train"
        placed[cls] += 1
        dest = out / split / cls
        dest.mkdir(parents=True, exist_ok=True)
        target = dest / src.name
        if not target.exists():
            shutil.copy2(src, target)
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--model", default="yolov8n-cls.pt")
    parser.add_argument("--epochs", type=int, default=25)
    parser.add_argument("--imgsz", type=int, default=128)   # images BeeImage ~ petites vignettes
    parser.add_argument("--batch", type=int, default=64)
    args = parser.parse_args()

    from ultralytics import YOLO

    dataset = build_imagefolder(args.data_dir)

    model = YOLO(args.model)
    results = model.train(
        data=str(dataset),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        project=str(ROOT / "mlruns_yolo"),
        name="bee_health_cls",
        exist_ok=True,
        patience=8,
    )

    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    best = Path(results.save_dir) / "weights" / "best.pt"
    if best.exists():
        shutil.copy2(best, EXPORT_DIR / "best.pt")
        print(f"\nPoids exportés → {EXPORT_DIR / 'best.pt'}")

    try:
        import mlflow
        mlflow.set_experiment("bee-health-classification")
        with mlflow.start_run(run_name=f"{args.model}-e{args.epochs}"):
            mlflow.log_params({"model": args.model, "epochs": args.epochs,
                               "imgsz": args.imgsz, "dataset": "BeeImage-health"})
            if best.exists():
                mlflow.log_artifact(str(best))
        print("Run MLflow loggé (experiment: bee-health-classification)")
    except Exception as exc:
        print(f"MLflow non loggé ({exc})")


if __name__ == "__main__":
    main()
