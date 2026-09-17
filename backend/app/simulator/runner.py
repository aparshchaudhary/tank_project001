import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Callable
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.all_models import Subsystem, SensorChannel, RawReading, FeatureRecord, BaselineSignature
from app.simulator.scenarios import SimulationScenario, NOMINAL_BASELINES
from app.simulator.generator import synthetic_data_generator
from app.services.anomaly_detector import anomaly_detector
from app.services.health_index_engine import health_index_engine
from app.services.alert_service import alert_service
from app.services.buffer_service import edge_buffer_service

logger = logging.getLogger(__name__)

class SimulatorRunner:
    def __init__(self):
        self.is_running: bool = False
        self.scenario: str = SimulationScenario.A_HEALTHY.value
        self.speed_multiplier: float = 1.0
        self.fault_severity: float = 0.0
        self.noise_level: float = 0.05
        self.operating_mode: str = "SLEW_TRACKING"
        self.active_subsystems: List[str] = list(NOMINAL_BASELINES.keys())
        self.readings_generated_count: int = 0
        self.start_time: float = time.time()
        self.demo_mode_active: bool = False
        self.demo_mode_step: Optional[str] = None
        self._task: Optional[asyncio.Task] = None
        self._subscribers: List[Callable[[Dict[str, Any]], None]] = []

    def register_telemetry_subscriber(self, callback: Callable[[Dict[str, Any]], None]):
        self._subscribers.append(callback)

    def unregister_telemetry_subscriber(self, callback: Callable[[Dict[str, Any]], None]):
        if callback in self._subscribers:
            self._subscribers.remove(callback)

    def get_status(self) -> Dict[str, Any]:
        return {
            "is_running": self.is_running,
            "scenario": self.scenario,
            "speed_multiplier": self.speed_multiplier,
            "fault_severity": self.fault_severity,
            "noise_level": self.noise_level,
            "operating_mode": self.operating_mode,
            "active_subsystems": self.active_subsystems,
            "readings_generated_count": self.readings_generated_count,
            "uptime_seconds": round(time.time() - self.start_time, 1) if self.is_running else 0.0,
            "demo_mode_active": self.demo_mode_active,
            "demo_mode_step": self.demo_mode_step
        }

    def start(self, scenario: Optional[str] = None, speed: float = 1.0, fault_severity: float = 0.0):
        if scenario:
            self.scenario = scenario
        self.speed_multiplier = max(0.2, min(10.0, speed))
        self.fault_severity = max(0.0, min(1.0, fault_severity))
        self.is_running = True
        self.start_time = time.time()

    def stop(self):
        self.is_running = False
        self.demo_mode_active = False
        self.demo_mode_step = None

    def trigger_demo_mode(self):
        """Starts automated 4-step demonstration sequence: Healthy -> Degrading -> Alerts -> Maintenance"""
        self.is_running = True
        self.demo_mode_active = True
        self.demo_mode_step = "STAGE 1: Healthy Baseline Operation"
        self.scenario = SimulationScenario.A_HEALTHY.value
        self.fault_severity = 0.0
        self.speed_multiplier = 2.0

    async def run_loop(self):
        """Main simulator loop running in background"""
        cycle = 0
        while True:
            try:
                if self.is_running:
                    cycle += 1
                    await self._process_simulation_step(cycle)
            except Exception as e:
                logger.error(f"Error in simulator run loop: {e}", exc_info=True)

            sleep_duration = max(0.2, 1.0 / self.speed_multiplier)
            await asyncio.sleep(sleep_duration)

    async def _process_simulation_step(self, cycle: int):
        db: Session = SessionLocal()
        try:
            # DEMO MODE step management
            if self.demo_mode_active:
                if cycle % 15 == 0 and self.fault_severity < 0.2:
                    self.demo_mode_step = "STAGE 2: Early Mechanical Degradation (Bearing Wear)"
                    self.scenario = SimulationScenario.D_BEARING_DEGRADATION.value
                    self.fault_severity = 0.35
                elif cycle % 30 == 0 and self.fault_severity < 0.6:
                    self.demo_mode_step = "STAGE 3: Accelerated Wear & Warning Alert Triggered"
                    self.fault_severity = 0.65
                elif cycle % 45 == 0 and self.fault_severity < 0.9:
                    self.demo_mode_step = "STAGE 4: Critical Anomaly & Maintenance Directive Triggered"
                    self.fault_severity = 0.95

            # Iterate through subsystems and sensors in DB
            subsystems = db.query(Subsystem).filter(Subsystem.is_active == True).all()
            telemetry_batch = []

            for sub in subsystems:
                if sub.code not in NOMINAL_BASELINES:
                    continue

                channels = db.query(SensorChannel).filter(SensorChannel.subsystem_id == sub.id).all()
                channel_map = {c.name: c for c in channels}
                active_baselines = {
                    b.feature_name: b for b in db.query(BaselineSignature).filter(
                        BaselineSignature.subsystem_id == sub.id,
                        BaselineSignature.is_active == True
                    ).all()
                }

                current_feature_values: Dict[str, float] = {}
                feature_specs = NOMINAL_BASELINES[sub.code]

                for feat_name in feature_specs.keys():
                    channel = channel_map.get(feat_name)
                    channel_id = channel.id if channel else None

                    reading_dict = synthetic_data_generator.generate_reading(
                        subsystem_code=sub.code,
                        feature_name=feat_name,
                        channel_id=channel_id or sub.id,
                        subsystem_id=sub.id,
                        scenario=self.scenario,
                        fault_severity=self.fault_severity,
                        noise_level=self.noise_level,
                        operating_mode=self.operating_mode
                    )

                    if reading_dict is None:
                        continue # Simulated sensor dropout

                    self.readings_generated_count += 1
                    current_feature_values[feat_name] = reading_dict["value"]

                    # Evaluate Anomaly for this feature
                    base_sig = active_baselines.get(feat_name)
                    if base_sig:
                        anomaly = anomaly_detector.evaluate_feature(
                            subsystem_id=sub.id,
                            subsystem_code=sub.code,
                            feature_name=feat_name,
                            current_value=reading_dict["value"],
                            baseline=base_sig,
                            all_features=current_feature_values,
                            sensor_channel_id=channel_id
                        )
                        if anomaly:
                            db.add(anomaly)
                            # Trigger or update alert
                            alert_service.trigger_or_update_alert(
                                db=db,
                                subsystem_id=sub.id,
                                feature_name=feat_name,
                                severity=anomaly.severity,
                                current_value=reading_dict["value"],
                                baseline_value=base_sig.baseline_mean,
                                health_index_snapshot=sub.current_health_index,
                                probable_issue=anomaly.fault_diagnosis,
                                sensor_channel_id=channel_id
                            )

                # Compute & record Health Index
                if current_feature_values and active_baselines:
                    hi_record = health_index_engine.record_health_index(
                        db=db,
                        subsystem=sub,
                        current_features=current_feature_values,
                        baselines=active_baselines
                    )
                    
                    telemetry_batch.append({
                        "subsystem_id": sub.id,
                        "subsystem_code": sub.code,
                        "subsystem_name": sub.name,
                        "health_index": hi_record.health_index,
                        "status_band": hi_record.status_band,
                        "features": current_feature_values,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })

            # Broadcast batch to WebSocket listeners
            if telemetry_batch:
                payload = {
                    "type": "TELEMETRY_UPDATE",
                    "batch": telemetry_batch,
                    "simulator_status": self.get_status()
                }
                for sub_callback in list(self._subscribers):
                    try:
                        sub_callback(payload)
                    except Exception as ex:
                        logger.warning(f"Failed to dispatch to subscriber: {ex}")

        finally:
            db.close()

simulator_runner = SimulatorRunner()
