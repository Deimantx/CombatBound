import type { StanceId } from '../combat/combatTypes'
import { deepFreeze } from './freeze'

export const stanceDefinitions = deepFreeze<Record<StanceId, { id: StanceId; name: string; description: string; damage: number; armor: number; defense: number; accuracy: number; attackIntervalMultiplier: number; attackSpeed: number; dodge: number; parry: number; staminaRegenMultiplier: number; staminaDrainMultiplier: number }>>({
  high: { id: 'high', name: 'High', description: 'Aggressive damage, slower attacks, and lower armor.', damage: 1.2, armor: 0.85, defense: 0.85, accuracy: 1, attackIntervalMultiplier: 1.1, attackSpeed: 1.1, dodge: 0, parry: 0, staminaRegenMultiplier: 1, staminaDrainMultiplier: 1.1 },
  mid: { id: 'mid', name: 'Mid', description: 'Balanced combat stance.', damage: 1, armor: 1, defense: 1, accuracy: 1, attackIntervalMultiplier: 1, attackSpeed: 1, dodge: 0, parry: 0, staminaRegenMultiplier: 1, staminaDrainMultiplier: 1 },
  low: { id: 'low', name: 'Low', description: 'Accurate, defensive, resource-efficient, and faster.', damage: 0.85, armor: 1, defense: 1, accuracy: 1.15, attackIntervalMultiplier: 0.9, attackSpeed: 0.9, dodge: 0.1, parry: 0.1, staminaRegenMultiplier: 1.15, staminaDrainMultiplier: 1 },
})
