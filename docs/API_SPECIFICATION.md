# TURRET CBPM API Specification (v1.0.0)

Base URL: `/api/v1`

## Authentication & Operators (`/auth`, `/users`)
- `POST /auth/login-json`: JSON credentials authentication returning JWT token.
- `GET /auth/me`: Current operator identity and active role (`VIEWER`, `TECHNICIAN`, `ADMIN`).

## Ingestion (`/ingestion`)
- `POST /ingestion/readings`: Ingest single telemetry reading with deduplication and out-of-order validation.
- `POST /ingestion/batch`: High-throughput batch ingestion.
- `GET /ingestion/buffer-status`: Check edge store-and-forward queue metrics.

## Subsystems & Sensors (`/subsystems`, `/sensors`)
- `GET /subsystems/`: List all 6 test-bench monitored subsystems with Health Index and active alerts count.
- `GET /subsystems/{id}`: Detailed drill-down data with sensors, baselines, recent anomalies, and RUL info.
- `PUT /subsystems/{id}/weights`: Update feature weights (ADMIN only).
- `GET /sensors/`: List active telemetry channels.

## Health Index & Overview (`/health`)
- `GET /health/overview`: Real-time KPI summaries, system state, healthy/degrading counts, 24h trend points.
- `GET /health/{subsystem_id}/history`: Historical health index trajectory.

## Alerts & Maintenance (`/alerts`, `/maintenance`)
- `GET /alerts/`: Filterable alerts feed (by subsystem, severity, status).
- `POST /alerts/{id}/acknowledge`: Technician acknowledgment with optional assessment notes.
- `POST /alerts/{id}/resolve`: Alert resolution with mandatory maintenance notes.
- `GET /maintenance/events`: Work orders, inspection logs, component replacements.
- `POST /maintenance/events`: Create work order with inspection recommendations.

## Prognostics (`/prognostics`)
- `GET /prognostics/{subsystem_id}/rul`: Remaining Useful Life estimation with "INSUFFICIENT DATA" safeguard.

## Engineering Reports (`/reports`)
- `GET /reports/types`: List available report categories (`daily_health`, `weekly_condition`, `fault_diagnosis`, `component_health`, `maintenance_recommendation`).
- `GET /reports/generate`: Output report in JSON or HTML.
- `GET /reports/download-pdf`: Download formatted binary PDF report.

## Synthetic Simulator (`/simulator`)
- `GET /simulator/status`: Current simulation state, scenario, speed multiplier, fault severity.
- `GET /simulator/scenarios`: List scenarios A through J.
- `POST /simulator/control`: Start, stop, change scenario, adjust speed/severity.
- `POST /simulator/demo-mode`: Trigger 4-stage automated demonstration sequence.

## Model Registry & Administration (`/models`, `/admin`, `/audit`)
- `GET /models/`: Model registry with versions, metrics, status.
- `POST /models/{id}/rollback`: Rollback deployed model version.
- `GET /admin/users`: User list (ADMIN only).
- `POST /admin/users`: Create user account (ADMIN only).
- `POST /admin/rebaseline`: Re-establish healthy baseline (ADMIN only).
- `GET /admin/system-config`: Get active threshold configuration.
- `GET /audit/`: Searchable immutable audit trail.
