import type { TechniqueId } from '../combat/combatTypes'
import { combatBalance } from '../combat/combatBalance'
import { deepFreeze } from './freeze'

export const techniqueDefinitions = deepFreeze<Record<TechniqueId, { id: TechniqueId; name: string; description: string; staminaDrainPerSecond: number; evasionRating: number; accuracyRating: number }>>({
  'careful-positioning': { id: 'careful-positioning', name: 'Careful Positioning', description: '+8 Evasion Rating.', staminaDrainPerSecond: combatBalance.baseStaminaDrain, evasionRating: 8, accuracyRating: 0 },
  'heightened-reflexes': { id: 'heightened-reflexes', name: 'Heightened Reflexes', description: '+10 Accuracy Rating.', staminaDrainPerSecond: combatBalance.baseStaminaDrain, evasionRating: 0, accuracyRating: 10 },
})
