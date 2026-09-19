# ==============================================================================
# TURRET CBPM — Multi-Stage Production Dockerfile (Render, Railway, Local)
# Stage 1: Build React/TypeScript Frontend from frontend/
# Stage 2: Fast, Slim Python 3.11 Backend Runner with embedded SPA frontend
# ==============================================================================

# Stage 1: Build React/TypeScript Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Copy entire frontend directory from build context
COPY frontend ./frontend

# Install dependencies and build production assets into /app/frontend/dist
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# Stage 2: Production Python Runner
FROM python:3.11-slim AS production-runner

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

WORKDIR /app

# Install system dependencies needed for compiling psycopg2 and healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend/app ./app

# Copy built frontend assets from Stage 1 into /app/static
COPY --from=frontend-builder /app/frontend/dist ./static

# Expose ports (8000 for Railway/local, 10000 for Render)
EXPOSE 8000 10000

# Healthcheck targeting the FastAPI /healthz endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://127.0.0.1:${PORT:-8000}/healthz || exit 1

# Launch FastAPI app with dynamic PORT variable
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
