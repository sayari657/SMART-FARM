"""
Lazy model fetch from Cloudflare R2.

If a YOLO weight is missing locally and R2_MODELS_BASE_URL is configured,
download it on first use. Keeps the multi-GB weights out of the repo/image
while still working offline once cached. No-op when R2 is not configured.
"""
import logging
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)

# ai_assets root — weights live under here; R2 keys mirror this layout
_ASSETS_ROOT = Path(__file__).resolve().parents[3] / "ai_assets"


def ensure_local_model(local_path: str) -> str:
    """Return local_path, downloading it from R2 first if missing & configured."""
    p = Path(local_path)
    if p.exists():
        return local_path

    base = getattr(settings, "R2_MODELS_BASE_URL", "")
    if not base:
        return local_path  # nothing we can do; caller handles the missing file

    try:
        key = p.resolve().relative_to(_ASSETS_ROOT).as_posix()
    except ValueError:
        key = p.name
    url = f"{base.rstrip('/')}/{key}"

    try:
        import httpx
        logger.info("Downloading model from R2: %s", url)
        p.parent.mkdir(parents=True, exist_ok=True)
        with httpx.stream("GET", url, timeout=120, follow_redirects=True) as r:
            r.raise_for_status()
            with open(p, "wb") as f:
                for chunk in r.iter_bytes(chunk_size=1 << 20):
                    f.write(chunk)
        logger.info("Model cached locally: %s", local_path)
    except Exception as exc:
        logger.error("R2 model download failed (%s): %s", url, exc)
    return local_path
