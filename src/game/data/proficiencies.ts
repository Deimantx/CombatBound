import { deepFreeze } from './freeze'
import { MAX_PROFICIENCY_LEVEL } from '../progression/progressionBalance'
import { proficiencyPerkDefinitions } from './proficiencyPerks'
import type { CombatProficiencyId, ProficiencyDefinition } from '../progression/progressionTypes'

const authoredPerkIds = (proficiencyId: CombatProficiencyId) => proficiencyPerkDefinitions.filter((perk) => perk.proficiencyId === proficiencyId).map((perk) => perk.id)

const baseDefinitions: ProficiencyDefinition[] = [
  { id: 'one-handed-sword', name: 'One-Handed Sword', category: 'melee', description: 'Balanced, accurate swordplay with critical, parry, and Bleed potential.', icon: 'sword', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('one-handed-sword') },
  { id: 'one-handed-axe', name: 'One-Handed Axe', category: 'melee', description: 'Aggressive direct damage with Bleed and Armor-breaking potential.', icon: 'axe', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('one-handed-axe') },
  { id: 'one-handed-mace', name: 'One-Handed Mace', category: 'melee', description: 'Heavy impact and Armor-crushing pressure against armored targets.', icon: 'hammer', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('one-handed-mace') },
  { id: 'dagger', name: 'Dagger', category: 'melee', description: 'Fast precision strikes with Critical Hit and Bleed potential.', icon: 'sword', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('dagger') },
  { id: 'two-handed-sword', name: 'Two-Handed Sword', category: 'melee', description: 'Deliberate heavy hits with strong Critical Hit and future cleave potential.', icon: 'sword', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('two-handed-sword') },
  { id: 'two-handed-axe', name: 'Two-Handed Axe', category: 'melee', description: 'Very high raw damage with Bleed and execution potential.', icon: 'axe', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('two-handed-axe') },
  { id: 'two-handed-hammer', name: 'Two-Handed Hammer', category: 'melee', description: 'Slow, powerful impacts designed for Armor breaking and future Stagger.', icon: 'hammer', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('two-handed-hammer') },
  { id: 'spear', name: 'Spear', category: 'melee', description: 'Accurate precision attacks with anti-elite and critical-window potential.', icon: 'spear', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('spear') },
  { id: 'shortbow', name: 'Shortbow', category: 'ranged', description: 'Fast ranged attacks with consistent pressure and Critical Hit synergy.', icon: 'bow', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('shortbow') },
  { id: 'longbow', name: 'Longbow', category: 'ranged', description: 'Slow deliberate shots with high Accuracy and single-target power.', icon: 'bow', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('longbow') },
  { id: 'crossbow', name: 'Crossbow', category: 'ranged', description: 'Slowest ranged cycle with high burst and Armor penetration potential.', icon: 'crossbow', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('crossbow') },
  { id: 'fire-magic', name: 'Fire Magic', category: 'magic', description: 'Direct Fire spell damage and authored Burn effects.', icon: 'spark', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('fire-magic') },
  { id: 'warding-magic', name: 'Warding Magic', category: 'magic', description: 'Protective barriers, defensive duration, and mana efficiency.', icon: 'shield', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('warding-magic') },
  { id: 'disruption-magic', name: 'Disruption Magic', category: 'magic', description: 'Interrupt enemy actions and turn successful counters into resources.', icon: 'zap', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('disruption-magic') },
]

export const proficiencyDefinitions = deepFreeze<ProficiencyDefinition[]>(baseDefinitions)

export const proficiencyById = Object.fromEntries(proficiencyDefinitions.map((definition) => [definition.id, definition])) as Record<string, ProficiencyDefinition>
