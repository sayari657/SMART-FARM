"""Test manuel du service agro-climat (GDD + risques maladie) sur Tunis."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.agro_climate_service import get_farm_disease_risks, get_farm_gdd  # noqa: E402


async def main():
    g = await get_farm_gdd(36.8, 10.1, "olivier")
    if "error" in g:
        print("GDD ERROR:", g["error"])
    else:
        print("GDD cum:", g["gdd_cum"], "| stade:", g["stade_actuel"]["stade"],
              "| suivant:", (g.get("stade_suivant") or {}).get("stade"),
              "| progression:", g.get("progression_pct"), "%")
        print("series:", len(g.get("series", [])), "jours | derniere meteo:", g.get("last_weather_date"))

    r = await get_farm_disease_risks(36.8, 10.1)
    for x in r.get("risks", []):
        print(f"{x['maladie']:22s} {x['score']:3d}% {x['niveau']:9s} {x['justification']}")


if __name__ == "__main__":
    asyncio.run(main())
