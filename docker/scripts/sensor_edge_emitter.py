#!/usr/bin/env python3
"""
TURRET CBPM — Edge Sensor Telemetry Emitter
Simulates continuous network telemetry packets from physical turret subsystems:
  1. LRF (Laser Range Finder - Detector Voltage in V)
  2. ALG (Automatic Loader & Gun - 6 Microswitches & Serviceability)
  3. Recoil (Recoil Buffer Stroke Distance in mm, Speed, Time, Oil Level)
  4. Elevation (K1 Voltage, PSM Voltage, Hydraulic Pressure in MPa)
  5. Azimuth (K1 Voltage, MP9 Voltage, Actuating Motor Voltage in V)

Sends batches over HTTP to the FastAPI ingestion backend and logs network latency / RTT.
Traffic is captured and analyzed in real-time by the ntopng network monitoring service.
"""

import json
import logging
import os
import random
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [EDGE-EMITTER] %(message)s"
)
logger = logging.getLogger("edge_sensor_emitter")

# Configuration via environment variables
INGESTION_URL = os.getenv("INGESTION_URL", "http://backend:8000/api/v1/ingestion/batch")
EMIT_INTERVAL_SECONDS = float(os.getenv("EMIT_INTERVAL_SECONDS", "1.0"))
SOURCE_ID = os.getenv("SOURCE_ID", "TURRET_EDGE_NODE_01")
RETRY_DELAY_SECONDS = float(os.getenv("RETRY_DELAY_SECONDS", "3.0"))


def generate_subsystem_readings() -> list:
    """Generate representative sensor telemetry frames for all 5 subsystems."""
    now_iso = datetime.now(timezone.utc).isoformat()
    readings = []

    # 1. LRF - Laser Range Finder Subsystem (Detector Voltage: 10.5 - 12.5 V)
    lrf_voltage = round(random.gauss(11.5, 0.15), 2)
    readings.append({
        "reading_id": f"READ_LRF_{uuid.uuid4().hex[:10]}",
        "sensor_channel_id": "CH_LRF_DETECTOR_VOLTAGE",
        "subsystem_id": "LRF",
        "timestamp": now_iso,
        "value": lrf_voltage,
        "session_id": "EDGE_SESSION_LRF",
        "operating_mode": "ACTIVE_SURVEILLANCE",
        "unit": "V",
        "sensor_type": "detector_voltage"
    })

    # 2. ALG - Automatic Loader & Gun System (Circuit Continuity & 6 Microswitches)
    readings.append({
        "reading_id": f"READ_ALG_{uuid.uuid4().hex[:10]}",
        "sensor_channel_id": "CH_ALG_CIRCUIT_SERVICEABILITY",
        "subsystem_id": "ALG",
        "timestamp": now_iso,
        "value": 1.0,  # 1.0 = Healthy continuous circuit
        "session_id": "EDGE_SESSION_ALG",
        "operating_mode": "READY_STATIONARY",
        "unit": "STATE",
        "sensor_type": "circuit_serviceability"
    })

    # 3. Recoil Mechanism Subsystem (Stroke Distance in mm, Speed in m/s, Oil in %)
    # Normal Range: 250 - 300 mm
    recoil_distance = round(random.gauss(275.0, 4.0), 1)
    recoil_speed = round(random.gauss(1.85, 0.05), 3)
    readings.extend([
        {
            "reading_id": f"READ_REC_DIST_{uuid.uuid4().hex[:10]}",
            "sensor_channel_id": "CH_RECOIL_RECOIL_DISTANCE",
            "subsystem_id": "RECOIL",
            "timestamp": now_iso,
            "value": recoil_distance,
            "session_id": "EDGE_SESSION_RECOIL",
            "operating_mode": "DYNAMIC_RECOIL_BUFFER",
            "unit": "mm",
            "sensor_type": "recoil_distance"
        },
        {
            "reading_id": f"READ_REC_SPD_{uuid.uuid4().hex[:10]}",
            "sensor_channel_id": "CH_RECOIL_RECOIL_SPEED",
            "subsystem_id": "RECOIL",
            "timestamp": now_iso,
            "value": recoil_speed,
            "session_id": "EDGE_SESSION_RECOIL",
            "operating_mode": "DYNAMIC_RECOIL_BUFFER",
            "unit": "m/s",
            "sensor_type": "recoil_speed"
        },
        {
            "reading_id": f"READ_REC_OIL_{uuid.uuid4().hex[:10]}",
            "sensor_channel_id": "CH_RECOIL_OIL_LEVEL",
            "subsystem_id": "RECOIL",
            "timestamp": now_iso,
            "value": round(random.gauss(94.0, 1.0), 1),
            "session_id": "EDGE_SESSION_RECOIL",
            "operating_mode": "DYNAMIC_RECOIL_BUFFER",
            "unit": "%",
            "sensor_type": "oil_level"
        }
    ])

    # 4. Elevation Drive Subsystem (K1 Voltage: 25-40 V, Pressure: 10-200 MPa)
    readings.extend([
        {
            "reading_id": f"READ_ELEV_K1_{uuid.uuid4().hex[:10]}",
            "sensor_channel_id": "CH_ELEVATION_K1_VOLTAGE",
            "subsystem_id": "ELEVATION",
            "timestamp": now_iso,
            "value": round(random.gauss(32.5, 0.8), 2),
            "session_id": "EDGE_SESSION_ELEVATION",
            "operating_mode": "ELEVATION_SLEW",
            "unit": "V",
            "sensor_type": "k1_voltage"
        },
        {
            "reading_id": f"READ_ELEV_PRESS_{uuid.uuid4().hex[:10]}",
            "sensor_channel_id": "CH_ELEVATION_HYDRAULIC_PRESSURE",
            "subsystem_id": "ELEVATION",
            "timestamp": now_iso,
            "value": round(random.gauss(125.0, 5.0), 1),
            "session_id": "EDGE_SESSION_ELEVATION",
            "operating_mode": "ELEVATION_SLEW",
            "unit": "MPa",
            "sensor_type": "hydraulic_pressure"
        }
    ])

    # 5. Azimuth / Turret Drive Subsystem (K1 Voltage, MP9 Voltage, Motor Voltage: 25-40 V)
    readings.extend([
        {
            "reading_id": f"READ_AZIM_K1_{uuid.uuid4().hex[:10]}",
            "sensor_channel_id": "CH_AZIMUTH_K1_VOLTAGE",
            "subsystem_id": "AZIMUTH",
            "timestamp": now_iso,
            "value": round(random.gauss(32.5, 0.8), 2),
            "session_id": "EDGE_SESSION_AZIMUTH",
            "operating_mode": "AZIMUTH_SLEW",
            "unit": "V",
            "sensor_type": "k1_voltage"
        },
        {
            "reading_id": f"READ_AZIM_MOT_{uuid.uuid4().hex[:10]}",
            "sensor_channel_id": "CH_AZIMUTH_MOTOR_VOLTAGE",
            "subsystem_id": "AZIMUTH",
            "timestamp": now_iso,
            "value": round(random.gauss(34.0, 0.9), 2),
            "session_id": "EDGE_SESSION_AZIMUTH",
            "operating_mode": "AZIMUTH_SLEW",
            "unit": "V",
            "sensor_type": "motor_voltage"
        }
    ])

    return readings


def transmit_batch(batch_readings: list) -> bool:
    """Send batch readings to FastAPI backend and measure round-trip latency."""
    payload = {
        "batch_id": f"BATCH_{uuid.uuid4().hex[:12]}",
        "source": SOURCE_ID,
        "readings": batch_readings
    }
    encoded_data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url=INGESTION_URL,
        data=encoded_data,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "Turret-Edge-Sensor-Node/1.0",
            "X-Turret-Subsystems": "LRF,ALG,RECOIL,ELEVATION,AZIMUTH"
        },
        method="POST"
    )

    t_start = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=5.0) as resp:
            t_rtt_ms = round((time.perf_counter() - t_start) * 1000.0, 2)
            resp_body = resp.read().decode("utf-8")
            status_code = resp.status
            logger.info(
                f"Dispatched batch {payload['batch_id']} ({len(batch_readings)} channels) "
                f"-> HTTP {status_code} | Telemetry RTT: {t_rtt_ms} ms"
            )
            return True
    except urllib.error.HTTPError as e:
        t_rtt_ms = round((time.perf_counter() - t_start) * 1000.0, 2)
        logger.warning(f"HTTP Error {e.code} during ingestion dispatch: {e.reason} (RTT: {t_rtt_ms} ms)")
        return False
    except urllib.error.URLError as e:
        logger.warning(f"Connection failed to backend at {INGESTION_URL}: {e.reason}. Retrying...")
        return False
    except Exception as e:
        logger.error(f"Unexpected error transmitting batch: {e}")
        return False


def main():
    logger.info("Starting TURRET CBPM Edge Sensor Telemetry Emitter...")
    logger.info(f"Target Ingestion URL : {INGESTION_URL}")
    logger.info(f"Emission Interval    : {EMIT_INTERVAL_SECONDS} s")
    logger.info(f"Edge Source ID       : {SOURCE_ID}")
    logger.info("Network packets will be monitored in real-time by ntopng.")

    # Small initial warm-up delay to allow backend to finish startup
    time.sleep(2.0)

    batches_sent = 0
    while True:
        try:
            readings = generate_subsystem_readings()
            success = transmit_batch(readings)
            if success:
                batches_sent += 1
                time.sleep(EMIT_INTERVAL_SECONDS)
            else:
                time.sleep(RETRY_DELAY_SECONDS)
        except KeyboardInterrupt:
            logger.info("Edge emitter stopped by user.")
            break
        except Exception as e:
            logger.error(f"Error in main emission loop: {e}")
            time.sleep(RETRY_DELAY_SECONDS)


if __name__ == "__main__":
    main()
