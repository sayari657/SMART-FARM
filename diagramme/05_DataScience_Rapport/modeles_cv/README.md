# Artefacts des modeles de vision

Ce dossier rassemble les resultats selectionnes depuis `D:\cv data`.
Les poids `best.pt` et `last.pt` ne sont pas dupliques, car ils ne sont pas
necessaires dans le rapport et occupent plusieurs megaoctets.

## Organisation

- `01_poulet` : distribution des classes, courbes, performance par classe,
  predictions de test et parametres.
- `02_chevre` : distribution des classes, courbes, performance par classe,
  predictions de test et parametres.
- `03_citronnier` : matrice de confusion, courbes F1 et precision-rappel,
  labels et predictions de validation.
- `04_oranger` : matrice de confusion, courbes F1 et precision-rappel,
  labels et predictions de validation.
- `05_insectes` : matrice de confusion, courbes F1 et precision-rappel,
  labels et predictions de validation.

Chaque sous-dossier contient egalement :

- `args.yaml` : hyperparametres d'entrainement ;
- `data.yaml` : classes et chemins du dataset ;
- `results.csv` : metriques par epoque.

Le fichier `synthese_modeles.csv` compare les meilleurs scores des cinq modeles
et leurs principaux hyperparametres.

Les fiches synthetiques correspondantes sont generees dans le dossier
`../images`, de `08_fiche_modele_poulet.png` a
`12_fiche_modele_insectes.png`.
