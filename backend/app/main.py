"""
Smart Farm AI - FastAPI Application Entry Point
WebSocket support for live telemetry and alerts.
"""

import logging
import json
from typing import List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.api import api_router

# Create all tables on startup (migrations use Alembic in production)
import app.models.domain  # noqa: F401 — ensures models are registered
Base.metadata.create_all(bind=engine)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
    )

# CORS
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all REST routes
app.include_router(api_router, prefix=settings.API_V1_STR)


# ---------------------------------------------------------------------------
# WebSocket Connection Manager
# ---------------------------------------------------------------------------

class ConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)
        logger.info(f"WS client connected — total: {len(self.active)}")

    def disconnect(self, ws: WebSocket):
        self.active.remove(ws)
        logger.info(f"WS client disconnected — total: {len(self.active)}")

    async def broadcast(self, message: dict):
        data = json.dumps(message)
        disconnected = []
        for ws in self.active:
            try:
                await ws.send_text(data)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self.active.remove(ws)


manager = ConnectionManager()


@app.websocket("/ws/telemetry")
async def ws_telemetry(websocket: WebSocket):
    """Real-time telemetry feed — clients subscribe and receive pushed records."""
    await manager.connect(websocket)
    try:
        while True:
            # Clients can send {"subscribe": "unit_id"} messages
            data = await websocket.receive_text()
            await websocket.send_text(json.dumps({"ack": "subscribed", "data": data}))
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.websocket("/ws/alerts")
async def ws_alerts(websocket: WebSocket):
    """Real-time alert feed."""
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()  # keep-alive ping
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ---------------------------------------------------------------------------
# Health endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {"message": "Smart Farm AI Enterprise API", "version": settings.VERSION}


@app.get("/health")
def health():
    return {"status": "ok", "version": settings.VERSION}


# Export manager so workers can use it to broadcast
app.state.ws_manager = manager
