# Figures Data Science et Intelligence Artificielle

Ce dossier contient des figures academiques construites a partir des artefacts
reels du projet Smart Farm AI.

## Chapitre pret pour le rapport

Le fichier `CHAPITRE_DATA_SCIENCE_IA.md` contient un chapitre academique complet
avec la methodologie, les tableaux de resultats, l'analyse des modeles, les
legendes et les figures deja integrees.

## Figures recommandees

1. `images/01_structure_dataset_abeilles`
   - Structure BeeData: train, validation, test, quatre classes et configuration YOLO OBB.
   - A utiliser dans la section « Jeu de donnees et preparation ».
2. `images/02_predictions_qualitatives_abeilles`
   - Exemples reels de sorties du modele sur des images.
   - A utiliser dans la section « Resultats qualitatifs ».
3. `images/03_courbes_entrainement_abeilles`
   - Box loss, classification loss, precision, rappel et mAP sur 120 epoques.
   - A utiliser dans la section « Entrainement et convergence ».
4. `images/04_synthese_performance_abeilles`
   - Synthese des performances a la meilleure epoque.
   - A utiliser dans la section « Evaluation quantitative ».
5. `images/05_eda_telemetrie_apicole`
   - Series temporelles, distributions et correlations sur 2 000 observations.
   - A utiliser dans la section « Analyse exploratoire des donnees ».
6. `images/06_detection_anomalies_telemetrie`
   - Projection PCA, scores Isolation Forest et contribution des variables.
   - A utiliser dans la section « Detection non supervisee des anomalies ».
7. `images/07_pipeline_mlops_active_learning`
   - Chaine DVC, entrainement, MLflow, deploiement, drift et active learning.
   - A utiliser dans la section « MLOps et cycle de vie des modeles ».
8. `images/08_fiche_modele_poulet` a `images/12_fiche_modele_insectes`
   - Fiches detaillees: courbes, matrices ou performances par classe,
     hyperparametres et meilleures metriques.
   - A utiliser dans les sections « Modelisation » et « Evaluation ».
9. `images/13_comparaison_modeles_yolov11`
   - Comparaison des performances et des principaux hyperparametres.
   - A utiliser dans la synthese experimentale.

Les figures vectorielles sont disponibles en PNG et SVG. Les fiches de modeles
08 a 12 sont en PNG haute resolution, car elles integrent des sorties raster
originales de YOLO.

Les images originales en pleine resolution, matrices de confusion, predictions,
parametres YAML et metriques CSV sont classees dans `modeles_cv/`.

## Sources

- `ai_assets/animal_weights/bee/final_export/results.csv`
- `ai_assets/animal_weights/bee/final_export/args.yaml`
- `ai_assets/animal_weights/bee/final_export/beedata_kaggle.yaml`
- `ai_assets/animal_weights/bee/final_export/predictions/`
- `mlops/data/telemetry_dataset.csv`
- `dvc.yaml`
- `backend/app/services/active_learning_service.py`
- `backend/app/services/drift_detection_service.py`

Les images brutes du dataset BeeData sont referencees sur Kaggle mais ne sont
pas presentes dans le depot local. La figure 1 montre donc la structure declaree
du dataset sans inventer de nombres d'images par classe.

## Regeneration

```powershell
python diagramme/05_DataScience_Rapport/scripts/generate_figures.py
python diagramme/05_DataScience_Rapport/scripts/generate_external_model_figures.py
npx.cmd --yes @mermaid-js/mermaid-cli -i diagramme/05_DataScience_Rapport/sources/07_pipeline_mlops_active_learning.mmd -o diagramme/05_DataScience_Rapport/images/07_pipeline_mlops_active_learning.svg -b white
```
