import type { StanceId } from '../combat/combatTypes'
import { deepFreeze } from './freeze'

export const stanceDefinitions = deepFreeze<Record<StanceId, { id: StanceId; name: string; description: string; damage: number; defense: number; accuracy: number; attackSpeed: number; dodge: number; parry: number; energyRegen: number; adrenaline: number; techniqueDrain: number }>>({
  high: { id: 'high', name: 'High', description: 'Aggressive damage and faster attacks.', damage: 1.2, defense: 0.85, accuracy: 1, attackSpeed: 0.9, dodge: 0, parry: 0, energyRegen: 1, adrenaline: 0.9, techniqueDrain: 1.1 },
  mid: { id: 'mid', name: 'Mid', description: 'Balanced combat stance.', damage: 1, defense: 1, accuracy: 1, attackSpeed: 1, dodge: 0, parry: 0, energyRegen: 1, adrenaline: 1, techniqueDrain: 1 },
  low: { id: 'low', name: 'Low', description: 'Accurate, defensive, and resource-efficient.', damage: 0.85, defense: 1, accuracy: 1.15, attackSpeed: 1.1, dodge: 0.1, parry: 0.1, energyRegen: 1.15, adrenaline: 1.15, techniqueDrain: 1 },
})
