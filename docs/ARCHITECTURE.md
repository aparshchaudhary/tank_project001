# TURRET CBPM Architecture & Engineering Reference

## 1. System Safety & Operational Boundaries
This prototype is strictly a **Condition-Based Predictive Maintenance (CBPM) and Health Monitoring decision-support platform** for representative laboratory / test-bench turret subsystems.

> [!CAUTION]
> **Safety Boundary**: This software does NOT implement any weapon-control logic, firing-control logic, ballistics solutions, targeting, or lethality enhancement. All platform outputs are strictly limited to mechanical, electrical, and hydraulic inspection, lubrication, and maintenance servicing directives.

---

## 2. Ingestion & Signal Processing Pipeline

```
Synthetic Sensor Simulator / External Lab DAQ
                     |
                     v
   REST Ingestion (/api/v1/ingestion/readings, /batch)
                     |
                     v
     Edge Buffer & Resilience Layer
     * LRU Deduplication by reading_id
     * Out-of-order tolerance window (configurable ms)
     * Store-and-forward offline buffer abstraction
                     |
                     v
     Signal Processing & Feature Extraction
     * Vibration: FFT spectral peak, RMS, Peak-to-Peak, Crest Factor
     * Motor: RMS current, peak current, current ripple, speed deviation
     * Hydraulic: Pressure variation ripple, flow deviation
     * Position: Error, overshoot, movement settling time
                     |
          +----------+----------+
          |                     |
          v                     v
  Healthy Baseline      Statistical Anomaly
  Signature Engine      Detection Engine
  * Mean (μ), Std (σ)   * dev = min(1.0, |x-μ|/(k*σ))
  * Versioning          * Rule-based fault mapping
  * Re-baselining       * "UNCLASSIFIED ANOMALY" fallback
          |                     |
          +----------+----------+
                     v
         Transparent Health Index Engine
         * HI = 100 * (1 - sum(w_i * dev_i))
         * Bands: Healthy (90-100), Early Dev (75-90),
                  Degrading (50-75), Significant Deg (25-50), Severe (0-25)
                     v
         Optional Prognostics / RUL Engine
         * Evaluates degradation slope
         * Enforces "RUL: INSUFFICIENT DATA" safeguard
                     v
         Alerts, Maintenance & Reports
         * Active -> Ack -> Resolve lifecycle
         * Work orders with safe inspection directives
         * Daily/Weekly/Fault reports (HTML & PDF)
                     v
         FastAPI REST & WebSocket Layer
                     v
         React + Tailwind Telemetry Dashboard
```

---

## 3. Mathematical Formulations

### 3.1 Signal Feature Extraction
- **Vibration RMS**:
  $$\text{RMS} = \sqrt{\frac{1}{N}\sum_{i=1}^N (x_i - \bar{x})^2}$$
- **Vibration Peak & Peak-to-Peak**:
  $$\text{Peak} = \max(|x_i - \bar{x}|), \quad \text{P2P} = \max(x_i) - \min(x_i)$$
- **Crest Factor**:
  $$\text{CF} = \frac{\text{Peak}}{\text{RMS}}$$

### 3.2 Baseline Deviation Score
Given baseline mean $\mu$, baseline standard deviation $\sigma$, and configurable multiplier $k$ (default $k=3.0$):
$$\text{deviation}(f) = \min\left(1.0, \frac{|x_f - \mu_f|}{k \cdot \sigma_f}\right)$$

### 3.3 Transparent Health Index (0 - 100)
$$\text{Health Index} = 100 \times \left(1.0 - \sum_{i=1}^M w_i \cdot \text{deviation}(f_i)\right)$$
where $\sum w_i = 1.0$, configurable per subsystem.

### 3.4 Prognostics & RUL Safeguard
- If $N < 20$ historical degradation observations, the system returns:
  `{"status": "INSUFFICIENT_DATA", "rul_hours": null, "message": "RUL: INSUFFICIENT DATA"}`
- When sufficient data exists and a downward degradation slope $\frac{d\text{HI}}{dt} < -0.05$ is detected:
  $$\text{RUL} = \frac{\text{HI}_{\text{critical}} - \text{HI}_{\text{current}}}{\text{slope}}$$
