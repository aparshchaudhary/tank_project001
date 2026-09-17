import math
import numpy as np
import pytest
from app.services.signal_processing import signal_processing_service

def test_vibration_rms_and_peak():
    # Pure sine wave: A * sin(wt), RMS should be A / sqrt(2)
    A = 2.0
    fs = 1000.0
    t = np.linspace(0, 1.0, 1000, endpoint=False)
    sine_wave = (A * np.sin(2 * np.pi * 50 * t)).tolist()

    feats = signal_processing_service.calculate_vibration_features(sine_wave, sampling_rate_hz=fs)
    expected_rms = A / math.sqrt(2.0)
    
    assert abs(feats["vibration_rms"] - expected_rms) < 0.05
    assert abs(feats["vibration_peak"] - A) < 0.05
    assert abs(feats["vibration_peak_to_peak"] - 2 * A) < 0.05
    assert abs(feats["spectral_peak_freq"] - 50.0) < 2.0

def test_motor_current_features():
    currents = [14.0, 14.2, 14.5, 13.8, 14.1, 15.0]
    feats = signal_processing_service.calculate_motor_features(currents)
    
    assert feats["motor_rms_current"] > 13.0
    assert feats["motor_peak_current"] == 15.0
    assert feats["motor_current_variation"] > 0.0

def test_hydraulic_and_position_features():
    pressures = [150.0, 155.0, 160.0, 152.0]
    h_feats = signal_processing_service.calculate_hydraulic_features(pressures)
    assert h_feats["hydraulic_pressure_variation"] > 0.0

    act = [0.0, 0.5, 1.02]
    tgt = [0.0, 0.5, 1.00]
    p_feats = signal_processing_service.calculate_position_features(act, tgt)
    assert p_feats["position_error"] > 0.0
    assert p_feats["overshoot"] == 0.02
