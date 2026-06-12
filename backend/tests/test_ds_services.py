"""Tests unitaires des services Data Science (fonctions pures, sans réseau ni DB)."""
from datetime import datetime, timedelta

import numpy as np
import pytest

# ── agro_climate_service : GDD + stades + risques maladie ────────────────────

from app.services.agro_climate_service import (
    GDD_PHENOLOGY, compute_disease_risks, compute_gdd_series, predict_stage,
)


def _daily(n_days, tmax=30.0, tmin=18.0, rain=0.0, start="2026-05-01"):
    d0 = datetime.fromisoformat(start)
    return [{"date": (d0 + timedelta(days=i)).strftime("%Y-%m-%d"),
             "tmax": tmax, "tmin": tmin, "rain": rain} for i in range(n_days)]


def test_gdd_cumul_monotone_et_correct():
    series = compute_gdd_series(_daily(10, tmax=30, tmin=20), base=10.0)
    # ((30+20)/2 - 10) = 15 DJ/jour
    assert series[-1]["gdd_cum"] == pytest.approx(150.0)
    cums = [p["gdd_cum"] for p in series]
    assert cums == sorted(cums)


def test_gdd_jamais_negatif_en_hiver():
    series = compute_gdd_series(_daily(5, tmax=8, tmin=2), base=10.0)
    assert series[-1]["gdd_cum"] == 0.0


def test_predict_stage_olivier():
    res = predict_stage("olivier", 987.0)
    assert res["stade_actuel"]["stade"] == "nouaison"
    assert res["stade_suivant"]["stade"] == "durcissement_noyau"
    assert 0 <= res["progression_pct"] <= 100


def test_predict_stage_culture_inconnue():
    res = predict_stage("cactus", 500.0)
    assert "error" in res
    assert "olivier" in res["available"]


def test_toutes_les_cultures_gdd_ont_des_stades_croissants():
    for crop, cfg in GDD_PHENOLOGY.items():
        seuils = [s[0] for s in cfg["stades"]]
        assert seuils == sorted(seuils), crop


def test_risque_mildiou_regle_3_10():
    # 3 jours pluvieux et doux → mildiou élevé
    humide = _daily(10, tmax=22, tmin=14, rain=8.0)
    risks = {r["maladie"]: r for r in compute_disease_risks(humide)}
    assert risks["Mildiou"]["score"] >= 50
    # Sec et chaud → mildiou nul, oïdium favorisé
    sec = _daily(10, tmax=32, tmin=20, rain=0.0)
    risks_sec = {r["maladie"]: r for r in compute_disease_risks(sec)}
    assert risks_sec["Mildiou"]["score"] == 0
    assert risks_sec["Oïdium"]["score"] >= 50


# ── soil_water_service : pédotransfert + ET0 Hargreaves ──────────────────────

from app.services.soil_water_service import _hargreaves_et0, saxton_rawls_awc
from datetime import date


def test_saxton_rawls_ordres_de_grandeur():
    # Limon argileux : RU typique 100-200 mm/m
    awc = saxton_rawls_awc(sand_pct=40, clay_pct=25)
    assert 0.05 < awc["wilting_point"] < awc["field_capacity"] < 0.50
    assert 60 < awc["awc_mm_per_m"] < 250
    # Sable pur retient moins que l'argile
    sable = saxton_rawls_awc(sand_pct=85, clay_pct=5)
    argile = saxton_rawls_awc(sand_pct=15, clay_pct=45)
    assert sable["field_capacity"] < argile["field_capacity"]


def test_hargreaves_et0_ete_superieur_hiver():
    ete = _hargreaves_et0(36.8, date(2026, 7, 15), tmin=22, tmax=36)
    hiver = _hargreaves_et0(36.8, date(2026, 1, 15), tmin=6, tmax=14)
    assert ete > hiver > 0
    assert 4 < ete < 12          # mm/j plausible pour Tunis en juillet


# ── bee_swarm_service : features + score expert ──────────────────────────────

from app.services.bee_swarm_service import expert_score, extract_features


def _hive_series(weights, start="2026-05-01 00:00:00"):
    t0 = datetime.fromisoformat(start)
    return [{"ts": (t0 + timedelta(hours=i)).strftime("%Y-%m-%d %H:%M:%S"),
             "weight": w, "hive_temp": 35.0} for i, w in enumerate(weights)]


def test_chute_brutale_donne_score_critique():
    # Stable à 40 kg puis chute de 2 kg dans la dernière heure (mai = saison)
    series = _hive_series([40.0] * 47 + [38.0])
    f = extract_features(series)
    assert f["delta_1h"] == pytest.approx(-2.0)
    score, signals = expert_score(f)
    assert score >= 70
    assert any("Chute brutale" in s for s in signals)


def test_poids_stable_donne_score_faible():
    series = _hive_series([40.0] * 48)
    score, _ = expert_score(extract_features(series))
    assert score <= 30           # uniquement le bonus saison éventuel


# ── anomaly_ml_service : matrice + explicabilité ─────────────────────────────

from app.services.anomaly_ml_service import _build_matrix, _contributions


class _Rec:
    def __init__(self, m):
        self.metrics = m


def test_build_matrix_impute_et_filtre():
    recs = [_Rec({"temp": 20.0, "hum": 60}), _Rec({"temp": 21.0}),
            _Rec({"hum": 58, "mode": "ONLINE"}), _Rec({})]
    X, names, rows = _build_matrix(recs)
    assert names == ["hum", "temp"]
    assert X.shape == (3, 2)             # le record vide est exclu
    assert not np.isnan(X).any()          # imputation par moyenne


def test_contributions_designent_la_feature_deviante():
    recs = [_Rec({"temp": 20.0 + 0.1 * i, "hum": 60.0}) for i in range(30)]
    recs.append(_Rec({"temp": 45.0, "hum": 60.0}))
    X, names, rows = _build_matrix(recs)
    contribs = _contributions(X, len(rows) - 1, names)
    assert list(contribs)[0] == "temp"   # temp = contribution dominante


# ── poultry_survival_service : observations Kaplan-Meier ─────────────────────

from app.services.poultry_survival_service import _batch_observations


class _Batch:
    arrival_date = datetime.utcnow() - timedelta(days=30)
    created_at = arrival_date
    initial_quantity = 100
    current_quantity = 90


class _Log:
    def __init__(self, day, deaths):
        self.date = _Batch.arrival_date + timedelta(days=day)
        self.deaths_today = deaths


def test_observations_censure_les_survivants():
    durations, events, weights = _batch_observations(
        _Batch(), [_Log(5, 4), _Log(12, 6)])
    # 2 groupes d'événements + 1 groupe censuré
    assert sum(w for e, w in zip(events, weights) if e == 1) == 10
    assert sum(w for e, w in zip(events, weights) if e == 0) == 90
    # Les survivants sont censurés à l'âge actuel (30 j)
    censored_idx = events.index(0)
    assert durations[censored_idx] == 30


# ── price_history_service : honnêteté de la prévision ────────────────────────

from app.services import price_history_service as phs


def test_forecast_refuse_historique_insuffisant(tmp_path, monkeypatch):
    monkeypatch.setattr(phs, "HISTORY_PATH", tmp_path / "ph.json")
    res = phs.forecast_price("olive")
    assert res["status"] == "insufficient_history"
    assert res["points_collected"] == 0
