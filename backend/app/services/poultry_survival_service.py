"""
Poultry Survival Service — analyse de survie des lots de volaille
==================================================================
Statistique de survie rigoureuse sur la mortalité réelle des lots :

  - Estimateur **Kaplan-Meier** par lot (lifelines) : chaque mort de
    PoultryHealthLog.deaths_today est un événement à l'âge t (jours depuis
    arrival_date) ; les oiseaux encore vivants (current_quantity) sont
    **censurés à droite** à l'âge actuel du lot.
  - Survie à J42 (âge d'abattage broiler standard) et J56.
  - Comparaison entre lots par test du **log-rank** (p-value).
  - Repère sectoriel : un lot broiler bien conduit garde S(42) ≥ 0,96
    (mortalité cumulée ≤ 4 %, guides Ross 308 / Cobb 500).

Dégradation propre si lifelines absent ou données insuffisantes.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)

try:
    import numpy as np
    from lifelines import KaplanMeierFitter
    from lifelines.statistics import logrank_test
    _LIFELINES = True
except ImportError:                                    # pragma: no cover
    _LIFELINES = False
    logger.warning("lifelines absent — analyse de survie désactivée")

BENCHMARK_S42 = 0.96     # survie attendue à J42 (mortalité ≤ 4 %)


def _batch_observations(batch, health_logs) -> tuple[list, list, list]:
    """(durations, events, weights) au format lifelines pondéré."""
    arrival = batch.arrival_date or batch.created_at
    now_age = max(1, (datetime.utcnow() - arrival).days)

    durations, events, weights = [], [], []
    total_deaths = 0
    for log in health_logs:
        deaths = int(log.deaths_today or 0)
        if deaths <= 0:
            continue
        age = max(0, (log.date - arrival).days)
        durations.append(min(age, now_age))
        events.append(1)
        weights.append(deaths)
        total_deaths += deaths

    # Survivants censurés à l'âge actuel
    initial = int(batch.initial_quantity or 0)
    alive = batch.current_quantity if batch.current_quantity is not None else initial - total_deaths
    alive = max(0, int(alive))
    if alive > 0:
        durations.append(now_age)
        events.append(0)
        weights.append(alive)

    return durations, events, weights


def _km_summary(kmf: "KaplanMeierFitter", now_age: int) -> dict[str, Any]:
    def s_at(day: int):
        try:
            return round(float(kmf.predict(day)), 4)
        except Exception:
            return None

    curve = []
    sf = kmf.survival_function_
    for t, row in sf.iterrows():
        curve.append({"day": int(t), "survival": round(float(row.iloc[0]), 4)})

    median = kmf.median_survival_time_
    return {
        "survival_at_42d": s_at(min(42, now_age)),
        "survival_at_56d": s_at(min(56, now_age)),
        "median_survival_days": None if median == float("inf") else float(median),
        "curve": curve[-60:],
    }


def analyze_farm_survival(db, farm_id: int) -> dict[str, Any]:
    """Kaplan-Meier par lot + comparaison log-rank entre lots d'une ferme."""
    if not _LIFELINES:
        return {"available": False, "reason": "lifelines non installé"}

    from app.models.domain import PoultryBatch, PoultryHealthLog

    batches = (
        db.query(PoultryBatch)
        .filter(PoultryBatch.farm_id == farm_id)
        .order_by(PoultryBatch.arrival_date.desc())
        .limit(10)
        .all()
    )
    if not batches:
        return {"available": False, "reason": "Aucun lot de volaille pour cette ferme"}

    results = []
    fitted = {}            # batch_id -> (durations, events, weights)
    for batch in batches:
        logs = (
            db.query(PoultryHealthLog)
            .filter(PoultryHealthLog.batch_id == batch.id)
            .order_by(PoultryHealthLog.date.asc())
            .all()
        )
        durations, events, weights = _batch_observations(batch, logs)
        if not durations or sum(weights) < 2:
            continue

        arrival = batch.arrival_date or batch.created_at
        now_age = max(1, (datetime.utcnow() - arrival).days)
        kmf = KaplanMeierFitter()
        kmf.fit(np.array(durations), np.array(events), weights=np.array(weights),
                label=batch.name)
        summary = _km_summary(kmf, now_age)
        fitted[batch.id] = (durations, events, weights)

        total_deaths = sum(w for e, w in zip(events, weights) if e == 1)
        initial = int(batch.initial_quantity or 0)
        mortality_pct = round(100 * total_deaths / initial, 2) if initial else None
        s42 = summary["survival_at_42d"]

        results.append({
            "batch_id": batch.id,
            "name": batch.name,
            "batch_type": batch.batch_type,
            "breed": batch.breed,
            "age_days": now_age,
            "initial_quantity": initial,
            "deaths": int(total_deaths),
            "mortality_pct": mortality_pct,
            **summary,
            "vs_benchmark": (
                None if s42 is None else
                "conforme" if s42 >= BENCHMARK_S42 else "sous le standard Ross/Cobb (S42 ≥ 96 %)"
            ),
        })

    # Log-rank entre les 2 lots les plus récents comparables
    logrank = None
    ids = [r["batch_id"] for r in results]
    if len(ids) >= 2:
        a, b = fitted[ids[0]], fitted[ids[1]]
        try:
            lr = logrank_test(
                np.array(a[0]), np.array(b[0]),
                event_observed_A=np.array(a[1]), event_observed_B=np.array(b[1]),
                weights_A=np.array(a[2]), weights_B=np.array(b[2]),
            )
            logrank = {
                "batches": [results[0]["name"], results[1]["name"]],
                "p_value": round(float(lr.p_value), 4),
                "significant": bool(lr.p_value < 0.05),
                "interpretation": (
                    "Différence de survie significative entre les deux lots"
                    if lr.p_value < 0.05 else
                    "Pas de différence de survie significative (α = 5 %)"
                ),
            }
        except Exception as exc:
            logger.warning("log-rank impossible : %s", exc)

    return {
        "available": bool(results),
        "method": "Kaplan-Meier (lifelines), censure à droite des survivants",
        "benchmark_s42": BENCHMARK_S42,
        "batches": results,
        "logrank": logrank,
    }
