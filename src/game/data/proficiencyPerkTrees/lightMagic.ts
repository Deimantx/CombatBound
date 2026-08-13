import { createMagicTree, type MagicTreeProfile } from './magicHelpers'

const profile: MagicTreeProfile = {
  proficiencyId: 'light-magic', schoolName: 'Light Magic', damageType: 'light', rootName: 'Light Magic Mastery', icon: 'sun',
  branches: [
    { name: 'Radiance / Damage', kind: 'radiance', names: ['Radiant Spark', 'Focused Radiance', 'Searing Light', 'Brilliant Strike', 'Purifying Flame', 'Judgment', 'Divine Radiance'], icon: 'sun' },
    { name: 'Barrier / Protection', kind: 'light-barrier', names: ['Aegis Training', 'Reinforced Sign', 'Lingering Protection', 'Arcane Shelter', 'Sacred Ward', 'Bastion of Light', 'Unbroken Aegis'], icon: 'shield' },
    { name: 'Healing / Restoration', kind: 'healing', names: ['Mending Light', 'Gentle Radiance', 'Lasting Grace', 'Emergency Grace', 'Second Breath', 'Restoration Mastery', 'Miracle'], icon: 'heart' },
    { name: 'Cleanse / Resistance', kind: 'cleanse', names: ['Purity', 'Cleansing Touch', 'Clear Mind', 'Protective Purity', 'Radiant Cleansing', 'Uncorrupted', 'Perfect Purity'], icon: 'spark' },
    { name: 'Mana / Grace', kind: 'grace', names: ['Efficient Prayer', 'Sacred Reserve', 'Gentle Flow', 'Returned Grace', 'Conserved Grace', 'Enduring Grace', 'Boundless Grace'], icon: 'drop' },
  ],
  crossNodes: [
    { name: 'Radiant Bastion', links: [[0, 5], [1, 5]], effects: [{ type: 'spellDamageModifier', valuePerRank: .1 }, { type: 'barrierAmountModifier', valuePerRank: .15 }] },
    { name: 'Graceful Restoration', links: [[2, 5], [4, 5]], effects: [{ type: 'spellHealingModifier', valuePerRank: .15 }, { type: 'statModifier', stat: 'maxMana', operation: 'flat', valuePerRank: 10 }, { type: 'spellManaCostModifier', valuePerRank: -.05 }] },
    { name: 'Pure Aegis', links: [[3, 5], [1, 5]], effects: [{ type: 'conditionalStatModifier', stat: 'statusResistance', operation: 'flat', valuePerRank: .1, condition: { type: 'active-barrier' } }, { type: 'conditionalStatModifier', stat: 'armor', operation: 'flat', valuePerRank: 8, condition: { type: 'active-barrier' } }] },
  ],
  apexName: 'Master of Light', apexEffects: [{ type: 'spellDamageModifier', valuePerRank: .15 }, { type: 'spellHealingModifier', valuePerRank: .2 }, { type: 'barrierAmountModifier', valuePerRank: .2 }, { type: 'spellManaCostModifier', valuePerRank: -.1 }, { type: 'statModifier', stat: 'statusResistance', operation: 'flat', valuePerRank: .15 }],
}

export const lightMagicPerks = createMagicTree(profile)
