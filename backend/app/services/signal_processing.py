import math
from typing import List, Dict, Any, Optional
import numpy as np
from scipy import signal as sp_signal

class SignalProcessingService:
    @staticmethod
    def calculate_vibration_features(raw_samples: List[float], sampling_rate_hz: float = 1000.0) -> Dict[str, float]:
        if not raw_samples:
            return {"rms": 0.0, "peak": 0.0, "peak_to_peak": 0.0, "crest_factor": 0.0, "spectral_peak_freq": 0.0}
        
        arr = np.array(raw_samples, dtype=float)
        # Remove DC bias
        arr_centered = arr - np.mean(arr)
        
        rms = float(np.sqrt(np.mean(np.square(arr_centered))))
        peak = float(np.max(np.abs(arr_centered)))
        p2p = float(np.max(arr) - np.min(arr))
        crest_factor = float(peak / (rms + 1e-6))
        
        # FFT Spectral peak
        spectral_peak_freq = 0.0
        if len(arr_centered) >= 16:
            fft_vals = np.abs(np.fft.rfft(arr_centered))
            fft_freqs = np.fft.rfftfreq(len(arr_centered), d=1.0 / sampling_rate_hz)
            # ignore 0 Hz DC
            if len(fft_vals) > 1:
                idx = np.argmax(fft_vals[1:]) + 1
                spectral_peak_freq = float(fft_freqs[idx])
        
        return {
            "vibration_rms": round(rms, 4),
            "vibration_peak": round(peak, 4),
            "vibration_peak_to_peak": round(p2p, 4),
            "crest_factor": round(crest_factor, 4),
            "spectral_peak_freq": round(spectral_peak_freq, 2)
        }

    @staticmethod
    def calculate_motor_features(current_samples: List[float], speed_samples: Optional[List[float]] = None) -> Dict[str, float]:
        if not current_samples:
            return {"motor_rms_current": 0.0, "motor_peak_current": 0.0, "motor_current_variation": 0.0, "speed_deviation": 0.0}
        
        arr = np.array(current_samples, dtype=float)
        rms_curr = float(np.sqrt(np.mean(np.square(arr))))
        peak_curr = float(np.max(np.abs(arr)))
        var_curr = float(np.std(arr))
        
        speed_dev = 0.0
        if speed_samples and len(speed_samples) > 0:
            speed_arr = np.array(speed_samples, dtype=float)
            target_speed = float(np.median(speed_arr))
            speed_dev = float(np.mean(np.abs(speed_arr - target_speed)))

        return {
            "motor_rms_current": round(rms_curr, 3),
            "motor_peak_current": round(peak_curr, 3),
            "motor_current_variation": round(var_curr, 3),
            "speed_deviation": round(speed_dev, 3)
        }

    @staticmethod
    def calculate_hydraulic_features(pressure_samples: List[float], flow_samples: Optional[List[float]] = None) -> Dict[str, float]:
        if not pressure_samples:
            return {"hydraulic_pressure_variation": 0.0, "flow_deviation": 0.0}
        
        p_arr = np.array(pressure_samples, dtype=float)
        p_variation = float(np.std(p_arr))
        
        flow_dev = 0.0
        if flow_samples and len(flow_samples) > 0:
            f_arr = np.array(flow_samples, dtype=float)
            flow_dev = float(np.std(f_arr))

        return {
            "hydraulic_pressure_variation": round(p_variation, 3),
            "flow_deviation": round(flow_dev, 3)
        }

    @staticmethod
    def calculate_position_features(actual_pos: List[float], target_pos: List[float]) -> Dict[str, float]:
        if not actual_pos or not target_pos or len(actual_pos) != len(target_pos):
            return {
                "position_error": 0.0,
                "overshoot": 0.0,
                "movement_time": 0.0,
                "repeatability": 0.0
            }
        
        act = np.array(actual_pos, dtype=float)
        tgt = np.array(target_pos, dtype=float)
        
        errors = np.abs(act - tgt)
        mean_error = float(np.mean(errors))
        max_overshoot = float(np.max(errors))
        repeatability = float(np.std(errors))
        
        return {
            "position_error": round(mean_error, 4),
            "overshoot": round(max_overshoot, 4),
            "movement_time": round(float(len(actual_pos) * 0.02), 2),
            "repeatability": round(repeatability, 4)
        }

    @staticmethod
    def filter_outliers(samples: List[float], threshold_z: float = 3.5) -> List[float]:
        if len(samples) < 4:
            return samples
        arr = np.array(samples, dtype=float)
        mean = np.mean(arr)
        std = np.std(arr)
        if std < 1e-6:
            return samples
        z_scores = np.abs((arr - mean) / std)
        clean = arr[z_scores < threshold_z]
        return clean.tolist() if len(clean) > 0 else samples

signal_processing_service = SignalProcessingService()
