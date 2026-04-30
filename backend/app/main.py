"""
Smart Farm AI - FastAPI Application Entry Point (Stable v3.5)
Modern Lifespan management for background warm-up.
"""

import logging
import json
import asyncio
import io
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

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

        # Incremental migrations (safe: each wrapped in try/except)
        _migrations = [
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
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=app_lifespan,
    docs_url="/docs",
)

# 4. Middleware & Handlers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
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

@app.get("/api/v1/iot/latest")
def get_latest_iot():
    import os, csv
    from pathlib import Path
    csv_path = str(Path(__file__).parent.parent.parent / "iot" / "iot_telemetry.csv")
    
    latest = {
        "nodeA": {"soil": 45.0, "pressure": 0.5, "flow": 12.0, "temp": 23.0},
        "nodeB": {"weight": 46.0, "broodTemp": 35.0, "extTemp": 28.0, "extHum": 58.0}
    }
    
    if not os.path.exists(csv_path):
        return latest
        
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            lines = list(csv.reader(f))
            if len(lines) <= 1:
                return latest
            
            metrics_found_a = set()
            metrics_found_b = set()
            for row in reversed(lines):
                if len(row) < 4:
                    continue
                ts, node, metric, value = row[0], row[1], row[2], row[3]
                
                try:
                    val_float = float(value)
                except ValueError:
                    continue
                    
                if "Node A" in node:
                    if metric == "Humidité Sol" and "soil" not in metrics_found_a:
                        latest["nodeA"]["soil"] = val_float
                        metrics_found_a.add("soil")
                    elif metric == "Pression" and "pressure" not in metrics_found_a:
                        latest["nodeA"]["pressure"] = val_float
                        metrics_found_a.add("pressure")
                    elif metric == "Débit" and "flow" not in metrics_found_a:
                        latest["nodeA"]["flow"] = val_float
                        metrics_found_a.add("flow")
                    elif metric == "Temp Sol" and "temp" not in metrics_found_a:
                        latest["nodeA"]["temp"] = val_float
                        metrics_found_a.add("temp")
                elif "Node B" in node:
                    if metric == "Poids Ruche" and "weight" not in metrics_found_b:
                        latest["nodeB"]["weight"] = val_float
                        metrics_found_b.add("weight")
                    elif metric == "Temp Couvain" and "broodTemp" not in metrics_found_b:
                        latest["nodeB"]["broodTemp"] = val_float
                        metrics_found_b.add("broodTemp")
                    elif metric == "Temp Ext" and "extTemp" not in metrics_found_b:
                        latest["nodeB"]["extTemp"] = val_float
                        metrics_found_b.add("extTemp")
                    elif metric == "Humidité Ext" and "extHum" not in metrics_found_b:
                        latest["nodeB"]["extHum"] = val_float
                        metrics_found_b.add("extHum")
                        
                if len(metrics_found_a) == 4 and len(metrics_found_b) == 4:
                    break
    except Exception as e:
        logger.error(f"Error reading IoT CSV: {e}")
        
    return latest

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
