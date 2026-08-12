import { clamp } from './combatBalance'
import type { CombatRng, DefensiveEligibility } from './combatTypes'

export function calculateHitChance(attackerAccuracy: number, defenderDefense: number) {
  return clamp(0.75 + (attackerAccuracy - defenderDefense) * 0.005, 0.15, 0.95)
}

export function calculateMitigatedDamage(rawDamage: number, defense: number, resistance = 0) {
  const mitigation = defense / (defense + 100)
  return Math.max(1, Math.round(rawDamage * (1 - mitigation) * (1 - resistance)))
}

export type DefensiveOutcome = 'miss' | 'dodge' | 'parry' | 'block' | 'hit'

export function resolveDefensiveOutcome(
  attackerAccuracy: number,
  defenderDefense: number,
  defender: { dodge: number; parry: number; block: number },
  eligibility: DefensiveEligibility,
  rng: CombatRng,
): DefensiveOutcome {
  if (rng.next() > calculateHitChance(attackerAccuracy, defenderDefense)) return 'miss'
  if (eligibility.dodgeable && rng.next() < defender.dodge) return 'dodge'
  if (eligibility.parryable && rng.next() < defender.parry) return 'parry'
  if (eligibility.blockable && rng.next() < defender.block) return 'block'
  return 'hit'
}
