import { deepFreeze } from './freeze'
import { MAX_PROFICIENCY_LEVEL } from '../progression/progressionBalance'
import { proficiencyPerkDefinitions } from './proficiencyPerks'
import type { CombatProficiencyId, ProficiencyDefinition } from '../progression/progressionTypes'

const authoredPerkIds = (proficiencyId: CombatProficiencyId) => proficiencyPerkDefinitions.filter((perk) => perk.proficiencyId === proficiencyId).map((perk) => perk.id)

// TODO(V8.3): One-Handed Sword perk tree Bleed branch needs a future identity pass.
const baseDefinitions: ProficiencyDefinition[] = [
  { id: 'one-handed-sword', name: 'One-Handed Sword', category: 'melee', description: 'Balanced, accurate swordplay focused on precision, guard, tempo, and fluid positioning.', icon: 'sword', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('one-handed-sword') },
  { id: 'one-handed-axe', name: 'One-Handed Axe', category: 'melee', description: 'Aggressive direct damage with Bleed and Armor-breaking potential.', icon: 'axe', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('one-handed-axe') },
  { id: 'one-handed-mace', name: 'One-Handed Mace', category: 'melee', description: 'Heavy impact and Armor-crushing pressure against armored targets.', icon: 'hammer', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('one-handed-mace') },
  { id: 'dagger', name: 'Dagger', category: 'melee', description: 'Fast precision strikes with Critical Hit and Bleed potential.', icon: 'sword', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('dagger') },
  { id: 'two-handed-sword', name: 'Two-Handed Sword', category: 'melee', description: 'Deliberate heavy hits with strong Critical Hit and cleave potential.', icon: 'sword', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('two-handed-sword') },
  { id: 'two-handed-axe', name: 'Two-Handed Axe', category: 'melee', description: 'Very high raw damage with Bleed and execution potential.', icon: 'axe', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('two-handed-axe') },
  { id: 'two-handed-hammer', name: 'Two-Handed Hammer', category: 'melee', description: 'Slow, powerful impacts designed for Armor, Block, and Concussed control.', icon: 'hammer', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('two-handed-hammer') },
  { id: 'spear', name: 'Spear', category: 'melee', description: 'Accurate precision attacks with anti-elite and critical-window potential.', icon: 'spear', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('spear') },
  { id: 'shortbow', name: 'Shortbow', category: 'ranged', description: 'Fast ranged attacks with consistent pressure and Critical Hit synergy.', icon: 'bow', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('shortbow') },
  { id: 'longbow', name: 'Longbow', category: 'ranged', description: 'Slow deliberate shots with high Accuracy and single-target power.', icon: 'bow', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('longbow') },
  { id: 'crossbow', name: 'Crossbow', category: 'ranged', description: 'Slowest ranged cycle with high burst and Armor penetration potential.', icon: 'crossbow', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('crossbow') },
  { id: 'fire-magic', name: 'Fire Magic', category: 'magic', description: 'Aggressive Fire spells, direct destruction, and Ignite pressure.', icon: 'spark', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('fire-magic') },
  { id: 'water-magic', name: 'Water Magic', category: 'magic', description: 'Frost, control, restorative flow, Mana efficiency, and mist.', icon: 'droplets', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('water-magic') },
  { id: 'air-magic', name: 'Air Magic', category: 'magic', description: 'Lightning, speed, chain damage, control, and mobility.', icon: 'wind', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('air-magic') },
  { id: 'earth-magic', name: 'Earth Magic', category: 'magic', description: 'Stone impact, Armor breaking, fortification, Barriers, and Quake control.', icon: 'mountain', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('earth-magic') },
  { id: 'darkness-magic', name: 'Darkness Magic', category: 'magic', description: 'Shadow damage, curses, Decay, life drain, and execution.', icon: 'moon', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('darkness-magic') },
  { id: 'light-armor', name: 'Light Armor', category: 'defense', description: 'Arcane mobility armor focused on Mana, spell efficiency, Evasion, and magical protection.', icon: 'wind', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('light-armor') },
  { id: 'medium-armor', name: 'Medium Armor', category: 'defense', description: 'Balanced combat armor focused on Stamina, mobility, Weapon tempo, and flexible defense.', icon: 'swords', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('medium-armor') },
  { id: 'heavy-armor', name: 'Heavy Armor', category: 'defense', description: 'Tank armor focused on Max Health, Armor, Health regeneration, and surviving pressure.', icon: 'shield', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('heavy-armor') },
  { id: 'shield', name: 'Shield', category: 'defense', description: 'Defensive offhand training focused on impact warding, counterattacks, and protection.', icon: 'shield', maxLevel: MAX_PROFICIENCY_LEVEL, perkIds: authoredPerkIds('shield') },
]

export const proficiencyDefinitions = deepFreeze<ProficiencyDefinition[]>(baseDefinitions)

export const proficiencyById = Object.fromEntries(proficiencyDefinitions.map((definition) => [definition.id, definition])) as Record<string, ProficiencyDefinition>
