import { useEffect, useRef } from "react";
import { useGameStore } from "../../state/gameStore";
import { useDevToolsRuntimeStore } from "../debug/devtools/devToolsRuntimeStore";

/** The only wall-clock loop that advances gameplay in the application. */
export function SimulationDriver() {
  const combatActive = useGameStore((state) => state.combatActive);
  const recoveryActive = useGameStore((state) => {
    const combat = state.game.combat;
    return (combat.phase === "inactive" || combat.phase === "stopped") &&
      (combat.playerHp < combat.maxPlayerHp || combat.stamina < combat.maxStamina || combat.mana < combat.maxMana);
  });
  const tickCombat = useGameStore((state) => state.tickCombat);
  const paused = useDevToolsRuntimeStore((state) => state.simulationPaused);
  const timeScale = useDevToolsRuntimeStore((state) => state.timeScale);
  const accumulator = useRef(0);
  const resetVersion = useDevToolsRuntimeStore((state) => state.simulationResetVersion);
  const seenResetVersion = useRef(resetVersion);

  useEffect(() => {
    if ((!combatActive && !recoveryActive) || paused) return;
    if (seenResetVersion.current !== resetVersion) { accumulator.current = 0; seenResetVersion.current = resetVersion; }
    const interval = window.setInterval(() => {
      accumulator.current += 0.1 * timeScale;
      while (accumulator.current >= 0.1) {
        tickCombat(0.1);
        accumulator.current -= 0.1;
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, [combatActive, recoveryActive, paused, resetVersion, timeScale, tickCombat]);

  return null;
}

export function stepSimulation(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  useDevToolsRuntimeStore.getState().resetSimulationAccumulator();
  const tickCombat = useGameStore.getState().tickCombat;
  let remaining = seconds;
  while (remaining > 0) {
    const delta = Math.min(0.1, remaining);
    tickCombat(delta);
    remaining -= delta;
  }
}
