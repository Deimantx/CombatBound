import { createMagicTree, type MagicTreeProfile } from './magicHelpers'

const profile: MagicTreeProfile = {
  proficiencyId: 'earth-magic', schoolName: 'Earth Magic', damageType: 'physical', rootName: 'Earth Magic Foundations', icon: 'mountain',
  branches: [
    { name: 'Stone / Direct Damage', kind: 'stone', names: ['Stone Shard', 'Dense Projectile', 'Heavy Stone', 'Granite Impact', 'Mountain Force', 'Avalanche Force', "Mountain's Wrath"], icon: 'mountain' },
    { name: 'Armor Break / Penetration', kind: 'armor-penetration', names: ['Cracked Stone', 'Grinding Force', 'Fault Line', 'Fractured Defense', 'Deep Fracture', 'Shatter Plate', 'Worldbreaker'], icon: 'hammer' },
    { name: 'Fortification / Armor', kind: 'fortification', names: ['Stone Skin', 'Dense Form', 'Rooted Guard', 'Granite Body', 'Immovable', 'Mountain Guard', 'Living Fortress'], icon: 'shield' },
    { name: 'Barrier / Stone Ward', kind: 'barrier', names: ['Earthen Ward', 'Layered Stone', 'Long-Lasting Ward', 'Absorbing Rock', 'Reinforced Wall', 'Stone Bastion', 'Citadel'], icon: 'shield' },
    { name: 'Quake / Concussed', kind: 'quake', names: ['Tremor', 'Rattled Ground', 'Heavy Tremor', 'Slow Footing', 'Crushing Quake', 'Seismic Pressure', 'Earthquake'], icon: 'hammer' },
  ],
  crossNodes: [
    { name: 'Stonebreaker', links: [[1, 5], [4, 5]], effects: [{ type: 'spellConditionalDamageModifier', operation: 'increased', valuePerRank: .15, condition: { type: 'targetHasEffectAndHpBelow', effectId: 'effect.concussed', fraction: 1 } }] },
    { name: 'Fortress of Stone', links: [[2, 5], [3, 5]], effects: [{ type: 'statModifier', stat: 'armour', operation: 'flat', valuePerRank: 10 }, { type: 'barrierAmountModifier', valuePerRank: .15 }] },
    { name: 'Avalanche', links: [[0, 5], [4, 5]], effects: [{ type: 'spellConditionalDamageModifier', operation: 'increased', valuePerRank: .15, condition: { type: 'targetHasEffect', effectId: 'effect.concussed' } }, { type: 'appliedEffectDurationModifier', effectId: 'effect.concussed', valuePerRank: .1 }] },
  ],
  apexName: 'Master of Earth', apexEffects: [{ type: 'spellDamageModifier', valuePerRank: .2 }, { type: 'statModifier', stat: 'armour', operation: 'flat', valuePerRank: 15 }, { type: 'barrierAmountModifier', valuePerRank: .15 }, { type: 'spellArmorPenetrationModifier', mode: 'percent', valuePerRank: .1 }, { type: 'appliedEffectDurationModifier', effectId: 'effect.concussed', valuePerRank: .15 }],
}

export const earthMagicPerks = createMagicTree(profile)
