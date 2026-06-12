"""
Agro-Climate Service — Phénologie par degrés-jours (GDD) + risque maladies
==========================================================================
Remplace la phénologie « mois fixes » par un modèle piloté par la donnée :

  1. GDD (Growing Degree Days) : cumul depuis le 1er janvier des degrés-jours
     (méthode moyenne plafonnée : ((Tmax+Tmin)/2 - Tbase), bornée à [0, Tmax_cap]).
     Source météo : API Open-Meteo Archive (ERA5, gratuite, sans clé) complétée
     par l'API Forecast (past_days) pour les ~5 derniers jours non archivés.

  2. Indices de risque maladie météo-pilotés (littérature agronomique) :
     - Mildiou (tomate/pomme de terre/vigne) : règle « 3-10 » de Goidanich
       simplifiée — ≥10 mm de pluie cumulée sur 3 j ET Tmin ≥ 10 °C.
     - Œil de paon (olivier) : pluie + température 12–20 °C (automne/printemps).
     - Oïdium (vigne/melon) : T 20–27 °C, faible pluie, humidité élevée.
     - Mouche de l'olive (Bactrocera oleae) : générations par cumul de DJ
       (base 10 °C, ~1350 DJ pour pic d'activité estival), modéré par canicule.
     - Rouille brune (blé) : T 15–22 °C + humidité/pluie en mars-avril.

Références : FAO Irrigation & Drainage 56, modèles SOPHY/Goidanich,
bulletin phytosanitaire AVFA/CRDA Tunisie.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Any, Optional

import httpx

from app.core.cache import cache_get, cache_set

logger = logging.getLogger(__name__)

ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
DAILY_VARS = "temperature_2m_max,temperature_2m_min,precipitation_sum"

# ---------------------------------------------------------------------------
# Seuils phénologiques GDD par culture
# Format : {culture: {"base": Tbase °C, "cap": plafond °C,
#                     "stades": [(seuil_GDD, stade, action)]}}
# Cumul depuis le 1er janvier (biofix hiver, standard zone méditerranéenne).
# ---------------------------------------------------------------------------
GDD_PHENOLOGY: dict[str, dict[str, Any]] = {
    "olivier": {
        "base": 10.0, "cap": 35.0,
        "stades": [
            (150,  "debourrement",      "Reprise végétative — fin de taille impérative"),
            (450,  "floraison",         "Pleine fleur — AUCUN traitement insecticide (pollinisateurs)"),
            (650,  "nouaison",          "Nouaison — traitement teigne si seuil dépassé"),
            (1350, "durcissement_noyau","Durcissement noyau — poser pièges mouche de l'olive"),
            (2200, "veraison",          "Véraison — surveiller dacus, préparer récolte"),
            (2800, "maturite",          "Maturité huile — récolte optimale 30-40 % fruits violacés"),
        ],
    },
    "vigne": {
        "base": 10.0, "cap": 35.0,
        "stades": [
            (100,  "debourrement", "Débourrement — 1er traitement cuivre anti-mildiou"),
            (380,  "floraison",    "Floraison — protection mildiou/oïdium critique"),
            (700,  "nouaison",     "Nouaison — ébourgeonnage, palissage"),
            (1200, "veraison",     "Véraison — arrêt traitements (délai avant récolte)"),
            (1600, "maturite",     "Maturité — vendanges selon degré Brix (≥20° rouge)"),
        ],
    },
    "agrumes": {
        "base": 12.8, "cap": 35.0,
        "stades": [
            (150,  "debourrement", "Pousse de printemps — fertilisation azotée"),
            (300,  "floraison",    "Fleur d'oranger — suspendre l'irrigation"),
            (550,  "nouaison",     "Nouaison — éclaircissage si surcharge"),
            (1400, "grossissement","Grossissement fruits — irrigation régulière + potasse"),
            (2400, "maturite",     "Maturité — récolte selon variété (Maltaise Jan-Fév)"),
        ],
    },
    "tomate": {
        "base": 10.0, "cap": 30.0,
        "stades": [
            (90,   "levee",     "Levée / reprise plants"),
            (350,  "floraison", "Floraison — fertilisation potassique, surveiller botrytis"),
            (700,  "nouaison",  "Nouaison — irrigation régulière, surveiller mildiou"),
            (1150, "maturite",  "Maturité — récolte progressive"),
        ],
    },
    "ble_dur": {
        "base": 0.0, "cap": 30.0,
        "stades": [
            (500,  "tallage",  "Tallage — désherbage + azote fractionné"),
            (1000, "montaison","Montaison — 2e apport azoté"),
            (1450, "epiaison", "Épiaison — fongicide si rouille détectée"),
            (2000, "maturite", "Maturité grain — moisson à humidité <14 %"),
        ],
    },
    "amandier": {
        "base": 4.5, "cap": 30.0,
        "stades": [
            (120,  "floraison", "Floraison très précoce — risque gel, traiter moniliose"),
            (400,  "nouaison",  "Nouaison — traitement anarsia/tordeuse"),
            (1800, "maturite",  "Ouverture du brou — récolte"),
        ],
    },
}

# Cumul DJ (base 10) déclenchant les pics de génération de la mouche de l'olive
OLIVE_FLY_GDD_PEAK = 1350.0


# ---------------------------------------------------------------------------
# Météo journalière (archive ERA5 + forecast récent), avec cache 6 h
# ---------------------------------------------------------------------------

async def fetch_daily_weather(
    lat: float, lon: float,
    start: Optional[date] = None,
    end: Optional[date] = None,
) -> list[dict[str, Any]]:
    """Série journalière {date, tmax, tmin, rain} du 1er janvier à aujourd'hui."""
    today = date.today()
    start = start or date(today.year, 1, 1)
    end = end or today

    key = f"agroclim:daily:{round(lat,2)}:{round(lon,2)}:{start}:{end}"
    hit = cache_get(key)
    if hit is not None:
        return hit

    days: dict[str, dict[str, Any]] = {}
    # L'archive ERA5 a ~5 jours de latence → compléter avec l'API forecast
    archive_end = min(end, today - timedelta(days=6))

    async with httpx.AsyncClient(timeout=15) as client:
        if archive_end >= start:
            try:
                r = await client.get(ARCHIVE_URL, params={
                    "latitude": lat, "longitude": lon,
                    "start_date": start.isoformat(), "end_date": archive_end.isoformat(),
                    "daily": DAILY_VARS, "timezone": "Africa/Tunis",
                })
                d = r.json().get("daily", {})
                for i, ds in enumerate(d.get("time", [])):
                    days[ds] = {
                        "date": ds,
                        "tmax": d["temperature_2m_max"][i],
                        "tmin": d["temperature_2m_min"][i],
                        "rain": d["precipitation_sum"][i],
                    }
            except Exception as exc:
                logger.warning("Open-Meteo archive failed: %s", exc)

        # L'API forecast renvoie parfois un 502 transitoire → 2 tentatives
        for attempt in (1, 2):
            try:
                r = await client.get(FORECAST_URL, params={
                    "latitude": lat, "longitude": lon,
                    "past_days": 7, "forecast_days": 1,
                    "daily": DAILY_VARS, "timezone": "Africa/Tunis",
                })
                r.raise_for_status()
                d = r.json().get("daily", {})
                for i, ds in enumerate(d.get("time", [])):
                    if ds not in days and start.isoformat() <= ds <= end.isoformat():
                        days[ds] = {
                            "date": ds,
                            "tmax": d["temperature_2m_max"][i],
                            "tmin": d["temperature_2m_min"][i],
                            "rain": d["precipitation_sum"][i],
                        }
                break
            except Exception as exc:
                logger.warning("Open-Meteo forecast attempt %d failed: %r", attempt, exc)

    series = [days[k] for k in sorted(days) if days[k]["tmax"] is not None]
    if series:
        cache_set(key, series, ttl=6 * 3600)
    return series


# ---------------------------------------------------------------------------
# GDD
# ---------------------------------------------------------------------------

def compute_gdd_series(daily: list[dict], base: float, cap: float = 35.0) -> list[dict]:
    """Cumul GDD (méthode moyenne plafonnée)."""
    cum = 0.0
    out = []
    for d in daily:
        tmax = min(d["tmax"], cap)
        tmin = max(d["tmin"], base)  # variante plafonnée simple
        gdd = max(0.0, (tmax + tmin) / 2.0 - base)
        cum += gdd
        out.append({"date": d["date"], "gdd": round(gdd, 1), "gdd_cum": round(cum, 1)})
    return out


def predict_stage(crop: str, gdd_cum: float) -> dict[str, Any]:
    """Stade phénologique atteint + progression vers le suivant."""
    cfg = GDD_PHENOLOGY.get(crop)
    if not cfg:
        return {"error": f"Culture '{crop}' sans modèle GDD",
                "available": sorted(GDD_PHENOLOGY.keys())}

    stages = cfg["stades"]
    current = None
    nxt = None
    for threshold, stade, action in stages:
        if gdd_cum >= threshold:
            current = {"stade": stade, "seuil_gdd": threshold, "action": action}
        elif nxt is None:
            nxt = {"stade": stade, "seuil_gdd": threshold, "action": action,
                   "gdd_restants": round(threshold - gdd_cum, 1)}

    progress = None
    if nxt:
        prev_thr = current["seuil_gdd"] if current else 0
        span = nxt["seuil_gdd"] - prev_thr
        progress = round(100 * (gdd_cum - prev_thr) / span, 1) if span > 0 else 0

    return {
        "culture": crop,
        "t_base": cfg["base"],
        "gdd_cum": round(gdd_cum, 1),
        "stade_actuel": current or {"stade": "dormance", "action": "Repos végétatif"},
        "stade_suivant": nxt,
        "progression_pct": progress,
    }


async def get_farm_gdd(lat: float, lon: float, crop: str) -> dict[str, Any]:
    """GDD cumulé de la ferme + stade prédit pour une culture."""
    cfg = GDD_PHENOLOGY.get(crop)
    if not cfg:
        return {"error": f"Culture '{crop}' sans modèle GDD",
                "available": sorted(GDD_PHENOLOGY.keys())}
    daily = await fetch_daily_weather(lat, lon)
    if not daily:
        return {"error": "Météo indisponible"}
    series = compute_gdd_series(daily, base=cfg["base"], cap=cfg["cap"])
    pred = predict_stage(crop, series[-1]["gdd_cum"])
    pred["series"] = series[-90:]          # 90 derniers jours pour le graphe
    pred["since"] = daily[0]["date"]
    pred["last_weather_date"] = daily[-1]["date"]
    return pred


# ---------------------------------------------------------------------------
# Indices de risque maladie
# ---------------------------------------------------------------------------

def _level(score: float) -> str:
    if score >= 75:
        return "critical"
    if score >= 50:
        return "high"
    if score >= 25:
        return "moderate"
    return "low"


def compute_disease_risks(daily: list[dict]) -> list[dict[str, Any]]:
    """Indices 0–100 calculés sur la météo des 7 derniers jours + GDD saison."""
    if len(daily) < 7:
        return []
    last7 = daily[-7:]
    last3 = daily[-3:]
    rain7 = sum(d["rain"] or 0 for d in last7)
    rain3 = sum(d["rain"] or 0 for d in last3)
    tmin3 = min(d["tmin"] for d in last3)
    tmean7 = sum((d["tmax"] + d["tmin"]) / 2 for d in last7) / 7
    month = int(daily[-1]["date"][5:7])

    gdd10 = compute_gdd_series(daily, base=10.0)[-1]["gdd_cum"]

    risks: list[dict[str, Any]] = []

    # 1) Mildiou — règle 3-10 (Goidanich simplifiée)
    mildiou = 0.0
    if rain3 >= 10 and tmin3 >= 10:
        mildiou = min(100.0, 60 + rain3)             # infection primaire probable
    elif rain7 >= 10 and tmean7 >= 12:
        mildiou = min(60.0, 25 + rain7)
    risks.append({
        "maladie": "Mildiou", "pathogene": "Phytophthora / Plasmopara",
        "cultures": ["tomate", "pomme_de_terre", "vigne"],
        "score": round(mildiou), "niveau": _level(mildiou),
        "justification": f"Pluie 3j = {rain3:.0f} mm, Tmin 3j = {tmin3:.1f} °C (règle 3-10)",
        "recommandation": "Fongicide préventif (mancozèbe/cuivre) AVANT la prochaine pluie"
                          if mildiou >= 50 else "Surveillance — pas de traitement nécessaire",
    })

    # 2) Œil de paon (olivier) — pluie + 12-20 °C, surtout automne/printemps
    oeil = 0.0
    if rain7 >= 5 and 12 <= tmean7 <= 20:
        oeil = min(100.0, 40 + rain7 * 2)
        if month in (10, 11, 3, 4):
            oeil = min(100.0, oeil + 15)
    risks.append({
        "maladie": "Œil de paon", "pathogene": "Venturia oleaginea",
        "cultures": ["olivier"],
        "score": round(oeil), "niveau": _level(oeil),
        "justification": f"Pluie 7j = {rain7:.0f} mm, Tmoy 7j = {tmean7:.1f} °C",
        "recommandation": "Bouillie bordelaise sur feuillage sec"
                          if oeil >= 50 else "Surveillance des feuilles tachées",
    })

    # 3) Oïdium — chaud-sec avec rosée (20-27 °C, peu de pluie)
    oidium = 0.0
    if 20 <= tmean7 <= 27 and rain7 < 5:
        oidium = 55.0
        if month in (5, 6):
            oidium += 15
    risks.append({
        "maladie": "Oïdium", "pathogene": "Erysiphe / Uncinula necator",
        "cultures": ["vigne", "melon", "tomate"],
        "score": round(oidium), "niveau": _level(oidium),
        "justification": f"Tmoy 7j = {tmean7:.1f} °C, pluie 7j = {rain7:.0f} mm (climat chaud-sec)",
        "recommandation": "Soufre poudrage tôt le matin"
                          if oidium >= 50 else "Pas de conditions favorables",
    })

    # 4) Mouche de l'olive — générations par cumul DJ base 10
    fly = 0.0
    if gdd10 >= OLIVE_FLY_GDD_PEAK:
        fly = 70.0
        if tmean7 > 32:               # canicule = mortalité larvaire
            fly -= 30
        if month in (9, 10):          # pic automnal sur fruits réceptifs
            fly += 20
    elif gdd10 >= 0.7 * OLIVE_FLY_GDD_PEAK:
        fly = 35.0
    fly = max(0.0, min(100.0, fly))
    risks.append({
        "maladie": "Mouche de l'olive", "pathogene": "Bactrocera oleae",
        "cultures": ["olivier"],
        "score": round(fly), "niveau": _level(fly),
        "justification": f"Cumul {gdd10:.0f} DJ (base 10) / seuil pic {OLIVE_FLY_GDD_PEAK:.0f} DJ",
        "recommandation": "Pièges à phéromone + contrôle hebdo des piqûres"
                          if fly >= 50 else "Poser les pièges de monitoring",
    })

    # 5) Rouille brune (blé) — 15-22 °C humide en fin d'hiver / printemps
    rouille = 0.0
    if month in (2, 3, 4) and 15 <= tmean7 <= 22 and rain7 >= 5:
        rouille = min(100.0, 50 + rain7)
    risks.append({
        "maladie": "Rouille brune", "pathogene": "Puccinia triticina",
        "cultures": ["ble_dur", "orge"],
        "score": round(rouille), "niveau": _level(rouille),
        "justification": f"Mois {month}, Tmoy 7j = {tmean7:.1f} °C, pluie 7j = {rain7:.0f} mm",
        "recommandation": "Fongicide triazole dès pustules visibles"
                          if rouille >= 50 else "Hors fenêtre de risque",
    })

    return sorted(risks, key=lambda r: -r["score"])


async def get_farm_disease_risks(lat: float, lon: float) -> dict[str, Any]:
    daily = await fetch_daily_weather(lat, lon)
    if not daily:
        return {"error": "Météo indisponible", "risks": []}
    return {
        "last_weather_date": daily[-1]["date"],
        "risks": compute_disease_risks(daily),
    }
