"""
RAG knowledge base — verify the sovereign knowledge base covers every category
(animals, bee, plants/trees, irrigation) and that offline retrieval works.
"""
import asyncio

from app.services.rag_service import load_knowledge_base, _search_knowledge_base, rag_service


def test_kb_loads_and_covers_all_categories():
    kb = load_knowledge_base()
    assert len(kb) >= 20, "knowledge base should be substantial"
    cats = {e["category"] for e in kb}
    # every required domain must be present
    assert {"animal", "bee", "plant", "irrigation"} <= cats
    species = {e["species"] for e in kb}
    # all livestock + the main Tunisian crops/trees
    for s in ("cow", "sheep", "goat", "rabbit", "poultry", "bee",
              "olive", "citrus", "datte", "cereal", "tomate"):
        assert s in species, f"missing species in KB: {s}"


def test_every_entry_is_well_formed():
    for e in load_knowledge_base():
        assert e.get("id") and e.get("doc") and e.get("keywords")
        assert len(e["doc"]) > 80, f"entry {e['id']} doc too short"


def test_retrieval_hits_each_domain():
    cases = [
        ("nourrir vache laitiere fourrage", "cow"),
        ("varroa abeille rucher traitement", "bee"),
        ("recolter olives taille olivier", None),
        ("agrumes citron feuilles jaunes fer", None),
        ("pollinisation palmier dattier", None),
        ("seuil humidite irrigation ET0", None),
    ]
    for query, species in cases:
        hits = _search_knowledge_base(query, species=species)
        assert hits, f"no KB hit for: {query}"


def test_query_wisdom_offline_returns_real_kb():
    # rag_service runs in offline mode in tests (no ChromaDB) → must use the KB
    res = asyncio.get_event_loop().run_until_complete(
        rag_service.query_wisdom("traitement varroa abeille", species="bee")
    )
    assert res and "Varroa" in res[0]
