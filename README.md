# TURRET CBPM — Condition-Based Predictive Maintenance & Health Monitoring Platform

A production-grade, software-only Condition-Based Predictive Maintenance (CBPM) and Health Monitoring prototype for a representative laboratory/test-bench turret subsystem.

> [!IMPORTANT]
> **SAFETY & OPERATIONAL BOUNDARY NOTICE**:
> This platform is strictly a **software-only maintenance decision-support and condition-monitoring prototype**.
> It implements **NO weapon-control logic, firing-control logic, firing solutions, targeting, lethality enhancement, or tactical functionality**.
> All diagnostic outputs and recommendations are restricted to mechanical, electrical, and hydraulic inspection, lubrication, re-baselining, and component servicing.

---

## 🚀 Quick Deployment to Railway

This repository is pre-configured for **1-click zero-config deployment on [Railway](https://railway.com)**:

1. Push this folder to a GitHub repository.
2. In Railway, select **New Project** → **Deploy from GitHub repo**.
3. Railway automatically builds the unified multi-stage container (`Dockerfile`) and launches the full-stack service!
4. In Railway Settings, click **Generate Domain** to access your public URL.

For full deployment instructions, see [RAILWAY_DEPLOY.md](RAILWAY_DEPLOY.md).

---

## 💻 Local Quick Start

To run the application locally on your computer:

- **Windows Batch**: Double-click `start.bat`
- **PowerShell**: Run `.\start.ps1`
- **Docker**:
  ```bash
  docker build -t turret-cbpm .
  docker run -p 8000:8000 turret-cbpm
  ```

Once launched:
- **Web Dashboard**: `http://localhost:5173` (Local Dev) or `http://localhost:8000` (Production Container)
- **FastAPI Swagger API Docs**: `http://localhost:8000/docs`

---

## 🔐 Default Operator Credentials

| Role | Username | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Full access, user management, re-baselining |
| **Technician** | `tech` | `tech123` | Acknowledge/resolve alerts, log maintenance |
| **Viewer** | `viewer` | `viewer123` | Read-only dashboards & reports |

*(Clickable quick-fill buttons are provided on the login page.)*

---

## 🛠️ Monitored Test-Bench Subsystems

1. **Turret Azimuth Drive Subsystem** (`TURRET_DRIVE`): Azimuth slew gear train, support casing, and vibration harmonics.
2. **Main Reduction Gearbox** (`GEARBOX`): High-ratio precision planetary gearbox linking servo to ring gear.
3. **Azimuth Servo Motor** (`MOTOR`): Permanent magnet synchronous drive motor with thermal and current telemetry.
4. **Hydraulic Elevation & Buffer Unit** (`HYDRAULIC_UNIT`): Auxiliary test-bench elevation cylinder, pressure ripple, and fluid flow.
5. **Dual Resolver & Encoder System** (`POSITION_SYSTEM`): Absolute optical encoder and inductive resolver with tracking error and overshoot analysis.
6. **Main Turret Ring & Race Bearing** (`BEARING_SYSTEM`): Large diameter ball race bearing accommodating axial and radial loads.

---

## 📊 Synthetic Telemetry Scenarios (A through J)

- **A. HEALTHY**: Nominal harmonic oscillation with Gaussian noise within $1\sigma$ baseline bounds.
- **B. MOTOR DEGRADATION**: Elevated winding temperature ($+38$ °C), rising RMS current ($+18.5$ A), and current ripple.
- **C. GEARBOX/VIBRATION ANOMALY**: Gear mesh sideband vibration ($+4.8$ mm/s), peak-to-peak acceleration, and temperature rise.
- **D. BEARING DEGRADATION**: High-frequency raceway impact spikes, crest factor surge ($1.7 \to 4.8$), and vibration RMS rise.
- **E. HYDRAULIC PRESSURE ANOMALY**: Cavitation pressure pulsation ($\pm 18$ bar), flow drop, and delivery deficit.
- **F. POSITION ERROR**: Tracking error drift, overshoot surge, and settling time increase.
- **G. TEMPERATURE RISE**: Progressive thermal dissipation failure across bearings and drive stages.
- **H. SENSOR DROPOUT**: Intermittent missing packets and stuck-at-zero channel dropouts.
- **I. COMMUNICATION INTERRUPTION**: Delayed burst delivery testing out-of-order ingestion buffer tolerance.
- **J. MULTIPLE SIMULTANEOUS ANOMALIES**: Compounded mechanical wear, motor current surge, and thermal runaway.

---

## 🧪 Automated Testing

Run the full backend test suite:
```powershell
python -m pytest backend/tests -v
```

All 14 tests verify ingestion resilience, signal processing, k-sigma deviation, transparent 0-100 Health Index, RUL safeguards ("RUL: INSUFFICIENT DATA"), and RBAC enforcement.
