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
            if subsystem_code == "MOTOR":
                if "current" in feature_name:
                    val += fault_severity * 18.5 + (fault_severity * 4.0 * math.sin(2.0 * math.pi * 1.5 * t))
                elif "temperature" in feature_name:
                    val += fault_severity * 38.0
                elif "speed_deviation" in feature_name:
                    val += fault_severity * 1.8

        elif scenario == SimulationScenario.C_GEARBOX_ANOMALY or scenario == "C. GEARBOX/VIBRATION ANOMALY":
            if subsystem_code == "GEARBOX":
                if "vibration" in feature_name:
                    val += fault_severity * 4.8 + (fault_severity * 2.2 * math.sin(2.0 * math.pi * 5.0 * t))
                elif "temperature" in feature_name:
                    val += fault_severity * 22.0

        elif scenario == SimulationScenario.D_BEARING_DEGRADATION or scenario == "D. BEARING DEGRADATION":
            if subsystem_code == "BEARING_SYSTEM" or subsystem_code == "TURRET_DRIVE":
                if "crest_factor" in feature_name:
                    val += fault_severity * 3.2
                elif "vibration" in feature_name:
                    # High frequency intermittent impact shocks
                    shock = 5.0 * fault_severity if random.random() < 0.20 else 0.0
                    val += fault_severity * 3.5 + shock

        elif scenario == SimulationScenario.E_HYDRAULIC_ANOMALY or scenario == "E. HYDRAULIC PRESSURE ANOMALY":
            if subsystem_code == "HYDRAULIC_UNIT":
                if "hydraulic_pressure_variation" in feature_name:
                    val += fault_severity * 18.0 + (fault_severity * 6.0 * math.sin(2.0 * math.pi * 3.2 * t))
                elif "flow_deviation" in feature_name:
                    val += fault_severity * 5.5
                elif "pressure" in feature_name:
                    val -= fault_severity * 45.0 # pressure loss

        elif scenario == SimulationScenario.F_POSITION_ERROR or scenario == "F. POSITION ERROR":
            if subsystem_code == "POSITION_SYSTEM":
                if "position_error" in feature_name:
                    val += fault_severity * 0.08
                elif "overshoot" in feature_name:
                    val += fault_severity * 0.12
                elif "movement_time" in feature_name:
                    val += fault_severity * 1.5

        elif scenario == SimulationScenario.G_TEMPERATURE_RISE or scenario == "G. TEMPERATURE RISE":
            if "temperature" in feature_name:
                val += fault_severity * 42.0

        elif scenario == SimulationScenario.J_MULTIPLE_ANOMALIES or scenario == "J. MULTIPLE SIMULTANEOUS ANOMALIES":
            # Compounded anomalies
            if "vibration" in feature_name:
                val += fault_severity * 4.0
            if "current" in feature_name:
                val += fault_severity * 12.0
            if "temperature" in feature_name:
                val += fault_severity * 32.0
            if "pressure_variation" in feature_name:
                val += fault_severity * 14.0

        # Boundary checks
        if "crest_factor" in feature_name and val < 1.0:
            val = 1.05
        if "rms" in feature_name and val < 0.0:
            val = 0.01

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
