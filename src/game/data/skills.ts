import type { CombatSkillId } from '../progression/progressionTypes'
import { deepFreeze } from './freeze'

export interface CombatSkillDefinition {
  id: CombatSkillId
  name: string
  icon: string
  shortDescription: string
  fullDescription: string
  currentEffect: string
}

export const skillDefinitions = deepFreeze<Record<CombatSkillId, CombatSkillDefinition>>({
  swordsmanship: { id: 'swordsmanship', name: 'Swordsmanship', icon: 'sword', shortDescription: 'Training for weapon accuracy and attack technique.', fullDescription: 'Swordsmanship is the combat progression skill for weapon handling.', currentEffect: '+1 Accuracy per skill level.', },
  defense: { id: 'defense', name: 'Defense', icon: 'shield', shortDescription: 'Training for armor and defensive fundamentals.', fullDescription: 'Defense improves the Hunter’s armor as the skill grows.', currentEffect: '+1 Armor per skill level.', },
  stances: { id: 'stances', name: 'Stances', icon: 'target', shortDescription: 'Progression for High, Mid, and Low combat stances.', fullDescription: 'Stances progression tracks experience with stance choices. The current implementation does not add a direct stat bonus from Stances skill level.', currentEffect: 'No direct stat scaling from skill level yet; stance choice applies its own current modifiers.', },
  magic: { id: 'magic', name: 'Magic', icon: 'spark', shortDescription: 'Progression for combat spell use.', fullDescription: 'Magic progression tracks spell experience. The current implementation does not add direct spell scaling from Magic skill level.', currentEffect: 'No direct spell scaling from skill level yet.', },
})

export const skillById = skillDefinitions
