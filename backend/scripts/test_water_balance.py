"""Test manuel du bilan hydrique (SoilGrids + ERA5) — oliveraie à Sfax."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.soil_water_service import compute_water_balance  # noqa: E402


async def main():
    r = await compute_water_balance(34.74, 10.76, "olivier")   # Sfax
    if "error" in r:
        print("ERREUR:", r["error"])
        return
    print(f"Sol ({r['soil']['source']}): sable {r['soil'].get('sand')}% / argile {r['soil'].get('clay')}%")
    print(f"RU = {r['soil']['awc_mm_per_m']} mm/m | TAW zone racinaire = {r['taw_mm']} mm | RFU = {r['raw_mm']} mm")
    print(f"Stock actuel = {r['stock_mm']} mm | épuisement = {r['depletion_mm']} mm")
    print(f"Statut: {r['status']} | autonomie: {r['days_until_stress']} j")
    print("→", r["recommendation"])
    print("3 derniers jours:", r["series"][-3:])


if __name__ == "__main__":
    asyncio.run(main())
