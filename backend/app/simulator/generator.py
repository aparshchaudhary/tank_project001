import math
import random
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from app.simulator.scenarios import SimulationScenario, NOMINAL_BASELINES

class SyntheticDataGenerator:
    def __init__(self):
        self.step_counter = 0

    def generate_reading(
        self,
        subsystem_code: str,
        feature_name: str,
        channel_id: str,
        subsystem_id: str,
        scenario: str,
        fault_severity: float, # 0.0 to 1.0
        noise_level: float,    # 0.0 to 0.3
        operating_mode: str,
        timestamp: Optional[datetime] = None,
        session_id: str = "SIM_SESSION_01"
    ) -> Optional[Dict[str, Any]]:
        self.step_counter += 1
        t = self.step_counter * 0.1
        ts = timestamp or datetime.now(timezone.utc)

        # Retrieve nominal baseline distribution
        sub_specs = NOMINAL_BASELINES.get(subsystem_code, {})
        feat_spec = sub_specs.get(feature_name)
        if not feat_spec:
            # Generic fallback
            mean = 10.0
            std = 1.0
            unit = "arb"
        else:
            mean = feat_spec["mean"]
            std = feat_spec["std"]
            unit = feat_spec["unit"]

        # Base nominal time-series harmonic oscillation
        harmonic = 0.2 * std * math.sin(2.0 * math.pi * 0.25 * t)
        noise = random.gauss(0, std * (1.0 + noise_level * 2.0))
        val = mean + harmonic + noise

        # SCENARIO INJECTION LOGIC:
        if scenario == SimulationScenario.H_SENSOR_DROPOUT or scenario == "H. SENSOR DROPOUT":
            # 25% chance of returning None or 0.0 stuck sensor
            if random.random() < 0.25:
                if random.random() < 0.5:
                    return None # Channel dropout
                else:
                    val = 0.0 # Stuck at zero

        elif scenario == SimulationScenario.B_MOTOR_DEGRADATION or scenario == "B. MOTOR DEGRADATION":
            if subsystem_code in ["AZIMUTH", "ELEVATION", "TRAVERSE"]:
                if "voltage" in feature_name:
                    # Voltage drop / fluctuation outside ideal 25-40V band
                    val -= fault_severity * 12.0 + (fault_severity * 3.0 * math.sin(2.0 * math.pi * 1.5 * t))

        elif scenario == SimulationScenario.C_GEARBOX_ANOMALY or scenario == "C. GEARBOX/VIBRATION ANOMALY":
            if subsystem_code == "LRF" and "detector_voltage" in feature_name:
                # Trip LRF voltage outside nominal 11.0-12.0V band into warning/alert
                val += fault_severity * 1.8 * math.sin(2.0 * math.pi * 0.5 * t)

        elif scenario == SimulationScenario.D_BEARING_DEGRADATION or scenario == "D. BEARING DEGRADATION":
            if subsystem_code == "RECOIL":
                if feature_name == "recoil_distance":
                    val += fault_severity * 85.0 # Extends distance into 300-350 (warning) and >350 (critical)
                elif feature_name == "recoil_speed":
                    val += fault_severity * 0.8
            elif subsystem_code == "AZIMUTH" and "voltage" in feature_name:
                val -= fault_severity * 9.0

        elif scenario == SimulationScenario.E_HYDRAULIC_ANOMALY or scenario == "E. HYDRAULIC PRESSURE ANOMALY":
            if subsystem_code == "RECOIL":
                if feature_name == "recoil_distance":
                    val += fault_severity * 95.0 # Extends distance > 350 mm
                elif feature_name == "oil_level":
                    val -= fault_severity * 35.0 # Low oil level
            elif subsystem_code == "ELEVATION" and feature_name == "hydraulic_pressure":
                val -= fault_severity * 75.0 # Pressure drops toward/below 10 MPa

        elif scenario == SimulationScenario.F_POSITION_ERROR or scenario == "F. POSITION ERROR":
            if subsystem_code == "ALG":
                if "microswitch" in feature_name or "circuit" in feature_name:
                    if fault_severity > 0.5:
                        val = 0.0 # Open circuit / switch fault
            elif subsystem_code in ["AZIMUTH", "ELEVATION"]:
                if "voltage" in feature_name:
                    val -= fault_severity * 8.0

        elif scenario == SimulationScenario.G_TEMPERATURE_RISE or scenario == "G. TEMPERATURE RISE":
            if "voltage" in feature_name:
                val -= fault_severity * 6.0

        elif scenario == SimulationScenario.J_MULTIPLE_ANOMALIES or scenario == "J. MULTIPLE SIMULTANEOUS ANOMALIES":
            # Compounded anomalies
            if subsystem_code == "RECOIL" and feature_name == "recoil_distance":
                val += fault_severity * 90.0
            if subsystem_code == "LRF" and feature_name == "detector_voltage":
                val += fault_severity * 1.6
            if "voltage" in feature_name:
                val -= fault_severity * 10.0
            if "pressure" in feature_name:
                val -= fault_severity * 60.0

        # Boundary checks
        if "voltage" in feature_name and val < 0.0:
            val = 0.0
        if "distance" in feature_name and val < 0.0:
            val = 0.0
        if "oil_level" in feature_name:
            val = max(0.0, min(100.0, val))

        return {
            "reading_id": f"SIM_{uuid.uuid4().hex[:12]}",
            "sensor_channel_id": channel_id,
            "subsystem_id": subsystem_id,
            "timestamp": ts,
            "value": round(float(val), 4),
            "unit": unit,
            "sensor_type": feature_name,
            "session_id": session_id,
            "operating_mode": operating_mode,
            "schema_version": "1.0"
        }

synthetic_data_generator = SyntheticDataGenerator()
