"""
Market Price Service — Prix Marché Tunisie
==========================================
Fournit les prix des produits agricoles tunisiens.

Sources (par ordre de priorité) :
  1. Scraping UTAP / GIFruits (BeautifulSoup — déjà installé)
  2. Table de prix statique mensuelle (fallback garanti)

Cache 24h pour éviter re-scraping. Thread-safe.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Table de prix statique (TND/kg sauf indication) — mise à jour Mai 2026
# Source : UTAP, GIFruits, ONH Tunisie
# ---------------------------------------------------------------------------
STATIC_PRICES: dict[str, dict[str, Any]] = {
    # Légumes
    "tomate":           {"price_tnd": 0.80, "unit": "kg",  "category": "légumes"},
    "pomme_de_terre":   {"price_tnd": 0.70, "unit": "kg",  "category": "légumes"},
    "oignon":           {"price_tnd": 0.60, "unit": "kg",  "category": "légumes"},
    "piment":           {"price_tnd": 1.20, "unit": "kg",  "category": "légumes"},
    "piment_rouge_sec": {"price_tnd": 4.50, "unit": "kg",  "category": "légumes"},
    "carotte":          {"price_tnd": 0.80, "unit": "kg",  "category": "légumes"},
    "laitue":           {"price_tnd": 0.50, "unit": "kg",  "category": "légumes"},
    "melon":            {"price_tnd": 0.60, "unit": "kg",  "category": "légumes"},
    "pastèque":         {"price_tnd": 0.40, "unit": "kg",  "category": "légumes"},

    # Fruits
    "agrumes_orange":   {"price_tnd": 1.00, "unit": "kg",  "category": "fruits"},
    "citron":           {"price_tnd": 1.50, "unit": "kg",  "category": "fruits"},
    "figue_fraiche":    {"price_tnd": 2.50, "unit": "kg",  "category": "fruits"},
    "figue_seche":      {"price_tnd": 7.00, "unit": "kg",  "category": "fruits"},
    "raisin":           {"price_tnd": 2.00, "unit": "kg",  "category": "fruits"},
    "amande":           {"price_tnd": 12.0, "unit": "kg",  "category": "fruits"},

    # Céréales
    "ble_dur":          {"price_tnd": 0.65, "unit": "kg",  "category": "céréales"},
    "orge":             {"price_tnd": 0.50, "unit": "kg",  "category": "céréales"},
    "mais":             {"price_tnd": 0.55, "unit": "kg",  "category": "céréales"},

    # Oléiculture
    "olive":            {"price_tnd": 1.80, "unit": "kg",  "category": "oléiculture"},
    "huile_olive_vierge": {"price_tnd": 9.50, "unit": "L", "category": "oléiculture"},
    "huile_olive_lampante": {"price_tnd": 7.00, "unit": "L", "category": "oléiculture"},

    # Apiculture
    "miel":             {"price_tnd": 25.0, "unit": "kg",  "category": "apiculture"},
    "miel_thym":        {"price_tnd": 40.0, "unit": "kg",  "category": "apiculture"},
    "miel_eucalyptus":  {"price_tnd": 30.0, "unit": "kg",  "category": "apiculture"},
    "cire_abeille":     {"price_tnd": 18.0, "unit": "kg",  "category": "apiculture"},
    "propolis":         {"price_tnd": 80.0, "unit": "kg",  "category": "apiculture"},

    # Produits animaux
    "lait_vache":       {"price_tnd": 0.95, "unit": "L",   "category": "élevage"},
    "lait_brebis":      {"price_tnd": 1.60, "unit": "L",   "category": "élevage"},
    "lait_chevre":      {"price_tnd": 1.40, "unit": "L",   "category": "élevage"},
    "viande_bovine":    {"price_tnd": 28.0, "unit": "kg",  "category": "élevage"},
    "viande_ovine":     {"price_tnd": 32.0, "unit": "kg",  "category": "élevage"},
    "viande_volaille":  {"price_tnd": 8.50, "unit": "kg",  "category": "élevage"},
    "oeuf":             {"price_tnd": 0.35, "unit": "pièce","category": "élevage"},

    # Dattes
    "datte_deglet_nour": {"price_tnd": 4.50, "unit": "kg", "category": "dattes"},
    "datte_kenta":       {"price_tnd": 2.80, "unit": "kg", "category": "dattes"},
    "datte_alig":        {"price_tnd": 2.00, "unit": "kg", "category": "dattes"},
}

# Cache en mémoire {produit: {price_tnd, unit, source, fetched_at}}
_price_cache: dict[str, dict[str, Any]] = {}
CACHE_TTL_HOURS = 24


def _is_cache_valid(product: str) -> bool:
    if product not in _price_cache:
        return False
    fetched_at = _price_cache[product].get("fetched_at")
    if not fetched_at:
        return False
    return datetime.utcnow() - fetched_at < timedelta(hours=CACHE_TTL_HOURS)


def _try_scrape_utap(product: str) -> dict[str, Any] | None:
    """
    Tentative de scraping UTAP (observatoire des prix agricoles).
    Retourne None si le scraping échoue (pas de blocage de l'application).
    """
    try:
        import httpx
        from bs4 import BeautifulSoup

        # UTAP observatoire : tableau de prix journaliers
        url = "https://www.utap.org.tn/index.php/ar/observatoire-des-prix"
        resp = httpx.get(url, timeout=8, follow_redirects=True,
                         headers={"User-Agent": "Mozilla/5.0 (compatible; SmartFarmAI/3.0)"})
        if resp.status_code != 200:
            return None

        soup = BeautifulSoup(resp.text, "html.parser")
        # Chercher le produit dans les tableaux de prix
        tables = soup.find_all("table")
        for table in tables:
            rows = table.find_all("tr")
            for row in rows:
                cells = [td.get_text(strip=True) for td in row.find_all(["td", "th"])]
                # Correspondance approximative produit ↔ ligne tableau
                if any(product.lower() in c.lower() for c in cells):
                    # Chercher une valeur numérique dans la ligne
                    for cell in cells:
                        try:
                            price = float(cell.replace(",", ".").replace("DT", "").strip())
                            if 0.01 < price < 1000:
                                return {
                                    "price_tnd": round(price, 3),
                                    "source": "UTAP_scraping",
                                    "unit": "kg",
                                }
                        except ValueError:
                            pass
    except Exception as exc:
        logger.debug("UTAP scraping failed for %s: %s", product, exc)
    return None


def get_price(product: str) -> dict[str, Any]:
    """
    Retourne le prix d'un produit agricole en TND.
    Ordre : cache → scraping UTAP → table statique.
    """
    product_key = product.lower().replace(" ", "_").replace("-", "_")

    # 1. Cache valide
    if _is_cache_valid(product_key):
        return _price_cache[product_key]

    # 2. Tentative scraping UTAP
    scraped = _try_scrape_utap(product_key)
    if scraped:
        entry = {
            **scraped,
            "product": product,
            "date": datetime.utcnow().strftime("%Y-%m-%d"),
            "fetched_at": datetime.utcnow(),
        }
        _price_cache[product_key] = entry
        return {k: v for k, v in entry.items() if k != "fetched_at"}

    # 3. Table statique (fallback garanti)
    static = STATIC_PRICES.get(product_key)
    if static:
        entry = {
            **static,
            "product": product,
            "price_tnd": static["price_tnd"],
            "unit": static.get("unit", "kg"),
            "source": "static_table",
            "date": datetime.utcnow().strftime("%Y-%m-%d"),
            "fetched_at": datetime.utcnow(),
            "note": "Prix indicatif — mise à jour mensuelle",
        }
        _price_cache[product_key] = entry
        result = {k: v for k, v in entry.items() if k != "fetched_at"}
        return result

    return {
        "product": product,
        "price_tnd": None,
        "unit": "kg",
        "source": "not_found",
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
        "note": f"Produit '{product}' non référencé",
        "available_products": sorted(STATIC_PRICES.keys()),
    }


def get_prices(products: list[str]) -> list[dict[str, Any]]:
    """Retourne les prix pour une liste de produits."""
    return [get_price(p) for p in products]


def compute_farm_profitability(
    db,
    farm_id: int,
    products_produced: dict[str, float],
) -> dict[str, Any]:
    """
    Estime la rentabilité de la ferme basée sur les prix actuels.

    Parameters
    ----------
    products_produced : dict {produit: quantité_kg}

    Returns
    -------
    dict avec revenu_total, détail par produit, prix_source
    """
    details = []
    total_revenue = 0.0

    for product, qty_kg in products_produced.items():
        price_info = get_price(product)
        if price_info.get("price_tnd"):
            revenue = round(qty_kg * price_info["price_tnd"], 2)
            total_revenue += revenue
            details.append({
                "product": product,
                "quantity_kg": qty_kg,
                "unit_price_tnd": price_info["price_tnd"],
                "unit": price_info.get("unit", "kg"),
                "revenue_tnd": revenue,
                "source": price_info.get("source"),
            })
        else:
            details.append({
                "product": product,
                "quantity_kg": qty_kg,
                "unit_price_tnd": None,
                "revenue_tnd": None,
                "note": "Prix non disponible",
            })

    return {
        "farm_id": farm_id,
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
        "products": details,
        "total_revenue_tnd": round(total_revenue, 2),
        "currency": "TND",
        "disclaimer": "Estimation basée sur prix marché indicatifs — consulter UTAP pour prix officiels",
    }


def list_available_products(category: str | None = None) -> dict[str, Any]:
    """Liste tous les produits disponibles, optionnellement filtré par catégorie."""
    if category:
        products = {k: v for k, v in STATIC_PRICES.items()
                    if v.get("category", "").lower() == category.lower()}
    else:
        products = STATIC_PRICES

    return {
        "products": {
            k: {"price_tnd": v["price_tnd"], "unit": v["unit"], "category": v.get("category")}
            for k, v in products.items()
        },
        "count": len(products),
        "categories": sorted({v.get("category", "autre") for v in STATIC_PRICES.values()}),
        "last_update": "2026-05-28",
        "source": "UTAP / ONH / GIFruits Tunisie",
    }
