import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from typing import Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.config import settings
from app.seed_data import seed_database
from app.simulator.runner import simulator_runner

from app.api.v1 import (
    auth,
    ingestion,
    subsystems,
    sensors,
    health,
    anomalies,
    alerts,
    maintenance,
    prognostics,
    reports,
    models_registry,
    simulator_api,
    admin,
    audit
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Active WebSocket connections
active_websockets: Set[WebSocket] = set()

def telemetry_broadcast_callback(payload: dict):
    if not active_websockets:
        return
    text_data = json.dumps(payload)
    for ws in list(active_websockets):
        try:
            asyncio.create_task(ws.send_text(text_data))
        except Exception:
            active_websockets.discard(ws)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize DB and Seed Data
    logger.info("Initializing database and verifying seed data...")
    seed_database()
    logger.info("Database initialized with nominal test-bench baseline signatures.")

    # 2. Register telemetry broadcast callback and start background simulator runner
    simulator_runner.register_telemetry_subscriber(telemetry_broadcast_callback)
    sim_task = asyncio.create_task(simulator_runner.run_loop())
    logger.info("Simulator background engine activated.")

    yield

    # Teardown
    sim_task.cancel()
    simulator_runner.unregister_telemetry_subscriber(telemetry_broadcast_callback)
    logger.info("Shutdown complete.")

app = FastAPI(
    title="TURRET CBPM API",
    description=(
        "Condition-Based Predictive Maintenance & Health Monitoring Platform "
        "for representative laboratory/test-bench turret subsystems. "
        "Software-only prototype (No weapon-control functionality)."
    ),
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(ingestion.router, prefix=f"{settings.API_V1_STR}/ingestion", tags=["Data Ingestion"])
app.include_router(subsystems.router, prefix=f"{settings.API_V1_STR}/subsystems", tags=["Subsystems"])
app.include_router(sensors.router, prefix=f"{settings.API_V1_STR}/sensors", tags=["Sensors"])
app.include_router(health.router, prefix=f"{settings.API_V1_STR}/health", tags=["Health Index"])
app.include_router(anomalies.router, prefix=f"{settings.API_V1_STR}/anomalies", tags=["Anomalies"])
app.include_router(alerts.router, prefix=f"{settings.API_V1_STR}/alerts", tags=["Alerts"])
app.include_router(maintenance.router, prefix=f"{settings.API_V1_STR}/maintenance", tags=["Maintenance"])
app.include_router(prognostics.router, prefix=f"{settings.API_V1_STR}/prognostics", tags=["Prognostics & RUL"])
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}/reports", tags=["Reports"])
app.include_router(models_registry.router, prefix=f"{settings.API_V1_STR}/models", tags=["Model Registry"])
app.include_router(simulator_api.router, prefix=f"{settings.API_V1_STR}/simulator", tags=["Data Simulator"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["Administration"])
app.include_router(audit.router, prefix=f"{settings.API_V1_STR}/audit", tags=["Audit Logs"])

@app.get("/healthz", tags=["System"])
def health_check():
    return {
        "status": "HEALTHY",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "prototype_mode": "SOFTWARE_ONLY_TEST_BENCH",
        "weapon_control_enabled": False
    }

@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_websockets.add(websocket)
    try:
        await websocket.send_text(json.dumps({
            "type": "HANDSHAKE",
            "message": "Connected to TURRET CBPM Real-Time Telemetry Stream",
            "simulator_status": simulator_runner.get_status()
        }))
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        active_websockets.discard(websocket)
    except Exception:
        active_websockets.discard(websocket)

# Static Frontend SPA Delivery for Railway / Production
static_search_paths = [
    os.path.join(os.path.dirname(__file__), "..", "..", "static"),
    os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"),
    os.path.join(os.getcwd(), "static"),
    os.path.join(os.getcwd(), "frontend", "dist")
]

static_dir = None
for p in static_search_paths:
    candidate = os.path.abspath(p)
    if os.path.isdir(candidate) and os.path.isfile(os.path.join(candidate, "index.html")):
        static_dir = candidate
        break

if static_dir:
    logger.info(f"Mounted production frontend static assets from: {static_dir}")
    assets_path = os.path.join(static_dir, "assets")
    if os.path.isdir(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa_frontend(full_path: str):
        # Exclude reserved paths
        if (
            full_path.startswith("api")
            or full_path.startswith("docs")
            or full_path.startswith("redoc")
            or full_path.startswith("openapi.json")
            or full_path.startswith("healthz")
            or full_path.startswith("ws")
        ):
            raise HTTPException(status_code=404, detail="Resource Not Found")

        file_target = os.path.join(static_dir, full_path)
        if full_path and os.path.isfile(file_target):
            return FileResponse(file_target)

        return FileResponse(os.path.join(static_dir, "index.html"))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("app.main:app", host=host, port=port, reload=False)
