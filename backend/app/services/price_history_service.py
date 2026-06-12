"""
Price History Service — historique et prévision des prix agricoles
===================================================================
Construit un historique de prix RÉEL jour après jour (snapshot quotidien par
le job APScheduler n°7) puis prévoit les prix par SARIMA/Prophet dès que
l'historique est suffisant.

Politique « pas de fausses données » :
  - On n'invente JAMAIS d'historique rétroactif.
  - Tant que < MIN_POINTS observations : la prévision renvoie explicitement
    `insufficient_history` avec le nombre de points collectés.

Source des snapshots : market_price_service.get_prices (table UTAP/GIFruits
actuelle ; remplaçable par un scraper ONAGRI/SIMAB quand une source
structurée sera disponible — le site ONAGRI ne publie que des PDF/JS).

Stockage : backend/app/data/price_history.json
  {product: [{"date": "YYYY-MM-DD", "price_tnd": float}, …]}
"""

from __future__ import annotations

import json
import logging
import threading
from datetime import date
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

HISTORY_PATH = Path(__file__).resolve().parents[1] / "data" / "price_history.json"
MIN_POINTS = 14          # observations minimales avant de prévoir
_LOCK = threading.Lock()

TRACKED_PRODUCTS = [
    "tomate", "pomme_de_terre", "oignon", "piment",
    "agrumes_orange", "citron", "olive", "huile_olive_vierge",
    "ble_dur", "orge", "miel", "lait_vache", "viande_ovine",
    "viande_volaille", "oeuf",
]


def _load() -> dict[str, list[dict]]:
    try:
        return json.loads(HISTORY_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _save(data: dict) -> None:
    HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    HISTORY_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")


def snapshot_daily_prices() -> dict[str, Any]:
    """Enregistre le prix du jour de chaque produit suivi (idempotent par date).
    Appelé par le job scheduler n°7 chaque jour à 5 h."""
    from app.services.market_price_service import get_prices

    today = date.today().isoformat()
    prices = get_prices(TRACKED_PRODUCTS)   # liste de dicts {product, price_tnd, source…}

    with _LOCK:
        history = _load()
        added = 0
        for info in prices:
            product = (info.get("product") or "").lower().replace(" ", "_")
            price = info.get("price_tnd")
            if not product or price is None:
                continue
            series = history.setdefault(product, [])
            if series and series[-1]["date"] == today:
                continue                      # déjà enregistré aujourd'hui
            series.append({"date": today, "price_tnd": float(price),
                           "source": info.get("source", "static")})
            added += 1
        _save(history)

    logger.info("Snapshot prix : %d produit(s) ajoutés pour %s", added, today)
    return {"date": today, "products_added": added}


def get_price_history(product: str) -> dict[str, Any]:
    history = _load().get(product, [])
    return {"product": product, "points": len(history), "history": history}


def forecast_price(product: str, horizon_days: int = 14) -> dict[str, Any]:
    """Prévision SARIMA/Prophet (avec intervalles conformes) sur l'historique
    réellement collecté. Refuse honnêtement si l'historique est insuffisant."""
    history = _load().get(product, [])
    if len(history) < MIN_POINTS:
        return {
            "product": product,
            "status": "insufficient_history",
            "points_collected": len(history),
            "points_required": MIN_POINTS,
            "message": (
                f"Historique insuffisant ({len(history)}/{MIN_POINTS} jours). "
                "La collecte quotidienne est automatique (job n°7) — "
                "la prévision s'activera d'elle-même."
            ),
        }

    from app.services.forecasting_service import forecast_telemetry

    records = [{"timestamp": h["date"], "metrics": {"price": h["price_tnd"]}}
               for h in history]
    result = forecast_telemetry(records, "price", horizon_days=horizon_days)
    result["product"] = product
    result["status"] = "ok"
    result["points_used"] = len(history)
    return result
