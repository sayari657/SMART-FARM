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
        with engine.connect() as conn:
            # Force reset only the problematic table to fix legacy schema issues
            try:
                conn.execute(text("DROP TABLE IF EXISTS diagnostic_history"))
                conn.commit()
                logger.info("[STARTUP] Resetting diagnostic_history for schema alignment.")
            except Exception as reset_err:
                logger.warning(f"[STARTUP] Table reset skipped/failed: {reset_err}")
                
        Base.metadata.create_all(bind=engine)
        logger.info("[STARTUP] Database refreshed and synchronized.")


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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
