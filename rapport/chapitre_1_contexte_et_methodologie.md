# Table des matières
- [Introduction Générale](#introduction-générale)
- [Chapitre 1 : Contexte général et méthodologie](#chapitre-1--contexte-général-et-méthodologie)
  - [1.1 Introduction](#11-introduction)
  - [1.2 Présentation de l’organisme d’accueil](#12-présentation-de-lorganisme-daccueil)
  - [1.3 Contexte du Projet Smart Farm AI](#13-contexte-du-projet-smart-farm-ai)
    - [1.3.1 Étude de l’Existant](#131-étude-de-lexistant)
    - [1.3.2 Problématique](#132-problématique)
    - [1.3.3 Objectifs et KPIs](#133-objectifs-et-kpis)
    - [1.3.4 Solution Proposée](#134-solution-proposée)
    - [1.3.5 Motivations](#135-motivations)
    - [1.3.6 Contraintes](#136-contraintes)
    - [1.3.7 Limites et risques du projet](#137-limites-et-risques-du-projet)
    - [1.3.8 Éthique et gouvernance des données](#138-éthique-et-gouvernance-des-données)
  - [1.4 Gestion de Projet](#14-gestion-de-projet)
  - [1.5 Choix de la Méthodologie](#15-choix-de-la-méthodologie)
  - [1.6 Conclusion](#16-conclusion)

---

# Introduction Générale

### L’Agriculture à l’Ère du Numérique
L’agriculture constitue depuis des millénaires le pilier fondamental de la civilisation humaine. Nourrir une population mondiale en constante croissance — estimée à près de 9,7 milliards d’individus à l’horizon 2050 selon les projections des Nations Unies — représente l’un des défis les plus cruciaux du XXIe siècle [1]. Face à ce défi, les pratiques agricoles traditionnelles montrent aujourd’hui leurs limites face aux impératifs de productivité, de durabilité et de résilience climatique.

En Tunisie, secteur agricole emploie environ 16% de la population active et contribue à hauteur de 10% au PIB national [2]. Pourtant, les exploitations agricoles tunisiennes font face à des contraintes structurelles majeures : la raréfaction des ressources en eau, la montée des températures, les attaques parasitaires imprévisibles et la faiblesse des infrastructures numériques en zone rurale. Ces facteurs combinés génèrent des pertes économiques considérables et compromettent la sécurité alimentaire nationale.

### Les Limites de l’Agriculture Traditionnelle
Les méthodes conventionnelles de gestion agricole reposent encore largement sur l’observation empirique et les décisions manuelles. Plusieurs problématiques récurrentes ont été identifiées lors de l’étude préliminaire :
- **Gaspillage hydrique :** Les systèmes d’irrigation traditionnels (gravité, aspersion non régulée) consomment jusqu’à 80% de l’eau agricole disponible avec des rendements sous-optimaux [3]. En l’absence de capteurs de sol, l’arrosage est appliqué selon des calendriers fixes, indépendamment des besoins réels des cultures.
- **Détection tardive des maladies :** Les infections phytosanitaires — mildiou, fusariose, attaques d’insectes nuisibles — sont souvent détectées visuellement, à un stade avancé de propagation, rendant le traitement coûteux et parfois inefficace.
- **Gestion empirique du cheptel :** Le suivi sanitaire des animaux d’élevage (bovins, ovins, caprins, volailles, lapins, abeilles) est réalisé manuellement, sans historique numérique fiable, ce qui rend difficile la détection précoce des anomalies comportementales ou sanitaires.
- **Absence de tableaux de bord décisionnels :** Les agriculteurs manquent d’outils d’agrégation et de visualisation des données, rendant impossible toute analyse prédictive ou planification proactive des interventions.
- **Isolement informationnel :** Les agents de terrain travaillent souvent sans connectivité fiable, sans accès aux recommandations d’experts, et sans moyen de remonter les observations en temps réel vers les gestionnaires.

### L’Intelligence Artificielle et l’IoT au Service de l’Agriculture
La convergence de deux révolutions technologiques — l’Internet des Objets (IoT) et l’Intelligence Artificielle (IA) — ouvre des perspectives inédites pour la modernisation agricole. L’IoT permet de déployer des réseaux de capteurs bas coût, autonomes et connectés, capables de mesurer en continu les paramètres physiques et environnementaux de la ferme : humidité du sol, température ambiante, pression hydraulique, débit d’irrigation, poids des ruches [4]. L’IA, quant à elle, permet de transformer ce flux continu de données brutes en décisions actionnables : déclencher l’irrigation au seuil critique, alerter en cas d’anomalie thermique, diagnostiquer une maladie foliaire à partir d’une photographie ou encore prédire les rendements saisonniers.

Des travaux récents en *precision agriculture* et en *smart farming* confirment le potentiel transformateur de ces technologies. La détection de maladies végétales par deep learning (réseaux convolutifs YOLOv8, ResNet) atteint des taux de précision supérieurs à 90% sur des ensembles de données variés [5]. Les systèmes d’irrigation intelligente réduisent la consommation d’eau de 30 à 50% par rapport aux méthodes conventionnelles [6].

### Présentation du Projet Smart Farm AI
Smart Farm AI est une plateforme agri-intelligente intégrée, développée dans le cadre d’un projet de fin d’études au sein d’Intech Solution Tunisie. Elle vise à doter les exploitations agricoles tunisiennes d’un système de surveillance, de pilotage et d’aide à la décision reposant sur trois piliers complémentaires :
1. **Infrastructure IoT :** Deux nœuds ESP32 déployés en champ — Node A dédié à l’irrigation autonome des cultures, Node B au monitoring des ruches apicoles — collectant en temps réel des données multimesures via protocole MQTT.
2. **Plateforme numérique :** Un backend FastAPI (Python) couplé à une base de données PostgreSQL/PostGIS, exposant une API REST sécurisée par JWT ; un frontend React 18 offrant des tableaux de bord interactifs, des cartes géolocalisées et une interface PWA pour les agents terrain.
3. **Moteur d’intelligence artificielle :** Des modèles YOLOv8 entraînés pour la détection de maladies foliaires, couplés à un assistant conversationnel souverain (LLaVA-1.5-7B + Labess-7B via RAG ChromaDB) capable de répondre en dialecte tunisien (Darija), en arabe et en français.

Ce rapport présente l’ensemble du processus de conception, développement et déploiement de cette plateforme. Le **Chapitre 1** pose le contexte et la méthodologie de développement. La conception détaillée de l'architecture est abordée au **Chapitre 2**, suivie par l'implémentation au **Chapitre 3** et l'expérimentation/évaluation scientifique complète au **Chapitre 4**.

---

# Chapitre 1 : Contexte général et méthodologie

## 1.1 Introduction
Ce premier chapitre pose les fondations analytiques et méthodologiques du projet Smart Farm AI. Il s’articule autour de trois axes complémentaires. Premièrement, nous présentons l’organisme d’accueil, son positionnement stratégique et ses domaines d’expertise. Deuxièmement, nous analysons le contexte du projet : problématique, objectifs (KPIs), limites et enjeux éthiques. Troisièmement, nous justifions le choix de la méthodologie CRISP-DM pour piloter ce projet mêlant IA et ingénierie logicielle.

## 1.2 Présentation de l’organisme d’accueil

### 1.2.1 Mission et Activités
Intech Solution Tunisie est une société de services numériques spécialisée dans le développement de solutions technologiques à destination des secteurs agricole, industriel et des services. Fondée pour répondre aux besoins de transformation numérique des entreprises tunisiennes, la société se concentre sur l’intégration de systèmes IoT et d’intelligence artificielle.

Les activités de l'entreprise couvrent :
- Le développement de plateformes web et mobiles (React, FastAPI, Flutter)
- L’ingénierie de systèmes IoT embarqués (ESP32, Arduino, MQTT)
- L’intégration de modèles d’IA et de vision par ordinateur (YOLOv8, LLMs)
- Le déploiement Cloud et conteneurisé (Docker, Nginx, Caddy)

### 1.2.2 Domaines d’Expertise et Points Forts
- **IoT & Systèmes Embarqués :** Conception de nœuds capteurs autonomes sur ESP32, protocoles MQTT, firmwares robustes avec modes dégradés en cas de perte de connectivité.
- **Intelligence Artificielle :** Déploiement de modèles de vision (YOLOv8) ; intégration de modèles de langage (LLMs) locaux via Ollama ; pipelines RAG (Retrieval-Augmented Generation) avec ChromaDB.
- **Cloud & DevOps :** Orchestration via Docker Compose, certificats HTTPS automatisés (Caddy), reverse-proxy.
- **Développement Web Full-Stack :** Frontend React 18 (PWA, cartographie Leaflet, i18next). Backend FastAPI (JWT, SQLAlchemy, PostgreSQL/PostGIS).

**Tableau 1.1 — Fiche d’identité d’Intech Solution Tunisie. Source : auteur.**

| Champ | Information |
| :--- | :--- |
| Dénomination sociale | Intech Solution Tunisie |
| Secteur d’activité | Technologies de l’Information — Agriculture Numérique |
| Domaines | IoT, Intelligence Artificielle, Cloud, Développement Web |
| Technologies clés | FastAPI, React, ESP32, YOLOv8, Ollama, PostgreSQL |
| Langues de travail | Français, Arabe, Anglais, Darija |

## 1.3 Contexte du Projet Smart Farm AI

### 1.3.1 Étude de l’Existant

L’agriculture tunisienne, malgré son rôle stratégique, demeure ancrée dans des pratiques empiriques. Les sécheresses prolongées (2023–2024) ont mis en évidence la vulnérabilité du modèle traditionnel face à la raréfaction hydrique. Les solutions mondiales de *smart farming* existantes souffrent de barrières technico-économiques.

**Tableau 1.2 — Analyse comparative des solutions de smart farming existantes. Source : auteur.**

| Solution | Fonctionnalités | IoT | IA/ML | Limites principales pour la Tunisie |
| :--- | :--- | :--- | :--- | :--- |
| **Trimble Ag** | Precision agriculture, GPS | Oui | Partiel | Coût élevé, SaaS hébergé aux USA |
| **John Deere** | Gestion équipements | Oui | Oui | Solution prioritaire fermée |
| **Taranis** | Détection maladies (drones) | Partiel | Oui | Coûts d'acquisition (Drones) hors de portée |
| **Plantix** | Diagnostic via smartphone | Non | Oui | Limité aux cultures, pas d'IoT intégré |
| **Smart Farm AI** | Surveillance, Irrigation, IA souveraine | Oui | Oui | Conçu pour le contexte local, Open Source |

### 1.3.2 Problématique

> **Problématique :** Comment concevoir et déployer une plateforme numérique intégrée permettant à un agriculteur tunisien de surveiller en temps réel son exploitation, d'automatiser l'irrigation, de détecter précocement les maladies, et de prendre des décisions éclairées grâce à l'IA — tout en garantissant la souveraineté des données et un fonctionnement hybride (offline/online) adapté aux zones rurales ?

### 1.3.3 Objectifs et KPIs

Les objectifs se traduisent par des indicateurs de performance (KPIs) stricts, dont la méthodologie d'évaluation sera détaillée au Chapitre 2 et les résultats présentés au Chapitre 4 :

- **Surveillance & Irrigation :** 
  - *Objectif :* Automatisation des vannes via ESP32. 
  - *KPI :* Latence d'envoi MQTT < 3s. Tolérance aux pannes (mode autonome en < 10s après coupure Wi-Fi).
- **Vision Artificielle (YOLOv8) :** 
  - *Objectif :* Détection des maladies (olivier/agrumes). 
  - *KPI :* Atteindre un mAP@0.5 supérieur à 0.85 et un temps d'inférence < 300 ms sur matériel standard.
- **Assistant IA (RAG) :** 
  - *Objectif :* Interrogation du savoir agricole en Darija/Français. 
  - *KPI :* Zéro hallucination factuelle (validation via dataset de test vétérinaire/agronomique).

### 1.3.4 Solution Proposée
L'architecture de la solution, détaillée au Chapitre 2, repose sur :
1. Une couche IoT (ESP32, Capteurs, Relais, MQTT).
2. Une couche API Backend (FastAPI, PostgreSQL/PostGIS).
3. Une couche IA (YOLOv8, ChromaDB, Ollama).
4. Une couche Frontend Mobile (React PWA avec IndexedDB pour le mode hors-ligne).

**Figure 1.1 — Architecture globale de la plateforme Smart Farm AI. Source : auteur.**
![Architecture globale](architecture_globale.png)

### 1.3.5 Motivations
- **Souveraineté numérique :** Auto-hébergement (On-premise), évitant la dépendance aux Clouds GAFAM.
- **Réponse au stress hydrique :** Optimisation de la consommation d'eau via des capteurs d'humidité capacitifs réels.
- **Adaptation locale :** Intégration du dialecte tunisien (Darija) via le LLM Labess-7B.

### 1.3.6 Contraintes
- **Connectivité rurale :** Nécessité absolue d'une approche *Offline-First* pour la PWA (Service Workers, Dexie.js).
- **Coût matériel :** Le nœud IoT (ESP32 + sondes + relais) doit coûter moins de 30€.
- **Énergie :** Gestion des cycles *Deep Sleep* du microcontrôleur pour un usage sur panneau solaire 5V.

### 1.3.7 Limites et risques du projet
Afin de garantir la validité scientifique de ce travail, il est essentiel d'en identifier les limites :
- **Biais de données d'entraînement (IA) :** Les modèles YOLOv8 entraînés sur des images d'open-data (ex: PlantVillage) peuvent présenter une baisse de précision face aux conditions d'illumination réelles des serres tunisiennes.
- **Maintenance physique :** Les capteurs de sol sont soumis à l'oxydation et aux engins agricoles, nécessitant un étalonnage périodique.
- **Fausses alertes :** Un modèle IA avec un taux de "Faux Positifs" élevé risque d'engendrer une fatigue d'alerte chez l'agriculteur. L'atténuation se fera par un seuil de confiance strict (Confidence Threshold > 60%).

### 1.3.8 Éthique et gouvernance des données
Le projet s'inscrit dans une démarche *Privacy by Design* :
- **Consentement et Propriété :** Les données agricoles (rendements, finances) appartiennent exclusivement à l'exploitant (Hébergement souverain).
- **Anonymisation :** Les algorithmes de vision filtrent les visages humains ou plaques d'immatriculation avant de stocker les images de détection sur les serveurs.
- **Traçabilité et Sécurité :** Un système d'Audit Logs sécurisé permet d'enregistrer chaque interaction avec le système d'irrigation pour des raisons de responsabilité (Liability).

## 1.4 Gestion de Projet

Pour mener à bien ce projet mêlant développement logiciel classique et Data Science, trois méthodologies ont été évaluées :
1. **KDD (Knowledge Discovery in Databases) :** Approche académique pionnière en 9 étapes séquentielles [7].
2. **SEMMA (Sample, Explore, Modify, Model, Assess) :** Méthodologie industrielle de SAS, centrée sur le traitement statistique.
3. **CRISP-DM (Cross-Industry Standard Process for Data Mining) :** Standard industriel cyclique en 6 phases, intégrant fortement le besoin métier [8].

**Figure 1.2 — Processus CRISP-DM appliqué au projet Smart Farm AI [8]**
![Processus CRISP-DM](crisp_dm.png)

## 1.5 Choix de la Méthodologie

**Tableau 1.3 — Comparaison des méthodologies KDD, SEMMA et CRISP-DM. Source : auteur.**

| Critère | KDD | SEMMA | CRISP-DM |
| :--- | :--- | :--- | :--- |
| Origine | Académique (1996) | Industriel (SAS) | Consortium européen (1999) |
| Intégration métier | Faible | Absente | Forte (Business Understanding) |
| Aspect déploiement | Absent | Absent | Oui (Deployment Phase) |
| Itérativité | Implicite | Implicite | Explicite et centrale |
| Adapté IoT/ML | Partiel | Partiel | Parfaitement compatible |

**Justification du Choix de CRISP-DM :**
CRISP-DM s’impose car c'est la seule méthodologie qui encadre l’ensemble du cycle, depuis la compréhension des besoins agricoles jusqu’au **déploiement en production** (PWA, API, Docker). Son caractère itératif permet de ré-entraîner les modèles YOLO au fur et à mesure des retours terrain, s'intégrant parfaitement avec les pratiques de CI/CD et MLOps modernes.

## 1.6 Conclusion

Ce premier chapitre a défini le cadre général du projet Smart Farm AI. Il a mis en exergue la nécessité impérieuse de digitaliser l'agriculture tunisienne face au stress hydrique, tout en posant des indicateurs de réussite (KPIs) clairs et mesurables. 

Les contraintes de ruralité nous imposent une architecture hybride (Offline-First) souveraine. La méthodologie CRISP-DM accompagnera le développement itératif du produit.

Le **Chapitre 2** présentera la conception détaillée de la plateforme (architecture IoT/Cloud, modèles de données, diagrammes UML), le **Chapitre 3** exposera l'implémentation technique, et le **Chapitre 4** détaillera le protocole d'évaluation scientifique (YOLOv8, RAG, IoT) garantissant la fiabilité de l'application.
