import { createMagicTree, type MagicTreeProfile } from './magicHelpers'

const profile: MagicTreeProfile = {
  proficiencyId: 'water-magic', schoolName: 'Water Magic', damageType: 'cold', rootName: 'Water Magic Foundations', icon: 'droplets',
  branches: [
    { name: 'Frost / Chill', kind: 'frost', names: ['Cold Touch', 'Deep Chill', 'Numbing Cold', 'Brittle Motion', 'Freezing Pressure', "Winter's Grasp", 'Absolute Cold'], icon: 'snowflake' },
    { name: 'Tidal Force', kind: 'tidal', names: ['Pressurized Flow', 'Focused Current', 'Crashing Wave', 'Hydraulic Impact', 'High Tide', 'Tidal Surge', "Ocean's Wrath"], icon: 'droplets' },
    { name: 'Mana / Flow', kind: 'flow', names: ['Efficient Flow', 'Deep Reservoir', 'Returning Current', 'Meditative Flow', 'Conserved Current', 'Endless Stream', 'Bottomless Tide'], icon: 'drop' },
    { name: 'Restoration / Sustain', kind: 'restoration', names: ['Soothing Water', 'Restorative Current', 'Clear Waters', 'Renewing Tide', 'Second Current', 'Tidal Renewal', 'Sea of Life'], icon: 'heart' },
    { name: 'Mist / Evasion', kind: 'mist', names: ['Mist Step', 'Veiled Form', 'Drifting Fog', 'Blurred Outline', 'Mistwalker', 'Fogbound', 'Formless Tide'], icon: 'wind' },
  ],
  crossNodes: [
    { name: 'Frozen Current', links: [[0, 5], [1, 5]], effects: [{ type: 'spellConditionalDamageModifier', operation: 'increased', valuePerRank: .1, condition: { type: 'targetHasEffect', effectId: 'effect.chilled' } }, { type: 'appliedEffectDurationModifier', effectId: 'effect.chilled', valuePerRank: .25 }] },
    { name: 'Living Tide', links: [[2, 5], [3, 5]], effects: [{ type: 'statModifier', stat: 'maxMana', operation: 'flat', valuePerRank: 10 }, { type: 'spellHealingModifier', valuePerRank: .1 }, { type: 'spellConditionalDamageModifier', operation: 'increased', valuePerRank: .1, condition: { type: 'manaAbove', fraction: .5 } }] },
    { name: 'Mist of Winter', links: [[4, 5], [0, 5]], effects: [{ type: 'statModifier', stat: 'evasionRating', operation: 'flat', valuePerRank: 3 }, { type: 'spellDamageModifier', valuePerRank: .04 }] },
  ],
  apexName: 'Master of Tides', apexEffects: [{ type: 'spellDamageModifier', valuePerRank: .15 }, { type: 'spellManaCostModifier', valuePerRank: -.1 }, { type: 'spellHealingModifier', valuePerRank: .15 }, { type: 'appliedEffectDurationModifier', effectId: 'effect.chilled', valuePerRank: .15 }, { type: 'statModifier', stat: 'manaRegenFlat', operation: 'flat', valuePerRank: .5 }],
}

export const waterMagicPerks = createMagicTree(profile)
