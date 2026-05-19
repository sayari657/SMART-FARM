# Analyse Complète — Smart Farm AI v3.0
## Système de Gestion Agricole Intelligente

---

## 1. Vue d'Ensemble du Projet

**Smart Farm AI** est un système de gestion agricole enterprise multi-espèces avec IoT, Vision par Ordinateur (IA), ERP avicole, et gestion des ouvriers en mode offline-first (PWA).

| Dimension | Détail |
|-----------|--------|
| **Type** | Application Web Full-Stack + PWA mobile |
| **Version** | v3.0-Enterprise |
| **Backend** | FastAPI (Python) + SQLAlchemy + PostgreSQL |
| **Frontend** | React 18 + Vite + Zustand + Dexie (offline) |
| **IA** | YOLO (ultralytics) + RAG (ChromaDB) + MLLM (Ollama/LLaVA) |
| **IoT** | MQTT (Mosquitto) + WebSockets temps réel |
| **Modules** | Apiculture, Aviculture ERP, Élevage, Plantations, Entrepôt |

---

## 2. Architecture Globale

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React 18 + PWA)                    │
│  35+ Pages │ Leaflet/MapLibre GIS │ Three.js 3D │ Recharts      │
│  Zustand State │ Dexie Offline DB │ i18next AR/FR              │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP/REST + WebSocket
┌──────────────────────────▼──────────────────────────────────────┐
│                    BACKEND (FastAPI v3.5)                        │
│  24 Routers │ JWT Auth │ RBAC │ WebSocket Manager               │
│  15 Core Models │ 10 Bee Models │ 5 Poultry Models             │
└──────┬──────────────┬──────────────┬───────────────────────────┘
       │              │              │
┌──────▼──────┐ ┌─────▼──────┐ ┌───▼────────────────────────────┐
│ PostgreSQL  │ │ MQTT Broker│ │ IA Stack                        │
│ + GeoAlch.  │ │(Mosquitto) │ │ YOLO │ ChromaDB │ Ollama LLaVA │
│ PostGIS     │ │ IoT Sensors│ │ MLflow │ sentence-transformers  │
└─────────────┘ └────────────┘ └────────────────────────────────┘
```

---

## 3. Entités & Relations Clés

### 3.1 Domaine Principal

```
User (owner/worker/operator)
 ├── possède ──> Farm [1..*]
 │               ├── contient ──> AnimalUnit [1..*]
 │               │                ├── équipé de ──> Sensor [1..*]
 │               │                ├── génère ───> TelemetryRecord [1..*]
 │               │                ├── surveille -> CVEvent [1..*]
 │               │                ├── déclenche -> Anomaly [1..*]
 │               │                └── déclenche -> Alert [1..*]
 │               │                                  └── génère ─> Recommendation
 │               ├── emploie ──> WorkerAssignment [1..*]
 │               ├── génère ───> Report [1..*]
 │               └── configure -> Settings
 └── reçoit ──> WorkerTask [1..*]
```

### 3.2 Module Apiculture

```
BeeApiary (rucher)
 └── regroupe ──> BeeHive [1..*] (ruche)
                  ├── inspecté par ──> BeeVisit [1..*]
                  ├── produit ──────> BeeProduction [1..*]
                  └── stock alloué -> BeeHiveStock [1]
BeeGlobalStock (entrepôt singleton)
BeePlanning ──> BeePlanningTask [1..*]
BeeExpense
```

### 3.3 Module Aviculture (ERP)

```
PoultryBatch (lot broiler/layer/breeder)
 ├── alimentation ──> PoultryFeedLog [1..*]  + FCR
 ├── production ────> PoultryEggLog [1..*]   + taux ponte
 ├── santé ─────────> PoultryHealthLog [1..*] + mortalité
 └── ventes ────────> PoultrySale [1..*]
PoultryInventory (aliments / médicaments / équipements)
```

---

## 4. Flux Métier Principaux

### Flux 1 : Télémétrie IoT → Alerte
```
Capteur MQTT → TelemetryRecord → Isolation Forest → Anomaly
→ Alert → Recommendation → WebSocket → Dashboard temps réel
```

### Flux 2 : Vision par Ordinateur
```
Photo → YOLO Detection → CVEvent → RAG (ChromaDB)
→ LLaVA Multimodal → Recommendation → Alert si critique
```

### Flux 3 : Ouvrier PWA (offline-first)
```
OTP WhatsApp → JWT → Sync Dexie → Tâches offline
→ Scan QR → Photos → Submit sync en ligne → Backend
```

### Flux 4 : Gestion Apicole
```
Visite ruche → Besoins détectés → Planning auto
→ Stock check → Alert si insuffisant → Dépense enregistrée
```

---

## 5. Technologies & Dépendances

### Backend (Python)
| Catégorie | Technologies |
|-----------|-------------|
| Framework | FastAPI 0.100+, Uvicorn, SQLAlchemy 2.0 |
| Base de données | PostgreSQL, GeoAlchemy2, PostGIS, SQLite (fallback) |
| Authentification | python-jose (JWT HS256), bcrypt |
| IA / CV | ultralytics (YOLO), torch, Pillow |
| IA Souveraine | chromadb, ollama, langchain, sentence-transformers |
| IoT | paho-mqtt |
| APIs externes | requests, httpx, beautifulsoup4 |
| MLOps | mlflow, DVC |

### Frontend (JavaScript)
| Catégorie | Technologies |
|-----------|-------------|
| Framework | React 18.2, React Router 6, Vite 5.1 |
| UI | Lucide React, React Hot Toast |
| Graphiques | Recharts |
| Cartes | Leaflet, React-Leaflet, MapLibre GL |
| 3D | Three.js, @react-three/fiber |
| État | Zustand, React Query, AuthContext |
| Offline | Dexie (IndexedDB), vite-plugin-pwa |
| i18n | i18next (Arabe / Français) |
| Export | jsPDF, html2canvas, xlsx |

---

## 6. Sécurité

| Mécanisme | Détail |
|-----------|--------|
| Authentification | JWT HS256, expiration 7 jours |
| Hachage | bcrypt avec salt |
| OTP | 6 chiffres, TTL 5 min, Email / WhatsApp |
| RBAC | Roles: owner, worker, operator |
| WebSocket | Token JWT par connexion, isolation par tenant |
| CORS | Origines restreintes (localhost dev + production) |

---

## 7. Fichiers de Diagrammes UML

| Fichier | Contenu |
|---------|---------|
| `use_case_diagram.puml` | Diagramme de cas d'utilisation complet (5 acteurs, 35+ UC) |
| `class_diagram.puml` | Diagramme de classes (8 packages, 35+ classes) |
| `sequence_diagrams.puml` | 5 diagrammes de séquence (Auth JWT, OTP, Télémétrie, CV, Apiculture) |

### Rendu des diagrammes
Ouvrir avec :
- **PlantUML** : `java -jar plantuml.jar *.puml`
- **VS Code** : Extension "PlantUML" (jebbs.plantuml)
- **En ligne** : https://www.plantuml.com/plantuml/
- **IntelliJ** : Plugin PlantUML Integration

---

## 8. Statistiques du Projet

| Métrique | Valeur |
|----------|--------|
| Routes API | 24 routers, ~120 endpoints |
| Modèles DB | 35+ tables SQLAlchemy |
| Pages Frontend | 35+ pages React |
| Composants | 100+ composants (dont 33 spécifiques apiculture) |
| Modèles IA | 10 modèles YOLO (feuilles, olive, insectes, abeilles, feu...) |
| Acteurs Système | Propriétaire, Ouvrier, IoT, IA, API Externe |
| Langues | Arabe + Français (i18n complet) |
| Mode | Online (WebSocket) + Offline (Dexie PWA) |
