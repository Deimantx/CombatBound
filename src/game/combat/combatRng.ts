import type { CombatRng } from "./combatTypes";

export type CombatRollKind = "misc" | "hit" | "crit" | "block" | "damage" | "enemyAbility" | "enemyAbilityEffect" | "lootChance" | "lootQuantity" | "effect" | "target" | "trait";

export function nextCombatRandom(rng: CombatRng, kind: CombatRollKind = "misc") {
  return rng.nextFor ? rng.nextFor(kind) : rng.next();
}
