"""
Fine-tuning YOLOv8-cls sur PlantVillage — Smart Farm AI v3.0
=============================================================
Dataset : PlantVillage (54 305 images, 38 classes maladie×espèce)
          https://www.kaggle.com/datasets/abdallahalidev/plantvillage-dataset

Téléchargement :
    pip install kaggle
    kaggle datasets download abdallahalidev/plantvillage-dataset -p mlops/data/plantvillage --unzip

Le dataset arrive en dossiers par classe (format ImageFolder) → entraînement
en CLASSIFICATION (yolov8n-cls), idéal pour étendre le scanner de la page
Arbres & Plantations à 38 pathologies supplémentaires.

Split automatique train/val (90/10) si non déjà splitté.
Résultats loggés dans MLflow (experiment: plantvillage-classification),
poids exportés vers ai_assets/plantations/plantvillage_cls/.

GPU fortement conseillé (Colab : ~1 h sur T4 en 224 px / 20 epochs).

Usage :
    python mlops/train_plantvillage.py
    python mlops/train_plantvillage.py --epochs 30 --imgsz 256 --model yolov8s-cls.pt
"""

from __future__ import annotations

import argparse
import random
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA = ROOT / "mlops" / "data" / "plantvillage"
EXPORT_DIR = ROOT / "ai_assets" / "plantations" / "plantvillage_cls"


def find_class_root(data_dir: Path) -> Path:
    """Trouve le dossier contenant les sous-dossiers de classes
    (le zip Kaggle imbrique parfois plantvillage dataset/color/...)."""
    candidates = [data_dir] + [p for p in data_dir.rglob("*") if p.is_dir()]
    best, best_count = None, 0
    for c in candidates:
        sub = [d for d in c.iterdir() if d.is_dir()] if c.is_dir() else []
        # Un dossier de classes contient ≥ 10 sous-dossiers pleins d'images
        n_img_dirs = sum(1 for d in sub if any(d.glob("*.JPG")) or any(d.glob("*.jpg")) or any(d.glob("*.png")))
        if n_img_dirs > best_count:
            best, best_count = c, n_img_dirs
    if best is None or best_count < 10:
        print(f"[ERREUR] Structure de classes introuvable sous {data_dir}")
        print("Téléchargez : kaggle datasets download abdallahalidev/plantvillage-dataset "
              f"-p {data_dir} --unzip")
        sys.exit(1)
    print(f"Racine classes : {best} ({best_count} classes)")
    return best


def ensure_split(class_root: Path, out_dir: Path, val_ratio: float = 0.1) -> Path:
    """Construit out_dir/train/<classe>/ et out_dir/val/<classe>/ (liens copiés)."""
    if (out_dir / "train").exists() and (out_dir / "val").exists():
        print(f"Split existant réutilisé : {out_dir}")
        return out_dir
    rng = random.Random(42)
    for cls_dir in sorted(d for d in class_root.iterdir() if d.is_dir()):
        images = sorted(p for p in cls_dir.iterdir()
                        if p.suffix.lower() in (".jpg", ".jpeg", ".png"))
        rng.shuffle(images)
        n_val = max(1, int(len(images) * val_ratio))
        for split, subset in (("val", images[:n_val]), ("train", images[n_val:])):
            dest = out_dir / split / cls_dir.name
            dest.mkdir(parents=True, exist_ok=True)
            for img in subset:
                target = dest / img.name
                if not target.exists():
                    shutil.copy2(img, target)
        print(f"  {cls_dir.name}: {len(images) - n_val} train / {n_val} val")
    return out_dir


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--model", default="yolov8n-cls.pt")
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--imgsz", type=int, default=224)
    parser.add_argument("--batch", type=int, default=64)
    args = parser.parse_args()

    from ultralytics import YOLO

    class_root = find_class_root(args.data_dir)
    dataset = ensure_split(class_root, args.data_dir / "_split")

    model = YOLO(args.model)
    results = model.train(
        data=str(dataset),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        project=str(ROOT / "mlruns_yolo"),
        name="plantvillage_cls",
        exist_ok=True,
        patience=7,
    )

    # Export des poids vers les assets du projet
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    best = Path(results.save_dir) / "weights" / "best.pt"
    if best.exists():
        shutil.copy2(best, EXPORT_DIR / "best.pt")
        print(f"\nPoids exportés → {EXPORT_DIR / 'best.pt'}")

    # Log MLflow (même tracking que le reste du projet)
    try:
        import mlflow
        mlflow.set_experiment("plantvillage-classification")
        with mlflow.start_run(run_name=f"{args.model}-e{args.epochs}"):
            mlflow.log_params({"model": args.model, "epochs": args.epochs,
                               "imgsz": args.imgsz, "dataset": "PlantVillage-38cls"})
            top1 = getattr(getattr(results, "results_dict", {}), "get", lambda *_: None)("metrics/accuracy_top1")
            if top1 is not None:
                mlflow.log_metric("accuracy_top1", float(top1))
            if best.exists():
                mlflow.log_artifact(str(best))
        print("Run MLflow loggé (experiment: plantvillage-classification)")
    except Exception as exc:
        print(f"MLflow non loggé ({exc})")


if __name__ == "__main__":
    main()
