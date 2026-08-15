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

  useEffect(() => {
    if ((!combatActive && !recoveryActive) || paused) return;
    const interval = window.setInterval(() => {
      accumulator.current += 0.1 * timeScale;
      while (accumulator.current >= 0.1) {
        tickCombat(0.1);
        accumulator.current -= 0.1;
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, [combatActive, recoveryActive, paused, timeScale, tickCombat]);

  return null;
}

export function stepSimulation(seconds: number) {
  const tickCombat = useGameStore.getState().tickCombat;
  const steps = Math.max(1, Math.ceil(Math.max(0, seconds) / 0.1));
  for (let index = 0; index < steps; index += 1) tickCombat(Math.min(0.1, Math.max(0, seconds - index * 0.1)) || 0.1);
}
