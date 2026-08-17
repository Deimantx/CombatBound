import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../../state/gameStore";
import { useProfileStore } from "../../state/profileStore";
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
  const offlineReportOpen = useProfileStore((state) => Boolean(state.pendingOfflineReport));
  const timeScale = useDevToolsRuntimeStore((state) => state.timeScale);
  const accumulator = useRef(0);
  const resetVersion = useDevToolsRuntimeStore((state) => state.simulationResetVersion);
  const seenResetVersion = useRef(resetVersion);
  const [visible, setVisible] = useState(() => typeof document === "undefined" || document.visibilityState === "visible");

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") accumulator.current = 0;
      setVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    if ((!combatActive && !recoveryActive) || paused || !visible || offlineReportOpen) {
      accumulator.current = 0;
      return;
    }
    if (seenResetVersion.current !== resetVersion) { accumulator.current = 0; seenResetVersion.current = resetVersion; }
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        accumulator.current = 0;
        return;
      }
      accumulator.current += 0.1 * timeScale;
      while (accumulator.current >= 0.1) {
        tickCombat(0.1);
        accumulator.current -= 0.1;
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, [combatActive, recoveryActive, paused, offlineReportOpen, resetVersion, timeScale, tickCombat, visible]);

  return null;
}

export function stepSimulation(seconds: number) {
  // Developer/manual deterministic simulation helper only. Never consume Offline Time Bank time.
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
