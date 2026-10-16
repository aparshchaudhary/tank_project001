#!/usr/bin/env python3
"""
TURRET CBPM — Telemetry Dispatcher Utility
Sends telemetry payloads to the FastAPI backend to update the website in real-time.
Usage:
    python send_telemetry.py
    python send_telemetry.py --url https://your-render-app.onrender.com
    python send_telemetry.py --loop --interval 2.0
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone

DEFAULT_SERVER_URL = os.getenv("SERVER_URL", "http://localhost:8000")
PAYLOAD_FILE = os.path.join(os.path.dirname(__file__), "telemetry_payload.json")


def load_and_refresh_payload(file_path: str) -> dict:
    """Load sample JSON and inject fresh ISO timestamps and unique reading IDs."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Payload file not found: {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    now_iso = datetime.now(timezone.utc).isoformat()
    unique_suffix = uuid.uuid4().hex[:8]

    data["batch_id"] = f"BATCH_DISPATCH_{unique_suffix}"
    for idx, reading in enumerate(data.get("readings", [])):
        sub_code = reading.get("subsystem_id", "GEN")
        reading["reading_id"] = f"READ_{sub_code}_{unique_suffix}_{idx:02d}"
        reading["timestamp"] = now_iso

    return data


def send_batch(server_url: str, payload: dict) -> bool:
    """Send batch payload to FastAPI ingestion endpoint."""
    endpoint = f"{server_url.rstrip('/')}/api/v1/ingestion/batch"
    encoded_body = json.dumps(payload, indent=2).encode("utf-8")

    req = urllib.request.Request(
        url=endpoint,
        data=encoded_body,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "Turret-Telemetry-CLI/1.0"
        },
        method="POST"
    )

    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=10.0) as resp:
            elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 2)
            resp_data = json.loads(resp.read().decode("utf-8"))
            print(f"[{datetime.now().strftime('%H:%M:%S')}] HTTP {resp.status} OK ({elapsed_ms} ms)")
            print(f"   Batch ID       : {payload.get('batch_id')}")
            print(f"   Readings Sent  : {len(payload.get('readings', []))}")
            print(f"   Server Status  : {resp_data.get('status')}")
            print(f"   Accepted Count : {resp_data.get('accepted_count')}")
            print("   -> Live telemetry broadcast dispatched to website WebSocket!")
            return True
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="ignore")
        print(f"[ERROR] HTTP {e.code}: {e.reason}")
        print(f"   Details: {error_body}")
        return False
    except urllib.error.URLError as e:
        print(f"[ERROR] Failed to connect to {endpoint}: {e.reason}")
        print("   Ensure the backend server is running (e.g. uvicorn app.main:app or docker compose up).")
        return False


def main():
    parser = argparse.ArgumentParser(description="TURRET CBPM Telemetry Dispatcher")
    parser.add_argument("--url", default=DEFAULT_SERVER_URL, help="Base server URL (default: http://localhost:8000)")
    parser.add_argument("--file", default=PAYLOAD_FILE, help="Path to telemetry JSON file")
    parser.add_argument("--loop", action="store_true", help="Send continuously in a loop")
    parser.add_argument("--interval", type=float, default=2.0, help="Loop interval in seconds (default: 2.0)")
    args = parser.parse_args()

    print(f"TURRET CBPM — Telemetry Dispatcher")
    print(f"Target Server : {args.url}")
    print(f"Payload Source: {args.file}")
    print("-" * 50)

    if args.loop:
        print(f"Running in continuous loop (interval: {args.interval}s)... Press Ctrl+C to stop.")
        try:
            while True:
                payload = load_and_refresh_payload(args.file)
                send_batch(args.url, payload)
                time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\nStopped by user.")
    else:
        payload = load_and_refresh_payload(args.file)
        success = send_batch(args.url, payload)
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
