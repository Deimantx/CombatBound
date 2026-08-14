import { clamp, combatBalance } from './combatBalance'
import { calculateArmorMitigation, calculateEffectiveArmor, calculateResistanceMultiplier, resolveDefensiveOutcome, type DefensiveOutcome } from './combatMath'
import { getResistance } from './combatStats'
import type { CombatRng, CombatStats, CombatantRef, DamageComponent, DamageType, DefensiveEligibility, DamageProgressionSource } from './combatTypes'

export interface DamagePacket extends DamageComponent {
  source: CombatantRef
  target: CombatantRef
  baseDamage?: number
  attackerAccuracy?: number
  defensiveEligibility?: DefensiveEligibility
  guaranteedHit?: boolean
  progressionSource?: DamageProgressionSource
  sourceActionId?: string
  /** Stable weapon-skill identity used for skill-specific resolution policy. */
  weaponSkillId?: string
  /** Derived cleave is resolved from the primary HP result, not rolled again. */
  cleave?: {
    maxSecondaryTargets: number
    primaryResolvedDamageFraction: number
  }
  damageMultiplier?: number
  criticalDamageMultiplier?: number
  criticalChanceBonus?: number
  /** Attack-local penetration. These values never mutate the stored defender. */
  armorPenetrationPercent?: number
  armorPenetrationFlat?: number
  blockChancePenetration?: number
  blockPowerPenetration?: number
}

export interface DamageResolution {
  outcome: DefensiveOutcome
  critical: boolean
  rawDamage: number
  rolledDamage: number
  armorMitigated: number
  resistanceMitigated: number
  blockedDamage: number
  mitigatedDamage: number
  absorbedDamage: number
  barrierAbsorbed: number
  healthDamage: number
  targetDied: boolean
}

const safe = (value: number | undefined, fallback = 0) => Number.isFinite(value) ? value as number : fallback

export function rollDamage(component: DamageComponent & { baseDamage?: number }, attacker: CombatStats, rng: CombatRng) {
  const multiplier = Math.max(0, safe((component as DamagePacket).damageMultiplier, 1))
  const base = Math.max(0, (safe(component.baseDamage, 0) + safe(component.flatDamage, 0) + (component.scaling?.sourceStat === 'attackPower' ? attacker.attackPower * component.scaling.multiplier : 0)) * multiplier)
  const minimum = component.minDamage !== undefined ? component.minDamage * multiplier : base * (component.minMultiplier ?? combatBalance.baseDamageVarianceMin)
  const maximum = component.maxDamage !== undefined ? component.maxDamage * multiplier : base * (component.maxMultiplier ?? combatBalance.baseDamageVarianceMax)
  const low = Math.min(minimum, maximum)
  const high = Math.max(minimum, maximum)
  return Math.max(0, low + (high - low) * clamp(rng.next(), 0, 1))
}

export function resolveDamage(packet: DamagePacket, attacker: CombatStats, defender: CombatStats, rng: CombatRng): DamageResolution {
  const effectiveDefender = {
    ...defender,
    armor: packet.damageType === 'physical' ? calculateEffectiveArmor(defender.armor, packet.armorPenetrationPercent, packet.armorPenetrationFlat) : defender.armor,
    blockChance: Math.max(0, defender.blockChance - Math.max(0, packet.blockChancePenetration ?? 0)),
    blockPower: Math.max(0, defender.blockPower - Math.max(0, packet.blockPowerPenetration ?? 0)),
  }
  const eligibility = packet.defensiveEligibility ?? { canMiss: true, dodgeable: true, parryable: true, blockable: true }
  const outcome = packet.guaranteedHit || eligibility.canMiss === false
    ? resolveDefensiveOutcome(attacker.accuracy, effectiveDefender.evasion, effectiveDefender, { ...eligibility, canMiss: false }, rng)
    : resolveDefensiveOutcome(packet.attackerAccuracy ?? attacker.accuracy, effectiveDefender.evasion, effectiveDefender, eligibility, rng)
  if (outcome === 'miss' || outcome === 'dodge' || outcome === 'parry') return emptyDamageResolution(outcome)

  const rolledDamage = rollDamage(packet, attacker, rng)
  const critical = packet.canCrit && rng.next() < clamp(attacker.critChance + (packet.criticalChanceBonus ?? 0), 0, combatBalance.maxCritChance)
  const rawDamage = Math.max(0, rolledDamage * (critical ? Math.max(1, attacker.critDamage * (packet.criticalDamageMultiplier ?? 1)) : 1))
  const armorMitigation = packet.ignoresArmor || packet.damageType !== 'physical' ? 0 : calculateArmorMitigation(effectiveDefender.armor)
  const afterArmor = rawDamage * (1 - armorMitigation)
  const resistanceMultiplier = packet.ignoresResistance || packet.damageType === 'true' ? 1 : calculateResistanceMultiplier(getResistance(defender, packet.damageType))
  const afterResistance = afterArmor * resistanceMultiplier
  const blockedDamage = outcome === 'block' ? afterResistance * clamp(effectiveDefender.blockPower, 0, 0.95) : 0
  const mitigatedDamage = Math.max(0, Math.round(afterResistance - blockedDamage))
  return { outcome, critical, rawDamage, rolledDamage, armorMitigated: Math.max(0, rawDamage - afterArmor), resistanceMitigated: Math.max(0, afterArmor - afterResistance), blockedDamage: Math.max(0, Math.round(blockedDamage)), mitigatedDamage, absorbedDamage: 0, barrierAbsorbed: 0, healthDamage: mitigatedDamage, targetDied: false }
}

export function applyBarrierToDamage(resolution: DamageResolution, barrierAmount: number) {
  const absorbed = Math.min(Math.max(0, barrierAmount), resolution.mitigatedDamage)
  return { ...resolution, absorbedDamage: absorbed, barrierAbsorbed: absorbed, healthDamage: Math.max(0, resolution.mitigatedDamage - absorbed) }
}

function emptyDamageResolution(outcome: DefensiveOutcome): DamageResolution {
  return { outcome, critical: false, rawDamage: 0, rolledDamage: 0, armorMitigated: 0, resistanceMitigated: 0, blockedDamage: 0, mitigatedDamage: 0, absorbedDamage: 0, barrierAbsorbed: 0, healthDamage: 0, targetDied: false }
}

export function componentFromAttack(damageType: DamageType, multiplier = 1, canCrit = true): DamageComponent {
  return { damageType, scaling: { sourceStat: 'attackPower', multiplier }, minMultiplier: combatBalance.baseDamageVarianceMin, maxMultiplier: combatBalance.baseDamageVarianceMax, canCrit }
}
