# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  Orange Leaf Disease Detection — YOLOv11 Pipeline Complet                  ║
# ║  Smart Farm AI v3.0 | Kaggle-Ready                                         ║
# ║  Copier ce fichier dans un notebook Kaggle (GPU P100 ou T4)               ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

# ==============================================================================
# CELL 1 — Installation
# ==============================================================================
# !pip install -q ultralytics pyyaml mlflow seaborn


# ==============================================================================
# CELL 2 — Imports & Configuration Centrale
# ==============================================================================
import os, yaml, zipfile, shutil, time, random, warnings
from pathlib import Path

import cv2
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import mlflow

from ultralytics import YOLO

warnings.filterwarnings("ignore")
sns.set_theme(style="darkgrid")

# ─── Toute la configuration ici — ne touche qu'à ce bloc ─────────────────────
CONFIG = {
    # Dataset Kaggle
    "dataset_root": Path("/kaggle/input/datasets/mohamedsayari77/orange-leaf"),
    "working_dir":  Path("/kaggle/working"),
    "fixed_yaml":   Path("/kaggle/working/data_fixed.yaml"),

    # MLflow
    "mlflow_uri":      "sqlite:////kaggle/working/mlruns.db",
    "experiment_name": "OrangeLeaf_YOLOv11",

    # Benchmark rapide (30 epochs pour comparer nano/small/medium)
    "benchmark_models":   ["yolo11n.pt", "yolo11s.pt", "yolo11m.pt"],
    "benchmark_epochs":   30,
    "benchmark_patience": 10,

    # Entraînement final
    "final_epochs":   120,
    "final_patience": 25,
    "imgsz":          768,
    "batch":          8,
    "optimizer":      "AdamW",
    "lr0":            0.001,
    "weight_decay":   0.0005,

    # Augmentations (toutes configurées)
    "hsv_h":       0.015,
    "hsv_s":       0.7,
    "hsv_v":       0.4,
    "degrees":     10.0,
    "translate":   0.1,
    "scale":       0.5,
    "flipud":      0.1,
    "fliplr":      0.5,
    "mosaic":      1.0,
    "mixup":       0.1,
    "copy_paste":  0.1,
    "close_mosaic": 10,

    # Inférence
    "conf": 0.25,
    "iou":  0.45,
}

CONFIG["working_dir"].mkdir(parents=True, exist_ok=True)
print("✅ Configuration chargée")
print(f"   Dataset : {CONFIG['dataset_root']}")
print(f"   Dataset existe : {CONFIG['dataset_root'].exists()}")


# ==============================================================================
# CELL 3 — EDA : Audit du dataset
# ==============================================================================
def load_class_names(yaml_path: Path) -> list:
    with open(yaml_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f).get("names", [])


def audit_split(root: Path, split: str) -> dict:
    images_dir = root / split / "images"
    labels_dir = root / split / "labels"
    image_files = sorted(images_dir.glob("*.*")) if images_dir.exists() else []
    label_files  = sorted(labels_dir.glob("*.txt")) if labels_dir.exists() else []
    empty  = [f for f in label_files if f.stat().st_size == 0]
    missing = [i for i in image_files
               if not (labels_dir / (i.stem + ".txt")).exists()]
    return {
        "split": split, "images": len(image_files),
        "labels": len(label_files), "empty_labels": len(empty),
        "missing_labels": len(missing),
        "image_files": image_files, "label_files": label_files,
    }


def count_class_distribution(splits_data: list, class_names: list) -> pd.DataFrame:
    counts = {n: 0 for n in class_names}
    for s in splits_data:
        for lbl in s["label_files"]:
            try:
                for line in lbl.read_text().strip().splitlines():
                    if line.strip():
                        cid = int(line.split()[0])
                        if cid < len(class_names):
                            counts[class_names[cid]] += 1
            except Exception:
                pass
    return (pd.DataFrame(list(counts.items()), columns=["class", "count"])
              .sort_values("count", ascending=False))


root      = CONFIG["dataset_root"]
yaml_path = root / "data.yaml"

if not root.exists():
    raise FileNotFoundError(f"Dataset introuvable: {root}")

class_names  = load_class_names(yaml_path)
splits_data  = [audit_split(root, s) for s in ["train", "valid", "test"]]

print(f"\n📂 Classes ({len(class_names)}): {class_names}\n")
summary = pd.DataFrame([{
    "Split": s["split"], "Images": s["images"], "Labels": s["labels"],
    "Vides": s["empty_labels"], "Manquants": s["missing_labels"],
} for s in splits_data])
print(summary.to_string(index=False))


# ==============================================================================
# CELL 4 — EDA : Distribution des classes + détection déséquilibre
# ==============================================================================
class_df = count_class_distribution(splits_data, class_names)

fig, axes = plt.subplots(1, 2, figsize=(16, 5))
fig.suptitle("Distribution des classes — Orange Leaf Dataset", fontsize=13, fontweight="bold")

# Bar horizontal
colors = plt.cm.tab20(np.linspace(0, 1, len(class_df)))
axes[0].barh(class_df["class"], class_df["count"], color=colors)
axes[0].set_xlabel("Nombre d'annotations")
axes[0].set_title("Fréquence par classe")
axes[0].invert_yaxis()
for i, (_, row) in enumerate(class_df.iterrows()):
    axes[0].text(row["count"] + 0.5, i, f'{int(row["count"])}', va="center", fontsize=9)

# Ratio déséquilibre
max_c = class_df["count"].max()
class_df["ratio"] = max_c / class_df["count"].replace(0, 1)
bar_colors = ["#e74c3c" if r > 3 else "#2ecc71" for r in class_df["ratio"]]
axes[1].bar(range(len(class_df)), class_df["ratio"], color=bar_colors)
axes[1].set_xticks(range(len(class_df)))
axes[1].set_xticklabels(class_df["class"], rotation=45, ha="right", fontsize=8)
axes[1].axhline(3, color="orange", linestyle="--", label="Seuil imbalance (3x)")
axes[1].set_title("Ratio déséquilibre")
axes[1].set_ylabel("max / classe")
axes[1].legend()

plt.tight_layout()
plt.savefig(CONFIG["working_dir"] / "eda_classes.png", dpi=150, bbox_inches="tight")
plt.show()

imbal = class_df[class_df["ratio"] > 3]
if not imbal.empty:
    print(f"⚠️  Classes déséquilibrées (>3x) : {imbal['class'].tolist()}")
else:
    print("✅ Dataset équilibré")


# ==============================================================================
# CELL 5 — EDA : Visualisation images + bounding boxes
# ==============================================================================
def draw_bboxes(img_path: Path, lbl_path: Path, class_names: list) -> np.ndarray:
    img = cv2.imread(str(img_path))
    if img is None:
        return np.zeros((300, 300, 3), np.uint8)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    h, w = img.shape[:2]
    cmap = plt.cm.tab20(np.linspace(0, 1, max(len(class_names), 1)))
    if lbl_path.exists():
        for line in lbl_path.read_text().strip().splitlines():
            parts = line.strip().split()
            if len(parts) < 5:
                continue
            cid, xc, yc, bw, bh = int(parts[0]), *map(float, parts[1:5])
            x1 = int((xc - bw / 2) * w); y1 = int((yc - bh / 2) * h)
            x2 = int((xc + bw / 2) * w); y2 = int((yc + bh / 2) * h)
            col = tuple((np.array(cmap[cid % len(class_names)][:3]) * 255).astype(int).tolist())
            cv2.rectangle(img, (x1, y1), (x2, y2), col, 2)
            label = class_names[cid] if cid < len(class_names) else str(cid)
            cv2.putText(img, label, (x1, max(y1 - 5, 12)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, col, 1)
    return img


train_imgs = splits_data[0]["image_files"]
samples    = random.sample(train_imgs, min(9, len(train_imgs)))

fig, axes = plt.subplots(3, 3, figsize=(15, 13))
fig.suptitle("Échantillon images + bounding boxes (Train)", fontsize=13, fontweight="bold")
for ax, p in zip(axes.flatten(), samples):
    lbl = p.parent.parent / "labels" / (p.stem + ".txt")
    ax.imshow(draw_bboxes(p, lbl, class_names))
    ax.set_title(p.name[:30], fontsize=8)
    ax.axis("off")
for ax in axes.flatten()[len(samples):]:
    ax.axis("off")
plt.tight_layout()
plt.savefig(CONFIG["working_dir"] / "eda_sample_bboxes.png", dpi=120, bbox_inches="tight")
plt.show()


# ==============================================================================
# CELL 6 — EDA : Distribution tailles d'images
# ==============================================================================
def get_image_sizes(files: list, n: int = 200) -> pd.DataFrame:
    rows = []
    for p in files[:n]:
        img = cv2.imread(str(p))
        if img is not None:
            rows.append({"w": img.shape[1], "h": img.shape[0]})
    return pd.DataFrame(rows)

all_imgs  = splits_data[0]["image_files"] + splits_data[1]["image_files"]
sizes_df  = get_image_sizes(all_imgs, 300)

if not sizes_df.empty:
    fig, axes = plt.subplots(1, 2, figsize=(12, 4))
    axes[0].hist(sizes_df["w"], bins=20, color="steelblue", alpha=0.7, label="Largeur")
    axes[0].hist(sizes_df["h"], bins=20, color="salmon",    alpha=0.7, label="Hauteur")
    axes[0].set_title("Distribution tailles (px)", fontweight="bold")
    axes[0].legend()
    axes[1].scatter(sizes_df["w"], sizes_df["h"], alpha=0.4, s=20, color="purple")
    axes[1].set_xlabel("Largeur"); axes[1].set_ylabel("Hauteur")
    axes[1].set_title("Largeur vs Hauteur", fontweight="bold")
    plt.tight_layout()
    plt.savefig(CONFIG["working_dir"] / "eda_sizes.png", dpi=120, bbox_inches="tight")
    plt.show()
    print(f"Min : {int(sizes_df['w'].min())}x{int(sizes_df['h'].min())}  "
          f"Max : {int(sizes_df['w'].max())}x{int(sizes_df['h'].max())}  "
          f"Moy : {int(sizes_df['w'].mean())}x{int(sizes_df['h'].mean())}")


# ==============================================================================
# CELL 7 — Fix YAML pour Kaggle
# ==============================================================================
def fix_yaml(src: Path, dst: Path, dataset_root: Path) -> dict:
    with open(src, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    paths = {
        "train": dataset_root / "train" / "images",
        "val":   dataset_root / "valid" / "images",
        "test":  dataset_root / "test"  / "images",
    }
    for key, path in paths.items():
        if not path.exists():
            print(f"  ⚠️  {key} introuvable : {path}")
        data[key] = str(path)
    with open(dst, "w", encoding="utf-8") as f:
        yaml.dump(data, f, allow_unicode=True)
    print(f"✅ YAML corrigé : {dst}")
    return data

fixed = fix_yaml(yaml_path, CONFIG["fixed_yaml"], CONFIG["dataset_root"])
print("\nYAML final :")
for k, v in fixed.items():
    print(f"  {k}: {v}")


# ==============================================================================
# CELL 8 — Benchmark Multi-Modèles (nano / small / medium)
# ==============================================================================
mlflow.set_tracking_uri(CONFIG["mlflow_uri"])
mlflow.set_experiment(CONFIG["experiment_name"])


def benchmark_model(model_name: str) -> dict:
    print(f"\n🔍 Benchmark {model_name} ...")
    run_tag  = model_name.replace(".pt", "").replace("-", "_")
    proj_dir = str(CONFIG["working_dir"])
    t0 = time.time()
    model = YOLO(model_name)

    with mlflow.start_run(run_name=f"bench_{run_tag}"):
        res = model.train(
            data=str(CONFIG["fixed_yaml"]),
            epochs=CONFIG["benchmark_epochs"],
            patience=CONFIG["benchmark_patience"],
            imgsz=CONFIG["imgsz"],
            batch=CONFIG["batch"],
            optimizer=CONFIG["optimizer"],
            lr0=CONFIG["lr0"],
            device=0, amp=True, cache=True,
            close_mosaic=5, workers=2,
            project=proj_dir, name=f"bench_{run_tag}",
            exist_ok=True, verbose=False,
        )
        elapsed   = time.time() - t0
        map50     = float(res.results_dict.get("metrics/mAP50(B)", 0))
        map5095   = float(res.results_dict.get("metrics/mAP50-95(B)", 0))
        n_params  = sum(p.numel() for p in model.model.parameters()) / 1e6

        mlflow.log_params({"model": model_name, "epochs": CONFIG["benchmark_epochs"],
                           "imgsz": CONFIG["imgsz"]})
        mlflow.log_metrics({"mAP50": map50, "mAP50_95": map5095,
                            "train_time_s": round(elapsed, 1), "params_M": round(n_params, 2)})

    return {"model": model_name, "mAP50": round(map50, 4),
            "mAP50-95": round(map5095, 4), "time_s": round(elapsed, 1),
            "params_M": round(n_params, 2)}


bench_results = []
for m in CONFIG["benchmark_models"]:
    try:
        bench_results.append(benchmark_model(m))
    except Exception as e:
        print(f"  Erreur {m}: {e}")

bench_df = pd.DataFrame(bench_results)
print("\n" + "="*60)
print("  BENCHMARK RESULTS")
print("="*60)
print(bench_df.to_string(index=False))


# ==============================================================================
# CELL 9 — Graphes benchmark
# ==============================================================================
if not bench_df.empty:
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    fig.suptitle("Benchmark YOLOv11 — nano / small / medium", fontsize=13, fontweight="bold")
    labels = [m.replace(".pt", "") for m in bench_df["model"]]
    colors = ["#3498db", "#2ecc71", "#e74c3c"][:len(bench_df)]

    for ax, col, title in [
        (axes[0], "mAP50",    "mAP50"),
        (axes[1], "mAP50-95", "mAP50-95"),
    ]:
        ax.bar(labels, bench_df[col], color=colors)
        ax.set_title(title, fontweight="bold")
        ax.set_ylim(0, 1)
        for i, v in enumerate(bench_df[col]):
            ax.text(i, v + 0.01, f"{v:.3f}", ha="center", fontweight="bold")

    axes[2].scatter(bench_df["params_M"], bench_df["mAP50"],
                    s=200, c=colors, zorder=5)
    for _, row in bench_df.iterrows():
        axes[2].annotate(row["model"].replace(".pt",""),
                         (row["params_M"], row["mAP50"]),
                         textcoords="offset points", xytext=(5, 5))
    axes[2].set_xlabel("Paramètres (M)"); axes[2].set_ylabel("mAP50")
    axes[2].set_title("Précision vs Taille", fontweight="bold")

    plt.tight_layout()
    plt.savefig(CONFIG["working_dir"] / "benchmark.png", dpi=150, bbox_inches="tight")
    plt.show()

best_model = bench_df.loc[bench_df["mAP50"].idxmax(), "model"]
print(f"\n🏆 Meilleur modèle : {best_model}")


# ==============================================================================
# CELL 10 — Entraînement Final (120 epochs, augmentations complètes, MLflow)
# ==============================================================================
print(f"\n🚀 Entraînement final — {best_model} × {CONFIG['final_epochs']} epochs\n")

final_model = YOLO(best_model)

with mlflow.start_run(run_name=f"FINAL_{best_model.replace('.pt','')}"):
    mlflow.set_tag("stage", "final_training")
    mlflow.log_params({
        "model": best_model, "epochs": CONFIG["final_epochs"],
        "imgsz": CONFIG["imgsz"], "batch": CONFIG["batch"],
        "optimizer": CONFIG["optimizer"], "lr0": CONFIG["lr0"],
        "weight_decay": CONFIG["weight_decay"],
        "aug_mosaic": CONFIG["mosaic"], "aug_mixup": CONFIG["mixup"],
        "aug_copy_paste": CONFIG["copy_paste"],
    })

    final_results = final_model.train(
        data=str(CONFIG["fixed_yaml"]),
        epochs=CONFIG["final_epochs"],
        patience=CONFIG["final_patience"],
        imgsz=CONFIG["imgsz"],
        batch=CONFIG["batch"],
        optimizer=CONFIG["optimizer"],
        lr0=CONFIG["lr0"],
        weight_decay=CONFIG["weight_decay"],
        device=0, amp=True, cache=True,
        close_mosaic=CONFIG["close_mosaic"],
        # Augmentations
        hsv_h=CONFIG["hsv_h"],   hsv_s=CONFIG["hsv_s"],   hsv_v=CONFIG["hsv_v"],
        degrees=CONFIG["degrees"], translate=CONFIG["translate"], scale=CONFIG["scale"],
        flipud=CONFIG["flipud"],   fliplr=CONFIG["fliplr"],
        mosaic=CONFIG["mosaic"],   mixup=CONFIG["mixup"],
        copy_paste=CONFIG["copy_paste"],
        workers=2,
        project=str(CONFIG["working_dir"]),
        name="orange-leaf-final",
        exist_ok=True,
    )

    final_map50   = float(final_results.results_dict.get("metrics/mAP50(B)", 0))
    final_map5095 = float(final_results.results_dict.get("metrics/mAP50-95(B)", 0))
    mlflow.log_metrics({"final_mAP50": final_map50, "final_mAP50_95": final_map5095})

    best_pt = CONFIG["working_dir"] / "orange-leaf-final" / "weights" / "best.pt"
    if best_pt.exists():
        mlflow.log_artifact(str(best_pt), artifact_path="weights")

print(f"\n✅ Entraînement terminé")
print(f"   mAP50    = {final_map50:.4f} ({final_map50*100:.1f}%)")
print(f"   mAP50-95 = {final_map5095:.4f} ({final_map5095*100:.1f}%)")


# ==============================================================================
# CELL 11 — Analyse Métriques : Courbes loss / mAP
# ==============================================================================
run_dir     = CONFIG["working_dir"] / "orange-leaf-final"
results_csv = run_dir / "results.csv"

if results_csv.exists():
    df_res = pd.read_csv(results_csv)
    df_res.columns = df_res.columns.str.strip()

    fig, axes = plt.subplots(2, 3, figsize=(18, 10))
    fig.suptitle("Courbes entraînement — Orange Leaf YOLOv11", fontsize=14, fontweight="bold")

    plots = [
        ("train/box_loss",      "Box Loss Train",  "#e74c3c"),
        ("train/cls_loss",      "Cls Loss Train",  "#e67e22"),
        ("val/box_loss",        "Box Loss Val",    "#3498db"),
        ("val/cls_loss",        "Cls Loss Val",    "#2980b9"),
        ("metrics/mAP50(B)",    "mAP50",           "#2ecc71"),
        ("metrics/mAP50-95(B)", "mAP50-95",        "#27ae60"),
    ]
    for ax, (col, title, color) in zip(axes.flatten(), plots):
        if col in df_res.columns:
            ax.plot(df_res["epoch"], df_res[col], color=color, linewidth=2)
            ax.set_title(title, fontweight="bold"); ax.set_xlabel("Epoch"); ax.grid(alpha=0.3)
            if "mAP" in col:
                bi = df_res[col].idxmax()
                bv = df_res.loc[bi, col]; be = df_res.loc[bi, "epoch"]
                ax.axvline(be, color="red", linestyle="--", alpha=0.5)
                ax.scatter(be, bv, color="red", s=80, zorder=5, label=f"Best: {bv:.4f}")
                ax.legend()
        else:
            ax.text(0.5, 0.5, f"{col}\n(N/A)", ha="center", va="center", transform=ax.transAxes)
            ax.axis("off")

    plt.tight_layout()
    plt.savefig(CONFIG["working_dir"] / "training_curves.png", dpi=150, bbox_inches="tight")
    plt.show()
else:
    print("results.csv non trouvé")


# ==============================================================================
# CELL 12 — Analyse Métriques : Confusion Matrix + F1 + PR curves
# ==============================================================================
fig, axes = plt.subplots(1, 3, figsize=(21, 6))
fig.suptitle("Métriques visuelles", fontsize=13, fontweight="bold")

for ax, fname, title in [
    (axes[0], "confusion_matrix_normalized.png", "Confusion Matrix"),
    (axes[1], "F1_curve.png",                    "F1-Confidence Curve"),
    (axes[2], "PR_curve.png",                    "Precision-Recall Curve"),
]:
    p = run_dir / fname
    if p.exists():
        ax.imshow(plt.imread(str(p))); ax.set_title(title, fontweight="bold"); ax.axis("off")
    else:
        ax.text(0.5, 0.5, f"{fname}\nnon disponible", ha="center", va="center",
                transform=ax.transAxes, fontsize=10)
        ax.axis("off")

plt.tight_layout()
plt.savefig(CONFIG["working_dir"] / "metrics_visual.png", dpi=150, bbox_inches="tight")
plt.show()


# ==============================================================================
# CELL 13 — Per-class mAP + seuil optimal
# ==============================================================================
loaded_model = YOLO(str(run_dir / "weights" / "best.pt"))

try:
    val_res  = loaded_model.val(data=str(CONFIG["fixed_yaml"]), split="val", verbose=False)
    maps     = val_res.box.maps
    per_df   = pd.DataFrame({
        "class":    class_names[:len(maps)],
        "mAP50-95": [round(float(v), 4) for v in maps],
    }).sort_values("mAP50-95", ascending=False)

    print("Per-class mAP50-95 :")
    print(per_df.to_string(index=False))

    fig, ax = plt.subplots(figsize=(10, 5))
    bar_cols = ["#e74c3c" if v < 0.5 else "#f39c12" if v < 0.75 else "#2ecc71"
                for v in per_df["mAP50-95"]]
    ax.barh(per_df["class"], per_df["mAP50-95"], color=bar_cols)
    ax.axvline(0.5,  color="red",    linestyle="--", alpha=0.6, label="0.50")
    ax.axvline(0.75, color="orange", linestyle="--", alpha=0.6, label="0.75")
    ax.set_title("Performance par classe", fontweight="bold")
    ax.set_xlabel("mAP50-95"); ax.legend(); ax.invert_yaxis()
    plt.tight_layout()
    plt.savefig(CONFIG["working_dir"] / "per_class_map.png", dpi=150, bbox_inches="tight")
    plt.show()

    weak = per_df[per_df["mAP50-95"] < 0.5]
    if not weak.empty:
        print(f"\n⚠️  Classes faibles (<0.5) : {weak['class'].tolist()}")
    else:
        print("\n✅ Toutes les classes mAP50-95 >= 0.5")

except Exception as e:
    print(f"Per-class metrics : {e}")


# ==============================================================================
# CELL 14 — Validation officielle sur TEST SET
# ==============================================================================
print("\n🔬 Validation finale sur TEST SET ...\n")
try:
    test_res   = loaded_model.val(data=str(CONFIG["fixed_yaml"]), split="test",
                                  conf=CONFIG["conf"], iou=CONFIG["iou"], verbose=True)
    test_map50 = float(test_res.results_dict.get("metrics/mAP50(B)", 0))
    test_map95 = float(test_res.results_dict.get("metrics/mAP50-95(B)", 0))

    print(f"\n📊 Test Set :")
    print(f"   mAP50    = {test_map50:.4f}  ({test_map50*100:.1f}%)")
    print(f"   mAP50-95 = {test_map95:.4f}  ({test_map95*100:.1f}%)")

    with mlflow.start_run(run_name="TEST_EVAL"):
        mlflow.log_metrics({"test_mAP50": test_map50, "test_mAP50_95": test_map95})

except Exception as e:
    print(f"Test eval : {e}")
    test_map50 = test_map95 = 0.0


# ==============================================================================
# CELL 15 — Prédictions visuelles sur 12 images test
# ==============================================================================
test_dir   = CONFIG["dataset_root"] / "test" / "images"
test_imgs  = sorted(test_dir.glob("*.*"))[:12]

if test_imgs:
    preds = loaded_model.predict(
        source=[str(p) for p in test_imgs],
        conf=CONFIG["conf"], iou=CONFIG["iou"],
        save=False, verbose=False,
    )
    cmap = plt.cm.tab20(np.linspace(0, 1, max(len(class_names), 1)))

    n_cols = 4
    n_rows = (len(preds) + n_cols - 1) // n_cols
    fig, axes = plt.subplots(n_rows, n_cols, figsize=(20, n_rows * 5))
    fig.suptitle("Prédictions — Test Set", fontsize=13, fontweight="bold")
    axes_flat = axes.flatten() if hasattr(axes, "flatten") else [axes]

    for ax, (result, p) in zip(axes_flat, zip(preds, test_imgs)):
        img = cv2.cvtColor(cv2.imread(str(p)), cv2.COLOR_BGR2RGB)
        boxes = result.boxes
        n_det = len(boxes) if boxes is not None else 0
        if boxes is not None:
            for box in boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                cid  = int(box.cls[0])
                conf = float(box.conf[0])
                col  = tuple((np.array(cmap[cid % len(class_names)][:3]) * 255).astype(int).tolist())
                cv2.rectangle(img, (x1, y1), (x2, y2), col, 2)
                lbl = f"{class_names[cid] if cid < len(class_names) else cid} {conf:.2f}"
                cv2.putText(img, lbl, (x1, max(y1 - 5, 15)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, col, 1)
        ax.imshow(img); ax.set_title(f"{p.name[:25]}\n{n_det} det.", fontsize=8); ax.axis("off")

    for ax in axes_flat[len(preds):]:
        ax.axis("off")

    plt.tight_layout()
    plt.savefig(CONFIG["working_dir"] / "test_predictions.png", dpi=120, bbox_inches="tight")
    plt.show()
else:
    print("Pas d'images test disponibles")


# ==============================================================================
# CELL 16 — Export ONNX + TorchScript
# ==============================================================================
export_model = YOLO(str(run_dir / "weights" / "best.pt"))

print("📦 Export ONNX ...")
try:
    onnx_path = export_model.export(format="onnx", imgsz=CONFIG["imgsz"],
                                    dynamic=True, simplify=True)
    print(f"  ✅ ONNX : {onnx_path}")
except Exception as e:
    print(f"  ❌ ONNX : {e}"); onnx_path = None

print("\n📦 Export TorchScript ...")
try:
    ts_path = export_model.export(format="torchscript", imgsz=CONFIG["imgsz"])
    print(f"  ✅ TorchScript : {ts_path}")
except Exception as e:
    print(f"  ❌ TorchScript : {e}"); ts_path = None

# Vérification cohérence PyTorch vs ONNX
if onnx_path and Path(str(onnx_path)).exists() and test_imgs:
    print("\n🔍 Vérification PyTorch vs ONNX ...")
    try:
        pt_n   = len(loaded_model.predict(str(test_imgs[0]), conf=0.25, verbose=False)[0].boxes or [])
        onnx_m = YOLO(str(onnx_path))
        on_n   = len(onnx_m.predict(str(test_imgs[0]),       conf=0.25, verbose=False)[0].boxes or [])
        print(f"  PyTorch : {pt_n} détections | ONNX : {on_n} détections")
        print("  ✅ Cohérence OK" if abs(pt_n - on_n) <= 1 else "  ⚠️  Léger écart")
    except Exception as e:
        print(f"  Skip : {e}")


# ==============================================================================
# CELL 17 — Package ZIP final + résumé
# ==============================================================================
def create_zip() -> Path:
    export_dir = CONFIG["working_dir"] / "final_export"
    export_dir.mkdir(exist_ok=True)

    to_copy = {
        run_dir / "weights" / "best.pt":  export_dir / "best.pt",
        run_dir / "weights" / "last.pt":  export_dir / "last.pt",
        CONFIG["fixed_yaml"]:             export_dir / "data.yaml",
        run_dir / "results.csv":          export_dir / "results.csv",
        run_dir / "results.png":          export_dir / "results.png",
        run_dir / "args.yaml":            export_dir / "args.yaml",
        CONFIG["working_dir"] / "training_curves.png":  export_dir / "training_curves.png",
        CONFIG["working_dir"] / "per_class_map.png":    export_dir / "per_class_map.png",
        CONFIG["working_dir"] / "metrics_visual.png":   export_dir / "metrics_visual.png",
        CONFIG["working_dir"] / "test_predictions.png": export_dir / "test_predictions.png",
        CONFIG["working_dir"] / "benchmark.png":        export_dir / "benchmark.png",
        CONFIG["working_dir"] / "eda_classes.png":      export_dir / "eda_classes.png",
        CONFIG["working_dir"] / "eda_sample_bboxes.png": export_dir / "eda_sample_bboxes.png",
    }
    if onnx_path and Path(str(onnx_path)).exists():
        to_copy[Path(str(onnx_path))] = export_dir / "best.onnx"

    copied = 0
    for src, dst in to_copy.items():
        if src.exists():
            shutil.copy(src, dst); copied += 1
        else:
            print(f"  ⚠️  Absent : {src.name}")

    zip_path = CONFIG["working_dir"] / "Model_orange-leaf_YOLOv11.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in export_dir.rglob("*"):
            if f.is_file():
                zf.write(f, arcname=f.relative_to(export_dir))

    size_mb = zip_path.stat().st_size / 1024**2
    print(f"\n✅ ZIP : {zip_path.name} ({size_mb:.1f} MB) | {copied} fichiers")
    return zip_path

zip_file = create_zip()

# Résumé final
print("\n" + "="*65)
print("  RESUME FINAL — Orange Leaf Disease Detection")
print("="*65)
print(f"  Modele           : {best_model}")
print(f"  Classes          : {len(class_names)}")
print(f"  mAP50  (val)     : {final_map50:.4f}  ({final_map50*100:.1f}%)")
print(f"  mAP50-95 (val)   : {final_map5095:.4f}  ({final_map5095*100:.1f}%)")
print(f"  mAP50  (test)    : {test_map50:.4f}  ({test_map50*100:.1f}%)")
print(f"  mAP50-95 (test)  : {test_map95:.4f}  ({test_map95*100:.1f}%)")
print(f"  Seuil conf       : {CONFIG['conf']}")
print(f"  ONNX exporte     : {'Oui' if onnx_path else 'Non'}")
print(f"  ZIP              : {zip_file.name}")
print("="*65)
print("""
Usage FastAPI :
  from ultralytics import YOLO
  model = YOLO("best.pt")       # PyTorch
  # model = YOLO("best.onnx")   # ONNX Runtime (plus rapide en CPU)
  results = model.predict(image_path, conf=0.25)
  for box in results[0].boxes:
      print(box.cls, box.conf, box.xyxy)
""")
