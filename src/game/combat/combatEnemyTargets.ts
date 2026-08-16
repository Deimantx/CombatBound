import { nextCombatRandom } from "./combatRng";
import type { CombatContext, CombatState, CombatantRef, EnemyActionDefinition, EnemyCombatInstance } from "./combatTypes";

/** Resolves the target set for one authored enemy action. */
export function enemyActionTargets(action: EnemyActionDefinition, current: EnemyCombatInstance, combat: CombatState, rng: CombatContext["rng"]): CombatantRef[] {
  if (action.targetMode === "self") return [{ kind: "enemy", instanceId: current.instanceId }];
  const allies = combat.enemies.filter((enemy) => !enemy.defeated && enemy.instanceId !== current.instanceId);
  if (action.targetMode === "lowest-health-ally") {
    const target = [...allies].sort((a, b) => a.currentHealth / a.maxHealth - b.currentHealth / b.maxHealth)[0];
    return target ? [{ kind: "enemy", instanceId: target.instanceId }] : [];
  }
  if (action.targetMode === "random-living-ally") {
    const target = allies[Math.floor(Math.max(0, Math.min(0.999999, nextCombatRandom(rng, "target"))) * allies.length)];
    return target ? [{ kind: "enemy", instanceId: target.instanceId }] : [];
  }
  if (action.targetMode === "all-living-allies") return allies.map((enemy) => ({ kind: "enemy", instanceId: enemy.instanceId }));
  return [{ kind: "player" }];
}
