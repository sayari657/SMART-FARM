# -*- coding: utf-8 -*-
"""
=======================================================================
  Smart Farm AI - Test Modeles YOLO Plantations
  Modeles disponibles:
    leaves  : Detection diseases Leaves  (12 classes)
    olive   : model olive-tree-diseases  (5 classes)
    insects : model insects_final        (10 classes)
=======================================================================

Usage:
    python test_ai_models.py --model leaves  --info
    python test_ai_models.py --model olive   --info
    python test_ai_models.py --model insects --info
    python test_ai_models.py --model fire    --info
    python test_ai_models.py --model leaves  --image path/to/leaf.jpg
    python test_ai_models.py --model fire    --image path/to/fire.jpg --conf 0.1
"""
import sys, os, argparse, time

MODEL_PATHS = {
    "leaves": r"C:\Users\Mohamed\Desktop\FARM AI\ai_assets\plantations\Detection diseases Leaves\best.pt",
    "olive":  r"C:\Users\Mohamed\Desktop\FARM AI\ai_assets\plantations\model olive-tree-diseases\best.pt",
    "insects": r"C:\Users\Mohamed\Desktop\FARM AI\ai_assets\plantations\model insects_final\best.pt",
    "fire":    r"C:\Users\Mohamed\Desktop\FARM AI\ai_assets\Alert\model-fire-detection-and-smoke\best.pt",
}

# Colors per model
COLORS = {
    "leaves": {   # green palette for leaf diseases
        0:  (255, 80,  80),   # Beans_Angular_LeafSpot
        1:  (255, 150, 50),   # Beans_Rust
        2:  (50,  200, 100),  # Strawberry_Angular_LeafSpot
        3:  (200, 50,  150),  # Strawberry_Anthracnose
        4:  (180, 100, 220),  # Strawberry_Blossom_Blight
        5:  (100, 180, 255),  # Strawberry_Gray_Mold
        6:  (255, 220, 50),   # Strawberry_Leaf_Spot
        7:  (50,  255, 200),  # Strawberry_Powdery_Mildew_Fruit
        8:  (150, 255, 50),   # Strawberry_Powdery_Mildew_Leaf
        9:  (255, 100, 50),   # Tomato_Blight
        10: (200, 200, 50),   # Tomato_Leaf_Mold
        11: (255, 50,  200),  # Tomato_Spider_Mites
    },
    "olive": {   # amber/gold palette for olive diseases
        0: (80,  200, 120),   # Anthracnose
        1: (60,  60,  220),   # BlackScale
        2: (220, 180, 50),    # OlivePeacockSpot
        3: (230, 80,  80),    # Psyllid
        4: (150, 80,  220),   # Tuberculosis
    },
    "insects": { # red/purple palette for pests
        0: (255, 50,  50),    # army worm
        1: (255, 120, 50),    # legume blister beetle
        2: (255, 50,  150),   # red spider
        3: (180, 50,  255),   # rice gall midge
        4: (100, 50,  255),   # rice leaf roller
        5: (50,  150, 255),   # rice leafhopper
        6: (50,  255, 180),   # rice water weevil
        7: (150, 255, 50),    # wheat phloeothrips
        8: (255, 220, 50),    # white backed plant hopper
        9: (255, 100, 50),    # yellow rice borer
    },
    "fire": {    # red/orange palette for fire/smoke
        5: (255, 69,  0),     # fire (assuming index 5-7 based on data.yaml)
        6: (255, 69,  0),     # fire/object
        7: (128, 128, 128),   # smoke
    }
}


DEFAULT_COLOR = (100, 200, 100)


def check_deps():
    missing = []
    for pkg in ["ultralytics", "cv2", "numpy"]:
        try:
            __import__(pkg)
            print("[OK] " + pkg)
        except ImportError:
            missing.append(pkg if pkg != "cv2" else "opencv-python")
    if missing:
        print("[ERROR] Missing: " + ", ".join(missing))
        print("Install: pip install " + " ".join(missing))
        sys.exit(1)


def print_info(model_key):
    from ultralytics import YOLO
    path = MODEL_PATHS[model_key]
    if not os.path.exists(path):
        print("[ERROR] Model not found: " + path)
        sys.exit(1)
    model = YOLO(path)
    size_mb = os.path.getsize(path) / (1024*1024)
    print("\n" + "="*65)
    print("  MODEL: " + model_key.upper())
    print("="*65)
    print("  Path   : " + path)
    print("  Task   : " + str(model.task))
    print("  Size   : " + f"{size_mb:.1f} MB")
    print("  Classes (" + str(len(model.names)) + "):")
    for i, name in model.names.items():
        color = COLORS.get(model_key, {}).get(i, DEFAULT_COLOR)
        print(f"    [{i:2d}] {name:<35} RGB={color}")
    print("="*65)


def draw_boxes(img_path, results, model_key, conf_thresh):
    import cv2, numpy as np

    img = cv2.imread(img_path)
    if img is None:
        print("[ERROR] Cannot read image: " + img_path)
        return None

    h, w = img.shape[:2]
    counts = {}
    color_map = COLORS.get(model_key, {})

    print("\n" + "="*65)
    print("  DETECTIONS  [model=" + model_key + "]")
    print("="*65)
    total = 0

    for r in results:
        if r.boxes is None or len(r.boxes) == 0:
            print("  [WARN] No detections on this image.")
            continue
        for box in r.boxes:
            conf = float(box.conf[0])
            if conf < conf_thresh:
                continue
            cls_id = int(box.cls[0])
            label  = r.names[cls_id]
            color  = color_map.get(cls_id, DEFAULT_COLOR)
            x1,y1,x2,y2 = [int(v) for v in box.xyxy[0].tolist()]
            bw, bh = x2-x1, y2-y1
            counts[label] = counts.get(label, 0) + 1
            total += 1

            # Rectangle
            cv2.rectangle(img, (x1,y1), (x2,y2), color, 3)

            # Corner marks
            cl = min(bw, bh) // 6
            for cx,cy in [(x1,y1),(x2,y1),(x1,y2),(x2,y2)]:
                dx = cl if cx==x1 else -cl
                dy = cl if cy==y1 else -cl
                cv2.line(img,(cx,cy),(cx+dx,cy),color,5)
                cv2.line(img,(cx,cy),(cx,cy+dy),color,5)

            # Label
            txt = label + "  " + f"{conf:.0%}"
            (tw,th),bl = cv2.getTextSize(txt, cv2.FONT_HERSHEY_SIMPLEX, 0.65, 2)
            ly = max(y1-th-bl-8, 0)
            cv2.rectangle(img, (x1,ly), (x1+tw+12, y1), color, -1)
            cv2.putText(img, txt, (x1+6, max(y1-bl-2, th)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255,255,255), 2)

            print("  [DET] " + f"{label:<35} conf={conf:.1%}  bbox=[{x1},{y1},{x2},{y2}]  ({bw}x{bh}px)")

    # Bottom bar
    overlay = img.copy()
    cv2.rectangle(overlay, (0,h-55),(w,h),(10,10,10),-1)
    img = cv2.addWeighted(overlay,0.75,img,0.25,0)
    summary = "Model=" + model_key.upper() + "  |  Detections=" + str(total) + "  |  " + "  ".join(k+"x"+str(v) for k,v in list(counts.items())[:4])
    cv2.putText(img, summary[:90], (10,h-18), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (180,255,180), 1)
    cv2.putText(img, "Smart Farm AI - Plant Disease Detection", (10,28),
                cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255,255,255), 2)

    print("="*65)
    print("\n  Summary:")
    for k,v in counts.items():
        print("    " + k + " : " + str(v))
    print("    Total : " + str(total))

    out = os.path.splitext(img_path)[0] + "_DETECTED.jpg"
    cv2.imwrite(out, img)
    print("\n  [OK] Annotated image saved:")
    print("     " + out)
    return out


def run_test(model_key, img_path, conf):
    from ultralytics import YOLO

    path = MODEL_PATHS[model_key]
    if not os.path.exists(path):
        print("[ERROR] Model not found: " + path)
        sys.exit(1)
    if not os.path.exists(img_path):
        print("[ERROR] Image not found: " + img_path)
        sys.exit(1)

    print("\n[*] Loading model: " + model_key + " ...")
    t0 = time.time()
    model = YOLO(path)
    print("   [OK] Loaded in " + f"{time.time()-t0:.2f}s")
    print_info(model_key)

    print("\n[*] Image : " + img_path)
    print("[*] Conf  : " + str(conf))

    print("\n[*] Running inference...")
    t1 = time.time()
    results = model.predict(source=img_path, conf=conf, imgsz=768, verbose=False, save=False)
    print("   [OK] Done in " + f"{(time.time()-t1)*1000:.1f}ms")

    out = draw_boxes(img_path, results, model_key, conf)
    if out:
        try:
            os.startfile(out)
            print("\n   [OK] Image opened automatically.")
        except Exception:
            pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test YOLO Plant Models - Smart Farm AI")
    parser.add_argument("--model", choices=["leaves","olive","insects","fire"], default="leaves",
                        help="Model to use: leaves, olive, insects or fire")
    parser.add_argument("--image", type=str, default=None, help="Path to test image")
    parser.add_argument("--conf",  type=float, default=0.25, help="Confidence threshold")
    parser.add_argument("--info",  action="store_true", help="Show model info only")
    args = parser.parse_args()

    print("\n" + "="*65)
    print("  Smart Farm AI - Plant Disease YOLO Test")
    print("  leaves:  12 classes (Beans/Strawberry/Tomato)")
    print("  olive :  5 classes  (Anthracnose/BlackScale/...)")
    print("  insects: 10 classes (Army worm/Red spider/...)")
    print("  fire:    8 classes (Fire/Smoke/...)")
    print("="*65 + "\n")

    check_deps()

    if args.info:
        print_info(args.model)
        sys.exit(0)

    # Try to find a sample image in predictions folder if none given
    if args.image is None:
        model_dir = os.path.dirname(MODEL_PATHS[args.model])
        pred_dir  = os.path.join(model_dir, "predictions")
        if os.path.exists(pred_dir):
            imgs = [f for f in os.listdir(pred_dir)
                    if f.lower().endswith((".jpg",".jpeg",".png")) and "_DETECTED" not in f]
            if imgs:
                args.image = os.path.join(pred_dir, imgs[0])
                print("[*] Auto-selected image: " + imgs[0])

    if args.image is None:
        print("[ERROR] No image provided. Use --image <path>")
        sys.exit(1)

    run_test(args.model, args.image, args.conf)
