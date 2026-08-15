import type { StanceId } from '../combat/combatTypes'
import { deepFreeze } from './freeze'

export const stanceDefinitions = deepFreeze<Record<StanceId, { id: StanceId; name: string; description: string; damageMultiplier: number; armourMultiplier: number; accuracyMultiplier: number; attackIntervalMultiplier: number; evasionRating: number; staminaRegenMultiplier: number; staminaDrainMultiplier: number }>>({
  high: { id: 'high', name: 'High', description: 'More attack damage, less Armour, and slower attacks.', damageMultiplier: 1.2, armourMultiplier: 0.85, accuracyMultiplier: 1, attackIntervalMultiplier: 1.1, evasionRating: 0, staminaRegenMultiplier: 1, staminaDrainMultiplier: 1.1 },
  mid: { id: 'mid', name: 'Mid', description: 'Balanced combat stance.', damageMultiplier: 1, armourMultiplier: 1, accuracyMultiplier: 1, attackIntervalMultiplier: 1, evasionRating: 0, staminaRegenMultiplier: 1, staminaDrainMultiplier: 1 },
  low: { id: 'low', name: 'Low', description: 'Less attack damage, higher Accuracy and Evasion Rating, faster attacks, and better Stamina regeneration.', damageMultiplier: 0.85, armourMultiplier: 1, accuracyMultiplier: 1.15, attackIntervalMultiplier: 0.9, evasionRating: 10, staminaRegenMultiplier: 1.15, staminaDrainMultiplier: 1 },
})
