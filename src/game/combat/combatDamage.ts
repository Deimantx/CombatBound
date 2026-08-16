import { clamp, combatBalance } from "./combatBalance";
import { calculateArmorMitigation, calculateEffectiveArmor, calculateResistanceMultiplier, resolveDefensiveOutcome, type DefensiveOutcome } from "./combatMath";
import { calculateEffectiveResistance } from "./combatStats";
import type { CombatRng, CombatStats, CombatantRef, DamageComponent, DamageProgressionSource, DefensiveEligibility } from "./combatTypes";
import { nextCombatRandom } from "./combatRng";

export interface DamagePacket extends DamageComponent {
  source: CombatantRef;
  target: CombatantRef;
  baseDamage?: number;
  attackerAccuracy?: number;
  defensiveEligibility?: DefensiveEligibility;
  guaranteedHit?: boolean;
  progressionSource?: DamageProgressionSource;
  sourceActionId?: string;
  weaponSkillId?: string;
  cleave?: { maxSecondaryTargets: number; primaryResolvedDamageFraction: number };
  damageMultiplier?: number;
  criticalDamageMultiplier?: number;
  criticalBaseChance?: number;
  criticalChanceBonus?: number;
  armorPenetrationPercent?: number;
  armorPenetrationFlat?: number;
  spellSuppressionEligible?: boolean;
  resistancePenetration?: number;
  exposure?: number;
}

export interface DamageResolution {
  outcome: DefensiveOutcome;
  critical: boolean;
  suppressed: boolean;
  rawDamage: number;
  rolledDamage: number;
  armorMitigated: number;
  resistanceMitigated: number;
  physicalReductionMitigated: number;
  blockedDamage: number;
  suppressionPrevented: number;
  mitigatedDamage: number;
  absorbedDamage: number;
  barrierAbsorbed: number;
  healthDamage: number;
  targetDied: boolean;
}

const safe = (value: number | undefined, fallback = 0) => Number.isFinite(value) ? value as number : fallback;

export function rollDamage(component: DamageComponent & { baseDamage?: number }, attacker: CombatStats, rng: CombatRng) {
  const multiplier = Math.max(0, safe((component as DamagePacket).damageMultiplier, 1));
  const sourceMultiplier = safe(component.scaling?.multiplier, 0);
  const sourceMin = component.scaling?.sourceStat === "attackDamage" ? attacker.attackDamageMin ?? attacker.attackDamage : 0;
  const sourceMax = component.scaling?.sourceStat === "attackDamage" ? attacker.attackDamageMax ?? attacker.attackDamage : 0;
  const flatBase = safe(component.baseDamage, 0) + safe(component.flatDamage, 0);
  const hasAttackSource = component.scaling?.sourceStat === "attackDamage";
  const fallbackBase = flatBase + (hasAttackSource ? attacker.attackDamage * sourceMultiplier : 0);
  const authoredMinimum = component.minDamage ?? (hasAttackSource ? flatBase + sourceMin * sourceMultiplier : fallbackBase);
  const authoredMaximum = component.maxDamage ?? (hasAttackSource ? flatBase + sourceMax * sourceMultiplier : authoredMinimum);
  const minimum = Math.max(0, authoredMinimum) * Math.max(0, component.minMultiplier ?? 1) * multiplier;
  const maximum = Math.max(0, authoredMaximum) * Math.max(0, component.maxMultiplier ?? 1) * multiplier;
  const low = Math.min(minimum, maximum);
  return Math.max(0, low + (Math.max(minimum, maximum) - low) * clamp(nextCombatRandom(rng, "damage"), 0, 1));
}

export function resolveDamage(packet: DamagePacket, attacker: CombatStats, defender: CombatStats, rng: CombatRng): DamageResolution {
  const sourceKind = packet.sourceKind ?? (packet.progressionSource?.type === "spell" ? "spell" : "attack");
  const deliveryKind = packet.deliveryKind ?? "hit";
  const damageType = packet.damageType;
  const effectiveDefender = {
    ...defender,
    armour: damageType === "physical" ? calculateEffectiveArmor(defender.armour ?? 0, packet.armorPenetrationPercent, packet.armorPenetrationFlat) : defender.armour ?? 0,
    attackBlockChance: defender.attackBlockChance,
    spellBlockChance: defender.spellBlockChance,
  };
  const eligibility = packet.defensiveEligibility ?? { canMiss: true, canBeEvaded: true, blockable: true };
  const outcome = packet.guaranteedHit
    ? resolveDefensiveOutcome(attacker.accuracyRating ?? 0, effectiveDefender.evasionRating ?? 0, effectiveDefender, { ...eligibility, canMiss: false }, rng, { sourceKind, deliveryKind, blockKind: sourceKind === "spell" ? "spell" : "attack" })
    : resolveDefensiveOutcome(packet.attackerAccuracy ?? attacker.accuracyRating ?? 0, effectiveDefender.evasionRating ?? 0, effectiveDefender, eligibility, rng, { sourceKind, deliveryKind, blockKind: sourceKind === "spell" ? "spell" : "attack" });
  if (outcome === "evaded" || outcome === "block") return emptyDamageResolution(outcome);

  const rolledDamage = rollDamage(packet, attacker, rng);
  const baseCritChance = (packet.criticalBaseChance ?? attacker.baseCritChance ?? 0) + (attacker.additionalBaseCritChance ?? 0);
  const criticalChance = clamp(baseCritChance * (1 + (attacker.increasedCritChance ?? 0)) * (1 + (attacker.moreCritChance ?? 0)) + (packet.criticalChanceBonus ?? 0), 0, combatBalance.maxCritChance);
  const critical = Boolean(packet.canCrit && nextCombatRandom(rng, "crit") < criticalChance);
  const critMultiplier = Math.max(1, (attacker.criticalStrikeMultiplier ?? 1) * (packet.criticalDamageMultiplier ?? 1));
  const reducedExtraCrit = clamp(defender.reducedExtraDamageTakenFromCriticalStrikes ?? 0, 0, 1);
  const effectiveCritMultiplier = 1 + Math.max(0, critMultiplier - 1) * (1 - reducedExtraCrit);
  const rawDamage = Math.max(0, rolledDamage * (critical ? effectiveCritMultiplier : 1));
  const armorMitigation = packet.ignoresArmour || packet.unmitigated || deliveryKind === "damage-over-time" || damageType !== "physical" ? 0 : calculateArmorMitigation(effectiveDefender.armour, rawDamage);
  const additionalPhysicalReduction = damageType === "physical" && !packet.unmitigated ? clamp(defender.additionalPhysicalDamageReduction ?? 0, 0, defender.maxPhysicalDamageReduction ?? 0.9) : 0;
  const totalPhysicalReduction = damageType === "physical" && !packet.unmitigated ? Math.min(defender.maxPhysicalDamageReduction ?? 0.9, armorMitigation + additionalPhysicalReduction) : 0;
  const afterPhysicalReduction = rawDamage * (1 - totalPhysicalReduction);
  const resistanceMultiplier = packet.ignoresResistance || packet.unmitigated ? 1 : calculateResistanceMultiplier(calculateEffectiveResistance(defender, damageType, packet.resistancePenetration, packet.exposure));
  const afterResistance = afterPhysicalReduction * resistanceMultiplier;
  const eligibleForSuppression = sourceKind === "spell" && deliveryKind === "hit" && packet.spellSuppressionEligible !== false && !packet.unmitigated;
  const suppressed = eligibleForSuppression && nextCombatRandom(rng, "misc") < clamp(defender.spellSuppressionChance ?? 0, 0, 1);
  const suppressionPrevented = suppressed ? afterResistance * clamp(defender.suppressedSpellDamagePrevented ?? combatBalance.suppressedSpellDamagePrevented, 0, 1) : 0;
  const damageTakenMultiplier = Math.max(0, 1 + (defender.increasedDamageTaken ?? 0));
  const afterDamageTaken = Math.max(0, afterResistance - suppressionPrevented) * damageTakenMultiplier;
  const mitigatedDamage = Math.max(0, Math.round(afterDamageTaken));
  return { outcome, critical, suppressed, rawDamage, rolledDamage, armorMitigated: Math.max(0, rawDamage * armorMitigation), physicalReductionMitigated: Math.max(0, rawDamage * Math.max(0, totalPhysicalReduction - armorMitigation)), resistanceMitigated: Math.max(0, afterPhysicalReduction - afterResistance), blockedDamage: 0, suppressionPrevented: Math.max(0, Math.round(suppressionPrevented)), mitigatedDamage, absorbedDamage: 0, barrierAbsorbed: 0, healthDamage: mitigatedDamage, targetDied: false };
}

export function applyBarrierToDamage(resolution: DamageResolution, barrierAmount: number) {
  const absorbed = Math.min(Math.max(0, barrierAmount), resolution.mitigatedDamage);
  return { ...resolution, absorbedDamage: absorbed, barrierAbsorbed: absorbed, healthDamage: Math.max(0, resolution.mitigatedDamage - absorbed) };
}

function emptyDamageResolution(outcome: DefensiveOutcome): DamageResolution {
  return { outcome, critical: false, suppressed: false, rawDamage: 0, rolledDamage: 0, armorMitigated: 0, physicalReductionMitigated: 0, resistanceMitigated: 0, blockedDamage: outcome === "block" ? 0 : 0, suppressionPrevented: 0, mitigatedDamage: 0, absorbedDamage: 0, barrierAbsorbed: 0, healthDamage: 0, targetDied: false };
}

export function componentFromAttack(damageType: DamageComponent["damageType"], multiplier = 1, canCrit = true): DamageComponent {
  return { sourceKind: "attack", deliveryKind: "hit", damageType, scaling: { sourceStat: "attackDamage", multiplier }, canCrit };
}
