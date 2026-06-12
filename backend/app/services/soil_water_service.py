"""
Soil Water Service — Bilan hydrique par parcelle (SoilGrids + ERA5 + FAO-56)
=============================================================================
Ferme la boucle sol-climat-culture :

  1. Propriétés du sol par coordonnées via l'API REST **SoilGrids** (ISRIC,
     gratuite, sans clé) : sable/argile/limon à 0-30 cm.
  2. Réserve utile (RU) estimée par fonctions de pédotransfert Saxton & Rawls
     (2006) simplifiées : capacité au champ − point de flétrissement.
  3. Bilan hydrique journalier sur 30 jours (pluie ERA5 − ETc) :
       stock_t = clip(stock_{t-1} + pluie_t − ETc_t, 0, RU_zone)
     ETc = Kc(culture) × ET₀ Hargreaves (Tmin/Tmax, latitude).
  4. Recommandation d'irrigation : déclenchement quand l'épuisement dépasse
     la RFU (réserve facilement utilisable, p = 0,5 — FAO-56), dose en mm
     et m³/ha, jours d'autonomie restants.

Sources météo réutilisées : agro_climate_service.fetch_daily_weather (cache 6 h).
"""

from __future__ import annotations

import logging
import math
from datetime import date
from typing import Any, Optional

import httpx

from app.core.cache import cache_get, cache_set
from app.services.agro_climate_service import fetch_daily_weather

logger = logging.getLogger(__name__)

SOILGRIDS_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query"

# Profondeur racinaire effective (m) et Kc mi-saison par culture (FAO-56)
CROP_PARAMS: dict[str, dict[str, float]] = {
    "olivier":        {"root_depth_m": 1.2, "kc": 0.70, "p": 0.65},
    "agrumes":        {"root_depth_m": 1.0, "kc": 0.70, "p": 0.50},
    "vigne":          {"root_depth_m": 1.0, "kc": 0.70, "p": 0.45},
    "tomate":         {"root_depth_m": 0.7, "kc": 1.15, "p": 0.40},
    "pomme_de_terre": {"root_depth_m": 0.5, "kc": 1.15, "p": 0.35},
    "ble_dur":        {"root_depth_m": 1.0, "kc": 1.15, "p": 0.55},
    "amandier":       {"root_depth_m": 1.2, "kc": 0.90, "p": 0.40},
}


# ---------------------------------------------------------------------------
# SoilGrids + pédotransfert
# ---------------------------------------------------------------------------

async def fetch_soil_properties(lat: float, lon: float) -> Optional[dict[str, float]]:
    """Sable/argile/limon (%) à 0-30 cm — moyenne pondérée des couches ISRIC.
    La grille 250 m a des trous (zones urbaines/côtières) → on tente aussi
    4 pixels voisins (~±1 km) avant d'abandonner."""
    key = f"soilgrids:{round(lat, 3)}:{round(lon, 3)}"
    hit = cache_get(key)
    if hit is not None:
        return hit

    for dlat, dlon in ((0, 0), (0.01, 0), (-0.01, 0), (0, 0.01), (0, -0.01)):
        out = await _query_soilgrids(lat + dlat, lon + dlon)
        if out is not None:
            cache_set(key, out, ttl=30 * 86400)   # le sol ne change pas
            return out
    return None


async def _query_soilgrids(lat: float, lon: float) -> Optional[dict[str, float]]:
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(SOILGRIDS_URL, params=[
                ("lon", lon), ("lat", lat),
                ("property", "sand"), ("property", "clay"), ("property", "silt"),
                ("depth", "0-5cm"), ("depth", "5-15cm"), ("depth", "15-30cm"),
                ("value", "mean"),
            ])
            r.raise_for_status()
            layers = r.json().get("properties", {}).get("layers", [])
    except Exception as exc:
        logger.warning("SoilGrids indisponible : %r", exc)
        return None

    # Pondération par épaisseur de couche : 5, 10, 15 cm
    weights = {"0-5cm": 5, "5-15cm": 10, "15-30cm": 15}
    out: dict[str, float] = {}
    for layer in layers:
        name = layer.get("name")            # sand / clay / silt (g/kg)
        total, wsum = 0.0, 0
        for d in layer.get("depths", []):
            label = d.get("label", "")
            val = (d.get("values") or {}).get("mean")
            if val is None:
                continue
            w = weights.get(label, 0)
            total += (val / 10.0) * w        # g/kg → %
            wsum += w
        if wsum:
            out[name] = round(total / wsum, 1)

    if {"sand", "clay"} <= set(out):
        return out
    return None


def saxton_rawls_awc(sand_pct: float, clay_pct: float) -> dict[str, float]:
    """Capacité au champ / point de flétrissement (m³/m³) — Saxton & Rawls 2006
    (forme simplifiée sans matière organique, OM = 2,5 % par défaut)."""
    s, c, om = sand_pct / 100.0, clay_pct / 100.0, 0.025

    # Point de flétrissement (1500 kPa)
    t1500 = (-0.024 * s + 0.487 * c + 0.006 * om
             + 0.005 * s * om - 0.013 * c * om + 0.068 * s * c + 0.031)
    wp = t1500 + (0.14 * t1500 - 0.02)

    # Capacité au champ (33 kPa)
    t33 = (-0.251 * s + 0.195 * c + 0.011 * om
           + 0.006 * s * om - 0.027 * c * om + 0.452 * s * c + 0.299)
    fc = t33 + (1.283 * t33 ** 2 - 0.374 * t33 - 0.015)

    fc = max(0.05, min(0.50, fc))
    wp = max(0.02, min(fc - 0.02, wp))
    return {"field_capacity": round(fc, 3), "wilting_point": round(wp, 3),
            "awc_mm_per_m": round((fc - wp) * 1000, 1)}


def _hargreaves_et0(lat_deg: float, d: date, tmin: float, tmax: float) -> float:
    """ET₀ Hargreaves-Samani (mm/j) — ne demande que Tmin/Tmax + latitude."""
    doy = d.timetuple().tm_yday
    lat = math.radians(lat_deg)
    decl = 0.409 * math.sin(2 * math.pi * doy / 365 - 1.39)
    dr = 1 + 0.033 * math.cos(2 * math.pi * doy / 365)
    ws = math.acos(max(-1, min(1, -math.tan(lat) * math.tan(decl))))
    ra = (24 * 60 / math.pi) * 0.0820 * dr * (
        ws * math.sin(lat) * math.sin(decl) + math.cos(lat) * math.cos(decl) * math.sin(ws)
    )
    tmean = (tmax + tmin) / 2
    return max(0.0, 0.0023 * (tmean + 17.8) * math.sqrt(max(0.0, tmax - tmin)) * ra * 0.408)


# ---------------------------------------------------------------------------
# Bilan hydrique
# ---------------------------------------------------------------------------

async def compute_water_balance(lat: float, lon: float, crop: str = "olivier") -> dict[str, Any]:
    """Bilan hydrique 30 jours + recommandation d'irrigation pour une parcelle."""
    crop_key = crop.lower().replace(" ", "_").replace("-", "_")
    params = CROP_PARAMS.get(crop_key)
    if not params:
        return {"error": f"Culture '{crop}' non paramétrée",
                "available_crops": sorted(CROP_PARAMS.keys())}

    soil = await fetch_soil_properties(lat, lon)
    soil_source = "soilgrids"
    if soil is None:
        # Repli : limon moyen tunisien (sols bruns calcaires)
        soil = {"sand": 45.0, "clay": 25.0, "silt": 30.0}
        soil_source = "fallback_loam"

    awc = saxton_rawls_awc(soil["sand"], soil["clay"])
    taw = awc["awc_mm_per_m"] * params["root_depth_m"]      # réserve utile zone racinaire (mm)
    raw = taw * params["p"]                                  # réserve facilement utilisable

    daily = await fetch_daily_weather(lat, lon)
    if not daily:
        return {"error": "Météo indisponible"}
    window = daily[-30:]

    # Simulation : on part d'un sol à capacité au champ il y a 30 j
    stock = taw
    series = []
    for d in window:
        dt = date.fromisoformat(d["date"])
        et0 = _hargreaves_et0(lat, dt, d["tmin"], d["tmax"])
        etc = params["kc"] * et0
        rain = d["rain"] or 0.0
        stock = max(0.0, min(taw, stock + rain - etc))
        series.append({"date": d["date"], "rain": round(rain, 1),
                       "etc": round(etc, 2), "stock_mm": round(stock, 1)})

    depletion = taw - stock                       # mm consommés
    deficit_vs_raw = depletion - raw              # >0 → stress hydrique
    last_etc = series[-1]["etc"] or 3.0
    days_left = max(0.0, (raw - depletion) / last_etc) if last_etc > 0 else 99.0

    if deficit_vs_raw > 0:
        status, advice = "stress", (
            f"Irriguer MAINTENANT : apport recommandé {depletion:.0f} mm "
            f"({depletion * 10:.0f} m³/ha) pour revenir à la capacité au champ."
        )
    elif days_left <= 3:
        status, advice = "warning", (
            f"Irrigation à prévoir sous {days_left:.0f} j — dose conseillée "
            f"{max(raw, depletion):.0f} mm ({max(raw, depletion) * 10:.0f} m³/ha)."
        )
    else:
        status, advice = "ok", (
            f"Réserve suffisante : ~{days_left:.0f} jours d'autonomie avant "
            f"le seuil de stress (RFU)."
        )

    return {
        "crop": crop_key,
        "soil": {**soil, "source": soil_source, **awc},
        "root_depth_m": params["root_depth_m"],
        "kc": params["kc"],
        "taw_mm": round(taw, 1),
        "raw_mm": round(raw, 1),
        "stock_mm": round(stock, 1),
        "depletion_mm": round(depletion, 1),
        "days_until_stress": round(days_left, 1),
        "status": status,
        "recommendation": advice,
        "series": series,
    }
