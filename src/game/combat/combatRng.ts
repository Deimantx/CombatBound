import type { CombatRng } from "./combatTypes";

export type CombatRollKind = "misc" | "hit" | "crit" | "dodge" | "parry" | "block" | "damage" | "enemyAction" | "groupSize" | "groupEnemy" | "lootChance" | "lootQuantity" | "effect" | "target";

export function nextCombatRandom(rng: CombatRng, kind: CombatRollKind = "misc") {
  return rng.nextFor ? rng.nextFor(kind) : rng.next();
}

export function createSeededCombatRng(seed: number): CombatRng {
  let state = Number.isFinite(seed) ? Math.floor(seed) : 0;
  const next = () => {
    state = (state + 0x6D2B79F5) | 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  return { next, nextFor: () => next() };
}
