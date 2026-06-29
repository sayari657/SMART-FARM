from typing import Optional
from datetime import datetime
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.weather_service import weather_service
from app.models.domain import Farm, WeatherAlert, User
from sqlalchemy.orm import Session

router = APIRouter()

# Default coordinates (Tunis) used when farm has no GPS
_DEFAULT_LAT = 36.8065
_DEFAULT_LON = 10.1815


def _resolve_coords(farm: Farm, fallback_lat: Optional[float], fallback_lon: Optional[float]):
    """Return (lat, lon) from farm GPS, query-param override, or Tunisia default."""
    lat = fallback_lat or farm.latitude or _DEFAULT_LAT
    lon = fallback_lon or farm.longitude or _DEFAULT_LON
    return lat, lon


@router.get("/current/{farm_id}")
async def get_current_weather(
    farm_id: int,
    lat: Optional[float] = Query(None, description="Override latitude"),
    lon: Optional[float] = Query(None, description="Override longitude"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")

    resolved_lat, resolved_lon = _resolve_coords(farm, lat, lon)
    data = await weather_service.get_current_weather(resolved_lat, resolved_lon)
    if not data:
        raise HTTPException(status_code=503, detail="Weather service unavailable")

    data["coords_source"] = (
        "query_params" if (lat or lon)
        else ("farm_gps" if (farm.latitude and farm.longitude) else "default_tunis")
    )
    return data


@router.get("/coords")
async def get_weather_by_coords(lat: float, lon: float):
    data = await weather_service.get_current_weather(lat, lon)
    if not data:
        raise HTTPException(status_code=503, detail="Weather service unavailable for these coordinates")
    return data


@router.get("/forecast/{farm_id}")
async def get_forecast(
    farm_id: int,
    lat: Optional[float] = Query(None, description="Override latitude"),
    lon: Optional[float] = Query(None, description="Override longitude"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")

    resolved_lat, resolved_lon = _resolve_coords(farm, lat, lon)
    data = await weather_service.get_forecast(resolved_lat, resolved_lon)
    if not data:
        raise HTTPException(status_code=503, detail="Weather forecast service unavailable")
    return data


# ── Prévision 5 jours assistée par IA ────────────────────────────────────────
_WMO = {
    0: ("☀️", "Ciel dégagé"), 1: ("🌤️", "Peu nuageux"), 2: ("⛅", "Partiellement nuageux"), 3: ("☁️", "Couvert"),
    45: ("🌫️", "Brouillard"), 48: ("🌫️", "Brouillard givrant"),
    51: ("🌦️", "Bruine légère"), 53: ("🌦️", "Bruine"), 55: ("🌦️", "Bruine dense"),
    61: ("🌧️", "Pluie faible"), 63: ("🌧️", "Pluie"), 65: ("🌧️", "Pluie forte"),
    66: ("🌧️", "Pluie verglaçante"), 67: ("🌧️", "Pluie verglaçante forte"),
    71: ("❄️", "Neige faible"), 73: ("❄️", "Neige"), 75: ("❄️", "Neige forte"), 77: ("❄️", "Grésil"),
    80: ("🌦️", "Averses"), 81: ("🌦️", "Averses"), 82: ("⛈️", "Averses violentes"),
    85: ("❄️", "Averses de neige"), 86: ("❄️", "Averses de neige"),
    95: ("⛈️", "Orage"), 96: ("⛈️", "Orage + grêle"), 99: ("⛈️", "Orage violent"),
}
_JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]


def _day_advice(d: dict) -> list:
    tips = []
    tmax, tmin = d.get("t_max"), d.get("t_min")
    rain, wind, uv = d.get("precip_mm") or 0, d.get("wind_max") or 0, d.get("uv_max") or 0
    if tmax is not None and tmax >= 35:
        tips.append("🥵 Canicule : ombre + eau fraîche pour le bétail, éviter le travail 11h–16h")
    if tmin is not None and tmin <= 3:
        tips.append("🥶 Risque de gel : protéger jeunes animaux, ruches et plants sensibles")
    if rain >= 15:
        tips.append("🌧️ Fortes pluies : abriter les animaux, drainer, reporter les traitements")
    elif rain >= 3:
        tips.append("🌦️ Pluie : prévoir l'abri et décaler l'irrigation")
    if wind >= 40:
        tips.append("💨 Vent fort : sécuriser toitures, ruches et clôtures")
    if uv >= 8:
        tips.append("🔆 UV extrême : limiter l'exposition des ouvriers (11h–16h)")
    if not tips:
        tips.append("✅ Conditions favorables : journée de travail normale")
    return tips


def _rule_summary(days: list, lang: str = "fr") -> str:
    hot = round(max((x.get("t_max") or -99) for x in days))
    cold = round(min((x.get("t_min") or 99) for x in days))
    rain = round(sum((x.get("precip_mm") or 0) for x in days))
    wind = round(max((x.get("wind_max") or 0) for x in days))
    uv = round(max((x.get("uv_max") or 0) for x in days))
    if lang == "en":
        s = [f"Over 5 days: temperatures {cold}–{hot}°C, total rain ~{rain} mm, wind up to {wind} km/h, max UV {uv}."]
        if hot >= 35: s.append("Anticipate the heat (shade, water, shifted work hours).")
        if rain >= 15: s.append("Prepare shelters for rainy spells.")
        if uv >= 8: s.append("Protect workers from midday UV.")
        if cold <= 3: s.append("Watch for frost on young animals and hives.")
    elif lang == "ar":
        s = [f"خلال 5 أيام: حرارة من {cold} إلى {hot}°م، مجموع الأمطار ~{rain} مم، رياح حتى {wind} كم/س، أقصى UV {uv}."]
        if hot >= 35: s.append("استعدّ للحرّ (ظلّ، ماء، توقيت عمل مناسب).")
        if rain >= 15: s.append("جهّز المآوي لفترات المطر.")
        if uv >= 8: s.append("احمِ العمّال من أشعة UV وسط النهار.")
        if cold <= 3: s.append("انتبه للصقيع على صغار الحيوانات والخلايا.")
    else:
        s = [f"Sur 5 jours : températures de {cold}°C à {hot}°C, cumul de pluie ~{rain} mm, vent jusqu'à {wind} km/h, UV max {uv}."]
        if hot >= 35: s.append("Anticipez la chaleur (ombre, eau, horaires décalés).")
        if rain >= 15: s.append("Préparez les abris pour les épisodes pluvieux.")
        if uv >= 8: s.append("Protégez les ouvriers des UV en milieu de journée.")
        if cold <= 3: s.append("Attention au gel pour les jeunes animaux et les ruches.")
    return " ".join(s)


def _lang_ok(text: str, lang: str) -> bool:
    """Vérifie que la réponse IA est bien dans la langue demandée (sinon on bascule
    sur le résumé localisé fiable)."""
    if not text:
        return False
    if lang == "ar":
        return any("؀" <= c <= "ۿ" for c in text)        # contient de l'arabe
    if lang == "en":
        return not any(c in "éèêàâùûôîçëïœ" for c in text.lower())  # pas d'accents FR
    return True


async def _ai_weather_advice(days: list, farm_name: str, lang: str = "fr") -> dict:
    ctx = "\n".join(
        f"- {d['date']}: temp "
        f"{round(d['t_min']) if d.get('t_min') is not None else '?'}-"
        f"{round(d['t_max']) if d.get('t_max') is not None else '?'}C, "
        f"rain {round(d.get('precip_mm') or 0)}mm, wind {round(d.get('wind_max') or 0)}km/h, "
        f"UV {round(d.get('uv_max') or 0)}, code {d.get('code')}"
        for d in days)
    _sys = {
        "fr": "Tu es un expert agricole tunisien. Réponds en FRANÇAIS, concis et professionnel.",
        "en": "You are a Tunisian agricultural expert. Answer in clear, concise, professional ENGLISH.",
        "ar": "أنت خبير فلاحي تونسي. أجب بالعربية (لهجة تونسية مفهومة)، بإيجاز وباحترافية.",
    }.get(lang, "Tu es un expert agricole tunisien. Réponds en FRANÇAIS, concis et professionnel.")
    _ask = {
        "fr": "Rédige un résumé CLAIR et CONCIS (3 à 4 phrases, en FRANÇAIS) des actions prioritaires pour le bétail, les abeilles et les cultures (chaleur, pluie, vent, UV, gel). Pas de liste à puces.",
        "en": "Write a CLEAR and CONCISE summary (3-4 sentences, in ENGLISH) of the priority actions for livestock, bees and crops (heat, rain, wind, UV, frost). No bullet list.",
        "ar": "اكتب ملخّصًا واضحًا وموجزًا (3 إلى 4 جُمل، بالعربية) لأهمّ الإجراءات للماشية والنحل والمحاصيل (حرارة، مطر، رياح، UV، صقيع). دون قوائم نقطية.",
    }.get(lang, "")
    _intro = {
        "fr": f"Prévision météo 5 jours pour la ferme « {farm_name} » :",
        "en": f'5-day weather forecast for the farm "{farm_name}":',
        "ar": f"توقّعات الطقس لـ5 أيام لمزرعة « {farm_name} » :",
    }.get(lang, f"Prévision météo 5 jours pour la ferme « {farm_name} » :")
    _only = {"fr": "Réponds UNIQUEMENT en français.",
             "en": "Respond ONLY in English.",
             "ar": "أجب بالعربية فقط."}.get(lang, "Réponds UNIQUEMENT en français.")
    prompt = f"{_only}\n\n{_intro}\n{ctx}\n\n{_ask}\n\n{_only}"
    try:
        from app.core.config import settings
        if settings.GROQ_API_KEY:
            async with httpx.AsyncClient(timeout=20) as client:
                r = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                    json={"model": "llama-3.3-70b-versatile", "temperature": 0.4,
                          "messages": [
                              {"role": "system", "content": _sys},
                              {"role": "user", "content": prompt}]})
                if r.status_code == 200:
                    txt = (r.json()["choices"][0]["message"]["content"] or "").strip()
                    if txt and _lang_ok(txt, lang):
                        return {"text": txt, "source": "groq"}
    except Exception:
        pass
    try:
        from app.services.mllm_service import mllm_service
        res = await mllm_service.generate_response(f"{_sys}\n\n{prompt}", timeout=25)
        txt = (res.get("response") or "").strip() if res else ""
        if txt and _lang_ok(txt, lang):
            return {"text": txt, "source": "ollama"}
    except Exception:
        pass
    return {"text": _rule_summary(days, lang), "source": "rules"}


@router.get("/forecast/{farm_id}/ai")
async def get_ai_forecast(
    farm_id: int,
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    lang: str = Query("fr", description="fr | en | ar — langue du résumé IA"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Prévision 5 jours + conseils agricoles par jour + synthèse IA (Groq → Ollama → règles)."""
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    rlat, rlon = _resolve_coords(farm, lat, lon)
    raw = await weather_service.get_daily_forecast(rlat, rlon, 5)
    if not raw:
        raise HTTPException(status_code=503, detail="Weather forecast service unavailable")
    days = []
    for d in raw:
        emoji, label = _WMO.get(int(d.get("code") or 0), ("🌡️", "Variable"))
        try:
            day_label = _JOURS[datetime.strptime(d["date"], "%Y-%m-%d").weekday()]
        except Exception:
            day_label = d.get("date", "")
        days.append({**d, "condition": label, "emoji": emoji, "day_label": day_label,
                     "advice": _day_advice(d)})
    ai = await _ai_weather_advice(days, farm.name, lang if lang in ("fr", "en", "ar") else "fr")
    return {"farm_id": farm_id, "farm_name": farm.name, "location": {"lat": rlat, "lon": rlon},
            "days": days, "ai_summary": ai["text"], "ai_source": ai["source"]}


# ── Weather alerts (météo-driven → email + push + WhatsApp) ──────────────────

def _serialize_alert(a: WeatherAlert) -> dict:
    return {
        "id": a.id,
        "farm_id": a.farm_id,
        "farm_name": a.farm.name if a.farm else None,
        "type": a.alert_type,
        "severity": a.severity,
        "title": a.title,
        "message": a.message,
        "emoji": a.emoji,
        "metric": a.metric,
        "value": a.value,
        "threshold": a.threshold,
        "unit": a.unit,
        "is_resolved": a.is_resolved,
        "email_sent": a.email_sent,
        "notified_count": a.notified_count,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


@router.get("/alerts/rules")
def get_weather_alert_rules(_: User = Depends(get_current_user)):
    """Expose the thresholds so the UI can display what triggers each alert."""
    from app.services.weather_alert_service import get_rules
    return {"rules": get_rules()}


@router.get("/alerts")
def list_weather_alerts(
    resolved: bool = Query(False, description="Include resolved alerts"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List weather alerts for the current owner's farms (active by default)."""
    q = (
        db.query(WeatherAlert)
        .join(Farm, WeatherAlert.farm_id == Farm.id)
        .filter(Farm.owner_id == current_user.id)
    )
    if not resolved:
        q = q.filter(WeatherAlert.is_resolved == False)  # noqa: E712
    alerts = q.order_by(WeatherAlert.created_at.desc()).limit(100).all()
    return {"alerts": [_serialize_alert(a) for a in alerts], "count": len(alerts)}


@router.post("/alerts/check")
def check_weather_alerts_now(
    notify: bool = Query(True, description="Dispatch email/push/WhatsApp for new alerts"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Evaluate live weather for the current owner's farms now and raise alerts.

    Sync endpoint (FastAPI runs it in a threadpool) → the blocking SMTP/HTTP
    inside the dispatcher is fine here.
    """
    from app.services.weather_alert_service import run_weather_alert_check
    return run_weather_alert_check(db, owner_id=current_user.id, notify=notify)


@router.post("/alerts/{alert_id}/resolve")
def resolve_weather_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a weather alert resolved (must belong to one of the user's farms)."""
    alert = (
        db.query(WeatherAlert)
        .join(Farm, WeatherAlert.farm_id == Farm.id)
        .filter(WeatherAlert.id == alert_id, Farm.owner_id == current_user.id)
        .first()
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Weather alert not found")
    alert.is_resolved = True
    alert.resolved_at = datetime.utcnow()
    db.commit()
    return {"id": alert.id, "is_resolved": True}

