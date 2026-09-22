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
    "LRF": {
        "detector_voltage": {"mean": 11.5, "std": 0.2, "unit": "V"},
        "optical_alignment": {"mean": 99.2, "std": 0.4, "unit": "%"},
        "bite_status": {"mean": 1.0, "std": 0.0, "unit": "STATE"},
    },
    "ALG": {
        "circuit_serviceability": {"mean": 1.0, "std": 0.0, "unit": "STATE"},
        "microswitch_current": {"mean": 0.0, "std": 0.0, "unit": "A [Configurable/TBD]"},
        "rc_microswitch": {"mean": 1.0, "std": 0.0, "unit": "STATE"},
        "clm_microswitch": {"mean": 1.0, "std": 0.0, "unit": "STATE"},
        "rammer_microswitch": {"mean": 1.0, "std": 0.0, "unit": "STATE"},
        "cbdm_microswitch": {"mean": 1.0, "std": 0.0, "unit": "STATE"},
        "cbdd_microswitch": {"mean": 1.0, "std": 0.0, "unit": "STATE"},
        "gun_motor_lock": {"mean": 1.0, "std": 0.0, "unit": "STATE"},
    },
    "RECOIL": {
        "recoil_distance": {"mean": 275.0, "std": 6.0, "unit": "mm"},
        "recoil_speed": {"mean": 1.85, "std": 0.08, "unit": "m/s"},
        "recoil_time": {"mean": 0.32, "std": 0.02, "unit": "s"},
        "oil_level": {"mean": 94.0, "std": 1.5, "unit": "%"},
    },
    "ELEVATION": {
        "k1_voltage": {"mean": 32.5, "std": 1.2, "unit": "V"},
        "psm_voltage": {"mean": 33.0, "std": 1.0, "unit": "V"},
        "hydraulic_pressure": {"mean": 125.0, "std": 8.0, "unit": "MPa"},
    },
    "AZIMUTH": {
        "k1_voltage": {"mean": 32.5, "std": 1.2, "unit": "V"},
        "mp9_voltage": {"mean": 31.8, "std": 1.1, "unit": "V"},
        "motor_voltage": {"mean": 34.0, "std": 1.4, "unit": "V"},
    },
    "TRAVERSE": {
        "traverse_voltage": {"mean": 32.0, "std": 1.2, "unit": "V"},
        "motor_voltage": {"mean": 33.5, "std": 1.3, "unit": "V"},
    },
}

