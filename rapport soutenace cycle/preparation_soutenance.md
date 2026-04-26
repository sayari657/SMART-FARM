# Guide de Préparation à la Soutenance : FARM AI

Ce document contient les réponses stratégiques aux questions potentielles du jury. L'objectif est de montrer une maîtrise technique (Data Science / Architecture) et une vision métier (Agriculture).

---

### Question 1 : Sur la Data Science (Déséquilibre des classes)
**Question du Jury :** *"Comment avez-vous géré le déséquilibre des classes dans votre dataset pour éviter les faux négatifs sur des maladies rares ?"*

**Réponse Type :**
> "C'est une problématique centrale en vision artificielle agricole. Pour FARM AI, j'ai adopté une stratégie en trois étapes :
> 1. **Augmentation de données ciblée (Oversampling) :** J'ai utilisé des techniques de transformation (rotation, changement de luminosité, flou gaussien) spécifiquement sur les classes minoritaires pour équilibrer le dataset avant l'entraînement.
> 2. **Fonction de perte pondérée :** Lors de l'entraînement de YOLO, j'ai ajusté les poids dans la fonction de perte pour pénaliser plus lourdement les erreurs sur les classes rares.
> 3. **Validation par Métriques Précises :** Au lieu de me fier uniquement à l'Accuracy globale, j'ai surveillé le **Recall** par classe et la **F1-Score**. Cela garantit que le modèle ne 'sacrifie' pas les maladies rares pour obtenir un bon score global."

---

### Question 2 : Sur l'Industrialisation (Migration et Scalabilité)
**Question du Jury :** *"SQLite est limité. Quelle est votre stratégie pour passer à l'échelle ?"*

**Réponse Type :**
> "SQLite a été choisi pour la phase de prototypage rapide et de développement local pour sa légèreté. Cependant, l'architecture de FARM AI a été conçue pour être 'Database Agnostic' grâce à l'utilisation de **SQLAlchemy (ORM)**. 
> Pour une mise en production réelle :
> 1. **Migration :** Le passage à **PostgreSQL** se ferait via un simple changement de la chaîne de connexion dans le fichier `.env`, SQLAlchemy gérant la traduction des requêtes.
> 2. **Performance :** Pour la télémétrie IoT massive (millions de points de données), j'envisage l'utilisation d'une base de données orientée séries temporelles comme **TimescaleDB** (extension de Postgres) afin d'optimiser les agrégations temporelles.
> 3. **Latence :** L'utilisation de **FastAPI** avec des workers asynchrones permet déjà de traiter un grand volume de requêtes concurrentes sans bloquer le serveur."

---

### Question 3 : Sur l'Éthique et la Confidentialité des Données
**Question du Jury :** *"Comment garantissez-vous la confidentialité des données des agriculteurs face au Cloud ?"*

**Réponse Type :**
> "La souveraineté des données agricoles est une priorité. Notre approche repose sur deux piliers :
> 1. **Architecture Hybride :** Les images et les données sensibles sont stockées sur des serveurs privés (On-Premise ou Cloud Privé Tunisien) et non sur des serveurs publics mutualisés.
> 2. **Anonymisation :** Avant d'envoyer des métadonnées vers un assistant IA (comme GPT ou Claude), nous supprimons les identifiants GPS précis et les noms des propriétaires.
> 3. **Futur - LLM Local :** À terme, l'objectif est d'intégrer un modèle de langage léger type **Llama 3 ou Mistral** directement sur l'infrastructure du projet via **Ollama**, permettant un traitement 100% local sans aucune sortie de données vers l'extérieur."

---

### Question 4 : Sur l'Intelligence Audio (Bees)
**Question du Jury :** *"Votre Dashboard mentionne un 'Audio Spectrum'. Quel est son rôle scientifique ?"*

**Réponse Type :**
> "Le spectre audio est un indicateur biologique crucial en apiculture. 
> - Une colonie saine émet un bourdonnement stable entre **200 et 300 Hz**. 
> - Si la fréquence monte vers **400 Hz+**, cela peut indiquer un stress intense ou un début d'essaimage (la reine s'apprête à partir). 
> - Dans FARM AI, nous visualisons ce spectre pour permettre à l'apiculteur de 'sentir' l'état de sa ruche à distance, complétant ainsi l'analyse visuelle par une analyse acoustique."

---

### 💡 Conseils pour réussir la démonstration
1. **Scénario narratif :** "Imaginez un agriculteur qui remarque une tache sur une feuille d'olivier..." (Faites vivre le projet).
2. **Honnêteté technique :** Si on vous pose une question sur une limite que vous n'avez pas résolue, répondez : *"C'est une excellente observation qui constitue justement une de mes perspectives d'évolution pour la V2 du projet."* (Cela montre votre esprit critique).
