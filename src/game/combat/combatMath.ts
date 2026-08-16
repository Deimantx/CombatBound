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

export function calculateArmorMitigation(armor: number, hitDamage = 100) {
  const effectiveArmor = Math.max(0, Number.isFinite(armor) ? armor : 0);
  const safeHit = Math.max(0, Number.isFinite(hitDamage) ? hitDamage : 0);
  if (effectiveArmor <= 0 || safeHit <= 0) return 0;
  return Math.min(0.9, effectiveArmor / (effectiveArmor + 5 * safeHit));
}

/** Calculates attack-local effective armour without mutating the defender. */
export function calculateEffectiveArmor(armor: number, percentPenetration = 0, flatPenetration = 0) {
  const safeArmor = Math.max(0, Number.isFinite(armor) ? armor : 0);
  return Math.max(0, safeArmor * (1 - clamp(Number.isFinite(percentPenetration) ? percentPenetration : 0, 0, 1)) - Math.max(0, Number.isFinite(flatPenetration) ? flatPenetration : 0));
}

export function calculateResistanceMultiplier(resistance: number) {
  const effectiveResistance = clamp(Number.isFinite(resistance) ? resistance : 0, combatBalance.minimumResistance, combatBalance.hardMaximumResistance);
  return 1 - effectiveResistance;
}

export function calculateMitigatedDamage(rawDamage: number, armor: number, resistance = 0, damageType: "physical" | "fire" | "cold" | "lightning" | "chaos" = "physical") {
  const safeRaw = Math.max(0, Number.isFinite(rawDamage) ? rawDamage : 0);
  const armorMultiplier = damageType === "physical" ? 1 - calculateArmorMitigation(armor, safeRaw) : 1;
  return Math.max(0, Math.round(safeRaw * armorMultiplier * calculateResistanceMultiplier(resistance)));
}

export type DefensiveOutcome = "evaded" | "block" | "hit";

type DefensiveStats = Partial<Pick<CombatStats, "attackBlockChance" | "spellBlockChance" | "maxAttackBlockChance" | "maxSpellBlockChance" | "evasionRating">>;

/** Resolves only canonical Attack evasion and eligible Block. DoTs never enter this path. */
export function resolveDefensiveOutcome(
  attackerAccuracy: number,
  defenderEvasion: number,
  defender: DefensiveStats,
  eligibility: DefensiveEligibility,
  rng: CombatRng,
  options: { sourceKind?: "attack" | "spell" | "secondary"; deliveryKind?: "hit" | "damage-over-time"; blockKind?: "attack" | "spell" } = {},
): DefensiveOutcome {
  const sourceKind = options.sourceKind ?? "attack";
  const deliveryKind = options.deliveryKind ?? "hit";
  const canEvade = sourceKind === "attack" && deliveryKind === "hit" && eligibility.canMiss !== false && eligibility.canBeEvaded !== false;
  if (canEvade && nextCombatRandom(rng, "hit") >= calculateHitChance(attackerAccuracy, defenderEvasion)) return "evaded";
  if (deliveryKind !== "damage-over-time" && eligibility.blockable) {
    const blockChance = options.blockKind === "spell" ? defender.spellBlockChance : defender.attackBlockChance;
    const blockMaximum = options.blockKind === "spell" ? defender.maxSpellBlockChance : defender.maxAttackBlockChance;
    const effectiveBlockChance = clamp(Number.isFinite(blockChance ?? 0) ? blockChance ?? 0 : 0, 0, Math.min(blockMaximum ?? combatBalance.maximumBlockChance, combatBalance.hardMaximumBlockChance));
    if (nextCombatRandom(rng, "block") < effectiveBlockChance) return "block";
  }
  return "hit";
}
