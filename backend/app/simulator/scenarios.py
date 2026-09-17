from enum import Enum
from typing import Dict, Any

class SimulationScenario(str, Enum):
    A_HEALTHY = "A. HEALTHY"
    B_MOTOR_DEGRADATION = "B. MOTOR DEGRADATION"
    C_GEARBOX_ANOMALY = "C. GEARBOX/VIBRATION ANOMALY"
    D_BEARING_DEGRADATION = "D. BEARING DEGRADATION"
    E_HYDRAULIC_ANOMALY = "E. HYDRAULIC PRESSURE ANOMALY"
    F_POSITION_ERROR = "F. POSITION ERROR"
    G_TEMPERATURE_RISE = "G. TEMPERATURE RISE"
    H_SENSOR_DROPOUT = "H. SENSOR DROPOUT"
    I_COMMUNICATION_INTERRUPTION = "I. COMMUNICATION INTERRUPTION"
    J_MULTIPLE_ANOMALIES = "J. MULTIPLE SIMULTANEOUS ANOMALIES"

# Default healthy nominal baseline parameters per subsystem
NOMINAL_BASELINES: Dict[str, Dict[str, Any]] = {
    "TURRET_DRIVE": {
        "vibration_rms": {"mean": 0.85, "std": 0.08, "unit": "mm/s"},
        "vibration_peak": {"mean": 1.45, "std": 0.15, "unit": "mm/s"},
        "vibration_peak_to_peak": {"mean": 2.65, "std": 0.22, "unit": "mm/s"},
        "crest_factor": {"mean": 1.72, "std": 0.12, "unit": "ratio"},
        "temperature": {"mean": 42.0, "std": 2.5, "unit": "deg C"},
    },
    "GEARBOX": {
        "vibration_rms": {"mean": 1.10, "std": 0.10, "unit": "mm/s"},
        "vibration_peak_to_peak": {"mean": 3.20, "std": 0.30, "unit": "mm/s"},
        "spectral_peak_freq": {"mean": 125.0, "std": 5.0, "unit": "Hz"},
        "temperature": {"mean": 48.0, "std": 3.0, "unit": "deg C"},
    },
    "MOTOR": {
        "motor_rms_current": {"mean": 14.2, "std": 0.8, "unit": "A"},
        "motor_peak_current": {"mean": 22.5, "std": 1.4, "unit": "A"},
        "motor_current_variation": {"mean": 0.95, "std": 0.12, "unit": "A"},
        "speed_deviation": {"mean": 0.45, "std": 0.08, "unit": "deg/s"},
        "temperature": {"mean": 52.0, "std": 3.2, "unit": "deg C"},
        "voltage": {"mean": 28.1, "std": 0.3, "unit": "V DC"},
    },
    "HYDRAULIC_UNIT": {
        "hydraulic_pressure_variation": {"mean": 4.5, "std": 0.6, "unit": "bar"},
        "flow_deviation": {"mean": 1.2, "std": 0.2, "unit": "L/min"},
        "temperature": {"mean": 46.0, "std": 2.8, "unit": "deg C"},
        "pressure": {"mean": 160.0, "std": 4.0, "unit": "bar"},
    },
    "POSITION_SYSTEM": {
        "position_error": {"mean": 0.008, "std": 0.002, "unit": "deg"},
        "overshoot": {"mean": 0.012, "std": 0.003, "unit": "deg"},
        "movement_time": {"mean": 1.85, "std": 0.10, "unit": "s"},
        "repeatability": {"mean": 0.004, "std": 0.001, "unit": "deg"},
    },
    "BEARING_SYSTEM": {
        "vibration_rms": {"mean": 0.65, "std": 0.06, "unit": "mm/s"},
        "vibration_peak": {"mean": 1.15, "std": 0.12, "unit": "mm/s"},
        "crest_factor": {"mean": 1.77, "std": 0.14, "unit": "ratio"},
        "temperature": {"mean": 38.5, "std": 2.0, "unit": "deg C"},
    }
}
