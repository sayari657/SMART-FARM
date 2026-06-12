# Scénario de démo — soutenance PFE (12-15 min)

> Préparation (la veille) : `docker compose up` OU backend local + `npm run dev` ;
> `chroma run --path .chroma_data --port 8001` ; téléphone connecté au WhatsApp
> du compte owner ; 3 images de test prêtes sur le bureau (feuille mildiou,
> abeille varroa, photo saine).

## Acte 1 — Le problème (1 min)
Un fermier tunisien gère bétail + oliviers + ruches sans données.
Smart Farm AI = plateforme souveraine (héberge ses propres modèles, fonctionne
en Derja, résiste aux coupures réseau).

## Acte 2 — Vision par ordinateur (4 min)
1. **Page Arbres** → scanner PlantVillage → glisser la photo *feuille mildiou*
   → top-3 avec traduction FR/AR, barres rouges → toast « envoyée au Moniteur »
2. Cliquer le badge **ℹ️ 38 classes** → montrer les traductions AR/FR/EN
   (argument : accessibilité du fellah)
3. **Dashboard APICRAFT** → scanner santé colonie → photo *abeille varroa*
   → diagnostic 97,9 % + recommandation COLOSS (acide oxalique)
4. Mentionner : 21 modèles YOLO, MLflow, DVC — montrer la matrice de confusion

## Acte 3 — Data Science prédictive (4 min)
1. **Carte essaimage** (même page) : score temps réel depuis la balance IoT
   ESP32 + « Modèle ML (HiveEyes) » → expliquer le blend 60/40
2. **Page Arbres** → panneau **GDD** : olivier 987 DJ = nouaison (données
   ERA5 réelles) + **risques maladie** : oïdium 70 % aujourd'hui
3. Ouvrir une figure **SHAP** (mlops/ds_report/shap/) : « le modèle s'explique »
4. **Carte** → bouton 🛰️ **NDVI** : santé végétale satellite de la Tunisie

## Acte 4 — La boucle se ferme (3 min)
1. **Moniteur Souverain** (/alerts) : la détection mildiou de l'Acte 2 y est
   → badge CRITIQUE → **Assigner ouvrier** → choisir un ouvrier + note
2. Le téléphone sonne : **WhatsApp + push reçus en direct** (alerte ferme)
3. Panneau **Calendrier Agricole Tunisien** : actions du mois, zone auto-détectée

## Acte 5 — Rigueur expérimentale (2 min, pour le jury)
- Tableau éval RAG : embeddings 76 % Hit@1 vs mots-clés 68 %, MAIS gap arabe
  (95,7 % vs 100 %) → discussion modèle multilingue
- PR-AUC essaimage 0,056 = 11× le hasard, validation temporelle → honnêteté
  sur la difficulté d'anticiper à 6 h
- Drift PSI, A/B testing, active learning, conformal → MLOps complet

## Questions probables du jury — réponses préparées
| Question | Réponse courte |
|---|---|
| « 99 % sur PlantVillage, overfitting ? » | Dataset facile (fonds uniformes), limite connue de PlantVillage vs PlantDoc (images terrain, 30 classes, plus dur) — j'ai les deux |
| « Pourquoi pas de deep learning sur l'essaimage ? » | 167 positifs seulement → GBDT + features expertes plus robuste ; LSTM = perspective |
| « Souveraineté = ? » | Modèles auto-hébergés, RAG local ChromaDB, fallback hors-ligne, données en Tunisie |
| « Ça marche sans internet ? » | Fallback mots-clés RAG (Hit@3 100 %), modèles locaux, PWA ouvrier ; météo = seule dépendance externe (cache 6 h) |
