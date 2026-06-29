#!/usr/bin/env python3
"""
Smart Farm AI — Pont MJPEG O-KAM Pro  →  Moniteur d'Urgence Souverain
=====================================================================

PROBLÈME
    Les caméras O-KAM Pro sont « cloud-only » : elles n'exposent AUCUN flux
    RTSP. Or l'onglet « IP / RTSP » du Moniteur d'Urgence Souverain attend une
    URL caméra (rtsp:// ou http://). Il n'y a donc rien à coller → impossible
    de connecter directement.

SOLUTION
    Ce pont capture la fenêtre de l'app O-KAM Pro affichée à l'écran et la
    re-publie comme un flux vidéo standard MJPEG sur HTTP :

        http://localhost:8088/video

    → Dans le Moniteur d'Urgence Souverain, onglet « IP / RTSP », colle cette
      URL et clique « Connecter ». Le backend ouvre le flux, exécute le modèle
      feu/fumée et renvoie l'aperçu + détections DANS la carte du moniteur.

    Aucune modification du frontend. Le pont est juste une « source caméra ».

         O-KAM Pro (fenêtre)  →  [ce pont MJPEG]  →  http://localhost:8088/video
              →  onglet IP/RTSP du Moniteur  →  /ws/rtsp (backend)
              →  YOLO best.pt + overlay  →  carte Moniteur d'Urgence Souverain

DÉPENDANCES
    pip install opencv-python mss pygetwindow   (déjà installées pour le projet)

USAGE
    python workers/okam_mjpeg_bridge.py
    python workers/okam_mjpeg_bridge.py --port 8088 --fps 6 --width 960
    python workers/okam_mjpeg_bridge.py --region 0 0 1920 1080     # zone fixe
    python workers/okam_mjpeg_bridge.py --window-title "O-KAM Pro"
"""

import os
import sys
import time
import argparse
import logging
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [MJPEG] %(message)s")
logger = logging.getLogger(__name__)

# Réutilise la détection de fenêtre + la capture écran du moniteur (sans effets
# de bord : seul main() est exécuté à l'import, pas appelé ici).
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from okam_screen_monitor import _set_dpi_aware, find_window_region, ScreenGrabber  # noqa: E402

# Config résolue au démarrage (remplie dans main()).
CFG = {
    "mode": "window",          # "window" | "fixed"
    "window_title": "O-KAM Pro",
    "fixed_region": None,
    "monitor": 1,
    "fps": 6,
    "width": 960,
    "quality": 70,
}


def _current_region():
    if CFG["mode"] == "window":
        return find_window_region(CFG["window_title"]) or CFG["fixed_region"]
    return CFG["fixed_region"]


class MJPEGHandler(BaseHTTPRequestHandler):
    def log_message(self, *args):           # silence le logging HTTP par requête
        pass

    def do_GET(self):
        if self.path.rstrip("/") not in ("", "/video", "/stream.mjpg", "/stream"):
            self.send_error(404, "Use /video")
            return

        import cv2
        # Un grabber mss par connexion (mss n'est pas partageable entre threads).
        grabber = ScreenGrabber(CFG["monitor"])
        self.send_response(200)
        self.send_header("Age", "0")
        self.send_header("Cache-Control", "no-cache, private")
        self.send_header("Pragma", "no-cache")
        self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=FRAME")
        self.end_headers()

        interval = 1.0 / max(1, min(int(CFG["fps"]), 15))
        logger.info("Client connecté (%s) — diffusion du flux…", self.client_address[0])
        try:
            while True:
                t0 = time.monotonic()
                region = _current_region()
                if region is None:
                    time.sleep(0.5)
                    continue
                frame = grabber.grab_region(*region)
                h, w = frame.shape[:2]
                if w > CFG["width"]:
                    s = CFG["width"] / float(w)
                    frame = cv2.resize(frame, (int(w * s), int(h * s)))
                ok, buf = cv2.imencode(".jpg", frame,
                                       [int(cv2.IMWRITE_JPEG_QUALITY), CFG["quality"]])
                if not ok:
                    continue
                data = buf.tobytes()
                self.wfile.write(b"--FRAME\r\n")
                self.wfile.write(b"Content-Type: image/jpeg\r\n")
                self.wfile.write(f"Content-Length: {len(data)}\r\n\r\n".encode())
                self.wfile.write(data)
                self.wfile.write(b"\r\n")
                dt = time.monotonic() - t0
                if dt < interval:
                    time.sleep(interval - dt)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            logger.info("Client déconnecté.")
        except Exception as e:
            logger.warning("Flux interrompu : %s", e)


def main():
    ap = argparse.ArgumentParser(description="Pont MJPEG O-KAM Pro → Moniteur d'Urgence Souverain")
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--port", type=int, default=8088)
    ap.add_argument("--window-title", default="O-KAM Pro")
    ap.add_argument("--region", nargs=4, type=int, metavar=("X", "Y", "W", "H"),
                    help="Zone écran fixe (sinon fenêtre auto-détectée).")
    ap.add_argument("--monitor", type=int, default=1)
    ap.add_argument("--fps", type=int, default=6)
    ap.add_argument("--width", type=int, default=960, help="Largeur max diffusée (px).")
    ap.add_argument("--quality", type=int, default=70)
    args = ap.parse_args()

    _set_dpi_aware()
    try:
        import cv2  # noqa
    except ImportError:
        logger.error("opencv-python manquant : pip install opencv-python")
        sys.exit(1)

    CFG.update(window_title=args.window_title, monitor=args.monitor,
               fps=args.fps, width=args.width, quality=args.quality)

    if args.region:
        CFG["mode"] = "fixed"
        CFG["fixed_region"] = tuple(args.region)
        logger.info("Zone fixe : %s", CFG["fixed_region"])
    else:
        wr = find_window_region(args.window_title, activate=True)
        if not wr:
            logger.error("Fenêtre '%s' introuvable. Ouvre O-KAM Pro, ou précise --region.",
                         args.window_title)
            sys.exit(1)
        CFG["mode"] = "window"
        CFG["fixed_region"] = wr   # repli si la fenêtre disparaît
        logger.info("Fenêtre '%s' détectée %s — capture automatique (suivie).",
                    args.window_title, wr)

    server = ThreadingHTTPServer((args.host, args.port), MJPEGHandler)
    url = f"http://localhost:{args.port}/video"
    logger.info("=" * 60)
    logger.info("Pont MJPEG prêt.")
    logger.info("Dans le Moniteur d'Urgence Souverain → onglet « IP / RTSP »,")
    logger.info("colle cette URL puis Connecter :   %s", url)
    logger.info("(Ctrl+C pour arrêter.)")
    logger.info("=" * 60)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Arrêt du pont.")
        server.shutdown()


if __name__ == "__main__":
    main()
