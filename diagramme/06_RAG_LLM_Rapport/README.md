# Rapport RAG, LLM et Data Science

Ce dossier contient une etude construite a partir du code, de la base de
connaissances et de la base SQLite reelle du projet Smart Farm AI.

## Chapitre pret pour le rapport

- `CHAPITRE_RAG_LLM_DATA_SCIENCE.md`

Le chapitre distingue les fonctionnalites actuellement implementees des
ameliorations recommandees.

## Diagrammes

1. `images/01_architecture_rag_llm_multimodale`
2. `images/02_pipeline_ingestion_multisource`
3. `images/03_sequence_question_rag`
4. `images/04_modele_donnees_rag`
5. `images/05_protocole_evaluation_rag`

## Figures Data Science

6. `images/06_couverture_base_connaissances`
7. `images/07_profil_base_metier`
8. `images/08_audit_qualite_donnees`
9. `images/09_benchmark_retrieval_actuel`
10. `images/10_matrice_maturite_data_science`

Chaque figure est disponible en PNG et SVG.

## Donnees reproductibles

- `data/profil_tables_metier.csv`
- `data/audit_qualite_donnees.csv`
- `data/benchmark_retrieval.csv`
- `data/benchmark_retrieval_resume.csv`

## Resultats observes

- 23 passages dans la base de connaissances ;
- 13 especes ou domaines ;
- 179 mots-cles ;
- benchmark lexical de 22 questions :
  - Top-1 : 95,5 % ;
  - Top-3 : 100 % ;
  - MRR : 0,977.

Ce benchmark est manuel et limite. Il ne mesure ni ChromaDB ni la faithfulness
du LLM.

## Regeneration

```powershell
python diagramme/06_RAG_LLM_Rapport/scripts/generate_rag_study.py

npx.cmd --yes @mermaid-js/mermaid-cli `
  -i diagramme/06_RAG_LLM_Rapport/sources/01_architecture_rag_llm_multimodale.mmd `
  -o diagramme/06_RAG_LLM_Rapport/images/01_architecture_rag_llm_multimodale.svg `
  -b white
```
