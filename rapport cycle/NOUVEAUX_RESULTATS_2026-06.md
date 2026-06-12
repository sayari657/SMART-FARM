# Nouveaux résultats expérimentaux — à intégrer au mémoire (juin 2026)

Tous les chiffres ci-dessous sont **mesurés** sur le code et les données du projet
(aucune valeur estimée). Figures prêtes en 300 dpi.

---

## 1. Évaluation quantitative du RAG agronomique (50 questions gold FR + Derja)

Jeu d'évaluation : `backend/tests/rag_eval/rag_eval_dataset.json` (50 questions,
23 entrées KB, méthodologie type RAGAS sans juge LLM externe — souveraineté).

| Backend retrieval | Hit@1 | Hit@3 | MRR | Context Precision@3 |
|---|---|---|---|---|
| Mots-clés (fallback hors-ligne) | 68,0 % | **100 %** | 0,827 | 50,0 % |
| ChromaDB — embeddings MiniLM-L6-v2 | **76,0 %** | 98,0 % | **0,863** | **56,3 %** |

Ventilation par langue (ChromaDB) :

| Langue | Hit@3 | MRR |
|---|---|---|
| Français | 100 % | 0,944 |
| Derja/Arabe | 95,7 % | 0,768 |

**Discussion (à rédiger)** : les embeddings améliorent la précision au rang 1
(+8 pts) mais *régressent en arabe* — all-MiniLM-L6-v2 est entraîné
majoritairement sur l'anglais. Le fallback mots-clés, dont les entrées KB
contiennent des mots-clés arabes natifs, reste meilleur en Derja.
→ Perspective : modèle multilingue (paraphrase-multilingual-MiniLM-L12-v2).

LaTeX : tableaux dans `tests/rag_eval/results/rag_eval_20260611_*.md`.

## 2. Classification santé colonie d'abeilles (BeeImage, 5 172 images)

- Modèle : YOLOv8n-cls, 10 epochs, 128 px, CPU i5-12450H (7,7 min)
- **Top-1 = 97,9 %** (514 images val, 6 classes), inférence 1,6 ms/image
- Par classe : ant_problems 100 %, healthy 100 %, missing_queen 100 %,
  hive_being_robbed 96 %, varroa 89–94 % (confusion uniquement entre les
  2 étiquettes varroa quasi-synonymes du dataset)
- ⚠️ Limite à signaler : frames issues de rafales vidéo → un split aléatoire
  peut surestimer l'accuracy (recommandation : group split par ruche/date)
- Figures : `mlruns_yolo/bee_health_cls/confusion_matrix_normalized.png`, `results.png`
- Déployé : `POST /cv/classify?category=bee_health` + scanner UI + alertes

## 3. Classification PlantVillage (54 305 images, 38 classes)

- Modèle : YOLOv8n-cls, 12 epochs, 128 px, CPU (1 h 29)
- **Top-1 = 99,0 % · Top-5 = 100 %** (5 386 images val), inférence 1,1 ms/image
- Figures : `mlruns_yolo/plantvillage_cls/confusion_matrix_normalized.png`, `results.png`
- Déployé : `POST /cv/classify?category=plantvillage` + scanner UI page Arbres

## 4. Prédiction d'essaimage (HiveEyes — Würzburg & Schwartau, 2017-2019)

- 32 508 fenêtres horaires, 167 essaimages auto-labellisés
  (chute ≥ 1 kg/h non récupérée à +24 h), classe positive = 0,51 %
- GradientBoosting, validation temporelle TimeSeriesSplit (4 folds)
- **PR-AUC = 0,056** (≈ 11× le hasard à 0,005) ; in-sample : précision 0,99 / rappel 0,62
- Importances : pente 7 j (0,28) > Δ24 h (0,26) > Δ1 h (0,26) > T° couvain (0,18)
- **Figures SHAP** (explicabilité) : `mlops/ds_report/shap/`
  - `shap_summary_swarm.png` (beeswarm), `shap_waterfall_swarm.png`
    (décomposition d'une alerte), `shap_bar_swarm.png`
- Déployé : blend 60 % règles expertes + 40 % ML dans `/bee/analytics/swarm-risk`
- Discussion honnête : anticiper à 6 h reste difficile — la littérature fait
  surtout de la détection temps réel (Zacepins et al., 2016)

## 5. Phénologie GDD + risques maladie météo-pilotés

- Source : Open-Meteo Archive ERA5 (gratuite, sans clé) + retry forecast
- Validation terrain (Tunis, 11 juin 2026) : olivier à **987 DJ** (base 10 °C)
  → stade *nouaison*, 48 % vers durcissement noyau — conforme au calendrier AVFA
- Indices de risque calculés le même jour : oïdium 70 % (juin chaud-sec ✓),
  mouche olive 35 % (987/1350 DJ), mildiou 0 % (pas de pluie) ✓
- 6 cultures modélisées (olivier, vigne, agrumes, tomate, blé dur, amandier)
- Règles : 3-10 Goidanich (mildiou), DJ Bactrocera oleae, fenêtres T°/pluie

## 6. Détection d'anomalies IoT + prévision conforme

- IsolationForest (contamination 5 %) sur fenêtres 48 h multi-métriques ;
  explicabilité par z-scores stockée dans `feature_contributions`
- Test : point anormal → score −0,347 (critique) vs médiane +0,068
- Prévision conforme (split-conformal, Vovk 2005) : couverture cible 90 %,
  calibration sur backtest k=min(30, n/3) — intervalles garantis sans
  hypothèse distributionnelle

## 7. Infrastructure ajoutée

- Couche NDVI satellite : NASA GIBS WMTS, VIIRS NOAA-20 8 jours (sans clé)
- Calendrier agricole tunisien : 4 zones agroclimatiques, notifications
  WhatsApp + push (gel quotidien, digest mensuel, risques maladie)
- 6 jobs APScheduler (drift, audit, plans, push santé, calendrier, anomalies IF)
- Traductions trilingues FR/EN/AR des ~160 classes des 21 modèles YOLO
