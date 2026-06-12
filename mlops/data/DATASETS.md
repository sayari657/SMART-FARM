# Datasets externes — guide de téléchargement

Prérequis Kaggle (une seule fois) :
1. Compte Kaggle → Settings → API → *Create New Token* → placer `kaggle.json` dans `C:\Users\<user>\.kaggle\`
2. `pip install kaggle`

| Dataset | Usage dans le projet | Commande |
|---|---|---|
| **Beehive metrics** (HiveEyes — poids/T° ruches Würzburg & Schwartau, 2 ans) | `mlops/train_swarm_model.py` → modèle ML d'essaimage consommé par `bee_swarm_service` | `kaggle datasets download se18m502/bee-hive-metrics -p mlops/data/bee_hive_metrics --unzip` |
| **PlantVillage** (54 305 images, 38 classes maladies) | `mlops/train_plantvillage.py` → classifieur 38 pathologies pour la page Arbres | `kaggle datasets download abdallahalidev/plantvillage-dataset -p mlops/data/plantvillage --unzip` |
| **Honey Bee Annotated Images** (BeeImage, ~5 100 images, santé colonie) | `mlops/train_varroa.py` → diagnostic varroa/reine manquante/pillage | `kaggle datasets download jenny18/honey-bee-annotated-images -p mlops/data/bee_health --unzip` |

## APIs sans téléchargement (déjà intégrées au backend)

| Source | Usage | Clé requise |
|---|---|---|
| **Open-Meteo Archive (ERA5)** | Phénologie GDD + risques maladie (`agro_climate_service`) | Non |
| **Open-Meteo Forecast** | Météo actuelle, alertes gel | Non |
| **NASA GIBS WMTS** (VIIRS NOAA-20 NDVI 8 jours) | Couche satellite NDVI de la carte (`SovereignMap`) | Non |

## Pistes supplémentaires (non intégrées)

- Dermatose nodulaire bovins : `kaggle datasets download saurabhshahane/lumpy-skin-disease-dataset`
- Maladies volaille par fientes : `kaggle datasets download allandclive/chicken-disease-1`
- Audio ruche (présence reine) : `kaggle datasets download chrisfilo/to-bee-or-no-to-bee`
- Prix de gros tunisiens : ONAGRI (http://www.onagri.tn) — scraping à prévoir
- Propriétés des sols : API REST SoilGrids ISRIC (https://rest.isric.org/soilgrids) — sans clé
