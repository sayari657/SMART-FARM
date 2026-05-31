"""
Irrigation Service — ET₀ Penman-Monteith (FAO-56)
===================================================
Calcule l'évapotranspiration de référence ET₀ selon la méthode FAO-56
et les besoins en eau des cultures (ETc = Kc × ET₀).

Références :
  - FAO Irrigation and Drainage Paper No. 56 (Allen et al., 1998)
  - Coefficients culturaux Kc : FAO + données AVFA Tunisie
"""

from __future__ import annotations

import math
import logging
from datetime import date, datetime
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Coefficients culturaux Kc (FAO-56 Table 12 + adaptations tunisiennes)
# Format : {culture: {stade: (Kc_ini, Kc_mid, Kc_end)}}
# ---------------------------------------------------------------------------
KC_TABLE: dict[str, dict[str, float]] = {
    "tomate":          {"ini": 0.60, "mid": 1.15, "end": 0.80},
    "pomme_de_terre":  {"ini": 0.50, "mid": 1.15, "end": 0.75},
    "oignon":          {"ini": 0.70, "mid": 1.05, "end": 0.75},
    "piment":          {"ini": 0.60, "mid": 1.05, "end": 0.90},
    "ble_dur":         {"ini": 0.30, "mid": 1.15, "end": 0.25},
    "orge":            {"ini": 0.30, "mid": 1.15, "end": 0.25},
    "mais":            {"ini": 0.30, "mid": 1.20, "end": 0.35},
    "olivier":         {"ini": 0.65, "mid": 0.70, "end": 0.70},
    "agrumes":         {"ini": 0.75, "mid": 0.70, "end": 0.70},
    "vigne":           {"ini": 0.30, "mid": 0.85, "end": 0.45},
    "datte":           {"ini": 0.90, "mid": 0.95, "end": 0.95},
    "amandier":        {"ini": 0.40, "mid": 0.90, "end": 0.65},
    "figuier":         {"ini": 0.50, "mid": 1.05, "end": 0.90},
    "melon":           {"ini": 0.50, "mid": 1.05, "end": 0.75},
    "pastèque":        {"ini": 0.40, "mid": 1.00, "end": 0.75},
    "carotte":         {"ini": 0.70, "mid": 1.05, "end": 0.95},
    "laitue":          {"ini": 0.70, "mid": 1.00, "end": 0.95},
}

GROWTH_STAGES = ("ini", "dev", "mid", "late", "end")

# Kc par stade phénologique simplifié
KC_BY_STAGE: dict[str, dict[str, float]] = {
    crop: {
        "ini":       vals["ini"],
        "dev":       round((vals["ini"] + vals["mid"]) / 2, 2),
        "mid":       vals["mid"],
        "flowering": vals["mid"],
        "late":      round((vals["mid"] + vals["end"]) / 2, 2),
        "end":       vals["end"],
        "harvest":   vals["end"],
    }
    for crop, vals in KC_TABLE.items()
}


def _day_of_year(d: date) -> int:
    return d.timetuple().tm_yday


def _solar_declination(doy: int) -> float:
    return 0.409 * math.sin(2 * math.pi * doy / 365 - 1.39)


def _sunset_hour_angle(lat_rad: float, decl: float) -> float:
    cos_ws = -math.tan(lat_rad) * math.tan(decl)
    cos_ws = max(-1.0, min(1.0, cos_ws))
    return math.acos(cos_ws)


def _extraterrestrial_radiation(lat_deg: float, doy: int) -> float:
    """Ra in MJ/m²/day — FAO-56 eq. 21."""
    lat_rad = math.radians(lat_deg)
    dr = 1 + 0.033 * math.cos(2 * math.pi * doy / 365)
    decl = _solar_declination(doy)
    ws = _sunset_hour_angle(lat_rad, decl)
    Gsc = 0.0820  # MJ/m²/min
    Ra = (24 * 60 / math.pi) * Gsc * dr * (
        ws * math.sin(lat_rad) * math.sin(decl)
        + math.cos(lat_rad) * math.cos(decl) * math.sin(ws)
    )
    return max(0.0, Ra)


def compute_et0(
    lat: float,
    t_max: float,
    t_min: float,
    rh_mean: float,
    wind_speed_2m: float,
    sunshine_hours: float | None = None,
    solar_radiation: float | None = None,
    target_date: date | None = None,
    elevation: float = 50.0,
) -> dict[str, Any]:
    """
    Calcule ET₀ (mm/jour) par la méthode Penman-Monteith FAO-56.

    Parameters
    ----------
    lat           : latitude en degrés décimaux
    t_max, t_min  : températures max/min en °C
    rh_mean       : humidité relative moyenne en %
    wind_speed_2m : vitesse vent à 2m en m/s
    sunshine_hours: heures d'ensoleillement (optionnel, remplacé par solar_radiation)
    solar_radiation: rayonnement solaire en MJ/m²/jour (optionnel)
    target_date   : date cible (défaut = aujourd'hui)
    elevation     : altitude en mètres (défaut 50m)

    Returns
    -------
    dict avec et0_mm_day, components, input_data
    """
    if target_date is None:
        target_date = date.today()

    doy = _day_of_year(target_date)
    t_mean = (t_max + t_min) / 2.0

    # Atmospheric pressure (kPa) — FAO eq. 7
    P = 101.3 * ((293 - 0.0065 * elevation) / 293) ** 5.26

    # Psychrometric constant γ (kPa/°C)
    gamma = 0.000665 * P

    # Saturation vapour pressure (kPa) — FAO eq. 11
    e_tmax = 0.6108 * math.exp(17.27 * t_max / (t_max + 237.3))
    e_tmin = 0.6108 * math.exp(17.27 * t_min / (t_min + 237.3))
    es = (e_tmax + e_tmin) / 2.0

    # Actual vapour pressure (kPa)
    ea = es * rh_mean / 100.0

    # Slope of saturation vapour pressure curve Δ (kPa/°C) — FAO eq. 13
    delta = 4098 * (0.6108 * math.exp(17.27 * t_mean / (t_mean + 237.3))) / (t_mean + 237.3) ** 2

    # Extraterrestrial radiation Ra (MJ/m²/day)
    Ra = _extraterrestrial_radiation(lat, doy)

    # Solar radiation Rs (MJ/m²/day)
    if solar_radiation is not None:
        Rs = float(solar_radiation)
    elif sunshine_hours is not None:
        # Angstrom formula (as = 0.25, bs = 0.50 for Tunisia)
        N = 24 / math.pi * _sunset_hour_angle(math.radians(lat), _solar_declination(doy))
        Rs = (0.25 + 0.50 * sunshine_hours / max(N, 0.1)) * Ra
    else:
        # Hargreaves estimation from temp range
        Rs = 0.16 * math.sqrt(max(t_max - t_min, 0)) * Ra

    # Clear-sky solar radiation Rso
    Rso = (0.75 + 2e-5 * elevation) * Ra

    # Net shortwave radiation Rns (MJ/m²/day) — albedo = 0.23
    Rns = (1 - 0.23) * Rs

    # Net longwave radiation Rnl (MJ/m²/day) — FAO eq. 39
    sigma = 4.903e-9  # MJ/K⁴/m²/day
    T_max_K = t_max + 273.16
    T_min_K = t_min + 273.16
    Rnl = (sigma * (T_max_K**4 + T_min_K**4) / 2
           * (0.34 - 0.14 * math.sqrt(max(ea, 0.001)))
           * (1.35 * min(Rs / max(Rso, 0.001), 1.0) - 0.35))

    # Net radiation Rn (MJ/m²/day)
    Rn = Rns - Rnl

    # Soil heat flux G ≈ 0 for daily timestep
    G = 0.0

    # Wind speed correction to 2m if needed (already at 2m)
    u2 = wind_speed_2m

    # Penman-Monteith ET₀ (mm/day) — FAO-56 eq. 6
    numerator = (0.408 * delta * (Rn - G)
                 + gamma * (900 / (t_mean + 273)) * u2 * (es - ea))
    denominator = delta + gamma * (1 + 0.34 * u2)
    et0 = max(0.0, numerator / denominator)

    return {
        "et0_mm_day": round(et0, 2),
        "date": target_date.isoformat(),
        "doy": doy,
        "components": {
            "Rn_MJ_m2_day": round(Rn, 3),
            "Ra_MJ_m2_day": round(Ra, 3),
            "Rs_MJ_m2_day": round(Rs, 3),
            "es_kPa": round(es, 3),
            "ea_kPa": round(ea, 3),
            "vpd_kPa": round(es - ea, 3),
            "delta_kPa_C": round(delta, 4),
            "gamma_kPa_C": round(gamma, 4),
        },
        "inputs": {
            "lat": lat,
            "t_max": t_max,
            "t_min": t_min,
            "rh_mean": rh_mean,
            "wind_speed_2m": u2,
            "elevation_m": elevation,
        },
    }


def get_crop_water_requirement(
    crop: str,
    stage: str,
    et0_mm_day: float,
) -> dict[str, Any]:
    """
    Calcule ETc = Kc × ET₀ pour une culture et un stade phénologique.

    Parameters
    ----------
    crop         : nom de la culture (ex: "tomate", "olivier")
    stage        : stade phénologique (ini, dev, mid, flowering, late, end, harvest)
    et0_mm_day   : ET₀ calculée en mm/jour

    Returns
    -------
    dict avec etc_mm_day, kc, irrigation_recommendation_mm, stress_index
    """
    crop_key = crop.lower().replace(" ", "_").replace("-", "_")
    stage_key = stage.lower()

    kc_stages = KC_BY_STAGE.get(crop_key)
    if not kc_stages:
        # Fallback: Kc moyen de 0.85 pour cultures inconnues
        kc = 0.85
        note = f"Culture '{crop}' inconnue — Kc=0.85 (valeur par défaut)"
    else:
        kc = kc_stages.get(stage_key, kc_stages.get("mid", 1.0))
        note = f"Kc FAO-56 pour {crop} stade {stage}"

    etc_mm_day = round(kc * et0_mm_day, 2)

    # Stress index : si ET₀ > 6 mm/jour → stress hydrique probable en Tunisie
    stress_index = round(min(et0_mm_day / 8.0, 1.0), 2)

    # Irrigation recommendation = ETc (rainfall = 0 assumed)
    irrigation_mm = etc_mm_day

    return {
        "crop": crop,
        "stage": stage,
        "kc": round(kc, 2),
        "et0_mm_day": round(et0_mm_day, 2),
        "etc_mm_day": etc_mm_day,
        "irrigation_recommendation_mm": irrigation_mm,
        "stress_index": stress_index,
        "note": note,
        "available_crops": sorted(KC_TABLE.keys()),
        "available_stages": list(KC_BY_STAGE.get(crop_key, {}).keys()) if crop_key in KC_BY_STAGE else GROWTH_STAGES,
    }


async def get_farm_et0(farm, days: int = 1) -> dict[str, Any]:
    """
    Calcule ET₀ pour une ferme en récupérant la météo via Open-Meteo.
    """
    import httpx

    lat = float(farm.lat or 36.8)
    lon = float(farm.lon or 10.1)

    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            f"&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,"
            f"wind_speed_10m_max,sunshine_duration"
            f"&timezone=Africa%2FTunis&forecast_days={days}"
        )
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

        daily = data.get("daily", {})
        results = []
        n = len(daily.get("time", []))
        for i in range(n):
            t_max = daily["temperature_2m_max"][i]
            t_min = daily["temperature_2m_min"][i]
            rh = daily["relative_humidity_2m_mean"][i]
            wind = daily["wind_speed_10m_max"][i] * 0.75  # max → mean approx at 2m
            sunshine_h = daily["sunshine_duration"][i] / 3600  # seconds → hours
            d = date.fromisoformat(daily["time"][i])

            et0_result = compute_et0(
                lat=lat, t_max=t_max, t_min=t_min,
                rh_mean=rh, wind_speed_2m=wind,
                sunshine_hours=sunshine_h, target_date=d,
            )
            results.append(et0_result)

        return {"farm_id": farm.id, "lat": lat, "lon": lon, "forecasts": results}

    except Exception as exc:
        logger.error("ET₀ fetch failed: %s", exc)
        # Fallback: compute with typical Tunisian values
        et0_result = compute_et0(lat=lat, t_max=28.0, t_min=15.0,
                                  rh_mean=60.0, wind_speed_2m=2.5)
        return {
            "farm_id": farm.id if farm else None,
            "lat": lat, "lon": lon,
            "forecasts": [et0_result],
            "note": "Valeurs météo par défaut (Tunisie centrale) — API indisponible",
        }
