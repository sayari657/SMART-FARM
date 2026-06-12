# Diagrammes Mermaid — Rapport PFE Smart Farm AI v3.0

Conversion en **Mermaid** des **32 diagrammes** du rapport LaTeX (`cycle final (1).zip`),
fidèles aux figures originales et ancrés sur le code réel du projet
(`backend/app/models/domain.py`, `auth_routes.py`, `cv_routes.py`, `bee_history.py`,
`bee_planning.py`, `main.py`, `docker-compose.yml`).

## Contenu

| Fichier | Diagrammes | Figures sources |
|---|---|---|
| [01_cas_utilisation.md](01_cas_utilisation.md) | **7** cas d'utilisation : global + 6 détails (Auth, Surveillance, IA, Ouvrier, Apiculture, Aviculture) | `UC_Global.png`, `UC_Detail_*.png` |
| [02_diagrammes_classes.md](02_diagrammes_classes.md) | **8** diagrammes de classes : P0 vue d'ensemble + P1–P7 par package (38 classes SQLAlchemy) | `P0..P7_*.png` |
| [03_diagrammes_sequence.md](03_diagrammes_sequence.md) | **5** séquences : SD1 JWT, SD2 OTP WhatsApp, SD3 IoT REST→CSV, SD4 détection YOLO+RAG, SD5 flux apicole | `SD1..SD5_*.png` |
| [04_architecture.md](04_architecture.md) | **5** architectures : globale, 4 couches, composants, déploiement Docker, MapCenter | `architecture_*.png` |
| [05_processus.md](05_processus.md) | **7** processus : KDD, SEMMA, CRISP-DM, planification projet, pipeline multimodal, entraînement YOLOv11n, répartition données | `kdd/semma/crispdm/...png` |

## Visualisation

- **VS Code** : extension *Markdown Preview Mermaid Support* → aperçu direct (`Ctrl+Shift+V`).
- **GitHub / GitLab** : rendu natif des blocs ```mermaid```.
- **mermaid.live** : copier-coller un bloc pour l'éditer / exporter en PNG/SVG.
- **Export CLI** : `npx -p @mermaid-js/mermaid-cli mmdc -i fichier.md -o sortie.png`.

## Choix de fidélité

- Les noms de champs suivent `domain.py` (ex. `thumbnail_url` et non `image_url`,
  `is_actioned` et non `is_applied`, `force_level` et non `force_score`) — comme les
  encarts « Champs corrects » des figures originales.
- SD3 reflète l'architecture IoT **réelle** : REST → `iot_telemetry.csv` (pas de broker MQTT
  dans `main.py`), Node A sol / Node B ruche.
- A4 (déploiement) est ancré sur le `docker-compose.yml` réel : `db` (PostGIS 16-3.5),
  `redis`, `mosquitto`, `backend` (uvicorn :8000), `frontend` (nginx :80), `caddy` optionnel.
- La figure Napkin A1 mentionnait « YOLOv8 11 classes » ; corrigé en **YOLOv11, 12 modèles**
  conformément au reste du rapport et au code (`MODEL_REGISTRY`).
