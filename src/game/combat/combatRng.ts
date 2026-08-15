import type { CombatRng } from "./combatTypes";

export type CombatRollKind = "misc" | "hit" | "crit" | "block" | "damage" | "enemyAction" | "groupSize" | "groupEnemy" | "lootChance" | "lootQuantity" | "effect" | "target";

export function nextCombatRandom(rng: CombatRng, kind: CombatRollKind = "misc") {
  return rng.nextFor ? rng.nextFor(kind) : rng.next();
}
