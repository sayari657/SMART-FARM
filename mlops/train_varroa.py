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


def build_imagefolder(data_dir: Path, group_split: bool = False) -> Path:
    """Convertit bee_data.csv + bee_imgs/ en arborescence train/val par classe.

    group_split=True : split par GROUPE (date, location) — les frames issues
    d'une même rafale vidéo restent ensemble (pas de fuite train→val),
    accuracy honnête mais plus basse. C'est la validation rigoureuse à
    rapporter dans le mémoire à côté du split aléatoire."""
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
    out = data_dir / ("_split_group" if group_split else "_split")
    if (out / "train").exists():
        print(f"Split existant réutilisé : {out}")
        return out

    counts = df["health"].value_counts().to_dict()
    print(f"Distribution des classes ({'GROUP' if group_split else 'random'} split) :")
    for cls, n in counts.items():
        print(f"  {cls}: {n}")

    if group_split:
        # Clé de groupe = (date, location) ≈ une session vidéo sur une ruche
        df["group"] = df["date"].astype(str) + "|" + df["location"].astype(str)
        rng = pd.Series(df["group"].unique()).sample(frac=1.0, random_state=42)
        # On affecte des groupes entiers à la validation jusqu'à ~12 % des images
        val_groups, val_count = set(), 0
        group_sizes = df.groupby("group").size()
        for g in rng:
            if val_count >= len(df) * 0.12:
                break
            val_groups.add(g)
            val_count += int(group_sizes[g])
        df["split"] = df["group"].map(lambda g: "val" if g in val_groups else "train")
        print(f"  → {len(val_groups)} groupes vidéo en validation ({val_count} images)")
    else:
        df = df.sample(frac=1.0, random_state=42).reset_index(drop=True)
        n_val_per_class = {cls: max(1, int(n * 0.1)) for cls, n in counts.items()}
        placed = {cls: 0 for cls in counts}
        splits = []
        for _, row in df.iterrows():
            cls = row["health"]
            splits.append("val" if placed[cls] < n_val_per_class[cls] else "train")
            placed[cls] += 1
        df["split"] = splits

    for _, row in df.iterrows():
        src = img_dir / row["file"]
        if not src.exists():
            continue
        dest = out / row["split"] / row["health"]
        dest.mkdir(parents=True, exist_ok=True)
        target = dest / src.name
        if not target.exists():
            shutil.copy2(src, target)

    # Garde-fou : chaque classe doit exister en val (sinon ultralytics échoue)
    for cls in counts:
        if not (out / "val" / cls).exists():
            (out / "val" / cls).mkdir(parents=True, exist_ok=True)
            train_cls = sorted((out / "train" / cls).glob("*"))
            if train_cls:
                shutil.move(str(train_cls[0]), str(out / "val" / cls / train_cls[0].name))
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--model", default="yolov8n-cls.pt")
    parser.add_argument("--epochs", type=int, default=25)
    parser.add_argument("--imgsz", type=int, default=128)   # images BeeImage ~ petites vignettes
    parser.add_argument("--batch", type=int, default=64)
    parser.add_argument("--group-split", action="store_true",
                        help="Split par session vidéo (date+location) — validation rigoureuse")
    args = parser.parse_args()

    from ultralytics import YOLO

    dataset = build_imagefolder(args.data_dir, group_split=args.group_split)

    model = YOLO(args.model)
    results = model.train(
        data=str(dataset),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        project=str(ROOT / "mlruns_yolo"),
        name="bee_health_cls_group" if args.group_split else "bee_health_cls",
        exist_ok=True,
        patience=8,
    )

    best = Path(results.save_dir) / "weights" / "best.pt"
    if args.group_split:
        # Run d'évaluation rigoureuse : ne PAS écraser le modèle déployé
        print(f"\n[group-split] Poids conservés dans {results.save_dir} (modèle déployé inchangé)")
    elif best.exists():
        EXPORT_DIR.mkdir(parents=True, exist_ok=True)
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
