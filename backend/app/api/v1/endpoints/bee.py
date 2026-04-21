from fastapi import APIRouter, Query
import requests
from bs4 import BeautifulSoup
import logging
import time
import re

router = APIRouter(tags=["Bee Management"])
logger = logging.getLogger(__name__)

HADDAD_BASE = "https://apiculture-haddad.com"
BOUTIQUE_URL = f"{HADDAD_BASE}/boutique/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
}

# Slugs WooCommerce exacts découverts directement sur apiculture-haddad.com
# Format: clé_interne → (slug_woocommerce, label_fr)
HADDAD_CATEGORIES = {
    "bois": ("bois", "Bois, Ruches & Cadres"),
    "tenues de travail": ("tenues-de-travail", "Tenues de Travail"),
    "cire d'abeille": ("cire-abeille", "Cire d'Abeille"),
    "nourisseurs et nourissement": ("nourisseurs-et-nourissemenet", "Nourisseurs & Nourrissement"),
    "enfumoirs": ("enfumoirs", "Enfumoirs"),
    "lève cadres, brosses et herses": ("leve-cadres-brosses-herses", "Lève Cadres, Brosses & Herses"),
    "extracteurs, maturateurs et tamis": ("extracteurs-maturateurs-et-tamis", "Extracteurs, Maturateurs & Tamis"),
    "matériel d'élevage": ("materiel-elevage", "Matériel d'Élevage"),
    "grilles à reine, grilles à propolis et trappes à pollen": (
        "grilles-a-reine-grilles-a-prpolis-et-trappes-a-pollen",
        "Grilles à Reine & Trappes à Pollen",
    ),
    "fil de fer, portières et robinets": ("fil-de-fer-portieres-et-robinets", "Fil de Fer, Portières & Robinets"),
    "anti-varroa et charmes d'abeilles": ("anti-varroa-charmes-abeilles", "Anti-Varroa & Traitements"),
    "produits divers": ("produits-divers", "Produits Divers"),
    "produits de la ruche et emballages": ("produits-de-la-ruche-et-emballages", "Produits de la Ruche & Emballages"),
    "matériel en promo": ("materiel-en-promo", "Matériel en Promo"),
}

# Mapping depuis les IDs stock de l'application
APP_TO_HADDAD = {
    "sirop": "nourisseurs et nourissement",
    "pate": "nourisseurs et nourissement",
    "traitement": "anti-varroa et charmes d'abeilles",
    "cadres": "bois",
    "materiel apicole": "bois",
    "matériel apicole": "bois",
}

# Cache mémoire: {category_key: (timestamp, results)}
_cache: dict = {}
CACHE_TTL = 3600  # 1 heure


def _format_price(raw: str) -> str:
    """Normalise le prix : 'د.ت3,00' → '3,00 DT'."""
    if not raw:
        return "Prix sur demande"
    cleaned = raw.strip()
    # Remplacer le symbole arabe du dinar tunisien
    cleaned = re.sub(r'[دتن]\.ت', '', cleaned)
    cleaned = re.sub(r'[؀-ۿ]+', '', cleaned)
    cleaned = cleaned.strip()
    if re.search(r'\d', cleaned):
        return cleaned + " DT" if "DT" not in cleaned and "TND" not in cleaned else cleaned
    return "Prix sur demande"


def scrape_woo_category(slug: str, label: str) -> list:
    """Scrape les produits WooCommerce d'une catégorie via ?product_cat=slug."""
    url = f"{BOUTIQUE_URL}?product_cat={slug}"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=14)
        if resp.status_code != 200:
            logger.warning(f"HTTP {resp.status_code} pour {url}")
            return []

        soup = BeautifulSoup(resp.text, "html.parser")
        items = soup.select("li.product")
        if not items:
            return []

        products = []
        for li in items:
            # Lien & titre
            link_el = li.select_one("a.woocommerce-loop-product__link") or li.select_one("a[href*='/product/']")
            title_el = (
                li.select_one(".woocommerce-loop-product__title")
                or li.select_one("h2")
                or li.select_one("h3")
            )
            if not title_el:
                continue

            title = title_el.get_text(strip=True)
            link = link_el["href"] if link_el else url
            if not link.startswith("http"):
                link = HADDAD_BASE + link

            # Image (priorité : src haute résolution via srcset)
            img_el = li.select_one(".attachment-woocommerce_thumbnail") or li.select_one("img")
            image = ""
            if img_el:
                # Prendre la plus grande image depuis srcset si disponible
                srcset = img_el.get("srcset", "")
                if srcset:
                    parts = [p.strip() for p in srcset.split(",") if p.strip()]
                    # Dernière entrée = plus grande résolution
                    image = parts[-1].split()[0] if parts else ""
                if not image:
                    image = img_el.get("src", "")

            # Prix
            price_el = li.select_one(".price")
            price = _format_price(price_el.get_text(strip=True) if price_el else "")

            # Description courte (absente dans le listing — on utilise un texte basé sur la catégorie)
            snippet = f"Produit apicole — {label}. Disponible chez Apiculture Haddad, Grombalia."

            products.append({
                "title": title,
                "price": price,
                "image": image,
                "link": link,
                "snippet": snippet,
                "category": label,
                "source": "Catalog Haddad",
            })

        return products

    except Exception as e:
        logger.error(f"Erreur scraping {url}: {e}")
        return []


@router.get("/search")
async def search_bee_supplies(q: str = Query(..., description="Catégorie ou terme de recherche")):
    query_key = q.lower().strip()
    category_key = APP_TO_HADDAD.get(query_key, query_key)
    category_info = HADDAD_CATEGORIES.get(category_key)

    if category_info:
        slug, label = category_info
    else:
        # Recherche par approximation (mots-clés partiels)
        for key, (sl, lb) in HADDAD_CATEGORIES.items():
            if any(word in key for word in query_key.split() if len(word) > 3):
                category_key, slug, label = key, sl, lb
                break
        else:
            slug = "bois"
            label = "Bois, Ruches & Cadres"
            category_key = "bois"

    # Vérifier le cache
    cached = _cache.get(category_key)
    if cached:
        ts, cached_results = cached
        if time.time() - ts < CACHE_TTL and cached_results:
            logger.info(f"Cache hit: {category_key}")
            return {
                "status": "cached",
                "category": category_key,
                "category_label": label,
                "results": cached_results,
                "all_categories": list(HADDAD_CATEGORIES.keys()),
                "all_categories_info": {k: v[1] for k, v in HADDAD_CATEGORIES.items()},
            }

    logger.info(f"Scraping Haddad WooCommerce → catégorie: {category_key} / slug: {slug}")
    results = scrape_woo_category(slug, label)

    if results:
        _cache[category_key] = (time.time(), results)

    return {
        "status": "success" if results else "empty",
        "category": category_key,
        "category_label": label,
        "results": results,
        "all_categories": list(HADDAD_CATEGORIES.keys()),
        "all_categories_info": {k: v[1] for k, v in HADDAD_CATEGORIES.items()},
    }


@router.delete("/cache")
async def clear_cache():
    """Vide le cache du catalogue."""
    _cache.clear()
    return {"status": "ok", "message": "Cache vidé"}
