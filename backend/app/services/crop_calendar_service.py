"""
Crop Calendar Service — Calendrier Cultural Tunisien
=====================================================
Données agronomiques par zone agroclimatique tunisienne.
Sources : FAO, AVFA Tunisie, CRDA, IRA (Institut des Régions Arides).

Zones agroclimatiques :
  - nord    : Tell, Kroumirie (pluviométrie > 600 mm/an)
  - centre  : Dorsale, Hautes Steppes (400–600 mm/an)
  - sud     : Basses Steppes, Jeffara (< 200 mm/an)
  - cotier  : Sahel, Cap Bon, Sfax côte
"""

from __future__ import annotations

from datetime import date
from typing import Any

# ---------------------------------------------------------------------------
# Base de données calendrier cultural
# Format : {zone: {culture: {stade: (mois_debut, mois_fin, description)}}}
# ---------------------------------------------------------------------------

CROP_CALENDAR: dict[str, dict[str, list[dict]]] = {
    "nord": {
        "tomate": [
            {"stade": "pepiniere",       "debut": 1, "fin": 2, "action": "Semis en pépinière chauffée"},
            {"stade": "transplantation", "debut": 3, "fin": 4, "action": "Transplantation en plein champ après gel"},
            {"stade": "floraison",       "debut": 5, "fin": 6, "action": "Fertilisation potassique, surveillance botrytis"},
            {"stade": "recolte",         "debut": 7, "fin": 9, "action": "Récolte progressive, traitement mildiou si humide"},
        ],
        "pomme_de_terre": [
            {"stade": "plantation",      "debut": 1, "fin": 3, "action": "Plantation primeur sous tunnel ou plein champ"},
            {"stade": "levee",           "debut": 2, "fin": 4, "action": "Désherbage, binage"},
            {"stade": "floraison",       "debut": 4, "fin": 5, "action": "Traitement alternaria/mildiou"},
            {"stade": "recolte",         "debut": 5, "fin": 7, "action": "Récolte quand fanes jaunissent"},
        ],
        "ble_dur": [
            {"stade": "semis",           "debut": 10, "fin": 11, "action": "Semis variétés INRAT (Karim, Salambo)"},
            {"stade": "tallage",         "debut": 12, "fin": 2,  "action": "Désherbage, fertilisation azotée fractionnée"},
            {"stade": "epiaison",        "debut": 3,  "fin": 4,  "action": "Traitement fongicide si rouille"},
            {"stade": "recolte",         "debut": 5,  "fin": 6,  "action": "Moisson mécanique à humidité <14%"},
        ],
        "olivier": [
            {"stade": "taille",          "debut": 1, "fin": 2,  "action": "Taille de fructification"},
            {"stade": "floraison",       "debut": 4, "fin": 5,  "action": "Pollinisation — éviter traitements insecticides"},
            {"stade": "nouaison",        "debut": 6, "fin": 7,  "action": "Traitement teigne de l'olivier"},
            {"stade": "veraison",        "debut": 9, "fin": 10, "action": "Vérifier maturité, piège mouche olive"},
            {"stade": "recolte",         "debut": 10,"fin": 12, "action": "Récolte à 30-40% maturité pour huile extra-vierge"},
        ],
        "vigne": [
            {"stade": "taille",          "debut": 1, "fin": 2,  "action": "Taille Guyot ou Gobelet selon variété"},
            {"stade": "debourrement",    "debut": 3, "fin": 4,  "action": "Premier traitement cuivre (bouillie bordelaise)"},
            {"stade": "floraison",       "debut": 5, "fin": 6,  "action": "Traitement anti-mildiou, oïdium"},
            {"stade": "veraison",        "debut": 7, "fin": 8,  "action": "Irrigation déficitaire contrôlée"},
            {"stade": "recolte",         "debut": 8, "fin": 9,  "action": "Vendanges selon degré brix (≥20° pour rouge)"},
        ],
        "agrumes": [
            {"stade": "floraison",       "debut": 3, "fin": 4,  "action": "Ne pas irriguer — favorise la nouaison naturelle"},
            {"stade": "nouaison",        "debut": 5, "fin": 6,  "action": "Éclaircissage si surcharge"},
            {"stade": "croissance",      "debut": 6, "fin": 9,  "action": "Irrigation régulière, fertilisation"},
            {"stade": "recolte",         "debut": 11,"fin": 2,  "action": "Récolte oranges (Nov-Fév), mandarines (Oct-Déc)"},
        ],
        "piment": [
            {"stade": "pepiniere",       "debut": 2, "fin": 3,  "action": "Semis sous abri"},
            {"stade": "transplantation", "debut": 4, "fin": 5,  "action": "Transplantation après dernières gelées"},
            {"stade": "recolte",         "debut": 7, "fin": 10, "action": "Récolte vert ou rouge selon destination"},
        ],
        "oignon": [
            {"stade": "semis",           "debut": 9, "fin": 10, "action": "Semis automnal"},
            {"stade": "repiquage",       "debut": 11,"fin": 12, "action": "Repiquage bulbilles ou plants"},
            {"stade": "croissance",      "debut": 1, "fin": 3,  "action": "Fertilisation azotée"},
            {"stade": "recolte",         "debut": 4, "fin": 5,  "action": "Récolte quand 50% des fanes versées"},
        ],
        "amandier": [
            {"stade": "floraison",       "debut": 1, "fin": 3,  "action": "Très précoce — risque gel tardif, traitement moniliose"},
            {"stade": "croissance",      "debut": 4, "fin": 6,  "action": "Traitement anarsia, tordeuse orientale"},
            {"stade": "recolte",         "debut": 8, "fin": 9,  "action": "Récolte à l'ouverture du brou"},
        ],
    },
    "centre": {
        "tomate": [
            {"stade": "pepiniere",       "debut": 2, "fin": 3,  "action": "Semis sous tunnel plastique"},
            {"stade": "transplantation", "debut": 4, "fin": 5,  "action": "Transplantation en sol préparé"},
            {"stade": "recolte",         "debut": 7, "fin": 10, "action": "Irrigation goutte-à-goutte obligatoire"},
        ],
        "pomme_de_terre": [
            {"stade": "plantation",      "debut": 2, "fin": 3,  "action": "Plantation après gel"},
            {"stade": "recolte",         "debut": 6, "fin": 7,  "action": "Récolte et stockage en cave fraîche"},
        ],
        "ble_dur": [
            {"stade": "semis",           "debut": 10,"fin": 11, "action": "Semis précoce pour bénéficier des pluies"},
            {"stade": "recolte",         "debut": 5, "fin": 6,  "action": "Moisson avant vagues de chaleur"},
        ],
        "olivier": [
            {"stade": "taille",          "debut": 2, "fin": 3,  "action": "Taille légère, éliminer bois mort"},
            {"stade": "floraison",       "debut": 4, "fin": 5,  "action": "Éviter irrigation — stress hydrique favorise floraison"},
            {"stade": "recolte",         "debut": 11,"fin": 1,  "action": "Récolte manuelle ou mécanique — oliviers Chemlali"},
        ],
        "datte": [
            {"stade": "pollinisation",   "debut": 3, "fin": 4,  "action": "Pollinisation manuelle des régimes"},
            {"stade": "croissance",      "debut": 5, "fin": 7,  "action": "Ensachage des régimes contre insectes"},
            {"stade": "recolte",         "debut": 9, "fin": 11, "action": "Récolte Deglet Nour à maturité"},
        ],
        "melon": [
            {"stade": "semis",           "debut": 3, "fin": 4,  "action": "Semis direct ou repiquage"},
            {"stade": "floraison",       "debut": 5, "fin": 6,  "action": "Pollinisation, contrôle oïdium"},
            {"stade": "recolte",         "debut": 6, "fin": 8,  "action": "Récolte à maturité olfactive"},
        ],
        "orge": [
            {"stade": "semis",           "debut": 10,"fin": 11, "action": "Semis précoce pour pluies d'automne"},
            {"stade": "recolte",         "debut": 4, "fin": 5,  "action": "Récolte avant sécheresse estivale"},
        ],
    },
    "sud": {
        "datte": [
            {"stade": "pollinisation",   "debut": 3, "fin": 4,  "action": "Pollinisation manuelle — variétés Deglet, Kenta, Alig"},
            {"stade": "croissance",      "debut": 4, "fin": 7,  "action": "Irrigation par séguia ou goutte-à-goutte"},
            {"stade": "ensachage",       "debut": 7, "fin": 8,  "action": "Ensachage plastique contre pluies et insectes"},
            {"stade": "recolte",         "debut": 9, "fin": 11, "action": "Récolte progressive selon maturité"},
        ],
        "pastèque": [
            {"stade": "semis",           "debut": 3, "fin": 4,  "action": "Semis sous tunnel pour protection vent"},
            {"stade": "recolte",         "debut": 6, "fin": 7,  "action": "Récolte à son creux et couleur ventre jaune"},
        ],
        "melon": [
            {"stade": "semis",           "debut": 3, "fin": 4,  "action": "Semis en butte avec paillis"},
            {"stade": "recolte",         "debut": 6, "fin": 7,  "action": "Récolte tôt le matin"},
        ],
        "tomate": [
            {"stade": "pepiniere",       "debut": 1, "fin": 2,  "action": "Pépinière sous serre (Tozeur, Kebili)"},
            {"stade": "transplantation", "debut": 2, "fin": 3,  "action": "Transplantation sous tunnel froid"},
            {"stade": "recolte",         "debut": 5, "fin": 7,  "action": "Récolte avant fortes chaleurs"},
        ],
        "olivier": [
            {"stade": "floraison",       "debut": 4, "fin": 5,  "action": "Pollinisation croisée — variétés Zalmati, Oueslati"},
            {"stade": "recolte",         "debut": 11,"fin": 12, "action": "Récolte manuelle — olives à maturité violacée"},
        ],
    },
    "cotier": {
        "agrumes": [
            {"stade": "floraison",       "debut": 3, "fin": 4,  "action": "Fleur d'oranger — irrigation suspendue"},
            {"stade": "nouaison",        "debut": 5, "fin": 6,  "action": "Éclaircissage si surcharge fruits"},
            {"stade": "recolte",         "debut": 10,"fin": 2,  "action": "Maltaise (Jan-Fév), Navel (Nov-Jan), Clémentines (Oct-Déc)"},
        ],
        "vigne": [
            {"stade": "taille",          "debut": 1, "fin": 2,  "action": "Taille courte pour Muscat de Kelibia"},
            {"stade": "floraison",       "debut": 5, "fin": 6,  "action": "Ébourgeonnage, traitement botrytis"},
            {"stade": "recolte",         "debut": 7, "fin": 9,  "action": "Vendanges précoces côte (chaleur maritime)"},
        ],
        "tomate": [
            {"stade": "pepiniere",       "debut": 1, "fin": 2,  "action": "Semis précoce — bénéfice de la douceur côtière"},
            {"stade": "transplantation", "debut": 3, "fin": 3,  "action": "Transplantation Cap Bon, Sahel"},
            {"stade": "recolte",         "debut": 6, "fin": 9,  "action": "Tomate industrielle Sbiba — contrat coopérative"},
        ],
        "piment": [
            {"stade": "pepiniere",       "debut": 2, "fin": 3,  "action": "Semis"},
            {"stade": "transplantation", "debut": 4, "fin": 4,  "action": "Transplantation Nabeul, Hammamet"},
            {"stade": "recolte",         "debut": 7, "fin": 10, "action": "Piment rouge pour harissa — séchage solaire"},
        ],
        "figuier": [
            {"stade": "taille",          "debut": 1, "fin": 2,  "action": "Taille légère des rameaux de l'année"},
            {"stade": "nouaison",        "debut": 5, "fin": 6,  "action": "Caprifiguier si présent — pollinisation"},
            {"stade": "recolte",         "debut": 7, "fin": 9,  "action": "Figues fraîches (Juillet), figues sèches (Août-Sept)"},
        ],
    },
}

# ---------------------------------------------------------------------------
# Traitements phytosanitaires préventifs par culture
# ---------------------------------------------------------------------------
PREVENTIVE_TREATMENTS: dict[str, list[dict]] = {
    "olivier":    [
        {"mois": 3,  "traitement": "Bouillie bordelaise", "cible": "Œil de paon (Cycloconium oleaginum)"},
        {"mois": 6,  "traitement": "Kaolin ou insecticide", "cible": "Teigne, cochenille"},
        {"mois": 8,  "traitement": "Piège à phéromone", "cible": "Mouche de l'olive (Bactrocera oleae)"},
    ],
    "agrumes":    [
        {"mois": 3,  "traitement": "Huile blanche", "cible": "Cochenilles, acariens"},
        {"mois": 5,  "traitement": "Fongicide cuivre", "cible": "Gommose (Phytophthora)"},
        {"mois": 9,  "traitement": "Cuivre préventif", "cible": "Alternariose"},
    ],
    "tomate":     [
        {"mois": 5,  "traitement": "Mancozèbe ou Chlorothalonil", "cible": "Mildiou précoce"},
        {"mois": 6,  "traitement": "Imidaclopride", "cible": "Aleurodes (vecteurs TYLCV)"},
        {"mois": 7,  "traitement": "Fongicide systémique", "cible": "Botrytis (temps humide)"},
    ],
    "vigne":      [
        {"mois": 3,  "traitement": "Bouillie bordelaise", "cible": "Mildiou — protection avant débourrement"},
        {"mois": 5,  "traitement": "Soufre poudre", "cible": "Oïdium"},
        {"mois": 6,  "traitement": "Pyrèthre naturel", "cible": "Eudémis, cochylis"},
    ],
    "ble_dur":    [
        {"mois": 3,  "traitement": "Fongicide triazole", "cible": "Rouille brune (Puccinia triticina)"},
        {"mois": 4,  "traitement": "Insecticide", "cible": "Puceron des épis"},
    ],
    "pomme_de_terre": [
        {"mois": 4,  "traitement": "Mancozèbe + cymoxanil", "cible": "Mildiou (Phytophthora infestans)"},
        {"mois": 5,  "traitement": "Imidaclopride", "cible": "Doryphore"},
    ],
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_crops_for_month(zone: str, month: int) -> list[dict[str, Any]]:
    """
    Retourne les cultures et actions recommandées pour un mois donné dans une zone.
    """
    zone_key = zone.lower()
    calendar = CROP_CALENDAR.get(zone_key, CROP_CALENDAR.get("nord", {}))

    results = []
    for crop, stages in calendar.items():
        for stage in stages:
            d, f = stage["debut"], stage["fin"]
            # Handle year-wrap (e.g., debut=10, fin=2)
            in_period = (d <= month <= f) if d <= f else (month >= d or month <= f)
            if in_period:
                results.append({
                    "culture": crop,
                    "stade": stage["stade"],
                    "action": stage["action"],
                    "mois_debut": d,
                    "mois_fin": f,
                    "traitements_preventifs": [
                        t for t in PREVENTIVE_TREATMENTS.get(crop, [])
                        if t["mois"] == month
                    ],
                })

    return results


def get_crop_timeline(crop: str, zone: str = "nord") -> dict[str, Any]:
    """Retourne le calendrier complet d'une culture sur 12 mois."""
    zone_key = zone.lower()
    crop_key = crop.lower().replace(" ", "_").replace("-", "_")
    calendar = CROP_CALENDAR.get(zone_key, CROP_CALENDAR.get("nord", {}))

    stages = calendar.get(crop_key, [])
    if not stages:
        return {
            "culture": crop,
            "zone": zone,
            "error": f"Culture '{crop}' non trouvée pour la zone '{zone}'",
            "available_crops": sorted(calendar.keys()),
        }

    treatments = PREVENTIVE_TREATMENTS.get(crop_key, [])

    # Build month-by-month view
    monthly = {}
    for m in range(1, 13):
        actions = []
        for stage in stages:
            d, f = stage["debut"], stage["fin"]
            in_period = (d <= m <= f) if d <= f else (m >= d or m <= f)
            if in_period:
                actions.append({"stade": stage["stade"], "action": stage["action"]})
        treats = [t for t in treatments if t["mois"] == m]
        if actions or treats:
            monthly[m] = {"actions": actions, "traitements": treats}

    return {
        "culture": crop,
        "zone": zone,
        "stages": stages,
        "traitements_preventifs": treatments,
        "calendrier_mensuel": monthly,
    }


def get_phenological_alerts(
    zone: str,
    lat: float | None = None,
    temperature: float | None = None,
) -> list[dict[str, Any]]:
    """
    Génère des alertes phénologiques basées sur le mois courant et (optionnellement) la météo.
    """
    today = date.today()
    month = today.month
    crops_this_month = get_crops_for_month(zone, month)
    alerts = []

    for crop_info in crops_this_month:
        # Gel tardif : si température < 4°C en Mars-Avril → risque pour amandier/vigne/agrumes
        if temperature is not None and temperature < 4.0 and month in (3, 4):
            if crop_info["culture"] in ("amandier", "vigne", "agrumes", "olivier"):
                alerts.append({
                    "type": "gel_tardif",
                    "severity": "critical",
                    "culture": crop_info["culture"],
                    "message": f"Risque de gel tardif ({temperature}°C) — protéger {crop_info['culture']} en {crop_info['stade']}",
                    "action_immediate": "Allumage bougies antigel ou aspersion anti-gel",
                })

        # Alerte normale phénologique
        alerts.append({
            "type": "phenologie",
            "severity": "info",
            "culture": crop_info["culture"],
            "stade": crop_info["stade"],
            "message": f"{crop_info['culture'].title()} : {crop_info['action']}",
            "traitements": crop_info.get("traitements_preventifs", []),
            "mois": month,
            "zone": zone,
        })

    return alerts


def list_available_crops(zone: str | None = None) -> dict[str, Any]:
    """Liste toutes les cultures disponibles par zone."""
    if zone:
        zone_key = zone.lower()
        crops = sorted(CROP_CALENDAR.get(zone_key, {}).keys())
        return {"zone": zone, "cultures": crops, "count": len(crops)}
    return {
        "zones": {z: sorted(crops.keys()) for z, crops in CROP_CALENDAR.items()},
        "total_cultures": len({c for z in CROP_CALENDAR.values() for c in z}),
    }
