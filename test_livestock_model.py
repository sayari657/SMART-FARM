# -*- coding: utf-8 -*-
"""
=======================================================================
  Smart Farm AI - Test Modele YOLO Livestock (Cow / Goat / Sheep)
  Modele : ai_assets/animal_weights/model goat cow/best.pt
  Classes : 0=cow  1=goat  2=sheep
=======================================================================

Usage :
    python test_livestock_model.py                           # demo image
    python test_livestock_model.py --image path/to/img.jpg  # custom image
    python test_livestock_model.py --conf 0.3               # seuil conf
    python test_livestock_model.py --info                   # infos modele
"""

import sys
import os
import argparse
import time

MODEL_PATH = r"C:\Users\Mohamed\Desktop\FARM AI\ai_assets\animal_weights\model goat cow\best.pt"

# ── Couleurs par classe ────────────────────────────────────────────────────────
CLASS_COLORS = {
    0: (255, 100, 30),   # cow   → orange
    1: (50, 220, 120),   # goat  → vert
    2: (80, 160, 255),   # sheep → bleu
}
CLASS_NAMES = {0: "cow", 1: "goat", 2: "sheep"}


def check_dependencies():
    """Vérifie que ultralytics et cv2 sont installés."""
    missing = []
    try:
        import ultralytics
        print("[OK] ultralytics  v" + ultralytics.__version__)
    except ImportError:
        missing.append("ultralytics")

    try:
        import cv2
        print("[OK] opencv-python v" + cv2.__version__)
    except ImportError:
        missing.append("opencv-python")

    try:
        import numpy as np
        print("[OK] numpy         v" + np.__version__)
    except ImportError:
        missing.append("numpy")

    if missing:
        print("\n[ERROR] Packages manquants : " + ', '.join(missing))
        print("   Installe avec : pip install " + ' '.join(missing))
        sys.exit(1)


def print_model_info(model):
    """Affiche les informations du modele charge."""
    print("\n" + "="*60)
    print("  INFORMATIONS DU MODELE")
    print("="*60)
    print("  Path     : " + MODEL_PATH)
    print("  Task     : " + str(model.task))
    print("  Classes  : " + str(model.names))
    print("  Nb cls   : " + str(len(model.names)))

    # Taille du modele
    size_mb = os.path.getsize(MODEL_PATH) / (1024 * 1024)
    print(f"  Taille   : {size_mb:.1f} MB")
    print("="*60 + "\n")


def create_demo_image():
    """Crée une image de test avec des formes simples si aucune image fournie."""
    import numpy as np
    import cv2

    img = np.zeros((480, 640, 3), dtype=np.uint8)
    # Fond vert herbe
    img[:] = (34, 100, 34)
    # Ciel
    img[:150, :] = (180, 130, 80)

    # Texte d'information
    cv2.putText(img, "Demo Image - No real animals",
                (100, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    cv2.putText(img, "Provide --image path for real test",
                (80, 290), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (200, 200, 200), 1)

    demo_path = r"C:\Users\Mohamed\Desktop\FARM AI\test_demo_livestock.jpg"
    cv2.imwrite(demo_path, img)
    return demo_path


def draw_bounding_boxes(image_path: str, results, conf_threshold: float = 0.25):
    """
    Dessine les bounding boxes sur l'image et sauvegarde le résultat.
    Retourne le chemin de l'image annotée.
    """
    import cv2
    import numpy as np

    img = cv2.imread(image_path)
    if img is None:
        print(f"❌ Impossible de lire l'image : {image_path}")
        return None

    h, w = img.shape[:2]
    detections_count = {0: 0, 1: 0, 2: 0}
    all_detections = []

    print("\n" + "="*60)
    print("  DETECTIONS")
    print("="*60)

    for r in results:
        boxes = r.boxes
        if boxes is None or len(boxes) == 0:
            print("  [WARN] Aucune detection sur cette image.")
            continue

        for box in boxes:
            conf = float(box.conf[0])
            if conf < conf_threshold:
                continue

            cls_id = int(box.cls[0])
            cls_name = CLASS_NAMES.get(cls_id, f"class_{cls_id}")
            color = CLASS_COLORS.get(cls_id, (255, 255, 255))

            # Coordonnées bounding box (x1, y1, x2, y2)
            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]

            # Taille de la bounding box
            bw = x2 - x1
            bh = y2 - y1

            detections_count[cls_id] = detections_count.get(cls_id, 0) + 1
            all_detections.append({
                "class": cls_name, "conf": conf,
                "bbox": [x1, y1, x2, y2], "size": f"{bw}x{bh}px"
            })

            # ── Dessiner la bounding box ─────────────────────────────
            # Rectangle principal (épaisseur 3)
            cv2.rectangle(img, (x1, y1), (x2, y2), color, 3)

            # Coins renforcés pour look premium
            corner_len = min(bw, bh) // 6
            for cx, cy in [(x1, y1), (x2, y1), (x1, y2), (x2, y2)]:
                dx = corner_len if cx == x1 else -corner_len
                dy = corner_len if cy == y1 else -corner_len
                cv2.line(img, (cx, cy), (cx + dx, cy), color, 5)
                cv2.line(img, (cx, cy), (cx, cy + dy), color, 5)

            # ── Label avec fond ─────────────────────────────────────
            label = f"{cls_name}  {conf:.0%}"
            (lw, lh), baseline = cv2.getTextSize(
                label, cv2.FONT_HERSHEY_SIMPLEX, 0.75, 2)
            # Fond du label
            cv2.rectangle(img,
                          (x1, max(y1 - lh - baseline - 10, 0)),
                          (x1 + lw + 12, y1),
                          color, -1)
            # Texte blanc
            cv2.putText(img, label,
                        (x1 + 6, max(y1 - baseline - 4, lh)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2)

            print("  [OK] " + f"{cls_name:<15} conf={conf:.1%}  bbox=[{x1},{y1},{x2},{y2}]  ({bw}x{bh}px)")

    # ── Panneau récapitulatif en bas ─────────────────────────────────────────
    total = sum(detections_count.values())
    overlay = img.copy()
    cv2.rectangle(overlay, (0, h - 60), (w, h), (20, 20, 20), -1)
    img = cv2.addWeighted(overlay, 0.7, img, 0.3, 0)

    summary = ("Total: " + str(total) + " detection(s)  |  " +
               "Vaches: " + str(detections_count[0]) + "  " +
               "Chevres: " + str(detections_count[1]) + "  " +
               "Moutons: " + str(detections_count[2]))
    cv2.putText(img, summary, (10, h - 20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.65, (200, 255, 200), 2)

    # ── Watermark ────────────────────────────────────────────────────────────
    cv2.putText(img, "Smart Farm AI — Livestock Detection",
                (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

    # ── Sauvegarder ─────────────────────────────────────────────────────────
    base = os.path.splitext(image_path)[0]
    out_path = base + "_DETECTED.jpg"
    cv2.imwrite(out_path, img)

    print("="*60)
    print("\n  Resume :")
    print("    Vaches  : " + str(detections_count[0]))
    print("    Chevres : " + str(detections_count[1]))
    print("    Moutons : " + str(detections_count[2]))
    print("    Total   : " + str(total))
    print("\n  [OK] Image annotee sauvegardee :")
    print("     " + out_path)

    return out_path, all_detections


def run_test(image_path: str, conf: float = 0.25, save_txt: bool = False):
    """Lance l'inférence YOLO et dessine les bounding boxes."""
    from ultralytics import YOLO

    # ── 1. Vérifier le modèle ────────────────────────────────────────────────
    if not os.path.exists(MODEL_PATH):
        print("[ERROR] Modele introuvable : " + MODEL_PATH)
        sys.exit(1)

    print("\n[*] Chargement du modele...")
    t0 = time.time()
    model = YOLO(MODEL_PATH)
    load_time = time.time() - t0
    print(f"   [OK] Modele charge en {load_time:.2f}s")

    print_model_info(model)

    # ── 2. Vérifier l'image ──────────────────────────────────────────────────
    if not os.path.exists(image_path):
        print("[WARN] Image introuvable : " + image_path)
        print("   Creation d'une image de demonstration...")
        image_path = create_demo_image()
        print("   Image demo creee : " + image_path)

    print("[*] Image : " + image_path)
    print(f"[*] Conf threshold : {conf}")
    print("[*] Image size (training) : 768px")

    # ── 3. Inférence ─────────────────────────────────────────────────────────
    print("\n[*] Inference en cours...")
    t1 = time.time()
    results = model.predict(
        source=image_path,
        conf=conf,
        imgsz=768,          # Même taille que l'entraînement
        verbose=False,
        save=False,         # On gère le save manuellement
        save_txt=save_txt,
    )
    infer_time = (time.time() - t1) * 1000
    print(f"   [OK] Inference terminee en {infer_time:.1f}ms")

    # ── 4. Dessiner les bounding boxes ───────────────────────────────────────
    result = draw_bounding_boxes(image_path, results, conf_threshold=conf)

    if result:
        out_path, dets = result
        # Ouvrir automatiquement l'image annotee
        try:
            os.startfile(out_path)
            print("\n   [OK] Image ouverte automatiquement.")
        except Exception:
            pass

    return results


def debug_model_classes():
    """Affiche les classes du modele sans lancer d'inference."""
    from ultralytics import YOLO
    model = YOLO(MODEL_PATH)
    print("\nClasses du modele :")
    for idx, name in model.names.items():
        color = CLASS_COLORS.get(idx, (200, 200, 200))
        print(f"   [{idx}] {name}  (couleur RGB={color})")
    print("\nNombre de classes : " + str(len(model.names)))
    print("Task : " + str(model.task))
    print_model_info(model)


# ── CLI ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Test YOLO Livestock Model - Smart Farm AI",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--image",  type=str, default=None,
                        help="Chemin vers l'image a tester (jpg/png)")
    parser.add_argument("--conf",   type=float, default=0.25,
                        help="Seuil de confiance (defaut: 0.25)")
    parser.add_argument("--info",   action="store_true",
                        help="Afficher les infos du modele seulement")
    parser.add_argument("--txt",    action="store_true",
                        help="Sauvegarder les detections en .txt (format YOLO)")
    args = parser.parse_args()

    print("\n" + "="*60)
    print("  Smart Farm AI - Test Modele YOLO Livestock")
    print("  Classes : cow | goat | sheep")
    print("="*60 + "\n")

    # Vérification dépendances
    check_dependencies()

    if args.info:
        debug_model_classes()
        sys.exit(0)

    # Chemin image
    image = args.image
    if image is None:
        # Cherche une image dans les prédictions existantes du modèle
        pred_dir = r"C:\Users\Mohamed\Desktop\FARM AI\ai_assets\animal_weights\model goat cow\predictions"
        if os.path.exists(pred_dir):
            imgs = [f for f in os.listdir(pred_dir)
                    if f.lower().endswith((".jpg", ".jpeg", ".png"))]
            if imgs:
                image = os.path.join(pred_dir, imgs[0])
                print(f"📷 Image trouvée dans predictions/ : {imgs[0]}")

    run_test(
        image_path=image or "demo",
        conf=args.conf,
        save_txt=args.txt
    )
