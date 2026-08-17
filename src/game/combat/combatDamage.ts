import { calculateArmorMitigation, calculateBlockedDamage, calculateEffectiveArmor, calculateResistanceMultiplier, resolveDefensiveOutcome, rollBlock, type DefensiveOutcome } from "./combatMath";
import { calculateEffectiveResistance } from "./combatStats";
import { clamp, combatBalance } from "./combatBalance";
import type { CombatRng, CombatStats, CombatantRef, DamageComponent, DamageProgressionSource, DefensiveEligibility } from "./combatTypes";
import { nextCombatRandom } from "./combatRng";
import { calculateIncomingEffectDamageMultiplier, calculateOutgoingEffectDamageMultiplier } from "./combatEffects";
import type { EffectDefinition } from "./combatEffectTypes";

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
  criticalStrikeMultiplier?: number;
  criticalStrikeChance?: number;
  armorPenetrationPercent?: number;
  armorPenetrationFlat?: number;
  resistancePenetration?: number;
  incomingDamageMultiplier?: number;
}

export interface DamageResolution {
  /** Kept as a compact compatibility name for combat telemetry; it only contains evaded/hit now. */
  outcome: DefensiveOutcome;
  hitOutcome: DefensiveOutcome;
  critical: boolean;
  blocked: boolean;
  rolledDamage: number;
  rawDamage: number;
  blockedDamage: number;
  armorMitigated: number;
  resistanceMitigated: number;
  mitigatedDamage: number;
  absorbedDamage: number;
  barrierAbsorbed: number;
  healthDamage: number;
  targetDied: boolean;
  barrierEligible: boolean;
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
  const eligibility = packet.defensiveEligibility ?? { canMiss: true, canBeEvaded: true, blockable: true };
  const outcome = resolveDefensiveOutcome(
    packet.attackerAccuracy ?? attacker.accuracyRating ?? 0,
    defender.evasionRating ?? 0,
    defender,
    { ...eligibility, canMiss: packet.guaranteedHit ? false : eligibility.canMiss },
    rng,
    { sourceKind, deliveryKind },
  );
  if (outcome === "evaded") return emptyDamageResolution(outcome, packet.ignoresBarrier !== true);

  const rolledDamage = rollDamage(packet, attacker, rng);
  const criticalChance = clamp(packet.criticalStrikeChance ?? attacker.criticalStrikeChance ?? 0, 0, combatBalance.maximumCriticalStrikeChance);
  const critical = Boolean(packet.canCrit && deliveryKind === "hit" && nextCombatRandom(rng, "crit") < criticalChance);
  const critMultiplier = Math.max(1, packet.criticalStrikeMultiplier ?? attacker.criticalStrikeMultiplier ?? 1);
  const rawDamage = Math.max(0, rolledDamage * (critical ? critMultiplier : 1));
  const blockedRoll = rollBlock(defender, eligibility, rng, deliveryKind);
  const blockedDamage = blockedRoll ? calculateBlockedDamage(rawDamage, defender.blockEffect ?? 0) : 0;
  const blocked = blockedRoll && blockedDamage > 0;
  const postBlockDamage = Math.max(0, rawDamage - blockedDamage);
  const effectiveArmor = damageType === "physical" ? calculateEffectiveArmor(defender.armour ?? 0, packet.armorPenetrationPercent, packet.armorPenetrationFlat) : 0;
  const armorMitigation = packet.ignoresArmour || packet.unmitigated || deliveryKind === "damage-over-time" || damageType !== "physical" ? 0 : calculateArmorMitigation(effectiveArmor);
  const afterArmor = postBlockDamage * (1 - armorMitigation);
  const resistanceMultiplier = packet.ignoresResistance || packet.unmitigated ? 1 : calculateResistanceMultiplier(calculateEffectiveResistance(defender, damageType, packet.resistancePenetration));
  const afterResistance = afterArmor * resistanceMultiplier;
  const afterIncomingEffects = Math.max(0, afterResistance * Math.max(0, safe(packet.incomingDamageMultiplier, 1)));
  const mitigatedDamage = Math.max(0, Math.round(afterIncomingEffects));
  return {
    outcome,
    hitOutcome: outcome,
    critical,
    blocked,
    rolledDamage,
    rawDamage,
    blockedDamage,
    armorMitigated: Math.max(0, postBlockDamage - afterArmor),
    resistanceMitigated: Math.max(0, afterArmor - afterResistance),
    mitigatedDamage,
    absorbedDamage: 0,
    barrierAbsorbed: 0,
    healthDamage: mitigatedDamage,
    targetDied: false,
    barrierEligible: packet.ignoresBarrier !== true,
  };
}

export function applyBarrierToDamage(resolution: DamageResolution, barrierAmount: number) {
  const absorbed = resolution.barrierEligible ? Math.min(Math.max(0, barrierAmount), resolution.mitigatedDamage) : 0;
  return { ...resolution, absorbedDamage: absorbed, barrierAbsorbed: absorbed, healthDamage: Math.max(0, resolution.mitigatedDamage - absorbed) };
}

function emptyDamageResolution(outcome: DefensiveOutcome, barrierEligible: boolean): DamageResolution {
  return { outcome, hitOutcome: outcome, critical: false, blocked: false, rolledDamage: 0, rawDamage: 0, blockedDamage: 0, armorMitigated: 0, resistanceMitigated: 0, mitigatedDamage: 0, absorbedDamage: 0, barrierAbsorbed: 0, healthDamage: 0, targetDied: false, barrierEligible };
}

export function componentFromAttack(damageType: DamageComponent["damageType"], multiplier = 1, canCrit = true): DamageComponent {
  return { sourceKind: "attack", deliveryKind: "hit", damageType, scaling: { sourceStat: "attackDamage", multiplier }, canCrit };
}

/**
 * Resolves every damage source through the same effect-modifier pipeline.
 * Outgoing modifiers are applied before the roll; incoming modifiers are
 * applied after armour/resistance and before barriers, for both hits and DoTs.
 */
export function resolveDamageWithEffectModifiers(
  packet: DamagePacket,
  attacker: CombatStats,
  defender: CombatStats,
  rng: CombatRng,
  sourceEffects: Parameters<typeof calculateOutgoingEffectDamageMultiplier>[0],
  targetEffects: Parameters<typeof calculateIncomingEffectDamageMultiplier>[0],
  definitions: Record<string, EffectDefinition>,
) {
  const outgoingMultiplier = calculateOutgoingEffectDamageMultiplier(sourceEffects, definitions, packet);
  const incomingMultiplier = calculateIncomingEffectDamageMultiplier(targetEffects, definitions, packet);
  return resolveDamage({
    ...packet,
    damageMultiplier: (packet.damageMultiplier ?? 1) * outgoingMultiplier,
    incomingDamageMultiplier: (packet.incomingDamageMultiplier ?? 1) * incomingMultiplier,
  }, attacker, defender, rng);
}
