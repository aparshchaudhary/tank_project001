import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="allow")

    PROJECT_NAME: str = "TURRET CBPM — Condition-Based Predictive Maintenance & Health Monitoring Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "cbpm-laboratory-defense-synthetic-telemetry-sec-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database (Defaults to local SQLite WAL mode, seamlessly switches to PostgreSQL / TimescaleDB via env)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./turret_cbpm.db")
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    
    # Ingestion & Signal Processing Configuration
    OUT_OF_ORDER_TOLERANCE_SECONDS: float = float(os.getenv("OUT_OF_ORDER_TOLERANCE_SECONDS", "120.0"))
    DEDUPLICATION_CACHE_SIZE: int = 10000
    
    # Baseline & Anomaly Detection
    DEFAULT_K_SIGMA: float = float(os.getenv("DEFAULT_K_SIGMA", "3.0"))
    ANOMALY_WARNING_THRESHOLD: float = 0.5
    ANOMALY_CRITICAL_THRESHOLD: float = 0.8
    
    # Prognostics & RUL
    RUL_MIN_DEGRADATION_SAMPLES: int = 20
    RUL_CRITICAL_HEALTH_THRESHOLD: float = 25.0
    
    # Health Index Bands (Prototype / illustrative bands)
    HEALTH_BAND_HEALTHY: float = 90.0
    HEALTH_BAND_EARLY_DEV: float = 75.0
    HEALTH_BAND_DEGRADING: float = 50.0
    HEALTH_BAND_SIGNIFICANT_DEG: float = 25.0

settings = Settings()
