#!/usr/bin/env python3
"""
Smart Farm AI — Moniteur écran O-KAM Pro → YOLO Feu/Fumée → Alertes
====================================================================

Hiérarchie réalisée par ce script :

    App O-KAM Pro ouverte (PC, tuile caméra visible)
            │  capture de la zone écran de la caméra
            ▼
    Frame (image numpy)
            │  YOLO best.pt  (modèle feu/fumée, exécuté EN LOCAL)
            ▼
    Aperçu live avec boîtes  +  si Feu/Fumée détecté →
            │  POST /cv/detect?category=fire
            ▼
    Le backend crée automatiquement un CVEvent + une Alerte CRITIQUE
            ▼
    Résultat visible dans Smart Farm AI (AI Scanner / Centre d'alertes)

POURQUOI la capture écran ?
    Beaucoup de caméras O-KAM Pro sont « cloud-only » et n'exposent aucun flux
    RTSP. On lit donc l'image directement depuis la fenêtre de l'app O-KAM Pro
    affichée à l'écran. (Si ta caméra expose du RTSP, utilise plutôt l'onglet
    « IP/RTSP » de l'AI Scanner — c'est plus propre.)

DÉPENDANCES
    pip install requests opencv-python ultralytics mss
    (mss est recommandé ; à défaut, Pillow est utilisé en secours.)

USAGE
    # 1) Ouvre O-KAM Pro et affiche la caméra à surveiller
    # 2) Lance :
    python workers/okam_screen_monitor.py
    #    → une capture plein écran s'affiche : encadre la tuile caméra à la
    #      souris, puis Entrée. La surveillance démarre.

    # Zone fixe (sans sélection interactive) :
    python workers/okam_screen_monitor.py --region 660 95 620 360

    # Identifiants / serveur personnalisés :
    python workers/okam_screen_monitor.py --api http://localhost:8000/api/v1 \
        --user admin --password admin123 --interval 1.0 --cooldown 60

    Touche 'q' dans la fenêtre d'aperçu pour quitter.
"""

import os
import sys
import time
import argparse
import logging

import numpy as np
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s [O-KAM] %(message)s")
logger = logging.getLogger(__name__)

# ── Labels considérés comme « urgence feu » ──────────────────────────────────
# IMPORTANT : le modèle feu émet aussi des classes numériques bruitées 0-4
# (« zones ») qui hallucinent sur l'UI O-KAM. On NE déclenche d'alerte que sur
# les vraies classes feu/fumée pour éviter les fausses alertes.
FIRE_LABELS = {
    "fire", "smoke", "incendie", "fumee", "fumée", "feu",
}


# ── Résolution du chemin du modèle best.pt ───────────────────────────────────
def resolve_fire_model_path() -> str:
    """Récupère YOLO_FIRE_PATH depuis la config du backend si possible,
    sinon repli sur le chemin connu du dépôt."""
    env = os.getenv("YOLO_FIRE_PATH")
    if env and os.path.exists(env):
        return env
    try:
        sys.path.insert(0, os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "backend")))
        from app.core.config import settings  # type: ignore
        if os.path.exists(settings.YOLO_FIRE_PATH):
            return settings.YOLO_FIRE_PATH
    except Exception:
        pass
    fallback = os.path.abspath(os.path.join(
        os.path.dirname(__file__), "..", "ai_assets",
        "Alert", "model-fire-detection-and-smoke", "best.pt"))
    return fallback


# ── Capture écran (mss prioritaire, Pillow en secours) ───────────────────────
class ScreenGrabber:
    """Capture le plein écran (pour la sélection) et une région donnée."""

    def __init__(self, monitor_index: int = 1):
        self.monitor_index = monitor_index
        self._mss = None
        self._monitor = None
        try:
            import mss  # noqa
            self._mss = mss.mss()
            mons = self._mss.monitors
            idx = monitor_index if monitor_index < len(mons) else 1
            self._monitor = mons[idx]
            logger.info("Capture via mss — moniteur %s : %s",
                        idx, self._monitor)
        except Exception:
            logger.info("mss indisponible → repli sur Pillow ImageGrab.")
            self._monitor = {"left": 0, "top": 0, "width": 0, "height": 0}

    def _to_bgr(self, raw) -> np.ndarray:
        import cv2
        arr = np.array(raw)
        if arr.shape[-1] == 4:                      # BGRA (mss)
            return cv2.cvtColor(arr, cv2.COLOR_BGRA2BGR)
        return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)  # RGB (PIL)

    def grab_full(self) -> np.ndarray:
        if self._mss is not None:
            return self._to_bgr(self._mss.grab(self._monitor))
        from PIL import ImageGrab
        return self._to_bgr(ImageGrab.grab())

    def grab_region(self, x: int, y: int, w: int, h: int) -> np.ndarray:
        if self._mss is not None:
            region = {"left": int(x), "top": int(y),
                      "width": int(w), "height": int(h)}
            return self._to_bgr(self._mss.grab(region))
        from PIL import ImageGrab
        return self._to_bgr(ImageGrab.grab(bbox=(x, y, x + w, y + h)))

    @property
    def offset(self):
        """Décalage absolu du moniteur (left, top) pour mapper la ROI."""
        return int(self._monitor.get("left", 0)), int(self._monitor.get("top", 0))


# ── Détection automatique de la fenêtre O-KAM Pro ───────────────────────────
def _set_dpi_aware():
    """Aligne les coordonnées fenêtre (pygetwindow) et la capture (mss) malgré
    la mise à l'échelle d'affichage Windows (ex. 125 %)."""
    if sys.platform == "win32":
        import ctypes
        try:
            ctypes.windll.shcore.SetProcessDpiAwareness(2)   # PER_MONITOR_AWARE
        except Exception:
            try:
                ctypes.windll.user32.SetProcessDPIAware()
            except Exception:
                pass


def find_window_region(title_substr: str, activate: bool = False):
    """Retourne (x, y, w, h) de la fenêtre dont le titre contient title_substr."""
    try:
        import pygetwindow as gw
    except Exception:
        return None
    wins = [w for w in gw.getAllWindows()
            if title_substr.lower() in (w.title or "").lower()
            and w.width > 0 and w.height > 0]
    if not wins:
        return None
    win = wins[0]
    try:
        if getattr(win, "isMinimized", False):
            win.restore()
        if activate:
            win.activate()
    except Exception:
        pass
    return int(win.left), int(win.top), int(win.width), int(win.height)


# ── Authentification (login une seule fois, token mis en cache) ──────────────
def login(api_base: str, user: str, password: str) -> str:
    r = requests.post(f"{api_base}/auth/login",
                      json={"username": user, "password": password}, timeout=10)
    r.raise_for_status()
    token = r.json().get("access_token")
    if not token:
        raise RuntimeError(f"Réponse login inattendue : {r.text[:200]}")
    logger.info("Connecté à %s en tant que '%s'.", api_base, user)
    return token


def post_fire_frame(api_base: str, token: str, jpg_bytes: bytes) -> dict:
    """Envoie la frame au backend : il rejoue best.pt + crée CVEvent + Alerte."""
    r = requests.post(
        f"{api_base}/cv/detect",
        params={"category": "fire"},
        files={"file": ("okam_frame.jpg", jpg_bytes, "image/jpeg")},
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()


# ── Sélection interactive de la tuile caméra ─────────────────────────────────
def select_region(grabber: ScreenGrabber):
    import cv2
    full = grabber.grab_full()
    win = "O-KAM Pro : encadre la tuile camera puis ENTREE (ou C pour annuler)"
    # Réduit l'affichage si l'écran est plus large que 1600 px (sélection plus pratique)
    H, W = full.shape[:2]
    scale = min(1.0, 1600.0 / W)
    disp = cv2.resize(full, (int(W * scale), int(H * scale))) if scale < 1.0 else full
    roi = cv2.selectROI(win, disp, showCrosshair=True, fromCenter=False)
    cv2.destroyWindow(win)
    rx, ry, rw, rh = [int(v / scale) for v in roi]
    if rw == 0 or rh == 0:
        return None
    off_x, off_y = grabber.offset
    return off_x + rx, off_y + ry, rw, rh


# ── Boucle principale ────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(description="Moniteur écran O-KAM Pro → YOLO feu/fumée → Smart Farm AI")
    ap.add_argument("--api", default=os.getenv("API_BASE", "http://localhost:8000/api/v1"))
    ap.add_argument("--user", default=os.getenv("SFA_USER", "admin"))
    ap.add_argument("--password", default=os.getenv("SFA_PASSWORD", "admin123"))
    ap.add_argument("--region", nargs=4, type=int, metavar=("X", "Y", "W", "H"),
                    help="Zone écran fixe (prioritaire sur la détection de fenêtre).")
    ap.add_argument("--window-title", default="O-KAM Pro",
                    help="Titre (partiel) de la fenêtre à capturer automatiquement.")
    ap.add_argument("--monitor", type=int, default=1, help="Index moniteur mss (1 = principal).")
    ap.add_argument("--interval", type=float, default=1.0, help="Secondes entre deux inférences locales.")
    ap.add_argument("--conf", type=float, default=0.35, help="Seuil de confiance YOLO.")
    ap.add_argument("--cooldown", type=float, default=60.0,
                    help="Délai mini (s) entre deux alertes envoyées au backend.")
    ap.add_argument("--no-preview", action="store_true", help="Mode headless (pas de fenêtre).")
    args = ap.parse_args()

    try:
        import cv2
    except ImportError:
        logger.error("opencv-python manquant : pip install opencv-python")
        sys.exit(1)
    try:
        from ultralytics import YOLO
    except ImportError:
        logger.error("ultralytics manquant : pip install ultralytics")
        sys.exit(1)

    _set_dpi_aware()
    model_path = resolve_fire_model_path()
    if not os.path.exists(model_path):
        logger.error("Modèle feu introuvable : %s", model_path)
        logger.error("Définis YOLO_FIRE_PATH ou place best.pt au bon endroit.")
        sys.exit(1)
    logger.info("Chargement du modèle feu/fumée : %s", model_path)
    model = YOLO(model_path)

    grabber = ScreenGrabber(args.monitor)

    # ── Choix de la zone à capturer ──────────────────────────────────────────
    #   1) --region explicite  2) fenêtre O-KAM auto-détectée (suivie)  3) ROI souris
    capture_mode = None
    fixed_region = None
    if args.region:
        capture_mode, fixed_region = "fixed", tuple(args.region)
        logger.info("Zone fixe : %s", fixed_region)
    else:
        wr = find_window_region(args.window_title, activate=True)
        if wr:
            capture_mode = "window"
            logger.info("Fenêtre '%s' détectée %s — capture automatique (suivie).",
                        args.window_title, wr)
        elif not args.no_preview:
            sel = select_region(grabber)
            if not sel:
                logger.error("Aucune zone sélectionnée — abandon.")
                sys.exit(1)
            capture_mode, fixed_region = "fixed", sel
        else:
            logger.error("Fenêtre '%s' introuvable et mode headless — précise --region.",
                         args.window_title)
            sys.exit(1)

    def current_region():
        if capture_mode == "window":
            return find_window_region(args.window_title) or fixed_region
        return fixed_region

    try:
        token = login(args.api, args.user, args.password)
    except Exception as e:
        logger.error("Échec login (%s). La surveillance continue, mais sans alertes backend.", e)
        token = None

    last_alert = 0.0
    frames = 0
    logger.info("Surveillance démarrée. 'q' pour quitter.")
    while True:
        t0 = time.monotonic()
        region = current_region()
        if region is None:
            logger.warning("Fenêtre '%s' introuvable — en attente…", args.window_title)
            time.sleep(1.0)
            continue
        x, y, w, h = region
        frame = grabber.grab_region(x, y, w, h)

        # ── YOLO best.pt en local ────────────────────────────────────────────
        results = model.predict(frame, conf=args.conf, verbose=False)
        fire_hit = None
        for r in results:
            boxes = getattr(r, "boxes", None) or []
            for b in boxes:
                cls_id = int(b.cls[0])
                label = model.names[cls_id]
                conf = float(b.conf[0])
                x1, y1, x2, y2 = [int(v) for v in b.xyxy[0].tolist()]
                is_fire = str(label).strip().lower() in FIRE_LABELS
                color = (0, 0, 255) if is_fire else (0, 200, 0)
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame, f"{label} {conf:.0%}", (x1, max(15, y1 - 6)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                if is_fire and (fire_hit is None or conf > fire_hit[1]):
                    fire_hit = (label, conf)

        # ── Sur détection feu/fumée + cooldown → alerte dans Smart Farm AI ────
        now = time.time()
        status = "RAS"
        if fire_hit:
            label, conf = fire_hit
            status = f"FEU/FUMEE: {label} {conf:.0%}"
            if token and (now - last_alert) >= args.cooldown:
                ok, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                if ok:
                    try:
                        res = post_fire_frame(args.api, token, buf.tobytes())
                        logger.warning("🚨 ALERTE envoyée → backend : %s dets, statut=%s",
                                       res.get("count"), res.get("status"))
                        last_alert = now
                    except requests.HTTPError as he:
                        if he.response is not None and he.response.status_code == 401:
                            logger.info("Token expiré — reconnexion…")
                            try:
                                token = login(args.api, args.user, args.password)
                            except Exception:
                                token = None
                        else:
                            logger.error("POST /cv/detect échec : %s", he)
                    except Exception as e:
                        logger.error("Envoi alerte échoué : %s", e)

        frames += 1
        # ── Aperçu (HUD) ─────────────────────────────────────────────────────
        if not args.no_preview:
            hud_color = (0, 0, 255) if fire_hit else (0, 200, 0)
            cv2.putText(frame, status, (8, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, hud_color, 2)
            cv2.imshow("Smart Farm AI — O-KAM Sovereign Monitor (q=quitter)", frame)
            if (cv2.waitKey(1) & 0xFF) == ord("q"):
                break

        dt = time.monotonic() - t0
        if dt < args.interval:
            time.sleep(args.interval - dt)

    if not args.no_preview:
        cv2.destroyAllWindows()
    logger.info("Arrêt. %d frames analysées.", frames)


if __name__ == "__main__":
    main()
