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
