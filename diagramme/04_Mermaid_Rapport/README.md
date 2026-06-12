# Diagrammes Mermaid - Smart Farm AI

Ces diagrammes ont ete reconstruits a partir du code actuel du projet:

- `frontend/src/App.jsx` pour les profils et parcours visibles;
- `backend/app/api/v1/endpoints/` pour les cas d'utilisation exposes;
- `backend/app/models/domain.py` pour les classes et cardinalites;
- `graphify-out/GRAPH_REPORT.md` pour verifier les entites centrales.

## Images pour le rapport

1. `images/01_cas_utilisation_global.svg` et `.png`
2. `images/02_cas_utilisation_detaille.svg` et `.png`
3. `images/03_classes_vue_ensemble.svg` et `.png`
4. `images/04_classes_detaillees.svg` et `.png`

## Figures detaillees et lisibles

Ces figures sont conseillees pour le corps du rapport. Elles presentent un seul
sujet par image et restent lisibles sur une page A4:

5. `images/05_roles_et_responsabilites.svg` et `.png`
   - Legende: Roles du Superadmin, de l'administrateur proprietaire et de l'ouvrier.
   - Orientation: paysage.
6. `images/06_exemple_gestion_tache_ouvrier.svg` et `.png`
   - Legende: Sequence d'affectation et de realisation d'une tache terrain.
   - Orientation: paysage.
7. `images/07_exemple_telemetrie_alerte.svg` et `.png`
   - Legende: Chaine fonctionnelle de la telemetrie jusqu'a la recommandation.
   - Orientation: paysage.
8. `images/08_exemple_visite_apicole.svg` et `.png`
   - Legende: Deroulement d'une inspection de ruche avec synchronisation hors ligne.
   - Orientation: paysage.
9. `images/09_classes_utilisateurs_ferme.svg` et `.png`
   - Legende: Classes de gestion des utilisateurs, fermes, ouvriers et taches.
   - Orientation: paysage.
10. `images/10_classes_iot_ia.svg` et `.png`
    - Legende: Classes du pipeline IoT, detection d'anomalies et recommandations.
    - Orientation: paysage.
11. `images/11_classes_apiculture.svg` et `.png`
    - Legende: Classes du module de gestion apicole.
    - Orientation: paysage.
12. `images/12_classes_aviculture.svg` et `.png`
    - Legende: Classes du module ERP avicole et contrat de validation des donnees.
    - Orientation: portrait.

Pour un rapport academique, utiliser la figure 5 pour presenter les acteurs, puis
les figures 6 a 8 comme exemples de fonctionnement. Les figures 9 a 12 peuvent
etre placees dans les sous-sections de conception detaillee.

Les fichiers SVG sont recommandes pour Word, LaTeX et l'impression: le texte reste
net lors du redimensionnement. Les PNG sont fournis pour les outils qui ne prennent
pas correctement en charge le SVG.

Orientation conseillee dans le rapport:

- cas d'utilisation global: page portrait;
- cas d'utilisation detaille: page paysage;
- classes - vue d'ensemble: page portrait;
- classes detaillees: page paysage.

Mermaid ne propose pas de syntaxe UML native pour les cas d'utilisation. Les deux
diagrammes correspondants utilisent donc un `flowchart` Mermaid avec des cas
d'utilisation arrondis, une frontiere systeme, des acteurs et des relations
`inclut` / `etend`.

## Sources modifiables

Les fichiers Mermaid se trouvent dans `sources/`. Ils peuvent etre ouverts dans
Mermaid Live Editor ou regeneres avec Mermaid CLI.

```powershell
npx.cmd --yes @mermaid-js/mermaid-cli -i sources/01_cas_utilisation_global.mmd -o images/01_cas_utilisation_global.svg -b white
```

## Exemple LaTeX

```latex
\begin{figure}[H]
  \centering
  \includegraphics[width=\textwidth]{figures/01_cas_utilisation_global.pdf}
  \caption{Diagramme global des cas d'utilisation de Smart Farm AI}
  \label{fig:use-case-global}
\end{figure}
```

Pour LaTeX, convertir le SVG en PDF avant l'insertion si le compilateur ne gere
pas directement le format SVG.
