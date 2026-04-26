"""
Bee Management — Scientific Analytics Engine
Implements apiculture-grade health scoring, alert generation, and recommendations.

Scientific model references:
  - Varroa monitoring thresholds (COLOSS BeeBook, 2013)
  - Queen replacement criteria (Büchler et al., 2014)
  - Colony strength assessment (Liebefeld scale adapted)
  - Optimal inspection intervals (Charrière & Imdorf, 2012)
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timedelta
from typing import List, Optional
from app.core.database import get_db
from app.models.domain import BeeApiary, BeeHive, BeeVisit, BeeProduction

router = APIRouter(prefix="/bee/analytics", tags=["Bee Analytics"])


# ─── Scientific Constants ─────────────────────────────────────────────────────

HEALTH_WEIGHTS = {
    "visit_state": 0.40,
    "visit_frequency": 0.25,
    "queen_quality": 0.20,
    "colony_force": 0.15,
}

VISIT_STATE_SCORES = {
    "health":    10.0,
    "warning":    5.5,
    "treatment":  4.0,
    "urgent":     1.5,
    None:         7.0,   # unknown → neutral
}

VISIT_FREQUENCY_MULTIPLIER = {
    "optimal":    (0,  14,  1.00),
    "acceptable": (14, 21,  0.85),
    "overdue":    (21, 35,  0.65),
    "critical":   (35, 999, 0.40),
    "no_visit":   (None, None, 0.55),
}

QUEEN_AGE_SCORES = {
    (0, 1):  10.0,   # 1st year — ideal performance
    (1, 2):   9.5,   # peak production year
    (2, 3):   7.5,   # acceptable
    (3, 4):   5.0,   # replacement recommended (COLOSS BeeBook)
    (4, 99):  2.5,   # urgent replacement
}

SEASON_VISIT_INTERVALS = {
    "Printemps": 10,  # active buildup — every 10 days
    "Eté":       12,  # main flow — every 12 days
    "Automne":   18,  # prep for winter — every 18 days
    "Hiver":     30,  # minimal intervention — every 30 days
    None:        14,  # default
}

ALARM_THRESHOLDS = {
    "critical_health":  3.0,
    "low_health":       5.0,
    "queen_old_years":  3,
    "overdue_days":     21,
    "honey_critical":   2,   # honey_level < 2/10 → starvation risk
    "force_low":        3,   # force_level < 3 → colony weak
}


# ─── Core health scoring function ────────────────────────────────────────────

def compute_hive_health(
    hive: BeeHive,
    last_visit: Optional[BeeVisit],
    apiary: Optional[BeeApiary],
) -> dict:
    """
    Compute a composite health index (0-10) for a single hive using
    weighted multi-factor scoring.
    """
    today = datetime.utcnow()

    # — Factor 1: Visit health state (40%) —
    state = last_visit.health_state if last_visit else None
    state_score = VISIT_STATE_SCORES.get(state, 7.0)

    # — Factor 2: Visit frequency penalty (25%) —
    freq_mult = VISIT_FREQUENCY_MULTIPLIER["no_visit"][2]
    days_since = None
    if last_visit:
        try:
            lv_date = datetime.strptime(last_visit.visit_date, "%Y-%m-%d")
            days_since = (today - lv_date).days
        except Exception:
            days_since = 999
        if days_since <= 14:
            freq_mult = 1.00
        elif days_since <= 21:
            freq_mult = 0.85
        elif days_since <= 35:
            freq_mult = 0.65
        else:
            freq_mult = 0.40
    freq_score = 10.0 * freq_mult  # convert to 0-10 scale

    # — Factor 3: Queen quality (20%) —
    queen_score = 7.0  # default unknown
    if hive.queen_year:
        queen_age = today.year - hive.queen_year
        for (lo, hi), score in QUEEN_AGE_SCORES.items():
            if lo <= queen_age < hi:
                queen_score = score
                break

    # — Factor 4: Colony force (15%) —
    force_score = max(0.0, min(10.0, hive.force_level or 5.0))

    # — Weighted composite —
    raw = (
        state_score  * HEALTH_WEIGHTS["visit_state"]  +
        freq_score   * HEALTH_WEIGHTS["visit_frequency"] +
        queen_score  * HEALTH_WEIGHTS["queen_quality"] +
        force_score  * HEALTH_WEIGHTS["colony_force"]
    )
    health_index = round(max(0.0, min(10.0, raw)), 2)

    # — Determine season recommended interval —
    season = apiary.season if apiary else None
    recommended_interval = SEASON_VISIT_INTERVALS.get(season, 14)

    return {
        "health_index": health_index,
        "state_score": state_score,
        "freq_score": freq_score,
        "queen_score": queen_score,
        "force_score": force_score,
        "days_since_visit": days_since,
        "recommended_interval_days": recommended_interval,
        "last_visit_state": state,
    }


def generate_alerts(
    hive: BeeHive,
    health_data: dict,
    last_visit: Optional[BeeVisit],
) -> List[dict]:
    """Generate actionable alerts for a hive based on scientific thresholds."""
    alerts = []
    today = datetime.utcnow()

    hi = health_data["health_index"]
    days_since = health_data["days_since_visit"]
    queen_age = (today.year - hive.queen_year) if hive.queen_year else None

    # Critical health
    if hi < ALARM_THRESHOLDS["critical_health"]:
        alerts.append({
            "severity": "critical",
            "type": "CRITICAL_HEALTH",
            "title": "État critique",
            "message": f"Indice de santé {hi}/10 — intervention immédiate requise.",
            "action": "Inspecter et traiter dans les 24h",
        })
    elif hi < ALARM_THRESHOLDS["low_health"]:
        alerts.append({
            "severity": "warning",
            "type": "LOW_HEALTH",
            "title": "Santé dégradée",
            "message": f"Indice de santé {hi}/10 — sous le seuil optimal.",
            "action": "Planifier une visite dans les 3-5 jours",
        })

    # Overdue inspection
    if days_since is not None and days_since > ALARM_THRESHOLDS["overdue_days"]:
        alerts.append({
            "severity": "warning",
            "type": "OVERDUE_INSPECTION",
            "title": "Visite en retard",
            "message": f"Dernière inspection il y a {days_since} jours (seuil: {health_data['recommended_interval_days']} j).",
            "action": "Planifier une inspection immédiatement",
        })
    elif days_since is None:
        alerts.append({
            "severity": "info",
            "type": "NO_VISIT",
            "title": "Aucune visite enregistrée",
            "message": "Cette ruche n'a jamais été inspectée.",
            "action": "Effectuer une première inspection",
        })

    # Queen age
    if queen_age is not None:
        if queen_age >= ALARM_THRESHOLDS["queen_old_years"] + 1:
            alerts.append({
                "severity": "critical",
                "type": "QUEEN_URGENT",
                "title": "Reine trop âgée",
                "message": f"La reine a {queen_age} ans — risque élevé de défaillance et d'essaimage.",
                "action": "Remplacer la reine en priorité (COLOSS BeeBook §3.2)",
            })
        elif queen_age >= ALARM_THRESHOLDS["queen_old_years"]:
            alerts.append({
                "severity": "warning",
                "type": "QUEEN_OLD",
                "title": "Remplacement reine recommandé",
                "message": f"La reine a {queen_age} ans — productivité en déclin.",
                "action": "Planifier le remplacement avant la saison prochaine",
            })

    # Feeding needed
    if last_visit and last_visit.honey_level in ("Faible",):
        alerts.append({
            "severity": "warning",
            "type": "FEEDING_NEEDED",
            "title": "Nourrissement nécessaire",
            "message": "Niveau de miel faible lors de la dernière visite — risque de famine.",
            "action": "Apporter sirop 50/50 ou candi (1kg/ruche)",
        })

    # Treatment needed
    if last_visit and (last_visit.needs_traitement or 0) > 0:
        alerts.append({
            "severity": "warning",
            "type": "TREATMENT_NEEDED",
            "title": "Traitement requis",
            "message": "Traitement Varroa indiqué lors de la dernière visite.",
            "action": "Appliquer traitement anti-Varroa (acide oxalique ou thymol)",
        })

    # Swarm risk (strong colony + spring/summer)
    month = today.month
    if (hive.force_level or 5) >= 8 and month in (3, 4, 5, 6):
        alerts.append({
            "severity": "info",
            "type": "SWARM_RISK",
            "title": "Risque d'essaimage",
            "message": "Colonie très forte en saison de printemps — comportement d'essaimage possible.",
            "action": "Vérifier présence de cellules royales lors de la prochaine visite",
        })

    # Weak colony
    if (hive.force_level or 5) < ALARM_THRESHOLDS["force_low"]:
        alerts.append({
            "severity": "warning",
            "type": "WEAK_COLONY",
            "title": "Colonie affaiblie",
            "message": f"Force colonie = {hive.force_level}/10 — en dessous du seuil viable.",
            "action": "Envisager fusion avec colonie voisine ou introduction de cadres couvain",
        })

    return alerts


def generate_recommendations(
    hive: BeeHive,
    health_data: dict,
    alerts: List[dict],
    apiary: Optional[BeeApiary],
) -> List[dict]:
    """Produce ordered, prioritized recommendations for the beekeeper."""
    recs = []
    today = datetime.utcnow()
    month = today.month
    season = apiary.season if apiary else None

    alert_types = {a["type"] for a in alerts}

    # Priority 1 — Immediate critical actions
    if "CRITICAL_HEALTH" in alert_types:
        recs.append({
            "priority": 1,
            "category": "Santé",
            "action": "Inspection d'urgence",
            "detail": "Examiner le couvain, chercher des signes de loque américaine ou européenne, dysenterie ou Varroa élevé.",
            "scientific_basis": "COLOSS BeeBook Vol. III — Maladies des abeilles",
        })

    if "TREATMENT_NEEDED" in alert_types:
        recs.append({
            "priority": 1,
            "category": "Traitement",
            "action": "Traitement anti-Varroa immédiat",
            "detail": "Appliquer acide oxalique (3,5% solution) par ruissellement ou sublimation. Efficacité >95% sur abeilles adultes.",
            "scientific_basis": "COLOSS BeeBook Vol. I — Diagnostic Varroa, seuil d'intervention: 1-3% acariens/abeilles",
        })

    # Priority 2 — Queen management
    if "QUEEN_URGENT" in alert_types or "QUEEN_OLD" in alert_types:
        recs.append({
            "priority": 2,
            "category": "Remérage",
            "action": "Remplacer la reine",
            "detail": "Introduire une reine sélectionnée (race locale ou hybride hygienique). Période optimale: printemps ou début été.",
            "scientific_basis": "Büchler et al. (2014) — Reine productive 1-2 ans, acceptable 2-3 ans, à remplacer >3 ans",
        })

    # Priority 3 — Feeding & nutrition
    if "FEEDING_NEEDED" in alert_types:
        dose = "1-1.5L sirop 50/50 par semaine (stimulant)" if month in (3, 4, 5) else "Candi 1-2kg si réserves < 8kg"
        recs.append({
            "priority": 3,
            "category": "Nourrissement",
            "action": "Nourrir la colonie",
            "detail": f"Apporter {dose}. Éviter le nourrissement en période de miellée principale (fausse les comptages récolte).",
            "scientific_basis": "Charrière & Imdorf (2012) — Réserves minimales hivernales: 15-20kg miel",
        })

    # Priority 4 — Seasonal actions
    if month in (9, 10) and "TREATMENT_NEEDED" not in alert_types:
        recs.append({
            "priority": 4,
            "category": "Préparation hivernale",
            "action": "Bilan automnal obligatoire",
            "detail": "Vérifier réserves (≥15kg), traiter Varroa après dernière grande récolte, réduire entrée de la ruche, évaluer force de la colonie hivernante.",
            "scientific_basis": "Recommandations ITSAP — Préparation hivernage (Septembre-Octobre)",
        })

    if month in (2, 3) and season in ("Printemps", None):
        recs.append({
            "priority": 4,
            "category": "Relance printanière",
            "action": "Stimulation printanière",
            "detail": "Nourrissement stimulant (0.5L sirop/semaine), vérifier pont hivernal, élargir nid à couvain si colonie forte.",
            "scientific_basis": "ITSAP-Institut de l'Abeille — Guide Calendrier Apicole",
        })

    # Priority 5 — Swarm prevention
    if "SWARM_RISK" in alert_types:
        recs.append({
            "priority": 5,
            "category": "Essaimage",
            "action": "Prévention essaimage",
            "detail": "Agrandir le corps de ruche (ajouter hausse), détruire les cellules royales de remplacement, diviser la colonie si force ≥9.",
            "scientific_basis": "Winston (1987) — Biologie de l'essaimage: température ≥18°C, colonie >30 000 ouvrières",
        })

    # Always include inspection reminder
    days_since = health_data.get("days_since_visit")
    interval = health_data.get("recommended_interval_days", 14)
    if days_since is None or days_since >= interval - 2:
        recs.append({
            "priority": 6,
            "category": "Inspection",
            "action": f"Prochaine visite (J+{interval - (days_since or 0) if days_since else interval})",
            "detail": f"Intervalle recommandé pour la saison '{season or 'active'}' : tous les {interval} jours. Inspecter : ponte, provisions, comportement.",
            "scientific_basis": "Charrière & Imdorf (2012) — Fréquences d'inspection saisonnières",
        })

    recs.sort(key=lambda x: x["priority"])
    return recs


# ─── API Endpoints ────────────────────────────────────────────────────────────

@router.get("/dashboard")
def analytics_dashboard(db: Session = Depends(get_db)):
    """
    Comprehensive scientific dashboard:
    - Global health summary
    - Per-hive health indices
    - Consolidated alert list
    - Production analytics
    """
    today = datetime.utcnow()
    hives = db.query(BeeHive).all()
    apiaries = {a.id: a for a in db.query(BeeApiary).all()}
    productions = db.query(BeeProduction).all()
    visits = db.query(BeeVisit).order_by(desc(BeeVisit.created_at)).all()

    # Build last-visit lookup (one per hive)
    last_visit_map: dict[int, BeeVisit] = {}
    for v in visits:
        if v.hive_id and v.hive_id not in last_visit_map:
            last_visit_map[v.hive_id] = v

    # Per-hive analysis
    hive_reports = []
    all_alerts = []

    for hive in hives:
        apiary = apiaries.get(hive.apiary_id)
        last_visit = last_visit_map.get(hive.id)
        health_data = compute_hive_health(hive, last_visit, apiary)
        alerts = generate_alerts(hive, health_data, last_visit)
        recs = generate_recommendations(hive, health_data, alerts, apiary)

        for a in alerts:
            all_alerts.append({**a, "hive_id": hive.id, "hive_identifier": hive.identifier,
                                "apiary_name": apiary.name if apiary else "?"})

        hive_reports.append({
            "id": hive.id,
            "identifier": hive.identifier,
            "apiary_id": hive.apiary_id,
            "apiary_name": apiary.name if apiary else "?",
            "is_active": hive.is_active,
            "health_index": health_data["health_index"],
            "health_score_db": hive.health_score,
            "honey_level": hive.honey_level,
            "force_level": hive.force_level,
            "queen_year": hive.queen_year,
            "queen_age": today.year - hive.queen_year if hive.queen_year else None,
            "days_since_visit": health_data["days_since_visit"],
            "recommended_interval_days": health_data["recommended_interval_days"],
            "last_visit_state": health_data["last_visit_state"],
            "alert_count": len(alerts),
            "critical_count": sum(1 for a in alerts if a["severity"] == "critical"),
            "alerts": alerts,
            "top_recommendation": recs[0] if recs else None,
        })

    # Global stats
    total_hives = len(hives)
    active_hives = sum(1 for h in hives if h.is_active)
    healthy_hives = sum(1 for r in hive_reports if r["health_index"] >= 7)
    warning_hives = sum(1 for r in hive_reports if 4 <= r["health_index"] < 7)
    critical_hives = sum(1 for r in hive_reports if r["health_index"] < 4)

    avg_health = (
        sum(r["health_index"] for r in hive_reports) / total_hives
        if total_hives > 0 else 0
    )

    # Production stats (last 12 months)
    cutoff = today - timedelta(days=365)
    recent_prods = [p for p in productions if not p.production_date or p.production_date >= cutoff.strftime("%Y-%m-%d")]
    total_honey = sum(p.honey_kg for p in recent_prods)
    total_pollen = sum(p.pollen_kg for p in recent_prods)

    # Monthly series (last 12 months)
    monthly: dict[str, dict] = {}
    for p in productions:
        try:
            month_key = p.production_date[:7]  # "YYYY-MM"
        except Exception:
            continue
        if month_key not in monthly:
            monthly[month_key] = {"month": month_key, "honey_kg": 0.0, "pollen_kg": 0.0, "harvests": 0}
        monthly[month_key]["honey_kg"] += p.honey_kg
        monthly[month_key]["pollen_kg"] += p.pollen_kg
        monthly[month_key]["harvests"] += 1

    monthly_series = sorted(monthly.values(), key=lambda x: x["month"])[-12:]

    # Alert summary
    critical_alerts = [a for a in all_alerts if a["severity"] == "critical"]
    warning_alerts = [a for a in all_alerts if a["severity"] == "warning"]

    return {
        "generated_at": today.isoformat(),
        "global": {
            "total_hives": total_hives,
            "active_hives": active_hives,
            "healthy_hives": healthy_hives,
            "warning_hives": warning_hives,
            "critical_hives": critical_hives,
            "avg_health_index": round(avg_health, 2),
            "total_honey_kg": round(total_honey, 2),
            "total_pollen_kg": round(total_pollen, 2),
            "total_productions": len(recent_prods),
            "critical_alert_count": len(critical_alerts),
            "warning_alert_count": len(warning_alerts),
        },
        "hive_reports": sorted(hive_reports, key=lambda x: x["health_index"]),
        "alerts": sorted(all_alerts, key=lambda x: (
            0 if x["severity"] == "critical" else 1 if x["severity"] == "warning" else 2
        )),
        "monthly_series": monthly_series,
    }


@router.get("/hive/{hive_id}/report")
def hive_scientific_report(hive_id: int, db: Session = Depends(get_db)):
    """Full scientific report for a single hive."""
    hive = db.query(BeeHive).filter(BeeHive.id == hive_id).first()
    if not hive:
        from fastapi import HTTPException
        raise HTTPException(404, "Hive not found")

    apiary = db.query(BeeApiary).filter(BeeApiary.id == hive.apiary_id).first()
    visits = db.query(BeeVisit).filter(BeeVisit.hive_id == hive_id).order_by(desc(BeeVisit.visit_date)).all()
    productions = db.query(BeeProduction).filter(BeeProduction.apiary_id == hive.apiary_id).order_by(desc(BeeProduction.production_date)).all()
    last_visit = visits[0] if visits else None

    health_data = compute_hive_health(hive, last_visit, apiary)
    alerts = generate_alerts(hive, health_data, last_visit)
    recommendations = generate_recommendations(hive, health_data, alerts, apiary)

    # Visit history trend (health states)
    visit_trend = [
        {
            "date": v.visit_date,
            "health_state": v.health_state,
            "harvest_kg": v.harvest_kg,
            "pollen_kg": v.pollen_kg,
            "temperature": v.temperature,
            "score": VISIT_STATE_SCORES.get(v.health_state, 7.0),
        }
        for v in visits[:20]
    ]

    return {
        "hive": {
            "id": hive.id,
            "identifier": hive.identifier,
            "apiary_name": apiary.name if apiary else "?",
            "is_active": hive.is_active,
            "hive_type": hive.hive_type,
            "queen_year": hive.queen_year,
            "queen_age": (datetime.utcnow().year - hive.queen_year) if hive.queen_year else None,
        },
        "health": {
            **health_data,
            "health_index": health_data["health_index"],
            "grade": (
                "A" if health_data["health_index"] >= 8 else
                "B" if health_data["health_index"] >= 6 else
                "C" if health_data["health_index"] >= 4 else
                "D"
            ),
        },
        "alerts": alerts,
        "recommendations": recommendations,
        "visit_trend": visit_trend,
        "production_summary": {
            "total_honey_kg": round(sum(p.honey_kg for p in productions), 2),
            "total_pollen_kg": round(sum(p.pollen_kg for p in productions), 2),
            "harvest_count": len(productions),
        },
    }


@router.get("/predict/{hive_id}")
def predict_visit_needs(hive_id: int, db: Session = Depends(get_db)):
    """
    Moteur de prédiction des besoins pour la prochaine visite.
    Basé sur :
      - Moyenne historique de consommation (5 dernières visites)
      - Saison du site (via l'apiary)
      - Type de fleur (via l'apiary)
      - État de santé actuel de la ruche
    """
    hive = db.query(BeeHive).filter(BeeHive.id == hive_id).first()
    if not hive:
        from fastapi import HTTPException
        raise HTTPException(404, "Hive not found")

    apiary = db.query(BeeApiary).filter(BeeApiary.id == hive.apiary_id).first()
    last_visits = (
        db.query(BeeVisit)
        .filter(BeeVisit.hive_id == hive_id)
        .order_by(desc(BeeVisit.visit_date))
        .limit(5)
        .all()
    )

    # ── Moyenne historique de consommation ───────────────────────────────────
    if last_visits:
        avg_sirop     = sum(v.needs_sirop     or 0 for v in last_visits) / len(last_visits)
        avg_pate      = sum(v.needs_pate      or 0 for v in last_visits) / len(last_visits)
        avg_traitement= sum(v.needs_traitement or 0 for v in last_visits) / len(last_visits)
    else:
        avg_sirop, avg_pate, avg_traitement = 5.0, 1.0, 0.0

    # ── Multiplicateurs saisonniers ──────────────────────────────────────────
    season = apiary.season if apiary else None
    SEASON_MULTIPLIERS = {
        "Printemps": {"sirop": 1.4, "pate": 1.3, "traitement": 0.8},
        "Eté":       {"sirop": 1.2, "pate": 1.0, "traitement": 0.6},
        "Automne":   {"sirop": 1.5, "pate": 1.2, "traitement": 1.2},
        "Hiver":     {"sirop": 1.8, "pate": 1.5, "traitement": 0.5},
    }
    mults = SEASON_MULTIPLIERS.get(season, {"sirop": 1.0, "pate": 1.0, "traitement": 1.0})

    # ── Bonus santé : ruche en mauvais état → plus de traitement ────────────
    health_score = hive.health_score or 7.0
    if health_score < 4:
        mults["traitement"] = min(mults["traitement"] * 1.8, 3.0)
    elif health_score < 6:
        mults["traitement"] = min(mults["traitement"] * 1.3, 2.5)

    # ── Bonus fleur : certaines flores réduisent le besoin en sirop ─────────
    flower_type = (apiary.flower_type or "").lower() if apiary else ""
    HIGH_NECTAR_FLOWERS = ["oranger", "eucalyptus", "lavande", "colza"]
    if any(f in flower_type for f in HIGH_NECTAR_FLOWERS):
        mults["sirop"] = max(0.5, mults["sirop"] - 0.3)

    # ── Calcul final + arrondi métier ────────────────────────────────────────
    pred_sirop      = round(avg_sirop      * mults["sirop"],      1)
    pred_pate       = round(avg_pate       * mults["pate"],       1)
    pred_traitement = round(avg_traitement * mults["traitement"])

    # Cadres : si colonie forte en printemps/été, on anticipe besoin hausse
    today_month = datetime.utcnow().month
    need_cadres = 0
    if (hive.force_level or 5) >= 7 and today_month in (3, 4, 5, 6, 7):
        need_cadres = 2

    return {
        "hive_id": hive_id,
        "hive_identifier": hive.identifier,
        "season": season,
        "flower_type": apiary.flower_type if apiary else None,
        "health_score": health_score,
        "visits_analyzed": len(last_visits),
        "predictions": {
            "sirop_L":      pred_sirop,
            "pate_kg":      pred_pate,
            "traitement":   pred_traitement,
            "cadres":       need_cadres,
        },
        "multipliers_applied": mults,
        "confidence": "high" if len(last_visits) >= 3 else "medium" if len(last_visits) >= 1 else "low",
        "note": "Basé sur historique + saison + fleur. Ajustez selon observation terrain.",
    }


@router.get("/colony-strength")
def colony_strength_overview(db: Session = Depends(get_db)):
    """
    Liebefeld-scale inspired colony strength assessment.
    Returns strength distribution across all hives.
    """
    hives = db.query(BeeHive).filter(BeeHive.is_active == True).all()
    today = datetime.utcnow()

    distribution = {"faible": 0, "moyenne": 0, "forte": 0, "tres_forte": 0}
    for h in hives:
        f = h.force_level or 5
        if f < 4:
            distribution["faible"] += 1
        elif f < 6:
            distribution["moyenne"] += 1
        elif f < 8:
            distribution["forte"] += 1
        else:
            distribution["tres_forte"] += 1

    return {
        "total_active": len(hives),
        "distribution": distribution,
        "avg_force": round(sum(h.force_level or 5 for h in hives) / len(hives), 2) if hives else 0,
        "assessment_date": today.isoformat(),
    }
