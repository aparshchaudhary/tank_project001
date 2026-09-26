# TURRET CBPM — ntopng Network & Telemetry Monitoring Guide

This guide describes how to run and use **ntopng** to monitor network traffic, packet throughput, application flow protocols, and telemetry latency between the physical/edge turret sensors and the FastAPI ingestion backend.

---

## 1. Architecture Overview

```
[ Turret Sensors (LRF, ALG, Recoil, Elevation, Azimuth) ]
                         │
                         ▼
        [ sensor-emitter Container (172.28.0.40) ]
                         │  HTTP POST /api/v1/ingestion/batch
                         ▼
    ┌────────────────────┴──────────────────────────┐
    │  turret-net Bridge Subnet (172.28.0.0/16)     │
    │                                               │
    │   Traffic captured & inspected via eth0       │
    └────────────────────┬──────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
[ backend Container ]              [ ntopng Container ]
(172.28.0.10:8000)                (172.28.0.30:3000 -> Host 3001)
FastAPI Ingestion & SPA                   ▲
                                          │ Flow metrics & timeseries
                                          ▼
                                   [ redis Container ]
                                  (172.28.0.20:6379)
```

### Components
1. **`backend`**: FastAPI application exposing the `/api/v1/ingestion/batch` endpoint and serving the React defense UI.
2. **`sensor-emitter`**: Simulates edge telemetry packets from the 5 subsystems (LRF, ALG, Recoil, Elevation, Azimuth) sent over the container bridge network.
3. **`ntopng`**: Inspects network frames on `turret-net` in promiscuous mode (`NET_ADMIN`, `NET_RAW`), analyzing flow rates, TCP round-trip times (RTT), and application protocols.
4. **`redis`**: Key-value database required by ntopng for session management, flow state tracking, and timeseries caching.

---

## 2. Quick Start with Docker Compose

### Start the Stack
From the project root directory, run:
```bash
docker compose up -d
```

### Check Running Containers
```bash
docker compose ps
```

You should see 4 active containers:
- `turret-cbpm-backend` (port `8000:8000`)
- `turret-cbpm-ntopng` (port `3001:3000`)
- `turret-cbpm-redis` (internal port `6379`)
- `turret-cbpm-sensor-emitter` (continuous telemetry generator)

### Stop the Stack
```bash
docker compose down
```

---

## 3. Accessing the Web Consoles

| Service | Host URL | Description | Default Credentials |
| :--- | :--- | :--- | :--- |
| **TURRET CBPM Platform** | `http://localhost:8000` | Condition monitoring dashboard & SPA | `admin` / `admin123` |
| **FastAPI Swagger Docs** | `http://localhost:8000/docs` | Interactive REST API explorer | — |
| **ntopng Network Monitor** | `http://localhost:3001` | Flow traffic & telemetry latency monitor | `admin` / `admin` |

> [!NOTE]
> Upon your first login to ntopng (`http://localhost:3001`), the system will prompt you to change the default password (`admin` -> your new password).

---

## 4. Monitoring Telemetry Latency & Traffic in ntopng

### 4.1 Live Flow Inspection
1. Navigate to **Flows -> Live** in the top navigation bar.
2. Filter by port `8000` or host `172.28.0.10`.
3. You will observe active TCP connections between `172.28.0.40` (`sensor-emitter`) and `172.28.0.10` (`backend`).
4. Protocol tag: Flows on port 8000 are identified as **`Turret_CBPM_Telemetry`** via `docker/ntopng/protos.txt`.

### 4.2 Telemetry Latency & RTT (Round Trip Time)
1. Click on any active flow between `172.28.0.40` and `172.28.0.10`.
2. Inspect the **TCP Metrics** section:
   - **Client -> Server RTT**: Time taken for SYN-ACK and application packet delivery.
   - **Server Response Time (SRT)**: Latency for FastAPI to process and return HTTP 200/201 responses.
   - **Retransmissions / Lost Packets**: Quantifies packet loss across the bridge network.

### 4.3 Throughput & Bandwidth Charts
1. Navigate to **Interfaces -> eth0**.
2. Review real-time ingress/egress graphs (Kbps / packets per second).
3. The **Top Talkers** breakdown will verify that the edge sensor node accounts for the telemetry ingestion stream.

---

## 5. Configuration Files Reference

- **`docker-compose.yml`**: Defines the services, persistent volumes (`redis_data`, `ntopng_data`), and isolated subnet (`172.28.0.0/16`).
- **`docker/ntopng/ntopng.conf`**: Contains core ntopng daemon arguments:
  - `-i=eth0`: Listen on the container network bridge interface.
  - `-w=3000`: Internal HTTP GUI port.
  - `-r=redis:6379@0`: Internal Redis connection.
  - `-m=172.28.0.0/16...`: Local network declaration.
  - `--community`: Community license mode.
- **`docker/ntopng/protos.txt`**: Maps port 8000 to custom protocol `Turret_CBPM_Telemetry`.
- **`docker/scripts/sensor_edge_emitter.py`**: Standalone edge simulator generating batches for LRF, ALG, Recoil, Elevation, and Azimuth while measuring application RTT latency.
