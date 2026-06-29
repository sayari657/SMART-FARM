# DeepForest microservice — détection de couronnes d'arbres

Service **optionnel** qui améliore la détection d'arbres du module Verger grâce au
modèle de deep learning **DeepForest** (RetinaNet pré-entraîné sur imagerie aérienne NEON).

Il tourne dans un **venv isolé** car DeepForest tire des dépendances lourdes
(`opencv-python-headless`, `rasterio`, `geopandas`, `pytorch-lightning`) qui entrent
en conflit avec la stack `opencv-python` / YOLO du backend principal.

## Fonctionnement
Le backend ([orchard_routes.py](../backend/app/api/v1/endpoints/orchard_routes.py))
envoie la mosaïque satellite à ce service **si `DEEPFOREST_URL` est défini**
(`backend/.env` → `DEEPFOREST_URL=http://localhost:8800`). Si le service est **éteint**,
le backend bascule automatiquement sur son **détecteur classique intégré** (DoG +
texture + ombre). Aucune dépendance dure : c'est un bonus de rappel.

```
POST /detect   (form-data)  file=<png>  mpp=<float opt>  species=<str opt>
→ { "width": W, "height": H, "trees": [{ "cx": x, "cy": y }], "engine": "deepforest" }
```

## Installation (une fois)
```bat
cd deepforest_service
py -3.10 -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
```

## Démarrage
```bat
start.bat
```
Le **premier appel** télécharge le modèle pré-entraîné depuis HuggingFace (~150 Mo).

## Notes
- DeepForest est entraîné sur ~0,10 m/px ; l'imagerie gratuite ici est ~0,48 m/px
  (Esri z18). Le service **sur-échantillonne** vers ~0,16 m/px (`TARGET_MPP`) avant
  inférence. À cette résolution, DeepForest n'est pas toujours meilleur que le
  détecteur classique — comparez sur votre terrain.
- Seuil de confiance réglable : `SCORE_THRESH` dans `service.py`.
- CPU par défaut ; une carte GPU CUDA accélère fortement `predict_tile`.
