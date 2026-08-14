import { useEffect, useRef, useState } from "react";
import { stanceDefinitions } from "../../../../game/data/stances";
import { techniqueDefinitions } from "../../../../game/data/techniques";
import type {
  CombatState,
  EnemyActionDefinition,
} from "../../../../game/combat/combatTypes";
import type { SpellDefinition } from "../../../../game/data/spells";
import type { EffectiveSpellDefinition } from "../../../../game/progression/spellProgression";

export function combatProgress(remaining: number, total: number) {
  if (total <= 0) return 0;
  if (remaining <= total * 0.05) return 100;
  return Math.max(0, Math.min(100, (1 - remaining / total) * 100));
}

export function combatTimerLabel(remaining: number, total: number) {
  return `${Math.max(0, remaining <= total * 0.05 ? 0 : remaining).toFixed(1)}s`;
}

export function useSmoothCombatProgress(remaining: number, total: number) {
  const previousRemaining = useRef<number | null>(null);
  const completionTimeout = useRef<number | undefined>(undefined);
  const resetTimeout = useRef<number | undefined>(undefined);
  const phase = useRef<"normal" | "complete">("normal");
  const [value, setValue] = useState(() => combatProgress(remaining, total));
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const previous = previousRemaining.current;
    previousRemaining.current = remaining;
    const cycleRestarted =
      previous !== null &&
      previous > 0 &&
      remaining > previous &&
      previous <= total * 0.25;

    if (cycleRestarted) {
      if (completionTimeout.current !== undefined)
        window.clearTimeout(completionTimeout.current);
      if (resetTimeout.current !== undefined)
        window.clearTimeout(resetTimeout.current);
      phase.current = "complete";
      setIsResetting(false);
      setValue(100);
      completionTimeout.current = window.setTimeout(() => {
        phase.current = "normal";
        setIsResetting(true);
        setValue(combatProgress(remaining, total));
        resetTimeout.current = window.setTimeout(
          () => setIsResetting(false),
          0,
        );
      }, 120);
      return;
    }

    if (phase.current === "normal") setValue(combatProgress(remaining, total));
  }, [remaining, total]);

  useEffect(
    () => () => {
      if (completionTimeout.current !== undefined)
        window.clearTimeout(completionTimeout.current);
      if (resetTimeout.current !== undefined)
        window.clearTimeout(resetTimeout.current);
    },
    [],
  );

  return { value, isResetting };
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function techniqueStaminaDrain(combat: CombatState) {
  return (
    Object.entries(combat.techniques).reduce(
      (sum, [id, enabled]) =>
        sum +
        (enabled
          ? techniqueDefinitions[id as keyof typeof techniqueDefinitions]
              .staminaDrainPerSecond
          : 0),
      0,
    ) * stanceDefinitions[combat.stance].staminaDrainMultiplier
  );
}

export interface SpellUiState {
  enabled: boolean;
  status: string;
  tone: "ready" | "cooldown" | "invalid" | "inactive";
}

export function getSpellUiState(
  spell: SpellDefinition,
  cooldownRemaining: number | { cooldownRemaining: number } | undefined,
  combat: CombatState,
  selectedAction?: EnemyActionDefinition,
  effectiveSpell: EffectiveSpellDefinition = spell as EffectiveSpellDefinition,
): SpellUiState {
  if (combat.phase !== "active")
    return { enabled: false, status: "INACTIVE", tone: "inactive" };
  const cooldown =
    typeof cooldownRemaining === "number"
      ? cooldownRemaining
      : (cooldownRemaining?.cooldownRemaining ?? 0);
  if (cooldown > 0)
    return {
      enabled: false,
      status: `COOLDOWN ${cooldown.toFixed(1)}s`,
      tone: "cooldown",
    };
  if (combat.globalCooldownRemaining > 0)
    return {
      enabled: false,
      status: `GLOBAL ${combat.globalCooldownRemaining.toFixed(1)}s`,
      tone: "cooldown",
    };
  if (combat.mana < effectiveSpell.manaCost)
    return {
      enabled: false,
      status: `NEED ${effectiveSpell.manaCost} MANA`,
      tone: "invalid",
    };
  if (spell.id === "spell.disrupting-pulse" && !selectedAction?.interruptible)
    return {
      enabled: false,
      status: "NO INTERRUPTIBLE TARGET",
      tone: "invalid",
    };
  return {
    enabled: true,
    status: spell.id === "spell.disrupting-pulse" ? "INTERRUPT NOW" : "READY",
    tone: "ready",
  };
}
