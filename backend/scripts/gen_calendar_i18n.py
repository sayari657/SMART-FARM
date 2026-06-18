"""One-off: translate the agricultural-calendar French vocabulary to EN + AR via
Groq, and save app/data/calendar_i18n.json. Re-run only when the calendar data
changes.  Usage:  python -m scripts.gen_calendar_i18n
"""
import json
import os
import re
import sys
import time
import pathlib

import httpx

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.core.config import settings  # noqa: E402

SRC = ROOT / "app" / "services" / "crop_calendar_service.py"
OUT = ROOT / "app" / "data" / "calendar_i18n.json"

text = SRC.read_text(encoding="utf-8")
cultures = sorted(set(re.findall(r'"([a-z_]+)":\s*\[', text)) - {"traitements_preventifs"})
stades = sorted(set(re.findall(r'"stade":\s*"([^"]+)"', text)))
actions = sorted(set(re.findall(r'"action":\s*"([^"]+)"', text)))
diseases = ["Mildiou", "Œil de paon", "Oïdium", "Mouche de l'olive", "Rouille brune"]
# zones + GDD phenology + a few risk words
extra = ["Nord", "Centre", "Côtier", "Sud", "Tell", "Kroumirie", "Dorsale", "Steppes",
         "Sahel", "Cap Bon", "Jeffara", "Oasis",
         "nouaison", "durcissement noyau", "floraison", "véraison", "récolte", "dormance"]

# Make crop/stade keys human-readable French first (the model translates FR text)
def humanize(s):
    return s.replace("_", " ")

groups = {
    "cultures": {humanize(c): None for c in cultures},
    "stades":   {humanize(s): None for s in stades},
    "actions":  {a: None for a in actions},
    "diseases": {d: None for d in diseases},
    "extra":    {e: None for e in extra},
}


def translate(items, lang_name):
    """Ask Groq for a JSON map {french: translation}."""
    payload = {
        "model": "llama-3.3-70b-versatile",
        "temperature": 0.1,
        "max_tokens": 4096,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content":
                f"You are an agronomy translator. Translate French agricultural-calendar "
                f"terms into {lang_name}. Keep it concise, technical and correct. "
                f"Return ONLY a JSON object mapping each EXACT input French string to its "
                f"{lang_name} translation. No extra keys, no comments."},
            {"role": "user", "content": json.dumps(items, ensure_ascii=False)},
        ],
    }
    for attempt in range(6):
        r = httpx.post("https://api.groq.com/openai/v1/chat/completions",
                       headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                       json=payload, timeout=90)
        if r.status_code == 429:
            wait = float(r.headers.get("retry-after", 0)) or (15 * (attempt + 1))
            print(f"    429 rate-limited → wait {wait:.0f}s", flush=True)
            time.sleep(wait + 2)
            continue
        r.raise_for_status()
        time.sleep(8)  # stay under the per-minute token budget
        return json.loads(r.json()["choices"][0]["message"]["content"])
    raise RuntimeError("Groq still rate-limited after retries")


result = {}
for group, items in groups.items():
    fr_list = list(items.keys())
    print(f"[{group}] {len(fr_list)} termes → EN…", flush=True)
    en = translate(fr_list, "English")
    print(f"[{group}] → AR…", flush=True)
    ar = translate(fr_list, "Arabic (Modern Standard, agronomic)")
    result[group] = {fr: {"en": en.get(fr, fr), "ar": ar.get(fr, fr)} for fr in fr_list}

OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
print("Saved", OUT, "—",
      sum(len(v) for v in result.values()), "terms × (en, ar)")
