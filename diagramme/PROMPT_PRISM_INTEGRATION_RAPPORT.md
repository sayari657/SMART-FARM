# Prompt pour intégrer le dossier `diagramme` dans le rapport académique

## Mode d'utilisation

1. Importer dans Prism le rapport académique en cours de rédaction.
2. Importer également le dossier complet `diagramme`.
3. Copier-coller le prompt ci-dessous.

---

## Prompt à donner à Prism

```text
Tu agis comme un expert en rédaction scientifique, ingénierie logicielle,
Data Science, intelligence artificielle, vision par ordinateur et systèmes
RAG/LLM. Tu dois mettre à jour mon rapport académique de projet de fin
d'études en utilisant les documents, diagrammes, images et résultats contenus
dans le dossier `diagramme`.

CONTEXTE DU PROJET

Le projet, nommé Smart Farm AI, est une plateforme intelligente de gestion
agricole. Le système comporte exactement trois acteurs :

1. le superadministrateur, responsable de l'administration globale de la
   plateforme ;
2. l'administrateur, qui est le propriétaire ou le gestionnaire de la ferme ;
3. l'ouvrier, qui exécute les tâches opérationnelles sur le terrain.

La solution couvre notamment la gestion des fermes, des utilisateurs, des
ouvriers, des animaux, de l'aviculture, de l'apiculture, des plantes et des
arbres, ainsi que la télémétrie IoT, les alertes, la vision par ordinateur,
les modèles YOLO et un système RAG/LLM fondé sur les données métier.

OBJECTIF PRINCIPAL

Analyse le rapport existant et le dossier `diagramme`, puis intègre les
éléments pertinents directement dans les chapitres appropriés du rapport.
L'intégration doit améliorer la qualité scientifique du document sans
supprimer les informations valides déjà présentes et sans créer de
répétitions inutiles.

SOURCES À UTILISER

Utilise prioritairement les fichiers suivants :

- `diagramme/ANALYSE_COMPLETE.md` pour comprendre la structure fonctionnelle
  et technique du projet ;
- `diagramme/PARAGRAPHES_ACADEMIQUES_FIGURES.md` pour les légendes et les
  analyses scientifiques associées aux 35 figures principales ;
- `diagramme/04_Mermaid_Rapport/README.md` et son dossier `images` pour les
  cas d'utilisation, les diagrammes de classes et les exemples fonctionnels ;
- `diagramme/05_DataScience_Rapport/CHAPITRE_DATA_SCIENCE_IA.md`,
  `diagramme/05_DataScience_Rapport/README.md`, le dossier `images` et le
  dossier `modeles_cv` pour l'étude Data Science et les résultats des modèles
  de vision par ordinateur ;
- `diagramme/06_RAG_LLM_Rapport/CHAPITRE_RAG_LLM_DATA_SCIENCE.md`,
  `diagramme/06_RAG_LLM_Rapport/README.md`, le dossier `images` et le dossier
  `data` pour l'étude RAG/LLM, l'audit des données et les benchmarks ;
- les dossiers `01_Use_Case`, `02_Diagramme_Classe` et `03_Sequence` pour les
  vues UML détaillées à placer dans le corps du rapport ou dans les annexes.

STRUCTURE D'INTÉGRATION DEMANDÉE

1. Analyse des besoins et conception fonctionnelle

Présente les trois acteurs, leurs responsabilités et les limites de leurs
droits. Intègre le diagramme global des cas d'utilisation, puis les diagrammes
détaillés nécessaires pour expliquer l'authentification, l'apiculture,
l'aviculture, la surveillance par IA, la télémétrie et le travail de
l'ouvrier. Le texte doit expliquer les relations entre les acteurs et les cas
d'utilisation, et pas seulement décrire visuellement les diagrammes.

2. Conception statique et dynamique

Intègre une vue globale du diagramme de classes, puis les vues détaillées par
domaine : utilisateurs et fermes, IoT et télémétrie, IA et surveillance,
apiculture, aviculture et gestion des ressources. Ajoute les diagrammes de
séquence pertinents pour l'authentification JWT, la connexion OTP de
l'ouvrier, la réception des données IoT, la détection par vision artificielle
et le workflow apicole. Explique les responsabilités des classes, leurs
associations, les échanges entre composants et les choix architecturaux.

3. Étude Data Science et intelligence artificielle

Construis une section scientifique complète comprenant :

- la définition du problème et des objectifs de détection ;
- la présentation des datasets et de leurs classes ;
- la préparation, l'annotation, le nettoyage et l'augmentation des données ;
- la séparation entraînement, validation et test ;
- l'analyse exploratoire des données ;
- l'architecture et les paramètres des modèles YOLOv11 ;
- le protocole expérimental ;
- les métriques Precision, Recall, F1-score, mAP@0.5 et mAP@0.5:0.95 ;
- les courbes d'entraînement et de validation ;
- les matrices de confusion et les prédictions qualitatives ;
- une comparaison rigoureuse des modèles appliqués aux poulets, chèvres,
  citronniers, orangers, insectes et abeilles ;
- les limites, les risques de biais, les erreurs possibles et les
  perspectives d'amélioration ;
- le pipeline MLOps et la stratégie d'apprentissage actif.

Utilise exclusivement les résultats réellement disponibles dans les fichiers
CSV, YAML et images. Ne fabrique aucune valeur numérique. Lorsqu'une métrique
n'est pas disponible ou n'est pas calculable, indique explicitement
« donnée non disponible » au lieu de l'inventer.

4. Architecture RAG/LLM et valorisation des données métier

Crée ou enrichis un chapitre consacré au système RAG/LLM couvrant :

- l'architecture RAG multimodale ;
- le pipeline d'ingestion multisource ;
- la segmentation des documents et la création des embeddings ;
- le stockage vectoriel et la recherche hybride ;
- le filtrage par ferme, espèce, domaine et période ;
- la séquence complète de traitement d'une question ;
- la génération d'une réponse contextualisée et traçable ;
- le modèle de données associé au RAG ;
- le protocole d'évaluation du retrieval et de la génération ;
- la couverture de la base de connaissances ;
- le profil des tables métier ;
- l'audit de qualité des données ;
- les résultats du benchmark de retrieval ;
- la matrice de maturité Data Science ;
- les limites de sécurité, de confidentialité, d'hallucination et de
  gouvernance des données.

Distingue clairement ce qui est déjà implémenté, ce qui a été évalué avec des
données réelles et ce qui constitue une architecture proposée ou une
perspective. Ne présente jamais un composant conceptuel comme un résultat
expérimental déjà obtenu.

RÈGLES D'INTÉGRATION DES FIGURES

- Utilise en priorité le format SVG pour conserver une qualité vectorielle.
- Utilise le PNG lorsque le format SVG n'est pas pris en charge ou lorsqu'une
  figure n'existe qu'en PNG/JPG.
- Place chaque figure immédiatement après le paragraphe qui l'introduit.
- Introduis obligatoirement chaque figure dans le texte avant son affichage.
- Ajoute sous chaque image une légende académique précise au format :
  « Figure X.Y — Titre explicite de la figure. Source : Élaboration
  personnelle. »
- Numérote les figures selon le chapitre du rapport.
- Cite chaque figure dans le texte avec une formulation telle que
  « La Figure X.Y présente... ».
- Ne laisse aucune figure sans commentaire analytique.
- Adapte et reformule les paragraphes de
  `PARAGRAPHES_ACADEMIQUES_FIGURES.md` afin qu'ils s'insèrent naturellement
  dans le rapport. Évite le simple copier-coller et les répétitions.
- Ne modifie pas le contenu technique visible des diagrammes.
- Vérifie que tous les chemins d'images utilisés existent réellement.
- Ne duplique pas les versions PNG et SVG d'une même figure.
- Place dans le corps du rapport les figures indispensables à la
  compréhension. Place les vues très détaillées, les matrices supplémentaires,
  les courbes secondaires et les résultats complets par modèle dans des
  annexes structurées.

RÈGLES DE RÉDACTION ACADÉMIQUE

- Rédige en français académique, clair, précis et naturel.
- Utilise un niveau adapté à un projet de fin d'études d'ingénieur en Data
  Science et intelligence artificielle.
- Évite les affirmations commerciales, vagues ou non démontrées.
- Pour chaque résultat, distingue la description, l'interprétation, la
  discussion et les limites.
- Justifie les choix méthodologiques et architecturaux.
- Définis chaque sigle lors de sa première occurrence.
- Assure des transitions cohérentes entre les sections.
- Conserve les citations bibliographiques existantes.
- N'invente aucune référence bibliographique, aucune expérience, aucun
  dataset, aucune classe, aucun paramètre et aucune métrique.
- Signale explicitement toute contradiction ou information manquante.
- N'affirme pas qu'un modèle est performant uniquement à partir d'une image
  qualitative ; fonde les conclusions sur les métriques disponibles.
- Ne confonds pas validation et test, corrélation et causalité, détection et
  classification, ni système conçu et système effectivement déployé.

GESTION DE LA LONGUEUR

N'insère pas automatiquement toutes les figures dans le corps principal.
Sélectionne les figures les plus importantes pour l'argumentation et transfère
les détails dans les annexes. Toutefois, aucune des 35 figures principales
répertoriées dans `PARAGRAPHES_ACADEMIQUES_FIGURES.md` ne doit être perdue :
chaque figure doit être soit intégrée dans un chapitre, soit placée dans une
annexe et référencée depuis le texte principal.

LIVRABLE ATTENDU

Mets directement à jour le rapport complet. Le document final doit contenir :

1. les chapitres révisés et harmonieusement intégrés ;
2. les figures correctement positionnées, numérotées et commentées ;
3. une table des matières mise à jour ;
4. une liste des figures mise à jour ;
5. des renvois internes cohérents ;
6. des annexes organisées par catégorie ;
7. une courte section « Limites et perspectives » ;
8. un tableau final de traçabilité indiquant, pour chaque figure du dossier
   `diagramme`, son numéro final, son titre et la section ou l'annexe dans
   laquelle elle a été insérée.

Avant de finaliser, effectue un contrôle de cohérence :

- les trois acteurs sont toujours le superadministrateur, l'administrateur
  propriétaire de ferme et l'ouvrier ;
- aucune métrique n'a été inventée ;
- aucune figure n'est présente deux fois ;
- chaque figure est citée et interprétée ;
- les résultats réels et les propositions futures sont clairement séparés ;
- les chemins des fichiers sont valides ;
- la numérotation des chapitres, tableaux, figures et annexes est continue ;
- le style et la terminologie sont homogènes dans tout le rapport.

Ne fournis pas seulement des recommandations ou un résumé des modifications.
Produis directement la version révisée et complète du rapport.
```

---

## Remarque

Si Prism limite le nombre de fichiers importés en une seule fois, commencer
par le rapport, `ANALYSE_COMPLETE.md`,
`PARAGRAPHES_ACADEMIQUES_FIGURES.md` et les trois dossiers
`04_Mermaid_Rapport`, `05_DataScience_Rapport` et `06_RAG_LLM_Rapport`.
Les diagrammes UML détaillés des dossiers `01_Use_Case`,
`02_Diagramme_Classe` et `03_Sequence` peuvent ensuite être ajoutés lors de la
génération des annexes.
