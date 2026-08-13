import type { TechniqueId } from '../combat/combatTypes'
import { combatBalance } from '../combat/combatBalance'
import { deepFreeze } from './freeze'

export const techniqueDefinitions = deepFreeze<Record<TechniqueId, { id: TechniqueId; name: string; description: string; staminaDrainPerSecond: number; dodge: number; parry: number; accuracy: number }>>({
  'careful-positioning': { id: 'careful-positioning', name: 'Careful Positioning', description: '+8% Dodge and +8% Parry.', staminaDrainPerSecond: combatBalance.baseStaminaDrain, dodge: 0.08, parry: 0.08, accuracy: 0 },
  'heightened-reflexes': { id: 'heightened-reflexes', name: 'Heightened Reflexes', description: '+10 Accuracy.', staminaDrainPerSecond: combatBalance.baseStaminaDrain, dodge: 0, parry: 0, accuracy: 10 },
})
