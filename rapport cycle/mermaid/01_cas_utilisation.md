# Diagrammes de Cas d'Utilisation — Smart Farm AI v3.0

> Versions Mermaid des 7 diagrammes UC du rapport (`figures/UC_*.png`).
> Acteurs : **Propriétaire/Admin** (web React) et **Ouvrier** (PWA mobile hors-ligne).
> Conventions : flèches pointillées = relations `«include»` / `«extend»`.

---

## UC-0 — Diagramme de cas d'utilisation global
*Figure source : `UC_Global.png` — 8 sous-systèmes, 21+ cas d'utilisation*

```mermaid
flowchart LR
    OUV["🧑‍🌾 Ouvrier<br/>(PWA Mobile)"]
    PROP["👨‍💼 Propriétaire / Admin<br/>(Web React)"]

    subgraph PKG1["📱 Module Ouvrier PWA — hors-ligne"]
        UC01(["Consulter Tâches"])
        UC02(["Soumettre Rapport Terrain"])
        UC03(["Scanner QR Code"])
    end

    subgraph PKG2["🔐 Authentification & Sécurité"]
        UC04(["Vérifier PIN hors-ligne"])
        UC05(["S'authentifier — JWT"])
        UC06(["Authentification OTP"])
    end

    subgraph PKG3["📊 Surveillance & Télémétrie"]
        UC07(["Visualiser Tableau de Bord"])
        UC08(["Consulter Télémétrie"])
        UC09(["Consulter Alertes"])
    end

    subgraph PKG4["📦 Entrepôt & Rapports"]
        UC10(["Gérer Entrepôt"])
        UC11(["Générer Rapports"])
        UC12(["Configurer Seuils"])
    end

    subgraph PKG5["🗺️ Gestion des Fermes"]
        UC13(["Gérer Fermes & Unités"])
        UC14(["Gérer Ouvriers"])
        UC15(["Visualiser Carte GIS"])
    end

    subgraph PKG6["🤖 Intelligence Artificielle"]
        UC16(["Détection CV — YOLO"])
        UC17(["Consulter Recommandations"])
        UC18(["Assistant IA — Chat"])
    end

    subgraph PKG7["🐝 Module Apiculture"]
        UC19(["Gérer Ruches & Ruchers"])
        UC20(["Enregistrer Visites"])
        UC21(["Gérer Stock & Planning"])
        UC22(["Consulter Marché Apicole"])
    end

    subgraph PKG8["🐔 Module Aviculture ERP"]
        UC23(["Gérer Lots — Broiler/Layer"])
        UC24(["Enregistrer Production"])
        UC25(["Gérer Santé & Ventes"])
        UC26(["Valider Logs — Data Contract"])
    end

    %% Associations Ouvrier
    OUV --- UC01
    OUV --- UC02
    OUV --- UC03
    OUV --- UC04
    OUV --- UC05

    %% Associations Propriétaire
    PROP --- UC05
    PROP --- UC07
    PROP --- UC08
    PROP --- UC10
    PROP --- UC11
    PROP --- UC12
    PROP --- UC13
    PROP --- UC14
    PROP --- UC15
    PROP --- UC16
    PROP --- UC18
    PROP --- UC19
    PROP --- UC20
    PROP --- UC22
    PROP --- UC23
    PROP --- UC24
    PROP --- UC25
    PROP --- UC26

    %% Relations include / extend
    UC05 -. "«extend»" .-> UC06
    UC08 -. "«include»" .-> UC09
    UC16 -. "«include»" .-> UC17
    UC20 -. "«extend»" .-> UC21

    classDef actor fill:#fff3cd,stroke:#b8860b,stroke-width:2px
    class OUV,PROP actor
```

---

## UC-1 — Détail : Authentification & Sécurité
*Figure source : `UC_Detail_Auth.png` — endpoints réels de `auth_routes.py`*

```mermaid
flowchart LR
    PROP["👨‍💼 Propriétaire<br/>(Web React)"]
    OUV["🧑‍🌾 Ouvrier<br/>(PWA Mobile)"]

    subgraph WEB["Espace Propriétaire — Web"]
        UC1(["S'inscrire<br/>POST /api/v1/auth/register"])
        UC2(["S'authentifier<br/>POST /api/v1/auth/login"])
        UC3(["Réinitialiser mot de passe<br/>POST /auth/forgot-password/email ou /whatsapp<br/>puis POST /auth/reset-password"])
        UC4(["Enregistrer Token Push<br/>POST /api/v1/auth/push-token"])
    end

    subgraph PWA["Espace Ouvrier — PWA"]
        UC5(["Vérifier PIN hors-ligne<br/>Dexie IndexedDB"])
        UC6(["Demander OTP<br/>POST /auth/worker/request-otp"])
        UC7(["Vérifier OTP & obtenir JWT<br/>POST /auth/worker/verify-otp"])
    end

    PROP --- UC1
    PROP --- UC2
    PROP --- UC3
    PROP --- UC4
    OUV --- UC5
    OUV --- UC6
    OUV --- UC7

    UC3 -. "«extend» — canal WhatsApp" .-> UC6
    UC7 -. "«include»" .-> UC6

    N1["📝 Login par username + password<br/>(pas par email)<br/>JWT HS256 — validité 7 jours"]:::note
    N2["📝 OTP 6 chiffres via WhatsApp Cloud API<br/>recherche du worker par phone_number<br/>TTL 5 minutes"]:::note

    N1 -.- UC2
    N2 -.- UC6

    classDef actor fill:#fff3cd,stroke:#b8860b,stroke-width:2px
    classDef note fill:#fffbe6,stroke:#d4a017,stroke-dasharray: 5 5
    class PROP,OUV actor
```

---

## UC-2 — Détail : Surveillance & Télémétrie
*Figure source : `UC_Detail_Surveillance.png` — endpoints réels*

```mermaid
flowchart LR
    PROP["👨‍💼 Propriétaire"]

    subgraph SURV["Surveillance & Télémétrie"]
        UC1(["Visualiser Tableau de Bord<br/>GET /api/v1/dashboard"])
        UC2(["Lire Télémétrie IoT<br/>GET /api/v1/iot/latest<br/>GET /api/v1/iot/history"])
        UC3(["Consulter Alertes<br/>GET /api/v1/alerts"])
        UC4(["Consulter Télémétrie Animaux<br/>GET /api/v1/telemetry/unit_id"])
        UC5(["Visualiser Anomalies<br/>Isolation Forest"])
        UC6(["Voir Événements CV<br/>GET /api/v1/cv/events"])
        UC7(["Consulter Données Météo<br/>API Open-Meteo"])
    end

    PROP --- UC1
    PROP --- UC4
    PROP --- UC6
    PROP --- UC7

    UC1 -. "«include»" .-> UC2
    UC1 -. "«include»" .-> UC3
    UC4 -. "«include»" .-> UC5

    N1["📝 Architecture IoT réelle :<br/>les nœuds POSTent sur /api/v1/iot/telemetry<br/>qui écrit dans iot_telemetry.csv ;<br/>le frontend lit via GET /api/v1/iot/latest"]:::note
    N2["📝 Node A : sol — humidité, pression, débit, temp<br/>Node B : ruche — poids, temp couvain, temp ext, hum ext"]:::note

    N1 -.- UC2
    N2 -.- UC2

    classDef actor fill:#fff3cd,stroke:#b8860b,stroke-width:2px
    classDef note fill:#fffbe6,stroke:#d4a017,stroke-dasharray: 5 5
    class PROP actor
```

---

## UC-3 — Détail : Intelligence Artificielle
*Figure source : `UC_Detail_IA.png`*

```mermaid
flowchart LR
    PROP["👨‍💼 Propriétaire"]

    subgraph IA["Intelligence Artificielle"]
        UC1(["Détecter Maladies Plantes<br/>YOLO feuilles / olive / agrumes"])
        UC2(["Diagnostiquer Santé<br/>Bétail / Volaille"])
        UC3(["Détecter Insectes & Feu/Fumée<br/>YOLO"])
        UC4(["Consulter Recommandations<br/>RAG + LLaVA"])
        UC5(["Consulter Alertes IA"])
        UC6(["Consulter Assistant IA<br/>Chat multimodal image + texte"])
    end

    PROP --- UC1
    PROP --- UC2
    PROP --- UC3
    PROP --- UC6

    UC1 -. "«include»" .-> UC4
    UC2 -. "«include»" .-> UC4
    UC3 -. "«include»" .-> UC5

    N1["📝 12 modèles YOLOv11 spécialisés :<br/>bee, goat, cow, sheep, livestock, leaves,<br/>olive, insects, lemon, orange, fire, plants"]:::note
    N2["📝 Pipeline : ChromaDB RAG → LLaVA Ollama →<br/>Recommandation → WebSocket"]:::note

    N1 -.- UC3
    N2 -.- UC4

    classDef actor fill:#fff3cd,stroke:#b8860b,stroke-width:2px
    classDef note fill:#fffbe6,stroke:#d4a017,stroke-dasharray: 5 5
    class PROP actor
```

---

## UC-4 — Détail : Module Ouvrier (PWA)
*Figure source : `UC_Detail_Ouvrier.png`*

```mermaid
flowchart LR
    ADMIN["👨‍💼 Admin / Propriétaire<br/>(Web)"]
    OUV["🧑‍🌾 Ouvrier<br/>(PWA Mobile)"]

    subgraph WEB["Côté Admin — Web"]
        UC1(["Assigner Tâches"])
        UC2(["Consulter Rapports de Terrain"])
    end

    subgraph PWA["Côté Ouvrier — PWA hors-ligne"]
        UC3(["Consulter Tâches Assignées"])
        UC4(["Synchronisation Hors-ligne<br/>Dexie IndexedDB"])
        UC5(["Authentification OTP<br/>WhatsApp uniquement"])
        UC6(["Soumettre Rapport Terrain<br/>+ Photos base64"])
        UC7(["Scanner QR Code<br/>Ruche / Animal"])
    end

    ADMIN --- UC1
    ADMIN --- UC2
    OUV --- UC3
    OUV --- UC5
    OUV --- UC6
    OUV --- UC7

    UC1 -. "«include»" .-> UC3
    UC4 -. "«include»" .-> UC3

    N1["📝 Sync automatique :<br/>GET /api/v1/worker-tasks<br/>POST /api/v1/worker/reports"]:::note
    N2["📝 QR code → tag_id unique<br/>de la table animal_units"]:::note

    N1 -.- UC4
    N2 -.- UC7

    classDef actor fill:#fff3cd,stroke:#b8860b,stroke-width:2px
    classDef note fill:#fffbe6,stroke:#d4a017,stroke-dasharray: 5 5
    class ADMIN,OUV actor
```

---

## UC-5 — Détail : Module Apiculture
*Figure source : `UC_Detail_Bee.png`*

```mermaid
flowchart LR
    PROP["👨‍💼 Propriétaire / Apiculteur"]

    subgraph BEE["Module Apiculture"]
        UC1(["Gérer Ruchers & Ruches"])
        UC2(["Enregistrer Visite d'Inspection"])
        UC3(["Gérer Stock Apicole<br/>Sirop / Pâte / Traitement / Cadres"])
        UC4(["Planifier Missions<br/>Inspection / Traitement"])
        UC5(["Suivre Production<br/>Miel / Pollen"])
        UC6(["Gérer Dépenses Apicoles"])
        UC7(["Consulter Marché Apicole<br/>Prix Matériel Haddad"])
        UC8(["Consulter Score Santé<br/>Analytics"])
        UC9(["Alertes Stock Minimum"])
    end

    PROP --- UC1
    PROP --- UC2
    PROP --- UC5
    PROP --- UC6
    PROP --- UC7
    PROP --- UC8

    UC2 -. "«extend» — si besoin détecté" .-> UC3
    UC2 -. "«extend» — mission auto-créée" .-> UC4
    UC3 -. "«include»" .-> UC9

    N1["📝 Score santé /api/v1/bee/analytics :<br/>poids 40 % + fréquence visites 25 %<br/>+ qualité reine 20 % + force 15 %<br/>(alertes méthode COLOSS BeeBook)"]:::note
    N2["📝 GET /api/v1/bee/market :<br/>scraping du catalogue apiculture-haddad.com"]:::note

    N1 -.- UC8
    N2 -.- UC7

    classDef actor fill:#fff3cd,stroke:#b8860b,stroke-width:2px
    classDef note fill:#fffbe6,stroke:#d4a017,stroke-dasharray: 5 5
    class PROP actor
```

---

## UC-6 — Détail : Module Aviculture ERP
*Figure source : `UC_Detail_Poultry.png`*

```mermaid
flowchart LR
    PROP["👨‍💼 Propriétaire"]

    subgraph POULTRY["Module Aviculture ERP"]
        UC1(["Créer / Gérer Lots<br/>Broiler / Layer / Breeder"])
        UC2(["Enregistrer Consommation Alimentaire<br/>calcul FCR"])
        UC3(["Enregistrer Production d'Œufs<br/>taux de ponte"])
        UC4(["Suivre Santé & Mortalité<br/>vaccinations"])
        UC5(["Enregistrer Ventes<br/>Volaille / Œufs"])
        UC6(["Consulter Analyse ML"])
        UC7(["Valider / Rejeter Logs<br/>Data Contract"])
        UC8(["Gérer Inventaire<br/>Aliments / Médicaments"])
    end

    PROP --- UC1
    PROP --- UC2
    PROP --- UC3
    PROP --- UC4
    PROP --- UC5
    PROP --- UC6
    PROP --- UC7
    PROP --- UC8

    UC2 -. "«include»" .-> UC1
    UC3 -. "«include»" .-> UC1
    UC4 -. "«include»" .-> UC1
    UC5 -. "«include»" .-> UC1
    UC6 -. "«include»" .-> UC1
    UC7 -. "«extend»" .-> UC2
    UC7 -. "«extend»" .-> UC3

    N1["📝 FCR = kg aliment / kg gain de poids"]:::note
    N2["📝 Data Contract :<br/>PATCH /logs/type/id/validate<br/>status : pending → validated | rejected"]:::note
    N3["📝 GET /poultry/ml-insights/farm_id :<br/>tendance FCR, taux ponte, mortalité"]:::note

    N1 -.- UC2
    N2 -.- UC7
    N3 -.- UC6

    classDef actor fill:#fff3cd,stroke:#b8860b,stroke-width:2px
    classDef note fill:#fffbe6,stroke:#d4a017,stroke-dasharray: 5 5
    class PROP actor
```
