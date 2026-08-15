import { clamp, combatBalance } from "./combatBalance";
import type { CombatRng, DefensiveEligibility } from "./combatTypes";
import type { CombatStats } from "./combatTypes";
import { getResistance } from "./combatStats";
import { nextCombatRandom } from "./combatRng";

export function calculateHitChance(
  attackerAccuracy: number,
  defenderEvasion: number,
) {
  const accuracy = Number.isFinite(attackerAccuracy)
    ? Math.max(0, attackerAccuracy)
    : 0;
  const evasion = Number.isFinite(defenderEvasion)
    ? Math.max(0, defenderEvasion)
    : 0;
  const total = Math.max(1, accuracy + evasion);
  const relative = (accuracy - evasion) / total;
  const chance =
    relative >= 0
      ? combatBalance.baseHitChance +
        (combatBalance.maxHitChance - combatBalance.baseHitChance) * relative
      : combatBalance.baseHitChance +
        (combatBalance.baseHitChance - combatBalance.minHitChance) * relative;
  return clamp(chance, combatBalance.minHitChance, combatBalance.maxHitChance);
}

export type AvoidanceKind = "dodge" | "parry" | "block";

export function calculateEffectiveAvoidanceChance(
  rawChance: number,
  kind: AvoidanceKind,
) {
  const raw = Math.max(0, Number.isFinite(rawChance) ? rawChance : 0);
  const soft =
    kind === "block"
      ? combatBalance.blockSoftCap
      : kind === "parry"
        ? combatBalance.parrySoftCap
        : combatBalance.dodgeSoftCap;
  const hard =
    kind === "block"
      ? combatBalance.blockHardCap
      : kind === "parry"
        ? combatBalance.parryHardCap
        : combatBalance.dodgeHardCap;
  return clamp(raw <= soft ? raw : soft + (raw - soft) * 0.5, 0, hard);
}

export function calculateArmorMitigation(armor: number) {
  const effectiveArmor = Math.max(0, Number.isFinite(armor) ? armor : 0);
  return effectiveArmor / (effectiveArmor + combatBalance.armorConstant);
}

/** Calculates attack-local effective armor without mutating the defender. */
export function calculateEffectiveArmor(
  armor: number,
  percentPenetration = 0,
  flatPenetration = 0,
) {
  const safeArmor = Math.max(0, Number.isFinite(armor) ? armor : 0);
  return Math.max(
    0,
    safeArmor * (1 - clamp(percentPenetration, 0, 1)) -
      Math.max(0, Number.isFinite(flatPenetration) ? flatPenetration : 0),
  );
}

export function calculateResistanceMultiplier(resistance: number) {
  const effectiveResistance = clamp(
    Number.isFinite(resistance) ? resistance : 0,
    combatBalance.minResistance,
    combatBalance.maxResistance,
  );
  return 1 - effectiveResistance;
}

export function calculateMitigatedDamage(
  rawDamage: number,
  armor: number,
  resistance = 0,
  damageType:
    | "physical"
    | "fire"
    | "earth"
    | "air"
    | "nature"
    | "mystic"
    | "true" = "physical",
) {
  const safeRaw = Math.max(0, Number.isFinite(rawDamage) ? rawDamage : 0);
  const armorMultiplier =
    damageType === "physical" ? 1 - calculateArmorMitigation(armor) : 1;
  const resistanceMultiplier =
    damageType === "true" ? 1 : calculateResistanceMultiplier(resistance);
  return Math.max(
    0,
    Math.round(safeRaw * armorMultiplier * resistanceMultiplier),
  );
}

export type DefensiveOutcome = "miss" | "dodge" | "parry" | "block" | "hit";

type DefensiveStats = Partial<
  Pick<CombatStats, "evasion" | "dodgeChance" | "parryChance" | "blockChance">
> & {
  /** Legacy aliases are accepted at this boundary while callers migrate. */
  dodge?: number;
  parry?: number;
  block?: number;
};

export function resolveDefensiveOutcome(
  attackerAccuracy: number,
  defenderEvasion: number,
  defender: DefensiveStats,
  eligibility: DefensiveEligibility,
  rng: CombatRng,
): DefensiveOutcome {
  const canMiss = eligibility.canMiss !== false;
  const dodgeChance = defender.dodgeChance ?? defender.dodge ?? 0;
  const parryChance = defender.parryChance ?? defender.parry ?? 0;
  const blockChance = defender.blockChance ?? defender.block ?? 0;
  if (
    canMiss &&
    nextCombatRandom(rng, "hit") >= calculateHitChance(attackerAccuracy, defenderEvasion)
  )
    return "miss";
  if (
    eligibility.dodgeable &&
    nextCombatRandom(rng, "dodge") < calculateEffectiveAvoidanceChance(dodgeChance, "dodge")
  )
    return "dodge";
  if (
    eligibility.parryable &&
    nextCombatRandom(rng, "parry") < calculateEffectiveAvoidanceChance(parryChance, "parry")
  )
    return "parry";
  if (
    eligibility.blockable &&
    nextCombatRandom(rng, "block") < calculateEffectiveAvoidanceChance(blockChance, "block")
  )
    return "block";
  return "hit";
}
