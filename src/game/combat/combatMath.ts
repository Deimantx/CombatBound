import { clamp, combatBalance } from "./combatBalance";
import type { CombatRng, DefensiveEligibility } from "./combatTypes";
import type { CombatStats } from "./combatTypes";
import { nextCombatRandom } from "./combatRng";

/** Path of Exile's accuracy/evasion chance to hit formula. */
export function calculateHitChance(attackerAccuracy: number, defenderEvasion: number) {
  const accuracy = Number.isFinite(attackerAccuracy) ? Math.max(0, attackerAccuracy) : 0;
  const evasion = Number.isFinite(defenderEvasion) ? Math.max(0, defenderEvasion) : 0;
  if (accuracy <= 0) return combatBalance.minHitChance;
  if (evasion <= 0) return combatBalance.maxHitChance;
  const uncapped = (1.25 * accuracy) / (accuracy + Math.pow(evasion / 5, 0.9));
  return clamp(Number.isFinite(uncapped) ? uncapped : combatBalance.minHitChance, combatBalance.minHitChance, combatBalance.maxHitChance);
}

export function calculateArmorMitigation(armor: number) {
  const effectiveArmor = Math.max(0, Number.isFinite(armor) ? armor : 0);
  if (effectiveArmor <= 0) return 0;
  return clamp(effectiveArmor / (effectiveArmor + combatBalance.armourMitigationConstant), 0, combatBalance.maxArmourPhysicalDamageReduction);
}

/** Calculates attack-local effective armour without mutating the defender. */
export function calculateEffectiveArmor(armor: number, percentPenetration = 0, flatPenetration = 0) {
  const safeArmor = Math.max(0, Number.isFinite(armor) ? armor : 0);
  return Math.max(0, safeArmor * (1 - clamp(Number.isFinite(percentPenetration) ? percentPenetration : 0, 0, 1)) - Math.max(0, Number.isFinite(flatPenetration) ? flatPenetration : 0));
}

export function calculateResistanceMultiplier(resistance: number) {
  const effectiveResistance = clamp(Number.isFinite(resistance) ? resistance : 0, combatBalance.minimumResistance, combatBalance.defaultMaximumResistance);
  return 1 - effectiveResistance;
}

export function calculateMitigatedDamage(rawDamage: number, armor: number, resistance = 0, damageType: "physical" | "fire" | "cold" | "lightning" | "chaos" = "physical") {
  const safeRaw = Math.max(0, Number.isFinite(rawDamage) ? rawDamage : 0);
  const armorMultiplier = damageType === "physical" ? 1 - calculateArmorMitigation(armor) : 1;
  return Math.max(0, Math.round(safeRaw * armorMultiplier * calculateResistanceMultiplier(resistance)));
}

export type DefensiveOutcome = "evaded" | "hit";

type DefensiveStats = Partial<Pick<CombatStats, "blockChance" | "evasionRating">>;

/** Resolves only canonical Attack evasion. Block is rolled separately. */
export function resolveDefensiveOutcome(
  attackerAccuracy: number,
  defenderEvasion: number,
  defender: DefensiveStats,
  eligibility: DefensiveEligibility,
  rng: CombatRng,
  options: { sourceKind?: "attack" | "spell" | "secondary"; deliveryKind?: "hit" | "damage-over-time" } = {},
): DefensiveOutcome {
  const sourceKind = options.sourceKind ?? "attack";
  const deliveryKind = options.deliveryKind ?? "hit";
  const canEvade = sourceKind === "attack" && deliveryKind === "hit" && eligibility.canMiss !== false && eligibility.canBeEvaded !== false;
  if (canEvade && nextCombatRandom(rng, "hit") >= calculateHitChance(attackerAccuracy, defenderEvasion)) return "evaded";
  return "hit";
}

export function rollBlock(defender: Pick<CombatStats, "blockChance" | "blockEffect">, eligibility: DefensiveEligibility, rng: CombatRng, deliveryKind: "hit" | "damage-over-time" = "hit") {
  if (deliveryKind === "damage-over-time" || eligibility.blockable === false) return false;
  const chance = clamp(Number.isFinite(defender.blockChance ?? 0) ? defender.blockChance ?? 0 : 0, 0, combatBalance.maximumBlockChance);
  const effect = clamp(Number.isFinite(defender.blockEffect ?? 0) ? defender.blockEffect ?? 0 : 0, 0, combatBalance.maximumBlockEffect);
  return chance > 0 && effect > 0 && nextCombatRandom(rng, "block") < chance;
}

export function calculateBlockedDamage(damage: number, blockEffect: number) {
  const safeDamage = Math.max(0, Number.isFinite(damage) ? damage : 0);
  const effect = clamp(Number.isFinite(blockEffect) ? blockEffect : 0, 0, combatBalance.maximumBlockEffect);
  return safeDamage * effect;
}
