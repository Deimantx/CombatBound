import { Pause, Play, SkipForward } from "lucide-react";
import { stepSimulation } from "../../../simulation/SimulationDriver";
import { useDevToolsRuntimeStore } from "../devToolsRuntimeStore";

export function DebugSimulationControls() {
  const paused = useDevToolsRuntimeStore((state) => state.simulationPaused);
  const scale = useDevToolsRuntimeStore((state) => state.timeScale);
  const setPaused = useDevToolsRuntimeStore((state) => state.setSimulationPaused);
  const setScale = useDevToolsRuntimeStore((state) => state.setTimeScale);
  return <div className="debug-simulation-controls" data-debug-kind="simulation-controls" data-debug-simulation-paused={paused} data-debug-time-scale={scale}>
    <button type="button" onClick={() => setPaused(!paused)} data-debug-action={paused ? "resume-simulation" : "pause-simulation"}>{paused ? <Play size={12} /> : <Pause size={12} />}{paused ? "RESUME" : "PAUSE"}</button>
    <button type="button" onClick={() => stepSimulation(0.1)} data-debug-action="step-simulation" data-debug-step-seconds="0.1"><SkipForward size={12} /> STEP .1S</button>
    <button type="button" onClick={() => stepSimulation(1)} data-debug-action="step-simulation" data-debug-step-seconds="1"><SkipForward size={12} /> STEP 1S</button>
    <label>TIME <select value={scale} onChange={(event) => setScale(Number(event.target.value))} aria-label="Simulation time scale" data-debug-action="set-time-scale"><option value={0.25}>0.25x</option><option value={0.5}>0.5x</option><option value={1}>1x</option><option value={2}>2x</option><option value={5}>5x</option><option value={10}>10x</option></select></label>
  </div>;
}
