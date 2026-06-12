from __future__ import annotations

import json
import sqlite3
from collections import Counter
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.colors import ListedColormap


ROOT = Path(__file__).resolve().parents[3]
KB_PATH = ROOT / "backend" / "app" / "data" / "agri_knowledge.json"
DB_PATH = ROOT / "backend" / "smart_farm.db"
OUT = ROOT / "diagramme" / "06_RAG_LLM_Rapport" / "images"
DATA_OUT = ROOT / "diagramme" / "06_RAG_LLM_Rapport" / "data"

COLORS = {
    "navy": "#16324F",
    "blue": "#2563EB",
    "teal": "#0F766E",
    "green": "#059669",
    "amber": "#D97706",
    "orange": "#EA580C",
    "red": "#DC2626",
    "purple": "#7E22CE",
    "slate": "#475569",
    "light": "#F8FAFC",
}


BENCHMARK = [
    ("mammite vache lait pis chaud", "bovin-mammite", "cow"),
    ("stress chaleur bovin humidite production lait", "bovin-stress-thermique", "cow"),
    ("ration engraissement mouton avant aid", "ovin-engraissement", "sheep"),
    ("boiterie foot rot mouton", "ovin-piétin", "sheep"),
    ("parasites chevreau lait caprin", "caprin-elevage", "goat"),
    ("temperature nid lapereaux ventilation", "lapin-chaleur-nid", "rabbit"),
    ("mortalite soudaine poulet biosecurite", "volaille-broiler-biosecurite", "poultry"),
    ("calcium lumiere baisse ponte", "volaille-pondeuse", "poultry"),
    ("chaleur couvain eau ombre ruche", "abeille-stress-thermique", "bee"),
    ("seuil infestation varroa traitement", "abeille-varroa", "bee"),
    ("perte poids ruche essaimage", "abeille-essaimage", "bee"),
    ("sirop candi nourrissement hiver", "abeille-nourrissement", "bee"),
    ("taille recolte huile olive", "olivier-recolte-taille", "olive"),
    ("Bactrocera piege pheromone olivier", "olivier-mouche", "olive"),
    ("feuilles agrumes jaunes fer sol calcaire", "agrumes-chlorose-fer", "citrus"),
    ("cochenille fumagine huile blanche", "agrumes-cochenille", "citrus"),
    ("pollinisation deglet nour ensachage", "palmier-pollinisation", "datte"),
    ("semis ble orge novembre azote", "cereales-conduite", "cereal"),
    ("mildiou tomate irrigation Kc", "maraichage-tomate", "tomate"),
    ("batata potasse tubercule fevrier", "maraichage-pomme-terre", "pomme_de_terre"),
    ("ET0 Penman Monteith besoin eau", "irrigation-et0-fao56", "general"),
    ("eau saumatre lessivage drainage", "irrigation-salinite", "general"),
]


def set_style() -> None:
    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "font.size": 10,
            "axes.titlesize": 13,
            "axes.labelsize": 10,
            "axes.edgecolor": "#CBD5E1",
            "axes.linewidth": 0.8,
            "axes.grid": True,
            "grid.color": "#E2E8F0",
            "grid.linewidth": 0.7,
            "figure.facecolor": "white",
            "axes.facecolor": "white",
            "savefig.facecolor": "white",
        }
    )


def save_figure(fig: plt.Figure, stem: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT / f"{stem}.png", dpi=300, bbox_inches="tight")
    fig.savefig(OUT / f"{stem}.svg", bbox_inches="tight")
    plt.close(fig)


def load_kb() -> list[dict]:
    payload = json.loads(KB_PATH.read_text(encoding="utf-8"))
    return payload["entries"]


def query_rows(connection: sqlite3.Connection, sql: str) -> pd.DataFrame:
    return pd.read_sql_query(sql, connection)


def table_count(connection: sqlite3.Connection, table: str) -> int:
    return int(connection.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0])


def generate_knowledge_coverage(entries: list[dict]) -> None:
    frame = pd.DataFrame(entries)
    frame["doc_length"] = frame["doc"].str.len()
    frame["keyword_count"] = frame["keywords"].str.len()

    fig, axes = plt.subplots(2, 2, figsize=(15, 10))
    fig.suptitle(
        "Profil de la base de connaissances agronomiques",
        fontsize=19,
        fontweight="bold",
        color=COLORS["navy"],
    )

    category = frame["category"].value_counts().sort_values()
    axes[0, 0].barh(category.index, category.values, color=COLORS["blue"])
    axes[0, 0].set_title("Couverture par categorie")
    axes[0, 0].set_xlabel("Nombre de documents")
    axes[0, 0].grid(axis="x")
    for index, value in enumerate(category.values):
        axes[0, 0].text(value + 0.12, index, str(value), va="center")

    species = frame["species"].value_counts().sort_values()
    axes[0, 1].barh(species.index, species.values, color=COLORS["teal"])
    axes[0, 1].set_title("Couverture par espece ou culture")
    axes[0, 1].set_xlabel("Nombre de documents")
    axes[0, 1].grid(axis="x")

    sources = frame["source"].value_counts().head(8).sort_values()
    axes[1, 0].barh(sources.index, sources.values, color=COLORS["amber"])
    axes[1, 0].set_title("Principales sources declarees")
    axes[1, 0].set_xlabel("Nombre de documents")
    axes[1, 0].grid(axis="x")

    axes[1, 1].hist(
        frame["doc_length"],
        bins=8,
        color=COLORS["purple"],
        edgecolor="white",
    )
    axes[1, 1].axvline(
        frame["doc_length"].mean(),
        color=COLORS["red"],
        linestyle="--",
        label=f"Moyenne = {frame['doc_length'].mean():.0f} caracteres",
    )
    axes[1, 1].set_title("Longueur des passages documentaires")
    axes[1, 1].set_xlabel("Nombre de caracteres")
    axes[1, 1].set_ylabel("Frequence")
    axes[1, 1].legend()

    fig.text(
        0.5,
        0.015,
        (
            f"{len(frame)} passages | {frame['species'].nunique()} domaines/especes | "
            f"{int(frame['keyword_count'].sum())} mots-cles | "
            "corpus utile mais encore limite pour une couverture industrielle"
        ),
        ha="center",
        color=COLORS["slate"],
        fontsize=11,
    )
    fig.tight_layout(rect=[0, 0.045, 1, 0.94])
    save_figure(fig, "06_couverture_base_connaissances")


def generate_database_profile(connection: sqlite3.Connection) -> dict[str, int]:
    selected_tables = [
        "farms",
        "animal_units",
        "animal_logs",
        "bee_visits",
        "bee_planning",
        "poultry_feed_logs",
        "poultry_health_logs",
        "poultry_egg_logs",
        "cv_events",
        "alerts",
        "diagnostic_history",
        "reports",
    ]
    counts = {table: table_count(connection, table) for table in selected_tables}

    animals = query_rows(
        connection,
        "SELECT status, lifecycle_status, health_score FROM animal_units",
    )
    cv = query_rows(
        connection,
        "SELECT object_class, confidence, severity FROM cv_events",
    )
    poultry = query_rows(
        connection,
        "SELECT fcr_calculated FROM poultry_feed_logs WHERE fcr_calculated IS NOT NULL",
    )
    health = query_rows(
        connection,
        "SELECT deaths_today FROM poultry_health_logs WHERE deaths_today IS NOT NULL",
    )

    fig, axes = plt.subplots(2, 2, figsize=(16, 10))
    fig.suptitle(
        "Profil des donnees metier disponibles dans Smart Farm AI",
        fontsize=19,
        fontweight="bold",
        color=COLORS["navy"],
    )

    labels = [name.replace("_", "\n") for name in counts]
    values = list(counts.values())
    bars = axes[0, 0].bar(labels, values, color=COLORS["blue"])
    axes[0, 0].set_title("Volumetrie des principales tables")
    axes[0, 0].set_ylabel("Nombre de lignes")
    axes[0, 0].tick_params(axis="x", rotation=35)
    for bar, value in zip(bars, values):
        axes[0, 0].text(
            bar.get_x() + bar.get_width() / 2,
            value + 2,
            str(value),
            ha="center",
            fontsize=8,
        )

    axes[0, 1].hist(
        animals["health_score"].dropna(),
        bins=np.linspace(65, 102, 9),
        color=COLORS["green"],
        edgecolor="white",
    )
    axes[0, 1].axvline(
        animals["health_score"].mean(),
        color=COLORS["red"],
        linestyle="--",
        label=f"Moyenne = {animals['health_score'].mean():.1f}",
    )
    axes[0, 1].set_title("Scores de sante des unites animales")
    axes[0, 1].set_xlabel("Score de sante")
    axes[0, 1].set_ylabel("Nombre d'unites")
    axes[0, 1].legend()

    if not cv.empty:
        axes[1, 0].hist(
            cv["confidence"].dropna(),
            bins=12,
            color=COLORS["orange"],
            edgecolor="white",
        )
        axes[1, 0].axvline(
            cv["confidence"].mean(),
            color=COLORS["navy"],
            linestyle="--",
            label=f"Confiance moyenne = {cv['confidence'].mean():.3f}",
        )
        axes[1, 0].set_title("Distribution des confiances CV")
        axes[1, 0].set_xlabel("Confiance")
        axes[1, 0].set_ylabel("Nombre d'evenements")
        axes[1, 0].legend()

    axes[1, 1].boxplot(
        [
            poultry["fcr_calculated"].dropna(),
            health["deaths_today"].dropna(),
        ],
        labels=["FCR volaille", "Mortalite / jour"],
        patch_artist=True,
        boxprops={"facecolor": "#DDD6FE", "edgecolor": COLORS["purple"]},
        medianprops={"color": COLORS["red"], "linewidth": 2},
    )
    axes[1, 1].set_title("Dispersion des indicateurs avicoles")
    axes[1, 1].set_ylabel("Valeur observee")

    fig.tight_layout(rect=[0, 0, 1, 0.94])
    save_figure(fig, "07_profil_base_metier")

    DATA_OUT.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(
        [{"table": table, "rows": value} for table, value in counts.items()]
    ).to_csv(DATA_OUT / "profil_tables_metier.csv", index=False, encoding="utf-8")
    return counts


def generate_data_quality(connection: sqlite3.Connection, counts: dict[str, int]) -> None:
    feed = query_rows(
        connection,
        "SELECT average_weight_g, fcr_calculated, status FROM poultry_feed_logs",
    )
    health = query_rows(connection, "SELECT status FROM poultry_health_logs")
    eggs = query_rows(
        connection,
        "SELECT production_rate, status FROM poultry_egg_logs",
    )
    visits = query_rows(
        connection,
        "SELECT temperature, health_score, harvest_kg FROM bee_visits",
    )
    cv = query_rows(connection, "SELECT object_class FROM cv_events")

    cv_share = 0.0
    if not cv.empty:
        cv_share = float(cv["object_class"].value_counts(normalize=True).max() * 100)

    issues = {
        "Logs avicoles en attente de validation": int(
            (feed["status"] == "pending").sum()
            + (health["status"] == "pending").sum()
            + (eggs["status"] == "pending").sum()
        ),
        "Poids moyen manquant dans feed logs": int(feed["average_weight_g"].isna().sum()),
        "Taux de ponte superieur a 100 %": int((eggs["production_rate"] > 100).sum()),
        "FCR superieur a 3": int((feed["fcr_calculated"] > 3).sum()),
        "Temperature manquante des visites ruches": int(visits["temperature"].isna().sum()),
        "Score sante ruche manquant": int(visits["health_score"].isna().sum()),
    }

    empty_tables = {
        "Telemetrie": table_count(connection, "telemetry_records"),
        "Anomalies": table_count(connection, "anomalies"),
        "Recommandations": table_count(connection, "recommendations"),
        "Productions apicoles": table_count(connection, "bee_productions"),
        "Feedback ML": table_count(connection, "ml_feedback"),
        "Evaluation modeles": table_count(connection, "model_evaluations"),
    }

    fig, axes = plt.subplots(1, 2, figsize=(16, 7.5))
    fig.suptitle(
        "Audit de qualite et disponibilite des donnees",
        fontsize=19,
        fontweight="bold",
        color=COLORS["navy"],
    )

    issue_series = pd.Series(issues).sort_values()
    axes[0].barh(issue_series.index, issue_series.values, color=COLORS["red"])
    axes[0].set_title("Problemes detectes dans la base actuelle")
    axes[0].set_xlabel("Nombre d'enregistrements concernes")
    axes[0].grid(axis="x")
    for index, value in enumerate(issue_series.values):
        axes[0].text(value + 0.6, index, str(value), va="center")

    availability = pd.Series(empty_tables).sort_values()
    display_values = [1 if value == 0 else value for value in availability.values]
    colors = [COLORS["red"] if value == 0 else COLORS["green"] for value in availability.values]
    axes[1].barh(availability.index, display_values, color=colors, alpha=0.88)
    axes[1].set_title("Tables critiques pour la Data Science")
    axes[1].set_xlabel("Etat de disponibilite")
    axes[1].set_xlim(0, max(display_values) * 1.35)
    axes[1].set_xticks([])
    axes[1].grid(False)
    for index, value in enumerate(availability.values):
        label = "0 ligne - donnees absentes" if value == 0 else f"{value} lignes"
        axes[1].text(0.04, index, label, va="center", color="white", fontweight="bold")

    fig.text(
        0.5,
        0.025,
        (
            f"Le type CV dominant represente {cv_share:.1f} % des evenements. "
            "Cette concentration cree un risque de biais et limite l'analyse multi-domaine."
        ),
        ha="center",
        fontsize=11,
        color=COLORS["slate"],
    )
    fig.tight_layout(rect=[0, 0.06, 1, 0.93])
    save_figure(fig, "08_audit_qualite_donnees")

    quality_rows = [
        {"controle": key, "nombre": value, "type": "quality_issue"}
        for key, value in issues.items()
    ] + [
        {"controle": key, "nombre": value, "type": "table_availability"}
        for key, value in empty_tables.items()
    ]
    pd.DataFrame(quality_rows).to_csv(
        DATA_OUT / "audit_qualite_donnees.csv",
        index=False,
        encoding="utf-8",
    )


def lexical_rank(entries: list[dict], query: str, species: str | None) -> list[str]:
    query_lower = query.lower()
    scored = []
    for entry in entries:
        score = sum(
            1
            for keyword in entry.get("keywords", [])
            if keyword.lower() in query_lower
        )
        if species and entry.get("species") == species:
            score += 2
        if score > 0:
            scored.append((score, entry["id"]))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [item[1] for item in scored]


def generate_retrieval_benchmark(entries: list[dict]) -> None:
    rows = []
    for query, expected, species in BENCHMARK:
        ranking = lexical_rank(entries, query, species)
        rank = ranking.index(expected) + 1 if expected in ranking else None
        rows.append(
            {
                "query": query,
                "species": species,
                "expected_document": expected,
                "rank": rank,
                "top1_document": ranking[0] if ranking else "",
                "top3_documents": " | ".join(ranking[:3]),
            }
        )

    frame = pd.DataFrame(rows)
    top1 = float((frame["rank"] == 1).mean())
    top3 = float(frame["rank"].fillna(999).le(3).mean())
    mrr = float(frame["rank"].dropna().map(lambda rank: 1 / rank).sum() / len(frame))
    no_hit = int(frame["rank"].isna().sum())

    fig, axes = plt.subplots(1, 2, figsize=(14, 6.5))
    fig.suptitle(
        "Benchmark du retrieval lexical actuel",
        fontsize=19,
        fontweight="bold",
        color=COLORS["navy"],
    )

    metric_names = ["Top-1", "Top-3", "MRR"]
    metric_values = [top1, top3, mrr]
    bars = axes[0].bar(
        metric_names,
        metric_values,
        color=[COLORS["blue"], COLORS["green"], COLORS["purple"]],
    )
    axes[0].set_ylim(0, 1.05)
    axes[0].set_ylabel("Score")
    axes[0].set_title(f"Resultats sur {len(frame)} questions expertes")
    for bar, value in zip(bars, metric_values):
        axes[0].text(
            bar.get_x() + bar.get_width() / 2,
            value + 0.02,
            f"{value * 100:.1f} %",
            ha="center",
            fontweight="bold",
        )

    rank_counts = frame["rank"].fillna(0).astype(int).value_counts().sort_index()
    labels = ["No-hit" if rank == 0 else f"Rang {rank}" for rank in rank_counts.index]
    axes[1].bar(labels, rank_counts.values, color=COLORS["amber"])
    axes[1].set_title("Distribution du rang du document attendu")
    axes[1].set_ylabel("Nombre de questions")
    axes[1].tick_params(axis="x", rotation=20)
    for index, value in enumerate(rank_counts.values):
        axes[1].text(index, value + 0.15, str(value), ha="center")

    fig.text(
        0.5,
        0.02,
        (
            "Benchmark manuel et limite: il mesure le fallback keywords + filtre espece, "
            "pas encore la qualite de ChromaDB ni la faithfulness du LLM."
        ),
        ha="center",
        fontsize=10.5,
        color=COLORS["slate"],
    )
    fig.tight_layout(rect=[0, 0.06, 1, 0.93])
    save_figure(fig, "09_benchmark_retrieval_actuel")

    frame.to_csv(
        DATA_OUT / "benchmark_retrieval.csv",
        index=False,
        encoding="utf-8",
    )
    pd.DataFrame(
        [
            {
                "questions": len(frame),
                "top1": top1,
                "top3": top3,
                "mrr": mrr,
                "no_hit": no_hit,
            }
        ]
    ).to_csv(DATA_OUT / "benchmark_retrieval_resume.csv", index=False)


def generate_data_science_matrix() -> None:
    rows = [
        "Animaux",
        "Abeilles",
        "Volaille",
        "Plantes / arbres",
        "Vision CV",
        "RAG / LLM",
    ]
    columns = [
        "EDA",
        "Qualite",
        "Anomalies",
        "Prevision",
        "Vision",
        "RAG",
        "Explicabilite",
        "MLOps",
    ]
    matrix = np.array(
        [
            [2, 2, 2, 1, 2, 2, 1, 1],
            [2, 2, 2, 2, 2, 2, 1, 1],
            [2, 2, 1, 2, 2, 2, 2, 2],
            [1, 1, 0, 1, 2, 2, 1, 1],
            [2, 1, 1, 0, 2, 1, 1, 2],
            [1, 1, 0, 0, 1, 2, 1, 1],
        ]
    )

    fig, ax = plt.subplots(figsize=(14, 7.5))
    cmap = ListedColormap(["#FEE2E2", "#FEF3C7", "#D1FAE5"])
    image = ax.imshow(matrix, cmap=cmap, vmin=0, vmax=2, aspect="auto")
    ax.set_xticks(range(len(columns)), labels=columns, rotation=25, ha="right")
    ax.set_yticks(range(len(rows)), labels=rows)
    ax.set_title(
        "Matrice de maturite Data Science par domaine",
        fontsize=19,
        fontweight="bold",
        color=COLORS["navy"],
        pad=20,
    )
    labels = {0: "Absent", 1: "Prototype", 2: "Implemente"}
    for row in range(matrix.shape[0]):
        for column in range(matrix.shape[1]):
            ax.text(
                column,
                row,
                labels[int(matrix[row, column])],
                ha="center",
                va="center",
                fontsize=9,
                fontweight="semibold",
                color="#0F172A",
            )
    ax.set_xticks(np.arange(-0.5, len(columns), 1), minor=True)
    ax.set_yticks(np.arange(-0.5, len(rows), 1), minor=True)
    ax.grid(which="minor", color="white", linestyle="-", linewidth=2)
    ax.grid(False)
    legend_handles = [
        plt.Rectangle((0, 0), 1, 1, color="#FEE2E2", label="Absent"),
        plt.Rectangle((0, 0), 1, 1, color="#FEF3C7", label="Prototype"),
        plt.Rectangle((0, 0), 1, 1, color="#D1FAE5", label="Implemente"),
    ]
    ax.legend(handles=legend_handles, loc="upper center", bbox_to_anchor=(0.5, -0.16), ncol=3)
    fig.text(
        0.5,
        0.015,
        "Evaluation technique fondee sur les services, tables et artefacts presents dans le projet.",
        ha="center",
        color=COLORS["slate"],
    )
    fig.tight_layout(rect=[0, 0.07, 1, 1])
    save_figure(fig, "10_matrice_maturite_data_science")


def main() -> None:
    set_style()
    entries = load_kb()
    generate_knowledge_coverage(entries)

    with sqlite3.connect(DB_PATH) as connection:
        counts = generate_database_profile(connection)
        generate_data_quality(connection, counts)

    generate_retrieval_benchmark(entries)
    generate_data_science_matrix()
    print(f"Figures generees dans : {OUT}")
    print(f"Donnees d'audit generees dans : {DATA_OUT}")


if __name__ == "__main__":
    main()
