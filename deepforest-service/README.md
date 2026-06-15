# DeepForest Microservice — Tree-crown detection

Detects **every** tree crown (even in dense canopy) using the pretrained
DeepForest model — far better recall than the backend's OpenCV fallback. Runs in
its **own venv with its own torch**, so it never conflicts with the main
backend's torch 2.11 / 30 YOLO models.

## Architecture
```
Browser ──"Détecter"──▶ Smart Farm backend ──fetch Esri image──▶ (image)
                              │
                              ├── POST image ──▶ DeepForest service (:8800)  ← THIS
                              │                   predict_tile → crown centroids
                              ◀── centroids ──────┘
                              └── pixel→GPS, create OrchardTree rows
```
The microservice does **only** ML inference. Imagery, georeferencing and DB stay
in the main backend.

## Setup & run (one command)
```powershell
powershell -ExecutionPolicy Bypass -File deepforest-service\setup_and_run.ps1
```
First run downloads torch + the pretrained crown model (~1–2 GB, once).

Then point the backend at it — in `backend/.env`:
```
DEEPFOREST_URL=http://localhost:8800
```
Restart the backend. Now « Détecter (vue) » / « Détecter une zone » use
DeepForest automatically (the response shows `engine: deepforest`).

## Endpoints
- `GET  /health` → `{status, model}`
- `POST /detect` (multipart `file`, optional `patch`, `overlap`) →
  `{ width, height, count, trees:[{cx,cy,score}] }`

## Notes
- `patch` (default 400 px) = tiling window; smaller = more, smaller crowns.
- CPU inference works; a GPU is much faster for large areas.
- If `DEEPFOREST_URL` is unset or the service is down, the backend falls back to
  the built-in OpenCV detector — nothing breaks.
