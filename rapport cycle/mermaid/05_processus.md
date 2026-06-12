# Diagrammes de Processus & Méthodologie — Smart Farm AI v3.0

> Versions Mermaid des 7 diagrammes de processus du rapport
> (KDD, SEMMA, CRISP-DM, planification projet, pipeline multimodal, entraînement YOLO, répartition des données).

---

## M1 — Processus KDD (Knowledge Discovery in Databases)
*Figure source : `kdd_process.png`*

```mermaid
flowchart LR
    DATA[("📦 Data")]
    TD["Target Data"]
    PD["Preprocessed Data"]
    TRD["Transformed Data"]
    PAT["📊 Patterns"]
    KNW[("🧠 Knowledge")]

    DATA -- "Selection" --> TD
    TD -- "Preprocessing" --> PD
    PD -- "Transformation" --> TRD
    TRD -- "Data Mining" --> PAT
    PAT -- "Interpretation / Evaluation" --> KNW

    KNW -. "feedback" .-> DATA
    PAT -. "feedback" .-> TRD
    TRD -. "feedback" .-> PD
```

---

## M2 — Méthodologie SEMMA
*Figure source : `semma_process.png`*

```mermaid
flowchart LR
    S["🎯 Sample<br/><i>Generate a representative<br/>sample of the data</i>"]
    E["🔍 Explore<br/><i>Visualization and basic<br/>description of the data</i>"]
    M["🔧 Modify<br/><i>Select variables, transform<br/>variable representations</i>"]
    MD["🤖 Model<br/><i>Use a variety of statistical<br/>and machine learning models</i>"]
    A["✅ Assess<br/><i>Evaluate the accuracy and<br/>usefulness of the models</i>"]

    S --> E --> M --> MD --> A
    A -. "itération" .-> S
```

---

## M3 — Cycle CRISP-DM (générique)
*Figure source : `crispdm_process.png`*

```mermaid
flowchart TB
    BU["💼 Compréhension<br/>du Métier"]
    DU["📊 Compréhension<br/>des Données"]
    DP["🧹 Préparation<br/>des Données"]
    MO["🤖 Modélisation"]
    EV["✅ Évaluation"]
    DE["🚀 Déploiement"]
    DATA[("💾 Données")]

    BU <--> DU
    DU --> DP
    DP <--> MO
    MO --> EV
    EV --> DE
    EV -- "retour si objectifs non atteints" --> BU

    DATA -.- BU
    DATA -.- DP
    DATA -.- MO
    DATA -.- EV

    DE -. "cycle continu" .-> BU
```

---

## M4 — Phases de planification du projet selon CRISP-DM
*Figure source : `phases_planification_smart_farm_crispdm.png`*

```mermaid
flowchart LR
    P1["1. Compréhension métier<br/><b>Identification des Besoins</b><br/><i>Analyse des processus agricoles et<br/>définition des exigences fonctionnelles<br/>et non fonctionnelles</i>"]
    P2["2. Compréhension des données<br/><b>Inventaire des Sources</b><br/><i>Identification et caractérisation<br/>de toutes les sources de<br/>données nécessaires</i>"]
    P3["3. Préparation des données<br/><b>Transformation des Données</b><br/><i>Augmentation des images, normalisation<br/>des séries temporelles, découpage des<br/>documents et validation croisée</i>"]
    P4["4. Modélisation<br/><b>Entraînement des Modèles</b><br/><i>Fine-tuning YOLOv11, entraînement de<br/>modèles ML avicoles, indexation RAG<br/>et détection d'anomalies IoT</i>"]
    P5["5. Évaluation<br/><b>Validation des Modèles</b><br/><i>Validation statistique avec métriques et<br/>intervalles de confiance, identification<br/>des menaces à la validité</i>"]
    P6["6. Déploiement<br/><b>Mise en Production</b><br/><i>Déploiement sur l'infrastructure de la<br/>ferme avec architecture Docker,<br/>PWA et fallback LLM</i>"]

    P1 ==> P2 ==> P3 ==> P4 ==> P5 ==> P6
```

---

## M5 — Pipeline multimodal de l'Assistant IA
*Figure source : `pipeline_multimodal_assistant_smart_farm_ai.png` — 6 étapes*

```mermaid
flowchart TB
    S1["1️⃣ Image d'Entrée<br/><i>Image 640px JPEG qualité 0.7 chargée</i>"]
    S2["2️⃣ Vision et OCR Parallèles<br/><i>LLaVA / Groq-V et pytesseract<br/>s'exécutent simultanément</i>"]
    S3["3️⃣ Requête Enrichie<br/><i>Descriptions visuelles et<br/>texte OCR combinés</i>"]
    S4["4️⃣ Recherche ChromaDB<br/><i>Récupère les 3 meilleurs<br/>fragments de contexte</i>"]
    S5["5️⃣ Génération LLM<br/><i>Labess-7B / Groq-70B génère<br/>la réponse en Darija</i>"]
    S6["6️⃣ Réponse Finale<br/><i>Réponse Darija renvoyée<br/>à l'utilisateur</i>"]

    S1 --> S2 --> S3 --> S4 --> S5 --> S6
```

---

## M6 — Processus d'entraînement du modèle YOLOv11n
*Figure source : `processus_entrainement_yolov11n.png` — 9 étapes*

```mermaid
flowchart LR
    E1["📦 Jeu de données<br/><i>14 820 images collectées<br/>pour l'entraînement</i>"]
    E2["🔄 Augmentation<br/><i>Mosaic, HSV et Flip</i>"]
    E3["🧠 YOLOv11n<br/><i>C3k2 + SPPELAN + PSA<br/>initialisé</i>"]
    E4["📉 Perte<br/><i>CIoU + BCE + DFL calculée<br/>après le passage avant</i>"]
    E5["⚙️ Optimisation<br/><i>AdamW avec cosine LR</i>"]
    E6["✅ Validation<br/><i>mAP@50 après<br/>chaque époque</i>"]
    E7["💾 Checkpoint<br/><i>meilleur modèle sauvegardé<br/>sous best.pt</i>"]
    E8["📤 Export<br/><i>best.pt exporté<br/>pour l'inférence</i>"]
    E9["🚀 Inférence<br/><i>≤ 180 ms sur CPU</i>"]

    E1 --> E2 --> E3 --> E4 --> E5 --> E6 --> E7 --> E8 --> E9
    E6 -. "époques suivantes" .-> E4
```

---

## M7 — Répartition des données YOLO (14 820 images)
*Figure source : `repartition_donnees_yolo.png`*

```mermaid
pie showData title Répartition des Données YOLO — 14 820 images
    "Entraînement (70 %)" : 10374
    "Validation (20 %)" : 2964
    "Test (10 %)" : 1482
```

```mermaid
flowchart LR
    DS[("📦 Dataset YOLO<br/>14 820 images")]
    TR["🏋️ Entraînement<br/>10 374 images — 70 %<br/><i>utilisées pour entraîner le modèle</i>"]
    VA["✅ Validation<br/>2 964 images — 20 %<br/><i>valident les performances du modèle</i>"]
    TE["🧪 Test<br/>1 482 images — 10 %<br/><i>évaluation finale du modèle</i>"]

    DS --> TR
    DS --> VA
    DS --> TE
```
