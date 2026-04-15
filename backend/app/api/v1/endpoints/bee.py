from fastapi import APIRouter, Query, HTTPException
from duckduckgo_search import DDGS
import logging

router = APIRouter(tags=["Bee Management"])
logger = logging.getLogger(__name__)

# Mappage exhaustif basé sur les catégories officielles de apiculture-haddad.com
# Cela permet de transformer une demande stock en une requête site ultra-précise
HADDAD_CATEGORIES = {
    "bois": "site:apiculture-haddad.com Bois Ruches Cadres",
    "tenues de travail": "site:apiculture-haddad.com Tenues travail combinaison voile",
    "cire d'abeille": "site:apiculture-haddad.com Cire d'abeille gaufres",
    "nourisseurs et nourissement": "site:apiculture-haddad.com Nourisseurs et nourissement sirop pâte",
    "enfumoirs": "site:apiculture-haddad.com Enfumoirs",
    "lève cadres, brosses et herses": "site:apiculture-haddad.com Lève Cadres brosses herses",
    "extracteurs, maturateurs et tamis": "site:apiculture-haddad.com Extracteurs maturateurs tamis",
    "matériel d'élevage": "site:apiculture-haddad.com Matériel d'élevage reines",
    "grilles à reine, grilles à prpolis et trappes à pollen": "site:apiculture-haddad.com Grilles reine propolis trappes pollen",
    "fil de fer, portières et robinets": "site:apiculture-haddad.com Fil de fer portières robinets",
    "anti-varroa et charmes d'abeilles": "site:apiculture-haddad.com Anti-varroa charmes d'abeilles",
    "produits divers": "site:apiculture-haddad.com Produits divers",
    "produits de la ruche et emballages": "site:apiculture-haddad.com Produits ruche emballages pots",
    "matériel en promo": "site:apiculture-haddad.com Matériel en promo"
}

# Lien entre les IDs de l'app et les catégories Haddad
APP_TO_HADDAD = {
    "sirop": "nourisseurs et nourissement",
    "pate": "nourisseurs et nourissement",
    "traitement": "anti-varroa et charmes d'abeilles",
    "cadres": "bois"
}

@router.get("/search")
async def search_bee_supplies(q: str = Query(..., description="Terme de recherche")):
    query_key = q.lower().strip()
    
    # On cherche si on a un mappage direct ou si on utilise la query brute
    category_id = APP_TO_HADDAD.get(query_key, query_key)
    search_query = HADDAD_CATEGORIES.get(category_id, f"site:apiculture-haddad.com {q}")
    
    logger.info(f"Sourcing Haddad avec la catégorie : {category_id}")
    
    try:
        results = []
        with DDGS() as ddgs:
            raw_gen = ddgs.text(search_query, max_results=10)
            raw_results = list(raw_gen) if raw_gen else []
            
            for r in raw_results:
                # On ne garde que Haddad pour être conforme à la demande
                if "apiculture-haddad.com" in r.get("href", ""):
                    results.append({
                        "title": r.get("title").replace(" - APICULTURE HADDAD", ""),
                        "link": r.get("href"),
                        "snippet": r.get("body"),
                        "category": category_id.title(),
                        "source": "Catalog Haddad"
                    })

        return {
            "status": "success",
            "used_keywords": search_query,
            "category": category_id,
            "results": results,
            "all_categories": list(HADDAD_CATEGORIES.keys())
        }

    except Exception as e:
        logger.error(f"Sourcing Error: {str(e)}")
        return {
            "status": "error",
            "results": [],
            "error_msg": str(e)
        }
