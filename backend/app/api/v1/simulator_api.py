from fastapi import APIRouter, HTTPException
from app.schemas.schemas import SimulatorStatusResponse, SimulatorControlRequest
from app.simulator.runner import simulator_runner
from app.simulator.scenarios import SimulationScenario

router = APIRouter()

@router.get("/status", response_model=SimulatorStatusResponse)
def get_simulator_status():
    return simulator_runner.get_status()

@router.get("/scenarios")
def get_available_scenarios():
    return [s.value for s in SimulationScenario]

@router.post("/control", response_model=SimulatorStatusResponse)
def control_simulator(payload: SimulatorControlRequest):
    action = payload.action.upper()
    if action == "START":
        simulator_runner.start(
            scenario=payload.scenario,
            speed=payload.speed_multiplier or 1.0,
            fault_severity=payload.fault_severity or 0.0
        )
    elif action == "STOP":
        simulator_runner.stop()
    elif action == "SET_SCENARIO":
        simulator_runner.scenario = payload.scenario or SimulationScenario.A_HEALTHY.value
        if payload.fault_severity is not None:
            simulator_runner.fault_severity = payload.fault_severity
        if payload.speed_multiplier is not None:
            simulator_runner.speed_multiplier = payload.speed_multiplier
    else:
        raise HTTPException(status_code=400, detail="Invalid simulator action. Use START, STOP, or SET_SCENARIO")

    return simulator_runner.get_status()

@router.post("/demo-mode", response_model=SimulatorStatusResponse)
def launch_demo_mode():
    simulator_runner.trigger_demo_mode()
    return simulator_runner.get_status()
