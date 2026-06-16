"""Smart Farm AI — IoT fine-tuning dataset builder.

Turns the IoT system's *documented behaviour* (irrigation logic, safety
detections, beehive alerts — the rules from the project dossier §5) plus any
*real* telemetry stored in the DB into an instruction-tuning dataset (chat
JSONL, ``{"messages": [...]}`` per line) that can fine-tune an LLM to act as
"Smart Farm AI". Also exposes a flat CSV export of the raw telemetry table.

The rule-derived examples are deterministic (one canonical answer per sensor
situation) so they give a clean, consistent training signal — the model learns
the exact decisions the system already makes, not invented ones.
"""
from __future__ import annotations

import csv
import io
import json
from typing import List, Dict, Any

SYSTEM_PROMPT = (
    "Tu es Smart Farm AI, l'assistant d'un système IoT agricole connecté en "
    "Tunisie (architecture MQTT + FastAPI). Tu pilotes l'irrigation selon "
    "l'humidité réelle du sol, tu surveilles le sol et les ruches, et tu "
    "détectes les anomalies (fuite, pompe à sec, panne). À partir des mesures "
    "des capteurs, donne un diagnostic court et l'action recommandée, en "
    "français, de façon claire et opérationnelle."
)

# Irrigation thresholds (dossier §5.1)
DRY = 30          # soil moisture (%) below which the soil is "too dry"
WET = 45          # soil moisture (%) at/above which irrigation stops
MORNING = range(5, 9)    # 05:00–08:59 favourable window
EVENING = range(18, 21)  # 18:00–20:59 favourable window


def _ex(user: str, assistant: str) -> Dict[str, Any]:
    return {"messages": [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user},
        {"role": "assistant", "content": assistant},
    ]}


def _irrigation_decision(moisture: int, hour: int) -> str:
    favorable = hour in MORNING or hour in EVENING
    if moisture >= WET:
        return (f"Sol suffisamment humide ({moisture} %). Aucune irrigation "
                "nécessaire — garder l'électrovanne fermée.")
    if DRY <= moisture < WET:
        return (f"Humidité correcte ({moisture} %), au-dessus du seuil sec "
                f"({DRY} %). Pas d'arrosage pour l'instant ; continuer à "
                "surveiller le sol.")
    # moisture < DRY → soil is too dry
    if favorable:
        return (f"Sol sec ({moisture} %) et créneau horaire favorable ({hour}h). "
                "→ Ouvrir l'électrovanne et démarrer la pompe (commande basse "
                "tension vers le contrôleur Akıllı). Arrêt automatique dès "
                f"~{WET} % d'humidité ou après la durée de sécurité, en "
                "respectant le délai minimal entre deux arrosages.")
    if 9 <= hour < 18:
        return (f"Sol sec ({moisture} %) mais en plein jour ({hour}h) : fort "
                "risque d'évaporation. Attendre le créneau du soir (18–21h) "
                "avant d'arroser, sauf seuil critique. Maintenir la vanne fermée.")
    return (f"Sol sec ({moisture} %) hors créneau ({hour}h). Planifier "
            "l'arrosage au prochain créneau du matin (5–9h) pour limiter "
            "l'évaporation.")


def _irrigation_examples() -> List[Dict[str, Any]]:
    out = []
    for moisture in (8, 15, 22, 28, 33, 40, 48, 60, 72):
        for hour in (6, 8, 11, 14, 17, 19, 22, 2):
            user = (f"Unité A (local pompe). Mesure du sol à {hour:02d}h00 : "
                    f"humidité = {moisture} %, sonde sol OK. Faut-il irriguer ?")
            out.append(_ex(user, _irrigation_decision(moisture, hour)))
    return out


def _safety_examples() -> List[Dict[str, Any]]:
    # Dossier §5.3 — security detections
    rules = [
        ("Vanne fermée mais le capteur de débit indique de l'eau qui circule.",
         "Anomalie : FUITE d'eau (débit alors que la vanne est fermée). → "
         "Arrêter la pompe immédiatement et envoyer une alerte à l'exploitant."),
        ("La pompe tourne mais le capteur de débit reste à zéro.",
         "Anomalie : POMPE À SEC (rotation sans débit). → Arrêter la pompe pour "
         "la protéger et alerter l'exploitant."),
        ("Pression du réseau anormalement haute par rapport à la normale.",
         "Anomalie : pression trop haute (bouchage / vanne fermée en aval "
         "probable). → Arrêter l'irrigation et alerter."),
        ("Pression du réseau anormalement basse pendant l'arrosage.",
         "Anomalie : pression trop basse (fuite ou filtre encrassé). → Arrêter "
         "l'irrigation et alerter."),
        ("Plus aucune communication entre l'Unité A et le serveur depuis "
         "plusieurs minutes.",
         "Coupure Internet détectée. → Passer en mode autonome local : l'Unité A "
         "poursuit l'irrigation selon les réglages enregistrés et son horloge de "
         "secours ; les données seront synchronisées au retour du réseau."),
        ("L'Unité B (rucher) ne donne plus signe de vie (heartbeat absent).",
         "Panne probable d'une unité. → Notifier l'exploitant d'une panne sur "
         "l'Unité B et vérifier l'alimentation solaire / la liaison sans fil."),
        ("Coupure de courant secteur au local pompe.",
         "L'électrovanne est normalement fermée (NF) : elle se ferme d'elle-même, "
         "aucun risque d'inondation. → Journaliser l'événement et alerter."),
    ]
    return [_ex(u, a) for u, a in rules]


def _beehive_examples() -> List[Dict[str, Any]]:
    # Dossier §5.4 — beehive alerts (parametrised where it helps)
    out = []
    out.append(_ex(
        "Unité B (rucher). La balance enregistre une chute soudaine du poids de "
        "la ruche (-1.8 kg en quelques minutes).",
        "Alerte : ESSAIMAGE probable (chute brutale de poids). → Inspecter la "
        "ruche immédiatement."))
    out.append(_ex(
        "Unité B. Le capteur de son détecte un changement net du bourdonnement "
        "de la colonie.",
        "Alerte : préparation à l'essaimage ou perte de la reine. → Inspecter la "
        "colonie."))
    out.append(_ex(
        "Unité B. Forte prise de poids régulière de la ruche sur la journée "
        "(+2.5 kg).",
        "Miellée en cours. → Préparer et poser une hausse supplémentaire."))
    for bt in (30.5, 33.0, 34.5, 35.5, 37.5):
        normal = 34 <= bt <= 36
        a = (f"Température du couvain = {bt} °C, dans la plage normale (34–36 °C). "
             "Colonie saine, pas d'action requise."
             if normal else
             f"Alerte : température du couvain anormale ({bt} °C, hors 34–36 °C). "
             "→ Problème de régulation thermique, vérifier la colonie.")
        out.append(_ex(f"Unité B. Sonde de couvain : {bt} °C.", a))
    out.append(_ex(
        "Unité B en hiver. Baisse de poids lente et régulière de la ruche.",
        "Comportement NORMAL en hiver : la colonie consomme ses réserves. Aucune "
        "action ; continuer le suivi du poids."))
    for v in (12.6, 11.8, 11.0):
        low = v < 11.5
        a = (f"Batterie solaire à {v} V : niveau correct, autonomie OK."
             if not low else
             f"Alerte : batterie solaire faible ({v} V). → Mettre l'Unité B en "
             "veille prolongée et vérifier le panneau solaire.")
        out.append(_ex(f"Unité B. Tension batterie = {v} V.", a))
    return out


def _architecture_examples() -> List[Dict[str, Any]]:
    return [
        _ex("Comment l'irrigation continue-t-elle si le WiFi de la ferme est "
            "coupé ?",
            "Grâce au mode autonome local : l'Unité A garde ses réglages en "
            "mémoire et utilise son horloge de secours pour poursuivre "
            "l'irrigation normalement. Les données sont synchronisées dès le "
            "retour de la connexion — les cultures ne sont jamais sans eau."),
        _ex("Le système remplace-t-il le contrôleur de pompe Akıllı ?",
            "Non. Smart Farm AI s'ajoute au contrôleur Akıllı sans le remplacer : "
            "il envoie seulement un signal marche/arrêt basse tension, comme un "
            "appui bouton. Toutes les protections d'origine (manque d'eau, "
            "surtension, surchauffe) restent maîtresses de la sécurité ; aucune "
            "intervention sur le 380 V."),
        _ex("Quelles sont les deux unités de terrain et leur rôle ?",
            "Unité A (local pompe, sur secteur) : gère l'irrigation — "
            "électrovanne, pompe, débit, pression, humidité et température du "
            "sol. Unité B (rucher, solaire autonome) : pèse la ruche, écoute le "
            "son de la colonie, mesure les températures, et transmet ses données "
            "à l'Unité A sans fil pour économiser sa batterie."),
    ]


def build_jsonl_examples(telemetry_rows: List[Dict[str, Any]] | None = None) -> List[Dict[str, Any]]:
    """Full instruction dataset: documented rules + any real telemetry."""
    examples: List[Dict[str, Any]] = []
    examples += _architecture_examples()
    examples += _irrigation_examples()
    examples += _safety_examples()
    examples += _beehive_examples()
    if telemetry_rows:
        examples += _telemetry_examples(telemetry_rows)
    return examples


def _telemetry_examples(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Turn real telemetry records into examples (best-effort, no fabrication:
    we restate the readings and apply the same rule base where keys are known)."""
    out = []
    for r in rows:
        m = r.get("metrics") or {}
        if not isinstance(m, dict) or not m:
            continue
        unit = r.get("unit_name") or f"unité {r.get('unit_id')}"
        ts = r.get("timestamp") or ""
        readings = ", ".join(f"{k} = {v}" for k, v in m.items())
        user = f"Unité « {unit} » ({ts}). Mesures capteurs : {readings}. Analyse."
        # Apply known rules if a soil-moisture or brood-temp key is present
        mk = {k.lower(): v for k, v in m.items()}
        moist = next((mk[k] for k in ("soil_moisture", "humidity", "humidite", "moisture") if k in mk), None)
        bt = next((mk[k] for k in ("brood_temp", "brood_temperature", "couvain") if k in mk), None)
        try:
            if moist is not None:
                assistant = _irrigation_decision(int(float(moist)), 7)
            elif bt is not None:
                btf = float(bt)
                assistant = (f"Couvain à {btf} °C : "
                             + ("normal (34–36 °C), colonie saine."
                                if 34 <= btf <= 36 else
                                "anormal (hors 34–36 °C), vérifier la colonie."))
            else:
                assistant = ("Lectures enregistrées. Aucune règle critique "
                             "déclenchée ; poursuivre la surveillance.")
        except (TypeError, ValueError):
            assistant = ("Lectures enregistrées ; poursuivre la surveillance.")
        out.append(_ex(user, assistant))
    return out


def to_jsonl(examples: List[Dict[str, Any]]) -> str:
    return "\n".join(json.dumps(e, ensure_ascii=False) for e in examples) + "\n"


def telemetry_to_csv(rows: List[Dict[str, Any]]) -> str:
    """Flat CSV of the raw telemetry table (metrics expanded to columns)."""
    metric_keys: List[str] = []
    for r in rows:
        m = r.get("metrics") or {}
        if isinstance(m, dict):
            for k in m:
                if k not in metric_keys:
                    metric_keys.append(k)
    header = ["timestamp", "unit_id", "unit_name", "unit_type", "source"] + metric_keys
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(header)
    for r in rows:
        m = r.get("metrics") or {}
        w.writerow([
            r.get("timestamp", ""), r.get("unit_id", ""), r.get("unit_name", ""),
            r.get("unit_type", ""), r.get("source", ""),
            *[(m.get(k, "") if isinstance(m, dict) else "") for k in metric_keys],
        ])
    return buf.getvalue()
