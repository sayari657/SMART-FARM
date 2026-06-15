"""
Smart Farm AI - FastAPI Application Entry Point (Stable v3.5)
Modern Lifespan management for background warm-up.
"""

import logging
import asyncio
import os
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Absolute Imports
from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.api import api_router

# 1. Initialize Logging — JSON format in production, plain text in dev/test
def _configure_logging() -> None:
    log_level = logging.DEBUG if os.getenv("DEBUG") else logging.INFO
    try:
        from pythonjsonlogger import json as jsonlogger
        handler = logging.StreamHandler()
        handler.setFormatter(jsonlogger.JsonFormatter(
            fmt="%(asctime)s %(name)s %(levelname)s %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%SZ",
        ))
        logging.root.handlers = [handler]
        logging.root.setLevel(log_level)
    except ImportError:
        logging.basicConfig(level=log_level)

_configure_logging()
logger = logging.getLogger("smart_farm")


def _run_column_migrations() -> None:
    """Idempotent ALTER TABLE migrations for columns added after initial schema."""
    from sqlalchemy import text, inspect as sa_inspect
    with engine.connect() as conn:
        insp = sa_inspect(engine)

        _migrations = [
            ("bee_apiaries",        "farm_id",  "INTEGER REFERENCES farms(id) ON DELETE CASCADE"),
            ("bee_global_stock",    "farm_id",  "INTEGER REFERENCES farms(id) ON DELETE CASCADE"),
            ("warehouse_categories","farm_id",  "INTEGER REFERENCES farms(id) ON DELETE CASCADE"),
            ("users",               "refresh_token_hash", "VARCHAR(255)"),
            ("push_tokens",         "platform", "VARCHAR(50)"),
            ("bee_visits",          "visit_name",   "VARCHAR(150)"),
            ("bee_visits",          "type_ruche",   "VARCHAR(20)"),
            ("bee_visits",          "reine",        "BOOLEAN"),
            ("bee_visits",          "oeufs",        "BOOLEAN"),
            ("bee_visits",          "couvain",      "BOOLEAN"),
            ("bee_visits",          "population",   "VARCHAR(10)"),
            ("bee_visits",          "pollen_level",  "VARCHAR(10)"),
            ("bee_visits",          "nb_cadres",     "VARCHAR(30)"),
            ("bee_visits",          "visited_by",    "VARCHAR(100)"),
            ("bee_visits",          "visitor_role",  "VARCHAR(20)"),
            ("orchard_trees",       "lat",           "FLOAT"),
            ("orchard_trees",       "lng",           "FLOAT"),
            ("orchard_trees",       "source",        "VARCHAR(20)"),
        ]

        for table, col, col_def in _migrations:
            if table not in insp.get_table_names():
                continue
            existing = [c["name"] for c in insp.get_columns(table)]
            if col not in existing:
                try:
                    conn.execute(text(f'ALTER TABLE "{table}" ADD COLUMN "{col}" {col_def}'))
                    conn.commit()
                    logger.info(f"[MIGRATION] Added column {table}.{col}")
                except Exception as exc:
                    logger.warning(f"[MIGRATION] Could not add {table}.{col}: {exc}")


# 2. Modern Lifespan Manager
@asynccontextmanager
async def app_lifespan(_app: FastAPI):
    """Handles startup and shutdown safely (Lifespan Pattern)"""
    # -- STARTUP --

    # a. Secrets validation — hard-fail in production (DEBUG=false), warn in dev
    try:
        from app.core.secrets_validator import validate_production_secrets
        validate_production_secrets()
    except SystemExit:
        raise
    except Exception as _sv_err:
        logger.warning("[SECURITY] Secrets validator error: %s", _sv_err)

    _PLACEHOLDER_PATTERNS = ("CHANGE_ME", "REPLACE_WITH", "your@email", "gsk_5jVI")
    _secrets_to_check = {
        "SECRET_KEY": settings.SECRET_KEY,
        "GROQ_API_KEY": getattr(settings, "GROQ_API_KEY", ""),
        "WHATSAPP_TOKEN": getattr(settings, "WHATSAPP_TOKEN", ""),
    }
    for key, val in _secrets_to_check.items():
        if any(p in str(val) for p in _PLACEHOLDER_PATTERNS):
            logger.warning(f"[SECURITY] {key} appears to use a default/placeholder value — rotate before production.")

    try:
        # b. Database Sync
        import app.models.domain  # noqa: F401
        Base.metadata.create_all(bind=engine)
        logger.info("[STARTUP] Database refreshed and synchronized.")

        # c. Incremental column migrations (SQLite-safe, idempotent)
        _run_column_migrations()


        # Optional first-run bootstrap. Disabled unless explicit credentials are set.
        from app.core.security import hash_password
        from app.models.domain import User as _User
        from app.core.database import SessionLocal as _SL
        with _SL() as _seed_db:
            bootstrap_username = settings.BOOTSTRAP_ADMIN_USERNAME.strip()
            bootstrap_password = settings.BOOTSTRAP_ADMIN_PASSWORD
            if (
                bootstrap_username
                and bootstrap_password
                and not _seed_db.query(_User).first()
            ):
                _seed_db.add(_User(
                    username=bootstrap_username,
                    email=settings.BOOTSTRAP_ADMIN_EMAIL.strip() or None,
                    full_name="Bootstrap Farm Owner",
                    password_hash=hash_password(bootstrap_password),
                    role="owner",
                    is_active=True,
                ))
                _seed_db.commit()
                logger.info("[STARTUP] Explicit bootstrap owner created.")

    except Exception as e:
        logger.error(f"[STARTUP] DB/Startup Error: {e}")

    # b. Cache probe — run at startup so Redis unavailability is detected once, not per-request
    try:
        from app.core.cache import _get_redis
        _get_redis()
    except Exception:
        pass

    # c. AI Background Warm-up (Floating task)
    async def _async_warmup():
        from starlette.concurrency import run_in_threadpool
        from app.api.v1.endpoints.cv_routes import get_yolo_model
        cats = ["bee", "leaves", "olive", "insects", "fire"]
        logger.info(f"[WARM-UP] Sequentially loading models: {cats}")
        for cat in cats:
            try:
                await run_in_threadpool(get_yolo_model, cat)
                logger.info(f"[WARM-UP] IA {cat} ready.")
                await asyncio.sleep(5)
            except Exception:
                pass

    asyncio.create_task(_async_warmup())

    # c. APScheduler — drift check, plan expiry, push notifications, audit cleanup
    try:
        from app.core.scheduler import start_scheduler
        start_scheduler()
    except Exception as _se:
        logger.warning("[STARTUP] Scheduler not started: %s", _se)

    yield
    # -- SHUTDOWN --
    try:
        from app.core.scheduler import stop_scheduler
        stop_scheduler()
    except Exception:
        pass
    logger.info("[SHUTDOWN] Cleaning up...")

# 3. Initialize FastAPI App — per-user rate limiting (falls back to IP)
def _user_or_ip_key(request: Request) -> str:
    """Use authenticated user ID as rate limit key; fall back to IP for anonymous."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            from jose import jwt as _jwt
            payload = _jwt.decode(
                auth[7:], settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
                options={"verify_exp": False},
            )
            sub = payload.get("sub")
            if sub:
                return f"user:{sub}"
        except Exception:
            pass
    return request.client.host if request.client else "unknown"

limiter = Limiter(key_func=_user_or_ip_key)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=app_lifespan,
    docs_url="/docs",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 4. Middleware & Handlers

class CorrelationIDMiddleware(BaseHTTPMiddleware):
    """Attach a unique X-Request-ID to every request for distributed tracing."""
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

app.add_middleware(CorrelationIDMiddleware)
# NOTE: CORSMiddleware is added LAST (see below) so it is the OUTERMOST layer.
# Starlette runs the last-added middleware first, so CORS must be added after
# CSRF/SlowAPI — otherwise those middlewares' direct 403/429 responses bypass
# CORS and the browser reports them as opaque "CORS/Network" errors instead of
# the real status, which also prevents the frontend's 403 self-heal from firing.

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    # Let FastAPI's built-in HTTPException handler do its job for 4xx errors.
    # Only handle truly unexpected exceptions here (programming errors, DB crashes, etc.)
    from fastapi import HTTPException as _HTTPEx
    from fastapi.exception_handlers import http_exception_handler
    if isinstance(exc, _HTTPEx):
        return await http_exception_handler(request, exc)
    logger.error(f"Unhandled server error: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})

# 5. Prometheus metrics — /metrics endpoint (MLOps observability)
try:
    from prometheus_fastapi_instrumentator import Instrumentator
    Instrumentator(
        should_group_status_codes=True,
        excluded_handlers=["/health", "/metrics"],
    ).instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
    logger.info("[MLOps] Prometheus /metrics endpoint active.")
except ImportError:
    logger.warning("[MLOps] prometheus-fastapi-instrumentator not installed — /metrics disabled.")

# 6. Universal Rate Limiting — applied to costly endpoints
# (slowapi decorators on specific endpoints override these global defaults)
from slowapi.middleware import SlowAPIMiddleware  # noqa: E402
app.add_middleware(SlowAPIMiddleware)

# CSRF protection — validates X-CSRF-Token on mutations for owner/superadmin
from app.core.csrf import CSRFMiddleware  # noqa: E402
app.add_middleware(CSRFMiddleware)

# CORS — added LAST so it is the outermost middleware and its headers are
# applied to EVERY response, including CSRF 403s and rate-limit 429s.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Request-ID", "X-CSRF-Token"],
)

# 7. Routing
app.include_router(api_router, prefix=settings.API_V1_STR)

# 8. API v2 — real endpoints with pagination + unified envelope
from app.api.v2.api import api_v2_router  # noqa: E402
app.include_router(api_v2_router, prefix="/api/v2")

# GraphQL — optional (requires strawberry-graphql[fastapi])
from app.api.v1.endpoints.graphql_routes import graphql_router, HAS_GRAPHQL  # noqa: E402
if HAS_GRAPHQL and graphql_router:
    app.include_router(graphql_router)

@app.get("/api/versions", tags=["API Info"])
def api_versions():
    return {
        "current": "v2",
        "supported": ["v1", "v2"],
        "v1_deprecation_notice": "API v1 sera maintenue jusqu'au 2026-12-31",
        "v1_sunset": "2026-12-31",
        "v2_base_url": "/api/v2",
        "v1_base_url": "/api/v1",
    }

from pydantic import BaseModel, Field  # noqa: E402

class TelemetryPayload(BaseModel):
    node: str = Field(min_length=1, max_length=50, pattern=r"^[\w\s\-]+$")
    metric: str = Field(min_length=1, max_length=50)
    value: float = Field(ge=-1e6, le=1e6)

@app.post("/api/v1/iot/telemetry")
@limiter.limit(settings.IOT_TELEMETRY_RATE_LIMIT)
def post_telemetry(request: Request, payload: TelemetryPayload):
    import os
    import csv
    from pathlib import Path
    from datetime import datetime
    csv_path = str(Path(__file__).parent.parent.parent / "iot" / "iot_telemetry.csv")
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    try:
        os.makedirs(os.path.dirname(csv_path), exist_ok=True)
        with open(csv_path, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            if f.tell() == 0:
                writer.writerow(["Timestamp", "Node", "Metric", "Value"])
            writer.writerow([timestamp, payload.node, payload.metric, payload.value])
    except Exception as e:
        logger.error(f"Error appending to IoT CSV: {e}")
        return {"status": "error", "message": str(e)}

    return {"status": "ok"}

def _iot_csv_path():
    from pathlib import Path
    return str(Path(__file__).parent.parent.parent / "iot" / "iot_telemetry.csv")

# Maps both old French metric names and new English key names to canonical keys
_METRIC_MAP_A = {
    "Humidité Sol": "soil", "soil": "soil",
    "Pression": "pressure", "pressure": "pressure",
    "Débit": "flow", "flow": "flow",
    "Temp Sol": "temp", "temp": "temp",
    "pump": "pump", "valve": "valve", "fault": "fault",
}
_METRIC_MAP_B = {
    "Poids Ruche": "weight", "weight": "weight",
    "Temp Couvain": "hive_temp", "hive_temp": "hive_temp",
    "Temp Ext": "ext_temp", "ext_temp": "ext_temp",
    "Humidité Ext": "ext_hum", "ext_hum": "ext_hum",
}

def _is_node_a(node: str) -> bool:
    return node == "NODE_A" or "Node A" in node

def _is_node_b(node: str) -> bool:
    return node == "NODE_B" or "Node B" in node

@app.get("/api/v1/iot/latest")
def get_latest_iot():
    import os
    import csv as _csv
    latest = {
        "nodeA": {"soil": 45.0, "pressure": 3.0, "flow": 12.0, "temp": 23.0,
                  "pump": 0, "valve": 0, "fault": 0, "mode": "OFFLINE"},
        "nodeB": {"weight": 20.0, "hive_temp": 34.0, "broodTemp": 34.0,
                  "ext_temp": 25.0, "extTemp": 25.0,
                  "ext_hum": 60.0, "extHum": 60.0},
    }
    csv_path = _iot_csv_path()
    if not os.path.exists(csv_path):
        return latest
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            lines = list(_csv.reader(f))
        found_a, found_b = set(), set()
        for row in reversed(lines):
            if len(row) < 4:
                continue
            _, node, metric, value = row[0], row[1], row[2], row[3]
            try:
                val = float(value)
            except ValueError:
                continue
            if _is_node_a(node):
                key = _METRIC_MAP_A.get(metric)
                if key and key not in found_a:
                    latest["nodeA"][key] = val
                    found_a.add(key)
                    # keep old Dashboard.jsx key aliases
                    if key == "soil":
                        latest["nodeA"]["mode"] = "ONLINE"
            elif _is_node_b(node):
                key = _METRIC_MAP_B.get(metric)
                if key and key not in found_b:
                    latest["nodeB"][key] = val
                    found_b.add(key)
                    # keep legacy aliases for Dashboard.jsx
                    if key == "hive_temp":
                        latest["nodeB"]["broodTemp"] = val
                    elif key == "ext_temp":
                        latest["nodeB"]["extTemp"] = val
                    elif key == "ext_hum":
                        latest["nodeB"]["extHum"] = val
            if len(found_a) >= 7 and len(found_b) >= 4:
                break
    except Exception as e:
        logger.error(f"IoT latest error: {e}")
    return latest

from fastapi import Query  # noqa: E402

@app.get("/api/v1/iot/history")
def get_iot_history(limit: int = Query(50, ge=1, le=1000)):
    import os
    import csv as _csv
    csv_path = _iot_csv_path()
    if not os.path.exists(csv_path):
        return {"nodeA": [], "nodeB": []}
    snaps_a: dict = {}
    snaps_b: dict = {}
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = _csv.reader(f)
            next(reader, None)
            for row in reader:
                if len(row) < 4:
                    continue
                ts, node, metric, value = row[0], row[1], row[2], row[3]
                try:
                    val = float(value)
                except ValueError:
                    continue
                if _is_node_a(node):
                    key = _METRIC_MAP_A.get(metric)
                    if key:
                        snap = snaps_a.setdefault(ts, {"timestamp": ts})
                        snap[key] = val
                elif _is_node_b(node):
                    key = _METRIC_MAP_B.get(metric)
                    if key:
                        snap = snaps_b.setdefault(ts, {"timestamp": ts})
                        snap[key] = val
    except Exception as e:
        logger.error(f"IoT history error: {e}")
        return {"nodeA": [], "nodeB": []}
    list_a = sorted(snaps_a.values(), key=lambda x: x["timestamp"])
    list_b = sorted(snaps_b.values(), key=lambda x: x["timestamp"])
    # Only snapshots that have at least the primary metric
    list_a = [s for s in list_a if "soil" in s]
    list_b = [s for s in list_b if "weight" in s]
    return {"nodeA": list_a[-limit:], "nodeB": list_b[-limit:]}

# -- Health & Root --
@app.get("/")
def root(): return {"status": "Sovereign", "version": settings.VERSION}


@app.get("/health")
def health():
    from datetime import datetime, timezone
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

# -- WebSockets (tenant-isolated secure gateways) --
from typing import Optional  # noqa: E402
from app.core.websockets import socket_manager  # noqa: E402
from app.core.security import get_ws_tenant_id  # noqa: E402

app.state.ws_manager = socket_manager


@app.websocket("/ws/telemetry")
async def ws_telemetry(websocket: WebSocket, token: Optional[str] = None):
    """Backward-compatible telemetry socket with the same tenant isolation as /ws/events."""
    try:
        tenant_id = get_ws_tenant_id(token)
        await socket_manager.connect(websocket, tenant_id)
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if 'tenant_id' in locals():
            socket_manager.disconnect(websocket, tenant_id)
    except Exception as exc:
        logger.error(f"[WS/telemetry] Auth/Bridge Error: {exc}")
        try:
            await websocket.close(code=1008)
        except Exception:
            pass


@app.websocket("/ws/events")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = None
):
    """
    Secure WebSocket Gateway.
    Verifies token per-connection and manages the socket pool.
    """
    try:
        tenant_id = get_ws_tenant_id(token)
        await socket_manager.connect(websocket, tenant_id)

        while True:
            # Maintain connection & listen for client closure
            await websocket.receive_text()

    except WebSocketDisconnect:
        # If we reached the connect stage, cleanup
        if 'tenant_id' in locals():
            socket_manager.disconnect(websocket, tenant_id)
    except Exception as e:
        logger.error(f"[WS] Auth/Bridge Error: {e}")
        try:
            await websocket.close(code=1008)  # Policy Violation
        except Exception:
            pass


# -- RTSP / IP camera relay → YOLO inference (Sovereign Emergency Monitor) --
@app.websocket("/ws/rtsp")
async def ws_rtsp_inference(
    websocket: WebSocket,
    token: Optional[str] = None,
    url: Optional[str] = None,
    model: str = "fire",
    fps: int = 4,
):
    """Ingest a network camera (RTSP / HTTP-MJPEG) server-side with OpenCV, run YOLO
    on each frame, and stream {frame, detections} to the browser. Browsers cannot
    read RTSP directly, hence this relay.

    Query params: token (JWT, required), url (rtsp://… or http://…), model, fps.
    Note: `url` is owner-provided — endpoint stays authenticated (SSRF surface).
    """
    import asyncio
    import base64
    import time
    from starlette.websockets import WebSocketState

    if not token:
        await websocket.close(code=1008, reason="Authentication required")
        return
    try:
        from app.core.security import get_ws_tenant_id
        get_ws_tenant_id(token)
    except Exception:
        await websocket.close(code=1008, reason="Invalid token")
        return

    if not url or not url.lower().startswith(("rtsp://", "http://", "https://")):
        await websocket.accept()
        await websocket.send_json({"error": "URL caméra invalide (rtsp:// ou http://)."})
        await websocket.close()
        return

    await websocket.accept()

    try:
        import cv2
    except Exception:
        await websocket.send_json({"error": "OpenCV indisponible sur ce serveur."})
        await websocket.close()
        return
    try:
        from app.api.v1.endpoints.cv_routes import get_yolo_model, inference_lock, HAS_YOLO
        from app.api.v1.endpoints.stream_routes import _run_inference
    except ImportError:
        await websocket.send_json({"error": "Module CV indisponible."})
        await websocket.close()
        return
    if not HAS_YOLO:
        await websocket.send_json({"error": "YOLO non disponible (mode cloud)."})
        await websocket.close()
        return

    from starlette.concurrency import run_in_threadpool
    from PIL import Image

    def _open(u):
        cap = cv2.VideoCapture(u)
        try:
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        except Exception:
            pass
        return cap

    def _grab(cap, max_w=640):
        ok, frame = cap.read()
        if not ok or frame is None:
            return False, None, None
        h, w = frame.shape[:2]
        if w > max_w:
            s = max_w / float(w)
            frame = cv2.resize(frame, (int(w * s), int(h * s)))
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        ok2, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
        b64 = base64.b64encode(buf.tobytes()).decode() if ok2 else None
        return True, b64, Image.fromarray(rgb)

    cap = await run_in_threadpool(_open, url)
    if not await run_in_threadpool(cap.isOpened):
        await websocket.send_json({"error": "Impossible d'ouvrir le flux. Vérifie l'URL / les identifiants."})
        await run_in_threadpool(cap.release)
        await websocket.close()
        return

    await websocket.send_json({"status": "connected", "model": model})
    interval = 1.0 / max(1, min(int(fps or 4), 8))
    frame_id, fails = 0, 0
    try:
        while websocket.client_state == WebSocketState.CONNECTED:
            t0 = time.monotonic()
            ok, b64, image = await run_in_threadpool(_grab, cap, 640)
            if not ok:
                fails += 1
                if fails > 40:
                    await websocket.send_json({"error": "Flux interrompu."})
                    break
                await asyncio.sleep(0.15)
                continue
            fails = 0
            try:
                async with inference_lock:
                    yolo = await run_in_threadpool(get_yolo_model, model)
                    if not yolo:
                        await websocket.send_json({"error": f"Modèle '{model}' indisponible."})
                        break
                    detections = await run_in_threadpool(_run_inference, yolo, image)
            except Exception as exc:
                detections = []
                logger.warning("[RTSP] inference error: %s", exc)
            frame_id += 1
            await websocket.send_json({
                "frame": b64,
                "detections": detections,
                "count": len(detections),
                "frame_id": frame_id,
            })
            dt = time.monotonic() - t0
            if dt < interval:
                await asyncio.sleep(interval - dt)
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.warning("[RTSP] stream error: %s", exc)
    finally:
        await run_in_threadpool(cap.release)
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.close()
