# Diagrammes d'Architecture — Smart Farm AI v3.0

> Versions Mermaid des 5 diagrammes d'architecture du rapport (`figures/architecture_*.png`).
> Note : la figure Napkin originale mentionnait « YOLOv8 11 classes » ; le reste du rapport
> et le code utilisent **YOLOv11 (12 modèles spécialisés)** — c'est la version retenue ici.

---

## A1 — Architecture globale du système
*Figure source : `architecture_smart_farm.png`*

```mermaid
flowchart LR
    subgraph EDGE["🌡️ Couche IoT — Edge"]
        ESPA[("ESP32-A<br/>Irrigation — sol")]
        ESPB[("ESP32-B<br/>Ruche")]
        PWAW["📱 PWA Worker<br/>Dexie offline"]
    end

    MQTT["Mosquitto<br/>MQTT Broker"]

    CORE["⚙️ FastAPI<br/>151 endpoints REST + 2 WebSocket"]

    subgraph SVC["🧠 Services IA & Frontend"]
        YOLO["YOLOv11<br/>12 modèles spécialisés"]
        SKL["scikit-learn<br/>+ MLflow"]
        OLL["Ollama RAG + LLM<br/>Labess-7B"]
        REACT["React 18 SPA<br/>+ PWA"]
    end

    PG[("PostgreSQL 16<br/>GeoAlchemy2 / PostGIS")]
    CHR[("ChromaDB<br/>Vecteurs RAG")]

    ESPA -- "MQTT QoS 1" --> MQTT
    ESPB -- "MQTT QoS 1" --> MQTT
    MQTT -- "paho-mqtt" --> CORE
    PWAW -- "HTTP sync" --> CORE

    CORE -- "REST / WebSocket" --> YOLO
    CORE --> SKL
    CORE --> OLL
    CORE --> REACT

    YOLO --> PG
    SKL --> PG
    OLL --> CHR
```

---

## A2 — Architecture applicative en 4 couches
*Figure source : `architecture_applicative_smart_farm.png`*

```mermaid
mindmap
  root((Smart Farm AI<br/>Architecture<br/>Applicative))
    🎨 Couche Présentation
      React 18 SPA
      Vite 5
      Three.js
      Leaflet / MapLibre
      i18next
      PWA
    ⚙️ Couche Application
      FastAPI
      Uvicorn ASGI
      Pydantic 2.10
    🧠 Couche Services
      YOLOv11
      Ollama Labess-7B
      ChromaDB RAG
      MLflow
      scikit-learn
    💾 Couche Données
      PostgreSQL 16
      GeoAlchemy2
      SQLite WAL
      MQTT Mosquitto
      ESP32 x2
```

---

## A3 — Architecture des composants
*Figure source : `architecture_composants_smart_farm.png` — 8 composants*

```mermaid
flowchart TB
    HUB(("🌱 Smart Farm AI"))

    CVS["🔍 CVService<br/>Traite les images pour la<br/>reconnaissance d'objets"]
    AGS["🤖 AgentService<br/>Gère les interactions et les<br/>données avec ChromaDB"]
    MLS["📈 MLService<br/>Exécute des modèles<br/>d'apprentissage automatique"]
    IOS["📡 IoTService<br/>Connecte les appareils<br/>IoT via MQTT"]
    SPA["🖥️ React SPA<br/>Fournit une interface<br/>utilisateur interactive"]
    PWA["📱 PWA Worker<br/>Améliore les performances et<br/>la fiabilité de l'application"]
    TJS["🧊 Three.js<br/>Crée des visualisations 3D"]
    GIS["🗺️ GIS<br/>Gère les données cartographiques<br/>et les analyses"]

    HUB --- CVS
    HUB --- AGS
    HUB --- MLS
    HUB --- IOS
    HUB --- SPA
    HUB --- PWA
    HUB --- TJS
    HUB --- GIS
```

---

## A4 — Architecture de déploiement Docker
*Figure source : `architecture_deploiement_docker.png` — ancrée sur le `docker-compose.yml` réel*

```mermaid
flowchart TB
    NET["🌍 Internet / Clients"]

    subgraph DOCKER["🐳 Docker Compose — réseau interne"]
        CADDY["Caddy 2 (optionnel)<br/>HTTPS auto Let's Encrypt<br/>:80 / :443"]
        NGINX["frontend — nginx<br/>React build statique<br/>proxy /api/v1 → backend<br/>:80"]
        BACK["backend — FastAPI<br/>uvicorn 2 workers<br/>:8000"]
        DB[("db — PostgreSQL 16<br/>postgis/postgis:16-3.5<br/>:5432")]
        REDIS[("redis 7-alpine<br/>cache + sessions<br/>:6379")]
        MQTT["mosquitto 2<br/>MQTT broker<br/>:1883 / :9001 WS"]
    end

    ESP["📟 ESP32 Node A / B<br/>capteurs IoT"]

    VOL1[/"volume postgres_data"/]
    VOL2[/"volume sqlite_data<br/>(mode LITE)"/]
    VOL3[/"volume mosquitto_data + log"/]

    NET --> CADDY
    CADDY --> NGINX
    NET -. "sans domaine : port 80 direct" .-> NGINX
    NGINX -- "proxy /api/v1" --> BACK
    BACK --> DB
    BACK --> REDIS
    BACK <--> MQTT
    ESP -- "MQTT 1883" --> MQTT
    DB --- VOL1
    BACK --- VOL2
    MQTT --- VOL3
```

---

## A5 — Flux de données du module MapCenter
*Figure source : `architecture_flux_donnees_mapcenter.png` — 8 étapes*

```mermaid
flowchart TB
    S1["1️⃣ Collecte de données<br/>IoT MQTT → PostgreSQL<br/><i>Les données des ruches IoT sont envoyées<br/>via MQTT et stockées dans PostgreSQL</i>"]
    S2["2️⃣ Traitement des données<br/>PostgreSQL → /geo/hives<br/><i>Télémétrie récupérée de PostgreSQL et<br/>formatée en GeoJSON via SQLAlchemy</i>"]
    S3["3️⃣ Affichage des ruches<br/>/geo/hives → MapLibre GL<br/><i>GeoJSON chargé dans MapLibre avec<br/>popups de télémétrie par ruche</i>"]
    S4["4️⃣ Récupération météo<br/>Open-Meteo → /weather/coords<br/><i>Données météo récupérées de l'API<br/>Open-Meteo et formatées en JSON</i>"]
    S5["5️⃣ Affichage de la météo<br/>/weather/coords → Badge météo<br/><i>Météo et risques affichés<br/>sur un badge météo</i>"]
    S6["6️⃣ Récupération des données OSM<br/>Overpass OSM → proxy /geo/overpass<br/><i>Vétérinaires récupérés de l'API Overpass<br/>OSM via un proxy backend</i>"]
    S7["7️⃣ Affichage des vétérinaires<br/>/geo/overpass → MapLibre GL<br/><i>Vétérinaires affichés dans<br/>un rayon de 100 km</i>"]
    S8["8️⃣ Position de l'utilisateur<br/>Browser GPS → Cercle précision + Zoom<br/><i>Position GPS du navigateur : cercle de<br/>précision et ajustement du zoom</i>"]

    S1 --> S2 --> S3 --> S4 --> S5 --> S6 --> S7 --> S8
```
