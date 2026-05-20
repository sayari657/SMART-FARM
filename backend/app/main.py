"""
Smart Farm AI - FastAPI Application Entry Point (Stable v3.5)
Modern Lifespan management for background warm-up.
"""

import logging
import json
import asyncio
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Absolute Imports
from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.api import api_router

# 1. Initialize Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smart_farm")

# 2. Modern Lifespan Manager
@asynccontextmanager
async def app_lifespan(app_instance: FastAPI):
    """Handles startup and shutdown safely (Lifespan Pattern)"""
    # -- STARTUP --
    try:
        # a. Database Sync (with One-Time Reset for Diagnostic History)
        import app.models.domain  # noqa: F401
        from sqlalchemy import text
                
        Base.metadata.create_all(bind=engine)
        logger.info("[STARTUP] Database refreshed and synchronized.")

        # Seed default admin on first run (fresh DB has no users)
        from app.core.security import hash_password
        from app.models.domain import User as _User
        from app.core.database import SessionLocal as _SL
        with _SL() as _seed_db:
            if not _seed_db.query(_User).first():
                _seed_db.add(_User(
                    username="admin",
                    email="admin@smartfarm.ai",
                    full_name="Farm Admin",
                    password_hash=hash_password("admin123"),
                    role="owner",
                    is_active=True,
                ))
                _seed_db.commit()
                logger.info("[STARTUP] Default admin created → admin / admin123")

        # Incremental migrations (safe: each wrapped in try/except)
        _migrations = [
            # Poultry feed logs
            "ALTER TABLE poultry_feed_logs ADD COLUMN status VARCHAR(20) DEFAULT 'pending'",
            "ALTER TABLE poultry_feed_logs ADD COLUMN created_by_id INTEGER",
            "ALTER TABLE poultry_feed_logs ADD COLUMN validated_by_id INTEGER",
            "ALTER TABLE poultry_feed_logs ADD COLUMN validation_timestamp DATETIME",
            "ALTER TABLE poultry_feed_logs ADD COLUMN admin_notes TEXT",
            # Poultry egg logs
            "ALTER TABLE poultry_egg_logs ADD COLUMN status VARCHAR(20) DEFAULT 'pending'",
            "ALTER TABLE poultry_egg_logs ADD COLUMN created_by_id INTEGER",
            "ALTER TABLE poultry_egg_logs ADD COLUMN validated_by_id INTEGER",
            "ALTER TABLE poultry_egg_logs ADD COLUMN validation_timestamp DATETIME",
            "ALTER TABLE poultry_egg_logs ADD COLUMN admin_notes TEXT",
            # Poultry health logs
            "ALTER TABLE poultry_health_logs ADD COLUMN status VARCHAR(20) DEFAULT 'pending'",
            "ALTER TABLE poultry_health_logs ADD COLUMN created_by_id INTEGER",
            "ALTER TABLE poultry_health_logs ADD COLUMN validated_by_id INTEGER",
            "ALTER TABLE poultry_health_logs ADD COLUMN validation_timestamp DATETIME",
            "ALTER TABLE poultry_health_logs ADD COLUMN admin_notes TEXT",
            # Poultry sales
            "ALTER TABLE poultry_sales ADD COLUMN status VARCHAR(20) DEFAULT 'pending'",
            "ALTER TABLE poultry_sales ADD COLUMN created_by_id INTEGER",
            "ALTER TABLE poultry_sales ADD COLUMN validated_by_id INTEGER",
            "ALTER TABLE poultry_sales ADD COLUMN validation_timestamp DATETIME",
            "ALTER TABLE poultry_sales ADD COLUMN admin_notes TEXT",
            # Poultry batches
            "ALTER TABLE poultry_batches ADD COLUMN created_at DATETIME",
            # Poultry health logs — mortalité persistée
            "ALTER TABLE poultry_health_logs ADD COLUMN deaths_today INTEGER DEFAULT 0",
            # Bee Hives
            "ALTER TABLE bee_hives ADD COLUMN has_queen BOOLEAN DEFAULT 1",
            "ALTER TABLE bee_hives ADD COLUMN queen_count INTEGER DEFAULT 0",
            # Bee Visits
            "ALTER TABLE bee_visits ADD COLUMN health_score REAL",
            "ALTER TABLE bee_visits ADD COLUMN force_level REAL",
            # Bee Productions
            "ALTER TABLE bee_productions ADD COLUMN hive_id INTEGER",
            "ALTER TABLE bee_productions ADD COLUMN flower_type VARCHAR(100)",
            # Bee Planning (Fixes stuck loading)
            "ALTER TABLE bee_planning ADD COLUMN apiary_id INTEGER",
            "ALTER TABLE bee_planning ADD COLUMN predicted_sirop FLOAT DEFAULT 0",
            "ALTER TABLE bee_planning ADD COLUMN predicted_pate FLOAT DEFAULT 0",
            "ALTER TABLE bee_planning ADD COLUMN predicted_traitement INTEGER DEFAULT 0",
            "ALTER TABLE bee_planning ADD COLUMN predicted_cadres INTEGER DEFAULT 0",
            # Bee Expenses (Fixes stuck loading)
            "ALTER TABLE bee_expenses ADD COLUMN apiary_id INTEGER",
            "ALTER TABLE bee_expenses ADD COLUMN visit_id INTEGER",
            # Bee Expenses — budget prévisionnel
            "ALTER TABLE bee_expenses ADD COLUMN amount_planned REAL",
            # Warehouse category emoji
            "ALTER TABLE warehouse_categories ADD COLUMN emoji VARCHAR(10)",
            # Warehouse alerts table (created via Base.metadata if not exists)
            """CREATE TABLE IF NOT EXISTS warehouse_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id INTEGER REFERENCES warehouse_items(id) ON DELETE SET NULL,
                item_name VARCHAR(200) NOT NULL,
                category_name VARCHAR(200),
                emoji VARCHAR(10),
                alert_type VARCHAR(50) DEFAULT 'stock_out',
                message TEXT NOT NULL,
                severity VARCHAR(20) DEFAULT 'critical',
                is_resolved BOOLEAN DEFAULT 0,
                resolved_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )""",
            "CREATE INDEX IF NOT EXISTS ix_warehouse_alert_resolved ON warehouse_alerts (is_resolved)",
        ]
        with engine.connect() as _conn:
            for _stmt in _migrations:
                try:
                    _conn.execute(text(_stmt))
                    _conn.commit()
                except Exception:
                    pass  # column already exists

            # Handle column renaming for Planning/Expenses (if old schema)
            try:
                _conn.execute(text("ALTER TABLE bee_planning RENAME COLUMN planned_date TO scheduled_date"))
                _conn.commit()
            except Exception: pass
            try:
                _conn.execute(text("ALTER TABLE bee_expenses RENAME COLUMN date TO expense_date"))
                _conn.commit()
            except Exception: pass
            try:
                _conn.execute(text("ALTER TABLE bee_expenses RENAME COLUMN expense_type TO category"))
                _conn.commit()
            except Exception: pass
            try:
                _conn.execute(text("ALTER TABLE bee_expenses RENAME COLUMN note TO description"))
                _conn.commit()
            except Exception: pass



    except Exception as e:
        logger.error(f"[STARTUP] DB Error: {e}")

    # b. AI Background Warm-up (Floating task)
    async def _async_warmup():
        from starlette.concurrency import run_in_threadpool
        from app.api.v1.endpoints.cv_routes import get_yolo_model
        cats = ["leaves", "olive", "insects"]
        logger.info(f"[WARM-UP] Sequentially loading models: {cats}")
        for cat in cats:
            try:
                await run_in_threadpool(get_yolo_model, cat)
                logger.info(f"[WARM-UP] IA {cat} ready.")
                await asyncio.sleep(5)
            except Exception:
                pass

    asyncio.create_task(_async_warmup())
    yield
    # -- SHUTDOWN --
    logger.info("[SHUTDOWN] Cleaning up...")

# 3. Initialize FastAPI App
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=app_lifespan,
    docs_url="/docs",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 4. Middleware & Handlers
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global error: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})

# 5. Routing
app.include_router(api_router, prefix=settings.API_V1_STR)

from pydantic import BaseModel

class TelemetryPayload(BaseModel):
    node: str
    metric: str
    value: float

@app.post("/api/v1/iot/telemetry")
def post_telemetry(payload: TelemetryPayload):
    import os, csv
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
    import os, csv as _csv
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

@app.get("/api/v1/iot/history")
def get_iot_history(limit: int = 50):
    import os, csv as _csv
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
def health(): return {"status": "ok"}

# -- WebSockets --
class ConnectionManager:
    def __init__(self): self.active: List[WebSocket] = []
    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)
    def disconnect(self, ws: WebSocket): self.active.remove(ws)
    async def broadcast(self, message: dict):
        data = json.dumps(message)
        for ws in self.active:
            try: await ws.send_text(data)
            except: pass

manager = ConnectionManager()
app.state.ws_manager = manager

@app.websocket("/ws/telemetry")
async def ws_telemetry(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
# -- WebSockets (Distributed Secure Gateway) --
from typing import Optional
from app.core.websockets import socket_manager
from app.core.security import get_ws_tenant_id

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
        try: await websocket.close(code=1008)  # Policy Violation
        except: pass
