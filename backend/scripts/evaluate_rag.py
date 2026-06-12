"""
Évaluation quantitative du RAG agronomique souverain
=====================================================
Mesure la qualité du retrieval sur le jeu gold de 50 questions
(tests/rag_eval/rag_eval_dataset.json) — méthodologie inspirée de RAGAS,
sans dépendance à un LLM juge externe (souveraineté) :

  - Hit Rate@1 / Hit Rate@3 : l'entrée attendue est-elle retrouvée ?
  - MRR (Mean Reciprocal Rank)  : à quel rang apparaît-elle ?
  - Context Precision@3         : proportion de contextes récupérés pertinents.
  - Ventilation par langue (FR vs Derja) et par difficulté.

Si le package `ragas` + une clé LLM sont disponibles, une section RAGAS
(faithfulness / answer_relevancy) peut être ajoutée avec --ragas.

Usage :
    python scripts/evaluate_rag.py            # évaluation retrieval
    python scripts/evaluate_rag.py --top-k 5  # top-k personnalisé

Sortie : tests/rag_eval/results/rag_eval_<date>.json + .md (tableaux mémoire).
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from app.services.rag_service import RAGService, load_knowledge_base  # noqa: E402

DATASET = BACKEND / "tests" / "rag_eval" / "rag_eval_dataset.json"
RESULTS_DIR = BACKEND / "tests" / "rag_eval" / "results"


def _doc_to_id() -> dict[str, str]:
    """Mappe le texte exact d'un document de la KB vers son id."""
    return {e["doc"]: e["id"] for e in load_knowledge_base()}


async def run_eval(top_k: int = 3) -> dict:
    data = json.loads(DATASET.read_text(encoding="utf-8"))
    questions = data["questions"]
    doc2id = _doc_to_id()
    rag = RAGService()

    rows = []
    for item in questions:
        retrieved_docs = await rag.query_wisdom(
            item["q"], species=item.get("species"), n_results=top_k
        )
        retrieved_ids = [doc2id.get(d, "<hors-KB>") for d in (retrieved_docs or [])]
        expected = set(item["expected_ids"])

        # Rang de la première entrée pertinente (1-indexé, 0 = absente)
        rank = 0
        for i, rid in enumerate(retrieved_ids, start=1):
            if rid in expected:
                rank = i
                break

        relevant_retrieved = sum(1 for rid in retrieved_ids if rid in expected)
        precision = relevant_retrieved / len(retrieved_ids) if retrieved_ids else 0.0

        rows.append({
            "question": item["q"],
            "lang": item["lang"],
            "difficulty": item["difficulty"],
            "expected": sorted(expected),
            "retrieved": retrieved_ids,
            "hit@1": rank == 1,
            f"hit@{top_k}": 1 <= rank <= top_k,
            "rr": (1.0 / rank) if rank else 0.0,
            "precision": round(precision, 3),
        })

    def agg(subset):
        n = len(subset)
        if n == 0:
            return {}
        return {
            "n": n,
            "hit@1": round(sum(r["hit@1"] for r in subset) / n, 3),
            f"hit@{top_k}": round(sum(r[f"hit@{top_k}"] for r in subset) / n, 3),
            "mrr": round(sum(r["rr"] for r in subset) / n, 3),
            "context_precision": round(sum(r["precision"] for r in subset) / n, 3),
        }

    by_lang = defaultdict(list)
    by_diff = defaultdict(list)
    for r in rows:
        by_lang[r["lang"]].append(r)
        by_diff[r["difficulty"]].append(r)

    return {
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "top_k": top_k,
        "retrieval_backend": "chromadb" if rag.is_active else "keyword-fallback",
        "kb_entries": len(load_knowledge_base()),
        "global": agg(rows),
        "by_lang": {k: agg(v) for k, v in sorted(by_lang.items())},
        "by_difficulty": {k: agg(v) for k, v in sorted(by_diff.items())},
        "failures": [
            {"q": r["question"][:80], "expected": r["expected"], "retrieved": r["retrieved"]}
            for r in rows if not r[f"hit@{top_k}"]
        ],
        "rows": rows,
    }


def to_markdown(res: dict) -> str:
    k = res["top_k"]
    g = res["global"]
    lines = [
        "# Évaluation RAG — Base agronomique souveraine",
        "",
        f"- **Date** : {res['timestamp']}",
        f"- **Backend retrieval** : {res['retrieval_backend']}",
        f"- **Questions** : {g['n']} · **Entrées KB** : {res['kb_entries']} · **top-k** : {k}",
        "",
        "## Résultats globaux",
        "",
        f"| Métrique | Valeur |",
        f"|---|---|",
        f"| Hit Rate@1 | {g['hit@1']:.1%} |",
        f"| Hit Rate@{k} | {g[f'hit@{k}']:.1%} |",
        f"| MRR | {g['mrr']:.3f} |",
        f"| Context Precision@{k} | {g['context_precision']:.1%} |",
        "",
        "## Par langue",
        "",
        f"| Langue | n | Hit@1 | Hit@{k} | MRR | Precision |",
        "|---|---|---|---|---|---|",
    ]
    for lang, a in res["by_lang"].items():
        label = "Français" if lang == "fr" else "Derja/Arabe"
        lines.append(f"| {label} | {a['n']} | {a['hit@1']:.1%} | {a[f'hit@{k}']:.1%} | {a['mrr']:.3f} | {a['context_precision']:.1%} |")
    lines += ["", "## Par difficulté", "", f"| Difficulté | n | Hit@1 | Hit@{k} | MRR |", "|---|---|---|---|---|"]
    for diff, a in res["by_difficulty"].items():
        lines.append(f"| {diff} | {a['n']} | {a['hit@1']:.1%} | {a[f'hit@{k}']:.1%} | {a['mrr']:.3f} |")
    if res["failures"]:
        lines += ["", f"## Échecs ({len(res['failures'])})", ""]
        for f in res["failures"]:
            lines.append(f"- « {f['q']} » → attendu `{f['expected']}`, obtenu `{f['retrieved']}`")
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--top-k", type=int, default=3)
    args = parser.parse_args()

    res = asyncio.run(run_eval(top_k=args.top_k))

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M")
    json_path = RESULTS_DIR / f"rag_eval_{stamp}.json"
    md_path = RESULTS_DIR / f"rag_eval_{stamp}.md"
    json_path.write_text(json.dumps(res, ensure_ascii=False, indent=2), encoding="utf-8")
    md_path.write_text(to_markdown(res), encoding="utf-8")

    g = res["global"]
    k = res["top_k"]
    print(f"\n=== RAG Eval ({res['retrieval_backend']}) — {g['n']} questions ===")
    print(f"Hit@1 = {g['hit@1']:.1%} | Hit@{k} = {g[f'hit@{k}']:.1%} | "
          f"MRR = {g['mrr']:.3f} | Precision@{k} = {g['context_precision']:.1%}")
    for lang, a in res["by_lang"].items():
        print(f"  [{lang}] Hit@{k} = {a[f'hit@{k}']:.1%} | MRR = {a['mrr']:.3f}")
    print(f"\nRapports : {json_path.name}, {md_path.name} (tests/rag_eval/results/)")


if __name__ == "__main__":
    main()
